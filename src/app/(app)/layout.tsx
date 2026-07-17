import { redirect } from "next/navigation";
import { Suspense } from "react";

import { InactivityWatcher } from "@/components/layout/inactivity-watcher";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Layout de la zona autenticada: barra de navegación + control
 * de inactividad. El proxy ya redirige a /login si no hay sesión,
 * pero se comprueba también aquí (defensa en profundidad).
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || profile.is_blocked) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <>
      <Navbar profile={profile} />
      <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Hecho con 🍴 por Álvaro y Mariano
      </footer>
      <Suspense fallback={null}>
        <InactivityWatcher />
      </Suspense>
    </>
  );
}
