import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Scanner } from "../components/Scanner"
import { SetupCard } from "../components/SetupCard"
import { Button, Card, ErrorBox, Loading, PageHeader } from "../components/ui"
import { cariKode } from "../lib/api"
import { formatAngka, labelBarang, normKode } from "../lib/format"
import { supabaseConfigured } from "../lib/supabase"

export function Pindai() {
  const siap = supabaseConfigured()
  const navigate = useNavigate()
  const [sesi, setSesi] = useState(0)
  const [kode, setKode] = useState<string | null>(null)
  const [manual, setManual] = useState("")

  const hasil = useQuery({
    queryKey: ["kode", kode],
    queryFn: () => cariKode(kode!),
    enabled: siap && Boolean(kode),
  })

  const pakai = (nilai: string) => {
    const normal = normKode(nilai)
    if (!normal) return
    setKode(normal)
  }

  return (
    <div>
      <PageHeader title="Pindai kode" subtitle="Arahkan kamera ke kode dus atau kode barang." back="/" />
      {!siap ? (
        <SetupCard />
      ) : (
        <>
          {kode ? (
            <div className="space-y-3">
              <Card className="px-4 py-3">
                <p className="text-xs text-mist-500">Kode</p>
                <p className="mt-1 font-semibold">{kode}</p>
              </Card>
              {hasil.isLoading ? (
                <Loading label="Mencari kode..." />
              ) : hasil.error ? (
                <ErrorBox error={hasil.error} />
              ) : (
                <HasilKode
                  kode={kode}
                  dus={hasil.data?.dus ?? null}
                  barang={hasil.data?.barang ?? []}
                  onBukaDus={(id) => navigate(`/dus/${id}`)}
                  onBukaBarang={(id) => navigate(`/barang/${id}`)}
                />
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setKode(null)
                  setSesi((nilai) => nilai + 1)
                }}
              >
                Pindai lagi
              </Button>
            </div>
          ) : (
            <Scanner key={sesi} onResult={pakai} />
          )}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              pakai(manual)
            }}
          >
            <input
              className="field"
              placeholder="Atau ketik kode"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={manual}
              onChange={(event) => setManual(event.target.value)}
            />
            <Button type="submit">Cari</Button>
          </form>
        </>
      )}
    </div>
  )
}

function HasilKode({
  kode,
  dus,
  barang,
  onBukaDus,
  onBukaBarang,
}: {
  kode: string
  dus: { id: string; nama: string | null; kode: string; lokasi: string | null; total_pcs: number } | null
  barang: Array<{ id: string; model: string; warna: string; jenis: "tas" | "botol" | "kotak"; total_pcs: number; jumlah_dus: number }>
  onBukaDus: (id: string) => void
  onBukaBarang: (id: string) => void
}) {
  if (!dus && barang.length === 0) {
    return (
      <Card className="space-y-3 p-4">
        <p className="font-semibold">Kode belum terdaftar</p>
        <p className="text-sm text-mist-300">Simpan kode ini sebagai dus baru atau barang baru.</p>
        <div className="flex gap-2">
          <Link to={`/dus/baru?kode=${encodeURIComponent(kode)}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-ink-950">
            Jadi dus
          </Link>
          <Link to={`/barang/baru?kode=${encodeURIComponent(kode)}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold">
            Jadi barang
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {dus && (
        <button type="button" onClick={() => onBukaDus(dus.id)} className="block w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Dus</p>
          <p className="mt-1 font-semibold">{dus.nama || dus.kode}</p>
          <p className="text-sm text-mist-500">{dus.lokasi || "Lokasi belum diisi"} · {formatAngka(dus.total_pcs)} pcs</p>
        </button>
      )}
      {barang.map((item) => (
        <button key={item.id} type="button" onClick={() => onBukaBarang(item.id)} className="block w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">Barang</p>
          <p className="mt-1 font-semibold">{labelBarang(item)}</p>
          <p className="text-sm text-mist-500">{formatAngka(item.total_pcs)} pcs di {formatAngka(item.jumlah_dus)} dus</p>
        </button>
      ))}
    </div>
  )
}
