import { createServiceClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { CATEGORIES } from "@/lib/types";
import type { LeaderboardEntry } from "@/lib/types";
import { LeaderboardTabs } from "./tabs";

export const dynamic = "force-dynamic";

async function getLeaderboard(
  segmentKey: string
): Promise<LeaderboardEntry[]> {
  const supabase = await createServiceClient();

  const { data: ratings } = await supabase
    .from("ratings")
    .select("person_id, rating, wins, losses, comparisons")
    .eq("context", "public")
    .is("game_id", null)
    .eq("segment_key", segmentKey)
    .order("rating", { ascending: false })
    .limit(100);

  if (!ratings || ratings.length === 0) return [];

  const personIds = ratings.map((r) => r.person_id);
  const { data: people } = await supabase
    .from("people")
    .select("*")
    .in("id", personIds)
    .eq("status", "active")
    .eq("visibility", "public");

  const personMap = new Map((people || []).map((p) => [p.id, p]));

  return ratings
    .filter((r) => personMap.has(r.person_id))
    .map((r, i) => ({
      rank: i + 1,
      person: personMap.get(r.person_id)!,
      rating: Number(r.rating),
      comparisons: r.comparisons,
      wins: r.wins,
      losses: r.losses,
    }));
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "all" } = await searchParams;

  let segmentKey = "all";
  if (tab !== "all" && tab !== "gender") {
    segmentKey = `category:${tab}`;
  }

  if (tab === "gender") {
    segmentKey = "gender:women";
  }

  const entries = await getLeaderboard(segmentKey);

  const tabs = [
    { id: "all", label: "Overall" },
    ...CATEGORIES.map((c) => ({
      id: c,
      label: c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    })),
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">
          👑 Leaderboards
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          Rankings update in real-time as votes come in.
        </p>
      </div>

      <LeaderboardTabs tabs={tabs} activeTab={tab} />

      <div className="mt-6">
        <LeaderboardTable entries={entries} />
      </div>
    </AppShell>
  );
}
