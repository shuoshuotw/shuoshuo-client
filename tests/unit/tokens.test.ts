import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("styles/tokens.css", "utf8");

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1], match[2]])) as Record<string, string>;
}

const light = block(":root");
const dark = { ...light, ...block(".dark") };

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

const PAIRS = [
  ["ink", "ground"],
  ["ink", "surface"],
  ["ink", "sunk"],
  ["muted", "ground"],
  ["muted", "surface"],
  ["action-ink", "action"],
  ["accent", "surface"],
  ["accent", "ground"],
  ["accent-ink", "accent"],
  ["success", "surface"],
  ["warning", "surface"],
];

const STOCKS = Object.keys(light).filter((name) => name.startsWith("stock-") && !["stock-ink", "stock-paper"].includes(name));

describe("UI-07: every token pair in §12.3 reaches 4.5:1", () => {
  it.each(PAIRS)("%s on %s", (text, ground) => {
    for (const theme of [light, dark]) {
      expect(contrast(theme[text]!, theme[ground]!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has all 13 category papers", () => {
    expect(STOCKS).toHaveLength(13);
  });

  it.each(STOCKS)("ink on %s", (stock) => {
    expect(contrast(light["stock-ink"]!, light[stock]!)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("hero.ts", () => {
  const hero = readFileSync("hero.ts", "utf8").toLowerCase();

  it.each(["ground", "ink", "action", "accent", "success", "warning"])("carries the %s token in both themes", (token) => {
    expect(hero).toContain(light[token]!);
    expect(hero).toContain(dark[token]!);
  });
});
