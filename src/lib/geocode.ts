import "server-only";

/**
 * Geocodificación inversa con Nominatim (OpenStreetMap): a partir de unas
 * coordenadas obtiene dirección, municipio, provincia y país.
 *
 * Es gratuito y sin clave de API, igual que los mapas de la aplicación.
 * Su política de uso exige un User-Agent identificativo y como máximo
 * una petición por segundo; se usa solo cuando el usuario pega un enlace
 * o pulsa el botón de rellenar, así que el volumen es mínimo.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const USER_AGENT =
  "RinconesGastronomicos/1.0 (https://rincones-gastronomicos.vercel.app)";

/**
 * Códigos ISO 3166-2 de provincia española -> id en la tabla `provincias`
 * (códigos INE). Se prefiere el código ISO al nombre porque Nominatim
 * traduce los nombres (p. ej. "Guipúzcoa" en vez de "Gipuzkoa").
 */
const PROVINCIA_BY_ISO: Record<string, number> = {
  "ES-VI": 1, "ES-AB": 2, "ES-A": 3, "ES-AL": 4, "ES-AV": 5, "ES-BA": 6,
  "ES-PM": 7, "ES-B": 8, "ES-BU": 9, "ES-CC": 10, "ES-CA": 11, "ES-CS": 12,
  "ES-CR": 13, "ES-CO": 14, "ES-C": 15, "ES-CU": 16, "ES-GI": 17, "ES-GR": 18,
  "ES-GU": 19, "ES-SS": 20, "ES-H": 21, "ES-HU": 22, "ES-J": 23, "ES-LE": 24,
  "ES-L": 25, "ES-LO": 26, "ES-LU": 27, "ES-M": 28, "ES-MA": 29, "ES-MU": 30,
  "ES-NA": 31, "ES-OR": 32, "ES-O": 33, "ES-P": 34, "ES-GC": 35, "ES-PO": 36,
  "ES-SA": 37, "ES-TF": 38, "ES-S": 39, "ES-SG": 40, "ES-SE": 41, "ES-SO": 42,
  "ES-T": 43, "ES-TE": 44, "ES-TO": 45, "ES-V": 46, "ES-VA": 47, "ES-BI": 48,
  "ES-ZA": 49, "ES-Z": 50, "ES-CE": 51, "ES-ML": 52,
};

/**
 * Comunidades uniprovinciales: su código ISO de nivel 4 identifica también
 * la provincia. Necesario porque en ellas Nominatim no devuelve nivel 6
 * (por ejemplo Madrid o Asturias).
 */
const PROVINCIA_BY_COMUNIDAD_ISO: Record<string, number> = {
  "ES-MD": 28, // Comunidad de Madrid
  "ES-MC": 30, // Región de Murcia
  "ES-AS": 33, // Principado de Asturias
  "ES-CB": 39, // Cantabria
  "ES-RI": 26, // La Rioja
  "ES-NC": 31, // Navarra
  "ES-IB": 7,  // Illes Balears
  "ES-CE": 51, // Ceuta
  "ES-ML": 52, // Melilla
};

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  province?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  "ISO3166-2-lvl6"?: string;
  "ISO3166-2-lvl4"?: string;
}

export interface GeocodeResult {
  address: string | null;
  municipio: string | null;
  postalCode: string | null;
  provinciaId: number | null;
  provinciaName: string | null;
  country: string | null;
  isSpain: boolean;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Resuelve el id de provincia a partir de los datos de Nominatim. */
function resolveProvinciaId(address: NominatimAddress): number | null {
  const iso6 = address["ISO3166-2-lvl6"];
  if (iso6 && PROVINCIA_BY_ISO[iso6]) return PROVINCIA_BY_ISO[iso6];

  const iso4 = address["ISO3166-2-lvl4"];
  if (iso4 && PROVINCIA_BY_COMUNIDAD_ISO[iso4]) {
    return PROVINCIA_BY_COMUNIDAD_ISO[iso4];
  }

  // Último recurso: comparar el nombre de la provincia con los alias
  // conocidos que difieren entre castellano y lengua cooficial.
  const name = address.province ?? address.state;
  if (!name) return null;
  const normalized = normalize(name).replace(/^provincia de /, "");
  const NAME_ALIASES: Record<string, number> = {
    alava: 1, araba: 1, alicante: 3, alacant: 3, "illes balears": 7,
    baleares: 7, castellon: 12, castello: 12, "a coruna": 15, "la coruna": 15,
    guipuzcoa: 20, gipuzkoa: 20, girona: 17, gerona: 17, lleida: 25,
    lerida: 25, ourense: 32, orense: 32, vizcaya: 48, bizkaia: 48,
    valencia: 46, asturias: 33, "las palmas": 35,
    "santa cruz de tenerife": 38,
  };
  return NAME_ALIASES[normalized] ?? null;
}

/**
 * Geocodificación inversa. Devuelve null si el servicio no responde
 * o no reconoce las coordenadas.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${latitude}&lon=${longitude}` +
    `&zoom=18&addressdetails=1&accept-language=es`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      address?: NominatimAddress;
      error?: string;
    };
    if (!data.address || data.error) return null;

    const a = data.address;

    // Dirección: calle + número, como se escribe en España.
    const street = a.road ?? a.pedestrian ?? null;
    const address = street
      ? [street, a.house_number].filter(Boolean).join(", ")
      : null;

    const municipio =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.city_district ?? null;

    const isSpain = (a.country_code ?? "").toLowerCase() === "es";
    const provinciaId = isSpain ? resolveProvinciaId(a) : null;

    return {
      address,
      municipio,
      postalCode: a.postcode ?? null,
      provinciaId,
      provinciaName: a.province ?? a.state ?? null,
      country: a.country ?? null,
      isSpain,
    };
  } catch {
    return null;
  }
}
