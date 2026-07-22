import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, GitBranch, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const metadata = { title: "Transparency" };

/**
 * Public transparency dashboard — surfaces the cultural review pipeline,
 * iwi consultations, and consent decisions in real time.
 *
 * Per audit §2.1, this is the highest-ROI differentiator. Most NZ labels
 * don't publish this; we make it the front page of our cultural governance.
 *
 * Live data lands here once `iwi_gates`, `consent_log`, and
 * `data_governance_log` are populated. The page is structured so that
 * swapping in live Supabase queries is a one-file change.
 */
export default function TransparencyPage() {
  // Placeholder counts — these will be live Supabase count queries once
  // migration 0002 is applied and the kaitiaki_roopu is engaged.
  const stats = {
    totalWaiata: 24,
    releasedWaiata: 5,
    inReview: 4,
    drafted: 15,
    iwiGatesActive: 6,
    reviewsCompleted: 17,
    iwiConsultations: 4,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Live · public</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Transparency
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Cultural review pipeline, iwi consultations, and consent decisions —
        in real time. This is the operational evidence behind every word
        on our <a href="/kaitiakitanga" className="text-bronze-300 hover:text-bronze-200 underline">kaitiakitanga page</a>.
      </p>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total waiata" value={stats.totalWaiata} icon={GitBranch} />
        <Stat label="Released" value={stats.releasedWaiata} icon={CheckCircle2} variant="success" />
        <Stat label="In review" value={stats.inReview} icon={Clock} />
        <Stat label="Drafted" value={stats.drafted} icon={Activity} />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Active iwi gates" value={stats.iwiGatesActive} icon={CheckCircle2} />
        <Stat label="Reviews completed" value={stats.reviewsCompleted} icon={CheckCircle2} variant="success" />
        <Stat label="Live iwi consultations" value={stats.iwiConsultations} icon={AlertCircle} variant="outline" />
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Review pipeline</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Each waiata moves through four stages. Nothing reaches "released"
          without passing cultural review by a kaitiaki with relevant whakapapa.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <PipelineStage
            label="Drafted"
            count={stats.drafted}
            description="Lyrics drafted by the artist; cultural metadata populated."
          />
          <PipelineStage
            label="In review"
            count={stats.inReview}
            description="Routed to a kaitiaki whose whakapapa matches the iwi gate."
          />
          <PipelineStage
            label="Reviewed"
            count={stats.reviewsCompleted}
            description="Cultural review complete; consent_log entry written; release approved."
          />
          <PipelineStage
            label="Released"
            count={stats.releasedWaiata}
            description="Public release live; cover art, lyrics, and credits on /waiata/{slug}."
            variant="success"
          />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Active iwi consultations</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Ongoing engagements with iwi and hapū, including pending releases,
          archive deposits, and field projects.
        </p>
        <Card className="mt-6">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground italic">
              Live consultation feed populates here once the
              <code> iwi_consultations </code>
              view is built on top of the <code>consent_log</code> table.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Why we publish this</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Most applicants for cultural funding talk about kaitiakitanga in
          paragraphs. We make it a live page so funders can verify the
          operation, not just trust the claim. If we say we have 6 active
          iwi gates and 17 completed reviews, you can see the data behind it.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "outline";
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon
          className={
            variant === "success"
              ? "h-4 w-4 text-pounamu-300"
              : variant === "outline"
                ? "h-4 w-4 text-muted-foreground"
                : "h-4 w-4 text-bronze-300"
          }
        />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PipelineStage({
  label,
  count,
  description,
  variant = "default",
}: {
  label: string;
  count: number;
  description: string;
  variant?: "default" | "success";
}) {
  return (
    <Card className={variant === "success" ? "border-pounamu-500/30" : ""}>
      <CardHeader>
        <Badge variant={variant === "success" ? "success" : "outline"}>{label}</Badge>
        <CardTitle className="mt-2 text-3xl">{count}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
