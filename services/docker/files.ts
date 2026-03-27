import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function detectLaunchCommand(path: string, config?: any): string | null {
    const packageJsonPath = join(path, "package.json");
    const hasPackageJson = existsSync(packageJsonPath);
    const hasBunLock = existsSync(join(path, "bun.lock"));
    const framework = String(config?.framework || "").toLowerCase();

    if (!hasPackageJson) return null;

    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        const scripts = packageJson?.scripts || {};
        const runner = hasBunLock ? "bun run" : "npm run";
        const startScript = String(scripts.start || "").toLowerCase();
        const devScript = String(scripts.dev || "").toLowerCase();
        const dependencies = {
            ...(packageJson?.dependencies || {}),
            ...(packageJson?.devDependencies || {})
        };
        const hasExplicitScript = !!startScript || !!devScript;
        const usesReactScripts = startScript.includes("react-scripts")
            || devScript.includes("react-scripts")
            || !!dependencies["react-scripts"];
        const usesNext = startScript.includes("next")
            || devScript.includes("next")
            || (!hasExplicitScript && (framework.includes("next") || !!dependencies["next"]));
        const usesAstro = startScript.includes("astro")
            || devScript.includes("astro")
            || (!hasExplicitScript && (framework.includes("astro") || !!dependencies["astro"]));
        const usesVite = startScript.includes("vite")
            || devScript.includes("vite")
            || (!hasExplicitScript && (framework.includes("vite") || !!dependencies["vite"]));

        if (scripts.dev) {
            if (usesNext) return `${runner} dev -- --hostname 0.0.0.0 --port 3000`;
            if (usesAstro || usesVite) return `${runner} dev -- --host 0.0.0.0 --port 3000`;
            return `${runner} dev -- --host 0.0.0.0 --port 3000`;
        }

        if (scripts.start) {
            if (usesReactScripts) return `HOST=0.0.0.0 PORT=3000 ${runner} start`;
            if (usesNext) return `${runner} start -- --hostname 0.0.0.0 --port 3000`;
            if (usesAstro || usesVite) return `HOST=0.0.0.0 PORT=3000 ${runner} start`;
            return `${runner} start`;
        }

        return null;
    } catch {
        return null;
    }
}

export function generateDockerfile(path: string): string {
    let content = "";

    mkdirSync(path, { recursive: true });

    const hasPackageJson = existsSync(join(path, "package.json"));
    const hasBunLock = existsSync(join(path, "bun.lock"));
    const hasRequirements = existsSync(join(path, "requirements.txt"));
    const hasMainPy = existsSync(join(path, "main.py"));

    if (hasBunLock || hasPackageJson) {
        const runtime = hasBunLock ? "oven/bun:latest" : "node:20-slim";
        content = hasBunLock
            ? `FROM ${runtime}
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install
COPY . .
EXPOSE 3000 4000 5173
CMD ["tail", "-f", "/dev/null"]`
            : `FROM ${runtime}
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 4000 5173
CMD ["tail", "-f", "/dev/null"]`;
    } else if (hasRequirements || hasMainPy) {
        content = `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN ${hasRequirements ? "pip install -r requirements.txt" : ""}
EXPOSE 8000
CMD ["python", "${hasMainPy ? "main.py" : "app.py"}"]`;
    } else {
        content = `FROM alpine:latest
WORKDIR /app
COPY . .
CMD ["tail", "-f", "/dev/null"]`;
    }

    const dockerfilePath = join(path, "Dockerfile");
    writeFileSync(dockerfilePath, content);
    writeFileSync(join(path, ".dockerignore"), ["node_modules", ".git", ".next", "dist", ".astro"].join("\n"));
    return dockerfilePath;
}
