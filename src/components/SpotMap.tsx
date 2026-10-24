"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapSpot = {
  id: string;
  make: string;
  model: string;
  lat: number;
  lng: number;
};

export function SpotMap({ spots }: { spots: MapSpot[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const center: [number, number] =
      spots.length > 0 ? [spots[0].lng, spots[0].lat] : [77.209, 28.6139];

    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom: spots.length ? 11 : 3,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    for (const spot of spots) {
      const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
        `<strong>${spot.make} ${spot.model}</strong>`,
      );
      new maplibregl.Marker({ color: "#f0a35e" })
        .setLngLat([spot.lng, spot.lat])
        .setPopup(popup)
        .addTo(map);
    }

    return () => {
      map.remove();
    };
  }, [spots]);

  return <div className="map-wrap" ref={ref} />;
}
