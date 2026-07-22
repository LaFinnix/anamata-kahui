import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Generic skeleton for stat cards while data loads.
 * Used in `/impact`, `/transparency`, `/admin`, etc.
 */
export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-9 w-16 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for a single row in a list of papers / releases / etc.
 */
export function ListRowSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  );
}
