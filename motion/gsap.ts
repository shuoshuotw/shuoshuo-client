import { logMotion, prefersReduced } from "./log";

// Every GSAP move lives here (§13.1). Dynamic import keeps it out of the home page's first load (M0 #11).
const loadGsap = () => import("gsap").then((module) => module.gsap);

async function loadPlugin<T extends object>(load: () => Promise<T>, pick: (module: T) => object) {
  const [gsap, module] = await Promise.all([loadGsap(), load()]);
  gsap.registerPlugin(pick(module));
  return { gsap, module };
}

const clearProps = "transform,opacity";

let running: { finish: () => void } | null = null;

/** Ends whatever M-01 is in progress and leaves its type readable. */
export function stopPicking() {
  running?.finish();
  running = null;
}

/** M-01: the type falls into place one sort at a time. Resolves true if it ran to its end. */
export async function pickType(root: HTMLElement): Promise<boolean> {
  stopPicking();
  const chars = [...root.querySelectorAll<HTMLElement>("[data-char]")];
  if (prefersReduced()) {
    logMotion("M-01", "reduced", "start");
    const animation = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-in-out" });
    await animation.finished.catch(() => {});
    logMotion("M-01", "reduced", "end");
    return true;
  }

  const gsap = await loadGsap();
  logMotion("M-01", "full", "start");
  return new Promise((resolve) => {
    // Over 40 characters, whole lines drop in together: a stagger per character would outrun the 720 ms budget
    const lines = new Map<number, HTMLElement[]>();
    for (const char of chars) {
      const line = root.closest("[data-layout='vertical']") ? char.offsetLeft : char.offsetTop;
      lines.set(line, [...(lines.get(line) ?? []), char]);
    }
    const groups = chars.length > 40 ? [...lines.values()] : chars.map((char) => [char]);
    const each = Math.min(0.018, 0.36 / Math.max(groups.length, 1));

    const timeline = gsap.timeline({
      onComplete: () => {
        gsap.set(chars, { clearProps });
        running = null;
        logMotion("M-01", "full", "end");
        resolve(true);
      },
    });
    groups.forEach((group, index) => {
      timeline.fromTo(group, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, ease: "power3.out" }, index * each);
    });
    running = {
      finish: () => {
        timeline.kill();
        gsap.set(chars, { clearProps });
        logMotion("M-01", "full", "end");
        resolve(false);
      },
    };
  });
}

/** The leaving half of M-01. Returns a function that puts the type back when the next quote is ready. */
export function dropType(root: HTMLElement): () => void {
  stopPicking();
  if (prefersReduced()) return () => {};
  const animation = root.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(4px)" }], {
    duration: 150,
    easing: "ease-in",
    fill: "forwards",
  });
  return () => animation.cancel();
}

/** M-02: every character travels from its old place to its new one. */
export async function flipLayout(root: HTMLElement, change: () => void) {
  stopPicking();
  if (prefersReduced()) {
    logMotion("M-02", "reduced", "start");
    change();
    logMotion("M-02", "reduced", "end");
    return;
  }
  const chars = [...root.querySelectorAll<HTMLElement>("[data-char]")];
  const { module, gsap } = await loadPlugin(() => import("gsap/Flip"), (loaded) => loaded.Flip);
  const state = module.Flip.getState(chars);
  change();
  logMotion("M-02", "full", "start");
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  module.Flip.from(state, {
    duration: 0.5,
    stagger: 0.008,
    ease: "expo.out",
    onComplete: () => {
      gsap.set(chars, { clearProps });
      logMotion("M-02", "full", "end");
    },
  });
}

/** Builds a ScrollTrigger scope and returns its cleanup. Nothing here runs on the server. */
export async function withScroll(root: HTMLElement, build: (tools: Awaited<ReturnType<typeof scrollTools>>) => void) {
  const tools = await scrollTools();
  const context = tools.gsap.context(() => build(tools), root);
  return () => context.revert();
}

async function scrollTools() {
  const { gsap, module } = await loadPlugin(() => import("gsap/ScrollTrigger"), (loaded) => loaded.ScrollTrigger);
  return { gsap, ScrollTrigger: module.ScrollTrigger };
}

/** M-10: the parts of a section rise once as it enters. Content is visible until this runs, and stays so if it never does. */
export async function revealSections(root: HTMLElement) {
  if (prefersReduced()) {
    logMotion("M-10", "reduced", "start");
    return () => {};
  }
  logMotion("M-10", "full", "start");
  return withScroll(root, ({ gsap, ScrollTrigger }) => {
    for (const section of root.querySelectorAll<HTMLElement>("[data-reveal-group]")) {
      const parts = section.querySelectorAll("[data-reveal]");
      gsap.set(parts, { y: 24, opacity: 0 });
      ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        once: true,
        onEnter: () => gsap.to(parts, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.08, clearProps }),
      });
    }
  });
}

/** M-11: the footer's contents rise from behind the page as it comes into view. Phones keep a plain footer. */
export async function curtainFooter(footer: HTMLElement) {
  if (prefersReduced() || innerWidth < 1024) {
    logMotion("M-11", "reduced", "start");
    return () => {};
  }
  logMotion("M-11", "full", "start");
  return withScroll(footer, ({ gsap }) => {
    gsap.from(footer.firstElementChild, {
      yPercent: -35,
      ease: "none",
      scrollTrigger: { trigger: footer, start: "top bottom", end: "bottom bottom", scrub: true },
    });
  });
}

/** Cards that fold into spines. Only transforms and clips change as the page scrolls. */
export async function foldSpines(stage: HTMLElement, deck: HTMLElement, spine: number) {
  if (prefersReduced()) return () => {};
  const cards = [...deck.querySelectorAll<HTMLElement>("[data-spine-card]")];
  return withScroll(stage, ({ gsap, ScrollTrigger }) => {
    const place = (progress: number) => {
      const open = deck.clientWidth - spine * (cards.length - 1);
      const step = progress * (cards.length - 1);
      const left = (index: number) => index * spine + Math.min(1, Math.max(0, index - step)) * (open - spine);
      // Clipped rather than covered: a card's hidden part is really gone, for clicks as well as for the eye
      cards.forEach((card, index) => {
        const visible = index === cards.length - 1 ? open : left(index + 1) - left(index);
        gsap.set(card, { x: left(index), clipPath: `inset(0 ${open - visible}px 0 0)` });
      });
    };
    place(0);
    ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => place(self.progress),
      onRefresh: (self) => place(self.progress),
    });
  });
}
