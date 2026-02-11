import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Try to get user but don't require auth (guest access allowed)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use service client for guest users to bypass RLS
  const queryClient = user ? supabase : await createServiceClient();

  const body = await request.json();
  const {
    filters = {},
    context = "public",
    gameId = null,
    excludeIds = [],
  } = body;

  try {
    let query = queryClient
      .from("people")
      .select("*")
      .eq("status", "active");

    if (context === "public") {
      query = query.eq("visibility", "public");
    } else if (context === "game" && gameId) {
      // Game context requires auth
      if (!user) {
        return NextResponse.json({ error: "Sign in to play games" }, { status: 401 });
      }
      const { data: poolIds } = await queryClient
        .from("game_pool")
        .select("person_id")
        .eq("game_id", gameId);

      if (!poolIds || poolIds.length < 2) {
        return NextResponse.json(
          { error: "Not enough people in game pool", code: "INSUFFICIENT_POOL" },
          { status: 400 }
        );
      }

      query = query.in(
        "id",
        poolIds.map((p) => p.person_id)
      );
    }

    // Apply filters — multi-select categories
    if (filters.categories && filters.categories.length > 0) {
      query = query.in("category", filters.categories);
    } else if (filters.category && filters.category !== "all") {
      // Legacy single-category support
      query = query.eq("category", filters.category);
    }
    if (filters.gender && filters.gender !== "all" && filters.gender !== "mixed") {
      query = query.eq("gender", filters.gender);
    }

    // Exclude recently seen
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: candidates, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!candidates || candidates.length < 2) {
      return NextResponse.json(
        {
          error: "Not enough people for these filters",
          code: "INSUFFICIENT_CANDIDATES",
        },
        { status: 400 }
      );
    }

    // Weighted random selection: prefer people with fewer comparisons
    const candidateIds = candidates.map((c) => c.id);
    const { data: ratingData } = await queryClient
      .from("ratings")
      .select("person_id, comparisons")
      .eq("segment_key", "all")
      .eq("context", context)
      .in("person_id", candidateIds);

    const comparisonMap = new Map<string, number>();
    ratingData?.forEach((r) => comparisonMap.set(r.person_id, r.comparisons));

    const maxComp = Math.max(1, ...Array.from(comparisonMap.values()));
    const weighted = candidates.map((c) => ({
      ...c,
      weight: maxComp - (comparisonMap.get(c.id) || 0) + 1,
    }));

    const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);

    // Pick first person
    let rand = Math.random() * totalWeight;
    let leftIdx = 0;
    for (let i = 0; i < weighted.length; i++) {
      rand -= weighted[i].weight;
      if (rand <= 0) {
        leftIdx = i;
        break;
      }
    }

    // Pick second person (different from first)
    const remaining = weighted.filter((_, i) => i !== leftIdx);
    const remainingWeight = remaining.reduce((sum, c) => sum + c.weight, 0);
    rand = Math.random() * remainingWeight;
    let rightIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      rand -= remaining[i].weight;
      if (rand <= 0) {
        rightIdx = i;
        break;
      }
    }

    const left = weighted[leftIdx];
    const right = remaining[rightIdx];

    return NextResponse.json({
      left: {
        id: left.id,
        slug: left.slug,
        name: left.name,
        profession: left.profession,
        category: left.category,
        gender: left.gender,
        headshot_url: left.headshot_url || left.headshot_path,
      },
      right: {
        id: right.id,
        slug: right.slug,
        name: right.name,
        profession: right.profession,
        category: right.category,
        gender: right.gender,
        headshot_url: right.headshot_url || right.headshot_path,
      },
    });
  } catch (err) {
    console.error("Matchmaking error:", err);
    return NextResponse.json(
      { error: "Failed to get matchup" },
      { status: 500 }
    );
  }
}
