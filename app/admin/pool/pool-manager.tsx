"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export function PoolManager() {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");

  useEffect(() => {
    fetchPeople();
  }, [statusFilter]);

  const fetchPeople = async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("people")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setPeople(data || []);
    setLoading(false);
  };

  const handleToggleStatus = async (person: Person) => {
    const action = person.status === "active" ? "disable" : "enable";
    await fetch("/api/admin/people/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: person.id, action }),
    });
    fetchPeople();
  };

  const filtered = people.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.profession.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="flex-1 rounded-lg border border-neutral-gray/30 px-3 py-2 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
        />
        <div className="flex gap-2">
          {["active", "disabled", "pending_review", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "border-green-primary bg-green-primary text-white"
                  : "border-neutral-gray/30 hover:border-green-primary"
              )}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-gray/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-gray/20 bg-neutral-gray/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-gray">
                  Person
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-gray sm:table-cell">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-gray">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-gray">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-gray/10">
              {filtered.map((person) => (
                <tr key={person.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={person.headshot_url || person.headshot_path}
                        alt={person.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">{person.name}</p>
                        <p className="text-xs text-neutral-gray">
                          {person.profession}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs capitalize text-neutral-gray">
                      {person.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        person.status === "active"
                          ? "bg-green-lighter text-green-primary"
                          : person.status === "disabled"
                            ? "bg-red-alert/10 text-red-alert"
                            : "bg-yellow-100 text-yellow-700"
                      )}
                    >
                      {person.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(person)}
                      className={cn(
                        "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                        person.status === "active"
                          ? "border-red-alert/30 text-red-alert hover:bg-red-alert/5"
                          : "border-green-primary/30 text-green-primary hover:bg-green-lighter"
                      )}
                    >
                      {person.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-gray">
              No people found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
