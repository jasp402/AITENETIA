import type { Subprocess } from "bun";

export const activeSubprocesses = new Map<string, Subprocess>();
