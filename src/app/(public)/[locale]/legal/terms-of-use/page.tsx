import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  return {
    title: t("title"),
    description: t("summary").slice(0, 160),
  };
}

export default async function TermsOfUsePage() {
  const t = await getTranslations("legal.terms");
  const effectiveDate = "2026-07-22";

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">{t("badge")}</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("lastUpdated")}: <span className="font-mono">{effectiveDate}</span> · Operated by <strong>Anamata Kāhui Limited</strong> (trading as Anamata Kāhui).
      </p>

      <aside
        aria-label="Whakarāpopototanga reo Māori"
        className="mt-8 rounded-md border border-pounamu-500/30 bg-pounamu-500/5 p-5 text-sm"
      >
        <p className="font-medium text-pounamu-200">Whakarāpopototanga reo Māori</p>
        <p className="mt-2 text-muted-foreground">{t("summary")}</p>
      </aside>

      <div className="prose prose-invert mt-10 max-w-none">
        <p>
          These terms govern use of anamatakahui.co.nz and the four
          operational branches: Anamata Records, Research & Language
          Preservation, Creative Arts, and Technology & Development. By
          using the site you accept these terms. If you do not accept
          them, please do not use the site.
        </p>

        <h2>1. Operator</h2>
        <p>
          The site is operated by <strong>Anamata Kāhui Limited</strong>{" "}
          (the <strong>"Kāhui"</strong>), a New Zealand-registered
          company. References to "we", "us", "our" mean Anamata Kāhui
          Limited.
        </p>

        <h2>2. Use of the site</h2>
        <p>
          You may use this site for personal, educational, and
          non-commercial purposes. You agree not to:
        </p>
        <ul>
          <li>Use the site in any way that breaches any applicable local, national, or international law or regulation.</li>
          <li>Use the site to harm or attempt to harm minors.</li>
          <li>Send, knowingly receive, upload, download, use, or re-use any material that does not comply with our content standards.</li>
          <li>Transmit any unsolicited or unauthorised advertising or promotional material or any other form of similar solicitation (spam).</li>
          <li>Knowingly transmit any data, send or upload any material that contains viruses, Trojan horses, worms, time-bombs, keystroke loggers, spyware, adware, or any other harmful programs.</li>
        </ul>

        <h2>3. Branches and accounts</h2>
        <p>
          The site hosts four operational branches. Some functionality
          (artist portal, releases, research papers, dashboards)
          requires creating an account. Account holders agree to provide
          accurate information and to keep it current. We may suspend or
          terminate accounts that breach these terms.
        </p>

        <h2>4. Cultural data and kaitiakitanga</h2>
        <p>
          Cultural data attached to waiata, research papers, or other
          assets (including Local Contexts TK/BC labels, iwi consent
          records, and cultural flags) is governed by the originating
          community. You agree to honour those protocols. Kaitiaki
          reviews apply to releases scheduled for publication.
        </p>

        <h2>5. Intellectual property</h2>
        <p>
          Anamata Records retains rights to the waiata and stems we
          release. Artists retain rights to their original compositions
          and performances. Research papers are released under the
          Creative Commons licence declared on each paper's detail page
          (typically CC BY 4.0). Site code is MIT-licensed.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          The site is provided "as is" and "as available". To the maximum
          extent permitted by law, we exclude all representations,
          warranties, and conditions relating to the site and your use
          of it. We will not be liable for any indirect, special, or
          consequential loss or damage.
        </p>

        <h2>7. Governing law and jurisdiction</h2>
        <p>
          These terms are governed by the laws of New Zealand. Any
          dispute arising under them is subject to the exclusive
          jurisdiction of the courts of New Zealand.
        </p>

        <h2>8. Changes to these terms</h2>
        <p>
          We may revise these terms from time to time. The current
          version will always be posted at this URL with an updated
          "Last updated" date. Material changes will be announced on
          the home page.
        </p>

        <h2>9. {t("contact")}</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:legal@anamatakahui.co.nz" className="text-bronze-300 hover:text-bronze-200 underline">
            legal@anamatakahui.co.nz
          </a>
          .
        </p>

        <h2>10. Related documents</h2>
        <ul>
          <li>
            <Link href="/legal/privacy-notice" className="text-bronze-300 hover:text-bronze-200 underline">
              Privacy notice
            </Link>{" "}
            — how we collect, hold, and disclose personal information
          </li>
          <li>
            <Link href="/legal/cookie-policy" className="text-bronze-300 hover:text-bronze-200 underline">
              Cookie policy
            </Link>{" "}
            — every cookie set by the site
          </li>
          <li>
            <Link href="/kaitiakitanga" className="text-bronze-300 hover:text-bronze-200 underline">
              Kaitiakitanga policy
            </Link>{" "}
            — cultural data governance
          </li>
        </ul>
      </div>
    </div>
  );
}