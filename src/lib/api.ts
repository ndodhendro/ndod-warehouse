import type {
  Barang,
  BarangInput,
  BarisEkspor,
  Dus,
  DusInput,
  FotoUnggah,
  IsiBarang,
  IsiDus,
  ItemPindah,
  JenisBarang,
  JenisRiwayat,
  RiwayatItem,
  SebaranDus,
} from "../types"
import { hapusBerkasFoto, pathKecil, tautanFoto, unggahFoto } from "./foto"
import { bandingDus, bandingKode, kosongJadiNull, labelJenis, normKode, normTeks } from "./format"
import { db } from "./supabase"

type Row = Record<string, unknown>

function angka(nilai: unknown) {
  const hasil = Number(nilai)
  return Number.isFinite(hasil) ? hasil : 0
}

function teks(nilai: unknown) {
  return typeof nilai === "string" ? nilai : null
}

function objek<T>(nilai: unknown): T | null {
  if (Array.isArray(nilai)) return (nilai[0] as T | undefined) ?? null
  if (nilai && typeof nilai === "object") return nilai as T
  return null
}

function jenisBarang(nilai: unknown): JenisBarang {
  if (nilai === "tas" || nilai === "botol" || nilai === "kotak") return nilai
  throw new Error("Jenis barang tidak dikenali.")
}

function jenisRiwayat(nilai: unknown): JenisRiwayat {
  if (nilai === "masuk" || nilai === "keluar" || nilai === "pindah" || nilai === "koreksi") return nilai
  throw new Error("Jenis riwayat tidak dikenali.")
}

function urlFoto(row: Row, tautan: ReadonlyMap<string, string>) {
  const foto_path = teks(row.foto_path)
  const kecil = foto_path ? pathKecil(foto_path) : null
  return {
    foto_path,
    foto_kecil_url: (kecil ? tautan.get(kecil) : undefined) ?? (foto_path ? tautan.get(foto_path) : undefined) ?? null,
    foto_url: (foto_path ? tautan.get(foto_path) : undefined) ?? null,
  }
}

function mapBarangRingkas(row: Row, tautan: ReadonlyMap<string, string> = new Map()): IsiBarang {
  const foto = urlFoto(row, tautan)
  return {
    id: String(row.id),
    kode: String(row.kode),
    jenis: jenisBarang(row.jenis),
    model: String(row.model),
    warna: String(row.warna),
    foto_kecil_url: foto.foto_kecil_url,
    foto_url: foto.foto_url,
  }
}

function mapDus(row: Row): Dus {
  return {
    id: String(row.id),
    kode: String(row.kode),
    lokasi: teks(row.lokasi),
    catatan: teks(row.catatan),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    jumlah_jenis: angka(row.jumlah_jenis),
    total_pcs: angka(row.total_pcs),
  }
}

function mapBarang(row: Row, tautan: ReadonlyMap<string, string>): Barang {
  const foto = urlFoto(row, tautan)
  return {
    ...mapBarangRingkas(row, tautan),
    catatan: teks(row.catatan),
    foto_path: foto.foto_path,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    jumlah_dus: angka(row.jumlah_dus),
    total_pcs: angka(row.total_pcs),
  }
}

async function denganFoto(rows: Row[]) {
  const paths: string[] = []
  for (const row of rows) {
    const penuh = teks(row.foto_path)
    if (!penuh) continue
    paths.push(penuh, pathKecil(penuh))
  }
  const tautan = await tautanFoto(paths)
  return rows.map((row) => mapBarang(row, tautan))
}

async function bacaFotoPath(id: string) {
  const { data, error } = await db().from("barang").select("foto_path").eq("id", id).maybeSingle()
  if (error) throw error
  return teks((data as Row | null)?.foto_path)
}

export async function listDus() {
  const { data, error } = await db().from("v_dus_ringkas").select("*")
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapDus).sort((a, b) => bandingKode(a.kode, b.kode))
}

export async function getDus(id: string) {
  const { data, error } = await db().from("v_dus_ringkas").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? mapDus(data as Row) : null
}

