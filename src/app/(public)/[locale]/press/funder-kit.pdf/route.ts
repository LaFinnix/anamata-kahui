/**
 * /en/press/funder-kit.pdf — server-side PDF generation.
 *
 * Streams the Funder / Press Kit as a PDF attachment. Aggregates live
 * data from the platform database, renders via @react-pdf/renderer.
 *
 * Cached via Next.js's default route-handler caching.
 */

import { renderFunderKitPdf } from "@/lib/press/funder-kit-pdf";

export const runtime = "nodejs";
export const revalidate = 300; // 5 min

export async function GET() {
  const buffer = await renderFunderKitPdf();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="anamata-kahui-funder-pack-${date}.pdf"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}