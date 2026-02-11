import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Get user's existing uploads
  const { data: uploads } = await supabase
    .from("people")
    .select("*")
    .eq("created_by", user.id)
    .eq("source_type", "user_upload")
    .order("created_at", { ascending: false });

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">Upload Photo</h1>
        <p className="mt-1 text-sm text-neutral-gray">
          Upload your headshot. Photos are private by default — only usable in
          private games unless you request public listing.
        </p>

        <UploadForm />

        {/* Existing uploads */}
        {uploads && uploads.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-gray">
              Your Uploads
            </h2>
            <div className="space-y-3">
              {uploads.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-gray/20 p-3"
                >
                  <img
                    src={p.headshot_url || p.headshot_path}
                    alt={p.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs capitalize text-neutral-gray">
                      {p.visibility} &middot; {p.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
