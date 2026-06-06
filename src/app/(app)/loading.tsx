import { Skeleton, TableSkeleton } from "@/components/ui/skeleton"

/**
 * Shared loading fallback for every /(app) route.
 *
 * Next.js shows this instantly (as a Suspense boundary) the moment a nav link
 * is clicked, while the destination page's server component fetches its data.
 * It renders inside (app)/layout.tsx, so the sidebar + header stay put and only
 * the main content area shimmers — clear "something is loading" feedback.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Page header placeholder */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-72" />
      </div>

      {/* Generic content placeholder — most primary screens are tables/lists */}
      <TableSkeleton />
    </div>
  )
}
