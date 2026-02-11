"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES, GENDERS, type Filters } from "@/lib/types";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (filters: Filters) => void;
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onApply,
}: FilterDrawerProps) {
  const [local, setLocal] = useState<Filters>(filters);

  const selectedCategories = local.categories || [];

  const toggleCategory = (cat: string) => {
    const current = [...selectedCategories];
    const idx = current.indexOf(cat);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(cat);
    }
    setLocal({ ...local, categories: current.length > 0 ? current : undefined });
  };

  const selectAllCategories = () => {
    setLocal({ ...local, categories: undefined });
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleReset = () => {
    setLocal({});
    onApply({});
    onClose();
  };

  if (!open) return null;

  const activeFilterCount =
    (local.gender ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon-purple text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Gender */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-dim">
              Gender
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", ...GENDERS.filter((g) => g !== "all")].map((g) => (
                <button
                  key={g}
                  onClick={() =>
                    setLocal({ ...local, gender: g === "all" ? undefined : g })
                  }
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all",
                    (!local.gender && g === "all") || local.gender === g
                      ? "border-neon-purple bg-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      : "border-border text-text-muted hover:border-neon-purple/50 hover:text-text"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Category - Multi-select */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-dim">
              Categories{" "}
              <span className="normal-case font-normal text-text-dim/60">
                (select multiple)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={selectAllCategories}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  selectedCategories.length === 0
                    ? "border-neon-purple bg-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    : "border-border text-text-muted hover:border-neon-purple/50 hover:text-text"
                )}
              >
                All
              </button>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all",
                      isSelected
                        ? "border-neon-purple bg-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                        : "border-border text-text-muted hover:border-neon-purple/50 hover:text-text"
                    )}
                  >
                    {cat.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exclude repeats */}
          <div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={local.excludeRepeats ?? false}
                onChange={(e) =>
                  setLocal({ ...local, excludeRepeats: e.target.checked })
                }
                className="h-4 w-4 rounded border-border bg-surface text-neon-purple accent-neon-purple focus:ring-neon-purple"
              />
              <span className="text-sm font-medium text-text">
                Exclude recently seen
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            onClick={handleReset}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 rounded-lg bg-neon-purple px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
