"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";

interface Props {
  domainOptions: readonly KnowledgeDomain[];
  activeDomain: KnowledgeDomain | null;
  domainLabel: Record<KnowledgeDomain, string>;
}

/**
 * Domain filter dropdown for /tono/inbox.
 *
 * URL-driven (`?domain=…`); server-side filtering via the page's
 * searchParams. `useTransition` keeps the UI responsive during navigation.
 */
export function InboxDomainFilter({
  domainOptions,
  activeDomain,
  domainLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = (next: { domain?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.domain === null || next.domain === undefined) {
      params.delete("domain");
    } else {
      params.set("domain", next.domain);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter
        </div>

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

        {activeDomain && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => apply({ domain: null })}
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

      {activeDomain && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing tono that explicitly request help in{" "}
          <strong>{domainLabel[activeDomain]}</strong>. Tono without a
          specific knowledge-area are excluded.
        </p>
      )}
    </div>
  );
}
