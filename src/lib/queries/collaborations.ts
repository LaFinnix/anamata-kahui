/**
 * Public collaborations index — read-only queries for the
 * `/[locale]/collaborations` page.
 *
 * Cultural-integrity rules (see COLLABORATION-MARKETPLACE-PLAN.md §4.3,
 * §4.9, §5.1, §13.1):
 *
 *   - Only show resolved tono (fulfilled, closed, withdrawn). Open and
 *     in_conversation stay dashboard-private.
 *   - Only show tono with visibility='open'. iwi_specific and invited
 *     tono are surfaced only on the relevant profiles, not in the index.
 *   - Endorsements are public by design (append-only lineage). Show
 *     active AND revoked (with status badge — never hide revocation).
 *   - No aggregate counts on individuals; specificity over aggregation.
 *   - No sorting by activity / ranking / freshness gradient — strict
 *     chronological, most recent first.
 *
 * Data sources:
 *   - endorsements (endorser, recipient, type, scope, notes)
 *   - tono (creator, status, scope, help_type, knowledge_domain)
 *   - profiles (full_name, role, iwi_attested)
 *   - releases (for the work anchor when endorsement is work-anchored)
 */

import { createAdminClient } from "@/lib/supabase/clients";
import {
  DOMAIN_LABEL,
  type KnowledgeDomain,
} from "@/lib/kaikorero/types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type CollaborationEntryKind = "endorsement" | "tono";

export interface EndorsementEntry {
  kind: "endorsement";
  /** Stable key for React rendering: "endorsement:<id>" */
  key: string;
  created_at: string;
  /** Was this revoked? Visible per the append-only-with-revocation model. */
  status: "active" | "revoked";
  revocation_reason: string | null;
  endorsement_type: string;
  knowledge_domain: KnowledgeDomain | null;
  scope_iwi: string | null;
  scope_region: string | null;
  notes: string | null;
  endorser: {
    id: string;
    full_name: string | null;
    iwi_affiliation_attested: string[] | null;
  } | null;
  recipient: {
    id: string;
    full_name: string | null;
    iwi_affiliation_attested: string[] | null;
  } | null;
  work: {
    id: string;
    title: string;
    slug: string | null;
  } | null;
}

export interface TonoEntry {
  kind: "tono";
  /** Stable key for React rendering: "tono:<id>" */
  key: string;
  created_at: string;
  /** Public-safe tono status (fulfilled/closed/withdrawn only) */
  status: "fulfilled" | "closed" | "withdrawn";
  help_type: string;
  knowledge_domain: KnowledgeDomain | null;
  scope_iwi: string | null;
  scope_region: string | null;
  /** Public-safe summary; proposal notes / decline reasons are NOT exposed. */
  request_body: string;
  closed_at: string | null;
  creator: {
    id: string;
    full_name: string | null;
    iwi_affiliation_attested: string[] | null;
  } | null;
  /** Fulfiller (only set for fulfilled tono with an accepted proposal). */
  fulfiller: {
    id: string;
    full_name: string | null;
    iwi_affiliation_attested: string[] | null;
  } | null;
}

export type CollaborationEntry = EndorsementEntry | TonoEntry;

