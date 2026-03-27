import { spawn } from "bun";
import { dbService } from "../db";
import { getCandidateAppPorts, getProjectImageName } from "./shared";

export async function isAvailable(): Promise<boolean> {
    try {
        const proc = spawn(["docker", "--version"]);
        return (await proc.exited) === 0;
    } catch {
        return false;
    }
}

export async function buildImage(projectId: string, path: string): Promise<boolean> {
    console.log(`[Docker] Construyendo imagen para proyecto: ${projectId} en ruta ${path}`);
    const imageName = getProjectImageName(projectId);

    try {
        const proc = spawn(["docker", "build", "-t", imageName, "."], {
            cwd: path,
            stdout: "pipe",
            stderr: "pipe"
        });

        const streamToLogs = async (stream: ReadableStream) => {
            const reader = stream.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = new TextDecoder().decode(value).trim();
                if (!text) continue;
                text.split("\n").forEach((line) => {
                    if (!line.trim()) return;
                    dbService.logSystemEvent(projectId, `[Docker Build] ${line.trim()}`, "docker");
                    console.log(`[Docker Build ${projectId}] ${line.trim()}`);
                });
            }
        };

        streamToLogs(proc.stdout as any);
        streamToLogs(proc.stderr as any);

        const timeout = setTimeout(() => {
            dbService.logSystemEvent(projectId, "Timeout alcanzado en buildImage (10 min). Abortando.", "error");
            proc.kill();
        }, 600000);

        const exitCode = await proc.exited;
        clearTimeout(timeout);
        return exitCode === 0;
    } catch (error: any) {
        dbService.logSystemEvent(projectId, `Error critico en buildImage: ${error.message}`, "error");
        return false;
    }
}

export async function waitForHttp(url: string, timeoutMs: number = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch {
            // Ignore while the app boots.
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return false;
}

export async function detectAppPort(containerIp: string | null, config?: any, timeoutMs: number = 30000): Promise<number | null> {
    if (!containerIp) return null;

    const start = Date.now();
    const ports = getCandidateAppPorts(config);

    while (Date.now() - start < timeoutMs) {
        for (const port of ports) {
            try {
                const res = await fetch(`http://${containerIp}:${port}`, {
                    method: "GET",
                    signal: AbortSignal.timeout(2000)
                });
                const contentType = res.headers.get("content-type") || "";
                if (res.ok || contentType.includes("text/html") || contentType.includes("application/json")) {
                    return port;
                }
            } catch {
                // Keep probing while the app boots.
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return null;
}
