import { AppShell } from "@/components/app-shell";

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="prose mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-sm text-neutral-gray">
          Last updated: February 2026
        </p>

        <h2 className="mt-8 text-lg font-semibold">Data We Collect</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          We collect your Google account email, name, and profile picture when
          you sign in. We also record your votes, filters, and session data to
          power the leaderboard and matchmaking systems.
        </p>

        <h2 className="mt-8 text-lg font-semibold">How We Use Your Data</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          Your data is used to provide the Service: authenticating you, managing
          subscriptions, recording votes, computing rankings, and enabling
          private games.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Third Parties</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          We use Supabase for authentication and data storage, Stripe for
          payment processing, and Vercel for hosting. Each has their own privacy
          policies. We do not sell your data.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Data Retention</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          Vote data is retained for ranking computation. You can request deletion
          of your account and associated data by contacting us.
        </p>

        <h2 className="mt-8 text-lg font-semibold">Contact</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          For privacy inquiries, email us at privacy@mogged.chat.
        </p>
      </div>
    </AppShell>
  );
}
