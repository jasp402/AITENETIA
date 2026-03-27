import { readFileSync, existsSync } from "node:fs";
import { AgentAnalyst } from "./agents/agent_analyst";
import { AgentArchitect } from "./agents/agent_architect";
import { AgentDev } from "./agents/agent_dev";
import { AgentPM } from "./agents/agent_pm";
import { AgentSM } from "./agents/agent_sm";
import { AgentQA } from "./agents/agent_qa";
import { AgentTechWriter } from "./agents/agent_tech_writer";
import { AgentUIUX } from "./agents/agent_uiux";
import { AgentBackend } from "./agents/agent_backend";
import { AgentDB } from "./agents/agent_db";
import { AgentSecurity } from "./agents/agent_security";
import { AgentDevOps } from "./agents/agent_devops";
import { AgentReviewer } from "./agents/agent_reviewer";
import { AgentFrontend } from "./agents/agent_frontend";

/**
 * Registro Centralizado de la Flota de Agentes (Enriquecido con Metadatos Pro)
 */
export const AGENT_ROLES = [
  { ...AgentDev.metadata, ...AgentDev, avatar: AgentDev.metadata.icon },
  { ...AgentReviewer.metadata, ...AgentReviewer, avatar: AgentReviewer.metadata.icon },
  { ...AgentFrontend.metadata, ...AgentFrontend, avatar: AgentFrontend.metadata.icon },
  { ...AgentBackend.metadata, ...AgentBackend, avatar: AgentBackend.metadata.icon },
  { ...AgentArchitect.metadata, ...AgentArchitect, avatar: AgentArchitect.metadata.icon },
  { ...AgentDB.metadata, ...AgentDB, avatar: AgentDB.metadata.icon },
  { ...AgentDevOps.metadata, ...AgentDevOps, avatar: AgentDevOps.metadata.icon },
  { ...AgentSecurity.metadata, ...AgentSecurity, avatar: AgentSecurity.metadata.icon },
  { ...AgentQA.metadata, ...AgentQA, avatar: AgentQA.metadata.icon },
  { ...AgentAnalyst.metadata, ...AgentAnalyst, avatar: AgentAnalyst.metadata.icon },
  { ...AgentPM.metadata, ...AgentPM, avatar: AgentPM.metadata.icon },
  { ...AgentUIUX.metadata, ...AgentUIUX, avatar: AgentUIUX.metadata.icon },
  { ...AgentSM.metadata, ...AgentSM, avatar: AgentSM.metadata.icon },
  { ...AgentTechWriter.metadata, ...AgentTechWriter, avatar: AgentTechWriter.metadata.icon }
];

/**
 * Genera el prompt especifico basado en la personalidad del agente y el conocimiento global.
 */
export function getAgentSystemPrompt(agentName: string, globalContext: any): string {
    const agent = AGENT_ROLES.find(a => a.name === agentName || a.title === agentName);
    if (!agent) return "Eres un asistente de IA generico.";

    let soul = "";
    let userPrefs = "";

    try {
        if (existsSync("SOUL.md")) soul = readFileSync("SOUL.md", "utf-8");
        if (existsSync("USER.md")) userPrefs = readFileSync("USER.md", "utf-8");
    } catch {}

    const persona = (agent as any).persona || {};
    const criticalActions = (agent as any).critical_actions || [];
    const principles = persona.principles || [];

    return `
=== CONOCIMIENTO CENTRAL DE AITENETIA ===
${soul}

=== PREFERENCIAS DEL USUARIO ===
${userPrefs || "Sigue las mejores practicas estandar de la industria."}

=== TU IDENTIDAD NEURAL (BMAD PROTOCOL) ===
**Nombre:** ${agent.name}
**Especialidad:** ${agent.title}
**Rol:** ${persona.role || agent.title}
**Identidad:** ${persona.identity || ""}
**Estilo de Comunicacion:** ${persona.communication_style || ""}

**PRINCIPIOS OPERATIVOS:**
${principles.map((p: string) => `- ${p}`).join("\n")}

**ACCIONES CRITICAS (DE OBLIGADO CUMPLIMIENTO):**
${criticalActions.map((a: string) => `- ${a}`).join("\n")}

=== CONTEXTO DEL PROYECTO ACTUAL ===
${JSON.stringify(globalContext, null, 2)}

Tu objetivo es realizar la tarea asignada con la maxima calidad tecnica, respetando tus principios y acciones criticas.
REGLA DE ORO: Responder siempre en Espanol (REGLA #1).
REGLA DE ENTREGA: No marques una tarea como "completed" si no dejaste evidencia real y verificable. Si afirmas haber creado archivos, esos archivos deben existir realmente en el workspace. Si no pudiste materializar cambios o no existe preview verificable cuando la tarea lo requiere, responde "pending" o "failed", pero no inventes entregables.
REGLA A2A: Si necesitas ayuda de otro agente o una decision humana, declaralo en "a2a_actions" usando tipos validos y nombres exactos de agentes.

Al finalizar tu trabajo, DEBES generar un reporte de progreso usando el formato exacto:
<a2a_report>
{
  "status": "completed | pending | failed",
  "result": {
    "summary": "Breve resumen de lo logrado",
    "files_created": ["ruta/al/archivo1", "ruta/al/archivo2"],
    "technical_details": "Detalles tecnicos relevantes",
    "a2a_actions": [
      {
        "type": "consultation | review | handoff | decision_request",
        "targetAgentName": "Nombre exacto del especialista si aplica",
        "question": "Pregunta o instruccion concreta",
        "context": "Contexto minimo para destrabar la tarea",
        "options": ["Solo para decision_request"],
        "recommendedOption": "Solo para decision_request",
        "impactIfDelayed": "Solo para decision_request"
      }
    ]
  }
}
</a2a_report>
`;
}
