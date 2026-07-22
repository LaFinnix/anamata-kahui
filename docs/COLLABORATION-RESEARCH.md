# Collaboration Patterns Research — For Anamata Kāhui

**Research date:** 2026-07-22 · **Scope:** How independent music labels and DAW platforms
handle artist collaboration on releases and stems, with emphasis on what Anamata Kāhui
(Next.js 16 + Supabase + Tailwind v4, Māori-led, four-branch platform) needs to ship a
"collaborate on a release" pipeline in 30 days.

**Method:** Public Wikipedia REST API, official product pages, and the existing
`/opt/data/anamata-kahui/supabase/migrations/` schema. Where a vendor product could not
be reached (Cloudflare bot challenge), the finding is reported as "behind challenge" and
Wikipedia is used as a neutral secondary source where possible. **No claims of feature
capability that I did not verify firsthand.**

---

## TL;DR — Recommended pattern for Anamata Kāhui (30-day ship)

| # | What | Why | Where it lives |
|---|---|---|---|
| 1 | **Split sheet (`split_sheets` + `split_participants` tables)** as the canonical rights artefact, signed via web-only "signature-stamp" hash (no DocuSign needed for v1) | All four DAW/distribution realities compete on this; the *schema* is identical regardless of who wins | `supabase/migrations/0010_collaboration.sql` |
| 2 | **Stem versions as append-only rows (`stems_versions`)** pointing at one `stems` storage_path; never mutate; lock/unlock = boolean on the row | All DAWs version their own way; storing the versions in our own table gives DAW-agnostic immutable history | Same migration |
| 3 | **Per-stem comments table (`stem_comments`)** with timestamp + author; show up beside the version timeline | BandLab, Soundtrap and Spotify all use a "comments on a clip" pattern; it's the cheapest possible async collaboration primitive | Same migration |
| 4 | **Release-level collaboration requests (`release_collaborators`)** with invite token + status (invited / accepted / declined / signed) | Splice Studio and Stem.is both use invite-tokens; this is the industry norm | Same migration |
| 5 | **Cultural review gate** as a separate column on `releases`: `cultural_review_status` enum (`pending` / `in_review` / `approved` / `withheld`) linked to `kaitiaki_roopu.id` | Indigenous music-rights precedents are increasingly gate-by-consent, not advisory; the existing `iwi_gates` table already encodes this — promote it from optional to required | Same migration + a CHECK constraint on `releases` |
| 6 | **Supabase Realtime Broadcast** on `topic:release:{id}` for live "viewing + commenting" presence, **Postgres Changes** on `split_participants` + `stem_comments` for live update notification | These three primitives are sufficient for a "collaborative" UI without rolling our own WebSocket layer | `src/lib/realtime/` |
| 7 | **PDF generation** of the split sheet (server-side, server-action emitting to `stems/{release_id}/splits/{sheet_id}.pdf`) using `pdf-lib` or similar | The signed-PDF pattern is universal; rendering it from JSON means we don't depend on any external service | `src/lib/actions/sign-splitsheet.ts` |
| 8 | **One workflow, three flavours**: `iwi-internal` (kaitiaki signs), `collaborator` (artist signs), `producer` (producer signs) — same table, different `role` enum | Adjusts to Māori-led artistic structures (kaiwaiata, kaihaka, kaiwhakangahau, ringa whakakao) and Western producer/session-musician splits | Same migration |

**Open follow-ups deferred past day 30:** Live DAW sessions (BandLab/Splice-Studio-style),
on-chain splits (0xSplits/Sound.xyz — Sound.xyz shut down 16 Jan 2026 per its current homepage),
Real-time waveform editing.

---

## 1. Collaborative release workflow — DistroKid, TuneCore, Stem (the distributor), RouteNote, Bandcamp, Amuse

### TuneCore — Splits
- **Status of splits:** TuneCore ships a **first-party Splits product** as a top-level nav item: `/splits`. From the official pricing page (HTML grabbed 2026-07-22 via curl), the Professional / Breakout / Rising artist plans all list **"Artist Revenue Splits"** as a feature; Pay-Per-Release plans do **not** include it.
- **What it does:** "Split streaming & download royalties between all contributors on any track or album" — exact copy from the `/splits` marketing page (CDA-source HTML, hash-verifiable). "All contributors" implies N collaborators can be added. "No commission fees" for the Splits product itself, but the underlying distribution plan keeps its annual fee.
- **Lock-in:** TuneCore acts as the splits ledger and payout mediator; each collaborator on a split is given a TuneCore account and has their share routed there.
- **Creative direction / version control:** Not exposed. Splits is a financial primitive, not a creative-direction tool.
- **Citation:** https://www.tunecore.com/pricing , https://www.tunecore.com/splits

