"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    if (!file || !name.trim()) return;
    if (!ageConfirmed || !ownershipConfirmed || !isMe) {
      setError("Please confirm all checkboxes");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());
      formData.append("ageConfirmed", "true");
      formData.append("ownershipConfirmed", "true");
      formData.append("isMe", "true");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.person) {
        setSuccess(true);
        setFile(null);
        setPreview(null);
        setName("");
        setAgeConfirmed(false);
        setOwnershipConfirmed(false);
        setIsMe(false);
        router.refresh();
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-neutral-gray/20 p-5">
      {success && (
        <div className="mb-4 rounded-lg bg-green-lighter p-3 text-sm text-green-primary">
          Upload successful! Your photo is now available for private games.
        </div>
      )}

      {/* File input */}
      <div
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-gray/30 p-8 transition-colors hover:border-green-primary"
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="mb-3 h-40 w-40 rounded-xl object-cover"
          />
        ) : (
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
        <p className="text-sm text-neutral-gray">
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

      {/* Name */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Display Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
        />
      </div>

      {/* Consent checkboxes */}
      <div className="mt-4 space-y-2">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-gray/30 text-green-primary focus:ring-green-primary"
          />
          <span className="text-sm">I confirm I am 18 or older</span>
        </label>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={(e) => setOwnershipConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-gray/30 text-green-primary focus:ring-green-primary"
          />
          <span className="text-sm">
            I own this photo or have permission to use it
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={isMe}
            onChange={(e) => setIsMe(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-gray/30 text-green-primary focus:ring-green-primary"
          />
          <span className="text-sm">This is a photo of me</span>
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-alert">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={
          !file ||
          !name.trim() ||
          !ageConfirmed ||
          !ownershipConfirmed ||
          !isMe ||
          uploading
        }
        className="mt-4 w-full rounded-lg bg-green-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-light disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Photo"}
      </button>
    </div>
  );
}
