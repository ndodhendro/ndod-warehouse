-- Satu foto per barang, disimpan di bucket Storage ndod-warehouse.
-- Bucket boleh sudah ada. Skrip ini menutup akses publik dan mengizinkan akun yang lolos login.

alter table barang
  add column foto_path text,
  add constraint barang_foto_path_batas check (
    foto_path is null
    or foto_path ~ '^barang/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-penuh\.jpg$'
  );

comment on column barang.foto_path is
  'Path foto di bucket ndod-warehouse. Ukuran kecil berada di berkas -kecil.jpg dengan stempel yang sama.';

drop view if exists v_barang_ringkas;

create view v_barang_ringkas
with (security_invoker = true) as
select
  b.id,
  b.kode,
  b.jenis,
  b.model,
  b.warna,
  b.catatan,
  b.foto_path,
  b.created_at,
  b.updated_at,
  count(i.id)::integer as jumlah_dus,
  coalesce(sum(i.jumlah), 0)::integer as total_pcs
from barang b
left join isi_dus i on i.barang_id = b.id
group by b.id;

grant select on table v_barang_ringkas to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ndod-warehouse', 'ndod-warehouse', false, 5242880, array['image/jpeg'])
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists foto_baca on storage.objects;
drop policy if exists foto_tambah on storage.objects;
drop policy if exists foto_ubah on storage.objects;
drop policy if exists foto_hapus on storage.objects;

create policy foto_baca on storage.objects
for select to authenticated
using (
  bucket_id = 'ndod-warehouse'
  and name ~ '^barang/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-(penuh|kecil)\.jpg$'
  and (select public.boleh_masuk())
);

create policy foto_tambah on storage.objects
for insert to authenticated
with check (
  bucket_id = 'ndod-warehouse'
  and name ~ '^barang/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-(penuh|kecil)\.jpg$'
  and (select public.boleh_masuk())
);

create policy foto_ubah on storage.objects
for update to authenticated
using (
  bucket_id = 'ndod-warehouse'
  and name ~ '^barang/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-(penuh|kecil)\.jpg$'
  and (select public.boleh_masuk())
)
with check (
  bucket_id = 'ndod-warehouse'
  and name ~ '^barang/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-(penuh|kecil)\.jpg$'
  and (select public.boleh_masuk())
);

create policy foto_hapus on storage.objects
for delete to authenticated
using (
  bucket_id = 'ndod-warehouse'
  and name ~ '^barang/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]+-(penuh|kecil)\.jpg$'
  and (select public.boleh_masuk())
);

notify pgrst, 'reload schema';
