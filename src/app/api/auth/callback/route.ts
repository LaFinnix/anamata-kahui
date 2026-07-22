import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/clients";
import { safeRedirect } from "@/lib/auth/safe-redirect";

/**
 * Supabase auth callback — handles email confirmation, magic links, and
 * password recovery redirects. Exchanges the auth code for a session and
 * forwards the user to the appropriate destination.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirect(url.searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Fallback — bounce to login with an error flag.
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("auth_callback_failed")}`, url.origin),
  );
}
