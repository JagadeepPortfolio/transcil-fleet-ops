import { z } from "zod"

/**
 * UUID format check that accepts any 8-4-4-4-12 hex string.
 *
 * Zod v4's `.uuid()` enforces strict RFC 4122 version (1-8) and variant
 * (8/9/a/b) bits, which rejects synthetic seed UUIDs like
 * `20000000-0000-0000-0000-000000000005`. Since we only need to validate
 * that the string *looks like* a UUID (the DB enforces the FK), this
 * relaxed check is the right trade-off.
 *
 * Use this everywhere instead of `z.string().uuid()`.
 */
export const dbUuid = (msg: string) =>
  z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    msg,
  )
