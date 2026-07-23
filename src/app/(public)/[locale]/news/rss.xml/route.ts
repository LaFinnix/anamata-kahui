import { createAdminClient } from "@/lib/supabase/clients";

/**
 * /[locale]/news/rss.xml — RSS 2.0 feed of published news.
 *
 * Mirrors /reads/rss.xml — same shape, different table.
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
  const { data: items } = await admin
    .from("news_public")
    .select("slug, kind, title, summary, body_md, published_at, author_name, tags, external_url")
    .order("published_at", { ascending: false })
    .limit(30);

  const xmlItems = (items ?? [])
    .map((n) => {
      const url = `${baseUrl}/${locale}/news/${n.slug}`;
      const pubDate = n.published_at
        ? new Date(n.published_at).toUTCString()
        : new Date().toUTCString();
      // Prefer summary, fall back to first paragraph of body
      const desc = n.summary ?? (n.body_md ? n.body_md.split("\n").find((l: string) => l.trim()) : "") ?? "";
      const externalLink = n.external_url
        ? `<atom:link href="${escapeXml(n.external_url)}" rel="related" type="text/html"/>`
        : "";
      return `
    <item>
      <title>${escapeXml(n.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${n.author_name ? `<dc:creator>${escapeXml(n.author_name)}</dc:creator>` : ""}
      ${n.tags?.length ? `<category>${n.tags.map(escapeXml).join("</category>\n      <category>")}</category>` : ""}
      <description>${escapeXml(desc)}</description>
      ${externalLink}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Anamata Kāhui — News</title>
    <link>${baseUrl}/${locale}/news</link>
    <atom:link href="${baseUrl}/${locale}/news/rss.xml" rel="self" type="application/rss+xml" />
    <description>Time-sensitive updates from Anamata Kāhui.</description>
    <language>${locale === "mi" ? "mi-NZ" : "en-NZ"}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${xmlItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}