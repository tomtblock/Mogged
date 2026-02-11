import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AccountActions } from "./actions";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-text">Account</h1>

        {/* Profile info */}
        <div className="mt-6 rounded-xl border border-border/50 bg-surface/50 p-5">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-14 w-14 rounded-full ring-2 ring-neon-purple/30"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-purple text-xl font-bold text-white">
                {(profile.full_name || profile.email)?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-text">
                {profile.full_name || "User"}
              </p>
              <p className="text-sm text-text-dim">{profile.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="mt-4 rounded-xl border border-border/50 bg-surface/50 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-dim">
            Subscription
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-text capitalize">
                {profile.subscription_status === "active"
                  ? "Active"
                  : profile.subscription_status}
              </p>
              {profile.subscription_current_period_end && (
                <p className="text-sm text-text-dim">
                  Renews{" "}
                  {new Date(
                    profile.subscription_current_period_end
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                profile.subscription_status === "active"
                  ? "bg-neon-green/10 text-neon-green"
                  : "bg-hot/10 text-hot"
              }`}
            >
              {profile.subscription_status === "active"
                ? "Active"
                : "Inactive"}
            </span>
          </div>
        </div>

        <AccountActions hasSubscription={!!profile.stripe_customer_id} />
      </div>
    </AppShell>
  );
}
