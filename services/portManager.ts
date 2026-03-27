import net from "node:net";
import { spawn } from "bun";
import { dbService } from "./db";
import { dockerService } from "./dockerService";

const PORT_RANGE = { min: 6000, max: 6500 };
const MAX_ATTEMPTS = 32;

async function closeServer(server: net.Server) {
    await new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
}

function tryBindSocket(port: number, host: string = "0.0.0.0"): Promise<net.Server | null> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(null));
        server.listen(port, host, () => resolve(server));
    });
}

async function getDockerActivePorts(): Promise<Set<number>> {
    const proc = spawn([
        "docker",
        "ps",
        "-a",
        "--format",
        "{{.Ports}}"
    ], {
        stdout: "pipe",
        stderr: "pipe"
    });

    const output = await new Response(proc.stdout).text();
    const ports = new Set<number>();

    for (const line of output.split("\n")) {
        const matches = [...line.matchAll(/(\d+)->/g)];
        for (const match of matches) {
            const parsed = Number(match[1]);
            if (Number.isFinite(parsed)) {
                ports.add(parsed);
            }
        }
    }

    return ports;
}

export const portManager = {
    async acquireAndLaunch(projectId: string, launch: (port: number) => Promise<string | null>) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const reserved = new Set(
            dbService.getReservedPorts()
                .map((row) => Number(row.assigned_port))
                .filter((port) => Number.isFinite(port) && port !== Number(project.assigned_port || NaN))
        );

        const blacklisted = new Set(
            dbService.getBlacklistedPorts()
                .map((row) => Number(row.port))
                .filter((port) => Number.isFinite(port))
        );

        const preferredPorts = project.assigned_port ? [Number(project.assigned_port)] : [];

        let candidate = PORT_RANGE.min;
        let attempts = 0;

        const nextCandidate = () => {
            while (candidate <= PORT_RANGE.max) {
                const value = candidate;
                candidate += 1;
                if (!reserved.has(value) && !blacklisted.has(value)) {
                    return value;
                }
            }
            return null;
        };

        const queue = [...preferredPorts];

        while (attempts < MAX_ATTEMPTS) {
            const selected = queue.length > 0 ? queue.shift() ?? null : nextCandidate();
            if (selected == null) {
                break;
            }

            attempts += 1;

            if (reserved.has(selected) || blacklisted.has(selected)) {
                continue;
            }

            const socket = await tryBindSocket(selected);
            if (!socket) {
                dbService.blacklistPort(selected, "host-bind-failed");
                blacklisted.add(selected);
                continue;
            }

            const dockerPorts = await getDockerActivePorts();
            if (dockerPorts.has(selected)) {
                await closeServer(socket);
                dbService.blacklistPort(selected, "docker-port-audit-conflict");
                blacklisted.add(selected);
                continue;
            }

            dbService.setAssignedPort(projectId, selected);

            try {
                await closeServer(socket);
                const containerName = await launch(selected);

                if (!containerName) {
                    dbService.blacklistPort(selected, "docker-launch-failed");
                    dbService.clearAssignedPort(projectId);
                    blacklisted.add(selected);
                    continue;
                }

                return {
                    assignedPort: selected,
                    previewUrl: `http://127.0.0.1:${selected}`,
                    containerName
                };
            } catch (error) {
                dbService.blacklistPort(selected, "docker-launch-exception");
                dbService.clearAssignedPort(projectId);
                blacklisted.add(selected);
            }
        }

        throw new Error(`No se pudo reservar un puerto para el proyecto ${projectId} tras ${attempts} intentos`);
    }
};