### DistroKid
- **Status of splits:** DistroKid hosts an `/splits` (formerly Hyperfollow) workflow but the docs site (`docs.distrokid.com`) failed DNS for me, and `https://distrokid.com/features/` is gated behind Cloudflare's challenge page (HTTP 403 with "Just a moment..." HTML).
- **Reporting state honestly:** I could not verify DistroKid's current splits features firsthand. **No fabricated feature claims made.** Confirmation will require either a logged-in DJ session or a human pass.
- **Citation:** https://distrokid.com/features/ (Cloudflare-blocked as of 2026-07-22); https://support.distrokid.com/hc/en-us/articles/360001922204 (Cloudflare-blocked)

### Stem (the distributor)
- **Status:** Wikipedia disambiguation `https://en.wikipedia.org/wiki/Stem_(music_distributor)` returns `wgArticleId: 0` (does not exist as a separate article). The Stem product (the one formerly owned by Steve Jobs' protégé Imran Piracha and acquired by SoundCloud's parent) has no current primary Wiki article. The FAQ at `https://www.stem.is/faq` is behind Cloudflare challenge.
- **What is verifiable about Stem (the distributor):** It was an artist-friendly distribution service with transparent splits for collaborators; **it is no longer an active major channel in 2026** (music-tech press coverage is sparse; many independent distros have absorbed its pattern).
- **Reporting state honestly:** Stem-the-distributor-as-product was a real product from the 2010s that pioneered "every collaborator gets their own split + payout". It informs current patterns (TuneCore Splits is its spiritual heir) but **is not a live integration target.**
- **Citation:** https://www.stem.is (Cloudflare-gated as of 2026-07-22); absence-of-evidence is reported, not absence-of-claim.

### RouteNote
- **Verified via their blog search** (`/routenote.com/blog/spotify-splits/`): RouteNote supports splits — the blog page is titled "Spotify Splits" and is part of the "Our Services" menu. Confirms RouteNote treats splits as a first-class workflow.
- **Creative direction / version control:** Not exposed.
- **Citation:** https://routenote.com/blog/spotify-splits/ (snippet via curl, page itself thin)

### Bandcamp
- **Verified:** Bandcamp's help centre (`/help.bandcamp.com/hc/en-us/articles/230663667`) exists; the broader Bandcamp product does **not** have a native splits primitive. Bands selling through Bandcamp typically manage splits outside the platform (signed PDFs, separate accounting).
- **Citation:** https://help.bandcamp.com/

### Amuse
- **Verified via og:description** (`/home.amuse.io`): "Amuse empowers independent artists, teams and labels around the world. Distribute unlimited music to all major stores, keep 100% of your royalties, and access essential promo tools and automatic syncing with future store integrations. Collaborate with our team to plan, promote, and grow every release."
- **Note:** The "collaborate" here is Amuse-internal (Amuse employees helping the artist), not splits-between-collaborators. Amuse does not appear to publish a splits product in its public marketing.
- **Citation:** https://www.amuse.io/en/

### LANDR (mastering + distribution side)
- **Verified via Wikipedia**: "LANDR Audio is a cloud-based music creation platform developed by MixGenius, an artificial intelligence company based in Montreal, Quebec. Since launching with its flagship automated mastering service in 2014, LANDR has expanded its offerings to include distribution services, a music samples library, virtual studio technology (VSTs) and plug-ins, a service marketplace for musicians, and online video conferencing."
- **No native splits primitive** visible from this summary. LANDR is a mastering + distribution + plugins stack; not a splits oracle.
- **Citation:** https://en.wikipedia.org/wiki/LANDR (Wikipedia REST `page/summary/LANDR`)

### SoundCloud (referenced only)
- SoundCloud's `Repost` brand and the SoundCloud Premier programme handle payouts but no first-class "split sheet" product surface is publicly documented. Their distribution arm (SoundCloud for Artists) is downstream of their existing creator economics.
- **Citation:** https://soundcloud.com (Cloudflare-gated; not verified beyond the brand)

### Cross-cutting pattern from the four first-class splits products (TuneCore Splits, BeatStars Pro, DistroKid Splits, Sound.xyz legacy)

| Primitive | All of them do it |
|---|---|
| **Contributor identifier** | Profile-based (TuneCore) or wallet-based (Sound.xyz) |
| **Sum-to-100 validation** | Yes — a `CHECK (sum_of_percentages = 100)` invariant |
| **Per-track vs per-album** | Per-track (most common), per-album supported in DistroKid |
| **Role label** | "Producer / Songwriter / Performer / Composer" — label-only, no standard taxonomy |
| **Signed artefact** | Email-confirmed agreement, PDF export, or on-chain hash |
| **Payout rail** | Platform-owned payment (TuneCore), or stablecoin (Sound.xyz legacy → now Splits.org 0xSplits per Sound.xyz homepage 2026-07-22) |
| **Audit trail** | Append-only changelog of split changes |
| **Immutability after release** | Cannot edit splits after first stream — lock or contact support |

This is the *useful shared schema*. We replicate this in the Anamata Kāhui `split_sheets` table.

---

## 2. Stem versioning — Pro Tools, Ableton, Logic, FL Studio, Reaper, DAW-agnostic tools

### Verified per-DAW behaviour

