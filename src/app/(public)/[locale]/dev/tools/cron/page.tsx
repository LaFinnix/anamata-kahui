import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CronPlayground } from "@/components/dev/cron-playground";

export const metadata = {
  title: "Cron expression parser · Dev tools",
  description:
    "Interactive tool — parse cron expressions, see what they do in plain English, and calculate the next 5 runs in your timezone.",
};

/**
 * /dev/tools/cron — cron expression parser + next-runs calculator.
 *
 * Pure client-side; no DB or auth. Replaces crontab.guru and
 * cronmaker.com with a less ugly UI.
 *
 * Supported: standard 5-field cron. Not supported: 6-field
 * (with seconds), quartz-style "@daily" descriptors.
 */
export default function CronToolPage() {
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
        Interactive tool · DevOps
      </Badge>
      <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        <Clock className="h-7 w-7 text-bronze-300" />
        Cron expression parser
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Paste a cron expression, see what it does in plain English, and
        calculate the next runs in your timezone. Standard 5-field
        syntax: <code className="font-mono text-xs">minute hour day-of-month month day-of-week</code>.
        Supports <code className="font-mono text-xs">*</code>,{" "}
        <code className="font-mono text-xs">*/N</code>,{" "}
        <code className="font-mono text-xs">A,B,C</code>,{" "}
        <code className="font-mono text-xs">A-B</code>{" "}
        patterns.
      </p>

      <div className="mt-8">
        <CronPlayground />
      </div>

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-base">About this tool</CardTitle>
          <CardDescription>
            Pure client-side — no server, no auth, no tracking.
            Replaces crontab.guru and cronmaker.com with a less ugly
            interface.{" "}
            <Link
              href="https://vercel.com/docs/cron-jobs"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              Vercel Cron reference
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Anamata Kāhui uses cron for periodic background jobs,
            including the{" "}
            <code className="font-mono text-xs">/api/cron/local-contexts-refresh</code>{" "}
            endpoint that re-syncs the Local Contexts Hub cache every 6
            hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}