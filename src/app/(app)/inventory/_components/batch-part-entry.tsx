"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

/**
 * Multi-row part entry used by the "Received from factory" and "Return to
 * Factory" screens. Each row submits repeated `name` / `qty` (/ `partno`)
 * fields; the server reads them with formData.getAll() — indices line up
 * because every row always renders every input.
 *
 * The part-name input is a native <datalist> autocomplete over the existing
 * catalog names. Entries are validated server-side against the catalog
 * (existing parts only).
 */
export function BatchPartEntry({
  partNames,
  extra,
  optional = false,
}: {
  partNames: string[]
  /** Optional third per-row field, e.g. part number (receive) or serial (repair). */
  extra?: { name: string; label: string }
  /** When true, rows aren't required (the whole section can be left empty). */
  optional?: boolean
}) {
  const [rows, setRows] = React.useState<number[]>([0])
  const nextId = React.useRef(1)

  const addRow = () => setRows((r) => [...r, nextId.current++])
  const removeRow = (id: number) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x !== id) : r))

  return (
    <div className="space-y-3">
      <datalist id="part-options">
        {partNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="flex items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <div className="flex-1">Part name</div>
        <div className="w-24">Qty</div>
        {extra ? <div className="w-36">{extra.label}</div> : null}
        <div className="w-8" />
      </div>

      {rows.map((id) => (
        <div key={id} className="flex items-center gap-2">
          <div className="flex-1">
            <input
              list="part-options"
              name="name"
              required={!optional}
              autoComplete="off"
              className={field}
              placeholder="Start typing…"
            />
          </div>
          <div className="w-24">
            <input name="qty" type="number" min={1} defaultValue={1} required className={field} />
          </div>
          {extra ? (
            <div className="w-36">
              <input name={extra.name} className={field} />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => removeRow(id)}
            className="p-2 text-muted-foreground hover:text-destructive"
            aria-label="Remove row"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        <Plus className="size-4" /> Add row
      </button>
    </div>
  )
}