export async function listIsiDus(dusId: string) {
  const denganFoto = "id, dus_id, barang_id, jumlah, barang:barang_id(id, kode, jenis, model, warna, foto_path)"
  const tanpaFoto = "id, dus_id, barang_id, jumlah, barang:barang_id(id, kode, jenis, model, warna)"
  const pertama = await db().from("isi_dus").select(denganFoto).eq("dus_id", dusId)
  let data: unknown = pertama.data
  if (pertama.error) {
    if (!/foto_path|schema cache|does not exist/i.test(`${pertama.error.message} ${pertama.error.details ?? ""}`)) throw pertama.error
    const kedua = await db().from("isi_dus").select(tanpaFoto).eq("dus_id", dusId)
    if (kedua.error) throw kedua.error
    data = kedua.data
  }
  const rows = ((data ?? []) as Row[])
  const paths: string[] = []
  for (const row of rows) {
    const barang = objek<Row>(row.barang)
    const penuh = barang ? teks(barang.foto_path) : null
    if (!penuh) continue
    paths.push(penuh, pathKecil(penuh))
  }
  const tautan = await tautanFoto(paths)
  return rows
    .map((row) => {
      const barang = objek<Row>(row.barang)
      if (!barang) throw new Error("Data barang di dalam dus tidak lengkap.")
      return {
        id: String(row.id),
        dus_id: String(row.dus_id),
        barang_id: String(row.barang_id),
        jumlah: angka(row.jumlah),
        barang: mapBarangRingkas(barang, tautan),
      } satisfies IsiDus
    })
    .sort((a, b) => bandingKode(a.barang.kode, b.barang.kode))
}

export async function simpanDus(id: string | null, input: DusInput) {
  const payload = {
    kode: normKode(input.kode),
    lokasi: kosongJadiNull(input.lokasi),
    catatan: kosongJadiNull(input.catatan),
  }
  if (!payload.kode) throw new Error("Kode dus wajib diisi.")
  if (id) {
    const { error } = await db().from("dus").update(payload).eq("id", id)
    if (error) throw error
    return id
  }
  const { data, error } = await db().from("dus").insert(payload).select("id").single()
  if (error) throw error
  return String((data as Row).id)
}

export async function hapusDus(id: string) {
  const { error } = await db().from("dus").delete().eq("id", id)
  if (error) throw error
}

export async function listBarang() {
  const { data, error } = await db().from("v_barang_ringkas").select("*")
  if (error) throw error
  const barang = await denganFoto((data ?? []) as Row[])
  return barang.sort((a, b) => {
    const jenis = labelUrut(a.jenis).localeCompare(labelUrut(b.jenis), "id")
    if (jenis !== 0) return jenis
    const model = a.model.localeCompare(b.model, "id", { sensitivity: "base" })
    if (model !== 0) return model
    return a.warna.localeCompare(b.warna, "id", { sensitivity: "base" })
  })
}

function labelUrut(jenis: JenisBarang) {
  if (jenis === "tas") return "0"
  if (jenis === "botol") return "1"
  return "2"
}

export async function getBarang(id: string) {
  const { data, error } = await db().from("v_barang_ringkas").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [barang] = await denganFoto([data as Row])
  return barang ?? null
}

export async function listSebaran(barangId: string) {
  const { data, error } = await db()
    .from("isi_dus")
    .select("id, jumlah, dus:dus_id(id, kode, lokasi)")
    .eq("barang_id", barangId)
  if (error) throw error
  return ((data ?? []) as Row[])
    .map((row) => {
      const dus = objek<Row>(row.dus)
      if (!dus) throw new Error("Data dus untuk barang ini tidak lengkap.")
      return {
        id: String(row.id),
        jumlah: angka(row.jumlah),
        dus: {
          id: String(dus.id),
          kode: String(dus.kode),
          lokasi: teks(dus.lokasi),
        },
      } satisfies SebaranDus
    })
    .sort((a, b) => bandingDus(a.dus, b.dus))
}

