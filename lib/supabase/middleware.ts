import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getTestModeFromCookies,
  isTestModeEnabled,
} from "@/lib/test-mode";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ─── Pro test mode: skip subscription gating entirely ───
  const isProTestMode =
    isTestModeEnabled() &&
    getTestModeFromCookies(
      request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
    ) === "pro";

  // Public routes that don't need auth
  const publicPaths = [
    "/",
    "/leaderboards",
    "/battle",       // Allow guest battle (3 free votes)
    "/mog-graph",
    "/terms",
    "/privacy",
    "/removal-request",
    "/auth/callback",
  ];

  const isPublicPath =
    publicPaths.includes(pathname) || pathname.startsWith("/p/");

  const isApiPath = pathname.startsWith("/api/");
  const isStaticPath =
    pathname.startsWith("/_next/") || pathname.startsWith("/favicon");

  // Allow public paths, API routes, and static assets
  if (isPublicPath || isApiPath || isStaticPath) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to home
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // For protected routes, check subscription (except /subscribe, /account, /submit)
  // In Pro test mode, skip subscription checks entirely
  if (
    !isProTestMode &&
    pathname !== "/subscribe" &&
    pathname !== "/account" &&
    pathname !== "/submit"
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_status !== "active") {
      const url = request.nextUrl.clone();
      url.pathname = "/subscribe";
      return NextResponse.redirect(url);
    }
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, email")
      .eq("id", user.id)
      .single();

    const adminEmails =
      process.env.ADMIN_EMAIL_ALLOWLIST?.split(",").map((e) => e.trim()) || [];
    const isAdmin =
      profile?.is_admin || adminEmails.includes(profile?.email || "");

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/battle";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
