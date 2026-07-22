#!/usr/bin/env node
/**
 * Import the Anamata waiata catalog into Supabase.
 *
 * Source: /opt/data/anamata/catalog/catalog.json
 * Target: public.releases + iwi_consent_id linkages
 *
 * Re-runnable: existing rows are upserted on slug.
 *
 * Usage: node scripts/import_catalog.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or environment variables in the shell).
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

try {
  config({ path: envPath });
} catch {
  // ignore — env may be passed via shell
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`Missing env vars. Check ${envPath} or export them.`);
  process.exit(1);
}

const catalogPath = "/opt/data/anamata/catalog/catalog.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Fetch branch + iwi gate map
const [branchesResult, iwiGatesResult] = await Promise.all([
  supabase.from("branches").select("id, slug"),
  supabase.from("iwi_gates").select("id, iwi_name, scope"),
]);

const branchIdBySlug = Object.fromEntries(
  (branchesResult.data ?? []).map((b) => [b.slug, b.id]),
);

// Pick the most-restrictive matching iwi gate for a waiata (kaitiaki-only
// > public). Falls back to Pan-iwi if no specific gate matches.
function pickGate(iwiNames) {
  const matching = (iwiGatesResult.data ?? []).filter((g) =>
    iwiNames.includes(g.iwi_name),
  );
  if (matching.length === 0) {
    const panIwi = (iwiGatesResult.data ?? []).find((g) => g.iwi_name === "Pan-iwi");
    return panIwi?.id ?? null;
  }
  const order = ["restricted", "iwi_only", "hapu_only", "public"];
  for (const scope of order) {
    const hit = matching.find((g) => g.scope === scope);
    if (hit) return hit.id;
  }
  return matching[0]?.id ?? null;
}

const recordsBranchId = branchIdBySlug["records"];
if (!recordsBranchId) {
  console.error("Records branch not found in DB. Did migration 0001 run?");
  process.exit(1);
}

// Anamata Records is the single artist-side entity currently holding the
// waiata catalog. Once individual artist profiles ship, this is replaced
// with per-waiata artist attribution.
const ANAMATA_RECORDS_ARTIST_ID = process.env.ANAMATA_RECORDS_ARTIST_ID;
if (!ANAMATA_RECORDS_ARTIST_ID) {
  console.error("Set ANAMATA_RECORDS_ARTIST_ID in your env or .env.local.");
  console.error("(See scripts/onboard_artist.mjs to create one.)");
  process.exit(1);
}

let upserted = 0;
let skipped = 0;
const slugMap = new Map(); // slug -> release_id

for (const [key, w] of Object.entries(catalog.waiata)) {
  const iwiConsentId = pickGate(w.iwi_gates ?? []);

  // Map catalog status → schema enum
  const status =
    w.status === "released"
      ? "released"
      : w.status === "in_progress"
        ? "scheduled"
        : w.status === "drafted"
          ? "draft"
          : "draft";

  const row = {
    title: w.title,
    description: w.extra?.english_gloss
      ? `${w.extra.english_gloss} — ${w.source ?? ""}`
      : w.source ?? null,
    status,
    release_date: null, // catalog doesn't carry dates yet
    upc_isrc: null,
    cover_art_url: null,
    artist_id: ANAMATA_RECORDS_ARTIST_ID, // populated when an Artists table ships
    branch_id: recordsBranchId,
    language_code: "mi",
    iwi_consent_id: iwiConsentId,
    cultural_sensitivity: iwiConsentId
      ? (w.cultural_flags?.includes("tapu_consideration") ? "tapu" : "attributed")
      : "open",
    metadata: {
      slug: w.slug,
      source: w.source,
      iwi_gates: w.iwi_gates,
      cultural_flags: w.cultural_flags,
      english_gloss: w.extra?.english_gloss ?? null,
      kinds: w.extra?.kinds ?? [],
      catalog_key: key,
    },
  };

  // Upsert by metadata->>slug (unique in metadata JSONB). For simplicity
  // here we query first then insert/update.
  const { data: existing } = await supabase
    .from("releases")
    .select("id")
    .eq("metadata->>slug", w.slug)
    .eq("branch_id", recordsBranchId)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("releases")
      .update(row)
      .eq("id", existing.id);
    slugMap.set(w.slug, existing.id);
  } else {
    result = await supabase.from("releases").insert(row).select("id").single();
    if (result.data) slugMap.set(w.slug, result.data.id);
  }

  if (result.error) {
    console.error(`✗ ${w.slug}:`, result.error.message);
    skipped++;
  } else {
    upserted++;
    if (upserted % 5 === 0) console.log(`  ${upserted} processed...`);
  }
}

console.log(`\nDone. Upserted: ${upserted}, Skipped: ${skipped}, Total in catalog: ${Object.keys(catalog.waiata).length}`);

// 2. Write a slug->id map for downstream scripts
const mapPath = resolve(__dirname, "../.slug-map.json");
const fs = await import("node:fs");
fs.writeFileSync(mapPath, JSON.stringify(Object.fromEntries(slugMap), null, 2));
console.log(`Wrote ${mapPath}`);
