import { spawn } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { detectLaunchCommand } from "./files";
import {
    PREVIEW_GATEWAY_CONTAINER,
    PREVIEW_GATEWAY_PORT,
    PREVIEW_NETWORK,
    REPO_ROOT,
    type ContainerRuntimeInfo,
    getNodeModulesVolumeName,
    getProjectContainerName,
    getProjectImageName
} from "./shared";

export async function ensurePreviewNetwork() {
    const inspect = spawn(["docker", "network", "inspect", PREVIEW_NETWORK], {
        stdout: "pipe",
        stderr: "pipe"
    });

    const inspectExit = await inspect.exited;
    if (inspectExit === 0) return true;

    const create = spawn(["docker", "network", "create", PREVIEW_NETWORK], {
        stdout: "pipe",
        stderr: "pipe"
    });
    return (await create.exited) === 0;
}

export async function ensurePreviewGateway() {
    const networkReady = await ensurePreviewNetwork();
    if (!networkReady) return false;

    try {
        const inspect = spawn([
            "docker",
            "inspect",
            PREVIEW_GATEWAY_CONTAINER,
            "--format",
            "{{.State.Running}}"
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        if ((await inspect.exited) === 0) {
            const running = (await new Response(inspect.stdout).text()).trim() === "true";
            if (running) return true;
        }
    } catch {
        // Container missing or inaccessible, recreate below.
    }

    try {
        const rm = spawn(["docker", "rm", "-f", PREVIEW_GATEWAY_CONTAINER], {
            stdout: "pipe",
            stderr: "pipe"
        });
        await rm.exited;
    } catch {
        // Ignore stale cleanup errors.
    }

    const proc = spawn([
        "docker", "run", "-d",
        "--name", PREVIEW_GATEWAY_CONTAINER,
        "--network", PREVIEW_NETWORK,
        "-p", `${PREVIEW_GATEWAY_PORT}:${PREVIEW_GATEWAY_PORT}`,
        "-v", `${REPO_ROOT}:/workspace`,
        "-w", "/workspace",
        "oven/bun:1",
        "bun", "run", "preview-gateway/index.ts"
    ], {
        stdout: "pipe",
        stderr: "pipe"
    });

    return (await proc.exited) === 0;
}

export async function startContainer(projectId: string, path: string): Promise<ContainerRuntimeInfo> {
    const imageName = getProjectImageName(projectId);
    const containerName = getProjectContainerName(projectId);
    const hasPackageJson = existsSync(join(path, "package.json"));
    const hasBunLock = existsSync(join(path, "bun.lock"));

    await ensurePreviewNetwork();
    await ensurePreviewGateway();
    await stopContainer(projectId);

    console.log(`[Docker] Iniciando contenedor interno: ${containerName}`);

    const args = [
        "docker", "run", "-d",
        "--name", containerName,
        "--network", PREVIEW_NETWORK,
        "-v", `${path}:/app`
    ];

    if (hasPackageJson || hasBunLock) {
        args.push("-v", `${getNodeModulesVolumeName(projectId)}:/app/node_modules`);
    }

    args.push(imageName);

    const proc = spawn(args, { stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
        return { containerName: null, containerIp: null, running: false };
    }

    return inspectContainerRuntime(projectId);
}

export async function launchApp(projectId: string, path: string, config?: any): Promise<{ started: boolean; command: string | null; reason?: string }> {
    const containerName = getProjectContainerName(projectId);
    const command = detectLaunchCommand(path, config);

    if (!command) {
        return {
            started: false,
            command: null,
            reason: "No launch command detected in package.json"
        };
    }

    try {
        const proc = spawn([
            "docker", "exec",
            containerName,
            "sh", "-lc",
            `cd /app && nohup sh -lc '${command.replace(/'/g, `'\\''`)}' >/tmp/aitenetia-app.log 2>&1 &`
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            const stderr = await new Response(proc.stderr).text();
            return {
                started: false,
                command,
                reason: stderr.trim() || "Failed to launch app process"
            };
        }

        return {
            started: true,
            command
        };
    } catch (error: any) {
        return {
            started: false,
            command,
            reason: error.message || "Unexpected launch error"
        };
    }
}

export async function cleanupProjectArtifacts(projectId: string): Promise<{ containerRemoved: boolean; volumeRemoved: boolean; imageRemoved: boolean }> {
    const containerName = getProjectContainerName(projectId);
    const imageName = getProjectImageName(projectId);
    const nodeModulesVolume = getNodeModulesVolumeName(projectId);

    let containerRemoved = false;
    let volumeRemoved = false;
    let imageRemoved = false;

    try {
        await stopContainer(projectId);
        const rmProc = spawn(["docker", "rm", "-f", containerName]);
        await rmProc.exited;
        containerRemoved = true;
    } catch {
        containerRemoved = false;
    }

    try {
        const volumeProc = spawn(["docker", "volume", "rm", "-f", nodeModulesVolume]);
        volumeRemoved = (await volumeProc.exited) === 0;
    } catch {
        volumeRemoved = false;
    }

    try {
        const imageProc = spawn(["docker", "image", "rm", "-f", imageName]);
        imageRemoved = (await imageProc.exited) === 0;
    } catch {
        imageRemoved = false;
    }

    return { containerRemoved, volumeRemoved, imageRemoved };
}

export async function execCommand(projectId: string, command: string): Promise<{ stdout: ReadableStream; stderr: ReadableStream; exitCode: Promise<number> }> {
    const containerName = getProjectContainerName(projectId);
    const parts = command.split(" ");

    const proc = spawn([
        "docker", "exec", "-t",
        containerName,
        ...parts
    ], {
        stdout: "pipe",
        stderr: "pipe"
    });

    return {
        stdout: proc.stdout as any,
        stderr: proc.stderr as any,
        exitCode: proc.exited
    };
}

export async function stopContainer(projectId: string): Promise<boolean> {
    const containerName = getProjectContainerName(projectId);
    try {
        const stopProc = spawn(["docker", "stop", containerName], { stdout: "pipe", stderr: "pipe" });
        await stopProc.exited;
        const rmProc = spawn(["docker", "rm", containerName], { stdout: "pipe", stderr: "pipe" });
        await rmProc.exited;
        return true;
    } catch {
        return false;
    }
}

export async function inspectContainerRuntime(projectId: string): Promise<ContainerRuntimeInfo> {
    const containerName = getProjectContainerName(projectId);

    try {
        const proc = spawn([
            "docker",
            "inspect",
            containerName,
            "--format",
            "{{.State.Running}}|{{range $name, $network := .NetworkSettings.Networks}}{{$name}}={{$network.IPAddress}}{{end}}"
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        const exitCode = await proc.exited;
        if (exitCode !== 0) {
            return { containerName: null, containerIp: null, running: false };
        }

        const output = (await new Response(proc.stdout).text()).trim();
        const [runningFlag, networkChunk] = output.split("|");
        const ipMatch = networkChunk?.match(new RegExp(`${PREVIEW_NETWORK}=([0-9.]+)`));

        return {
            containerName,
            containerIp: ipMatch?.[1] || null,
            running: runningFlag === "true"
        };
    } catch {
        return { containerName: null, containerIp: null, running: false };
    }
}

export async function getContainerRuntime(projectId: string): Promise<{ exists: boolean; running: boolean; containerName: string; containerIp: string | null }> {
    const containerName = getProjectContainerName(projectId);
    const runtime = await inspectContainerRuntime(projectId);

    return {
        exists: !!runtime.containerName,
        running: runtime.running,
        containerName,
        containerIp: runtime.containerIp
    };
}

export async function getContainerLogs(projectId: string, tail: number = 100): Promise<string> {
    const containerName = getProjectContainerName(projectId);
    const proc = spawn(["docker", "logs", "--tail", tail.toString(), containerName], {
        stdout: "pipe",
        stderr: "pipe"
    });

    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    return out + err;
}
