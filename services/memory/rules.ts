import crypto from "crypto";
import type { ChatMessage } from "../../types";
import { SYSTEM_PROMPT_BASE } from "../../core/prompts";
import { db } from "./shared";

export function getSystemPromptAndRules(userId?: string, userName?: string): ChatMessage[] {
    let userContext = "";
    if (userId) {
        const userQuery = db.query("SELECT * FROM users WHERE id = $id LIMIT 1");
        const user = userQuery.get({ $id: userId }) as any;

        const userDataQuery = db.query("SELECT content FROM memory_rules WHERE type = 'user_data' AND is_active = 1");
        const data = userDataQuery.all() as { content: string }[];

        if (user || userName || data.length > 0) {
            userContext = `\n\n=== CONTEXTO DEL USUARIO ===\n`;
            userContext += `Estás hablando con: ${user?.name || userName || "Usuario"}\n`;
            if (data.length > 0) {
                userContext += `Información conocida:\n${data.map((item) => `- ${item.content}`).join("\n")}`;
            }
            userContext += `\n============================\n`;
        }
    }

    const promptQuery = db.query("SELECT content FROM memory_rules WHERE type = 'system_prompt' AND is_active = 1 LIMIT 1");
    const customPrompt = promptQuery.get() as { content: string } | null;

    let baseContent = customPrompt?.content || SYSTEM_PROMPT_BASE.content;

    const rulesQuery = db.query("SELECT content FROM memory_rules WHERE type = 'learned_rule' AND is_active = 1");
    const rules = rulesQuery.all() as { content: string }[];

    if (rules.length > 0) {
        baseContent += "\n\n=== REGLAS DE COMPORTAMIENTO Y LECCIONES APRENDIDAS ===\n"
            + "IMPORTANTE: Las siguientes son reglas que has aprendido para no repetir errores y mejorar tu servicio:\n"
            + rules.map((rule) => `- ${rule.content}`).join("\n");
    }

    return [{ role: "system", content: userContext + baseContent }];
}

export function saveCustomSystemPrompt(content: string) {
    db.query("UPDATE memory_rules SET is_active = 0 WHERE type = 'system_prompt'").run();
    db.query(`
      INSERT INTO memory_rules (id, type, content, is_active, created_at) 
      VALUES ($id, 'system_prompt', $content, 1, $now)
    `).run({
        $id: crypto.randomUUID(),
        $content: content,
        $now: new Date().toISOString()
    });
}

export function addLearnedRule(content: string) {
    db.query(`
      INSERT INTO memory_rules (id, type, content, is_active, created_at) 
      VALUES ($id, 'learned_rule', $content, 1, $now)
    `).run({
        $id: crypto.randomUUID(),
        $content: content,
        $now: new Date().toISOString()
    });
}

export function addUserData(content: string) {
    const exists = db.query("SELECT id FROM memory_rules WHERE type = 'user_data' AND content = $content LIMIT 1").get({ $content: content });
    if (!exists) {
        db.query(`
          INSERT INTO memory_rules (id, type, content, is_active, created_at) 
          VALUES ($id, 'user_data', $content, 1, $now)
        `).run({
            $id: crypto.randomUUID(),
            $content: content,
            $now: new Date().toISOString()
        });
    }
}
