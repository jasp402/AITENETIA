import type { ProjectRecord } from "../../types";
import { dbService } from "../db";

export function init() {
    dbService.cleanStaleProcesses();
    console.log("[ProjectManager] Procesos obsoletos limpiados.");
}

export function listProjects(): any[] {
    return dbService.getProjects();
}

export function addProject(name: string, path: string, stack: string = "", devCommand: string = "", agentCommand: string = "") {
    dbService.addProject(name, path, stack, devCommand, agentCommand);
    console.log(`[ProjectManager] Proyecto "${name}" registrado.`);
}

export function switchProject(name: string): boolean {
    const success = dbService.setActiveProject(name);
    if (success) {
        console.log(`[ProjectManager] Proyecto activo cambiado a: "${name}"`);
    }
    return success;
}

export function toggleMirrorMode(projectId: string): boolean {
    const project = dbService.getProjects().find((item) => item.id === projectId);
    if (!project) return false;
    const newState = !project.mirror_mode;
    dbService.setMirrorMode(projectId, newState);
    return newState;
}

export function getActiveProject(): ProjectRecord | null {
    return dbService.getActiveProject();
}

export function removeProject(name: string): boolean {
    return dbService.deleteProject(name);
}

export function getStatus(): any[] {
    return dbService.getRunningProcesses();
}

export function getActiveProjectContext(): string {
    const project = dbService.getActiveProject();
    if (!project) return "";

    const processes = dbService.getProcessesByProject(project.id);
    const runningProcesses = processes.filter((process) => process.status === "running");

    let context = `\n\n=== PROYECTO ACTIVO ===\n`;
    context += `Nombre: ${project.name}\n`;
    context += `Ruta: ${project.path}\n`;
    context += `Stack: ${project.stack || "No especificado"}\n`;
    context += `Estado: ${project.status}\n`;

    if (runningProcesses.length > 0) {
        context += `\nProcesos en ejecución:\n`;
        for (const process of runningProcesses) {
            context += `- [${process.type}] ${process.command} (PID: ${process.pid}, Puerto: ${process.port || "N/A"})\n`;
        }
    }

    context += `=== FIN PROYECTO ===\n`;
    return context;
}
