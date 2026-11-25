export type JenisBarang = "tas" | "botol" | "kotak"
export type JenisRiwayat = "masuk" | "keluar" | "pindah" | "koreksi"

export interface Dus {
  id: string
  kode: string
  nama: string | null
  lokasi: string | null
  catatan: string | null
  created_at: string
  updated_at: string
  jumlah_jenis: number
  total_pcs: number
}

export interface Barang {
  id: string
  kode: string
  jenis: JenisBarang
  model: string
  warna: string
  catatan: string | null
  created_at: string
  updated_at: string
  jumlah_dus: number
  total_pcs: number
}

export interface IsiBarang {
  id: string
  kode: string
  jenis: JenisBarang
  model: string
  warna: string
}

export interface IsiDus {
  id: string
  dus_id: string
  barang_id: string
  jumlah: number
  barang: IsiBarang
}

export interface SebaranDus {
  id: string
  jumlah: number
  dus: {
    id: string
    kode: string
    nama: string | null
    lokasi: string | null
  }
}

export interface RiwayatItem {
  id: string
  jenis: JenisRiwayat
  jumlah: number
  keterangan: string | null
  created_at: string
  barang_kode: string | null
  barang_label: string | null
  dus_asal_kode: string | null
  dus_tujuan_kode: string | null
  barang: IsiBarang | null
  asal: { id: string; kode: string } | null
  tujuan: { id: string; kode: string } | null
  pengguna_email: string | null
  pengguna_nama: string | null
}

export interface DusInput {
  kode: string
  nama: string
  lokasi: string
  catatan: string
}

export interface BarangInput {
  kode: string
  jenis: JenisBarang
  model: string
  warna: string
  catatan: string
}

export interface ItemPindah {
  barang_id: string
  jumlah: number
}

export interface BarisEkspor {
  dus_kode: string
  dus_lokasi: string
  barang_kode: string
  jenis: string
  model: string
  warna: string
  jumlah: number
}
