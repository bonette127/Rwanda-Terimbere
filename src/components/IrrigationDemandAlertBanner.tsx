import React, { useEffect, useState } from "react";
import {
  FarmActivity,
  IrrigationDemandAlert,
  Language,
  ParcelSoilSensorReading,
  SoilSensorSourceMode,
} from "../types";
import {
  Droplets,
  Thermometer,
  CloudRain,
  Wind,
  CheckCircle2,
  CalendarPlus,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  Clock,
  Sprout,
  AlertTriangle,
  SlidersHorizontal,
  RefreshCw,
  Cpu,
  Radio,
  BatteryCharging,
  Gauge,
} from "lucide-react";
import {
  triggerIrrigationDemandPushNotification,
  DEFAULT_CRITICAL_HUMIDITY_THRESHOLD,
} from "../utils/irrigationDemand";

interface IrrigationDemandAlertBannerProps {
  alerts: IrrigationDemandAlert[];
  language: Language;
  onCreateWateringTask: (activity: Omit<FarmActivity, "id">) => void;
  onMarkWateredNow: (farmId: string, crop: string) => void;
  onDismissAlert?: (alertId: string) => void;
  onNavigateToActivities?: () => void;
  criticalHumidityThreshold?: number;
  onChangeHumidityThreshold?: (threshold: number) => void;
  onSimulateHumidityDrop?: () => void;
  onResetHumiditySimulation?: () => void;
  isHumiditySimulated?: boolean;
  sensorReadingsByFarmId?: Record<string, ParcelSoilSensorReading>;
  onUpdateParcelSensorReading?: (
    farmId: string,
    reading: ParcelSoilSensorReading | null
  ) => void;
  onBatchUpdateSensorReadings?: (
    readings: Record<string, ParcelSoilSensorReading>
  ) => void;
}

