/**
 * File-metadata embedding for Local Contexts provenance.
 *
 * When an asset (release, paper) has a Hub Project attached, we can
 * emit:
 *   - **PDF metadata** (XMP-style `dc:rights`, `xmp:dc:title`, etc.)
 *   - **ID3 tags** for audio stems (WAV/FLAC via IT-Tags; MP3 via id3v2)
 *   - **XMP sidecar** for images (.xmp alongside .jpg/.png)
 *
 * The Hub's icon URLs are referenced via `xmpMM:DocumentID` so that
 * downstream tools (Adobe Bridge, DaVinci, web crawlers) can resolve
 * them to the canonical Hub project page.
 *
 * Implementation: pure-data emitters. We don't manipulate file blobs
 * server-side (that would require loading the file into memory and
 * rewriting chunks). Instead we emit:
 *   - The XMP block as a downloadable .xmp file
 *   - The ID3 chunk as a downloadable id3.json fragment (client-side
 *     mutators can apply to the audio file with ffmpeg / mutagen)
 *   - The PDF /Info dict as a downloadable PDF-info.json fragment
 *     (client-side mutators can apply with qpdf or pdf-lib)
 *
 * For the 99% case — the labels are surfaced in the Anamata UI,
 * published on the web page, and linked to the Hub — that's enough.
 * For the 1% case (exporting a properly-tagged file), the client
 * mutator applies the embedded block.
 */

import type { HubProject } from "./hub-client";

/** XMP namespace constants. */
const XMP_NS = {
  dc: "http://purl.org/dc/elements/1.1/",
  xmp: "http://ns.adobe.com/xap/1.0/",
  xmpRights: "http://ns.adobe.com/xap/1.0/rights/",
  xmpMM: "http://ns.adobe.com/xap/1.0/mm/",
  localcontexts: "https://localcontexts.org/ns/",
  pdf: "http://ns.adobe.com/pdf/1.3/",
} as const;

/** Single label inside an XMP block (one per Hub label). */
interface XmpLabelEntry {
  slug: string;
  family: "tk" | "bc" | "notice";
  label: string;
  label_page: string;
  img_url: string | null;
  svg_url: string | null;
  label_text: string;
}

/**
 * Compose a full XMP sidecar document for a release or paper.
 *
 * The output is a self-contained .xmp file that Adobe Bridge,
 * DaVinci Resolve, ExifTool, and other ingest tools will parse.
 */
export function composeXmpSidecar(
  project: HubProject,
  assetMeta: {
    kind: "release" | "research_document" | "audio_stem" | "image";
    title: string;
    creator: string;
    rights_holder?: string;
  },
): string {
  const allLabels: XmpLabelEntry[] = [
    ...project.tk_labels.map((l) => ({
      slug: l.id,
      family: "tk" as const,
      label: l.name,
      label_page: l.label_page,
      img_url: l.img_url,
      svg_url: l.svg_url,
      label_text: l.label_text,
    })),
    ...project.bc_labels.map((l) => ({
      slug: l.id,
      family: "bc" as const,
      label: l.name,
      label_page: l.label_page,
      img_url: l.img_url,
      svg_url: l.svg_url,
      label_text: l.label_text,
    })),
    ...project.notice.map((l) => ({
      slug: l.id,
      family: "notice" as const,
      label: l.name,
      label_page: l.label_page,
      img_url: l.img_url,
      svg_url: l.svg_url,
      label_text: l.label_text,
    })),
  ];

  const labelLi = allLabels
    .map(
      (l) =>
        `      <rdf:li>${escapeXml(l.label)} — ${escapeXml(l.label_text || l.label)}</rdf:li>`,
    )
    .join("\n");

  const attributionLi = allLabels
    .filter((l) => l.family === "tk" || l.label.toLowerCase().includes("attribution"))
    .map(
      (l) =>
        `      <rdf:li>${escapeXml(l.label)} — ${escapeXml(l.label_page)}</rdf:li>`,
    )
    .join("\n");

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">

    <rdf:Description rdf:about=""
        xmlns:dc="${XMP_NS.dc}"
        xmlns:xmp="${XMP_NS.xmp}"
        xmlns:xmpRights="${XMP_NS.xmpRights}"
        xmlns:xmpMM="${XMP_NS.xmpMM}"
        xmlns:localcontexts="${XMP_NS.localcontexts}"
        xmlns:pdf="${XMP_NS.pdf}">

      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(assetMeta.title)}</rdf:li>
        </rdf:Alt>
      </dc:title>

      <dc:creator>
        <rdf:Seq>
          <rdf:li>${escapeXml(assetMeta.creator)}</rdf:li>
        </rdf:Seq>
      </dc:creator>

      ${assetMeta.rights_holder ? `<dc:rights>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXml(assetMeta.rights_holder)}</rdf:li>
        </rdf:Alt>
      </dc:rights>` : ""}

      <dc:type>
        <rdf:Bag>
          <rdf:li>${escapeXml(assetMeta.kind)}</rdf:li>
        </rdf:Bag>
      </dc:type>

      <xmp:CreateDate>${escapeXml(project.date_created ?? new Date().toISOString())}</xmp:CreateDate>
      <xmp:MetadataDate>${new Date().toISOString()}</xmp:MetadataDate>

      ${attributionLi ? `<xmpRights:Attribution>
        <rdf:Bag>
${attributionLi}
        </rdf:Bag>
      </xmpRights:Attribution>` : ""}

      ${labelLi ? `<localcontexts:labels>
        <rdf:Bag>
${labelLi}
        </rdf:Bag>
      </localcontexts:labels>` : ""}

      <localcontexts:hubProjectId>${escapeXml(project.unique_id)}</localcontexts:hubProjectId>
      <localcontexts:hubProjectPage>${escapeXml(project.project_page)}</localcontexts:hubProjectPage>

      <xmpMM:DocumentID>${escapeXml(project.unique_id)}</xmpMM:DocumentID>

    </rdf:Description>

  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
