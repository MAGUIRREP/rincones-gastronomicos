"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Euro,
  Globe,
  Info,
  Loader2,
  MapPin,
  MessageSquareText,
  Plus,
  Star,
  Trash2,
  UtensilsCrossed,
  Video,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createRestaurantAction,
  updateRestaurantAction,
} from "@/app/actions/restaurants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ESTABLISHMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  restaurantSchema,
  type RestaurantFormValues,
} from "@/lib/validations/restaurant";
import type {
  Comunidad,
  Provincia,
  RestaurantWithRelations,
} from "@/types/database";

const LocationPicker = dynamic(
  () => import("@/components/map/location-picker"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-xl" />,
  },
);

interface RestaurantFormProps {
  provincias: (Provincia & { comunidad: Comunidad })[];
  comunidades: Comunidad[];
  /** Si se pasa, el formulario funciona en modo edición. */
  restaurant?: RestaurantWithRelations;
}

const NONE = "none";

function sectionIconClass() {
  return "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary";
}

export function RestaurantForm({
  provincias,
  comunidades,
  restaurant,
}: RestaurantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(restaurant);

  // Comunidad seleccionada (solo UI: la BD guarda la provincia).
  const initialComunidad = restaurant?.provincia?.comunidad_id;
  const [comunidadId, setComunidadId] = useState<number | null>(
    initialComunidad ?? null,
  );

  const filteredProvincias = useMemo(
    () =>
      comunidadId
        ? provincias.filter((p) => p.comunidad_id === comunidadId)
        : provincias,
    [provincias, comunidadId],
  );

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: restaurant?.name ?? "",
      type: restaurant?.type ?? "restaurante",
      address: restaurant?.address ?? "",
      postal_code: restaurant?.postal_code ?? "",
      municipio: restaurant?.municipio ?? "",
      provincia_id: restaurant?.provincia_id ?? null,
      latitude: restaurant?.latitude ?? null,
      longitude: restaurant?.longitude ?? null,
      phone: restaurant?.phone ?? "",
      website: restaurant?.website ?? "",
      instagram: restaurant?.instagram ?? "",
      facebook: restaurant?.facebook ?? "",
      tiktok: restaurant?.tiktok ?? "",
      schedule: restaurant?.schedule ?? "",
      avg_price: restaurant?.avg_price ?? null,
      rating: restaurant?.rating ?? null,
      personal_comment: restaurant?.personal_comment ?? "",
      observations: restaurant?.observations ?? "",
      visit_date: restaurant?.visit_date ?? "",
      would_return: restaurant?.would_return ?? null,
      is_favorite: restaurant?.is_favorite ?? false,
      favorite_dishes:
        restaurant?.favorite_dishes
          ?.slice()
          .sort((a, b) => a.position - b.position)
          .map((d) => ({ name: d.name })) ?? [],
      videos:
        restaurant?.videos?.map((v) => ({
          youtube_url: v.youtube_url,
          title: v.title ?? "",
        })) ?? [],
    },
  });

  const dishes = useFieldArray({ control: form.control, name: "favorite_dishes" });
  const videos = useFieldArray({ control: form.control, name: "videos" });
  const [newDish, setNewDish] = useState("");

  const addDish = () => {
    const name = newDish.trim();
    if (!name) return;
    dishes.append({ name });
    setNewDish("");
  };

  const onSubmit = (values: RestaurantFormValues) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateRestaurantAction(restaurant!.id, values)
        : await createRestaurantAction(values);

      if (result.success) {
        toast.success(
          isEdit ? "Establecimiento actualizado" : "Establecimiento creado",
        );
        router.push(`/restaurantes/${result.id}${isEdit ? "" : "/editar#fotos"}`);
        router.refresh();
        if (!isEdit) {
          toast.info("Ahora puedes añadir fotografías");
        }
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    });
  };

  const latitude = form.watch("latitude");
  const longitude = form.watch("longitude");
  const rating = form.watch("rating");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* ============ Información general ============ */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className={sectionIconClass()} aria-hidden="true">
              <Info className="size-5" />
            </div>
            <div>
              <CardTitle>Información general</CardTitle>
              <CardDescription>Nombre, tipo y contacto</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Nombre <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Casa Botín" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ESTABLISHMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+34 900 000 000"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Horario</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: L-D 13:00-16:00 y 20:00-23:30"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ============ Ubicación ============ */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className={sectionIconClass()} aria-hidden="true">
              <MapPin className="size-5" />
            </div>
            <div>
              <CardTitle>Ubicación</CardTitle>
              <CardDescription>
                Dirección y coordenadas (haz clic en el mapa para fijarlas)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Dirección completa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Calle, número…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="28005"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="municipio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipio</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Madrid"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Comunidad: filtro de provincias (la provincia determina la comunidad) */}
              <FormItem>
                <FormLabel>Comunidad Autónoma</FormLabel>
                <Select
                  value={comunidadId ? String(comunidadId) : NONE}
                  onValueChange={(v) => {
                    const id = v === NONE ? null : Number(v);
                    setComunidadId(id);
                    const current = form.getValues("provincia_id");
                    if (
                      id &&
                      current &&
                      !provincias.some(
                        (p) => p.id === current && p.comunidad_id === id,
                      )
                    ) {
                      form.setValue("provincia_id", null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full" aria-label="Comunidad Autónoma">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin especificar</SelectItem>
                    {comunidades.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
              <FormField
                control={form.control}
                name="provincia_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : NONE}
                      onValueChange={(v) => {
                        const id = v === NONE ? null : Number(v);
                        field.onChange(id);
                        if (id) {
                          const prov = provincias.find((p) => p.id === id);
                          if (prov) setComunidadId(prov.comunidad_id);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin especificar</SelectItem>
                        {filteredProvincias.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitud</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="40.414100"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitud</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-3.708600"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="h-72 overflow-hidden rounded-xl border">
              <LocationPicker
                latitude={typeof latitude === "number" ? latitude : null}
                longitude={typeof longitude === "number" ? longitude : null}
                onChange={(lat, lng) => {
                  form.setValue("latitude", lat, { shouldValidate: true });
                  form.setValue("longitude", lng, { shouldValidate: true });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* ============ Multimedia ============ */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className={sectionIconClass()} aria-hidden="true">
              <Video className="size-5" />
            </div>
            <div>
              <CardTitle>Multimedia y redes</CardTitle>
              <CardDescription>
                Web, redes sociales y vídeos de YouTube
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Globe className="size-3.5" aria-hidden="true" />
                      Página web
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://instagram.com/…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://facebook.com/…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://tiktok.com/@…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vídeos de YouTube */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Vídeos de YouTube</p>
              {videos.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`videos.${index}.youtube_url`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="https://youtube.com/watch?v=…"
                            aria-label={`URL del vídeo ${index + 1}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`videos.${index}.title`}
                    render={({ field }) => (
                      <FormItem className="hidden flex-1 sm:block">
                        <FormControl>
                          <Input
                            placeholder="Título (opcional)"
                            aria-label={`Título del vídeo ${index + 1}`}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => videos.remove(index)}
                    aria-label={`Eliminar vídeo ${index + 1}`}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videos.append({ youtube_url: "", title: "" })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Añadir vídeo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ============ Valoración y platos ============ */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className={sectionIconClass()} aria-hidden="true">
              <Star className="size-5" />
            </div>
            <div>
              <CardTitle>Valoración</CardTitle>
              <CardDescription>
                Estrellas, precio, platos favoritos y visita
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Estrellas */}
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valoración (1 a 5 estrellas)</FormLabel>
                    <FormControl>
                      <div
                        className="flex items-center gap-1"
                        role="radiogroup"
                        aria-label="Valoración en estrellas"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={rating === n}
                            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                            onClick={() =>
                              field.onChange(rating === n ? null : n)
                            }
                            className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <Star
                              className={cn(
                                "size-7 transition-colors",
                                rating != null && n <= Number(rating)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/40",
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avg_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Euro className="size-3.5" aria-hidden="true" />
                      Precio medio por persona
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        placeholder="25"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visit_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de visita</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col justify-end gap-3">
                <FormField
                  control={form.control}
                  name="would_return"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true ? true : false)
                          }
                          aria-label="¿Repetirías?"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">¿Repetirías?</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_favorite"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Marcar como favorito"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Favorito ❤️</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Platos favoritos */}
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <UtensilsCrossed className="size-4" aria-hidden="true" />
                Platos favoritos
              </p>
              <div className="flex flex-wrap gap-2">
                {dishes.fields.map((field, index) => (
                  <span
                    key={field.id}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                  >
                    {form.getValues(`favorite_dishes.${index}.name`)}
                    <button
                      type="button"
                      onClick={() => dishes.remove(index)}
                      aria-label={`Eliminar plato ${form.getValues(
                        `favorite_dishes.${index}.name`,
                      )}`}
                      className="ml-1 rounded-full text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDish}
                  onChange={(e) => setNewDish(e.target.value)}
                  placeholder="Ej: cachopo, tortilla, croquetas…"
                  aria-label="Nombre del plato a añadir"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDish();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addDish}>
                  <Plus className="size-4" aria-hidden="true" />
                  Añadir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ Observaciones ============ */}
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className={sectionIconClass()} aria-hidden="true">
              <MessageSquareText className="size-5" />
            </div>
            <div>
              <CardTitle>Comentarios</CardTitle>
              <CardDescription>Tu opinión personal y observaciones</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="personal_comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentario personal</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="¿Qué os pareció? ¿Qué pedisteis?…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Reservas, aparcamiento, terraza…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="min-w-36">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Guardando…
              </>
            ) : isEdit ? (
              "Guardar cambios"
            ) : (
              "Crear establecimiento"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
