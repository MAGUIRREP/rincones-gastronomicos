"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserValues,
  type UpdateUserValues,
} from "@/lib/validations/user";

interface UserActionResult {
  success: boolean;
  error?: string;
}

/**
 * Comprueba en servidor que quien llama es un administrador activo.
 * Todas las acciones de gestión de usuarios pasan por aquí.
 */
async function requireAdmin(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_blocked) {
    return { ok: false, error: "Solo los administradores pueden hacer esto" };
  }
  return { ok: true, adminId: user.id };
}

/** Crea un usuario (solo admin). Usa la API de administración de Auth. */
export async function createUserAction(
  values: CreateUserValues,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      role: parsed.data.role,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message.includes("already")
        ? "Ya existe un usuario con ese email"
        : error.message,
    };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

/** Actualiza nombre, rol, bloqueo o contraseña de un usuario (solo admin). */
export async function updateUserAction(
  values: UpdateUserValues,
): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const parsed = updateUserSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  const { id, password, ...profileChanges } = parsed.data;

  // Evitar que un admin se quite a sí mismo el rol o se bloquee.
  if (
    id === guard.adminId &&
    (profileChanges.role === "usuario" || profileChanges.is_blocked === true)
  ) {
    return {
      success: false,
      error: "No puedes quitarte el rol de administrador ni bloquearte a ti mismo",
    };
  }

  const admin = createAdminClient();

  if (password) {
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return { success: false, error: error.message };
  }

  const updates: Record<string, unknown> = {};
  if (profileChanges.full_name !== undefined)
    updates.full_name = profileChanges.full_name;
  if (profileChanges.role !== undefined) updates.role = profileChanges.role;
  if (profileChanges.is_blocked !== undefined)
    updates.is_blocked = profileChanges.is_blocked;

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("profiles").update(updates).eq("id", id);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

/** Elimina un usuario por completo (Auth + perfil, solo admin). */
export async function deleteUserAction(id: string): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  if (id === guard.adminId) {
    return { success: false, error: "No puedes eliminar tu propia cuenta" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/usuarios");
  return { success: true };
}
