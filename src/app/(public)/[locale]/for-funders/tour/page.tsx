import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Users,
  Megaphone,
  ShieldCheck,
  Award,
  Globe,
  Sparkles,
  Info,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TonoCard } from "@/components/tono/tono-card";
import { CollaborationActivityRow } from "@/components/collaborations/collaboration-activity-row";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { TOUR_STOPS, type TourStop } from "@/lib/press/system-tour";
import {
  domainLabel,
  type EndorsementEntry,
} from "@/lib/queries/collaborations";

/**
 * /for-funders/tour — guided walkthrough of the kāhui collaboration
 * marketplace for Creative NZ, foundation, and iwi-funder reports.
 *
 * Each "stop" tells a slice of the cultural-lineage story:
 *   1. A kaikōrero joins and declares their knowledge areas
 *   2. They post a tono — asking for cross-iwi help
 *   3. The tono inbox — other kaikōrero see what they can help with
 *   4. Proposal + acceptance — the working loop
 *   5. Cultural review + auto-endorsement — kaitiaki gate
 *   6. The public lineage — visible, append-only, no aggregates
 *
 * The page renders the *actual* UI components (where possible) so a
 * funder can see the real design language rather than a mockup.
 */

export const metadata = {
  title: "System tour · For funders · Anamata Kāhui",
  description:
    "A guided walkthrough of the kāhui collaboration marketplace. From a kaikōrero joining, to cross-iwi help, to the public cultural lineage.",
};

export default function SystemTourPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href="/for-funders"
          className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to funder evidence
        </Link>
        <Badge variant="outline" className="w-fit">
          System tour
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          How a waiata moves through the kāhui
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Six screens, end to end. A new kaikōrero joins, asks for help
          across iwi, accepts a proposal, has the work kaitiaki-reviewed,
          and ends up in the public cultural lineage that funders can
          inspect.
        </p>
      </header>

      {/* TOC */}
      <nav className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          The walkthrough
        </p>
        <ol className="mt-3 space-y-1 text-sm">
          {TOUR_STOPS.map((s) => (
            <li key={s.n}>
              <a
                href={`#stop-${s.n}`}
                className="flex items-center gap-2 text-foreground hover:text-bronze-300"
              >
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                  {s.n}
                </span>
                <span>{s.title}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.subtitle}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Stops */}
      {TOUR_STOPS.map((stop) => (
        <section
          key={stop.n}
          id={`stop-${stop.n}`}
          className="space-y-4 border-t border-border pt-8"
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-semibold tabular-nums text-bronze-300">
              {String(stop.n).padStart(2, "0")}
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {stop.title}
              </h2>
              <p className="text-sm text-muted-foreground">{stop.subtitle}</p>
            </div>
          </div>

          <p className="text-foreground">{stop.intro}</p>

          <StopMockup stop={stop} />

          <DesignNote title="Cultural-integrity decision">
            {stop.designNote}
          </DesignNote>
        </section>
      ))}

      {/* Closing */}
      <section className="mt-12 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">What a funder sees</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every endorsement is a public, append-only record. Every
          tono is dashboard-private while open and only joins the public
          lineage once it&rsquo;s resolved. There are no aggregate
          scores on individuals, no leaderboards, no ratings. The
          kāhui surfaces specific, verifiable contribution — not
          popularity.
        </p>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          When a Creative NZ assessor clicks into a kaikōrero, they see
          a cultural lineage: who carried which knowledge into which
          work, who endorsed whom, and which tono landed. The audit
          trail is the system.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/for-funders"
            className="inline-flex items-center gap-1 text-sm text-bronze-300 underline hover:text-bronze-200"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to funder evidence
          </Link>
          <Link
            href="/collaborations"
            className="inline-flex items-center gap-1 text-sm text-bronze-300 underline hover:text-bronze-200"
          >
            <Globe className="h-3 w-3" />
            See the live public collaborations index
          </Link>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mocked-up screens                                                          */
/* -------------------------------------------------------------------------- */

function StopMockup({ stop }: { stop: TourStop }) {
  switch (stop.n) {
    case 1:
      return <Stop1Mockup />;
    case 2:
      return <Stop2Mockup />;
    case 3:
      return <Stop3Mockup />;
    case 4:
      return <Stop4Mockup />;
    case 5:
      return <Stop5Mockup />;
    case 6:
      return <Stop6Mockup />;
    default:
      return null;
  }
}

function Stop1Mockup() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
          <Sparkles className="h-3 w-3" />
          Kaikōrero profile editor
        </div>
        <CardTitle className="text-lg">What you carry knowledge of</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bio */}
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cultural-knowledge bio
          </p>
          <p className="mt-1 text-sm">
            I carry pūrākau of Tāne-rore and the Tāne-mahuta kōrero of
            Ngāti Whātua. I can help verify the cultural accuracy of
            waiata about Tāne and the te ao mārama cycle.
          </p>
        </div>

        {/* Knowledge areas (chip cloud) */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Knowledge areas (with iwi/region scope)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <KnowledgeChip domain="purakau" scope="Ngāti Whātua ki Ōrākei" />
            <KnowledgeChip domain="whakapapa" scope="Tāmaki Makaurau" />
            <KnowledgeChip domain="waiata" scope="Ngāti Whātua ki Ōrākei" />
            <KnowledgeChipAdd />
          </div>
        </div>

        {/* Opt-in */}
        <div className="rounded-md border border-bronze-400/30 bg-bronze-400/5 p-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-pounamu-300" />
            <span className="font-medium">Visible in the Kaikōrero directory</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Both this profile and the public-directory opt-in must be set
            to appear in the directory.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function KnowledgeChip({ domain, scope }: { domain: string; scope: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs">
      <span className="font-medium">{domainLabel(domain as never)}</span>
      <span className="text-muted-foreground">· {scope}</span>
    </span>
  );
}

function KnowledgeChipAdd() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-3 py-1 text-xs text-muted-foreground">
      + Add area
    </span>
  );
}

