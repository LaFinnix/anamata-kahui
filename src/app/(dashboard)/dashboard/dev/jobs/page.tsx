import Link from "next/link";
import { Terminal } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Background jobs · Technology & Dev",
  description: "Cron jobs, scheduled tasks, and async job queue.",
};

export default function JobsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Technology & Dev</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Background jobs</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Cron jobs and async tasks. Includes funding-radar refresh,
          iwi-gate expiry checks, and DSP ingest.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground italic">
          <Terminal className="mb-2 h-5 w-5 text-bronze-300" />
          Cron-job tracking surfaces here once the platform observability
          layer ships. Today:{" "}
          <Link
            href="/opt/data/anamata-kahui/scripts/funding_radar.py"
            className="text-bronze-300 hover:text-bronze-200 underline"
          >
            funding_radar.py
          </Link>{" "}
          runs manually.
        </CardContent>
      </Card>
    </div>
  );
}
