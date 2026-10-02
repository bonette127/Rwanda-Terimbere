import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  Language,
  ParcelSoilSensorReading,
} from "../types";
import { resolveFarmCoords } from "./FarmActivityGpsMap";
import {
  Flame,
  Droplets,
  FlaskConical,
  Sprout,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Layers,
  Sliders,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Radio,
} from "lucide-react";

export type SoilHeatmapMetric = "composite" | "moisture" | "ph" | "nitrogen";
export type HistoricalWindowKey = "live_7d" | "30d_avg" | "90d_season_start" | "180d_prev_season";

export interface SubPlotZoneData {
  zoneId: string; // e.g. "A1", "A2", ... "C4"
  row: number;
  col: number;
  labelRw: string;
  labelEn: string;
  sensorNodeId: string;
  moisturePct: number; // % VWC
  phLevel: number; // 4.5 - 7.0
  nitrogenMgKg: number; // 18 - 95 mg/kg
  ecDsM: number; // 0.4 - 2.4 dS/m
  soilTempC: number;
  compositeScore: number; // 0 - 100
  status: "optimal" | "watch" | "attention";
  historicalScores: { period: string; score: number; moisture: number; ph: number }[];
  issueTitleRw: string;
  issueTitleEn: string;
  remediationRw: string;
  remediationEn: string;
  recommendedInputRw: string;
  recommendedInputEn: string;
}

interface ParcelSoilHealthHeatmapProps {
  language: Language;
  farms: Farm[];
  selectedFarmId: string;
  onSelectFarm: (farmId: string) => void;
  onScheduleRemediation?: (activity: Omit<FarmActivity, "id">) => void;
}

const ROW_LABELS = ["A", "B", "C"];
const COL_LABELS = ["1", "2", "3", "4"];

/**
 * Deterministically generates 12 micro-zone (3x4 grid) historical sensor readings for a parcel,
 * incorporating any live IoT / Manual sensor reading stored in localStorage.
 */
