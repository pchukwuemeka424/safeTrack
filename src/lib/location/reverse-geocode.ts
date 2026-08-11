import { env } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export interface ReverseGeocodeResult {
  /** Human-readable place label for the exact GPS point */
  address: string | null;
  /** Building / house number when available (e.g. "42" or "106-108") */
  houseNumber: string | null;
  street: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  /** Optional nearby business (not used as primary address) */
  nearestLandmark?: string | null;
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

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Parse "12 High Street" / "Tithebarn House, 1, Tithebarn Street" style labels.
 */
function extractHouseNumberFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const leading = label.match(/^(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+[A-Za-z]/);
  if (leading?.[1]) return leading[1];
  const embedded = label.match(/,\s*(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s*,/);
  if (embedded?.[1]) return embedded[1];
  return null;
}

function formatStreetAddress(parts: {
  houseNumber?: string | null;
  street?: string | null;
  building?: string | null;
  suburb?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  fallback?: string | null;
}): string | null {
  const line1 = [parts.houseNumber, parts.street].filter(Boolean).join(" ");
  const composed = [
    line1 || parts.building || null,
    parts.suburb,
    parts.city,
    parts.postcode,
    parts.country,
  ].filter(Boolean) as string[];

  if (composed.length >= 2) return composed.join(", ");
  return parts.fallback?.trim() || composed[0] || null;
}

function formatNominatimAddress(
  displayName: string | undefined,
  addr: Record<string, string>,
): {
  address: string | null;
  houseNumber: string | null;
  street: string | null;
  postcode: string | null;
} {
  const house =
    addr.house_number?.trim() ||
    extractHouseNumberFromLabel(displayName) ||
    null;
  const road =
    addr.road?.trim() ||
    addr.pedestrian?.trim() ||
    addr.path?.trim() ||
    addr.residential?.trim() ||
    null;
  const suburb =
    addr.suburb?.trim() ||
    addr.neighbourhood?.trim() ||
    addr.quarter?.trim() ||
    addr.city_district?.trim() ||
    null;
  const city =
    addr.city?.trim() ||
    addr.town?.trim() ||
    addr.village?.trim() ||
    addr.municipality?.trim() ||
    null;
  const postcode = addr.postcode?.trim() || null;
  const country = addr.country?.trim() || null;
  const building = addr.building?.trim() || null;

  return {
    address: formatStreetAddress({
      houseNumber: house,
      street: road,
      building,
      suburb,
      city,
      postcode,
      country,
      fallback: displayName,
    }),
    houseNumber: house,
    street: road,
    postcode,
  };
}

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number,
  zoom: number,
): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", String(zoom));
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

  const formatted = formatNominatimAddress(data.display_name, addr);
  if (!formatted.address) return null;

  return {
    address: formatted.address,
    houseNumber: formatted.houseNumber,
    street: formatted.street,
    postcode: formatted.postcode,
    city: city?.trim() || null,
    country: addr.country?.trim() || null,
  };
}

/**
 * Nearest OSM feature with addr:housenumber within radius (meters).
 */
