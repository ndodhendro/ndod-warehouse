import { Card } from "./ui"

export function SetupCard() {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Pengaturan</p>
      <h2 className="mt-2 text-xl font-semibold">Hubungkan Supabase</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-mist-300">
        <li>Buat project di supabase.com.</li>
        <li>Buka SQL Editor, tempel isi file supabase/migrations/20261124000000_init.sql, lalu jalankan.</li>
        <li>Salin Project URL dan publishable key (sb_publishable_...) ke file .env berdasarkan .env.example.</li>
        <li>Jalankan ulang npm run dev.</li>
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-mist-500">
        Aplikasi ini tidak memakai login. Siapa pun yang membuka alamatnya dapat melihat dan mengubah stok. Simpan alamatnya untuk pemakaian sendiri.
      </p>
    </Card>
  )
}
