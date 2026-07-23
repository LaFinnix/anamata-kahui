"use server";

/**
 * Reads (long-form content) server actions.
 *
 * Authoring:
 *   - createReadAction — author can create a draft
 *   - updateReadAction — author can edit drafts (not published)
 *   - publishReadAction — author or super_admin can publish a draft
 *     (renders markdown → sanitised HTML at this point)
 *   - archiveReadAction — author or super_admin can archive a read
 *
 * Reads (queries) live in the page components because they're
 * public-readable and benefit from server component caching.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";
import { renderMarkdown, estimateReadingTime, extractExcerpt } from "@/lib/reads/markdown";

export interface ReadFormState {
  error?: string;
  success?: string;
}

const VALID_KINDS = ["note", "research", "data_drop"] as const;
type ReadKind = (typeof VALID_KINDS)[number];

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

export async function createReadAction(
  _prev: ReadFormState | null,
  formData: FormData,
): Promise<ReadFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as ReadKind;
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const bodyMd = String(formData.get("body_md") ?? "").trim();
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
    .from("reads")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from("reads")
    .insert({
      slug,
      kind,
      title,
      subtitle,
      body_md: bodyMd,
      body_html: renderMarkdown(bodyMd),
      reading_time_minutes: estimateReadingTime(bodyMd),
      tags,
      meta_description: metaDescription ?? extractExcerpt(bodyMd, 200),
      author_id: user.id,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) {
    return { error: `Could not create read: ${error.message}` };
  }

  revalidatePath("/admin/reads");
  revalidatePath("/reads");

  return { success: `Created draft "${title}".` };
}

export async function updateReadAction(
  _prev: ReadFormState | null,
  formData: FormData,
): Promise<ReadFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Read id required." };

  const { data: existing } = await supabase
    .from("reads")
    .select("author_id, status")
    .eq("id", id)
    .single();
  if (!existing) return { error: "Read not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = existing.author_id === user.id;
  const isSuperAdmin = profile?.role === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    return { error: "Only the author or a super admin can edit a read." };
  }
  if (existing.status === "published" && !isSuperAdmin) {
    return { error: "Published reads are immutable to authors. Contact a super admin for corrections." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const bodyMd = String(formData.get("body_md") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const metaDescription = String(formData.get("meta_description") ?? "").trim() || null;

  if (!title || !bodyMd) {
    return { error: "Title and body are required." };
  }

  const { error } = await supabase
    .from("reads")
    .update({
      title,
      subtitle,
      body_md: bodyMd,
      body_html: renderMarkdown(bodyMd),
      reading_time_minutes: estimateReadingTime(bodyMd),
      tags,
      meta_description: metaDescription ?? extractExcerpt(bodyMd, 200),
    })
    .eq("id", id);

  if (error) {
    return { error: `Could not update: ${error.message}` };
  }

  revalidatePath("/admin/reads");
  revalidatePath("/reads");
  revalidatePath(`/reads/${String(formData.get("slug") ?? "")}`);

  return { success: "Updated." };
}

export async function publishReadAction(
  _prev: ReadFormState | null,
  formData: FormData,
): Promise<ReadFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Read id required." };

  const { data: existing } = await supabase
    .from("reads")
    .select("author_id, status, body_md, title, slug, meta_description")
    .eq("id", id)
    .single();
  if (!existing) return { error: "Read not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isOwner = existing.author_id === user.id;
  const isSuperAdmin = profile?.role === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    return { error: "Only the author or a super admin can publish a read." };
  }

  const { error } = await supabase
    .from("reads")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      body_html: renderMarkdown(existing.body_md),
      reading_time_minutes: estimateReadingTime(existing.body_md),
      meta_description: existing.meta_description ?? extractExcerpt(existing.body_md, 200),
    })
    .eq("id", id);

  if (error) {
    return { error: `Could not publish: ${error.message}` };
  }

  revalidatePath("/admin/reads");
  revalidatePath("/reads");
  revalidatePath(`/reads/${existing.slug}`);
  revalidatePath("/reads/rss.xml");

  return { success: `Published "${existing.title}".` };
}

export async function archiveReadAction(
  _prev: ReadFormState | null,
  formData: FormData,
): Promise<ReadFormState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Read id required." };

  const { error } = await supabase
    .from("reads")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    return { error: `Could not archive: ${error.message}` };
  }

  revalidatePath("/admin/reads");
  revalidatePath("/reads");

  return { success: "Archived." };
}