"use server";

/**
 * Local Contexts Hub project server actions.
 *
 * Attach a release or research document to a Hub Project (by UUID),
 * detach, and refresh the cache.
 *
 * The Hub itself is read-only from the API — projects are created and
 * managed at https://localcontextshub.org. This action just records
 * the link between our asset and the Hub Project UUID.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabase, createAdminClient } from "@/lib/supabase/clients";
import {
  fetchHubProject,
  fetchHubProjectsModified,
  HubError,
} from "@/lib/local-contexts/hub-client";

export interface HubActionState {
  error?: string;
  success?: string;
}

/**
 * Attach a Hub Project UUID to an asset (release or research document).
 *
 * On attach, immediately fetches the Hub project and caches the payload.
 */
export async function attachHubProjectAction(
  _prev: HubActionState | null,
  formData: FormData,
): Promise<HubActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "") || null;
  const researchDocumentId = String(formData.get("research_document_id") ?? "") || null;
  const hubProjectId = String(formData.get("hub_project_id") ?? "").trim();

  if (!hubProjectId) return { error: "Hub project UUID is required." };
  if (!releaseId && !researchDocumentId) {
    return { error: "Either release_id or research_document_id is required." };
  }
  if (releaseId && researchDocumentId) {
    return { error: "Only one of release_id or research_document_id can be set." };
  }

  // UUID validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hubProjectId)) {
    return { error: "Hub project UUID must be a valid UUID format." };
  }

  // Fetch the project to validate it exists + cache it
  let project;
  try {
    project = await fetchHubProject(hubProjectId);
  } catch (e) {
    if (e instanceof HubError) {
      return {
        error: `Local Contexts Hub returned ${e.statusCode}. Verify the project UUID at https://localcontextshub.org/projects/${hubProjectId}/`,
      };
    }
    return { error: `Could not reach Local Contexts Hub: ${(e as Error).message}` };
  }

  if (!project) {
    return { error: "Project not found on the Hub. Verify the UUID." };
  }

  const admin = createAdminClient();

  // Update the asset with the Hub project_id
  if (releaseId) {
    const { error } = await admin
      .from("releases")
      .update({ lc_project_id: hubProjectId })
      .eq("id", releaseId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("research_documents")
      .update({ lc_project_id: hubProjectId })
      .eq("id", researchDocumentId!);
    if (error) return { error: error.message };
  }

  // Cache the payload
  const labelCount =
    project.tk_labels.length + project.bc_labels.length + project.notice.length;
  await admin.from("lc_labels_cache").upsert(
    {
      hub_project_id: hubProjectId,
      payload: project,
      fetched_at: new Date().toISOString(),
      hub_modified_at: project.date_modified,
      has_tk_labels: project.tk_labels.length > 0,
      has_bc_labels: project.bc_labels.length > 0,
      has_notices: project.notice.length > 0,
      label_count: labelCount,
    },
    { onConflict: "hub_project_id" },
  );

  // Record attach event
  await admin.from("lc_project_status").upsert(
    {
      asset_kind: releaseId ? "release" : "research_document",
      asset_id: releaseId ?? researchDocumentId!,
      hub_project_id: hubProjectId,
      last_synced_at: new Date().toISOString(),
      last_sync_status: "ok",
      attached_at: new Date().toISOString(),
      attached_by: user.id,
    },
    { onConflict: "asset_kind,asset_id" },
  );

  // Log
  await admin.from("lc_sync_log").insert({
    hub_project_id: hubProjectId,
    action: "attach",
    http_status: 200,
    duration_ms: 0,
    actor_id: user.id,
  });

  if (releaseId) revalidatePath(`/releases/${releaseId}`);
  if (researchDocumentId) revalidatePath(`/research/papers/${researchDocumentId}`);

  return {
    success: `Attached Hub project "${project.title || hubProjectId}" — ${labelCount} label(s) found.`,
  };
}

/**
 * Refresh the cache for one or more Hub projects.
 *
 * Uses the lightweight `date_modified` endpoint to decide which projects
 * actually need a full re-fetch. Honors the Hub's recommended polling
 * window (midnight–4am Pacific for batch pulls).
 */
