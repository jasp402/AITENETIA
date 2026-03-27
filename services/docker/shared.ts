export const PREVIEW_NETWORK = "preview-net";
export const PREVIEW_GATEWAY_CONTAINER = "ai-preview-gateway";
export const PREVIEW_GATEWAY_PORT = 8080;
export const REPO_ROOT = process.cwd();

export type ContainerRuntimeInfo = {
    containerName: string | null;
    containerIp: string | null;
    running: boolean;
};

export function getProjectImageName(projectId: string) {
    return `ai-project-${projectId.toLowerCase()}`;
}

export function getProjectContainerName(projectId: string) {
    return `container-${projectId.toLowerCase()}`;
}

export function getNodeModulesVolumeName(projectId: string) {
    return `${getProjectContainerName(projectId)}-node_modules`;
}

export function getCandidateAppPorts(config?: any) {
    const framework = String(config?.framework || config?.stack || "").toLowerCase();
    const ports = new Set<number>([3000, 4321, 4173, 5173, 8080, 8000]);

    if (framework.includes("astro")) {
        ports.add(4321);
        ports.add(3000);
    }

    if (framework.includes("vite") || framework.includes("react")) {
        ports.add(5173);
        ports.add(4173);
        ports.add(3000);
    }

    if (framework.includes("next")) {
        ports.add(3000);
    }

    return Array.from(ports);
}
