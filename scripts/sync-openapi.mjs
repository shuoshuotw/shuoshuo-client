// D-09: copies the contract from the sibling shuoshuo-core and regenerates types. Commit the result together.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("openapi", { recursive: true });
copyFileSync("../shuoshuo-core/openapi/openapi.yaml", "openapi/openapi.yaml");
copyFileSync("../shuoshuo-core/openapi/errors.yaml", "openapi/errors.yaml");
// TypeScript 5 only for this tool: openapi-typescript needs the compiler JS API, which TypeScript 7 no longer ships
execFileSync(
  "pnpm",
  ["dlx", "--package=openapi-typescript@7.13.0", "--package=typescript@5.9.3", "openapi-typescript", "openapi/openapi.yaml", "-o", "openapi/types.ts"],
  { stdio: "inherit", shell: process.platform === "win32" },
);
