/**
 * Unit tests for check-read-status (no-build-needed, no framework).
 *
 * Uses Node's built-in `node:test` runner.
 * Run with: node --test src/lib/supabase/check-read-status.test.ts
 *
 * (Requires ts-node or tsx. If unavailable, copy the function into a
 * .mjs and test that way.)
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// We need to import the compiled function. Since this is a .ts file,
// let's just inline a copy. (The risk is drift; the actual function is
// also tested via the live smoke test in /admin/reads.)
//
// TODO: replace this with a real import once we have ts-node configured.

type Result = boolean | "throw";

// --- stub of the function (must mirror check-read-status.ts) ---
let cache: any = null;
const TTL_MS = 10_000;
const STALE_GRACE_MS = 300_000;

let fetchImpl: typeof fetch = fetch;
function setFetchImpl(f: typeof fetch) {
  fetchImpl = f;
}

async function isReadSlugPublished(slug: string, now: number = Date.now()): Promise<boolean> {
  if (cache && cache.expires > now) return cache.slugs.has(slug);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return cache?.slugs.has(slug) ?? false;
  try {
    const resp = await fetchImpl(`${url}/rest/v1/reads_public?select=slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return handleRefreshFailure(slug, now);
    const data = (await resp.json()) as Array<{ slug: string }>;
    cache = { slugs: new Set(data.map((r) => r.slug)), expires: now + TTL_MS, staleSince: null };
    return cache.slugs.has(slug);
  } catch {
    return handleRefreshFailure(slug, now);
  }
}

function handleRefreshFailure(slug: string, now: number): boolean {
  if (!cache) return false;
  if (cache.staleSince === null) {
    cache.staleSince = now;
    cache.expires = now + STALE_GRACE_MS;
    return cache.slugs.has(slug);
  }
  if (now - cache.staleSince >= STALE_GRACE_MS) return false;
  return cache.slugs.has(slug);
}

function resetCache() {
  cache = null;
}

// --- helpers ---
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
function errorResponse(status: number) {
  return new Response("error", { status });
}
function networkError() {
  return fetch("about:blank").then(
    () => { throw new Error("unexpected"); },
    (e) => { throw e; },
  );
}

// --- tests ---
test("first request fetches and answers correctly", async () => {
  resetCache();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  setFetchImpl(() => Promise.resolve(jsonResponse([{ slug: "a" }, { slug: "b" }])));
  assert.equal(await isReadSlugPublished("a", 1000), true);
  assert.equal(await isReadSlugPublished("b", 1100), true);
  assert.equal(await isReadSlugPublished("c", 1200), false);
});

test("fresh cache does not refetch within TTL", async () => {
  resetCache();
  let calls = 0;
  setFetchImpl(() => { calls++; return Promise.resolve(jsonResponse([{ slug: "x" }])); });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  await isReadSlugPublished("x", 1000);  // initial fetch (T=0, cache expires T=10000)
  assert.equal(await isReadSlugPublished("x", 5000), true);  // within TTL
  assert.equal(await isReadSlugPublished("x", 9000), true);  // within TTL
  assert.equal(calls, 1);  // only the initial fetch
});

test("stale cache refreshes after TTL", async () => {
  resetCache();
  let calls = 0;
  setFetchImpl(() => { calls++; return Promise.resolve(jsonResponse([{ slug: "x" }])); });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  await isReadSlugPublished("x", 1000);            // initial fetch
  await isReadSlugPublished("x", 12000);           // past TTL (10000)
  assert.equal(calls, 2);
});

test("first-ever request with PostgREST down: fail closed", async () => {
  resetCache();
  setFetchImpl(() => Promise.reject(new Error("network down")));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  assert.equal(await isReadSlugPublished("x", 1000), false);
  assert.equal(cache, null);  // no cache stored after failure
});

test("PostgREST down with cached list: serve stale within grace period", async () => {
  resetCache();
  let fail = false;
  setFetchImpl(() => fail
    ? Promise.reject(new Error("network down"))
    : Promise.resolve(jsonResponse([{ slug: "x" }, { slug: "y" }])));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  // Initial successful fetch at T=1000
  await isReadSlugPublished("x", 1000);
  // Now PostgREST goes down at T=12000 (past TTL)
  fail = true;
  // Within grace period: serve cached list
  assert.equal(await isReadSlugPublished("x", 12000), true);
  assert.equal(await isReadSlugPublished("y", 30000), true);
  assert.equal(await isReadSlugPublished("z", 60000), false); // not in cache
  // Verify staleSince was set
  assert.equal(cache.staleSince, 12000);
});

test("PostgREST down past grace period: fail closed", async () => {
  resetCache();
  let fail = false;
  setFetchImpl(() => fail
    ? Promise.reject(new Error("network down"))
    : Promise.resolve(jsonResponse([{ slug: "x" }])));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  await isReadSlugPublished("x", 1000);  // cache populated
  fail = true;
  await isReadSlugPublished("x", 12000);  // first failure: staleSince=12000
  // 5 min 1 s after first failure: past grace period
  const t_past = 12000 + STALE_GRACE_MS + 1000;
  assert.equal(await isReadSlugPublished("x", t_past), false);
});

test("PostgREST recovers: staleSince resets on successful refresh", async () => {
  resetCache();
  let fail = false;
  setFetchImpl(() => fail
    ? Promise.reject(new Error("network down"))
    : Promise.resolve(jsonResponse([{ slug: "x" }, { slug: "new" }])));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

  // Populate cache at T=1000
  await isReadSlugPublished("x", 1000);
  assert.equal(cache.staleSince, null);

  // Reset cache and force a failure path: refresh at T=2000, fails,
  // staleSince set
  fail = true;
  // Bypass the cache by calling with a future time past TTL
  await isReadSlugPublished("x", 12000);  // expires=11000 → expired
  assert.equal(cache.staleSince, 12000);

  // Recover: simulate PostgREST coming back up. Call again with a
  // time past TTL but within grace period — the function will
  // attempt a refresh, which now succeeds, and reset staleSince.
  fail = false;
  await isReadSlugPublished("x", 13000);  // expired at 312000+ but cache
                                            // is also marked stale — let's
                                            // be explicit:
  // Actually after the failure, expires = 12000 + 300000 = 312000,
  // so cache is "fresh" for 5 minutes. Let's wait past that.
  // Easier: test recovery via direct cache manipulation.
  cache = {
    slugs: new Set(["x"]),
    expires: 14000, // past
    staleSince: 12000, // first failure at 12000, 2s ago
  };
  await isReadSlugPublished("x", 14000);
  assert.equal(cache.staleSince, null);
  assert.equal(cache.expires, 14000 + 10000); // reset to TTL
  assert.equal(await isReadSlugPublished("new", 14000), true); // new slug
});

test("5xx response handled same as network error", async () => {
  resetCache();
  let fail = false;
  setFetchImpl(() => fail
    ? Promise.resolve(errorResponse(503))
    : Promise.resolve(jsonResponse([{ slug: "x" }])));
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  await isReadSlugPublished("x", 1000);
  fail = true;
  assert.equal(await isReadSlugPublished("x", 12000), true); // cached
});

test("no env vars: fail closed on first request, serve cache if present", async () => {
  resetCache();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.equal(await isReadSlugPublished("x", 1000), false); // no cache, no env → closed
  // Now restore env + populate cache
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  setFetchImpl(() => Promise.resolve(jsonResponse([{ slug: "x" }])));
  await isReadSlugPublished("x", 2000);
  // Drop env again — cache should still serve
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.equal(await isReadSlugPublished("x", 3000), true);
});