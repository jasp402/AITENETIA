import crypto from "crypto";
import type { ChatMessage, MessageRecord } from "../../types";
import { db } from "./shared";

export function saveMessage(conversationId: string, role: "user" | "assistant" | "system", content: string): MessageRecord {
    const msg = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role,
        content,
        timestamp: new Date().toISOString(),
        is_analyzed: 0
    };
    db.query(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp, is_analyzed) 
      VALUES ($id, $conversationId, $role, $content, $timestamp, 0)
    `).run({
        $id: msg.id,
        $conversationId: msg.conversation_id,
        $role: msg.role,
        $content: msg.content,
        $timestamp: msg.timestamp
    });
    return { ...msg, is_analyzed: false };
}

export function getRecentHistory(conversationId: string, limit: number = 20): ChatMessage[] {
    const query = db.query(`
      SELECT role, content FROM messages 
      WHERE conversation_id = $conversationId 
      ORDER BY timestamp DESC LIMIT $limit
    `);
    const results = query.all({ $conversationId: conversationId, $limit: limit }) as { role: string; content: string }[];

    return results.reverse().map((result) => ({
        role: result.role as "user" | "assistant" | "system",
        content: result.content
    }));
}
