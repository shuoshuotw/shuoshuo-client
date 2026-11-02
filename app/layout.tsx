import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "說說",
  description: "說說，讓文字不僅止於說說",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link href="https://font.emtech.cc/css/NotoSansTC/400" rel="stylesheet" />
        <link href="https://font.emtech.cc/css/ChenYuLuoYan/100" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
