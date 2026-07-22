# Anamata Kāhui — Funding Audit & Competitive-Advantage Build Plan

**Author:** Audit run on the Kāhui scaffold at `/opt/data/anamata-kahui/`
**For:** Fin / Anamata Kāhui Limited
**Purpose:** Map every gap between the current scaffold and what a 2026 NZ cultural funder assessor would expect to see, ranked by impact. The platform itself is the evidence in funding applications — so each gap is treated as an application-strengthener, not just a tech ticket.

---

## 0. How to read this document

Each row is shaped as:

| | |
|---|---|
| **What** | The capability / section / data |
| **Why it scores** | The specific funder language it answers |
| **Status** | ✅ Built · ⚙ Partial · ❌ Missing |
| **Cost** | Engineering hours, roughly |
| **Payoff** | Which 2026/2027 rounds it unlocks / strengthens |

Sections are ranked from **cheapest-and-fastest** to **most-expensive-but-highest-payoff**. Every item is something the platform can visibly demonstrate to a funder.

---

## 1. The wedge: what makes Anamata's pitch structurally different

The current Kāhui platform already has structural advantages no other NZ label/collective can match today. We need to **surface** these on the public site so a funder can see them in 30 seconds:

| Wedge | Funder language it answers |
|---|---|
| **Four branches, one entity** | Creative NZ's "ecosystem" framing; multi-discipline; Vision Mātauranga Whakawhanake theme |
| **Kaitiaki-gated catalog** | Te Mana Raraunga Māori data sovereignty; CARE+FAIR principles; iwi consent |
| **Trilingual digital infrastructure** (planned) | Accessibility for tāngata whaikaha Māori; NZSL + te reo Māori |
| **Live evidence of cultural review pipeline** | "Māori-led but sector-integrated" (Maurea, MMIC, SoundCheck) |
| **Public-facing governance docs** | Te Tiriti o Waitangi in operations — not just a mission statement |
| **Open-source Kāhui platform** | "Digital infrastructure as cultural infrastructure" — currently rare in NZ music |

The platform's job is to **make these visible by default**, not buried in a "About" page.

---

## 2. Critical gaps (rank-ordered by ROI)

### Tier 1 — Build first, opens the most rounds

#### 2.1 — `/transparency` — Live governance & cultural review dashboard ❌

**What:** A public, unauthenticated page that shows, in real-time:
- Number of waiata in catalog (broken down by status, iwi-gate, language %)
- Number of cultural reviews pending / completed (with consultant named)
- Active iwi consultations
- Decisions made and on what basis (e.g. "Rongomai ki a Miru — held for Tūhoe review")
- Partners currently engaged (Arts Access Aotearoa, Maurea, MMIC, SoundCheck — the names from the winning application)

**Why it scores:**
- Direct answer to Creative NZ's growing expectation that applicants can demonstrate *operational* Te Tiriti integration, not just *intent*.
- Concrete evidence of kaitiakitanga — funders ask "how is data governed?" and we can answer with a live page, not a paragraph.
- Differentiator: virtually no NZ label publishes this level of process visibility. **Competitive advantage, not table stakes.**
- Directly maps to Te Mana Raraunga's CARE principles (Collective benefit, Authority to control, Responsibility, Ethics).

**Cost:** Medium — needs new SQL tables (`cultural_reviews`, `iwi_consultations`), API routes, public route.
**Payoff:** Strengthens every CNZ, Te Mātāwai, NZ On Air Waiata Takitahi application. Could be the *first* NZ music platform to do this.

---

#### 2.2 — `/impact` — Outcomes dashboard with metrics ❌

**What:** A live metrics page that auto-pulls from existing data:
- Total streams across released waiata (Spotify/Apple Music via API integration — flag as "Phase 2")
- Lyrics te reo Māori % per waiata (already in catalog.json)
- Cultural reviews completed
- NZBN, entities, registrations
- Partner organisations engaged (count + names)
- Waiata released vs drafted (counts already exist)
- Languages produced in (English, te reo Māori, NZSL planned)

