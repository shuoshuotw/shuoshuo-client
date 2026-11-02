// Runs before first paint, so CDN-cached pages never flash the wrong theme (SPEC §12.8).
(function () {
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem("theme");
  } catch (e) {}
  var dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.add(dark ? "dark" : "light");

  // M-01 hides the type until it can be picked. The timer keeps text readable if the script never arrives.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("pick-pending");
    setTimeout(function () {
      root.classList.remove("pick-pending");
    }, 1500);
  }
})();
