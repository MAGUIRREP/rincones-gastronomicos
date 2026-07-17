"use client";

import {
  LayoutDashboard,
  List,
  LogIn,
  LogOut,
  Map as MapIcon,
  Menu,
  Plus,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV_LINKS = [
  { href: "/", label: "Inicio", icon: UtensilsCrossed },
  { href: "/restaurantes", label: "Establecimientos", icon: List },
  { href: "/mapa", label: "Mapa", icon: MapIcon },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

interface NavbarProps {
  /** Perfil del usuario autenticado, o null para visitantes anónimos. */
  profile: Profile | null;
}

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === "admin";
  const initials = profile
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || profile.email[0]?.toUpperCase()
    : "";

  const linkClass = (href: string) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      (href === "/" ? pathname === "/" : pathname.startsWith(href))
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4"
      >
        {/* Menú móvil */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left">
                <UtensilsCrossed className="size-5 text-primary" />
                Rincones gastronómicos
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={linkClass(href)}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={linkClass("/admin")}
                  onClick={() => setMobileOpen(false)}
                >
                  <ShieldCheck className="size-4" />
                  Administración
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <UtensilsCrossed className="size-5 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Rincones gastronómicos</span>
          <span className="sm:hidden">Rincones</span>
        </Link>

        {/* Navegación escritorio */}
        <div className="ml-6 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className={linkClass("/admin")}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Administración
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {profile && (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/restaurantes/nuevo">
                  <Plus className="size-4" aria-hidden="true" />
                  Añadir
                </Link>
              </Button>
              <Button asChild size="icon" className="sm:hidden" aria-label="Añadir establecimiento">
                <Link href="/restaurantes/nuevo">
                  <Plus className="size-4" />
                </Link>
              </Button>
            </>
          )}

          <ThemeToggle />

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Menú de usuario"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span>{profile.full_name || "Usuario"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {profile.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <ShieldCheck className="size-4" />
                      Administración
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => logoutAction()}
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">
                <LogIn className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
