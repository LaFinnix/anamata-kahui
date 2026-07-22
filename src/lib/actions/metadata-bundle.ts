"use server";

/**
 * Local Contexts file-metadata download action.
 *
 * Returns a base64-encoded zip-like payload (or per-file content) for
 * downloading as a metadata bundle.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import { composeFileMetadataBundle } from "@/lib/local-contexts/file-metadata";
import type { HubProject } from "@/lib/local-contexts/hub-client";

export interface MetadataBundleState {
  error?: string;
  files?: Record<string, string>; // filename → content (text)
}

/**
 * Generate a file-metadata bundle (XMP sidecar, PDF info dict,
 * ID3 chunk) for a release with an attached Hub project.
 *
 * Returns the bundle as a Record<string, string> so the caller can
 * serve it as a download via a Blob.
 */
export async function generateMetadataBundleAction(
  _prev: MetadataBundleState | null,
  formData: FormData,
): Promise<MetadataBundleState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "");
  if (!releaseId) return { error: "Release id required." };

  // Fetch release + Hub cache
  const { data: release } = await supabase
    .from("releases")
    .select("id, title, description, lc_project_id, artist_id")
    .eq("id", releaseId)
    .single();
  if (!release) return { error: "Release not found." };
  if (!release.lc_project_id) {
    return {
      error:
        "No Hub project attached. Attach a Local Contexts Hub project first.",
    };
  }

  const { data: cache } = await supabase
    .from("lc_labels_cache")
    .select("payload")
    .eq("hub_project_id", release.lc_project_id)
    .single();
  if (!cache) {
    return { error: "Hub project cache not found. Click Refresh to populate." };
  }

  const project = cache.payload as HubProject;

  const files = composeFileMetadataBundle(project, {
    kind: "release",
    title: release.title,
    creator: "Anamata Records",
    subject: release.description ?? undefined,
    rights_holder: "Anamata Kāhui Limited",
    base_filename: release.title,
  });

  return { files };
}