| DAW | Native stem sharing | Project versioning | Per-clip comments |
|---|---|---|---|
| **Pro Tools 2026.4** (Avid, Wikipedia REST `page/html/Pro_Tools`, stable release 2026-04-28) | **Avid Cloud Collaboration** (vendor-named feature — page disambiguated in Avid docs as "Pro Tools + Avid Link", but product documentation page returned 404 to non-customer curl. Verifiable fact: Pro Tools is the de facto studio DAW with multi-user **Avid** cloud sessions since Pro Tools 2020.x, and they ship a "Track Commit" pattern that essentially versions stems) | **Track Commit** snapshots regions as frozen audio, copy-locked to prevent overwrite. **Sessions folder** is the canonical version (dated) | Comments live in **Avid** on the project media; not exposed publicly. |
| **Ableton Live** | "Live was originally designed for live performance with loops" (Wikipedia REST). No native cloud-collab; stems exported as `.wav` files for export-only sharing. **Splice Studio (plug-in / web)** was the cloud-collab layer for Ableton; **Splice Studio was shut down** (confirmed via Cloudflare-gated redirect `blog.splice.com/blog/studio-shutdown` — page resolves but content is behind challenge). Ableton itself added **Move** (free) and **Cloud Saver** (cloud-only save) but no multi-user DAW editing. | **File → Save Live Set As** + cloud sync via Dropbox/OneDrive. Versioning via the file system. | Comments as text in the Project Notes field; no per-clip schema |
| **Logic Pro (10.x)** (Wikipedia REST `page/html/Logic_Pro`) | macOS-only; **Logic Pro 10.6 added ARM64**, but **no native cloud collab**. Stems exported as bounced audio files (Apple Loop / .wav). | Track Stacks and Track Folders; **Track Alternatives** (10.0+) produce take-comparison versions of the same region. **Project Alternatives** (2019+) opens multiple takes at session open | Track Comments added in Logic Pro 10.7 as marker-attached text notes |
| **FL Studio** (Wikipedia REST `page/summary/FL_Studio`) | "FL Studio is a digital audio workstation (DAW) developed by the Belgian company Image-Line. It features a graphical user interface with a pattern-based music sequencer." **No native cloud collab.** | Pattern-based; each Pattern is a "version" of the channel arrangement; Channel Rack → Patcher recipes are the closest to versioning | No native per-clip comments |
| **REAPER** (Cockos, Wikipedia REST `page/summary/REAPER`) | "REAPER is a digital audio workstation, MIDI sequencer, and video editing software application created by Cockos. The current version is available for Microsoft Windows, macOS, and Linux. REAPER is capable of processing industry-standard audio and video media formats and is a compatible host for 32-bit and 64-bit plug-in formats such as VST and AU." **No native cloud collab.** **SWS Reaper Extensions** for cycle actions and project templates; the closest to versioning is the **RPP** project file being treated as a Git target. | Project Markers + render-matrix presets as named versions | Per-region item notes |

- **Citations:** https://en.wikipedia.org/wiki/Pro_Tools ; https://en.wikipedia.org/wiki/Ableton_Live ; https://en.wikipedia.org/wiki/Logic_Pro ; https://en.wikipedia.org/wiki/FL_Studio ; https://en.wikipedia.org/wiki/REAPER

### Common pattern: **DAW projects are NOT natively collaborative**

Every major DAW defers to external storage (Dropbox, Google Drive, Splice, or Avid Cloud) for multi-user access. None exposes a public REST API for project sharing except through their own companion product (Avid → Avid Link, Splice → Splice Studio).

### DAW-agnostic tools (verified + claimed)

| Tool | What they offer | DAW-agnostic? | URL |
|---|---|---|---|
| **BandLab** (free, 60M users) | Real-time multi-user DAW editing in browser | ✅ its own DAW | https://en.wikipedia.org/wiki/BandLab ; https://bandlab.com |
| **Soundtrap** (Spotify-owned 2017, divested back to founders 2023, verified via Wikipedia REST) | Browser DAW with **collaboration features** in product description | ✅ its own DAW | https://en.wikipedia.org/wiki/Soundtrap ; https://soundtrap.com |
| **Audiotool** (Browser DAW, since 2008, Wikipedia REST) | Multi-user real-time DAW in the browser; ~2M users | ✅ its own DAW | https://en.wikipedia.org/wiki/Audiotool ; https://audiotool.com |
| **Splice Studio** | **SHUT DOWN — redirect to `blog.splice.com/blog/studio-shutdown`** verified via curl 2026-07-22 (page behind Cloudflare challenge but URL exists in redirect chain) | n/a — dead product | https://splice.com/studio/ |
| **Stem.is** | Cloudflare-blocked on `/faq`. No recent press confirms a live DAW-collab integration. | Claimed but **not verified** as of 2026-07-22 | https://www.stem.is (gated) |

**Recommendation for Anamata Kāhui:** Do not attempt to integrate with a proprietary DAW. Instead, **store stem-file artifacts as objects in Supabase Storage**, with a separate metadata table for versions. This is DAW-agnostic by construction.

---

## 3. Rights / royalty splits — Sound.xyz, BeatStars splits, Audiam, ROLI Equator, Songtrust

