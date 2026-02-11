"use client";

import { useState } from "react";
import { BattleCard } from "@/components/battle-card";
import type { Game } from "@/lib/types";

interface Member {
  userId: string;
  role: string;
  name: string;
  avatarUrl: string;
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

interface GameLobbyProps {
  game: Game;
  userRole: string;
  userId: string;
  members: Member[];
  poolSize: number;
}

export function GameLobby({
  game,
  userRole,
  userId,
  members,
  poolSize: initialPoolSize,
}: GameLobbyProps) {
  const [tab, setTab] = useState<"lobby" | "vote" | "leaderboard">("lobby");
  const [matchup, setMatchup] = useState<{
    left: PersonCard;
    right: PersonCard;
  } | null>(null);
  const [selected, setSelected] = useState<"left" | "right" | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [poolSize, setPoolSize] = useState(initialPoolSize);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(game.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startVoting = async () => {
    if (poolSize < 2) return;
    setVoteLoading(true);
    try {
      const res = await fetch("/api/match/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "game", gameId: game.id }),
      });
      const data = await res.json();
      if (data.left && data.right) {
        setMatchup({ left: data.left, right: data.right });
        setTab("vote");
      }
    } catch {
      // fail
    } finally {
      setVoteLoading(false);
    }
  };

  const handleVote = async (side: "left" | "right") => {
    if (!matchup || selected) return;
    setSelected(side);
    const winner = side === "left" ? matchup.left : matchup.right;

    fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leftPersonId: matchup.left.id,
        rightPersonId: matchup.right.id,
        winnerId: winner.id,
        context: "game",
        gameId: game.id,
      }),
    });

    setTimeout(async () => {
      const res = await fetch("/api/match/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "game", gameId: game.id }),
      });
      const data = await res.json();
      if (data.left && data.right) {
        setMatchup({ left: data.left, right: data.right });
      }
      setSelected(null);
    }, 200);
  };

  const addPublicPeople = async () => {
    // Fetch random public people and add to pool
    try {
      const res = await fetch("/api/match/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "public" }),
      });
      const data = await res.json();
      if (data.left && data.right) {
        const ids = [data.left.id, data.right.id];
        await fetch(`/api/games/${game.id}/pool`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personIds: ids }),
        });
        setPoolSize((s) => s + 2);
      }
    } catch {
      // fail
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{game.title}</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-neutral-gray/10 px-3 py-1.5 font-mono text-sm tracking-wider">
              {game.join_code}
            </span>
            <button
              onClick={copyCode}
              className="rounded-lg border border-neutral-gray/30 px-3 py-1.5 text-sm font-medium transition-colors hover:border-green-primary"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        {game.description && (
          <p className="mt-1 text-sm text-neutral-gray">{game.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-neutral-gray/20">
        {(["lobby", "vote", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => (t === "vote" ? startVoting() : setTab(t))}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-green-primary text-green-primary"
                : "border-transparent text-neutral-gray hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lobby tab */}
      {tab === "lobby" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Members */}
          <div className="rounded-xl border border-neutral-gray/20 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-gray">
              Members ({members.length})
            </h2>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3">
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-primary text-xs font-bold text-white">
                      {m.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {m.name}
                      {m.userId === userId && " (you)"}
                    </p>
                    <p className="text-xs capitalize text-neutral-gray">
                      {m.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pool */}
          <div className="rounded-xl border border-neutral-gray/20 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-gray">
              Pool
            </h2>
            <p className="mb-4 text-3xl font-bold">{poolSize}</p>
            <p className="mb-4 text-sm text-neutral-gray">
              {poolSize < 2
                ? "Add at least 2 people to start voting."
                : `${poolSize} people in the pool.`}
            </p>
            <button
              onClick={addPublicPeople}
              className="rounded-lg bg-green-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-light"
            >
              Add from Public Pool
            </button>
          </div>
        </div>
      )}

      {/* Vote tab */}
      {tab === "vote" && matchup && (
        <div className="flex flex-col items-center">
          <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
            <BattleCard
              person={matchup.left}
              side="left"
              onSelect={() => handleVote("left")}
              selected={selected === "left"}
              disabled={!!selected}
            />
            <BattleCard
              person={matchup.right}
              side="right"
              onSelect={() => handleVote("right")}
              selected={selected === "right"}
              disabled={!!selected}
            />
          </div>
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === "leaderboard" && (
        <div className="text-center text-neutral-gray">
          <p>Game leaderboard coming soon. Keep voting!</p>
        </div>
      )}
    </div>
  );
}
