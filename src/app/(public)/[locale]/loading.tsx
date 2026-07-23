/**
 * Loading skeleton for (public) routes with DB queries.
 *
 * Renders while server components fetch data — improves perceived
 * performance on slow connections and on first page load. Uses the
 * same vertical rhythm as content pages so layout doesn't shift
 * when real content arrives.
 *
 * Mirrors the structure of /impact, /waiata, /press, /for-funders —
 * pages with stat cards, brand headers, and content sections.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8" aria-label="Loading">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Stat grid skeleton — matches the Cultural / Industry sections */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border p-3">
            <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Content skeleton — matches the long-form sections */}
      <div className="mt-12 space-y-6">
        <div className="h-8 w-1/3 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Card grid skeleton */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-border p-6 space-y-2"
          >
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}