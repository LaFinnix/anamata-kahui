/**
 * Contracts — type definitions and label maps.
 *
 * Mirrors public.contracts (migration 0033). The body field is the
 * frozen Markdown of the document the artist signed — not a live
 * reference to the .md library.
 *
 * State machine:
 *   draft     →  active  →  expired | terminated
 *              active  →  renewed  (creates a new contract with parent_contract_id)
 *
 * The `body` field is the FROZEN content. A future edit to the .md
 * library does NOT change what the artist originally agreed to.
 */

export const CONTRACT_TYPES = [
  "label_deal",
  "distribution",
  "publishing",
  "co_venture",
  "recording",
  "tour",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  label_deal:     "Label deal",
  distribution:   "Distribution",
  publishing:     "Publishing",
  co_venture:     "Co-venture",
  recording:      "Recording",
  tour:           "Tour",
};

export const CONTRACT_STATUSES = [
  "draft",
  "active",
  "expired",
  "terminated",
  "renewed",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft:      "Draft",
  active:     "Active",
  expired:    "Expired",
  terminated: "Terminated",
  renewed:    "Renewed",
};

/** Allowed status transitions. */
export const CONTRACT_STATUS_TRANSITIONS: Record<
  ContractStatus,
  readonly ContractStatus[]
> = {
  draft:      ["active", "terminated"],
  active:     ["expired", "terminated", "renewed"],
  expired:    [], // terminal — create a new contract instead
  terminated: [], // terminal — record the reason, then move on
  renewed:    [], // terminal — superseded by a new contract
};

export function canContractTransition(
  from: ContractStatus,
  to: ContractStatus,
): boolean {
  if (from === to) return true;
  return CONTRACT_STATUS_TRANSITIONS[from].includes(to);
}

/** DB row shape (matches public.contracts exactly). */
export interface ContractRow {
  id: string;
  artist_roster_id: string;
  document_type: string;
  document_version: string;
  title: string;
  body: string;
  contract_type: ContractType;
  status: ContractStatus;
  term_start: string | null;
  term_end: string | null;
  territory: string | null;
  exclusivity_scope: string | null;
  royalty_split: Record<string, unknown>;
  parent_contract_id: string | null;
  created_by: string | null;
  created_at: string;
  last_modified_by: string | null;
  last_modified_at: string;
  signed_at: string | null;
  signed_by_artist: string | null;
  signed_ip_hash: string | null;
  terminated_at: string | null;
  terminated_reason: string | null;
  notes: string | null;
}

/** Contract row joined with the roster + profile for display. */
export interface ContractWithRoster extends ContractRow {
  roster: {
    id: string;
    profile_id: string;
    branch_id: string;
    status: import("@/lib/artist-roster/types").RosterStatus;
    branch: {
      id: string;
      slug: "records" | "research" | "arts" | "dev";
      name: string;
    };
    profile: {
      id: string;
      full_name: string | null;
    };
  };
}
