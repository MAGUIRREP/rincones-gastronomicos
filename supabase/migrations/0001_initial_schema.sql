-- =============================================================
-- Los rincones gastronómicos de Álvaro y Mariano
-- Migración 0001: esquema inicial
-- =============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- búsqueda de texto libre

-- =============================================================
-- ENUMS
-- =============================================================
create type public.user_role as enum ('admin', 'usuario');

create type public.establishment_type as enum (
  'bar',
  'restaurante',
  'cafeteria',
  'chiringuito',
  'taberna',
  'otro'
);

create type public.audit_action as enum ('INSERT', 'UPDATE', 'DELETE');

-- =============================================================
-- TABLAS DE REFERENCIA GEOGRÁFICA (normalizadas)
-- =============================================================
create table public.comunidades (
  id smallint primary key,
  nombre text not null unique
);

create table public.provincias (
  id smallint primary key,
  nombre text not null unique,
  comunidad_id smallint not null references public.comunidades (id)
);

create index provincias_comunidad_idx on public.provincias (comunidad_id);

-- =============================================================
-- PERFILES (vinculados a auth.users)
-- =============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.user_role not null default 'usuario',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================
-- RESTAURANTES / ESTABLECIMIENTOS
-- =============================================================
create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (char_length(name) between 1 and 150),
  type public.establishment_type not null default 'restaurante',
  address text,
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  municipio text,
  provincia_id smallint references public.provincias (id),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  phone text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  schedule text,
  avg_price numeric(8, 2) check (avg_price is null or avg_price >= 0),
  rating smallint check (rating is null or rating between 1 and 5),
  personal_comment text,
  observations text,
  visit_date date,
  would_return boolean,
  is_favorite boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_provincia_idx on public.restaurants (provincia_id);
create index restaurants_type_idx on public.restaurants (type);
create index restaurants_rating_idx on public.restaurants (rating);
create index restaurants_favorite_idx on public.restaurants (is_favorite) where is_favorite;
create index restaurants_visit_date_idx on public.restaurants (visit_date);
create index restaurants_created_at_idx on public.restaurants (created_at desc);
create index restaurants_name_trgm_idx on public.restaurants using gin (name gin_trgm_ops);
create index restaurants_municipio_trgm_idx on public.restaurants using gin (municipio gin_trgm_ops);

-- =============================================================
-- FOTOGRAFÍAS
-- =============================================================
create table public.photos (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  storage_path text not null,
  is_main boolean not null default false,
  position smallint not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index photos_restaurant_idx on public.photos (restaurant_id);
-- Solo una foto principal por restaurante
create unique index photos_one_main_per_restaurant
  on public.photos (restaurant_id)
  where is_main;

-- =============================================================
-- PLATOS FAVORITOS
-- =============================================================
create table public.favorite_dishes (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index favorite_dishes_restaurant_idx on public.favorite_dishes (restaurant_id);
create index favorite_dishes_name_trgm_idx on public.favorite_dishes using gin (name gin_trgm_ops);

-- =============================================================
-- VÍDEOS (enlaces de YouTube)
-- =============================================================
create table public.videos (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  youtube_url text not null check (
    youtube_url ~* '^https?://(www\.)?(youtube\.com|youtu\.be)/'
  ),
  title text,
  created_at timestamptz not null default now()
);

create index videos_restaurant_idx on public.videos (restaurant_id);

-- =============================================================
-- ETIQUETAS (preparado para futuro)
-- =============================================================
create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.restaurant_tags (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (restaurant_id, tag_id)
);

-- =============================================================
-- LISTA DE PENDIENTES (preparado para futuro)
-- =============================================================
create table public.pending_visits (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  municipio text,
  provincia_id smallint references public.provincias (id),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- =============================================================
-- AUDITORÍA
-- =============================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action public.audit_action not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);

-- =============================================================
-- FUNCIONES Y TRIGGERS
-- =============================================================

-- Función: comprobar si el usuario actual es admin (SECURITY DEFINER
-- para evitar recursión en las políticas RLS de profiles)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and not is_blocked
  );
$$;

-- Función: comprobar si el usuario actual está activo (no bloqueado)
create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and not is_blocked
  );