**Why it scores:**
- The single biggest weakness of the 2026 winning CNZ application was **"no evaluation metrics"** — this fixes it platform-wide.
- Outcomes-Based Accountability and Theory of Change are increasingly the default funder ask. A dashboard makes the application *show* outcomes, not promise them.
- "Live" is the differentiator — funders visit applicant sites; ours shows real numbers.

**Cost:** Medium — needs a metrics aggregation API + page. Some data sources (streaming) need scheduled jobs.
**Payoff:** Universal — strengthens every round. Highly ranked by Creative NZ's 2026 evaluation framework.

---

#### 2.3 — `/kaitiakitanga` — Māori data sovereignty statement (with concrete commitments) ❌

**What:** A standalone page that names and applies:
- Te Mana Raraunga Māori Data Sovereignty Principles
- CARE + FAIR data principles
- Specific, auditable commitments:
  - "Waiata with iwi gates are not released without written consent from named iwi representatives"
  - "Cultural metadata is held in a separate Supabase schema with row-level security scoped to iwi-recognised reviewers"
  - "We do not sell, license, or aggregate waiata data to third parties without iwi approval"
  - "Right of withdrawal: any iwi can request takedown; we honour it within 30 days"
- A public changelog of all data-governance decisions

**Why it scores:**
- Vision Mātauranga's Whakawhanake theme explicitly references iwi/hapū participation in innovation — this page is direct evidence.
- Te Mātāwai's Te Reo Matatini explicitly weights data sovereignty / kaitiakitanga.
- Aligns with NZ government's 2024 Māori Data Sovereignty commitments and the Privacy Act 2020 amendments around Māori data.
- **Table stakes in 2026** for any Māori-led organisation applying for serious money.

**Cost:** Low — content page + maybe a `data_governance_log` SQL table.
**Payoff:** Required reading for any Te Mātāwai, HRC, Marsden, Royal Society Te Apārangi application.

---

#### 2.4 — Trilingual infrastructure: te reo Māori toggle + NZSL video hero ❌

**What:**
- **Reo toggle** in the site header: `/en` ↔ `/mi` routes, with `hreflang` + `lang` attributes.
- **NZSL video hero** on the landing page — short signed welcome by a named NZSL interpreter (WordsWorth Interpreting from the winning app).
- **Easy Read** variant of the home page (one paragraph per card, large text, simple sentences).

**Why it scores:**
- The winning application explicitly named trilingual production as the unique angle — but never delivered it publicly. The platform fixes that.
- NZSL is a recognised NZ language under the NZSL Act 2006; funders notice when it's visible on the *front page*, not just mentioned in a paragraph.
- "Tāngata whaikaha Māori" (the culturally specific term from the winning app) framing — not "Deaf/disabled" alone.
- **Competitive advantage** — no other NZ music platform has all three.

**Cost:** Medium-high. Needs content translations for key routes + an NZSL video (which requires a named interpreter and budget).
**Payoff:** Strengthens Arts Access Aotearoa partnerships, "Arts For All" framework mentions, all accessibility-themed CNZ rounds, Arts Access funding rounds specifically.

---

#### 2.5 — `/evidence` — Partner profiles page with named organisations ❌

**What:** A public page for each partner from the 2026 winning application:
- **Arts Access Aotearoa** (Stace Robertson) — Lead Accessibility Advisor
- **Maurea** (Precious Clark) — Māori Cultural Consultant
- **WordsWorth Interpreting** — NZSL interpreters
- **SoundCheck Aotearoa / MMIC** (Wairere Iti) — Industry advisor
- **Otago Polytechnic** — NZQA Level 4 provider
- **Access Advisors** (Dr Chandra Harrison) — Digital accessibility

