import { AppShell } from "@/components/app-shell";
import { PoolManager } from "./pool-manager";

export default function AdminPoolPage() {
  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">People Pool</h1>
      <PoolManager />
    </AppShell>
  );
}
