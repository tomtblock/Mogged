import type { Metadata } from "next";
import "./globals.css";
import { DevToolbar } from "@/components/dev-toolbar";

export const metadata: Metadata = {
  title: "mogged.chat — Who mogs? Vote now.",
  description:
    "Vote on who mogs who. See trending moggers, climb the leaderboard, create private games with friends. 3 free votes to try.",
  openGraph: {
    title: "mogged.chat — Who mogs?",
    description:
      "Vote on who mogs who. Trending moggers. Live leaderboards. Free to try.",
    siteName: "mogged.chat",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-text">
        {children}
        <DevToolbar />
      </body>
    </html>
  );
}