Each profile shows: name, role, organisation, the named programme they run, status ("engaged" / "currently in contact" — never claim engagement that's not real).

**Why it scores:**
- The 2026 winning application listed all of these and it scored. Making them public on the platform:
  - Demonstrates they're real, not just name-dropped.
  - Lets partners verify and amplify (they share the link; their audiences see it).
  - Shows sector connectedness — MMIC and SoundCheck Aotearoa are specifically what the style guide says funders notice.
- **Competitive advantage** — public partner pages are rare in NZ music.

**Cost:** Low — content pages, can be statically generated.
**Payoff:** Universal. Strengthens every application. Specific boost for capability-pillar follow-on grants (e.g. New Leaders Programme).

---

### Tier 2 — Build second, deepens the advantage

#### 2.6 — `/tiriti` — Te Tiriti o Waitangi in operations (not just mission) ❌

**What:** A page that goes beyond "we honour Te Tiriti" and lists **operational Tiriti commitments**:
- Governance: % of governance roles held by Māori, advisory board structure
- Procurement: Māori-owned suppliers prioritised (with named examples)
- Hiring: cultural competency requirements per role
- Partnerships: iwi relationships formalised via MoUs (with named iwi)
- Decision-making: cultural review required before any release, design, or policy decision

**Why it scores:**
- "Māori-led but inclusive" is the sweet spot the style guide identifies. This page *demonstrates* it.
- Creative NZ's 2026 evaluation criteria explicitly look for **operational** Tiriti integration, not symbolic.
- Future-proofs against the government's growing expectation of Tiriti audits for public-good funding.

**Cost:** Low-medium — content + light data table.
**Payoff:** Strong for CNZ Arts Organisations & Groups round (the one Anamata won) on re-application; TPK capability grants; NZ Music Commission capability grants.

---

#### 2.7 — `/open-source` — Kāhui platform as cultural infrastructure ❌

**What:** A page that explicitly frames the Kāhui platform as:
- Built with open-source dependencies (Next.js, Supabase, Tailwind)
- Releasing reusable components under a permissive licence
- Available for iwi/hapū organisations to self-host for their own cultural archives
- Documented in plain language, not just developer docs

**Why it scores:**
- "Digital infrastructure as cultural infrastructure" is genuinely novel in NZ. No other label is positioning this way.
- Opens doors to **digital innovation rounds** that other labels can't apply for (e.g. InternetNZ, MBIE Endeavour Fund digital inclusion stream).
- Builds partnership potential with iwi digital teams.
- **Competitive advantage** — likely no other NZ music label/collective has done this.

**Cost:** Low — content page + light GitHub repo setup.
**Payoff:** Opens entirely new funding categories beyond music. Also: becomes a story for press and partner outreach.

---

#### 2.8 — `/sustainability` — Te Taiao commitment ❌

**What:** A sustainability page covering:
- Low-carbon music production practices (named in the boilerplate if any exist; if not, commit to them)
- Touring carbon budget (NZ Music Commission has signalled interest in this)
- Digital-first distribution as a sustainability choice
- Partner with a named sustainability auditor / programme (e.g. Enviro-Mark, Toitū)

**Why it scores:**
- Te Taiao (the natural environment) is one of the four pillars of Te Ao Māori explicitly weighted in Vision Mātauranga.
- NZ Music Commission + Creative NZ have both signalled growing interest in environmental sustainability in 2026 rounds.
- Cheap to do the *commitment* page now; expensive to do the *audit* — but the commitment can lead the audit.

**Cost:** Low — content page.
**Payoff:** Strengthens NZ Music Commission capability grants; aligns with Toitū EnviroCare partnership potential.

---

#### 2.9 — `/research` (already routed) — Surface research outputs publicly ⚙

**What:** The platform already has `/research` and `/research/dashboard` routes but the public one is a placeholder. Build it out with:
- Published outputs (working papers, conference presentations, datasets)
- Researcher profiles
- Iwi partners on each project (with consent)
- DOI links to formal outputs
- Open data (where iwi-permitted) — links to GitHub or Zenodo

**Why it scores:**
- Royal Society Te Apārangi Tāwhia te Mana Fellowships explicitly weight public research outputs and Vision Mātauranga alignment.
- Marsden Fund values open scholarship.
- HRC Māori Health Research — if any research touches health/wellbeing, this is the gateway.
- **Table stakes** for any serious research-funding application.

**Cost:** Medium — needs content aggregation from existing `research/` directory.
**Payoff:** Unlocks research-funding rounds that the label alone can't access.

---

#### 2.10 — Live accessibility statement + WCAG audit badge ❌

**What:**
- A `/accessibility` page listing the platform's accessibility commitments in plain English and te reo Māori
- An automated accessibility scanner running in CI (e.g. axe-core)
- A public statement of conformance (WCAG 2.2 AA target)
- Contact form for reporting accessibility issues
- "Last reviewed" date + reviewer name (named consultant)

**Why it scores:**
- Direct response to the "Accessibility" pillar of the winning application — turning the *promise* into a *live artefact*.
- Differentiator: most NZ music platforms have no accessibility statement, let alone a live audit.
- WCAG audits are increasingly required for government-facing funding.
- **Competitive advantage** — meaningful for Arts Access Aotearoa, "Arts For All" framework applications.

**Cost:** Low-medium — content page + CI integration.
**Payoff:** Universal accessibility, plus specific Arts Access rounds.

---

### Tier 3 — Build third, fills gaps for specific high-value rounds

#### 2.11 — `/artist` (public) — Artist roster with bios, all-iwi-gated metadata ⚙

**What:** The Records branch has 5 released waiata but no public artist roster page in the Kāhui. Build:
- Each artist with bio, role, iwi (if disclosed), photo, links
- Releases per artist (pulled from existing catalog)
- Cultural provenance clearly displayed
- "Iwi-gated releases" clearly marked with what's accessible and to whom

**Why it scores:**
- NZ On Air Waiata Takitahi applications need to demonstrate artist roster and provenance.
- Funders ask "who is the artist?" — having a public roster page answers it without an attachment.
- **Table stakes** for NZ On Air applications.

**Cost:** Low — content page + artist table in Supabase.
**Payoff:** Required for NZ On Air single and project applications.

---

#### 2.12 — `/waiata/[slug]` (public) — Individual waiata pages with full metadata ❌

**What:** Each waiata gets a public page with:
- Cover art
- Lyrics (te reo Māori + English gloss)
- Streaming links (Spotify, Apple Music, YouTube)
- Cultural provenance (story source, iwi gate, reviewer)
- Released date, UPC/ISRC
- Te reo vocabulary count + unverified terms count
- Status: released / drafted / scheduled
- Direct cultural review status

**Why it scores:**
- Each waiata becomes its own evidence page. An assessor clicking through the catalog sees real, traceable cultural data on every entry.
- Differentiator: most NZ labels don't publish their cultural review process *per release*.
- **Competitive advantage.**

**Cost:** Medium — DB query layer + dynamic route + per-waiata metadata.
**Payoff:** Waiata Takitahi, Te Reo Matatini, every cultural-pillar application.

---

#### 2.13 — `/press` + `/stats` — Quantified press kit ❌

**What:** Public page that aggregates:
- Total streams (lifetime / 30d / 90d)
- Audience geography (top 10 countries)
- Press coverage with quotes
- Industry recognition (won grants, named in reports)
- Cultural impact metrics (e.g. "47 cultural reviews completed", "8 iwi partnerships active")

**Why it scores:**
- Outward Sound (NZ Music Commission) and Going Global rounds explicitly want quantified export potential.
- Media coverage cited in applications becomes more credible when a public `/press` page backs it up.
- **Table stakes** for export-focused rounds.

**Cost:** Low — content aggregation.
**Payoff:** Outward Sound, Going Global, Showcase, international engagement rounds.

---

#### 2.14 — `/funding` — Public funding transparency ❌

**What:** Public page listing:
- All grants received (year, body, amount, project)
- All grants currently held (with project status)
- All grants applied for (pending decision)
- Acknowledge funders publicly (already done in footer for Creative NZ)
- "This is how we use the money" — quarterly updates

**Why it scores:**
- **Transparency as a competitive advantage** — funders increasingly weight applicant transparency and ethics.
- Pre-empts the "where does the money go?" question in future applications.
- Aligns with the open-source ethos the platform is positioned around.
- **Highly differentiated** in NZ music context.

**Cost:** Low — content + light SQL table.
**Payoff:** Universal. Specific boost for TPK, CNZ, NZMC rounds.

---

#### 2.15 — `/calendar` — Public events / release schedule ❌

**What:** Public-facing calendar showing:
- Release dates for upcoming waiata
- Live performances / tours
- Cultural events (e.g. iwi engagements)
- Funding deadlines (so partners see we plan ahead)
- Application status (e.g. "Waiata Takitahi application submitted 15 Oct 2026")

**Why it scores:**
- Demonstrates operational maturity.
- Helps partners and reviewers see what's coming.
- **Table stakes** for NZ On Air rounds that want release schedules.

**Cost:** Low — content page or simple calendar component.
**Payoff:** NZ On Air rounds, partner coordination.

---

## 3. SQL additions needed to support the above

| Migration | Tables | Used by |
|---|---|---|
| `0002_cultural_reviews.sql` | `cultural_reviews`, `iwi_consultations`, `partner_engagements` | §2.1, §2.5 |
| `0003_data_governance_log.sql` | `data_governance_log` | §2.3 |
| `0004_funding_records.sql` | `funding_rounds`, `funding_outcomes`, `funding_uses` | §2.14 |
| `0005_artists.sql` | `artists`, `artist_iwi_affiliations`, `releases_x_artists` | §2.11 |
| `0006_metrics_snapshots.sql` | `metrics_snapshots` (denormalised, daily cron) | §2.2 |

All should follow the RLS patterns in `0001_initial_schema.sql` — public read for transparency data, branch-scoped writes for editorial.

---

## 4. Engineering prioritisation matrix

| Build | Effort | Impact | Recommended phase |
|---|---|---|---|
| `/transparency` (live governance) | M | ★★★★★ | **Phase 1** |
| `/kaitiakitanga` (data sovereignty) | L | ★★★★★ | **Phase 1** |
| `/evidence` (partner profiles) | L | ★★★★☆ | **Phase 1** |
| `/impact` (outcomes dashboard) | M | ★★★★★ | **Phase 1** |
| Reo toggle + Easy Read + NZSL hero | M-H | ★★★★★ | **Phase 2** |
| `/tiriti` (operational Tiriti) | L | ★★★★☆ | **Phase 2** |
| `/open-source` (positioning) | L | ★★★★☆ | **Phase 2** |
| `/sustainability` (Te Taiao) | L | ★★★☆☆ | **Phase 2** |
| `/accessibility` (WCAG statement + audit) | L-M | ★★★★☆ | **Phase 2** |
| `/waiata/[slug]` (per-release pages) | M | ★★★★☆ | **Phase 2** |
| `/artist` (roster) | L | ★★★☆☆ | **Phase 3** |
| `/press` (stats + coverage) | L | ★★★☆☆ | **Phase 3** |
| `/funding` (transparency) | L | ★★★★☆ | **Phase 3** |
| `/calendar` (public schedule) | L | ★★☆☆☆ | **Phase 3** |
| SQL migrations 0002-0006 | M | (enables all of above) | Phased with each section |

**L** = < 1 day · **M** = 1-3 days · **M-H** = 3-7 days · **H** = > 1 week

---

## 5. Brand consistency fork — needs decision

The Anamata Records site uses **kōkōwai red, kōhai gold, ngahere green** (earth-tones, taonga-puoro-anchored).

The Kāhui scaffold I built uses **bronze/gold + dark** (more tech / future).

These are different but related identities — Kāhui is the parent, Records is the child. Two options:

**Option A — Kāhui has its own palette, Records keeps its palette.** Pro: each brand has room to evolve. Con: visitors moving between them may experience cognitive friction.

**Option B — Reconcile to a shared token system.** Pro: cohesive ecosystem. Con: dilutes Records' taonga-puoro identity.

**Recommendation:** Option A with one constraint — the Kāhui palette uses one Records accent (kōhai gold) as a secondary, so there's a visible family resemblance. Decision needed before any UI work.

---

## 6. Funder-by-funder lift, if all of Tier 1 + Tier 2 shipped

| Round | 2026 status | Lift after build |
|---|---|---|
| Creative NZ Arts Organisations & Groups (re-apply 2027) | Won $10k in 2026 | ★★★★★ — operational evidence of every pillar |
| Creative NZ New Leaders Programme | Eligible | ★★★★☆ — leadership visibly demonstrated |
| Creative NZ Creative Impact Fund | Eligible | ★★★★★ — outcomes dashboard is direct evidence |
| Creative NZ International Arts Impact Fund | Eligible Aug 2026 | ★★★★☆ — `/open-source` + `/transparency` are international-pitch gold |
| Creative NZ Early Career Fund | Borderline | ★★★☆☆ — concrete record helps the borderline case |
| NZ On Air Waiata Takitahi (Oct-Nov 2026) | Primary fit | ★★★★★ — per-waiata cultural metadata + reviewer pipeline |
| NZ On Air New Music Single | Eligible | ★★★★☆ — roster + waiata pages ready |
| NZ On Air New Music Project | Borderline | ★★★☆☆ — metrics dashboard helps the borderline |
| Te Mātāwai Te Reo Matatini | Eligibility unclear | ★★★★★ — kaitiakitanga + reo toggle are direct answers |
| Te Māngai Pāho Reo Māori Content Co-Fund | Not eligible | — (music only) |
| NZ Music Commission Outward Sound | Borderline | ★★★★☆ — `/press` + metrics + open-source positioning |
| NZ Music Commission Capability Grants | Eligible | ★★★★☆ — Tiriti + accessibility + governance are all built |
| Royal Society Te Apārangi Tāwhia te Mana | Open | ★★★★☆ — research surface + VM alignment |
| Marsden Fund | Closed for 2026 | ★★★★☆ — opens 2027 with `/research` outputs |
| TPK capability grants | Monitor | ★★★★★ — operational Tiriti + governance are direct answers |

---

## 7. What's structurally working in the current scaffold

For balance — what's already on the platform that scores:

- ✅ Multi-branch architecture (the *structure* itself is a unique differentiator)
- ✅ Supabase RLS with iwi-scoped data (technically correct foundation for kaitiakitanga)
- ✅ Tailwind v4 + dark theme with bronze tokens (clean, modern, distinct from the Records site)
- ✅ Production build green, types clean, all routes generating
- ✅ Auth route protection in `proxy.ts` (server-side enforced, not client-side bolted-on)
- ✅ `.env.example` + `vercel.json` already structured for production deploy
- ✅ Branch switcher in header (the multi-branch UX already exists)

The platform is **structurally sound**. The funding audit gaps are content + page additions, not architecture rebuilds.

---

## 8. Open questions for Fin

1. **Brand consistency fork (Section 5):** Option A (separate palettes, family resemblance) or Option B (shared tokens)? Decision blocks all UI work.
2. **NZSL video budget:** Trilingual infrastructure assumes a paid NZSL interpreter. Is there budget for WordsWorth Interpreting to record the hero? If not, can we ship the reo toggle and Easy Read first, with NZSL as Phase 3?
3. **Partner permission for `/evidence`:** Can we publish profiles for all 6 partners named in the winning application? Some may not want public profiles. Need written consent for each.
4. **Public funding transparency:** Are we comfortable publishing grant amounts and uses publicly? Some funders require this anyway; others don't. Confirm before §2.14.
5. **Research branch depth:** Is the `research/` directory material enough to populate `/research` properly, or do we need a separate content sprint?

---

*Last updated: scaffold audit run. Update after each Phase ships.*
