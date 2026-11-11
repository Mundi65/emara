-- Supabase rechaza un UPDATE sin WHERE ("UPDATE requires a WHERE clause").
-- La tabla ajustes tiene una sola fila (id = true): se filtra por ella.
create or replace function public.cambiar_pin(p_nuevo text, p_actual text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  if not public.es_miembro() then
    raise exception 'Sin permiso';
  end if;
  if p_nuevo !~ '^[0-9]{4}$' then
    raise exception 'El PIN debe tener 4 números';
  end if;
  select pin_duena_hash into v_hash from public.ajustes where id;
  if v_hash is not null and (p_actual is null or v_hash <> extensions.crypt(p_actual, v_hash)) then
    raise exception 'El PIN actual no coincide';
  end if;
  update public.ajustes
     set pin_duena_hash = extensions.crypt(p_nuevo, extensions.gen_salt('bf')), updated_at = now()
   where id = true;
end;
$$;

revoke all on function public.cambiar_pin(text, text) from public, anon;
grant execute on function public.cambiar_pin(text, text) to authenticated;
