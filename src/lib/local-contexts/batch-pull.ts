/**
 * Batch pull — find existing Hub Projects by Anamata identifier.
 *
 * Use cases:
 *   1. Artist has a Hub Project created before Anamata integration
 *   2. Researcher wants to attach an existing publication to a paper
 *   3. Kaitiaki wants to bulk-attach cultural labels to multiple
 *      waiata at once
 *
 * The Hub supports searching via `providers_id` (provider_name + provider
 * unique_id) and `doi`. Anamata's "provider" name is fixed.
 */

import { searchHubProjectsByProvider } from "./hub-client";

export interface HubSearchResult {
  unique_id: string;
  title: string;
  project_page: string;
  date_created: string | null;
  doi: string | null;
  label_count: number;
}

/**
 * Search Hub for projects matching Anamata identifiers.
 *
 * @param identifierType 'doi' | 'provider_id'
 * @param value The DOI string, or the Anamata release/paper id
 * @param providerName Optional override for the provider name (default "anamata")
 */
export async function findHubProjects(
  identifierType: "doi" | "provider_id",
  value: string,
  providerName: string = "anamata",
): Promise<HubSearchResult[]> {
  if (!value || value.trim().length === 0) return [];

  try {
    if (identifierType === "doi") {
      // The Hub has a `doi` query parameter — direct DOI lookup
      const project = await searchByDoi(value.trim());
      return project ? [project] : [];
    }
    // Provider id lookup
    const project = await searchHubProjectsByProvider(
      providerName,
      value.trim(),
    );
    return project ? [mapHubProject(project)] : [];
  } catch (e) {
    console.warn("Hub search failed:", e);
    return [];
  }
}

/**
 * Search by DOI — separate because the Hub's API uses a different
 * query parameter for DOI lookups (publication_doi).
 */
async function searchByDoi(doi: string): Promise<HubSearchResult | null> {
  // Direct hub API call (using the public REST endpoint)
  const baseUrl =
    process.env.LOCAL_CONTEXTS_HUB_BASE_URL ?? "https://localcontextshub.org/api/v2";
  const key = process.env.LOCAL_CONTEXTS_API_KEY;
  if (!key) return null;

  const url = new URL(`${baseUrl}/projects/`);
  url.searchParams.set("publication_doi", doi);

  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        unique_id: string;
        title: string;
        project_page: string;
        date_created: string | null;
        publication_doi: string | null;
        tk_labels?: unknown[];
        bc_labels?: unknown[];
        notice?: unknown[];
      }>;
    };
    const first = data.results?.[0];
    if (!first) return null;
    return {
      unique_id: first.unique_id,
      title: first.title,
      project_page: first.project_page,
      date_created: first.date_created,
      doi: first.publication_doi,
      label_count:
        (first.tk_labels?.length ?? 0) +
        (first.bc_labels?.length ?? 0) +
        (first.notice?.length ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Bulk reconcile — given a list of Anamata asset ids, attempt to find
 * a matching Hub Project for each and return reconciliation suggestions.
 *
 * Returns a list of { anamata_id, found: HubSearchResult | null } tuples
 * for the admin dashboard to render "attach?" prompts.
 */
export async function bulkReconcile(
  assetIds: { kind: "release" | "research_document"; id: string }[],
  adminClient: {
    from: (table: string) => {
      select: (cols: string) => {
        in: (col: string, vals: string[]) => Promise<{ data: any[] | null }>;
      };
    };
  },
): Promise<
  {
    asset_kind: "release" | "research_document";
    asset_id: string;
    asset_title: string;
    found: HubSearchResult | null;
  }[]
> {
  if (assetIds.length === 0) return [];

  // Fetch asset titles
  const releaseIds = assetIds.filter((a) => a.kind === "release").map((a) => a.id);
  const docIds = assetIds.filter((a) => a.kind === "research_document").map((a) => a.id);

  const [releaseData, docData] = await Promise.all([
    releaseIds.length
      ? adminClient.from("releases").select("id, title").in("id", releaseIds)
      : Promise.resolve({ data: [] }),
    docIds.length
      ? adminClient.from("research_documents").select("id, title").in("id", docIds)
      : Promise.resolve({ data: [] }),
  ]);

  const titleByKindId = new Map<string, { title: string; kind: "release" | "research_document" }>();
  for (const r of releaseData.data ?? []) {
    titleByKindId.set(`release:${r.id}`, { title: r.title, kind: "release" });
  }
  for (const d of docData.data ?? []) {
    titleByKindId.set(`research_document:${d.id}`, { title: d.title, kind: "research_document" });
  }

  // For each asset, try to find a matching Hub project
  const out: {
    asset_kind: "release" | "research_document";
    asset_id: string;
    asset_title: string;
    found: HubSearchResult | null;
  }[] = [];

  for (const a of assetIds) {
    const meta = titleByKindId.get(`${a.kind}:${a.id}`);
    const found = await findHubProjects("provider_id", a.id);
    out.push({
      asset_kind: a.kind,
      asset_id: a.id,
      asset_title: meta?.title ?? "(unknown)",
      found: found[0] ?? null,
    });
  }

  return out;
}

function mapHubProject(p: {
  unique_id: string;
  title: string;
  project_page: string;
  date_created: string | null;
  publication_doi: string | null;
  tk_labels?: unknown[];
  bc_labels?: unknown[];
  notice?: unknown[];
}): HubSearchResult {
  return {
    unique_id: p.unique_id,
    title: p.title,
    project_page: p.project_page,
    date_created: p.date_created,
    doi: p.publication_doi,
    label_count:
      (p.tk_labels?.length ?? 0) +
      (p.bc_labels?.length ?? 0) +
      (p.notice?.length ?? 0),
  };
}
