import { Database } from "bun:sqlite";

export const db = new Database("bun-ai-api.sqlite", { create: true });

export function scheduleCronLike(expression: string, handler: () => void | Promise<void>) {
    let lastRunKey = "";

    const shouldRun = (now: Date) => {
        const minute = now.getMinutes();
        if (expression === "* * * * *") return true;
        if (expression === "0 * * * *") return minute === 0;
        if (expression === "30 * * * *") return minute === 30;
        return false;
    };

    const tick = async () => {
        const now = new Date();
        if (!shouldRun(now)) return;

        const runKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}-${expression}`;
        if (runKey === lastRunKey) return;
        lastRunKey = runKey;

        await handler();
    };

    tick().catch(() => {});
    return setInterval(() => {
        tick().catch((error) => console.error("[Cron Fallback Error]", error));
    }, 15000);
}
