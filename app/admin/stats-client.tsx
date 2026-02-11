"use client";

import { useEffect, useState } from "react";

interface Stats {
  votesToday: number;
  activeSubscribers: number;
  pendingSubmissions: number;
  openReports: number;
  totalPeople: number;
}

export function AdminStatsInner() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-neutral-gray/20 bg-neutral-gray/5"
          />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Votes Today", value: stats.votesToday, color: "text-green-primary" },
    { label: "Subscribers", value: stats.activeSubscribers, color: "text-green-primary" },
    { label: "Pending Reviews", value: stats.pendingSubmissions, color: "text-yellow-600" },
    { label: "Open Reports", value: stats.openReports, color: "text-red-alert" },
    { label: "Total People", value: stats.totalPeople, color: "text-text" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-neutral-gray/20 p-4"
        >
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          <p className="text-xs text-neutral-gray">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
