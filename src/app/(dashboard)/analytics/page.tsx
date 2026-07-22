import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Analytics · Music (Anamata Records)",
  description: "Stream counts, royalty estimates, and audience geography across the Anamata Records branch.",
};

// NOTE: real numbers come from streaming-platform APIs (Spotify, Apple, etc.)
// which we wire up after the scaffold. For now these cards render zeroed
// placeholders so the dashboard is structurally complete.
export default function AnalyticsPage() {
  const stats = [
    { label: "Streams (30d)",   value: "—", icon: TrendingUp },
    { label: "Active listeners", value: "—", icon: Users },
    { label: "Revenue (30d)",    value: "—", icon: DollarSign },
    { label: "Top markets",      value: "—", icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Music (Anamata Records)</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Stream counts, royalty estimates, and audience geography across the
            Records branch.
          </p>
        </div>
        <Badge variant="outline">Coming soon</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <s.icon className="h-5 w-5 text-bronze-300" />
              <CardTitle className="text-2xl">{s.value}</CardTitle>
              <CardDescription>{s.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wiring plan</CardTitle>
          <CardDescription>
            The next iteration pulls from Spotify Web API, Apple Music Reports,
            and the local distributors. Numbers will populate once the data
            pipeline is built.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>Scheduled job: nightly ingest from Spotify + Apple Music.</li>
            <li>Per-release rollup stored in <code>release_metrics</code>.</li>
            <li>Per-artist dashboard pulled from rollups.</li>
            <li>Royalty splits computed off the local distributor's monthly CSV.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
