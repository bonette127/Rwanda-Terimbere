import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmPlan,
  Language,
  ParcelSoilSensorReading,
  CropVarietyIrrigationRule,
} from "../types";
import {
  generateSmartIrrigationProposals,
  buildActivityFromProposal,
  OptimalIrrigationWindowProposal,
  CLEAN_SLATE_SMART_PARCELS,
  DayWeatherProjection,
} from "../utils/smartIrrigationScheduling";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CloudRain,
  Compass,
  Droplets,
  Edit3,
  Flame,
  Info,
  Layers,
  Leaf,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  TrendingDown,
  Volume2,
  Wind,
  X,
  Zap,
} from "lucide-react";

interface SmartIrrigationSchedulerProps {
  farms: Farm[];
  plans?: FarmPlan[];
  activities?: FarmActivity[];
  sensorReadingsByFarmId?: Record<string, ParcelSoilSensorReading>;
  cropVarietyRules?: CropVarietyIrrigationRule[];
  language: Language;
  onCreateWateringTask?: (activity: Omit<FarmActivity, "id">) => void;
  onNavigateToActivities?: () => void;
  onShowToast?: (msg: string) => void;
}

export const SmartIrrigationScheduler: React.FC<SmartIrrigationSchedulerProps> = ({
  farms,
  plans = [],
  activities = [],
  sensorReadingsByFarmId = {},
  cropVarietyRules = [],
  language,
  onCreateWateringTask,
  onNavigateToActivities,
  onShowToast,
}) => {
  // Generate smart proposals based on live soil telemetry + 7-day weather forecast
  const baseProposals = useMemo(() => {
    return generateSmartIrrigationProposals({
      farms,
      plans,
      activities,
      sensorReadingsByFarmId,
      cropVarietyRules,
    });
  }, [farms, plans, activities, sensorReadingsByFarmId, cropVarietyRules]);

  // Track accepted proposals locally for immediate responsive UI feedback
  const [acceptedProposalIds, setAcceptedProposalIds] = useState<string[]>([]);
  // Track custom adjustments applied by user
  const [adjustedProposalsMap, setAdjustedProposalsMap] = useState<
    Record<
      string,
      {
        scheduledDateIso: string;
        timeRangeFormatted: string;
        waterDepthMm: number;
        waterVolumeLiters: number;
        irrigationMethod: "drip" | "sprinkler" | "furrow" | "manual";
        recommendedWindowPreset: "morning" | "evening" | "custom";
      }
    >
  >({});

  // Active parcel selection
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    baseProposals[0]?.farmId || "all"
  );

  // Modal / Drawer state for adjusting a proposal
  const [adjustingProposal, setAdjustingProposal] =
    useState<OptimalIrrigationWindowProposal | null>(null);
  const [adjustDate, setAdjustDate] = useState<string>("");
  const [adjustPreset, setAdjustPreset] = useState<"morning" | "evening" | "custom">(
    "morning"
  );
  const [adjustCustomTime, setAdjustCustomTime] = useState<string>("06:00 – 08:30");
  const [adjustWaterDepthMm, setAdjustWaterDepthMm] = useState<number>(12);
  const [adjustMethod, setAdjustMethod] = useState<
    "drip" | "sprinkler" | "furrow" | "manual"
  >("drip");

  // Historical soil telemetry collapse toggle
  const [showSoilTelemetryDetails, setShowSoilTelemetryDetails] =
    useState<boolean>(false);

  // Merge base proposals with local accepted/adjusted states
  const effectiveProposals = useMemo(() => {
    return baseProposals.map((p) => {
      const isAccepted = acceptedProposalIds.includes(p.id) || p.isAccepted;
      const adjustment = adjustedProposalsMap[p.id];
      if (adjustment) {
        return {
          ...p,
          scheduledDateIso: adjustment.scheduledDateIso,
          timeRangeFormatted: adjustment.timeRangeFormatted,
          waterDepthMm: adjustment.waterDepthMm,
          waterVolumeLiters: adjustment.waterVolumeLiters,
          irrigationMethod: adjustment.irrigationMethod,
          recommendedWindowPreset: adjustment.recommendedWindowPreset,
          isAccepted,
          isAdjusted: true,
        };
      }
      return {
        ...p,
        isAccepted,
      };
    });
  }, [baseProposals, acceptedProposalIds, adjustedProposalsMap]);

  // Current active proposal for detail view
  const currentProposal =
    effectiveProposals.find((p) => p.farmId === selectedFarmId) ||
    effectiveProposals[0];

  // Overall KPI statistics
  const totalWaterSavedLiters = useMemo(() => {
    return effectiveProposals.reduce(
      (sum, p) => sum + Math.round((p.waterVolumeLiters * p.savingsPctVsMidday) / 100),
      0
    );
  }, [effectiveProposals]);

  const pendingProposalsCount = effectiveProposals.filter((p) => !p.isAccepted).length;

  // 1-Click Accept Single Proposal
  const handleAcceptProposal = (proposal: OptimalIrrigationWindowProposal) => {
    if (proposal.isAccepted) return;

    const activityData = buildActivityFromProposal(proposal, language);

    if (onCreateWateringTask) {
      onCreateWateringTask(activityData);
    }

    setAcceptedProposalIds((prev) => [...prev, proposal.id]);

    const successMsg =
      language === "rw"
        ? `Gahunda yo kuhira umurima wa ${proposal.farmName} (${proposal.scheduledDateIso} saa ${proposal.timeRangeFormatted}) yemejwe neza!`
        : `Smart irrigation window accepted for ${proposal.farmName} on ${proposal.scheduledDateIso} (${proposal.timeRangeFormatted})!`;

    if (onShowToast) {
      onShowToast(successMsg);
    }
  };

  // 1-Click Accept All Proposals
  const handleAcceptAllProposals = () => {
    const unaccepted = effectiveProposals.filter((p) => !p.isAccepted);
    if (unaccepted.length === 0) return;

    for (const proposal of unaccepted) {
      const activityData = buildActivityFromProposal(proposal, language);
      if (onCreateWateringTask) {
        onCreateWateringTask(activityData);
      }
    }

    const newAcceptedIds = unaccepted.map((p) => p.id);
    setAcceptedProposalIds((prev) => [...prev, ...newAcceptedIds]);

    const count = unaccepted.length;
    const msg =
      language === "rw"
        ? `Gahunda ${count} zo kuhira imirima yose zemejwe ako kanya mu bikorwa by'umurima!`
        : `Accepted all ${count} optimal irrigation schedules across your parcels in one click!`;

    if (onShowToast) {
      onShowToast(msg);
    }
  };

  // Open adjustment drawer/modal
  const handleOpenAdjust = (proposal: OptimalIrrigationWindowProposal) => {
    setAdjustingProposal(proposal);
    setAdjustDate(proposal.scheduledDateIso);
    setAdjustPreset(proposal.recommendedWindowPreset);
    setAdjustCustomTime(proposal.timeRangeFormatted);
    setAdjustWaterDepthMm(proposal.waterDepthMm);
    setAdjustMethod(proposal.irrigationMethod);
  };

  // Save adjusted schedule
  const handleSaveAdjustment = () => {
    if (!adjustingProposal) return;

    let timeRange = adjustCustomTime;
    if (adjustPreset === "morning") {
      timeRange = "06:00 – 08:30";
    } else if (adjustPreset === "evening") {
      timeRange = "17:00 – 19:15";
    }

    const calculatedVolumeLiters = Math.round(
      adjustWaterDepthMm * 10000 * (adjustingProposal.sizeHa || 1)
    );

    const adjustmentData = {
      scheduledDateIso: adjustDate,
      timeRangeFormatted: timeRange,
      waterDepthMm: adjustWaterDepthMm,
      waterVolumeLiters: calculatedVolumeLiters,
      irrigationMethod: adjustMethod,
      recommendedWindowPreset: adjustPreset,
    };

    setAdjustedProposalsMap((prev) => ({
      ...prev,
      [adjustingProposal.id]: adjustmentData,
    }));

    // Immediately accept the adjusted activity into farm activities
    const adjustedProposalSnapshot: OptimalIrrigationWindowProposal = {
      ...adjustingProposal,
      ...adjustmentData,
      isAdjusted: true,
    };

    const activityData = buildActivityFromProposal(
      adjustedProposalSnapshot,
      language,
      {
        dateIso: adjustDate,
        timeRange,
        waterDepthMm: adjustWaterDepthMm,
        waterVolumeLiters: calculatedVolumeLiters,
        irrigationMethod: adjustMethod,
      }
    );

    if (onCreateWateringTask) {
      onCreateWateringTask(activityData);
    }

    setAcceptedProposalIds((prev) =>
      prev.includes(adjustingProposal.id) ? prev : [...prev, adjustingProposal.id]
    );

    const toastMsg =
      language === "rw"
        ? `Gahunda y'umurima wa ${adjustingProposal.farmName} yahinduwe kandi yashyizwe mu bikorwa (${adjustDate}, ${timeRange})!`
        : `Custom schedule for ${adjustingProposal.farmName} applied (${adjustDate}, ${timeRange})!`;

    if (onShowToast) {
      onShowToast(toastMsg);
    }

    setAdjustingProposal(null);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden space-y-0">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-950 p-6 text-white border-b border-emerald-900/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {language === "rw"
                  ? "Ikoranabuhanga ryo Kuhira (Smart Scheduling)"
                  : "Smart Irrigation Scheduling Engine"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-semibold">
              <CloudRain className="w-3.5 h-3.5 text-cyan-300" />
              <span>Meteo Rwanda 7-Day & Soil Telemetry</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
            {language === "rw"
              ? "Gahunda Yikora: Ibihe Byiza byo Kuhira Buri Murima"
              : "Automated Optimal Irrigation Windows for Each Parcel"}
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
            {language === "rw"
              ? "Uhereye ku buzima bw'ubutaka (Ubuhehere, Imborera, Uburyo bwo gufata amazi) n'iteganyagihe ry'iminsi 7 rya Meteo Rwanda, iyi sisitemu ikwereka igihe nyacyo cyo kuhira buri murima utangije amazi cyangwa ngo imvura ibiraremo."
              : "Fuses historical soil health traits (porosity, organic matter, holding capacity) with 7-day weather forecasts to propose optimal watering windows—saving water and safeguarding root health with 1-click acceptance."}
          </p>
        </div>

        {/* Global Action Stats & 1-Click Accept All */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white/10 dark:bg-black/30 rounded-2xl p-2.5 border border-white/10">
              <span className="text-[11px] text-emerald-200 block font-medium">
                {language === "rw" ? "Imirima Yiteguye" : "Parcels Proposed"}
              </span>
              <span className="text-lg font-black font-mono text-amber-300">
                {effectiveProposals.length}
              </span>
            </div>
            <div className="bg-white/10 dark:bg-black/30 rounded-2xl p-2.5 border border-white/10">
              <span className="text-[11px] text-emerald-200 block font-medium">
                {language === "rw" ? "Amazi Azigamwa" : "Water Averted"}
              </span>
              <span className="text-lg font-black font-mono text-cyan-300">
                ~{totalWaterSavedLiters > 1000 ? `${(totalWaterSavedLiters / 1000).toFixed(1)}k L` : `${totalWaterSavedLiters} L`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcceptAllProposals}
            disabled={pendingProposalsCount === 0}
            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md ${
              pendingProposalsCount > 0
                ? "bg-amber-400 hover:bg-amber-300 text-stone-950 active:scale-95 cursor-pointer"
                : "bg-emerald-900/60 text-emerald-300/80 cursor-default border border-emerald-700/40"
            }`}
          >
            {pendingProposalsCount > 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-stone-950" />
                <span>
                  {language === "rw"
                    ? `Emeza Gahunda Zose Ako Kanya (${pendingProposalsCount})`
                    : `Accept All Proposed Windows (${pendingProposalsCount})`}
                </span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>
                  {language === "rw"
                    ? "Gahunda Yose Yamaze Kwemezwa"
                    : "All Schedules Already Accepted"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Parcel Selection Navigation Tabs */}
      <div className="bg-stone-50 dark:bg-stone-950/60 p-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === "rw" ? "Umurima:" : "Select Parcel:"}</span>
          </span>

          {effectiveProposals.map((proposal) => {
            const isSelected = selectedFarmId === proposal.farmId;
            return (
              <button
                key={proposal.farmId}
                type="button"
                onClick={() => setSelectedFarmId(proposal.farmId)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/60"
                }`}
              >
                <span>{proposal.farmName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected
                      ? "bg-emerald-950 text-emerald-200"
                      : "bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300"
                  }`}
                >
                  {proposal.soilProfile.currentMoisturePct}% VWC
                </span>
                {proposal.isAccepted && (
                  <Check className="w-3 h-3 text-amber-300" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSoilTelemetryDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {showSoilTelemetryDetails
                ? language === "rw"
                  ? "Hisha Amakuru y'Ubutaka"
                  : "Hide Soil Telemetry"
                : language === "rw"
                  ? "Reba Amakuru y'Ubutaka"
                  : "View Soil Telemetry"}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Historical Soil Health Telemetry Drawer (Expandable) */}
      {showSoilTelemetryDetails && currentProposal && (
        <div className="p-5 bg-stone-100/60 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-[11px] text-stone-400 block font-semibold">
              {language === "rw" ? "Ubwoko bw'Ubutaka (Soil Matrix)" : "Soil Classification"}
            </span>
            <span className="text-sm font-black text-stone-900 dark:text-white block truncate">
              {currentProposal.soilProfile.soilType}
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              Infiltration: {currentProposal.soilProfile.infiltrationRateMmPerHour} mm/hr
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-[11px] text-stone-400 block font-semibold">
              {language === "rw" ? "Urugero rw'Imborera (OM)" : "Organic Matter & AWC"}
            </span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 block font-mono">
              {currentProposal.soilProfile.organicMatterPct}% OM
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              AWC: {currentProposal.soilProfile.availableWaterCapacityMmPerM} mm/m
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-[11px] text-stone-400 block font-semibold">
              {language === "rw" ? "Ubuhehere bwa None (VWC)" : "Current Root-Zone Moisture"}
            </span>
            <span className="text-sm font-black text-cyan-700 dark:text-cyan-400 block font-mono">
              {currentProposal.soilProfile.currentMoisturePct}% VWC
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              Historical Avg: {currentProposal.soilProfile.historicalAvgMoisturePct}%
            </span>
          </div>

          <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-1">
            <span className="text-[11px] text-stone-400 block font-semibold">
              {language === "rw" ? "Ubushize Yahiriwe" : "Last Irrigation Event"}
            </span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-400 block font-mono">
              {currentProposal.soilProfile.daysSinceLastIrrigation} days ago
            </span>
            <span className="text-[11px] text-stone-500 font-mono truncate block">
              {currentProposal.soilProfile.lastIrrigationDate || "No record this week"}
            </span>
          </div>
        </div>
      )}

      {/* 4. Active Proposal Display Card + 7-Day Timeline */}
      {currentProposal && (
        <div className="p-6 space-y-6">
          {/* Main Proposed Window Card */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              currentProposal.isAccepted
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                : "bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-950 border-stone-200 dark:border-stone-700 shadow-sm"
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left Column: Optimal Window Metadata */}
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide bg-amber-400 text-stone-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                    <span>
                      {language === "rw"
                        ? "Igihe Cyiza Cyatoranyijwe (Optimal Window)"
                        : "Optimal Irrigation Window"}
                    </span>
                  </span>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                    {currentProposal.crop}
                  </span>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                    {currentProposal.sizeHa} Ha · {currentProposal.district}
                  </span>

                  {currentProposal.isAdjusted && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                      Adjusted
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                    <span>
                      {language === "rw"
                        ? currentProposal.dayNameRw
                        : currentProposal.dayNameEn}
                      , {currentProposal.scheduledDateIso}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      [{currentProposal.timeRangeFormatted}]
                    </span>
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1 font-medium">
                    {language === "rw"
                      ? currentProposal.windowLabelRw
                      : currentProposal.windowLabelEn}
                  </p>
                </div>

                {/* Key Quantitative Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <span className="text-stone-400 block font-semibold text-[11px]">
                      {language === "rw" ? "Amazi Akenewe (Depth)" : "Target Depth"}
                    </span>
                    <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                      {currentProposal.waterDepthMm} mm
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <span className="text-stone-400 block font-semibold text-[11px]">
                      {language === "rw" ? "Ingano Yose (Volume)" : "Total Volume"}
                    </span>
                    <span className="text-base font-black text-cyan-700 dark:text-cyan-400 font-mono">
                      {currentProposal.waterVolumeLiters.toLocaleString()} L
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <span className="text-stone-400 block font-semibold text-[11px]">
                      {language === "rw" ? "Igihe Cy'Ipompo" : "Runtime"}
                    </span>
                    <span className="text-base font-black text-stone-900 dark:text-white font-mono">
                      ~{currentProposal.estimatedRuntimeMinutes} min
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <span className="text-stone-400 block font-semibold text-[11px]">
                      {language === "rw" ? "Ubwizigame bw'Amazi" : "Water Averted"}
                    </span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      +{currentProposal.savingsPctVsMidday}% vs Midday
                    </span>
                  </div>
                </div>

                {/* Justification & Soil Reasoning */}
                <div className="p-4 rounded-2xl bg-emerald-950/5 dark:bg-emerald-950/30 border border-emerald-800/20 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {language === "rw"
                        ? "Impamvu y'Iteganyagihe n'Ubutaka (Meteorological Justification):"
                        : "Meteorological & Soil Justification:"}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {language === "rw"
                      ? currentProposal.justificationRw
                      : currentProposal.justificationEn}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                    {language === "rw"
                      ? currentProposal.soilReasoningRw
                      : currentProposal.soilReasoningEn}
                  </p>
                </div>
              </div>

              {/* Right Column: Actions (1-Click Accept & Adjust) */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-56">
                {currentProposal.isAccepted ? (
                  <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <span className="font-black text-xs text-emerald-900 dark:text-emerald-200 block">
                      {language === "rw"
                        ? "Gahunda Yemejwe!"
                        : "Schedule Accepted!"}
                    </span>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      {language === "rw"
                        ? `Yashyizwe mu bikorwa by'umurima kuri ${currentProposal.scheduledDateIso}.`
                        : `Committed to farm activities calendar for ${currentProposal.scheduledDateIso}.`}
                    </p>
                    {onNavigateToActivities && (
                      <button
                        type="button"
                        onClick={onNavigateToActivities}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline pt-1 inline-block"
                      >
                        {language === "rw"
                          ? "Kuri Gahunda y'Imirimo →"
                          : "View in Activity Hub →"}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAcceptProposal(currentProposal)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span>
                      {language === "rw"
                        ? "Emeza Iyi Gahunda (1-Click)"
                        : "Accept Schedule (1-Click)"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenAdjust(currentProposal)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                  <span>
                    {language === "rw" ? "Hindura Ibisabwa (Adjust)" : "Adjust Schedule"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. 7-Day Weather & Soil Moisture Trajectory Horizon */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === "rw"
                    ? "Icyerekezo cy'Iminsi 7 (Weather & Moisture Forecast Horizon)"
                    : "7-Day Weather & Soil Moisture Forecast Horizon"}
                </span>
              </h4>
              <span className="text-[11px] text-stone-400">
                {language === "rw"
                  ? "Kanda ku munsi uwo ari wo wose kugira ngo ushiremo igihe cyo kuhira"
                  : "Click any forecast day to target that day for irrigation"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {currentProposal.sevenDayProjections.map((day) => {
                const isSelectedScheduleDay =
                  currentProposal.scheduledDateIso === day.dateIso;
                const isHeavyRain = day.rainRisk === "heavy";
                const isLowMoisture =
                  day.projectedMoisturePctWithoutIrrigation <= 40;

                return (
                  <div
                    key={day.dateIso}
                    onClick={() => {
                      // Allow clicking a day to quick-adjust the scheduled date!
                      handleOpenAdjust({
                        ...currentProposal,
                        scheduledDateIso: day.dateIso,
                        dayNameEn: day.dayNameEn,
                        dayNameRw: day.dayNameRw,
                      });
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelectedScheduleDay
                        ? "bg-emerald-900 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/50"
                        : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-500/60"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black ${
                          isSelectedScheduleDay
                            ? "text-amber-300"
                            : "text-stone-900 dark:text-white"
                        }`}
                      >
                        {language === "rw" ? day.dayNameRw : day.dayNameEn}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelectedScheduleDay
                            ? "text-emerald-200"
                            : "text-stone-400"
                        }`}
                      >
                        {day.dateIso.slice(5)}
                      </span>
                    </div>

                    {/* Temp & Rain */}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span
                        className={`font-mono font-bold ${
                          isSelectedScheduleDay
                            ? "text-white"
                            : "text-stone-700 dark:text-stone-300"
                        }`}
                      >
                        {day.tempMaxC}° / {day.tempMinC}°
                      </span>
                      <span
                        className={`text-[10px] font-mono flex items-center gap-0.5 ${
                          isHeavyRain
                            ? "text-blue-400 font-bold"
                            : isSelectedScheduleDay
                              ? "text-cyan-200"
                              : "text-stone-400"
                        }`}
                      >
                        <CloudRain className="w-3 h-3" />
                        <span>{day.rainfallMm}mm</span>
                      </span>
                    </div>

                    {/* Soil Moisture Bar */}
                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={
                            isSelectedScheduleDay
                              ? "text-emerald-200"
                              : "text-stone-400"
                          }
                        >
                          Moisture
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isLowMoisture
                              ? "text-rose-400"
                              : isSelectedScheduleDay
                                ? "text-cyan-200"
                                : "text-stone-600 dark:text-stone-300"
                          }`}
                        >
                          {day.projectedMoisturePctWithoutIrrigation}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isLowMoisture
                              ? "bg-rose-500"
                              : isSelectedScheduleDay
                                ? "bg-amber-400"
                                : "bg-cyan-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              day.projectedMoisturePctWithoutIrrigation
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Window Badge */}
                    {isSelectedScheduleDay ? (
                      <div className="mt-2.5 px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-black text-[9px] text-center uppercase tracking-wider">
                        ⭐ Proposed Window
                      </div>
                    ) : isHeavyRain ? (
                      <div className="mt-2.5 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 text-[9px] text-center font-bold">
                        Rain Safe (No Water)
                      </div>
                    ) : day.isOptimalDay ? (
                      <div className="mt-2.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] text-center font-bold">
                        Optimal Candidate
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. Adjustment Modal / Dialog */}
      {adjustingProposal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6">
            <div className="px-6 py-5 bg-[#064E3B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-base font-black">
                    {language === "rw"
                      ? "Hindura Gahunda yo Kuhira (Adjust Window)"
                      : "Adjust Irrigation Schedule"}
                  </h3>
                  <p className="text-xs text-emerald-200">
                    {adjustingProposal.farmName} · {adjustingProposal.crop}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingProposal(null)}
                className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Target Date Picker */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">
                  {language === "rw"
                    ? "Hitamo Umunsi wo Kuhira (Target Forecast Date):"
                    : "Target Forecast Date:"}
                </label>
                <select
                  value={adjustDate}
                  onChange={(e) => setAdjustDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white font-bold"
                >
                  {adjustingProposal.sevenDayProjections.map((d) => (
                    <option key={d.dateIso} value={d.dateIso}>
                      {d.dateIso} — {language === "rw" ? d.dayNameRw : d.dayNameEn} (
                      {d.rainfallMm}mm rain, {d.tempMaxC}°C)
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Window Preset */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">
                  {language === "rw"
                    ? "Igihe cy'Umunsi (Diurnal Window):"
                    : "Preferred Time Window:"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustPreset("morning")}
                    className={`p-2.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                      adjustPreset === "morning"
                        ? "bg-emerald-800 text-white border-emerald-800"
                        : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    🌅 Early Morning (06:00 – 08:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustPreset("evening")}
                    className={`p-2.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                      adjustPreset === "evening"
                        ? "bg-emerald-800 text-white border-emerald-800"
                        : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    🌇 Late Afternoon (17:00 – 19:15)
                  </button>
                </div>
              </div>

              {/* Water Depth (mm) Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    {language === "rw"
                      ? "Ingano y'Amazi (Application Depth):"
                      : "Application Depth (mm):"}
                  </label>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                    {adjustWaterDepthMm} mm (~
                    {(
                      adjustWaterDepthMm *
                      10000 *
                      (adjustingProposal.sizeHa || 1)
                    ).toLocaleString()}{" "}
                    L)
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="28"
                  step="1"
                  value={adjustWaterDepthMm}
                  onChange={(e) => setAdjustWaterDepthMm(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>6 mm (Light refresh)</span>
                  <span>14 mm (Recommended)</span>
                  <span>28 mm (Deep soak)</span>
                </div>
              </div>

              {/* Irrigation Method */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 block">
                  {language === "rw"
                    ? "Uburyo bwo Kuhira (Method):"
                    : "Irrigation Delivery Method:"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "drip", label: "Drip System (Imiyoboro)" },
                    { id: "sprinkler", label: "Sprinkler (Umunyota)" },
                    { id: "furrow", label: "Furrow / Gravity (Imiferege)" },
                    { id: "manual", label: "Manual Can (Indobo/Umuhinzi)" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAdjustMethod(m.id as any)}
                      className={`p-2 rounded-xl text-left font-bold border transition-colors cursor-pointer ${
                        adjustMethod === m.id
                          ? "bg-emerald-800 text-white border-emerald-800"
                          : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdjustingProposal(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs cursor-pointer"
              >
                {language === "rw" ? "Kureka" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustment}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>
                  {language === "rw"
                    ? "Kubika & Kwemeza Gahunda"
                    : "Save & Accept Custom Schedule"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
