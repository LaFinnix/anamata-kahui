import Link from "next/link";
import { Mic2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Commissions · Creative Arts",
  description: "Art commissions, project briefs, and cultural design requests.",
};

export default function CommissionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Creative Arts</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Commissions</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Track active commissions — briefs, scope, deadlines, payment
          status. Inbound briefs surface via{" "}
          <Link href="/contact" className="text-bronze-300 hover:text-bronze-200 underline">
            /contact
          </Link>
          .
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground italic">
          <Mic2 className="mb-2 h-5 w-5 text-bronze-300" />
          No commissions yet. Will populate from inbound enquiries once the
          commissions table ships.
        </CardContent>
      </Card>
    </div>
  );
}
