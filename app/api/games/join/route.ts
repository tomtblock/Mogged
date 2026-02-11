import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { joinCode } = body;

  if (!joinCode) {
    return NextResponse.json({ error: "Join code required" }, { status: 400 });
  }

  // Find game by code
  const { data: game, error: findError } = await supabase
    .from("games")
    .select("*")
    .eq("join_code", joinCode.toUpperCase())
    .eq("status", "active")
    .single();

  if (findError || !game) {
    return NextResponse.json(
      { error: "Game not found or ended" },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("game_members")
    .select("game_id")
    .eq("game_id", game.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ game, alreadyMember: true });
  }

  // Add as member
  const { error: joinError } = await supabase.from("game_members").insert({
    game_id: game.id,
    user_id: user.id,
    role: "member",
  });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ game });
}
