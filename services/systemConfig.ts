import { join } from "node:path";

const DEFAULT_WORKSPACE_ROOT = "D:\\_DEVELOPMENTS\\AITENETIA_PROJECTS";

export function getWorkspaceRoot(): string {
  const configuredRoot = process.env.AITENETIA_WORKSPACE_ROOT?.trim();
  return configuredRoot || DEFAULT_WORKSPACE_ROOT;
}

export function slugifyProjectName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolveProjectPath(projectName: string, requestedFolder?: string): string {
  const folder = slugifyProjectName(requestedFolder || projectName) || "project";
  return join(getWorkspaceRoot(), folder);
}
