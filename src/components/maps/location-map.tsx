"use client";

import { useEffect, useRef } from "react";

interface Loc {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(loc: Loc) {
  const accuracy = `Accuracy ±${Math.round(loc.accuracy)}m`;
  if (loc.address) {
    return `<p style="margin:0 0 4px;color:#0b1220;max-width:220px">${escapeHtml(loc.address)}</p><p style="margin:0;color:#64748b">${accuracy}</p>`;
  }
  return `<p style="margin:0;color:#0b1220">${accuracy}</p>`;
}

export function LocationMap({ locations }: { locations: Loc[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || locations.length === 0) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      if (mapboxToken) {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [locations[0].longitude, locations[0].latitude],
          zoom: 14,
        });

        locations.forEach((loc) => {
          new mapboxgl.Marker({ color: "#ea580c" })
            .setLngLat([loc.longitude, loc.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(popupHtml(loc)))
            .addTo(map);
        });

        cleanup = () => map.remove();
        return;
      }

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      // Fix default marker icons when bundling with Next/webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current).setView(
        [locations[0].latitude, locations[0].longitude],
        14,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      locations.forEach((loc) => {
        const marker = L.marker([loc.latitude, loc.longitude]).addTo(map);
        marker.bindPopup(popupHtml(loc));
        bounds.extend([loc.latitude, loc.longitude]);
        if (loc.accuracy > 0) {
          L.circle([loc.latitude, loc.longitude], {
            radius: loc.accuracy,
            color: "#ea580c",
            fillColor: "#ea580c",
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map);
        }
      });

      if (locations.length > 1) {
        map.fitBounds(bounds.pad(0.2));
      }

      // Leaflet needs a resize after container paints
      requestAnimationFrame(() => map.invalidateSize());

      cleanup = () => map.remove();
    }

    void init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-oals-border bg-oals-bg text-sm text-oals-dim">
        No consented location events yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-md border border-oals-border z-0"
    />
  );
}