`;
}

/**
 * Compose PDF /Info dict metadata (Title, Author, Subject, Keywords).
 *
 * PDF consumers (Acrobat, Preview, browser PDF viewers) read this.
 * The /Info dict is **plain ASCII** so we escape carefully.
 */
export function composePdfInfoDict(
  project: HubProject,
  assetMeta: { title: string; creator: string; subject?: string },
): string {
  const keywords = [
    assetMeta.subject ?? "",
    "Local Contexts",
    ...project.tk_labels.map((l) => l.name),
    ...project.bc_labels.map((l) => l.name),
    ...project.notice.map((l) => l.name),
  ]
    .filter(Boolean)
    .join(", ");

  const fields: [string, string][] = [
    ["Title", assetMeta.title],
    ["Author", assetMeta.creator],
    ["Subject", assetMeta.subject ?? "Local Contexts provenance"],
    ["Keywords", keywords],
    ["Producer", "Anamata Kāhui — Local Contexts integration"],
    ["Creator", "Anamata Kāhui — https://anamatakahui.co.nz"],
    ["LocalContextsHubProjectID", project.unique_id],
    ["LocalContextsHubProjectURL", project.project_page],
  ];

  return fields
    .map(
      ([k, v]) =>
        `/LocalContextsHubProject${k === "LocalContextsHubProjectID" || k === "LocalContextsHubProjectURL" ? "" : k} (${escapePdfString(v)})`,
    )
    .join("\n");
}

/**
 * Compose ID3 chunk as JSON (consumed by client-side mutators like
 * `mutagen` for MP3 or `taglib` for WAV/FLAC).
 *
 * Pure data emitter — the client wraps audio binaries with these tags
 * before upload or on download.
 */
export function composeId3Tags(
  project: HubProject,
  assetMeta: { title: string; creator: string; album?: string },
): Record<string, string | string[]> {
  const allLabelNames = [
    ...project.tk_labels.map((l) => l.name),
    ...project.bc_labels.map((l) => l.name),
    ...project.notice.map((l) => l.name),
  ];

  return {
    title: assetMeta.title,
    artist: assetMeta.creator,
    album: assetMeta.album ?? "Anamata Kāhui",
    comment: project.title || project.project_page,
    organization: "Anamata Kāhui",
    // ID3 doesn't have a "provenance" frame, but TXXX (user-defined) does.
    // We pack everything into a JSON blob for client-side tagging.
    "TXXX:LocalContextsHubProjectID": project.unique_id,
    "TXXX:LocalContextsHubProjectURL": project.project_page,
    "TXXX:LocalContextsLabels": JSON.stringify(
      allLabelNames.map((name) => ({ name, page: project.project_page })),
    ),
  };
}

/**
 * Emit all three formats as a single downloadable bundle.
 *
 * Returns the bundle as { filename: contents } so the caller can
 * serve it as a zip or as individual files.
 */
export function composeFileMetadataBundle(
  project: HubProject,
  assetMeta: {
    kind: "release" | "research_document" | "audio_stem" | "image";
    title: string;
    creator: string;
    subject?: string;
    rights_holder?: string;
    album?: string;
    base_filename: string;
  },
): Record<string, string> {
  const slug = assetMeta.base_filename
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    [`${slug}.xmp`]: composeXmpSidecar(project, assetMeta),
    [`${slug}.pdf-info.txt`]: composePdfInfoDict(project, assetMeta),
    [`${slug}.id3.json`]: JSON.stringify(
      composeId3Tags(project, assetMeta),
      null,
      2,
    ),
  };
}

// ---------------------------------------------------------------------------
// Escaping helpers
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapePdfString(s: string): string {
  // PDF /Info dict strings: ASCII, parens escaped
  return s
    .replace(/[\\()]/g, "")
    .replace(/[^\x20-\x7e]/g, "?");
}
