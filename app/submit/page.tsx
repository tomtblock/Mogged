import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubmitMoggerForm } from "./submit-form";

export default async function SubmitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-text">
          ➕ Submit a{" "}
          <span className="bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
            Mogger
          </span>
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          Know someone who mogs? Submit them to the database. Once approved by
          our team, they&apos;ll appear in battles and on leaderboards.
        </p>

        <SubmitMoggerForm />
      </div>
    </AppShell>
  );
}
