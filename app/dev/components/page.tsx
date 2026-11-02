import { notFound } from "next/navigation";
import { DevComponents } from "./dev-components";

// The state matrix and the motions no M3 page uses yet (UI-02, MO-05, MO-09). Exists only in test builds.
export default function DevComponentsPage() {
  if (process.env.NEXT_PUBLIC_MOTION_LOG !== "1") notFound();
  return <DevComponents />;
}
