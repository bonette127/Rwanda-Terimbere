import React, { useState, useMemo } from "react";
import { Farm, FarmActivity, Language } from "../types";
import {
  projectRwandaLatLngToSvg,
  RWANDA_DISTRICT_COORDS,
} from "./GpsCoordinatePicker";
import {
  MapPin,
  Compass,
  Layers,
  CheckCircle2,
  Clock,
  Sprout,
  Maximize2,
  Minimize2,
  Plus,
} from "lucide-react";

interface FarmActivityGpsMapProps {
  language: Language;
  farms: Farm[];
  activities: FarmActivity[];
  selectedFarmId?: string;
  onSelectFarm?: (farmId: string) => void;
  onOpenAddFarm?: () => void;
  onOpenAddActivity?: () => void;
  onUpdateActivityStatus?: (
    id: string,
    status: "pending" | "in_progress" | "completed"
  ) => void;
}

// Resolve coordinates for any farm (stored GPS or district fallback)
export function resolveFarmCoords(farm: Farm): {
  lat: number;
  lng: number;
  accuracy: number;
  isExplicitGps: boolean;
} {
  if (typeof farm.latitude === "number" && typeof farm.longitude === "number") {
    return {
      lat: farm.latitude,
      lng: farm.longitude,
      accuracy: farm.gpsAccuracyMeters || 4.2,
      isExplicitGps: true,
    };
  }
  const distRef =
    RWANDA_DISTRICT_COORDS[farm.district] || RWANDA_DISTRICT_COORDS["Musanze"];
  return {
    lat: distRef.lat,
    lng: distRef.lng,
    accuracy: 12.0,
    isExplicitGps: false,
  };
}

// Resolve coordinates for any activity (stored GPS or deterministic sub-parcel offset from its farm)
export function resolveActivityCoords(
  activity: FarmActivity,
  farms: Farm[]
): {
  lat: number;
  lng: number;
  accuracy: number;
  isExplicitGps: boolean;
} {
  if (
    typeof activity.latitude === "number" &&
    typeof activity.longitude === "number"
  ) {
    return {
      lat: activity.latitude,
      lng: activity.longitude,
      accuracy: activity.gpsAccuracyMeters || 3.8,
      isExplicitGps: true,
    };
  }

  const parentFarm =
    farms.find((f) => f.id === activity.farmId) || farms[0];
  const base = parentFarm
    ? resolveFarmCoords(parentFarm)
    : { lat: -1.482, lng: 29.589 };

  // Deterministic offset around parent farm so multiple activities fan out cleanly
  let hash = 0;
  for (let i = 0; i < activity.id.length; i++) {
    hash = (hash * 31 + activity.id.charCodeAt(i)) % 360;
  }
  const angleRad = (hash * Math.PI) / 180;
  const radiusDeg = 0.022 + (hash % 5) * 0.008;

  return {
    lat: Number((base.lat + Math.sin(angleRad) * radiusDeg).toFixed(5)),
    lng: Number((base.lng + Math.cos(angleRad) * radiusDeg).toFixed(5)),
    accuracy: 5.5,
    isExplicitGps: false,
  };
}

