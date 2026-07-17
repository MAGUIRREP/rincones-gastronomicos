import type { Metadata } from "next";

import { RestaurantForm } from "@/components/restaurants/restaurant-form";
import { getComunidades, getProvincias } from "@/services/restaurants";

export const metadata: Metadata = {
  title: "Añadir establecimiento",
  description: "Añade un nuevo bar o restaurante a la colección",
};

export default async function NuevoRestaurantePage() {
  const [provincias, comunidades] = await Promise.all([
    getProvincias(),
    getComunidades(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Añadir establecimiento
        </h1>
        <p className="text-muted-foreground">
          Rellena la ficha del nuevo descubrimiento. Podrás añadir fotos
          después de guardarlo.
        </p>
      </div>
      <RestaurantForm provincias={provincias} comunidades={comunidades} />
    </div>
  );
}
