/**
 * A damped spring sampled at 60 fps into a CSS `linear()` easing, with the time it takes to settle. The defaults follow
 * bencho.dev's Search: it overshoots by about a fifth, swings back once and is still within about 0.7 s.
 */
export function springEase(stiffness = 500, damping = 20) {
  const dt = 1 / 240;
  const points = ["0"];
  let x = 0;
  let v = 0;
  let steps = 0;
  while (steps < 480 && (Math.abs(1 - x) > 0.001 || Math.abs(v) > 0.05)) {
    v += (stiffness * (1 - x) - damping * v) * dt;
    x += v * dt;
    if (++steps % 4 === 0) points.push(x.toFixed(4));
  }
  points.push("1");
  return { easing: `linear(${points.join(", ")})`, duration: Math.round(steps * dt * 1000) };
}
