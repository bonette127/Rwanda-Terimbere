import React, { useState, useMemo, useRef } from "react";
import { Farm, Language } from "../types";
import {
  projectRwandaLatLngToSvg,
  unprojectSvgToRwandaLatLng,
} from "./GpsCoordinatePicker";
import { resolveFarmCoords } from "./FarmActivityGpsMap";
import {
  MapPin,
  Compass,
  Layers,
  Mountain,
  Droplets,
  Sprout,
  Plus,
  Minus,
  RotateCcw,
  Navigation,
  Copy,
  Check,
  Search,
  Maximize2,
  X,
} from "lucide-react";

export interface FarmMapProps {
  farms: Farm[];
  language: Language;
  selectedFarmId?: string;
  onSelectFarm?: (farmId: string) => void;
  onOpenAddFarm?: () => void;
}

type TileStyle = "terrain" | "satellite" | "street";
type ColorMode = "irrigation" | "scale";

// Calculate Haversine distance in km between two WGS84 coordinates
function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate a realistic surveyed field polygon around (cx, cy) scaled by hectares
function buildParcelPolygonPoints(
  farmId: string,
  cx: number,
  cy: number,
  sizeHa: number,
  zoom: number
): string {
  const baseRadius = Math.max(8, Math.min(26, 7 + Math.sqrt(sizeHa) * 5.5)) * (zoom > 1.8 ? 0.85 : 1);
  let seed = 0;
  for (let i = 0; i < farmId.length; i++) {
    seed = (seed * 37 + farmId.charCodeAt(i)) % 1000;
  }

  const angles = [25, 78, 145, 208, 268, 325];
  return angles
    .map((deg, idx) => {
      const rad = ((deg + ((seed + idx * 19) % 18) - 9) * Math.PI) / 180;
      const jitter = 0.82 + (((seed >> idx) & 7) / 7) * 0.34;
      const rx = cx + Math.cos(rad) * baseRadius * jitter * 1.15;
      const ry = cy + Math.sin(rad) * baseRadius * jitter * 0.9;
      return `${rx.toFixed(1)},${ry.toFixed(1)}`;
    })
    .join(" ");
}

