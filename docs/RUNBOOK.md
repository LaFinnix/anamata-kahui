# Anamata Kāhui — Operator Runbook

This document covers failure modes and recovery steps for the platform
in production. Update when new failure modes are encountered.

---

## Service map

| Service | Hosted at | Health check |
|---|---|---|
| Next.js app | Vercel (`sy` region) | `GET /` returns 200 |
| Database | Supabase `fydhhyakfkceupibqnps` | Dashboard → Database → Tables |
| Auth | Supabase Auth | Dashboard → Auth → Users |
| Storage | Supabase Storage (5 buckets) | Dashboard → Storage → covers/press/stems/research/media |
| Email | Resend (optional) | Dashboard → API Keys |
| GitHub | `github.com/LaFinnix/anamata-kahui` | Actions → Deployments |
| DNS | Registrar (`.co.nz`) | `dig +short anamatakahui.co.nz` |

## Monitoring

Until Vercel + Supabase monitoring is wired:

- Check `https://anamatakahui.co.nz/` every Monday.
- Check Supabase auth users count weekly.
- Check Supabase storage used bytes weekly.

## Failure modes

### 1. Site returns 500

**Symptoms:** Every route 500s. Vercel logs show server errors.

**Recovery:**

1. Open Vercel dashboard → Deployments → latest → Logs.
2. Look for `Missing env` or `SUPABASE_URL` errors.
3. Verify env vars in Vercel → Settings → Environment Variables.
4. Redeploy if env was missing.

### 2. Site returns 404 on all routes

**Symptoms:** Production builds work; deploys return 404 on every route.

**Cause:** Almost always a `proxy.ts` issue or a missing layout.

**Recovery:**

1. Check Vercel build logs — did the build succeed?
2. If yes, check `proxy.ts` for the `matcher` regex.
3. If no, run `npm run build` locally to reproduce.

### 3. Supabase auth stops working

**Symptoms:** `/login` submits but doesn't redirect. Cookies aren't set.

**Recovery:**

1. Open Supabase dashboard → Auth → Logs.
2. Check for invalid JWT, expired service-role key, or rate limit.
3. Rotate `SUPABASE_SERVICE_ROLE_KEY` if leaked — Dashboard → Settings → API → Roll key.
4. Update Vercel env. Redeploy.

### 4. Database migration fails

**Symptoms:** `supabase db push` errors out. New schema not applied.

**Recovery:**

1. Identify the failing migration: `npx supabase db push --debug 2>&1 | grep ERROR`.
2. Fix the SQL (typically constraint violation or wrong enum value).
3. The migration is idempotent — re-running after a fix is safe.
4. If a destructive change was applied, restore from backup:
   `Dashboard → Database → Backups → Restore`.

### 5. Contact form submissions disappear

**Symptoms:** `/contact` returns success but no row appears in `contact_enquiries`.

**Recovery:**

1. Check `supabase_logs` for RLS denials.
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel env (server actions use it).
3. Verify the `contact_enquiries_insert_anon` RLS policy is in place:
   ```sql
   select * from pg_policies where tablename = 'contact_enquiries';
   ```

### 6. Cultural data leaked

**Symptoms:** Iwi-attributed waiata accessible by an unauthorised user.

**This is a critical incident.**

**Recovery:**

1. Immediately revoke the iwi_consent_id in `public.releases` for the affected rows:
   ```sql
   update public.releases
   set iwi_consent_id = null, cultural_sensitivity = 'restricted'
   where id = '<id>';
   ```
2. Pull a `consent_log` audit:
   ```sql
   select * from consent_log where iwi_gate_id = '<gate_id>' order by at desc;
   ```
3. Notify the iwi contact (stored in `iwi_gates.contact_email`).
4. Notify the kaitiaki rōpū chair.
5. Document the incident in `data_governance_log` (category: `incident`).

### 7. Funding round deadline missed

**Symptoms:** A round in `TRACKER.md` closes without submission.

**Recovery:**

1. Run `python3 scripts/funding_radar.py` — it surfaces missed rounds in the JSON output.
2. Add the round to the next-cycle plan in `TRACKER.md`.
3. If the round has a 6-monthly or annual cycle, set a calendar reminder.

