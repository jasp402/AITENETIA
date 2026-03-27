import { spawn, type Subprocess } from "bun";
import { existsSync } from "node:fs";
import { dbService } from "../db";
import { activeSubprocesses } from "./shared";

export async function sendInputToProcess(processId: string, input: string): Promise<boolean> {
    const proc = activeSubprocesses.get(processId);
    if (proc && proc.stdin) {
        try {
            (proc.stdin as any).write(input + "\n");
            (proc.stdin as any).flush();
            console.log(`[ProjectManager] Input enviado a proceso ${processId}: ${input}`);
            return true;
        } catch (error) {
            console.error(`[ProjectManager] Error enviando input a ${processId}:`, error);
            return false;
        }
    }
    return false;
}

export async function startProcess(projectId: string, type: string, command: string, cwd: string, port: number | null = null, visible: boolean = false, god: string = "AGENT"): Promise<{ processId: string; pid: number | null }> {
    if (!existsSync(cwd)) {
        console.error(`[ProjectManager] Directory does not exist: ${cwd}`);
        throw new Error(`Directory does not exist: ${cwd}`);
    }

    const parts = command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);

    let finalCmd = cmd;
    let finalArgs = args;

    if (process.platform === "win32") {
        finalCmd = "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

        const project = dbService.getProjects().find((item) => item.id === projectId);
        const commandWithEnv = port ? `$env:PORT=${port}; ${command}` : command;
        const normalizedCwd = cwd.replace(/\\/g, "/");
        const isMirror = type !== "agent" && project?.mirror_mode;

        if (visible && type !== "agent") {
            let action = commandWithEnv;
            if (isMirror) {
                action += ` | Tee-Object -FilePath '.bot.log' -Append`;
            }
            const safeAction = action.replace(/'/g, "''");
            finalArgs = ["-Command", `Start-Process powershell -WorkingDirectory "${cwd}" -ArgumentList "-NoExit","-Command","& { ${safeAction} }"`];
        } else if (type === "agent") {
            const winTitle = `AGENT-${god.toUpperCase()}-${projectId.substring(0, 8)}`;

            if (visible) {
                const hostTitle = `$Host.UI.RawUI.WindowTitle = '${winTitle}'`;
                const innerCmd = `& { ${hostTitle}; cd '${normalizedCwd}'; ${commandWithEnv} }`;
                const escapedInnerCmd = innerCmd.replace(/'/g, "''");
                const launchCmd = `powershell -Command "(Start-Process powershell -ArgumentList '-NoExit','-Command','${escapedInnerCmd}' -PassThru).Id"`;

                try {
                    const { execSync } = require("node:child_process");
                    const stdout = execSync(launchCmd, { cwd }).toString();
                    const capturedPid = parseInt(stdout.trim());
                    console.log(`[ProjectManager] Agente lanzado con PID capturado: ${capturedPid}`);
                    const processId = dbService.addProcess(projectId, type, command, capturedPid, port);
                    console.log(`[ProjectManager] Proceso registrado en DB satisfactoriamente con ID: ${processId}`);
                    return { processId, pid: capturedPid };
                } catch {
                    const processId = dbService.addProcess(projectId, type, command, 0, port);
                    return { processId, pid: 0 };
                }
            } else {
                finalArgs = ["-Command", `& { cd "${normalizedCwd}"; ${commandWithEnv} }`];
            }
        } else {
            finalArgs = ["-Command", `& { cd "${normalizedCwd}"; ${commandWithEnv} }`];
        }
    }

    console.log(`[ProjectManager] Spawning process: ${finalCmd} ${finalArgs.join(" ")}`);

    const proc = spawn([finalCmd!, ...finalArgs], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
    });

    const pid = proc.pid;
    const processId = dbService.addProcess(projectId, type, command, pid, port);
    activeSubprocesses.set(processId, proc);

    readOutputStream(processId, proc, type === "agent");

    if (type === "dev_server") {
        dbService.updateProjectStatus(projectId, "running");
    }

    console.log(`[ProjectManager] Proceso iniciado (PID: ${pid}, ID: ${processId})`);
    return { processId, pid };
}

export async function readOutputStream(processId: string, proc: Subprocess, isAgent: boolean = false) {
    const processRecord = dbService.getProcessById(processId);
    const bridgeLogPath = isAgent && processRecord ? `${processRecord.cwd}/.bot.bridge.log` : null;

    const readStream = async (stream: ReadableStream<Uint8Array> | null) => {
        if (!stream) return;
        const reader = stream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = new TextDecoder().decode(value);

                if (bridgeLogPath) {
                    try {
                        const fs = require("node:fs");
                        fs.appendFileSync(bridgeLogPath, chunk);
                    } catch {
                        // Ignore bridge log write failures.
                    }
                }

                try {
                    const current = dbService.getProcessById(processId);
                    let output = (current?.last_output || "") + chunk;
                    if (output.length > 5000) {
                        output = output.substring(output.length - 5000);
                    }
                    dbService.updateProcess(processId, { last_output: output });
                } catch {
                    // Ignore db write failures.
                }
            }
        } catch {
            // Stream finished.
        }
    };

    readStream(proc.stdout as any);
    readStream(proc.stderr as any);

    try {
        const exitCode = await proc.exited;
        dbService.updateProcess(processId, { status: exitCode === 0 ? "stopped" : "error" });
        activeSubprocesses.delete(processId);
        console.log(`[ProjectManager] Proceso ${processId} terminó con código ${exitCode}.`);
    } catch {
        // Process already gone.
    }
}

export function stopProcess(processId: string): boolean {
    const processRecord = dbService.getProcessById(processId);
    const proc = activeSubprocesses.get(processId);
    const targetPid = proc?.pid || processRecord?.pid;

    if (targetPid) {
        try {
            if (process.platform === "win32") {
                try {
                    require("node:child_process").execSync(`taskkill /pid ${targetPid} /T /F`, { stdio: "ignore" });
                } catch {
                    if (proc) proc.kill();
                }
            } else if (proc) {
                proc.kill();
            } else {
                process.kill(targetPid);
            }
        } catch (error: any) {
            console.error("[ProjectManager] Error deteniendo proceso a nivel OS:", error.message);
        }
    }

    if (proc) activeSubprocesses.delete(processId);
    dbService.updateProcess(processId, { status: "stopped" });
    console.log(`[ProjectManager] Proceso ${processId} detenido (PID: ${targetPid}).`);
    return true;
}

export function stopProjectProcesses(projectId: string) {
    const processes = dbService.getProcessesByProject(projectId);
    for (const process of processes) {
        if (process.status === "running") {
            stopProcess(process.id);
        }
    }
    dbService.updateProjectStatus(projectId, "idle");
}
