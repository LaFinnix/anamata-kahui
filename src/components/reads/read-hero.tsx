"use client";

/**
 * <ReadHero/> — inline SVG hero for a read.
 *
 * Renders the SVG hero server-side and embeds it inline in the article
 * header. No external image fetch; no flash; no broken image state.
 *
 * Uses dangerouslySetInnerHTML because the SVG is constructed by
 * renderHeroSvg() which escapes XML properly.
 */

import { renderHeroSvg, type ReadKind } from "@/lib/reads/hero";

interface Props {
  title: string;
  subtitle?: string | null;
  authorName?: string | null;
  kind: ReadKind;
  readingMinutes?: number | null;
}

export function ReadHero({
  title,
  subtitle,
  authorName,
  kind,
  readingMinutes,
}: Props) {
  const svg = renderHeroSvg({
    title,
    subtitle,
    authorName,
    kind,
    readingMinutes,
  });
  return (
    <div
      className="overflow-hidden rounded-md border border-border bg-card"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}