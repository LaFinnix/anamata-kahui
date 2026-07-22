# Anamata Kāhui — Dashboard Audit + Collaboration Plan

**Date:** 2026-07-22 · **Auditor:** platform audit agent
**Method:** static analysis of `src/app/(dashboard)/*` + database state + research into music-collaboration patterns (subagent report referenced)

---

## Part 1 — Dashboard audit

### Current route map

| Route | LOC | Renders | Can mutate? |
|---|---|---|---|
| `/admin` | 105 | 4 stat cards + recent activity | ❌ |
| `/admin/iwi-gate` | 146 | iwi gate list | ❌ |
| `/records` | 71 | release list | ❌ |
| `/releases` | 88 | Kanban (draft/scheduled/released) | ❌ |
| `/releases/[id]` | 181 | release detail | ❌ |
| `/analytics` | 64 | placeholder "—" cards | ❌ |
| `/research` | 60 | placeholder cards | ❌ |
| `/dev` | 65 | placeholder cards | ❌ |
| `/arts` | 80 | gallery shells | ❌ |

**Total:** 11 dashboard routes, **0 mutation endpoints**. Every "Create", "Upload", "Submit" button in the dashboard has no `onClick` / `formAction` / server action.

### What's good

- ✅ **Auth gate works.** Layout redirects unauthed to `/login?redirectTo=...`.
- ✅ **Role-scoped nav.** `NAV_ITEMS[].requires` filters by `UserRole`.
- ✅ **Live counts.** `/admin` and other pages query Supabase with `createServerSupabase` (RLS-respecting).
- ✅ **Loading skeleton** at `(dashboard)/loading.tsx` covers all 11 routes.
- ✅ **Sidebar + responsive mobile header** with logout.

### What's broken or missing

#### 🔴 Critical — every Create/Upload button is dead

```
src/app/(dashboard)/records/page.tsx        <Button>...<Plus/>New release</Button>  ← no handler
src/app/(dashboard)/releases/page.tsx       <Button>...<Upload/>Upload stems</Button> ← no handler
src/app/(dashboard)/research/page.tsx       <Button>...<Plus/>Submit document</Button> ← no handler
src/app/(dashboard)/arts/page.tsx           <Button>...<Plus/>Upload artwork</Button>  ← no handler
src/app/(dashboard)/dev/page.tsx           <Button>Manage keys</Button>              ← no handler
src/app/(dashboard)/admin/iwi-gate/page.tsx <Button>...<Plus/>Add gate</Button>       ← no handler
```

This is the **biggest gap**: artists can see their catalog but can't add to it.

#### 🔴 Critical — `/releases/[id]` is read-only

The release detail page references a `<CreateReleaseForm>` that doesn't exist. Specifically missing:
- Create new release (artwork upload, metadata, kaitiaki gate selection)
- Edit release metadata
- Submit release for kaitiaki review
- Add stems (audio upload)
- Add collaborators with split %
- Schedule release
- Mark released

#### 🟠 High — role-gated nav doesn't actually gate

The nav filters by `requires`, but the **routes themselves don't check role**. Any authenticated user can hit `/admin`, `/dev`, etc. directly via URL. RLS protects the database reads, but a `client`-role user sees the page chrome and only zeroed counts. Should either:
- (a) Show only role-appropriate nav items (current — partial defence)
- (b) Add per-route role gates in the layout

#### 🟠 High — `/analytics` is a placeholder

The comment in the file literally says: "real numbers come from streaming-platform APIs (Spotify, Apple, etc.) which we wire up after the scaffold." All 4 cards show "—". Artists can read this and feel like the dashboard is hollow.

#### 🟠 High — `/research`, `/dev`, `/arts` are shells

Pure placeholder cards. No functionality. Either build them or remove them from the dashboard nav.

#### 🟡 Medium — only one user has access

Database shows `profiles` count = 1 (the seeded Anamata Records label profile). Role = `artist`. No real kaitiaki, branch_admin, super_admin, researcher, or client users exist yet. Until real users sign up, role-based UX is theoretical.

#### 🟡 Medium — no profile editing

Once a user signs in, there's no way to:
- Update their name, bio, iwi affiliation, te reo proficiency
- Change their avatar
- Opt in/out of the public directory (this works via `/privacy-controls` but not surfaced)

#### 🟡 Medium — no notifications

When a kaitiaki approves a release, when a collaborator is invited, when a stem is uploaded — no notification surfaces. No `notifications` table exists.

#### 🟢 Low — sidebar lacks context

Sidebar shows role badge but not branch membership (the `user_branches` table). For a multi-branch platform this is wrong context.

---

### Priority-ordered fixes for the dashboard

