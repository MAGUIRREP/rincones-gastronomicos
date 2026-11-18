import { Suspense } from "react";

import { InactivityWatcher } from "@/components/layout/inactivity-watcher";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Layout general: la web es de lectura pública, así que no se exige
 * sesión aquí. Si hay usuario se carga su perfil (para el menú y los
 * botones de edición) y se activa el control de inactividad.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();
    profile = data && !data.is_blocked ? data : null;
  }

  return (
    <>
      <Navbar profile={profile} />
      <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Hecho con 🍴 por Álvaro y{" "}
        {/* Huevo de pascua: el juego Cat Wars (public/cat-wars.html) */}
        <a
          href="/cat-wars.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-inherit no-underline"
        >
          Mariano
        </a>
      </footer>
      {profile && (
        <Suspense fallback={null}>
          <InactivityWatcher />
        </Suspense>
      )}
    </>
  );
}
