import { Music, BookOpen, Palette, Code2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-context";
import { createServerSupabase } from "@/lib/supabase/clients";
import type { BranchSlug, BranchRole, PlatformRole } from "@/lib/auth/active-context-types";

const ICONS = {
  records: Music,
  research: BookOpen,
  arts: Palette,
  dev: Code2,
} as const;

/**
 * <ActiveContextBanner/> — a thin strip at the top of dashboard pages
 * showing the current branch + role context. Reminds users which
 * branch they're operating in.
 *
 * Server component — reads the active context cookie.
 */
export async function ActiveContextBanner() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch user memberships (same logic as layout)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuperAdmin = profile?.role === "super_admin";

  let memberships: { branch_slug: BranchSlug; role_in_branch: BranchRole }[] = [];
  if (!isSuperAdmin) {
    const { data } = await supabase
      .from("user_branches")
      .select("role, branches:branch_id(slug)")
      .eq("user_id", user.id);
    for (const m of data ?? []) {
      const slug = (m.branches as unknown as { slug?: string } | null)?.slug;
      if (slug) {
        memberships.push({
          branch_slug: slug as BranchSlug,
          role_in_branch: m.role as BranchRole,
        });
      }
    }
  } else {
    const { data: branches } = await supabase.from("branches").select("id, slug");
    memberships = (branches ?? [])
      .filter((b) => b.slug)
      .map((b) => ({
        branch_slug: b.slug as BranchSlug,
        role_in_branch: "lead" as BranchRole,
      }));
  }

  const ctx = await getActiveContext(memberships, (profile?.role ?? "client") as PlatformRole);
  const Icon = ICONS[ctx.branch_slug];

  return (
    <div className="mb-6 flex items-center gap-2 rounded-md border border-bronze-500/30 bg-bronze-900/10 px-3 py-2 text-xs text-muted-foreground">
      <Icon className="h-3 w-3 text-bronze-300" />
      <span>
        Operating in{" "}
        <span className="font-medium text-foreground capitalize">
          {ctx.branch_slug}
        </span>{" "}
        as{" "}
        <span className="font-medium text-foreground capitalize">
          {ctx.role_in_branch}
        </span>
      </span>
      {ctx.source === "default" && (
        <span className="ml-auto text-[10px] italic">
          (default — set your preferred branch in the sidebar)
        </span>
      )}
    </div>
  );
}
