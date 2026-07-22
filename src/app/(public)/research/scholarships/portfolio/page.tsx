import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Users } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import type {
  ScholarshipProgramme,
  ScholarshipPrecedentRecipient,
  ScholarshipEngagement,
} from "@/lib/types";

export const revalidate = 600;
export const metadata = {
  title: "Scholarship portfolio",
  description:
    "Anamata Kāhui's scholarship portfolio — programmes Anamata researchers engage with (active and archived), including the discontinued PMSA precedent and 6 active alternatives.",
};

/**
 * /research/scholarships/portfolio
 *
 * The "portfolio" view: every programme Anamata researchers engage with,
 * each Anamata engagement on record, and historical precedents.
 * The discontinued PMSA is preserved here as a reference and as a model
 * of evaluation criteria applicable to successor programmes.
 */
export default async function ScholarshipPortfolioPage() {
  const admin = createAdminClient();
  const [programmesResult, precedentsResult, engagementsResult] = await Promise.all([
    admin
      .from("scholarship_programmes")
      .select(
        "id, slug, name, host_country, destination, status, amount_text, amount_typical_nzd, duration_text, duration_weeks_min, duration_weeks_max, eligibility_summary, selection_criteria, vision_matauranga, maori_pasifika_priority, url, notes, created_at",
      )
      .order("status", { ascending: false })
      .order("name"),
    admin
      .from("scholarship_precedent_recipients")
      .select("id, programme_id, recipient_name, year, destination_country, host_institution, project_title, description, is_indigenous_led, source_url"),
    admin
      .from("scholarship_engagements")
      .select(
        "id, programme_id, recipient_name, year, status, project_title, project_summary, host_institution, start_date, end_date, amount_awarded_nzd",
      )
      .order("year", { ascending: false }),
  ]);

  const programmes = (programmesResult.data ?? []) as ScholarshipProgramme[];
  const precedents = (precedentsResult.data ?? []) as ScholarshipPrecedentRecipient[];
  const engagements = (engagementsResult.data ?? []) as ScholarshipEngagement[];

  const programmesById = Object.fromEntries(programmes.map((p) => [p.id, p]));
  const activeProgrammes = programmes.filter((p) => p.status === "active");
  const pausedOrArchived = programmes.filter((p) => p.status !== "active");

  const precedentsByProgramme = new Map<string, ScholarshipPrecedentRecipient[]>();
  for (const p of precedents) {
    const arr = precedentsByProgramme.get(p.programme_id) ?? [];
    arr.push(p);
    precedentsByProgramme.set(p.programme_id, arr);
  }

  const engagementsByProgramme = new Map<string, typeof engagements>();
  for (const e of engagements) {
    const arr = engagementsByProgramme.get(e.programme_id) ?? [];
    arr.push(e);
    engagementsByProgramme.set(e.programme_id, arr);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Research portfolio</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Scholarship portfolio
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Every scholarship programme Anamata researchers engage with —
        active, paused, and archived. Discontinued programmes are kept
        here as historical reference and as models of evaluation criteria
        applicable to successor programmes.
      </p>

      {/* Summary stats */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <Stat label="Active programmes" value={activeProgrammes.length} variant="success" />
        <Stat label="Paused / archived" value={pausedOrArchived.length} variant="outline" />
        <Stat
          label="Anamata engagements"
          value={engagements.length}
          sublabel={engagements.length === 0 ? "Awaiting first submission" : "On record"}
        />
      </section>

      {/* Active programmes */}
      <section className="mt-16">
        <h2 className="font-display text-2xl">Active programmes</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Programmes Anamata researchers and partners currently monitor or
          can apply to. Each carries eligibility + selection criteria so a
          new round can be drafted without re-research.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {activeProgrammes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-sm text-muted-foreground italic">
                No active programmes yet.
              </CardContent>
            </Card>
          ) : (
            activeProgrammes.map((p) => (
              <ProgrammeCard
                key={p.id}
                programme={p}
                precedents={precedentsByProgramme.get(p.id) ?? []}
                engagements={engagementsByProgramme.get(p.id) ?? []}
              />
            ))
          )}
        </div>
      </section>

      {/* Discontinued / archived */}
      {pausedOrArchived.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl">Discontinued / archived</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Historical programmes kept as research reference. The PMSA
            discontinuation (effective 1 July 2025) is the largest such
            entry — see{" "}
            <code>docs/PMSA-RESEARCH.md</code> for the full archived
            eligibility analysis.
          </p>
          <div className="mt-6 space-y-4">
            {pausedOrArchived.map((p) => (
              <ProgrammeCard
                key={p.id}
                programme={p}
                precedents={precedentsByProgramme.get(p.id) ?? []}
                engagements={engagementsByProgramme.get(p.id) ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {/* All precedents */}
      <section className="mt-16">
        <h2 className="font-display text-2xl">Historical precedents</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Named recipients from archived programme alumni. Used in funder
          applications to demonstrate the kind of work the programme
          historically funded — and what Anamata's scope overlaps with.
        </p>
        {precedents.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              No precedents on record yet.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {precedents.map((p) => {
              const programme = programmesById[p.programme_id];
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{p.recipient_name}</CardTitle>
                        <CardDescription>
                          {programme?.name ?? "Unknown programme"}
                          {p.year && ` · ${p.year}`}
                          {p.destination_country && ` · ${p.destination_country}`}
                        </CardDescription>
                      </div>
                      {p.is_indigenous_led && (
                        <Badge variant="success">Indigenous-led</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {p.project_title && (
                      <p className="text-sm font-medium">{p.project_title}</p>
                    )}
                    {p.description && (
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    )}
                    {p.host_institution && (
                      <p className="text-xs text-muted-foreground">
                        Host: {p.host_institution}
                      </p>
                    )}
                    {p.source_url && (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-bronze-300 hover:text-bronze-200"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Anamata's own engagements */}
      <section className="mt-16">
        <h2 className="font-display text-2xl">Anamata engagements</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every application, award, or in-progress engagement Anamata
          researchers have on record. Populates as staff add entries via
          the staff dashboard.
        </p>
        {engagements.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              No Anamata engagements on record yet. When the first
              application lands — e.g. CNZ International Arts Impact Round 2
              (24 Aug 2026) — a row will appear here with the recipient,
              year, status, project title, and amount awarded.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {engagements.map((e) => {
              const programme = programmesById[e.programme_id];
              return (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-bronze-300" />
                          <span className="font-medium">{e.recipient_name}</span>
                          <Badge variant="outline" className="capitalize">
                            {e.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {programme?.name ?? "—"} · {e.year}
                          {e.host_institution && ` · ${e.host_institution}`}
                        </p>
                        {e.project_title && (
                          <p className="mt-1 text-sm">{e.project_title}</p>
                        )}
                      </div>
                      {e.amount_awarded_nzd != null && (
                        <div className="text-right">
                          <div className="font-display text-lg text-bronze-300">
                            ${e.amount_awarded_nzd.toLocaleString("en-NZ")}
                          </div>
                          <div className="text-xs text-muted-foreground">awarded</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Call to action */}
      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Why this is here</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Funders ask: "where are your researcher outputs, and what
          scholarships have you mobilised?" We answer with a live page —
          not a PDF. Every programme, every precedent, every Anamata
          engagement is visible without authentication. The discontinued
          PMSA row is here deliberately: it shows we did the homework
          and we're tracking the funding landscape in real time.
        </p>
        <div className="mt-6">
          <Link
            href="/research/scholarships"
            className="inline-flex items-center gap-2 text-sm font-medium text-bronze-300 hover:text-bronze-200"
          >
            ← Back to scholarships overview
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  variant = "default",
}: {
  label: string;
  value: number;
  sublabel?: string;
  variant?: "default" | "success" | "outline";
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={
            variant === "success"
              ? "font-display text-3xl font-semibold text-pounamu-300"
              : variant === "outline"
                ? "font-display text-3xl font-semibold text-muted-foreground"
                : "font-display text-3xl font-semibold text-bronze-300"
          }
        >
          {value}
        </div>
        {sublabel && (
          <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProgrammeCard({
  programme,
  precedents,
  engagements,
}: {
  programme: ScholarshipProgramme;
  precedents: ScholarshipPrecedentRecipient[];
  engagements: ScholarshipEngagement[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{programme.name}</CardTitle>
            <CardDescription className="mt-1">
              {programme.host_country && (
                <span>Host: {programme.host_country}</span>
              )}
              {programme.destination && (
                <span> · Destination: {programme.destination}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={
                programme.status === "active"
                  ? "success"
                  : programme.status === "discontinued"
                    ? "destructive"
                    : "outline"
              }
              className="capitalize"
            >
              {programme.status}
            </Badge>
            {programme.vision_matauranga && (
              <Badge variant="outline" className="text-xs">VM-aligned</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {programme.amount_text && (
          <p className="text-sm">
            <span className="font-medium">Funding:</span> {programme.amount_text}
          </p>
        )}
        {programme.duration_text && (
          <p className="text-sm">
            <span className="font-medium">Duration:</span> {programme.duration_text}
          </p>
        )}
        {programme.eligibility_summary && (
          <p className="text-sm">
            <span className="font-medium">Eligibility:</span> {programme.eligibility_summary}
          </p>
        )}
        {programme.selection_criteria && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Selection:</span> {programme.selection_criteria}
          </p>
        )}
        {programme.url && (
          <a
            href={programme.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
          >
            Official URL <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {precedents.length > 0 && (
          <details className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {precedents.length} historical precedent{precedents.length !== 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {precedents.map((p) => (
                <li key={p.id}>
                  <strong>{p.recipient_name}</strong>
                  {p.destination_country && ` · ${p.destination_country}`}
                  {p.is_indigenous_led && " · Indigenous-led"}
                </li>
              ))}
            </ul>
          </details>
        )}

        {engagements.length > 0 && (
          <div className="rounded-md border border-pounamu-500/30 bg-pounamu-500/10 p-3 text-sm">
            <p className="font-medium">
              {engagements.length} Anamata engagement{engagements.length !== 1 ? "s" : ""} on record
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
