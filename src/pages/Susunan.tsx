import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Layers } from "lucide-react"
import { SetupCard } from "../components/SetupCard"
import { Button, Card, ErrorBox, Loading, PageHeader, useToast } from "../components/ui"
import { simpanSusunan } from "../lib/api"
import { pesanError } from "../lib/errors"
import { bandingKode } from "../lib/format"
import { useDusList, useSusunan } from "../lib/queries"
import { supabaseConfigured } from "../lib/supabase"

function sampel(kode: string) {
  return kode.trim().toUpperCase().startsWith("S")
}

export function Susunan() {
  const siap = supabaseConfigured()
  const dus = useDusList()
  const susunan = useSusunan()
  const toast = useToast()
  const qc = useQueryClient()
  const [kolom, setKolom] = useState<string[][] | null>(null)
  const [pilih, setPilih] = useState("")

  useEffect(() => {
    if (!susunan.data || kolom) return
    setKolom(susunan.data.map((item) => item.dusId))
  }, [susunan.data, kolom])

  const kode = useMemo(() => new Map((dus.data ?? []).map((item) => [item.id, item.kode])), [dus.data])
  const terpakai = useMemo(() => new Set((kolom ?? []).flat()), [kolom])
  const bebas = useMemo(
    () => (dus.data ?? []).filter((item) => !sampel(item.kode) && !terpakai.has(item.id)).sort((a, b) => bandingKode(a.kode, b.kode)),
    [dus.data, terpakai],
  )

  const simpan = useMutation({
    mutationFn: () => simpanSusunan((kolom ?? []).filter((item) => item.length > 0)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["susunan"] })
      toast("Susunan disimpan.")
    },
    onError: (error) => toast(pesanError(error), "err"),
  })

  function taruh(indeks: number) {
    if (!pilih) return
    setKolom((sekarang) => {
      const daftar = [...(sekarang ?? [])]
      daftar[indeks] = [...(daftar[indeks] ?? []), pilih]
      return daftar
    })
    setPilih("")
  }

  function lepas(indeksKolom: number, indeksDus: number) {
    setKolom((sekarang) => (sekarang ?? []).map((item, indeks) => (indeks === indeksKolom ? item.filter((_, urut) => urut !== indeksDus) : item)).filter((item) => item.length > 0))
  }

  const memuat = siap && (dus.isLoading || susunan.isLoading)
  const galat = dus.error ?? susunan.error

  return (
    <div>
      <PageHeader icon={Layers} title="Susunan" subtitle="Dari bawah ke atas, sesuai tumpukan yang ada." back="/dus" />
      {!siap ? (
        <SetupCard />
      ) : memuat || kolom === null ? (
        <Loading letak="baris" />
      ) : galat ? (
        <ErrorBox error={galat} />
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {kolom.map((isi, indeks) => (
              <Card key={indeks} className="w-40 shrink-0 p-3">
                <p className="text-sm font-semibold">Kolom {indeks + 1}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {[...isi].reverse().map((id, urutDariAtas) => {
                    const urut = isi.length - 1 - urutDariAtas
                    return (
                      <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2">
                        <span className="font-semibold">{kode.get(id) ?? id}</span>
                        <button type="button" className="text-sm text-mist-500" onClick={() => lepas(indeks, urut)} aria-label={`Keluarkan ${kode.get(id) ?? "dus"}`}>
                          Lepas
                        </button>
                      </div>
                    )
                  })}
                </div>
                <Button type="button" variant="ghost" className="mt-3 w-full" disabled={!pilih} onClick={() => taruh(indeks)}>
                  Ke puncak
                </Button>
              </Card>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="w-40 shrink-0 self-start"
              disabled={!pilih}
              onClick={() => {
                setKolom((sekarang) => [...(sekarang ?? []), [pilih]])
                setPilih("")
              }}
            >
              Kolom baru
            </Button>
          </div>
          <label className="mt-6 block text-sm font-medium">
            Dus yang belum disusun
            <select className="field mt-2" value={pilih} onChange={(event) => setPilih(event.target.value)}>
              <option value="">Pilih dus</option>
              {bebas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-sm text-mist-500">Dus S tidak masuk tumpukan. Dus yang tidak dipilih dihitung setelah seluruh tingkat tumpukan.</p>
          <Button type="button" className="mt-6" disabled={simpan.isPending} onClick={() => simpan.mutate()}>
            {simpan.isPending ? "Menyimpan..." : "Simpan susunan"}
          </Button>
        </>
      )}
    </div>
  )
}
