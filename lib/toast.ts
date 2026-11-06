/** A step that needs a fresh sign-in says so in a toast, with the way to do it on the toast itself. */
export function askToReauth(pathname: string) {
  void notify("此操作需驗證身分", "failed", { label: "驗證", href: `/login?reauth=1&next=${encodeURIComponent(pathname)}` });
}

// Toast pulls framer-motion's full bundle, so it only loads with the first message (M0 #11)
export async function notify(title: string, tone: "done" | "failed" = "done", action?: { label: string; href: string }) {
  const [{ addToast, closeToast }, { createElement }, { CircleAlert, CircleCheck }, { LinkButton }] = await Promise.all([
    import("@heroui/toast"),
    import("react"),
    import("lucide-react"),
    action ? import("@/components/link-button") : Promise.resolve({ LinkButton: null }),
  ]);
  // A step the message asks for (signing in again) is a button on the toast itself, a page change in the app like any
  // other link; the toast goes as it is pressed, and stays up longer meanwhile
  let key: string | null = null;
  const props = { href: action?.href ?? "", size: "sm", radius: "full", color: "primary", className: "toast-action", "data-magnet": true, onPress: () => key && closeToast(key) };
  const button = action && LinkButton ? createElement(LinkButton, props as Parameters<typeof LinkButton>[0], action.label) : undefined;
  key = addToast({
    title,
    icon: createElement(tone === "done" ? CircleCheck : CircleAlert, { size: 20, "aria-hidden": true }),
    ...(button && { endContent: button, timeout: 9000 }),
    classNames: { base: tone === "done" ? "toast" : "toast toast-failed", title: "toast-title", icon: "toast-icon", closeButton: "toast-close" },
  });
}
