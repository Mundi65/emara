-- Código propio de cada joya, lo pone la app: E0001, E0002…
-- (muchos tickets no traen código, solo precio y marca)
create sequence if not exists public.joyas_codigo_seq;
alter table public.joyas
  add column if not exists codigo text not null
    default ('E' || lpad(nextval('public.joyas_codigo_seq')::text, 4, '0'));
create unique index if not exists joyas_codigo_unico on public.joyas (codigo);
grant usage on sequence public.joyas_codigo_seq to authenticated;
comment on column public.joyas.codigo is 'Código de Emara (automático), el que se muestra bajo la foto';

-- El balance también muestra el código de Emara
create or replace view public.v_balance_ventas
with (security_invoker = true) as
select
  v.id as venta_id, v.fecha, v.clienta_id, c.nombre as clienta, v.plazo_meses, vi.joya_id,
  j.codigo_ticket, j.foto_joya_path, l.id as lote_id, l.nombre as lote, p.id as proveedora_id, p.nombre as proveedora,
  coalesce(vi.precio_costo_al_vender, 0) as precio_ticket,
  vi.comision_pct_al_vender as comision_pct,
  vi.comision_valor,
  vi.precio_venta,
  vi.precio_venta - coalesce(vi.precio_costo_al_vender, 0) as excedente,
  vi.comision_valor + vi.precio_venta - coalesce(vi.precio_costo_al_vender, 0) as utilidad,
  j.codigo
from public.venta_items vi
join public.ventas v on v.id = vi.venta_id and not v.anulada
join public.clientas c on c.id = v.clienta_id
join public.joyas j on j.id = vi.joya_id
join public.lotes l on l.id = j.lote_id
join public.proveedoras p on p.id = l.proveedora_id;
