import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const { personId, action = "disable" } = body;

  if (!personId) {
    return NextResponse.json(
      { error: "personId required" },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();

  if (action === "disable") {
    const { error } = await serviceClient
      .from("people")
      .update({ status: "disabled", updated_at: new Date().toISOString() })
      .eq("id", personId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (action === "enable") {
    const { error } = await serviceClient
      .from("people")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", personId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
