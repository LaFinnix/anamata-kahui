"use server";

/**
 * Hub batch-search server action.
 *
 * Given a DOI or provider_id, returns matching Hub Projects.
 * Used in the admin "Sync from Hub" UI.
 */

import { findHubProjects } from "@/lib/local-contexts/batch-pull";

export interface BatchSearchState {
  error?: string;
  results?: {
    unique_id: string;
    title: string;
    project_page: string;
    date_created: string | null;
    doi: string | null;
    label_count: number;
  }[];
}

export async function searchHubAction(
  _prev: BatchSearchState | null,
  formData: FormData,
): Promise<BatchSearchState> {
  const identifierType = String(formData.get("identifier_type") ?? "doi") as
    | "doi"
    | "provider_id";
  const value = String(formData.get("value") ?? "").trim();

  if (!value) {
    return { error: "Please enter a DOI or Anamata asset id." };
  }

  if (!process.env.LOCAL_CONTEXTS_API_KEY) {
    return {
      error:
        "LOCAL_CONTEXTS_API_KEY not set. Add it to .env.local to enable Hub search.",
    };
  }

  const results = await findHubProjects(identifierType, value);
  return { results };
}
