"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface BattleCardProps {
  person: {
    id: string;
    name: string;
    profession: string;
    headshot_url: string;
    slug: string;
  };
  side: "left" | "right";
  onSelect: () => void;
  disabled?: boolean;
  selected?: boolean;
  defeated?: boolean;
}

export function BattleCard({
  person,
  side,
  onSelect,
  disabled,
  selected,
  defeated,
}: BattleCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-xl border transition-all duration-200",
        "hover:border-neon-purple/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        selected
          ? "animate-flash border-neon-green ring-2 ring-neon-green glow-purple"
          : defeated
            ? "border-hot/50 ring-1 ring-hot/30"
            : "border-border/60",
        disabled && !selected && !defeated && "pointer-events-none opacity-40"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface">
        {!imgLoaded && (
          <div className="absolute inset-0 animate-shimmer bg-surface-light" />
        )}
        <img
          src={person.headshot_url}
          alt={person.name}
          className={cn(
            "h-full w-full object-cover transition-all duration-300",
            imgLoaded ? "opacity-100" : "opacity-0",
            "group-hover:scale-105",
            defeated && "grayscale-[60%] brightness-75"
          )}
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-neon-purple/0 transition-colors group-hover:bg-neon-purple/10" />

        {/* Winner — MOGS stamp */}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center bg-neon-green/15">
            <div className="animate-stamp flex flex-col items-center">
              <span className="text-3xl font-black uppercase tracking-widest text-neon-green drop-shadow-[0_0_20px_rgba(34,197,94,0.7)] sm:text-4xl">
                MOGS
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-green/70 sm:text-xs">
                Winner
              </span>
            </div>
          </div>
        )}

        {/* Loser — MOGGED stamp */}
        {defeated && (
          <div className="absolute inset-0 flex items-center justify-center bg-hot/15">
            <div className="animate-stamp flex flex-col items-center">
              <span className="-rotate-12 text-3xl font-black uppercase tracking-widest text-hot drop-shadow-[0_0_20px_rgba(239,68,68,0.7)] sm:text-4xl">
                MOGGED
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-hot/70 sm:text-xs">
                Defeated
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col items-center gap-0.5 bg-surface p-3">
        <h3 className="text-base font-bold leading-tight text-text">
          {person.name}
        </h3>
        <p className="text-sm text-text-dim">{person.profession}</p>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-14 right-2 hidden rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold text-text-dim backdrop-blur-sm md:block">
        {side === "left" ? "←" : "→"}
      </div>
    </button>
  );
}
