-- =============================================================
-- Migración 0004: lectura pública
--
-- Cualquiera puede consultar establecimientos, fotos, platos,
-- vídeos y geografía sin iniciar sesión. Crear/editar sigue
-- requiriendo usuario activo y eliminar sigue siendo solo admin.
-- profiles, audit_log y pending_visits siguen siendo privados.
-- =============================================================

-- --- restaurants ---
drop policy if exists "restaurants: lectura usuarios activos" on public.restaurants;
create policy "restaurants: lectura publica"
  on public.restaurants for select
  using (true);

-- --- photos ---
drop policy if exists "photos: lectura usuarios activos" on public.photos;
create policy "photos: lectura publica"
  on public.photos for select
  using (true);

-- --- favorite_dishes ---
drop policy if exists "favorite_dishes: lectura usuarios activos" on public.favorite_dishes;
create policy "favorite_dishes: lectura publica"
  on public.favorite_dishes for select
  using (true);

-- --- videos ---
drop policy if exists "videos: lectura usuarios activos" on public.videos;
create policy "videos: lectura publica"
  on public.videos for select
  using (true);

-- --- tags ---
drop policy if exists "tags: lectura usuarios activos" on public.tags;
create policy "tags: lectura publica"
  on public.tags for select
  using (true);

drop policy if exists "restaurant_tags: lectura usuarios activos" on public.restaurant_tags;
create policy "restaurant_tags: lectura publica"
  on public.restaurant_tags for select
  using (true);

-- --- geografía ---
drop policy if exists "comunidades: lectura autenticada" on public.comunidades;
create policy "comunidades: lectura publica"
  on public.comunidades for select
  using (true);

drop policy if exists "provincias: lectura autenticada" on public.provincias;
create policy "provincias: lectura publica"
  on public.provincias for select
  using (true);
