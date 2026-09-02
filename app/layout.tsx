import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreamdurim Radar",
  description: "한국과 중국의 채용 기회를 선별하는 Dreamdurim 운영 도구",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
