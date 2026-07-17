import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.string().url("URL no válida").max(500), z.null()]))
  .nullable()
  .optional();

export const YOUTUBE_URL_REGEX =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{6,}/i;

export const restaurantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  type: z.enum(
    ["bar", "restaurante", "cafeteria", "chiringuito", "taberna", "otro"],
    { message: "Tipo no válido" },
  ),
  address: optionalTrimmed(250),
  postal_code: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z.union([
        z.string().regex(/^\d{5}$/, "El código postal son 5 dígitos"),
        z.null(),
      ]),
    )
    .nullable()
    .optional(),
  municipio: optionalTrimmed(120),
  provincia_id: z
    .number()
    .int()
    .min(1)
    .max(52)
    .nullable()
    .optional(),
  latitude: z
    .number()
    .min(-90, "Latitud fuera de rango")
    .max(90, "Latitud fuera de rango")
    .nullable()
    .optional(),
  longitude: z
    .number()
    .min(-180, "Longitud fuera de rango")
    .max(180, "Longitud fuera de rango")
    .nullable()
    .optional(),
  phone: optionalTrimmed(30),
  website: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  schedule: optionalTrimmed(300),
  avg_price: z
    .number()
    .min(0, "El precio no puede ser negativo")
    .max(999999, "Precio demasiado alto")
    .nullable()
    .optional(),
  rating: z
    .number()
    .int()
    .min(1, "Mínimo 1 estrella")
    .max(5, "Máximo 5 estrellas")
    .nullable()
    .optional(),
  personal_comment: optionalTrimmed(2000),
  observations: optionalTrimmed(2000),
  visit_date: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z.union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
        z.null(),
      ]),
    )
    .nullable()
    .optional(),
  would_return: z.boolean().nullable().optional(),
  is_favorite: z.boolean().default(false),
  favorite_dishes: z
    .array(
      z.object({
        name: z.string().trim().min(1, "El plato no puede estar vacío").max(100),
      }),
    )
    .max(30, "Máximo 30 platos")
    .default([]),
  videos: z
    .array(
      z.object({
        youtube_url: z
          .string()
          .trim()
          .regex(YOUTUBE_URL_REGEX, "Debe ser un enlace válido de YouTube"),
        title: z.string().trim().max(150).optional(),
      }),
    )
    .max(10, "Máximo 10 vídeos")
    .default([]),
});

export type RestaurantFormValues = z.input<typeof restaurantSchema>;
export type RestaurantParsed = z.output<typeof restaurantSchema>;

/** Filtros del listado, validados también en servidor. */
export const restaurantFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  type: z
    .enum(["bar", "restaurante", "cafeteria", "chiringuito", "taberna", "otro"])
    .optional(),
  provincia: z.coerce.number().int().min(1).max(52).optional(),
  comunidad: z.coerce.number().int().min(1).max(19).optional(),
  municipio: z.string().trim().max(120).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  favorites: z.coerce.boolean().optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  visitedFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  visitedTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type RestaurantFilters = z.infer<typeof restaurantFiltersSchema>;
