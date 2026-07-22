import { HubSyncSearch } from "@/components/local-contexts/hub-sync-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Hub sync · Admin",
  description: "Bulk-sync Local Contexts Hub projects with Anamata assets.",
};

/**
 * /dashboard/admin/hub-sync — admin tool for finding existing Hub
 * Projects and linking them to Anamata releases / papers.
 *
 * Workflows:
 *   1. **By DOI** — paste a publication DOI to find an existing Hub
 *      Project linked to that work (e.g. if a researcher already
 *      created labels for a paper via the Hub directly).
 *   2. **By Anamata id** — paste a release or paper UUID to check
 *      whether it has any matching Hub Projects.
 *   3. **Bulk reconcile** — pass a list of asset ids; we'll attempt
 *      to find matches for each and return suggestions.
 */
export default function HubSyncPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Admin</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          Hub sync
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Search the Local Contexts Hub for existing Projects and link
          them to Anamata releases and research papers.
        </p>
      </div>

      <HubSyncSearch />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Hub integration works</CardTitle>
          <CardDescription>
            Read this before reaching out to Local Contexts support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>1. Create a Project</strong> at{" "}
            <a
              href="https://localcontextshub.org"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              localcontextshub.org
            </a>
            . Add TK/BC/Notice labels to your project.
          </p>
          <p>
            <strong>2. Find the UUID</strong> in the URL of your project
            page (e.g.{" "}
            <code className="text-xs">/projects/<strong>9f8a2c0b-1234-5678-90ab-cdef12345678</strong>/</code>
            ).
          </p>
          <p>
            <strong>3. Paste the UUID</strong> into the Label Manager on
            the matching asset's dashboard page (e.g.{" "}
            <code className="text-xs">/releases/[id]</code>).
          </p>
          <p>
            <strong>4. Refresh</strong> — the dashboard calls{" "}
            <code className="text-xs">GET /projects/{`{uuid}`}/</code> on
            the Hub, caches the labels, and refreshes them every 6 hours
            via Vercel Cron.
          </p>
          <p className="text-xs text-muted-foreground">
            Without Integration Partner status, only Hub Projects on our
            own Hub account are visible. Email{" "}
            <a
              href="mailto:support@localcontexts.org"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              support@localcontexts.org
            </a>{" "}
            to enable cross-account visibility.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
