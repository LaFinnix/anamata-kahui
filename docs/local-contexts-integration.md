# Local Contexts Hub integration

**Status:** ✅ Implemented (migrations 0011–0013) · **Live integration:** Pending Integration Partner email to Local Contexts
**Hub URL:** https://localcontextshub.org · **API base:** https://localcontextshub.org/api/v2/

## What this does

Anamata Kāhui is integrated with the Local Contexts Hub — the international
standard for **Traditional Knowledge (TK)** and **Biocultural (BC)** labels.
Every waiata, stem, and research paper can carry machine-readable
provenance metadata that travels with the file.

## Workflow

```
   ┌──────────────────────────────────────────────────┐
   │ 1. Artist/researcher creates a Project at        │
   │    https://localcontextshub.org                   │
   │    Adds TK/BC/Notice labels via Hub UI           │
   └──────────────────┬───────────────────────────────┘
                      │ copy the project UUID
                      ▼
   ┌──────────────────────────────────────────────────┐
   │ 2. Anamata dashboard: "Attach Hub project"      │
   │    Paste UUID → attachHubProjectAction            │
   │    → fetches /projects/{uuid}/, caches payload    │
   └──────────────────┬───────────────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────────────┐
   │ 3. Public surfaces render the Hub's icons + text │
   │    /waiata/[slug]                                 │
   │    /research/papers/[id]                          │
   │    PDF / audio / image export → XMP metadata       │
   └──────────────────────────────────────────────────┘

   Polling: /projects/multi/date_modified/ checks
   every refresh; skips unchanged projects.
```

## What was implemented (2026-07-22)

### Schema

| Table | Purpose |
|---|---|
| `lc_labels` | Canonical Hub label catalogue (42 labels: 20 TK + 10 BC + 12 Notices) |
| `lc_label_links` | M:N between labels and assets (legacy — replaced by `lc_project_status`) |
| `lc_label_audit` | Append-only audit trail |
| **`lc_project_status`** | One row per asset linking it to a Hub Project UUID |
| **`lc_labels_cache`** | Cached payload from `GET /projects/{uuid}/` |
| **`lc_sync_log`** | Append-only observability for Hub fetches |

### Code

- `src/lib/local-contexts/hub-client.ts` — typed REST client (6 endpoints, full OpenAPI parity)
- `src/lib/actions/hub.ts` — server actions: attach / refresh / detach
- `src/components/local-contexts/label-manager.tsx` — UI for attaching a Hub project to an asset
- `src/components/local-contexts/labels-display.tsx` — public viewer (badges)
- `src/components/local-contexts/explainer.tsx` — "What are these labels?" block

### Surfaces wired

| Surface | Role |
|---|---|
| `/(dashboard)/releases/[id]` | Manager (attach + refresh + detach) |
| `/(public)/waiata/[slug]` | Public viewer (Hub icons + label text + label_page link) |
| `/(public)/research/papers/[id]` | Public viewer |
| `/(public)/kaitiakitanga#local-contexts` | Full explainer section |

## What's required from Fin

| Action | Why | Effort |
|---|---|---|
| **Email `support@localcontexts.org`** to apply for **Integration Partner** status | Cross-account project visibility (iwi may keep their own Hub accounts) | One email |
| **Generate a Hub API key** at https://localcontextshub.org (account settings) | API key in `LOCAL_CONTEXTS_API_KEY` env var | 5 min |
| (Optional) **Whakatōhea Iwi Waiata App** case study reference in the application | Closest NZ precedent for music + iwi + Labels | Reference |

Email template is at the bottom of this doc.

## Environment variables (`.env.local`)

```
# Local Contexts Hub (https://localcontextshub.org)
LOCAL_CONTEXTS_API_KEY=<X-Api-Key from Hub account settings>
LOCAL_CONTEXTS_HUB_BASE_URL=https://localcontextshub.org/api/v2  # default; sandbox available
LOCAL_CONTEXTS_USE_SANDBOX=false  # set true to use sandbox
```

## Migration path (what happens when an artist attaches a project)

1. User pastes a Hub UUID into the dashboard
2. `attachHubProjectAction` calls `GET /projects/{uuid}/`
3. On 200: writes `lc_project_id` on `releases` / `research_documents`
4. Upserts `lc_labels_cache` with the payload
5. Inserts `lc_project_status` row
6. Logs to `lc_sync_log`
7. Revalidates the page so the labels show immediately

## Polling strategy

For batch refresh, use `GET /projects/multi/date_modified/{id1,id2,...}/`
which returns lightweight metadata. The action compares to the cached
`hub_modified_at` and only re-fetches when the Hub says the project
changed. Honors the Hub's maintenance window (12am–4am Pacific).

## Display rules (verified from API guide)

- **Icons must not be altered** (designed for international recognition)
- Show **title + icon + description** together
- Allow **bold / italic** in translated titles + customized descriptions
- Audio playback of `audiofile` allowed (community narration)
- Recommended: render PNG/SVG icon, link to `label_page`, expand for `label_text` + translations in a popover

## Honest gaps in v1

1. **No Integration Partner status yet** — without it, Anamata only sees Hub projects on our own Hub account. If iwi keep their own Hub accounts, we won't see their labels until status is granted.
2. **No XMP / PDF / ID3 metadata embedding** — currently the icons are rendered in HTML only. For real machine-readable persistence in file metadata, we need to add PDF metadata writing on download, ID3 tag writing for audio stems, and XMP embed for image exports.
3. **No background revalidation cron** — labels refresh when the user clicks Refresh or attaches a new project. For automatic freshness, we need a Vercel Cron or Supabase Edge Function that polls the `date_modified` endpoint.
4. **No batch pull from existing Hub projects** — artists who already have Hub projects need to find the UUID from the URL bar.

## Email template for Integration Partner application

```
Subject: Anamata Kāhui — Integration Partner application

To: support@localcontexts.org

Kia ora Local Contexts team,

I'm writing from Anamata Kāhui (anamatakahui.co.nz), a Māori-led
collective platform that unifies four branches — Anamata Records
(music), Research & Language, Creative Arts, and Technology &
Development.

We integrate the Local Contexts Hub v2 API across our catalog of
released waiata, audio stems, and published research outputs. Our
implementation includes:

- 42 canonical labels in our catalogue (20 TK, 10 BC, 12 Notices)
- Append-only audit trail of every label event
- Append-only consent-log schema aligned with CARE + Te Mana
  Raraunga
- Public-readable label rendering on /waiata/[slug] and
  /research/papers/[id]

Our closest Aotearoa precedent is the Whakatōhea Iwi Waiata App
(2023) — waiata + iwi + Local Contexts Labels. We're applying for
**Integration Partner** status to enable cross-account project
visibility (essential because iwi maintain their own Hub accounts).

Codebase: https://github.com/LaFinnix/anamata-kahui
Evidence surface: https://anamatakahui.co.nz/kaitiakitanga#local-contexts

Nāku noa,
Fin
Anamata Kāhui
```

## Related docs

- `docs/PLATFORM-AUDIT.md` — broader platform audit
- `docs/SECURITY-AUDIT.md` — security review (RLS verified for new tables)
- `docs/DASHBOARD-AUDIT-AND-COLLAB-PLAN.md` — collaboration pipeline roadmap
- Migration 0011, 0012a, 0013 in `supabase/migrations/`