/** Filter set used by the page. */
export interface CollaborationFilters {
  /** Show endorsements, tono, or both. Default 'all'. */
  kind?: "endorsement" | "tono" | "all";
  /** Knowledge domain filter — applies to both kinds. */
  knowledgeDomain?: KnowledgeDomain | null;
  /** Iwi filter — checks attested set on either party. */
  iwi?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Main query                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Load recent public-safe collaboration activity for the index page.
 *
 * Strategy: run two parallel queries (endorsements + resolved tono),
 * normalise into the unified CollaborationEntry shape, merge + sort by
 * created_at desc, apply client-side filters (small N expected in v1).
 *
 * Pagination: server caps at `limit` (default 100). v1 has ≤100 active
 * creators; if the index grows, switch to keyset pagination.
 */
export async function listPublicCollaborationActivity(
  filters: CollaborationFilters = {},
  limit = 100,
): Promise<CollaborationEntry[]> {
  const admin = createAdminClient();
  const showEndorsements =
    !filters.kind || filters.kind === "all" || filters.kind === "endorsement";
  const showTono =
    !filters.kind || filters.kind === "all" || filters.kind === "tono";

  const [endorsementsResult, tonoResult] = await Promise.all([
    showEndorsements
      ? admin
          .from("endorsements")
          .select(
            `id, status, endorsement_type, knowledge_domain, scope_iwi, scope_region, notes,
             created_at, revoked_at, revoked_reason,
             endorser:endorser_id ( id, full_name, iwi_affiliation_attested ),
             recipient:recipient_id ( id, full_name, iwi_affiliation_attested ),
             work:work_id ( id, title, slug )`,
          )
          .in("status", ["active", "revoked"])
          .order("created_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: null, error: null }),
    showTono
      ? admin
          .from("tono")
          .select(
            `id, status, help_type, knowledge_domain, scope_iwi, scope_region,
             request_body, created_at, closed_at, fulfilled_by, fulfilled_at,
             creator:creator_id ( id, full_name, iwi_affiliation_attested ),
             fulfiller:fulfilled_by ( id, full_name, iwi_affiliation_attested )`,
          )
          .eq("visibility", "open")
          .in("status", ["fulfilled", "closed", "withdrawn"])
          .order("created_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const endorsements = (endorsementsResult.data ?? []).map((row): EndorsementEntry => {
    // Supabase foreign-key joins return arrays; normalize to single-object or null.
    const r = row as {
      id: string;
      status: "active" | "revoked";
      endorsement_type: string;
      knowledge_domain: KnowledgeDomain | null;
      scope_iwi: string | null;
      scope_region: string | null;
      notes: string | null;
      created_at: string;
      revoked_reason: string | null;
      endorser: { id: string; full_name: string | null; iwi_affiliation_attested: string[] | null }[] | null;
      recipient: { id: string; full_name: string | null; iwi_affiliation_attested: string[] | null }[] | null;
      work: { id: string; title: string; slug: string | null }[] | null;
    };
    return {
      kind: "endorsement",
      key: `endorsement:${r.id}`,
      created_at: r.created_at,
      status: r.status,
      revocation_reason: r.revoked_reason,
      endorsement_type: r.endorsement_type,
      knowledge_domain: r.knowledge_domain,
      scope_iwi: r.scope_iwi,
      scope_region: r.scope_region,
      notes: r.notes,
      endorser: r.endorser?.[0] ?? null,
      recipient: r.recipient?.[0] ?? null,
      work: r.work?.[0] ?? null,
    };
  });

  const tonos = (tonoResult.data ?? []).map((row): TonoEntry => {
    const r = row as {
      id: string;
      status: "fulfilled" | "closed" | "withdrawn";
      help_type: string;
      knowledge_domain: KnowledgeDomain | null;
      scope_iwi: string | null;
      scope_region: string | null;
      request_body: string;
      created_at: string;
      closed_at: string | null;
      creator: { id: string; full_name: string | null; iwi_affiliation_attested: string[] | null }[] | null;
      fulfiller: { id: string; full_name: string | null; iwi_affiliation_attested: string[] | null }[] | null;
    };
    return {
      kind: "tono",
      key: `tono:${r.id}`,
      created_at: r.created_at,
      status: r.status,
      help_type: r.help_type,
      knowledge_domain: r.knowledge_domain,
      scope_iwi: r.scope_iwi,
      scope_region: r.scope_region,
      request_body: r.request_body,
      closed_at: r.closed_at,
      creator: r.creator?.[0] ?? null,
      fulfiller: r.fulfiller?.[0] ?? null,
    };
  });

  // Apply iwi filter (matches either party for endorsements, creator/fulfiller for tono)
  const iwiLower = filters.iwi?.toLowerCase().trim() || null;
  const iwiFiltered = (entries: CollaborationEntry[]): CollaborationEntry[] => {
    if (!iwiLower) return entries;
    return entries.filter((e) => {
      if (e.kind === "endorsement") {
        return (
          e.endorser?.iwi_affiliation_attested?.some(
            (i) => i.toLowerCase() === iwiLower,
          ) ||
          e.recipient?.iwi_affiliation_attested?.some(
            (i) => i.toLowerCase() === iwiLower,
          )
        );
      }
      // tono
      return (
        e.creator?.iwi_affiliation_attested?.some(
          (i) => i.toLowerCase() === iwiLower,
        ) ||
        e.fulfiller?.iwi_affiliation_attested?.some(
          (i) => i.toLowerCase() === iwiLower,
        )
      );
    });
  };

  const merged = [
    ...iwiFiltered(endorsements),
    ...iwiFiltered(tonos),
  ].sort((a, b) => (a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0));

  // Knowledge-domain filter applies to both kinds
  if (filters.knowledgeDomain) {
    return merged.filter((e) => e.knowledge_domain === filters.knowledgeDomain);
  }

  return merged.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Aggregate stats — for the page summary line                                */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight stats for the page header. Each is a count, NOT attached
 * to any individual — so this doesn't violate the "no aggregate counts
 * on profiles" rule (which is about per-person aggregation, not
 * community-wide activity).
 */
export interface CollaborationStats {
  totalEndorsements: number;
  totalResolvedTono: number;
}

export async function getCollaborationStats(): Promise<CollaborationStats> {
  const admin = createAdminClient();
  const [endorsementsResult, tonoResult] = await Promise.all([
    admin
      .from("endorsements")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "revoked"]),
    admin
      .from("tono")
      .select("id", { count: "exact", head: true })
      .eq("visibility", "open")
      .in("status", ["fulfilled", "closed", "withdrawn"]),
  ]);

  return {
    totalEndorsements: endorsementsResult.count ?? 0,
    totalResolvedTono: tonoResult.count ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Translate an endorsement type to a human-readable label (English fallback
 *  since this is a public page; could be made bilingual later). */
export function endorsementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    source_of_knowledge: "Source of knowledge",
    cultural_endorsement: "Cultural endorsement",
    co_creator: "Co-creator",
    verification: "Verification",
    translation: "Translation",
    blessing: "Blessing",
    mentorship: "Mentorship",
  };
  return labels[type] ?? type;
}

export function helpTypeLabel(helpType: string): string {
  const labels: Record<string, string> = {
    verify_narrative: "Verify narrative",
    verify_reo: "Verify te reo",
    co_create: "Co-create",
    review_cultural: "Cultural review",
    translate: "Translate",
    compose: "Compose / arrange",
    produce: "Produce",
    mentor: "Mentorship",
    feedback: "Creative feedback",
    place_name: "Place-name verification",
    other: "Other",
  };
  return labels[helpType] ?? helpType;
}

export function domainLabel(domain: KnowledgeDomain | null): string {
  if (!domain) return "";
  return DOMAIN_LABEL[domain] ?? domain;
}
