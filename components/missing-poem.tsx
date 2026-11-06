"use client";

import { useEffect, useState } from "react";

// Lines about what is gone while something stays: the page is gone, the address remains
const LINES = ["於今腐草無螢火，終古垂楊有暮鴉。", "人間四月芳菲盡，山寺桃花始盛開。", "無情最是台城柳，依舊煙籠十里堤。", "只今惟有西江月，曾照吳王宮裡人。"];

/**
 * One of four lines, a different one each visit. Picked once the page is in the browser, so the cached page stays the
 * same for everyone; until then the first line holds its place unseen (they are all one length), so nothing moves.
 */
export function MissingPoem() {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => setLine(LINES[Math.floor(Math.random() * LINES.length)]!), []);
  return (
    <span className="missing-poem" data-shown={line !== null}>
      {line ?? LINES[0]}
    </span>
  );
}
