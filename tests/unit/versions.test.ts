import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function checkLockfile(contents: string) {
  const path = join(mkdtempSync(join(tmpdir(), "lock-")), "pnpm-lock.yaml");
  writeFileSync(path, contents);
  return spawnSync(process.execPath, ["scripts/check-versions.ts", path], { encoding: "utf8" });
}

describe("UI-09: the HeroUI version guard", () => {
  it("passes the real lockfile", () => {
    expect(spawnSync(process.execPath, ["scripts/check-versions.ts"], { encoding: "utf8" }).status).toBe(0);
  });

  it("fails on v3", () => {
    const result = checkLockfile("packages:\n\n  '@heroui/react@3.0.0':\n    resolution: {}\n");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("@heroui/react@3.0.0");
  });

  it("fails when a subpackage slips to v3", () => {
    const result = checkLockfile("packages:\n\n  '@heroui/react@2.8.10':\n    resolution: {}\n  '@heroui/button@3.1.0':\n    resolution: {}\n");
    expect(result.status).toBe(1);
  });

  it("fails when 2.8 is missing altogether", () => {
    expect(checkLockfile("packages:\n").status).toBe(1);
  });
});
