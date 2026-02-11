import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json();
  const {
    leftPersonId,
    rightPersonId,
    winnerId,
    context = "public",
    gameId = null,
    skipped = false,
    filters = {},
    sessionId = null,
  } = body;

  if (!leftPersonId || !rightPersonId) {
    return NextResponse.json(
      { error: "Missing person IDs" },
      { status: 400 }
    );
  }

  if (!skipped && !winnerId) {
    return NextResponse.json(
      { error: "Must specify winner or skip" },
      { status: 400 }
    );
  }

  // For guest users, acknowledge the vote but don't record to DB
  if (!user) {
    return NextResponse.json({ result: "guest_vote_acknowledged" });
  }

  try {
    // Use service client to call the RPC (avoids RLS issues for inserts)
    const serviceClient = await createServiceClient();

    const { data, error } = await serviceClient.rpc("submit_vote", {
      p_voter_id: user.id,
      p_context: context,
      p_game_id: gameId,
      p_left_id: leftPersonId,
      p_right_id: rightPersonId,
      p_winner_id: winnerId || leftPersonId, // fallback, won't be used if skipped
      p_skipped: skipped,
      p_filters: filters,
      p_session_id: sessionId,
    });

    if (error) {
      console.error("Vote RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result: data });
  } catch (err) {
    console.error("Vote error:", err);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}