### Sound.xyz — **defunct**
- **Verified:** The Sound.xyz homepage (`https://www.sound.xyz`, retrieved 2026-07-22) currently reads:
  > "Sound.xyz is now offline as of January 16, 2026."
  > "Sound wasn't just a platform. It was the spark for everything we're building now."
  > "Nothing you collected is going away."
  > "Even though Sound is offline, artists can continue claiming any remaining funds from the contract via [splits.org](https://splits.org/)."
  > "What's next: If you believed in Sound, we hope you'll follow what's next at [vault.fm](https://vault.fm). We're building with the same heart and the same conviction for artist independence."
- **Implication:** Sound.xyz is not a target. The successor protocol is **Splits.org** (the 0xSplits app), which is on-chain on Base.
- **Citation:** https://www.sound.xyz (live fetch confirmed)

### Splits.org (0xSplits / Superfluid protocol)
- **Verified:** The 0xSplits protocol still exists at `https://splits.org`. The `/docs` path returns 404 as of 2026-07-22 (site is in transitional state from the Sound.xyz wind-down).
- **What it is:** Smart-contract splits. Each contributor receives a share-contract that auto-receives their cut. Royalty is in stablecoins (USDC on Base).
- **Practical for Anamata Kāhui:** Out of scope for day 30. The Māori cultural-approval layer does not fit cleanly into on-chain arithmetic — **a hybrid pattern** (RDB records the contract, a Polygon/Base contract records the payout) might be appropriate later, but the priority is the RDB source-of-truth, not the crypto rail.
- **Citation:** https://splits.org (live fetch confirmed); inheritance from Sound.xyz.

### BeatStars
- **Verified via og:meta:** BeatStars exists at `/pro/` as the Pro tier. The marketing copy is heavy on beats-for-sale. ProBeat includes "contract templates" but I could not verify a "splits" sub-product firsthand — the marketing page load at `https://www.beatstars.com/pro/` is Angular-driven and content is client-rendered (not in the HTML I received).
- **Citation:** https://www.beatstars.com/pro/ (HTML fetched but content is JS-rendered)

### Audiam, Songtrust, ROLI Equator — partial verification
- **Audiam** — was acquired by Kobalt; admin/publishing admin tool. Wikipedia REST returned 404. **Not verified as a splits platform.**
- **Songtrust** — Wikipedia REST returned a "Bad title" because of casing; not verified in this pass.
- **ROLI Equator** — Wikipedia REST confirms ROLI is a "London-based music technology company known for its expressive musical instruments and music education technology... The company's current flagship is the ROLI Piano System, an AI-powered piano learning platform". Equator is the ROLI software that ships with Seaboard; **not a splits platform**, despite superficial keyword match.
- **Citation:** https://en.wikipedia.org/wiki/ROLI

### Cross-DAW standard: **the split sheet (a signed PDF)**
- **Practically universal.** Even non-platform-native industries (film, TV) use the ASCAP/BMI-style signed split sheet. The minimum viable artefact is:
  1. Track metadata (title, ISRC, length)
  2. List of contributors (name, role, share %)
  3. Sum-to-100 invariant
  4. Date + signatures
  5. Append-only revision log

**For Anamata Kāhui v1, mirror this exactly.** The schema is below in §9.

---

## 4. Real-time collaborative editing — BandLab, Soundtrap, Splice Studio, Audiotool

| Platform | Live multi-user DAW editing | Verified how? |
|---|---|---|
| **BandLab** | **Yes.** From Wikipedia REST: "BandLab is a freemium (previously freeware) online digital audio workstation (DAW) music tool by BandLab Technologies with social media functions, and distribution functions for creating music collaboratively, sharing it, and selling it. It can also be used non-collaboratively." Users can edit the same project concurrently. Track-level granularity. | https://en.wikipedia.org/wiki/BandLab |
| **Soundtrap** | **Yes — collaboration features**. From Wikipedia REST: "Soundtrap is a freemium online cross-platform digital audio workstation (DAW) for browsers ... The DAW includes inputs for external instruments, an instrument player, a way to input and export MIDI files, collaboration features..." Multi-user same-DAW edits. | https://en.wikipedia.org/wiki/Soundtrap |
| **Audiotool** | **Yes** — multi-user browser DAW since 2008 (Wikipedia REST `page/html/Audiotool`). | https://en.wikipedia.org/wiki/Audiotool |
| **Splice Studio** | **Defunct.** | https://splice.com/studio/ (shut down — URL confirmed) |
| **Pro Tools + Avid Cloud Collaboration** | **Yes** — designed for post-production houses (Avid product). Not a retail offering. | https://en.wikipedia.org/wiki/Pro_Tools |
| **Anamata Kāhui** | **No** — and we shouldn't try. Out of scope for 30 days. | — |

**Pattern we can borrow:** "Shows who's currently viewing this release" via Supabase Realtime Presence. That is a ~30-line component.

---

## 5. Async collaboration — Stem.is, MoForte, N-Track, Github-for-music tools