export const IrrigationDemandAlertBanner: React.FC<IrrigationDemandAlertBannerProps> = ({
  alerts,
  language,
  onCreateWateringTask,
  onMarkWateredNow,
  onDismissAlert,
  onNavigateToActivities,
  criticalHumidityThreshold = DEFAULT_CRITICAL_HUMIDITY_THRESHOLD,
  onChangeHumidityThreshold,
  onSimulateHumidityDrop,
  onResetHumiditySimulation,
  isHumiditySimulated = false,
  sensorReadingsByFarmId = {},
  onUpdateParcelSensorReading,
  onBatchUpdateSensorReadings,
}) => {
  const [expandedGuidelineId, setExpandedGuidelineId] = useState<string | null>(null);
  const [testedPushAlertId, setTestedPushAlertId] = useState<string | null>(null);
  const [actionDoneAlertIds, setActionDoneAlertIds] = useState<string[]>([]);
  const [isSensorSimulatorOpen, setIsSensorSimulatorOpen] = useState<boolean>(true);
  const [isLiveIotStreamActive, setIsLiveIotStreamActive] = useState<boolean>(false);

  // Filter alerts that require attention (critical, high, moderate, or low-humidity climate breach)
  const activeAlerts = alerts.filter(
    (a) =>
      (a.status === "critical" ||
        a.status === "high" ||
        a.status === "moderate" ||
        a.isLowHumidityAlert) &&
      !actionDoneAlertIds.includes(a.id)
  );

  const lowHumidityAlerts = activeAlerts.filter((a) => a.isLowHumidityAlert);
  const activeSensorCount = Object.values(sensorReadingsByFarmId).filter(
    (r) => r && (r.mode === "iot_telemetry" || r.mode === "manual_probe")
  ).length;

  // Periodic live IoT telemetry drift when "Live IoT Stream" is toggled on
  useEffect(() => {
    if (!isLiveIotStreamActive || !onBatchUpdateSensorReadings) return;

    const interval = setInterval(() => {
      const nextMap: Record<string, ParcelSoilSensorReading> = {
        ...sensorReadingsByFarmId,
      };
      let changed = false;

      alerts.forEach((alert, idx) => {
        const existing = nextMap[alert.farmId];
        if (existing && existing.mode === "iot_telemetry") {
          const delta = idx % 2 === 0 ? -1 : 1;
          const nextMoisture = Math.max(
            14,
            Math.min(92, existing.moisturePercentage + delta)
          );
          nextMap[alert.farmId] = {
            ...existing,
            moisturePercentage: nextMoisture,
            soilTempC: Math.round((existing.soilTempC + (idx === 0 ? 0.1 : -0.1)) * 10) / 10,
            updatedAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          };
          changed = true;
        }
      });

      if (changed) {
        onBatchUpdateSensorReadings(nextMap);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveIotStreamActive, alerts, sensorReadingsByFarmId, onBatchUpdateSensorReadings]);

  if (alerts.length === 0) return null;

  const buildDefaultSensorReading = (
    alert: IrrigationDemandAlert,
    mode: SoilSensorSourceMode,
    moistureOverride?: number,
    depthOverride?: number
  ): ParcelSoilSensorReading => {
    const existing = sensorReadingsByFarmId[alert.farmId];
    const prefix = (alert.district || "RWA").slice(0, 3).toUpperCase();
    const numSuffix = alert.farmId.replace(/\D/g, "") || "1";
    const sensorId =
      mode === "iot_telemetry"
        ? `IOT-SM-${prefix}-0${numSuffix}`
        : `PROBE-${prefix}-0${numSuffix}`;

    return {
      farmId: alert.farmId,
      mode,
      sensorId,
      moisturePercentage:
        moistureOverride !== undefined
          ? moistureOverride
          : existing?.moisturePercentage ?? alert.soilMoisturePercentage,
      soilTempC: existing?.soilTempC ?? Math.max(15, alert.weatherSummary.tempC - 2),
      ecDsM: existing?.ecDsM ?? (alert.district.toLowerCase() === "musanze" ? 1.4 : 1.1),
      probeDepthCm: depthOverride ?? existing?.probeDepthCm ?? 15,
      batteryPct: mode === "iot_telemetry" ? existing?.batteryPct ?? 94 : undefined,
      signalRssiDbm: mode === "iot_telemetry" ? existing?.signalRssiDbm ?? -67 : undefined,
      updatedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  const handleSetParcelMode = (
    alert: IrrigationDemandAlert,
    mode: SoilSensorSourceMode
  ) => {
    if (!onUpdateParcelSensorReading) return;
    if (mode === "weather_model") {
      onUpdateParcelSensorReading(alert.farmId, null);
      return;
    }
    const nextReading = buildDefaultSensorReading(alert, mode);
    onUpdateParcelSensorReading(alert.farmId, nextReading);
  };

  const handleChangeParcelMoisture = (
    alert: IrrigationDemandAlert,
    newMoisture: number,
    forcedMode?: SoilSensorSourceMode
  ) => {
    if (!onUpdateParcelSensorReading) return;
    const clamped = Math.max(10, Math.min(96, Math.round(newMoisture)));
    const currentMode =
      forcedMode ||
      (sensorReadingsByFarmId[alert.farmId]?.mode &&
      sensorReadingsByFarmId[alert.farmId]?.mode !== "weather_model"
        ? sensorReadingsByFarmId[alert.farmId]!.mode
        : "manual_probe");

    const nextReading = buildDefaultSensorReading(alert, currentMode, clamped);
    onUpdateParcelSensorReading(alert.farmId, nextReading);
    // If moisture drops below threshold, ensure it's visible in active alerts
    if (clamped <= alert.thresholdPercentage) {
      setActionDoneAlertIds((prev) => prev.filter((id) => id !== alert.id));
    }
  };

  const handleChangeProbeDepth = (
    alert: IrrigationDemandAlert,
    depthCm: number
  ) => {
    if (!onUpdateParcelSensorReading) return;
    const existing = sensorReadingsByFarmId[alert.farmId];
    const mode =
      existing && existing.mode !== "weather_model" ? existing.mode : "manual_probe";
    const nextReading = buildDefaultSensorReading(
      alert,
      mode,
      existing?.moisturePercentage ?? alert.soilMoisturePercentage,
      depthCm
    );
    onUpdateParcelSensorReading(alert.farmId, nextReading);
  };

  const handleConnectAllIotSensors = (scenario: "current" | "drought" | "optimal") => {
    if (!onBatchUpdateSensorReadings) return;
    const nextMap: Record<string, ParcelSoilSensorReading> = {};
    alerts.forEach((alert, idx) => {
      const targetMoisture =
        scenario === "drought"
          ? Math.max(18, 22 - idx * 2)
          : scenario === "optimal"
          ? Math.min(82, 72 + idx * 3)
          : sensorReadingsByFarmId[alert.farmId]?.moisturePercentage ??
            Math.max(24, alert.soilMoisturePercentage - 6);

      nextMap[alert.farmId] = buildDefaultSensorReading(
        alert,
        "iot_telemetry",
        targetMoisture
      );
    });
    onBatchUpdateSensorReadings(nextMap);
    if (scenario === "drought") {
      setActionDoneAlertIds([]);
    }
  };

  const handleResetAllSensors = () => {
    setIsLiveIotStreamActive(false);
    onBatchUpdateSensorReadings?.({});
  };

  const handleSimulatePush = async (alert: IrrigationDemandAlert) => {
    setTestedPushAlertId(alert.id);
    await triggerIrrigationDemandPushNotification(alert, language);
    setTimeout(() => {
      setTestedPushAlertId(null);
    }, 3500);
  };

  const handleScheduleTask = (alert: IrrigationDemandAlert) => {
    onCreateWateringTask(alert.suggestedActivity);
    setActionDoneAlertIds((prev) => [...prev, alert.id]);
  };

  const handleWaterNow = (alert: IrrigationDemandAlert) => {
    onMarkWateredNow(alert.farmId, alert.crop);
    setActionDoneAlertIds((prev) => [...prev, alert.id]);
  };

  return (
    <div className="rounded-2xl bg-[#064E3B] dark:bg-stone-900 border border-emerald-800 dark:border-stone-800 p-4 sm:p-6 text-white shadow-md space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-emerald-800/80 dark:border-stone-800">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-xs">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white font-display">
                {language === "rw"
                  ? "Ubuhehere bw'Ubutaka, IoT Sensors & Integuza y'Ikirere"
                  : "Irrigation Demand, IoT Soil Moisture Sensors & Climate Alerts"}
              </h3>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-500 text-stone-950 tracking-wider font-mono">
                {activeAlerts.length} {activeAlerts.length === 1 ? "FIELD ALERT" : "FIELD ALERTS"}
              </span>
              {activeSensorCount > 0 && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-cyan-400 text-stone-950 tracking-wider font-mono flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  <span>
                    {activeSensorCount}{" "}
                    {language === "rw" ? "IOT / PROBE ZIKORA" : "ACTIVE SENSORS"}
                  </span>
                </span>
              )}
              {lowHumidityAlerts.length > 0 && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-rose-600 text-white tracking-wider font-mono flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  <span>
                    {lowHumidityAlerts.length}{" "}
                    {language === "rw"
                      ? `UBUKONJE < ${criticalHumidityThreshold}%`
                      : `HUMIDITY < ${criticalHumidityThreshold}%`}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-100/90 mt-1">
              {language === "rw"
                ? "Injiza igipimo cy'ubuhehere bw'ubutaka n'intoki cyangwa uhuze na IoT Soil Sensors kuri buri murima kugira ngo impuruza zo kuhira zihinduke ako kanya."
                : "Manually enter soil probe readings or connect simulated IoT soil moisture sensors per parcel to dynamically drive real-time irrigation alerts."}
            </p>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setIsSensorSimulatorOpen((prev) => !prev)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isSensorSimulatorOpen
                ? "bg-cyan-400 text-stone-950 border-cyan-300 shadow-2xs"
                : "bg-emerald-950/70 hover:bg-emerald-950 text-cyan-200 border-cyan-500/40"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>
              {language === "rw"
                ? "IoT Soil Sensors & Igipimo"
                : "IoT Soil Sensor Simulator"}
            </span>
            {isSensorSimulatorOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {(activeAlerts[0] || alerts[0]) && (
            <button
              type="button"
              onClick={() =>
                handleSimulatePush(lowHumidityAlerts[0] || activeAlerts[0] || alerts[0])
              }
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Push real-time climate & irrigation notification to Dashboard"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {testedPushAlertId
                  ? language === "rw"
                    ? "Push Yagezeho!"
                    : "Push Sent!"
                  : language === "rw"
                  ? "Ohereza Push"
                  : "Push Alert"}
              </span>
            </button>
          )}

          {onNavigateToActivities && (
            <button
              type="button"
              onClick={onNavigateToActivities}
              className="px-3 py-2 rounded-xl text-emerald-100 hover:text-white bg-emerald-950/60 hover:bg-emerald-950 border border-emerald-700/60 transition-colors text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>{language === "rw" ? "Gahunda yo Kuhira" : "Schedules"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Climate & Critical Humidity Threshold Control Strip */}
      <div className="p-3.5 rounded-xl bg-emerald-950/75 dark:bg-stone-950/80 border border-emerald-800/80 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>
              {language === "rw"
                ? "Urugero Fatizo rw'Ubukonje bw'Umwuka (Critical Humidity Threshold):"
                : "Critical Forecast Humidity Threshold:"}
            </span>
          </div>

          {onChangeHumidityThreshold ? (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={40}
                max={78}
                step={2}
                value={criticalHumidityThreshold}
                onChange={(e) => onChangeHumidityThreshold(Number(e.target.value))}
                className="w-28 accent-amber-400 cursor-pointer"
              />
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-mono font-black text-xs">
                {criticalHumidityThreshold}% RH
              </span>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-mono font-black text-xs">
              {criticalHumidityThreshold}% RH
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSimulateHumidityDrop && (
            <button
              type="button"
              onClick={onSimulateHumidityDrop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "Gerageza Igabanuka ry'Ubukonje (41% RH + Push)"
                  : "Simulate Humidity Drop (41% RH + Push)"}
              </span>
            </button>
          )}

          {isHumiditySimulated && onResetHumiditySimulation && (
            <button
              type="button"
              onClick={onResetHumiditySimulation}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === "rw" ? "Subiza Ikirere Gisanzwe" : "Reset Forecast"}</span>
            </button>
          )}
        </div>
      </div>

      {/* INTERACTIVE IoT SOIL MOISTURE SENSOR & MANUAL PROBE SIMULATION MODULE */}
      {isSensorSimulatorOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/90 border border-cyan-500/40 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm sm:text-base font-black text-white">
                  {language === "rw"
                    ? "Simulation ya IoT Soil Moisture Sensors & Igipimo cy'Intoki kuri Buri Murima"
                    : "Parcel IoT Soil Moisture Telemetry & Manual Probe Simulation Module"}
                </h4>
                {isLiveIotStreamActive && (
                  <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>LIVE TELEMETRY STREAM</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                {language === "rw"
                  ? "Hindura igipimo cy'ubuhehere bw'ubutaka (% VWC) n'intoki cyangwa uhuze na IoT Sensor kuri buri murima urebe uko ingano y'amazi (mm & L/Ha) n'impuruza zo kuhira bihinduka ako kanya."
                  : "Manually adjust volumetric water content (% VWC) or connect simulated LoRaWAN soil probes per parcel to see irrigation urgency and water dosage respond in real time."}
              </p>
            </div>

            {/* Global IoT Fleet Preset Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleConnectAllIotSensors("current")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Huza IoT Sensors Zose"
                    : "Connect All IoT Sensors"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleConnectAllIotSensors("drought")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Gerageza Ubutaka Bwumye (20% VWC)"
                    : "Simulate Sensor Drought (20% VWC)"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleConnectAllIotSensors("optimal")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Gerageza Ubutaka Buhehereye (74%)"
                    : "Simulate Optimal Moisture (74%)"}
                </span>
              </button>

              {activeSensorCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsLiveIotStreamActive((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      isLiveIotStreamActive
                        ? "bg-amber-400 text-stone-950 border-amber-300"
                        : "bg-stone-900 hover:bg-stone-800 text-cyan-300 border-cyan-500/40"
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>
                      {isLiveIotStreamActive
                        ? language === "rw"
                          ? "Hagarika Stream"
                          : "Pause Live Drift"
                        : language === "rw"
                        ? "Tangira Live IoT Stream"
                        : "Start Live IoT Drift"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAllSensors}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {language === "rw" ? "Subiza Model" : "Reset to Weather Model"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Per-Parcel Soil Sensor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {alerts.map((alert) => {
              const reading = sensorReadingsByFarmId[alert.farmId];
              const currentMode: SoilSensorSourceMode = reading?.mode || "weather_model";
              const isCritical = alert.status === "critical";
              const isHigh = alert.status === "high";
              const isOptimalOrSaturated =
                alert.status === "optimal" || alert.status === "saturated";

              return (
                <div
                  key={`sensor-card-${alert.farmId}`}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    currentMode === "iot_telemetry"
                      ? "bg-stone-900/95 border-cyan-500/60"
                      : currentMode === "manual_probe"
                      ? "bg-stone-900/95 border-amber-500/60"
                      : "bg-stone-900/60 border-stone-800"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Parcel Title & Dynamic Alert Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs sm:text-sm font-black text-white">
                          {alert.farmName}
                        </h5>
                        <p className="text-[11px] text-stone-400">
                          {alert.crop} · {alert.district}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono shrink-0 ${
                          isCritical
                            ? "bg-rose-600 text-white"
                            : isHigh
                            ? "bg-amber-500 text-stone-950"
                            : isOptimalOrSaturated
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-700 text-stone-200"
                        }`}
                      >
                        {alert.status.toUpperCase()}
                      </span>
                    </div>

                    {/* 3-Mode Source Segmented Selector */}
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-stone-950 border border-stone-800 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleSetParcelMode(alert, "weather_model")}
                        className={`py-1 px-1.5 rounded-md transition-colors cursor-pointer truncate ${
                          currentMode === "weather_model"
                            ? "bg-emerald-800 text-white"
                            : "text-stone-400 hover:text-white"
                        }`}
                      >
                        {language === "rw" ? "Meteo Model" : "Weather Model"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetParcelMode(alert, "manual_probe")}
                        className={`py-1 px-1.5 rounded-md transition-colors cursor-pointer truncate ${
                          currentMode === "manual_probe"
                            ? "bg-amber-500 text-stone-950"
                            : "text-stone-400 hover:text-white"
                        }`}
                      >
                        {language === "rw" ? "Igipimo cy'Intoki" : "Manual Probe"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetParcelMode(alert, "iot_telemetry")}
                        className={`py-1 px-1.5 rounded-md transition-colors cursor-pointer truncate ${
                          currentMode === "iot_telemetry"
                            ? "bg-cyan-400 text-stone-950"
                            : "text-stone-400 hover:text-white"
                        }`}
                      >
                        {language === "rw" ? "IoT Sensor" : "IoT Sensor"}
                      </button>
                    </div>

                    {/* Live Moisture Slider & Direct Numeric Input */}
                    <div className="p-2.5 rounded-xl bg-stone-950/90 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {language === "rw" ? "Ubuhehere (VWC):" : "Soil Moisture:"}
                          </span>
                        </span>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={10}
                            max={96}
                            value={alert.soilMoisturePercentage}
                            onChange={(e) =>
                              handleChangeParcelMoisture(
                                alert,
                                Number(e.target.value) || 10
                              )
                            }
                            aria-label={`${alert.farmName} soil moisture percentage`}
                            className="w-14 px-1.5 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-right font-mono font-black text-xs text-white focus:outline-hidden focus:border-cyan-400"
                          />
                          <span className="text-xs font-mono font-bold text-stone-400">
                            %
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={12}
                        max={94}
                        step={1}
                        value={alert.soilMoisturePercentage}
                        onChange={(e) =>
                          handleChangeParcelMoisture(alert, Number(e.target.value))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />

                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                        <span>
                          {language === "rw" ? "Ntarengwa:" : "Trigger:"}{" "}
                          <strong className="text-amber-300">
                            {alert.thresholdPercentage}%
                          </strong>
                        </span>
                        <span>
                          {language === "rw" ? "Amazi akenewe:" : "Water Need:"}{" "}
                          <strong className="text-cyan-300">
                            {alert.status === "optimal" || alert.status === "saturated"
                              ? "0 mm (OK)"
                              : `${alert.recommendedWaterMm} mm`}
                          </strong>
                        </span>
                      </div>

                      {/* Quick Scenario Buttons for this Parcel */}
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {[
                          { label: "21% Crit", val: 21, mode: "iot_telemetry" as const },
                          { label: "36% High", val: 36, mode: "iot_telemetry" as const },
                          { label: "68% Opt", val: 68, mode: "iot_telemetry" as const },
                          { label: "86% Sat", val: 86, mode: "iot_telemetry" as const },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              handleChangeParcelMoisture(alert, preset.val, preset.mode)
                            }
                            className="py-1 px-1 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[10px] font-mono font-bold text-stone-300 hover:text-white transition-colors cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Telemetry / Probe Metadata Footer */}
                  <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2 text-[10px] font-mono text-stone-400">
                    {reading ? (
                      <>
                        <span className="text-cyan-300 font-bold truncate">
                          {reading.sensorId} · EC {reading.ecDsM} dS/m
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            aria-label="Root probe depth cm"
                            value={reading.probeDepthCm}
                            onChange={(e) =>
                              handleChangeProbeDepth(alert, Number(e.target.value))
                            }
                            className="bg-stone-950 border border-stone-700 rounded-md px-1 py-0.5 text-[10px] text-stone-200"
                          >
                            <option value={10}>10cm</option>
                            <option value={15}>15cm</option>
                            <option value={25}>25cm</option>
                          </select>
                          {reading.batteryPct && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-400">
                              <BatteryCharging className="w-3 h-3" />
                              {reading.batteryPct}%
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <span>
                          {language === "rw"
                            ? " Inkomoko: Meteo Rwanda ET₀"
                            : "Source: Meteo Rwanda ET₀"}
                        </span>
                        <span>15cm Root Zone</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Itemized Alert Cards */}
      {activeAlerts.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/70 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block">
                {language === "rw"
                  ? "Imirima yose ifite ubuhehere buhagije ubu!"
                  : "All farm parcels currently have sufficient root-zone moisture!"}
              </strong>
              <span className="text-emerald-200">
                {language === "rw"
                  ? "Koresha 'IoT Soil Sensors & Igipimo' hejuru niba ushaka kugerageza igipimo cy'ubutaka bwumye."
                  : "Use the IoT Soil Sensor Simulator above to test low-moisture sensor readings on any parcel."}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {activeAlerts.map((alert) => {
            const isCritical = alert.status === "critical";
            const isHigh = alert.status === "high";
            const isChecklistOpen = expandedGuidelineId === alert.id;
            const isTestingThis = testedPushAlertId === alert.id;
            const sensorReading = alert.sensorReading;

            const title =
              language === "rw"
                ? alert.titleRw
                : language === "fr"
                ? alert.titleFr
                : alert.titleEn;
            const message =
              language === "rw"
                ? alert.messageRw
                : language === "fr"
                ? alert.messageFr
                : alert.messageEn;
            const rabGuideline =
              language === "rw"
                ? alert.rabAdvisoryRw
                : language === "fr"
                ? alert.rabAdvisoryFr
                : alert.rabAdvisoryEn;

            return (
              <div
                key={alert.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                  isCritical
                    ? "bg-stone-950/90 border-rose-500/80"
                    : isHigh
                    ? "bg-stone-950/85 border-amber-500/70"
                    : "bg-emerald-950/80 border-emerald-700/70"
                }`}
              >
                {/* Real-Time Low-Humidity Climate Alert Callout Banner */}
                {alert.isLowHumidityAlert && (
                  <div className="mb-3.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-black text-amber-300">
                          {language === "rw"
                            ? alert.humidityAlertTitleRw
                            : alert.humidityAlertTitleEn}
                        </div>
                        <p className="text-rose-100/90 mt-0.5 leading-relaxed">
                          {language === "rw"
                            ? alert.humidityAlertMessageRw
                            : alert.humidityAlertMessageEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black">
                        RH {alert.weatherSummary.humidity}% &lt;{" "}
                        {alert.criticalHumidityThreshold || criticalHumidityThreshold}%
                      </span>
                      {alert.vaporPressureDeficitKpa !== undefined && (
                        <span className="px-2 py-1 rounded-lg bg-stone-900 text-amber-300 border border-amber-500/40 font-bold">
                          VPD {alert.vaporPressureDeficitKpa} kPa
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Moisture Gauge and Details */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {/* Moisture Indicator Box */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border text-center relative overflow-hidden ${
                          isCritical
                            ? "bg-rose-950/70 border-rose-500 text-rose-200"
                            : isHigh
                            ? "bg-amber-950/70 border-amber-500 text-amber-200"
                            : "bg-emerald-950 border-emerald-600 text-emerald-200"
                        }`}
                      >
                        <div
                          className={`absolute bottom-0 left-0 right-0 opacity-25 ${
                            isCritical
                              ? "bg-rose-500"
                              : isHigh
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ height: `${alert.soilMoisturePercentage}%` }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider relative z-10 opacity-80">
                          {sensorReading
                            ? sensorReading.mode === "iot_telemetry"
                              ? "IoT VWC"
                              : "Probe"
                            : language === "rw"
                            ? "Ubuhehere"
                            : "Moisture"}
                        </span>
                        <span className="text-xl font-black font-mono relative z-10 leading-none mt-0.5">
                          {alert.soilMoisturePercentage}%
                        </span>
                        <span className="text-[9px] font-mono relative z-10 opacity-75 mt-0.5">
                          &lt; {alert.thresholdPercentage}% min
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1.5 text-center ${
                          isCritical
                            ? "bg-rose-600 text-white"
                            : isHigh
                            ? "bg-amber-500 text-stone-950"
                            : "bg-emerald-700 text-white"
                        }`}
                      >
                        {isCritical
                          ? language === "rw"
                            ? "Byihutirwa"
                            : "Critical"
                          : isHigh
                          ? language === "rw"
                            ? "Bikenewe"
                            : "High Demand"
                          : language === "rw"
                          ? "Gukurikirana"
                          : "Moderate"}
                      </span>
                    </div>

                    {/* Text Details & Growth Factors */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-white bg-stone-800 px-2 py-0.5 rounded-lg border border-stone-700">
                          {alert.farmName}
                        </span>
                        <span className="font-semibold text-amber-300">
                          · {alert.crop}
                        </span>
                        <span className="text-stone-400">
                          · {alert.district} ({alert.soilType})
                        </span>

                        {sensorReading && (
                          <span className="font-mono text-[11px] font-bold text-cyan-300">
                            ·{" "}
                            {sensorReading.mode === "iot_telemetry"
                              ? `IoT ${sensorReading.sensorId} (${sensorReading.probeDepthCm}cm · EC ${sensorReading.ecDsM} dS/m)`
                              : `Manual Probe (${sensorReading.probeDepthCm}cm)`}
                          </span>
                        )}

                        {alert.growthStageSummary.isPeakWaterDemand && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {language === "rw"
                              ? "Igihe Cyihariye cy'Amazi"
                              : "Peak Water Demand Stage"}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white">{title}</h4>

                      <p className="text-xs text-stone-300 leading-relaxed">{message}</p>

                      {/* Meteorological and Agronomic Inputs Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex items-center space-x-2">
                          <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-stone-400">
                              {language === "rw" ? "Ubushyuhe" : "Temperature"}
                            </div>
                            <div className="text-xs font-bold font-mono text-white">
                              {alert.weatherSummary.tempC}°C
                            </div>
                          </div>
                        </div>

                        <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex items-center space-x-2">
                          <CloudRain className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-stone-400">
                              {language === "rw" ? "Imvura Iteganyijwe" : "Rainfall"}
                            </div>
                            <div className="text-xs font-bold font-mono text-white">
                              {alert.weatherSummary.rainfallMm} mm
                            </div>
                          </div>
                        </div>

                        <div
                          className={`p-2 rounded-xl border flex items-center space-x-2 ${
                            alert.isLowHumidityAlert
                              ? "bg-rose-950/80 border-rose-500/70"
                              : "bg-stone-900/90 border-stone-800"
                          }`}
                        >
                          <Wind
                            className={`w-3.5 h-3.5 shrink-0 ${
                              alert.isLowHumidityAlert ? "text-rose-400" : "text-amber-400"
                            }`}
                          />
                          <div>
                            <div className="text-[10px] text-stone-300">
                              {language === "rw" ? "Ubukonje (Humidity)" : "Forecast Humidity"}
                            </div>
                            <div
                              className={`text-xs font-black font-mono ${
                                alert.isLowHumidityAlert ? "text-rose-300" : "text-white"
                              }`}
                            >
                              {alert.weatherSummary.humidity}%{" "}
                              {alert.isLowHumidityAlert && (
                                <span className="text-[10px] text-amber-300">
                                  (&lt;{alert.criticalHumidityThreshold || criticalHumidityThreshold}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex items-center space-x-2">
                          <Sprout className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-stone-400">
                              {language === "rw" ? "Imikurire (Kc)" : "Stage (Kc)"}
                            </div>
                            <div className="text-xs font-bold font-mono text-emerald-300">
                              {alert.growthStageSummary.percentage}% (Kc{" "}
                              {alert.growthStageSummary.cropCoefficientKc})
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Water Dosage & Delivery Recommendation */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-700 font-mono font-medium">
                          <Droplets className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            {language === "rw"
                              ? `Ingano: mm ${alert.recommendedWaterMm} (${alert.recommendedWaterLitersPerHa.toLocaleString()} L/Ha)`
                              : `Recommended: ${alert.recommendedWaterMm}mm (${alert.recommendedWaterLitersPerHa.toLocaleString()} L/Ha)`}
                          </span>
                        </div>

                        {alert.threeDayForecast && alert.threeDayForecast.length > 0 && (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 text-amber-200 border border-amber-700/70 font-mono text-[11px]">
                            <span>
                              {language === "rw"
                                ? `Iminsi 3 (72h ETc): ${alert.soilMoisturePercentage}% → ${alert.threeDayForecast[2]?.projectedEndMoisturePct}% (${alert.threeDayForecast
                                    .reduce((s, d) => s + d.predictiveWaterLiters, 0)
                                    .toLocaleString()} L)`
                                : `72h Predictive: ${alert.soilMoisturePercentage}% → ${alert.threeDayForecast[2]?.projectedEndMoisturePct}% VWC (${alert.threeDayForecast
                                    .reduce((s, d) => s + d.predictiveWaterLiters, 0)
                                    .toLocaleString()} L)`}
                            </span>
                          </div>
                        )}

                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-800/80 text-stone-300 border border-stone-700 font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{alert.suggestedTimeWindow}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedGuidelineId(isChecklistOpen ? null : alert.id)
                          }
                          className="text-amber-300 hover:text-amber-200 font-bold underline flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <span>
                            {language === "rw" ? "Amabwiriza ya RAB" : "RAB Agronomy Protocol"}
                          </span>
                          {isChecklistOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isChecklistOpen && (
                        <div className="mt-2 p-3 rounded-xl bg-stone-900 border border-emerald-800 text-xs space-y-2">
                          <div className="flex items-center space-x-2 text-amber-300 font-bold">
                            <Info className="w-4 h-4" />
                            <span>
                              {language === "rw"
                                ? "Amabwiriza ya RAB ku buhinzi n'ubwuhirizi:"
                                : "Rwanda Agriculture Board (RAB) Irrigation Guide:"}
                            </span>
                          </div>
                          <p className="text-stone-300 leading-relaxed pl-6">{rabGuideline}</p>
                          <div className="pl-6 pt-1 text-[11px] text-stone-400 space-y-1">
                            <div>
                              •{" "}
                              <strong>
                                {language === "rw" ? "Uburyo bwo kuhira:" : "Method:"}
                              </strong>{" "}
                              {language === "rw"
                                ? alert.recommendedMethodRw
                                : alert.recommendedMethodEn}
                            </div>
                            <div>
                              •{" "}
                              <strong>
                                {language === "rw" ? "Kugenzura ku mizi:" : "Root inspection:"}
                              </strong>{" "}
                              {language === "rw"
                                ? "Pima ko amazi yacengeye muri santimetero 15 z'ubujyakuzimu mbere yo guhagarika moteri cyangwa amatiyo."
                                : "Confirm water infiltration reaches minimum 15cm soil depth around the root collar."}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleScheduleTask(alert)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>
                        {language === "rw" ? "Shyira muri Gahunda" : "Schedule Watering Task"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleWaterNow(alert)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {language === "rw" ? "Nuhiriye Ubu (Done)" : "Mark Watered Now"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulatePush(alert)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isTestingThis
                          ? "bg-amber-400 text-stone-950"
                          : "bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>
                        {isTestingThis
                          ? language === "rw"
                            ? "Push Yagezeho!"
                            : "Push Triggered!"
                          : language === "rw"
                          ? "Ohereza Push"
                          : "Push Alert"}
                      </span>
                    </button>

                    {onDismissAlert && (
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alert.id)}
                        className="text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 transition-colors cursor-pointer"
                      >
                        {language === "rw" ? "Hisha integuza" : "Dismiss"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