export async function simpanBarang(id: string | null, input: BarangInput, foto: FotoUnggah = { berkas: null, hapus: false }) {
  const model = normTeks(input.model)
  const payload: Record<string, unknown> = {
    kode: normKode(model),
    jenis: input.jenis,
    model,
    warna: normTeks(input.warna),
    catatan: kosongJadiNull(input.catatan),
  }
  if (!payload.model) throw new Error("Model wajib diisi.")
  if (!payload.warna) throw new Error("Warna wajib diisi.")
  if (payload.jenis !== "tas" && payload.jenis !== "botol" && payload.jenis !== "kotak") throw new Error("Pilih jenis barang.")

  if (!id) {
    const baru = crypto.randomUUID()
    let path: string | null = null
    if (foto.berkas) {
      path = await unggahFoto(baru, foto.berkas)
      payload.foto_path = path
    }
    const { data, error } = await db().from("barang").insert({ ...payload, id: baru }).select("id").single()
    if (error) {
      if (path) await hapusBerkasFoto(path).catch(() => undefined)
      throw error
    }
    return String((data as Row).id)
  }

  const lama = foto.berkas || foto.hapus ? await bacaFotoPath(id) : null
  if (foto.berkas) payload.foto_path = await unggahFoto(id, foto.berkas)
  else if (foto.hapus) payload.foto_path = null

  const { error } = await db().from("barang").update(payload).eq("id", id)
  if (error) {
    if (typeof payload.foto_path === "string") await hapusBerkasFoto(payload.foto_path).catch(() => undefined)
    throw error
  }
  if (lama && lama !== payload.foto_path) await hapusBerkasFoto(lama).catch(() => undefined)
  return id
}

export async function hapusBarang(id: string) {
  const baca = await db().from("barang").select("foto_path").eq("id", id).maybeSingle()
  if (baca.error && !/foto_path|schema cache|does not exist/i.test(`${baca.error.message} ${baca.error.details ?? ""}`)) throw baca.error
  const path = baca.error ? null : teks((baca.data as Row | null)?.foto_path)
  const { error } = await db().from("barang").delete().eq("id", id)
  if (error) throw error
  if (path) await hapusBerkasFoto(path).catch(() => undefined)
}

export async function tambahIsi(dusId: string, barangId: string, jumlah: number, keterangan?: string) {
  const { error } = await db().rpc("tambah_isi", {
    p_dus_id: dusId,
    p_barang_id: barangId,
    p_jumlah: jumlah,
    p_keterangan: keterangan?.trim() || null,
  })
  if (error) throw error
}

export async function setJumlahIsi(dusId: string, barangId: string, jumlah: number, keterangan?: string) {
  const { error } = await db().rpc("set_jumlah_isi", {
    p_dus_id: dusId,
    p_barang_id: barangId,
    p_jumlah: jumlah,
    p_keterangan: keterangan?.trim() || null,
  })
  if (error) throw error
}

export async function pindahSebagian(asal: string, tujuan: string, item: ItemPindah[], keterangan?: string) {
  const { error } = await db().rpc("pindah_sebagian", {
    p_dus_asal: asal,
    p_dus_tujuan: tujuan,
    p_item: item,
    p_keterangan: keterangan?.trim() || null,
  })
  if (error) throw error
}

export async function pindahSemua(asal: string, tujuan: string, keterangan?: string) {
  const { error } = await db().rpc("pindah_semua_isi", {
    p_dus_asal: asal,
    p_dus_tujuan: tujuan,
    p_keterangan: keterangan?.trim() || null,
  })
  if (error) throw error
}

