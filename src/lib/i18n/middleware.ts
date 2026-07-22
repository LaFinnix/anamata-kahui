import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * next-intl middleware factory. Composed with the Supabase session
 * refresh inside the root `proxy.ts`.
 *
 * Runs on every request to:
 *   - Negotiate the user's preferred locale on first visit.
 *   - Redirect `/foo` to `/en/foo` (or `/mi/foo`) per `localePrefix`.
 *   - Persist the user's choice in a cookie so subsequent visits are sticky.
 */
export default createMiddleware(routing);
