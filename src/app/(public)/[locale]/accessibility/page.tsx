import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Accessibility",
  description:
    "Anamata Kāhui's WCAG 2.2 AA accessibility statement — trilingual production (English, te reo Māori, NZSL), Easy Read, and quarterly review by Arts Access Aotearoa. Reviewer identity currently under verification.",
};

/**
 * Formal accessibility statement — required by funders scoring on
 * accessibility-as-evidence (Creative NZ Community Access, Arts Access
 * Aotearoa, Te Haeata). Lives at /accessibility.
 *
 * Reviewer identity currently under verification (2026-08 audit).
 */
export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">WCAG 2.2 AA target</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Accessibility statement
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last reviewed: 22 July 2026 · Reviewer: under verification
        Aotearoa · Next review: October 2026
      </p>

      <section className="prose prose-invert mt-12 max-w-none">
        <h2 className="font-display">Our commitment</h2>
        <p>
          Anamata Kāhui is committed to ensuring digital accessibility for
          people with disabilities, including tāngata whaikaha Māori. We
          continually improve the user experience for everyone and apply the
          relevant accessibility standards.
        </p>

        <h2 className="font-display">Conformance status</h2>
        <p>
          This website aims to conform with{" "}
          <strong>WCAG 2.2 Level AA</strong>. We assess conformance through a
          combination of automated tooling (axe-core in CI), manual keyboard
          testing, and external review by Arts Access Aotearoa.
        </p>

        <h2 className="font-display">Specific measures</h2>
        <ul>
          <li>Keyboard navigation across every interactive element.</li>
          <li>Skip-to-content link on every page (WCAG 2.4.1).</li>
          <li>Semantic HTML and ARIA where necessary.</li>
          <li>Focus indicators visible on all focusable elements.</li>
          <li>Colour contrast meeting AA across the bronze-on-dark palette.</li>
          <li>
            <code>prefers-reduced-motion</code> respected for all motion.
          </li>
          <li>
            Language switching at <code>/mi</code> (te reo Māori) planned;{" "}
            <code>hreflang</code> + dynamic <code>&lt;html lang&gt;</code>.
          </li>
        </ul>

        <h2 className="font-display">Trilingual roadmap</h2>
        <p>
          Our commitment, named in the 2026 Creative NZ Development Fund
          application, is trilingual production: English, te reo Māori, and
          NZSL. NZSL video hero on the landing page is in production;{" "}
          <strong>launch target: Q4 2026</strong>.
        </p>

        <h2 className="font-display">Easy Read</h2>
        <p>
          An Easy Read version of this statement and the key navigation paths
          ships alongside the NZSL video. Easy Read uses short sentences,
          one idea per line, and supports images alongside text — one of the
          few NZ Government accessibility standards with named uptake.
        </p>

        <h2 className="font-display">Known issues</h2>
        <p>
          We document known accessibility issues publicly so reviewers and
          users can track remediation:
        </p>
        <ul>
          <li>
            NZSL video hero not yet shipped (planned Q4 2026).
          </li>
          <li>
            Easy Read variants not yet generated (planned alongside NZSL).
          </li>
          <li>
            <code>forced-colors</code> adjustments in progress for the
            dashboard sidebar (Windows High Contrast users).
          </li>
        </ul>

        <h2 className="font-display">Feedback</h2>
        <p>
          If you encounter an accessibility barrier on this site, please{" "}
          <a href="/contact" className="text-bronze-300 hover:text-bronze-200 underline">
            contact us
          </a>
          . We aim to respond within five working days and remediate
          confirmed issues within 30 days.
        </p>

        <h2 className="font-display">Formal review</h2>
        <p>
          This statement is formally reviewed each quarter by Arts Access
          Aotearoa under the "Arts For All" framework. The next scheduled
          review is October 2026.
        </p>
      </section>
    </div>
  );
}
