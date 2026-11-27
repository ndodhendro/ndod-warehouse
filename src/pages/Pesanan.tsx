import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ClipboardList, X } from "lucide-react"
import { PengaturJumlah } from "../components/PengaturJumlah"
import { SetupCard } from "../components/SetupCard"
import { Button, Card, ErrorBox, Loading, PageHeader, SearchField, useConfirm, useToast } from "../components/ui"
import { keluarkanPesanan } from "../lib/api"
import { pesanError } from "../lib/errors"
import { cocokKata, formatAngka, labelBarang, labelJenis } from "../lib/format"
import { useBarangList, useDusList, useStokDus, useSusunan } from "../lib/queries"
import { rencanaAmbil, type LetakDus } from "../lib/rencanaAmbil"
import { supabaseConfigured } from "../lib/supabase"
import type { Barang } from "../types"

type Baris = { barangId: string; jumlah: number }

export function Pesanan() {
  const siap = supabaseConfigured()
  const barang = useBarangList()
  const dus = useDusList()
  const stok = useStokDus()
  const susunan = useSusunan()
  const toast = useToast()
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [cari, setCari] = useState("")
  const [baris, setBaris] = useState<Baris[]>([])

  const petaBarang = useMemo(() => new Map((barang.data ?? []).map((item) => [item.id, item])), [barang.data])
  const kodeDus = useMemo(() => new Map((dus.data ?? []).map((item) => [item.id, item.kode])), [dus.data])
  const letak = useMemo<LetakDus[]>(() => {
    const hasil: LetakDus[] = []
    const ada = new Set<string>()
    for (const [indeks, kolom] of (susunan.data ?? []).entries()) {
      kolom.dusId.forEach((dusId, tingkat) => {
        hasil.push({ dusId, kode: kodeDus.get(dusId) ?? dusId, kolom: indeks + 1, tingkat: tingkat + 1 })
        ada.add(dusId)
      })
    }
    for (const item of stok.data ?? []) {
      if (ada.has(item.dusId)) continue
      hasil.push({ dusId: item.dusId, kode: item.kode, kolom: null, tingkat: null })
      ada.add(item.dusId)
    }
    return hasil
  }, [susunan.data, stok.data, kodeDus])

  const rencana = useMemo(
    () => rencanaAmbil(baris, letak, stok.data ?? []),
    [baris, letak, stok.data],
  )

  const tampil = useMemo(
    () => (barang.data ?? []).filter((item) => cocokKata(cari, [item.kode, item.model, item.warna, labelJenis(item.jenis)])).slice(0, 8),
    [barang.data, cari],
  )

  const kurang = rencana.kurang.flatMap((item) => {
    const data = petaBarang.get(item.barangId)
    return data ? [{ ...item, barang: data }] : []
  })

  const simpan = useMutation({
    mutationFn: () => keluarkanPesanan(rencana.baris.map((item) => ({ dusId: item.dusId, barangId: item.barangId, jumlah: item.jumlah }))),
    onSuccess: async () => {
      await qc.invalidateQueries()
      setBaris([])
      toast("Stok dikurangi.")
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  function tambah(item: Barang) {
    setBaris((sekarang) => {
      const ada = sekarang.find((barisItem) => barisItem.barangId === item.id)
      if (!ada) return [...sekarang, { barangId: item.id, jumlah: 1 }]
      return sekarang.map((barisItem) => (barisItem.barangId === item.id ? { ...barisItem, jumlah: barisItem.jumlah + 1 } : barisItem))
    })
  }

  async function kurangi() {
    const isi = rencana.baris
      .map((item) => {
        const data = petaBarang.get(item.barangId)
        const nama = data ? `${data.model} ${data.warna}` : "barang"
        return `${item.kode}, ${nama}, ${formatAngka(item.jumlah)} pcs`
      })
      .join(". ")
    const boleh = await confirm({ title: "Kurangi stok?", body: isi, confirmLabel: "Kurangi stok" })
    if (boleh) simpan.mutate()
  }

  const memuat = siap && (barang.isLoading || dus.isLoading || stok.isLoading || susunan.isLoading)
  const galat = barang.error ?? dus.error ?? stok.error ?? susunan.error
  const susunanKosong = (susunan.data ?? []).every((item) => item.dusId.length === 0)

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Pesanan" subtitle="" />
      {!siap ? (
        <SetupCard />
      ) : memuat ? (
        <Loading letak="baris" />
      ) : galat ? (
        <ErrorBox error={galat} />
      ) : (
        <>
          <SearchField value={cari} onChange={setCari} placeholder="Cari model atau warna" />
          {cari.trim() && tampil.length === 0 && <p className="mt-3 text-sm text-mist-500">Tidak ada barang yang cocok.</p>}
          {cari.trim() && tampil.length > 0 && (
            <Card className="mt-2 divide-y divide-white/5">
              {tampil.map((item) => (
                <button key={item.id} type="button" className="block w-full px-4 py-3 text-left" onClick={() => tambah(item)}>
                  <span className="block font-semibold">{item.model}</span>
                  <span className="text-sm text-mist-500">{labelJenis(item.jenis)} · {item.warna}</span>
                </button>
              ))}
            </Card>
          )}
          {baris.length > 0 && (
            <Card className="mt-4 divide-y divide-white/5">
              {baris.map((item) => {
                const data = petaBarang.get(item.barangId)
                if (!data) return null
                return (
                  <div key={item.barangId} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{data.model}</span>
                      <span className="text-sm text-mist-500">{data.warna}</span>
                    </span>
                    <PengaturJumlah nilai={item.jumlah} min={1} max={100000} onUbah={(jumlah) => setBaris((sekarang) => sekarang.map((barisItem) => (barisItem.barangId === item.barangId ? { ...barisItem, jumlah } : barisItem)))} label={data.model} />
                    <button type="button" className="grid h-11 w-11 place-items-center text-mist-500" aria-label={`Hapus ${data.model}`} onClick={() => setBaris((sekarang) => sekarang.filter((barisItem) => barisItem.barangId !== item.barangId))}>
                      <X size={18} />
                    </button>
                  </div>
                )
              })}
            </Card>
          )}
          {susunanKosong && baris.length > 0 && (
            <p className="mt-4 text-sm text-mist-500">
              Susunan belum diisi. Dus D dihitung tanpa tingkat tumpukan.{" "}
              <Link to="/dus/susunan" className="text-amber-300">Isi susunan</Link>
            </p>
          )}
          {rencana.baris.length > 0 && (
            <Card className="mt-4 divide-y divide-white/5">
              {rencana.baris.map((item) => {
                const data = petaBarang.get(item.barangId)
                return (
                  <div key={`${item.dusId}-${item.barangId}`} className="px-4 py-3">
                    <span className="block font-semibold">{item.kode}</span>
                    <span className="text-sm text-mist-500">{data ? labelBarang(data) : "Barang"} · {formatAngka(item.jumlah)} pcs</span>
                  </div>
                )
              })}
            </Card>
          )}
          {kurang.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-3">
              {kurang.map((item) => (
                <p key={item.barangId} className="font-semibold text-amber-200">
                  {item.barang.model} {item.barang.warna} kurang {formatAngka(item.jumlah)} pcs
                </p>
              ))}
            </div>
          )}
          <Button type="button" className="mt-6 w-full" disabled={rencana.baris.length === 0 || simpan.isPending} onClick={() => void kurangi()}>
            {simpan.isPending ? "Mengurangi..." : "Kurangi stok"}
          </Button>
        </>
      )}
    </div>
  )
}
