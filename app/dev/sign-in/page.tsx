import { notFound } from "next/navigation";
import { DevSignIn } from "./dev-sign-in";

// OAuth needs real accounts, so full-stack E2E signs in with a password the Admin API set. Exists only in test builds.
export default function DevSignInPage() {
  if (process.env.NEXT_PUBLIC_MOTION_LOG !== "1") notFound();
  return <DevSignIn />;
}
