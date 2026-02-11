import { createServiceClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { formatRating, winRate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  // Get person
  const { data: person } = await supabase
    .from("people")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!person || person.status === "disabled") {
    return (
      <AppShell>
        <div className="py-20 text-center">
          <h1 className="text-xl font-semibold text-text">
            This entry is unavailable.
          </h1>
          <Link
            href="/leaderboards"
            className="mt-4 inline-block text-sm text-neon-purple hover:underline"
          >
            Back to leaderboards
          </Link>
        </div>
      </AppShell>
    );
  }

  // Get ratings
  const { data: ratingData } = await supabase
    .from("ratings")
    .select("*")
    .eq("person_id", person.id)
    .eq("context", "public")
    .is("game_id", null)
    .eq("segment_key", "all")
    .single();

  // Get mog relationships
  const { data: mogsOutgoing } = await supabase
    .from("pair_stats")
    .select(
      "*, person_a:people!pair_stats_person_a_id_fkey(*), person_b:people!pair_stats_person_b_id_fkey(*)"
    )
    .eq("context", "public")
    .is("game_id", null)
    .or(`person_a_id.eq.${person.id},person_b_id.eq.${person.id}`)
    .gte("comparisons", 10)
    .order("comparisons", { ascending: false })
    .limit(20);

  // Process mog edges
  const mogsThemList: Array<{
    person: typeof person;
    confidence: number;
    comparisons: number;
  }> = [];
  const moggedByList: Array<{
    person: typeof person;
    confidence: number;
    comparisons: number;
  }> = [];

  mogsOutgoing?.forEach((ps) => {
    const isA = ps.person_a_id === person.id;
    const myWins = isA ? ps.a_wins : ps.b_wins;
    const other = isA ? ps.person_b : ps.person_a;
    const confidence = myWins / ps.comparisons;

    if (!other || other.status === "disabled") return;

    if (confidence >= 0.7) {
      mogsThemList.push({
        person: other,
        confidence,
        comparisons: ps.comparisons,
      });
    } else if (1 - confidence >= 0.7) {
      moggedByList.push({
        person: other,
        confidence: 1 - confidence,
        comparisons: ps.comparisons,
      });
    }
  });

  const rating = ratingData ? Number(ratingData.rating) : 1000;
  const comparisons = ratingData?.comparisons || 0;
  const wins = ratingData?.wins || 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-border/50">
            <img
              src={person.headshot_url || person.headshot_path}
              alt={person.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-text">{person.name}</h1>
            <p className="mt-1 text-text-muted">{person.profession}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-lg bg-neon-purple/10 px-2.5 py-1 text-xs font-medium text-neon-purple capitalize">
                {person.category.replace("_", " ")}
              </span>
              {person.gender && person.gender !== "unspecified" && (
                <span className="rounded-lg bg-surface-light px-2.5 py-1 text-xs font-medium text-text-dim capitalize">
                  {person.gender}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-surface/50 p-4 text-center">
            <p className="text-2xl font-bold text-neon-cyan">
              {formatRating(rating)}
            </p>
            <p className="text-xs text-text-dim">Rating</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface/50 p-4 text-center">
            <p className="text-2xl font-bold text-text">{comparisons}</p>
            <p className="text-xs text-text-dim">Comparisons</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface/50 p-4 text-center">
            <p className="text-2xl font-bold text-text">
              {winRate(wins, comparisons)}
            </p>
            <p className="text-xs text-text-dim">Win Rate</p>
          </div>
        </div>

        {/* Mog relationships */}
        {mogsThemList.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-dim">
              Mogs (outgoing)
            </h2>
            <div className="space-y-2">
              {mogsThemList.slice(0, 5).map((edge) => (
                <Link
                  key={edge.person.id}
                  href={`/p/${edge.person.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface/30 p-3 transition-all hover:border-neon-purple/30"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-border/30">
                    <img
                      src={
                        edge.person.headshot_url || edge.person.headshot_path
                      }
                      alt={edge.person.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {edge.person.name}
                    </p>
                    <p className="text-xs text-text-dim truncate">
                      {edge.person.profession}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-neon-green">
                    {Math.round(edge.confidence * 100)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {moggedByList.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-dim">
              Mogged by (incoming)
            </h2>
            <div className="space-y-2">
              {moggedByList.slice(0, 5).map((edge) => (
                <Link
                  key={edge.person.id}
                  href={`/p/${edge.person.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-surface/30 p-3 transition-all hover:border-hot/30"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-border/30">
                    <img
                      src={
                        edge.person.headshot_url || edge.person.headshot_path
                      }
                      alt={edge.person.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {edge.person.name}
                    </p>
                    <p className="text-xs text-text-dim truncate">
                      {edge.person.profession}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-hot">
                    {Math.round(edge.confidence * 100)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Attribution */}
        {person.headshot_attribution && (
          <div className="mt-8 rounded-lg bg-surface/50 px-4 py-3 text-xs text-text-dim">
            Photo: {person.headshot_attribution}{" "}
            {person.headshot_license && `(${person.headshot_license})`}
          </div>
        )}
      </div>
    </AppShell>
  );
}
