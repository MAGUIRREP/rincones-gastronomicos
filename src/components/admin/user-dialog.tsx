"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createUserAction, updateUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserSchema } from "@/lib/validations/user";
import type { Profile } from "@/types/database";

/** En edición la contraseña es opcional (solo si se quiere cambiar). */
const editSchema = createUserSchema.extend({
  password: createUserSchema.shape.password.optional().or(z.literal("")),
});

type FormValues = z.infer<typeof editSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Usuario a editar; si no se pasa, el diálogo crea uno nuevo. */
  user?: Profile | null;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(user);

  const form = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createUserSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "usuario",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: user?.email ?? "",
        full_name: user?.full_name ?? "",
        password: "",
        role: user?.role ?? "usuario",
      });
    }
  }, [open, user, form]);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateUserAction({
            id: user!.id,
            full_name: values.full_name,
            role: values.role,
            password: values.password || undefined,
          })
        : await createUserAction({ ...values, password: values.password ?? "" });

      if (result.success) {
        toast.success(isEdit ? "Usuario actualizado" : "Usuario creado");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar ${user?.full_name || user?.email}` : "Crear usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica el nombre, el rol o la contraseña."
              : "El usuario podrá iniciar sesión inmediatamente con la contraseña indicada."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      disabled={isEdit}
                      placeholder="usuario@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre y apellidos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={isEdit ? "Dejar en blanco para no cambiar" : "••••••••"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Mínimo 8 caracteres con mayúscula, minúscula y número.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="usuario">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Guardando…
                  </>
                ) : isEdit ? (
                  "Guardar cambios"
                ) : (
                  "Crear usuario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
