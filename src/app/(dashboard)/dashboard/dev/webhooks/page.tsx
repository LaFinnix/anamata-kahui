import Link from "next/link";
import { Webhook } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Webhooks · Technology & Dev",
  description: "Outbound webhook subscriptions for platform events.",
};

export default function WebhooksPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Technology & Dev</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Configure outbound webhooks for platform events (release status
          changes, kaitiaki approvals, consent-log updates).
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground italic">
          <Webhook className="mb-2 h-5 w-5 text-bronze-300" />
          No webhooks configured. Will surface from{" "}
          <code>subscriptions</code> table once added to schema.
        </CardContent>
      </Card>
    </div>
  );
}
