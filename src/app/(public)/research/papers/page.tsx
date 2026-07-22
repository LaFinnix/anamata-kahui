import Link from "next/link";
import { FileText, ArrowRight, Calendar, Tag } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 600;
export const metadata = { title: "Research papers" };

/**
 * /research/papers — public index of every published research document.
 *
 * RLS allows public read of papers where status='published' AND
 * access_tier='open'. The admin client bypasses RLS but we still filter
 * to those values here so this page would degrade gracefully if we ever
 * swap to the request-time server client.
 */
export default async function ResearchPapersIndex() {
  const admin = createAdminClient();
  const { data: papers } = await admin
    .from("research_documents")
    .select("id, title, abstract, publication_date, venue, doi, keywords, language_code, status, access_tier, created_at")
    .eq("status", "published")
    .eq("access_tier", "open")
    .order("publication_date", { ascending: false, nullsFirst: false });

  // Fetch author lists for each paper (single round-trip via in())
  const ids = (papers ?? []).map((p) => p.id);
  const { data: authorRows } = ids.length
    ? await admin
        .from("research_document_authors")
        .select("document_id, author_name, affiliation, position, is_corresponding")
        .in("document_id", ids)
        .order("position")
    : { data: [] };

  const authorsByDocId = new Map<string, typeof authorRows>();
  for (const a of authorRows ?? []) {
    const arr = authorsByDocId.get(a.document_id) ?? [];
    arr.push(a);
    authorsByDocId.set(a.document_id, arr);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Research · Published</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Research papers
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Published research outputs from Anamata Kāhui. Each entry carries
        full cultural provenance — iwi consent, language, access tier.
        Drafts and in-review work live in the staff dashboard only.
      </p>

      {(!papers || papers.length === 0) ? (
        <Card className="mt-12 border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground italic">
            No published papers yet. Staff can submit drafts via{" "}
            <code>/dashboard/research/documents</code> (forthcoming).
          </CardContent>
        </Card>
      ) : (
        <div className="mt-12 space-y-6">
          {papers.map((p) => {
            const authors = authorsByDocId.get(p.id) ?? [];
            const corresponding = authors.find((a) => a.is_corresponding) ?? authors[0];
            return (
              <Card key={p.id} className="group transition-colors hover:border-bronze-500/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl">
                        <Link
                          href={`/research/papers/${p.id}`}
                          className="hover:text-bronze-300 transition-colors"
                        >
                          {p.title}
                        </Link>
                      </CardTitle>
                      {corresponding && (
                        <CardDescription className="mt-1">
                          {corresponding.author_name}
                          {corresponding.affiliation && ` · ${corresponding.affiliation}`}
                          {authors.length > 1 && ` (+${authors.length - 1} co-author${authors.length > 2 ? "s" : ""})`}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="success">Published</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.abstract && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.abstract}</p>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    {p.publication_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.publication_date).toLocaleDateString("en-NZ", {
                          year: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                    {p.venue && <span>{p.venue}</span>}
                    {p.doi && (
                      <span className="font-mono">DOI: {p.doi}</span>
                    )}
                  </div>
                  {Array.isArray(p.keywords) && p.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(p.keywords as string[]).slice(0, 5).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />{kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/research/papers/${p.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-bronze-300 hover:text-bronze-200"
                  >
                    View paper <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
