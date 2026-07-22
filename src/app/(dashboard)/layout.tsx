import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Music, BarChart3, Upload, BookOpen, Code2, Shield } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requires?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin",      label: "Overview",  icon: LayoutDashboard },
  { href: "/records",    label: "Records",   icon: Music,        requires: ["super_admin", "branch_admin", "artist"] },
  { href: "/releases",   label: "Releases",  icon: Upload,       requires: ["super_admin", "branch_admin", "artist"] },
  { href: "/analytics",  label: "Analytics", icon: BarChart3,    requires: ["super_admin", "branch_admin", "artist"] },
  { href: "/research",   label: "Research",  icon: BookOpen,     requires: ["super_admin", "branch_admin", "researcher"] },
  { href: "/dev",        label: "Dev",       icon: Code2,        requires: ["super_admin", "branch_admin", "client"] },
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

  // Fetch the profile so we can scope the nav to the user's role. RLS allows
  // any authenticated user to read profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "client") as UserRole;
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requires || item.requires.includes(role),
  );

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

        <nav className="flex-1 space-y-1 p-4">
          {visibleItems.map((item) => (
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
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bronze-400/15 text-sm font-medium text-bronze-200">
              {profile?.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
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
            {role === "super_admin" && (
              <Badge variant="success" className="gap-1">
                <Shield className="h-3 w-3" />
                Full access
              </Badge>
            )}
          </div>
          <LogoutButton className="w-full justify-start" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur md:hidden">
          <Link href="/admin" className="font-display text-lg font-semibold">
            Anamata Kāhui
          </Link>
          <LogoutButton />
        </header>
        <main className="flex-1 overflow-auto p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
