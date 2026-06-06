/**
 * Admin area shell. Authentication is already enforced by the (app) layout.
 *
 * This area is NOT blanket CMD-only anymore: the Vehicles list is viewable by
 * all roles (read access). Any page that performs writes or is otherwise
 * CMD-only must gate itself — e.g. vehicles new/[id] call getCurrentRole() and
 * redirect non-CMD. New admin pages MUST add their own role check.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
