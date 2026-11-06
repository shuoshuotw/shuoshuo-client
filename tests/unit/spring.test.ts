import { describe, expect, it } from "vitest";
import { springEase } from "@/motion/spring";

describe("springEase", () => {
  it("overshoots about a fifth, ends at 1 and settles in under a second", () => {
    const { easing, duration } = springEase();
    const points = easing.slice("linear(".length, -1).split(", ").map(Number);
    expect(points[0]).toBe(0);
    expect(points.at(-1)).toBe(1);
    expect(Math.max(...points)).toBeGreaterThan(1.15);
    expect(Math.max(...points)).toBeLessThan(1.3);
    expect(duration).toBeGreaterThan(500);
    expect(duration).toBeLessThan(1000);
  });
});