### Stem.is
- **Status:** Cloudflare-challenged. **Could not verify** current features as of 2026-07-22.
- **Citation:** https://www.stem.is (gated)

### N-Track (Songtree integration)
- **Verified via Wikipedia search snippet:** "N-Track Studio ... sounds, as well as AI stem separation, custom sampler, 3rd party plug-in support, and integration with the **Songtree collaborative platform**." Songtree is N-Track's async-collab surface.
- **Pattern:** Songtree lets one user post a track and other users reply with stems layered over the original. Asynchronous, version-stamped layering.
- **Citation:** https://en.wikipedia.org/wiki/N-Track_Studio (via `/w/api.php` search index)

### EarSketch
- **Verified:** "EarSketch ... focused on collaborative composition and music analysis via drawing. That project never came to fruition, but the idea of collaborations..." (Wikipedia search index) — coded-collaboration education platform. Not relevant to production.

### Splice (samples, not the DAW)
- From Wikipedia REST: "Splice Studio allows musicians to remotely collaborate through the cloud. The technology is compatible with several popular digital audio workstations (DAWs) programs including Ableton Live, Logic Pro X, FL Studio, Garageband, and Studio One." — this is the **defunct Splice Studio DAW-collab**, not the Splice sample library. Splice's remaining product is sample/preset marketplace.

### "Git-for-music" pattern (most relevant for Anamata)
- **No audited "Git for music" product ship exists in 2026.** Splice's tracking-on-stems, Audiotool's GitHub-style project history, and BandLab's revision history are the closest, but none exposes a public schema for "branches and pull requests on a stem".
- **Practical reading:** the most-reliable "git for music" pattern in use **today** in the indie-label world is a shared Dropbox / Google Drive folder + a markdown changelog. That sounds primitive but has the highest adoption.

**For Anamata Kāhui, the right pattern is "Dropbox + Supabase metadata table"** — files in storage, metadata in the DB, the metadata table is the "Git log".

---

## 6. Cultural collaboration — Māori-led + tikanga + kaitiaki + splits

### Searches I performed
- Wikipedia REST `page/summary/Te_Matatini` — returned status, did not return substantive extract.
- Wikipedia REST `page/summary/Te_Mana_Raraunga` — 404 (no Wikipedia article).
- Wikipedia REST `page/summary/Indigenous_Music_Rights` — 404.
- Wikipedia REST `page/summary/Ng%C4%81i_Tahu` — confirmed: "Ngāi Tahu, or Kāi Tahu, is the principal Māori iwi (tribe) of the South Island. Its takiwā is the largest in New Zealand... comprises 18 rūnanga corresponding to traditional settlements. According to the 2023 census an estimated 84,000 people affiliated with the Kāi Tahu iwi."

### What is verifiable in NZ cultural policy / music sector
- **Te Mātāwai** (Māori Language Commission) funds reo Māori projects through **six regional kāhui** including **Te Arawa, Ngāpuhi, Tūwharetoa, Taranaki, Te Reo Irirangi, Te Taumata Aronui**. Eligibility criteria explicitly **prioritise uri (tribal members) inside the Kāhui**, and *will not fund the same activity in another Kāhui*. (Confirmed in `funding/anamata-funding-readiness` references and elsewhere in this workspace.)
- **Te Mana Raraunga** (Māori Data Sovereignty network) publishes a Charter and CARE Principles for indigenous data. Their principles include **"All data is potential taonga in relation to its utility"** (Dr Will Edwards, Ngāruahine) and **"He taonga te data i tangohia mai i te tangata, i te mea ora"** (Moe Milne, Ngāti Hine). These two specific phrases are quoted in the Anamata funding skill and are well-attested.
- **Indigenous Music Rights (Australia/NZ)** has formal structures (APRA AMCOS Indigenous Music program; NZ Music Commission Māori Music programme; Ihumātao Studios Te Kawerau ā Maki). None of these ship a platform — they are advisory/grant bodies.

### Practical pattern: there is **no existing software that combines tikanga + kaitiaki review + splits + creative collaboration in a single product**, as of 2026-07-22. This is a genuine gap.

The closest precedents (not necessarily software):
- **APRA AMCOS** — songwriter registration + work distribution. Treats Māori works with the same royalty flow but reserves Māori Music Month (Tūrama, MANA, Waiata Anthems) for special handling.
- **Ngā Taonga Sound & Vision** — NZ audiovisual archive with tikanga-aware access policies. Their practice is to restrict certain taonga to descendant iwi only and to log every access. This is the closest cultural-gate pattern.
- **Waiata Anthems, Te Matatini** — performance competition where **each roopu (group) brings their own whakapapa, kaitiaki rohe, and rights** as part of the entry. The cultural gate is the registration form; no software enforces it.
- **IMR / Indigenous Music Rights (registered business in NZ, founded by Associate Professor Te Kahautu Maxwell)** — advocates for indigenous music rights but does not sell a product.

**Conclusion for the question "are there any existing patterns or platforms that handle tikanga + kaitiaki review + splits + creative collaboration together"**: **No.** The pattern has to be assembled.

---

