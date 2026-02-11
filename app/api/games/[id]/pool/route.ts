import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: list game pool
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify membership
  const { data: member } = await supabase
    .from("game_members")
    .select("role")
    .eq("game_id", gameId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: pool } = await supabase
    .from("game_pool")
    .select("person_id, people(*)")
    .eq("game_id", gameId);

  return NextResponse.json({
    pool: pool?.map((p) => p.people) || [],
  });
}

// POST: add people to game pool
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { personIds } = body;

  if (!personIds || !Array.isArray(personIds)) {
    return NextResponse.json(
      { error: "personIds array required" },
      { status: 400 }
    );
  }

  const rows = personIds.map((pid: string) => ({
    game_id: gameId,
    person_id: pid,
    added_by: user.id,
  }));

  const { error } = await supabase
    .from("game_pool")
    .upsert(rows, { onConflict: "game_id,person_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, added: personIds.length });
}