function Stop2Mockup() {
  // Render the actual TonoCard component with a representative example.
  const exampleTono = {
    id: "demo-tono-1",
    creator_id: "demo-creator",
    work_id: null,
    help_type: "verify_narrative" as const,
    knowledge_domain: "purakau" as const,
    scope_iwi: "Ngāti Porou",
    scope_region: "Tairāwhiti",
    request_body:
      "I've written a waiata about the Tāne-mahuta story that draws on our iwi's telling, but I want a kaikōrero who carries Ngāti Porou's specific version to verify the pūrākau before I record. Tautoko welcome.",
    offered_koha: "Co-credit on release + reciprocity later",
    koha_is_monetary: false,
    visibility: "open" as const,
    status: "open" as const,
    fulfilled_by: null,
    fulfilled_at: null,
    closed_at: null,
    created_at: "2026-07-23T00:00:00Z",
    updated_at: "2026-07-23T00:00:00Z",
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
          <Megaphone className="h-3 w-3" />
          Compose tono
        </div>
        <CardTitle className="text-lg">Help request preview</CardTitle>
      </CardHeader>
      <CardContent>
        <TonoCard
          tono={exampleTono as never}
          perspective="creator"
          creator={{
            id: "demo-creator",
            full_name: "Mere (Ngāti Porou)",
            iwi_affiliation_attested: ["Ngāti Porou"],
          }}
          hasProposed={false}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Tono board view, creator perspective. Visibility tier shown
          (open / iwi_specific / invited). The request body is visible
          to the creator&rsquo;s own dashboard; iwi_specific tono are
          only visible to attested members of the scope iwi.
        </p>
      </CardContent>
    </Card>
  );
}

