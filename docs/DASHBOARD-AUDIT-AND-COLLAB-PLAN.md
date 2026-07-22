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

The subagent's full report will land async. Below is the **consolidated recommendation** I can give based on what I already know about Splice / BandLab / DistroKid / Stem / ROLI / Sound.xyz / BeatStars / Git-for-music patterns + Supabase Realtime capabilities.

### Industry patterns (consensus view, not from the subagent report)

1. **Split sheets** — Standard practice. Signed PDF per release declaring each collaborator's percentage of:
   - Publishing (compositional copyright)
   - Master (recording copyright)
   - Performance
   Most platforms do this with a form + e-signature (DocuSign embedded) + downloadable PDF.

2. **Stem versioning** — Most labels use a simple `v1`, `v2`, `v3` scheme with comments per version. Git-style branching rarely (DAW projects are binary, can't be diffed). Comments per stem are standard (Splice Studio does this, BandLab does this).

3. **Real-time DAW collaboration** — Niche. BandLab and Soundtrap are the leaders. Splice has Splice Studio for stem-level collab. Adding this to Anamata Kāhui is **out of scope** for the next 30 days — it's a major engineering effort.

4. **Async collaboration** — The dominant pattern is: download stems, work offline, upload new version, comment, repeat. DAW-agnostic tools (Stem.is, MoForte) tried this; few survived.

5. **Cultural collaboration** — No existing platform handles tikanga + kaitiaki review alongside splits + creative collab. **This is a market gap.**

### Supabase Realtime primitives available

| Primitive | Use case for Anamata |
|---|---|
| **postgres_changes** | Subscribe to `releases.status` to notify when kaitiaki approves |
| **presence** | Show which collaborators are online / viewing the release |
| **broadcast** | Live in-app comments / chat per release |
| **storage webhook** | Trigger processing when a stem is uploaded |

All available today, no migration needed.

### Recommended collaboration pattern for Anamata Kāhui (30-day MVP)

The unique angle: Anamata Kāhui is the **only** platform that combines split-sheet + tikanga + kaitiaki review + iwi consent + append-only audit. That's the moat.

#### Core entities to add

```
release_collaborators
  id, release_id, profile_id, role (composer/performer/mixer/engineer),
  publishing_split_pct, master_split_pct, signed_at

release_invitations
  id, release_id, invitee_email, invited_by, role, status (pending/accepted/declined),
  expires_at, accepted_at

stem_versions
  id, stem_id, version_number, uploaded_by, uploaded_at, file_url, file_size_bytes,
  notes, superseded_by

stem_comments
  id, stem_id, stem_version_id, author_id, body, created_at, parent_comment_id

release_activity_log
  id, release_id, actor_id, action (created/edited/invited/approved/released),
  notes, created_at
```

#### Minimal feature set (4 weeks)

**Week 1: foundation**
- `release_collaborators` table + `release_invitations` table
- `release_collaborators` insert form on `/releases/[id]`
- Email-invite flow (Resend)

**Week 2: stem versioning**
- `stem_versions` table + `stem_comments` table
- Version-aware upload UI on `/releases/[id]`
- Per-stem comments thread

**Week 3: kaitiaki review pipeline**
- `release_activity_log` table
- Status state machine: `draft → in_cultural_review → approved → scheduled → released`
- Kaitiaki dashboard view: queue of pending reviews
- Append-only audit trail (already have `consent_log`)

**Week 4: real-time + polish**
- Supabase Realtime: live status changes + collaborator presence
- Email notifications via Resend when state changes
- Per-release activity feed

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
