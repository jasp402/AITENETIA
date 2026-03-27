import { join } from "node:path";

export async function listProjectFiles(projectPath: string): Promise<string[]> {
    const { readdir } = await import("node:fs/promises");
    try {
        const files = await readdir(projectPath, { recursive: true });
        return files.filter((file: string) => !file.includes("node_modules") && !file.includes(".git"));
    } catch {
        return [];
    }
}

export async function readFile(projectPath: string, filePath: string): Promise<string> {
    const { readFile } = await import("node:fs/promises");
    return readFile(join(projectPath, filePath), "utf-8");
}
