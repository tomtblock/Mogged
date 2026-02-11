"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";

interface Report {
  id: number;
  created_at: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
}

interface PendingSubmission {
  id: string;
  name: string;
  headshot_url: string;
  headshot_path: string;
  created_at: string;
  category: string;
}

export function ModerationQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "pending">("reports");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation");
      const data = await res.json();
      setReports(data.reports || []);
      setPending(data.pendingSubmissions || []);
    } catch {
      // fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReportAction = async (reportId: number, status: string) => {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_report",
        reportId,
        newStatus: status,
      }),
    });
    fetchData();
  };

  const handleSubmissionAction = async (
    personId: string,
    action: string
  ) => {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: action === "approve" ? "approve_submission" : "reject_submission",
        personId,
      }),
    });
    fetchData();
  };

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-neutral-gray/20">
        <button
          onClick={() => setTab("reports")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "reports"
              ? "border-green-primary text-green-primary"
              : "border-transparent text-neutral-gray"
          )}
        >
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === "pending"
              ? "border-green-primary text-green-primary"
              : "border-transparent text-neutral-gray"
          )}
        >
          Pending Submissions ({pending.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-primary border-t-transparent" />
        </div>
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-gray">
            No open reports. All clear!
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-neutral-gray/20 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {report.reason}
                    </p>
                    <p className="mt-1 text-xs text-neutral-gray">
                      {report.target_type} &middot;{" "}
                      {timeAgo(report.created_at)}
                    </p>
                    {report.details && (
                      <p className="mt-2 text-sm text-text/70">
                        {report.details}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleReportAction(report.id, "resolved")
                      }
                      className="rounded-lg border border-green-primary/30 px-3 py-1 text-xs font-medium text-green-primary transition-colors hover:bg-green-lighter"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() =>
                        handleReportAction(report.id, "rejected")
                      }
                      className="rounded-lg border border-neutral-gray/30 px-3 py-1 text-xs font-medium text-neutral-gray transition-colors hover:bg-neutral-gray/5"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : pending.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-gray">
          No pending submissions.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-4 rounded-xl border border-neutral-gray/20 p-4"
            >
              <img
                src={person.headshot_url || person.headshot_path}
                alt={person.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-semibold">{person.name}</p>
                <p className="text-xs capitalize text-neutral-gray">
                  {person.category} &middot;{" "}
                  {timeAgo(person.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleSubmissionAction(person.id, "approve")
                  }
                  className="rounded-lg bg-green-primary px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-light"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    handleSubmissionAction(person.id, "reject")
                  }
                  className="rounded-lg border border-red-alert/30 px-4 py-1.5 text-xs font-semibold text-red-alert transition-colors hover:bg-red-alert/5"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
