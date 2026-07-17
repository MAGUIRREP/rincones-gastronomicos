import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Email no válido")
    .max(200),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .max(200),
  turnstileToken: z.string().min(1, "Completa la verificación de seguridad"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
