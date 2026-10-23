import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request so that server-rendered
 * pages always see a valid auth cookie. (Next.js 16 renamed middleware to proxy.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Allow the app to render a helpful setup screen before env vars exist.
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not remove: this call refreshes expired tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Gate the protected area before any HTML is streamed.
  if (!user) {
    if (pathname.startsWith("/dashboard")) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      return NextResponse.redirect(home);
    }

    return response;
  }

  // Students must finish onboarding before using the app. Admins (and company
  // accounts) skip it. This is the Next.js 16 equivalent of middleware.
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as {
    role?: string;
    onboarding_completed?: boolean;
  } | null;

  const needsOnboarding =
    profile?.role === "student" && !profile.onboarding_completed;
  const isOnboardingRoute = pathname === "/onboarding";
  const isPublicRoute = pathname === "/" || pathname === "/auth/callback";

  if (needsOnboarding && !isOnboardingRoute && !isPublicRoute) {
    const onboarding = request.nextUrl.clone();
    onboarding.pathname = "/onboarding";
    onboarding.search = "";
    return NextResponse.redirect(onboarding);
  }

  if (
    isOnboardingRoute &&
    profile &&
    (profile.role !== "student" || profile.onboarding_completed)
  ) {
    const challenges = request.nextUrl.clone();
    challenges.pathname = "/challenges";
    challenges.search = "";
    return NextResponse.redirect(challenges);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
