import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("people")
    .select("id, slug, name, profession, category, gender, headshot_url, headshot_path")
    .eq("status", "active")
    .eq("visibility", "public")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    profession: p.profession,
    category: p.category,
    gender: p.gender,
    headshot_url: p.headshot_url || p.headshot_path,
  }));

  return NextResponse.json({ results });
}
