import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { ChevronRight, Plus } from "lucide-react"
import { LabelWarna } from "../components/LabelWarna"
import { RingkasanStok } from "../components/RingkasanStok"
import { SetupCard } from "../components/SetupCard"
import { Badge, Card, EmptyState, ErrorBox, kelasAreaMuat, LinkButton, Loading, PageHeader, SearchField } from "../components/ui"
import { formatAngka, labelJenis } from "../lib/format"
import { useBarangList } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { JenisBarang } from "../types"

type Saring = "semua" | JenisBarang

export function BarangList() {
  const siap = supabaseConfigured()
  const query = useBarangList()
  const [cari, setCari] = useState("")
  const [saring, setSaring] = useState<Saring>("semua")
  const kata = cari.trim().toLowerCase()

  const daftar = useMemo(() => {
    return (query.data ?? []).filter((item) => {
      if (saring !== "semua" && item.jenis !== saring) return false
      if (!kata) return true
      return [item.kode, item.model, item.warna, item.catatan, labelJenis(item.jenis)].some((nilai) => nilai?.toLowerCase().includes(kata))
    })
  }, [query.data, kata, saring])

  return (
    <div className={siap && query.isLoading ? `relative ${kelasAreaMuat}` : undefined}>
      <PageHeader
        title="Barang"
        subtitle="Satu barang adalah satu jenis, model, dan warna."
        action={<LinkButton to="/barang/baru" className="px-3"><Plus size={18} /> Barang</LinkButton>}
      />
      {!siap ? (
        <SetupCard />
      ) : query.isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loading letak="baris" />
        </div>
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <RingkasanStok />
          <SearchField value={cari} onChange={setCari} placeholder="Cari kode, model, atau warna barang" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip aktif={saring === "semua"} onClick={() => setSaring("semua")}>Semua</Chip>
            <Chip aktif={saring === "tas"} onClick={() => setSaring("tas")}>Tas</Chip>
            <Chip aktif={saring === "botol"} onClick={() => setSaring("botol")}>Botol minum</Chip>
            <Chip aktif={saring === "kotak"} onClick={() => setSaring("kotak")}>Kotak makan</Chip>
          </div>
          {query.data?.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Belum ada barang" body="Catat varian tas, botol minum, atau kotak makan. Stoknya nanti dihitung dari isi dus." action={<LinkButton to="/barang/baru">Tambah barang</LinkButton>} />
            </div>
          ) : daftar.length === 0 ? (
            <p className="mt-6 text-sm text-mist-500">Tidak ada barang yang cocok.</p>
          ) : (
            <Card className="mt-4 divide-y divide-white/5">
              {daftar.map((item) => (
                <Link key={item.id} to={`/barang/${item.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <Badge tone={item.jenis}>{labelJenis(item.jenis)}</Badge>
                      <span className="text-xs text-mist-500">{item.kode}</span>
                    </span>
                    <span className="mt-1 block truncate font-semibold">{item.model}</span>
                    <LabelWarna nama={item.warna} className="block text-sm text-mist-500" />
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{formatAngka(item.total_pcs)} pcs</span>
                    <span className="text-xs text-mist-500">{formatAngka(item.jumlah_dus)} dus</span>
                  </span>
                  <ChevronRight size={18} className="text-mist-500" />
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function Chip({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={aktif ? "rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-ink-950" : "rounded-full bg-white/5 px-3 py-1.5 text-sm text-mist-300"}
    >
      {children}
    </button>
  )
}
