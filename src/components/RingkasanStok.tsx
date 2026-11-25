import { useMemo } from "react"
import { formatAngka } from "../lib/format"
import { useBarangList, useDusList } from "../lib/queries"
import { Stat } from "./ui"

export function RingkasanStok() {
  const dus = useDusList()
  const barang = useBarangList()

  const ringkas = useMemo(() => {
    const daftarDus = dus.data ?? []
    const daftarBarang = barang.data ?? []
    return {
      dus: daftarDus.length,
      kosong: daftarDus.filter((item) => item.total_pcs === 0).length,
      barang: daftarBarang.length,
      pcs: daftarBarang.reduce((total, item) => total + item.total_pcs, 0),
    }
  }, [dus.data, barang.data])

  if (!dus.data || !barang.data) return null

  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      <Stat
        label="Dus"
        value={formatAngka(ringkas.dus)}
        hint={ringkas.kosong ? `${formatAngka(ringkas.kosong)} kosong` : "semua berisi"}
      />
      <Stat label="Barang" value={formatAngka(ringkas.barang)} hint="model & warna" />
      <Stat label="Total" value={formatAngka(ringkas.pcs)} hint="pcs" />
    </div>
  )
}
