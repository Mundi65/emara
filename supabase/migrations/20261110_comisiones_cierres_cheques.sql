-- =====================================================================
-- Emara · Proveedoras con comisión, joyas propias, ventas a plazo,
-- cierres de lote, cheques, clientas atrasadas y PIN.
-- Pedido por Edmund el 2026-11-10.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Proveedoras: comisión, tope de crédito y "Mis joyas"
-- ---------------------------------------------------------------------
alter table public.proveedoras
  add column comision_pct  numeric(5,2) not null default 0 check (comision_pct between 0 and 100),
  add column tope_credito  numeric(12,2) check (tope_credito is null or tope_credito >= 0),
  add column es_propio     boolean not null default false,
  add column activa        boolean not null default true;

comment on column public.proveedoras.comision_pct is '% que la proveedora le paga a Aida sobre el precio de ticket de lo vendido';
comment on column public.proveedoras.tope_credito is 'Máximo (a precio de ticket) que Aida puede tener de esta proveedora entre joyas en mano y vendidas sin liquidar';
comment on column public.proveedoras.es_propio is 'true = "Mis joyas": lote propio de Aida, sin comisión, costo = lo que ella pagó';

-- Solo puede haber una "Mis joyas"
create unique index proveedoras_un_solo_propio on public.proveedoras (es_propio) where es_propio;

insert into public.proveedoras (nombre, es_propio, comision_pct) values ('Mis joyas', true, 0);

-- Mis joyas nunca tiene comisión
alter table public.proveedoras
  add constraint propio_sin_comision check (not es_propio or comision_pct = 0);

-- ---------------------------------------------------------------------
-- 2. Lotes: copian la comisión de su proveedora (se puede cambiar por lote)
-- ---------------------------------------------------------------------
alter table public.lotes
  add column comision_pct numeric(5,2) check (comision_pct is null or comision_pct between 0 and 100),
  add column cerrado_en   timestamptz;

create or replace function public.lote_copiar_comision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.comision_pct is null then
    select comision_pct into new.comision_pct from public.proveedoras where id = new.proveedora_id;
  end if;
  return new;
end;
$$;

create trigger lotes_copiar_comision
  before insert on public.lotes
  for each row execute function public.lote_copiar_comision();

-- ---------------------------------------------------------------------
-- 3. Ventas a plazo y comisión fija por joya vendida
-- ---------------------------------------------------------------------
alter table public.ventas
  add column plazo_meses   int not null default 0 check (plazo_meses between 0 and 60), -- 0 = de contado
  add column cuota_mensual numeric(12,2) check (cuota_mensual is null or cuota_mensual > 0); -- vacío = venta ÷ plazo

alter table public.venta_items
  add column comision_pct_al_vender numeric(5,2) not null default 0,
  add column comision_valor         numeric(12,2) not null default 0;

-- ---------------------------------------------------------------------
-- 4. Clientas: día de pago acordado y si se le envía el saldo
-- ---------------------------------------------------------------------
alter table public.clientas
  add column dia_pago      int check (dia_pago is null or dia_pago between 1 and 31),
  add column enviar_saldo  boolean not null default false;

comment on column public.clientas.dia_pago is 'Día del mes en que la clienta quedó en abonar (5 = inicio, 15 = mitad, 30 = fin)';
comment on column public.clientas.enviar_saldo is 'Si es true, el comprobante de abono por WhatsApp incluye el saldo pendiente';

-- ---------------------------------------------------------------------
-- 5. Cierres de lote (liquidación con la proveedora) y cheques
-- ---------------------------------------------------------------------
create table public.cierres (
  id               uuid primary key default gen_random_uuid(),
  lote_id          uuid not null unique references public.lotes(id),
  fecha            date not null default current_date,
  joyas_vendidas   int not null,
  joyas_devueltas  int not null,
  total_ticket     numeric(12,2) not null,   -- suma de precios de ticket de lo vendido
  comision_pct     numeric(5,2) not null,
  comision_valor   numeric(12,2) not null,
  valor_final      numeric(12,2) not null,   -- lo que Aida paga a la proveedora
  notas            text,
  created_at       timestamptz not null default now()
);

