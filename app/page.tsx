import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingPage } from "./landing";
import {
  getTestModeFromCookies,
  isTestModeEnabled,
} from "@/lib/test-mode";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check for Pro test mode
  const cookieStore = await cookies();
  const isProTestMode =
    isTestModeEnabled() &&
    getTestModeFromCookies(
      cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
    ) === "pro";

  // If in Pro test mode, redirect straight to battle
  if (isProTestMode) {
    redirect("/battle");
  }

  // If logged in & subscribed, redirect to battle
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_status === "active") {
      redirect("/battle");
    }
  }

  // Fetch data for the landing page using service client (bypasses RLS)
  const service = await createServiceClient();

  // Top moggers -- get highest-rated people
  const { data: topRatings } = await service
    .from("ratings")
    .select("person_id, rating, wins, losses, comparisons")
    .eq("context", "public")
    .is("game_id", null)
    .eq("segment_key", "all")
    .order("rating", { ascending: false })
    .limit(10);

  // Get all people who appear in top ratings
  const topPersonIds = (topRatings || []).map((r) => r.person_id);
  let topMoggers: Array<{
    id: string;
    name: string;
    slug: string;
    profession: string;
    category: string;
    headshot_url: string | null;
    headshot_path: string;
    rating: number;
    wins: number;
    losses: number;
    comparisons: number;
    rank: number;
  }> = [];

  if (topPersonIds.length > 0) {
    const { data: topPeople } = await service
      .from("people")
      .select("id, name, slug, profession, category, headshot_url, headshot_path")
      .in("id", topPersonIds)
      .eq("status", "active")
      .eq("visibility", "public");

    const personMap = new Map(
      (topPeople || []).map((p) => [p.id, p])
    );

    topMoggers = (topRatings || [])
      .filter((r) => personMap.has(r.person_id))
      .map((r, i) => {
        const p = personMap.get(r.person_id)!;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          profession: p.profession,
          category: p.category,
          headshot_url: p.headshot_url,
          headshot_path: p.headshot_path,
          rating: Number(r.rating),
          wins: r.wins,
          losses: r.losses,
          comparisons: r.comparisons,
          rank: i + 1,
        };
      });
  }

  // Trending moggers -- most recent votes (last 24h) grouped by person
  // Get a sample of recently active people
  const { data: recentPeople } = await service
    .from("people")
    .select("id, name, slug, profession, category, headshot_url, headshot_path")
    .eq("status", "active")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(20);

  const trendingMoggers = (recentPeople || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    profession: p.profession,
    category: p.category,
    headshot_url: p.headshot_url || p.headshot_path,
  }));

  // Total stats
  const { count: totalPeople } = await service
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("visibility", "public");

  const { count: totalVotes } = await service
    .from("votes")
    .select("id", { count: "exact", head: true });

  return (
    <LandingPage
      topMoggers={topMoggers}
      trendingMoggers={trendingMoggers}
      stats={{
        totalPeople: totalPeople || 0,
        totalVotes: totalVotes || 0,
      }}
      isLoggedIn={!!user}
    />
  );
}
