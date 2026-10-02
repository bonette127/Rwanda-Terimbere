import React, { useEffect, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmAsset,
  FarmAssetCondition,
  Language,
  ProductionScale,
  TeamMember,
} from "../types";
import { initialFarmAssets } from "../data/mockData";
import { getTranslation } from "../i18n";
import { GpsCoordinatePicker, RWANDA_DISTRICT_COORDS } from "./GpsCoordinatePicker";
import { FarmActivityGpsMap, resolveFarmCoords } from "./FarmActivityGpsMap";
import { FarmMap } from "./FarmMap";
import { ParcelAssetManagerModal } from "./ParcelAssetManagerModal";
import {
  ParcelSoilHealthHeatmap,
  computeParcelSoilZones,
} from "./ParcelSoilHealthHeatmap";
import {
  MapPin,
  Plus,
  Trash2,
  Sprout,
  Droplets,
  Layers,
  Mountain,
  Gauge,
  Users,
  UserPlus,
  ShieldAlert,
  Compass,
  QrCode,
  Camera,
  Eye,
  Wrench,
  Flame,
} from "lucide-react";

interface FarmsViewProps {
  farms: Farm[];
  activities?: FarmActivity[];
  language: Language;
  onAddFarm: (farm: Omit<Farm, "id" | "createdAt">) => void;
  onDeleteFarm: (id: string) => void;
  onUpdateActivityStatus?: (id: string, status: "pending" | "in_progress" | "completed") => void;
  onAddActivity?: (activity: Omit<FarmActivity, "id">) => void;
  teamMembers?: TeamMember[];
  onOpenShareFarmModal?: (farmId?: string) => void;
  onOpenParcelQr?: (
    farm: Farm | null,
    mode: "qr_label" | "details" | "scanner" | "history"
  ) => void;
  isViewOnly?: boolean;
}

