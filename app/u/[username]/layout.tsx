import { BadgeCheck, CalendarDays, Quote } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { ProfileContent } from "@/components/profile-content";
import { RouteTabs } from "@/components/route-tabs";
import { PageShell } from "@/components/site-chrome";
import { VerifiedBadge } from "@/components/verified";
import { getProfile } from "@/lib/api/server";
import { formatDate } from "@/lib/format";

export const revalidate = 60;

// Empty on purpose: without it Next renders every request and the page never reaches the CDN (§10.5)
export const generateStaticParams = () => [];

type Props = { params: Promise<{ username: string }>; children: ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).username)} · 說說` };
}

export default async function ProfileLayout({ params, children }: Props) {
  const username = decodeURIComponent((await params).username);
  const profile = await getProfile(username);
  if (!profile) notFound();

  const base = `/u/${encodeURIComponent(profile.username)}`;
  // A private list keeps its tab; its page says it is private (PV-03)
  const tabs = [
    { href: base, label: "說說", icon: "quote" },
    { href: `${base}/likes`, label: "按讚", icon: "heart" },
    { href: `${base}/favorites`, label: "收藏", icon: "bookmark" },
  ] as const;

  return (
    <PageShell className="list-page">
      <header className="profile-head">
        {profile.verified ? (
          // The account the site vouches for wears its check on its picture too
          <span className="avatar-verified">
            <Avatar url={profile.avatar_url} name={profile.username} size={72} />
            <BadgeCheck className="avatar-verified-mark" aria-hidden="true" />
          </span>
        ) : (
          <Avatar url={profile.avatar_url} name={profile.username} size={72} />
        )}
        <div>
          <div className="profile-title">
            {/* The name alone, not the heading's full width, is what a card's name travels into (profile-morph.ts) */}
            <h1 className="section-title">
              <span className="profile-name">{profile.username}</span>
            </h1>
            {profile.verified && <VerifiedBadge />}
          </div>
          <p>
            <span>
              <Quote aria-hidden="true" size={16} />
              {profile.quote_count} 則說說
            </span>
            <span>
              <CalendarDays aria-hidden="true" size={16} />
              {formatDate(profile.created_at)} 加入
            </span>
            {(profile.standing === "banned" || profile.standing === "suspended") && (
              <span className="status-chip" data-tone={profile.standing === "banned" ? "danger" : undefined}>
                {profile.standing === "banned" ? "該帳號已被停權" : "該帳號已被暫停"}
              </span>
            )}
          </p>
        </div>
      </header>
      <RouteTabs tabs={tabs} />
      <ProfileContent base={base}>{children}</ProfileContent>
    </PageShell>
  );
}