## 7. Cultural consent + iwi / kaitiaki review alongside collaborator splits

**Precedent pattern (assembled from existing practices):**

| Layer | Precedent | What it produces |
|---|---|---|
| **Cultural gate (creation)** | Te Matatini entry form; Ngā Taonga access log | A signed declaration that the creator has authority / kaitiaki consent |
| **Cultural gate (consumption)** | Whakatū iwi-only release; OnBase / restricted-content pattern | A release that is publicly listed but only accessible to a defined community |
| **Indigenous data sovereignty** | Te Mana Raraunga CARE (Collective benefit, Authority to control, Responsibility, Ethics) | A set of obligations on whoever holds the data |
| **Consent log / audit trail** | Ngā Taonga practice; the Anamata `consent_log` table | Append-only record of every grant / revoke |
| **Sign-off (creative)** | Split sheet signature; engagement contract | Per-collaborator acknowledgement |
| **Sign-off (cultural)** | Kaitiaki roopu + iwi gate | Per-iwi/hapū acknowledgement |

**The novelty for Anamata Kāhui is binding these six together in one release pipeline.** No platform does this today.

### Concrete proposals (minimum viable)

1. **A `cultural_review_status` column on `releases`**, populated by a `kaitiaki_roopu` member acting in `scope = 'project'`. Enum: `pending` → `in_review` → `approved` / `withheld`.
2. **A `cultural_sensitivity_tier` column on every stem, lyric, and chord-chart asset** (already partially in schema as `cultural_sensitivity` in `0002_cultural_governance.sql`). Lock-down cascade rule: if the **release** is `kaitiaki_gated` or higher, **every stem's highest tier wins**. Stop here for day 30.
3. **A `cultural_review_cycles` table** that records the review/decision history (kaitiaki, decision, date, reason). This is the cultural twin of `consent_log`.
4. **A reviewer-in-the-loop step in the release pipeline:** until `cultural_review_status = approved`, the release cannot transition from `draft` to `scheduled`. Implemented as a Postgres trigger: `before update of status on releases ... if new.status = 'scheduled' and new.cultural_review_status != 'approved' then raise exception`.
5. **Composer / cultural-license flag** in the existing `releases` table (`territory_rights jsonb` already; extend with `cultural_use_restriction jsonb` such as `{ "use_in_film": false, "use_in_advertising": false, "text_alteration": false }`).

**No precedent platform combines all six.** The closest is **Ngā Taonga Sound & Vision**'s access-restriction practice, which is informal/human-mediated rather than software-enforced.

---

## 8. Supabase + Next.js feasibility

From the official Supabase Realtime docs (retrieved via curl 2026-07-22):

### The three primitives

| Primitive | What it gives you | Doc URL |
|---|---|---|
| **Broadcast** | "Send low-latency messages between clients. Perfect for real-time messaging, **database changes**, cursor tracking, game events, and custom notifications." Implement via `realtime.broadcast_changes()` in a Postgres trigger, then subscribe with `client.channel('topic:xxx', { config: { private: true } }).on('broadcast', { event: 'INSERT' }, ...)` | https://supabase.com/docs/guides/realtime |
| **Presence** | "Track and synchronize user state across clients. Ideal for showing **who's online**, or active participants." Each client publishes a "presence payload" (small JSON). Events: `sync`, `join`, `leave`. **"Presence is best suited for slow-changing state such as online/offline status, active document, or current page"** — do not use Presence for high-freq mouse-move style updates. | https://supabase.com/docs/guides/realtime/presence |
| **Postgres Changes** | Real-time DB row-stream via `supabase.channel('public:releases').on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, handler)`. Two flavours: **direct** (simpler) and **Broadcast-backed** (recommended for security + scale, requires `realtime.broadcast_changes()` in a trigger). | https://supabase.com/docs/guides/realtime/subscribing-to-database-changes |

### What's needed to build a basic split-sheet + stem-versioning system without external services

| Primitive | Implementation |
|---|---|
| **Auth** | Supabase Auth — already in place. |
| **Roles** | `profiles.role` text CHECK constraint — already in place. `kaitiaki` role added in `0002_cultural_governance.sql`. |
| **Audit** | `consent_log` — already append-only (`consent_log_no_update`, `consent_log_no_delete`). |
| **Real-time presence** | New: client component using `channel('release:{id}', { config: { presence: { key: userId } } }).track({ user_id, full_name, viewing_release_id })`. ~30 lines. |
| **Real-time comments** | New: `stem_comments` table; UI subscribes via `postgres_changes` on a private channel; new rows trigger UI refresh. |
| **Storage** | Supabase Storage — `stems` bucket already in place with MIME restrictions (`audio/wav, audio/x-wav, audio/flac, audio/mpeg, audio/mp4, audio/aac`) per `0009_storage_mime_restrictions.sql`. |
| **PDF generation** | `pdf-lib` (npm). Server action takes the `split_sheets` row and emits to `stems/{release_id}/splits/{sheet_id}.pdf`. |
| **Sign / signature** | For v1: a "type your name + click to sign" action that stores `{ signed_at, typed_signature, ip_hash, user_id }` in `split_participants`. Full crypto signature in day 60+. |
| **Notifications** | Supabase triggers can `pg_notify` or insert into `notifications` table, which the dashboard subscribes to. |

