"use server";

/**
 * News server actions.
 *
 * Authoring:
 *   - createNewsAction — author creates a draft
 *   - updateNewsAction — author edits drafts (not published)
 *   - publishNewsAction — author or super_admin publishes (renders markdown → sanitised HTML)
 *   - archiveNewsAction — author or super_admin archives a news entry
 *
 * News (queries) live in the page components because they're
 * public-readable and benefit from server component caching.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";
import { renderMarkdown, estimateReadingTime, extractExcerpt } from "@/lib/reads/markdown";

export interface NewsFormState {
  error?: string;
  success?: string;
}

const VALID_KINDS = ["release", "feature", "milestone", "partner", "update"] as const;
type NewsKind = (typeof VALID_KINDS)[number];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function createNewsAction(
  _prev: NewsFormState | null,
  formData: FormData,
): Promise<NewsFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as NewsKind;
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const bodyMd = String(formData.get("body_md") ?? "").trim();
  const externalUrl = String(formData.get("external_url") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const metaDescription = String(formData.get("meta_description") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!VALID_KINDS.includes(kind)) {
    return { error: `Invalid kind. Use one of: ${VALID_KINDS.join(", ")}.` };
  }
  if (!bodyMd) return { error: "Body is required." };

  // Generate slug from title, suffix with random if collision
  let slug = slugify(title);
  const { data: existing } = await supabase
    .from("news")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from("news")
    .insert({
      slug,
      kind,
      title,
      summary,
      body_md: bodyMd,
      body_html: renderMarkdown(bodyMd),
      reading_time_minutes: undefined, // news uses view_count not reading_time_minutes
      tags,
      meta_description: metaDescription ?? extractExcerpt(bodyMd, 200),
      external_url: externalUrl,
      author_id: user.id,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) {
    return { error: `Could not create news: ${error.message}` };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");

  return { success: `Created draft "${title}".` };
}

export async function updateNewsAction(
  _prev: NewsFormState | null,
  formData: FormData,
): Promise<NewsFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "News id required." };

  const { data: existing } = await supabase
    .from("news")
    .select("author_id, status")
    .eq("id", id)
    .single();
  if (!existing) return { error: "News not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = existing.author_id === user.id;
  const isSuperAdmin = profile?.role === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    return { error: "Only the author or a super admin can edit a news entry." };
  }
  if (existing.status === "published" && !isSuperAdmin) {
    return { error: "Published news is immutable to authors. Contact a super admin for corrections." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const bodyMd = String(formData.get("body_md") ?? "").trim();
  const externalUrl = String(formData.get("external_url") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const metaDescription = String(formData.get("meta_description") ?? "").trim() || null;

  if (!title || !bodyMd) {
    return { error: "Title and body are required." };
  }

  const { error } = await supabase
    .from("news")
    .update({
      title,
      summary,
      body_md: bodyMd,
      body_html: renderMarkdown(bodyMd),
      tags,
      meta_description: metaDescription ?? extractExcerpt(bodyMd, 200),
      external_url: externalUrl,
    })
    .eq("id", id);

  if (error) {
    return { error: `Could not update: ${error.message}` };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath(`/news/${String(formData.get("slug") ?? "")}`);

  return { success: "Updated." };
}

export async function publishNewsAction(
  _prev: NewsFormState | null,
  formData: FormData,
): Promise<NewsFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "News id required." };

  const { data: existing } = await supabase
    .from("news")
    .select("author_id, status, body_md, title, slug, meta_description, summary")
    .eq("id", id)
    .single();
  if (!existing) return { error: "News not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = existing.author_id === user.id;
  const isSuperAdmin = profile?.role === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    return { error: "Only the author or a super admin can publish a news entry." };
  }

  const { error } = await supabase
    .from("news")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      body_html: renderMarkdown(existing.body_md),
      meta_description: existing.meta_description ?? extractExcerpt(existing.body_md, 200),
    })
    .eq("id", id);

  if (error) {
    return { error: `Could not publish: ${error.message}` };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath(`/news/${existing.slug}`);
  revalidatePath("/news/rss.xml");

  return { success: `Published "${existing.title}".` };
}

export async function archiveNewsAction(
  _prev: NewsFormState | null,
  formData: FormData,
): Promise<NewsFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "News id required." };

  const { error } = await supabase
    .from("news")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    return { error: `Could not archive: ${error.message}` };
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");

  return { success: "Archived." };
}