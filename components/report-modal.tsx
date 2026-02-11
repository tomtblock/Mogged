"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: "person" | "vote";
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS = [
  "Suspected minor",
  "NSFW / inappropriate",
  "Wrong person / fake",
  "Harassment / hateful",
  "Copyright violation",
  "Other",
];

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);

    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details || undefined,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReason("");
        setDetails("");
      }, 1500);
    } catch {
      // fail silently for now
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl">
        {submitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neon-green/10">
              <svg
                className="h-6 w-6 text-neon-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="font-semibold text-text">Report submitted</p>
            <p className="mt-1 text-sm text-text-dim">
              We&apos;ll review it shortly.
            </p>
          </div>
        ) : (
          <>
            <h3 className="mb-1 text-lg font-bold text-text">Report</h3>
            {targetName && (
              <p className="mb-4 text-sm text-text-dim">
                Reporting: {targetName}
              </p>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                    reason === r
                      ? "border-hot bg-hot/10 text-hot"
                      : "border-border text-text-muted hover:border-hot/50"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              className="mb-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-light hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 rounded-lg bg-hot px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-hot/90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
