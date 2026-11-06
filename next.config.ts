import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonce: it would force dynamic rendering and defeat the CDN (SPEC §11.4, R-16).
// 'unsafe-inline': Next's inline RSC payload scripts stop hydration otherwise; experimental.sri does not cover them (M0 #6).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Hashes: the <style> React Aria injects for touch-action (recheck when upgrading HeroUI) and the one Paper Shaders
  // injects for its canvas (recheck when upgrading @paper-design/shaders-react)
  "style-src 'self' https://font.emtech.cc 'sha256-38RhXrc7EdReTKsOm23ZPOCUgniTUUcjky8QOOrQx6o=' 'sha256-bcX2M6hOeEgeI9Ttj3KtXWZuoRsKenyQAlXswSnLakA='",
  "style-src-attr 'unsafe-inline'",
  "font-src https://font.emtech.cc",
  "img-src 'self' data: https://*.googleusercontent.com https://cdn.discordapp.com https://avatars.githubusercontent.com",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""} ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Default one-year stale-while-revalidate would outlive the 5-minute CDN bound (SPEC §10.5)
  expireTime: 300,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
      // CD-01: nothing behind a sign-in may reach the CDN
      ...["/me/:path*", "/admin/:path*", "/auth/:path*", "/submit"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "no-store" }],
      })),
    ];
  },
};

export default nextConfig;
