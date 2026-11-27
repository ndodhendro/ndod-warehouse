import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { LabelWarna } from "./LabelWarna"
import { Loading, cn } from "./ui"
import { cocokKata, labelBarang, labelJenis } from "../lib/format"
import type { Barang } from "../types"

export function PilihBarang({
  katalog,
  memuat,
  dipilih,
  onPilih,
  maksTampil,
}: {
  katalog: Barang[]
  memuat: boolean
  dipilih: string | null
  onPilih: (id: string | null) => void
  maksTampil?: number
}) {
  const daftarId = useId()
  const kotak = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [buka, setBuka] = useState(false)
  const [cari, setCari] = useState("")
  const [sorot, setSorot] = useState(0)
  const barang = katalog.find((item) => item.id === dipilih)
  const daftar = useMemo(() => {
    return katalog.filter((item) => cocokKata(cari, [item.kode, item.model, item.warna, labelJenis(item.jenis)]))
  }, [katalog, cari])
  const indeks = daftar.length === 0 ? 0 : Math.min(sorot, daftar.length - 1)
  const adaBersih = buka ? cari.length > 0 : Boolean(dipilih)

  useEffect(() => {
    if (!buka) return
    const el = panel.current?.querySelector<HTMLElement>(`[data-indeks="${indeks}"]`)
    const batas = panel.current
    if (!el || !batas) return
    const kotakDaftar = batas.getBoundingClientRect()
    const item = el.getBoundingClientRect()
    if (item.top < kotakDaftar.top) batas.scrollTop -= kotakDaftar.top - item.top
    else if (item.bottom > kotakDaftar.bottom) batas.scrollTop += item.bottom - kotakDaftar.bottom
  }, [buka, indeks, daftar.length])

  useEffect(() => {
    if (!buka) return
    function diLuar(event: MouseEvent) {
      if (!kotak.current?.contains(event.target as Node)) {
        setBuka(false)
        setCari("")
      }
    }
    document.addEventListener("click", diLuar, true)
    return () => document.removeEventListener("click", diLuar, true)
  }, [buka])

  function tutup() {
    setBuka(false)
    setCari("")
  }

  function pilih(id: string) {
    onPilih(id)
    tutup()
  }

  function bukaDaftar() {
    const index = katalog.findIndex((item) => item.id === dipilih)
    setSorot(index >= 0 ? index : 0)
    setBuka(true)
    input.current?.focus()
  }

  return (
    <div ref={kotak}>
      <span id={`${daftarId}-label`} className="mb-1.5 block text-sm text-mist-300">Barang</span>
      <div className="relative">
        <input
          ref={input}
          className={cn("field", adaBersih ? "pr-20" : "pr-11")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={buka}
          aria-controls={daftarId}
          aria-labelledby={`${daftarId}-label`}
          aria-activedescendant={buka && daftar[indeks] ? `${daftarId}-${daftar[indeks].id}` : undefined}
          placeholder="Cari jenis, model, atau warna barang"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={buka ? cari : barang ? labelBarang(barang) : ""}
          onFocus={() => {
            if (!buka) bukaDaftar()
          }}
          onClick={() => {
            if (!buka) bukaDaftar()
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!kotak.current?.contains(document.activeElement)) tutup()
            }, 150)
          }}
          onChange={(event) => {
            setCari(event.target.value)
            setSorot(0)
            setBuka(true)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              if (!buka) bukaDaftar()
              else setSorot(indeks + 1)
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              if (buka) setSorot(Math.max(0, indeks - 1))
            } else if (event.key === "Enter" && buka) {
              event.preventDefault()
              const item = daftar[indeks]
              if (item) pilih(item.id)
            } else if (event.key === "Escape" && buka) {
              event.preventDefault()
              tutup()
            }
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {adaBersih && (
            <button
              type="button"
              className="grid h-11 w-11 place-items-center text-mist-400 hover:text-mist-100"
              aria-label="Hapus pilihan"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onPilih(null)
                setCari("")
                setBuka(true)
                input.current?.focus()
              }}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-mist-400 hover:text-mist-100"
            aria-label={buka ? "Tutup daftar barang" : "Buka daftar barang"}
            aria-expanded={buka}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              if (buka) tutup()
              else bukaDaftar()
            }}
          >
            <ChevronDown size={18} className={buka ? "rotate-180" : undefined} />
          </button>
        </div>
      </div>
      {buka && (
        <div
          ref={panel}
          id={daftarId}
          role="listbox"
          aria-labelledby={`${daftarId}-label`}
          className={cn("mt-1 overflow-y-auto rounded-xl border border-white/10 bg-ink-950", maksTampil == null && "max-h-56")}
          style={maksTampil != null ? { maxHeight: `calc(${maksTampil} * 2.5rem + 2px)` } : undefined}
        >
          {memuat && <Loading letak="baris" />}
          {!memuat && daftar.length === 0 && <p className="px-3 py-3 text-sm text-mist-500">Tidak ada barang yang cocok.</p>}
          {daftar.map((item, i) => (
            <button
              key={item.id}
              id={`${daftarId}-${item.id}`}
              type="button"
              role="option"
              data-indeks={i}
              aria-selected={dipilih === item.id}
              tabIndex={-1}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSorot(i)}
              onClick={() => pilih(item.id)}
              className={cn(
                "block w-full px-3 py-2 text-left",
                maksTampil != null && "h-10",
                dipilih === item.id ? "bg-amber-500/15" : i === indeks ? "bg-white/10" : "hover:bg-white/5",
              )}
            >
              <span className="block truncate font-medium">{labelJenis(item.jenis)} · {item.model} · <LabelWarna nama={item.warna} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
