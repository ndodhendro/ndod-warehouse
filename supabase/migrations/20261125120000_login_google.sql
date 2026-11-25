-- Login Google untuk jejak pelaku di riwayat.
-- Peran anon tidak lagi boleh membaca atau mengubah data.
-- Selama tabel pengguna_diizinkan kosong, setiap akun Google boleh masuk.
-- Setelah ada satu baris, hanya email di tabel itu yang boleh masuk.

alter table riwayat
  add column pengguna_id uuid references auth.users (id) on delete set null,
  add column pengguna_email text,
  add column pengguna_nama text,
  add constraint riwayat_pengguna_email_batas check (
    pengguna_email is null or char_length(pengguna_email) between 3 and 320
  ),
  add constraint riwayat_pengguna_nama_batas check (
    pengguna_nama is null or char_length(pengguna_nama) between 1 and 160
  );

create table pengguna_diizinkan (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint pengguna_diizinkan_email check (
    email = lower(trim(email))
    and position('@' in email) > 1
    and char_length(email) <= 320
  )
);

comment on table pengguna_diizinkan is
  'Email Google yang boleh masuk. Tabel kosong berarti semua akun Google diizinkan.';

alter table pengguna_diizinkan enable row level security;
revoke all on table pengguna_diizinkan from anon, authenticated;

create or replace function boleh_masuk()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_jumlah integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_email := nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
  if v_email is null then
    return false;
  end if;

  select count(*) into v_jumlah from pengguna_diizinkan;
  if v_jumlah = 0 then
    return true;
  end if;

  return exists (select 1 from pengguna_diizinkan where email = v_email);
end;
$$;

create or replace function wajib_masuk()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Masuk dengan akun Google terlebih dahulu';
  end if;
  if not boleh_masuk() then
    raise exception 'Akun Google ini belum diizinkan';
  end if;
end;
$$;

revoke all on function boleh_masuk() from public, anon, authenticated;
revoke all on function wajib_masuk() from public, anon, authenticated;
grant execute on function boleh_masuk() to authenticated;

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
  v_email text;
  v_nama text;
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

  v_email := nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
  v_nama := nullif(left(trim(coalesce(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    ''
  )), 160), '');

  insert into riwayat (
    jenis, barang_id, dus_asal_id, dus_tujuan_id, jumlah, keterangan,
    barang_kode, barang_label, dus_asal_kode, dus_tujuan_kode,
    pengguna_id, pengguna_email, pengguna_nama
  ) values (
    p_jenis, p_barang_id, p_dus_asal, p_dus_tujuan, p_jumlah,
    nullif(trim(coalesce(p_keterangan, '')), ''),
    v_barang_kode, v_barang_label, v_asal, v_tujuan,
    auth.uid(), v_email, v_nama
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
  perform wajib_masuk();

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
  perform wajib_masuk();

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
  perform wajib_masuk();

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
  perform wajib_masuk();

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

drop policy if exists barang_baca on barang;
drop policy if exists barang_tambah on barang;
drop policy if exists barang_ubah on barang;
drop policy if exists barang_hapus on barang;
drop policy if exists dus_baca on dus;
drop policy if exists dus_tambah on dus;
drop policy if exists dus_ubah on dus;
drop policy if exists dus_hapus on dus;
drop policy if exists isi_dus_baca on isi_dus;
drop policy if exists riwayat_baca on riwayat;

create policy barang_baca on barang for select to authenticated using ((select boleh_masuk()));
create policy barang_tambah on barang for insert to authenticated with check ((select boleh_masuk()));
create policy barang_ubah on barang for update to authenticated using ((select boleh_masuk())) with check ((select boleh_masuk()));
create policy barang_hapus on barang for delete to authenticated using ((select boleh_masuk()));

create policy dus_baca on dus for select to authenticated using ((select boleh_masuk()));
create policy dus_tambah on dus for insert to authenticated with check ((select boleh_masuk()));
create policy dus_ubah on dus for update to authenticated using ((select boleh_masuk())) with check ((select boleh_masuk()));
create policy dus_hapus on dus for delete to authenticated using ((select boleh_masuk()));

create policy isi_dus_baca on isi_dus for select to authenticated using ((select boleh_masuk()));
create policy riwayat_baca on riwayat for select to authenticated using ((select boleh_masuk()));

revoke all on table barang from public, anon;
revoke all on table dus from public, anon;
revoke all on table isi_dus from public, anon;
revoke all on table riwayat from public, anon;
revoke all on table v_dus_ringkas from public, anon;
revoke all on table v_barang_ringkas from public, anon;

grant select, insert, update, delete on table barang to authenticated;
grant select, insert, update, delete on table dus to authenticated;
grant select on table isi_dus to authenticated;
grant select on table riwayat to authenticated;
grant select on table v_dus_ringkas to authenticated;
grant select on table v_barang_ringkas to authenticated;

revoke all on function tambah_isi(uuid, uuid, integer, text) from public, anon;
revoke all on function set_jumlah_isi(uuid, uuid, integer, text) from public, anon;
revoke all on function pindah_sebagian(uuid, uuid, jsonb, text) from public, anon;
revoke all on function pindah_semua_isi(uuid, uuid, text) from public, anon;

grant execute on function tambah_isi(uuid, uuid, integer, text) to authenticated;
grant execute on function set_jumlah_isi(uuid, uuid, integer, text) to authenticated;
grant execute on function pindah_sebagian(uuid, uuid, jsonb, text) to authenticated;
grant execute on function pindah_semua_isi(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
