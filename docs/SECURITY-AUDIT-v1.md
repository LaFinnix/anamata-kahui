# Anamata Kāhui — Security Audit (v1)

**Date:** 2026-07-23 · **Method:** Static analysis + manual review
**Auditor:** platform audit agent

## Scope

- 12 server action files in `src/lib/actions/`
- Auth flow: login, register, reset-password, callback
- RLS policies on all key tables
- Storage bucket policies + MIME restrictions
- HTTP headers / CSP / cookie attributes
- Open-redirect attack surface
- Brute-force / rate limiting
- Dashboard auth gates

## Severity table

| # | Severity | Finding | Fix effort |
|---|---|---|---|
| 1 | **High** | **Stem browser broken** — `/dev/tools/stem-browser` constructs public URLs (`/storage/v1/object/public/stems/...`) for the **private** `stems` bucket. Public URLs return HTTP 400. The page renders links that don't work. | 30 min — switch to signed URLs |
| 2 | **Medium** | **CSP allows `'unsafe-inline'` for scripts** — defeats XSS protection. Should use `nonce-` (with Next.js server-side nonce generation) or `'strict-dynamic'`. | 1-2 hours — switch to nonce-based CSP |
| 3 | **Medium** | **No rate limiting on `/login`, `/register`, `/reset-password`** — vulnerable to credential stuffing + email enumeration. | 1 day — Supabase has built-in rate limiting, but we should add IP-based throttling for the public form actions |
| 4 | **Medium** | **`branch_admin` (platform) can manage members in ANY branch** — even ones they don't have `user_branches` access to. The RLS `role in ('branch_admin', 'super_admin')` check is unscoped. If branch_admin was intended to be branch-scoped, this is a privilege escalation. | 30 min — tighten the policy to require the branch_admin to have a user_branches row for the target branch |
| 5 | **Medium** | **No `Secure` flag on `kahui_cookie_consent`** — set via `document.cookie = "...; max-age=...; SameSite=Lax"` without `Secure`. On mixed HTTP/HTTPS deployments the cookie would leak. | 1 min — add `Secure` to the cookie string when `location.protocol === 'https:'` |
| 6 | **Low** | **`img-src` CSP is `https:` (any)** — broadens XSS surface via image-only attacks (e.g. SVG with embedded JS that the browser renders as image). Storage bucket MIME restrictions already block SVG, but the CSP could be tighter. | 5 min — list specific origins |
| 7 | **Low** | **No CSP violation reporting** — no `report-uri` or `report-to` directive. Misconfigurations are silent. | 30 min — point to a logging endpoint |
| 8 | **Low** | **No `Strict-Transport-Security` for `preload`** — HSTS is set with `preload` directive, but submission to the HSTS Preload List requires a separate submission step. Not technically insecure, just incomplete. | 30 min — submit to hstspreload.org |
| 9 | **Low** | **Server action timing attacks** — login action returns success/error after Supabase auth lookup. A timing-attack-aware attacker could enumerate emails. The error messages also reveal "Email not found" vs "Wrong password" patterns (Supabase's default). | 1 day — use generic "Sign in failed" message; add random delay |
| 10 | **Low** | **No security.txt** — the standard `/.well-known/security.txt` is missing. Researchers can't easily report vulnerabilities. | 5 min — add the file |
| 11 | **Low** | **No rate limit on `/api/cron/local-contexts-refresh`** — relies entirely on `CRON_SECRET` in the Authorization header. If the secret leaks, anyone can trigger the endpoint. | 5 min — add IP allowlist in middleware (Vercel IPs only) |

## Verified secure

| Area | Status |
|---|---|
| **Open redirects** | ✅ `safeRedirect()` blocks `//evil.com`, `http://`, `javascript:`, backslash tricks. Used in `/login`, `/api/auth/callback`, and all post-action redirects |
| **CSRF** | ✅ Next.js Server Actions have built-in same-origin check (Origin/Referer header). Automatic in Next 15+ |
| **Auth gates on dashboard** | ✅ Parent layout (`/dashboard/layout.tsx`) calls `supabase.auth.getUser()` and redirects to `/login` if missing. Defence in depth via middleware |
| **Auth gates on API routes** | ✅ `/api/auth/callback` (intentionally public, exchanges code), `/api/cron/local-contexts-refresh` (uses `CRON_SECRET` Bearer auth) |
| **RLS on key tables** | ✅ 28 policies across 9 tables (profiles, releases, stems, iwi_gates, consent_log, data_governance_log, cultural_review_cycles, kaitiaki_roopu, user_branches). Read + write + delete paths all covered |
| **Storage bucket MIME** | ✅ 5 buckets (covers, press, stems, research, media) with type whitelists via migration 0009. SVG blocked |
| **Storage bucket privacy** | ✅ Stems + research buckets are private (public=false). Public buckets (covers, press, media) are appropriate for the data |
| **Server actions all have `"use server"`** | ✅ 12/12 verified |
| **Zero `dangerouslySetInnerHTML`** | ✅ No XSS surface |
| **Zero `any` types** | ✅ Strict TypeScript |
| **No hardcoded secrets** | ✅ All keys via env vars |
| **`.env*.local` gitignored** | ✅ Verified |
| **HSTS enabled** | ✅ 1 year + subdomains + preload |
| **HSTS-CSP-Frame-Options-Permissions** | ✅ All security headers present |
| **Append-only audit** | ✅ consent_log, data_governance_log, cultural_review_cycles all have `deny_modification` trigger |
| **Gating trigger** | ✅ `releases_require_cultural_signoff` blocks `scheduled`/`released` without approved cultural review. Tested |
| **Email content security** | ✅ Contact form requires explicit consent checkbox (per user's earlier request) |

## Detailed findings

### Finding #1 — Stem browser broken (High)

`src/app/(public)/[locale]/dev/tools/stem-browser/page.tsx:131`:
```
https://fydhhyakfkceupibqnps.supabase.co/storage/v1/object/public/${stem.bucket}/${stem.file_name}
```

The `stems` bucket is `public=false` (verified in migration 0001). Public URLs return HTTP 400. The stem browser shows links that lead nowhere.

**Fix**: Use Supabase's `createSignedUrl()` server-side to generate time-limited URLs:

```ts
import { createAdminClient } from "@/lib/supabase/clients";

const { data: signed } = await admin.storage
  .from("stems")
  .createSignedUrl(`${releaseId}/${fileName}`, 60 * 60); // 1h

// Use signed.signedUrl instead of the public URL
```

### Finding #2 — CSP `'unsafe-inline'` for scripts (Medium)

`vercel.json`:
```
script-src 'self' 'unsafe-inline' https://*.supabase.co
```

`'unsafe-inline'` is needed for inline scripts that bypass nonce verification. Next.js supports nonce-based CSP since 14.x.

**Fix**: Use the Next.js `nonce` header pattern:

```ts
// middleware.ts
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ...`;
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);
  return response;
}
```

### Finding #3 — No rate limiting (Medium)

`src/lib/actions/auth.ts` has no rate limiting on `loginAction`, `registerAction`, `resetPasswordAction`. An attacker can:
- Brute-force passwords
- Enumerate emails via the password reset endpoint
- Send spam to the contact form

Supabase has built-in rate limiting on auth endpoints, but it's per-IP. We should add application-level throttling using Vercel KV or upstash.

**Fix**: Add a rate-limit middleware using `@upstash/ratelimit` or similar:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});

// In loginAction
const { success } = await limiter.limit(email);
if (!success) return { error: "Too many attempts. Try again in 1 minute." };
```

