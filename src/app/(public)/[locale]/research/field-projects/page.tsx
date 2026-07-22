import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, BookOpen, Microscope } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";

export const revalidate = 300;
export const metadata = {
  title: "Field projects",
  description:
    "Active and paused research field projects at Anamata Kāhui — waiata composition work, narrative projects, and cross-cultural studies with iwi-gate metadata visible.",
};

export default async function FieldProjectsPage() {
  const supabase = await createServerSupabase();
  const { data: projects } = await supabase
    .from("research_field_projects")
    .select("id, title, location, start_date, end_date, status, summary, methodology")
    .order("start_date", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Research · Field</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Field projects
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Active and paused research field projects. Each is iwi-gated,
        methodologically scoped, and time-bound. Project state reflects
        current cultural-review status — paused means held by kaitiaki,
        not abandoned.
      </p>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Active"
          value={(projects ?? []).filter((p) => p.status === "active").length}
        />
        <Stat
          label="Paused"
          value={(projects ?? []).filter((p) => p.status === "paused").length}
        />
        <Stat
          label="Total"
          value={(projects ?? []).length}
        />
      </section>

      <section className="mt-16">
        {(!projects || projects.length === 0) ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              No field projects yet. Projects populate here as research
              work begins.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {projects.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Microscope className="h-5 w-5 text-bronze-300" />
                        <CardTitle className="text-lg">{p.title}</CardTitle>
                      </div>
                      {p.location && (
                        <CardDescription className="mt-1">
                          <MapPin className="inline h-3 w-3" /> {p.location}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      variant={
                        p.status === "active"
                          ? "success"
                          : p.status === "paused"
                            ? "outline"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.summary && (
                    <p className="text-sm text-muted-foreground">{p.summary}</p>
                  )}
                  {p.methodology && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        Methodology
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.methodology}</p>
                    </div>
                  )}
                  {(p.start_date || p.end_date) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {p.start_date && new Date(p.start_date).toLocaleDateString("en-NZ", { year: "numeric", month: "short" })}
                      {p.start_date && p.end_date && " → "}
                      {p.end_date && new Date(p.end_date).toLocaleDateString("en-NZ", { year: "numeric", month: "short" })}
                      {p.start_date && !p.end_date && " (ongoing)"}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Why these are public</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Field project state is published for transparency. Funders asking
          "what research is actually happening?" get a live answer. Held
          projects (status: paused) are deliberately listed — it shows
          the cultural-review pipeline is real, not theatrical.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
