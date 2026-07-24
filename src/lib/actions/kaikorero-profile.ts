"use server";

/**
 * Kaikōrero profile — server actions for the discovery layer.
 *
 * Lets an authed creator edit the cultural-knowledge and iwi-affiliation
 * metadata that powers the public Kaikōrero directory. All fields are
 * opt-in: nothing is exposed publicly unless the creator sets
 * `kaikorero_visible = true` AND `opted_in_public_directory = true`.
 *
 * Two flows:
 *   1. updateKaikoreroProfileAction — full profile update (bio, opt-in,
 *      availability, knowledge areas with iwi/region scope, iwi affiliation
 *      claim). Knowledge areas are passed as a JSON string in form data
 *      because the array-of-objects shape needs structured input.
 *   2. setKaikoereroVisibilityAction — small toggle-only action for the
 *      public-private switch.
 *
 * Auth: actions require auth.uid(); the database row guards further via
 * RLS (write_self policies on profiles + profile_knowledge_areas).
 *
 * Pattern follows src/lib/actions/cultural-review.ts:
 * discriminated union returned, not redirect; errors surfaced inline.
 *
 * NOTE: This file uses "use server", which only allows async exports.
 * Constants and types live in src/lib/kaikorero/types.ts (non-server).
 */

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import {
  KNOWLEDGE_DOMAINS,
  type KnowledgeAreaInput,
  type KnowledgeDomain,
  type KaikoreroProfileState,
} from "@/lib/kaikorero/types";

/* -------------------------------------------------------------------------- */
/* Helpers (private)                                                           */
/* -------------------------------------------------------------------------- */

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Authentication required." as const };
  return { supabase, user, error: null };
}

/**
 * Parse the knowledge_areas form-data field. The form posts a JSON string
 * (because the structure is array-of-objects). Returns null on parse error
 * so the action can surface a clear message.
 */
function parseKnowledgeAreas(raw: FormDataEntryValue | null): KnowledgeAreaInput[] | null {
  if (raw === null) return [];
  if (typeof raw !== "string") return null;
  if (raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: KnowledgeAreaInput[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const domain = (item as Record<string, unknown>).domain;
      if (typeof domain !== "string") return null;
      if (!KNOWLEDGE_DOMAINS.includes(domain as KnowledgeDomain)) return null;
      const scope_iwi = (item as Record<string, unknown>).scope_iwi;
      const scope_region = (item as Record<string, unknown>).scope_region;
      out.push({
        domain: domain as KnowledgeDomain,
        scope_iwi: typeof scope_iwi === "string" && scope_iwi.trim() ? scope_iwi.trim() : undefined,
        scope_region: typeof scope_region === "string" && scope_region.trim() ? scope_region.trim() : undefined,
      });
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Parse a comma- or newline-separated iwi affiliation list. The dashboard
 * form uses comma-separated for compactness. Empty strings are dropped.
 */
function parseIwiList(raw: FormDataEntryValue | null): string[] {
  if (raw === null || typeof raw !== "string") return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Main action — full profile update                                           */
/* -------------------------------------------------------------------------- */

export async function updateKaikoreroProfileAction(
  _prev: KaikoreroProfileState | null,
  formData: FormData,
): Promise<KaikoreroProfileState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  // ----- Validate inputs -----
  const bio = String(formData.get("kaikorero_bio") ?? "").trim();
  const kaikoreroVisible = formData.get("kaikorero_visible") === "on" || formData.get("kaikorero_visible") === "true";
  const availableForTono = formData.get("available_for_tono") === "on" || formData.get("available_for_tono") === "true";
  const iwiClaimed = parseIwiList(formData.get("iwi_affiliation_claimed"));

  if (bio.length > 2000) {
    return { error: "Bio must be 2000 characters or fewer." };
  }

  const knowledgeAreas = parseKnowledgeAreas(formData.get("knowledge_areas"));
  if (knowledgeAreas === null) {
    return { error: "Knowledge areas payload could not be parsed. Please try again." };
  }

  // ----- Update profiles row -----
  // RLS: profiles_update_self (write on own profile). All columns allowed.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      kaikorero_bio: bio || null,
      kaikorero_visible: kaikoreroVisible,
      available_for_tono: availableForTono,
      iwi_affiliation_claimed: iwiClaimed,
    })
    .eq("id", user.id);

  if (profileErr) {
    return { error: `Could not save profile: ${profileErr.message}` };
  }

  // ----- Replace knowledge areas for this profile -----
  // We do a delete-all + insert-all because the form treats the set as one
  // unit. If the user previously had endorsements against an area that's
  // now removed, those endorsements stay (they're scoped to the recipient,
  // not the knowledge area row) — the area row was just the user's
  // *declaration* of carrying that knowledge.
  //
  // RLS: profile_knowledge_areas_write_self (own profile only).
  const { error: delErr } = await supabase
    .from("profile_knowledge_areas")
    .delete()
    .eq("profile_id", user.id);

  if (delErr) {
    return { error: `Could not clear existing knowledge areas: ${delErr.message}` };
  }

  if (knowledgeAreas.length > 0) {
    const rows = knowledgeAreas.map((ka) => ({
      profile_id: user.id,
      domain: ka.domain,
      scope_iwi: ka.scope_iwi ?? null,
      scope_region: ka.scope_region ?? null,
    }));
    const { error: insertErr } = await supabase
      .from("profile_knowledge_areas")
      .insert(rows);

    if (insertErr) {
      return { error: `Could not save knowledge areas: ${insertErr.message}` };
    }
  }

  // ----- Revalidate affected surfaces -----
  revalidatePath("/kaikorero/profile");
  revalidatePath("/[locale]/artist", "page");
  revalidatePath(`/[locale]/artist/${user.id}`, "page");

  return {
    success: kaikoreroVisible
      ? "Profile saved. You are listed in the public Kaikōrero directory."
      : "Profile saved. Hidden from the public directory.",
    saved: {
      bioLength: bio.length,
      kaikoreroVisible,
      availableForTono: availableForTono,
      knowledgeAreaCount: knowledgeAreas.length,
      iwiClaimed,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Toggle-only action — quick public/private switch                           */
/* -------------------------------------------------------------------------- */

export async function setKaikoereroVisibilityAction(
  _prev: KaikoreroProfileState | null,
  formData: FormData,
): Promise<KaikoreroProfileState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const visible = formData.get("kaikorero_visible") === "on" || formData.get("kaikorero_visible") === "true";

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ kaikorero_visible: visible })
    .eq("id", user.id);

  if (updateErr) {
    return { error: `Could not update visibility: ${updateErr.message}` };
  }

  revalidatePath("/kaikorero/profile");
  revalidatePath(`/[locale]/artist/${user.id}`, "page");
  revalidatePath("/[locale]/artist", "page");

  return {
    success: visible
      ? "Profile is now public."
      : "Profile is now private.",
    saved: {
      bioLength: 0,
      kaikoreroVisible: visible,
      availableForTono: true,
      knowledgeAreaCount: 0,
      iwiClaimed: [],
    },
  };
}
