"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavProps {
  user: { email: string; avatar_url?: string; full_name?: string } | null;
  isSubscribed: boolean;
}

const navLinks: {
  href: string;
  label: string;
  requiresAuth?: boolean;
  requiresSub?: boolean;
}[] = [
  { href: "/battle", label: "Battle" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/submit", label: "Submit Mogger", requiresAuth: true },
  { href: "/games", label: "Private Games", requiresSub: true },
  { href: "/upload", label: "Upload", requiresSub: true },
];

export function Nav({ user, isSubscribed }: NavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Wordmark */}
        <Link
          href={user ? "/battle" : "/"}
          className="text-lg font-bold tracking-tight text-neon-purple text-glow-purple"
        >
          mogged.chat
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            if (link.requiresSub && (!user || !isSubscribed)) return null;
            if (link.requiresAuth && !user) return null;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-neon-purple",
                  pathname === link.href
                    ? "text-neon-purple"
                    : "text-text-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/account"
              className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-neon-purple transition-colors"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full ring-1 ring-neon-purple/30"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-purple text-xs font-bold text-white">
                  {(user.full_name || user.email)?.[0]?.toUpperCase()}
                </div>
              )}
              <span className="hidden md:inline">Account</span>
            </Link>
          ) : (
            <Link
              href="/?login=true"
              className="rounded-lg bg-neon-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-neon-purple/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center md:hidden"
            aria-label="Menu"
          >
            <svg
              className="h-5 w-5 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-surface md:hidden">
          <div className="flex flex-col px-4 py-3">
            {navLinks.map((link) => {
              if (link.requiresSub && (!user || !isSubscribed)) return null;
              if (link.requiresAuth && !user) return null;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "py-2 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "text-neon-purple"
                      : "text-text-muted"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
