import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "./nav";
import {
  getTestModeFromCookies,
  isTestModeEnabled,
} from "@/lib/test-mode";

export async function AppShell({ children }: { children: React.ReactNode }) {
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

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name, avatar_url, subscription_status")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isSubscribed =
    profile?.subscription_status === "active" || isProTestMode;

  return (
    <>
      <Nav
        user={
          profile
            ? {
                email: profile.email,
                avatar_url: profile.avatar_url,
                full_name: profile.full_name,
              }
            : null
        }
        isSubscribed={isSubscribed}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
