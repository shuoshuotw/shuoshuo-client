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

  // M-01 and M-09 hide what they are about to bring in. The timer keeps text readable if the script never arrives.
  if (/^\/($|quotes|trending|u\/)/.test(location.pathname) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("pick-pending");
    setTimeout(function () {
      root.classList.remove("pick-pending");
    }, 1500);
  }
})();
