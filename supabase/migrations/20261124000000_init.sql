-- Ndod Warehouse, versi vanilla.
-- Jalankan sekali pada database yang masih kosong.
-- Tidak ada hierarki toko. Satu barang = satu kombinasi jenis + model + warna.
-- Stok barang yang sama boleh tersebar di lebih dari satu dus.
--
-- Login Google dan penutupan peran anon ada di migrasi 20261125120000_login_google.sql.
-- Sebelum migrasi itu, peran anon boleh membaca dan mengubah data.

create extension if not exists pgcrypto;

create type jenis_barang as enum ('tas', 'botol', 'kotak');
create type jenis_riwayat as enum ('masuk', 'keluar', 'pindah', 'koreksi');

create table barang (
  id uuid primary key default gen_random_uuid(),
  kode text not null,
  jenis jenis_barang not null,
  model text not null,
  warna text not null,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barang_kode_isi check (char_length(kode) between 1 and 40),
  constraint barang_model_isi check (char_length(model) between 1 and 80),
  constraint barang_warna_isi check (char_length(warna) between 1 and 40),
  constraint barang_catatan_batas check (catatan is null or char_length(catatan) <= 500)
);

-- Kode mengikuti model, jadi beberapa warna boleh memakai kode yang sama.
create index barang_kode_idx on barang (lower(kode));
create unique index barang_varian_unique on barang (jenis, lower(model), lower(warna));

create table dus (
  id uuid primary key default gen_random_uuid(),
  kode text not null,
  nama text,
  lokasi text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dus_kode_isi check (char_length(kode) between 1 and 40),
  constraint dus_nama_batas check (nama is null or char_length(nama) between 1 and 80),
  constraint dus_lokasi_batas check (lokasi is null or char_length(lokasi) between 1 and 120),
  constraint dus_catatan_batas check (catatan is null or char_length(catatan) <= 500)
);

create unique index dus_kode_unique on dus (lower(kode));

create table isi_dus (
  id uuid primary key default gen_random_uuid(),
  dus_id uuid not null references dus (id) on delete restrict,
  barang_id uuid not null references barang (id) on delete restrict,
  jumlah integer not null,
  updated_at timestamptz not null default now(),
  constraint isi_dus_jumlah_positif check (jumlah > 0 and jumlah <= 1000000),
  constraint isi_dus_unik unique (dus_id, barang_id)
);

create index isi_dus_barang_idx on isi_dus (barang_id);

create table riwayat (
  id uuid primary key default gen_random_uuid(),
  jenis jenis_riwayat not null,
  barang_id uuid,
  dus_asal_id uuid,
  dus_tujuan_id uuid,
  jumlah integer not null,
  keterangan text,
  barang_kode text,
  barang_label text,
  dus_asal_kode text,
  dus_tujuan_kode text,
  created_at timestamptz not null default now(),
  constraint riwayat_jumlah_wajar check (
    (jenis = 'koreksi' and jumlah <> 0 and jumlah between -1000000 and 1000000)
    or (jenis <> 'koreksi' and jumlah > 0 and jumlah <= 1000000)
  ),
  constraint riwayat_barang_id_fkey foreign key (barang_id) references barang (id) on delete set null,
  constraint riwayat_dus_asal_id_fkey foreign key (dus_asal_id) references dus (id) on delete set null,
  constraint riwayat_dus_tujuan_id_fkey foreign key (dus_tujuan_id) references dus (id) on delete set null
);

create index riwayat_created_idx on riwayat (created_at desc);

create or replace function siapkan_barang()
returns trigger
language plpgsql
as $$
begin
  new.kode := upper(regexp_replace(trim(new.kode), '\s+', ' ', 'g'));
  new.model := regexp_replace(trim(new.model), '\s+', ' ', 'g');
  new.warna := regexp_replace(trim(new.warna), '\s+', ' ', 'g');
  new.catatan := nullif(regexp_replace(trim(coalesce(new.catatan, '')), '\s+', ' ', 'g'), '');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger barang_siapkan
before insert or update on barang
for each row execute function siapkan_barang();

