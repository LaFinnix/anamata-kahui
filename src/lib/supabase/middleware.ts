import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Refresh the Supabase session on every request.
 *
 * Why this exists: @supabase/ssr stores the JWT in cookies; the JWT can expire
 * while the user is browsing. Calling `getUser()` here will:
 *   1. Read the current session from cookies,
 *   2. Refresh it if it's within ~60s of expiry,
 *   3. Write the refreshed JWT back to the response cookies.
 *
 * It also gates the (dashboard) route group — unauthenticated users get
 * redirected to /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions),
          );
        },
      },
    },
  );

  // IMPORTANT: must call getUser() — do not remove. Triggers JWT refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected route gates (App Router uses route groups, so this is a defence
  // in depth — the dashboard layout also performs a server-side check).
  const isDashboardRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/records/dashboard") ||
    pathname.startsWith("/releases") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/research/dashboard") ||
    pathname.startsWith("/dev/dashboard");

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // If the user is signed in and hits /login or /register, send them to the
  // dashboard instead.
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
