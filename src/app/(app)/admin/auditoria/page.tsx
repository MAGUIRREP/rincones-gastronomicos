import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuditTable } from "@/components/admin/audit-table";
import { getAuditLog } from "@/services/admin";
import { getCurrentProfile } from "@/services/profile";

export const metadata: Metadata = {
  title: "Auditoría",
};

export default async function AdminAuditoriaPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const entries = await getAuditLog(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
        <p className="text-muted-foreground">
          Registro de creaciones, modificaciones y borrados (últimas{" "}
          {entries.length} entradas).
        </p>
      </div>
      <AuditTable entries={entries} />
    </div>
  );
}
