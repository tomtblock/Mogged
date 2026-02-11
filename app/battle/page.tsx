import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { BattleArena } from "./arena";
import {
  getTestModeFromCookies,
  isTestModeEnabled,
} from "@/lib/test-mode";

export default async function BattlePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check for Pro test mode
  const cookieStore = await cookies();
  const isProTestMode =
    isTestModeEnabled() &&
    getTestModeFromCookies(
      cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
    ) === "pro";

  let defaultFilters = {};
  let isGuest = true;
  let isSubscribed = false;

  if (user) {
    isGuest = false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_filters, subscription_status")
      .eq("id", user.id)
      .single();

    defaultFilters = profile?.default_filters || {};
    isSubscribed =
      profile?.subscription_status === "active" || isProTestMode;
  } else if (isProTestMode) {
    // Even without a real user, Pro test mode simulates a subscriber
    // (they'll still be a guest in terms of auth, but no paywall)
    isGuest = false;
    isSubscribed = true;
  }

  return (
    <AppShell>
      <BattleArena
        defaultFilters={defaultFilters}
        isGuest={isGuest}
        isSubscribed={isSubscribed}
      />
    </AppShell>
  );
}
