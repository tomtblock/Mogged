import { createServiceClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MogGraphPage() {
  const supabase = await createServiceClient();

  // Get strongest edges (highest confidence, enough comparisons)
  const { data: edges } = await supabase
    .from("pair_stats")
    .select("*")
    .eq("context", "public")
    .is("game_id", null)
    .gte("comparisons", 10)
    .order("comparisons", { ascending: false })
    .limit(50);

  // Collect person IDs
  const personIds = new Set<string>();
  edges?.forEach((e) => {
    personIds.add(e.person_a_id);
    personIds.add(e.person_b_id);
  });

  const { data: people } = await supabase
    .from("people")
    .select("*")
    .in("id", Array.from(personIds))
    .eq("status", "active");

  const personMap = new Map((people || []).map((p) => [p.id, p]));

  // Process edges into directional mog relationships
  const mogEdges: Array<{
    from: { id: string; name: string; slug: string; headshot: string };
    to: { id: string; name: string; slug: string; headshot: string };
    confidence: number;
    comparisons: number;
  }> = [];

  edges?.forEach((e) => {
    const personA = personMap.get(e.person_a_id);
    const personB = personMap.get(e.person_b_id);
    if (!personA || !personB) return;

    const aConf = e.a_wins / e.comparisons;
    const bConf = e.b_wins / e.comparisons;

    if (aConf >= 0.7) {
      mogEdges.push({
        from: {
          id: personA.id,
          name: personA.name,
          slug: personA.slug,
          headshot: personA.headshot_url || personA.headshot_path,
        },
        to: {
          id: personB.id,
          name: personB.name,
          slug: personB.slug,
          headshot: personB.headshot_url || personB.headshot_path,
        },
        confidence: aConf,
        comparisons: e.comparisons,
      });
    } else if (bConf >= 0.7) {
      mogEdges.push({
        from: {
          id: personB.id,
          name: personB.name,
          slug: personB.slug,
          headshot: personB.headshot_url || personB.headshot_path,
        },
        to: {
          id: personA.id,
          name: personA.name,
          slug: personA.slug,
          headshot: personA.headshot_url || personA.headshot_path,
        },
        confidence: bConf,
        comparisons: e.comparisons,
      });
    }
  });

  mogEdges.sort((a, b) => b.confidence - a.confidence);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mog Graph</h1>
        <p className="mt-1 text-sm text-neutral-gray">
          Strongest mog relationships based on community votes. An edge means A
          mogs B with high confidence.
        </p>
      </div>

      {mogEdges.length === 0 ? (
        <div className="rounded-xl border border-neutral-gray/20 p-8 text-center text-neutral-gray">
          Not enough data yet. Keep voting to reveal mog relationships!
        </div>
      ) : (
        <div className="space-y-3">
          {mogEdges.map((edge, i) => (
            <div
              key={`${edge.from.id}-${edge.to.id}`}
              className="flex items-center gap-3 rounded-xl border border-neutral-gray/20 p-4"
            >
              <span className="w-6 text-sm font-bold text-neutral-gray">
                {i + 1}
              </span>

              {/* From person */}
              <Link
                href={`/p/${edge.from.slug}`}
                className="flex items-center gap-2 hover:text-green-primary"
              >
                <img
                  src={edge.from.headshot}
                  alt={edge.from.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <span className="text-sm font-semibold">{edge.from.name}</span>
              </Link>

              {/* Arrow */}
              <div className="flex items-center gap-1 px-2">
                <span className="text-xs font-bold text-green-primary">
                  mogs
                </span>
                <svg
                  className="h-4 w-4 text-green-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>

              {/* To person */}
              <Link
                href={`/p/${edge.to.slug}`}
                className="flex items-center gap-2 hover:text-green-primary"
              >
                <img
                  src={edge.to.headshot}
                  alt={edge.to.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <span className="text-sm font-semibold">{edge.to.name}</span>
              </Link>

              {/* Confidence */}
              <div className="ml-auto text-right">
                <p className="text-sm font-bold text-green-primary">
                  {Math.round(edge.confidence * 100)}%
                </p>
                <p className="text-xs text-neutral-gray">
                  {edge.comparisons} votes
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
