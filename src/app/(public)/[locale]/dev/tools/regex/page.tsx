import Link from "next/link";
import { ArrowLeft, Regex } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegexPlayground } from "@/components/dev/regex-playground";

export const metadata = {
  title: "Regex playground · Dev tools",
  description:
    "Interactive tool — paste a regex pattern and a test string. See matches highlighted, capture groups listed. Native browser regex, no server.",
};

/**
 * /dev/tools/regex — regex playground.
 *
 * Replaces regex101.com and regexr.com with a less ad-heavy, dependency-free
 * interface. Same underlying browser regex engine.
 */
export default function RegexToolPage() {
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
        <Regex className="h-7 w-7 text-bronze-300" />
        Regex playground
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Type a regex pattern, paste a test string, see matches highlighted
        with capture groups. All processing is client-side using the
        browser&apos;s native regex engine — no data leaves your machine.
      </p>

      <div className="mt-8">
        <RegexPlayground />
      </div>

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Supported flags</CardTitle>
          <CardDescription>
            Standard JS regex flags: <code className="font-mono text-xs">g</code> (global),{" "}
            <code className="font-mono text-xs">i</code> (case-insensitive),{" "}
            <code className="font-mono text-xs">m</code> (multiline),{" "}
            <code className="font-mono text-xs">s</code> (dotall),{" "}
            <code className="font-mono text-xs">u</code> (unicode),{" "}
            <code className="font-mono text-xs">y</code> (sticky),{" "}
            <code className="font-mono text-xs">d</code> (indices).
            Full reference:{" "}
            <Link
              href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              MDN RegExp
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The &quot;Māori vowel (with macron)&quot; preset is included
            specifically for the Anamata Kāhui context — typography
            checks for proper macron usage in titles + body copy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}