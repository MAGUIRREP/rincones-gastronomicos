# 🍴 Los rincones gastronómicos de Álvaro y Mariano

Aplicación web para guardar, organizar y consultar los mejores bares y
restaurantes descubiertos por España. Fichas completas con fotos, mapa,
valoraciones, platos favoritos y vídeos de YouTube.

**Stack 100 % gratuito (Free Tier):** Next.js 16 + Supabase + Vercel +
Cloudflare Turnstile + OpenStreetMap.

---

## Índice

1. [Tecnologías](#tecnologías)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Instalación local](#instalación-local)
4. [Configuración de Supabase](#configuración-de-supabase)
5. [Configuración de Cloudflare Turnstile](#configuración-de-cloudflare-turnstile)
6. [Variables de entorno](#variables-de-entorno)
7. [Despliegue en Vercel](#despliegue-en-vercel)
8. [Usuarios y roles](#usuarios-y-roles)
9. [Seguridad](#seguridad)
10. [Scripts disponibles](#scripts-disponibles)
11. [Backups](#backups)
12. [Mantenimiento](#mantenimiento)
13. [Funcionalidades futuras](#funcionalidades-futuras)

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Lenguaje | TypeScript |
| Estilos | TailwindCSS v4 + shadcn/ui |
| Formularios | React Hook Form + Zod |
| Datos en cliente | TanStack Query |
| Mapas | Leaflet + React Leaflet + OpenStreetMap (clustering incluido) |
| Iconos | Lucide |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Anti-bots | Cloudflare Turnstile |
| Hosting | Vercel (frontend) + Supabase (BD y ficheros) |

> No se usa Prisma: el cliente oficial de Supabase cubre todas las
> necesidades (consultas con joins, RLS, Storage y Auth) sin añadir una
> capa extra de complejidad ni un paso de generación de tipos.

## Estructura del proyecto

```
rincones-gastronomicos/
├── supabase/
│   ├── migrations/          # SQL: esquema, RLS, triggers, storage
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_geo_seed.sql        # comunidades y provincias (INE)
│   │   └── 0003_storage.sql         # bucket de fotos + políticas
│   └── seed.sql             # establecimientos de ejemplo
├── src/
│   ├── app/                 # rutas (App Router)
│   │   ├── (app)/           # zona autenticada (navbar + inactividad)
│   │   │   ├── page.tsx             # página principal
│   │   │   ├── restaurantes/        # listado, ficha, crear, editar
│   │   │   ├── mapa/                # mapa completo
│   │   │   ├── dashboard/           # estadísticas
│   │   │   └── admin/               # panel de administración
│   │   ├── actions/         # Server Actions (auth, restaurantes, usuarios)
│   │   └── login/           # login con Turnstile
│   ├── components/          # componentes React
│   │   ├── ui/              # shadcn/ui
│   │   ├── layout/          # navbar, tema, inactividad
│   │   ├── restaurants/     # tarjetas, formulario, galería, fotos…
│   │   ├── map/             # mapas Leaflet (carga dinámica)
│   │   ├── admin/           # tablas de usuarios y auditoría
│   │   └── auth/            # formulario de login
│   ├── hooks/               # hooks personalizados
│   ├── lib/                 # supabase clients, validaciones Zod, utils
│   ├── services/            # capa de acceso a datos (consultas)
│   ├── types/               # tipos TypeScript de la BD
│   └── proxy.ts             # sesión, expiración 30 min, guardas de ruta
└── .env.example
```

## Instalación local

Requisitos: **Node.js 20.9+** y **npm**.

```bash
git clone https://github.com/TU_USUARIO/rincones-gastronomicos.git
cd rincones-gastronomicos
npm install
cp .env.example .env.local   # y rellena los valores (ver más abajo)
npm run dev                  # http://localhost:3000
```

## Configuración de Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) y un
   proyecto nuevo (región `eu-west` recomendada). Guarda la contraseña de
   la base de datos.
2. Copia de **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (¡solo servidor!)
3. Aplica las migraciones. Dos opciones:

   **Opción A — CLI de Supabase (recomendada):**
   ```bash
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push              # aplica supabase/migrations/*
   ```

   **Opción B — SQL Editor del panel:** copia y ejecuta, en orden,
   `0001_initial_schema.sql`, `0002_geo_seed.sql` y `0003_storage.sql`.

4. (Opcional) Carga los datos de ejemplo ejecutando `supabase/seed.sql`
   en el SQL Editor.
5. En **Authentication → Providers** deja solo **Email** activado y
   desactiva "Allow new users to sign up" (los usuarios los crean los
   administradores desde la app).

## Configuración de Cloudflare Turnstile

1. Cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Turnstile → Add site**: nombre libre, dominio de tu app en Vercel
   (p. ej. `rincones.vercel.app`) y también `localhost` para desarrollo.
   Modo *Managed*.
3. Copia:
   - **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** → `TURNSTILE_SECRET_KEY`

Para desarrollo puedes usar las claves de prueba que siempre pasan:
`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`.

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente y servidor | Clave pública (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Administración de usuarios. Nunca en el cliente |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | cliente | Site key de Turnstile |
| `TURNSTILE_SECRET_KEY` | **solo servidor** | Verificación del token Turnstile |
| `NEXT_PUBLIC_SITE_URL` | cliente y servidor | URL pública (metadata / OG) |

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa
   el repositorio. Framework detectado: Next.js (sin cambios).
3. En **Environment Variables** añade TODAS las variables de la tabla
   anterior (`SUPABASE_SERVICE_ROLE_KEY` y `TURNSTILE_SECRET_KEY` son
   secretas: sin prefijo `NEXT_PUBLIC_`).
4. Deploy. Cada `git push` a `main` desplegará automáticamente.
5. Actualiza `NEXT_PUBLIC_SITE_URL` con la URL final y añade ese dominio
   en Turnstile.

## Usuarios y roles

- Roles: `admin` y `usuario` (enum en BD + tabla `profiles`).
- **Crear los dos administradores (Álvaro y Mariano):**
  1. Supabase → **Authentication → Users → Add user** (email + contraseña,
     marca *Auto Confirm*). El trigger `handle_new_user` crea su perfil.
  2. En el SQL Editor, promociónalos:
     ```sql
     update public.profiles
     set role = 'admin'
     where email in ('alvaro@ejemplo.com', 'mariano@ejemplo.com');
     ```
- A partir de ahí, todo se hace desde **/admin** en la app: crear,
  editar, bloquear y eliminar usuarios.
- Los usuarios normales no pueden acceder a `/admin` (bloqueado en el
  proxy, en la página y por RLS).

## Seguridad

- **RLS activado en todas las tablas**: lectura solo autenticados y no
  bloqueados; borrado de establecimientos solo admin; auditoría solo admin.
- **Turnstile** verificado en servidor en cada login.
- **Validación doble**: Zod en el cliente (formularios) y en el servidor
  (Server Actions), más restricciones CHECK en PostgreSQL.
- **SQL Injection**: imposible por diseño (cliente Supabase parametriza todo).
- **XSS**: React escapa todo por defecto; no se usa `dangerouslySetInnerHTML`.
- **CSRF**: las Server Actions de Next.js validan el origen de la petición
  automáticamente; cookies con `SameSite=Lax` y `Secure` en producción.
- **Sesión**: expira a los **30 minutos de inactividad** (comprobado en el
  proxy en cada petición y con un temporizador en el cliente). Al expirar
  se vuelve al login guardando la URL (`?redirectTo=`) y se restaura al entrar.
- **Rate limiting** en el login (10 intentos / 10 min por IP) además de los
  límites propios de Supabase Auth.
- **Cabeceras de seguridad** (HSTS, X-Frame-Options, nosniff…) en
  `next.config.ts`.
- La clave `service_role` solo vive en el servidor (`server-only`).

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Desarrollo con Turbopack |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera tipos de rutas y comprueba TypeScript |
| `npm run test` | Lint + typecheck (puerta de calidad) |
| `npm run db:link` | Vincular proyecto Supabase (CLI) |
| `npm run db:push` | Aplicar migraciones a Supabase |
| `npm run deploy` | Desplegar a producción con Vercel CLI |

## Backups

- **Automáticos**: el plan gratuito de Supabase guarda backups diarios
  durante 7 días (**Database → Backups**).
- **Manuales** (recomendado 1 vez al mes):
  ```bash
  npx supabase db dump -f backup_$(date +%Y%m%d).sql
  ```
- **Fotos**: el bucket `photos` puede descargarse desde el panel de
  Storage o con la CLI. Las fotos se comprimen a WebP (≤1,5 MB) antes de
  subirse, así que el free tier (1 GB) da para miles de fotos.

## Mantenimiento

- **Pausa por inactividad**: los proyectos gratuitos de Supabase se pausan
  tras ~1 semana sin uso; se reactivan desde el panel con un clic. Un uso
  regular de la app evita la pausa.
- **Dependencias**: `npm outdated` y actualizar con calma; Next.js y
  Supabase publican guías de migración.
- **Auditoría**: la tabla `audit_log` crece con cada cambio. Si algún día
  pesa demasiado: `delete from audit_log where changed_at < now() - interval '1 year';`
- **Logs**: Vercel → Deployments → Functions para errores del servidor;
  Supabase → Logs para la base de datos.

## Funcionalidades futuras

El esquema y la arquitectura ya lo dejan preparado:

- **Etiquetas**: tablas `tags` y `restaurant_tags` ya creadas.
- **Pendientes por visitar**: tabla `pending_visits` ya creada.
- **Exportación CSV/PDF**: añadir una Server Action que lea `getRestaurants`.
- **Compartir enlaces**: las fichas tienen URL propia (`/restaurantes/[id]`).
- **Ranking por provincias**: consulta ya disponible en `getStats()`.
- **PWA**: añadir `manifest.webmanifest` + service worker.
- **API REST**: Supabase ya expone PostgREST; también se pueden añadir
  Route Handlers en `src/app/api/`.
- **Notificaciones / importación masiva**: sobre la misma capa de servicios.

---

Hecho con 🍴 por Álvaro y Mariano.
