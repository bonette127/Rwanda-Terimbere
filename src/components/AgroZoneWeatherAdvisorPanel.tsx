import React, { useEffect, useMemo, useState } from "react";
import {
  DailyWeatherForecast,
  Farm,
  FarmActivity,
  FarmPlan,
  Language,
} from "../types";
import {
  AgroZonePestRiskAssessment,
  AgroZoneWeatherAnalysisReport,
  AgroZoneWeatherScenarioId,
  analyzeAgroZoneWeatherForFarm,
  buildActivityFromPestAssessment,
  buildActivityFromPlantingRecommendation,
  CropPlantingRecommendation,
  formatAgroZoneAdvisoryMarkdown,
} from "../utils/agroZoneWeatherAdvisory";
import {
  AlertTriangle,
  Bug,
  Calendar,
  CheckCircle2,
  CloudRain,
  Compass,
  Droplets,
  Flame,
  Layers,
  Loader2,
  MapPin,
  Mountain,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

interface AgroZoneWeatherAdvisorPanelProps {
  farms: Farm[];
  plans: FarmPlan[];
  selectedFarmId: string;
  onSelectFarmId: (farmId: string) => void;
  language: Language;
  onAskAiPrompt: (promptText: string, precomputedMarkdown?: string) => void;
  onAddActivity?: (activity: Omit<FarmActivity, "id">) => void;
  onReportUpdated?: (report: AgroZoneWeatherAnalysisReport) => void;
}

const CLEAN_SLATE_AGROZONE_PRESETS: Farm[] = [
  {
    id: "zone-birunga",
    name: "Birunga Highland Reference Zone",
    location: "Musanze",
    district: "Musanze",
    sector: "Kinigi",
    altitude: 2240,
    agroZone: "Volcanic Highlands (Birunga)",
    size: 1.0,
    soilType: "Volcanic Loam (Andosols)",
    soilPh: 5.8,
    soilMoisture: 74,
    mainCrops: ["Ibirayi (Potatoes)", "Ibigori (Maize)", "Ibishyimbo (Beans)"],
  },
  {
    id: "zone-savanna",
    name: "Eastern Savanna Reference Zone",
    location: "Nyagatare",
    district: "Nyagatare",
    sector: "Mimuri",
    altitude: 1380,
    agroZone: "Eastern Savanna (Uburasirazuba)",
    size: 1.0,
    soilType: "Sandy Clay Loam (Ferralsols)",
    soilPh: 6.4,
    soilMoisture: 54,
    mainCrops: ["Ibigori (Maize)", "Soya", "Ibishyimbo (Beans)"],
  },
  {
    id: "zone-plateau",
    name: "Central & Southern Plateau Zone",
    location: "Huye",
    district: "Huye",
    sector: "Tumba",
    altitude: 1750,
    agroZone: "Central Plateau (Imisozi y'Hagati)",
    size: 1.0,
    soilType: "Humic Clay Loam (Acrisols)",
    soilPh: 5.6,
    soilMoisture: 66,
    mainCrops: ["Ikawa (Coffee)", "Inyanya (Tomatoes)", "Ibishyimbo (Beans)"],
  },
];

export const AgroZoneWeatherAdvisorPanel: React.FC<
  AgroZoneWeatherAdvisorPanelProps
> = ({
  farms,
  plans,
  selectedFarmId,
  onSelectFarmId,
  language,
  onAskAiPrompt,
  onAddActivity,
  onReportUpdated,
}) => {
  const effectiveFarms = farms.length > 0 ? farms : CLEAN_SLATE_AGROZONE_PRESETS;
  const [fallbackZoneId, setFallbackZoneId] = useState<string>(
    CLEAN_SLATE_AGROZONE_PRESETS[0].id
  );

  const activeFarm = useMemo(() => {
    if (farms.length > 0) {
      return farms.find((f) => f.id === selectedFarmId) || farms[0];
    }
    return (
      CLEAN_SLATE_AGROZONE_PRESETS.find((z) => z.id === fallbackZoneId) ||
      CLEAN_SLATE_AGROZONE_PRESETS[0]
    );
  }, [farms, selectedFarmId, fallbackZoneId]);

  const [scenarioId, setScenarioId] =
    useState<AgroZoneWeatherScenarioId>("live_forecast");
  const [activeSubTab, setActiveSubTab] = useState<"planting" | "pest_risk">(
    "planting"
  );
  const [liveForecastByFarmId, setLiveForecastByFarmId] = useState<
    Record<
      string,
      {
        forecastDays: DailyWeatherForecast[];
        source: string;
        fetchedAt: string;
      }
    >
  >({});
  const [isFetchingForecast, setIsFetchingForecast] = useState(false);
  const [aiSynthesisByFarmKey, setAiSynthesisByFarmKey] = useState<
    Record<string, string>
  >({});
  const [isSynthesizingAi, setIsSynthesizingAi] = useState(false);
  const [scheduledItemIds, setScheduledItemIds] = useState<
    Record<string, boolean>
  >({});

  // Fetch live agroZone forecast from backend when activeFarm changes
  const fetchLiveAgroZoneForecast = async (farm: Farm, force = false) => {
    if (!farm) return;
    if (!force && liveForecastByFarmId[farm.id]) return;

    setIsFetchingForecast(true);
    try {
      const response = await fetch("/api/weather/agrozone-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district: farm.district,
          agroZone: farm.agroZone,
          altitude: farm.altitude,
          latitude: farm.latitude,
          longitude: farm.longitude,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.forecastDays) && data.forecastDays.length >= 5) {
          setLiveForecastByFarmId((prev) => ({
            ...prev,
            [farm.id]: {
              forecastDays: data.forecastDays,
              source:
                data.source ||
                `Live Open-Meteo + Meteo Rwanda (${farm.agroZone})`,
              fetchedAt: data.fetchedAt || new Date().toISOString(),
            },
          }));
        }
      }
    } catch (_err) {
      // Uses deterministic Meteo Rwanda agroZone station data cleanly
    } finally {
      setIsFetchingForecast(false);
    }
  };

  useEffect(() => {
    if (activeFarm) {
      fetchLiveAgroZoneForecast(activeFarm, false);
    }
  }, [activeFarm?.id]);

  const report: AgroZoneWeatherAnalysisReport | null = useMemo(() => {
    if (!activeFarm) return null;
    const liveEntry = liveForecastByFarmId[activeFarm.id];
    const sourceLabel =
      scenarioId === "live_forecast"
        ? liveEntry?.source ||
          `Meteo Rwanda AgroZone Telemetry (${activeFarm.district} • ${activeFarm.agroZone})`
        : scenarioId === "onset_planting_rains"
          ? `Simulated Onset Rains (${activeFarm.agroZone})`
          : scenarioId === "high_humidity_blight_surge"
            ? `Simulated High-Humidity Pathogen Surge (${activeFarm.agroZone})`
            : `Simulated Dry-Spell Heat & Pest Surge (${activeFarm.agroZone})`;

    return analyzeAgroZoneWeatherForFarm(
      activeFarm,
      plans,
      scenarioId,
      liveEntry?.forecastDays,
      sourceLabel
    );
  }, [activeFarm, plans, scenarioId, liveForecastByFarmId]);

  useEffect(() => {
    if (report && onReportUpdated) {
      onReportUpdated(report);
    }
  }, [report]);

  if (!activeFarm || !report) return null;

  const synthesisKey = `${activeFarm.id}-${scenarioId}-${language}`;
  const currentAiSynthesis = aiSynthesisByFarmKey[synthesisKey];

  const handleGenerateAiSynthesis = async () => {
    setIsSynthesizingAi(true);
    try {
      const response = await fetch("/api/gemini/agrozone-advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmName: report.farmName,
          agroZone: report.agroZone,
          district: report.district,
          altitude: report.altitude,
          soilType: activeFarm.soilType,
          soilPh: activeFarm.soilPh,
          soilMoisture: activeFarm.soilMoisture,
          crops: activeFarm.mainCrops,
          metrics: report.metrics,
          cropPlantingRecommendations: report.cropPlantingRecommendations,
          pestRiskAssessments: report.pestRiskAssessments,
          language,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.synthesis) {
          setAiSynthesisByFarmKey((prev) => ({
            ...prev,
            [synthesisKey]: data.synthesis,
          }));
        }
      }
    } catch (_err) {
      const fallbackMd = formatAgroZoneAdvisoryMarkdown(report, language);
      setAiSynthesisByFarmKey((prev) => ({
        ...prev,
        [synthesisKey]: fallbackMd,
      }));
    } finally {
      setIsSynthesizingAi(false);
    }
  };

  const handleSchedulePlantingTask = (rec: CropPlantingRecommendation) => {
    if (!onAddActivity) return;
    const key = `plant-${activeFarm.id}-${rec.cropName}`;
    const activityPayload = buildActivityFromPlantingRecommendation(
      activeFarm,
      rec
    );
    onAddActivity(activityPayload);
    setScheduledItemIds((prev) => ({ ...prev, [key]: true }));
  };

  const handleSchedulePestTask = (pest: AgroZonePestRiskAssessment) => {
    if (!onAddActivity) return;
    const key = `pest-${pest.id}`;
    const activityPayload = buildActivityFromPestAssessment(activeFarm, pest);
    onAddActivity(activityPayload);
    setScheduledItemIds((prev) => ({ ...prev, [key]: true }));
  };

  const handleSendFullReportToChat = () => {
    const md = formatAgroZoneAdvisoryMarkdown(report, language);
    const promptText =
      language === "rw"
        ? `Sesengura iteganyagihe ry'iminsi 7 rya AgroZone "${report.agroZone}" ku murima wa ${report.farmName} (${report.altitude}m ASL) utange inama zihariye ku gihe cyo gutera n'uko twakwirinda ibyonyi n'indwara.`
        : `Analyze the 7-day weather forecast for AgroZone "${report.agroZone}" at ${report.farmName} (${report.altitude}m ASL) and provide customized planting time and pest risk management advice.`;
    onAskAiPrompt(promptText, md);
  };

  const topPest = [...report.pestRiskAssessments].sort(
    (a, b) => b.riskScore - a.riskScore
  )[0];

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm overflow-hidden mb-5">
      {/* Top AgroZone Command Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 px-5 py-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  {language === "rw"
                    ? "Isesengura rya AgroZone & Iteganyagihe"
                    : "AgroZone Weather & Agronomic Intelligence"}
                </span>
                <span className="text-[11px] font-medium text-emerald-200/90 flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-amber-300" />
                  {report.agroZone} • {report.altitude}m ASL
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {language === "rw"
                  ? `Inama za AI ku Gihe cyo Gutera & Kurinda Ibyonyi muri ${report.agroZone}`
                  : `Customized Planting Times & Pest Risk Management for ${report.agroZone}`}
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {language === "rw"
                  ? report.agroZoneCharacteristicsRw
                  : report.agroZoneCharacteristicsEn}
              </p>
            </div>
          </div>

          {/* Farm Selector & Live Refresh */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative">
              <select
                aria-label={
                  language === "rw"
                    ? "Hitamo umurima na AgroZone"
                    : "Select Farm & AgroZone"
                }
                value={activeFarm.id}
                onChange={(e) => {
                  if (farms.length > 0) {
                    onSelectFarmId(e.target.value);
                  } else {
                    setFallbackZoneId(e.target.value);
                  }
                }}
                className="bg-emerald-950/80 text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 border border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {effectiveFarms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.agroZone} ({f.altitude}m)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => fetchLiveAgroZoneForecast(activeFarm, true)}
              disabled={isFetchingForecast}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 transition-colors cursor-pointer disabled:opacity-60"
              title={
                language === "rw"
                  ? "Kurura iteganyagihe rishya rya AgroZone"
                  : "Fetch live weather forecast for this AgroZone"
              }
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetchingForecast ? "animate-spin" : ""}`}
              />
              {language === "rw" ? "Kurura Iteganyagihe" : "Fetch Live Forecast"}
            </button>

            <button
              type="button"
              onClick={handleSendFullReportToChat}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-stone-950 transition-colors cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {language === "rw"
                ? "Ohereza mu Kiganiro cya AI"
                : "Post Briefing to AI Chat"}
            </button>
          </div>
        </div>

        {/* AgroZone Metadata & Scenario Simulator Strip */}
        <div className="mt-3 pt-3 border-t border-emerald-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-200/90">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <strong>{activeFarm.district}</strong> ({activeFarm.sector})
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              {activeFarm.soilType} • pH {activeFarm.soilPh}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              {language === "rw"
                ? report.rabSeasonWindowRw
                : report.rabSeasonWindowEn}
            </span>
          </div>

          {/* AgroZone Weather Scenario Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-emerald-300 font-medium">
              {language === "rw" ? "Iteganyagihe:" : "Forecast Mode:"}
            </span>
            {(
              [
                {
                  id: "live_forecast",
                  labelRw: "Imbonankubone (Live)",
                  labelEn: "Live AgroZone Feed",
                },
                {
                  id: "onset_planting_rains",
                  labelRw: "Imvura y'Itumba (Gutera)",
                  labelEn: "Onset Planting Rains",
                },
                {
                  id: "high_humidity_blight_surge",
                  labelRw: "Ubuhehere Bwinshi (Imvune)",
                  labelEn: "High-RH Blight/CBD Surge",
                },
                {
                  id: "dry_spell_pest_outbreak",
                  labelRw: "Izuba & Nkongwa",
                  labelEn: "Dry Spell & Armyworm",
                },
              ] as {
                id: AgroZoneWeatherScenarioId;
                labelRw: string;
                labelEn: string;
              }[]
            ).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setScenarioId(sc.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  scenarioId === sc.id
                    ? "bg-white text-emerald-950 shadow-xs"
                    : "bg-emerald-950/60 text-emerald-200 hover:bg-emerald-800/70 border border-emerald-700/50"
                }`}
              >
                {language === "rw" ? sc.labelRw : sc.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4-Card AgroZone Weather Telemetry Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-stone-50/80 border-b border-stone-200/80">
        {/* KPI 1: 7-Day Rainfall */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">
              {language === "rw"
                ? "Imvura y'Iminsi 7 (AgroZone)"
                : "7-Day AgroZone Rainfall"}
            </span>
            <CloudRain className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-stone-900">
              {report.metrics.cumulativeRain7dMm} mm
            </span>
            <span className="text-xs font-semibold text-sky-700">
              ({report.metrics.rainyDaysCount}/7{" "}
              {language === "rw" ? "iminsi" : "wet days"})
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {language === "rw"
              ? `Umunsi ufite nyinshi: ${report.metrics.peakRainDayMm}mm (${report.metrics.peakRainDayDate})`
              : `Peak day: ${report.metrics.peakRainDayMm}mm on ${report.metrics.peakRainDayDate}`}
          </p>
        </div>

        {/* KPI 2: Thermal Regime & GDD */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">
              {language === "rw"
                ? "Ubushyuhe & GDD (Kumera)"
                : "Thermal Regime & 7d GDD"}
            </span>
            <Thermometer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-stone-900">
              {report.metrics.avgMaxTempC}° / {report.metrics.avgMinTempC}°C
            </span>
            <span className="text-xs font-semibold text-amber-700">
              {report.metrics.growingDegreeDays7d} GDD
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {language === "rw"
              ? `Impuzandengo ya ${report.metrics.meanTempC}°C kuri ${report.altitude}m ASL`
              : `Mean ${report.metrics.meanTempC}°C at ${report.altitude}m ASL`}
          </p>
        </div>

        {/* KPI 3: Humidity & Leaf Wetness */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">
              {language === "rw"
                ? "Ubuhehere & Amababi Matose"
                : "Humidity & Leaf Wetness"}
            </span>
            <Wind className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-stone-900">
              {report.metrics.avgHumidityPct}% RH
            </span>
            <span className="text-xs font-semibold text-teal-700">
              ~{report.metrics.estimatedLeafWetnessHoursPerDay}h/d wet
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {language === "rw"
              ? `Ubuhehere bukabije: ${report.metrics.peakHumidityPct}% • Ibipimo by'indwara`
              : `Peak RH: ${report.metrics.peakHumidityPct}% • Pathogen driver`}
          </p>
        </div>

        {/* KPI 4: Soil Moisture & Top Pest Risk */}
        <div className="bg-white rounded-xl p-3 border border-stone-200/80">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">
              {language === "rw"
                ? "Ubuhehere bw'Ubutaka & Ibyonyi"
                : "Soil Moisture & Pest Index"}
            </span>
            <Droplets className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-stone-900">
              {report.metrics.soilMoistureProjectedPct}%
            </span>
            {topPest && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  topPest.riskLevel === "critical" || topPest.riskLevel === "high"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {language === "rw" ? "Ibyonyi:" : "Pest:"} {topPest.riskScore}/100
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {language === "rw"
              ? `Ubu: ${activeFarm.soilMoisture}% • ET₀: ${report.metrics.evapotranspiration7dMm}mm/7d`
              : `Current: ${activeFarm.soilMoisture}% • 7d ET₀: ${report.metrics.evapotranspiration7dMm}mm`}
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs + AI Deep-Dive Trigger */}
      <div className="px-5 py-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("planting")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === "planting"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Sprout className="w-4 h-4" />
            {language === "rw"
              ? `Igihe Cyo Gutera (${report.cropPlantingRecommendations.length})`
              : `Planting Time Windows (${report.cropPlantingRecommendations.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("pest_risk")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === "pest_risk"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Bug className="w-4 h-4" />
            {language === "rw"
              ? `Kurinda Ibyonyi n'Indwara (${report.pestRiskAssessments.length})`
              : `Pest & Disease Risk Management (${report.pestRiskAssessments.length})`}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            {report.dataSourceLabel}
          </span>
          <button
            type="button"
            onClick={handleGenerateAiSynthesis}
            disabled={isSynthesizingAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSynthesizingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            )}
            {language === "rw"
              ? "Isesengura Ryimbitse rya Gemini AI"
              : "Generate AI Agronomist Synthesis"}
          </button>
        </div>
      </div>

      {/* Optional AI Agronomist Synthesis Callout */}
      {currentAiSynthesis && (
        <div className="mx-5 mt-4 p-4 rounded-xl bg-emerald-50/90 border border-emerald-300 text-stone-800 text-xs leading-relaxed">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 text-xs uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              {language === "rw"
                ? `Umwanzuro wa AI kuri ${report.agroZone}`
                : `AI Agronomist Synthesis for ${report.agroZone}`}
            </span>
            <button
              type="button"
              onClick={() =>
                onAskAiPrompt(
                  language === "rw"
                    ? `Nsobanurira birambuye ingamba zo gutera no kurwanya ibyonyi muri ${report.agroZone}.`
                    : `Expand on the planting schedule and IPM spray regimen for ${report.agroZone}.`,
                  currentAiSynthesis
                )
              }
              className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
            >
              {language === "rw"
                ? "Komeza ikiganiro muri Chat →"
                : "Continue in Chat Stream →"}
            </button>
          </div>
          <div className="whitespace-pre-line text-stone-700">
            {currentAiSynthesis}
          </div>
        </div>
      )}

      {/* TAB 1: PLANTING TIME ADVISORY & 7-DAY SOWING CALENDAR */}
      {activeSubTab === "planting" && (
        <div className="p-5 space-y-5">
          {/* 7-Day Planting Suitability Timeline */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                {language === "rw"
                  ? `Ingengabihe y'Iminsi 7 yo Gutera muri ${report.agroZone}`
                  : `7-Day AgroZone Sowing & Soil Workability Calendar (${report.agroZone})`}
              </h4>
              <span className="text-xs font-semibold text-emerald-800">
                {language === "rw"
                  ? report.overallPlantingVerdictRw
                  : report.overallPlantingVerdictEn}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {report.dailyPlantingTimeline.map((slot) => {
                const badgeStyle =
                  slot.suitability === "optimal"
                    ? "border-emerald-300 bg-emerald-50/70"
                    : slot.suitability === "good"
                      ? "border-sky-200 bg-sky-50/50"
                      : slot.suitability === "caution"
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-rose-300 bg-rose-50/60";

                const pillStyle =
                  slot.suitability === "optimal"
                    ? "bg-emerald-700 text-white"
                    : slot.suitability === "good"
                      ? "bg-sky-700 text-white"
                      : slot.suitability === "caution"
                        ? "bg-amber-600 text-white"
                        : "bg-rose-700 text-white";

                return (
                  <div
                    key={slot.date}
                    className={`rounded-xl p-2.5 border ${badgeStyle} flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-800">
                        <span>
                          {language === "rw" ? slot.dayNameRw : slot.dayNameEn}
                        </span>
                        <span className="text-stone-500 font-normal">
                          {slot.date.slice(5)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-900">
                          {slot.tempMax}°/{slot.tempMin}°C
                        </span>
                        <span className="font-semibold text-sky-700">
                          {slot.rainMm}mm
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <span
                          className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${pillStyle}`}
                        >
                          {language === "rw" ? slot.labelRw : slot.labelEn}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-600 mt-1.5 leading-snug">
                      {language === "rw" ? slot.reasonRw : slot.reasonEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Crop-Specific Customized Planting Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {report.cropPlantingRecommendations.map((rec) => {
              const scheduleKey = `plant-${activeFarm.id}-${rec.cropName}`;
              const isScheduled = !!scheduledItemIds[scheduleKey];

              return (
                <div
                  key={rec.cropName}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                          {report.agroZone} • {report.altitude}m ASL
                        </span>
                        <h5 className="text-base font-bold text-stone-900 mt-0.5">
                          {rec.cropName}
                        </h5>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            rec.readinessStatus === "optimal_window"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : rec.readinessStatus === "soil_prep_window"
                                ? "bg-sky-100 text-sky-900 border border-sky-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          <Sprout className="w-3.5 h-3.5" />
                          {rec.readinessScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 inline-block px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 text-xs font-semibold">
                      {language === "rw"
                        ? rec.statusLabelRw
                        : rec.statusLabelEn}
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-stone-700">
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                        <span className="font-bold text-emerald-950">
                          {language === "rw"
                            ? "Itariki Nziza yo Gutera:"
                            : "Optimal Planting Dates:"}
                        </span>{" "}
                        <span className="text-emerald-900 font-semibold">
                          {language === "rw"
                            ? rec.bestPlantingDatesLabelRw
                            : rec.bestPlantingDatesLabelEn}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-stone-900">
                          {language === "rw"
                            ? "Imbuto Zemejwe na RAB:"
                            : "RAB-Certified Varieties for AgroZone:"}
                        </span>{" "}
                        <span className="text-stone-700">
                          {rec.rabCertifiedVarieties.join(" • ")}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-stone-900">
                          {language === "rw"
                            ? "Gutegura Umurima n'Ubujyakuzimu:"
                            : "Seedbed & Planting Depth:"}
                        </span>{" "}
                        <span>
                          {language === "rw"
                            ? rec.seedbedAndDepthRw
                            : rec.seedbedAndDepthEn}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-stone-900">
                          {language === "rw"
                            ? "Ifumbire y'Ibanze:"
                            : "Basal Fertilizer Timing:"}
                        </span>{" "}
                        <span>
                          {language === "rw"
                            ? rec.basalFertilizerTimingRw
                            : rec.basalFertilizerTimingEn}
                        </span>
                      </div>

                      <div className="text-stone-600 italic">
                        {language === "rw"
                          ? rec.weatherRationaleRw
                          : rec.weatherRationaleEn}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    {onAddActivity && (
                      <button
                        type="button"
                        onClick={() => handleSchedulePlantingTask(rec)}
                        disabled={isScheduled}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isScheduled
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-emerald-700 hover:bg-emerald-800 text-white"
                        }`}
                      >
                        {isScheduled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {language === "rw"
                              ? `Byashyizwe kuri ${rec.recommendedDateIso}`
                              : `Scheduled for ${rec.recommendedDateIso}`}
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            {language === "rw"
                              ? `panga Gutera (${rec.recommendedDateIso})`
                              : `Schedule Planting (${rec.recommendedDateIso})`}
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onAskAiPrompt(
                          language === "rw"
                            ? `Baza AI: Ni ryari natera ${rec.cropName} muri ${report.agroZone} (${report.farmName}) hakurikijwe imvura ya ${report.metrics.cumulativeRain7dMm}mm?`
                            : `Ask AI: Give me a step-by-step planting & basal fertilizer schedule for ${rec.cropName} in ${report.agroZone} given the ${report.metrics.cumulativeRain7dMm}mm 7-day forecast.`
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      {language === "rw"
                        ? "Baza AI kuri iki Gihingwa"
                        : "Ask AI Advisor"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMIZED PEST & DISEASE RISK MANAGEMENT */}
      {activeSubTab === "pest_risk" && (
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  {language === "rw"
                    ? `Integuza y'Ibyonyi n'Indwara muri ${report.agroZone}`
                    : `AgroZone Epidemiological Pest & Disease Matrix (${report.agroZone})`}
                </h4>
                <p className="text-xs font-semibold text-rose-800 mt-0.5">
                  {language === "rw"
                    ? report.overallPestAlertHeadlineRw
                    : report.overallPestAlertHeadlineEn}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-rose-900 bg-white px-2.5 py-1 rounded-lg border border-rose-200 shrink-0">
              {language === "rw"
                ? `Ubuhehere ku mababi: ~${report.metrics.estimatedLeafWetnessHoursPerDay}h/umunsi`
                : `Leaf Wetness: ~${report.metrics.estimatedLeafWetnessHoursPerDay}h/day`}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {report.pestRiskAssessments.map((pest) => {
              const scheduleKey = `pest-${pest.id}`;
              const isScheduled = !!scheduledItemIds[scheduleKey];

              const riskBadgeClass =
                pest.riskLevel === "critical"
                  ? "bg-rose-700 text-white"
                  : pest.riskLevel === "high"
                    ? "bg-amber-600 text-white"
                    : pest.riskLevel === "moderate"
                      ? "bg-yellow-500 text-stone-950"
                      : "bg-emerald-600 text-white";

              return (
                <div
                  key={pest.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-stone-500 uppercase">
                          {pest.targetCrop}
                        </span>
                        <h5 className="text-sm font-bold text-stone-900 mt-0.5">
                          {language === "rw"
                            ? pest.pestOrDiseaseNameRw
                            : pest.pestOrDiseaseNameEn}
                        </h5>
                        <p className="text-[11px] italic text-stone-500">
                          {pest.scientificName}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase shrink-0 ${riskBadgeClass}`}
                      >
                        {pest.riskLevel} • {pest.riskScore}%
                      </span>
                    </div>

                    {/* Risk Bar */}
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full rounded-full ${
                          pest.riskScore >= 78
                            ? "bg-rose-600"
                            : pest.riskScore >= 58
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${pest.riskScore}%` }}
                      />
                    </div>

                    <div className="mt-2">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {pest.favorableConditionsLabel}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-stone-700">
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80">
                        <span className="font-bold text-amber-950">
                          {language === "rw"
                            ? "Impamvu y'Iteganyagihe:"
                            : "AgroZone Weather Trigger:"}
                        </span>{" "}
                        <span>
                          {language === "rw"
                            ? pest.weatherTriggerSummaryRw
                            : pest.weatherTriggerSummaryEn}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-stone-900">
                          {language === "rw"
                            ? "Uko Bagenzura (Scouting):"
                            : "Field Scouting Protocol:"}
                        </span>{" "}
                        <span>
                          {language === "rw"
                            ? pest.scoutingProtocolRw
                            : pest.scoutingProtocolEn}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-stone-900">
                          {language === "rw"
                            ? "Uburyo Kamere (Cultural IPM):"
                            : "Cultural & Preventive IPM:"}
                        </span>{" "}
                        <span>
                          {language === "rw"
                            ? pest.ipmCulturalControlRw
                            : pest.ipmCulturalControlEn}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-stone-900">
                          {language === "rw"
                            ? "Umuti Wemejwe na RAB:"
                            : "RAB Treatment & Dosage:"}
                        </span>{" "}
                        <span>
                          {language === "rw"
                            ? pest.rabRecommendedTreatmentRw
                            : pest.rabRecommendedTreatmentEn}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                        <span className="font-bold">
                          {language === "rw"
                            ? "Igihe Cyiza cyo Gutera Umuti:"
                            : "Optimal Spray Window:"}
                        </span>{" "}
                        {language === "rw"
                          ? pest.optimalSprayWindowLabelRw
                          : pest.optimalSprayWindowLabelEn}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                    {onAddActivity && (
                      <button
                        type="button"
                        onClick={() => handleSchedulePestTask(pest)}
                        disabled={isScheduled}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isScheduled
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-rose-700 hover:bg-rose-800 text-white"
                        }`}
                      >
                        {isScheduled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {language === "rw"
                              ? `Byashyizwe kuri ${pest.optimalSprayDateIso}`
                              : `IPM Task Set (${pest.optimalSprayDateIso})`}
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            {language === "rw"
                              ? `Panga Kurwanya (${pest.optimalSprayDateIso})`
                              : `Schedule IPM (${pest.optimalSprayDateIso})`}
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onAskAiPrompt(
                          language === "rw"
                            ? `Baza AI: Ni gute narwanya ${pest.pestOrDiseaseNameRw} kuri ${pest.targetCrop} muri ${report.agroZone} hakurikijwe ubuhehere bwa ${report.metrics.avgHumidityPct}%?`
                            : `Ask AI: Provide a complete IPM scouting & spray protocol for ${pest.pestOrDiseaseNameEn} on ${pest.targetCrop} in ${report.agroZone} (${report.metrics.avgHumidityPct}% RH).`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-rose-700" />
                      {language === "rw" ? "Baza AI" : "Ask AI"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
