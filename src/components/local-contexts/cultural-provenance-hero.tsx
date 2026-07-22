import Link from "next/link";
import { ShieldCheck, Lock, ExternalLink, Microscope, BookOpen, Info } from "lucide-react";

import type { LcLabelLink } from "@/lib/local-contexts/client";

const FAMILY_STYLE = {
  tk: {
    label: "TK Label",
    description:
      "Traditional Knowledge — applied by Indigenous communities to assert cultural protocols on their own terms.",
    color: "border-pounamu-500/50 bg-pounamu-500/10 text-pounamu-100",
    icon: ShieldCheck,
    iconColor: "text-pounamu-300",
  },
  bc: {
    label: "BC Label",
    description:
      "Biocultural — provenance and use conditions for biological / ecological samples and associated knowledge.",
    color: "border-bronze-500/50 bg-bronze-500/10 text-bronze-100",
    icon: Microscope,
    iconColor: "text-bronze-300",
  },
  notice: {
    label: "Notice",
    description:
      "Disclosure notice attached by the researcher / community explaining how to engage with the asset.",
    color: "border-border bg-muted text-foreground",
    icon: BookOpen,
    iconColor: "text-foreground/80",
  },
} as const;

interface Props {
  labels: LcLabelLink[];
  /** Optional override for the page-level explanation. */
  intro?: string;
}

/**
 * <CulturalProvenanceHero/> — prominent above-the-fold card showing
 * Local Contexts labels applied to the asset.
 *
 * Designed for funder panels who scan quickly:
 *   - "TK Label" / "BC Label" / "Notice" badges with the label name
 *   - Each label links to its canonical Hub page
 *   - Non-commercial usage locked with a Lock icon
 *   - Empty state explains why no labels are attached (not "missing")
 *   - Footer link to /kaitiakitanga#local-contexts for full explainer
 *
 * Server component — no client JS.
 */
export function CulturalProvenanceHero({ labels, intro }: Props) {
  // Group labels by family for legibility
  const grouped = {
    tk: labels.filter((l) => l.label?.family === "tk"),
    bc: labels.filter((l) => l.label?.family === "bc"),
    notice: labels.filter((l) => l.label?.family === "notice"),
  };

  return (
    <aside
      aria-label="Cultural provenance"
      className="rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-5 sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bronze-400/15">
          <ShieldCheck className="h-5 w-5 text-bronze-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Cultural provenance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {intro ??
              "This work carries machine-readable labels attached via the Local Contexts Hub — Indigenous-led standards for cultural IP and biocultural provenance."}
          </p>
        </div>
      </div>

      {labels.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground/80">
            No Local Contexts labels applied yet.
          </p>
          <p className="mt-1">
            Labels are attached at the artist's or researcher's discretion
            via the{" "}
            <a
              href="https://localcontexts.org"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              Local Contexts Hub
            </a>
            . Once a Hub project is attached to this asset, its TK, BC,
            and Notice labels appear here. See{" "}
            <Link
              href="/kaitiakitanga#local-contexts"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              kaitiakitanga
            </Link>{" "}
            for our cultural governance approach.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["tk", "bc", "notice"] as const).map((fam) => {
            const famLabels = grouped[fam];
            if (famLabels.length === 0) return null;
            const style = FAMILY_STYLE[fam];
            const Icon = style.icon;
            return (
              <div key={fam}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${style.iconColor}`} aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {style.label}
                    <span className="ml-1 text-muted-foreground">
                      ({famLabels.length})
                    </span>
                  </span>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {style.description}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {famLabels.map((link) => {
                    const href =
                      link.label?.canonical_url ??
                      "https://localcontexts.org/labels";
                    const labelName =
                      link.label?.label ?? link.label_id;
                    const shortName = labelName
                      .replace(`${FAMILY_STYLE[fam].label} `, "")
                      .trim();
                    return (
                      <li key={link.id}>
                        <Link
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className={`group inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-opacity hover:opacity-80 ${style.color}`}
                          title={link.label?.description}
                        >
                          <span className="font-medium">{shortName}</span>
                          {link.label?.is_non_commercial && (
                            <Lock
                              className="h-3 w-3 opacity-80"
                              aria-label="Non-commercial usage"
                            />
                          )}
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-bronze-500/20 pt-3 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Info className="h-3 w-3" />
          Standards: <a href="https://localcontexts.org" target="_blank" rel="noreferrer" className="text-bronze-300 hover:text-bronze-200 underline">localcontexts.org</a>
        </span>
        <Link
          href="/kaitiakitanga#local-contexts"
          className="text-bronze-300 hover:text-bronze-200 underline"
        >
          Read our kaitiakitanga policy
        </Link>
      </div>
    </aside>
  );
}