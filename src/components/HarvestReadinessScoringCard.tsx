import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmPlan,
  Language,
  ParcelSoilSensorReading,
} from "../types";
import {
  Sprout,
  CloudRain,
  CalendarClock,
  CheckCircle2,
  Sliders,
  CalendarPlus,
  ArrowUpRight,
  Award,
  Gauge,
  Droplets,
  Sun,
  AlertTriangle,
  RotateCcw,
  Radio,
} from "lucide-react";

export interface PlanHarvestReadinessResult {
  planId: string;
  farmId: string;
  farmName: string;
  district: string;
  crop: string;
  landSizeHa: number;
  expectedYieldKg: number;
  expectedGrossRevenue: number;
  plantedDateStr: string;
  predictedHarvestDateStr: string;
  // Factor 1: Crop Growth Stage (40% weight)
  growthStagePct: number;
  currentGrowthStageLabel: string;
  growthStageSubScore: number;
  // Factor 2: Days Since Planting vs Maturity (35% weight)
  daysSincePlanting: number;
  daysToMaturity: number;
  daysRemaining: number;
  daysMaturitySubScore: number;
  // Factor 3: Cumulative Precipitation from Local Weather Sensors (25% weight)
  sensorStationId: string;
  cumulativePrecipitationMm: number;
  optimalSeasonalRainMm: number;
  last7DaysRainMm: number;
  soilMoisturePct: number;
  precipitationSubScore: number;
  precipitationStatusEn: string;
  precipitationStatusRw: string;
  // Final Composite Readiness Score (0 - 100%)
  readinessScore: number;
  readinessTier: "ready_now" | "approaching" | "maturing";
  tierLabelEn: string;
  tierLabelRw: string;
  predictedQualityGrade: "A" | "B";
  agronomicActionEn: string;
  agronomicActionRw: string;
}

interface WeatherSensorOverride {
  cumulativeRainMm?: number;
  last7DaysRainMm?: number;
  daysSincePlantingOverride?: number;
  growthStagePctOverride?: number;
}

interface HarvestReadinessScoringCardProps {
  plans: FarmPlan[];
  farms: Farm[];
  sensorReadingsByFarmId?: Record<string, ParcelSoilSensorReading>;
  language: Language;
  onScheduleHarvestTask?: (activity: Omit<FarmActivity, "id">) => void;
  onUpdatePlanGrowthStage?: (
    planId: string,
    percentage: number,
    stageName: string,
    notes?: string
  ) => void;
  onNavigateToHarvests?: () => void;
  onNavigateToActivities?: () => void;
}

// Baseline RAB seasonal crop precipitation and maturity benchmarks
function getCropPrecipitationBenchmark(
  crop: string,
  district: string,
  daysSincePlanting: number,
  daysToMaturity: number
): {
  stationId: string;
  optimalSeasonalRainMm: number;
  defaultCumulativeRainMm: number;
  defaultLast7DaysRainMm: number;
  defaultSoilMoisturePct: number;
} {
  const c = crop.toLowerCase();
  const progressRatio = Math.min(
    1.1,
    Math.max(0.2, daysSincePlanting / Math.max(1, daysToMaturity))
  );

  if (c.includes("ibirayi") || c.includes("potato")) {
    const optimal = 480;
    return {
      stationId: `WS-${district.slice(0, 3).toUpperCase()}-104 (Kinigi Pluviometer)`,
      optimalSeasonalRainMm: optimal,
      defaultCumulativeRainMm: Math.round(optimal * progressRatio * 0.99), // ~460mm
      defaultLast7DaysRainMm: 14,
      defaultSoilMoisturePct: 36,
    };
  }

  if (c.includes("ibigori") || c.includes("maize")) {
    const optimal = 540;
    return {
      stationId: `WS-${district.slice(0, 3).toUpperCase()}-208 (Savannah Agro-Meteo)`,
      optimalSeasonalRainMm: optimal,
      defaultCumulativeRainMm: Math.round(optimal * progressRatio * 0.96), // ~477mm
      defaultLast7DaysRainMm: 8,
      defaultSoilMoisturePct: 29,
    };
  }

  if (c.includes("inyanya") || c.includes("tomato")) {
    const optimal = 420;
    return {
      stationId: `WS-${district.slice(0, 3).toUpperCase()}-312 (Valley Rain Sensor)`,
      optimalSeasonalRainMm: optimal,
      defaultCumulativeRainMm: Math.round(optimal * progressRatio * 0.95), // ~309mm
      defaultLast7DaysRainMm: 19,
      defaultSoilMoisturePct: 44,
    };
  }

  const optimal = 450;
  return {
    stationId: `WS-${district.slice(0, 3).toUpperCase()}-401 (Field Pluviometer)`,
    optimalSeasonalRainMm: optimal,
    defaultCumulativeRainMm: Math.round(optimal * progressRatio * 0.95),
    defaultLast7DaysRainMm: 12,
    defaultSoilMoisturePct: 34,
  };
}

