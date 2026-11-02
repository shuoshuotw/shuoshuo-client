// SPEC §10.2: the home page's First Load JS must stay within 200 KB gzip. Run after `pnpm build`.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET = 200 * 1024;
const html = readFileSync(".next/server/app/index.html", "utf8");
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)[^"]*"/g)].map((match) => match[1]))];

let total = 0;
for (const script of scripts) {
  total += gzipSync(readFileSync(`.next${script.replace("/_next", "")}`)).length;
}

const kb = (total / 1024).toFixed(1);
if (scripts.length === 0) {
  console.error("No scripts found in the home page; did the build change shape?");
  process.exit(1);
}
if (total > BUDGET) {
  console.error(`Home page First Load JS is ${kb} KB gzip, over the 200 KB budget`);
  process.exit(1);
}
console.log(`Home page First Load JS: ${kb} KB gzip across ${scripts.length} files`);
