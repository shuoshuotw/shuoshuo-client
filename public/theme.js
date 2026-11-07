// Runs before first paint, so CDN-cached pages never flash the wrong theme (SPEC §12.8).
(function () {
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem("theme");
  } catch (e) {}
  var dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.add(dark ? "dark" : "light");

  // The header's guess before paint: the CDN serves everyone the same HTML (CD-03). stores/session.ts corrects a stale cookie.
  if (/(?:^|; )sb-[^=]+-auth-token/.test(document.cookie)) root.classList.add("signed-in");

  // 減少動畫, chosen on this device (lib/motion-pref.ts)
  try {
    if (localStorage.getItem("motion") === "reduce") root.dataset.motion = "reduce";
  } catch (e) {}
  var reduced = root.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;

  // M-01 and M-09 hide what they are about to bring in. The timer keeps text readable if the script never arrives.
  if (/^\/($|quotes|trending|u\/)/.test(location.pathname) && !reduced) {
    root.classList.add("pick-pending");
    // Long enough for a phone to fetch the font and GSAP; lifting it sooner showed the sentence whole, then hid it again
    setTimeout(function () {
      root.classList.remove("pick-pending");
    }, 3000);
  }
})();