### 8. Funding radar cron breaks

**Symptoms:** Telegram stops receiving funding alerts.

**Recovery:**

1. Run the script manually: `python3 scripts/funding_radar.py`.
2. If it errors, check `TRACKER.md` for malformed rows.
3. Verify the cron registration: see Hermes cron docs.

## Contact list

| Role | Contact |
|---|---|
| Platform admin | Fin (founder) |
| Kaitiaki chair | TBA |
| Supabase | support@supabase.io |
| Vercel | support@vercel.com |
| DNS registrar | TBA per domain |

## Backup cadence

- Supabase free tier: daily automatic backups, 7-day retention.
- Supabase pro tier: daily + PITR (point-in-time recovery).
- GitHub: every commit is a backup.
- **Vercel does NOT backup code; GitHub is the source of truth.**

## Recovery time objectives (RTO)

| Component | RTO |
|---|---|
| Site down | 1 hour |
| Database corruption | 4 hours (Supabase restore) |
| DNS misconfiguration | 30 minutes |
| Auth outage | 1 hour (Supabase SLA) |

---

## Collaboration marketplace — operations notes

Shipped 2026-07-23 across four phases (0–4). Full design rationale is in
`docs/COLLABORATION-MARKETPLACE-PLAN.md`, sequencing in
`docs/COLLABORATION-MARKETPLACE-PHASES.md`, operational rules in
`docs/COLLABORATION-MARKETPLACE-RUNBOOK.md`.

### Migrations (apply in order)

| Migration | What it adds |
|---|---|
| `0025_collaboration_marketplace.sql` | `knowledge_domain` enum, `profile_knowledge_areas`, profile column extensions (incl. `iwi_affiliation_claimed` + `iwi_affiliation_attested`), `profiles.role` extended to include `kaitiaki`, `is_kaitiaki()` helper |
| `0026_endorsements.sql` | `endorsement_type` + `endorsement_status` + `endorsement_work_type` enums, `endorsements` table, revocation-only trigger |
| `0027_tono.sql` | `tono_status` + `tono_help_type` + `tono_visibility` + `proposal_status` enums, `tono` + `tono_invitees` + `tono_proposals` tables, RLS |
| `0028_notifications.sql` | `notifications` table for in-platform notification feed (email fanout is v2) |
| `0029_tono_rls_fix.sql` | **REQUIRED FIX** — breaks infinite recursion between `tono` and `tono_invitees` policies. See "Critical: 0029 RLS fix" below. |

All migrations are idempotent. Apply with `npm run db:push` (Supabase CLI)
or via direct psql. The `apply.js` script in the developer tmp directory
documents the runner.

### Critical: 0029 RLS fix

**Without migration 0029, every query against `tono` or `tono_invitees` fails
with `infinite recursion detected in policy for relation "tono"`.**

**Root cause:** Migration 0027's `tono_read` policy subqueries
`tono_invitees` (invitee check), and `tono_invitees_read` policy subqueries
`tono` (creator check). Postgres detects the cycle and refuses all queries
against either table. The bug would have manifested as soon as anyone
tried to use the tono board.

**Fix shipped (0029):** Created three `SECURITY DEFINER` helper functions
(`is_tono_creator`, `is_tono_invitee`, `user_attested_has_iwi`) that bypass
RLS internally. Both policies rewritten to use these helpers.

**Operational rule:** **Never skip migration 0029.** If you're applying
migrations manually, ensure 0025 → 0026 → 0027 → 0028 → 0029 in order.

### Phase 0 critical finding

The `profiles.role` CHECK constraint in migration `0001_initial_schema.sql`
did **not** include `'kaitiaki'` even though `src/lib/actions/cultural-review.ts`
already referenced `role = 'kaitiaki'`. Migration `0025` drops and recreates
the constraint to include `'kaitiaki'`. **Without 0025, the cultural-review
action silently fails for any kaitiaki user.**

### Cultural-review auto-endorsement failure handling

