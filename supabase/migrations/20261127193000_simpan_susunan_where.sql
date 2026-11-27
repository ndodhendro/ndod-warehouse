-- Ganti susunan lama. WHERE true wajib: sesi API Supabase menolak DELETE tanpa WHERE.

create or replace function simpan_susunan(p_kolom jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb := p_kolom;
  v_baris jsonb;
  v_kolom jsonb;
  v_dus jsonb;
  v_baris_no integer := 0;
  v_kolom_no integer;
  v_tingkat integer;
  v_kolom_id uuid;
  v_dus_id uuid;
begin
  perform wajib_masuk();
  if p_kolom is null or jsonb_typeof(p_kolom) <> 'array' then
    raise exception 'Susunan tidak dikenali';
  end if;

  -- Bentuk lama: array kolom, tiap kolom array id dus. Dibungkus jadi satu baris depan.
  if jsonb_array_length(p_kolom) > 0
     and jsonb_typeof(p_kolom->0) = 'array'
     and jsonb_array_length(p_kolom->0) > 0
     and jsonb_typeof((p_kolom->0)->0) <> 'array' then
    v_data := jsonb_build_array(p_kolom);
  end if;

  delete from susunan_dus where true;
  delete from susunan_kolom where true;

  for v_baris in select value from jsonb_array_elements(v_data)
  loop
    if jsonb_typeof(v_baris) <> 'array' then
      raise exception 'Susunan tidak dikenali';
    end if;
    v_baris_no := v_baris_no + 1;
    v_kolom_no := 0;
    for v_kolom in select value from jsonb_array_elements(v_baris)
    loop
      v_kolom_no := v_kolom_no + 1;
      if jsonb_typeof(v_kolom) <> 'array' then
        raise exception 'Susunan tidak dikenali';
      end if;
      if jsonb_array_length(v_kolom) = 0 then
        continue;
      end if;
      insert into susunan_kolom (baris, urutan) values (v_baris_no, v_kolom_no) returning id into v_kolom_id;
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
  end loop;
end;
$$;
