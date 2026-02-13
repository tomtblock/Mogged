// ─────────────────────────────────────────────
// Core application types
// ─────────────────────────────────────────────

export type SubscriptionStatus = "inactive" | "active" | "past_due" | "canceled";
export type PersonStatus = "active" | "pending_review" | "disabled";
export type VoteContext = "public" | "game";
export type ReportStatus = "open" | "reviewing" | "resolved" | "rejected";
export type GameRole = "host" | "member";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  is_admin: boolean;
  default_filters: Filters;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_current_period_end: string | null;
  age_confirmed: boolean;
  created_at: string;
}

export interface Person {
  id: string;
  slug: string;
  name: string;
  profession: string;
  category: string;
  gender: string;
  source_type: string;
  created_by: string | null;
  status: PersonStatus;
  visibility: "public" | "private";
  headshot_path: string;
  headshot_url: string | null;
  headshot_attribution: string | null;
  headshot_license: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: number;
  created_at: string;
  voter_user_id: string;
  context: VoteContext;
  game_id: string | null;
  left_person_id: string;
  right_person_id: string;
  winner_person_id: string | null;
  loser_person_id: string | null;
  skipped: boolean;
  filters: Filters;
  client_session_id: string | null;
}

export interface Rating {
  id: number;
  context: VoteContext;
  game_id: string | null;
  segment_key: string;
  person_id: string;
  rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  updated_at: string;
}

export interface PairStat {
  id: number;
  context: VoteContext;
  game_id: string | null;
  person_a_id: string;
  person_b_id: string;
  a_wins: number;
  b_wins: number;
  comparisons: number;
  updated_at: string;
}

export interface Game {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  join_code: string;
  allow_member_uploads: boolean;
  status: "active" | "ended";
  created_at: string;
}

export interface GameMember {
  game_id: string;
  user_id: string;
  role: GameRole;
  joined_at: string;
}

export interface Report {
  id: number;
  created_at: string;
  reporter_user_id: string;
  target_type: "person" | "vote";
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
}

// ─────────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────────

export interface Filters {
  gender?: string;
  categories?: string[];  // multi-select categories
  category?: string;      // legacy single-select (kept for backward compat)
  excludeRepeats?: boolean;
}

export const CATEGORIES = [
  "sports",
  "streamer",
  "youtuber",
  "influencer",
  "actor",
  "actress",
  "meme",
  "current_affairs",
  "internet_personality",
  "tiktoker",
] as const;

export const GENDERS = ["women", "men", "mixed", "all"] as const;

// ─────────────────────────────────────────────
// Matchup types
// ─────────────────────────────────────────────

export interface Matchup {
  left: Person;
  right: Person;
}

export interface LeaderboardEntry {
  rank: number;
  person: Person;
  rating: number;
  comparisons: number;
  wins: number;
  losses: number;
}

export interface MogEdge {
  from: Person;
  to: Person;
  confidence: number;
  comparisons: number;
}
