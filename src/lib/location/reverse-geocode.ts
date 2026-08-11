import { env } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export interface ReverseGeocodeResult {
  /** Human-readable place label for the exact GPS point */
  address: string | null;
  city: string | null;
  country: string | null;
  /** Optional nearby business (not used as primary address) */
  nearestLandmark?: string | null;
}

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function componentByType(
  components: AddressComponent[],
  type: string,
): string | null {
  const match = components.find((c) => c.types?.includes(type));
  return match?.longText?.trim() || match?.shortText?.trim() || null;
}

function pickCity(props: Record<string, unknown>): string | null {
  const candidates = [
    props.place,
    props.locality,
    props.district,
    props.city,
    props.town,
    props.village,
    props.municipality,
    props.county,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function formatNominatimAddress(
  displayName: string | undefined,
  addr: Record<string, string>,
): string | null {
  const house = addr.house_number?.trim();
  const road = addr.road?.trim() || addr.pedestrian?.trim() || addr.path?.trim();
  const suburb =
    addr.suburb?.trim() ||
    addr.neighbourhood?.trim() ||
    addr.quarter?.trim() ||
    addr.city_district?.trim();
  const city =
    addr.city?.trim() ||
    addr.town?.trim() ||
    addr.village?.trim() ||
    addr.municipality?.trim();
  const postcode = addr.postcode?.trim();
  const country = addr.country?.trim();

  const street = [house, road].filter(Boolean).join(" ");
  const parts = [street || null, suburb, city, postcode, country].filter(
    Boolean,
  ) as string[];

  if (parts.length >= 2) return parts.join(", ");
  return displayName?.trim() || null;
}

/**
 * True reverse geocode of the GPS point (street / road), not nearest shop.
 */
async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  // Building / house-level when available
  url.searchParams.set("zoom", "18");
  url.searchParams.set("namedetails", "0");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "OALS-LocationSafeguarding/1.0 (investigation; contact@mylos.cyou)",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  const addr = data.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    null;

  const address = formatNominatimAddress(data.display_name, addr);
  if (!address) return null;

  return {
    address,
    city: city?.trim() || null,
    country: addr.country?.trim() || null,
  };
}

async function reverseGeocodeMapbox(
  latitude: number,
  longitude: number,
  token: string,
): Promise<ReverseGeocodeResult | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  // Prefer street addresses over POIs
  url.searchParams.set("types", "address,street,place");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      context?: Array<{ id?: string; text?: string }>;
      properties?: Record<string, unknown>;
    }>;
  };

  const feature = data.features?.[0];
  if (!feature) return null;

  const context = feature.context || [];
  const cityCtx =
    context.find((c) => c.id?.startsWith("place.")) ||
    context.find((c) => c.id?.startsWith("locality.")) ||
    context.find((c) => c.id?.startsWith("district."));
  const countryCtx = context.find((c) => c.id?.startsWith("country."));

  return {
    address: feature.place_name?.trim() || feature.text?.trim() || null,
    city: cityCtx?.text?.trim() || pickCity(feature.properties || {}) || null,
    country: countryCtx?.text?.trim() || null,
  };
}

/**
 * Nearby business/POI only — used as optional context, never as primary address.
 */
async function nearestLandmarkRapidApi(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!env.rapidApiKey) return null;

  try {
    const res = await fetch(
      `https://${env.rapidApiGooglePlacesHost}/v1/places:searchNearby`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": env.rapidApiKey,
          "x-rapidapi-host": env.rapidApiGooglePlacesHost,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          maxResultCount: 1,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: 40,
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      places?: Array<{
        formattedAddress?: string;
        displayName?: { text?: string };
      }>;
    };
    const place = data.places?.[0];
    if (!place) return null;
    const name = place.displayName?.text?.trim();
    const addr = place.formattedAddress?.trim();
    if (name && addr) return `${name} (${addr})`;
    return name || addr || null;
  } catch {
    return null;
  }
}

/**
 * Resolve GPS coordinates to a human-readable address for the exact point.
 * Order: Nominatim reverse → Mapbox reverse → (optional landmark only).
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    address: null,
    city: null,
    country: null,
    nearestLandmark: null,
  };

  try {
    const nominatim = await reverseGeocodeNominatim(latitude, longitude);
    if (nominatim?.address) {
      const landmark = await nearestLandmarkRapidApi(latitude, longitude);
      return { ...nominatim, nearestLandmark: landmark };
    }

    const token = env.mapboxToken || env.publicMapboxToken;
    if (token) {
      const mapped = await reverseGeocodeMapbox(latitude, longitude, token);
      if (mapped?.address) {
        const landmark = await nearestLandmarkRapidApi(latitude, longitude);
        return { ...mapped, nearestLandmark: landmark };
      }
    }

    // Last resort only: do not prefer POI shops as the main address.
    logger.warn("Street reverse geocode unavailable; coords kept without POI address");
  } catch (error) {
    logger.warn("Reverse geocode failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return empty;
}

// Keep unused helper referenced for type compatibility in older call sites
void componentByType;
