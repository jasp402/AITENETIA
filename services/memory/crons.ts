import type { MessageRecord, ReminderRecord } from "../../types";
import { getActiveServices } from "../index";
import { memoryService } from "./service";
import { db, scheduleCronLike } from "./shared";

export function initMemoryCrons() {
    console.log("Iniciando CronJobs de memoria...");

    scheduleCronLike("* * * * *", () => {
        const nowIso = new Date().toISOString();
        const query = db.query("SELECT * FROM reminders WHERE is_executed = 0 AND execute_at <= $now");
        const reminders = query.all({ $now: nowIso }) as ReminderRecord[];

        if (reminders.length === 0) return;

        console.log(`[Cron] Ejecutando ${reminders.length} recordatorios pendientes.`);

        for (const reminder of reminders) {
            if (!memoryService.onReminderExecute) {
                console.warn("[Cron] Recordatorio pendiente pero callback onReminderExecute no está configurado.");
                continue;
            }

            try {
                memoryService.onReminderExecute(reminder.channel, reminder.user_id, reminder.message);
                db.query("UPDATE reminders SET is_executed = 1 WHERE id = $id").run({ $id: reminder.id });
            } catch (error) {
                console.error("[Cron Reminder Error]", error);
            }
        }
    });

    scheduleCronLike("0 * * * *", async () => {
        console.log("[Cron] Iniciando análisis de memoria/conversaciones...");
        const query = db.query("SELECT * FROM messages WHERE is_analyzed = 0 ORDER BY timestamp ASC LIMIT 100");
        const messages = query.all() as MessageRecord[];

        if (messages.length === 0) return;

        const ids = messages.map((message) => `'${message.id}'`).join(",");
        db.query(`UPDATE messages SET is_analyzed = 1 WHERE id IN (${ids})`).run();

        const services = getActiveServices();
        const ai = services[0];
        if (!ai) return;

        const metaPrompt = `
      Eres un módulo de análisis de memoria en background de la IA.
      Tu tarea es analizar el siguiente historial reciente de mensajes entre usuarios y tú (la IA).
      Debes identificar:
      1. Datos Vitales del Usuario: Nombre, Profesión/Trabajo, Intereses, Gustos personales.
      2. Contexto de Proyectos: Cuáles son sus proyectos favoritos o en los que más trabaja.
      3. Lecciones Aprendidas: Errores que la IA cometió y que el usuario corrigió, o instrucciones explícitas sobre "cómo NO hacer las cosas".
      4. SIEMPRE verifica si se te ha ordenado cambiar la forma fundamental en que actúas (generar nuevo SYSTEM_PROMPT).
      5. IMPORTANTE: Si un usuario te agendó/pidió que le recuerdes algo cronometrado (generar reminder).
      6. DISPONIBILIDAD: Detecta si el usuario indica que estará ocupado, de viaje o no disponible hasta cierta fecha o periodo.

      Responde EXCLUSIVAMENTE en formato JSON con la siguiente estructura (si no hay nada, null o array vacío):
      {
        "newSystemPrompt": "string o null si no cambió",
        "userData": {
           "name": "Nombre si lo detectas",
           "profession": "Trabajo/Rol",
           "interests": ["interés 1", "interés 2"],
           "favoriteProjects": ["proyecto 1"],
           "busyUntil": "ISO Date si el usuario indica que estará ocupado o no disponible hasta cierta fecha/hora, de lo contrario null"
        },
        "learnedRules": ["Regla de comportamiento o lección aprendida para no repetir errores"],
        "reminders": [
          {
            "userId": "ID del usuario",
            "message": "Mensaje exacto a recordarle",
            "executeAtIso": "ISO Date"
          }
        ]
      }
      
      Historial a analizar:
      ${JSON.stringify(messages.map((message) => `[${message.role}] ${message.content}`))}
      
      IMPORTANTE: Los datos en "userData" deben ser persistentes y acumulativos.
      La fecha/hora actual es: ${new Date().toISOString()}.
    `;

        try {
            const stream = await ai.chat([{ role: "user", content: metaPrompt }]);
            let jsonResponseStr = "";
            for await (const chunk of stream) {
                if (chunk) jsonResponseStr += chunk;
            }

            jsonResponseStr = jsonResponseStr.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

            let parsed: any;
            try {
                parsed = JSON.parse(jsonResponseStr);
            } catch {
                console.warn("[Cron Memory] La respuesta de la IA no fue un JSON válido, ignorando este ciclo:", jsonResponseStr);
                return;
            }

            if (parsed.newSystemPrompt) {
                console.log("[Cron Memory] Actualizando System Prompt base");
                memoryService.saveCustomSystemPrompt(parsed.newSystemPrompt);
            }

            if (parsed.userData) {
                const { name, profession, interests, favoriteProjects, busyUntil } = parsed.userData;
                if (name) memoryService.addUserData(`Nombre: ${name}`);
                if (profession) memoryService.addUserData(`Profesión: ${profession}`);
                if (Array.isArray(interests)) interests.forEach((interest: string) => memoryService.addUserData(`Interés: ${interest}`));
                if (Array.isArray(favoriteProjects)) favoriteProjects.forEach((project: string) => memoryService.addUserData(`Proyecto Favorito: ${project}`));

                if (busyUntil) {
                    const userMessage = messages.find((message) => message.role === "user");
                    if (userMessage) {
                        const convQuery = db.query("SELECT user_id FROM conversations WHERE id = $id");
                        const conversation = convQuery.get({ $id: userMessage.conversation_id }) as { user_id: string } | null;
                        if (conversation) {
                            console.log(`[Cron Memory] Usuario ${conversation.user_id} estará ocupado hasta ${busyUntil}`);
                            memoryService.setUserBusy(conversation.user_id, busyUntil);
                        }
                    }
                }
            }

            if (Array.isArray(parsed.learnedRules)) {
                for (const rule of parsed.learnedRules) {
                    console.log("[Cron Memory] Nueva regla aprendida:", rule);
                    memoryService.addLearnedRule(rule);
                }
            }

            if (Array.isArray(parsed.reminders)) {
                for (const reminder of parsed.reminders) {
                    const userMessage = messages.find((message) => message.role === "user");
                    if (!userMessage) continue;
                    const convQuery = db.query("SELECT user_id, channel FROM conversations WHERE id = $id");
                    const conversation = convQuery.get({ $id: userMessage.conversation_id }) as { user_id: string; channel: string } | null;
                    if (conversation) {
                        memoryService.addReminder(conversation.user_id, conversation.channel, reminder.message, reminder.executeAtIso);
                    }
                }
            }
        } catch (error) {
            console.error("[Cron Memory] Error analizando el historial", error);
        }
    });

    scheduleCronLike("30 * * * *", async () => {
        console.log("[Cron] Verificando inactividad para seguimiento proactivo...");
        const now = new Date();
        const nowIso = now.toISOString();

        const query = db.query(`
            SELECT c.*, u.name as user_name, u.busy_until, u.quiet_hours_start, u.quiet_hours_end, u.nudge_delay_hours
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            WHERE datetime(c.updated_at, '+' || u.nudge_delay_hours || ' hours') <= datetime($now)
            AND c.updated_at >= datetime($now, '-7 days')
            AND (c.last_nudge_at IS NULL OR c.last_nudge_at < c.updated_at)
        `);

        const candidates = query.all({ $now: nowIso }) as any[];
        if (candidates.length === 0) return;

        const services = getActiveServices();
        const ai = services[0];
        if (!ai) return;

        for (const candidate of candidates) {
            if (candidate.busy_until && new Date(candidate.busy_until) > now) {
                console.log(`[Cron Nudge] Usuario ${candidate.user_id} está ocupado hasta ${candidate.busy_until}, saltando.`);
                continue;
            }

            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;

            const qStart = candidate.quiet_hours_start || "22:00";
            const qEnd = candidate.quiet_hours_end || "09:00";
            const isQuietTime = qStart > qEnd
                ? (currentTimeStr >= qStart || currentTimeStr < qEnd)
                : (currentTimeStr >= qStart && currentTimeStr < qEnd);

            if (isQuietTime) {
                console.log(`[Cron Nudge] Usuario ${candidate.user_id} está en horas de silencio (${qStart}-${qEnd}), saltando.`);
                continue;
            }

            console.log(`[Cron Nudge] Generando mensaje proactivo para ${candidate.user_name || candidate.user_id} (Inactividad: ${candidate.nudge_delay_hours}h)`);

            let attitude = "amigable y equilibrada";
            if (candidate.nudge_delay_hours <= 3) attitude = "muy atenta, curiosa y un poco insistente (modo INTENSO)";
            else if (candidate.nudge_delay_hours >= 160) attitude = "muy relajada, casi como si te hubieras olvidado de escribir y acabas de recordar (modo OLVIDADIZO)";
            else if (candidate.nudge_delay_hours >= 40) attitude = "despreocupada y casual, sin ninguna presión (modo DESPREOCUPADO)";

            const history = memoryService.getRecentHistory(candidate.id, 5);
            const nudgePrompt = `
                Eres una IA asistente personal con una actitud ${attitude}. 
                Has notado que el usuario (${candidate.user_name || "amigo"}) no ha interactuado contigo en más de ${candidate.nudge_delay_hours} horas.
                
                Instrucciones de estilo:
                - Escribe un mensaje muy BREVE (máximo 2 frases).
                - Refleja tu actitud de forma natural en el saludo.
                - Basándote en el último historial, pregunta cómo va o si necesita ayuda con algo específico.
                
                Últimos mensajes:
                ${JSON.stringify(history)}
            `;

            try {
                const stream = await ai.chat([{ role: "user", content: nudgePrompt }]);
                let nudgeMessage = "";
                for await (const chunk of stream) {
                    if (chunk) nudgeMessage += chunk;
                }

                if (memoryService.onProactiveNudge) {
                    memoryService.onProactiveNudge(candidate.channel, candidate.user_id, nudgeMessage.trim());
                    db.query("UPDATE conversations SET last_nudge_at = $now WHERE id = $id").run({
                        $now: now.toISOString(),
                        $id: candidate.id
                    });
                }
            } catch (error) {
                console.error(`[Cron Nudge] Error generando nudge para ${candidate.user_id}:`, error);
            }
        }
    });
}
