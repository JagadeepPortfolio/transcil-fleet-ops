import Image from "next/image"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-muted/40 px-4 py-12">
      {/* Soft radial background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--color-foreground)/6%,transparent_60%)]"
      />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/transcil-logo.png"
            alt="Transcil — Carries with Comfort, Always"
            width={260}
            height={98}
            priority
            className="h-auto w-[220px] dark:brightness-110"
          />
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Fleet Ops
          </div>
        </div>
        {children}
        <p className="text-center text-xs text-muted-foreground">
          Transcil Sustainable Services · Hyderabad
        </p>
      </div>
    </div>
  )
}
