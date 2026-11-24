import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ChevronRight, Download, Plus } from "lucide-react"
import { SetupCard } from "../components/SetupCard"
import { Badge, Button, Card, EmptyState, ErrorBox, LinkButton, Loading, PageHeader, SearchField, useToast } from "../components/ui"
import { ambilSebaranEkspor } from "../lib/api"
import { pesanError } from "../lib/errors"
import { formatAngka, labelJenis, unduhCsv } from "../lib/format"
import { useBarangList } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { JenisBarang } from "../types"

type Saring = "semua" | JenisBarang

export function BarangList() {
  const siap = supabaseConfigured()
  const query = useBarangList()
  const toast = useToast()
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

  const ekspor = useMutation({
    mutationFn: ambilSebaranEkspor,
    onSuccess: (baris) => {
      if (baris.length === 0) {
        toast("Belum ada stok untuk diunduh.", "err")
        return
      }
      unduhCsv(`stok-gudang-${new Date().toISOString().slice(0, 10)}.csv`, [
        ["Kode dus", "Lokasi dus", "Kode barang", "Jenis", "Model", "Warna", "Jumlah"],
        ...baris.map((item) => [item.dus_kode, item.dus_lokasi, item.barang_kode, item.jenis, item.model, item.warna, String(item.jumlah)]),
      ])
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  return (
    <div>
      <PageHeader
        title="Barang"
        subtitle="Satu barang adalah satu jenis, model, dan warna."
        action={<LinkButton to="/barang/baru" className="px-3"><Plus size={18} /> Barang</LinkButton>}
      />
      {!siap ? (
        <SetupCard />
      ) : query.isLoading ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} />
      ) : (
        <>
          <SearchField value={cari} onChange={setCari} placeholder="Cari kode, model, atau warna" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip aktif={saring === "semua"} onClick={() => setSaring("semua")}>Semua</Chip>
            <Chip aktif={saring === "tas"} onClick={() => setSaring("tas")}>Tas</Chip>
            <Chip aktif={saring === "botol"} onClick={() => setSaring("botol")}>Botol minum</Chip>
            <Chip aktif={saring === "kotak"} onClick={() => setSaring("kotak")}>Kotak makan</Chip>
            <Button variant="quiet" className="ml-auto min-h-9 px-3" disabled={ekspor.isPending} onClick={() => ekspor.mutate()}>
              <Download size={16} />
              CSV
            </Button>
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
                    <span className="block text-sm text-mist-500">{item.warna}</span>
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
