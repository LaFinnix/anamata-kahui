/**
 * Legal policies — types and label maps.
 *
 * Two tables back this module:
 *   legal_policies                  — the policy doc, versioned
 *   legal_policy_acknowledgements   — per-artist per-version ack
 *
 * Ack lifecycle:
 *   - A row is created when the artist clicks "I have read and agree"
 *   - It can be withdrawn (CARE principle). The original row stays;
 *     only withdrawn_at + withdrawn_reason are set.
 *   - The artist can re-acknowledge (a new row).
 *
 * Policy versions:
 *   - is_current flips when a new version is published (via
 *     legal_policies_set_current()).
 *   - Old acks against the previous version stay valid; the artist
 *     needs to re-ack the new version if they want to be covered.
 */

export const POLICY_TYPES = [
  "code_of_conduct",
  "privacy_consent",
  "data_rights",
  "cultural_safety",
  "other",
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_TYPE_LABEL: Record<PolicyType, string> = {
  code_of_conduct:  "Code of Conduct",
  privacy_consent:  "Privacy Consent",
  data_rights:      "Data Rights",
  cultural_safety:  "Cultural Safety Charter",
  other:            "Other",
};

/** Whether an acknowledgement is currently active (not withdrawn). */
export function isAckActive(
  ack: Pick<LegalPolicyAckRow, "withdrawn_at">,
): boolean {
  // null AND undefined both mean "not withdrawn". This is defensive:
  // callers may pass partial row shapes where the field is absent.
  return ack.withdrawn_at == null;
}

/** DB row shapes. */
export interface LegalPolicyRow {
  id: string;
  policy_type: PolicyType;
  version: string;
  title: string;
  body: string;
  effective_at: string;
  is_current: boolean;
  required_for_all: boolean;
  created_by: string | null;
  created_at: string;
}

export interface LegalPolicyAckRow {
  id: string;
  policy_id: string;
  artist_roster_id: string;
  acknowledged_at: string;
  ip_hash: string | null;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
  notes: string | null;
}

/** Acknowledgement with joined policy info. */
export interface LegalPolicyAckWithPolicy extends LegalPolicyAckRow {
  policy: LegalPolicyRow;
}