export function computeParcelSoilZones(
  farm: Farm,
  timeframe: HistoricalWindowKey,
  liveReading?: ParcelSoilSensorReading
): SubPlotZoneData[] {
  const isMusanze = farm.district.toLowerCase().includes("musanze");
  const isNyagatare = farm.district.toLowerCase().includes("nyagatare");

  // Timeframe modifiers representing historical sensor progression
  const timeOffsets: Record<
    HistoricalWindowKey,
    { moistureShift: number; phShift: number; nShift: number }
  > = {
    live_7d: { moistureShift: 0, phShift: 0, nShift: 0 },
    "30d_avg": { moistureShift: 4, phShift: -0.1, nShift: -5 },
    "90d_season_start": { moistureShift: -7, phShift: -0.25, nShift: -12 },
    "180d_prev_season": { moistureShift: -10, phShift: -0.35, nShift: -16 },
  };

  const shift = timeOffsets[timeframe];

  // Base agro-zone characteristics from historical sensor logs
  const baseMoisture = liveReading
    ? liveReading.moisturePercentage
    : isMusanze
    ? 68
    : isNyagatare
    ? 41
    : 58;

  const basePh = isMusanze ? 5.35 : isNyagatare ? 6.15 : 5.55;
  const baseNitrogen = isMusanze ? 64 : isNyagatare ? 48 : 56;
  const baseEc = liveReading ? liveReading.ecDsM : isMusanze ? 1.35 : 1.05;

  // Spatial variation across the 3x4 parcel grid (upper slope row A drains faster & leaches nutrients; lower basin row C retains moisture)
  const spatialProfiles = [
    // Row A: Upper Slope / North Ridge (more leaching & run-off -> needs attention)
    { r: 0, c: 0, mMod: -16, phMod: -0.45, nMod: -22, slopeRw: "Ubushorishori bw'Amajyaruguru-Iburengerazuba", slopeEn: "NW Upper Terrace Ridge" },
    { r: 0, c: 1, mMod: -19, phMod: -0.55, nMod: -25, slopeRw: "Ubushorishori bwo Hagati (Ahahanamye)", slopeEn: "North-Central Steep Crest" },
    { r: 0, c: 2, mMod: -11, phMod: -0.25, nMod: -14, slopeRw: "Ubushorishori bw'Iburasirazuba", slopeEn: "NE Upper Terrace" },
    { r: 0, c: 3, mMod: -6, phMod: -0.15, nMod: -8, slopeRw: "Imbibi z'Iburasirazuba (Amajyaruguru)", slopeEn: "NE Boundary Strip" },
    // Row B: Mid-Parcel Core Cultivation Zone
    { r: 1, c: 0, mMod: -4, phMod: -0.1, nMod: -5, slopeRw: "Hagati mu Murima (Iburengerazuba)", slopeEn: "West Mid-Slope Bench" },
    { r: 1, c: 1, mMod: 5, phMod: 0.25, nMod: 12, slopeRw: "Umutima w'Umurima ( hagati)", slopeEn: "Central Core Plot" },
    { r: 1, c: 2, mMod: 8, phMod: 0.3, nMod: 15, slopeRw: "Hagati mu Murima (Iburasirazuba)", slopeEn: "East Core Bench" },
    { r: 1, c: 3, mMod: -14, phMod: -0.35, nMod: -18, slopeRw: " Inkengero y'Umuhanda (Iburasirazuba)", slopeEn: "East Windward Edge" },
    // Row C: Lower Basin / Southern Foot-Slope
    { r: 2, c: 0, mMod: 7, phMod: 0.15, nMod: 9, slopeRw: " Ikibaya cy'Amajyepfo-Iburengerazuba", slopeEn: "SW Lower Foot-Slope" },
    { r: 2, c: 1, mMod: 11, phMod: 0.35, nMod: 18, slopeRw: "Ahakusanyirizwa Ifumbire (Amajyepfo)", slopeEn: "South fertile Accumulation Zone" },
    { r: 2, c: 2, mMod: 9, phMod: 0.2, nMod: 14, slopeRw: "Umugende w'Amazi w'Amajyepfo", slopeEn: "SE Moisture Retention Basin" },
    { r: 2, c: 3, mMod: -8, phMod: -0.4, nMod: -12, slopeRw: "Imbibi z'Amajyepfo-Iburasirazuba", slopeEn: "SE Drainage Outlet Corner" },
  ];

  const districtCode = (farm.district || "RWA").slice(0, 3).toUpperCase();

  return spatialProfiles.map((cell, idx) => {
    const zoneId = `${ROW_LABELS[cell.r]}${COL_LABELS[cell.c]}`;
    const moisturePct = Math.max(
      16,
      Math.min(92, Math.round(baseMoisture + cell.mMod + shift.moistureShift))
    );
    const phLevel =
      Math.round(
        Math.max(4.5, Math.min(7.2, basePh + cell.phMod + shift.phShift)) * 100
      ) / 100;
    const nitrogenMgKg = Math.max(
      18,
      Math.min(96, Math.round(baseNitrogen + cell.nMod + shift.nShift))
    );
    const ecDsM =
      Math.round(Math.max(0.4, Math.min(2.4, baseEc + cell.nMod * 0.015)) * 100) /
      100;
    const soilTempC = Math.round((isNyagatare ? 24.5 : 17.8) - cell.mMod * 0.08);

    // Sub-scores (0 - 100)
    // Moisture optimal: 52% - 78%
    const moistureScore =
      moisturePct >= 50 && moisturePct <= 80
        ? 92
        : moisturePct < 50
        ? Math.max(18, Math.round(moisturePct * 1.75))
        : Math.max(55, 100 - (moisturePct - 80) * 2);

    // pH optimal: 5.6 - 6.6
    const phScore =
      phLevel >= 5.6 && phLevel <= 6.6
        ? 94
        : phLevel < 5.6
        ? Math.max(20, Math.round(90 - (5.6 - phLevel) * 68))
        : Math.max(50, Math.round(90 - (phLevel - 6.6) * 45));

    // Nitrogen optimal: >= 55 mg/kg
    const nScore = Math.max(20, Math.min(98, Math.round(nitrogenMgKg * 1.35)));

    const compositeScore = Math.round(
      moistureScore * 0.4 + phScore * 0.32 + nScore * 0.28
    );

    const status: "optimal" | "watch" | "attention" =
      compositeScore < 56 || moisturePct < 36 || phLevel < 5.15
        ? "attention"
        : compositeScore < 74 || moisturePct < 46 || phLevel < 5.5
        ? "watch"
        : "optimal";

    // Identify primary issue and RAB prescription for zones needing attention
    let issueTitleRw = "Ubutaka buri mu rugero rwiza (Optimal Soil Health)";
    let issueTitleEn = "Optimal Root-Zone Balance";
    let remediationRw =
      "Komeza gukurikirana ubuhehere buri cyumweru no kurinda isuri ku materasi.";
    let remediationEn =
      "Maintain current mulching and routine weekly sensor verification.";
    let recommendedInputRw = "Nta gikorwa cyihutirwa gikenewe";
    let recommendedInputEn = "No immediate corrective input required";

    if (moisturePct < 38) {
      issueTitleRw = `Umwuma mu Mizi: Ubuhehere buri hasi cyane (${moisturePct}% VWC)`;
      issueTitleEn = `Root-Zone Moisture Deficit (${moisturePct}% VWC)`;
      remediationRw = `Igice cya ${zoneId} (${cell.slopeRw}) cyatakaje amazi menshi. Tangiza kuhira ku bitonyanga (Drip) cyangwa usasire n'ibyatsi byumye (Mulching cm 5).`;
      remediationEn = `Sub-zone ${zoneId} (${cell.slopeEn}) shows historical moisture depletion. Run targeted drip irrigation and apply 5cm organic grass mulch.`;
      recommendedInputRw = "Amazi yo kuhira 18mm + Gusasira (Mulching)";
      recommendedInputEn = "18mm Targeted Irrigation + Organic Mulch";
    } else if (phLevel < 5.25) {
      issueTitleRw = `Aside Nyinshi mu Butaka (pH ${phLevel} — Acidic Pocket)`;
      issueTitleEn = `High Soil Acidity Pocket (pH ${phLevel})`;
      remediationRw = `Igipimo cya pH (${phLevel}) muri ${zoneId} gituma imizi idakurura Fosifore (P). Shyiramo ishwagara y'ubuhinzi (Agricultural Lime) mbere yo gutera cyangwa kubagara.`;
      remediationEn = `Low pH (${phLevel}) in ${zoneId} locks up Phosphorus uptake. Incorporate Dolomitic Agricultural Lime and well-decomposed compost.`;
      recommendedInputRw = "Ishwagara (Agricultural Lime): 250 kg kuri iki gice";
      recommendedInputEn = "Agricultural Lime (Travertine): 2.0 T/Ha eq.";
    } else if (nitrogenMgKg < 42) {
      issueTitleRw = `Igabanuka ry'Intungamubiri za Azote (${nitrogenMgKg} mg/kg N)`;
      issueTitleEn = `Nitrogen & Organic Matter Leaching (${nitrogenMgKg} mg/kg N)`;
      remediationRw = `Isuri y'amazi ku bushorishori (${zoneId}) yagabanyije Azote. Shyiramo ifumbire y'imborera iboze neza iherekejwe na NPK 17-17-17 cyangwa Urea.`;
      remediationEn = `Slope runoff in ${zoneId} leached available nitrogen. Apply composted farmyard manure + split Urea / NPK 17-17-17 side-dressing.`;
      recommendedInputRw = "Imborera iboze + NPK 17-17-17 (Top-dress)";
      recommendedInputEn = "Composted Manure + NPK 17-17-17 Spot Application";
    } else if (status === "watch") {
      issueTitleRw = `Ubuhehere n'Intungamubiri biraringaniye (Score ${compositeScore}/100)`;
      issueTitleEn = `Moderate Soil Watch Zone (Score ${compositeScore}/100)`;
      remediationRw = `Genzura ko amazi acengera neza muri ${zoneId} kandi wongeremo imborera mu gihe cyo kubagara.`;
      remediationEn = `Monitor infiltration depth in ${zoneId} and supplement with organic matter during weeding.`;
      recommendedInputRw = "Ifumbire y'imborera (Compost maintenance)";
      recommendedInputEn = "Routine Organic Compost Top-up";
    }

    const historicalScores = [
      {
        period: "180d",
        score: Math.max(22, compositeScore - 11),
        moisture: Math.max(15, moisturePct - 9),
        ph: Math.round((phLevel - 0.3) * 100) / 100,
      },
      {
        period: "90d",
        score: Math.max(25, compositeScore - 7),
        moisture: Math.max(18, moisturePct - 6),
        ph: Math.round((phLevel - 0.2) * 100) / 100,
      },
      {
        period: "30d",
        score: Math.max(28, compositeScore - 3),
        moisture: Math.min(90, moisturePct + 3),
        ph: Math.round((phLevel - 0.08) * 100) / 100,
      },
      {
        period: "Now",
        score: compositeScore,
        moisture: moisturePct,
        ph: phLevel,
      },
    ];

    return {
      zoneId,
      row: cell.r,
      col: cell.c,
      labelRw: cell.slopeRw,
      labelEn: cell.slopeEn,
      sensorNodeId: `SN-${districtCode}-${zoneId}-${String(idx + 1).padStart(2, "0")}`,
      moisturePct,
      phLevel,
      nitrogenMgKg,
      ecDsM,
      soilTempC,
      compositeScore,
      status,
      historicalScores,
      issueTitleRw,
      issueTitleEn,
      remediationRw,
      remediationEn,
      recommendedInputRw,
      recommendedInputEn,
    };
  });
}

