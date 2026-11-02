// HeroUI v3 is npm latest; fail if the lockfile ever resolves it (SPEC §5.3)
import { readFileSync } from "node:fs";

const lock = readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");
const bad = new Set<string>();

for (const [, name, version] of lock.matchAll(/^ {2}'?(@heroui\/[\w-]+)@(\d+\.\d+\.\d+)[^:]*'?:/gm)) {
  if (!name || !version) continue;
  const major = Number(version.split(".")[0]);
  if (major >= 3 || (name === "@heroui/react" && !version.startsWith("2.8."))) {
    bad.add(`${name}@${version}`);
  }
}
if (!lock.includes("@heroui/react@2.8.")) bad.add("@heroui/react 2.8.x not found");

if (bad.size > 0) {
  console.error(`Forbidden HeroUI versions: ${[...bad].join(", ")}`);
  process.exit(1);
}
console.log("HeroUI versions OK");