export async function listRiwayat() {
  const { data, error } = await db()
    .from("riwayat")
    .select(
      "id, jenis, jumlah, keterangan, created_at, barang_kode, barang_label, dus_asal_kode, dus_tujuan_kode, pengguna_email, pengguna_nama, barang:barang_id(id, kode, jenis, model, warna), asal:dus!riwayat_dus_asal_id_fkey(id, kode), tujuan:dus!riwayat_dus_tujuan_id_fkey(id, kode)",
    )
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) throw error
  return ((data ?? []) as Row[]).map((row) => {
    const barang = objek<Row>(row.barang)
    const asal = objek<Row>(row.asal)
    const tujuan = objek<Row>(row.tujuan)
    return {
      id: String(row.id),
      jenis: jenisRiwayat(row.jenis),
      jumlah: angka(row.jumlah),
      keterangan: teks(row.keterangan),
      created_at: String(row.created_at),
      barang_kode: teks(row.barang_kode),
      barang_label: teks(row.barang_label),
      dus_asal_kode: teks(row.dus_asal_kode),
      dus_tujuan_kode: teks(row.dus_tujuan_kode),
      barang: barang ? mapBarangRingkas(barang) : null,
      asal: asal ? { id: String(asal.id), kode: String(asal.kode) } : null,
      tujuan: tujuan ? { id: String(tujuan.id), kode: String(tujuan.kode) } : null,
      pengguna_email: teks(row.pengguna_email),
      pengguna_nama: teks(row.pengguna_nama),
    } satisfies RiwayatItem
  })
}

export async function ambilSebaranEkspor() {
  const { data, error } = await db()
    .from("isi_dus")
    .select("jumlah, dus:dus_id(kode, lokasi), barang:barang_id(kode, jenis, model, warna)")
  if (error) throw error
  return ((data ?? []) as Row[])
    .map((row) => {
      const dus = objek<Row>(row.dus)
      const barang = objek<Row>(row.barang)
      if (!dus || !barang) return null
      return {
        dus_kode: String(dus.kode),
        dus_lokasi: teks(dus.lokasi) ?? "",
        barang_kode: String(barang.kode),
        jenis: labelJenis(jenisBarang(barang.jenis)),
        model: String(barang.model),
        warna: String(barang.warna),
        jumlah: angka(row.jumlah),
      } satisfies BarisEkspor
    })
    .filter((baris): baris is BarisEkspor => baris !== null)
    .sort((a, b) => bandingKode(a.dus_kode, b.dus_kode) || bandingKode(a.barang_kode, b.barang_kode))
}

export type KolomSusunan = {
  id: string
  urutan: number
  dusId: string[]
}

export type StokDusBaris = {
  dusId: string
  kode: string
  barangId: string
  jumlah: number
}

export async function listSusunan() {
  const { data, error } = await db().from("susunan_kolom").select("id, urutan, susunan_dus(dus_id, tingkat)").order("urutan")
  if (error) throw error
  return ((data ?? []) as Row[]).map((row) => {
    const isi = ((row.susunan_dus ?? []) as Row[])
      .map((item) => ({ dusId: String(item.dus_id), tingkat: angka(item.tingkat) }))
      .sort((a, b) => a.tingkat - b.tingkat)
    return {
      id: String(row.id),
      urutan: angka(row.urutan),
      dusId: isi.map((item) => item.dusId),
    } satisfies KolomSusunan
  })
}

export async function simpanSusunan(kolom: string[][]) {
  const { error } = await db().rpc("simpan_susunan", { p_kolom: kolom })
  if (error) throw error
}

export async function listStokDus() {
  const { data, error } = await db().from("isi_dus").select("dus_id, barang_id, jumlah, dus:dus_id(kode)")
  if (error) throw error
  return ((data ?? []) as Row[])
    .map((row) => {
      const dus = objek<Row>(row.dus)
      if (!dus) return null
      return {
        dusId: String(row.dus_id),
        kode: String(dus.kode),
        barangId: String(row.barang_id),
        jumlah: angka(row.jumlah),
      } satisfies StokDusBaris
    })
    .filter((baris): baris is StokDusBaris => baris !== null && baris.jumlah > 0)
}

export async function keluarkanPesanan(item: { dusId: string; barangId: string; jumlah: number }[]) {
  const { error } = await db().rpc("keluarkan_banyak", {
    p_item: item.map((baris) => ({ dus_id: baris.dusId, barang_id: baris.barangId, jumlah: baris.jumlah })),
    p_keterangan: "Pesanan",
  })
  if (error) throw error
}
