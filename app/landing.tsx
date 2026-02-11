"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRating } from "@/lib/utils";

interface TopMogger {
  id: string;
  name: string;
  slug: string;
  profession: string;
  category: string;
  headshot_url: string | null;
  headshot_path: string;
  rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  rank: number;
}

interface TrendingPerson {
  id: string;
  name: string;
  slug: string;
  profession: string;
  category: string;
  headshot_url: string;
}

interface LandingPageProps {
  topMoggers: TopMogger[];
  trendingMoggers: TrendingPerson[];
  stats: { totalPeople: number; totalVotes: number };
  isLoggedIn: boolean;
}

export function LandingPage({
  topMoggers,
  trendingMoggers,
  stats,
  isLoggedIn,
}: LandingPageProps) {
  const router = useRouter();

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleTryFree = () => {
    router.push("/battle");
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight text-neon-purple text-glow-purple">
            mogged.chat
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/leaderboards"
              className="hidden text-sm font-medium text-text-muted transition-colors hover:text-neon-purple sm:block"
            >
              Leaderboards
            </Link>
            <Link
              href="/battle"
              className="hidden text-sm font-medium text-text-muted transition-colors hover:text-neon-purple sm:block"
            >
              Battle
            </Link>
            {isLoggedIn ? (
              <Link
                href="/account"
                className="rounded-lg bg-neon-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                My Account
              </Link>
            ) : (
              <button
                onClick={handleSignIn}
                className="rounded-lg bg-neon-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-neon-purple/20 via-bg to-neon-cyan/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_70%)]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 text-center md:pt-28 md:pb-24">
          {/* Live badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-green/30 bg-neon-green/10 px-4 py-1.5 text-sm font-medium text-neon-green">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" />
            </span>
            {stats.totalVotes > 0
              ? `${stats.totalVotes.toLocaleString()} votes cast`
              : "Live now"}
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl">
            <span className="text-text">WHO</span>{" "}
            <span className="bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-transparent">
              MOGS
            </span>
            <span className="text-text">?</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg text-text-muted md:text-xl">
            Two pics. One tap. Watch the rankings form.
            <br className="hidden sm:block" />
            {stats.totalPeople > 0 && (
              <span className="text-text-dim">
                {stats.totalPeople.toLocaleString()}+ people in the database.
              </span>
            )}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleTryFree}
              className="group relative overflow-hidden rounded-xl bg-neon-purple px-8 py-4 text-lg font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] active:scale-[0.98]"
            >
              <span className="relative z-10">Vote Now — 3 Free</span>
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple via-neon-pink to-neon-purple bg-[length:200%] transition-all group-hover:animate-gradient" />
            </button>
            {!isLoggedIn && (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 rounded-xl border border-border px-6 py-4 text-base font-semibold text-text-muted transition-all hover:border-neon-purple/50 hover:text-text"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-text-dim">
            18+ only. By using mogged.chat you agree to our{" "}
            <Link href="/terms" className="underline hover:text-text-muted">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-text-muted">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ─── Trending Moggers Carousel ─── */}
      {trendingMoggers.length > 0 && (
        <section className="border-t border-border/30 py-12">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-text">
                  Trending Moggers
                </h2>
              </div>
              <Link
                href="/leaderboards"
                className="text-sm font-medium text-neon-purple hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
              {trendingMoggers.map((person) => (
                <Link
                  key={person.id}
                  href={`/p/${person.slug}`}
                  className="group flex-none"
                >
                  <div className="relative h-48 w-36 overflow-hidden rounded-xl border border-border/50 transition-all duration-300 hover:border-neon-purple/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] sm:h-56 sm:w-44">
                    <img
                      src={person.headshot_url}
                      alt={person.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    {/* Category badge */}
                    <div className="absolute left-2 top-2 rounded-full bg-neon-purple/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
                      {person.category?.replace("_", " ") || "Other"}
                    </div>
                    {/* Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-sm font-bold text-white leading-tight truncate">
                        {person.name}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        {person.profession}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Top Moggers Leaderboard ─── */}
      {topMoggers.length > 0 && (
        <section className="border-t border-border/30 py-12">
          <div className="mx-auto max-w-4xl px-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <h2 className="text-xl font-bold text-text">Top Moggers</h2>
              </div>
              <Link
                href="/leaderboards"
                className="text-sm font-medium text-neon-purple hover:underline"
              >
                Full leaderboard →
              </Link>
            </div>

            <div className="space-y-2">
              {topMoggers.slice(0, 10).map((person) => (
                <Link
                  key={person.id}
                  href={`/p/${person.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-border/50 bg-surface/60 px-4 py-3 transition-all hover:border-neon-purple/30 hover:bg-surface"
                >
                  {/* Rank */}
                  <div className="flex h-8 w-8 flex-none items-center justify-center">
                    {person.rank === 1 ? (
                      <span className="text-xl rank-1">🥇</span>
                    ) : person.rank === 2 ? (
                      <span className="text-xl rank-2">🥈</span>
                    ) : person.rank === 3 ? (
                      <span className="text-xl rank-3">🥉</span>
                    ) : (
                      <span className="text-sm font-bold text-text-dim">
                        #{person.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative h-10 w-10 flex-none overflow-hidden rounded-lg">
                    <img
                      src={person.headshot_url || person.headshot_path}
                      alt={person.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text group-hover:text-neon-purple transition-colors">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-text-dim">
                      {person.profession}
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="text-right flex-none">
                    <p className="text-sm font-bold text-neon-cyan">
                      {formatRating(person.rating)}
                    </p>
                    {person.comparisons > 0 && (
                      <p className="text-xs text-text-dim">
                        {person.wins}W-{person.losses}L
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How It Works ─── */}
      <section className="border-t border-border/30 py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-sm font-bold uppercase tracking-[0.2em] text-text-dim">
            How it works
          </h2>

          <div className="stagger-children grid gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="glass-card rounded-2xl p-6 text-center transition-all hover:border-neon-purple/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.1)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neon-purple/10 text-3xl">
                ⚔️
              </div>
              <h3 className="mb-2 font-bold text-text">See two people</h3>
              <p className="text-sm text-text-muted">
                Two headshots appear side by side. Tap the one who mogs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card rounded-2xl p-6 text-center transition-all hover:border-neon-cyan/30 hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neon-cyan/10 text-3xl">
                📈
              </div>
              <h3 className="mb-2 font-bold text-text">Rankings evolve</h3>
              <p className="text-sm text-text-muted">
                Every vote updates Elo ratings in real-time. Watch the
                leaderboard shift.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card rounded-2xl p-6 text-center transition-all hover:border-neon-pink/30 hover:shadow-[0_0_25px_rgba(236,72,153,0.1)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-neon-pink/10 text-3xl">
                🎮
              </div>
              <h3 className="mb-2 font-bold text-text">Play with friends</h3>
              <p className="text-sm text-text-muted">
                Create private games. Upload your own pics. Compare in secret.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative overflow-hidden border-t border-border/30 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.1),transparent_70%)]" />

        <div className="relative mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold text-text md:text-4xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
              vote
            </span>
            ?
          </h2>
          <p className="mt-3 text-text-muted">
            3 free votes. Then $5/month for unlimited battles, private games,
            and more.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleTryFree}
              className="animate-pulse-glow rounded-xl bg-neon-purple px-8 py-4 text-lg font-bold text-white transition-all hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] active:scale-[0.98]"
            >
              Start Voting — Free
            </button>
            <Link
              href="/leaderboards"
              className="rounded-xl border border-border px-6 py-4 text-base font-semibold text-text-muted transition-all hover:border-neon-purple/50 hover:text-text"
            >
              Browse Leaderboards
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-text-dim">
            © {new Date().getFullYear()} mogged.chat
          </p>
          <div className="flex gap-4 text-sm text-text-dim">
            <Link href="/terms" className="hover:text-text-muted">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-text-muted">
              Privacy
            </Link>
            <Link href="/removal-request" className="hover:text-text-muted">
              Removal Request
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
