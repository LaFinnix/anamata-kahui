import Link from "next/link";
import { Library, BookOpen } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Library · Research & Language",
  description: "Knowledge vault, archived documents, and reference material.",
};

/**
 * /dashboard/library — read-only archive of all research_documents.
 * Cross-link to /research/papers for published work; this surface is
 * for working documents, drafts, and reference material.
 */
export default async function LibraryPage() {
  const supabase = await createServerSupabase();
  const { data: papers } = await supabase
    .from("research_documents")
    .select("id, title, status, year, venue, doi")
    .order("year", { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Research & Language</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Library</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            All research outputs — published, in-review, and archived —
            in one place.
          </p>
        </div>
      </div>

      <section>
        {!papers || papers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              <Library className="mb-2 h-5 w-5 text-bronze-300" />
              Library is empty. Add documents via{" "}
              <Link href="/research" className="text-bronze-300 hover:text-bronze-200 underline">
                /research
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {papers.map((p) => (
              <Link key={p.id} href={`/research/papers/${p.id}`}>
                <Card className="transition-colors hover:border-bronze-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-bronze-300" />
                          <span className="font-medium">{p.title}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {p.venue ?? "Unpublished"}
                          {p.year && ` · ${p.year}`}
                          {p.doi && ` · ${p.doi}`}
                        </div>
                      </div>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
