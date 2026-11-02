// Toast pulls framer-motion's full bundle, so it only loads with the first message (M0 #11)
export async function notify(title: string) {
  const { addToast } = await import("@heroui/toast");
  addToast({ title });
}
