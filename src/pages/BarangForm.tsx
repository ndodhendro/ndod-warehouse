import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button, ErrorBox, Field, Loading, PageHeader, useConfirm, useToast } from "../components/ui"
import { hapusBarang, simpanBarang } from "../lib/api"
import { pesanError } from "../lib/errors"
import { useBarang, useBarangList } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
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

  useEffect(() => {
    if (!query.data) return
    setForm({
      kode: query.data.kode,
      jenis: query.data.jenis,
      model: query.data.model,
      warna: query.data.warna,
      catatan: query.data.catatan ?? "",
    })
  }, [query.data])

  const modelSaran = [...new Set((katalog.data ?? []).map((item) => item.model))]
  const warnaSaran = [...new Set((katalog.data ?? []).map((item) => item.warna))]

  const simpan = useMutation({
    mutationFn: () => simpanBarang(id ?? null, form),
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

  return (
    <div>
      <PageHeader
        kicker={id ? query.data?.kode : "Baru"}
        title={id ? "Ubah barang" : "Tambah barang"}
        subtitle="Model dan warna yang sama dianggap satu barang, walaupun tersimpan di beberapa dus."
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
        <Field label="Model" hint="Ini juga kode barang. Beberapa warna boleh memakai model yang sama.">
          <input className="field" required maxLength={80} list="saran-model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
          <datalist id="saran-model">
            {modelSaran.map((model) => <option key={model} value={model} />)}
          </datalist>
        </Field>
        <Field label="Warna">
          <input className="field" required maxLength={40} list="saran-warna" value={form.warna} onChange={(event) => setForm({ ...form, warna: event.target.value })} />
          <datalist id="saran-warna">
            {warnaSaran.map((warna) => <option key={warna} value={warna} />)}
          </datalist>
        </Field>
        <Field label="Catatan">
          <textarea className="field min-h-24" maxLength={500} value={form.catatan} onChange={(event) => setForm({ ...form, catatan: event.target.value })} />
        </Field>
        <Button type="submit" className="w-full" disabled={simpan.isPending}>
          {simpan.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
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
