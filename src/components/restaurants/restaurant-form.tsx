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

import { reverseGeocodeAction } from "@/app/actions/geocode";
import {
  createRestaurantAction,
  resolveGoogleMapsUrlAction,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  extractCoordsFromGoogleMapsUrl,
  isShortGoogleMapsUrl,
} from "@/lib/maps";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COUNTRY,
  isSpain,
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

/** Sugerencias de país para el datalist (se puede escribir cualquiera). */
const SUGGESTED_COUNTRIES = [
  "Portugal",
  "Francia",
  "Italia",
  "Andorra",
  "Alemania",
  "Reino Unido",
  "Países Bajos",
  "Bélgica",
  "Marruecos",
  "Grecia",
];

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

  // Nota: postal_code, facebook, tiktok, visit_date y would_return ya no
  // tienen campo visible en el formulario (alta simplificada), pero se
  // mantienen aquí para que al editar conserven el valor que ya tuvieran
  // en la base de datos en lugar de borrarse.
  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: restaurant?.name ?? "",
      type: restaurant?.type ?? "restaurante",
      address: restaurant?.address ?? "",
      postal_code: restaurant?.postal_code ?? "",
      municipio: restaurant?.municipio ?? "",
      provincia_id: restaurant?.provincia_id ?? null,
      country: restaurant?.country ?? DEFAULT_COUNTRY,
      latitude: restaurant?.latitude ?? null,
      longitude: restaurant?.longitude ?? null,
      phone: restaurant?.phone ?? "",
      google_maps_url: restaurant?.google_maps_url ?? "",
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

  /**
   * España vs. extranjero. Es estado propio (no derivado del país) para que
   * el usuario pueda borrar y reescribir el país sin que el bloque cambie.
   */
  const [inSpain, setInSpain] = useState(isSpain(restaurant?.country));

  const handleLocationScopeChange = (value: string) => {
    const spain = value === "es";
    setInSpain(spain);
    if (spain) {
      form.setValue("country", DEFAULT_COUNTRY, { shouldValidate: true });
    } else {
      // Fuera de España los datos administrativos españoles no aplican.
      form.setValue("provincia_id", null);
      form.setValue("municipio", "");
      form.setValue("postal_code", "");
      setComunidadId(null);
      // Vacío para que el usuario escriba el país (el esquema lo exige).
      form.setValue("country", "");
    }
  };

  const dishes = useFieldArray({ control: form.control, name: "favorite_dishes" });
  const videos = useFieldArray({ control: form.control, name: "videos" });
  const [newDish, setNewDish] = useState("");

  const addDish = () => {
    const name = newDish.trim();
    if (!name) return;
    dishes.append({ name });
    setNewDish("");
  };

  /**
   * Al pegar un enlace de Google Maps se extraen las coordenadas
   * automáticamente (los enlaces cortos se expanden en el servidor).
   */
  const [resolvingMaps, setResolvingMaps] = useState(false);
  const handleGoogleMapsUrl = async (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return;

    let target = url;
    if (isShortGoogleMapsUrl(url)) {
      setResolvingMaps(true);
      const result = await resolveGoogleMapsUrlAction(url);
      setResolvingMaps(false);
      if (result.success && result.resolvedUrl) {
        target = result.resolvedUrl;
      }
    }

    const coords = extractCoordsFromGoogleMapsUrl(target);
    if (coords) {
      form.setValue("latitude", coords.latitude, { shouldValidate: true });
      form.setValue("longitude", coords.longitude, { shouldValidate: true });
      toast.success("Coordenadas extraídas del enlace de Google Maps");
      // Con las coordenadas ya se puede completar dirección y ubicación.
      await fillAddressFromCoords(coords.latitude, coords.longitude, {
        silentWhenNothingToFill: true,
      });
    } else {
      toast.info(
        "Enlace guardado. No se pudieron extraer coordenadas; puedes fijarlas en el mapa.",
      );
    }
  };

  /**
   * Completa dirección, municipio, provincia (o país si está fuera de
   * España) a partir de unas coordenadas, mediante geocodificación
   * inversa. Solo rellena los campos que estén vacíos, para no pisar
   * nada que el usuario haya escrito a mano.
   */
  const [geocoding, setGeocoding] = useState(false);
  const fillAddressFromCoords = async (
    latitude: number,
    longitude: number,
    { silentWhenNothingToFill = false } = {},
  ) => {
    setGeocoding(true);
    const result = await reverseGeocodeAction(latitude, longitude);
    setGeocoding(false);

    if (!result.success || !result.data) {
      if (!silentWhenNothingToFill) {
        toast.error(result.error ?? "No se pudo obtener la dirección");
      }
      return;
    }

    const data = result.data;
    const filled: string[] = [];
    const isEmpty = (value: unknown) =>
      value === null || value === undefined || value === "";

    if (data.address && isEmpty(form.getValues("address"))) {
      form.setValue("address", data.address, { shouldValidate: true });
      filled.push("dirección");
    }
    if (data.postalCode && isEmpty(form.getValues("postal_code"))) {
      // El campo está oculto, pero se guarda igualmente.
      form.setValue("postal_code", data.postalCode);
    }

    if (data.isSpain) {
      setInSpain(true);
      form.setValue("country", DEFAULT_COUNTRY);
      if (data.municipio && isEmpty(form.getValues("municipio"))) {
        form.setValue("municipio", data.municipio, { shouldValidate: true });
        filled.push("municipio");
      }
      if (data.provinciaId && isEmpty(form.getValues("provincia_id"))) {
        form.setValue("provincia_id", data.provinciaId, {
          shouldValidate: true,
        });
        const prov = provincias.find((p) => p.id === data.provinciaId);
        if (prov) setComunidadId(prov.comunidad_id);
        filled.push("provincia y comunidad");
      }
    } else if (data.country) {
      // Establecimiento en el extranjero: se cambia el modo y el país.
      setInSpain(false);
      form.setValue("country", data.country, { shouldValidate: true });
      form.setValue("provincia_id", null);
      setComunidadId(null);
      if (data.municipio && isEmpty(form.getValues("municipio"))) {
        form.setValue("municipio", data.municipio);
      }
      filled.push(`país (${data.country})`);
    }

    if (filled.length > 0) {
      toast.success(`Se ha rellenado: ${filled.join(", ")}`);
    } else if (!silentWhenNothingToFill) {
      toast.info("No había nada que rellenar: los campos ya tenían valor.");
    }
  };

  const onSubmit = (rawValues: RestaurantFormValues) => {
    // Coherencia: en España se fuerza el país; fuera, no hay provincia.
    const values: RestaurantFormValues = inSpain
      ? { ...rawValues, country: DEFAULT_COUNTRY }
      : { ...rawValues, provincia_id: null, municipio: null };

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
            {/* ¿España o extranjero? Determina qué campos se piden. */}
            <FormItem className="space-y-2">
              <FormLabel>¿Dónde está?</FormLabel>
              <FormControl>
                <RadioGroup
                  value={inSpain ? "es" : "other"}
                  onValueChange={handleLocationScopeChange}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="es" id="scope-es" />
                    <FormLabel htmlFor="scope-es" className="font-normal">
                      En España
                    </FormLabel>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="other" id="scope-other" />
                    <FormLabel htmlFor="scope-other" className="font-normal">
                      Fuera de España
                    </FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                En España se piden municipio y provincia; fuera de España, solo
                la dirección y el país.
              </p>
            </FormItem>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* El enlace va primero: al pegarlo se rellena el resto. */}
              <FormField
                control={form.control}
                name="google_maps_url"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Enlace de Google Maps</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="Pega aquí el enlace copiado de Google Maps (botón Compartir)"
                        {...field}
                        value={field.value ?? ""}
                        onBlur={(e) => {
                          field.onBlur();
                          void handleGoogleMapsUrl(e.target.value);
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          // Dejar que el input se actualice y procesar después.
                          setTimeout(() => void handleGoogleMapsUrl(pasted), 0);
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {resolvingMaps
                        ? "Resolviendo enlace…"
                        : geocoding
                          ? "Buscando dirección…"
                          : "En Google Maps: busca el local → Compartir → Copiar enlace. Se rellenan solos las coordenadas, la dirección, el municipio y la provincia."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              {/* Código Postal: oculto para simplificar el alta.
                  Sigue en la base de datos y conserva su valor al editar. */}
              {inSpain ? (
                <>
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
                      <SelectTrigger
                        className="w-full"
                        aria-label="Comunidad Autónoma"
                      >
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
                </>
              ) : (
                /* Fuera de España: basta con la dirección y el país. */
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>
                        País <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          list="paises-sugeridos"
                          placeholder="Ej: Portugal"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <datalist id="paises-sugeridos">
                        {SUGGESTED_COUNTRIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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

            {/* Completar la ubicación a partir de las coordenadas actuales */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                geocoding ||
                typeof latitude !== "number" ||
                typeof longitude !== "number"
              }
              onClick={() =>
                void fillAddressFromCoords(latitude as number, longitude as number)
              }
            >
              {geocoding ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Buscando dirección…
                </>
              ) : (
                <>
                  <MapPin className="size-4" aria-hidden="true" />
                  Rellenar dirección desde las coordenadas
                </>
              )}
            </Button>

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
                Web, Instagram y vídeos de YouTube
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
              {/* Facebook y TikTok: ocultos para simplificar el alta.
                  Siguen en la base de datos y conservan su valor al editar. */}
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
                Estrellas, precio y platos favoritos
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
              {/* Fecha de visita y ¿Repetirías?: ocultos para simplificar el
                  alta. Siguen en la base de datos y conservan su valor. */}
              <div className="flex flex-col justify-end gap-3">
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