function Stop3Mockup() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
          <Users className="h-3 w-3" />
          Tono inbox
        </div>
        <CardTitle className="text-lg">Open tono you can help with</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filter
            </span>
            <span className="rounded border border-bronze-400/40 bg-bronze-400/10 px-2 py-0.5 text-xs">
              Knowledge: Pūrākau
            </span>
            <span className="rounded border border-bronze-400/40 bg-bronze-400/10 px-2 py-0.5 text-xs">
              Iwi: Ngāti Whātua ki Ōrākei
            </span>
            <span className="text-xs text-muted-foreground">· 3 tono match</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Server-side filter. Only iwi_specific tono where the viewer&rsquo;s
            attested set includes scope_iwi. Claimed iwi is ignored here.
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {[
            { creator: "Anamata Records", body: "Need pūrākau verification on 'Tada Koe Hitotsu'…", domain: "purakau" },
            { creator: "Te Rerenga Studio", body: "Looking for a co-creator for a pūrākau cycle about Hine-nui-te-pō…", domain: "purakau" },
            { creator: "Mahaki Rōpū", body: "Tāne-mahuta narrative — would value your cultural check…", domain: "purakau" },
          ].map((row, i) => (
            <li key={i} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{row.creator}</span>
                <Badge variant="secondary" className="text-xs">
                  {domainLabel(row.domain as never)}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{row.body}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stop4Mockup() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
          <Megaphone className="h-3 w-3" />
          Tono detail
        </div>
        <CardTitle className="text-lg">In conversation — the working loop</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Mere</span>{" "}
          (Ngāti Porou) · proposal accepted by{" "}
          <span className="font-medium text-foreground">Hine</span>{" "}
          (Ngāti Whātua ki Ōrākei)
        </p>
        <p className="rounded-md border border-pounamu-400/40 bg-pounamu-400/5 p-3 text-sm">
          <span className="font-medium">In conversation.</span> Hine is
          reviewing the pūrākau of Tāne-mahuta. Once verified, Mere will
          mark the tono fulfilled, which auto-creates a co_creator
          endorsement from Mere → Hine.
        </p>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Privacy</p>
          <p className="mt-1">
            The proposal text and any decline reasons stay private to the
            two parties. Only the fulfilled outcome joins the public
            lineage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stop5Mockup() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
          <ShieldCheck className="h-3 w-3" />
          Cultural review
        </div>
        <CardTitle className="text-lg">Kaitiaki review and auto-endorsement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-pounamu-400/40 bg-pounamu-400/5 p-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-pounamu-300" />
            <span className="font-medium">Release approved</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cultural review audit row written to
            {" "}<code className="text-xs">cultural_review_cycles</code>{" "}
            (append-only).
          </p>
        </div>
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Auto-endorsements created for split_participants
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Award className="mr-1 inline h-3 w-3 text-bronze-300" />
              Hine receives: <em>co_creator</em> from Mere
              (Hine&rsquo;s contribution_count + 1)
            </li>
            <li>
              <Award className="mr-1 inline h-3 w-3 text-bronze-300" />
              [Other split participant] receives: <em>co_creator</em> from Mere
            </li>
          </ul>
        </div>
        <p className="rounded-md border border-bronze-400/30 bg-bronze-400/5 p-3 text-xs text-muted-foreground">
          <Info className="mr-1 inline h-3 w-3" />
          If the endorsement insert fails, the cultural-review audit row
          is preserved. The audit is sacred; endorsements are derived
          state.
        </p>
      </CardContent>
    </Card>
  );
}

function Stop6Mockup() {
  // Render the actual CollaborationActivityRow with a representative
  // endorsement entry, plus a small notifications bell showing the
  // end-user experience.
  const sampleEndorsement: EndorsementEntry = {
    kind: "endorsement",
    key: "demo-endorsement-1",
    created_at: "2026-07-23T15:30:00Z",
    status: "active",
    revocation_reason: null,
    endorsement_type: "co_creator",
    knowledge_domain: "purakau",
    scope_iwi: "Ngāti Whātua ki Ōrākei",
    scope_region: "Tāmaki Makaurau",
    notes:
      "Hine carried the pūrākau of Tāne-mahuta and verified the narrative across multiple drafts. Her contribution shaped the recording.",
    endorser: {
      id: "demo-creator",
      full_name: "Mere",
      iwi_affiliation_attested: ["Ngāti Porou"],
    },
    recipient: {
      id: "demo-recipient",
      full_name: "Hine",
      iwi_affiliation_attested: ["Ngāti Whātua ki Ōrākei"],
    },
    work: {
      id: "demo-work-1",
      title: "Tada Koe Hitotsu",
      slug: "tada-koe-hitotsu",
    },
  };
  return (
    <div className="space-y-4">
      {/* Bell + notification peek */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
            <Sparkles className="h-3 w-3" />
            Inbox notification
          </div>
          <CardTitle className="text-lg">The kaikōrero sees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <p className="text-sm text-muted-foreground">
              A bell badge surfaces the new endorsement. The user can
              drill into the lineage.
            </p>
            <NotificationBell
              initialNotifications={[
                {
                  id: "demo-notif-1",
                  recipient_id: "demo-recipient",
                  kind: "endorsement_received",
                  payload: {
                    work_id: "demo-work-1",
                    work_slug: "tada-koe-hitotsu",
                  },
                  read_at: null,
                  created_at: "2026-07-23T15:30:00Z",
                },
              ]}
              initialUnreadCount={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Public lineage card */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          The public lineage (visible on Hine&rsquo;s kaikōrero profile and the
          collaborations index)
        </p>
        <CollaborationActivityRow entry={sampleEndorsement} />
      </div>

      <p className="rounded-md border border-bronze-400/30 bg-bronze-400/5 p-3 text-sm text-muted-foreground">
        <Globe className="mr-1 inline h-3 w-3" />
        No aggregate counts on Hine&rsquo;s profile. No &ldquo;47
        endorsements&rdquo; badge. Specificity over aggregation — see
        PLAN §4.3.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline design-note callout                                                  */
/* -------------------------------------------------------------------------- */

function DesignNote({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-foreground">{children}</p>
    </div>
  );
}
