"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountActions({
  hasSubscription,
}: {
  hasSubscription: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-3">
      {hasSubscription && (
        <button
          onClick={handleManageBilling}
          disabled={loading}
          className="w-full rounded-lg border border-neutral-gray/30 px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-neutral-gray/5 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Manage Billing"}
        </button>
      )}

      <button
        onClick={handleSignOut}
        className="w-full rounded-lg border border-red-alert/30 px-4 py-2.5 text-sm font-semibold text-red-alert transition-colors hover:bg-red-alert/5"
      >
        Sign Out
      </button>
    </div>
  );
}
