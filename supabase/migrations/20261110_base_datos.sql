-- =====================================================================
-- Emara · Base de datos (Fase 1, paso 1)
-- Ver ARQUITECTURA.md §3. Tablas, views, reglas y seguridad (RLS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Quién puede usar la app
-- Solo las personas de esta tabla ven y cambian datos. Aunque alguien
-- cree una cuenta, sin estar aquí no ve nada.
-- ---------------------------------------------------------------------
create table public.miembros (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  created_at timestamptz not null default now()
);

create or replace function public.es_miembro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.miembros m where m.user_id = (select auth.uid()));
$$;

revoke all on function public.es_miembro() from public, anon;
grant execute on function public.es_miembro() to authenticated;

-- ---------------------------------------------------------------------
-- 1. Ajustes (una sola fila)
-- ---------------------------------------------------------------------
create table public.ajustes (
  id                  boolean primary key default true check (id),  -- fuerza una sola fila
  nombre_negocio      text not null default 'Emara Joyas',
  telefono_duena      text,
  pin_duena_hash      text,             -- se guarda cifrado, nunca el PIN tal cual
  margen_por_defecto  numeric(6,2) not null default 100 check (margen_por_defecto >= 0), -- % sobre el costo
  puestos_por_bolsa   int not null default 20 check (puestos_por_bolsa between 1 and 200),
  texto_comprobante   text not null default '¡Gracias por tu abono!',
  updated_at          timestamptz not null default now()
);
insert into public.ajustes default values;

-- ---------------------------------------------------------------------
-- 2. Catálogos: proveedoras, categorías, prefijos
-- ---------------------------------------------------------------------
create table public.proveedoras (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  telefono   text,
  notas      text,
  created_at timestamptz not null default now()
);

create table public.categorias (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden  int not null default 0
);

insert into public.categorias (nombre, orden) values
  ('Anillo', 1), ('Aretes', 2), ('Pulsera', 3), ('Collar', 4), ('Cadena', 5),
  ('Dije', 6), ('Reloj', 7), ('Juego', 8), ('Otro', 9);

-- Pista para la IA: prefijo del código → categoría. Aida la confirma y edita.
create table public.prefijos (
  prefijo      text primary key check (prefijo = upper(prefijo) and length(prefijo) > 0),
  categoria_id uuid not null references public.categorias(id) on delete cascade
);

insert into public.prefijos (prefijo, categoria_id)
select p.prefijo, c.id
from (values ('CAD', 'Cadena'), ('DIJE', 'Dije'), ('PULS', 'Pulsera')) as p(prefijo, cat)
join public.categorias c on c.nombre = p.cat;

insert into public.proveedoras (nombre) values ('Alexandra Jewelry');

-- ---------------------------------------------------------------------
-- 3. Lotes y joyas
-- ---------------------------------------------------------------------
create table public.lotes (
  id                         uuid primary key default gen_random_uuid(),
  proveedora_id              uuid not null references public.proveedoras(id),
  nombre                     text not null,
  fecha_recepcion            date not null default current_date,
  fecha_devolucion_estimada  date,
  estado                     text not null default 'abierto'
                               check (estado in ('abierto', 'en_devolucion', 'cerrado')),
  precio_gramo               numeric(12,2) check (precio_gramo is null or precio_gramo >= 0),
  notas                      text,
  created_at                 timestamptz not null default now()
);
create index on public.lotes (proveedora_id);

create table public.joyas (
  id                     uuid primary key default gen_random_uuid(),
  lote_id                uuid not null references public.lotes(id),
  categoria_id           uuid references public.categorias(id),
  genero                 text check (genero in ('mujer', 'hombre', 'unisex', 'nino')),
  codigo_ticket          text,               -- tal cual viene en el ticket, sin asumir formato
  codigo_barras          text,
  tipo_costo             text not null default 'precio' check (tipo_costo in ('precio', 'peso')),
  precio_costo           numeric(12,2) check (precio_costo is null or precio_costo >= 0),
  peso_gramos            numeric(10,2) check (peso_gramos is null or peso_gramos > 0),
  es_juego               boolean not null default false,
  componentes            text,
  ticket_manuscrito      boolean not null default false,
  confianza_ia           numeric(3,2) check (confianza_ia is null or confianza_ia between 0 and 1),
  precio_venta_sugerido  numeric(12,2) check (precio_venta_sugerido is null or precio_venta_sugerido >= 0),
  casilla                text,               -- ej. "B3-07"; se asigna sola si viene vacía
  foto_joya_path         text,
  foto_ticket_path       text,
  fotos_extra            text[] not null default '{}',
  estado                 text not null default 'disponible'
                           check (estado in ('disponible', 'vendida', 'devuelta', 'perdida')),
  descripcion_ia         text,
  notas                  text,
  created_at             timestamptz not null default now(),
  unique (lote_id, casilla)
);
create index on public.joyas (lote_id);
create index on public.joyas (categoria_id);
create index on public.joyas (codigo_ticket);
create index on public.joyas (estado);

