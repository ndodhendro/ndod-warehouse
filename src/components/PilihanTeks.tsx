import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react"
import { ChevronDown, X } from "lucide-react"
import { cocokKata, normTeks } from "../lib/format"
import { cn } from "./ui"

type Baris = { jenis: "ada"; nilai: string } | { jenis: "baru"; nilai: string }

function unikUrut(nilai: string[]) {
  const peta = new Map<string, string>()
  for (const item of nilai) {
    const bersih = normTeks(item)
    const kunci = bersih.toLowerCase()
    if (!kunci || peta.has(kunci)) continue
    peta.set(kunci, bersih)
  }
  return [...peta.values()].sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }))
}

function cocok(nilai: string, cari: string) {
  return cocokKata(cari, [nilai])
}

export function PilihanTeks({
  label,
  hint,
  value,
  onChange,
  pilihan,
  maxLength,
  required,
  placeholder,
  gaya,
}: {
  label: string
  hint?: string
  value: string
  onChange: (nilai: string) => void
  pilihan: string[]
  maxLength: number
  required?: boolean
  placeholder: string
  gaya?: (nilai: string) => CSSProperties | undefined
}) {
  const daftarId = useId()
  const kotak = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const nilaiRef = useRef(value)
  const [buka, setBuka] = useState(false)
  const [jangkar, setJangkar] = useState<string | null>(null)
  const [sorot, setSorot] = useState(0)
  const opsi = useMemo(() => unikUrut(pilihan), [pilihan])
  const menyaring = buka && jangkar !== null && value !== jangkar
  const tersaring = useMemo(() => opsi.filter((item) => cocok(item, menyaring ? value : "")), [opsi, menyaring, value])
  const teks = normTeks(value)
  const adaPersis = opsi.some((item) => item.toLowerCase() === teks.toLowerCase())
  const daftar = useMemo<Baris[]>(() => {
    const baris: Baris[] = []
    if (teks.length > 0 && !adaPersis) baris.push({ jenis: "baru", nilai: teks })
    for (const nilai of tersaring) baris.push({ jenis: "ada", nilai })
    return baris
  }, [tersaring, teks, adaPersis])
  const indeks = daftar.length === 0 ? 0 : Math.min(sorot, daftar.length - 1)
  const adaIsi = value.length > 0
  const opsiRef = useRef(opsi)
  const onChangeRef = useRef(onChange)
  nilaiRef.current = value
  opsiRef.current = opsi
  onChangeRef.current = onChange

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

  function komit(isi: string) {
    const bersih = normTeks(isi)
    const sama = opsiRef.current.find((item) => item.toLowerCase() === bersih.toLowerCase())
    const berikutnya = sama ?? bersih
    if (berikutnya !== isi) onChangeRef.current(berikutnya)
    setBuka(false)
    setJangkar(null)
  }

  useEffect(() => {
    if (!buka) return
    function diLuar(event: MouseEvent) {
      if (!kotak.current?.contains(event.target as Node)) komit(nilaiRef.current)
    }
    document.addEventListener("click", diLuar, true)
    return () => document.removeEventListener("click", diLuar, true)
  }, [buka])

  function sorotUntuk(isi: string, sedangMenyaring: boolean) {
    const bersih = normTeks(isi)
    const persis = opsi.some((item) => item.toLowerCase() === bersih.toLowerCase())
    if (bersih.length > 0 && !persis) return 0
    const terlihat = opsi.filter((item) => cocok(item, sedangMenyaring ? isi : ""))
    const index = terlihat.findIndex((item) => item.toLowerCase() === bersih.toLowerCase())
    return index >= 0 ? index : 0
  }

  function bukaDaftar() {
    setJangkar(value)
    setSorot(sorotUntuk(value, false))
    setBuka(true)
    input.current?.focus()
  }

  function pilih(baris: Baris) {
    if (baris.jenis === "ada") {
      onChange(baris.nilai)
      setBuka(false)
      setJangkar(null)
      return
    }
    komit(baris.nilai)
  }

  return (
    <div ref={kotak}>
      <span id={`${daftarId}-label`} className="mb-1.5 block text-sm text-mist-300">
        {label}
      </span>
      <div className="relative">
        <input
          ref={input}
          className={cn("field", adaIsi ? "pr-20" : "pr-11")}
          required={required}
          maxLength={maxLength}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={buka}
          aria-controls={daftarId}
          aria-labelledby={`${daftarId}-label`}
          aria-activedescendant={buka && daftar[indeks] ? `${daftarId}-${indeks}` : undefined}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          style={gaya?.(value)}
          onFocus={() => {
            if (!buka) bukaDaftar()
          }}
          onClick={() => {
            if (!buka) bukaDaftar()
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!kotak.current?.contains(document.activeElement)) komit(nilaiRef.current)
            }, 150)
          }}
          onChange={(event) => {
            const berikutnya = event.target.value
            const jangkarBerikutnya = buka ? jangkar : value
            if (!buka) setJangkar(value)
            onChange(berikutnya)
            setSorot(sorotUntuk(berikutnya, jangkarBerikutnya !== null && berikutnya !== jangkarBerikutnya))
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
              const baris = daftar[indeks]
              if (baris) pilih(baris)
              else komit(value)
            } else if (event.key === "Escape" && buka) {
              event.preventDefault()
              komit(value)
            }
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {adaIsi && (
            <button
              type="button"
              className="grid h-11 w-11 place-items-center text-mist-400 hover:text-mist-100"
              aria-label={`Hapus ${label.toLowerCase()}`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange("")
                setJangkar((sekarang) => (sekarang === null ? value : sekarang))
                setSorot(0)
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
            aria-label={buka ? `Tutup daftar ${label.toLowerCase()}` : `Buka daftar ${label.toLowerCase()}`}
            aria-expanded={buka}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              if (buka) komit(value)
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
          className="mt-1 max-h-56 overflow-auto rounded-xl border border-white/10 bg-ink-950"
        >
          {daftar.length === 0 && (
            <p className="px-3 py-3 text-sm text-mist-500">Belum ada pilihan. Ketik nama baru, lalu simpan.</p>
          )}
          {daftar.map((baris, i) => (
            <button
              key={baris.jenis === "baru" ? `baru:${baris.nilai}` : baris.nilai}
              id={`${daftarId}-${i}`}
              type="button"
              role="option"
              data-indeks={i}
              aria-selected={baris.jenis === "ada" && baris.nilai.toLowerCase() === teks.toLowerCase()}
              tabIndex={-1}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSorot(i)}
              onClick={() => pilih(baris)}
              className={cn(
                "block w-full min-h-11 px-3 py-2 text-left",
                i === indeks ? "bg-white/10" : "hover:bg-white/5",
              )}
            >
              {baris.jenis === "ada" ? (
                <span className="block truncate font-medium" style={gaya?.(baris.nilai)}>
                  {baris.nilai}
                </span>
              ) : (
                <>
                  <span className="block truncate font-medium" style={gaya?.(baris.nilai)}>
                    {baris.nilai}
                  </span>
                  <span className="block text-xs text-mist-500">Belum ada di daftar. Tetap bisa disimpan.</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
      {hint && <span className="mt-1.5 block text-xs text-mist-500">{hint}</span>}
    </div>
  )
}