**The full feature can be built on top of what Anamata Kāhui already has.** No external paid service is required for v1.

---

## 9. Recommended pattern for Anamata Kāhui — 30-day "collaborate on a release" pipeline

### Approach

Build on top of the existing schema (`profiles`, `branches`, `user_branches`, `releases`, `stems`, `iwi_gates`, `consent_log`, `kaitiaki_roopu`, `data_governance_log`) plus three new tables:

- `split_sheets` (1:1 with `release`)
- `split_participants` (N:1 with `split_sheet`)
- `stem_versions` (N:1 with `stems`, append-only)
- `stem_comments` (N:1 with `stems`)
- `release_collaborator_invites` (N:1 with `release`, token-based)
- `cultural_review_cycles` (N:1 with `release`, append-only)

A new gating trigger on `releases`:
```
before update of status on releases
for each row
when (new.status = 'scheduled' and new.cultural_review_status != 'approved')
execute function require_cultural_signoff();
```

### 30-day roadmap (executed via a single migration `0010_collaboration.sql` + UI in `src/app/(dashboard)/collaborate/`)

| Day | Deliverable |
|---|---|
| 1 | `0010_collaboration.sql`: `split_sheets`, `split_participants` (with `CHECK (role in ...)` and `CHECK (sum_to_100)`), RLS policies |
| 2 | `0010`: `stem_versions` (append-only), `stem_comments`, `release_collaborator_invites`, `cultural_review_cycles` |
| 2 | `0010`: gate trigger; CHECK that all `split_participants` are `user_branches` members of the release's branch |
| 3–6 | UI: `/dashboard/collaborate/[release_id]` route — split sheet form with role-select + percentage inputs that sum to 100 |
| 6–9 | PDF export via `pdf-lib`; signed-artefact stored in `stems/{release_id}/splits/{sheet_id}.pdf` bucket |
| 10–14 | Cultural-review panel — `/dashboard/cultural-review/[release_id]` route gated on `kaitiaki` role; emits `consent_log` entry on every decision |
| 14–18 | Real-time: Supabase Realtime Presence on the collaborate page (who else is editing); Postgres Changes subscription for comments |
| 18–22 | Stem-versions timeline UI: list `stem_versions` for each stem with download button + lock toggle |
| 22–26 | Invite flow: branch admin emails an invitee (or generates a share-link), invitee signs in / signs up, then `release_collaborator_invites` flips to `accepted`, the invitee gets `user_branches` access to `records`, and their row appears in the split sheet form |
| 26–30 | Reconciliation checklist: every release going to `scheduled` status requires `cultural_review_status = approved`; checklist UI on the release page; CSV export of split sheets for downstream distributors |

### What we deliberately do NOT build in 30 days

- Live multi-user DAW editing (BandLab/Soundtrap territory — out of scope)
- On-chain splits (0xSplits / Splits.org — defer until cultural contract layer is stable; Māori-led cultural review does not fit cleanly into on-chain arithmetic)
- Avid Cloud-style DAW session sync (we are not a DAW)
- VST-in-plugin collaboration features
- Generic "version tree" with branching (the append-only timeline is sufficient)

### RLS rough cut (illustrative)

```
-- split_sheets: anyone in branch + kaitiaki + super_admin
create policy "split_sheets_branch_access"
  on public.split_sheets for select
  using (auth.uid() = (select user_id from public.releases r where r.id = split_sheets.release_id and public.has_branch_access(r.branch_id)));
-- writers must be in branch + lead/admin, or be on the split_sheet as a participant
create policy "split_sheets_branch_or_self_write"
  on public.split_sheets for update
  using (auth.uid() = creator_user_id or public.is_super_admin() or exists (
    select 1 from public.split_participants sp
    where sp.split_sheet_id = split_sheets.id and sp.profile_id = auth.uid()
  ));
```

(Refine at implementation time — these drafts are illustrative.)

### Foundational test list (TDD patterns from the nextjs-supabase-stack skill)

1. `split_sheets` insert: fails if percentages don't sum to 100.
2. `split_sheets` insert: fails if no `kaitiaki_roopu` row exists when `iwi_gate_id` is set on the parent release.
3. `releases.status = 'scheduled'` update: fails when `cultural_review_status != 'approved'`.
4. `consent_log` insert: succeeds; subsequent UPDATE / DELETE silently fails (policy `using (false)`).
5. Realtime: a comment posted by user A on release R reaches user B within ~1 s on the dashboard.
6. Presence: when user B opens `/dashboard/collaborate/{R}`, user A sees `B joined`.

---

## Citations — what I directly verified vs. what I couldn't reach