-- Asigna la casilla siguiente del lote: B1-01 … B1-20, B2-01 …
create or replace function public.asignar_casilla()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n          int;
  por_bolsa  int;
begin
  if new.casilla is not null and new.casilla <> '' then
    return new;
  end if;
  -- Bloquea el lote para que dos joyas no reciban la misma casilla
  perform 1 from public.lotes where id = new.lote_id for update;
  select puestos_por_bolsa into por_bolsa from public.ajustes limit 1;
  por_bolsa := coalesce(por_bolsa, 20);
  select count(*) into n from public.joyas where lote_id = new.lote_id;
  loop
    new.casilla := 'B' || (n / por_bolsa + 1)::text || '-' || lpad((n % por_bolsa + 1)::text, 2, '0');
    -- si se borró una joya, la casilla calculada puede estar ocupada: buscar la siguiente libre
    exit when not exists (select 1 from public.joyas where lote_id = new.lote_id and casilla = new.casilla);
    n := n + 1;
  end loop;
  return new;
end;
$$;

create trigger joyas_asignar_casilla
  before insert on public.joyas
  for each row execute function public.asignar_casilla();

-- Historial de costos: si cambia el costo de una joya, queda registrado
create table public.historial_costos (
  id              uuid primary key default gen_random_uuid(),
  joya_id         uuid not null references public.joyas(id),
  costo_anterior  numeric(12,2),
  costo_nuevo     numeric(12,2),
  motivo          text,
  fecha           timestamptz not null default now()
);
create index on public.historial_costos (joya_id);

create or replace function public.registrar_cambio_costo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.precio_costo is distinct from old.precio_costo then
    insert into public.historial_costos (joya_id, costo_anterior, costo_nuevo)
    values (new.id, old.precio_costo, new.precio_costo);
  end if;
  return new;
end;
$$;

create trigger joyas_historial_costo
  after update of precio_costo on public.joyas
  for each row execute function public.registrar_cambio_costo();

-- ---------------------------------------------------------------------
-- 4. Clientas, ventas y abonos (tarjeta = cuenta corriente)
-- ---------------------------------------------------------------------
create table public.clientas (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  telefono_whatsapp  text,
  direccion          text,
  notas              text,
  created_at         timestamptz not null default now()
);

create table public.ventas (
  id           uuid primary key default gen_random_uuid(),
  clienta_id   uuid not null references public.clientas(id),
  fecha        timestamptz not null default now(),
  total_venta  numeric(12,2) not null default 0 check (total_venta >= 0),
  notas        text,
  anulada      boolean not null default false,
  anulada_en   timestamptz,
  motivo_anulacion text,
  created_at   timestamptz not null default now()
);
create index on public.ventas (clienta_id);

create table public.venta_items (
  id                      uuid primary key default gen_random_uuid(),
  venta_id                uuid not null references public.ventas(id),
  joya_id                 uuid not null references public.joyas(id),
  precio_venta            numeric(12,2) not null check (precio_venta >= 0),
  precio_costo_al_vender  numeric(12,2)   -- copia fija para el informe
);
create index on public.venta_items (venta_id);
create index on public.venta_items (joya_id);

create table public.abonos (
  id                uuid primary key default gen_random_uuid(),
  clienta_id        uuid not null references public.clientas(id),
  fecha             timestamptz not null default now(),
  monto             numeric(12,2) not null check (monto > 0),
  metodo            text not null default 'efectivo' check (metodo in ('efectivo', 'transferencia', 'otro')),
  comprobante_path  text,
  enviado_clienta   boolean not null default false,
  notas             text,
  anulado           boolean not null default false,
  anulado_en        timestamptz,
  motivo_anulacion  text,
  created_at        timestamptz not null default now()
);
create index on public.abonos (clienta_id);

-- ---------------------------------------------------------------------
-- 5. Saldos: siempre CALCULADOS, nunca escritos a mano
-- ---------------------------------------------------------------------
create view public.v_saldos_clientas
with (security_invoker = true) as
select
  c.id   as clienta_id,
  c.nombre,
  c.telefono_whatsapp,
  coalesce(v.total_compras, 0)                               as total_compras,
  coalesce(a.total_abonos, 0)                                as total_abonos,
  coalesce(v.total_compras, 0) - coalesce(a.total_abonos, 0) as saldo,
  greatest(v.ultima_compra, a.ultimo_abono)                  as ultimo_movimiento,
  a.ultimo_abono
from public.clientas c
left join (
  select clienta_id, sum(total_venta) as total_compras, max(fecha) as ultima_compra
  from public.ventas where not anulada group by clienta_id
) v on v.clienta_id = c.id
left join (
  select clienta_id, sum(monto) as total_abonos, max(fecha) as ultimo_abono
  from public.abonos where not anulado group by clienta_id
) a on a.clienta_id = c.id;

