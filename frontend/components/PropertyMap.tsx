"use client";

import Link from "next/link";
import { PropertyListing } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export function PropertyMap({ properties }: { properties: PropertyListing[] }) {
  if (properties.length === 0) return null;

  // Group by city for cluster view
  const cities = new Map<string, { lat: number; lng: number; properties: PropertyListing[] }>();
  for (const p of properties) {
    const key = `${p.city},${p.state}`;
    if (!cities.has(key)) {
      cities.set(key, { lat: p.lat, lng: p.lng, properties: [] });
    }
    cities.get(key)!.properties.push(p);
  }

  // Calculate bounds
  const lats = properties.map((p) => p.lat);
  const lngs = properties.map((p) => p.lng);
  const minLat = Math.min(...lats) - 0.5;
  const maxLat = Math.max(...lats) + 0.5;
  const minLng = Math.min(...lngs) - 0.5;
  const maxLng = Math.max(...lngs) + 0.5;
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return (
    <div className="mapContainer">
      <h3 style={{ margin: "0 0 12px" }}>Property Map</h3>
      <div className="mapCanvas">
        {Array.from(cities.entries()).map(([cityKey, cluster]) => {
          const x = ((cluster.lng - minLng) / lngRange) * 100;
          const y = ((maxLat - cluster.lat) / latRange) * 100;
          return (
            <div
              key={cityKey}
              className="mapCluster"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="mapPin">
                <span className="mapPinCount">{cluster.properties.length}</span>
              </div>
              <div className="mapClusterTooltip">
                <strong>{cityKey}</strong>
                <div className="mapClusterList">
                  {cluster.properties.slice(0, 5).map((p) => (
                    <Link key={p.id} href={`/property/${p.id}`} className="mapPropertyLink">
                      <span>{p.address}</span>
                      <span className="mapPropertyPrice">{fmt$(p.listPrice)}</span>
                    </Link>
                  ))}
                  {cluster.properties.length > 5 && (
                    <span className="hintText">+{cluster.properties.length - 5} more</span>
                  )}
                </div>
              </div>
              <span className="mapCityLabel">{cluster.properties[0].city}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
