import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Music,
  BarChart3,
  Upload,
  BookOpen,
  Code2,
  Shield,
  ShieldCheck,
  Users,
  Image as ImageIcon,
  Mic2,
  HardDrive,
  Palette,
  GitBranch,
  FileText,
  Newspaper,
  KeyRound,
  Webhook,
  Terminal,
  Library,
  Compass,
  ChevronDown,
  UserCircle,
  Award,
  Megaphone,
  Bell,
  Settings,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";
import type { UserRole } from "@/lib/types";
import { getActiveContext, BRANCH_LABELS, BRANCH_ROLE_LABELS, type BranchSlug, type BranchRole } from "@/lib/auth/active-context";
import { BranchSwitcher } from "@/components/kahui/branch-switcher";
import { DashboardMobileNav } from "@/components/admin/dashboard-mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { listMyNotifications, countUnreadNotifications } from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  /** Display label (e.g. "Music (Anamata Records)") */
  label: string;
  /** Branch slug — when set, the group is gated on the user having a `user_branches` row for this branch */
  branchSlug?: "records" | "research" | "arts" | "dev";
  /** Roles that see this group regardless of branch membership */
  roles?: UserRole[];
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

/**
 * Dashboard navigation groups.
 *
 * Hierarchical structure:
 *   - Cross-branch items (Overview) → super_admin only
 *   - Per-branch groups → gated on user_branches membership
 *   - Admin group → super_admin + branch_admin
 *
 * Sub-categories reflect the user's description: each branch has multiple
 * sub-pages (Music > Releases, Demos, Roster, etc.).
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["super_admin"],
    items: [
      { href: "/admin", label: "Cross-branch overview", icon: Compass },
    ],
  },
  {
    label: "Kaikōrero",
    icon: UserCircle,
    // Visible to everyone authed — every creator across every branch can
    // declare their cultural-knowledge areas. This is the discovery surface
    // for the cross-iwi collaboration marketplace.
    items: [
      { href: "/kaikorero/profile", label: "My profile", icon: UserCircle },
      { href: "/kaikorero/roster", label: "My roster", icon: Users },
      { href: "/endorsements", label: "Endorsements", icon: Award },
      { href: "/tono", label: "Tono board", icon: Megaphone },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/notifications/preferences", label: "Preferences", icon: Settings },
    ],
  },
  {
    label: "Music (Anamata Records)",
    branchSlug: "records",
    icon: Music,
    items: [
      { href: "/records", label: "Roster", icon: Users },
      { href: "/releases", label: "Releases", icon: Upload },
      { href: "/demos", label: "Demos", icon: Mic2 },
      { href: "/stem-vault", label: "Stem Vault", icon: HardDrive },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Research & Language",
    branchSlug: "research",
    icon: BookOpen,
    items: [
      { href: "/research", label: "Papers", icon: FileText },
      { href: "/research/field-projects", label: "Field projects", icon: GitBranch },
      { href: "/library", label: "Library", icon: Library },
    ],
  },
  {
    label: "Creative Arts",
    branchSlug: "arts",
    icon: Palette,
    items: [
      { href: "/arts", label: "Galleries", icon: ImageIcon },
      { href: "/arts/portfolios", label: "Portfolios", icon: Palette },
      { href: "/arts/commissions", label: "Commissions", icon: Mic2 },
    ],
  },
  {
    label: "Technology & Dev",
    branchSlug: "dev",
    icon: Code2,
    items: [
      { href: "/dev", label: "API keys", icon: KeyRound },
      { href: "/dev/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/dev/jobs", label: "Background jobs", icon: Terminal },
    ],
  },
  {
    label: "Admin",
    icon: Shield,
    roles: ["super_admin", "branch_admin"],
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/iwi-gate", label: "Iwi gates", icon: GitBranch },
      { href: "/admin/reads", label: "Reads", icon: FileText },
      { href: "/admin/news", label: "News", icon: Newspaper },
      { href: "/admin/members", label: "Members & branches", icon: Users },
      { href: "/admin/kaitiaki", label: "Cultural review", icon: ShieldCheck },
      { href: "/admin/records", label: "Artist roster", icon: Users },
      { href: "/admin/contracts", label: "Contracts", icon: FileText },
      { href: "/admin/policies", label: "Policies", icon: ShieldCheck },
      { href: "/admin/demos", label: "Demo review", icon: Mic2 },
      { href: "/admin/hub-sync", label: "Hub sync", icon: BookOpen },
    ],
  },
];

/**
 * Dashboard layout — server component that requires an authenticated user.
 * Renders the sidebar nav, branch chips, and a centred content slot.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the profile so we can scope the nav to the user's role + branch.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "client") as UserRole;
  const isSuperAdmin = role === "super_admin";

  // Fetch branch membership (only if not super_admin — super_admin sees everything).
  const branchSlugs = new Set<string>();
  let memberships: { branch_slug: BranchSlug; role_in_branch: BranchRole; branch_id: string }[] = [];
  if (!isSuperAdmin) {
    const { data } = await supabase
      .from("user_branches")
      .select("branch_id, role, branches:branch_id(slug)")
      .eq("user_id", user.id);
    for (const m of data ?? []) {
      const slug = (m.branches as unknown as { slug?: string } | null)?.slug;
      if (slug) {
        branchSlugs.add(slug);
        memberships.push({
          branch_slug: slug as BranchSlug,
          role_in_branch: m.role as BranchRole,
          branch_id: m.branch_id,
        });
      }
    }
  } else {
    // Super admins: fetch all branches for the switcher
    const { data: branches } = await supabase
      .from("branches")
      .select("id, slug");
    memberships = (branches ?? [])
      .filter((b) => b.slug)
      .map((b) => ({
        branch_slug: b.slug as BranchSlug,
        role_in_branch: "lead" as BranchRole,
        branch_id: b.id,
      }));
  }

  // Active branch context (cookie-driven)
  const activeContext = await getActiveContext(memberships, role);
  // For super_admin, allow switching to any branch
  const availableBranches = memberships.map((m) => ({
    branch_slug: m.branch_slug,
    role_in_branch: m.role_in_branch,
  }));

  // Notifications for the bell — server-rendered initial state. Client polls
  // every 60s after mount. v1.1 limits to 10 most recent for the dropdown.
  const [notifications, unreadCount] = await Promise.all([
    listMyNotifications({ limit: 10 }),
    countUnreadNotifications(),
  ]);

  // Filter groups: role + branch membership
  const visibleGroups = NAV_GROUPS.filter((group) => {
    // Role-only groups
    if (group.roles && !group.roles.includes(role)) return false;
    // Branch-gated groups: skip unless super_admin or member of that branch
    if (group.branchSlug && !isSuperAdmin && !branchSlugs.has(group.branchSlug)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6 font-display text-lg font-semibold">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-bronze-400 shadow-[0_0_12px_var(--color-bronze-400)]"
          />
          Anamata Kāhui
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <group.icon className="h-3 w-3" />
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      "text-foreground/80 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 text-bronze-300" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          {/* Active branch + role — with switcher */}
          <BranchSwitcher
            active={{
              branch_slug: activeContext.branch_slug,
              role_in_branch: activeContext.role_in_branch,
            }}
            available={availableBranches}
          />

          <div className="mb-3 mt-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bronze-400/15 text-sm font-medium text-bronze-200">
              {profile?.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {profile?.full_name ?? "Kāhui member"}
              </div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {role.replace("_", " ")}
            </Badge>
            {isSuperAdmin && (
              <Badge variant="success" className="gap-1">
                <Shield className="h-3 w-3" />
                Full access
              </Badge>
            )}
            <NotificationBell
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
            />
          </div>
          {/* Branch membership chips */}
          {branchSlugs.size > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {Array.from(branchSlugs).map((slug) => (
                <Badge key={slug} variant="secondary" className="capitalize text-xs">
                  {slug}
                </Badge>
              ))}
            </div>
          )}
          <LogoutButton className="w-full justify-start" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <DashboardMobileNav groups={visibleGroups} />
            <Link href="/admin" className="font-display text-lg font-semibold">
              Anamata Kāhui
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
            />
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
