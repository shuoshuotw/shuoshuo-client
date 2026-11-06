import { BadgeCheck } from "lucide-react";

/** After a name: an account the site vouches for, such as 說說官方 (`verified`, set only in SQL). */
export function VerifiedMark({ size = 16 }: { size?: number }) {
  return <BadgeCheck className="verified-mark" role="img" aria-label="已驗證帳號" size={size} />;
}

/** On the account's own page, beside its name: the check and its word on a slowly flowing blue. */
export function VerifiedBadge() {
  return (
    <span className="verified-badge">
      <BadgeCheck aria-hidden="true" size={15} />
      已驗證
    </span>
  );
}
