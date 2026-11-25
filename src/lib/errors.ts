type GalatBasis = {
  message?: string
  code?: string
  details?: string
}

export function pesanError(err: unknown) {
  if (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return "Tidak terhubung ke server. Periksa internet."
  }

  const galat = (err ?? {}) as GalatBasis
  const pesan = galat.message?.trim() || "Terjadi kesalahan. Coba lagi."
  const gabungan = `${pesan} ${galat.details ?? ""}`

  if (galat.code === "P0001") return pesan
  if (/barang_varian/i.test(gabungan)) return "Jenis, model, dan warna ini sudah ada."
  if (galat.code === "23505" || /duplicate key/i.test(gabungan)) return "Kode ini sudah dipakai."
  if (/barang_model_isi/i.test(gabungan)) return "Model wajib diisi."
  if (/barang_warna_isi/i.test(gabungan)) return "Warna wajib diisi."
  if (/kode_isi/i.test(gabungan)) return "Kode wajib diisi."
  if (/JWT|Invalid API key|apikey/i.test(gabungan)) return "Kunci Supabase tidak valid. Periksa file .env."
  if (/does not exist|schema cache|Could not find the function/i.test(gabungan)) {
    return "Database belum siap. Jalankan skrip SQL di Supabase, lalu muat ulang."
  }
  if (/bucket not found/i.test(gabungan)) return "Bucket foto ndod-warehouse belum ada. Jalankan skrip SQL foto barang."
  if (/mime type/i.test(gabungan)) return "Format foto tidak didukung."
  if (/payload too large|maximum allowed size|object exceeded/i.test(gabungan)) return "Foto terlalu besar."
  if (/permission denied|row-level security/i.test(gabungan)) {
    return "Akses database ditolak. Periksa kebijakan RLS."
  }
  return pesan
}
