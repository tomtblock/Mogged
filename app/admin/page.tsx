import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminStatsInner } from "./stats-client";
import Link from "next/link";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  const adminEmails =
    process.env.ADMIN_EMAIL_ALLOWLIST?.split(",").map((e) => e.trim()) || [];
  const isAdmin =
    profile?.is_admin || adminEmails.includes(profile?.email || "");

  if (!isAdmin) redirect("/battle");

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="mb-8">
        <AdminStatsInner />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/pool"
          className="rounded-xl border border-neutral-gray/20 p-5 transition-colors hover:border-green-primary"
        >
          <h3 className="font-semibold">People Pool</h3>
          <p className="mt-1 text-sm text-neutral-gray">
            Search, manage, and disable people entries.
          </p>
        </Link>

        <Link
          href="/admin/bulk-upload"
          className="rounded-xl border border-neutral-gray/20 p-5 transition-colors hover:border-green-primary"
        >
          <h3 className="font-semibold">Bulk Upload</h3>
          <p className="mt-1 text-sm text-neutral-gray">
            Import people from CSV files.
          </p>
        </Link>

        <Link
          href="/admin/moderation"
          className="rounded-xl border border-neutral-gray/20 p-5 transition-colors hover:border-green-primary"
        >
          <h3 className="font-semibold">Moderation</h3>
          <p className="mt-1 text-sm text-neutral-gray">
            Review reports and pending submissions.
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
