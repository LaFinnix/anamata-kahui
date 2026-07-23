/**
 * Integration tests for the cultural-review gating trigger.
 *
 * Verifies the database-level rule:
 *   "Cannot transition release to status 'scheduled' or 'released'
 *    unless cultural_review_status = 'approved'"
 *
 * Uses the service role to insert/update rows directly. Real DB
 * round-trips; safe to run against a staging environment.
 *
 * Run with:
 *   NEXT_PUBLIC_SUPABASE_URL=... \\
 *   SUPABASE_SERVICE_ROLE_KEY=... \\
 *   node --experimental-strip-types --test \\
 *     supabase/migrations/0010_collaboration.test.ts
 *
 * NOT for production — it inserts and updates real rows.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "Skipping: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
  );
  process.exit(0);
}

interface Release {
  id: string;
  status: string;
  cultural_review_status: string;
}

async function db<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase ${resp.status}: ${text}`);
  }
  return (await resp.json()) as T;
}

let testReleaseId: string;
let testArtistId: string;

before(async () => {
  // Need a real artist for the releases.branch_id FK. Pick the first
  // one we have (or skip if no artists).
  const profiles = await db<Array<{ id: string }>>(
    "/profiles?select=id&limit=1",
  );
  if (!profiles.length) {
    console.error("Skipping: no profiles in database");
    process.exit(0);
  }
  testArtistId = profiles[0].id;
  // We need a branch. Pick the first one.
  const branches = await db<Array<{ id: string }>>(
    "/branches?select=id&limit=1",
  );
  if (!branches.length) {
    console.error("Skipping: no branches in database");
    process.exit(0);
  }
  const branchId = branches[0].id;

  // Create a fresh release for the test
  const slug = `gating-test-${Date.now()}`;
  const created = await db<Array<Release>>("/releases", {
    method: "POST",
    body: JSON.stringify({
      title: "Gating trigger test release",
      status: "draft",
      cultural_review_status: "pending",
      artist_id: testArtistId,
      branch_id: branchId,
      metadata: { kinds: ["waiata"], slug },
    }),
  });
  testReleaseId = created[0].id;
});

after(async () => {
  // Clean up the test release
  await db(`/releases?id=eq.${testReleaseId}`, { method: "DELETE" });
});

test("gating trigger blocks status='released' when cultural_review_status='pending'", async () => {
  // The release is created with status='draft' + cultural_review_status='pending'.
  // Try to PATCH to status='released'. The trigger should fire and reject.
  const resp = await fetch(`${URL}/rest/v1/releases?id=eq.${testReleaseId}`, {
    method: "PATCH",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "released" }),
  });

  // The trigger raises an exception, so the request should fail.
  assert.equal(resp.status, 400, "expected 400 from trigger, got " + resp.status);
  const text = await resp.text();
  // The error message should mention cultural_review_status.
  assert.match(
    text,
    /cultural_review_status/,
    `expected error to mention cultural_review_status, got: ${text}`,
  );
});

test("gating trigger blocks status='scheduled' when cultural_review_status='pending'", async () => {
  const resp = await fetch(`${URL}/rest/v1/releases?id=eq.${testReleaseId}`, {
    method: "PATCH",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "scheduled" }),
  });

  assert.equal(resp.status, 400, "expected 400 from trigger, got " + resp.status);
  const text = await resp.text();
  assert.match(text, /cultural_review_status/);
});

test("gating trigger allows status='draft' (early stage)", async () => {
  // Already in draft, but let's verify the PATCH succeeds
  const resp = await fetch(`${URL}/rest/v1/releases?id=eq.${testReleaseId}`, {
    method: "PATCH",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ title: "Updated title" }),
  });
  assert.equal(resp.status, 200, "draft PATCH should succeed");
});

test("gating trigger allows status='released' when cultural_review_status='approved'", async () => {
  // First approve the cultural review
  await db(`/releases?id=eq.${testReleaseId}`, {
    method: "PATCH",
    body: JSON.stringify({ cultural_review_status: "approved" }),
  });

  // Now we can set status to 'released'
  const resp = await fetch(`${URL}/rest/v1/releases?id=eq.${testReleaseId}`, {
    method: "PATCH",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "released" }),
  });
  assert.equal(
    resp.status,
    200,
    "approved cultural review should allow status='released', got " + resp.status,
  );

  // Verify the row is now released
  const updated = await db<Array<Release>>(
    `/releases?select=id,status,cultural_review_status&id=eq.${testReleaseId}`,
  );
  assert.equal(updated[0].status, "released");
  assert.equal(updated[0].cultural_review_status, "approved");
});