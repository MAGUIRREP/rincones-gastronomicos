-- =============================================================
-- Migración 0007: ampliar tipos y tamaño del bucket de fotos
--
-- Permite GIF y sube el límite a 10 MB para admitir imágenes
-- importadas desde otras webs (Google Fotos, etc.), que pueden
-- venir sin comprimir. Las subidas desde el formulario siguen
-- comprimiéndose en el navegador.
-- =============================================================

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ]
where id = 'photos';
