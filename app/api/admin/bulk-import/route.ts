import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Auth + admin check
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
  const { rows } = body;

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json(
      { error: "rows array required" },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();
  const results = { created: 0, skipped: 0, failed: 0, errors: [] as string[] };

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const toInsert = batch
      .map(
        (row: {
          name: string;
          profession: string;
          category: string;
          gender?: string;
          headshot_url: string;
          attribution?: string;
          license?: string;
        }) => {
          if (!row.name || !row.profession || !row.category || !row.headshot_url) {
            results.skipped++;
            return null;
          }

          const slug =
            row.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") +
            "-" +
            Math.random().toString(36).substring(2, 8);

          return {
            slug,
            name: row.name,
            profession: row.profession,
            category: row.category.toLowerCase(),
            gender: row.gender || "unspecified",
            source_type: "seed",
            status: "active",
            visibility: "public",
            headshot_path: row.headshot_url,
            headshot_url: row.headshot_url,
            headshot_attribution: row.attribution || "",
            headshot_license: row.license || "",
          };
        }
      )
      .filter(Boolean);

    if (toInsert.length > 0) {
      const { data, error } = await serviceClient
        .from("people")
        .insert(toInsert)
        .select("id");

      if (error) {
        results.failed += toInsert.length;
        results.errors.push(error.message);
      } else {
        results.created += data?.length || 0;
      }
    }
  }

  return NextResponse.json({ results });
}
