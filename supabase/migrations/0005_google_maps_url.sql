-- =============================================================
-- Migración 0005: enlace directo a Google Maps
--
-- Permite guardar el enlace copiado de Google Maps de cada
-- establecimiento para abrir su ficha (y reseñas) directamente.
-- =============================================================

alter table public.restaurants
  add column if not exists google_maps_url text
  check (
    google_maps_url is null
    or google_maps_url ~* '^https://((www\.)?google\.[a-z.]+/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl/maps)'
  );
