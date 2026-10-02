import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  IrrigationDemandAlert,
  Language,
  PredictiveDailyDepletion,
} from "../types";
import { calculateThreeDayWaterUsageForecast } from "../utils/irrigationDemand";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Droplets,
  Thermometer,
  Sun,
  Wind,
  CalendarPlus,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Gauge,
  Sprout,
  Clock,
  ArrowRight,
  Flame,
  CloudRain,
  Layers,
} from "lucide-react";

interface PredictiveWaterUsageWidgetProps {
  alerts: IrrigationDemandAlert[];
  farms?: Farm[];
  language: Language;
  onSchedulePredictiveWatering?: (activity: Omit<FarmActivity, "id">) => void;
  onNavigateToActivities?: () => void;
}

type TempTrendScenario = "baseline" | "warm" | "heatwave";

export const PredictiveWaterUsageWidget: React.FC<
  PredictiveWaterUsageWidgetProps
> = ({
  alerts,
  farms = [],
  language,
  onSchedulePredictiveWatering,
  onNavigateToActivities,
}) => {
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    alerts[0]?.farmId || "all"
  );
  const [tempScenario, setTempScenario] =
    useState<TempTrendScenario>("baseline");
  const [scheduledDayKeys, setScheduledDayKeys] = useState<string[]>([]);

  const tempAdjustmentC =
    tempScenario === "heatwave" ? 3.8 : tempScenario === "warm" ? 1.8 : 0;

  // Compute dynamic 3-day forecasts for every alert based on current moisture + temperature scenario
  const enrichedAlerts = useMemo(() => {
    return alerts.map((alert) => {
      const matchedFarm = farms.find((f) => f.id === alert.farmId);
      const sizeHa = alert.farmSizeHa || matchedFarm?.sizeHa || 1.5;

      const dynamicForecast = calculateThreeDayWaterUsageForecast({
        currentMoisturePct: alert.soilMoisturePercentage,
        thresholdPct: alert.thresholdPercentage,
        cropCoefficientKc: alert.growthStageSummary.cropCoefficientKc,
        baseTempC: alert.weatherSummary.tempC,
        baseHumidityPct: alert.weatherSummary.humidity,
        baseRainMm: alert.weatherSummary.rainfallMm,
        soilType: alert.soilType,
        district: alert.district,
        sizeHa,
        tempTrendAdjustmentC: tempAdjustmentC,
      });

      const total3DayWaterLiters = dynamicForecast.reduce(
        (sum, d) => sum + d.predictiveWaterLiters,
        0
      );
      const total3DayWaterMm = dynamicForecast.reduce(
        (sum, d) => sum + d.predictiveWaterMm,
        0
      );
      const total3DayEtcMm =
        Math.round(
          dynamicForecast.reduce((sum, d) => sum + d.cropEtcMm, 0) * 10
        ) / 10;
      const total3DayDepletionPct =
        Math.round(
          dynamicForecast.reduce((sum, d) => sum + d.moistureDepletionPct, 0) *
            10
        ) / 10;
      const totalPumpHours =
        Math.round(
          dynamicForecast.reduce((sum, d) => sum + d.pumpRuntimeHours, 0) * 10
        ) / 10;

      return {
        alert,
        sizeHa,
        forecast: dynamicForecast,
        total3DayWaterLiters,
        total3DayWaterMm,
        total3DayEtcMm,
        total3DayDepletionPct,
        totalPumpHours,
      };
    });
  }, [alerts, farms, tempAdjustmentC]);

  // Active parcel selection (fallback to first parcel if selectedFarmId not found)
  const activeParcelEntry = useMemo(() => {
    return (
      enrichedAlerts.find((item) => item.alert.farmId === selectedFarmId) ||
      enrichedAlerts[0]
    );
  }, [enrichedAlerts, selectedFarmId]);

  // Aggregate metrics across all parcels
  const aggregateSummary = useMemo(() => {
    const totalLitersAllFarms = enrichedAlerts.reduce(
      (sum, item) => sum + item.total3DayWaterLiters,
      0
    );
    const avg3DayEtcMm =
      enrichedAlerts.length > 0
        ? Math.round(
            (enrichedAlerts.reduce(
              (sum, item) => sum + item.total3DayEtcMm,
              0
            ) /
              enrichedAlerts.length) *
              10
          ) / 10
        : 0;
    const parcelsBreachingThresholdCount = enrichedAlerts.filter((item) =>
      item.forecast.some((d) => d.isBelowThreshold)
    ).length;
    const totalPumpHoursAllFarms =
      Math.round(
        enrichedAlerts.reduce((sum, item) => sum + item.totalPumpHours, 0) * 10
      ) / 10;

    return {
      totalLitersAllFarms,
      totalCubicMeters: Math.round((totalLitersAllFarms / 1000) * 10) / 10,
      avg3DayEtcMm,
      parcelsBreachingThresholdCount,
      totalPumpHoursAllFarms,
    };
  }, [enrichedAlerts]);

  // Build Recharts 4-point trajectory (Today/Now -> Day +1 -> Day +2 -> Day +3)
  const chartData = useMemo(() => {
    if (!activeParcelEntry) return [];
    const { alert, forecast } = activeParcelEntry;

    // Also compute a managed/irrigated moisture curve showing what happens when predictive irrigation is applied
    let irrigatedMoisture = alert.soilMoisturePercentage;

    const points = [
      {
        name: language === "rw" ? "Uyu Munsi (None)" : "Today (Now)",
        shortLabel: language === "rw" ? "None" : "Now",
        unwateredMoisturePct: alert.soilMoisturePercentage,
        managedMoisturePct: alert.soilMoisturePercentage,
        cropEtcMm:
          Math.round(
            (0.14 * alert.weatherSummary.tempC +
              1.35 * (alert.vaporPressureDeficitKpa || 0.9) +
              0.45) *
              alert.growthStageSummary.cropCoefficientKc *
              10
          ) / 10,
        tempC: alert.weatherSummary.tempC,
        predictiveWaterKl: Math.round(
          (alert.recommendedWaterLitersPerHa * activeParcelEntry.sizeHa) / 1000
        ),
        predictiveWaterMm: alert.recommendedWaterMm,
        depletionPct: 0,
        thresholdPct: alert.thresholdPercentage,
      },
    ];

    forecast.forEach((day) => {
      // If predictive irrigation is applied on days when below threshold, moisture rebounds toward 72%
      const afterDepletion = irrigatedMoisture - day.moistureDepletionPct;
      if (afterDepletion <= alert.thresholdPercentage + 4) {
        irrigatedMoisture = Math.min(76, Math.round(afterDepletion + day.predictiveWaterMm * 1.45));
      } else {
        irrigatedMoisture = Math.max(42, Math.round(afterDepletion));
      }

      points.push({
        name: language === "rw" ? day.dayLabelRw : day.dayLabelEn,
        shortLabel:
          day.dayOffset === 1
            ? language === "rw"
              ? "Ejo (+1d)"
              : "Day +1"
            : language === "rw"
            ? `Umunsi +${day.dayOffset}`
            : `Day +${day.dayOffset}`,
        unwateredMoisturePct: day.projectedEndMoisturePct,
        managedMoisturePct: irrigatedMoisture,
        cropEtcMm: day.cropEtcMm,
        tempC: day.forecastTempC,
        predictiveWaterKl:
          Math.round((day.predictiveWaterLiters / 1000) * 10) / 10,
        predictiveWaterMm: day.predictiveWaterMm,
        depletionPct: day.moistureDepletionPct,
        thresholdPct: alert.thresholdPercentage,
      });
    });

    return points;
  }, [activeParcelEntry, language]);

  if (!activeParcelEntry || alerts.length === 0) return null;

  const { alert: currentAlert, forecast: currentForecast, sizeHa } =
    activeParcelEntry;

  const handleScheduleDayWatering = (day: PredictiveDailyDepletion) => {
    const key = `${currentAlert.farmId}-${day.dateStr}`;
    if (scheduledDayKeys.includes(key)) return;

    if (onSchedulePredictiveWatering) {
      onSchedulePredictiveWatering({
        farmId: currentAlert.farmId,
        farmName: currentAlert.farmName,
        crop: currentAlert.crop,
        title:
          language === "rw"
            ? `Kuhira Byateganyijwe (${day.dayLabelRw}): ${currentAlert.crop} — ${day.predictiveWaterMm}mm (${day.predictiveWaterLiters.toLocaleString()} L)`
            : `Predictive Irrigation (${day.dayLabelEn}): ${currentAlert.crop} — ${day.predictiveWaterMm}mm (${day.predictiveWaterLiters.toLocaleString()} L)`,
        category: "irrigation",
        dueDate: day.dateStr,
        status: "pending",
        assignedTo: "Abakozi bo Kuhira (Irrigation Team)",
        notes:
          language === "rw"
            ? `Iteganyamazi ry'iminsi 3: ETc = ${day.cropEtcMm}mm/umunsi ku bushyuhe bwa ${day.forecastTempC}°C. Ubuhehere bwavuye kuri ${day.startMoisturePct}% bugera kuri ${day.projectedEndMoisturePct}% (-${day.moistureDepletionPct}%).`
            : `3-Day Predictive Water Usage Forecast: Expected ETc = ${day.cropEtcMm}mm/day at ${day.forecastTempC}°C. Soil moisture projected to deplete from ${day.startMoisturePct}% to ${day.projectedEndMoisturePct}% (-${day.moistureDepletionPct}%).`,
      });
    }

    setScheduledDayKeys((prev) => [...prev, key]);
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-900 text-white border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {language === "rw"
                  ? "ITEGANYAMAZI RY'IMINSI 3 (ETc & DEPLETION)"
                  : "3-DAY PREDICTIVE WATER USAGE FORECAST"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Penman-Monteith ET₀ × Kc Model
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
              {language === "rw"
                ? "Ibara ry'Amazi Azakenerwa n'Igabanuka ry'Ubuhehere mu Butaka (72h)"
                : "72-Hour Soil Moisture Depletion & Predictive Irrigation Demand"}
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              {language === "rw"
                ? "Bara ingano y'amazi azakenerwa mu minsi 3 iri imbere hashingiwe ku gukama kw'amazi mu bihingwa (Evapotranspiration ETc) n'imihindagurikire y'ubushyuhe."
                : "Calculates expected root-zone soil moisture depletion (% VWC) from forecasted crop evapotranspiration (ETc) and local temperature trends."}
            </p>
          </div>
        </div>

        {/* Local Temperature Trend Simulation Switcher */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {language === "rw"
                ? "Igereranya ry'Ubushyuhe (Temp Trend):"
                : "Local Temperature Trend Scenario:"}
            </span>
          </span>
          <div className="inline-flex items-center p-1 rounded-xl bg-stone-950/90 border border-stone-800 gap-1">
            <button
              type="button"
              onClick={() => setTempScenario("baseline")}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                tempScenario === "baseline"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {language === "rw" ? "Meteo Isanzwe (+0°C)" : "Forecast Baseline"}
            </button>
            <button
              type="button"
              onClick={() => setTempScenario("warm")}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                tempScenario === "warm"
                  ? "bg-amber-500 text-stone-950 shadow-2xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {language === "rw" ? "Izuba Ryinshi (+1.8°C)" : "Warm Trend (+1.8°C)"}
            </button>
            <button
              type="button"
              onClick={() => setTempScenario("heatwave")}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                tempScenario === "heatwave"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>
                {language === "rw" ? "Ubushyuhe Bukabije (+3.8°C)" : "Heatwave (+3.8°C)"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate 3-Day KPI Strip across all farms */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:px-6 bg-stone-50/80 dark:bg-stone-950/50 border-b border-stone-200/80 dark:border-stone-800">
        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Amazi Yose mu Minsi 3 (Imirima Yose)"
                : "Total 3-Day Predictive Water"}
            </span>
            <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {aggregateSummary.totalLitersAllFarms.toLocaleString()}{" "}
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              L
            </span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
            {aggregateSummary.totalCubicMeters} m³ • {enrichedAlerts.length}{" "}
            {language === "rw" ? "imirima" : "parcels"}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Gukama kw'Amazi (3-Day Crop ETc)"
                : "3-Day Forecasted Crop ETc"}
            </span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {activeParcelEntry.total3DayEtcMm}{" "}
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              mm / 72h
            </span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
            Kc = {currentAlert.growthStageSummary.cropCoefficientKc} •{" "}
            {currentAlert.crop}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Igabanuka ry'Ubuhehere (72h Drop)"
                : "Expected 72h Moisture Depletion"}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            -{activeParcelEntry.total3DayDepletionPct}%{" "}
            <span className="text-xs font-bold text-stone-500">VWC</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono">
            {currentAlert.soilMoisturePercentage}% →{" "}
            {currentForecast[2]?.projectedEndMoisturePct}% (Day +3)
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Isaha ya Pompo & Imirima iri mu Kaga"
                : "Est. Pump Runtime & Stress Risk"}
            </span>
            <Gauge className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {aggregateSummary.totalPumpHoursAllFarms}{" "}
            <span className="text-xs font-bold text-stone-500">hrs</span>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            {aggregateSummary.parcelsBreachingThresholdCount}{" "}
            {language === "rw"
              ? "imirima izajya munsi y'urugero mu masaha 72"
              : "parcels breach threshold within 72h"}
          </div>
        </div>
      </div>

      {/* Parcel Selector Pills */}
      <div className="px-4 sm:px-6 py-3 bg-white dark:bg-stone-900 border-b border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>
              {language === "rw" ? "Hitamo Umurima:" : "Select Parcel Forecast:"}
            </span>
          </span>
          {enrichedAlerts.map((item) => {
            const isSelected = item.alert.farmId === currentAlert.farmId;
            const day3Moisture =
              item.forecast[2]?.projectedEndMoisturePct ??
              item.alert.soilMoisturePercentage;
            const willBreach = item.forecast.some((d) => d.isBelowThreshold);

            return (
              <button
                key={item.alert.farmId}
                type="button"
                onClick={() => setSelectedFarmId(item.alert.farmId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-emerald-800 text-white border-emerald-800 shadow-2xs"
                    : "bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-600"
                }`}
              >
                <span>{item.alert.farmName}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? "bg-emerald-950/70 text-emerald-200"
                      : willBreach
                      ? "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300"
                      : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  }`}
                >
                  {item.alert.soilMoisturePercentage}% → {day3Moisture}%
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono">
          <span>
            {currentAlert.district} • {sizeHa} Ha • {currentAlert.soilType}
          </span>
        </div>
      </div>

      {/* Main Content Grid: Left = Recharts Depletion & Water Usage Trajectory | Right = 3-Day Predictive Cards */}
      <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 5 Cols: Recharts 72-Hour Soil Moisture Depletion vs Predictive Irrigation Curve */}
        <div className="xl:col-span-5 flex flex-col justify-between rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 p-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? `Imbonerahamwe y'Igabanuka ry'Ubuhehere (${currentAlert.farmName})`
                    : `72h Moisture Depletion vs. Managed Curve (${currentAlert.farmName})`}
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {language === "rw"
                    ? "Umurongo utukura: Ubuhehere budafite kuhira • Umurongo w'icyatsi: Nyuma yo kuhira"
                    : "Solid Amber/Rose: Unwatered depletion • Dashed Emerald: With predictive watering"}
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 shrink-0">
                {activeParcelEntry.total3DayWaterLiters.toLocaleString()} L / 3d
              </span>
            </div>

            <div className="h-60 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="depletionFillGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#78716c"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: "#78716c", fontWeight: 600 }}
                  />
                  <YAxis
                    yAxisId="moisture"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: "#78716c" }}
                  />
                  <YAxis
                    yAxisId="water"
                    orientation="right"
                    domain={[0, 35]}
                    unit="mm"
                    tick={{ fontSize: 10, fill: "#059669" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1917",
                      borderColor: "#44403c",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f5f5f4",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "unwateredMoisturePct") {
                        return [
                          `${value}% VWC`,
                          language === "rw"
                            ? "Ubuhehere hatabayeho kuhira"
                            : "Projected Depleted Moisture",
                        ];
                      }
                      if (name === "managedMoisturePct") {
                        return [
                          `${value}% VWC`,
                          language === "rw"
                            ? "Ubuhehere nyuma yo kuhira"
                            : "Moisture with Predictive Irrigation",
                        ];
                      }
                      if (name === "predictiveWaterMm") {
                        return [
                          `${value} mm (${(
                            value *
                            10000 *
                            sizeHa
                          ).toLocaleString()} L)`,
                          language === "rw"
                            ? "Amazi ateganyijwe"
                            : "Predictive Water Usage",
                        ];
                      }
                      return [value, name];
                    }}
                  />
                  <ReferenceLine
                    yAxisId="moisture"
                    y={currentAlert.thresholdPercentage}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value:
                        language === "rw"
                          ? `Urugero Fatizo (${currentAlert.thresholdPercentage}%)`
                          : `Stress Threshold (${currentAlert.thresholdPercentage}%)`,
                      fill: "#e11d48",
                      fontSize: 10,
                      position: "insideBottomLeft",
                    }}
                  />
                  <Bar
                    yAxisId="water"
                    dataKey="predictiveWaterMm"
                    fill="#10b981"
                    fillOpacity={0.35}
                    radius={[6, 6, 0, 0]}
                    barSize={22}
                  />
                  <Area
                    yAxisId="moisture"
                    type="monotone"
                    dataKey="unwateredMoisturePct"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    fill="url(#depletionFillGrad)"
                    dot={{ r: 4, fill: "#e11d48" }}
                  />
                  <Line
                    yAxisId="moisture"
                    type="monotone"
                    dataKey="managedMoisturePct"
                    stroke="#059669"
                    strokeWidth={2.2}
                    strokeDasharray="5 4"
                    dot={{ r: 3.5, fill: "#059669" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend & Evapotranspiration Equation Summary */}
          <div className="mt-3 pt-3 border-t border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                <span>
                  {language === "rw"
                    ? "Igabanuka (Depletion)"
                    : "Unwatered Depletion (% VWC)"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span>
                  {language === "rw"
                    ? "Amazi Ateganyijwe (mm)"
                    : "Predictive Water (mm)"}
                </span>
              </span>
            </div>
            <span className="font-mono text-[10px] text-stone-500">
              {currentAlert.growthStageSummary.stageName} (Kc:{" "}
              {currentAlert.growthStageSummary.cropCoefficientKc})
            </span>
          </div>
        </div>

        {/* Right 7 Cols: 3-Day Day-by-Day Predictive Depletion & Water Usage Cards */}
        <div className="xl:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {currentForecast.map((day) => {
              const scheduleKey = `${currentAlert.farmId}-${day.dateStr}`;
              const isScheduled = scheduledDayKeys.includes(scheduleKey);

              return (
                <div
                  key={day.dayOffset}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    day.isBelowThreshold
                      ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20"
                      : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                  }`}
                >
                  <div>
                    {/* Day Header & Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-stone-900 dark:text-white">
                          {language === "rw" ? day.dayLabelRw : day.dayLabelEn}
                        </span>
                        <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                          {day.dateStr}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          day.isBelowThreshold
                            ? "bg-rose-600 text-white"
                            : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {day.isBelowThreshold
                          ? language === "rw"
                            ? "MUNSI Y'URUGERO"
                            : "STRESS RISK"
                          : language === "rw"
                          ? "UBUHEHERE BWIZA"
                          : "BUFFER OK"}
                      </span>
                    </div>

                    {/* Local Temp Trend + VPD + Rain Strip */}
                    <div className="mt-3 p-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-800/60 grid grid-cols-3 gap-1.5 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          Temp
                        </div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">
                          {day.forecastTempC}°C
                        </div>
                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                          +{day.tempDeltaC}°C
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          ETc Loss
                        </div>
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          {day.cropEtcMm}mm
                        </div>
                        <div className="text-[9px] text-stone-500">
                          ET₀ {day.referenceEt0Mm}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          RH / Rain
                        </div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">
                          {day.forecastHumidityPct}%
                        </div>
                        <div className="text-[9px] text-emerald-700 dark:text-emerald-400">
                          {day.forecastRainMm}mm
                        </div>
                      </div>
                    </div>

                    {/* Expected Soil Moisture Depletion Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-stone-600 dark:text-stone-300">
                          {language === "rw"
                            ? "Ubuhehere (Depletion):"
                            : "Moisture Depletion:"}
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          -{day.moistureDepletionPct}% VWC
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 dark:text-stone-400 mb-1.5">
                        <span>{day.startMoisturePct}% start</span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span
                          className={`font-black ${
                            day.isBelowThreshold
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {day.projectedEndMoisturePct}% end
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            day.isBelowThreshold
                              ? "bg-rose-600"
                              : day.projectedEndMoisturePct <=
                                currentAlert.thresholdPercentage + 10
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                          }`}
                          style={{
                            width: `${Math.max(
                              10,
                              Math.min(100, day.projectedEndMoisturePct)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Predictive Water Usage Box */}
                    <div className="mt-3 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        {language === "rw"
                          ? "Amazi Ateganyijwe:"
                          : "Predictive Water Usage:"}
                      </div>
                      <div className="flex items-baseline justify-between mt-0.5 font-mono tabular-nums">
                        <span className="text-base font-black text-emerald-950 dark:text-white">
                          {day.predictiveWaterLiters.toLocaleString()} L
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {day.predictiveWaterMm} mm
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono mt-0.5 flex items-center justify-between">
                        <span>
                          {day.predictiveWaterLitersPerHa.toLocaleString()} L/Ha
                        </span>
                        <span>~{day.pumpRuntimeHours}h pump</span>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Day +N Irrigation Action Button */}
                  <button
                    type="button"
                    onClick={() => handleScheduleDayWatering(day)}
                    disabled={isScheduled}
                    className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isScheduled
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 cursor-default"
                        : day.isBelowThreshold
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                        : "bg-emerald-800 hover:bg-emerald-900 text-white"
                    }`}
                  >
                    {isScheduled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {language === "rw"
                            ? "Byashyizwe kuri Gahunda"
                            : "Watering Scheduled"}
                        </span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>
                          {language === "rw"
                            ? `Gena Kuhira (${day.predictiveWaterMm}mm)`
                            : `Schedule (${day.predictiveWaterMm}mm)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Multi-Parcel 3-Day Water Allocation Summary Strip */}
          <div className="rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <Sprout className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs text-stone-700 dark:text-stone-300">
                <span className="font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? `Inama ya RAB kuri ${currentAlert.farmName}: `
                    : `RAB 72h Water Allocation Advisory (${currentAlert.farmName}): `}
                </span>
                {language === "rw"
                  ? `Ubuhehere buzamanuka ho -${activeParcelEntry.total3DayDepletionPct}% mu minsi 3 kubera ETc ya ${activeParcelEntry.total3DayEtcMm}mm. Teganya litiro ${activeParcelEntry.total3DayWaterLiters.toLocaleString()} L (${activeParcelEntry.total3DayWaterMm}mm) kuri Ha ${sizeHa}.`
                  : `Root-zone moisture is projected to deplete by -${activeParcelEntry.total3DayDepletionPct}% over 72h due to ${activeParcelEntry.total3DayEtcMm}mm cumulative crop ETc. Reserve ${activeParcelEntry.total3DayWaterLiters.toLocaleString()} L (${activeParcelEntry.total3DayWaterMm}mm) across ${sizeHa} Ha.`}
              </div>
            </div>

            {onNavigateToActivities && (
              <button
                type="button"
                onClick={onNavigateToActivities}
                className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline shrink-0"
              >
                {language === "rw"
                  ? "Reba Ingengabihe y'Imirimo →"
                  : "View Irrigation Calendar →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