async function nearestHouseNumberOverpass(
  latitude: number,
  longitude: number,
  radiusMeters = 75,
): Promise<{ houseNumber: string; street: string | null; distance: number } | null> {
  const query = `[out:json][timeout:12];
(
  node["addr:housenumber"](around:${radiusMeters},${latitude},${longitude});
  way["addr:housenumber"](around:${radiusMeters},${latitude},${longitude});
);
out tags center 20;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      elements?: Array<{
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    let best: {
      houseNumber: string;
      street: string | null;
      distance: number;
    } | null = null;

    for (const el of data.elements || []) {
      const house = el.tags?.["addr:housenumber"]?.trim();
      if (!house) continue;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
      const distance = haversineMeters(latitude, longitude, lat, lon);
      if (!best || distance < best.distance) {
        best = {
          houseNumber: house,
          street: el.tags?.["addr:street"]?.trim() || null,
          distance,
        };
      }
    }

    return best;
  } catch {
    return null;
  }
}

/**
 * Pull street_number from the closest Google Places result that has one.
 */
async function houseNumberFromGooglePlaces(
  latitude: number,
  longitude: number,
): Promise<{ houseNumber: string; street: string | null; formatted: string | null } | null> {
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
            "places.formattedAddress,places.addressComponents,places.location",
        },
        body: JSON.stringify({
          maxResultCount: 8,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: 60,
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
        location?: { latitude?: number; longitude?: number };
        addressComponents?: Array<{
          longText?: string;
          shortText?: string;
          types?: string[];
        }>;
      }>;
    };

    type Candidate = {
      houseNumber: string;
      street: string | null;
      formatted: string | null;
      distance: number;
    };
    let best: Candidate | null = null;

    for (const place of data.places || []) {
      const comps = place.addressComponents || [];
      const house =
        comps.find((c) => c.types?.includes("street_number"))?.longText?.trim() ||
        null;
      if (!house) continue;
      const street =
        comps.find((c) => c.types?.includes("route"))?.longText?.trim() || null;
      const plat = place.location?.latitude;
      const plon = place.location?.longitude;
      const distance =
        plat != null && plon != null
          ? haversineMeters(latitude, longitude, plat, plon)
          : 9999;
      if (!best || distance < best.distance) {
        best = {
          houseNumber: house,
          street,
          formatted: place.formattedAddress?.trim() || null,
          distance,
        };
      }
    }

    return best
      ? {
          houseNumber: best.houseNumber,
          street: best.street,
          formatted: best.formatted,
        }
      : null;
  } catch {
    return null;
  }
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
  url.searchParams.set("types", "address,street,place");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      address?: string;
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
  const postcodeCtx = context.find((c) => c.id?.startsWith("postcode."));
  const houseNumber =
    (typeof feature.address === "string" && feature.address.trim()) ||
    extractHouseNumberFromLabel(feature.place_name) ||
    null;
  const street = feature.text?.trim() || null;

  return {
    address: feature.place_name?.trim() || null,
    houseNumber,
    street,
    postcode: postcodeCtx?.text?.trim() || null,
    city: cityCtx?.text?.trim() || pickCity(feature.properties || {}) || null,
    country: countryCtx?.text?.trim() || null,
  };
}

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

function mergeHouseNumber(
  base: ReverseGeocodeResult,
  houseNumber: string | null,
  street?: string | null,
): ReverseGeocodeResult {
  if (!houseNumber) return base;
  const resolvedStreet = street || base.street;
  const address = formatStreetAddress({
    houseNumber,
    street: resolvedStreet,
    city: base.city,
    postcode: base.postcode,
    country: base.country,
    fallback: base.address,
  });
  return {
    ...base,
    houseNumber,
    street: resolvedStreet,
    address: address || base.address,
  };
}

/**
 * Resolve GPS coordinates to a human-readable address for the exact point.
 * Prefers results that include a house / building number.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const empty: ReverseGeocodeResult = {
    address: null,
    houseNumber: null,
    street: null,
    postcode: null,
    city: null,
    country: null,
    nearestLandmark: null,
  };

  try {
    // Prefer building-level reverse first; fall back to street-level.
    let result =
      (await reverseGeocodeNominatim(latitude, longitude, 18)) ||
      (await reverseGeocodeNominatim(latitude, longitude, 17));

    if (!result) {
      const token = env.mapboxToken || env.publicMapboxToken;
      if (token) {
        result = await reverseGeocodeMapbox(latitude, longitude, token);
      }
    }

    if (!result) {
      logger.warn("Street reverse geocode unavailable");
      return empty;
    }

    if (!result.houseNumber) {
      const osmHouse = await nearestHouseNumberOverpass(latitude, longitude);
      if (osmHouse) {
        result = mergeHouseNumber(
          result,
          osmHouse.houseNumber,
          osmHouse.street || result.street,
        );
      }
    }

    if (!result.houseNumber) {
      const googleHouse = await houseNumberFromGooglePlaces(
        latitude,
        longitude,
      );
      if (googleHouse) {
        result = mergeHouseNumber(
          result,
          googleHouse.houseNumber,
          googleHouse.street || result.street,
        );
        // Prefer Google formatted address when it clearly includes the number
        if (
          googleHouse.formatted &&
          googleHouse.formatted.includes(googleHouse.houseNumber)
        ) {
          result = { ...result, address: googleHouse.formatted };
        }
      }
    }

    const landmark = await nearestLandmarkRapidApi(latitude, longitude);
    return { ...result, nearestLandmark: landmark };
  } catch (error) {
    logger.warn("Reverse geocode failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return empty;
}
