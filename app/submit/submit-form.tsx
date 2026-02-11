"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/types";

export function SubmitMoggerForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [category, setCategory] = useState("internet_personality");

  // Social links
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [kick, setKick] = useState("");
  const [x, setX] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!file || !name.trim() || !profession.trim()) {
      setError("Name, profession, and headshot are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());
      formData.append("profession", profession.trim());
      formData.append("category", category);
      if (instagram.trim()) formData.append("instagram", instagram.trim());
      if (tiktok.trim()) formData.append("tiktok", tiktok.trim());
      if (youtube.trim()) formData.append("youtube", youtube.trim());
      if (kick.trim()) formData.append("kick", kick.trim());
      if (x.trim()) formData.append("x", x.trim());

      const res = await fetch("/api/submit-mogger", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.person) {
        setSuccess(true);
        setFile(null);
        setPreview(null);
        setName("");
        setProfession("");
        setInstagram("");
        setTiktok("");
        setYoutube("");
        setKick("");
        setX("");
        router.refresh();
      } else {
        setError(data.error || "Submission failed");
      }
    } catch {
      setError("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mt-6 rounded-xl border border-neon-green/30 bg-neon-green/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-green/10 text-4xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-text">Submitted!</h2>
        <p className="mt-2 text-sm text-text-muted">
          Your mogger has been submitted for review. Once approved, they&apos;ll
          appear in battles and on leaderboards.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 rounded-lg bg-neon-purple px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Headshot Upload */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text">
          Headshot Photo <span className="text-hot">*</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-colors hover:border-neon-purple/50 p-6"
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="mb-3 h-40 w-40 rounded-xl object-cover ring-2 ring-neon-purple/20"
            />
          ) : (
            <svg
              className="mb-3 h-10 w-10 text-text-dim"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
          <p className="text-sm text-text-dim">
            {file ? file.name : "Click to upload (JPG, PNG, WebP, max 5MB)"}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text">
          Name <span className="text-hot">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jake Paul"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple"
        />
      </div>

      {/* Profession */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text">
          Profession <span className="text-hot">*</span>
        </label>
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="e.g. Boxer, YouTuber"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-dim focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple"
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-all",
                category === cat
                  ? "border-neon-purple bg-neon-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  : "border-border text-text-muted hover:border-neon-purple/50 hover:text-text"
              )}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div>
        <label className="mb-2 block text-sm font-medium text-text">
          Social Links{" "}
          <span className="text-text-dim font-normal">(optional)</span>
        </label>
        <div className="space-y-2">
          {[
            {
              icon: "📸",
              label: "Instagram",
              value: instagram,
              set: setInstagram,
              placeholder: "@username",
            },
            {
              icon: "🎵",
              label: "TikTok",
              value: tiktok,
              set: setTiktok,
              placeholder: "@username",
            },
            {
              icon: "▶️",
              label: "YouTube",
              value: youtube,
              set: setYoutube,
              placeholder: "@channel",
            },
            {
              icon: "💚",
              label: "Kick",
              value: kick,
              set: setKick,
              placeholder: "@username",
            },
            {
              icon: "𝕏",
              label: "X / Twitter",
              value: x,
              set: setX,
              placeholder: "@handle",
            },
          ].map((social) => (
            <div key={social.label} className="flex items-center gap-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-light text-sm">
                {social.icon}
              </span>
              <input
                type="text"
                value={social.value}
                onChange={(e) => social.set(e.target.value)}
                placeholder={social.placeholder}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-hot">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!file || !name.trim() || !profession.trim() || submitting}
        className="w-full rounded-xl bg-neon-purple px-4 py-3 text-base font-bold text-white transition-all hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] disabled:opacity-50 active:scale-[0.98]"
      >
        {submitting ? "Submitting..." : "Submit Mogger"}
      </button>

      <p className="text-center text-xs text-text-dim">
        Submissions are reviewed before being added to the public database.
      </p>
    </div>
  );
}
