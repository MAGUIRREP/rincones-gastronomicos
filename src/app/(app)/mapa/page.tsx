import type { Metadata } from "next";

import { HomeMap } from "@/components/map/home-map";
import { getRestaurantsForMap } from "@/services/restaurants";

export const metadata: Metadata = {
  title: "Mapa",
  description: "Todos los establecimientos en el mapa de España",
};

export default async function MapaPage(props: PageProps<"/mapa">) {
  const searchParams = await props.searchParams;
  const focusId =
    typeof searchParams.focus === "string" ? searchParams.focus : undefined;

  const restaurants = await getRestaurantsForMap();

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mapa</h1>
        <p className="text-sm text-muted-foreground">
          {restaurants.length} establecimientos geolocalizados. Pulsa un
          marcador para ver su ficha.
        </p>
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border shadow-sm">
        <HomeMap restaurants={restaurants} focusId={focusId} />
      </div>
    </div>
  );
}
