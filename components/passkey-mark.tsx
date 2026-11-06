import { Fingerprint } from "lucide-react";
import type { ReactNode } from "react";
import { FaWindows } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Si1Password, SiApple, SiBitwarden, SiDashlane, SiIcloud, SiKeepassxc, SiLastpass, SiSamsung, SiYubico } from "react-icons/si";

// Where a passkey is kept, told by the name Supabase gives it (from the authenticator's AAGUID), each in its own
// colour (the --brand-* tokens); Apple's and Dashlane's marks are a single dark colour, so they take the page's ink
const MARKS: [RegExp, ReactNode][] = [
  [/windows|microsoft/i, <FaWindows key="windows" className="mark-windows" />],
  [/icloud|keychain/i, <SiIcloud key="icloud" className="mark-icloud" />],
  [/apple|mac|iphone|ipad|safari/i, <SiApple key="apple" />],
  [/google|chrome|android/i, <FcGoogle key="google" />],
  [/1password/i, <Si1Password key="1password" className="mark-1password" />],
  [/bitwarden/i, <SiBitwarden key="bitwarden" className="mark-bitwarden" />],
  [/samsung/i, <SiSamsung key="samsung" className="mark-samsung" />],
  [/dashlane/i, <SiDashlane key="dashlane" />],
  [/keepass/i, <SiKeepassxc key="keepass" className="mark-keepass" />],
  [/lastpass/i, <SiLastpass key="lastpass" className="mark-lastpass" />],
  [/yubi/i, <SiYubico key="yubico" className="mark-yubico" />],
];

/** The mark of the platform that keeps a passkey, or a fingerprint when the name says nothing. */
export function PasskeyMark({ name }: { name: string | undefined }) {
  const mark = name ? MARKS.find(([pattern]) => pattern.test(name))?.[1] : undefined;
  return (
    <span className="passkey-mark" aria-hidden="true">
      {mark ?? <Fingerprint />}
    </span>
  );
}
