"use client";

import { useState, useRef } from "react";

interface ParsedRow {
  name: string;
  profession: string;
  category: string;
  gender?: string;
  headshot_url: string;
  attribution?: string;
  license?: string;
  valid: boolean;
  error?: string;
}

export function BulkUploader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const profIdx = headers.indexOf("profession");
    const catIdx = headers.indexOf("category");
    const genderIdx = headers.indexOf("gender");
    const urlIdx = headers.indexOf("headshot_url");
    const attrIdx = headers.indexOf("attribution");
    const licIdx = headers.indexOf("license");
    const attrAltIdx = headers.indexOf("headshot_attribution");
    const licAltIdx = headers.indexOf("headshot_license");

    return lines.slice(1).map((line) => {
      // Simple CSV parsing (doesn't handle quoted commas perfectly)
      const cols = line.split(",").map((c) => c.trim());

      const name = cols[nameIdx] || "";
      const profession = cols[profIdx] || "";
      const category = cols[catIdx] || "";
      const gender = genderIdx >= 0 ? cols[genderIdx] : undefined;
      const headshot_url = cols[urlIdx] || "";
      const attribution = cols[attrIdx >= 0 ? attrIdx : (attrAltIdx >= 0 ? attrAltIdx : -1)] || "";
      const license = cols[licIdx >= 0 ? licIdx : (licAltIdx >= 0 ? licAltIdx : -1)] || "";

      const valid = !!(name && profession && category && headshot_url);
      const error = !valid
        ? "Missing required fields"
        : undefined;

      return {
        name,
        profession,
        category,
        gender,
        headshot_url,
        attribution,
        license,
        valid,
        error,
      };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(reader.result as string);
      setRows(parsed);
      setResult(null);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();
      if (data.results) {
        setResult(data.results);
      } else {
        setError(data.error || "Import failed");
      }
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  return (
    <div>
      {/* File input */}
      <div
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-gray/30 p-8 transition-colors hover:border-green-primary"
      >
        <svg
          className="mb-3 h-10 w-10 text-neutral-gray"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm text-neutral-gray">
          Click to upload CSV file
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />

      {/* Preview */}
      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-3 text-sm">
              <span className="text-green-primary">
                {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="text-red-alert">
                  {invalidCount} invalid
                </span>
              )}
              <span className="text-neutral-gray">
                {rows.length} total
              </span>
            </div>

            <button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className="rounded-lg bg-green-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-light disabled:opacity-50"
            >
              {importing
                ? "Importing..."
                : `Import ${validCount} rows`}
            </button>
          </div>

          {/* Preview table */}
          <div className="max-h-96 overflow-auto rounded-xl border border-neutral-gray/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 border-b border-neutral-gray/20 bg-neutral-gray/5">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-gray">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-gray">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-gray">
                    Category
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-gray">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-gray/10">
                {rows.slice(0, 100).map((row, i) => (
                  <tr
                    key={i}
                    className={row.valid ? "" : "bg-red-alert/5"}
                  >
                    <td className="px-3 py-2 text-neutral-gray">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {row.name || "—"}
                    </td>
                    <td className="px-3 py-2 capitalize text-neutral-gray">
                      {row.category || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.valid ? (
                        <span className="text-green-primary">OK</span>
                      ) : (
                        <span className="text-red-alert">{row.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <p className="mt-2 text-xs text-neutral-gray">
              Showing first 100 of {rows.length} rows.
            </p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 rounded-lg bg-green-lighter p-4 text-sm">
          <p className="font-semibold text-green-primary">Import complete</p>
          <p className="mt-1 text-green-primary/80">
            Created: {result.created} &middot; Skipped: {result.skipped}{" "}
            &middot; Failed: {result.failed}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-alert/10 p-4 text-sm text-red-alert">
          {error}
        </div>
      )}
    </div>
  );
}
