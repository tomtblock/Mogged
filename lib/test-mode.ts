/**
 * Test mode management.
 *
 * Two modes:
 *   "normal"  — default: 3 free votes, then paywall. No pro features.
 *   "pro"     — simulates an active subscription. All pro features unlocked.
 *
 * The mode is stored in a cookie (`mogged_test_mode`) so both the
 * server-side middleware and client-side components can read it.
 *
 * Test mode is ONLY available when NEXT_PUBLIC_ENABLE_TEST_MODE=true
 * (defaults to true in development).
 */

export type TestMode = "normal" | "pro";

export const TEST_MODE_COOKIE = "mogged_test_mode";

/** Whether the test mode toggle should be visible at all. */
export function isTestModeEnabled(): boolean {
  // Always enabled in development; in production only if explicitly set
  if (typeof process !== "undefined") {
    if (process.env.NODE_ENV === "development") return true;
    return process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true";
  }
  // Client-side fallback: check the public env var injected by Next.js
  return (
    (typeof window !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_ENABLE_TEST_MODE === "true") ||
    // In dev builds, Next.js inlines NEXT_PUBLIC_ vars
    process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true" ||
    process.env.NODE_ENV === "development"
  );
}

// ─── Client helpers ─────────────────────────────────────────

export function getTestModeClient(): TestMode {
  if (typeof document === "undefined") return "normal";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TEST_MODE_COOKIE}=([^;]*)`)
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === "pro" ? "pro" : "normal";
}

export function setTestModeClient(mode: TestMode) {
  if (typeof document === "undefined") return;
  // Set cookie with path=/ so middleware can read it
  document.cookie = `${TEST_MODE_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Reset the free-vote counter in localStorage (useful when toggling modes). */
export function resetFreeVotes() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem("mogged_free_votes");
  } catch {
    // ignore
  }
}

// ─── Server helpers (for middleware / server components) ─────

export function getTestModeFromCookies(
  cookies: { name: string; value: string }[]
): TestMode {
  const cookie = cookies.find((c) => c.name === TEST_MODE_COOKIE);
  return cookie?.value === "pro" ? "pro" : "normal";
}
