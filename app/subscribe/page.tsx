import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubscribeForm } from "./subscribe-form";

export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_status === "active") {
    redirect("/battle");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text">
            Subscribe to{" "}
            <span className="bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
              mogged.chat
            </span>
          </h1>
          <p className="mt-2 text-text-muted">
            $5/month. Cancel anytime. Unlimited voting, leaderboards,
            and private games.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-surface/50 p-6">
          {/* Plan summary */}
          <div className="mb-6 flex items-center justify-between rounded-lg border border-neon-purple/20 bg-neon-purple/10 p-4">
            <div>
              <p className="font-bold text-neon-purple">mogged.chat Pro</p>
              <p className="text-sm text-text-dim">Monthly billing</p>
            </div>
            <p className="text-2xl font-bold text-neon-purple">$5/mo</p>
          </div>

          <SubscribeForm />
        </div>

        <p className="mt-4 text-center text-xs text-text-dim">
          Payments processed securely by Stripe.
          <br />
          Cancel anytime from your account settings.
        </p>
      </div>
    </AppShell>
  );
}