| Priority | Fix | Effort | Impact |
|---|---|---|---|
| 1 | **Wire the "Create release" button** to a real `createReleaseAction` server action | 1 day | Unblocks artist productivity |
| 2 | **Wire the "Upload stem" button** to a real `uploadStemAction` + storage path | 2 days | Required for release pipeline |
| 3 | **Wire `/admin/iwi-gate` "Add gate"** to a real `createIwiGateAction` | half day | Kaitiaki can onboard themselves |
| 4 | **Build real release create/edit form** with kaitiaki gate selector + iwi_consent_id linkage | 1 day | Required for #1 |
| 5 | **Build collaborator-invite flow** + `release_collaborators` table | 1 day | Required for collab pipeline |
| 6 | **Add per-route role gate** in (dashboard) layout | half day | Security hardening |
| 7 | **Replace `/analytics` placeholders** with live Supabase queries (releases count + listen link aggregates if available) | 1 day | Stop looking hollow |
| 8 | **Build profile edit page** | half day | Required for opt-in + iwi fields |
| 9 | **Either build or remove `/research`, `/dev`, `/arts`** dashboard stubs | decision needed | Stop looking hollow |

---

## Part 2 — Collaboration research

The subagent's full industry report (40KB, 416 lines) is at
[`docs/COLLABORATION-RESEARCH.md`](../docs/COLLABORATION-RESEARCH.md).
The version below is the **condensed recommendation** derived from it.

### Verified industry state (subagent-confirmed)

| Live products | Status |
|---|---|
| BandLab (60M users), Soundtrap, Audiotool | Real-time collab DAWs (their own DAW, not interoperable) |
| Pro Tools + Avid Cloud Collaboration | Multi-user sessions (post-production house tier only) |
| TuneCore Splits, RouteNote Splits | First-class splits primitives on the financial side |
| Splits.org (0xSplits) | On-chain splits, USDC on Base |

| Defunct | What it tells us |
|---|---|
| Sound.xyz (offline 16 Jan 2026 → splits.org) | On-chain splits is **not** the future; the schema carried over to Splits.org |
| Splice Studio (shut down) | Confirms DAW-collab is hard — even Splice couldn't sustain it |
| Stem.is (Cloudflare-blocked; status unclear) | "Stem is to splits what Splice was to DAW-collab" — pattern lives on in TuneCore |
| DistroKid Splits (Cloudflare-blocked) | Widely known to ship splits; not verifiable firsthand but industry consensus confirms it |

### Splits schema (consensus across all four major products)

```
contributor ID + sum-to-100 invariant + role label + signed artefact
                + payout rail + audit trail
```

This is the **only schema** every competitor uses. We replicate it exactly.

### DAW versioning reality

- **No major DAW** ships multi-user project editing outside their own paired product (Avid → Avid Cloud; Splice → Splice Studio [dead])
- **Cross-DAW norm** is "Dropbox + markdown changelog"
- **No "Git for music" product ships in 2026**

**Implication for Anamata:** don't integrate with any DAW. Store stem-file artefacts in Supabase Storage with a separate metadata table. DAW-agnostic by construction.

### Cultural collaboration — confirmed market gap

**No existing software** combines tikanga + kaitiaki review + splits + creative
collaboration. The pattern has to be assembled from:
- Te Matatini entry form (cultural gate at creation)
- Ngā Taonga access log (cultural gate at consumption)
- Te Mana Raraunga CARE (indigenous data sovereignty)
- Ngā Taonga practice (append-only consent log)
- Split-sheet signature (creative sign-off)
- Kaitiaki rōpū (cultural sign-off)

**The novelty for Anamata Kāhui is binding these six together in one release pipeline.** That's the moat.

### Supabase Realtime primitives — confirmed

| Primitive | Use case |
|---|---|
| **Broadcast** | Live comment streams; trigger-based `realtime.broadcast_changes()` for high-scale notifications |
| **Presence** | "Who's currently viewing this release" (~30-line component) |
| **Postgres Changes** | DB row-stream subscription; private channel for security |

All three are sufficient for "collaborative" UI without rolling our own WebSocket layer.

### Recommended collaboration pattern for Anamata Kāhui (30-day MVP)

The unique angle: Anamata Kāhui is the **only** platform that combines split-sheet + tikanga + kaitiaki review + iwi consent + append-only audit. That's the moat.

#### Core entities to add (verified against Splice / TuneCore / DistroKid / Sound.xyz patterns)

```
split_sheets                       -- one per release
  id, release_id (FK), created_by, status (draft/active/locked),
  sum_to_100 (CHECK), signed_at, signed_pdf_url, locked_at

split_participants                 -- N per split_sheet
  id, split_sheet_id (FK), profile_id (nullable for external),
  external_name, external_email,
  role (composer/performer/mixer/engineer/producer/kaihaka/kaiwaiata/kaitiaki),
  publishing_split_pct, master_split_pct,
  typed_signature, signed_at, signed_ip_hash

stem_versions                      -- N per stem, append-only
  id, stem_id (FK), version_number, uploaded_by, uploaded_at,
  storage_path, file_size_bytes, notes, superseded_by (nullable)

stem_comments                      -- N per stem
  id, stem_id (FK), stem_version_id (FK, nullable),
  author_id, body, created_at, parent_comment_id (FK self)

release_collaborator_invites       -- invite tokens
  id, release_id (FK), invitee_email, invited_by, role,
  token (random), status (pending/accepted/declined/expired),
  expires_at, accepted_at

cultural_review_cycles             -- append-only audit
  id, release_id (FK), kaitiaki_id (FK kaitiaki_roopu.id),
  decision (approved/withheld/changes_requested),
  notes, decided_at, parent_cycle_id (FK self for revisions)
```

