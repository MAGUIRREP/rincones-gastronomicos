-- =============================================================
-- Migración 0003: bucket de Storage para fotografías + políticas
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  5242880, -- 5 MB por archivo (las imágenes llegan ya comprimidas del cliente)
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Lectura pública (el bucket es público para servir imágenes vía CDN)
create policy "photos bucket: lectura publica"
  on storage.objects for select
  using (bucket_id = 'photos');

-- Subida solo usuarios activos
create policy "photos bucket: subida usuarios activos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_active_user());

-- Actualización solo usuarios activos
create policy "photos bucket: actualizacion usuarios activos"
  on storage.objects for update
  using (bucket_id = 'photos' and public.is_active_user());

-- Borrado solo usuarios activos
create policy "photos bucket: borrado usuarios activos"
  on storage.objects for delete
  using (bucket_id = 'photos' and public.is_active_user());
