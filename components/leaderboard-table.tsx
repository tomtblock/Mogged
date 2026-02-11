import Link from "next/link";
import { formatRating, winRate } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  showLinks?: boolean;
}

export function LeaderboardTable({
  entries,
  showLinks = true,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-surface/50 p-8 text-center text-text-muted">
        No rankings yet. Start voting to build the leaderboard.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-surface/30">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-surface/80">
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-dim">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-dim">
              Person
            </th>
            <th className="hidden px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-dim sm:table-cell">
              Rating
            </th>
            <th className="hidden px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-dim md:table-cell">
              Win %
            </th>
            <th className="hidden px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-dim md:table-cell">
              Votes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {entries.map((entry) => (
            <tr
              key={entry.person.id}
              className="transition-colors hover:bg-surface/60"
            >
              <td className="px-4 py-3">
                <span
                  className={`text-sm font-bold ${
                    entry.rank === 1
                      ? "rank-1"
                      : entry.rank === 2
                        ? "rank-2"
                        : entry.rank === 3
                          ? "rank-3"
                          : "text-text-dim"
                  }`}
                >
                  {entry.rank <= 3
                    ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                    : `#${entry.rank}`}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 flex-none overflow-hidden rounded-lg border border-border/30">
                    <img
                      src={
                        entry.person.headshot_url || entry.person.headshot_path
                      }
                      alt={entry.person.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    {showLinks ? (
                      <Link
                        href={`/p/${entry.person.slug}`}
                        className="truncate text-sm font-semibold text-text hover:text-neon-purple transition-colors"
                      >
                        {entry.person.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-text">
                        {entry.person.name}
                      </span>
                    )}
                    <p className="truncate text-xs text-text-dim">
                      {entry.person.profession}
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-right sm:table-cell">
                <span className="text-sm font-bold text-neon-cyan">
                  {formatRating(entry.rating)}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-right md:table-cell">
                <span className="text-sm text-text-muted">
                  {winRate(entry.wins, entry.comparisons)}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-right md:table-cell">
                <span className="text-sm text-text-dim">
                  {entry.comparisons}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
