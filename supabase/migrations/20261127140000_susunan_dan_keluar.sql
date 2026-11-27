-- Susunan kolom sesuai tumpukan nyata, dan pengeluaran stok pesanan dalam satu transaksi.

create table susunan_kolom (
  id uuid primary key default gen_random_uuid(),
  urutan integer not null,
  created_at timestamptz not null default now(),
  constraint susunan_kolom_urutan_positif check (urutan >= 1)
);

create table susunan_dus (
  dus_id uuid primary key references dus (id) on delete cascade,
  kolom_id uuid not null references susunan_kolom (id) on delete cascade,
  tingkat integer not null,
  constraint susunan_dus_tingkat_positif check (tingkat >= 1),
  constraint susunan_dus_tingkat_unik unique (kolom_id, tingkat)
);

create index susunan_dus_kolom_idx on susunan_dus (kolom_id);

alter table susunan_kolom enable row level security;
alter table susunan_dus enable row level security;

create policy susunan_kolom_baca on susunan_kolom for select to authenticated using ((select boleh_masuk()));
create policy susunan_kolom_ubah on susunan_kolom for all to authenticated using ((select boleh_masuk())) with check ((select boleh_masuk()));
create policy susunan_dus_baca on susunan_dus for select to authenticated using ((select boleh_masuk()));
create policy susunan_dus_ubah on susunan_dus for all to authenticated using ((select boleh_masuk())) with check ((select boleh_masuk()));

grant select, insert, update, delete on table susunan_kolom to authenticated;
grant select, insert, update, delete on table susunan_dus to authenticated;
revoke all on table susunan_kolom from public, anon;
revoke all on table susunan_dus from public, anon;

create or replace function simpan_susunan(p_kolom jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kolom jsonb;
  v_dus jsonb;
  v_urutan integer := 0;
  v_tingkat integer;
  v_kolom_id uuid;
  v_dus_id uuid;
begin
  perform wajib_masuk();
  if p_kolom is null or jsonb_typeof(p_kolom) <> 'array' then
    raise exception 'Susunan tidak dikenali';
  end if;

  delete from susunan_dus;
  delete from susunan_kolom;

  for v_kolom in select value from jsonb_array_elements(p_kolom)
  loop
    if jsonb_typeof(v_kolom) <> 'array' or jsonb_array_length(v_kolom) = 0 then
      continue;
    end if;
    v_urutan := v_urutan + 1;
    insert into susunan_kolom (urutan) values (v_urutan) returning id into v_kolom_id;
    v_tingkat := 0;
    for v_dus in select value from jsonb_array_elements(v_kolom)
    loop
      v_tingkat := v_tingkat + 1;
      v_dus_id := trim(both '"' from v_dus::text)::uuid;
      if not exists (select 1 from dus where id = v_dus_id) then
        raise exception 'Dus tidak ditemukan';
      end if;
      insert into susunan_dus (dus_id, kolom_id, tingkat) values (v_dus_id, v_kolom_id, v_tingkat);
    end loop;
  end loop;
end;
$$;

create or replace function keluarkan_banyak(p_item jsonb, p_keterangan text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baris jsonb;
  v_dus uuid;
  v_barang uuid;
  v_jumlah integer;
  v_lama integer;
begin
  perform wajib_masuk();
  if p_item is null or jsonb_typeof(p_item) <> 'array' or jsonb_array_length(p_item) = 0 then
    raise exception 'Tidak ada stok yang dikurangi';
  end if;

  for v_baris in select value from jsonb_array_elements(p_item)
  loop
    v_dus := (v_baris->>'dus_id')::uuid;
    v_barang := (v_baris->>'barang_id')::uuid;
    v_jumlah := (v_baris->>'jumlah')::integer;
    if v_jumlah is null or v_jumlah <= 0 or v_jumlah > 1000000 then
      raise exception 'Jumlah harus antara 1 dan 1.000.000';
    end if;

    perform 1 from dus where id = v_dus for update;
    if not found then
      raise exception 'Dus tidak ditemukan';
    end if;
    if not exists (select 1 from barang where id = v_barang) then
      raise exception 'Barang tidak ditemukan';
    end if;

    select jumlah into v_lama
    from isi_dus
    where dus_id = v_dus and barang_id = v_barang
    for update;

    if v_lama is null or v_lama < v_jumlah then
      raise exception 'Stok di dus tidak cukup';
    end if;

    if v_lama = v_jumlah then
      delete from isi_dus where dus_id = v_dus and barang_id = v_barang;
    else
      update isi_dus
      set jumlah = v_lama - v_jumlah, updated_at = now()
      where dus_id = v_dus and barang_id = v_barang;
    end if;

    perform catat_riwayat('keluar', v_barang, v_dus, null, v_jumlah, p_keterangan);
  end loop;
end;
$$;

revoke all on function simpan_susunan(jsonb) from public, anon;
revoke all on function keluarkan_banyak(jsonb, text) from public, anon;
grant execute on function simpan_susunan(jsonb) to authenticated;
grant execute on function keluarkan_banyak(jsonb, text) to authenticated;
