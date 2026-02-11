import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GameLobby } from "./lobby";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Get game
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (!game) notFound();

  // Check membership
  const { data: member } = await supabase
    .from("game_members")
    .select("role")
    .eq("game_id", id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    redirect("/games");
  }

  // Get members
  const { data: members } = await supabase
    .from("game_members")
    .select("user_id, role, profiles(full_name, avatar_url)")
    .eq("game_id", id);

  // Get pool size
  const { count: poolSize } = await supabase
    .from("game_pool")
    .select("person_id", { count: "exact", head: true })
    .eq("game_id", id);

  const memberList = (members || []).map((m) => {
    const prof = m.profiles as unknown as { full_name: string; avatar_url: string } | null;
    return {
      userId: m.user_id,
      role: m.role as string,
      name: prof?.full_name || "User",
      avatarUrl: prof?.avatar_url || "",
    };
  });

  return (
    <AppShell>
      <GameLobby
        game={game}
        userRole={member.role}
        userId={user.id}
        members={memberList}
        poolSize={poolSize || 0}
      />
    </AppShell>
  );
}
