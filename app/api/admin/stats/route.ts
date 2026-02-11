import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  const adminEmails =
    process.env.ADMIN_EMAIL_ALLOWLIST?.split(",").map((e) => e.trim()) || [];
  const isAdmin =
    profile?.is_admin || adminEmails.includes(profile?.email || "");

  if (!isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const serviceClient = await createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [votesToday, subscribers, pendingSubmissions, openReports, totalPeople] =
    await Promise.all([
      serviceClient
        .from("votes")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString()),
      serviceClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      serviceClient
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      serviceClient
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      serviceClient
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  return NextResponse.json({
    votesToday: votesToday.count || 0,
    activeSubscribers: subscribers.count || 0,
    pendingSubmissions: pendingSubmissions.count || 0,
    openReports: openReports.count || 0,
    totalPeople: totalPeople.count || 0,
  });
}
