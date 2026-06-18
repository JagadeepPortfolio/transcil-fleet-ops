import { createClient } from "@/lib/supabase/server"

// Change-audit reads. RLS restricts audit_log to CMD, so these return rows only
// for a CMD session (empty otherwise).

export type AuditChange = { old: unknown; new: unknown }

export type AuditEntry = {
  id: number
  table_name: string
  row_id: string
  action: "INSERT" | "UPDATE" | "DELETE"
  actor_name: string | null
  changed_at: string
  changes: Record<string, AuditChange> | null
}

const COLS = "id, table_name, row_id, action, actor_name, changed_at, changes"

/** Full change history for one record (most recent first). */
export async function listAuditForRow(tableName: string, rowId: string): Promise<AuditEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("audit_log")
    .select(COLS)
    .eq("table_name", tableName)
    .eq("row_id", rowId)
    .order("changed_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as unknown as AuditEntry[]
}

/** Recent changes across all audited tables (for the global review screen). */
export async function listRecentAudit(opts: { table?: string; limit?: number } = {}): Promise<AuditEntry[]> {
  const supabase = createClient()
  let q = supabase
    .from("audit_log")
    .select(COLS)
    .order("changed_at", { ascending: false })
    .limit(opts.limit ?? 200)
  if (opts.table) q = q.eq("table_name", opts.table)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as AuditEntry[]
}
