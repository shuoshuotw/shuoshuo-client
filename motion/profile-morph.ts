import { prefersReduced } from "./log";
import { press, WAIT_MS } from "./quote-morph";

/**
 * A submitter's name on a card (or anywhere a quote is credited) opens their profile as one shared-element view
 * transition: the picture and the name beside it travel and grow into the profile's head while the rest crossfades,
 * and the profile starts at its top. A link takes part by carrying data-profile. Within that profile's own pages
 * nothing travels; the link is left to Next. With reduced motion (asked at each click) the two pages only crossfade.
 */
export function installProfileMorph(push: (href: string) => void) {
  if (!document.startViewTransition) return () => {};

  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-profile]");
    if (!link || link.target === "_blank") return;
    const href = link.getAttribute("href")!;
    const base = decodeURIComponent(href);
    const here = decodeURIComponent(location.pathname);
    if (here === base || here.startsWith(`${base}/`)) return;
    const travel = !prefersReduced();
    // The picture beside the name: on a card's credit line, or at the head of a comment
    const avatar = travel ? (link.closest(".credit, .comment")?.querySelector<HTMLElement>(".avatar") ?? null) : null;
    event.preventDefault();
    if (travel) link.style.viewTransitionName = "profile-name";
    if (avatar) avatar.style.viewTransitionName = "profile-avatar";
    const release = press(link);

    const landed: HTMLElement[] = [];
    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          // The old picture is taken; the names go to the profile's head once it is there
          link.style.viewTransitionName = "";
          avatar?.style.removeProperty("view-transition-name");
          push(href);
          const start = performance.now();
          // Rendering is held during the transition, so no animation frame comes to poll with
          const arrived = () => {
            const name = document.querySelector<HTMLElement>(".profile-head .profile-name");
            if (name?.textContent === link.textContent) {
              const picture = document.querySelector<HTMLElement>(".profile-head .avatar");
              if (travel) {
                name.style.viewTransitionName = "profile-name";
                landed.push(name);
              }
              if (picture && avatar) {
                picture.style.viewTransitionName = "profile-avatar";
                landed.push(picture);
              }
              document.getElementById("app-scroll")?.scrollTo({ top: 0 });
              resolve();
            } else if (performance.now() - start > WAIT_MS) resolve();
            else setTimeout(arrived, 16);
          };
          arrived();
        }),
    );
    void transition.finished.finally(() => {
      release();
      link.style.removeProperty("view-transition-name");
      for (const part of landed) part.style.removeProperty("view-transition-name");
    });
  };

  // Before Next's Link sees the click: a prevented click is one it leaves alone
  document.addEventListener("click", click, true);
  return () => document.removeEventListener("click", click, true);
}
