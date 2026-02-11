import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateJoinCode } from "@/lib/utils";

// GET: list user's games
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("game_members")
    .select("game_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ games: [] });
  }

  const gameIds = memberships.map((m) => m.game_id);
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .in("id", gameIds)
    .order("created_at", { ascending: false });

  const roleMap = new Map(memberships.map((m) => [m.game_id, m.role]));

  return NextResponse.json({
    games: (games || []).map((g) => ({
      ...g,
      userRole: roleMap.get(g.id) || "member",
    })),
  });
}

// POST: create a new game
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, allowMemberUploads = true } = body;

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const joinCode = generateJoinCode();

  const { data: game, error } = await supabase
    .from("games")
    .insert({
      created_by: user.id,
      title,
      description: description || null,
      join_code: joinCode,
      allow_member_uploads: allowMemberUploads,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add creator as host
  await supabase.from("game_members").insert({
    game_id: game.id,
    user_id: user.id,
    role: "host",
  });

  return NextResponse.json({ game });
}
