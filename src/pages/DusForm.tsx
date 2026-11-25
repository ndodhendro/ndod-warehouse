import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button, ErrorBox, Field, FormActions, Loading, PageHeader, useConfirm, useToast } from "../components/ui"
import { hapusDus, simpanDus } from "../lib/api"
import { pesanError } from "../lib/errors"
import { useDus } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"
import type { DusInput } from "../types"

const kosong: DusInput = { kode: "", nama: "", lokasi: "", catatan: "" }

export function DusForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const query = useDus(id)
  const [form, setForm] = useState<DusInput>({ ...kosong, kode: params.get("kode")?.toUpperCase() ?? "" })

  useEffect(() => {
    if (!query.data) return
    setForm({
      kode: query.data.kode,
      nama: query.data.nama ?? "",
      lokasi: query.data.lokasi ?? "",
      catatan: query.data.catatan ?? "",
    })
  }, [query.data])

  const simpan = useMutation({
    mutationFn: () => simpanDus(id ?? null, form),
    onSuccess: async (dusId) => {
      await qc.invalidateQueries()
      toast(id ? "Dus diperbarui." : "Dus ditambahkan.")
      navigate(`/dus/${dusId}`, { replace: true })
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  const hapus = useMutation({
    mutationFn: () => hapusDus(id!),
    onSuccess: async () => {
      await qc.invalidateQueries()
      toast("Dus dihapus.")
      navigate("/dus", { replace: true })
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  if (id && query.isLoading) return <Loading />
  if (id && query.error) return <ErrorBox error={query.error} />
  if (id && query.data === null) {
    return (
      <div>
        <PageHeader title="Dus tidak ditemukan" back="/dus" />
      </div>
    )
  }

  const berisi = (query.data?.total_pcs ?? 0) > 0

  return (
    <div>
      <PageHeader
        kicker={id ? query.data?.kode : "Baru"}
        title={id ? "Ubah dus" : "Tambah dus"}
        subtitle="Kode menempel pada dus fisik. Lokasi menjelaskan dus itu disimpan di mana."
        back={id ? `/dus/${id}` : "/dus"}
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
        <Field label="Kode dus" hint="Disimpan dalam huruf besar. Contoh: DUS-01.">
          <input className="field" value={form.kode} maxLength={40} autoCapitalize="characters" autoCorrect="off" spellCheck={false} required onChange={(event) => setForm({ ...form, kode: event.target.value })} />
        </Field>
        <Field label="Nama" hint="Opsional. Nama panggilan supaya mudah dikenali.">
          <input className="field" value={form.nama} maxLength={80} onChange={(event) => setForm({ ...form, nama: event.target.value })} />
        </Field>
        <Field label="Lokasi" hint="Rak, ruangan, atau tempat dus diletakkan.">
          <input className="field" value={form.lokasi} maxLength={120} onChange={(event) => setForm({ ...form, lokasi: event.target.value })} />
        </Field>
        <Field label="Catatan">
          <textarea className="field min-h-24" placeholder="Opsional" value={form.catatan} maxLength={500} onChange={(event) => setForm({ ...form, catatan: event.target.value })} />
        </Field>
        <FormActions
          onCancel={() => navigate(id ? `/dus/${id}` : "/dus")}
          pending={simpan.isPending}
          submitLabel="Simpan"
        />
      </form>
      {id && (
        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-sm text-mist-500">
            {berisi ? "Dus masih berisi barang. Pindahkan atau keluarkan isinya sebelum menghapus." : "Dus kosong bisa dihapus."}
          </p>
          <Button
            type="button"
            variant="danger"
            className="mt-3"
            disabled={berisi || hapus.isPending}
            onClick={async () => {
              const ya = await confirm({
                title: "Hapus dus ini?",
                body: "Metadata dus akan hilang. Isi dus memang sudah kosong.",
                confirmLabel: "Hapus",
                danger: true,
              })
              if (ya) hapus.mutate()
            }}
          >
            Hapus dus
          </Button>
        </div>
      )}
    </div>
  )
}