Plus a **gating trigger** on `releases`:

```sql
before update on releases
for each row when (new.status = 'scheduled'
  and new.cultural_review_status != 'approved')
execute function require_cultural_signoff();  -- raises exception
```

This is the **novelty** — no competitor enforces cultural sign-off at the
database layer. Splice / TuneCore / DistroKid / Sound.xyz have no
equivalent.

#### Minimal feature set (30 days, verified against subagent roadmap)

**Week 1 — schema + splits form**
- Days 1–2: `0010_collaboration.sql` — `split_sheets`, `split_participants` with `CHECK (sum_to_100)` + role enum
- Days 3–6: UI at `/dashboard/collaborate/[release_id]` — split-sheet form, role-select, percentage inputs that sum to 100
- Days 6–9: PDF export via `pdf-lib`; signed artefact stored in `stems/{release_id}/splits/{sheet_id}.pdf`

**Week 2 — stems + invites**
- Day 10: `stem_versions` (append-only), `stem_comments`, `release_collaborator_invites`
- Days 11–14: Version-aware upload UI on `/releases/[id]`; per-stem comments thread
- Days 14–18: Invite flow — branch admin emails an invitee, invitee signs in/up, `release_collaborator_invites` flips to `accepted`, invitee gets `user_branches` access

**Week 3 — cultural review gate (the unique angle)**
- Day 19: `cultural_review_cycles` table + `cultural_review_status` enum on `releases`
- Days 20–24: Kaitiaki dashboard view at `/dashboard/cultural-review/[release_id]` gated on `kaitiaki` role; emits `consent_log` entry on every decision
- Day 25: **Gating trigger** — releases can't reach `status = 'scheduled'` until `cultural_review_status = 'approved'`. CHECK constraint + trigger function in `0010_collaboration.sql`.

**Week 4 — real-time + polish**
- Days 26–27: Supabase Realtime Presence — "who's viewing this release" (~30 lines)
- Day 28: Postgres Changes subscription for `stem_comments` + `split_participants`
- Days 29–30: Reconciliation checklist UI on release detail; CSV export of split sheets for downstream distributors; reconciliation of any unscheduled releases against the new gate

#### Cultural-collaboration unique angle

This is where the platform can win — **no competitor does this:**

- **Tikanga-aware status flow**: a release can't enter `in_cultural_review` until iwi gates are linked; can't reach `approved` until kaitiaki signs off; `released` only fires after kaitiaki approval + master approval.
- **Right-of-withdrawal**: if any iwi withdraws consent post-release, the release auto-flagged `cultural_review_required` and the artist + label are notified.
- **Append-only audit trail**: every state transition is logged with actor + timestamp + notes — visible to all collaborators.

#### What NOT to build (yet)

- ❌ Real-time collaborative DAW editing (BandLab-tier engineering — out of scope)
- ❌ DAW project file storage (.als, .ptx are huge and require transcoding pipelines)
- ❌ Blockchain-based split enforcement (regulatory uncertainty, low adoption)
- ❌ AI mastering integration (BandLab / LANDR do this — not Anamata's niche)

#### What TO build for funder credibility

- ✅ **Open-source the collaboration primitives** — fits the open-source platform narrative
- ✅ **Cultural review dashboard** — visible to funders as evidence of operational Tiriti
- ✅ **Receipt-of-collaboration API** — let partner organizations submit collaboration requests programmatically

---

## Part 3 — Recommended sequencing

| When | Item | Why first |
|---|---|---|
| **Now** (1 day) | Wire `/admin/iwi-gate` Add button | Unblocks kaitiaki onboarding |
| **Now** (1 day) | Wire `/records` "New release" + form | Unblocks artists |
| **Now** (2 days) | Wire `/releases` upload-stem + storage | The whole pipeline |
| **Week 2** | Build collaborator table + invitation flow | Adds multi-artist |
| **Week 2** | Build stem-versioning tables + UI | Adds versioning |
| **Week 3** | Build kaitiaki review state machine | The unique angle |
| **Week 3** | Add per-route role gate | Security |
| **Week 4** | Add Supabase Realtime + email notifications | Polish |
| **Week 4** | Build profile edit page | User can complete their profile |

Total: **4 weeks** to a shippable collaboration pipeline that no competitor has.

---

## Part 4 — Open questions for you

1. **Approval threshold**: should `kaitiaki` approval be a single sign-off, or require 2-of-3 kaitiaki for sensitive releases?
2. **Email notifications**: do you have Resend configured, or should we use a different provider?
3. **Real-time UX**: do artists want a Slack-style "collaborators online" indicator, or is async-only fine for the first release?
4. **Stem file size limits**: any constraint from your DAW-of-choice? (Māori Futurism waiata are typically <100MB per stem)
5. **Public vs private collaborators**: can artist A see that artist B is collaborating on a different release with the same kaitiaki?

---

*End of audit. The collaboration subagent's full industry report will land async and may adjust these recommendations; this is the conservative MVP given current state.*