### Finding #4 — branch_admin privilege scope (Medium)

`supabase/migrations/0015_branch_admin_user_branches.sql:7-23`:

```sql
create policy user_branches_write_authorized
  on public.user_branches for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('branch_admin', 'super_admin')
    )
    ...
  )
```

The second condition allows any `branch_admin` to write to `user_branches` for ANY branch, not just the ones they have user_branches access to.

**Fix**: Tighten the policy to require branch_admin to have a user_branches row for the target branch:

```sql
or exists (
  select 1 from public.profiles p
  join public.user_branches ub on ub.user_id = p.id
  where p.id = auth.uid()
    and p.role in ('branch_admin', 'super_admin')
    and ub.branch_id = user_branches.branch_id
    and ub.role in ('lead', 'admin')
)
```

### Finding #5 — `kahui_cookie_consent` missing `Secure` flag (Low)

`src/components/cookie-consent-banner.tsx:23`:
```ts
document.cookie = `kahui_cookie_consent=${value}; path=/; max-age=${...}; SameSite=Lax`;
```

In dev, `location.protocol === 'http:'` so no Secure flag — correct for localhost. In production, add `Secure;` when on https:

```ts
const secure = location.protocol === 'https:' ? 'Secure; ' : '';
document.cookie = `kahui_cookie_consent=${value}; path=/; max-age=${...}; ${secure}SameSite=Lax`;
```

### Findings #6-#11 — Low priority

Detailed in the severity table. All straightforward to fix (5-30 min each).

## Recommended fix order

**Block 1 (1 day, fixes 4 medium-severity items)**:
1. Fix stem browser signed URLs (30 min)
2. Tighten CSP with nonces (2 hours)
3. Add rate limiting to auth actions (1 day)
4. Fix branch_admin RLS scope (30 min)
5. Add `Secure` flag to cookie consent (1 min)

**Block 2 (Low-priority polish, 1-2 hours)**:
- Tighten img-src CSP
- Add CSP report-uri
- Add security.txt
- Generalize auth error messages

## Production-readiness assessment

| Dimension | Status |
|---|---|
| Authentication | ✅ Solid — Supabase + RLS + append-only audit |
| Authorization | ⚠️ Mostly good — branch_admin scoping needs tightening |
| CSRF | ✅ Framework-protected |
| Open redirects | ✅ `safeRedirect()` covers all paths |
| XSS | ⚠️ CSP allows unsafe-inline (fixable) |
| SQL injection | ✅ Supabase client uses parameterized queries |
| Storage | ⚠️ Stems bucket works (signed URLs needed) but public URL construction in stem-browser is broken |
| Auth flow | ⚠️ Rate limiting missing |
| Headers | ✅ HSTS, X-Frame-Options, nosniff all set |
| Cookies | ⚠️ Secure flag missing on one client-set cookie |
| Audit trail | ✅ Append-only on consent_log, governance_log, cultural_review_cycles |
| Secrets | ✅ No hardcoded secrets, env vars used correctly |

**Production-ready with Block 1 fixes.** Block 2 is polish.

## Repo state

- Last audit: AUDIT-4 (`f3f0c16`)
- Build: green
- 35 commits on `main`
- This audit: 1 high, 4 medium, 6 low — most are 30-min fixes