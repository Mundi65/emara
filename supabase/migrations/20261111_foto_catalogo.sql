-- Foto para clientas: la joya sola, SIN el ticket (que lleva el precio de costo).
-- El catálogo usa solo esta foto (CLAUDE.md regla 1).
alter table public.joyas add column if not exists foto_catalogo_path text;
comment on column public.joyas.foto_catalogo_path is 'Foto de la joya sin ticket, la única que se muestra a clientas';
