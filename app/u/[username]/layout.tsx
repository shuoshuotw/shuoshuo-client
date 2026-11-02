import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { RouteTabs } from "@/components/route-tabs";
import { PageShell } from "@/components/site-chrome";
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
  const tabs = [
    { href: base, label: "說說" },
    ...(profile.likes_public ? [{ href: `${base}/likes`, label: "按讚" }] : []),
    ...(profile.favorites_public ? [{ href: `${base}/favorites`, label: "收藏" }] : []),
  ];

  return (
    <PageShell className="list-page">
      <header className="profile-head">
        <Avatar url={profile.avatar_url} name={profile.username} size={72} />
        <div>
          <h1 className="section-title">{profile.username}</h1>
          <p>
            {profile.quote_count} 則說說 · {formatDate(profile.created_at)} 加入
          </p>
        </div>
      </header>
      <RouteTabs tabs={tabs} />
      {children}
    </PageShell>
  );
}
