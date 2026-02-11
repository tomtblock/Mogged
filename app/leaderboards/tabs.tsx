"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

export function LeaderboardTabs({
  tabs,
  activeTab,
}: {
  tabs: Tab[];
  activeTab: string;
}) {
  const router = useRouter();

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() =>
            router.push(
              `/leaderboards${tab.id === "all" ? "" : `?tab=${tab.id}`}`
            )
          }
          className={cn(
            "whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
            activeTab === tab.id
              ? "border-neon-purple bg-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              : "border-border text-text-muted hover:border-neon-purple/50 hover:text-text"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
