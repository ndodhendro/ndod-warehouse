# Gudang Ndod

PWA untuk cek stok tas, botol minum, dan kotak makan, serta melihat dus mana yang menyimpannya. Bahasa antarmuka Indonesia, tampilan gelap, tanpa login, dan tanpa hierarki toko.

Satu barang adalah satu kombinasi **jenis + model + warna**. Barang yang sama boleh tersimpan di lebih dari satu dus, dengan jumlah pcs per dus.

## Stack

- React, TypeScript, Vite
- React Router dan TanStack Query
- Tailwind CSS
- Supabase Postgres
- Service worker lewat vite-plugin-pwa, supaya bisa dipasang di Android dan iOS
- ZXing untuk memindai kode lewat kamera

Stok tidak diubah langsung dari browser. Tambah, koreksi, dan pindah barang lewat fungsi SQL dalam satu transaksi, lalu dicatat di riwayat.

## Menyiapkan database

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**.
3. Tempel seluruh isi `supabase/migrations/20261124000000_init.sql`, lalu jalankan sekali pada database kosong.
4. Dari **Project Settings → API Keys**, salin Project URL dan publishable key (`sb_publishable_...`).

## Menjalankan

Node yang dipakai minimal 20.19, atau 22+. Di mesin ini sudah ada Node 24:

```bash
nvm use
```

Salin `.env.example` menjadi `.env`.

Isi `.env`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```bash
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite.

## Memasang di ponsel

PWA hanya bisa dipasang lewat **HTTPS**. Localhost cukup untuk uji di komputer. Untuk ponsel, deploy hasil `npm run build` ke Vercel, Netlify, atau Cloudflare Pages.

- Android, Chrome: menu browser → **Pasang aplikasi** atau **Tambahkan ke layar utama**. Di beranda juga ada tombol pasang bila browser menawarkannya.
- iPhone dan iPad, Safari: **Bagikan → Tambahkan ke Layar Utama**. iOS tidak menampilkan dialog pasang otomatis.

`vercel.json` dan `public/_redirects` menjaga rute seperti `/dus/abc` tetap membuka aplikasi saat halaman dimuat ulang.

## Yang perlu dijaga

Aplikasi tidak memakai login. Publishable key ada di dalam aplikasi, jadi siapa pun yang tahu alamatnya bisa melihat, mengubah, dan menghapus stok. Ini cocok untuk gudang pribadi yang alamatnya tidak disebar. Jangan menaruh aplikasi ini di internet umum sebelum ada PIN bersama atau akun.

Perubahan stok butuh internet. Aplikasi tetap bisa dipasang dan dibuka saat luring, tetapi angka stok tidak disimpan untuk dikirim belakangan, supaya dua perangkat tidak saling menimpa.

Kode dus harus unik. Kode barang mengikuti model, jadi beberapa warna boleh memakai kode yang sama. Penulisan model dan warna juga harus konsisten: `Hitam` dan `hitam` dianggap varian yang sama.
