"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";

interface Props {
  domainOptions: readonly KnowledgeDomain[];
  domainLabel: Record<KnowledgeDomain, string>;
  activeKind: "all" | "endorsement" | "tono";
  activeDomain: KnowledgeDomain | null;
  activeIwi: string | null;
}

/**
 * URL-driven filter bar for /[locale]/collaborations.
 *
 * Three filters: kind (all / endorsement / tono), knowledge domain, iwi.
 * All transitions use `useTransition` to keep the UI responsive.
 */
export function CollaborationsFilters({
  domainOptions,
  domainLabel,
  activeKind,
  activeDomain,
  activeIwi,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = (next: Partial<Record<string, string | null>>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === undefined || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const hasAnyFilter = activeKind !== "all" || !!activeDomain || !!activeIwi;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        {/* Kind */}
        <select
          value={activeKind}
          onChange={(e) => apply({ kind: e.target.value })}
          disabled={pending}
          className="flex h-9 rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">All activity</option>
          <option value="endorsement">Endorsements only</option>
          <option value="tono">Tono only</option>
        </select>

        {/* Knowledge domain */}
        <select
          value={activeDomain ?? ""}
          onChange={(e) => apply({ domain: e.target.value || null })}
          disabled={pending}
          className="flex h-9 rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">All knowledge areas</option>
          {domainOptions.map((d) => (
            <option key={d} value={d}>
              {domainLabel[d]}
            </option>
          ))}
        </select>

        {/* Iwi — text input since iwi are free-text in our schema */}
        <input
          type="text"
          placeholder="Iwi (e.g. Ngāti Porou)"
          defaultValue={activeIwi ?? ""}
          onBlur={(e) => apply({ iwi: e.target.value.trim() || null })}
          disabled={pending}
          className="flex h-9 w-48 rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />

        {hasAnyFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname, { scroll: false })}
            disabled={pending}
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}

        {pending && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>
    </div>
  );
}