create view public.v_tarjeta_clienta
with (security_invoker = true) as
with movimientos as (
  select v.clienta_id, v.fecha, 'compra'::text as tipo, v.id as movimiento_id,
         coalesce(v.notas, '') as detalle, v.total_venta as compro, 0::numeric as abono
  from public.ventas v where not v.anulada
  union all
  select a.clienta_id, a.fecha, 'abono'::text, a.id,
         'Abono' || case when a.metodo <> 'efectivo' then ' (' || a.metodo || ')' else '' end,
         0::numeric, a.monto
  from public.abonos a where not a.anulado
)
select
  clienta_id, fecha, tipo, movimiento_id, detalle, compro, abono,
  sum(compro - abono) over (
    partition by clienta_id order by fecha, tipo desc, movimiento_id
    rows between unbounded preceding and current row
  ) as saldo_acumulado
from movimientos;

-- Un abono no puede ser mayor a lo que la clienta debe
create or replace function public.validar_abono()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  saldo_actual numeric;
begin
  if new.anulado then
    return new;
  end if;
  select coalesce(sum(total_venta), 0) into saldo_actual
    from public.ventas where clienta_id = new.clienta_id and not anulada;
  saldo_actual := saldo_actual - coalesce((
    select sum(monto) from public.abonos
    where clienta_id = new.clienta_id and not anulado
      and id is distinct from new.id), 0);
  if new.monto > saldo_actual then
    raise exception 'El abono ($%) es mayor a lo que debe la clienta ($%)', new.monto, saldo_actual
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger abonos_validar
  before insert or update of monto, anulado on public.abonos
  for each row execute function public.validar_abono();

-- Una joya vendida (o con historial de venta) no se borra: se anula la venta
create or replace function public.impedir_borrar_joya_vendida()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado = 'vendida' or exists (select 1 from public.venta_items where joya_id = old.id) then
    raise exception 'Esta joya tiene una venta. No se puede borrar: anula la venta.'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger joyas_no_borrar_vendida
  before delete on public.joyas
  for each row execute function public.impedir_borrar_joya_vendida();

-- ---------------------------------------------------------------------
-- 6. Seguridad (RLS) en TODAS las tablas
-- Solo miembros. Ventas, ítems de venta, abonos e historial NO se borran
-- (no hay política de DELETE): se anulan.
-- ---------------------------------------------------------------------
alter table public.miembros          enable row level security;
alter table public.ajustes           enable row level security;
alter table public.proveedoras       enable row level security;
alter table public.categorias        enable row level security;
alter table public.prefijos          enable row level security;
alter table public.lotes             enable row level security;
alter table public.joyas             enable row level security;
alter table public.historial_costos  enable row level security;
alter table public.clientas          enable row level security;
alter table public.ventas            enable row level security;
alter table public.venta_items       enable row level security;
alter table public.abonos            enable row level security;

-- miembros: cada quien ve solo su propia fila (se agregan desde el panel de Supabase)
create policy "ver mi fila" on public.miembros
  for select to authenticated using (user_id = (select auth.uid()));

-- ajustes: leer y cambiar, no crear ni borrar
create policy "miembros leen"    on public.ajustes for select to authenticated using ((select public.es_miembro()));
create policy "miembros cambian" on public.ajustes for update to authenticated
  using ((select public.es_miembro())) with check ((select public.es_miembro()));

-- tablas con acceso completo para miembros
do $$
declare t text;
begin
  foreach t in array array['proveedoras', 'categorias', 'prefijos', 'lotes', 'joyas', 'clientas']
  loop
    execute format('create policy "miembros leen" on public.%I for select to authenticated using ((select public.es_miembro()))', t);
    execute format('create policy "miembros crean" on public.%I for insert to authenticated with check ((select public.es_miembro()))', t);
    execute format('create policy "miembros cambian" on public.%I for update to authenticated using ((select public.es_miembro())) with check ((select public.es_miembro()))', t);
    execute format('create policy "miembros borran" on public.%I for delete to authenticated using ((select public.es_miembro()))', t);
  end loop;

  -- movimientos de dinero: crear y anular (update), nunca borrar
  foreach t in array array['ventas', 'venta_items', 'abonos']
  loop
    execute format('create policy "miembros leen" on public.%I for select to authenticated using ((select public.es_miembro()))', t);
    execute format('create policy "miembros crean" on public.%I for insert to authenticated with check ((select public.es_miembro()))', t);
    execute format('create policy "miembros cambian" on public.%I for update to authenticated using ((select public.es_miembro())) with check ((select public.es_miembro()))', t);
  end loop;
end;
$$;

-- historial: solo leer (lo escribe el trigger)
create policy "miembros leen" on public.historial_costos
  for select to authenticated using ((select public.es_miembro()));

-- El trigger de historial corre con los permisos de quien edita la joya,
-- así que necesita poder insertar:
create policy "miembros crean" on public.historial_costos
  for insert to authenticated with check ((select public.es_miembro()));

-- Nadie anónimo toca nada
revoke all on all tables in schema public from anon;
