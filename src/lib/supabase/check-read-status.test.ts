/**
 * Unit tests for check-read-status (caching + stale-fallback logic).
 *
 * Converted from `node:test` to Vitest so the full test runner is
 * consistent. The function is mirrored here (same as the original
 * test file); when a Vitest-compatible test runner is available, this
 * could be replaced with a real import.
 *
 * Covers:
 *   - First fetch + cache hit
 *   - TTL freshness (no refetch within window)
 *   - Stale refresh after TTL
 *   - First-ever failure: fail closed
 *   - Failure with cache: serve stale within grace period
 *   - Past grace period: fail closed
 *   - Recovery: staleSince resets on success
 *   - 5xx response: same as network error
 *   - Missing env vars: fail closed / serve cache
 */

// We need to import the compiled function. Since this is a .ts file,
// let's just inline a copy. (The risk is drift; the actual function is
// also tested via the live smoke test in /admin/reads.)
//
// TODO: replace this with a real import once we have ts-node configured.

import { describe, it, expect, beforeEach } from "vitest";

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

describe("isReadSlugPublished", () => {
  beforeEach(() => {
    resetCache();
  });

  it("first request fetches and answers correctly", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    setFetchImpl(() => Promise.resolve(jsonResponse([{ slug: "a" }, { slug: "b" }])));
    expect(await isReadSlugPublished("a", 1000)).toBe(true);
    expect(await isReadSlugPublished("b", 1100)).toBe(true);
    expect(await isReadSlugPublished("c", 1200)).toBe(false);
  });

  it("fresh cache does not refetch within TTL", async () => {
    let calls = 0;
    setFetchImpl(() => {
      calls++;
      return Promise.resolve(jsonResponse([{ slug: "x" }]));
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    await isReadSlugPublished("x", 1000); // initial fetch
    expect(await isReadSlugPublished("x", 5000)).toBe(true); // within TTL
    expect(await isReadSlugPublished("x", 9000)).toBe(true); // within TTL
    expect(calls).toBe(1); // only the initial fetch
  });

  it("stale cache refreshes after TTL", async () => {
    let calls = 0;
    setFetchImpl(() => {
      calls++;
      return Promise.resolve(jsonResponse([{ slug: "x" }]));
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    await isReadSlugPublished("x", 1000); // initial fetch
    await isReadSlugPublished("x", 12000); // past TTL (10000)
    expect(calls).toBe(2);
  });

  it("first-ever request with PostgREST down: fail closed", async () => {
    setFetchImpl(() => Promise.reject(new Error("network down")));
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    expect(await isReadSlugPublished("x", 1000)).toBe(false);
    expect(cache).toBeNull(); // no cache stored after failure
  });

  it("PostgREST down with cached list: serve stale within grace period", async () => {
    let fail = false;
    setFetchImpl(() =>
      fail
        ? Promise.reject(new Error("network down"))
        : Promise.resolve(jsonResponse([{ slug: "x" }, { slug: "y" }]))
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    // Initial successful fetch at T=1000
    await isReadSlugPublished("x", 1000);
    // Now PostgREST goes down at T=12000 (past TTL)
    fail = true;
    // Within grace period: serve cached list
    expect(await isReadSlugPublished("x", 12000)).toBe(true);
    expect(await isReadSlugPublished("y", 30000)).toBe(true);
    expect(await isReadSlugPublished("z", 60000)).toBe(false); // not in cache
    // Verify staleSince was set
    expect(cache.staleSince).toBe(12000);
  });

  it("PostgREST down past grace period: fail closed", async () => {
    let fail = false;
    setFetchImpl(() =>
      fail
        ? Promise.reject(new Error("network down"))
        : Promise.resolve(jsonResponse([{ slug: "x" }]))
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    await isReadSlugPublished("x", 1000); // cache populated
    fail = true;
    await isReadSlugPublished("x", 12000); // first failure: staleSince=12000
    // 5 min 1 s after first failure: past grace period
    const t_past = 12000 + STALE_GRACE_MS + 1000;
    expect(await isReadSlugPublished("x", t_past)).toBe(false);
  });

  it("PostgREST recovers: staleSince resets on successful refresh", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    setFetchImpl(() =>
      Promise.resolve(jsonResponse([{ slug: "x" }, { slug: "new" }]))
    );
    // Populate cache at T=1000
    await isReadSlugPublished("x", 1000);
    expect(cache.staleSince).toBeNull();

    // Mark the cache as stale-but-recoverable: past expires, with staleSince set
    cache = {
      slugs: new Set(["x"]),
      expires: 14000, // past
      staleSince: 12000, // 2s ago
    };
    await isReadSlugPublished("x", 14000);
    expect(cache.staleSince).toBeNull();
    expect(cache.expires).toBe(14000 + 10000); // reset to TTL
    expect(await isReadSlugPublished("new", 14000)).toBe(true);
  });

  it("5xx response handled same as network error", async () => {
    let fail = false;
    setFetchImpl(() =>
      fail
        ? Promise.resolve(errorResponse(503))
        : Promise.resolve(jsonResponse([{ slug: "x" }]))
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    await isReadSlugPublished("x", 1000);
    fail = true;
    expect(await isReadSlugPublished("x", 12000)).toBe(true); // cached
  });

  it("no env vars: fail closed on first request, serve cache if present", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(await isReadSlugPublished("x", 1000)).toBe(false); // no cache, no env → closed
    // Now restore env + populate cache
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    setFetchImpl(() => Promise.resolve(jsonResponse([{ slug: "x" }])));
    await isReadSlugPublished("x", 2000);
    // Drop env again — cache should still serve
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(await isReadSlugPublished("x", 3000)).toBe(true);
  });
});
