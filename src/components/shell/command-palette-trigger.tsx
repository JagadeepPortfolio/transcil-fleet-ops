"use client"

import { Search } from "lucide-react"

/**
 * Decorative trigger button in the header. Doesn't open the palette itself —
 * the global Cmd+K handler inside <CommandPalette /> owns that. Click just
 * dispatches a synthetic Cmd+K so mouse users get the same affordance.
 */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        )
      }}
      className="group flex w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background/60 px-3 py-1.5 text-xs text-muted-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-background"
    >
      <Search className="size-3.5" />
      <span className="flex-1 text-left">Search riders, deployments…</span>
      <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  )
}
