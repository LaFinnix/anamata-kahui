"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";

interface Props {
  domainOptions: readonly KnowledgeDomain[];
  activeDomain?: KnowledgeDomain;
  activeIwi?: string;
  domainLabel: Record<KnowledgeDomain, string>;
}

/**
 * Filter UI for the Kaikōrero directory.
 *
 * URL-driven (search params), server-rendered filtering. Form submits
 * a GET that pushes the new URL — no client-side fetch, no flash.
 *
 * `useTransition` keeps the UI responsive during the navigation.
 */
export function KaikoreroDirectoryFilters({
  domainOptions,
  activeDomain,
  activeIwi,
  domainLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = (next: { domain?: string; iwi?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.domain === undefined) params.delete("domain");
    else params.set("domain", next.domain);
    if (next.iwi === undefined) params.delete("iwi");
    else params.set("iwi", next.iwi);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasFilters = Boolean(activeDomain || activeIwi);

  return (
    <div className="mt-10 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        {/* Domain select */}
        <select
          value={activeDomain ?? ""}
          onChange={(e) => apply({ domain: e.target.value || undefined })}
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

        {/* Iwi text filter */}
        <input
          type="text"
          defaultValue={activeIwi ?? ""}
          placeholder="iwi (e.g. Ngāti Porou)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply({ iwi: (e.target as HTMLInputElement).value.trim() || undefined });
            }
          }}
          onBlur={(e) => apply({ iwi: e.target.value.trim() || undefined })}
          disabled={pending}
          className="flex h-9 w-48 rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={pending}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}

        {pending && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>

      {hasFilters && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing kaikōrero whose declared knowledge areas intersect the
          filter. Discovery is by filter — no aggregate counts, no ranking.
        </p>
      )}
    </div>
  );
}
