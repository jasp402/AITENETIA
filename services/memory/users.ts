import crypto from "crypto";
import type { UserRecord } from "../../types";
import { db } from "./shared";

export function getUser(userId: string, channel: string): UserRecord | null {
    const query = db.query("SELECT * FROM users WHERE id = $id AND channel = $channel");
    return query.get({ $id: userId, $channel: channel }) as UserRecord | null;
}

export function setUserBusy(userId: string, untilIso: string | null) {
    db.query("UPDATE users SET busy_until = $until WHERE id = $id").run({ $until: untilIso, $id: userId });
}

export function setUserQuietHours(userId: string, start: string, end: string) {
    db.query("UPDATE users SET quiet_hours_start = $start, quiet_hours_end = $end WHERE id = $id").run({
        $start: start,
        $end: end,
        $id: userId
    });
}

export function setUserNudgeDelay(userId: string, hours: number) {
    db.query("UPDATE users SET nudge_delay_hours = $hours WHERE id = $id").run({ $hours: hours, $id: userId });
}

export function createUser(userId: string, name: string | null, channel: string): UserRecord {
    const user = {
        id: userId,
        name,
        channel,
        busy_until: null,
        quiet_hours_start: "22:00",
        quiet_hours_end: "09:00",
        nudge_delay_hours: 12,
        created_at: new Date().toISOString()
    };
    db.query("INSERT INTO users (id, name, channel, created_at, nudge_delay_hours) VALUES ($id, $name, $channel, $createdAt, 12)").run({
        $id: user.id,
        $name: user.name,
        $channel: user.channel,
        $createdAt: user.created_at
    });
    return user;
}

export function getOrCreateConversation(userId: string, channel: string): string {
    const q1 = db.query("SELECT id FROM conversations WHERE user_id = $userId AND channel = $channel LIMIT 1");
    const existing = q1.get({ $userId: userId, $channel: channel }) as { id: string } | null;
    if (existing) {
        db.query("UPDATE conversations SET updated_at = $now WHERE id = $id").run({
            $now: new Date().toISOString(),
            $id: existing.id
        });
        return existing.id;
    }

    const newId = crypto.randomUUID();
    db.query("INSERT INTO conversations (id, user_id, channel, updated_at) VALUES ($id, $userId, $channel, $now)").run({
        $id: newId,
        $userId: userId,
        $channel: channel,
        $now: new Date().toISOString()
    });
    return newId;
}
