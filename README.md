# Ndod Warehouse

PWA untuk cek stok tas, botol minum, dan kotak makan, serta melihat dus mana yang menyimpannya. Bahasa antarmuka Indonesia, tampilan gelap, masuk dengan akun Google, dan tanpa hierarki toko.

Satu barang adalah satu kombinasi **jenis + model + warna**. Barang yang sama boleh tersimpan di lebih dari satu dus, dengan jumlah pcs per dus.

## Stack

- React, TypeScript, Vite
- React Router dan TanStack Query
- Tailwind CSS
- Supabase Postgres
- Service worker lewat vite-plugin-pwa, supaya bisa dipasang di Android dan iOS

Stok tidak diubah langsung dari browser. Tambah, koreksi, dan pindah barang lewat fungsi SQL dalam satu transaksi, lalu dicatat di riwayat.

## Menyiapkan database

1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**.
3. Jalankan file di `supabase/migrations` sesuai urutan nama. Database kosong mulai dari `20261124000000_init.sql`. Database yang sudah terisi cukup menjalankan file yang belum pernah dijalankan. Yang terbaru, `20261125160000_hapus_nama_dus.sql`, menghapus kolom nama pada tabel dus. File sebelumnya, `20261125140000_foto_barang.sql`, menambah satu foto per barang dan akses bucket Storage `ndod-warehouse`. Bucket itu boleh sudah ada; skrip menutupnya dari publik dan hanya mengizinkan akun yang lolos login.
4. Dari **Project Settings → API Keys**, salin Project URL dan publishable key (`sb_publishable_...`).
5. Aktifkan login Google. Langkahnya di bagian berikut.

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

## Login Google

Tanpa sesi, aplikasi hanya menampilkan halaman masuk. Alamat lain dikembalikan ke halaman itu. Setelah masuk sekali, sesi tersimpan di perangkat sampai tombol **Keluar** dipakai.

Di [Google Cloud Console](https://console.cloud.google.com/apis/credentials), buat **OAuth client ID** bertipe Web application.

- Authorized JavaScript origins: `http://localhost:5173` dan asal production, misalnya `https://gudang.example.com`
- Authorized redirect URI: `https://PROJECT_REF.supabase.co/auth/v1/callback`

Di Supabase, buka **Authentication → Sign In / Providers → Google**, tempel Client ID dan Client Secret, lalu aktifkan. Di **Authentication → URL Configuration**, isi Site URL dan Redirect URLs dengan alamat aplikasi tanpa garis miring di akhir (`http://localhost:5173` untuk pengembangan, plus alamat production).

Selama layar izin Google masih berstatus Testing, tambahkan email gudang sebagai test user. Kalau tidak, Google menolak login.

Email pelaku ditulis dari token di dalam database, lalu tampil di riwayat stok. Riwayat lama, sebelum login dipasang, tertulis "Sebelum login".

Untuk membatasi siapa yang boleh masuk, isi tabel ini di SQL Editor. Selama tabel kosong, semua akun Google bisa masuk. Setelah ada satu baris, hanya email di tabel itu yang lolos.

```sql
insert into pengguna_diizinkan (email) values ('nama@gmail.com');
```

## Yang perlu dijaga

Publishable key ada di dalam aplikasi. Setelah migrasi login dijalankan, mengubah stok butuh sesi Google. Jangan menaruh aplikasi di internet umum sebelum email gudang dimasukkan ke `pengguna_diizinkan`.

Perubahan stok butuh internet. Aplikasi tetap bisa dipasang dan dibuka saat luring, tetapi angka stok tidak disimpan untuk dikirim belakangan, supaya dua perangkat tidak saling menimpa. Sesi yang sudah tersimpan tetap ada saat luring. Angka stok baru muncul setelah tersambung lagi.

Kode dus harus unik. Kode barang mengikuti model, jadi beberapa warna boleh memakai kode yang sama. Penulisan model dan warna juga harus konsisten: `Hitam` dan `hitam` dianggap varian yang sama.
