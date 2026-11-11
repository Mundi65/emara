-- =====================================================================
-- Emara · Bucket privado de fotos
-- Rutas: fotos/{lote_id}/{joya_id}_joya.jpg y {joya_id}_ticket.jpg
-- Solo miembros pueden ver y subir. Nada es público.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "fotos: miembros ven"
  on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (select public.es_miembro()));

create policy "fotos: miembros suben"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (select public.es_miembro()));

create policy "fotos: miembros reemplazan"
  on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (select public.es_miembro()))
  with check (bucket_id = 'fotos' and (select public.es_miembro()));

create policy "fotos: miembros borran"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (select public.es_miembro()));
