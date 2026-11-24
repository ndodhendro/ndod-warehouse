-- Database yang sudah menjalankan migrasi awal masih punya kode unik per barang.
-- Kode sekarang mengikuti model, jadi beberapa warna boleh memakai kode yang sama.

drop index if exists barang_kode_unique;

create index if not exists barang_kode_idx on barang (lower(kode));

update barang
set kode = model
where lower(kode) is distinct from lower(trim(model));
