import { AppShell } from "@/components/app-shell";
import { ModerationQueue } from "./moderation-queue";

export default function AdminModerationPage() {
  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">Moderation</h1>
      <ModerationQueue />
    </AppShell>
  );
}
