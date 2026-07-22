import { Image as ImageIcon, Folder, Palette, Plus } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Galleries · Creative Arts",
  description: "Visual arts galleries, portfolios, and commissions.",
};

export default function ArtsDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Creative Arts</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Galleries</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Galleries, portfolios, and commission tracking for the Creative Arts branch.
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4" />
          New commission
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Folder className="h-5 w-5 text-bronze-300" />
            <CardTitle>Galleries</CardTitle>
            <CardDescription>Curated collections of visual work.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — table not yet created</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              The <code>galleries</code> table ships in a follow-up migration
              alongside per-artist <code>portfolios</code> and commission intake.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ImageIcon className="h-5 w-5 text-bronze-300" />
            <CardTitle>Digital media</CardTitle>
            <CardDescription>Generative, motion, and interactive pieces.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — table not yet created</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Edge-cached media will live in the <code>media</code> storage
              bucket (public read, RLS-scoped writes).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Palette className="h-5 w-5 text-bronze-300" />
            <CardTitle>Portfolios</CardTitle>
            <CardDescription>Per-artist provenance and exhibition history.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — table not yet created</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Plus className="h-5 w-5 text-bronze-300" />
            <CardTitle>Commissions</CardTitle>
            <CardDescription>Brief intake and project tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — table not yet created</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
