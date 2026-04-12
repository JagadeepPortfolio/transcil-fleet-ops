/**
 * Placeholder Database type.
 *
 * Real types are generated from the live Postgres schema via:
 *   pnpm db:types
 * which runs `supabase gen types typescript --local --schema public`.
 *
 * Once Supabase is running locally (or against a remote project) regenerate
 * this file — do NOT hand-edit it.
 *
 * The placeholder is intentionally loose (any-typed rows) so the rest of the
 * codebase type-checks before migrations have been applied. Individual query
 * helpers (src/lib/db/*.ts) declare their own Row types and cast the results.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type LooseTable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Row: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Insert: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Update: any
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      [key: string]: LooseTable
    }
    Views: {
      [key: string]: { Row: Record<string, unknown>; Relationships: [] }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
