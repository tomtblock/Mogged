"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  profession: string;
  category: string;
  gender: string;
  headshot_url: string;
}

interface MatchupPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (left: SearchResult, right: SearchResult) => void;
}

export function MatchupPicker({ open, onClose, onSelect }: MatchupPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [leftPick, setLeftPick] = useState<SearchResult | null>(null);
  const [rightPick, setRightPick] = useState<SearchResult | null>(null);
  const [activeSlot, setActiveSlot] = useState<"left" | "right">("left");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset when closing
      setQuery("");
      setResults([]);
      setLeftPick(null);
      setRightPick(null);
      setActiveSlot("left");
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handlePickPerson = (person: SearchResult) => {
    if (activeSlot === "left") {
      setLeftPick(person);
      // Auto-switch to right slot and clear search
      setActiveSlot("right");
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // Don't allow same person on both sides
      if (leftPick && person.id === leftPick.id) return;
      setRightPick(person);
      setQuery("");
      setResults([]);
    }
  };

  const handleStart = () => {
    if (leftPick && rightPick) {
      onSelect(leftPick, rightPick);
      onClose();
    }
  };

  const clearSlot = (slot: "left" | "right") => {
    if (slot === "left") {
      setLeftPick(null);
    } else {
      setRightPick(null);
    }
    setActiveSlot(slot);
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl sm:inset-x-auto">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-neon-purple/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-bold text-text">
              🎯 Custom Battle
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-dim hover:bg-surface-light hover:text-text transition-colors"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Selected Slots */}
          <div className="flex items-center gap-3 px-5 py-4">
            {/* Left slot */}
            <button
              onClick={() => leftPick ? clearSlot("left") : setActiveSlot("left")}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-xl border p-3 transition-all",
                activeSlot === "left" && !leftPick
                  ? "border-neon-purple/50 bg-neon-purple/5"
                  : leftPick
                    ? "border-neon-green/30 bg-neon-green/5"
                    : "border-border"
              )}
            >
              {leftPick ? (
                <>
                  <img
                    src={leftPick.headshot_url}
                    alt={leftPick.name}
                    className="h-10 w-10 rounded-lg object-cover flex-none"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-text truncate">
                      {leftPick.name}
                    </p>
                    <p className="text-xs text-text-dim truncate">
                      {leftPick.profession}
                    </p>
                  </div>
                  <span className="text-text-dim text-xs">✕</span>
                </>
              ) : (
                <div className="flex w-full items-center justify-center py-2">
                  <span className="text-sm text-text-dim">
                    {activeSlot === "left" ? "Searching..." : "Pick fighter 1"}
                  </span>
                </div>
              )}
            </button>

            {/* VS */}
            <span className="flex-none text-sm font-black text-neon-purple text-glow-purple">
              VS
            </span>

            {/* Right slot */}
            <button
              onClick={() => rightPick ? clearSlot("right") : setActiveSlot("right")}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-xl border p-3 transition-all",
                activeSlot === "right" && !rightPick
                  ? "border-neon-purple/50 bg-neon-purple/5"
                  : rightPick
                    ? "border-neon-green/30 bg-neon-green/5"
                    : "border-border"
              )}
            >
              {rightPick ? (
                <>
                  <img
                    src={rightPick.headshot_url}
                    alt={rightPick.name}
                    className="h-10 w-10 rounded-lg object-cover flex-none"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-text truncate">
                      {rightPick.name}
                    </p>
                    <p className="text-xs text-text-dim truncate">
                      {rightPick.profession}
                    </p>
                  </div>
                  <span className="text-text-dim text-xs">✕</span>
                </>
              ) : (
                <div className="flex w-full items-center justify-center py-2">
                  <span className="text-sm text-text-dim">
                    {activeSlot === "right" ? "Searching..." : "Pick fighter 2"}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="border-t border-border px-5 py-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim"
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
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder={`Search for fighter ${activeSlot === "left" ? "1" : "2"}...`}
                className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-dim focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neon-purple border-t-transparent" />
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-64 overflow-y-auto">
            {results.length > 0 ? (
              <div className="px-5 pb-3">
                {results.map((person) => {
                  const isAlreadyPicked =
                    (leftPick && person.id === leftPick.id) ||
                    (rightPick && person.id === rightPick.id) || false;

                  return (
                    <button
                      key={person.id}
                      onClick={() => !isAlreadyPicked && handlePickPerson(person)}
                      disabled={isAlreadyPicked}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        isAlreadyPicked
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-surface-light"
                      )}
                    >
                      <img
                        src={person.headshot_url}
                        alt={person.name}
                        className="h-10 w-10 rounded-lg object-cover flex-none"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text truncate">
                          {person.name}
                        </p>
                        <p className="text-xs text-text-dim truncate">
                          {person.profession} &middot;{" "}
                          {person.category?.replace("_", " ")}
                        </p>
                      </div>
                      {isAlreadyPicked ? (
                        <span className="text-xs text-neon-green">Selected</span>
                      ) : (
                        <span className="text-xs text-neon-purple">
                          Pick as #{activeSlot === "left" ? "1" : "2"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : query.length >= 2 && !searching ? (
              <div className="px-5 py-6 text-center text-sm text-text-dim">
                No moggers found for &quot;{query}&quot;
              </div>
            ) : query.length === 0 && !leftPick && !rightPick ? (
              <div className="px-5 py-6 text-center text-sm text-text-dim">
                Search for moggers by name
              </div>
            ) : null}
          </div>

          {/* Start Battle Button */}
          <div className="border-t border-border px-5 py-4">
            <button
              onClick={handleStart}
              disabled={!leftPick || !rightPick}
              className="w-full rounded-xl bg-neon-purple px-4 py-3 text-base font-bold text-white transition-all hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] disabled:opacity-40 active:scale-[0.98]"
            >
              {!leftPick
                ? "Pick fighter 1"
                : !rightPick
                  ? "Pick fighter 2"
                  : `⚔️ ${leftPick.name} vs ${rightPick.name}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