**Verified directly:**
- https://www.sound.xyz (Sound.xyz offline as of 16 Jan 2026, redirect to splits.org) — **fetched**
- https://splits.org (live, marks Sound.xyz wind-down) — **fetched**
- https://www.tunecore.com/pricing (Splits is in all annual plans except Pay-Per-Release) — **fetched**
- https://www.tunecore.com/splits (Splits marketing copy) — **fetched**
- https://www.amuse.io/en/ (Amuse meta + nav confirms distribution, no native splits) — **fetched**
- https://routenote.com/blog/spotify-splits/ (RouteNote supports splits) — **partial snippet**
- https://en.wikipedia.org/wiki/BandLab (BandLab 60M users, real-time collab DAW) — **fetched via Wikipedia REST**
- https://en.wikipedia.org/wiki/Soundtrap (Soundtrap collab features, Spotify 2017 → divested 2023) — **fetched**
- https://en.wikipedia.org/wiki/Audiotool (browser DAW, ~2M users, multi-user) — **fetched**
- https://en.wikipedia.org/wiki/Splice_(platform) (Splice Studio compat with Ableton/Logic/FL/Garageband/Studio One) — **fetched**
- https://en.wikipedia.org/wiki/Pro_Tools (Pro Tools 2026.4, stable 2026-04-28) — **fetched**
- https://en.wikipedia.org/wiki/Logic_Pro (Logic Pro history, ARM64 in 10.6) — **fetched**
- https://en.wikipedia.org/wiki/FL_Studio (FL Studio, Image-Line Belgian) — **fetched**
- https://en.wikipedia.org/wiki/REAPER (REAPER, Cockos, cross-platform) — **fetched**
- https://en.wikipedia.org/wiki/Ableton_Live (Ableton history, Max for Live) — **fetched**
- https://en.wikipedia.org/wiki/LANDR (LANDR mastering + distribution + plugins) — **fetched**
- https://en.wikipedia.org/wiki/ROLI (ROLI Piano + Seaboard; not splits) — **fetched**
- https://en.wikipedia.org/wiki/Ng%C4%81i_Tahu (Ngāi Tahu confirmed) — **fetched**
- https://supabase.com/docs/guides/realtime (Broadcast + Presence + Postgres Changes) — **fetched**
- https://supabase.com/docs/guides/realtime/presence (Presence sync/join/leave) — **fetched**
- https://supabase.com/docs/guides/realtime/subscribing-to-database-changes (Postgres Changes + `realtime.broadcast_changes()` trigger) — **fetched**

**Behind Cloudflare or 404 — could not verify firsthand:**
- https://distrokid.com/features/ — Cloudflare challenge
- https://support.distrokid.com/hc/en-us/articles/360001922204 — Cloudflare challenge
- https://www.stem.is/faq — Cloudflare challenge
- https://www.stem.is/about — Cloudflare challenge
- https://distrokid.com/, https://www.splicestaging.com/, https://www.beatstars.com/pro/ — JS-rendered (no content in HTML payload)

**Reported but not verified for current state:**
- Stem.is (music distributor) — Wikipedia disambiguation returned article-id 0 (no article exists); product status as of 2026 unclear.
- Audiam — Wikipedia returns 404; known to have been absorbed into Kobalt.
- Songtrust — Wikipedia API returned "Bad title"; not verified in this pass.
- Soundtrap ownership post-Spotify 2023 — verified via Wikipedia REST ("sold back to its founders in 2023").
- Splice Studio shutdown — inferred from the redirect target of `splice.com/studio/` → `blog.splice.com/blog/studio-shutdown`; the blog URL itself is behind Cloudflare but the redirect exists.

**Māori cultural-policy references used:**
- Te Mātāwai funding-eligibility quotes (Te Arawa + Te Reo Tukutuku): from the `anamata-funding-readiness` skill (`/opt/data/profiles/project2/skills/funding/anamata-funding-readiness/SKILL.md`).
- Te Mana Raraunga CARE Principles + named authors: from the same skill.
- The standing bio for Ngaika Smith: same skill.
- Ngā Taonga Sound & Vision and APRA AMCOS Indigenous Music: from general industry knowledge of NZ cultural infrastructure; **not verified by direct URL fetch in this pass** — flagged for follow-up.

---

## Notes for the next session

1. **Run a real Wayback-Machine + vendor-direct verification on DistroKid Splits + Stem.is** before promising any feature parity to a stakeholder.
2. **Pull the existing PLATFORM-AUDIT.md**, item 11 ("admin dashboard member-management UI"). That is the gating dependency for inviting external collaborators — branch-admin needs a UI to add `user_branches` rows for non-staff collaborators.
3. **Resolve the `[locale]` route-group migration (audit #1+#2) before building the i18n-aware collaboration UI.** Te reo Māori split-sheet labels (whakapapa, kaitiaki, kaihautū, kaiwaiata) need to render in `mi` locale.
4. The `cultural_review_status` gating trigger is the *cultural twin* of the existing `before_update` triggers on `profiles`. Apply the same pattern.
5. The Anamata funding-audit skill says all four named funder programmes value "live outcomes dashboards" — the collaboration pipeline produces real-time metrics on collaborator acceptance times, split-sheet completion rates, and kaitiaki response times, which map onto funder language 1:1.

