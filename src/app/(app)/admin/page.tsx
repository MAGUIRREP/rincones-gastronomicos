import { ClipboardList, UtensilsCrossed, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Administración",
};

const SECTIONS = [
  {
    href: "/admin/usuarios",
    title: "Usuarios y roles",
    description: "Crear, editar, bloquear o eliminar usuarios y asignar roles.",
    icon: Users,
  },
  {
    href: "/restaurantes",
    title: "Restaurantes",
    description:
      "Gestiona los establecimientos: como administrador puedes eliminarlos desde el listado.",
    icon: UtensilsCrossed,
  },
  {
    href: "/admin/auditoria",
    title: "Auditoría",
    description: "Quién creó o modificó cada registro, cuándo y qué cambió.",
    icon: ClipboardList,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de administración
        </h1>
        <p className="text-muted-foreground">
          Zona reservada para Álvaro y Mariano.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Card className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <CardHeader>
                <div
                  className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Icon className="size-6" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
