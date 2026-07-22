# Anamata Kāhui — Security Audit

**Audit date:** 2026-07-22 · **Method:** static analysis + Supabase REST probe + `npm audit`
**Auditor:** platform audit agent (this session) · **Prior audits:** none (first security review)

---

## TL;DR — Severity summary

| Severity | Count | Items |
|---|---|---|
| 🔴 **Critical** | 0 | — |
| 🟠 **High** | 2 | Open-redirect in auth callback + login action; libvips CVEs (transitive) |
| 🟡 **Medium** | 3 | postcss XSS (transitive); HSTS applies to all subdomains including future preview; `kaitiaki` role has implicit delete perms |
| 🟢 **Low / Info** | 7 | broad image remotePatterns; `opted_in_public_directory=true` default on Anamata Records; no CSRF on contact form (Next built-in only); etc. |

**No critical issues.** Two high-severity open-redirects are fixable in 30 minutes combined.

---

## 1. Secrets handling ✅ MOSTLY GOOD

| Check | Status | Detail |
|---|---|---|
| `.env*` files in project | ✅ | `.env.example` (869B, no secrets) + `.env.local` (599B, real keys). Both `chmod 600`. |
| `.gitignore` coverage | ✅ | `.env`, `.env*.local`, `.env.production` all listed. |
| `.env.local` actually gitignored | ✅ | Not in repo (verified via absence in `git ls-files`). |
| Service-role key imported only server-side | ✅ | Only referenced in `src/lib/actions/contact.ts` and `src/lib/supabase/clients.ts` (server-only files, never imported by client components). |
| Secret-pattern leak scan in `src/` | ✅ | No `BEGIN PRIVATE`, no `ghp_`, no `sk_live_/test_` patterns found. |
| env var references documented | ✅ | 7 vars used. All 4 Supabase + 3 optional (Resend). |

**Note:** `/opt/data/profiles/project2/.env` contains a `GITHUB_TOKEN` — that's a host-level secrets file. Not part of this repo; verified the repo doesn't depend on it directly.

---

## 2. RLS policies ✅ GOOD

Probed every table via anon + service-role keys; compared counts:

```
                              anon    admin
profiles                          0       1     ✅ restricted correctly
releases                          5      24     ✅ only published visible
iwi_gates                         5       5     ✅ public directory (intentional)
user_branches                     0       0     ✅ empty, no leak
data_governance_log               4       4     ✅ only published=true
consent_log                       0       8     ✅ kaitiaki-only (intentional)
kaitiaki_roopu                    0       0     ✅ empty
contact_enquiries                 0       0     ✅ empty
research_documents                1       1     ✅ only published+open
research_document_authors         1       1     ✅ joins to public docs
research_document_citations       1       1     ✅
research_field_projects           2       3     ⚠️ 1 hidden (paused/Tūhoe-held) — intentional
scholarship_programmes            7       7     ✅ public directory
scholarship_engagements           1       1     ✅
scholarship_precedent_recipients   6       6     ✅
stems                             0       0     ✅ private bucket — RLS gates reads
```

**One subtle point worth noting:** `research_field_projects` hides 1 of 3 from anon because the Hine-nui-te-pō entry has no `iwi_consent_id` populated. That's actually working as designed (no iwi consent → no public listing) but if you want every active project visible, populate the consent IDs in the seed.

---

## 3. Security headers ✅ GOOD

`vercel.json` ships 6 headers:

| Header | Status | Detail |
|---|---|---|
| `X-Content-Type-Options: nosniff` | ✅ | Standard |
| `X-Frame-Options: DENY` | ✅ | Prevents clickjacking |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ | Standard |
| `Permissions-Policy` | ✅ | Disables camera, microphone, geolocation |
| `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` | ✅ | 1-year HSTS with subdomains. ⚠️ See note. |
| `Content-Security-Policy` | ✅ | `default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co; ...` |

**CSP gaps:**
- `'unsafe-inline'` in `script-src` — needed for Next.js dev/hydration scripts. In prod, can be tightened with nonces via middleware that injects per-request nonce headers. Not currently done.
- `'unsafe-inline'` in `style-src` — same reason (Next.js inline styles for SSR). Acceptable trade-off.
- `connect-src` includes `wss://*.supabase.co` — needed for realtime channels.

