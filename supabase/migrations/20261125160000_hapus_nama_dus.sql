-- Dus dikenali dari kode. Kolom nama tidak dipakai lagi.

create or replace function siapkan_dus()
returns trigger
language plpgsql
as $$
begin
  new.kode := upper(regexp_replace(trim(new.kode), '\s+', ' ', 'g'));
  new.lokasi := nullif(regexp_replace(trim(coalesce(new.lokasi, '')), '\s+', ' ', 'g'), '');
  new.catatan := nullif(regexp_replace(trim(coalesce(new.catatan, '')), '\s+', ' ', 'g'), '');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop view if exists v_dus_ringkas;

alter table dus drop constraint if exists dus_nama_batas;
alter table dus drop column if exists nama;

create view v_dus_ringkas
with (security_invoker = true) as
select
  d.id,
  d.kode,
  d.lokasi,
  d.catatan,
  d.created_at,
  d.updated_at,
  count(i.id)::integer as jumlah_jenis,
  coalesce(sum(i.jumlah), 0)::integer as total_pcs
from dus d
left join isi_dus i on i.dus_id = d.id
group by d.id;

grant select on table v_dus_ringkas to authenticated;

notify pgrst, 'reload schema';
