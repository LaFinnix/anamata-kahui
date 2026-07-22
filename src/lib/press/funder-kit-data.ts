/**
 * Funder / Press Kit data source.
 *
 * Aggregates data from across the platform into a single object that
 * both the HTML /press landing page and the PDF generator render.
 *
 * All data is live (no fabrication) — counts come from Supabase tables
 * via the admin client (read-only operations).
 *
 * Cached for 5 minutes via Next's `revalidate` on the consumer.
 */

import { createAdminClient } from "@/lib/supabase/clients";

export interface FunderKitData {
  generated_at: string;
  brand: {
    name: string;
    tagline: string;
    url: string;
    email: string;
  };
  branches: {
    slug: string;
    name: string;
    one_liner: string;
    public_url: string;
  }[];
  team: {
    full_name: string;
    role: string;
    bio: string | null;
  }[];
  impact: {
    released_waiata: number;
    active_iwi_gates: number;
    research_papers: number;
    research_field_projects: number;
    scholarship_engagements: number;
    local_contexts_labels_applied: number;
    consent_log_entries: number;
    data_governance_log_entries: number;
  };
  funding_status: {
    planned: number;
    pending: number;
    awarded: number;
    declined: number;
  };
  cultural_provenance: {
    label_count_by_family: { tk: number; bc: number; notice: number };
    exemplar_projects: { title: string; hub_label_count: number }[];
  };
  accountability: {
    github_repo: string;
    docs_index: string;
    privacy_notice: string;
    terms_of_use: string;
    accessibility_statement: string;
  };
  press_assets: {
    description: string;
    cover_art_bucket: string;
    press_bucket: string;
    contact_email: string;
  };
}

/** Aggregated funder/press kit data. */
export async function getFunderKitData(): Promise<FunderKitData> {
  const admin = createAdminClient();

  const [
    released,
    iwiGates,
    papers,
    fieldProjects,
    scholarships,
    lcCache,
    consentLog,
    dataGov,
    funding,
    branches,
    team,
  ] = await Promise.all([
    admin.from("releases").select("id", { count: "exact", head: true }).eq("status", "released"),
    admin.from("iwi_gates").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("research_documents").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("research_field_projects").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("scholarship_engagements").select("id", { count: "exact", head: true }),
    admin.from("lc_labels_cache").select("hub_project_id, payload"),
    admin.from("consent_log").select("id", { count: "exact", head: true }),
    admin.from("data_governance_log").select("id", { count: "exact", head: true }),
    admin.from("funding_applications").select("status"),
    admin.from("branches").select("slug, name, description, homepage_slug").order("slug"),
    admin.from("profiles").select("full_name, role, bio, is_public").eq("is_public", true).order("role", { ascending: false }),
  ]);

  // Aggregate Local Contexts label counts from cached payloads
  let lcLabelCount = 0;
  const labelByFamily = { tk: 0, bc: 0, notice: 0 };
  const exemplarProjects: { title: string; hub_label_count: number }[] = [];
  for (const row of lcCache.data ?? []) {
    const payload = row.payload as {
      tk_labels?: unknown[];
      bc_labels?: unknown[];
      notice?: unknown[];
      title?: string;
    };
    const tk = payload?.tk_labels?.length ?? 0;
    const bc = payload?.bc_labels?.length ?? 0;
    const nt = payload?.notice?.length ?? 0;
    const total = tk + bc + nt;
    lcLabelCount += total;
    labelByFamily.tk += tk;
    labelByFamily.bc += bc;
    labelByFamily.notice += nt;
    if (total > 0 && payload.title) {
      exemplarProjects.push({
        title: payload.title,
        hub_label_count: total,
      });
    }
  }
  exemplarProjects.sort((a, b) => b.hub_label_count - a.hub_label_count);

  // Aggregate funding status
  const fundingStatus = { planned: 0, pending: 0, awarded: 0, declined: 0 };
  for (const row of funding.data ?? []) {
    if (row.status === "planned") fundingStatus.planned++;
    else if (row.status === "pending") fundingStatus.pending++;
    else if (row.status === "awarded") fundingStatus.awarded++;
    else if (row.status === "declined") fundingStatus.declined++;
  }

  // Branch public URLs
  const branchData = (branches.data ?? []).map((b) => ({
    slug: b.slug,
    name: b.name,
    one_liner: b.description ?? "",
    public_url: `/${b.homepage_slug ?? b.slug}`,
  }));

  // Team profiles
  const teamData = (team.data ?? []).map((p) => ({
    full_name: p.full_name ?? "Team member",
    role: p.role ?? "contributor",
    bio: p.bio ?? null,
  }));

  return {
    generated_at: new Date().toISOString(),
    brand: {
      name: "Anamata Kāhui",
      tagline:
        "A Māori-led collective platform unifying music, research, creative arts, and technology.",
      url: "https://anamatakahui.co.nz",
      email: "press@anamatakahui.co.nz",
    },
    branches: branchData,
    team: teamData,
    impact: {
      released_waiata: released.count ?? 0,
      active_iwi_gates: iwiGates.count ?? 0,
      research_papers: papers.count ?? 0,
      research_field_projects: fieldProjects.count ?? 0,
      scholarship_engagements: scholarships.count ?? 0,
      local_contexts_labels_applied: lcLabelCount,
      consent_log_entries: consentLog.count ?? 0,
      data_governance_log_entries: dataGov.count ?? 0,
    },
    funding_status: fundingStatus,
    cultural_provenance: {
      label_count_by_family: labelByFamily,
      exemplar_projects: exemplarProjects.slice(0, 5),
    },
    accountability: {
      github_repo: "https://github.com/LaFinnix/anamata-kahui",
      docs_index: "https://anamatakahui.co.nz/transparency",
      privacy_notice: "https://anamatakahui.co.nz/legal/privacy-notice",
      terms_of_use: "https://anamatakahui.co.nz/legal/terms-of-use",
      accessibility_statement: "https://anamatakahui.co.nz/accessibility",
    },
    press_assets: {
      description:
        "High-resolution cover art, press photos, and audio previews are available on request.",
      cover_art_bucket: "covers",
      press_bucket: "press",
      contact_email: "press@anamatakahui.co.nz",
    },
  };
}