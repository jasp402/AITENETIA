#!/usr/bin/env node

import { copyFileSync, existsSync } from "node:fs";
import { spawn, spawnSync, execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const appDir = path.join(rootDir, "app");
const envExamplePath = path.join(rootDir, ".env.example");
const envPath = path.join(rootDir, ".env");
const FRONTEND_PORT = 4000;
const BACKEND_PORT = 4001;

const args = process.argv.slice(2);
const command = args[0] || "help";
const flags = new Set(args.slice(1));

function quoteWindowsArg(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function resolveCommand(commandName, commandArgs) {
  if (process.platform === "win32" && (commandName === "npm" || commandName === "pnpm")) {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", [commandName, ...commandArgs].map(quoteWindowsArg).join(" ")],
    };
  }

  return {
    command: commandName,
    args: commandArgs,
  };
}

function log(message) {
  console.log(`[aitenetia] ${message}`);
}

function warn(message) {
  console.warn(`[aitenetia] ${message}`);
}

function fail(message, exitCode = 1) {
  console.error(`[aitenetia] ${message}`);
  process.exit(exitCode);
}

function runCommand(commandName, commandArgs, options = {}) {
  const resolved = resolveCommand(commandName, commandArgs);
  const result = spawnSync(resolved.command, resolved.args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      fail(`Command not found: ${commandName}`);
    }
    fail(result.error.message);
  }

  if ((result.status ?? 0) !== 0) {
    fail(`Command failed: ${commandName} ${commandArgs.join(" ")}`, result.status ?? 1);
  }
}

function ensureEnvFile() {
  if (existsSync(envPath)) {
    log("Using existing .env file.");
    return;
  }

  if (!existsSync(envExamplePath)) {
    fail("Missing .env.example, cannot create .env.");
  }

  copyFileSync(envExamplePath, envPath);
  log("Created .env from .env.example.");
}

function hasCommand(commandName) {
  const checkCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checkCommand, [commandName], { stdio: "ignore" });
  return result.status === 0;
}

function getAppPackageManager() {
  const hasPnpmLock = existsSync(path.join(appDir, "pnpm-lock.yaml"));
  const hasBunLock = existsSync(path.join(appDir, "bun.lockb")) || existsSync(path.join(appDir, "bun.lock"));
  return hasPnpmLock ? "pnpm" : hasBunLock ? "bun" : "npm";
}

function ensureAppDependencies() {
  if (!existsSync(path.join(appDir, "package.json"))) {
    fail("Missing app/package.json.");
  }

  const packageManager = getAppPackageManager();

  if (!hasCommand(packageManager)) {
    fail(`The frontend expects ${packageManager}. Install it and run the setup again.`);
  }

  log(`Installing frontend dependencies in app/ using ${packageManager}...`);
  runCommand(packageManager, ["install"], { cwd: appDir });
}

function initializeDatabase({ required }) {
  if (!hasCommand("bun")) {
    const message = "Bun is required to initialize the backend database. Install Bun and run `npm run setup` again.";
    if (required) fail(message);
    warn(message);
    return false;
  }

  log("Initializing SQLite schema and agent seed...");
  runCommand("bun", ["run", "scripts/init_db.ts"], { cwd: rootDir });
  return true;
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const stdout = execSync(`netstat -ano | findstr :${port}`, { stdio: ["ignore", "pipe", "ignore"] }).toString();
      const pids = new Set();
      for (const line of stdout.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        const pid = parts.at(-1);
        const address = parts[1];
        if (!pid || !address) continue;
        if (address.endsWith(`:${port}`) || address === `[::]:${port}`) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        if (pid !== "0") {
          log(`Freeing port ${port} (PID ${pid})...`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        }
      }
      return;
    }

    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore", shell: true });
  } catch {
    // Port already free or utility unavailable.
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {
      // Keep polling until timeout.
    }
    await wait(1000);
  }
  return false;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], {
      cwd: rootDir,
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", [url], { cwd: rootDir, detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { cwd: rootDir, detached: true, stdio: "ignore" }).unref();
}

async function launchStack({ open = false }) {
  if (!hasCommand("bun")) {
    fail("Bun is required to launch the backend. Install Bun and try again.");
  }

  killPort(FRONTEND_PORT);
  killPort(BACKEND_PORT);

  log(`Starting backend on http://127.0.0.1:${BACKEND_PORT} ...`);
  const backend = spawn("bun", ["run", "index.ts"], {
    cwd: rootDir,
    stdio: "inherit",
  });

  log(`Starting frontend on http://127.0.0.1:${FRONTEND_PORT} ...`);
  const frontendManager = getAppPackageManager();
  const frontendArgs = frontendManager === "bun" ? ["run", "dev"] : ["run", "dev"];
  const frontendCommand = resolveCommand(frontendManager, frontendArgs);
  const frontend = spawn(frontendCommand.command, frontendCommand.args, {
    cwd: appDir,
    stdio: "inherit",
  });

  const shutdown = () => {
    backend.kill("SIGINT");
    frontend.kill("SIGINT");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (open) {
    log("Waiting for frontend to become reachable before opening the browser...");
    const ready = await waitForHttp(`http://127.0.0.1:${FRONTEND_PORT}`);
    if (ready) {
      openBrowser(`http://127.0.0.1:${FRONTEND_PORT}`);
      log("Browser opened.");
    } else {
      warn("Frontend did not become reachable in time. Browser was not opened.");
    }
  }

  backend.on("exit", (code) => {
    if (code && code !== 0) {
      warn(`Backend exited with code ${code}.`);
    }
  });

  frontend.on("exit", (code) => {
    if (code && code !== 0) {
      warn(`Frontend exited with code ${code}.`);
    }
  });
}

async function installFlow({ start = false, open = false }) {
  ensureEnvFile();
  ensureAppDependencies();
  initializeDatabase({ required: true });
  log("Installation flow completed.");

  if (start) {
    await launchStack({ open });
  }
}

function printHelp() {
  console.log(`AITENETIA CLI

Usage:
  node scripts/cli.mjs postinstall
  node scripts/cli.mjs install [--start] [--open]
  node scripts/cli.mjs init-db
  node scripts/cli.mjs launch [--open]

Commands:
  postinstall  Ensures app dependencies, .env and best-effort DB initialization.
  install      Completes installation from an already-installed root project.
  init-db      Creates or updates SQLite schema and seeds agents.
  launch       Starts backend and frontend together.
`);
}

async function main() {
  switch (command) {
    case "postinstall":
      ensureEnvFile();
      ensureAppDependencies();
      initializeDatabase({ required: false });
      log("Postinstall completed.");
      return;
    case "install":
      await installFlow({
        start: flags.has("--start") || flags.has("--launch"),
        open: flags.has("--open"),
      });
      return;
    case "init-db":
      initializeDatabase({ required: true });
      return;
    case "launch":
      await launchStack({ open: flags.has("--open") });
      return;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    default:
      fail(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
