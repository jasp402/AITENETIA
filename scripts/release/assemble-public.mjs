import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, ".release-manifest.json");
const stagingDir = path.join(root, "public-sync");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

for (const entry of manifest.copy) {
  const from = path.join(root, entry.from);
  const to = path.join(stagingDir, entry.to);
  if (!existsSync(from)) {
    throw new Error(`Missing manifest source: ${entry.from}`);
  }
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

for (const relative of manifest.exclude || []) {
  rmSync(path.join(stagingDir, relative), { recursive: true, force: true });
}

const summary = [];
for (const name of readdirSync(stagingDir)) {
  summary.push(name);
}

console.log(JSON.stringify({
  stagingDir,
  copied: manifest.copy.length,
  excluded: (manifest.exclude || []).length,
  obfuscateScopes: (manifest.obfuscate || []).map((item) => item.scope),
  rootEntries: summary
}, null, 2));
