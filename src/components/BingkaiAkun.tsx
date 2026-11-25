import type { ReactNode } from "react"

export function BingkaiAkun({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-ink-950 px-4 py-10 text-mist-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_420px_at_0%_-10%,rgba(227,155,43,0.16),transparent_55%),radial-gradient(700px_380px_at_100%_0%,rgba(46,174,147,0.1),transparent_50%)]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
