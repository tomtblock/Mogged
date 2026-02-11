"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BattleCard } from "@/components/battle-card";
import { FilterDrawer } from "@/components/filter-drawer";
import { ReportModal } from "@/components/report-modal";
import { SignupModal } from "@/components/signup-modal";
import { MatchupPicker } from "@/components/matchup-picker";
import type { Filters } from "@/lib/types";

const FREE_VOTE_LIMIT = 3;
const STORAGE_KEY = "mogged_free_votes";

function getStoredVotes(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function setStoredVotes(count: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, count.toString());
  } catch {
    // ignore
  }
}

interface PersonCard {
  id: string;
  slug: string;
  name: string;
  profession: string;
  headshot_url: string;
  category: string;
  gender: string;
}

interface Matchup {
  left: PersonCard;
  right: PersonCard;
}

export function BattleArena({
  defaultFilters,
  isGuest,
  isSubscribed,
}: {
  defaultFilters: Filters;
  isGuest: boolean;
  isSubscribed: boolean;
}) {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [nextMatchup, setNextMatchup] = useState<Matchup | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [isCustomMatchup, setIsCustomMatchup] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selected, setSelected] = useState<"left" | "right" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [freeVotesUsed, setFreeVotesUsed] = useState(0);
  const recentIds = useRef<string[]>([]);
  const sessionId = useRef(
    typeof crypto !== "undefined"
      ? crypto.randomUUID()
      : Math.random().toString(36)
  );

  // Load free votes from localStorage on mount
  useEffect(() => {
    if (isGuest) {
      setFreeVotesUsed(getStoredVotes());
    }
  }, [isGuest]);

  const isPaywalled = isGuest && freeVotesUsed >= FREE_VOTE_LIMIT;

  const fetchMatchup = useCallback(
    async (isPreload = false): Promise<Matchup | null> => {
      try {
        const res = await fetch("/api/match/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filters,
            context: "public",
            excludeIds: filters.excludeRepeats
              ? recentIds.current.slice(-20)
              : [],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (!isPreload) {
            setError(data.error || "Failed to load matchup");
            setLoading(false);
          }
          return null;
        }

        return { left: data.left, right: data.right };
      } catch {
        if (!isPreload) {
          setError("Failed to connect");
          setLoading(false);
        }
        return null;
      }
    },
    [filters]
  );

  // Initial load
  useEffect(() => {
    if (isPaywalled) {
      setLoading(false);
      setSignupOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    setIsCustomMatchup(false);
    fetchMatchup().then((m) => {
      setMatchup(m);
      setLoading(false);
      // Preload next
      fetchMatchup(true).then(setNextMatchup);
    });
  }, [fetchMatchup, isPaywalled]);

  const handleVote = async (side: "left" | "right") => {
    if (!matchup || selected) return;

    // Check if paywalled
    if (isGuest && freeVotesUsed >= FREE_VOTE_LIMIT) {
      setSignupOpen(true);
      return;
    }

    setSelected(side);
    const winner = side === "left" ? matchup.left : matchup.right;

    // Track recent IDs
    recentIds.current.push(matchup.left.id, matchup.right.id);
    if (recentIds.current.length > 40) {
      recentIds.current = recentIds.current.slice(-20);
    }

    // Submit vote (fire-and-forget for speed)
    fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leftPersonId: matchup.left.id,
        rightPersonId: matchup.right.id,
        winnerId: winner.id,
        context: "public",
        filters,
        sessionId: sessionId.current,
      }),
    });

    setVoteCount((c) => c + 1);

    // Track free votes for guests
    if (isGuest) {
      const newCount = freeVotesUsed + 1;
      setFreeVotesUsed(newCount);
      setStoredVotes(newCount);

      // Show paywall after this vote resolves
      if (newCount >= FREE_VOTE_LIMIT) {
        setTimeout(() => setSignupOpen(true), 600);
      }
    }

    // Brief flash then transition
    setTimeout(() => {
      // If this was a custom matchup, go back to random after voting
      if (isCustomMatchup) {
        setIsCustomMatchup(false);
      }

      if (nextMatchup) {
        setMatchup(nextMatchup);
        setNextMatchup(null);
        setSelected(null);
        fetchMatchup(true).then(setNextMatchup);
      } else {
        fetchMatchup().then((m) => {
          setMatchup(m);
          setSelected(null);
          fetchMatchup(true).then(setNextMatchup);
        });
      }
    }, 200);
  };

  const handleSkip = () => {
    if (!matchup) return;

    // If custom matchup, just go back to random
    if (isCustomMatchup) {
      setIsCustomMatchup(false);
      if (nextMatchup) {
        setMatchup(nextMatchup);
        setNextMatchup(null);
        fetchMatchup(true).then(setNextMatchup);
      } else {
        setLoading(true);
        fetchMatchup().then((m) => {
          setMatchup(m);
          setLoading(false);
          fetchMatchup(true).then(setNextMatchup);
        });
      }
      return;
    }

    fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leftPersonId: matchup.left.id,
        rightPersonId: matchup.right.id,
        skipped: true,
        context: "public",
        filters,
        sessionId: sessionId.current,
      }),
    });

    if (nextMatchup) {
      setMatchup(nextMatchup);
      setNextMatchup(null);
      fetchMatchup(true).then(setNextMatchup);
    } else {
      setLoading(true);
      fetchMatchup().then((m) => {
        setMatchup(m);
        setLoading(false);
        fetchMatchup(true).then(setNextMatchup);
      });
    }
  };

  const handleCustomMatchup = (left: PersonCard, right: PersonCard) => {
    setMatchup({ left, right });
    setIsCustomMatchup(true);
    setSelected(null);
    setError(null);
    setLoading(false);
  };

  const handleReport = (person: PersonCard) => {
    setReportTarget({ id: person.id, name: person.name });
    setReportOpen(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (signupOpen || pickerOpen) return;
      if (e.key === "ArrowLeft") handleVote("left");
      else if (e.key === "ArrowRight") handleVote("right");
      else if (e.key === "s" || e.key === "S") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleFiltersApply = (newFilters: Filters) => {
    setFilters(newFilters);
    if (!isGuest) {
      fetch("/api/profile/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFilters),
      });
    }
  };

  const freeVotesRemaining = isGuest
    ? Math.max(0, FREE_VOTE_LIMIT - freeVotesUsed)
    : null;

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 flex w-full items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            ⚔️ Who{" "}
            <span className="bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
              mogs
            </span>
            ?
          </h1>
          <div className="flex items-center gap-3">
            {voteCount > 0 && (
              <p className="text-xs text-text-dim">
                {voteCount} vote{voteCount !== 1 ? "s" : ""} this session
              </p>
            )}
            {freeVotesRemaining !== null && (
              <p className="text-xs font-medium text-neon-purple">
                {freeVotesRemaining > 0
                  ? `${freeVotesRemaining} free vote${freeVotesRemaining !== 1 ? "s" : ""} left`
                  : "No free votes left"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Custom Battle button */}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neon-purple/30 bg-neon-purple/10 px-3 py-2 text-sm font-medium text-neon-purple transition-all hover:bg-neon-purple/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Custom
          </button>

          {/* Filters button */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-neon-purple/50 hover:text-text"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {(filters.categories?.length || filters.category || filters.gender) && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neon-purple text-[10px] text-white">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Custom matchup badge */}
      {isCustomMatchup && matchup && (
        <div className="mb-4 w-full max-w-2xl">
          <div className="flex items-center justify-between rounded-lg border border-neon-purple/20 bg-neon-purple/5 px-3 py-2">
            <span className="text-xs font-medium text-neon-purple">
              🎯 Custom battle: {matchup.left.name} vs {matchup.right.name}
            </span>
            <button
              onClick={handleSkip}
              className="text-xs text-text-dim hover:text-text"
            >
              Back to random
            </button>
          </div>
        </div>
      )}

      {/* Free votes progress bar for guests */}
      {isGuest && freeVotesUsed > 0 && (
        <div className="mb-4 w-full max-w-2xl">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all duration-500"
              style={{
                width: `${(freeVotesUsed / FREE_VOTE_LIMIT) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Battle area */}
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-neon-purple border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex h-96 flex-col items-center justify-center text-center">
          <p className="mb-3 text-text-muted">{error}</p>
          <button
            onClick={() => {
              setFilters({});
              handleFiltersApply({});
            }}
            className="rounded-lg bg-neon-purple px-4 py-2 text-sm font-semibold text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : matchup ? (
        <>
          {/* Cards */}
          <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
            <BattleCard
              person={matchup.left}
              side="left"
              onSelect={() => handleVote("left")}
              selected={selected === "left"}
              defeated={selected === "right"}
              disabled={!!selected}
            />
            <BattleCard
              person={matchup.right}
              side="right"
              onSelect={() => handleVote("right")}
              selected={selected === "right"}
              defeated={selected === "left"}
              disabled={!!selected}
            />
          </div>

          {/* "VS" divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
            <span className="animate-vs text-sm font-black text-neon-purple text-glow-purple">
              VS
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text-muted transition-colors hover:border-neon-purple/50 hover:text-text"
            >
              Skip
            </button>
            {!isGuest && (
              <button
                onClick={() => {
                  if (matchup.left) handleReport(matchup.left);
                }}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-hot hover:text-hot"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
                Report
              </button>
            )}
          </div>

          {/* Keyboard hint */}
          <p className="mt-4 hidden text-xs text-text-dim md:block">
            ← left &middot; → right &middot; S skip
          </p>
        </>
      ) : null}

      {/* Custom Battle Picker */}
      <MatchupPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCustomMatchup}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={handleFiltersApply}
      />

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          open={reportOpen}
          onClose={() => {
            setReportOpen(false);
            setReportTarget(null);
          }}
          targetType="person"
          targetId={reportTarget.id}
          targetName={reportTarget.name}
        />
      )}

      {/* Signup Modal (paywall after free votes) */}
      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
      />
    </div>
  );
}
