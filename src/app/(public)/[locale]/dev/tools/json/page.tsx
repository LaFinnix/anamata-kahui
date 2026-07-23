import Link from "next/link";
import { ArrowLeft, Braces } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonPlayground } from "@/components/dev/json-playground";

export const metadata = {
  title: "JSON viewer / formatter / diff · Dev tools",
  description:
    "Interactive tool — paste JSON to view as a tree, format with 2-space indent, or diff two JSONs. Pure client-side, no eval.",
};

/**
 * /dev/tools/json — JSON viewer, formatter, and diff.
 *
 * Replaces jsonformatter.org, jsondiff.com, and jsonviewer.stack.hu
 * with a single, fast, dependency-light tool.
 */
export default function JsonToolPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/dev"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Dev &amp; Tech
      </Link>

      <Badge variant="outline" className="mt-6 mb-4">
        Interactive tool · Universal
      </Badge>
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        <Braces className="h-7 w-7 text-bronze-300" />
        JSON viewer · formatter · diff
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Three modes: <strong>View</strong> as a collapsible tree,{" "}
        <strong>Format</strong> with 2-space indent, or <strong>Diff</strong>{" "}
        two JSONs side-by-side. All processing is client-side — no data
        leaves your browser.
      </p>

      <div className="mt-8">
        <JsonPlayground />
      </div>

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Why this exists</CardTitle>
          <CardDescription>
            Every team that touches an API needs a JSON tool. The popular
            ones (jsonformatter.org, jsondiff.com) work but look terrible
            and run ads. This is the same UX, no ads, no tracking,
            accessible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The Anamata Records waiata metadata in the sample is a
            realistic example — waiata metadata + iwi consent + Local
            Contexts labels. Useful for previewing how a release's
            public JSON would look.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}