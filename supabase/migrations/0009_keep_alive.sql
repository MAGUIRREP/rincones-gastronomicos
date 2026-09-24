-- =============================================================
-- Migración 0009: registro del keep-alive
--
-- Supabase Free pausa los proyectos sin "actividad suficiente".
-- Una lectura trivial puede no bastar, así que el ping diario pasa a
-- ESCRIBIR en esta tabla: una escritura es actividad inequívoca de la
-- base de datos.
--
-- Además sirve de diagnóstico: consultando esta tabla se sabe si el
-- cron se está ejecutando de verdad y desde dónde.
-- =============================================================

create table if not exists public.keep_alive (
  id smallint primary key default 1,
  last_ping timestamptz not null default now(),
  ping_count bigint not null default 0,
  source text,
  constraint keep_alive_single_row check (id = 1)
);

insert into public.keep_alive (id, last_ping, ping_count, source)
values (1, now(), 0, 'inicial')
on conflict (id) do nothing;

alter table public.keep_alive enable row level security;

-- Lectura pública: permite comprobar desde fuera cuándo fue el último
-- ping sin necesidad de claves privadas. No contiene datos sensibles.
drop policy if exists "keep_alive: lectura publica" on public.keep_alive;
create policy "keep_alive: lectura publica"
  on public.keep_alive for select
  using (true);

-- La escritura la hace el endpoint con la clave service_role, que
-- no pasa por RLS. No se crea ninguna política de escritura.
