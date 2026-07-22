/**
 * Supabase clients for browser, server, and middleware contexts.
 *
 * Three clients, three contracts:
 *   - `createBrowserClient`  — runs in client components, uses anon key.
 *   - `createServerClient`   — runs in RSC / route handlers / server actions.
 *   - `createMiddlewareClient` — runs in `middleware.ts` for session refresh.
 *
 * The service-role key is NEVER imported into a file that runs in the browser.
 * Use `createAdminClient()` (below) only inside trusted server-only contexts.
 */

import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * For use in Client Components ("use client").
 * Reads/writes cookies via document.cookie — never call from server code.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * For use in Server Components, Route Handlers, and Server Actions.
 * Reads/writes cookies via next/headers.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Service-role client. BYPASSES Row Level Security.
 * Use ONLY for trusted server-side admin tasks (seeding branches, super-admin
 * actions, scheduled jobs). NEVER import this from a "use client" file.
 */
export function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. The admin client can only run server-side.",
    );
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
