import { warnaTeks } from "../lib/warna"

export function LabelWarna({ nama, className }: { nama: string; className?: string }) {
  const warna = warnaTeks(nama)
  return (
    <span className={className} style={warna ? { color: warna } : undefined}>
      {nama}
    </span>
  )
}
