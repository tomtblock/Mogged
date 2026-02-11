"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Game {
  id: string;
  title: string;
  description: string | null;
  join_code: string;
  status: string;
  created_at: string;
  userRole: string;
}

export function GamesClient() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((res) => res.json())
      .then((data) => {
        setGames(data.games || []);
        setLoading(false);
      });
  }, []);

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.game) {
        router.push(`/games/${data.game.id}`);
      } else {
        setError(data.error || "Failed to create game");
      }
    } catch {
      setError("Failed to create game");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      const data = await res.json();
      if (data.game) {
        router.push(`/games/${data.game.id}`);
      } else {
        setError(data.error || "Game not found");
      }
    } catch {
      setError("Failed to join game");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Private Games</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowJoin(!showJoin);
              setShowCreate(false);
            }}
            className="rounded-lg border border-neutral-gray/30 px-4 py-2 text-sm font-semibold transition-colors hover:border-green-primary"
          >
            Join Game
          </button>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setShowJoin(false);
            }}
            className="rounded-lg bg-green-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-light"
          >
            Create Game
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-neutral-gray/20 p-5">
          <h2 className="mb-4 font-semibold">Create New Game</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Game title"
              className="w-full rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
            />
            <input
              type="text"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
            />
            <button
              onClick={handleCreate}
              disabled={!createTitle.trim() || actionLoading}
              className="rounded-lg bg-green-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-light disabled:opacity-50"
            >
              {actionLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="mb-6 rounded-xl border border-neutral-gray/20 p-5">
          <h2 className="mb-4 font-semibold">Join a Game</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter join code"
              maxLength={8}
              className="flex-1 rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-center font-mono text-lg uppercase tracking-widest focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim() || actionLoading}
              className="rounded-lg bg-green-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-light disabled:opacity-50"
            >
              {actionLoading ? "Joining..." : "Join"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-alert/10 p-3 text-sm text-red-alert">
          {error}
        </div>
      )}

      {/* Games list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-primary border-t-transparent" />
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-neutral-gray/20 p-8 text-center text-neutral-gray">
          <p className="mb-2 text-lg font-semibold text-text">
            No games yet
          </p>
          <p className="text-sm">
            Create a game and invite friends to start playing.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-gray/20 p-4 transition-colors hover:border-green-primary"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{game.title}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      game.status === "active"
                        ? "bg-green-lighter text-green-primary"
                        : "bg-neutral-gray/10 text-neutral-gray"
                    )}
                  >
                    {game.status}
                  </span>
                  <span className="rounded-full bg-neutral-gray/10 px-2 py-0.5 text-xs font-medium capitalize text-neutral-gray">
                    {game.userRole}
                  </span>
                </div>
                {game.description && (
                  <p className="mt-1 text-sm text-neutral-gray">
                    {game.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-gray">
                <span className="font-mono text-xs">{game.join_code}</span>
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
