/**
 * Funder / Press Kit — PDF generator.
 *
 * Server-side route handler. Aggregates the same data as /press and
 * renders it via @react-pdf/renderer. No headless Chrome required.
 *
 * Returns a PDF attachment with a timestamped filename.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import { getFunderKitData } from "@/lib/press/funder-kit-data";
import type { FunderKitData } from "@/lib/press/funder-kit-data";
import { TOUR_STOPS } from "@/lib/press/system-tour";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const COLORS = {
  bronze: "#A17B4F",
  bronzeLight: "#D4B98C",
  bronzeDark: "#5C4528",
  ink: "#1A1A1A",
  inkSoft: "#4A4A4A",
  inkMuted: "#7A7A7A",
  paper: "#FAF7F2",
  rule: "#E0D9CC",
  pounamu: "#3D6B5E",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontSize: 10,
    color: COLORS.ink,
    backgroundColor: COLORS.paper,
    fontFamily: "Helvetica",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bronze,
    marginRight: 8,
  },
  brandText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.bronze,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  h1: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 8,
    marginTop: 12,
  },
  tagline: {
    fontSize: 11,
    color: COLORS.inkSoft,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  generatedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.rule,
    paddingTop: 8,
    marginTop: 12,
  },
  generatedLabel: {
    fontSize: 8,
    color: COLORS.inkMuted,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  generatedValue: {
    fontSize: 9,
    color: COLORS.ink,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bronzeLight,
  },
  paragraph: {
    fontSize: 10,
    color: COLORS.inkSoft,
    marginBottom: 6,
    lineHeight: 1.5,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  statBox: {
    width: "24%",
    paddingRight: 6,
    paddingVertical: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.bronze,
  },
  statLabel: {
    fontSize: 8,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  branchIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: COLORS.bronzeLight,
    marginRight: 10,
  },
  branchName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  branchDesc: {
    fontSize: 9,
    color: COLORS.inkSoft,
    lineHeight: 1.4,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  teamName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  teamRole: {
    fontSize: 8,
    color: COLORS.bronze,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  teamBio: {
    fontSize: 9,
    color: COLORS.inkSoft,
    lineHeight: 1.4,
    marginTop: 2,
  },
  exemplarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  exemplarTitle: {
    fontSize: 9,
    color: COLORS.ink,
    flex: 1,
  },
  exemplarBadge: {
    fontSize: 8,
    color: COLORS.pounamu,
    fontFamily: "Helvetica-Bold",
  },
  tourStopNumber: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.bronze,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tourStopTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 4,
  },
  tourStopIntro: {
    fontSize: 9,
    color: COLORS.inkSoft,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  tourStopDecision: {
    fontSize: 8,
    color: COLORS.inkSoft,
    fontStyle: "italic",
    lineHeight: 1.4,
    marginBottom: 10,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.bronze,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  linkLabel: {
    fontSize: 9,
    color: COLORS.inkSoft,
  },
  linkUrl: {
    fontSize: 9,
    fontFamily: "Courier",
    color: COLORS.bronze,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    fontSize: 8,
    color: COLORS.inkMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.rule,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function FunderKitDocument({ data }: { data: FunderKitData }) {
  const generatedDate = new Date(data.generated_at);

  return (
    <Document
      title={`Anamata Kāhui — Funder Pack — ${generatedDate.toISOString().slice(0, 10)}`}
      author="Anamata Kāhui"
      subject="Press & Funder Kit"
    >
      {/* COVER + SUMMARY */}
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>Anamata Kāhui · Press &amp; Funder Pack</Text>
        </View>

        <Text style={styles.h1}>{data.brand.name}</Text>
        <Text style={styles.tagline}>{data.brand.tagline}</Text>

        <View style={styles.generatedRow}>
          <Text style={styles.generatedLabel}>Generated</Text>
          <Text style={styles.generatedValue}>
            {generatedDate.toLocaleString("en-NZ", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <Text style={styles.h2}>Four branches, one Kāhui</Text>
        {data.branches.map((b) => (
          <View key={b.slug} style={styles.branchRow}>
            <View style={styles.branchIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.branchName}>{b.name}</Text>
              <Text style={styles.branchDesc}>{b.one_liner}</Text>
              <Text style={[styles.branchDesc, { color: COLORS.bronze, marginTop: 2 }]}>
                {data.brand.url}{b.public_url}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.h2}>Live impact metrics</Text>
        <Text style={styles.paragraph}>
          Figures below are pulled directly from the platform database — the
          same numbers that appear on the public /impact page and the
          /press landing page.
        </Text>
        <View style={styles.statGrid}>
          <StatBox label="Released waiata" value={data.impact.released_waiata} />
          <StatBox label="Active iwi gates" value={data.impact.active_iwi_gates} />
          <StatBox label="Research papers" value={data.impact.research_papers} />
          <StatBox label="Field projects" value={data.impact.research_field_projects} />
          <StatBox label="Scholarship engagements" value={data.impact.scholarship_engagements} />
          <StatBox label="Local Contexts labels" value={data.impact.local_contexts_labels_applied} />
          <StatBox label="Consent log entries" value={data.impact.consent_log_entries} />
          <StatBox label="Data governance events" value={data.impact.data_governance_log_entries} />
        </View>

        <View style={styles.footer} fixed>
          <Text>Anamata Kāhui · {data.brand.email} · {data.brand.url}</Text>
          <Text>Page 1</Text>
        </View>
      </Page>

      {/* CULTURAL PROVENANCE + FUNDING + TEAM */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Cultural provenance — Local Contexts</Text>
        <Text style={styles.paragraph}>
          Every waiata and research output can carry machine-readable
          Traditional Knowledge (TK) and Biocultural (BC) labels via our
          integration with Local Contexts Hub. Labels travel with the file
          and are visible on the public-facing pages.
        </Text>
        <View style={styles.statGrid}>
          <StatBox label="TK labels applied" value={data.cultural_provenance.label_count_by_family.tk} />
          <StatBox label="BC labels applied" value={data.cultural_provenance.label_count_by_family.bc} />
          <StatBox label="Notices active" value={data.cultural_provenance.label_count_by_family.notice} />
        </View>
        {data.cultural_provenance.exemplar_projects.length > 0 && (
          <>
            <Text style={[styles.paragraph, { marginTop: 8, fontFamily: "Helvetica-Bold" }]}>
              Exemplar projects with Local Contexts labels:
            </Text>
            {data.cultural_provenance.exemplar_projects.map((p, i) => (
              <View key={i} style={styles.exemplarRow}>
                <Text style={styles.exemplarTitle}>{p.title}</Text>
                <Text style={styles.exemplarBadge}>
                  {p.hub_label_count} label{p.hub_label_count === 1 ? "" : "s"}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.h2}>Funding posture</Text>
        <Text style={styles.paragraph}>
          Live status across our funding application pipeline. Funder names
          are deliberately not listed here — see our /funding page for the
          public portfolio. All applications are recorded in the data
          governance log.
        </Text>
        <View style={styles.statGrid}>
          <StatBox label="Planned" value={data.funding_status.planned} />
          <StatBox label="Pending" value={data.funding_status.pending} />
          <StatBox label="Awarded" value={data.funding_status.awarded} />
          <StatBox label="Declined" value={data.funding_status.declined} />
        </View>

        {data.team.length > 0 && (
          <>
            <Text style={styles.h2}>Team profiles</Text>
            <Text style={styles.paragraph}>
              Public team profiles from the platform.
            </Text>
            {data.team.map((p, i) => (
              <View key={i} style={styles.teamRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teamName}>{p.full_name}</Text>
                  <Text style={styles.teamRole}>{p.role.replace("_", " ")}</Text>
                  {p.bio && <Text style={styles.teamBio}>{p.bio}</Text>}
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>Anamata Kāhui · {data.brand.email} · {data.brand.url}</Text>
          <Text>Page 2</Text>
        </View>
      </Page>

      {/* AUDIT & ACCOUNTABILITY */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Audit &amp; accountability</Text>
        <Text style={styles.paragraph}>
          The platform is open-source. Every consent decision, data
          governance event, and cultural gate is recorded in an
          append-only audit log. Reviewers can read the source, run
          their own checks, and verify the numbers above match the
          database.
        </Text>

        <Text style={[styles.paragraph, { fontFamily: "Helvetica-Bold" }]}>
          Public accountability links:
        </Text>

        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Source code: </Text>
          <Text style={styles.linkUrl}>{data.accountability.github_repo}</Text>
        </View>
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Transparency index: </Text>
          <Text style={styles.linkUrl}>{data.accountability.docs_index}</Text>
        </View>
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Privacy notice: </Text>
          <Text style={styles.linkUrl}>{data.accountability.privacy_notice}</Text>
        </View>
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Terms of use: </Text>
          <Text style={styles.linkUrl}>{data.accountability.terms_of_use}</Text>
        </View>
        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Accessibility: </Text>
          <Text style={styles.linkUrl}>{data.accountability.accessibility_statement}</Text>
        </View>

        <Text style={styles.h2}>Press &amp; media assets</Text>
        <Text style={styles.paragraph}>{data.press_assets.description}</Text>
        <Text style={[styles.paragraph, { color: COLORS.bronze }]}>
          Contact: {data.press_assets.contact_email}
        </Text>

        <View
          style={{
            marginTop: 24,
            padding: 12,
            backgroundColor: "#F0EAD9",
            borderRadius: 4,
          }}
        >
          <Text style={[styles.paragraph, { fontFamily: "Helvetica-Bold" }]}>
            Use of this pack
          </Text>
          <Text style={styles.paragraph}>
            This document is regenerated on each download. Numbers reflect
            the platform database as of the timestamp above. For an
            always-current version, visit {data.brand.url}/press.
          </Text>
          <Text style={[styles.paragraph, { color: COLORS.inkMuted, fontSize: 8 }]}>
            Released under CC BY 4.0 — please attribute to Anamata Kāhui and
            link to {data.brand.url}.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Anamata Kāhui · {data.brand.email} · {data.brand.url}</Text>
          <Text>Page 3</Text>
        </View>
      </Page>

      {/* SYSTEM TOUR — a condensed text version of the 6-stop walkthrough.
          The HTML tour at /for-funders/tour has the full UI mockups; the
          PDF version is the portable, text-only equivalent for a funding
          application packet. */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>System tour — how a waiata moves through the kāhui</Text>
        <Text style={styles.paragraph}>
          The same six-stop walkthrough as the live tour at{" "}
          <Text style={styles.linkUrl}>{data.brand.url}/for-funders/tour</Text>.
          This text version is a portable summary for funding applications
          and reference packets — the live tour renders the actual UI
          components for a richer reading.
        </Text>

        {TOUR_STOPS.map((stop) => (
          <View key={stop.n} wrap={false}>
            <Text style={styles.tourStopNumber}>Stop {String(stop.n).padStart(2, "0")} · {stop.subtitle}</Text>
            <Text style={styles.tourStopTitle}>{stop.title}</Text>
            <Text style={styles.tourStopIntro}>{stop.intro}</Text>
            <Text style={styles.tourStopDecision}>{stop.designNote}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Anamata Kāhui · {data.brand.email} · {data.brand.url}</Text>
          <Text>Page 4</Text>
        </View>
      </Page>
    </Document>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Generator entrypoint
// ---------------------------------------------------------------------------

/**
 * Render the Funder / Press Kit as a PDF Buffer.
 */
export async function renderFunderKitPdf(): Promise<Buffer> {
  const data = await getFunderKitData();
  return await renderToBuffer(<FunderKitDocument data={data} />);
}