import { z } from "zod";

export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Email no válido")
    .max(200),
  full_name: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Máximo 72 caracteres")
    .regex(/[a-z]/, "Debe incluir una minúscula")
    .regex(/[A-Z]/, "Debe incluir una mayúscula")
    .regex(/[0-9]/, "Debe incluir un número"),
  role: z.enum(["admin", "usuario"]),
});

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(150).optional(),
  role: z.enum(["admin", "usuario"]).optional(),
  is_blocked: z.boolean().optional(),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserValues = z.infer<typeof updateUserSchema>;