$$;

-- Trigger: crear perfil automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'usuario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: mantener updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger: auditoría de restaurantes
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, action, changed_by, new_data)
    values (tg_table_name, new.id::text, 'INSERT', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
    values (tg_table_name, new.id::text, 'UPDATE', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (table_name, record_id, action, changed_by, old_data)
    values (tg_table_name, old.id::text, 'DELETE', auth.uid(), to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger restaurants_audit
  after insert or update or delete on public.restaurants
  for each row execute function public.audit_trigger();

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.comunidades enable row level security;
alter table public.provincias enable row level security;
alter table public.restaurants enable row level security;
alter table public.photos enable row level security;
alter table public.favorite_dishes enable row level security;
alter table public.videos enable row level security;
alter table public.tags enable row level security;
alter table public.restaurant_tags enable row level security;
alter table public.pending_visits enable row level security;
alter table public.audit_log enable row level security;

-- --- profiles ---
create policy "profiles: usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles: usuarios actualizan su nombre"
  on public.profiles for update
  using (auth.uid() = id and not is_blocked)
  with check (auth.uid() = id);

create policy "profiles: admin gestiona perfiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- --- geografía: lectura para usuarios autenticados ---
create policy "comunidades: lectura autenticada"
  on public.comunidades for select
  using (auth.role() = 'authenticated');

create policy "provincias: lectura autenticada"
  on public.provincias for select
  using (auth.role() = 'authenticated');

-- --- restaurants ---
create policy "restaurants: lectura usuarios activos"
  on public.restaurants for select
  using (public.is_active_user());

create policy "restaurants: crear usuarios activos"
  on public.restaurants for insert
  with check (public.is_active_user() and created_by = auth.uid());

create policy "restaurants: editar usuarios activos"
  on public.restaurants for update
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "restaurants: eliminar solo admin"
  on public.restaurants for delete
  using (public.is_admin());

-- --- photos ---
create policy "photos: lectura usuarios activos"
  on public.photos for select
  using (public.is_active_user());

create policy "photos: crear usuarios activos"
  on public.photos for insert
  with check (public.is_active_user());

create policy "photos: editar usuarios activos"
  on public.photos for update
  using (public.is_active_user());

create policy "photos: eliminar usuarios activos"
  on public.photos for delete
  using (public.is_active_user());

-- --- favorite_dishes ---
create policy "favorite_dishes: lectura usuarios activos"
  on public.favorite_dishes for select
  using (public.is_active_user());

create policy "favorite_dishes: gestión usuarios activos"
  on public.favorite_dishes for all
  using (public.is_active_user())
  with check (public.is_active_user());

-- --- videos ---
create policy "videos: lectura usuarios activos"
  on public.videos for select
  using (public.is_active_user());

create policy "videos: gestión usuarios activos"
  on public.videos for all
  using (public.is_active_user())
  with check (public.is_active_user());

-- --- tags ---
create policy "tags: lectura usuarios activos"
  on public.tags for select
  using (public.is_active_user());

create policy "tags: gestión usuarios activos"
  on public.tags for all
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "restaurant_tags: lectura usuarios activos"
  on public.restaurant_tags for select
  using (public.is_active_user());

create policy "restaurant_tags: gestión usuarios activos"
  on public.restaurant_tags for all
  using (public.is_active_user())
  with check (public.is_active_user());

-- --- pending_visits ---
create policy "pending_visits: lectura usuarios activos"
  on public.pending_visits for select
  using (public.is_active_user());

create policy "pending_visits: gestión usuarios activos"
  on public.pending_visits for all
  using (public.is_active_user())
  with check (public.is_active_user());

-- --- audit_log: solo lectura para admin (escribe el trigger) ---
create policy "audit_log: lectura solo admin"
  on public.audit_log for select
  using (public.is_admin());

-- =============================================================
-- VISTA DE ESTADÍSTICAS (dashboard)
-- =============================================================
create or replace view public.restaurant_stats
with (security_invoker = true)
as
select
  count(*)::int as total,
  coalesce(avg(rating), 0)::numeric(3, 2) as avg_rating,
  count(*) filter (where is_favorite)::int as favorites
from public.restaurants;
