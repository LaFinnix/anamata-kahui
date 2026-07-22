import { Code2, KeyRound, Webhook, Terminal } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dev console" };

export default function DevConsolePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Dev console</h1>
        <p className="mt-1 text-muted-foreground">
          Internal tooling, API keys, and webhook configuration.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <KeyRound className="h-5 w-5 text-bronze-300" />
            <CardTitle>API keys</CardTitle>
            <CardDescription>Issue scoped tokens for integrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">Manage keys</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Webhook className="h-5 w-5 text-bronze-300" />
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>Configure outbound webhooks for events.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">Manage webhooks</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Code2 className="h-5 w-5 text-bronze-300" />
            <CardTitle>Client tools</CardTitle>
            <CardDescription>Per-client dashboards and utilities.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">Open tools</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Terminal className="h-5 w-5 text-bronze-300" />
            <CardTitle>Automation jobs</CardTitle>
            <CardDescription>Cron + scheduled scripts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">Manage jobs</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