export const FarmsView: React.FC<FarmsViewProps> = ({
  farms,
  activities = [],
  language,
  onAddFarm,
  onDeleteFarm,
  onUpdateActivityStatus,
  onAddActivity,
  teamMembers = [],
  onOpenShareFarmModal,
  onOpenParcelQr,
  isViewOnly = false,
}) => {
  const t = getTranslation(language);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGpsMap, setShowGpsMap] = useState(true);
  const [mapViewType, setMapViewType] = useState<"soilHeatmap" | "farmMap" | "activityGps">(
    "soilHeatmap"
  );
  const [selectedMapFarmId, setSelectedMapFarmId] = useState<string>("all");
  const [assetManagerFarm, setAssetManagerFarm] = useState<Farm | null>(null);
  const [farmAssets, setFarmAssets] = useState<FarmAsset[]>(() => {
    try {
      const saved = localStorage.getItem("terimbere_farm_assets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return initialFarmAssets;
  });

  useEffect(() => {
    try {
      localStorage.setItem("terimbere_farm_assets", JSON.stringify(farmAssets));
    } catch {
      // ignore storage error
    }
  }, [farmAssets]);

  // Open Manage Assets modal automatically if URL has ?qrType=asset
  useEffect(() => {
    if (typeof window === "undefined" || farms.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("qrType") === "asset") {
      const targetFarmId = params.get("farmId");
      const targetFarm = farms.find((f) => f.id === targetFarmId) || farms[0];
      if (targetFarm) {
        setAssetManagerFarm(targetFarm);
      }
    }
  }, [farms]);

  const handleAddAsset = (newAsset: Omit<FarmAsset, "id">) => {
    const created: FarmAsset = {
      ...newAsset,
      id: `asset-${Date.now()}`,
    };
    setFarmAssets((prev) => [created, ...prev]);
  };

  const handleReassignAsset = (
    assetId: string,
    targetFarmId: string,
    targetFarmName: string
  ) => {
    setFarmAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? {
              ...a,
              farmId: targetFarmId,
              farmName: targetFarmName,
              qrLinkedAt: new Date().toISOString().split("T")[0],
            }
          : a
      )
    );
  };

  const handleUpdateAssetCondition = (
    assetId: string,
    condition: FarmAssetCondition
  ) => {
    setFarmAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? {
              ...a,
              condition,
              lastInspectedDate: new Date().toISOString().split("T")[0],
            }
          : a
      )
    );
  };

  const handleDeleteAsset = (assetId: string) => {
    setFarmAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  // Form state
  const [name, setName] = useState("");
  const [province, setProvince] = useState("Amajyaruguru");
  const [district, setDistrict] = useState("Musanze");
  const [sector, setSector] = useState("Kinigi");
  const [cell, setCell] = useState("");
  const [village, setVillage] = useState("");
  const [agroZone, setAgroZone] = useState("Birunga Volcanic Highlands");
  const [altitudeMeters, setAltitudeMeters] = useState("2240");
  const [latitudeInput, setLatitudeInput] = useState("-1.4824");
  const [longitudeInput, setLongitudeInput] = useState("29.5892");
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | undefined>(3.8);
  const [gpsCapturedAt, setGpsCapturedAt] = useState<string | undefined>(undefined);
  const [sizeHa, setSizeHa] = useState("0.5");
  const [soilType, setSoilType] = useState("Ubutaka bw'Amakoro (Volcanic)");
  const [irrigationType, setIrrigationType] = useState<"rainfed" | "irrigated" | "swamp">("rainfed");
  const [mainCropsInput, setMainCropsInput] = useState("Ibirayi, Ibishyimbo");
  const [notes, setNotes] = useState("");

  const getScaleTier = (ha: number): ProductionScale => {
    if (ha < 0.5) return "subsistence";
    if (ha <= 2.0) return "semi_commercial";
    if (ha <= 5.0) return "medium_commercial";
    return "large_commercial";
  };

  const getScaleBadge = (scale?: ProductionScale, ha?: number) => {
    const s = scale || (ha ? getScaleTier(ha) : "subsistence");
    switch (s) {
      case "subsistence":
        return {
          labelRw: "Umuhinzi w'Ubutaka Buto (<0.5 Ha)",
          labelEn: "Smallholder / Subsistence (<0.5 Ha)",
          color: "bg-stone-100 text-stone-700 border-stone-300",
        };
      case "semi_commercial":
        return {
          labelRw: "Umuhinzi w'Umucuruzi Wigenga (0.5 - 2 Ha)",
          labelEn: "Emerging Semi-Commercial (0.5 - 2 Ha)",
          color: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
        };
      case "medium_commercial":
        return {
          labelRw: "Ubuhinzi Bwagutse bwo Kugurisha (2 - 5 Ha)",
          labelEn: "Medium Scale Commercial (2 - 5 Ha)",
          color: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700",
        };
      case "large_commercial":
        return {
          labelRw: "Ikigo Kinini cy'Ubuhinzi (>5 Ha)",
          labelEn: "Large Scale Agri-Enterprise (>5 Ha)",
          color: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700",
        };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const crops = mainCropsInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const parsedHa = parseFloat(sizeHa) || 0.5;
    const parsedLat = parseFloat(latitudeInput);
    const parsedLng = parseFloat(longitudeInput);

    onAddFarm({
      name: name.trim(),
      province,
      district,
      sector: sector.trim(),
      cell: cell.trim() || undefined,
      village: village.trim() || undefined,
      agroZone,
      altitudeMeters: parseInt(altitudeMeters) || undefined,
      latitude: !isNaN(parsedLat) ? parsedLat : undefined,
      longitude: !isNaN(parsedLng) ? parsedLng : undefined,
      gpsAccuracyMeters: !isNaN(parsedLat) && !isNaN(parsedLng) ? gpsAccuracyMeters || 4.0 : undefined,
      gpsCapturedAt: !isNaN(parsedLat) && !isNaN(parsedLng) ? gpsCapturedAt || new Date().toISOString() : undefined,
      sizeHa: parsedHa,
      scaleTier: getScaleTier(parsedHa),
      soilType,
      irrigationType,
      mainCrops: crops.length > 0 ? crops : ["Ibirayi"],
      notes: notes.trim(),
    });

    setName("");
    setNotes("");
    setIsModalOpen(false);
  };

  const rwandanDistricts = [
    "Musanze", "Nyabihu", "Rubavu", "Burera", "Gicumbi", "Rulindo", 
    "Nyagatare", "Gatsibo", "Kayonza", "Rwamagana", "Kirehe", "Ngoma", "Bugesera",
    "Huye", "Nyamagabe", "Nyanza", "Ruhango", "Muhanga", "Kamonyi", "Gisagara",
    "Gasabo", "Kicukiro", "Nyarugenge", "Karongi", "Rutsiro", "Nyamasheke", "Rusizi"
  ];

  const agroZonesList = [
    "Birunga Volcanic Highlands (Imisozi y'Ibirunga)",
    "Eastern Savanna & Dry Plains (Imisozi y'Uburasirazuba)",
    "Southern Central Plateau (Imisozi yo Hagati)",
    "Buberuka Highlands (Amajyaruguru y'Uburasirazuba)",
    "Congo-Nile Watershed Ridge (Urutare rwa Congo-Nile)",
    "Lake Kivu Shoreline & Lowlands (Inkengero z'Ikiyaga cya Kivu)",
    "Bugesera Agro-Ecological Depression (Amayaga & Bugesera)",
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            {t.farmsTitle}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {language === "rw"
              ? "Ubutaka, Akarere, Aho buherereye (Location) n'ikigero cy'umusaruro (Production Scale)"
              : "Farm parcels, administrative location, agro-ecological zones, and production scale classification."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => {
                setMapViewType("soilHeatmap");
                setShowGpsMap(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                showGpsMap && mapViewType === "soilHeatmap"
                  ? "bg-white dark:bg-stone-900 text-rose-700 dark:text-amber-300 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-amber-400" />
              <span>
                {language === "rw" ? "Ubuzima bw'Ubutaka (Heatmap)" : "Soil Health Heatmap"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMapViewType("farmMap");
                setShowGpsMap(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                showGpsMap && mapViewType === "farmMap"
                  ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{language === "rw" ? "Ikarita y'Imirima" : "Farm Map"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMapViewType("activityGps");
                setShowGpsMap(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                showGpsMap && mapViewType === "activityGps"
                  ? "bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {language === "rw" ? "Imirima & Imirimo" : "Parcels + Activities"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowGpsMap(!showGpsMap)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !showGpsMap
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {showGpsMap
                ? language === "rw"
                  ? "Hisha"
                  : "Hide"
                : language === "rw"
                ? "Erekana"
                : "Show"}
            </button>
          </div>

          {onOpenParcelQr && (
            <button
              type="button"
              onClick={() => onOpenParcelQr(farms[0] || null, "scanner")}
              className="flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>
                {language === "rw"
                  ? "Sikana QR & Amateka"
                  : "Scan Parcel QR & History"}
              </span>
            </button>
          )}

          {onOpenShareFarmModal && (
            <button
              onClick={() => onOpenShareFarmModal()}
              className="flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm transition-all shadow-xs"
            >
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{language === "rw" ? "Ikipe n'Uburenganzira" : "Team & Parcel Access"}</span>
              {teamMembers && teamMembers.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-xs">
                  {teamMembers.length}
                </span>
              )}
            </button>
          )}

          {!isViewOnly && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>{t.addFarm}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Soil Health Heatmap / Farm Map / GPS Parcel Visualization */}
      {showGpsMap && (
        mapViewType === "soilHeatmap" ? (
          <ParcelSoilHealthHeatmap
            language={language}
            farms={farms}
            selectedFarmId={
              selectedMapFarmId === "all" ? farms[0]?.id || "" : selectedMapFarmId
            }
            onSelectFarm={(id) => setSelectedMapFarmId(id)}
            onScheduleRemediation={onAddActivity}
          />
        ) : mapViewType === "farmMap" ? (
          <FarmMap
            language={language}
            farms={farms}
            selectedFarmId={selectedMapFarmId}
            onSelectFarm={(id) => setSelectedMapFarmId(id)}
            onOpenAddFarm={!isViewOnly ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <FarmActivityGpsMap
            language={language}
            farms={farms}
            activities={activities}
            selectedFarmId={selectedMapFarmId}
            onSelectFarm={(id) => setSelectedMapFarmId(id)}
            onOpenAddFarm={!isViewOnly ? () => setIsModalOpen(true) : undefined}
            onUpdateActivityStatus={onUpdateActivityStatus}
          />
        )
      )}

      {/* Farm Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farms.map((farm) => {
          const scaleBadge = getScaleBadge(farm.scaleTier, farm.sizeHa);
          return (
            <div
              key={farm.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs hover:border-emerald-600 dark:hover:border-emerald-500 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image / Header bar */}
                <div className="h-36 w-full relative bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <img
                    src={farm.imageUrl || "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=500&auto=format&fit=crop&q=80"}
                    alt={farm.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/50">
                        {farm.agroZone || `${farm.district} Zone`}
                      </span>
                      <h3 className="text-base font-black text-white mt-1 leading-tight">
                        {farm.name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3.5">
                  {/* Location & Administrative Hierarchy */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 text-xs text-stone-600 dark:text-stone-300">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white">
                          {farm.district}, Umurenge wa {farm.sector}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {farm.cell ? `Akagari: ${farm.cell}` : ""} {farm.village ? `• ${farm.village}` : ""} {farm.province ? `(${farm.province})` : ""}
                        </p>
                      </div>
                    </div>
                    {!isViewOnly ? (
                      <button
                        onClick={() => onDeleteFarm(farm.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold flex items-center space-x-1">
                        <ShieldAlert className="w-3 h-3 text-amber-500" />
                        <span>Reba Gusa</span>
                      </span>
                    )}
                  </div>

                  {/* Production Scale Badge & Stored GPS Coordinates */}
                  <div className="pt-1 space-y-2">
                    <div className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 ${scaleBadge.color}`}>
                      <Gauge className="w-3.5 h-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {language === "rw" ? scaleBadge.labelRw : scaleBadge.labelEn}
                      </span>
                    </div>

                    {(() => {
                      const gps = resolveFarmCoords(farm);
                      return (
                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 text-[11px]">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-mono font-semibold text-stone-700 dark:text-stone-200 truncate">
                              {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                              ±{gps.accuracy}m
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMapFarmId(farm.id);
                              setMapViewType("farmMap");
                              setShowGpsMap(true);
                            }}
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                          >
                            {language === "rw" ? "Ku Ikarita" : "View on Map"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                      <span className="text-stone-400 block font-medium">{t.landSize}</span>
                      <span className="font-black text-stone-900 dark:text-white text-sm">
                        {farm.sizeHa} {t.hectares}
                      </span>
                    </div>

                    <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                      <span className="text-stone-400 block font-medium">Ubutumburuke (Altitude)</span>
                      <span className="font-bold text-stone-900 dark:text-white flex items-center space-x-1 mt-0.5">
                        <Mountain className="w-3.5 h-3.5 text-amber-500" />
                        <span>{farm.altitudeMeters || 2200} m</span>
                      </span>
                    </div>
                  </div>

                  {/* Irrigation & Soil */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 px-2 py-1.5 rounded-lg border border-stone-100 dark:border-stone-800">
                      <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate font-semibold">
                        {farm.irrigationType === "rainfed"
                          ? t.rainfed
                          : farm.irrigationType === "irrigated"
                          ? t.irrigated
                          : t.swamp}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 px-2 py-1.5 rounded-lg border border-stone-100 dark:border-stone-800">
                      <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate font-semibold">{farm.soilType}</span>
                    </div>
                  </div>

                  {/* Main Crops */}
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      {t.mainCrops}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {farm.mainCrops.map((crop, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800"
                        >
                          <Sprout className="w-3 h-3 text-emerald-600" />
                          <span>{crop}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Parcel Collaboration & Assigned Team */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold text-stone-400">
                        {language === "rw" ? "Ikipe:" : "Team:"}
                      </span>
                      {(() => {
                        const assignedMembers = teamMembers.filter(
                          (m) =>
                            m.assignedFarmIds.length === 0 ||
                            m.assignedFarmIds.includes(farm.id)
                        );
                        if (assignedMembers.length === 0) {
                          return (
                            <span className="text-[11px] text-stone-400 italic">
                              {language === "rw" ? "Ntawe urashyirwamo" : "None"}
                            </span>
                          );
                        }
                        return (
                          <div className="flex items-center space-x-1">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {assignedMembers.slice(0, 3).map((m) => (
                                <img
                                  key={m.id}
                                  src={
                                    m.avatarUrl ||
                                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                                  }
                                  alt={m.name}
                                  title={`${m.name} (${m.role} - ${m.permission})`}
                                  className="w-5 h-5 rounded-full border border-white dark:border-stone-800 object-cover"
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              {assignedMembers.length}{" "}
                              {language === "rw" ? "bagenzura" : "assigned"}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {onOpenShareFarmModal && (
                      <button
                        onClick={() => onOpenShareFarmModal(farm.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800 transition-colors shadow-2xs"
                        title={
                          language === "rw"
                            ? "Sangiza uburenganzira bw'uyu murima"
                            : "Share access to this parcel"
                        }
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{language === "rw" ? "Sangiza" : "Invite"}</span>
                      </button>
                    )}
                  </div>

                  {/* Parcel Soil Health Heatmap Mini Gradient Preview & Action */}
                  {(() => {
                    const zones = computeParcelSoilZones(farm, "live_7d");
                    const avgScore = Math.round(
                      zones.reduce((s, z) => s + z.compositeScore, 0) / zones.length
                    );
                    const attentionList = zones.filter((z) => z.status === "attention");
                    return (
                      <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-600 dark:text-stone-300 font-bold flex items-center space-x-1.5">
                            <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>
                              {language === "rw"
                                ? "Ubuzima bw'Ubutaka (Heatmap)"
                                : "Soil Health Heatmap"}
                            </span>
                          </span>
                          <span className="font-mono font-black text-xs text-stone-900 dark:text-white">
                            {avgScore}/100 ·{" "}
                            <span
                              className={
                                attentionList.length > 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }
                            >
                              {attentionList.length > 0
                                ? language === "rw"
                                  ? `${attentionList.length} Bikeneye Ubufasha`
                                  : `${attentionList.length} Need Attention`
                                : language === "rw"
                                ? "Byose ni Byiza"
                                : "All Optimal"}
                            </span>
                          </span>
                        </div>

                        {/* 12-Zone Color Gradient Overlay Strip */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMapFarmId(farm.id);
                            setMapViewType("soilHeatmap");
                            setShowGpsMap(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-full group space-y-1 text-left cursor-pointer"
                          title={
                            language === "rw"
                              ? "Kanda urebe ikarita y'amabara y'ubuzima bw'ubutaka kuri uyu murima"
                              : "Click to inspect full Soil Health Heatmap overlay for this parcel"
                          }
                        >
                          <div className="grid grid-cols-12 gap-0.5 h-2.5 rounded-md overflow-hidden border border-stone-300 dark:border-stone-700">
                            {zones.map((z) => (
                              <div
                                key={z.zoneId}
                                className={
                                  z.status === "attention"
                                    ? "bg-rose-600"
                                    : z.status === "watch"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 font-semibold">
                            <span>
                              {attentionList.length > 0
                                ? language === "rw"
                                  ? `Ibice bikeneye kwitabwaho: ${attentionList
                                      .map((z) => z.zoneId)
                                      .join(", ")}`
                                  : `Attention zones: ${attentionList
                                      .map((z) => z.zoneId)
                                      .join(", ")}`
                                : language === "rw"
                                ? "Ibice 12 byose bifite ubuhehere na pH nziza"
                                : "All 12 sub-zones within healthy range"}
                            </span>
                            <span className="underline shrink-0">
                              {language === "rw" ? "Fungura Heatmap →" : "Open Heatmap →"}
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Physical Equipment & Tools Linked via QR Summary */}
                  {(() => {
                    const parcelAssets = farmAssets.filter((a) => a.farmId === farm.id);
                    const totalValue = parcelAssets.reduce(
                      (sum, a) => sum + a.purchaseValueRwf,
                      0
                    );
                    return (
                      <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500 dark:text-stone-400 font-semibold flex items-center space-x-1.5">
                            <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>
                              {language === "rw"
                                ? `Ibikoresho bya QR (${parcelAssets.length})`
                                : `QR Linked Assets (${parcelAssets.length})`}
                            </span>
                          </span>
                          <span className="font-bold text-stone-800 dark:text-stone-200 tabular-nums text-[11px]">
                            {totalValue > 0 ? `${totalValue.toLocaleString()} RWF` : "—"}
                          </span>
                        </div>

                        {parcelAssets.length > 0 && (
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                            {parcelAssets
                              .slice(0, 2)
                              .map((a) => `${a.assetTagCode} (${a.name.split("(")[0].trim()})`)
                              .join(" · ")}
                            {parcelAssets.length > 2 ? ` +${parcelAssets.length - 2}` : ""}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setAssetManagerFarm(farm)}
                          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>
                            {language === "rw"
                              ? "Manage Assets (Ibikoresho & QR)"
                              : "Manage Assets"}
                          </span>
                          <QrCode className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Farm Parcel QR Code & Direct Scanned Details Action Bar */}
                  {onOpenParcelQr && (
                    <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenParcelQr(farm, "qr_label")}
                        className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{language === "rw" ? "QR y'Umurima" : "Parcel QR Code"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenParcelQr(farm, "details")}
                        className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        <span>{language === "rw" ? "Amakuru Arambuye" : "Parcel Details"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Farm Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">{t.addFarm}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t.farmName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="urugero: Umurima w'Ibirayi wa Kinigi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              {/* Administrative Location Hierarchy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Intara (Province)
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                  >
                    <option value="Amajyaruguru">Amajyaruguru (Northern)</option>
                    <option value="Uburasirazuba">Uburasirazuba (Eastern)</option>
                    <option value="Amajyepfo">Amajyepfo (Southern)</option>
                    <option value="Iburengerazuba">Iburengerazuba (Western)</option>
                    <option value="Umujyi wa Kigali">Umujyi wa Kigali</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    {t.district} *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      const nextDist = e.target.value;
                      setDistrict(nextDist);
                      const distCoords = RWANDA_DISTRICT_COORDS[nextDist];
                      if (distCoords) {
                        setProvince(distCoords.province);
                        setAltitudeMeters(String(distCoords.alt));
                        setLatitudeInput(String(distCoords.lat));
                        setLongitudeInput(String(distCoords.lng));
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                  >
                    {rwandanDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1 text-xs">
                    Umurenge (Sector) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Kinigi"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1 text-xs">
                    Akagari (Cell)
                  </label>
                  <input
                    type="text"
                    placeholder="Nyange"
                    value={cell}
                    onChange={(e) => setCell(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1 text-xs">
                    Umudugudu
                  </label>
                  <input
                    type="text"
                    placeholder="Kagano"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden text-xs"
                  />
                </div>
              </div>

              {/* Agro-ecological Zone */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Agro-Ecological Zone (Zone d'Agro-écologie)
                </label>
                <select
                  value={agroZone}
                  onChange={(e) => setAgroZone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  {agroZonesList.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              {/* GPS Geolocation Capture & Interactive Map Pin Picker */}
              <GpsCoordinatePicker
                language={language}
                latitude={latitudeInput}
                longitude={longitudeInput}
                accuracyMeters={gpsAccuracyMeters}
                districtContext={district}
                onCoordinatesChange={(fix) => {
                  setLatitudeInput(String(fix.latitude));
                  setLongitudeInput(String(fix.longitude));
                  setGpsAccuracyMeters(fix.accuracyMeters);
                  setGpsCapturedAt(fix.capturedAt);
                  if (fix.altitudeMeters) {
                    setAltitudeMeters(String(fix.altitudeMeters));
                  }
                }}
                onClear={() => {
                  setLatitudeInput("");
                  setLongitudeInput("");
                  setGpsAccuracyMeters(undefined);
                  setGpsCapturedAt(undefined);
                }}
              />

              {/* Land Size & Production Scale Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    {t.landSize} (Hectares) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    required
                    value={sizeHa}
                    onChange={(e) => setSizeHa(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ubutumburuke (Altitude Meters)
                  </label>
                  <input
                    type="number"
                    value={altitudeMeters}
                    onChange={(e) => setAltitudeMeters(e.target.value)}
                    placeholder="2240"
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>
              </div>

              {/* Production Scale Auto Calculation Note */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                  Ikigero cy'Umusaruro (Production Scale):
                </span>
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                  {getScaleBadge(undefined, parseFloat(sizeHa) || 0.5).labelRw}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    {t.irrigation}
                  </label>
                  <select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                  >
                    <option value="rainfed">{t.rainfed}</option>
                    <option value="irrigated">{t.irrigated}</option>
                    <option value="swamp">{t.swamp}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    {t.soilType}
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                  >
                    <option value="Ubutaka bw'Amakoro (Volcanic)">{t.soilVolcanic}</option>
                    <option value="Urwondo rwo mu gishanga (Clay / Wetland)">{t.soilClay}</option>
                    <option value="Umusenyi n'urusyo (Sandy Loam)">{t.soilSandy}</option>
                    <option value="Ifumbire y'ishyamba n'uruvange (Rich Loam)">{t.soilLoam}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t.mainCrops} (Gabanya n'akamenyetso ka vergire ',')
                </label>
                <input
                  type="text"
                  placeholder="Ibirayi (Kinigi), Ibishyimbo"
                  value={mainCropsInput}
                  onChange={(e) => setMainCropsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parcel Physical Asset & Equipment QR Manager Modal */}
      {assetManagerFarm && (
        <ParcelAssetManagerModal
          isOpen={Boolean(assetManagerFarm)}
          onClose={() => setAssetManagerFarm(null)}
          language={language}
          farm={assetManagerFarm}
          allFarms={farms}
          assets={farmAssets}
          onSelectFarm={(nextFarm) => setAssetManagerFarm(nextFarm)}
          onAddAsset={handleAddAsset}
          onReassignAsset={handleReassignAsset}
          onUpdateAssetCondition={handleUpdateAssetCondition}
          onDeleteAsset={handleDeleteAsset}
          isViewOnly={isViewOnly}
        />
      )}
    </div>
  );
};
