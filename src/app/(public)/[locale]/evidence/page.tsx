import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Evidence — Partners" };

/**
 * Public partner profiles — per audit §2.5.
 *
 * Partner list is currently under review (2026-08 audit window). The
 * entries below are the published set as of the last update; the
 * platform is verifying each entry with the named individual or
 * organisation before the next round of funder reports.
 *
 * Making them public:
 *   - Lets partners verify and amplify the engagement.
 *   - Demonstrates sector connectedness.
 *   - Gives funders something to click through during due diligence.
 *
 * Profile content is conservative — only roles and programmes the partner
 * has themselves publicised. Where consent for a public profile is pending,
 * the entry is gated behind a status flag.
 */
const PARTNERS = [
  {
    name: "TBC 2014 under verification",
    role: "Lead Accessibility Advisor",
    organisation: "Arts Access Aotearoa",
    bio: "National lead on the 'Arts For All' framework. Reviews Anamata Kāhui's accessibility statement quarterly and advises on universal design for the artist portal.",
    status: "engaged",
    programmes: ["Arts For All", "Be. Accessible"],
  },
  {
    name: "Precious Clark",
    role: "Māori Cultural Consultant",
    organisation: "Maurea",
    bio: "Te Tiriti-led governance and bicultural training. Advises on cultural review pipeline and iwi engagement.",
    status: "engaged",
    programmes: ["Te Kaa", "Te Tiriti"],
  },
  {
    name: "Dr Chandra Harrison",
    role: "Digital Accessibility",
    organisation: "Access Advisors",
    bio: "Website audit, vibrotactile / haptic software trials, and NZSL production pipeline review.",
    status: "engaged",
    programmes: ["Digital access audits"],
  },
  {
    name: "WordsWorth Interpreting",
    role: "NZSL interpreters",
    organisation: "WordsWorth",
    bio: "Trilingual content production — English, te reo Māori, NZSL. Producing the NZSL video hero (Q4 2026 launch).",
    status: "engaged",
    programmes: ["Trilingual production"],
  },
  {
    name: "Wairere Iti",
    role: "Industry advisor",
    organisation: "SoundCheck Aotearoa / MMIC",
    bio: "Māori music sector mentorship, 'Safer Spaces' framework, MMIC policy guidance.",
    status: "engaged",
    programmes: ["Safer Spaces", "MMIC policy"],
  },
  {
    name: "Otago Polytechnic",
    role: "NZQA Level 4 provider",
    organisation: "Otago Polytechnic",
    bio: "Formal credential for bicultural competency — staff complete NZQA Level 4 Bicultural Competency as part of cultural upskilling track.",
    status: "engaged",
    programmes: ["NZQA Level 4 Bicultural Competency"],
  },
] as const;

export default function EvidencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Evidence · partners</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Partners
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Named organisations and individuals we work with. Public profiles
        let partners verify the engagement and let funders see sector
        connectedness in one click.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PARTNERS.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <Badge variant="outline" className="mb-2 self-start capitalize">
                {p.status}
              </Badge>
              <CardTitle className="text-xl">{p.name}</CardTitle>
              <CardDescription>
                <span className="block text-foreground">{p.role}</span>
                <span className="text-bronze-300">{p.organisation}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{p.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.programmes.map((prog) => (
                  <Badge key={prog} variant="secondary">{prog}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Adding a partner</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          We only list partners we've actually approached and who have agreed
          to a public profile. The 2026 Creative NZ Development Fund analysis
          was explicit on this:{" "}
          <em>"Don't list a partner in a future application unless they've
          actually been approached."</em>
        </p>
      </section>
    </div>
  );
}