create table public.cheques (
  id             uuid primary key default gen_random_uuid(),
  proveedora_id  uuid not null references public.proveedoras(id),
  cierre_id      uuid references public.cierres(id),
  numero         text,
  banco          text,
  monto          numeric(12,2) not null check (monto > 0),
  fecha_cobro    date not null,
  estado         text not null default 'por_cobrar' check (estado in ('por_cobrar', 'cobrado', 'anulado')),
  cobrado_en     date,
  notas          text,
  created_at     timestamptz not null default now()
);
create index on public.cheques (fecha_cobro);
create index on public.cheques (proveedora_id);
create index on public.cheques (cierre_id);

-- ---------------------------------------------------------------------
-- 6. Operaciones completas (todo o nada)
-- ---------------------------------------------------------------------

-- Registrar una venta: joyas + precios, plazo y abono inicial opcional.
-- items = [{"joya_id": "...", "precio_venta": 700}, ...]
create or replace function public.registrar_venta(
  p_clienta_id    uuid,
  p_items         jsonb,
  p_plazo_meses   int default 0,
  p_cuota_mensual numeric default null,
  p_abono_inicial numeric default 0,
  p_metodo        text default 'efectivo',
  p_notas         text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_venta_id uuid;
  v_item     jsonb;
  v_joya     record;
  v_total    numeric := 0;
begin
  if not public.es_miembro() then
    raise exception 'Sin permiso';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Elige al menos una joya';
  end if;

  insert into public.ventas (clienta_id, plazo_meses, cuota_mensual, notas)
  values (p_clienta_id, coalesce(p_plazo_meses, 0), p_cuota_mensual, p_notas)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select j.id, j.estado, j.precio_costo, coalesce(l.comision_pct, 0) as comision_pct
      into v_joya
      from public.joyas j join public.lotes l on l.id = j.lote_id
     where j.id = (v_item->>'joya_id')::uuid
     for update of j;
    if not found then
      raise exception 'No encontré una de las joyas';
    end if;
    if v_joya.estado <> 'disponible' then
      raise exception 'Una de las joyas ya no está disponible';
    end if;

    insert into public.venta_items (venta_id, joya_id, precio_venta, precio_costo_al_vender,
                                    comision_pct_al_vender, comision_valor)
    values (v_venta_id, v_joya.id, (v_item->>'precio_venta')::numeric, v_joya.precio_costo,
            v_joya.comision_pct, round(coalesce(v_joya.precio_costo, 0) * v_joya.comision_pct / 100, 2));

    update public.joyas set estado = 'vendida' where id = v_joya.id;
    v_total := v_total + (v_item->>'precio_venta')::numeric;
  end loop;

  update public.ventas set total_venta = v_total where id = v_venta_id;

  if coalesce(p_abono_inicial, 0) > 0 then
    insert into public.abonos (clienta_id, monto, metodo, notas)
    values (p_clienta_id, p_abono_inicial, coalesce(p_metodo, 'efectivo'), 'Abono inicial');
  end if;

  return v_venta_id;
end;
$$;

-- Anular una venta: las joyas vuelven a "disponible". Queda el registro.
create or replace function public.anular_venta(p_venta_id uuid, p_motivo text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_miembro() then
    raise exception 'Sin permiso';
  end if;
  update public.ventas
     set anulada = true, anulada_en = now(), motivo_anulacion = p_motivo
   where id = p_venta_id and not anulada;
  if not found then
    raise exception 'La venta no existe o ya estaba anulada';
  end if;
  update public.joyas set estado = 'disponible'
   where id in (select joya_id from public.venta_items where venta_id = p_venta_id)
     and estado = 'vendida';
end;
$$;

-- Cerrar un lote: calcula la liquidación, marca lo no vendido como devuelto
-- y guarda los cheques. cheques = [{"numero":"001","banco":"Pichincha","monto":1000,"fecha_cobro":"2027-05-10"}, ...]
create or replace function public.cerrar_lote(
  p_lote_id uuid,
  p_cheques jsonb default '[]'::jsonb,
  p_notas   text default null,
  p_fecha   date default current_date
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_lote      record;
  v_vendidas  int;
  v_devueltas int;
  v_ticket    numeric;
  v_comision  numeric;
  v_cierre_id uuid;
  v_cheque    jsonb;
begin
  if not public.es_miembro() then
    raise exception 'Sin permiso';
  end if;

  select l.*, p.es_propio into v_lote
    from public.lotes l join public.proveedoras p on p.id = l.proveedora_id
   where l.id = p_lote_id for update of l;
  if not found then
    raise exception 'No encontré el lote';
  end if;
  if v_lote.estado = 'cerrado' then
    raise exception 'Este lote ya está cerrado';
  end if;

  select count(*), coalesce(sum(vi.precio_costo_al_vender), 0), coalesce(sum(vi.comision_valor), 0)
    into v_vendidas, v_ticket, v_comision
    from public.venta_items vi
    join public.ventas v on v.id = vi.venta_id and not v.anulada
    join public.joyas j on j.id = vi.joya_id
   where j.lote_id = p_lote_id;

  update public.joyas set estado = 'devuelta'
   where lote_id = p_lote_id and estado = 'disponible';
  get diagnostics v_devueltas = row_count;

  insert into public.cierres (lote_id, fecha, joyas_vendidas, joyas_devueltas, total_ticket,
                              comision_pct, comision_valor, valor_final, notas)
  values (p_lote_id, coalesce(p_fecha, current_date), v_vendidas, v_devueltas, v_ticket,
          coalesce(v_lote.comision_pct, 0), v_comision, v_ticket - v_comision, p_notas)
  returning id into v_cierre_id;

  for v_cheque in select * from jsonb_array_elements(coalesce(p_cheques, '[]'::jsonb)) loop
    insert into public.cheques (proveedora_id, cierre_id, numero, banco, monto, fecha_cobro)
    values (v_lote.proveedora_id, v_cierre_id, v_cheque->>'numero', v_cheque->>'banco',
            (v_cheque->>'monto')::numeric, (v_cheque->>'fecha_cobro')::date);
  end loop;

  update public.lotes set estado = 'cerrado', cerrado_en = now() where id = p_lote_id;
  return v_cierre_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. PIN de Aida (bloqueo de la app y "Modo dueña"). Se guarda cifrado.
-- ---------------------------------------------------------------------
create or replace function public.tiene_pin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_miembro() and exists (select 1 from public.ajustes where pin_duena_hash is not null);
$$;

create or replace function public.verificar_pin(p_pin text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  if not public.es_miembro() then
    return false;
  end if;
  select pin_duena_hash into v_hash from public.ajustes limit 1;
  return v_hash is not null and v_hash = extensions.crypt(p_pin, v_hash);
end;
$$;

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
  select pin_duena_hash into v_hash from public.ajustes limit 1;
  if v_hash is not null and (p_actual is null or v_hash <> extensions.crypt(p_actual, v_hash)) then
    raise exception 'El PIN actual no coincide';
  end if;
  update public.ajustes
     set pin_duena_hash = extensions.crypt(p_nuevo, extensions.gen_salt('bf')), updated_at = now();
end;
$$;

revoke all on function public.tiene_pin() from public, anon;
revoke all on function public.verificar_pin(text) from public, anon;
revoke all on function public.cambiar_pin(text, text) from public, anon;
grant execute on function public.tiene_pin() to authenticated;
grant execute on function public.verificar_pin(text) to authenticated;
grant execute on function public.cambiar_pin(text, text) to authenticated;

revoke all on function public.registrar_venta(uuid, jsonb, int, numeric, numeric, text, text) from public, anon;
revoke all on function public.anular_venta(uuid, text) from public, anon;
revoke all on function public.cerrar_lote(uuid, jsonb, text, date) from public, anon;
grant execute on function public.registrar_venta(uuid, jsonb, int, numeric, numeric, text, text) to authenticated;
grant execute on function public.anular_venta(uuid, text) to authenticated;
grant execute on function public.cerrar_lote(uuid, jsonb, text, date) to authenticated;

-- El hash del PIN no se puede leer ni cambiar directo desde la app:
-- se dan permisos solo sobre las demás columnas.
revoke select, insert, update, delete on public.ajustes from authenticated;
grant select (id, nombre_negocio, telefono_duena, margen_por_defecto, puestos_por_bolsa, texto_comprobante, updated_at)
  on public.ajustes to authenticated;
grant update (nombre_negocio, telefono_duena, margen_por_defecto, puestos_por_bolsa, texto_comprobante, updated_at)
  on public.ajustes to authenticated;

-- ---------------------------------------------------------------------
-- 8. Views (siempre calculadas, con la seguridad de quien consulta)
-- ---------------------------------------------------------------------

-- Inventario por proveedora
create view public.v_inventario_proveedoras
with (security_invoker = true) as
select
  p.id as proveedora_id,
  p.nombre,
  p.es_propio,
  p.comision_pct,
  p.tope_credito,
  count(j.id) filter (where j.estado = 'disponible')                        as joyas_disponibles,
  count(j.id) filter (where j.estado = 'vendida' and l.estado <> 'cerrado') as joyas_vendidas_sin_liquidar,
  coalesce(sum(j.precio_costo) filter (where j.estado = 'disponible'), 0)   as valor_disponible,
  coalesce(sum(j.precio_costo) filter (where j.estado = 'vendida' and l.estado <> 'cerrado'), 0) as valor_vendido_sin_liquidar,
  coalesce(sum(j.precio_costo) filter (where j.estado in ('disponible', 'vendida') and l.estado <> 'cerrado'), 0) as credito_usado,
  (select count(*) from public.lotes lo where lo.proveedora_id = p.id and lo.estado <> 'cerrado') as lotes_abiertos
from public.proveedoras p
left join public.lotes l on l.proveedora_id = p.id
left join public.joyas j on j.lote_id = l.id
group by p.id;

-- Liquidación en curso de cada lote (antes de cerrarlo)
create view public.v_liquidacion_lotes
with (security_invoker = true) as
select
  l.id as lote_id,
  l.nombre,
  l.proveedora_id,
  p.nombre as proveedora,
  p.es_propio,
  l.estado,
  l.fecha_recepcion,
  coalesce(l.comision_pct, 0) as comision_pct,
  count(j.id) as joyas_total,
  count(j.id) filter (where j.estado = 'disponible') as joyas_disponibles,
  count(vi.id) as joyas_vendidas,
  coalesce(sum(vi.precio_costo_al_vender), 0) as total_ticket,
  coalesce(sum(vi.comision_valor), 0) as comision_valor,
  coalesce(sum(vi.precio_costo_al_vender), 0) - coalesce(sum(vi.comision_valor), 0) as valor_a_pagar
from public.lotes l
join public.proveedoras p on p.id = l.proveedora_id
left join public.joyas j on j.lote_id = l.id
left join lateral (
  select vi.* from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id and not v.anulada
  where vi.joya_id = j.id
) vi on true
group by l.id, p.id;

-- Balance privado de Aida: una fila por joya vendida
create view public.v_balance_ventas
with (security_invoker = true) as
select
  v.id as venta_id,
  v.fecha,
  v.clienta_id,
  c.nombre as clienta,
  v.plazo_meses,
  vi.joya_id,
  j.codigo_ticket,
  j.foto_joya_path,
  l.id as lote_id,
  l.nombre as lote,
  p.id as proveedora_id,
  p.nombre as proveedora,
  coalesce(vi.precio_costo_al_vender, 0)                                as precio_ticket,
  vi.comision_pct_al_vender                                             as comision_pct,
  vi.comision_valor,
  vi.precio_venta,
  vi.precio_venta - coalesce(vi.precio_costo_al_vender, 0)              as excedente,
  vi.comision_valor + vi.precio_venta - coalesce(vi.precio_costo_al_vender, 0) as utilidad
from public.venta_items vi
join public.ventas v on v.id = vi.venta_id and not v.anulada
join public.clientas c on c.id = v.clienta_id
join public.joyas j on j.id = vi.joya_id
join public.lotes l on l.id = j.lote_id
join public.proveedoras p on p.id = l.proveedora_id;

-- Cheques con el nombre de la proveedora
create view public.v_cheques
with (security_invoker = true) as
select ch.*, p.nombre as proveedora, lo.nombre as lote
from public.cheques ch
join public.proveedoras p on p.id = ch.proveedora_id
left join public.cierres ci on ci.id = ch.cierre_id
left join public.lotes lo on lo.id = ci.lote_id;

-- Clientas atrasadas: ya pasó su día de pago y lo abonado desde el día
-- de pago anterior no alcanza la cuota mensual.
create view public.v_clientas_atrasadas
with (security_invoker = true) as
with base as (
  select
    s.clienta_id, s.nombre, s.telefono_whatsapp, s.saldo, c.dia_pago, c.enviar_saldo,
    -- día de pago de este mes (si el mes es más corto, el último día)
    least(
      make_date(extract(year from current_date)::int, extract(month from current_date)::int, 1)
        + (c.dia_pago - 1),
      (date_trunc('month', current_date) + interval '1 month - 1 day')::date
    ) as pago_este_mes
  from public.v_saldos_clientas s
  join public.clientas c on c.id = s.clienta_id
  where s.saldo > 0 and c.dia_pago is not null
),
fechas as (
  select b.*,
    case when b.pago_este_mes <= current_date then b.pago_este_mes
         else least(
           (date_trunc('month', current_date) - interval '1 month')::date + (b.dia_pago - 1),
           (date_trunc('month', current_date) - interval '1 day')::date)
    end as ultimo_pago_esperado
  from base b
),
cuotas as (
  select f.*,
    (f.ultimo_pago_esperado - interval '1 month')::date as periodo_desde,
    least(f.saldo, coalesce((
      select sum(coalesce(v.cuota_mensual,
                          case when v.plazo_meses > 0 then round(v.total_venta / v.plazo_meses, 2)
                               else v.total_venta end))
      from public.ventas v
      where v.clienta_id = f.clienta_id and not v.anulada
        and v.fecha::date <= (f.ultimo_pago_esperado - interval '1 month')::date
    ), 0)) as cuota_esperada
  from fechas f
)
select
  q.clienta_id, q.nombre, q.telefono_whatsapp, q.saldo, q.dia_pago, q.enviar_saldo,
  q.ultimo_pago_esperado,
  q.cuota_esperada,
  coalesce(a.abonado, 0) as abonado_en_periodo,
  (current_date - q.ultimo_pago_esperado) as dias_atraso,
  a.ultimo_abono
from cuotas q
left join lateral (
  select sum(ab.monto) filter (where ab.fecha::date > q.periodo_desde) as abonado,
         max(ab.fecha) as ultimo_abono
  from public.abonos ab
  where ab.clienta_id = q.clienta_id and not ab.anulado
) a on true
where q.cuota_esperada > 0
  and coalesce(a.abonado, 0) < q.cuota_esperada
  and current_date > q.ultimo_pago_esperado;

-- ---------------------------------------------------------------------
-- 9. Seguridad de las tablas nuevas
-- ---------------------------------------------------------------------
alter table public.cierres enable row level security;
alter table public.cheques enable row level security;

create policy "miembros leen"  on public.cierres for select to authenticated using ((select public.es_miembro()));
create policy "miembros crean" on public.cierres for insert to authenticated with check ((select public.es_miembro()));
create policy "miembros cambian" on public.cierres for update to authenticated
  using ((select public.es_miembro())) with check ((select public.es_miembro()));

-- cheques: crear, marcar cobrado o anular; nunca borrar
create policy "miembros leen"  on public.cheques for select to authenticated using ((select public.es_miembro()));
create policy "miembros crean" on public.cheques for insert to authenticated with check ((select public.es_miembro()));
create policy "miembros cambian" on public.cheques for update to authenticated
  using ((select public.es_miembro())) with check ((select public.es_miembro()));

revoke all on public.cierres, public.cheques from anon;