When a kaitiaki approves a release, the cultural-review action
(`src/lib/actions/cultural-review.ts`) auto-creates `co_creator` endorsements
for each `split_participants` row with a `profile_id`. Failure is
**logged but does not undo the cultural-review decision**. The audit row
in `cultural_review_cycles` is sacred; endorsements are derived state.

The same pattern applies to tono fulfillment
(`src/lib/actions/tono.ts` → `fulfillTonoAction`).

### Visibility filters (security-critical)

The `iwi_specific` visibility tier on `tono` and the `attested vs claimed`
split on iwi affiliations are core to the §4.9 defence model. Do not bypass
them.

- `profiles.iwi_affiliation_claimed` — what the user typed (immediate)
- `profiles.iwi_affiliation_attested` — promoted set (30 days + signal, OR
  kaitiaki roster, OR endorsed by attested member)
- `iwi_specific` tono visibility checks the **attested** set, never claimed

Helper: `public.user_attested_has_iwi(text)` is the canonical check. Use it
rather than re-implementing in application code.

### Endorsement revocation semantics

The `endorsements_allow_revocation_only()` trigger restricts UPDATE to:
- `status` (active → revoked)
- `revoked_reason`
- `revoked_at`

All other fields are append-only. If you need to "edit" an endorsement,
revoke it (with reason) and create a new one. The revoked row stays in
the lineage with the reason visible.

### Notifications table usage

`public.notifications` is the in-platform notification feed. Email fanout
is v2 (deferred until Resend is configured). The kind values are short
strings (not a PG enum) so new kinds can be added without a migration.
Current kinds: `endorsement_received`, `endorsement_revoked`,
`tono_proposal_received`, `tono_proposal_accepted`, `tono_proposal_declined`,
`tono_fulfilled`. Add to the runbook addendum when introducing new ones.

### Dashboard routes (Phase 1–3 additions)

| Route | Auth | Notes |
|---|---|---|
| `/kaikorero/profile` | Any authed user | Edit own kaikōrero profile. Two opt-in toggles required for public visibility. |
| `/endorsements` | Any authed user | Given + Received tabs. Revoke form (reason required). |
| `/tono` | Any authed user | My tono board. Status counts + active/resolved sections. |
| `/tono/new` | Any authed user | Compose tono. Visibility tier (open / iwi_specific / invited). |
| `/tono/inbox` | Any authed user | Open tono you can help on. iwi_specific filtered by attested set. |
| `/tono/[id]` | View-scoped by RLS | Detail. Perspective-aware (creator vs helper). |

### Public surfaces (Phase 1–3 additions)

| Route | Auth | Notes |
|---|---|---|
| `/[locale]/artist` (updated) | Public | Now has filter UI (`?domain=…&iwi=…`). Server-side filtering via search params. |
| `/[locale]/artist/[id]` (updated) | Public | 404 if either `kaikorero_visible` OR `opted_in_public_directory` is false. Shows knowledge areas + contribution lineage + **resolved tono** (fulfilled/closed/withdrawn — never open). |

### Quick troubleshooting

**Tono / tono_invitees queries return `infinite recursion detected in policy for relation "tono"`.**
Migration 0029 hasn't been applied. Apply it.

**Kaitiaki can't approve a release (role check fails).**
Migration 0025 hasn't been applied. The `profiles.role` CHECK constraint
doesn't include `'kaitiaki'` without it.

**Endorsement update fails with "endorsements are append-only — only status, revoked_reason, revoked_at may change".**
You're trying to UPDATE a non-revocation field. Revoke and create new, or
check the migration 0026 trigger definition.

**iwi_specific tono appears to non-attested users.**
Check `user_attested_has_iwi()` (migration 0029) is being used, not a
direct `iwi_affiliation_attested` query. The application-layer
`filterByIwiVisibility` in `src/lib/queries/tono.ts` does this correctly.

**Auto-endorsement didn't fire on cultural-review approval.**
Check the application logs (`src/lib/actions/cultural-review.ts`) for
`console.error` output. The cultural-review audit row stands regardless
of endorsement insert failure — investigate manually if needed.
