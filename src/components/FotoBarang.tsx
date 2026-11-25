import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Handbag, X } from "lucide-react"

export function FotoBarang({
  kecil,
  penuh,
  nama,
  lebar = false,
}: {
  kecil: string | null
  penuh: string | null
  nama: string
  lebar?: boolean
}) {
  const [buka, setBuka] = useState(false)
  const [rusak, setRusak] = useState(false)
  const [src, setSrc] = useState(lebar ? penuh : (kecil ?? penuh))

  useEffect(() => {
    setRusak(false)
    setSrc(lebar ? penuh : (kecil ?? penuh))
  }, [kecil, penuh, lebar])

  if (!penuh || rusak) return <FotoKosong lebar={lebar} />

  return (
    <>
      <button
        type="button"
        className={lebar ? "mb-4 block w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-950" : "h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-950"}
        onClick={() => setBuka(true)}
        aria-label={`Lihat foto ${nama}`}
      >
        <img
          src={src ?? penuh}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className={lebar ? "max-h-64 w-full object-contain" : "h-full w-full object-cover"}
          onError={() => {
            if (src !== penuh) setSrc(penuh)
            else setRusak(true)
          }}
        />
      </button>
      {buka && <PenampilFoto src={penuh} nama={nama} onClose={() => setBuka(false)} />}
    </>
  )
}

function FotoKosong({ lebar }: { lebar: boolean }) {
  return (
    <span
      className={lebar ? "mb-4 grid h-20 w-20 place-items-center rounded-2xl border border-white/10 bg-ink-950 text-mist-500" : "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-950 text-mist-500"}
      aria-hidden
    >
      <Handbag size={lebar ? 28 : 20} />
    </span>
  )
}

function PenampilFoto({ src, nama, onClose }: { src: string; nama: string; onClose: () => void }) {
  const bingkai = useRef<HTMLDivElement>(null)
  const [gagal, setGagal] = useState(false)
  const [ukuran, setUkuran] = useState<{ lebar: number; tinggi: number } | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose])

  useEffect(() => {
    const el = bingkai.current
    if (!el || !ukuran) return
    el.scrollTo({
      left: Math.max(0, (el.scrollWidth - el.clientWidth) / 2),
      top: Math.max(0, (el.scrollHeight - el.clientHeight) / 2),
    })
  }, [ukuran])

  return createPortal(
    <div ref={bingkai} className="fixed inset-0 z-[60] overflow-auto bg-black" role="dialog" aria-modal="true" aria-label={`Foto ${nama}`} onClick={onClose}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[61] flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="pointer-events-auto max-w-[70%] truncate pt-2 text-sm font-medium text-white/80">{nama}</p>
        <button
          type="button"
          className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white"
          onClick={onClose}
          aria-label="Tutup foto"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex min-h-dvh w-max min-w-full items-center justify-center p-4 pt-16">
        {gagal ? (
          <p className="text-sm text-white/80">Foto tidak bisa dimuat.</p>
        ) : (
          <>
            {!ukuran && <p className="text-sm text-white/70">Memuat foto...</p>}
            <img
              src={src}
              alt={nama}
              draggable={false}
              decoding="async"
              className={ukuran ? "max-w-none" : "pointer-events-none absolute h-px w-px opacity-0"}
              style={ukuran ? { width: ukuran.lebar, height: ukuran.tinggi } : undefined}
              onClick={(event) => event.stopPropagation()}
              onLoad={(event) => {
                const img = event.currentTarget
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  setUkuran({ lebar: img.naturalWidth, tinggi: img.naturalHeight })
                }
              }}
              onError={() => setGagal(true)}
            />
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
