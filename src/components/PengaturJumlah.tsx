import { useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"

export function PengaturJumlah({
  nilai,
  min,
  max,
  onUbah,
  label,
  disabled = false,
}: {
  nilai: number
  min: number
  max: number
  onUbah: (nilai: number) => void
  label: string
  disabled?: boolean
}) {
  const [draf, setDrafState] = useState<string | null>(null)
  const drafRef = useRef<string | null>(null)
  const nilaiRef = useRef(nilai)
  const kunci = useRef(false)
  nilaiRef.current = nilai

  function setDraf(berikutnya: string | null) {
    drafRef.current = berikutnya
    setDrafState(berikutnya)
  }

  function batasi(angka: number) {
    return Math.min(max, Math.max(min, angka))
  }

  function terapkan(angka: number) {
    const terbatas = batasi(angka)
    nilaiRef.current = terbatas
    onUbah(terbatas)
  }

  function angkaDasar() {
    const mentah = drafRef.current
    if (mentah === null) return nilaiRef.current
    if (mentah === "") return min
    const angka = Number(mentah)
    return Number.isInteger(angka) ? batasi(angka) : nilaiRef.current
  }

  function selesai() {
    if (drafRef.current === null) return
    const mentah = drafRef.current
    setDraf(null)
    if (mentah === "") {
      terapkan(min)
      return
    }
    const angka = Number(mentah)
    terapkan(Number.isInteger(angka) ? angka : nilaiRef.current)
  }

  function geser(delta: number) {
    if (kunci.current) return
    kunci.current = true
    terapkan(angkaDasar() + delta)
    setDraf(null)
    window.setTimeout(() => {
      kunci.current = false
    }, 0)
  }

  function ubahTeks(mentah: string) {
    const bersih = mentah.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
    if (bersih === "") {
      setDraf("")
      return
    }
    const angka = Number(bersih)
    if (!Number.isInteger(angka)) return
    if (angka > max) {
      setDraf(String(max))
      terapkan(max)
      return
    }
    setDraf(bersih)
    if (angka >= min) terapkan(angka)
  }

  const namaJumlah = label === "jumlah" ? "Jumlah" : `Jumlah ${label}`

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 disabled:opacity-40"
        aria-label={`Kurangi ${label}`}
        disabled={disabled || nilai <= min}
        onPointerDown={(event) => {
          event.preventDefault()
          if (!disabled && nilai > min) geser(-1)
        }}
        onClick={() => geser(-1)}
      >
        <Minus size={16} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        aria-label={namaJumlah}
        disabled={disabled}
        value={draf ?? String(nilai)}
        onFocus={(event) => {
          const el = event.currentTarget
          if (drafRef.current === null) setDraf(String(nilaiRef.current))
          el.select()
          requestAnimationFrame(() => el.select())
        }}
        onChange={(event) => ubahTeks(event.target.value)}
        onBlur={selesai}
        className="h-11 w-20 shrink-0 rounded-xl border border-white/10 bg-ink-950 px-1 text-center font-semibold tabular-nums outline-none ring-amber-400 focus:ring-2 disabled:opacity-40"
      />
      <button
        type="button"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 disabled:opacity-40"
        aria-label={`Tambah ${label}`}
        disabled={disabled || nilai >= max}
        onPointerDown={(event) => {
          event.preventDefault()
          if (!disabled && nilai < max) geser(1)
        }}
        onClick={() => geser(1)}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