export async function refreshHubCacheAction(
  _prev: HubActionState | null,
  formData: FormData,
): Promise<HubActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "") || null;
  const researchDocumentId = String(formData.get("research_document_id") ?? "") || null;

  const admin = createAdminClient();

  // Get the Hub project_id(s) to refresh
  const projectIds: string[] = [];
  if (releaseId) {
    const { data: r } = await admin
      .from("releases")
      .select("lc_project_id")
      .eq("id", releaseId)
      .single();
    if (r?.lc_project_id) projectIds.push(r.lc_project_id);
  }
  if (researchDocumentId) {
    const { data: d } = await admin
      .from("research_documents")
      .select("lc_project_id")
      .eq("id", researchDocumentId)
      .single();
    if (d?.lc_project_id) projectIds.push(d.lc_project_id);
  }

  if (projectIds.length === 0) {
    return { error: "No Hub project attached to this asset." };
  }

  // Use the polling endpoint to skip unchanged projects
  let modified: Record<string, string | null>;
  try {
    modified = await fetchHubProjectsModified(projectIds);
  } catch (e) {
    return { error: `Could not reach Local Contexts Hub: ${(e as Error).message}` };
  }

  let refreshed = 0;
  let skipped = 0;
  for (const projectId of projectIds) {
    // Check cache freshness
    const { data: cache } = await admin
      .from("lc_labels_cache")
      .select("hub_modified_at, fetched_at")
      .eq("hub_project_id", projectId)
      .single();

    const hubModifiedAt = modified[projectId];
    if (
      cache?.hub_modified_at &&
      hubModifiedAt &&
      cache.hub_modified_at === hubModifiedAt
    ) {
      skipped += 1;
      await admin.from("lc_sync_log").insert({
        hub_project_id: projectId,
        action: "cache_hit",
        http_status: 200,
        duration_ms: 0,
        actor_id: user.id,
      });
      continue;
    }

    try {
      const project = await fetchHubProject(projectId);
      if (!project) {
        await admin.from("lc_project_status").upsert(
          {
            asset_kind: releaseId ? "release" : "research_document",
            asset_id: releaseId ?? researchDocumentId!,
            hub_project_id: projectId,
            last_synced_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: "Project not found (404)",
            attached_by: user.id,
          },
          { onConflict: "asset_kind,asset_id" },
        );
        continue;
      }

      await admin.from("lc_labels_cache").upsert(
        {
          hub_project_id: projectId,
          payload: project,
          fetched_at: new Date().toISOString(),
          hub_modified_at: project.date_modified,
          has_tk_labels: project.tk_labels.length > 0,
          has_bc_labels: project.bc_labels.length > 0,
          has_notices: project.notice.length > 0,
          label_count:
            project.tk_labels.length + project.bc_labels.length + project.notice.length,
        },
        { onConflict: "hub_project_id" },
      );
      refreshed += 1;
    } catch (e) {
      await admin.from("lc_sync_log").insert({
        hub_project_id: projectId,
        action: "error",
        error_message: (e as Error).message,
        actor_id: user.id,
      });
    }
  }

  if (releaseId) revalidatePath(`/releases/${releaseId}`);
  if (researchDocumentId) revalidatePath(`/research/papers/${researchDocumentId}`);

  return {
    success: `Refreshed ${refreshed} project(s), skipped ${skipped} unchanged.`,
  };
}

/**
 * Detach a Hub Project from an asset (removes the link, leaves cache).
 */
export async function detachHubProjectAction(
  _prev: HubActionState | null,
  formData: FormData,
): Promise<HubActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "") || null;
  const researchDocumentId = String(formData.get("research_document_id") ?? "") || null;

  const admin = createAdminClient();
  if (releaseId) {
    await admin
      .from("releases")
      .update({ lc_project_id: null })
      .eq("id", releaseId);
  }
  if (researchDocumentId) {
    await admin
      .from("research_documents")
      .update({ lc_project_id: null })
      .eq("id", researchDocumentId);
  }
  if (releaseId) revalidatePath(`/releases/${releaseId}`);
  if (researchDocumentId) revalidatePath(`/research/papers/${researchDocumentId}`);
  return { success: "Hub project detached." };
}
