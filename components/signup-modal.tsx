"use client";

import { createClient } from "@/lib/supabase/client";

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
}

export function SignupModal({ open, onClose }: SignupModalProps) {
  if (!open) return null;

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-neon-purple/10 via-transparent to-neon-cyan/5 pointer-events-none" />

          <div className="relative p-6 text-center sm:p-8">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-light hover:text-text transition-colors"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-purple/10 text-4xl">
              🔒
            </div>

            <h2 className="text-2xl font-bold text-text">
              You&apos;ve used your free votes!
            </h2>
            <p className="mt-2 text-text-muted">
              Sign up to unlock unlimited voting, private games, and climb the
              leaderboard.
            </p>

            {/* Pricing */}
            <div className="mt-6 rounded-xl border border-neon-purple/20 bg-neon-purple/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-bold text-text">mogged.chat Pro</p>
                  <p className="text-sm text-text-dim">Unlimited everything</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neon-purple">
                    $5
                    <span className="text-sm font-normal text-text-dim">
                      /mo
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <ul className="mt-4 space-y-2 text-left">
              {[
                "Unlimited battles & voting",
                "Create private games with friends",
                "Upload your own photos",
                "Full leaderboard access",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-text-muted"
                >
                  <svg
                    className="h-4 w-4 flex-none text-neon-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleSignIn}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-neon-purple px-6 py-3.5 text-base font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
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
              Sign up with Google
            </button>

            <p className="mt-3 text-xs text-text-dim">
              Cancel anytime. Payments via Stripe.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
