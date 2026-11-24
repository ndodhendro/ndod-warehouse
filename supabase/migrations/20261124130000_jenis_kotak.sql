-- Jenis baru: kotak makan. Nilai enum ditambahkan di luar pemakaiannya pada transaksi yang sama.

alter type jenis_barang add value if not exists 'kotak';

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
