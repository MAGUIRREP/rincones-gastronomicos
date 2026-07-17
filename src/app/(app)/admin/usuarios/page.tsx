import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UsersTable } from "@/components/admin/users-table";
import { getCurrentProfile } from "@/services/profile";
import { getProfiles } from "@/services/admin";

export const metadata: Metadata = {
  title: "Gestión de usuarios",
};

export default async function AdminUsuariosPage() {
  const profile = await getCurrentProfile();
  // El proxy ya protege /admin; doble comprobación por seguridad.
  if (!profile || profile.role !== "admin") redirect("/");

  const users = await getProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          {users.length} usuarios registrados. Los usuarios creados no pueden
          acceder a la administración ni crear otros usuarios.
        </p>
      </div>
      <UsersTable users={users} currentUserId={profile.id} />
    </div>
  );
}
