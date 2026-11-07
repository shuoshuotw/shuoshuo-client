import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppFrame } from "@/components/app-frame";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "說說",
  description: "繁體中文的短句平台：隨機讀一句、提交一句，也能用 API 取一句。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // theme.js sets the theme class before React hydrates
    <html lang="zh-Hant-TW" suppressHydrationWarning>
      <head>
        <link href="https://font.emtech.cc/css/NotoSansTC/400" rel="stylesheet" />
        <link href="https://font.emtech.cc/css/NotoSansTC/700" rel="stylesheet" />
        <link href="https://font.emtech.cc/css/ChenYuLuoYan/100" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must block first paint (§12.8) */}
        <script src="/theme.js" />
      </head>
      <body>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
