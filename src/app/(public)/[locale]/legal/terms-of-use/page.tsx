import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Terms of use",
  description:
    "Terms governing use of the Anamata Kāhui platform, including four branches (Anamata Records, Research, Creative Arts, Technology & Development).",
};

export default function TermsOfUsePage() {
  const effectiveDate = "2026-07-22";

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Legal · Terms</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Terms of use
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Effective: <span className="font-mono">{effectiveDate}</span> ·{" "}
        Operated by <strong>Anamata Kāhui Limited</strong> (trading as Anamata Kāhui).
      </p>

      <div className="prose prose-invert mt-10 max-w-none">
        <h2>1. Acceptance</h2>
        <p>
          By accessing anamatakahui.co.nz (the <strong>"Platform"</strong>)
          you agree to these Terms of Use, our{" "}
          <a href="/legal/privacy-notice">Privacy Notice</a>, and our{" "}
          <a href="/legal/cookie-policy">Cookie Policy</a>. If you don't
          agree, please don't use the Platform.
        </p>

        <h2>2. What we provide</h2>
        <p>
          The Platform is the digital home of Anamata Kāhui — a Māori-led
          collective platform unifying four operational branches:
        </p>
        <ul>
          <li><strong>Anamata Records</strong> — artist portal, release pipeline, stem vault, royalty and stream analytics.</li>
          <li><strong>Research &amp; Language</strong> — knowledge vault, document archives, field projects, published research outputs.</li>
          <li><strong>Creative Arts</strong> — visual arts, digital media showcase, cultural design portfolios.</li>
          <li><strong>Technology &amp; Development</strong> — software projects, client tools, internal automation.</li>
        </ul>
        <p>
          Through the Platform we share information about our work, our
          cultural governance posture, our partners, our music catalogue,
          our research, and our funding history.
        </p>

        <h2>3. Your use of the Platform</h2>
        <p>You agree to:</p>
        <ul>
          <li>Use the Platform for lawful purposes only.</li>
          <li>Not attempt to disrupt the Platform or its security.</li>
          <li>Not scrape, reproduce, or redistribute content from the Platform without permission (other than for personal, non-commercial use).</li>
          <li>Not impersonate Anamata Kāhui or any of its representatives.</li>
          <li>Respect the cultural protocols of any iwi / hapū / kaitiaki whose material appears on the Platform.</li>
        </ul>

        <h2>4. Accounts</h2>
        <p>
          Some areas of the Platform require a registered account (kaitiaki
          rōpū, branch admins, artists, researchers). You're responsible for
          your account credentials and for activity under your account.
        </p>
        <p>
          We may suspend or terminate accounts that violate these Terms,
          abuse cultural protocols, or compromise platform security.
        </p>

        <h2>5. Intellectual property</h2>

        <h3>5.1 Platform content</h3>
        <p>
          All platform content — including text, graphics, logos, the
          "Anamata Kāhui" name, photos, design system, and the Platform's
          overall look and feel — is owned by Anamata Kāhui Limited or our
          licensors, and is protected by New Zealand and international
          copyright laws.
        </p>
        <p>
          You may view and download platform content for personal,
          non-commercial use. Any other use (reproduction, modification,
          distribution, public display) requires our prior written
          permission.
        </p>

        <h3>5.2 Music (Anamata Records branch)</h3>
        <p>
          Music is licensed for streaming through digital service providers
          (Spotify, Apple Music, YouTube, etc.). Each DSP has its own terms
          of use for listening. We do not grant any licence to download,
          copy, or redistribute music through this Platform.
        </p>
        <p>
          If you wish to use a release in another project (e.g. sync
          licence for a film, podcast, or advertisement), contact us at{" "}
          <a href="mailto:licensing@anamatakahui.co.nz">
            licensing@anamatakahui.co.nz
          </a>.
        </p>

        <h3>5.3 Research outputs</h3>
        <p>
          Published research papers are released under terms specified per
          paper (often CC-BY-NC or similar). DOIs link to canonical
          versions. Citation metadata is provided to support academic
          attribution.
        </p>

        <h3>5.4 Platform code</h3>
        <p>
          The platform source code is released under the MIT licence. See
          our <a href="/open-source">open source</a> page for the GitHub
          repository and contribution guidelines.
        </p>

        <h2>6. Cultural data and Te Tiriti o Waitangi</h2>
        <p>
          Cultural content on the Platform — including iwi names, waiata,
          research papers, and field projects — is held under{" "}
          <a href="/kaitiakitanga">Te Mana Raraunga Māori Data Sovereignty
          principles</a>. Specifically:
        </p>
        <ul>
          <li>Iwi-attributed content carries documented consent lineage (see <code>iwi_gates</code> + <code>consent_log</code> tables).</li>
          <li>Right of withdrawal: any iwi / hapū / named contributor can request takedown. Honoured within 30 days.</li>
          <li>Append-only consent log: every consent decision is permanently recorded for audit.</li>
        </ul>
        <p>
          Use of cultural material on the Platform is subject to the
          specific consent terms under which it was provided. Commercial
          use of waiata or research outputs requires a separate written
          agreement with Anamata Kāhui and the relevant iwi / hapū.
        </p>

        <h2>7. Third-party content</h2>
        <p>
          The Platform embeds content from third parties (Spotify, Apple
          Music, YouTube, etc.). Their content is governed by their own
          terms. We don't accept liability for third-party content or its
          availability.
        </p>

        <h2>8. Links to other sites</h2>
        <p>
          We may link to other websites (e.g. partner organisations, funders,
          cultural bodies). We're not responsible for the content or privacy
          practices of those sites.
        </p>

        <h2>9. Disclaimer</h2>
        <p>
          The Platform is provided "as is" and "as available." To the maximum
          extent permitted by NZ law, Anamata Kāhui Limited disclaims all
          warranties, express or implied, including warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
        <p>
          We do our best to keep the Platform accurate and up to date, but
          we don't guarantee the accuracy, completeness, or timeliness of
          any information on it.
        </p>

        <h2>10. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by NZ law, Anamata Kāhui Limited
          will not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of the Platform.
        </p>
        <p>
          Nothing in these Terms excludes or limits liability that cannot be
          excluded under NZ law (including liability under the Consumer
          Guarantees Act 1993, if applicable).
        </p>

        <h2>11. Indemnity</h2>
        <p>
          You agree to indemnify Anamata Kāhui Limited against any claims
          arising from your breach of these Terms or your misuse of the
          Platform.
        </p>

        <h2>12. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. The "effective date"
          at the top shows the latest revision. Continued use of the
          Platform after a change means you accept the updated Terms.
        </p>
        <p>
          Material changes will be announced on the Platform home page and
          via the <a href="/data-governance">data governance changelog</a>.
        </p>

        <h2>13. Governing law</h2>
        <p>
          These Terms are governed by the laws of New Zealand. Any disputes
          will be resolved in NZ courts.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:legal@anamatakahui.co.nz">legal@anamatakahui.co.nz</a>
        </p>
        <p>
          Postal address: Anamata Kāhui Limited, [registered address],
          Aotearoa New Zealand.
        </p>

        <p className="text-sm text-muted-foreground">
          <em>
            Drafted 2026-07-22 based on the Anamata Records template at{" "}
            <code>/opt/data/anamata/legal/templates/terms-of-use.md</code>,
            adapted for the Kāhui platform. Final wording should be reviewed
            by a qualified NZ lawyer before being relied upon as the operative
            terms of use.
          </em>
        </p>
      </div>
    </div>
  );
}
