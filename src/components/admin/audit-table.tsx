"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AuditLogWithProfile } from "@/types/database";

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-green-500/10 text-green-600 dark:text-green-400",
  UPDATE: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Modificación",
  DELETE: "Borrado",
};

const TABLE_LABELS: Record<string, string> = {
  restaurants: "Establecimiento",
  profiles: "Usuario",
};

/** Campos que cambiaron entre old_data y new_data. */
function changedFields(entry: AuditLogWithProfile): string[] {
  if (!entry.old_data || !entry.new_data) return [];
  const ignored = new Set(["updated_at", "created_at"]);
  return Object.keys(entry.new_data).filter(
    (key) =>
      !ignored.has(key) &&
      JSON.stringify(entry.old_data?.[key]) !==
        JSON.stringify(entry.new_data?.[key]),
  );
}

function recordName(entry: AuditLogWithProfile): string {
  const source = entry.new_data ?? entry.old_data;
  return (
    (source?.name as string) ??
    (source?.email as string) ??
    entry.record_id.slice(0, 8)
  );
}

export function AuditTable({ entries }: { entries: AuditLogWithProfile[] }) {
  const [selected, setSelected] = useState<AuditLogWithProfile | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead className="hidden sm:table-cell">Tabla</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="hidden md:table-cell">Autor</TableHead>
              <TableHead className="hidden lg:table-cell">Cambios</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Detalle</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Sin actividad registrada todavía.
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => {
              const fields = changedFields(entry);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(entry.changed_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ACTION_STYLES[entry.action]}
                    >
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">
                    {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-medium">
                    {recordName(entry)}
                  </TableCell>
                  <TableCell className="hidden max-w-44 truncate text-sm text-muted-foreground md:table-cell">
                    {entry.profile?.full_name ||
                      entry.profile?.email ||
                      "Sistema"}
                  </TableCell>
                  <TableCell className="hidden max-w-52 truncate text-xs text-muted-foreground lg:table-cell">
                    {entry.action === "UPDATE"
                      ? fields.join(", ") || "—"
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(entry)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected && (ACTION_LABELS[selected.action] ?? selected.action)}{" "}
              — {selected && recordName(selected)}
            </DialogTitle>
            <DialogDescription>
              {selected && formatDateTime(selected.changed_at)} ·{" "}
              {selected?.profile?.full_name ||
                selected?.profile?.email ||
                "Sistema"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {selected.action === "UPDATE" ? (
                <div className="space-y-2">
                  <p className="font-medium">Campos modificados</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo</TableHead>
                          <TableHead>Antes</TableHead>
                          <TableHead>Después</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {changedFields(selected).map((field) => (
                          <TableRow key={field}>
                            <TableCell className="font-medium">{field}</TableCell>
                            <TableCell className="max-w-48 break-words text-muted-foreground">
                              {JSON.stringify(selected.old_data?.[field]) ?? "—"}
                            </TableCell>
                            <TableCell className="max-w-48 break-words">
                              {JSON.stringify(selected.new_data?.[field]) ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(
                    selected.new_data ?? selected.old_data,
                    null,
                    2,
                  )}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
