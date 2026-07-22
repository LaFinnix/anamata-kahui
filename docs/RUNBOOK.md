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
