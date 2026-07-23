import { NextResponse } from "next/server";

/**
 * /api/csp-report — receives CSP violation reports from browsers.
 *
 * Browsers POST here in application/csp-report format (legacy) or
 * application/reports+json (newer spec). We just log them for now;
 * a future iteration could push to Sentry/Datadog.
 */
export const runtime = "nodejs";

interface CSPReport {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
  };
}

interface ReportsJSON {
  type?: string;
  age?: number;
  url?: string;
  user_agent?: string;
  body?: {
    type?: string;
    report?: unknown;
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let report: unknown = null;

  try {
    if (contentType.includes("application/csp-report")) {
      report = await request.json();
    } else if (contentType.includes("application/reports+json")) {
      report = await request.json();
    } else {
      // Try to parse as JSON anyway
      report = await request.json();
    }
  } catch {
    // Ignore parse errors — we still want to return 204
  }

  // Log to server console. Production: ship to a logging service.
  console.warn(
    "[csp-report]",
    JSON.stringify({
      contentType,
      body: report,
    }),
  );

  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse("CSP report endpoint. POST only.", { status: 405 });
}