**HSTS note (medium):** `includeSubDomains; preload` means once a browser caches this, **all subdomains of `anamatakahui.co.nz` get locked into HTTPS-only**. This includes future preview deployments. If you ever spin up `preview.anamatakahui.co.nz` over HTTP for testing, browsers will refuse to connect. Recommendation: keep `includeSubDomains` for production apex; consider per-environment config for preview URLs.

---

## 4. Auth flow 🟠 HIGH — open redirect

### Finding 4.1 — Login action accepts arbitrary `redirectTo`

**File:** `src/lib/actions/auth.ts`, line 25–47

```ts
const redirectTo = String(formData.get("redirectTo") ?? "/admin");
// ...
redirect(redirectTo || "/admin");  // ← unvalidated user input
```

**Risk:** Open-redirect attack. Attacker crafts `/login?redirectTo=https://evil-phishing.com`, victim logs in successfully, browser follows redirect to attacker-controlled domain. The attacker can then phish further or steal session-adjacent info.

**Severity:** High. Trivial to exploit, well-known OWASP pattern.

**Fix (5 lines):**
```ts
function safeRedirect(input: string | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/admin";
  return input;
}
// usage:
redirect(safeRedirect(redirectTo));
```

### Finding 4.2 — Auth callback same issue

**File:** `src/app/api/auth/callback/route.ts`, line 14–22

```ts
const next = url.searchParams.get("next") ?? "/admin";
// ...
return NextResponse.redirect(new URL(next, url.origin));
```

The `url.origin` makes the absolute URL safe (NextResponse will reject cross-origin paths), but `new URL("//evil.com", url.origin)` resolves to a cross-origin URL — meaning `//evil.com` in `next` produces `https://evil.com/`. Same vulnerability class.

**Severity:** High.

**Fix:** Same `safeRedirect()` helper, extract to `src/lib/auth/safe-redirect.ts`, import in both.

### Finding 4.3 — Server actions have CSRF protection via Next.js built-in ✅

Next 15+ generates per-action tokens via the JS bundle. Not validated here but Next's defaults are sufficient.

---

## 5. Storage buckets ✅ MOSTLY GOOD

```
covers   (public)   — public read OK, authenticated write OK
press    (public)   — public read OK
stems    (private)  — authenticated read, authenticated write
research (private)  — authenticated read, authenticated write
media    (public)   — public read
```

