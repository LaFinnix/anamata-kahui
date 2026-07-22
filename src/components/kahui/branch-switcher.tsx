"use client";

import { useState, useTransition } from "react";
import { Music, BookOpen, Palette, Code2, Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { setActiveBranchAction } from "@/lib/actions/active-context";
import { BRANCH_LABELS, type BranchSlug, type BranchRole } from "@/lib/auth/active-context-types";

const ICONS: Record<BranchSlug, React.ComponentType<{ className?: string }>> = {
  records: Music,
  research: BookOpen,
  arts: Palette,
  dev: Code2,
};

interface BranchOption {
  branch_slug: BranchSlug;
  role_in_branch: BranchRole;
}

interface Props {
  active: { branch_slug: BranchSlug; role_in_branch: BranchRole };
  available: BranchOption[];
}

/**
 * <BranchSwitcher/> — sidebar component for switching active branch.
 *
 * Shows current branch + role. Dropdown lists all branches the user
 * has access to with their role in each. Selecting a branch persists
 * the choice via setActiveBranchAction (sets kahui_active_context cookie).
 */
export function BranchSwitcher({ active, available }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const Icon = ICONS[active.branch_slug];
  const activeLabel = BRANCH_LABELS[active.branch_slug].label;

  function select(branch: BranchOption) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("branch_slug", branch.branch_slug);
      fd.set("role_in_branch", branch.role_in_branch);
      const result = await setActiveBranchAction(null, fd);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-between"
            disabled={pending}
          >
            <span className="flex items-center gap-2 truncate">
              <Icon className="h-4 w-4 shrink-0 text-bronze-300" />
              <span className="truncate text-left">
                <span className="block text-xs font-medium">{activeLabel}</span>
                <span className="block text-[10px] text-muted-foreground">
                  Operating as {active.role_in_branch}
                </span>
              </span>
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Switch branch context</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {available.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No branches available. Contact an admin to be added.
            </div>
          ) : (
            available.map((b) => {
              const BranchIcon = ICONS[b.branch_slug];
              const isActive = b.branch_slug === active.branch_slug;
              const meta = BRANCH_LABELS[b.branch_slug];
              return (
                <DropdownMenuItem
                  key={b.branch_slug}
                  onClick={() => select(b)}
                  className="flex items-start gap-2 py-2"
                >
                  <BranchIcon className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{meta.label}</span>
                      {isActive && (
                        <Check className="h-3 w-3 text-pounamu-300" aria-label="active" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Role in this branch: <span className="text-foreground">{b.role_in_branch}</span>
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Compact badge showing the active branch (used in headers across the
 * dashboard for visual context).
 */
export function ActiveBranchBadge({
  branch_slug,
  role_in_branch,
}: {
  branch_slug: BranchSlug;
  role_in_branch: BranchRole;
}) {
  const Icon = ICONS[branch_slug];
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {BRANCH_LABELS[branch_slug].label}
      <span className="ml-1 text-[10px] opacity-70">({role_in_branch})</span>
    </Badge>
  );
}
