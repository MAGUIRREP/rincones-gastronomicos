-- =============================================================
-- Migración 0006: vista pública de perfiles (solo id + nombre)
--
-- La tabla profiles es privada (contiene emails y roles). Para poder
-- mostrar "añadido por <nombre>" en las fichas públicas se expone una
-- vista con ÚNICAMENTE el id y el nombre. La vista se ejecuta con los
-- permisos de su propietario (sin security_invoker), por lo que salta
-- el RLS de profiles pero solo deja ver esas dos columnas.
-- =============================================================

create or replace view public.public_profiles as
select id, full_name
from public.profiles;

grant select on public.public_profiles to anon, authenticated;