export const ParcelSoilHealthHeatmap: React.FC<ParcelSoilHealthHeatmapProps> = ({
  language,
  farms,
  selectedFarmId,
  onSelectFarm,
  onScheduleRemediation,
}) => {
  const activeFarm = useMemo(
    () => farms.find((f) => f.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  const [metric, setMetric] = useState<SoilHeatmapMetric>("composite");
  const [timeframe, setTimeframe] = useState<HistoricalWindowKey>("live_7d");
  const [gradientOpacity, setGradientOpacity] = useState<number>(82);
  const [showAttentionOnly, setShowAttentionOnly] = useState<boolean>(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("A2");
  const [scheduledToast, setScheduledToast] = useState<string | null>(null);

  // Pull any live IoT / Manual sensor readings saved in localStorage so the heatmap reflects live sensor overrides
  const savedLiveReadings = useMemo<Record<string, ParcelSoilSensorReading>>(() => {
    try {
      const raw = localStorage.getItem("terimbere_parcel_soil_sensors");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [activeFarm?.id, timeframe]);

  const zones = useMemo(() => {
    if (!activeFarm) return [];
    return computeParcelSoilZones(
      activeFarm,
      timeframe,
      savedLiveReadings[activeFarm.id]
    );
  }, [activeFarm, timeframe, savedLiveReadings]);

  const attentionZones = useMemo(
    () => zones.filter((z) => z.status === "attention"),
    [zones]
  );
  const watchZones = useMemo(
    () => zones.filter((z) => z.status === "watch"),
    [zones]
  );
  const optimalZones = useMemo(
    () => zones.filter((z) => z.status === "optimal"),
    [zones]
  );

  const avgCompositeScore = useMemo(() => {
    if (zones.length === 0) return 0;
    return Math.round(
      zones.reduce((sum, z) => sum + z.compositeScore, 0) / zones.length
    );
  }, [zones]);

  const selectedZone = useMemo(
    () => zones.find((z) => z.zoneId === selectedZoneId) || attentionZones[0] || zones[0],
    [zones, selectedZoneId, attentionZones]
  );

  if (!activeFarm) return null;

  const gps = resolveFarmCoords(activeFarm);

  /**
   * Maps a zone's active metric value to a rich thermal/agronomic CSS gradient color
   */
  const getZoneHeatmapStyle = (zone: SubPlotZoneData) => {
    let normalized = zone.compositeScore; // 0 - 100
    if (metric === "moisture") {
      normalized = Math.min(100, Math.max(0, Math.round((zone.moisturePct - 15) * 1.4)));
    } else if (metric === "ph") {
      // pH 4.6 -> 20, pH 6.2 -> 95
      normalized = Math.min(100, Math.max(0, Math.round((zone.phLevel - 4.5) * 45)));
    } else if (metric === "nitrogen") {
      normalized = Math.min(100, Math.max(0, Math.round(zone.nitrogenMgKg * 1.25)));
    }

    const alpha = (gradientOpacity / 100).toFixed(2);

    if (normalized < 54 || zone.status === "attention") {
      // Crimson / Red-Orange gradient for zones needing immediate attention
      return {
        background: `radial-gradient(circle at 50% 50%, rgba(225, 29, 72, ${alpha}), rgba(190, 18, 60, ${alpha}) 65%, rgba(136, 19, 55, ${alpha}) 100%)`,
        borderColor: "rgba(251, 113, 133, 0.85)",
        badgeText: language === "rw" ? "GIKENEYE UBUFASHA" : "NEEDS ATTENTION",
        badgeClass: "bg-rose-950/90 text-rose-200 border-rose-400/60",
      };
    }

    if (normalized < 74 || zone.status === "watch") {
      // Warm Amber / Ochre gradient for moderate watch zones
      return {
        background: `radial-gradient(circle at 50% 50%, rgba(245, 158, 11, ${alpha}), rgba(217, 119, 6, ${alpha}) 68%, rgba(180, 83, 9, ${alpha}) 100%)`,
        borderColor: "rgba(251, 191, 36, 0.75)",
        badgeText: language === "rw" ? "GUKURIKIRANA" : "WATCH ZONE",
        badgeClass: "bg-amber-950/90 text-amber-200 border-amber-400/60",
      };
    }

    // Lush Emerald / Teal gradient for healthy optimal soil zones
    return {
      background: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, ${alpha}), rgba(5, 150, 105, ${alpha}) 68%, rgba(6, 78, 59, ${alpha}) 100%)`,
      borderColor: "rgba(52, 211, 153, 0.7)",
      badgeText: language === "rw" ? "MEZA CYANE" : "OPTIMAL",
      badgeClass: "bg-emerald-950/90 text-emerald-200 border-emerald-400/60",
    };
  };

  const formatMetricPrimaryValue = (zone: SubPlotZoneData) => {
    if (metric === "moisture") return `${zone.moisturePct}% VWC`;
    if (metric === "ph") return `pH ${zone.phLevel}`;
    if (metric === "nitrogen") return `${zone.nitrogenMgKg} mg/kg N`;
    return `${zone.compositeScore}/100`;
  };

  const handleCreateRemediationTask = (zone: SubPlotZoneData) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const category =
      zone.moisturePct < 38
        ? "irrigation"
        : zone.phLevel < 5.25
        ? "land_prep"
        : "fertilizing";

    onScheduleRemediation?.({
      farmId: activeFarm.id,
      farmName: activeFarm.name,
      crop: activeFarm.mainCrops[0] || "Ibihingwa",
      title: `[Zone ${zone.zoneId}] ${
        language === "rw" ? zone.issueTitleRw : zone.issueTitleEn
      } — ${language === "rw" ? zone.recommendedInputRw : zone.recommendedInputEn}`,
      category,
      dueDate: todayStr,
      status: "pending",
      assignedTo: "Field Agronomy Team",
      notes:
        language === "rw"
          ? `${zone.remediationRw} (Sensor: ${zone.sensorNodeId}, Score: ${zone.compositeScore}/100)`
          : `${zone.remediationEn} (Sensor: ${zone.sensorNodeId}, Score: ${zone.compositeScore}/100)`,
      latitude: Number((gps.lat + (1 - zone.row) * 0.0004).toFixed(5)),
      longitude: Number((gps.lng + (zone.col - 1.5) * 0.0004).toFixed(5)),
      gpsAccuracyMeters: 2.5,
    });

    setScheduledToast(
      language === "rw"
        ? `Igikorwa cyo gusana ubutaka muri Zone ${zone.zoneId} (${activeFarm.name}) cyashyizwe kuri gahunda!`
        : `Soil remediation task for Zone ${zone.zoneId} (${activeFarm.name}) added to field schedule!`
    );
    setTimeout(() => setScheduledToast(null), 4000);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Top Command Header */}
      <div className="bg-gradient-to-r from-stone-950 via-emerald-950 to-stone-900 text-white p-5 sm:p-6 border-b border-emerald-800/60 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Flame className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "IKARITA Y'UBUZIMA BW'UBUTAKA (SOIL HEALTH HEATMAP)"
                  : "PARCEL SOIL HEALTH HEATMAP · HISTORICAL SENSOR OVERLAY"}
              </span>
              {savedLiveReadings[activeFarm.id] && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-400 text-stone-950 font-mono text-[10px] font-black flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  <span>LIVE IOT SYNCED</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {activeFarm.name} — {activeFarm.district}, {activeFarm.sector} ({activeFarm.sizeHa} Ha)
            </h2>
            <p className="text-xs text-stone-300">
              {language === "rw"
                ? " amabara agaragaza ibice by'umurima bikeneye ubufasha bwihutirwa (Aside ya pH, Umwuma cyangwa Ifumbire nke) hashingiwe ku bipimo bya sensors by'amezi 6 ashize."
                : "Color gradient overlay derived from historical multi-depth soil sensor telemetry highlighting micro-zones that require targeted irrigation, liming, or NPK fertilization."}
            </p>
          </div>

          {/* Parcel Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 self-start">
            {farms.map((farm) => {
              const isSelected = farm.id === activeFarm.id;
              return (
                <button
                  key={farm.id}
                  type="button"
                  onClick={() => {
                    onSelectFarm(farm.id);
                    setSelectedZoneId("A2");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-amber-400 text-stone-950 shadow-xs"
                      : "bg-white/10 text-stone-200 hover:bg-white/20"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {farm.name} ({farm.district})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer Metric Selector & Historical Timeframe Bar */}
        <div className="pt-2 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Metric Layer Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-emerald-200 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Igipimo:" : "Heatmap Layer:"}</span>
            </span>

            {[
              {
                id: "composite" as const,
                labelRw: "Ubuzima Rusange (0-100)",
                labelEn: "Composite Health Index",
                icon: Flame,
              },
              {
                id: "moisture" as const,
                labelRw: "Ubuhehere (% VWC)",
                labelEn: "Soil Moisture (% VWC)",
                icon: Droplets,
              },
              {
                id: "ph" as const,
                labelRw: "Aside y'Ubutaka (pH)",
                labelEn: "Soil Acidity (pH)",
                icon: FlaskConical,
              },
              {
                id: "nitrogen" as const,
                labelRw: "Ifumbire & Azote (N)",
                labelEn: "Nitrogen & Fertility",
                icon: Sprout,
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = metric === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMetric(item.id)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? "bg-emerald-500 text-stone-950 shadow-2xs"
                      : "bg-stone-900/80 text-stone-300 hover:text-white border border-stone-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{language === "rw" ? item.labelRw : item.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Historical Timeframe Selector & Gradient Intensity */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-stone-300 font-semibold">
                {language === "rw" ? "Igihe:" : "Sensor History:"}
              </span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as HistoricalWindowKey)}
                className="bg-stone-900 text-white font-bold px-2.5 py-1.5 rounded-lg border border-stone-700 text-xs outline-hidden"
              >
                <option value="live_7d">
                  {language === "rw" ? "Icyumweru Gishize (Live + 7d)" : "Current Week (Live + 7d Avg)"}
                </option>
                <option value="30d_avg">
                  {language === "rw" ? "Ukwezi Gushize (30-Day Avg)" : "30-Day Sensor Average"}
                </option>
                <option value="90d_season_start">
                  {language === "rw" ? "Intangiriro y'Igihembwe (90d Ago)" : "Season Start Baseline (90d Ago)"}
                </option>
                <option value="180d_prev_season">
                  {language === "rw" ? "Igihembwe Gishize (180d Ago)" : "Previous Season (180d Ago)"}
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-700">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-stone-300">
                {language === "rw" ? "Ibara:" : "Overlay:"}
              </span>
              <input
                type="range"
                min={45}
                max={95}
                value={gradientOpacity}
                onChange={(e) => setGradientOpacity(Number(e.target.value))}
                className="w-16 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-amber-300">
                {gradientOpacity}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Remediation Toast */}
      {scheduledToast && (
        <div className="bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{scheduledToast}</span>
          </div>
          <button onClick={() => setScheduledToast(null)} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Content: Left = Visual Color Gradient Heatmap Grid, Right = Selected Zone Historical Diagnostic */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 7 COLS: PARCEL HEATMAP OVERLAY CANVAS */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary Status Bar & Attention Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                  {language === "rw" ? "impuzandengo y'ubuzima" : "Parcel Health Score"}
                </span>
                <strong className="text-base font-black font-mono text-stone-900 dark:text-white">
                  {avgCompositeScore}/100
                </strong>
              </div>
              <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">
                |
              </span>
              <div>
                <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                  {language === "rw" ? "Ibice Bikeneye Ubufasha" : "Zones Needing Attention"}
                </span>
                <strong className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                  {attentionZones.length}{" "}
                  <span className="text-xs font-semibold">
                    ({attentionZones.map((z) => z.zoneId).join(", ") || "None"})
                  </span>
                </strong>
              </div>
              <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">
                |
              </span>
              <div>
                <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                  {language === "rw" ? "Ibice Bimeze Neza" : "Optimal Zones"}
                </span>
                <strong className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {optimalZones.length} / {zones.length}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAttentionOnly((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                showAttentionOnly
                  ? "bg-rose-600 text-white"
                  : "bg-stone-200/80 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? `Erekana ahakeneye ubufasha (${attentionZones.length + watchZones.length})`
                  : `Highlight Attention Zones (${attentionZones.length + watchZones.length})`}
              </span>
            </button>
          </div>

          {/* Visual Parcel Boundary with Color Gradient Heatmap Overlay */}
          <div className="relative rounded-2xl overflow-hidden border-2 border-stone-800 shadow-lg bg-stone-950 p-4 sm:p-5">
            {/* Topographic Terrain Background Texture */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 25%, #dc2626 0%, transparent 45%), radial-gradient(circle at 75% 30%, #f59e0b 0%, transparent 45%), radial-gradient(circle at 55% 78%, #10b981 0%, transparent 55%)`,
              }}
            />

            {/* North Compass & Parcel GPS Bounds Header */}
            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-stone-300 mb-3 pb-2 border-b border-white/10">
              <span>
                ▲ N · {activeFarm.soilType} ({activeFarm.altitudeMeters || 2200}m ASL)
              </span>
              <span>
                GPS: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
              </span>
            </div>

            {/* 3x4 Micro-Zone Heatmap Grid */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {zones.map((zone) => {
                const style = getZoneHeatmapStyle(zone);
                const isSelected = selectedZone?.zoneId === zone.zoneId;
                const dimmed =
                  showAttentionOnly && zone.status === "optimal";

                return (
                  <button
                    key={zone.zoneId}
                    type="button"
                    onClick={() => setSelectedZoneId(zone.zoneId)}
                    style={{
                      background: style.background,
                      borderColor: isSelected ? "#ffffff" : style.borderColor,
                    }}
                    className={`relative rounded-xl p-3 text-left border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[112px] ${
                      isSelected
                        ? "ring-2 ring-amber-300 scale-[1.02] shadow-xl z-20"
                        : "hover:scale-[1.01]"
                    } ${dimmed ? "opacity-25" : "opacity-100"}`}
                  >
                    {/* Top Row: Zone ID + Pulsing Attention Indicator */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-black text-white bg-black/40 px-2 py-0.5 rounded-md">
                        Zone {zone.zoneId}
                      </span>

                      {zone.status === "attention" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-950/90 text-rose-200 border border-rose-400/60 text-[9px] font-black uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          <span>{language === "rw" ? "itabweho" : "Alert"}</span>
                        </span>
                      ) : zone.status === "watch" ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 text-amber-200 text-[9px] font-bold uppercase">
                          {language === "rw" ? "Reba" : "Watch"}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-200 text-[9px] font-bold uppercase">
                          OK
                        </span>
                      )}
                    </div>

                    {/* Primary Metric Value */}
                    <div className="my-1.5">
                      <div className="text-lg font-black font-mono text-white drop-shadow-xs leading-none">
                        {formatMetricPrimaryValue(zone)}
                      </div>
                      <div className="text-[10px] text-white/90 font-medium truncate mt-1">
                        {language === "rw" ? zone.labelRw : zone.labelEn}
                      </div>
                    </div>

                    {/* Sub-metrics Footer inside Heatmap Cell */}
                    <div className="pt-1.5 border-t border-white/20 flex items-center justify-between text-[10px] font-mono text-white/90">
                      <span>💧{zone.moisturePct}%</span>
                      <span>pH {zone.phLevel}</span>
                      <span>N:{zone.nitrogenMgKg}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Color Gradient Scale Legend Bar */}
            <div className="relative z-10 mt-4 pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-200">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-stone-300">
                  {language === "rw" ? "Igipimo cy'Amabara:" : "Soil Health Gradient:"}
                </span>
                <div className="w-44 h-3 rounded-md bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 border border-white/20" />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
                  <span>
                    {language === "rw"
                      ? "<55: Ahakeneye Ubufasha"
                      : "<55: Needs Attention"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  <span>
                    {language === "rw" ? "55–74: Gukurikirana" : "55–74: Watch Zone"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  <span>
                    {language === "rw" ? "75–100: Ubutaka Bwiza" : "75–100: Optimal"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: SELECTED SUB-ZONE DIAGNOSTIC & HISTORICAL SENSOR LOG */}
        {selectedZone && (
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-5 space-y-4">
            <div className="space-y-4">
              {/* Zone Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-stone-700 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-mono text-xs font-black">
                      ZONE {selectedZone.zoneId}
                    </span>
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                      {selectedZone.sensorNodeId}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white mt-1">
                    {language === "rw" ? selectedZone.labelRw : selectedZone.labelEn}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">
                    {language === "rw" ? "Amanota y'Ubutaka" : "Health Score"}
                  </span>
                  <span
                    className={`text-2xl font-black font-mono ${
                      selectedZone.status === "attention"
                        ? "text-rose-600 dark:text-rose-400"
                        : selectedZone.status === "watch"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {selectedZone.compositeScore}/100
                  </span>
                </div>
              </div>

              {/* 4 Sensor Telemetry Readout Boxes */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                    {language === "rw" ? "Ubuhehere mu Mizi" : "Root Moisture (VWC)"}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong
                      className={`text-base font-black font-mono ${
                        selectedZone.moisturePct < 38
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-stone-900 dark:text-white"
                      }`}
                    >
                      {selectedZone.moisturePct}%
                    </strong>
                    <span className="text-[10px] text-stone-400">Target: 55-75%</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                    {language === "rw" ? "Aside y'Ubutaka (pH)" : "Soil Acidity (pH)"}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong
                      className={`text-base font-black font-mono ${
                        selectedZone.phLevel < 5.3
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-stone-900 dark:text-white"
                      }`}
                    >
                      pH {selectedZone.phLevel}
                    </strong>
                    <span className="text-[10px] text-stone-400">Opt: 5.6-6.5</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                    {language === "rw" ? "Azote (Available N)" : "Available Nitrogen"}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong
                      className={`text-base font-black font-mono ${
                        selectedZone.nitrogenMgKg < 42
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-stone-900 dark:text-white"
                      }`}
                    >
                      {selectedZone.nitrogenMgKg} mg/kg
                    </strong>
                    <span className="text-[10px] text-stone-400">Opt: &gt;55</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <span className="text-stone-500 dark:text-stone-400 block text-[11px]">
                    {language === "rw" ? "Imyunyu & Ubushyuhe" : "Salinity (EC) & Temp"}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <strong className="text-base font-black font-mono text-stone-900 dark:text-white">
                      {selectedZone.ecDsM} dS/m
                    </strong>
                    <span className="text-[10px] font-mono text-stone-500">
                      {selectedZone.soilTempC}°C
                    </span>
                  </div>
                </div>
              </div>

              {/* 180-Day Historical Sensor Progression Bars */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {language === "rw"
                      ? `Amateka ya Sensor muri Zone ${selectedZone.zoneId} (Amezi 6)`
                      : `6-Month Sensor Trend for Zone ${selectedZone.zoneId}`}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedZone.historicalScores[3].score >=
                    selectedZone.historicalScores[0].score ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>
                          +
                          {selectedZone.historicalScores[3].score -
                            selectedZone.historicalScores[0].score}{" "}
                          pts
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        <span>Declining</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {selectedZone.historicalScores.map((pt) => (
                    <div
                      key={pt.period}
                      className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/70 border border-stone-200/70 dark:border-stone-700 text-center"
                    >
                      <span className="text-[10px] font-bold text-stone-400 block">
                        {pt.period}
                      </span>
                      <span className="text-xs font-black font-mono text-stone-900 dark:text-white">
                        {pt.score}/100
                      </span>
                      <span className="block text-[10px] font-mono text-stone-500 dark:text-stone-400">
                        💧{pt.moisture}% · pH {pt.ph}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostic Issue & RAB Prescription Card */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  selectedZone.status === "attention"
                    ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                    : selectedZone.status === "watch"
                    ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <div className="flex items-start space-x-2">
                  {selectedZone.status === "attention" ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <h4 className="font-black text-stone-900 dark:text-white">
                      {language === "rw"
                        ? selectedZone.issueTitleRw
                        : selectedZone.issueTitleEn}
                    </h4>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                      {language === "rw"
                        ? selectedZone.remediationRw
                        : selectedZone.remediationEn}
                    </p>
                    <div className="pt-1 font-mono text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                      {language === "rw" ? "Igikoresho / Ifumbire:" : "Recommended Input:"}{" "}
                      {language === "rw"
                        ? selectedZone.recommendedInputRw
                        : selectedZone.recommendedInputEn}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button to Schedule Zone Remediation */}
            <button
              type="button"
              onClick={() => handleCreateRemediationTask(selectedZone)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>
                {language === "rw"
                  ? `Shyira Gahunda yo Gusana Zone ${selectedZone.zoneId} mu Mirimo`
                  : `Schedule Remediation Task for Zone ${selectedZone.zoneId}`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