create or replace function siapkan_dus()
returns trigger
language plpgsql
as $$
begin
  new.kode := upper(regexp_replace(trim(new.kode), '\s+', ' ', 'g'));
  new.nama := nullif(regexp_replace(trim(coalesce(new.nama, '')), '\s+', ' ', 'g'), '');
  new.lokasi := nullif(regexp_replace(trim(coalesce(new.lokasi, '')), '\s+', ' ', 'g'), '');
  new.catatan := nullif(regexp_replace(trim(coalesce(new.catatan, '')), '\s+', ' ', 'g'), '');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger dus_siapkan
before insert or update on dus
for each row execute function siapkan_dus();

create or replace function cegah_hapus_dus_berisi()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from isi_dus where dus_id = old.id) then
    raise exception 'Dus masih berisi barang. Kosongkan atau pindahkan isinya dulu.';
  end if;
  return old;
end;
$$;

create trigger dus_cegah_hapus
before delete on dus
for each row execute function cegah_hapus_dus_berisi();

create or replace function cegah_hapus_barang_tersimpan()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from isi_dus where barang_id = old.id) then
    raise exception 'Barang masih tersimpan di dus. Keluarkan stoknya dulu.';
  end if;
  return old;
end;
$$;

create trigger barang_cegah_hapus
before delete on barang
for each row execute function cegah_hapus_barang_tersimpan();

