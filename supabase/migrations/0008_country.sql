-- =============================================================
-- Migración 0008: país del establecimiento
--
-- Permite guardar establecimientos fuera de España (Portugal, etc.).
-- Para los de España se sigue usando municipio + provincia (tablas
-- normalizadas); para el extranjero basta con dirección y país.
-- =============================================================

alter table public.restaurants
  add column if not exists country text not null default 'España'
  check (char_length(country) between 2 and 60);

-- Los establecimientos existentes son todos de España (valor por defecto).

create index if not exists restaurants_country_idx
  on public.restaurants (country);
