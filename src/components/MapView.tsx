"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { inr } from "@/lib/ui";

export interface DistrictRisk {
  district: string;
  risk: number;
  cases: number;
  amountAtRisk: number;
}

// Stable geo anchors (Maharashtra) mirrored from the data generator so markers
// land on real coordinates without threading lat/lng through the engine.
const ANCHORS: Record<string, [number, number]> = {
  Solapur: [17.6599, 75.9064],
  Pune: [18.5204, 73.8567],
  Nashik: [19.9975, 73.7898],
  Nagpur: [21.1458, 79.0882],
  Aurangabad: [19.8762, 75.3433],
  Kolhapur: [16.705, 74.2433],
  Latur: [18.4088, 76.5604],
  Amravati: [20.9374, 77.7796],
};

function riskColor(r: number): string {
  if (r >= 60) return "#ffb4ab"; // crit
  if (r >= 35) return "#ffc98a"; // high
  if (r >= 18) return "#ffe08a"; // med
  return "#86e5cf"; // low
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points as [number, number][], { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function MapView({ districts }: { districts: DistrictRisk[] }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const read = () => setLight(document.documentElement.dataset.theme === "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const pts = districts
    .map((d) => ANCHORS[d.district])
    .filter(Boolean) as [number, number][];

  const tiles = light
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      center={[19.4, 75.8]}
      zoom={6}
      scrollWheelZoom={false}
      className="h-[340px] w-full"
      style={{ background: "var(--bg)" }}
      attributionControl={false}
    >
      <TileLayer
        key={light ? "light" : "dark"}
        url={tiles}
        maxZoom={18}
        // eslint-disable-next-line jsx-a11y/anchor-has-content
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      <FitBounds points={pts} />
      {districts.map((d) => {
        const pos = ANCHORS[d.district];
        if (!pos) return null;
        const color = riskColor(d.risk);
        const radius = 7 + (d.risk / 100) * 16;
        return (
          <CircleMarker
            key={d.district}
            center={pos}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.28, weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div className="mono text-[11px] leading-relaxed">
                <div className="font-semibold" style={{ color }}>{d.district.toUpperCase()}</div>
                <div>risk index: <b style={{ color }}>{d.risk}%</b></div>
                <div>flagged cases: {d.cases}</div>
                <div>at risk: {inr(d.amountAtRisk)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
