import { Plus, FileText, FolderArchive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Research portal" };

export default function ResearchDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Research portal
          </h1>
          <p className="mt-1 text-muted-foreground">
            Knowledge vault, document archives, and live field projects.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Submit document
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <FolderArchive className="h-5 w-5 text-bronze-300" />
            <CardTitle>Archive</CardTitle>
            <CardDescription>Browse the document vault.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — table not yet created</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              The <code>research_documents</code> table ships in the next
              migration with full-text search and iwi-gate metadata.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-5 w-5 text-bronze-300" />
            <CardTitle>Field projects</CardTitle>
            <CardDescription>Track active fieldwork.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — table not yet created</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Each project tracks consent metadata, location, iwi partner, and
              transcription progress.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