export const FarmActivityGpsMap: React.FC<FarmActivityGpsMapProps> = ({
  language,
  farms,
  activities,
  selectedFarmId = "all",
  onSelectFarm,
  onOpenAddFarm,
  onOpenAddActivity,
  onUpdateActivityStatus,
}) => {
  const [layerMode, setLayerMode] = useState<"both" | "farms" | "activities">("both");
  const [zoomMode, setZoomMode] = useState<"national" | "parcel">("national");
  const [focusedParcelId, setFocusedParcelId] = useState<string>(
    selectedFarmId !== "all" ? selectedFarmId : farms[0]?.id || "farm-1"
  );

  // Selected pin on the map (either a farm or an activity)
  const [selectedPin, setSelectedPin] = useState<{
    type: "farm" | "activity";
    id: string;
  }>({
    type: "farm",
    id: farms[0]?.id || "farm-1",
  });

  const mappedFarms = useMemo(() => {
    return farms.map((f) => {
      const coords = resolveFarmCoords(f);
      const svgPt = projectRwandaLatLngToSvg(coords.lat, coords.lng);
      return {
        farm: f,
        ...coords,
        svgX: svgPt.x,
        svgY: svgPt.y,
      };
    });
  }, [farms]);

  const mappedActivities = useMemo(() => {
    return activities
      .filter((a) =>
        zoomMode === "parcel"
          ? a.farmId === focusedParcelId
          : selectedFarmId === "all" || a.farmId === selectedFarmId
      )
      .map((a) => {
        const coords = resolveActivityCoords(a, farms);
        const svgPt = projectRwandaLatLngToSvg(coords.lat, coords.lng);
        return {
          activity: a,
          ...coords,
          svgX: svgPt.x,
          svgY: svgPt.y,
        };
      });
  }, [activities, farms, zoomMode, focusedParcelId, selectedFarmId]);

  const focusedFarmEntry =
    mappedFarms.find((m) => m.farm.id === focusedParcelId) || mappedFarms[0];

  const inspectedFarm =
    selectedPin.type === "farm"
      ? mappedFarms.find((m) => m.farm.id === selectedPin.id) || mappedFarms[0]
      : null;

  const inspectedActivity =
    selectedPin.type === "activity"
      ? mappedActivities.find((m) => m.activity.id === selectedPin.id) ||
        mappedActivities[0]
      : null;

  return (
    <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
      {/* Header & Map Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {language === "rw"
                ? "Ikarita ya GPS y'Imirima n'Ibikorwa (Geospatial Telemetry)"
                : "GPS Parcel & Field Activity Map"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {mappedFarms.length} {language === "rw" ? "imirima" : "parcels"} ·{" "}
              {mappedActivities.length}{" "}
              {language === "rw" ? "ibikorwa" : "logged activities"}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mt-0.5">
            {language === "rw"
              ? "Aho Imirima n'Ibikorwa Biherereye kuri GPS mu Rwanda"
              : "Spatial Distribution of Farm Parcels & Logged Field Activities"}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200/80 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setLayerMode("both")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                layerMode === "both"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {language === "rw" ? "Byose (All)" : "Parcels + Activities"}
            </button>
            <button
              type="button"
              onClick={() => setLayerMode("farms")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                layerMode === "farms"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {language === "rw" ? "Imirima" : "Parcels Only"}
            </button>
            <button
              type="button"
              onClick={() => setLayerMode("activities")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                layerMode === "activities"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400"
              }`}
            >
              {language === "rw" ? "Ibikorwa" : "Activities Only"}
            </button>
          </div>

          {/* Zoom Mode Toggle */}
          <button
            type="button"
            onClick={() =>
              setZoomMode(zoomMode === "national" ? "parcel" : "national")
            }
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {zoomMode === "national" ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === "rw"
                    ? "Egera Umurima (Parcel Zoom)"
                    : "Parcel Micro-View"}
                </span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {language === "rw"
                    ? "Ikarita y'Igihugu (Rwanda Map)"
                    : "National Overview"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Map Grid: Interactive SVG Canvas (7 cols) + Pin Telemetry Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: SVG Map Viewport */}
        <div className="lg:col-span-7 rounded-2xl bg-stone-950 border border-stone-800 p-4 flex flex-col justify-between min-h-[340px]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300 border-b border-stone-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="font-mono tabular-nums font-bold text-emerald-400">
                {zoomMode === "national"
                  ? "WGS84 · RWANDA AGRO-GEOSPATIAL GRID"
                  : `PARCEL BOUNDARY · ${focusedFarmEntry?.farm.name.toUpperCase()}`}
              </span>
            </div>

            {zoomMode === "parcel" && (
              <select
                value={focusedParcelId}
                onChange={(e) => {
                  setFocusedParcelId(e.target.value);
                  setSelectedPin({ type: "farm", id: e.target.value });
                }}
                className="px-2 py-0.5 rounded bg-stone-800 text-white text-xs border border-stone-700"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.district})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* SVG Canvas */}
          <div className="my-2 flex-1 flex items-center justify-center">
            <svg
              viewBox="0 0 500 380"
              className="w-full h-full max-h-[310px] select-none"
            >
              {/* Coordinate Graticule Lines */}
              <line x1="75" y1="110" x2="440" y2="110" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="75" y1="200" x2="440" y2="200" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="75" y1="290" x2="440" y2="290" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="180" y1="25" x2="180" y2="355" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="300" y1="25" x2="300" y2="355" stroke="#1e293b" strokeDasharray="3 3" />

              {zoomMode === "national" ? (
                <>
                  {/* Rwanda National Boundary */}
                  <path
                    d="M 170 30 Q 220 20 280 35 Q 350 40 410 70 Q 440 110 435 150 Q 425 210 395 270 Q 355 330 280 345 Q 215 350 180 330 Q 150 310 135 270 Q 120 240 100 200 Q 80 160 110 110 Q 135 60 170 30 Z"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="2.5"
                  />

                  {/* Reference Labels */}
                  <text x="165" y="68" fill="#64748b" fontSize="10" fontWeight="bold">
                    NORTH (Musanze)
                  </text>
                  <text x="335" y="135" fill="#64748b" fontSize="10" fontWeight="bold">
                    EAST (Nyagatare)
                  </text>
                  <text x="180" y="305" fill="#64748b" fontSize="10" fontWeight="bold">
                    SOUTH (Huye)
                  </text>
                  <text x="242" y="182" fill="#94a3b8" fontSize="11" fontWeight="bold">
                    ★ Kigali
                  </text>

                  {/* Activity Pins (National View) */}
                  {(layerMode === "both" || layerMode === "activities") &&
                    mappedActivities.map((item) => {
                      const isSel =
                        selectedPin.type === "activity" &&
                        selectedPin.id === item.activity.id;
                      const pinColor =
                        item.activity.status === "completed"
                          ? "#10b981"
                          : item.activity.status === "in_progress"
                          ? "#f59e0b"
                          : "#94a3b8";

                      return (
                        <g
                          key={item.activity.id}
                          onClick={() =>
                            setSelectedPin({
                              type: "activity",
                              id: item.activity.id,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <circle
                            cx={item.svgX}
                            cy={item.svgY}
                            r={isSel ? 8 : 5.5}
                            fill={pinColor}
                            stroke="#ffffff"
                            strokeWidth={isSel ? 2.5 : 1.5}
                          />
                        </g>
                      );
                    })}

                  {/* Farm Parcel Markers (National View) */}
                  {(layerMode === "both" || layerMode === "farms") &&
                    mappedFarms.map((item) => {
                      const isSel =
                        selectedPin.type === "farm" &&
                        selectedPin.id === item.farm.id;
                      return (
                        <g
                          key={item.farm.id}
                          onClick={() => {
                            setSelectedPin({ type: "farm", id: item.farm.id });
                            setFocusedParcelId(item.farm.id);
                            if (onSelectFarm) onSelectFarm(item.farm.id);
                          }}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={item.svgX}
                            cy={item.svgY}
                            r={isSel ? 22 : 15}
                            fill="#10b981"
                            fillOpacity={isSel ? 0.3 : 0.18}
                            stroke="#10b981"
                            strokeDasharray="3 2"
                          />
                          <polygon
                            points={`${item.svgX},${item.svgY - 9} ${
                              item.svgX + 9
                            },${item.svgY} ${item.svgX},${item.svgY + 9} ${
                              item.svgX - 9
                            },${item.svgY}`}
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth={isSel ? 2.5 : 1.5}
                          />
                          <text
                            x={item.svgX}
                            y={item.svgY - 14}
                            fill="#ecfdf5"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {item.farm.name}
                          </text>
                        </g>
                      );
                    })}
                </>
              ) : (
                /* PARCEL MICRO-VIEW: Sub-parcel boundary + individual activity GPS pins */
                <>
                  <polygon
                    points="110,60 390,45 420,295 135,325"
                    fill="#064e3b"
                    fillOpacity="0.35"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                  <text
                    x="255"
                    y="35"
                    fill="#a7f3d0"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {focusedFarmEntry?.farm.name} ({focusedFarmEntry?.farm.sizeHa} Ha) ·{" "}
                    {focusedFarmEntry?.lat.toFixed(4)}°, {focusedFarmEntry?.lng.toFixed(4)}°
                  </text>

                  {/* Center Parcel Benchmark */}
                  <circle
                    cx="255"
                    cy="185"
                    r="7"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  {/* Plot activities inside the parcel boundary */}
                  {mappedActivities.map((item, idx) => {
                    const angle = (idx / Math.max(1, mappedActivities.length)) * Math.PI * 2;
                    const px = Math.round(255 + Math.cos(angle) * 95);
                    const py = Math.round(185 + Math.sin(angle) * 75);
                    const isSel =
                      selectedPin.type === "activity" &&
                      selectedPin.id === item.activity.id;
                    const pinColor =
                      item.activity.status === "completed"
                        ? "#10b981"
                        : item.activity.status === "in_progress"
                        ? "#f59e0b"
                        : "#cbd5e1";

                    return (
                      <g
                        key={item.activity.id}
                        onClick={() =>
                          setSelectedPin({
                            type: "activity",
                            id: item.activity.id,
                          })
                        }
                        className="cursor-pointer"
                      >
                        <circle
                          cx={px}
                          cy={py}
                          r="16"
                          fill={pinColor}
                          fillOpacity="0.2"
                        />
                        <circle
                          cx={px}
                          cy={py}
                          r={isSel ? 8 : 6}
                          fill={pinColor}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={px}
                          y={py - 11}
                          fill="#f8fafc"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {item.activity.title.slice(0, 18)}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
          </div>

          {/* Bottom Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800 text-[11px] text-stone-400">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rotate-45 bg-emerald-500 inline-block" />
                <span>{language === "rw" ? "Umurima (Parcel)" : "Farm Parcel"}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>{language === "rw" ? "Byarangiye" : "Completed"}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>{language === "rw" ? "Birakorwa" : "In Progress"}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400 inline-block" />
                <span>{language === "rw" ? "Bitegereje" : "Pending"}</span>
              </span>
            </div>
            <span className="font-mono tabular-nums text-[10px] text-stone-500">
              {language === "rw" ? "Kanda ku ipini urebe GPS" : "Click any pin to inspect GPS"}
            </span>
          </div>
        </div>

        {/* Right: Selected Pin Geospatial Inspector Panel */}
        <div className="lg:col-span-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 p-4 flex flex-col justify-between space-y-4">
          {inspectedFarm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {language === "rw" ? "IPINI Y'UMURIMA (FARM PARCEL)" : "FARM PARCEL GPS TELEMETRY"}
                </span>
                <span className="font-mono tabular-nums">
                  ±{inspectedFarm.accuracy}m
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-stone-900 dark:text-white">
                  {inspectedFarm.farm.name}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {inspectedFarm.farm.district}, {inspectedFarm.farm.sector} ·{" "}
                  {inspectedFarm.farm.sizeHa} Ha
                </p>
              </div>

              {/* Coordinate Readout Box */}
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5 font-mono tabular-nums text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Latitude:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {inspectedFarm.lat.toFixed(5)}° S
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Longitude:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {inspectedFarm.lng.toFixed(5)}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Altitude:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {inspectedFarm.farm.altitudeMeters || 2200} m
                  </span>
                </div>
              </div>

              {/* Quick List of Activities Logged on this Parcel */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {language === "rw"
                    ? "Ibikorwa kuri uyu murima (Kanda urebe GPS yabyo):"
                    : "Activities Logged on Parcel (Click to locate):"}
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-stone-200/60 dark:divide-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900">
                  {activities
                    .filter((a) => a.farmId === inspectedFarm.farm.id)
                    .slice(0, 6)
                    .map((act) => {
                      const c = resolveActivityCoords(act, farms);
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() =>
                            setSelectedPin({ type: "activity", id: act.id })
                          }
                          className="w-full px-3 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800/60 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="truncate font-medium text-stone-800 dark:text-stone-200">
                            {act.title}
                          </span>
                          <span className="font-mono tabular-nums text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                            {c.lat.toFixed(3)}°, {c.lng.toFixed(3)}°
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : inspectedActivity ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {language === "rw"
                    ? "IPINI Y'IGIKORWA (FIELD ACTIVITY GPS)"
                    : "ACTIVITY GEOLOCATION LOG"}
                </span>
                <span className="font-mono tabular-nums">
                  ±{inspectedActivity.accuracy}m
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-stone-900 dark:text-white">
                  {inspectedActivity.activity.title}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {inspectedActivity.activity.farmName} ·{" "}
                  {inspectedActivity.activity.crop}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5 font-mono tabular-nums text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Latitude:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {inspectedActivity.lat.toFixed(5)}° S
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Longitude:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {inspectedActivity.lng.toFixed(5)}° E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {inspectedActivity.activity.status.toUpperCase()}
                  </span>
                </div>
                {inspectedActivity.activity.assignedTo && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Collaborator:</span>
                    <span className="font-sans font-medium text-stone-800 dark:text-stone-200">
                      {inspectedActivity.activity.assignedTo}
                    </span>
                  </div>
                )}
              </div>

              {onUpdateActivityStatus && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActivityStatus(
                      inspectedActivity.activity.id,
                      inspectedActivity.activity.status === "completed"
                        ? "pending"
                        : "completed"
                    )
                  }
                  className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
                >
                  {inspectedActivity.activity.status === "completed"
                    ? language === "rw"
                      ? "Subiza kuri Bitegereje"
                      : "Reopen Activity"
                    : language === "rw"
                    ? "Emeza ko Igikorwa Cyarangiye"
                    : "Mark Activity Completed"}
                </button>
              )}
            </div>
          ) : null}

          {/* Bottom Action CTA */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-700 flex flex-wrap items-center gap-2">
            {onOpenAddFarm && (
              <button
                type="button"
                onClick={onOpenAddFarm}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Umurima Mushya + GPS" : "New Parcel + GPS"}
                </span>
              </button>
            )}
            {onOpenAddActivity && (
              <button
                type="button"
                onClick={onOpenAddActivity}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Andika Igikorwa + GPS" : "Log Activity + GPS"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
