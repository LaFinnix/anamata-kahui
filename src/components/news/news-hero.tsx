"use client";

import { renderNewsHeroSvg, type NewsKind } from "@/lib/news/hero";

interface Props {
  title: string;
  summary?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  kind: NewsKind;
}

export function NewsHero({ title, summary, authorName, publishedAt, kind }: Props) {
  const svg = renderNewsHeroSvg({
    title,
    summary,
    authorName,
    publishedAt,
    kind,
  });
  return (
    <div
      className="overflow-hidden rounded-md border border-border bg-card"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}