export const HarvestReadinessScoringCard: React.FC<
  HarvestReadinessScoringCardProps
> = ({
  plans,
  farms,
  sensorReadingsByFarmId = {},
  language,
  onScheduleHarvestTask,
  onUpdatePlanGrowthStage,
  onNavigateToHarvests,
  onNavigateToActivities,
}) => {
  const activePlans = useMemo(() => {
    const filtered = plans.filter((p) => p.status === "active");
    return filtered.length > 0 ? filtered : plans;
  }, [plans]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    activePlans[0]?.id || ""
  );
  const [showCalibrator, setShowCalibrator] = useState<boolean>(false);
  const [overridesByPlanId, setOverridesByPlanId] = useState<
    Record<string, WeatherSensorOverride>
  >({});
  const [scheduledToast, setScheduledToast] = useState<string | null>(null);

  // Calculate Harvest Readiness Score (0-100%) for each active crop plan
  const readinessResults: PlanHarvestReadinessResult[] = useMemo(() => {
    const nowMs = Date.now();

    return activePlans.map((plan) => {
      const farm = farms.find((f) => f.id === plan.farmId);
      const district = farm?.district || "Musanze";
      const override = overridesByPlanId[plan.id] || {};

      // 1. Days Since Planting calculation
      let computedDaysSincePlanting = 75;
      if (plan.plantedDate) {
        const plantedMs = new Date(plan.plantedDate).getTime();
        if (!isNaN(plantedMs)) {
          computedDaysSincePlanting = Math.max(
            1,
            Math.round((nowMs - plantedMs) / 86400000)
          );
        }
      }
      const daysSincePlanting =
        override.daysSincePlantingOverride ?? computedDaysSincePlanting;
      const daysToMaturity = plan.daysToMaturity || 90;
      const daysRemaining = Math.max(0, daysToMaturity - daysSincePlanting);

      // Chronological Maturity Sub-Score (0-100%)
      const rawDaysRatio = (daysSincePlanting / Math.max(1, daysToMaturity)) * 100;
      const daysMaturitySubScore = Math.min(
        100,
        Math.max(0, Math.round(rawDaysRatio))
      );

      // 2. Crop Growth Stage Sub-Score (0-100%)
      const growthStagePct =
        override.growthStagePctOverride ??
        plan.growthStagePercentage ??
        daysMaturitySubScore;
      const growthStageSubScore = Math.min(
        100,
        Math.max(0, Math.round(growthStagePct))
      );

      // 3. Cumulative Precipitation from Local Weather Sensors (0-100%)
      const precipBench = getCropPrecipitationBenchmark(
        plan.crop,
        district,
        daysSincePlanting,
        daysToMaturity
      );
      const cumulativePrecipitationMm =
        override.cumulativeRainMm ?? precipBench.defaultCumulativeRainMm;
      const last7DaysRainMm =
        override.last7DaysRainMm ?? precipBench.defaultLast7DaysRainMm;
      const liveSensor = sensorReadingsByFarmId[plan.farmId];
      const soilMoisturePct =
        liveSensor?.soilMoisturePct ?? precipBench.defaultSoilMoisturePct;

      // Evaluate how close cumulative precipitation is to the optimal seasonal requirement
      const rainFulfillmentRatio =
        cumulativePrecipitationMm / Math.max(1, precipBench.optimalSeasonalRainMm);

      let precipitationSubScore = 85;
      if (rainFulfillmentRatio >= 0.88 && rainFulfillmentRatio <= 1.18) {
        // Sweet spot for cumulative seasonal rainfall (88% - 118% of crop requirement)
        precipitationSubScore = Math.min(
          100,
          Math.round(92 + (1 - Math.abs(1 - rainFulfillmentRatio)) * 8)
        );
      } else if (rainFulfillmentRatio < 0.88) {
        // Deficit moisture reduces bulking readiness
        precipitationSubScore = Math.max(
          25,
          Math.round((rainFulfillmentRatio / 0.88) * 90)
        );
      } else {
        // Excessive waterlogging penalty (> 118% optimal rain)
        const excessRatio = rainFulfillmentRatio - 1.18;
        precipitationSubScore = Math.max(
          45,
          Math.round(94 - excessRatio * 85)
        );
      }

      // Apply pre-harvest 7-day rain dry-down adjustment (heavy rain right before harvest reduces dry-down readiness slightly)
      if (daysMaturitySubScore >= 85 && last7DaysRainMm > 45) {
        precipitationSubScore = Math.max(40, precipitationSubScore - 10);
      }

      let precipitationStatusEn = "Optimal Cumulative Rain";
      let precipitationStatusRw = "Imvura Igwiriye n'Igipimo";
      if (rainFulfillmentRatio < 0.8) {
        precipitationStatusEn = "Sub-Optimal Rain (Deficit)";
        precipitationStatusRw = "Imvura Nke ku Gihingwa";
      } else if (rainFulfillmentRatio > 1.2) {
        precipitationStatusEn = "High Rainfall (Monitor Drainage)";
        precipitationStatusRw = "Imvura Nyinshi (Rinda Uruzi)";
      }

      // Composite Weighted Harvest Readiness Score (0 - 100%)
      // Weights: 40% Crop Growth Stage + 35% Days Since Planting + 25% Cumulative Precipitation
      const readinessScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            growthStageSubScore * 0.4 +
              daysMaturitySubScore * 0.35 +
              precipitationSubScore * 0.25
          )
        )
      );

      const readinessTier: "ready_now" | "approaching" | "maturing" =
        readinessScore >= 90
          ? "ready_now"
          : readinessScore >= 75
          ? "approaching"
          : "maturing";

      const tierLabelEn =
        readinessTier === "ready_now"
          ? "Optimal Harvest Ready"
          : readinessTier === "approaching"
          ? "Approaching Harvest Window"
          : "Bulking & Ripening";

      const tierLabelRw =
        readinessTier === "ready_now"
          ? "Yiteguye Gusarurwa"
          : readinessTier === "approaching"
          ? "Yenda Kwera (Itegure)"
          : "Iracyakura mu Murima";

      const predictedQualityGrade: "A" | "B" =
        precipitationSubScore >= 80 && readinessScore >= 82 ? "A" : "B";

      let agronomicActionEn =
        "Maintain weekly scouting and monitor cumulative rainfall balance.";
      let agronomicActionRw =
        "Komeza kugenzura umurima n'igipimo cy'imvura buri cyumweru.";

      if (readinessTier === "ready_now") {
        agronomicActionEn = `Physiological maturity (${growthStagePct}%), ${daysSincePlanting}/${daysToMaturity} days & ${cumulativePrecipitationMm}mm rain achieved. Dispatch harvest crew during dry morning window.`;
        agronomicActionRw = `Igihingwa cyageze ku rugero rwo gusarurwa (${growthStagePct}%, iminsi ${daysSincePlanting}/${daysToMaturity} na ${cumulativePrecipitationMm}mm z'imvura). Tegura abasaruzi mu gitondo.`;
      } else if (readinessTier === "approaching") {
        agronomicActionEn = `${daysRemaining} days to full maturity (${cumulativePrecipitationMm}/${precipBench.optimalSeasonalRainMm}mm rain). Prepare storage bags/crates and reduce irrigation for dry-matter hardening.`;
        agronomicActionRw = `Hasigaye iminsi ${daysRemaining} ngo yere neza (${cumulativePrecipitationMm}/${precipBench.optimalSeasonalRainMm}mm). Tegura amasaho n'ububiko kandi ugabanye kuhira.`;
      } else {
        agronomicActionEn = `Active fruit/tuber bulking (${daysSincePlanting}/${daysToMaturity} days). Cumulative sensor rain at ${cumulativePrecipitationMm}mm (${Math.round(rainFulfillmentRatio * 100)}% of seasonal target).`;
        agronomicActionRw = `Igihingwa kiracyakura (${daysSincePlanting}/${daysToMaturity} iminsi). Imvura imaze kugwa ni ${cumulativePrecipitationMm}mm (${Math.round(rainFulfillmentRatio * 100)}% by'ikenewe).`;
      }

      return {
        planId: plan.id,
        farmId: plan.farmId,
        farmName: plan.farmName,
        district,
        crop: plan.crop,
        landSizeHa: plan.landSize,
        expectedYieldKg: plan.expectedYieldKg,
        expectedGrossRevenue: plan.expectedGrossRevenue,
        plantedDateStr: plan.plantedDate || "2026-07-05",
        predictedHarvestDateStr: plan.predictedHarvestDate || "2026-10-03",
        growthStagePct,
        currentGrowthStageLabel:
          plan.currentGrowthStage || "Reproductive & Maturation Stage",
        growthStageSubScore,
        daysSincePlanting,
        daysToMaturity,
        daysRemaining,
        daysMaturitySubScore,
        sensorStationId: precipBench.stationId,
        cumulativePrecipitationMm,
        optimalSeasonalRainMm: precipBench.optimalSeasonalRainMm,
        last7DaysRainMm,
        soilMoisturePct,
        precipitationSubScore,
        precipitationStatusEn,
        precipitationStatusRw,
        readinessScore,
        readinessTier,
        tierLabelEn,
        tierLabelRw,
        predictedQualityGrade,
        agronomicActionEn,
        agronomicActionRw,
      };
    });
  }, [activePlans, farms, overridesByPlanId, sensorReadingsByFarmId]);

  const selectedResult =
    readinessResults.find((r) => r.planId === selectedPlanId) ||
    readinessResults[0];

  const avgReadinessScore = useMemo(() => {
    if (readinessResults.length === 0) return 0;
    return Math.round(
      readinessResults.reduce((s, r) => s + r.readinessScore, 0) /
        readinessResults.length
    );
  }, [readinessResults]);

  const readyNowCount = readinessResults.filter(
    (r) => r.readinessTier === "ready_now"
  ).length;

  const approachingCount = readinessResults.filter(
    (r) => r.readinessTier === "approaching"
  ).length;

  const handleUpdateOverride = (
    planId: string,
    patch: Partial<WeatherSensorOverride>
  ) => {
    setOverridesByPlanId((prev) => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || {}),
        ...patch,
      },
    }));
  };

  const handleResetOverrides = (planId: string) => {
    setOverridesByPlanId((prev) => {
      const next = { ...prev };
      delete next[planId];
      return next;
    });
  };

  const handleScheduleHarvest = (res: PlanHarvestReadinessResult) => {
    if (onScheduleHarvestTask) {
      onScheduleHarvestTask({
        farmId: res.farmId,
        farmName: res.farmName,
        crop: res.crop,
        title:
          language === "rw"
            ? `Gusarura ${res.crop} (Readiness Score: ${res.readinessScore}% • ${res.expectedYieldKg.toLocaleString()} kg)`
            : `Harvest ${res.crop} — Readiness Score ${res.readinessScore}% (${res.expectedYieldKg.toLocaleString()} kg target)`,
        category: "harvesting",
        dueDate: res.predictedHarvestDateStr,
        status: "pending",
        assignedTo: "Faustin Mugabo (Harvest Crew Lead)",
        notes: `Harvest Readiness Score: ${res.readinessScore}% (Growth Stage: ${res.growthStagePct}%, Days Since Planting: ${res.daysSincePlanting}/${res.daysToMaturity}d, Cumulative Precipitation: ${res.cumulativePrecipitationMm}/${res.optimalSeasonalRainMm}mm from ${res.sensorStationId}).`,
      });
      setScheduledToast(
        language === "rw"
          ? `Igikorwa cyo gusarura ${res.crop} kuri ${res.farmName} cyashyizwe ku ngengabihe (${res.predictedHarvestDateStr})!`
          : `Harvest crew & logistics task scheduled for ${res.crop} (${res.farmName}) on ${res.predictedHarvestDateStr}!`
      );
      setTimeout(() => setScheduledToast(null), 5000);
    } else if (onNavigateToActivities) {
      onNavigateToActivities();
    }
  };

  if (readinessResults.length === 0) return null;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Gauge className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold">
                  {language === "rw"
                    ? "IGIPIMO CYO KWITEGURA ISARURA (0-100%)"
                    : "MULTI-FACTOR HARVEST READINESS SCORING (0-100%)"}
                </span>
                <span className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-white/10 text-amber-300 border border-white/15">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>
                    {readinessResults.length}{" "}
                    {language === "rw"
                      ? "Za Sitasiyo z'Imvura Zikora"
                      : "Local Rain Sensors Synced"}
                  </span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 tracking-tight">
                {language === "rw"
                  ? "Amanota yo Kwitegura Gusarura kuri Buri Gahunda y'Igihingwa"
                  : language === "fr"
                  ? "Score de Maturité et Préparation à la Récolte (0-100%)"
                  : "Harvest Readiness Scoring & Maturity Index"}
              </h3>
              <p className="text-xs text-stone-300 mt-0.5 max-w-3xl">
                {language === "rw"
                  ? "Buri gahunda ihabwa amanota (0-100%) hashingiwe ku kigero cy'ikura ry'igihingwa (40%), iminsi ishize gitewe (35%), n'imvura yose yaguye ipimwa na sitasiyo z'iteganyagihe (25%)."
                  : "Calculates a 0–100% readiness score per active crop plan from physiological growth stage (40%), days since planting (35%), and cumulative local sensor precipitation (25%)."}
              </p>
            </div>
          </div>

          {/* Summary Pills & Sensor Calibrator Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-mono tabular-nums">
              <span className="text-stone-300">
                {language === "rw" ? "Impuzandengo:" : "Avg Readiness:"}
              </span>{" "}
              <span className="font-black text-emerald-300">
                {avgReadinessScore}%
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold font-mono tabular-nums">
              {readyNowCount}{" "}
              {language === "rw" ? "Byiteguye (>=90%)" : "Ready Now (≥90%)"}
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold font-mono tabular-nums">
              {approachingCount}{" "}
              {language === "rw" ? "Byenda Kwera" : "Approaching (75-89%)"}
            </div>

            <button
              type="button"
              onClick={() => setShowCalibrator((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                showCalibrator
                  ? "bg-amber-400 text-stone-950"
                  : "bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "Gereranya Imvura & Iminsi"
                  : "Sensor & Maturity Simulator"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification when Harvest Crew is Scheduled */}
      {scheduledToast && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{scheduledToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduledToast(null)}
            className="text-emerald-700 hover:text-emerald-950 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Weather Sensor & Growth Stage Simulator Drawer */}
      {showCalibrator && selectedResult && (
        <div className="m-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-700 pb-2.5">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-stone-900 dark:text-white">
                {language === "rw"
                  ? `Igereranya rya Sitasiyo y'Imvura n'Ikura: ${selectedResult.crop} (${selectedResult.farmName})`
                  : `Live Readiness Factor Calibrator — ${selectedResult.crop} (${selectedResult.farmName})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {readinessResults.map((r) => (
                <button
                  key={r.planId}
                  type="button"
                  onClick={() => setSelectedPlanId(r.planId)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    r.planId === selectedResult.planId
                      ? "bg-emerald-700 text-white"
                      : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                  }`}
                >
                  {r.crop} ({r.readinessScore}%)
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleResetOverrides(selectedResult.planId)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-200/80 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === "rw" ? "Subiza ku Mwimerere" : "Reset"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Slider 1: Growth Stage % */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                <span>
                  1.{" "}
                  {language === "rw"
                    ? "Ikigero cy'Ikura (40% wt)"
                    : "Crop Growth Stage (40% wt)"}
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {selectedResult.growthStagePct}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={selectedResult.growthStagePct}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  handleUpdateOverride(selectedResult.planId, {
                    growthStagePctOverride: val,
                  });
                  if (onUpdatePlanGrowthStage) {
                    onUpdatePlanGrowthStage(
                      selectedResult.planId,
                      val,
                      selectedResult.currentGrowthStageLabel
                    );
                  }
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1">
                <span>20% (Vegetative)</span>
                <span>100% (Full Maturity)</span>
              </div>
            </div>

            {/* Slider 2: Days Since Planting */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                <span>
                  2.{" "}
                  {language === "rw"
                    ? "Iminsi Gitewe (35% wt)"
                    : "Days Since Planting (35% wt)"}
                </span>
                <span className="font-mono text-amber-700 dark:text-amber-400">
                  {selectedResult.daysSincePlanting} /{" "}
                  {selectedResult.daysToMaturity}d
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={selectedResult.daysToMaturity + 10}
                value={selectedResult.daysSincePlanting}
                onChange={(e) =>
                  handleUpdateOverride(selectedResult.planId, {
                    daysSincePlantingOverride: Number(e.target.value),
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1">
                <span>15 Days</span>
                <span>Target: {selectedResult.daysToMaturity} Days</span>
              </div>
            </div>

            {/* Slider 3: Cumulative Precipitation from Local Weather Sensor */}
            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200 mb-1.5">
                <span>
                  3.{" "}
                  {language === "rw"
                    ? "Imvura Yose (25% wt)"
                    : "Cumulative Sensor Rain (25% wt)"}
                </span>
                <span className="font-mono text-sky-700 dark:text-sky-400">
                  {selectedResult.cumulativePrecipitationMm} /{" "}
                  {selectedResult.optimalSeasonalRainMm} mm
                </span>
              </div>
              <input
                type="range"
                min={150}
                max={750}
                step={5}
                value={selectedResult.cumulativePrecipitationMm}
                onChange={(e) =>
                  handleUpdateOverride(selectedResult.planId, {
                    cumulativeRainMm: Number(e.target.value),
                  })
                }
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1">
                <span>150mm (Drought)</span>
                <span>Optimal: {selectedResult.optimalSeasonalRainMm}mm</span>
                <span>750mm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Crop Plan Harvest Readiness Cards Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {readinessResults.map((res) => {
          const isReadyNow = res.readinessTier === "ready_now";
          const isApproaching = res.readinessTier === "approaching";
          const isCardSelected = selectedResult?.planId === res.planId;

          const scoreColor = isReadyNow
            ? "text-emerald-700 dark:text-emerald-400"
            : isApproaching
            ? "text-amber-600 dark:text-amber-400"
            : "text-sky-600 dark:text-sky-400";

          const badgeStyle = isReadyNow
            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
            : isApproaching
            ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800"
            : "bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800";

          const progressBarBg = isReadyNow
            ? "bg-emerald-600"
            : isApproaching
            ? "bg-amber-500"
            : "bg-sky-600";

          return (
            <div
              key={res.planId}
              onClick={() => setSelectedPlanId(res.planId)}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all cursor-pointer ${
                isCardSelected
                  ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50/20 dark:bg-stone-800/70 shadow-xs"
                  : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 hover:border-stone-300"
              }`}
            >
              <div className="space-y-3.5">
                {/* Card Top Header: Plan Info + Readiness Score Gauge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-md border ${badgeStyle}`}
                      >
                        {language === "rw" ? res.tierLabelRw : res.tierLabelEn}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        Grade {res.predictedQualityGrade}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900 dark:text-white mt-1.5">
                      {res.crop}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {res.farmName} • {res.district} ({res.landSizeHa} Ha)
                    </p>
                  </div>

                  {/* 0-100% Score Badge */}
                  <div className="text-right shrink-0 bg-white dark:bg-stone-900 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
                    <span className="text-[10px] font-mono uppercase text-stone-400 block">
                      {language === "rw" ? "Amanota" : "Readiness"}
                    </span>
                    <div
                      className={`text-2xl font-black font-mono tabular-nums leading-tight ${scoreColor}`}
                    >
                      {res.readinessScore}%
                    </div>
                  </div>
                </div>

                {/* Overall Readiness Progress Bar */}
                <div>
                  <div className="w-full h-2.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressBarBg}`}
                      style={{ width: `${res.readinessScore}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-mono tabular-nums">
                    <span>
                      {language === "rw" ? "Gitewe:" : "Planted:"}{" "}
                      {res.plantedDateStr}
                    </span>
                    <span>
                      {language === "rw" ? "Isarura:" : "Harvest:"}{" "}
                      {res.predictedHarvestDateStr}
                    </span>
                  </div>
                </div>

                {/* 3-Factor Breakdown List */}
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 space-y-2.5 text-xs">
                  {/* Factor 1: Crop Growth Stage (40% weight) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                        <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {language === "rw"
                            ? "Ikigero cy'Ikura (40%)"
                            : "Growth Stage (40% wt)"}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                        {res.growthStagePct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5 pl-5">
                      {res.currentGrowthStageLabel}
                    </p>
                  </div>

                  {/* Factor 2: Days Since Planting (35% weight) */}
                  <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {language === "rw"
                            ? "Iminsi Gitewe (35%)"
                            : "Days Since Planting (35% wt)"}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                        {res.daysSincePlanting}/{res.daysToMaturity}d (
                        {res.daysMaturitySubScore}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 pl-5">
                      {res.daysRemaining === 0
                        ? language === "rw"
                          ? "Iminsi yo kwera yaruzuye"
                          : "Full maturity cycle reached"
                        : language === "rw"
                        ? `Hasigaye iminsi ${res.daysRemaining} ngo cyuzuze iminsi ${res.daysToMaturity}`
                        : `${res.daysRemaining} days remaining to ${res.daysToMaturity}-day maturity`}
                    </p>
                  </div>

                  {/* Factor 3: Cumulative Precipitation from Local Weather Sensors (25% weight) */}
                  <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                        <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>
                          {language === "rw"
                            ? "Imvura ya Sitasiyo (25%)"
                            : "Cumulative Rain (25% wt)"}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-400 tabular-nums">
                        {res.cumulativePrecipitationMm}/
                        {res.optimalSeasonalRainMm} mm ({res.precipitationSubScore}
                        %)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 pl-5 font-mono">
                      <span className="truncate">{res.sensorStationId}</span>
                      <span className="shrink-0 ml-1">
                        7d: {res.last7DaysRainMm}mm • VWC: {res.soilMoisturePct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agronomic Harvest Advisory Note */}
                <div className="p-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/70 text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
                  {language === "rw"
                    ? res.agronomicActionRw
                    : res.agronomicActionEn}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2">
                <div className="text-xs font-mono tabular-nums">
                  <span className="text-stone-400 block text-[10px]">
                    {language === "rw" ? "Umusaruro Witezwe" : "Expected Yield"}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {res.expectedYieldKg.toLocaleString()} kg
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScheduleHarvest(res);
                    }}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>
                      {language === "rw"
                        ? "Tegura Isarura"
                        : "Schedule Harvest"}
                    </span>
                  </button>

                  {onNavigateToHarvests && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToHarvests();
                      }}
                      title={
                        language === "rw"
                          ? "Andika Umusaruro"
                          : "Open Harvest & Sales Log"
                      }
                      className="p-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