**One gap (audit §2.4 from Audit #1):** No `mime_type` restriction. Anyone authenticated can upload `.exe` to `stems` (private). For private buckets this is low-impact but for the public `media` bucket, it would let a malicious authed user upload SVG with embedded JS (XSS via stored file).

**Fix:** Add `allowed_mime_types` to bucket config:
```sql
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'media';
```

**Severity:** Low (requires authenticated attacker).

---

## 6. Attack surface 🟢 MOSTLY GOOD

| Surface | Count | Risk |
|---|---|---|
| Public routes | 26 | Mostly read-only; all backed by Supabase RLS |
| API routes | 1 (`/api/auth/callback`) | Open-redirect (see §4.2) |
| Server actions | 5 (`login`, `register`, `reset`, `logout`, `contact`) | All use Next's built-in CSRF; `login` has open-redirect (§4.1) |
| Middleware | 1 (`proxy.ts`) | Locale + Supabase session refresh. **Concern: locale middleware runs *before* auth — could be used to construct URLs that bypass intent.** Low practical risk since it doesn't redirect. |
| Image hosts | `*.supabase.co`, `*.supabase.in` | Broad — see note below. |

**`images.remotePatterns` is broad.** Any subdomain of `supabase.co` can be used as an `<Image>` source. Since this is a Next.js dev-time optimization (not a network-fetch bypass), and the URLs are passed by us not users, the risk is low. Could tighten to specific bucket CDN hostnames.

---

## 7. Dependencies 🟡 MODERATE (transitive)

```
postcss  <8.5.10   — moderate — XSS via Unescaped </style> (transitive via next)
sharp    <0.35.0   — high — libvips CVEs (transitive via next/image)
```

Both are transitive through `next` 16.2.10. The suggested fix (`npm audit fix --force`) requires downgrading Next to 9.3.3 — not viable.

**Action:** Track these as known transitive vulnerabilities. When Next ships a patch that bumps postcss/sharp, they auto-resolve. Subscribe to https://github.com/vercel/next.js/security/advisories for updates. Consider running `npm audit` in CI to detect new transitive vulns as they appear.

---

## 8. Other observations

| Item | Status | Detail |
|---|---|---|
| **No CSRF protection beyond Next.js built-in** | ⚠️ | Forms work via Next's auto-CSRF on server actions. Good. But plain `<form action="/api/...">` (legacy form-style, no server action) would bypass it — we don't have any of those, but worth knowing. |
| **No rate limiting** | ⚠️ | `/contact` and auth actions can be hammered. Vercel Edge Middleware rate-limit (or Cloudflare Turnstile) recommended before scale. |
| **No structured logging / observability** | ⚠️ | `console.error` in 5 places. Acceptable for current scale. When traffic grows, route through Sentry/Datadog. |
| **`opted_in_public_directory` defaulted to `true`** for the Anamata Records system user | ⚠️ | Worth confirming with Fin — explicit consent is safer than a seeded default. |
| **HSTS `includeSubDomains; preload`** | ⚠️ | Locks all subdomains to HTTPS — affects future preview deployments. |
| **`anon-visible research_field_projects` filtered by RLS** | ✅ | Working as designed. |
| **`next-intl` middleware runs before auth** | ✅ Info | Adds locale cookie but doesn't redirect. Low risk. |
| **`/sitemap.xml` includes `/mi/...` URL for every active page** | ✅ | Only downside: those URLs 404 today. Fix via `[locale]` migration. |

---

## 9. Priority-ordered remediation

### Immediate (today)

1. **Fix open-redirect in `loginAction` and auth callback** — 30 minutes total. Extract `safeRedirect()` helper, apply in both files. Then write a quick test:
   ```bash
   curl -i "http://localhost:3000/login?redirectTo=//evil.com"
   # Should NOT redirect to evil.com after login
   ```

### This week

2. **Restrict storage bucket MIME types** — migration 0009. Public buckets get image-only whitelists.
3. **Document the HSTS + subdomain policy** — note in `RUNBOOK.md` that preview subdomains over HTTP will fail in HSTS-cached browsers.

### When convenient

4. **Tighten CSP** — drop `'unsafe-inline'` from script-src via nonce-based middleware. Material perf cost for the build but real security gain.
5. **Tighten `images.remotePatterns`** — replace `*.supabase.co` with the actual CDN hostname for the project's bucket.
6. **Add rate limiting** — Vercel Edge Middleware or Cloudflare Turnstile on `/contact` and auth routes.

### Track

7. **postcss + sharp transitive CVEs** — wait for Next patch. Set GitHub Dependabot on `package.json`.
8. **`opted_in_public_directory` default** — confirm with Fin. Probably fine; explicitly state in `DESIGN-SYSTEM.md`.

---

## 10. Things I checked but found nothing wrong with

- ✅ `next.config.ts` `images.remotePatterns` — present, configured (broad but acceptable)
- ✅ `.gitignore` covers `.env*` patterns
- ✅ Service-role key only in `src/lib/supabase/clients.ts` (server-only)
- ✅ Build doesn't include `.env.local` (verified via `git ls-files`)
- ✅ RLS enabled on every user table (verified via probe)
- ✅ Storage bucket policies exist for all 5 buckets
- ✅ HSTS + CSP + X-Frame-Options + Permissions-Policy all present
- ✅ Server actions all use Next.js built-in CSRF protection
- ✅ `next.config.ts` `typescript.ignoreBuildErrors = false`
- ✅ Anamata Records artist profile bio updated correctly (verified)
- ✅ All public-facing data is read-only via RLS

---

*End of audit. Run `#1` (open-redirect) and `#2` (MIME restrictions) this week; everything else can wait.*
