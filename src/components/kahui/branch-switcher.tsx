"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Music, BookOpen, Palette, Code2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BRANCHES } from "@/lib/branches";
import { cn } from "@/lib/utils";

const ICONS = {
  records: Music,
  research: BookOpen,
  arts: Palette,
  dev: Code2,
} as const;

const BRANCH_HOMES = {
  records: "/records",
  research: "/research",
  arts: "/arts",
  dev: "/dev",
} as const;

/**
 * BranchSwitcher — top-nav dropdown that surfaces all four branches.
 * The current branch (if any) is highlighted by matching the pathname prefix.
 */
export function BranchSwitcher() {
  const pathname = usePathname();

  const activeBranch = BRANCHES.find((b) => pathname.startsWith(BRANCH_HOMES[b.slug]));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "text-foreground/80 hover:text-foreground hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "data-[state=open]:bg-muted data-[state=open]:text-foreground",
        )}
        aria-label="Switch branch"
      >
        <span className="hidden sm:inline">
          {activeBranch ? activeBranch.name : "Branches"}
        </span>
        <span className="sm:hidden">Branches</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>The Kāhui</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BRANCHES.map((branch) => {
          const Icon = ICONS[branch.slug];
          const isActive = activeBranch?.slug === branch.slug;
          return (
            <DropdownMenuItem
              key={branch.slug}
              asChild
              className={cn(isActive && "bg-muted text-foreground")}
            >
              <Link href={BRANCH_HOMES[branch.slug]} className="flex items-start gap-3 py-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
                <div className="flex flex-col">
                  <span className="font-medium">{branch.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {branch.description}
                  </span>
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
