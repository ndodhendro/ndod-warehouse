import { Link, useParams } from "react-router-dom"
import { ChevronRight, MapPin, Pencil } from "lucide-react"
import { FotoBarang } from "../components/FotoBarang"
import { LabelWarna } from "../components/LabelWarna"
import { SetupCard } from "../components/SetupCard"
import { Badge, Card, EmptyState, ErrorBox, LinkButton, Loading, PageHeader } from "../components/ui"
import { formatAngka, labelJenis } from "../lib/format"
import { useBarang, useSebaran } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"

export function BarangDetail() {
  const { id = "" } = useParams()
  const barang = useBarang(id)
  const sebaran = useSebaran(id)

  if (!supabaseConfigured()) {
    return (
      <div>
        <PageHeader title="Barang" back="/barang" />
        <SetupCard />
      </div>
    )
  }
  if (barang.isLoading || sebaran.isLoading) return <Loading />
  if (barang.error || sebaran.error) return <ErrorBox error={barang.error ?? sebaran.error} />
  if (!barang.data) return <PageHeader title="Barang tidak ditemukan" back="/barang" />

  const data = barang.data
  const lokasi = sebaran.data ?? []

  return (
    <div>
      <PageHeader
        title={data.model}
        subtitle={<><Badge tone={data.jenis}>{labelJenis(data.jenis)}</Badge> · <LabelWarna nama={data.warna} /></>}
        back="/barang"
        action={
          <Link to={`/barang/${data.id}/edit`} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label="Ubah barang">
            <Pencil size={18} />
          </Link>
        }
      />
      <FotoBarang kecil={data.foto_kecil_url} penuh={data.foto_url} nama={data.model} lebar />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card className="px-4 py-3">
          <p className="text-xs text-mist-500">Total stok</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAngka(data.total_pcs)} pcs</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-xs text-mist-500">Tersimpan di</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAngka(data.jumlah_dus)} dus</p>
        </Card>
      </div>
      {data.catatan && <p className="mb-4 text-sm text-mist-300">{data.catatan}</p>}
      <h2 className="mb-3 font-semibold">Lokasi stok</h2>
      {lokasi.length === 0 ? (
        <EmptyState
          title="Belum masuk dus"
          body="Barang ini sudah tercatat, tetapi belum ada stok di dus mana pun."
          action={<LinkButton to="/dus">Pilih dus</LinkButton>}
        />
      ) : (
        <Card className="divide-y divide-white/5">
          {lokasi.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <Link to={`/dus/${item.dus.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.dus.kode}</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-mist-500">
                  <MapPin size={14} className="shrink-0 text-amber-300" />
                  <span className="truncate">{item.dus.lokasi || "Lokasi belum diisi"}</span>
                </span>
              </Link>
              <span className="font-semibold tabular-nums">{formatAngka(item.jumlah)} pcs</span>
              <Link to={`/dus/${item.dus.id}/pindah?barang=${data.id}`} className="text-sm font-semibold text-amber-300">
                Pindahkan
              </Link>
              <ChevronRight size={16} className="text-mist-500" />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