create or replace function catat_riwayat(
  p_jenis jenis_riwayat,
  p_barang_id uuid,
  p_dus_asal uuid,
  p_dus_tujuan uuid,
  p_jumlah integer,
  p_keterangan text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barang_kode text;
  v_barang_label text;
  v_asal text;
  v_tujuan text;
begin
  select kode,
    case jenis::text
      when 'tas' then 'Tas'
      when 'botol' then 'Botol minum'
      when 'kotak' then 'Kotak makan'
      else jenis::text
    end || ' · ' || model || ' · ' || warna
  into v_barang_kode, v_barang_label
  from barang
  where id = p_barang_id;

  if p_dus_asal is not null then
    select kode into v_asal from dus where id = p_dus_asal;
  end if;
  if p_dus_tujuan is not null then
    select kode into v_tujuan from dus where id = p_dus_tujuan;
  end if;

  insert into riwayat (
    jenis, barang_id, dus_asal_id, dus_tujuan_id, jumlah, keterangan,
    barang_kode, barang_label, dus_asal_kode, dus_tujuan_kode
  ) values (
    p_jenis, p_barang_id, p_dus_asal, p_dus_tujuan, p_jumlah,
    nullif(trim(coalesce(p_keterangan, '')), ''),
    v_barang_kode, v_barang_label, v_asal, v_tujuan
  );
end;
$$;

create or replace function tambah_isi(
  p_dus_id uuid,
  p_barang_id uuid,
  p_jumlah integer,
  p_keterangan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baru integer;
begin
  if p_jumlah is null or p_jumlah <= 0 or p_jumlah > 1000000 then
    raise exception 'Jumlah harus antara 1 dan 1.000.000';
  end if;

  perform 1 from dus where id = p_dus_id for update;
  if not found then
    raise exception 'Dus tidak ditemukan';
  end if;
  if not exists (select 1 from barang where id = p_barang_id) then
    raise exception 'Barang tidak ditemukan';
  end if;

  insert into isi_dus (dus_id, barang_id, jumlah)
  values (p_dus_id, p_barang_id, p_jumlah)
  on conflict (dus_id, barang_id)
  do update set jumlah = isi_dus.jumlah + excluded.jumlah, updated_at = now()
  returning jumlah into v_baru;

  if v_baru > 1000000 then
    raise exception 'Jumlah terlalu besar';
  end if;

  perform catat_riwayat('masuk', p_barang_id, null, p_dus_id, p_jumlah, p_keterangan);
end;
$$;

create or replace function set_jumlah_isi(
  p_dus_id uuid,
  p_barang_id uuid,
  p_jumlah integer,
  p_keterangan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lama integer;
begin
  if p_jumlah is null or p_jumlah < 0 or p_jumlah > 1000000 then
    raise exception 'Jumlah harus antara 0 dan 1.000.000';
  end if;

  perform 1 from dus where id = p_dus_id for update;
  if not found then
    raise exception 'Dus tidak ditemukan';
  end if;
  if not exists (select 1 from barang where id = p_barang_id) then
    raise exception 'Barang tidak ditemukan';
  end if;

  select jumlah into v_lama
  from isi_dus
  where dus_id = p_dus_id and barang_id = p_barang_id
  for update;

  if p_jumlah = 0 then
    if v_lama is null then
      return;
    end if;
    delete from isi_dus where dus_id = p_dus_id and barang_id = p_barang_id;
    perform catat_riwayat('keluar', p_barang_id, p_dus_id, null, v_lama, p_keterangan);
    return;
  end if;

  if v_lama is null then
    insert into isi_dus (dus_id, barang_id, jumlah)
    values (p_dus_id, p_barang_id, p_jumlah);
    perform catat_riwayat('masuk', p_barang_id, null, p_dus_id, p_jumlah, p_keterangan);
    return;
  end if;

  if v_lama = p_jumlah then
    return;
  end if;

  update isi_dus
  set jumlah = p_jumlah, updated_at = now()
  where dus_id = p_dus_id and barang_id = p_barang_id;

  perform catat_riwayat('koreksi', p_barang_id, p_dus_id, p_dus_id, p_jumlah - v_lama, p_keterangan);
end;
$$;

create or replace function pindah_sebagian(
  p_dus_asal uuid,
  p_dus_tujuan uuid,
  p_item jsonb,
  p_keterangan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_barang uuid;
  v_jumlah integer;
  v_stok integer;
  v_pindah integer := 0;
begin
  if p_dus_asal is null or p_dus_tujuan is null then
    raise exception 'Dus asal dan dus tujuan wajib diisi';
  end if;
  if p_dus_asal = p_dus_tujuan then
    raise exception 'Dus asal dan dus tujuan harus berbeda';
  end if;
  if p_item is null or jsonb_typeof(p_item) <> 'array' or jsonb_array_length(p_item) = 0 then
    raise exception 'Pilih barang yang akan dipindahkan';
  end if;

  perform 1 from dus where id in (p_dus_asal, p_dus_tujuan) order by id for update;
  if (select count(*) from dus where id in (p_dus_asal, p_dus_tujuan)) <> 2 then
    raise exception 'Dus asal atau dus tujuan tidak ditemukan';
  end if;

  for r in
    select (value->>'barang_id')::uuid as barang_id,
           sum((value->>'jumlah')::integer)::integer as jumlah
    from jsonb_array_elements(p_item)
    group by 1
  loop
    v_barang := r.barang_id;
    v_jumlah := r.jumlah;

    if v_jumlah is null or v_jumlah <= 0 or v_jumlah > 1000000 then
      raise exception 'Jumlah pindah harus antara 1 dan 1.000.000';
    end if;
    if not exists (select 1 from barang where id = v_barang) then
      raise exception 'Barang tidak ditemukan';
    end if;

    select jumlah into v_stok
    from isi_dus
    where dus_id = p_dus_asal and barang_id = v_barang
    for update;

    if v_stok is null or v_stok < v_jumlah then
      raise exception 'Stok di dus asal tidak cukup';
    end if;

    if v_stok = v_jumlah then
      delete from isi_dus where dus_id = p_dus_asal and barang_id = v_barang;
    else
      update isi_dus
      set jumlah = v_stok - v_jumlah, updated_at = now()
      where dus_id = p_dus_asal and barang_id = v_barang;
    end if;

    insert into isi_dus (dus_id, barang_id, jumlah)
    values (p_dus_tujuan, v_barang, v_jumlah)
    on conflict (dus_id, barang_id)
    do update set jumlah = isi_dus.jumlah + excluded.jumlah, updated_at = now();

    if (select jumlah from isi_dus where dus_id = p_dus_tujuan and barang_id = v_barang) > 1000000 then
      raise exception 'Jumlah di dus tujuan terlalu besar';
    end if;

    perform catat_riwayat('pindah', v_barang, p_dus_asal, p_dus_tujuan, v_jumlah, p_keterangan);
    v_pindah := v_pindah + 1;
  end loop;

  if v_pindah = 0 then
    raise exception 'Pilih barang yang akan dipindahkan';
  end if;
end;
$$;

create or replace function pindah_semua_isi(
  p_dus_asal uuid,
  p_dus_tujuan uuid,
  p_keterangan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
begin
  if p_dus_asal is null or p_dus_tujuan is null then
    raise exception 'Dus asal dan dus tujuan wajib diisi';
  end if;
  if p_dus_asal = p_dus_tujuan then
    raise exception 'Dus asal dan dus tujuan harus berbeda';
  end if;

  perform 1 from dus where id in (p_dus_asal, p_dus_tujuan) order by id for update;
  if (select count(*) from dus where id in (p_dus_asal, p_dus_tujuan)) <> 2 then
    raise exception 'Dus asal atau dus tujuan tidak ditemukan';
  end if;

  select jsonb_agg(jsonb_build_object('barang_id', barang_id, 'jumlah', jumlah))
  into v_item
  from isi_dus
  where dus_id = p_dus_asal;

  if v_item is null then
    raise exception 'Dus asal kosong';
  end if;

  perform pindah_sebagian(p_dus_asal, p_dus_tujuan, v_item, p_keterangan);
end;
$$;

create view v_dus_ringkas
with (security_invoker = true) as
select
  d.id,
  d.kode,
  d.nama,
  d.lokasi,
  d.catatan,
  d.created_at,
  d.updated_at,
  count(i.id)::integer as jumlah_jenis,
  coalesce(sum(i.jumlah), 0)::integer as total_pcs
from dus d
left join isi_dus i on i.dus_id = d.id
group by d.id;

create view v_barang_ringkas
with (security_invoker = true) as
select
  b.id,
  b.kode,
  b.jenis,
  b.model,
  b.warna,
  b.catatan,
  b.created_at,
  b.updated_at,
  count(i.id)::integer as jumlah_dus,
  coalesce(sum(i.jumlah), 0)::integer as total_pcs
from barang b
left join isi_dus i on i.barang_id = b.id
group by b.id;

alter table barang enable row level security;
alter table dus enable row level security;
alter table isi_dus enable row level security;
alter table riwayat enable row level security;

create policy barang_baca on barang for select to anon, authenticated using (true);
create policy barang_tambah on barang for insert to anon, authenticated with check (true);
create policy barang_ubah on barang for update to anon, authenticated using (true) with check (true);
create policy barang_hapus on barang for delete to anon, authenticated using (true);

create policy dus_baca on dus for select to anon, authenticated using (true);
create policy dus_tambah on dus for insert to anon, authenticated with check (true);
create policy dus_ubah on dus for update to anon, authenticated using (true) with check (true);
create policy dus_hapus on dus for delete to anon, authenticated using (true);

create policy isi_dus_baca on isi_dus for select to anon, authenticated using (true);
create policy riwayat_baca on riwayat for select to anon, authenticated using (true);

grant select, insert, update, delete on barang to anon, authenticated;
grant select, insert, update, delete on dus to anon, authenticated;
revoke all on isi_dus from anon, authenticated;
grant select on isi_dus to anon, authenticated;
revoke all on riwayat from anon, authenticated;
grant select on riwayat to anon, authenticated;
grant select on v_dus_ringkas to anon, authenticated;
grant select on v_barang_ringkas to anon, authenticated;

revoke all on function catat_riwayat(jenis_riwayat, uuid, uuid, uuid, integer, text) from public;
grant execute on function catat_riwayat(jenis_riwayat, uuid, uuid, uuid, integer, text) to postgres, service_role;

grant execute on function tambah_isi(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function set_jumlah_isi(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function pindah_sebagian(uuid, uuid, jsonb, text) to anon, authenticated;
grant execute on function pindah_semua_isi(uuid, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
