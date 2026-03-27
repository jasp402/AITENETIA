import type { ChatMessage, McpToolDefinition } from '../types';
import { mcpService } from './mcpClient';
import { projectManager } from './projectManager';

/**
 * Agente Universal basado en ReAct (Reasoning and Acting)
 * Convierte un modelo de texto genérico en un Agente capaz de usar MCP devolviendo etiquetas XML.
 */
export const agentService = {

    injectToolsToPrompt: (systemPrompt: ChatMessage): ChatMessage => {
        const registry = mcpService.getAllTools();

        let toolsInstruction = `\n\n=== HERRAMIENTAS DISPONIBLES ===\nTienes acceso a las siguientes herramientas mediante el sistema Model Context Protocol (MCP).\n`;

        const baseContent = typeof systemPrompt.content === 'string' ? systemPrompt.content : "";

        // 1. Herramientas de Automatización Físisica (Internas)
        toolsInstruction += `
Herramienta: ahk_run
Servidor: automation
Descripción: Ejecuta código AutoHotkey v2 para controlar el ratón, teclado y ventanas.
Parámetros (JSON Schema): {"type":"object","properties":{"code":{"type":"string","description":"Código AHK v2"}},"required":["code"]}

Herramienta: screenshot
Servidor: automation
Descripción: Captura la pantalla actual para ver el estado visual.
Parámetros (JSON Schema): {"type":"object","properties":{}}
`;

        for (const { serverName, tool } of registry) {
            toolsInstruction += `\nHerramienta: ${tool.name}\n`;
            toolsInstruction += `Servidor: ${serverName}\n`;
            toolsInstruction += `Descripción: ${tool.description || 'Sin descripción'}\n`;
            toolsInstruction += `Parámetros (JSON Schema): ${JSON.stringify(tool.inputSchema)}\n`;
        }

        toolsInstruction += `
INSTRUCCIONES DE ESTILO:
1. IDIOMA: Responde siempre en Español.
2. TOOL CALLING: Usa EXCLUSIVAMENTE el formato XML:

<mcp_tool_call>
  <server>nombre_del_servidor</server>
  <tool>nombre_de_la_herramienta</tool>
  <args>{"param1": "valor1"}</args>
</mcp_tool_call>

3. REGLAS: El contenido de <args> debe ser JSON válido. Tras recibir el resultado, genera tu respuesta final.
=== FIN DE HERRAMIENTAS ===\n`;

        return {
            role: 'system',
            content: baseContent + toolsInstruction + projectManager.getActiveProjectContext()
        };
    },

    parseToolCalls: (responseContent: string) => {
        const toolCallRegex = /<mcp_tool_call>([\s\S]*?)<\/mcp_tool_call>/g;
        const matches = [...responseContent.matchAll(toolCallRegex)];
        if (matches.length === 0) return null;

        const calls = [];
        for (const match of matches) {
            const block = match[1];
            if (!block) continue;
            const serverMatch = block.match(/<server>([\s\S]*?)<\/server>/);
            const toolMatch = block.match(/<tool>([\s\S]*?)<\/tool>/);
            const argsMatch = block.match(/<args>([\s\S]*?)<\/args>/);

            if (serverMatch?.[1] && toolMatch?.[1] && argsMatch?.[1]) {
                try {
                    const rawArgs = argsMatch[1].replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                    calls.push({
                        server: serverMatch[1].trim(),
                        tool: toolMatch[1].trim(),
                        args: JSON.parse(rawArgs)
                    });
                } catch (e) {
                    console.error("[Agent Parser] Error parseando args:", e);
                }
            }
        }
        return calls.length > 0 ? calls : null;
    },

    parseA2AReports: (responseContent: string) => {
        const reportRegex = /<a2a_report>([\s\S]*?)<\/a2a_report>/g;
        const matches = [...responseContent.matchAll(reportRegex)];
        if (matches.length === 0) return null;

        const reports = [];
        for (const match of matches) {
            let block = match[1];
            if (!block) continue;
            
            // Intento 1: Parseo JSON directo
            try {
                const cleanJson = block
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .trim();
                reports.push(JSON.parse(cleanJson));
                continue;
            } catch (e) {
                // Falló JSON, pasamos a fallback heurístico
            }

            // Intento 2: Fallback heurístico (Extracción de campos básicos si mandan XML o texto)
            const heuristicReport: any = { status: 'completed', result: {} };
            
            // Buscar status en etiquetas o texto
            if (block.toLowerCase().includes('failed') || block.toLowerCase().includes('error')) heuristicReport.status = 'failed';
            
            // Si hay etiquetas XML internas locas (ej: <status>, <tarea>), las extraemos
            const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
            let tagMatch;
            let foundTags = false;
            while ((tagMatch = tagRegex.exec(block)) !== null) {
                const rawKey = tagMatch[1];
                const rawVal = tagMatch[2];
                if (!rawKey || rawVal == null) continue;
                const key = rawKey.toLowerCase();
                const val = rawVal.trim();
                if (key === 'status') heuristicReport.status = val;
                else heuristicReport.result[key] = val;
                foundTags = true;
            }

            // Si no hay etiquetas ni JSON, tratamos todo el bloque como el resumen técnico
            if (!foundTags) {
                heuristicReport.result.summary = block.trim();
            }

            reports.push(heuristicReport);
        }
        return reports.length > 0 ? reports : null;
    },

    formatToolResult: (toolCallName: string, output: any, isError: boolean = false): ChatMessage => {
        let contentString = "";
        if (output && output.content && Array.isArray(output.content)) {
            contentString = output.content.map((c: any) => c.text).join("\n");
        } else {
            contentString = typeof output === 'object' ? JSON.stringify(output) : String(output);
        }
        return {
            role: 'system',
            content: `<mcp_tool_result name="${toolCallName}" error="${isError}">\n${contentString}\n</mcp_tool_result>\n\nBasado en este resultado, genera tu respuesta final.`
        };
    },

    cleanFinalResponse: (text: string): string => {
        return text.replace(/<mcp_tool_call>[\s\S]*?<\/mcp_tool_call>/g, '').trim();
    },

    escapeHTML: (text: string): string => {
        if (!text) return "";
        let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped
            .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
            .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
            .replace(/`([^`\n]+)`/g, '<code>$1</code>');
    }
};
