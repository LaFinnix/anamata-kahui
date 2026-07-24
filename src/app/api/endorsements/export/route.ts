/**
 * CSV export of endorsements — authenticated GET endpoint.
 *
 * `GET /api/endorsements/export?scope=given|received`
 *
 * Returns a CSV file the user can download for Creative NZ applications,
 * portfolio review, or takoha audit. RLS is the access boundary: the
 * server supabase client (authed via the user's session cookie) only
 * exposes the rows the user is entitled to see — given = rows where
 * endorser_id = auth.uid(); received = rows where recipient_id = auth.uid().
 *
 * Cultural-integrity:
 *   - Includes BOTH active and revoked endorsements. The revocation
 *     reason column preserves the append-only-with-revocation lineage.
 *   - Scope is explicit (given vs received) — we never mix the two
 *     into a single "my endorsements" view, which would conflate
 *     contribution and receipt.
 *
 * Output:
 *   - UTF-8 with BOM (Excel-friendly)
 *   - RFC 4180 quoting (commas, quotes, newlines wrapped in double
 *     quotes; embedded quotes doubled)
 *   - CRLF row separators
 *   - ISO 8601 timestamps
 *   - iwi_affiliation_attested arrays joined with "; "
 *
 * Filename: anamata-endorsements-{scope}-{user_short}-{YYYY-MM-DD}.csv
 */

import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Scope = "given" | "received";

interface EndorsementRow {
  id: string;
  endorsement_type: string;
  knowledge_domain: string | null;
  scope_iwi: string | null;
  scope_region: string | null;
  work_id: string | null;
  work_ref: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  // Counterparty — present regardless of scope (server join)
  counterparty_id: string;
  counterparty_name: string | null;
  counterparty_iwi: string[] | null;
  counterparty_role: string | null;
}

type Party = {
  id: string;
  full_name: string | null;
  iwi_affiliation_attested: string[] | null;
  role: string | null;
};

type EndorsementWithParty = Omit<
  EndorsementRow,
  "counterparty_id" | "counterparty_name" | "counterparty_iwi" | "counterparty_role"
> & {
  recipient?: Party[] | null;
  endorser?: Party[] | null;
};

/* -------------------------------------------------------------------------- */
/* CSV encoding                                                               */
/* -------------------------------------------------------------------------- */

/** RFC 4180: wrap fields containing comma/quote/newline in double quotes;
 *  double-up internal quotes. Always quote strings consistently. */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvField).join(",");
}

function iwiToString(arr: string[] | null | undefined): string {
  return arr && arr.length > 0 ? arr.join("; ") : "";
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Authentication required.", { status: 401 });
  }

  // Validate scope query param (default 'given')
  const url = new URL(request.url);
  const scopeParam = url.searchParams.get("scope");
  const scope: Scope = scopeParam === "received" ? "received" : "given";

  // Fetch the user's endorsements with a single query + counterparty join.
  // RLS enforces "user sees only their own rows": for given scope we filter
  // endorser_id = auth.uid(); for received scope, recipient_id = auth.uid().
  // The counterparty join pulls the other party's profile.
  const counterparty = scope === "given" ? "recipient" : "endorser";
  const counterparties = scope === "given" ? "recipient_id" : "endorser_id";

  let query = supabase
    .from("endorsements")
    .select(
      `id, endorsement_type, knowledge_domain, scope_iwi, scope_region,
       work_id, work_ref, notes, status, created_at, revoked_at, revoked_reason,
       ${counterparty}:${counterparties} ( id, full_name, iwi_affiliation_attested, role )`,
    )
    .order("created_at", { ascending: false })
    .limit(1000); // safety cap; can paginate later if needed

  if (scope === "given") {
    query = query.eq("endorser_id", user.id);
  } else {
    query = query.eq("recipient_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    // Don't echo query error to the user (could leak schema info). Log
    // server-side; return generic error.
    console.error("[/api/endorsements/export]", error.message);
    return new NextResponse("Could not generate export.", { status: 500 });
  }

  const rows = (data ?? []) as EndorsementWithParty[];

  // Build the normalised row set
  const normalised: EndorsementRow[] = rows.map((r) => {
    const partyArray = r[counterparty] ?? null;
    const p: Party | null = Array.isArray(partyArray)
      ? partyArray[0] ?? null
      : partyArray;
    return {
      id: r.id,
      endorsement_type: r.endorsement_type,
      knowledge_domain: r.knowledge_domain,
      scope_iwi: r.scope_iwi,
      scope_region: r.scope_region,
      work_id: r.work_id,
      work_ref: r.work_ref,
      notes: r.notes,
      status: r.status,
      created_at: r.created_at,
      revoked_at: r.revoked_at,
      revoked_reason: r.revoked_reason,
      counterparty_id: p?.id ?? "",
      counterparty_name: p?.full_name ?? null,
      counterparty_iwi: p?.iwi_affiliation_attested ?? null,
      counterparty_role: p?.role ?? null,
    };
  });

  // Build the CSV body
  const headers =
    scope === "given"
      ? [
          "endorsement_id",
          "endorsement_type",
          "knowledge_domain",
          "scope_iwi",
          "scope_region",
          "work_id",
          "work_ref",
          "notes",
          "status",
          "created_at",
          "revoked_at",
          "revoked_reason",
          "recipient_id",
          "recipient_name",
          "recipient_iwi_attested",
          "recipient_role",
        ]
      : [
          "endorsement_id",
          "endorsement_type",
          "knowledge_domain",
          "scope_iwi",
          "scope_region",
          "work_id",
          "work_ref",
          "notes",
          "status",
          "created_at",
          "revoked_at",
          "revoked_reason",
          "endorser_id",
          "endorser_name",
          "endorser_iwi_attested",
          "endorser_role",
        ];

  const lines: string[] = [csvRow(headers)];

  for (const r of normalised) {
    if (scope === "given") {
      lines.push(
        csvRow([
          r.id,
          r.endorsement_type,
          r.knowledge_domain,
          r.scope_iwi,
          r.scope_region,
          r.work_id,
          r.work_ref,
          r.notes,
          r.status,
          r.created_at,
          r.revoked_at,
          r.revoked_reason,
          r.counterparty_id,
          r.counterparty_name,
          iwiToString(r.counterparty_iwi),
          r.counterparty_role,
        ]),
      );
    } else {
      lines.push(
        csvRow([
          r.id,
          r.endorsement_type,
          r.knowledge_domain,
          r.scope_iwi,
          r.scope_region,
          r.work_id,
          r.work_ref,
          r.notes,
          r.status,
          r.created_at,
          r.revoked_at,
          r.revoked_reason,
          r.counterparty_id,
          r.counterparty_name,
          iwiToString(r.counterparty_iwi),
          r.counterparty_role,
        ]),
      );
    }
  }

  // Prepend UTF-8 BOM so Excel opens the file with correct encoding
  const BOM = "\uFEFF";
  const body = BOM + lines.join("\r\n") + "\r\n";

  // Build the filename
  const today = new Date().toISOString().slice(0, 10);
  const userShort = user.id.slice(0, 8);
  const filename = `anamata-endorsements-${scope}-${userShort}-${today}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Don't cache — the data changes as the user gives/receives endorsements
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
