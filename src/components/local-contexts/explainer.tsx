import Link from "next/link";

interface Props {
  className?: string;
}

/**
 * Compact explainer — what are Local Contexts labels and why do they
 * travel with the asset?
 *
 * Used on public pages (waiata detail, research paper detail) and in
 * the dashboard. Linked to the full /kaitiakitanga explainer.
 */
export function LocalContextsExplainer({ className = "" }: Props) {
  return (
    <div className={`space-y-2 text-xs text-muted-foreground ${className}`}>
      <p>
        Local Contexts labels are{" "}
        <strong>machine-readable provenance metadata</strong> attached to
        digital assets. They travel with the file (in XMP metadata) and
        tell downstream tools (Adobe, DaVinci, web crawlers) what usage
        protocols apply.
      </p>
      <p>
        Anamata Kāhui uses three label families:
      </p>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          <strong>TK (Traditional Knowledge)</strong> — usage protocols from
          the community of origin. e.g. <em>TK Attribution</em>, <em>TK
          Non-Commercial</em>, <em>TK Clan</em>, <em>TK Secret / Sacred</em>.
        </li>
        <li>
          <strong>BC (Biocultural)</strong> — origin and consent for
          biological / environmental material. e.g. <em>BC Provenance</em>,{" "}
          <em>BC Consent Verified</em>.
        </li>
        <li>
          <strong>Notices</strong> — researcher or community notices. e.g.{" "}
          <em>Open with CARE</em>, <em>Community Voice</em>.
        </li>
      </ul>
      <p>
        See{" "}
        <Link
          href="/kaitiakitanga"
          className="text-bronze-300 hover:text-bronze-200 underline"
        >
          /kaitiakitanga
        </Link>{" "}
        for the full provenance framework, or{" "}
        <a
          href="https://localcontexts.org/labels"
          target="_blank"
          rel="noreferrer"
          className="text-bronze-300 hover:text-bronze-200 underline"
        >
          localcontexts.org/labels
        </a>{" "}
        for the full catalogue.
      </p>
    </div>
  );
}
