import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacyNotice" });
  return {
    title: t("title"),
    description: t("summary").slice(0, 160),
  };
}

export default async function PrivacyNoticePage() {
  const t = await getTranslations("legal.privacyNotice");
  const lastUpdated = "2026-07-22";
  const effectiveDate = "2026-07-22";
  const nextReview = "2027-07-22";

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">{t("badge")}</Badge>

      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Term label={t("effectiveDate")} value={effectiveDate} />
        <Term label={t("lastUpdated")} value={lastUpdated} />
        <Term label={t("nextReview")} value={nextReview} />
      </dl>

      {/* Te reo Māori summary — gives te reo speakers a high-level summary
          while the long-form legal prose stays in English. */}
      <aside
        aria-label="Whakarāpopototanga reo Māori"
        className="mt-8 rounded-md border border-pounamu-500/30 bg-pounamu-500/5 p-5 text-sm"
      >
        <p className="font-medium text-pounamu-200">Whakarāpopototanga reo Māori</p>
        <p className="mt-2 text-muted-foreground">{t("summary")}</p>
      </aside>

      <nav
        aria-label={t("tableOfContents")}
        className="mt-10 rounded-md border border-border p-4 text-sm"
      >
        <p className="font-medium uppercase tracking-wider text-muted-foreground">
          {t("tableOfContents")}
        </p>
        <ul className="mt-2 space-y-1">
          <li><a href="#personal" className="text-bronze-300 hover:text-bronze-200">{t("tocPersonal")}</a></li>
          <li><a href="#why" className="text-bronze-300 hover:text-bronze-200">{t("tocWhy")}</a></li>
          <li><a href="#how" className="text-bronze-300 hover:text-bronze-200">{t("tocHow")}</a></li>
          <li><a href="#share" className="text-bronze-300 hover:text-bronze-200">{t("tocShare")}</a></li>
          <li><a href="#rights" className="text-bronze-300 hover:text-bronze-200">{t("tocRights")}</a></li>
          <li><a href="#complaints" className="text-bronze-300 hover:text-bronze-200">{t("tocComplaints")}</a></li>
        </ul>
      </nav>

      <div className="prose prose-invert mt-10 max-w-none">
        <p>
          Anamata Kāhui Limited (<strong>"we", "us", "our"</strong>) operates
          this website (anamatakahui.co.nz) and the four operational
          branches: Anamata Records, Research &amp; Language, Creative Arts,
          and Technology &amp; Development. This notice explains how we
          collect, hold, use, and disclose personal information when you
          interact with us.
        </p>

        <p>
          We are committed to complying with the{" "}
          <strong>Privacy Act 2020</strong> and the Information Privacy
          Principles (IPPs) it sets out. We also honour the principles of{" "}
          <a href="/kaitiakitanga">Te Mana Raraunga Māori Data Sovereignty</a>{" "}
          as adopted by the Kāhui.
        </p>

        <h2>What personal information we collect</h2>
        <p>
          Depending on how you interact with us, we may collect:
        </p>
        <table>
          <thead>
            <tr><th>Source</th><th>Information collected</th></tr>
          </thead>
          <tbody>
            <tr><td>Contact form (<code>/contact</code>)</td><td>Your name, email, message contents</td></tr>
            <tr><td>Account signup (<code>/register</code>)</td><td>Email, password (hashed), name, optional iwi affiliation, optional te reo proficiency</td></tr>
            <tr><td>Authentication session</td><td>Encrypted JWT cookies (Supabase Auth), IP address</td></tr>
            <tr><td>Public opt-in directory (<code>/artist</code>)</td><td>Your name, role, iwi affiliation (when you opt in), bio</td></tr>
            <tr><td>Research papers</td><td>Author names, affiliations, optional profile linkage, DOI metadata</td></tr>
            <tr><td>Scholarship portfolio</td><td>Publicly listed recipient names, host institutions, project titles (only for awards you choose to disclose)</td></tr>
            <tr><td>iwi gates &amp; cultural metadata</td><td>Iwi names, kaitiaki contact info (with explicit consent from each iwi)</td></tr>
            <tr><td>Cookies (locale, auth)</td><td>See <Link href="/legal/cookie-policy">Cookie policy</Link></td></tr>
          </tbody>
        </table>

        <h2>Why we collect it</h2>
        <ol>
          <li><strong>To respond to your enquiries</strong> via the contact form or email.</li>
          <li><strong>To operate the platform</strong> — authentication, session persistence, content delivery.</li>
          <li><strong>To surface research outputs</strong> — published papers, scholarship portfolio, artist directory.</li>
          <li><strong>To honour Te Tiriti o Waitangi</strong> — cultural data is governed by iwi consent lineage (see <Link href="/kaitiakitanga">/kaitiakitanga</Link>).</li>
          <li><strong>To comply with funder reporting obligations</strong> where applicable.</li>
        </ol>

        <h2>How we hold it</h2>
        <p>
          Personal information is stored in <strong>Supabase</strong> (database
          hosted on AWS ap-southeast-2 in Sydney, with backup regions
          configurable). Authentication credentials are hashed with bcrypt;
          session tokens are encrypted JWTs held in HTTP-only cookies.
          Cultural metadata is held in a separate schema with row-level
          security scoped to kaitiaki-role users.
        </p>
        <p>
          We do <strong>not</strong> use third-party analytics, ad networks,
          or tracking pixels. The platform ships with zero third-party
          cookies by default.
        </p>

        <h2>Who we share it with</h2>
        <p>We do not sell personal information.</p>
        <p>We may share information with:</p>
        <ul>
          <li><strong>Supabase Inc.</strong> — database + auth infrastructure (data processor, contractually bound)</li>
          <li><strong>Vercel Inc.</strong> — application hosting (logs, edge cache)</li>
          <li><strong>Resend Inc.</strong> — contact-form email delivery (only if configured)</li>
          <li><strong>Funders</strong> (e.g. Creative NZ, Te Mātāwai) where reporting obligations require disclosure</li>
          <li><strong>Professional advisors</strong> — accountants, lawyers, cultural consultants where required</li>
          <li><strong>Law enforcement or regulators</strong> where legally compelled</li>
        </ul>

        <h2>Your rights under the Privacy Act 2020</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Ask whether we hold information about you</strong> (and request a copy)</li>
          <li><strong>Correct information</strong> that is wrong or out of date</li>
          <li><strong>Request deletion</strong> of your information, subject to legal retention obligations</li>
          <li><strong>Withdraw consent</strong> for any processing you previously consented to</li>
        </ul>
        <p>
          Exercise these rights via{" "}
          <Link href="/privacy-controls">/privacy-controls</Link>{" "}
          (data export + withdrawal request form), or email{" "}
          <a href="mailto:privacy@anamatakahui.co.nz">privacy@anamatakahui.co.nz</a>.
          We respond within 20 working days as required by the Privacy Act.
        </p>
        <p>
          If you're not satisfied with our response, complain to the{" "}
          <a
            href="https://www.privacy.org.nz"
            target="_blank"
            rel="noreferrer"
            className="text-bronze-300 hover:text-bronze-200"
          >
            Office of the Privacy Commissioner
          </a>.
        </p>

        <h2>Te Tiriti o Waitangi / tikanga considerations</h2>
        <p>
          Anamata Kāhui is a Māori-led collective. We collect information
          about kaumātua, whānau, hapū, and iwi only with appropriate
          kaitiakitanga and tikanga. Cultural information shared with us in
          confidence is handled in line with tikanga and with cultural
          advisor guidance where appropriate.
        </p>
        <p>
          See <Link href="/kaitiakitanga">/kaitiakitanga</Link> for the full
          Te Mana Raraunga CARE-aligned framework we operate under,
          including right of withdrawal, iwi consent lineage, and
          append-only consent log.
        </p>

        <h2>Data retention</h2>
        <ul>
          <li>Account profiles: until you request deletion, or 24 months after last sign-in (whichever first)</li>
          <li>Contact form submissions: 24 months</li>
          <li>Consent log entries: <strong>permanent</strong> (append-only audit trail)</li>
          <li>iwi gates and cultural metadata: until the named iwi representative requests takedown (honoured within 30 days)</li>
          <li>Research papers: until the author or kaitiaki withdraws</li>
        </ul>

        <h2>Cookies and tracking</h2>
        <p>
          See our <Link href="/legal/cookie-policy">Cookie policy</Link> for
          what we set, why, and how to control it.
        </p>

        <h2>International data transfers</h2>
        <p>
          Supabase is hosted on AWS Sydney (ap-southeast-2). Vercel edge
          functions may process requests through the nearest region.
          By using the platform you consent to this processing. We do
          not transfer personal data to any other overseas recipients.
        </p>

        <h2>Children's privacy</h2>
        <p>
          The platform is not directed at children under 13. We do not
          knowingly collect information from children. If you believe a
          child has provided us with personal information, contact{" "}
          <a href="mailto:privacy@anamatakahui.co.nz">privacy@anamatakahui.co.nz</a>{" "}
          and we'll delete it within 30 days.
        </p>

        <h2>Changes to this notice</h2>
        <p>
          We may update this notice from time to time. The "effective date"
          at the top shows the latest revision. Material changes will be
          announced on the platform home page and announced via the{" "}
          <Link href="/data-governance">data governance changelog</Link>{" "}
          (where applicable).
        </p>

        <h2>Contact</h2>
        <p>
          Privacy queries:{" "}
          <a href="mailto:privacy@anamatakahui.co.nz">privacy@anamatakahui.co.nz</a>
        </p>
        <p>
          Postal address: Anamata Kāhui Limited, [registered address],
          Aotearoa New Zealand.
        </p>

        <p className="text-sm text-muted-foreground">
          <em>
            This notice was drafted on 2026-07-22 based on the
            Anamata-Records template at{" "}
            <code>/opt/data/anamata/legal/templates/privacy-notice.md</code>{" "}
            and adapted for the Kāhui platform. Final wording should be
            reviewed by a qualified NZ lawyer before being relied upon as
            the operative privacy notice under the Privacy Act 2020.
          </em>
        </p>
      </div>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
