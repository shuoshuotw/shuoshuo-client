// MO-08, UI-08, UI-11, UI-12: rules a type checker cannot see.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIRS = ["app", "components", "lib", "motion", "stores"];
const problems = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(tsx?|css)$/.test(name)) yield path;
  }
}

const files = SOURCE_DIRS.flatMap((dir) => [...walk(dir)]).map((path) => ({
  path: path.replaceAll("\\", "/"),
  text: readFileSync(path, "utf8"),
}));

let sloganCount = 0;

for (const { path, text } of files) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const at = `${path}:${index + 1}`;
    if (/from "(gsap|animejs)|import\("(gsap|animejs)/.test(line) && !path.startsWith("motion/")) {
      problems.push(`${at}: gsap and animejs may only be imported from motion/ (R-02)`);
    }
    if (/from "framer-motion"|from "motion\/react"|import\("framer-motion/.test(line)) {
      problems.push(`${at}: the app must not import framer-motion; it belongs to HeroUI (§13.1)`);
    }
    if (/\.tsx$/.test(path) && /#[0-9a-fA-F]{3,8}\b/.test(line) && !/href=|#[a-z]+-/.test(line)) {
      problems.push(`${at}: hard-coded colour; use a token (§12.3)`);
    }
    if (line.includes("語錄")) problems.push(`${at}: the product calls them 說說, never 語錄 (D-46)`);
  });
  sloganCount += text.split("讓文字不僅止於說說").length - 1;
}

if (sloganCount !== 1) problems.push(`The slogan appears ${sloganCount} times in source; it belongs once, on the home page (UI-11)`);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`design rules ok: ${files.length} files`);
