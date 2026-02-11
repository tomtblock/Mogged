import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: list reports + pending submissions
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

  const [reportsResult, pendingResult] = await Promise.all([
    serviceClient
      .from("reports")
      .select("*")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(50),
    serviceClient
      .from("people")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    reports: reportsResult.data || [],
    pendingSubmissions: pendingResult.data || [],
  });
}

// POST: handle moderation action
export async function POST(request: Request) {
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

  const body = await request.json();
  const { action, reportId, personId, newStatus } = body;

  const serviceClient = await createServiceClient();

  if (action === "resolve_report" && reportId) {
    await serviceClient
      .from("reports")
      .update({ status: newStatus || "resolved" })
      .eq("id", reportId);
  } else if (action === "approve_submission" && personId) {
    await serviceClient
      .from("people")
      .update({
        status: "active",
        visibility: "public",
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId);
  } else if (action === "reject_submission" && personId) {
    await serviceClient
      .from("people")
      .update({
        status: "disabled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId);
  }

  return NextResponse.json({ success: true });
}
