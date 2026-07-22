import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Shield, Tag, FileText, Quote } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("research_documents")
    .select("title, abstract")
    .eq("id", id)
    .eq("status", "published")
    .eq("access_tier", "open")
    .maybeSingle();
  if (!p) return { title: "Paper not found" };
  return {
    title: p.title,
    description: p.abstract ?? undefined,
  };
}

export default async function ResearchPaperPage({ params }: PageProps) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: paper, error } = await admin
    .from("research_documents")
    .select(
      "id, title, abstract, publication_date, doi, pdf_url, language_code, iwi_consent_id, access_tier, methodology, venue, status, keywords, metadata, created_at",
    )
    .eq("id", id)
    .eq("status", "published")
    .eq("access_tier", "open")
    .maybeSingle();

  if (error || !paper) notFound();

  // Authors, citations, gate in parallel
  const [authorsResult, citationsResult, gateResult] = await Promise.all([
    admin
      .from("research_document_authors")
      .select("author_name, affiliation, position, is_corresponding")
      .eq("document_id", id)
      .order("position"),
    admin
      .from("research_document_citations")
      .select("id, cited_doc_id, cited_release_id, external_url, citation_text")
      .eq("document_id", id),
    paper.iwi_consent_id
      ? admin
          .from("iwi_gates")
          .select("iwi_name, scope, notes")
          .eq("id", paper.iwi_consent_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const authors = authorsResult.data ?? [];
  const citations = citationsResult.data ?? [];
  const gate = gateResult.data;

  // Resolve cited-release titles for display
  const citedReleaseIds = citations
    .map((c) => c.cited_release_id)
    .filter((id): id is string => id !== null);
  const { data: citedReleases } = citedReleaseIds.length
    ? await admin
        .from("releases")
        .select("id, title, metadata")
        .in("id", citedReleaseIds)
    : { data: [] };
  const releaseTitleById = Object.fromEntries(
    (citedReleases ?? []).map((r) => [
      r.id,
      (r.metadata as { slug?: string })?.slug ?? r.title,
    ]),
  );

  return (
    <article className="prose prose-invert mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Link href="/research/papers" className="text-sm text-bronze-300 hover:text-bronze-200">
        ← Back to Research papers
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-bronze-300" />
          <Badge variant="success">Published</Badge>
          {paper.language_code && (
            <Badge variant="outline" className="uppercase">{paper.language_code}</Badge>
          )}
        </div>
        <h1 className="mt-4 font-display">{paper.title}</h1>
        {authors.length > 0 && (
          <p className="mt-2 text-base text-muted-foreground">
            {authors.map((a, i) => (
              <span key={i}>
                {a.author_name}
                {a.affiliation && (
                  <span className="text-sm text-muted-foreground"> ({a.affiliation})</span>
                )}
                {a.is_corresponding && (
                  <sup className="ml-0.5 text-bronze-300" title="Corresponding author">*</sup>
                )}
                {i < authors.length - 1 && " · "}
              </span>
            ))}
          </p>
        )}
      </header>

      <section className="not-prose mt-6 grid gap-3 text-sm">
        {paper.publication_date && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Published {new Date(paper.publication_date).toLocaleDateString("en-NZ", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </div>
        )}
        {paper.venue && (
          <div className="text-muted-foreground">
            <span className="font-semibold">Venue:</span> {paper.venue}
          </div>
        )}
        {paper.doi && (
          <div className="text-muted-foreground">
            <span className="font-semibold">DOI:</span>{" "}
            <a
              href={`https://doi.org/${paper.doi}`}
              className="font-mono text-xs text-bronze-300 hover:text-bronze-200 underline"
              rel="noreferrer"
            >
              {paper.doi}
            </a>
          </div>
        )}
      </section>

      {paper.abstract && (
        <section className="not-prose mt-10">
          <h2 className="font-display text-2xl">Abstract</h2>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{paper.abstract}</p>
        </section>
      )}

      {paper.methodology && (
        <section className="not-prose mt-10">
          <h2 className="font-display text-2xl">Methodology</h2>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{paper.methodology}</p>
        </section>
      )}

      {paper.pdf_url && (
        <section className="not-prose mt-10">
          <Button asChild>
            <a href={paper.pdf_url} target="_blank" rel="noreferrer">
              <FileText className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        </section>
      )}

      {(gate || (Array.isArray(paper.keywords) && paper.keywords.length > 0)) && (
        <section className="not-prose mt-10">
          <Card>
            <CardHeader>
              {gate && (
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-pounamu-300" />
                  <CardTitle className="text-lg">Cultural provenance</CardTitle>
                </div>
              )}
              <CardDescription>
                Every paper that touches cultural material has a documented
                consent lineage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {gate && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Kaitiaki gate
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-medium">{gate.iwi_name}</span>
                    <Badge variant="outline" className="capitalize">
                      {gate.scope.replace("_", " ")}
                    </Badge>
                  </div>
                  {gate.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{gate.notes}</p>
                  )}
                </div>
              )}
              {Array.isArray(paper.keywords) && paper.keywords.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Keywords
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(paper.keywords as string[]).map((kw) => (
                      <Badge key={kw} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />{kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {citations.length > 0 && (
        <section className="not-prose mt-10">
          <h2 className="font-display text-2xl">Citations & cross-links</h2>
          <ul className="mt-3 space-y-2">
            {citations.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Quote className="h-3 w-3 mt-1 shrink-0" />
                {c.cited_release_id ? (
                  <Link
                    href={`/waiata/${releaseTitleById[c.cited_release_id]}`}
                    className="text-bronze-300 hover:text-bronze-200 underline"
                  >
                    {releaseTitleById[c.cited_release_id] ?? c.citation_text}
                  </Link>
                ) : c.external_url ? (
                  <a
                    href={c.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-bronze-300 hover:text-bronze-200 underline break-all"
                  >
                    {c.citation_text ?? c.external_url}
                  </a>
                ) : c.cited_doc_id ? (
                  <Link
                    href={`/research/papers/${c.cited_doc_id}`}
                    className="text-bronze-300 hover:text-bronze-200 underline"
                  >
                    {c.citation_text ?? "Linked paper"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="not-prose mt-10 text-xs text-muted-foreground">
        <p>Record ID: <code className="font-mono">{paper.id}</code></p>
        <p className="mt-1">Created: {new Date(paper.created_at).toLocaleString("en-NZ")}</p>
      </section>
    </article>
  );
}
