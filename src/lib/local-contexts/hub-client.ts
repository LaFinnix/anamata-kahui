/**
 * Local Contexts Hub API client (v2).
 *
 * Implements the read-only REST surface documented at
 * https://localcontextshub.org/api/v2/. Verified against the OpenAPI v2
 * schema on 2026-07-22.
 *
 * Auth: X-Api-Key header. Self-serve from Hub account settings
 * (https://localcontextshub.org). Integration Partner status unlocks
 * cross-account project visibility.
 *
 * The Hub returns ready-to-render assets per label:
 *   - img_url (PNG icon), svg_url (SVG icon), audiofile (community narration)
 *   - label_page (public Hub URL), label_text (community-customized)
 *   - translations[] (multi-language)
 *
 * Anamata Kāhui fetches per asset, caches in `lc_labels_cache`, and
 * renders the icon + label text + canonical URL.
 */

const HUB_LIVE = "https://localcontextshub.org/api/v2";
const HUB_SANDBOX = "https://sandbox.localcontextshub.org/api/v2";

function hubBaseUrl(): string {
  if (process.env.LOCAL_CONTEXTS_HUB_BASE_URL) return process.env.LOCAL_CONTEXTS_HUB_BASE_URL;
  if (process.env.LOCAL_CONTEXTS_USE_SANDBOX === "true") return HUB_SANDBOX;
  return HUB_LIVE;
}

function apiKey(): string | undefined {
  return process.env.LOCAL_CONTEXTS_API_KEY;
}

// ---------------------------------------------------------------------------
// Types — match the Hub's JSON shape
// ---------------------------------------------------------------------------

export interface HubTranslation {
  language_tag: string;
  language: string;
  translated_text: string;
  translated_name: string;
}

export interface HubLabel {
  /** The Hub-canonical slug (e.g. "attribution", "bc_provenance") */
  id: string;
  /** Display name (e.g. "TK Attribution") */
  name: string;
  /** Full description */
  description: string;
  /** PNG icon URL (Hub-hosted) */
  img_url: string | null;
  /** SVG icon URL */
  svg_url: string | null;
  /** Optional audio narration */
  audiofile: string | null;
  /** Public Hub page for this label */
  label_page: string;
  /** Customized text by community (may be empty) */
  label_text: string;
  /** Translations */
  translations: HubTranslation[];
  /** Provider info */
  providers: { provider_name: string }[];
}

export interface HubProject {
  unique_id: string;
  /** Title (may be empty until labels applied) */
  title: string;
  /** Project page URL */
  project_page: string;
  /** Date created */
  date_created: string | null;
  /** Date last modified — use this for cache invalidation */
  date_modified: string | null;
  /** DOI if linked */
  publication_doi: string | null;
  /** Provider project ids (in our case the Anamata release or paper id) */
  providers: { provider_name: string; unique_id: string }[];
  /** Geographic context */
  geojson: unknown | null;
  /** Sub-projects (rare) */
  sub_projects: string[];
  /** Related projects */
  related_projects: string[];
  /** Labels and notices attached */
  tk_labels: HubLabel[];
  bc_labels: HubLabel[];
  notice: HubLabel[];
  contributors: HubContributor[];
}

export interface HubContributor {
  kind: string;
  name: string;
  email?: string;
  institution?: string;
  orcid?: string;
}

export interface HubProjectList {
  count: number;
  next: string | null;
  previous: string | null;
  results: HubProject[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HubError extends Error {
  constructor(
    public statusCode: number,
    public body: string,
    message?: string,
  ) {
    super(message ?? `Local Contexts Hub ${statusCode}: ${body.slice(0, 200)}`);
    this.name = "HubError";
  }
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function hubFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new HubError(401, "", "LOCAL_CONTEXTS_API_KEY not set");
  }

  const url = new URL(`${hubBaseUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }

  const t0 = Date.now();
  const res = await fetch(url.toString(), {
    headers: {
      "X-Api-Key": key,
      Accept: "application/json",
    },
    next: { revalidate: 300 }, // 5-min cache at the framework level
  });
  const duration = Date.now() - t0;

  if (!res.ok) {
    const body = await res.text();
    throw new HubError(res.status, body);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API — typed wrappers
// ---------------------------------------------------------------------------

/**
 * Fetch a single project by Hub UUID.
 *
 * Used during cache refresh on /releases/[id] and /research/papers/[id].
 */
export async function fetchHubProject(uniqueId: string): Promise<HubProject | null> {
  try {
    return await hubFetch<HubProject>(`/projects/${uniqueId}/`);
  } catch (e) {
    if (e instanceof HubError && e.statusCode === 404) return null;
    throw e;
  }
}

/**
 * Lightweight polling endpoint — returns the date_modified for each
 * project_id so we can decide whether to re-fetch.
 */
export async function fetchHubProjectsModified(
  uniqueIds: string[],
): Promise<Record<string, string | null>> {
  if (uniqueIds.length === 0) return {};
  try {
    // Hub accepts comma-separated unique_ids in the path
    const result = await hubFetch<{ results?: Array<{ unique_id: string; date_modified: string | null }> }>(
      `/projects/multi/date_modified/${uniqueIds.join(",")}/`,
    );
    const out: Record<string, string | null> = {};
    for (const r of result.results ?? []) {
      out[r.unique_id] = r.date_modified;
    }
    return out;
  } catch {
    // Fall back to "no info" if endpoint fails
    const out: Record<string, string | null> = {};
    for (const id of uniqueIds) out[id] = null;
    return out;
  }
}

/**
 * Search for Hub projects by Anamata provider id. Useful for finding
 * existing Hub projects linked to a release id.
 */
export async function searchHubProjectsByProvider(
  providerName: string,
  providerUniqueId: string,
): Promise<HubProject | null> {
  try {
    const result = await hubFetch<HubProjectList>("/projects/", {
      providers_id: `${providerName}:${providerUniqueId}`,
      public_only: "false", // include ours even if not yet public
    });
    return result.results[0] ?? null;
  } catch (e) {
    if (e instanceof HubError && e.statusCode === 404) return null;
    throw e;
  }
}

/**
 * Fetch the Open to Collaborate notice details (a community / researcher
 * notice that ties to an institution). Read-only — institution fills in
 * the placeholder "our institution" via Hub UI.
 */
export async function fetchOpenToCollaborateNotice(): Promise<HubLabel[]> {
  try {
    return await hubFetch<HubLabel[]>("/notices/open_to_collaborate/");
  } catch {
    return [];
  }
}

/**
 * Health check — does the API key work?
 *
 * Returns true if we got a non-error response, false if we don't.
 * Used by the admin dashboard to surface API-key configuration issues.
 */
export async function pingHub(): Promise<boolean> {
  try {
    await hubFetch<unknown>("/");
    return true;
  } catch {
    return false;
  }
}
