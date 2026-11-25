import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Handbag } from "lucide-react"
import { PilihanTeks } from "../components/PilihanTeks"
import { Button, ErrorBox, Field, FormActions, Loading, PageHeader, useConfirm, useToast } from "../components/ui"
import { hapusBarang, simpanBarang } from "../lib/api"
import { pesanError } from "../lib/errors"
import { useBarang, useBarangList } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import { warnaTeks } from "../lib/warna"
import type { BarangInput } from "../types"

const awal: BarangInput = { kode: "", jenis: "tas", model: "", warna: "", catatan: "" }

export function BarangForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const query = useBarang(id)
  const katalog = useBarangList()
  const [form, setForm] = useState<BarangInput>({ ...awal, model: params.get("kode") ?? "" })
  const [berkas, setBerkas] = useState<File | null>(null)
  const [hapusFoto, setHapusFoto] = useState(false)
  const [pratinjau, setPratinjau] = useState<string | null>(null)
  const inputFoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!query.data) return
    setForm({
      kode: query.data.kode,
      jenis: query.data.jenis,
      model: query.data.model,
      warna: query.data.warna,
      catatan: query.data.catatan ?? "",
    })
    setBerkas(null)
    setHapusFoto(false)
  }, [query.data])

  useEffect(() => {
    if (!berkas) {
      setPratinjau(null)
      return
    }
    const url = URL.createObjectURL(berkas)
    setPratinjau(url)
    return () => URL.revokeObjectURL(url)
  }, [berkas])

  const modelSaran = useMemo(() => (katalog.data ?? []).map((item) => item.model), [katalog.data])
  const warnaSaran = useMemo(() => (katalog.data ?? []).map((item) => item.warna), [katalog.data])

  const simpan = useMutation({
    mutationFn: () => simpanBarang(id ?? null, form, { berkas, hapus: hapusFoto && !berkas }),
    onSuccess: async (barangId) => {
      await qc.invalidateQueries()
      toast(id ? "Barang diperbarui." : "Barang ditambahkan.")
      navigate(`/barang/${barangId}`, { replace: true })
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  const hapus = useMutation({
    mutationFn: () => hapusBarang(id!),
    onSuccess: async () => {
      await qc.invalidateQueries()
      toast("Barang dihapus.")
      navigate("/barang", { replace: true })
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  if (id && query.isLoading) return <Loading />
  if (id && query.error) return <ErrorBox error={query.error} />
  if (id && query.data === null) return <PageHeader title="Barang tidak ditemukan" back="/barang" />

  const tersimpan = (query.data?.total_pcs ?? 0) > 0
  const fotoLama = !hapusFoto ? query.data?.foto_url ?? null : null
  const tampilan = pratinjau ?? fotoLama

  function pilihFoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const tipe = file.type.toLowerCase()
    const nama = file.name.toLowerCase()
    const didukung = /^image\/(jpeg|png|webp|heic|heif)$/.test(tipe) || /\.(jpe?g|png|webp|heic|heif)$/.test(nama) || tipe.startsWith("image/")
    if (!didukung) {
      toast("Gunakan foto JPG, PNG, atau WEBP.", "err")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast("Foto terlalu besar. Maksimal 20 MB.", "err")
      return
    }
    setHapusFoto(false)
    setBerkas(file)
  }

  return (
    <div>
      <PageHeader
        kicker={id ? undefined : "Baru"}
        title={id ? "Ubah barang" : "Tambah barang"}
        subtitle=""
        back={id ? `/barang/${id}` : "/barang"}
      />
      {!supabaseConfigured() && (
        <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Supabase belum terhubung. Form ini belum bisa disimpan.
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          simpan.mutate()
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          <JenisTombol aktif={form.jenis === "tas"} onClick={() => setForm({ ...form, jenis: "tas" })}>Tas</JenisTombol>
          <JenisTombol aktif={form.jenis === "botol"} onClick={() => setForm({ ...form, jenis: "botol" })}>Botol minum</JenisTombol>
          <JenisTombol aktif={form.jenis === "kotak"} onClick={() => setForm({ ...form, jenis: "kotak" })}>Kotak makan</JenisTombol>
        </div>
        <PilihanTeks
          label="Model"
          hint=""
          value={form.model}
          onChange={(model) => setForm({ ...form, model })}
          pilihan={modelSaran}
          maxLength={80}
          required
          placeholder="Cari atau ketik model"
        />
        <PilihanTeks
          label="Warna"
          value={form.warna}
          onChange={(warna) => setForm({ ...form, warna })}
          pilihan={warnaSaran}
          maxLength={40}
          required
          placeholder="Cari atau ketik warna"
          gaya={(nama) => {
            const warna = warnaTeks(nama)
            return warna ? { color: warna } : undefined
          }}
        />
        <div>
          <span className="mb-1.5 block text-sm text-mist-300">Foto</span>
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-ink-950 text-mist-500">
              {tampilan ? <img src={tampilan} alt="" className="h-full w-full object-cover" /> : <Handbag size={22} />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <Button type="button" variant="ghost" disabled={simpan.isPending} onClick={() => inputFoto.current?.click()}>
                {tampilan ? "Ganti foto" : "Pilih foto"}
              </Button>
              {berkas && query.data?.foto_path && !hapusFoto && (
                <button type="button" className="px-1 text-sm font-semibold text-mist-300 disabled:opacity-50" disabled={simpan.isPending} onClick={() => setBerkas(null)}>
                  Batalkan pilihan
                </button>
              )}
              {tampilan && (
                <button
                  type="button"
                  className="px-1 text-sm font-semibold text-clay-400 disabled:opacity-50"
                  disabled={simpan.isPending}
                  onClick={() => {
                    setBerkas(null)
                    setHapusFoto(true)
                  }}
                >
                  Hapus foto
                </button>
              )}
              {hapusFoto && !berkas && query.data?.foto_path && (
                <button type="button" className="px-1 text-left text-sm text-mist-300 disabled:opacity-50" disabled={simpan.isPending} onClick={() => setHapusFoto(false)}>
                  Foto akan dihapus. Urungkan
                </button>
              )}
            </div>
          </div>
          <input ref={inputFoto} type="file" accept="image/*" className="sr-only" onChange={pilihFoto} />
          <span className="mt-1.5 block text-xs text-mist-500">Opsional</span>
        </div>
        <Field label="Catatan">
          <textarea className="field min-h-24" placeholder="Opsional" maxLength={500} value={form.catatan} onChange={(event) => setForm({ ...form, catatan: event.target.value })} />
        </Field>
        <FormActions
          onCancel={() => navigate(id ? `/barang/${id}` : "/barang")}
          pending={simpan.isPending}
          submitLabel="Simpan"
        />
      </form>
      {id && (
        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-sm text-mist-500">
            {tersimpan ? "Barang masih ada di dus. Keluarkan stoknya sebelum menghapus." : "Barang tanpa stok bisa dihapus."}
          </p>
          <Button
            type="button"
            variant="danger"
            className="mt-3"
            disabled={tersimpan || hapus.isPending}
            onClick={async () => {
              const ya = await confirm({
                title: "Hapus barang ini?",
                body: "Varian ini hilang dari daftar. Riwayat lama tetap menyimpan namanya.",
                confirmLabel: "Hapus",
                danger: true,
              })
              if (ya) hapus.mutate()
            }}
          >
            Hapus barang
          </Button>
        </div>
      )}
    </div>
  )
}

function JenisTombol({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={aktif ? "min-h-11 rounded-xl bg-amber-500 px-2 text-sm font-semibold leading-tight text-ink-950" : "min-h-11 rounded-xl border border-white/10 px-2 text-sm font-semibold leading-tight text-mist-300"}>
      {children}
    </button>
  )
}
