/**
 * GET /api/documents/[type]/[version]/pdf
 *
 * Renders a specific document version as a PDF. Used as the "Download
 * contract" or "Download policy" action once a contract_id / policy_id
 * row exists in the DB.
 *
 * For now, the type+version combination maps to a file in
 * src/lib/documents/library/. Once the contracts + policies tables
 * exist, the route will look up the row, fetch the document body
 * from `contract_documents.body` (or `legal_policies.body`), and render
 * from there. The render layer (renderDocumentToPdf) is unchanged.
 */

import { type NextRequest, NextResponse } from "next/server";

import { getDocument } from "@/lib/documents/loader";
import { renderDocumentToPdf } from "@/lib/documents/render-to-pdf";
import type { DocumentType } from "@/lib/documents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: DocumentType[] = [
  "code_of_conduct",
  "label_deal",
  "distribution_agreement",
  "publishing_agreement",
  "co_venture",
  "recording_agreement",
  "tour_agreement",
  "cultural_safety_charter",
  "data_rights_policy",
  "privacy_consent",
];

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ type: string; version: string }> },
) {
  const { type, version } = await ctx.params;
  if (!VALID_TYPES.includes(type as DocumentType)) {
    return new NextResponse(`Unknown document type: ${type}`, { status: 404 });
  }

  const document = await getDocument(type as DocumentType, version);
  if (!document) {
    return new NextResponse(
      `Document not found: ${type} v${version}`,
      { status: 404 },
    );
  }

  const buffer = await renderDocumentToPdf({
    document,
    status: { label: "Draft", tone: "draft" },
  });

  const filename = `anamata-${type}-v${document.meta.version}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
