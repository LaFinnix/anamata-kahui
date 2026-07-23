import { createAdminClient } from "@/lib/supabase/clients";

/**
 * /[locale]/reads/rss.xml — RSS 2.0 feed of published reads.
 *
 * Per locale. Most feed readers will subscribe to the default
 * locale (en) but the feed is rendered correctly per request.
 *
 * Output format: RSS 2.0 with Atom self-link. Plain text body.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

function escapeXml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(_request: Request, { params }: PageProps) {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

  const admin = createAdminClient();
  const { data: reads } = await admin
    .from("reads_public")
    .select("slug, kind, title, subtitle, body_md, published_at, author_name, tags")
    .order("published_at", { ascending: false })
    .limit(30);

  const items = (reads ?? [])
    .map((r) => {
      const url = `${baseUrl}/${locale}/reads/${r.slug}`;
      const pubDate = r.published_at
        ? new Date(r.published_at).toUTCString()
        : new Date().toUTCString();
      // Use subtitle as description; fallback to first paragraph of body
      const desc = r.subtitle ?? (r.body_md ? r.body_md.split("\n").find((l: string) => l.trim()) : "") ?? "";
      return `
    <item>
      <title>${escapeXml(r.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${r.author_name ? `<dc:creator>${escapeXml(r.author_name)}</dc:creator>` : ""}
      ${r.tags?.length ? `<category>${r.tags.map(escapeXml).join("</category>\n      <category>")}</category>` : ""}
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Anamata Kāhui — Reads</title>
    <link>${baseUrl}/${locale}/reads</link>
    <atom:link href="${baseUrl}/${locale}/reads/rss.xml" rel="self" type="application/rss+xml" />
    <description>Research-grade long-form content from Anamata Kāhui.</description>
    <language>${locale === "mi" ? "mi-NZ" : "en-NZ"}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}