import crypto from "crypto";
import { db } from "./shared";

export function addReminder(userId: string, channel: string, message: string, executeAtIso: string) {
    console.log("[MemoryService] Añadiendo recordatorio para", userId, "a las", executeAtIso);
    db.query(`
      INSERT INTO reminders (id, user_id, channel, message, execute_at, is_executed, created_at) 
      VALUES ($id, $userId, $channel, $message, $executeAt, 0, $now)
    `).run({
        $id: crypto.randomUUID(),
        $userId: userId,
        $channel: channel,
        $message: message,
        $executeAt: executeAtIso,
        $now: new Date().toISOString()
    });
}