export const FarmMap: React.FC<FarmMapProps> = ({
  farms,
  language,
  selectedFarmId = "all",
  onSelectFarm,
  onOpenAddFarm,
}) => {
  const [tileStyle, setTileStyle] = useState<TileStyle>("terrain");
  const [colorMode, setColorMode] = useState<ColorMode>("irrigation");
  const [searchQuery, setSearchQuery] = useState("");
  const [irrigationFilter, setIrrigationFilter] = useState<
    "all" | "rainfed" | "irrigated" | "swamp"
  >("all");
  const [activeFarmId, setActiveFarmId] = useState<string | null>(
    selectedFarmId !== "all" ? selectedFarmId : farms[0]?.id || null
  );
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive Leaflet-style pan & zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Sync external selectedFarmId changes
  React.useEffect(() => {
    if (selectedFarmId && selectedFarmId !== "all") {
      setActiveFarmId(selectedFarmId);
      setShowPopup(true);
      const target = farms.find((f) => f.id === selectedFarmId);
      if (target) {
        const coords = resolveFarmCoords(target);
        const pt = projectRwandaLatLngToSvg(coords.lat, coords.lng);
        setZoom(2.2);
        setPan({
          x: 250 - pt.x,
          y: 190 - pt.y,
        });
      }
    }
  }, [selectedFarmId, farms]);

  // Enrich farms with resolved GPS coordinates & SVG projection
  const mappedParcels = useMemo(() => {
    return farms
      .filter((farm) => {
        if (irrigationFilter !== "all" && farm.irrigationType !== irrigationFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = farm.name.toLowerCase().includes(q);
          const matchDistrict = farm.district.toLowerCase().includes(q);
          const matchSector = farm.sector.toLowerCase().includes(q);
          const matchCrop = farm.mainCrops.some((c) =>
            c.toLowerCase().includes(q)
          );
          return matchName || matchDistrict || matchSector || matchCrop;
        }
        return true;
      })
      .map((farm) => {
        const coords = resolveFarmCoords(farm);
        const pt = projectRwandaLatLngToSvg(coords.lat, coords.lng);
        return {
          farm,
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
          isExplicitGps: coords.isExplicitGps,
          svgX: pt.x,
          svgY: pt.y,
        };
      });
  }, [farms, irrigationFilter, searchQuery]);

  const activeParcel = useMemo(() => {
    return (
      mappedParcels.find((p) => p.farm.id === activeFarmId) ||
      mappedParcels[0] ||
      null
    );
  }, [mappedParcels, activeFarmId]);

  // Nearest neighboring parcel distance for telemetry
  const nearestNeighbor = useMemo(() => {
    if (!activeParcel || mappedParcels.length < 2) return null;
    let minKm = Infinity;
    let neighborName = "";
    for (const candidate of mappedParcels) {
      if (candidate.farm.id === activeParcel.farm.id) continue;
      const dist = calculateDistanceKm(
        activeParcel.lat,
        activeParcel.lng,
        candidate.lat,
        candidate.lng
      );
      if (dist < minKm) {
        minKm = dist;
        neighborName = candidate.farm.name;
      }
    }
    return minKm < Infinity ? { distanceKm: minKm, name: neighborName } : null;
  }, [activeParcel, mappedParcels]);

  const totalAreaHa = useMemo(
    () => mappedParcels.reduce((acc, p) => acc + p.farm.sizeHa, 0),
    [mappedParcels]
  );

  // Get marker & polygon colors based on selected colorMode
  const getParcelStyle = (farm: Farm) => {
    if (colorMode === "irrigation") {
      switch (farm.irrigationType) {
        case "irrigated":
          return {
            fill: "rgba(14, 165, 233, 0.28)",
            stroke: "#0284c7",
            pinBg: "#0284c7",
            label:
              language === "rw"
                ? "Kuhira (Irrigated)"
                : language === "fr"
                ? "Irrigué"
                : "Irrigated",
          };
        case "swamp":
          return {
            fill: "rgba(20, 184, 166, 0.28)",
            stroke: "#0d9488",
            pinBg: "#0d9488",
            label:
              language === "rw"
                ? "Igishanga (Swamp)"
                : language === "fr"
                ? "Marais"
                : "Swamp / Marshland",
          };
        default:
          return {
            fill: "rgba(16, 185, 129, 0.26)",
            stroke: "#059669",
            pinBg: "#059669",
            label:
              language === "rw"
                ? "Imvura (Rainfed)"
                : language === "fr"
                ? "Pluvial"
                : "Rainfed",
          };
      }
    } else {
      const ha = farm.sizeHa;
      if (ha > 5) {
        return {
          fill: "rgba(147, 51, 234, 0.26)",
          stroke: "#9333ea",
          pinBg: "#9333ea",
          label: "> 5.0 Ha (Large)",
        };
      }
      if (ha >= 2) {
        return {
          fill: "rgba(37, 99, 235, 0.26)",
          stroke: "#2563eb",
          pinBg: "#2563eb",
          label: "2.0 – 5.0 Ha (Medium)",
        };
      }
      if (ha >= 0.5) {
        return {
          fill: "rgba(16, 185, 129, 0.26)",
          stroke: "#059669",
          pinBg: "#059669",
          label: "0.5 – 2.0 Ha (Semi-Comm)",
        };
      }
      return {
        fill: "rgba(217, 119, 6, 0.26)",
        stroke: "#d97706",
        pinBg: "#d97706",
        label: "< 0.5 Ha (Smallholder)",
      };
    }
  };

  // Focus & zoom to a specific farm parcel
  const handleFocusParcel = (farmId: string, targetZoom = 2.2) => {
    setActiveFarmId(farmId);
    setShowPopup(true);
    onSelectFarm?.(farmId);
    const target = mappedParcels.find((p) => p.farm.id === farmId);
    if (target) {
      setZoom(targetZoom);
      setPan({
        x: 250 - target.svgX,
        y: 190 - target.svgY,
      });
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    onSelectFarm?.("all");
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3.5, Number((prev + 0.45).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1, Number((prev - 0.45).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleCopyCoords = (farmId: string, lat: number, lng: number) => {
    const text = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(farmId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Mouse pan handlers for the SVG canvas
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 500;
    const relY = ((e.clientY - rect.top) / rect.height) * 380;
    const worldX = (relX - 250) / zoom + 250 - pan.x;
    const worldY = (relY - 190) / zoom + 190 - pan.y;
    setHoverCoords(unprojectSvgToRwandaLatLng(worldX, worldY));

    if (!isDragging || !dragStartRef.current) return;
    const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * (500 / zoom);
    const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * (380 / zoom);
    setPan({
      x: Math.max(-180, Math.min(180, dragStartRef.current.panX + dx)),
      y: Math.max(-140, Math.min(140, dragStartRef.current.panY + dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Compute dynamic SVG viewBox from zoom & pan
  const viewW = 500 / zoom;
  const viewH = 380 / zoom;
  const viewX = 250 - viewW / 2 - pan.x;
  const viewY = 190 - viewH / 2 - pan.y;
  const dynamicViewBox = `${viewX.toFixed(1)} ${viewY.toFixed(1)} ${viewW.toFixed(1)} ${viewH.toFixed(1)}`;

  // Scale bar calculation
  const scaleBarKm = zoom >= 2.5 ? 5 : zoom >= 1.6 ? 10 : 25;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
      {/* Top Map Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-stone-400">
            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {language === "rw"
                ? "Ikarita Ndangahantu y'Imirima (WGS84 GPS)"
                : language === "fr"
                ? "Carte Cadastrale des Parcelles (GPS WGS84)"
                : "Farm Parcel GIS Map · Stored GPS Coordinates"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-stone-700 dark:text-stone-300 font-semibold">
              {mappedParcels.length}{" "}
              {language === "rw" ? "imirima" : "parcels"} ({totalAreaHa.toFixed(1)} Ha)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mt-0.5">
            {language === "rw"
              ? "Ikarita y'Imirima n'Imbibi za GPS"
              : language === "fr"
              ? "Carte Interactive des Parcelles Agricoles"
              : "Interactive Farm Parcel Map"}
          </h2>
        </div>

        {/* Interactive Tile Switcher & Color Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tile Style Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200/70 dark:border-stone-700"
            role="group"
            aria-label="Map Tile Style"
          >
            {(
              [
                {
                  id: "terrain",
                  labelRw: "Imisozi",
                  labelEn: "Terrain",
                },
                {
                  id: "satellite",
                  labelRw: "Icyogajuru",
                  labelEn: "Satellite",
                },
                {
                  id: "street",
                  labelRw: "Imihanda",
                  labelEn: "Street GIS",
                },
              ] as const
            ).map((tStyle) => (
              <button
                key={tStyle.id}
                type="button"
                onClick={() => setTileStyle(tStyle.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tileStyle === tStyle.id
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
                }`}
              >
                {language === "rw" ? tStyle.labelRw : tStyle.labelEn}
              </button>
            ))}
          </div>

          {/* Color Encoding Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200/70 dark:border-stone-700"
            role="group"
            aria-label="Parcel Color Encoding"
          >
            <button
              type="button"
              onClick={() => setColorMode("irrigation")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                colorMode === "irrigation"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? " Kuhira" : "By Irrigation"}
            </button>
            <button
              type="button"
              onClick={() => setColorMode("scale")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                colorMode === "scale"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Ubuso (Ha)" : "By Size (Ha)"}
            </button>
          </div>

          {onOpenAddFarm && (
            <button
              type="button"
              onClick={onOpenAddFarm}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {language === "rw" ? "Ongeraho Umurima" : "Add Parcel"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Map Workspace: Left Interactive Leaflet-Style Canvas + Right Parcel Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 8 Columns: Interactive Leaflet-Style SVG Viewport */}
        <div className="lg:col-span-8 relative border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-stone-800 select-none overflow-hidden bg-stone-100 dark:bg-stone-950">
          {/* Leaflet-Style Top-Left Zoom & Fit Control Stack */}
          <div className="absolute top-3.5 left-3.5 z-10 flex flex-col bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs rounded-xl border border-stone-300/80 dark:border-stone-700 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              title={language === "rw" ? "egereza (Zoom In)" : "Zoom in"}
              aria-label="Zoom in"
              className="w-9 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 border-b border-stone-200 dark:border-stone-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title={language === "rw" ? "Subiza inyuma (Zoom Out)" : "Zoom out"}
              aria-label="Zoom out"
              className="w-9 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 border-b border-stone-200 dark:border-stone-800 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              title={
                language === "rw"
                  ? "Garura Ikarita Yose (Fit All Parcels)"
                  : "Fit all parcels"
              }
              aria-label="Reset map view"
              className="w-9 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top-Right Quick Irrigation Filter Bar on Map */}
          <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 p-1 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs rounded-xl border border-stone-300/80 dark:border-stone-700 shadow-sm">
            {(
              [
                { id: "all", labelRw: "Imirima Yose", labelEn: "All" },
                { id: "rainfed", labelRw: "Imvura", labelEn: "Rainfed" },
                { id: "irrigated", labelRw: "Kuhira", labelEn: "Irrigated" },
                { id: "swamp", labelRw: "Igishanga", labelEn: "Swamp" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIrrigationFilter(item.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  irrigationFilter === item.id
                    ? "bg-emerald-800 text-white"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {language === "rw" ? item.labelRw : item.labelEn}
              </button>
            ))}
          </div>

          {/* Interactive SVG Map Canvas */}
          <svg
            viewBox={dynamicViewBox}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-[390px] sm:h-[440px] block transition-colors ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            role="img"
            aria-label="Rwanda Farm Parcel Map Visualization"
          >
            <defs>
              {/* Terrain Background Gradient */}
              <linearGradient id="farmMapTerrainBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ecfdf5" />
                <stop offset="55%" stopColor="#f5f5f4" />
                <stop offset="100%" stopColor="#fef3c7" />
              </linearGradient>

              {/* Satellite Background Gradient */}
              <linearGradient id="farmMapSatBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#052e16" />
                <stop offset="55%" stopColor="#064e3b" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>

              {/* Street GIS Background Gradient */}
              <linearGradient id="farmMapStreetBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#f1f5f9" />
              </linearGradient>

              {/* Cadastral Grid Pattern */}
              <pattern
                id="cadastralGrid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={
                    tileStyle === "satellite"
                      ? "rgba(167, 243, 208, 0.12)"
                      : "rgba(15, 23, 42, 0.06)"
                  }
                  strokeWidth="0.6"
                />
                <path
                  d="M 20 0 L 20 40 M 0 20 L 40 20"
                  fill="none"
                  stroke={
                    tileStyle === "satellite"
                      ? "rgba(167, 243, 208, 0.05)"
                      : "rgba(15, 23, 42, 0.03)"
                  }
                  strokeWidth="0.4"
                  strokeDasharray="2 2"
                />
              </pattern>
            </defs>

            {/* Base Tile Canvas */}
            <rect
              x="-250"
              y="-200"
              width="1000"
              height="800"
              fill={
                tileStyle === "satellite"
                  ? "url(#farmMapSatBg)"
                  : tileStyle === "street"
                  ? "url(#farmMapStreetBg)"
                  : "url(#farmMapTerrainBg)"
              }
            />

            {/* Coordinate Grid Overlay */}
            <rect
              x="-250"
              y="-200"
              width="1000"
              height="800"
              fill="url(#cadastralGrid)"
            />

            {/* Rwanda National Boundary Polygon */}
            <path
              d="M 122,52 L 195,38 L 282,42 L 368,62 L 418,118 L 432,198 L 412,282 L 348,325 L 258,342 L 175,334 L 108,312 L 84,254 L 96,178 L 106,112 Z"
              fill={
                tileStyle === "satellite"
                  ? "rgba(6, 78, 59, 0.45)"
                  : tileStyle === "street"
                  ? "#ffffff"
                  : "rgba(255, 255, 255, 0.72)"
              }
              stroke={
                tileStyle === "satellite"
                  ? "#34d399"
                  : tileStyle === "street"
                  ? "#64748b"
                  : "#059669"
              }
              strokeWidth="1.6"
              strokeDasharray={tileStyle === "street" ? "4 2" : undefined}
            />

            {/* Topographic Elevation Contours (Terrain & Satellite modes) */}
            {tileStyle !== "street" && (
              <g
                opacity={tileStyle === "satellite" ? 0.25 : 0.4}
                fill="none"
                stroke={tileStyle === "satellite" ? "#6ee7b7" : "#047857"}
                strokeWidth="0.7"
                strokeDasharray="5 4"
              >
                {/* Northern Volcanic Highland Contour */}
                <ellipse cx="185" cy="95" rx="75" ry="38" />
                <ellipse cx="185" cy="95" rx="48" ry="22" />
                {/* Congo-Nile Ridge Contour */}
                <path d="M 125,115 Q 145,205 132,295" />
                {/* Eastern Plains Contour */}
                <ellipse cx="355" cy="185" rx="62" ry="75" />
              </g>
            )}

            {/* Lake Kivu & Lake Muhazi Hydrography */}
            <path
              d="M 96,122 C 115,148 112,190 98,228 C 88,248 78,225 84,185 C 88,155 88,132 96,122 Z"
              fill={tileStyle === "satellite" ? "#0369a1" : "#bae6fd"}
              stroke={tileStyle === "satellite" ? "#38bdf8" : "#0284c7"}
              strokeWidth="0.9"
              opacity="0.85"
            />
            <text
              x="64"
              y="182"
              fontSize="7.5"
              fontWeight="600"
              fill={tileStyle === "satellite" ? "#7dd3fc" : "#0369a1"}
            >
              Lake Kivu
            </text>

            {/* Lake Muhazi */}
            <path
              d="M 278,158 Q 306,154 332,163 Q 308,169 278,158 Z"
              fill={tileStyle === "satellite" ? "#0369a1" : "#bae6fd"}
              stroke={tileStyle === "satellite" ? "#38bdf8" : "#0284c7"}
              strokeWidth="0.8"
            />

            {/* Primary National Agricultural Transport Corridors (RN1, RN2, RN3, RN4) */}
            <g
              fill="none"
              stroke={
                tileStyle === "satellite"
                  ? "rgba(251, 191, 36, 0.32)"
                  : tileStyle === "street"
                  ? "rgba(245, 158, 11, 0.55)"
                  : "rgba(120, 113, 108, 0.28)"
              }
              strokeWidth="1.2"
            >
              {/* Kigali Center (256, 178) radiating highways */}
              <path d="M 256,178 Q 218,128 175,92" />
              <path d="M 256,178 Q 315,125 348,82" />
              <path d="M 256,178 Q 332,188 395,212" />
              <path d="M 256,178 Q 225,235 204,288" />
              <path d="M 175,92 Q 138,118 112,135" />
            </g>

            {/* Reference District Labels */}
            {[
              { name: "Musanze", x: 175, y: 84 },
              { name: "Rubavu", x: 118, y: 128 },
              { name: "Nyagatare", x: 332, y: 76 },
              { name: "Kigali", x: 258, y: 175 },
              { name: "Rwamagana", x: 335, y: 185 },
              { name: "Bugesera", x: 282, y: 228 },
              { name: "Huye", x: 202, y: 286 },
              { name: "Karongi", x: 132, y: 202 },
              { name: "Kirehe", x: 392, y: 235 },
            ].map((refDist) => (
              <g key={refDist.name} className="pointer-events-none">
                <circle
                  cx={refDist.x}
                  cy={refDist.y}
                  r="1.8"
                  fill={tileStyle === "satellite" ? "#a7f3d0" : "#78716c"}
                  opacity="0.6"
                />
                <text
                  x={refDist.x + 4}
                  y={refDist.y + 2}
                  fontSize="7.5"
                  fontWeight="500"
                  fill={
                    tileStyle === "satellite"
                      ? "rgba(236, 253, 245, 0.68)"
                      : "#57534e"
                  }
                >
                  {refDist.name}
                </text>
              </g>
            ))}

            {/* Farm Parcel Cadastral Polygons, GPS Accuracy Rings & Leaflet-Style Pins */}
            {mappedParcels.map((item) => {
              const { farm, svgX, svgY, accuracy } = item;
              const isSelected = activeParcel?.farm.id === farm.id;
              const style = getParcelStyle(farm);
              const polyPoints = buildParcelPolygonPoints(
                farm.id,
                svgX,
                svgY,
                farm.sizeHa,
                zoom
              );
              const accuracyRadiusSvg = Math.max(
                12,
                Math.min(34, accuracy * 2.4)
              );

              return (
                <g
                  key={farm.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocusParcel(farm.id, Math.max(zoom, 1.8));
                  }}
                  className="cursor-pointer group"
                >
                  {/* GPS Accuracy Ring (±m) */}
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={accuracyRadiusSvg}
                    fill="none"
                    stroke={isSelected ? "#f59e0b" : style.stroke}
                    strokeWidth={isSelected ? "1.1" : "0.6"}
                    strokeDasharray="2.5 2.5"
                    opacity={isSelected ? 0.85 : 0.4}
                  />

                  {/* Cadastral Parcel Boundary Polygon */}
                  <polygon
                    points={polyPoints}
                    fill={style.fill}
                    stroke={isSelected ? "#f59e0b" : style.stroke}
                    strokeWidth={isSelected ? "2" : "1.2"}
                    strokeLinejoin="round"
                  />

                  {/* Center GPS Vertex & Leaflet-Style Pin */}
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={isSelected ? "6.5" : "5"}
                    fill={isSelected ? "#f59e0b" : style.pinBg}
                    stroke="#ffffff"
                    strokeWidth="1.6"
                  />
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r="1.8"
                    fill="#ffffff"
                  />

                  {/* Parcel Label Tag on Map */}
                  <g transform={`translate(${svgX}, ${svgY - (isSelected ? 12 : 10)})`}>
                    <rect
                      x="-42"
                      y="-13"
                      width="84"
                      height="13"
                      rx="3.5"
                      fill={
                        isSelected
                          ? "#1c1917"
                          : tileStyle === "satellite"
                          ? "rgba(12, 10, 9, 0.82)"
                          : "rgba(255, 255, 255, 0.92)"
                      }
                      stroke={isSelected ? "#f59e0b" : style.stroke}
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      fontSize="6.8"
                      fontWeight="700"
                      fill={
                        isSelected || tileStyle === "satellite"
                          ? "#ffffff"
                          : "#1c1917"
                      }
                    >
                      {farm.name.length > 15
                        ? `${farm.name.slice(0, 14)}…`
                        : farm.name}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Leaflet-Style Floating Parcel Popup Card */}
          {activeParcel && showPopup && (
            <div className="absolute bottom-12 left-3.5 right-3.5 sm:right-auto sm:w-88 z-10 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-xl border border-stone-200 dark:border-stone-700 p-3.5 shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    <span>{activeParcel.farm.district}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeParcel.farm.sector}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      {activeParcel.farm.sizeHa} Ha
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate mt-0.5">
                    {activeParcel.farm.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  aria-label="Close parcel popup"
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stored GPS Coordinate Telemetry Row */}
              <div className="mt-2.5 pt-2.5 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <div className="font-mono tabular-nums text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {activeParcel.lat.toFixed(5)}, {activeParcel.lng.toFixed(5)}
                  </span>
                  <span className="text-stone-400">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    ±{activeParcel.accuracy}m
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCoords(
                      activeParcel.farm.id,
                      activeParcel.lat,
                      activeParcel.lng
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                >
                  {copiedId === activeParcel.farm.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>{language === "rw" ? "Byakoporowe" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{language === "rw" ? "Koporora GPS" : "Copy GPS"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Parcel Attributes Line */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-600 dark:text-stone-300">
                <span className="inline-flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-amber-500" />
                  <span className="font-mono tabular-nums">
                    {activeParcel.farm.altitudeMeters || 2200}m ASL
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-500" />
                  <span>{getParcelStyle(activeParcel.farm).label}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                  <Sprout className="w-3 h-3 text-emerald-600" />
                  <span className="truncate">
                    {activeParcel.farm.mainCrops.join(", ")}
                  </span>
                </span>
              </div>

              {nearestNeighbor && (
                <div className="mt-2 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
                  <span>
                    {language === "rw"
                      ? `Umurima uhegereye: ${nearestNeighbor.name}`
                      : `Nearest parcel: ${nearestNeighbor.name}`}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-stone-700 dark:text-stone-300">
                    {nearestNeighbor.distanceKm.toFixed(1)} km
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bottom-Left Scale Bar & Live Cursor WGS84 Readout */}
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-[11px]">
            <div className="flex items-center gap-2.5 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-stone-300/80 dark:border-stone-700 text-stone-700 dark:text-stone-300">
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-1.5 border-x border-b border-stone-700 dark:border-stone-300" />
                <span className="font-mono tabular-nums font-semibold">
                  {scaleBarKm} km
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {hoverCoords
                  ? `${hoverCoords.lat.toFixed(4)}° S, ${hoverCoords.lng.toFixed(4)}° E`
                  : activeParcel
                  ? `${activeParcel.lat.toFixed(4)}° S, ${activeParcel.lng.toFixed(4)}° E`
                  : "1.9403° S, 29.8739° E"}
              </span>
            </div>

            {/* Bottom-Right Map Attribution */}
            <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-stone-300/80 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-mono text-[10px]">
              MINAGRI Cadastral GIS · WGS84 · Zoom {zoom.toFixed(1)}x
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Synchronized Parcel Directory & Spatial Legend */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-stone-50/50 dark:bg-stone-900/50 p-4 sm:p-5">
          <div className="space-y-3.5">
            {/* Search Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === "rw"
                    ? "Shakisha umurima, akarere cyangwa igihingwa..."
                    : "Search parcel, district, or crop..."
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            {/* Directory Header */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {language === "rw"
                  ? "Urutonde rw'Imirima ku Ikarita"
                  : "Mapped Farm Parcels"}
              </span>
              <button
                type="button"
                onClick={handleResetView}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                {language === "rw" ? "Erekana Yose" : "Fit All"}
              </button>
            </div>

            {/* Scrollable Parcel List */}
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {mappedParcels.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
                  {language === "rw"
                    ? "Nta murima ujyanye n'ibyo ushakisha."
                    : "No farm parcels match the current filter."}
                </div>
              ) : (
                mappedParcels.map((item) => {
                  const { farm, lat, lng, accuracy } = item;
                  const isSelected = activeParcel?.farm.id === farm.id;
                  const style = getParcelStyle(farm);

                  return (
                    <button
                      key={farm.id}
                      type="button"
                      onClick={() => handleFocusParcel(farm.id, 2.2)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-white dark:bg-stone-800 border-emerald-600 dark:border-emerald-500 shadow-2xs"
                          : "bg-white/70 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: style.pinBg }}
                          />
                          <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                            {farm.name}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0">
                          {farm.sizeHa} Ha
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {farm.district}, {farm.sector}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">
                          {farm.mainCrops.slice(0, 2).join(", ")}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono tabular-nums text-stone-500 dark:text-stone-400">
                        <span>
                          {lat.toFixed(4)}, {lng.toFixed(4)} (±{accuracy}m)
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-sans font-semibold inline-flex items-center gap-0.5">
                          <Maximize2 className="w-2.5 h-2.5" />
                          <span>{language === "rw" ? "Reba" : "Focus"}</span>
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Spatial Legend Footer */}
          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-2">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {colorMode === "irrigation"
                  ? language === "rw"
                    ? "Ibisobanuro by'Amabara (Uburyo bwo Kuhira)"
                    : "Map Legend · Irrigation System"
                  : language === "rw"
                  ? "Ibisobanuro by'Amabara (Ubuso bw'Umurima)"
                  : "Map Legend · Parcel Size Tier"}
              </span>
            </div>
            {colorMode === "irrigation" ? (
              <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-600 dark:text-stone-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="truncate">
                    {language === "rw" ? "Imvura" : "Rainfed"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
                  <span className="truncate">
                    {language === "rw" ? "Kuhira" : "Irrigated"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                  <span className="truncate">
                    {language === "rw" ? "Igishanga" : "Swamp"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 dark:text-stone-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                  <span className="truncate">&lt; 0.5 Ha</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="truncate">0.5 – 2.0 Ha</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="truncate">2.0 – 5.0 Ha</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                  <span className="truncate">&gt; 5.0 Ha</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
