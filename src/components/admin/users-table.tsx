"use client";

import {
  Ban,
  CircleCheck,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteUserAction, updateUserAction } from "@/app/actions/users";
import { UserDialog } from "@/components/admin/user-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { Profile } from "@/types/database";

interface UsersTableProps {
  users: Profile[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);

  const toggleBlock = (user: Profile) => {
    startTransition(async () => {
      const result = await updateUserAction({
        id: user.id,
        is_blocked: !user.is_blocked,
      });
      if (result.success) {
        toast.success(
          user.is_blocked ? "Usuario desbloqueado" : "Usuario bloqueado",
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Error");
      }
    });
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    startTransition(async () => {
      const result = await deleteUserAction(deletingUser.id);
      if (result.success) {
        toast.success("Usuario eliminado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Error");
      }
      setDeletingUser(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Crear usuario
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Usuario</TableHead>
              <TableHead className="hidden sm:table-cell">Rol</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Creado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user.full_name || "Sin nombre"}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (tú)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Administrador" : "Usuario"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.is_blocked ? (
                    <Badge variant="destructive" className="gap-1">
                      <Ban className="size-3" aria-hidden="true" />
                      Bloqueado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 text-green-600 dark:text-green-400"
                    >
                      <CircleCheck className="size-3" aria-hidden="true" />
                      Activo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {formatDateTime(user.created_at)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones para ${user.email}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditingUser(user);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      {user.id !== currentUserId && (
                        <>
                          <DropdownMenuItem onSelect={() => toggleBlock(user)}>
                            {user.is_blocked ? (
                              <>
                                <CircleCheck className="size-4" />
                                Desbloquear
                              </>
                            ) : (
                              <>
                                <Ban className="size-4" />
                                Bloquear
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeletingUser(user)}
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
      />

      <AlertDialog
        open={deletingUser !== null}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar a {deletingUser?.full_name || deletingUser?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará su cuenta y no podrá volver a iniciar sesión. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
