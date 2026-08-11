import { env } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export interface ReverseGeocodeResult {
  /** Human-readable place label */
  address: string | null;
  city: string | null;
  country: string | null;
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

/**
 * Resolve GPS → address via RapidAPI Google Places Nearby Search.
 * Autocomplete is for typed queries; nearby search is what maps coords to a place.
 */
async function reverseGeocodeRapidApiPlaces(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  if (!env.rapidApiKey) return null;

  const tryNearby = async (radiusMeters: number) => {
    const res = await fetch(
      `https://${env.rapidApiGooglePlacesHost}/v1/places:searchNearby`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": env.rapidApiKey,
          "x-rapidapi-host": env.rapidApiGooglePlacesHost,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.shortFormattedAddress,places.addressComponents,places.location,places.types",
        },
        body: JSON.stringify({
          maxResultCount: 1,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: radiusMeters,
            },
          },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) {
      logger.warn("RapidAPI Places nearby search failed", {
        status: res.status,
        radiusMeters,
      });
      return null;
    }

    const data = (await res.json()) as {
      places?: Array<{
        formattedAddress?: string;
        shortFormattedAddress?: string;
        displayName?: { text?: string };
        addressComponents?: AddressComponent[];
      }>;
    };

    const place = data.places?.[0];
    if (!place) return null;

    const components = place.addressComponents || [];
    const city =
      componentByType(components, "locality") ||
      componentByType(components, "postal_town") ||
      componentByType(components, "administrative_area_level_2");
    const country = componentByType(components, "country");

    const address =
      place.formattedAddress?.trim() ||
      place.shortFormattedAddress?.trim() ||
      place.displayName?.text?.trim() ||
      null;

    if (!address) return null;
    return { address, city, country } satisfies ReverseGeocodeResult;
  };

  return (await tryNearby(75)) || (await tryNearby(250));
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
  url.searchParams.set("types", "address,place,locality,neighborhood,poi");

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

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "OALS-LocationSafeguarding/1.0 (investigation; contact@oals.online)",
    },
    signal: AbortSignal.timeout(8000),
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

  return {
    address: data.display_name?.trim() || null,
    city: city?.trim() || null,
    country: addr.country?.trim() || null,
  };
}

/**
 * Resolve GPS coordinates to a human-readable address.
 * Order: RapidAPI Google Places → Mapbox → Nominatim.
 * Failures are non-fatal — coordinates are still the primary evidence.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    address: null,
    city: null,
    country: null,
  };

  try {
    const rapid = await reverseGeocodeRapidApiPlaces(latitude, longitude);
    if (rapid?.address) return rapid;

    const token = env.mapboxToken || env.publicMapboxToken;
    if (token) {
      const mapped = await reverseGeocodeMapbox(latitude, longitude, token);
      if (mapped?.address) return mapped;
    }

    const nominatim = await reverseGeocodeNominatim(latitude, longitude);
    if (nominatim) return nominatim;
  } catch (error) {
    logger.warn("Reverse geocode failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return empty;
}
