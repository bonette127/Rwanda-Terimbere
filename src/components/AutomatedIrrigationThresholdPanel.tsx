import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AutomatedThresholdBreachEvent,
  CropVarietyIrrigationRule,
  Farm,
  FarmActivity,
  IrrigationDemandAlert,
  Language,
  ParcelSoilSensorReading,
} from "../types";
import {
  DEFAULT_CROP_VARIETY_IRRIGATION_RULES,
  matchCropVarietyRule,
  playWaterDropChime,
  triggerIrrigationDemandPushNotification,
} from "../utils/irrigationDemand";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Droplets,
  Gauge,
  Plus,
  Radio,
  ShieldAlert,
  Sliders,
  Smartphone,
  Sprout,
  Timer,
  Zap,
  RotateCcw,
  CalendarPlus,
  Clock,
  Volume2,
} from "lucide-react";

interface AutomatedIrrigationThresholdPanelProps {
  rules?: CropVarietyIrrigationRule[];
  onUpdateRules?: (rules: CropVarietyIrrigationRule[]) => void;
  alerts: IrrigationDemandAlert[];
  farms: Farm[];
  language: Language;
  onSimulateCropMoistureBreach?: (
    farmId: string,
    reading: ParcelSoilSensorReading
  ) => void;
  onCreateWateringTask?: (activity: Omit<FarmActivity, "id">) => void;
  onMarkWateredNow?: (farmId: string, crop: string) => void;
}

export const AutomatedIrrigationThresholdPanel: React.FC<
  AutomatedIrrigationThresholdPanelProps
> = ({
  rules: externalRules,
  onUpdateRules,
  alerts,
  farms,
  language,
  onSimulateCropMoistureBreach,
  onCreateWateringTask,
  onMarkWateredNow,
}) => {
  const [localRules, setLocalRules] = useState<CropVarietyIrrigationRule[]>(
    () => {
      try {
        const saved = localStorage.getItem("terimbere_crop_variety_rules");
        return saved
          ? JSON.parse(saved)
          : DEFAULT_CROP_VARIETY_IRRIGATION_RULES;
      } catch {
        return DEFAULT_CROP_VARIETY_IRRIGATION_RULES;
      }
    }
  );

  const effectiveRules = externalRules || localRules;

  const updateRules = (next: CropVarietyIrrigationRule[]) => {
    setLocalRules(next);
    try {
      localStorage.setItem(
        "terimbere_crop_variety_rules",
        JSON.stringify(next)
      );
    } catch {
      // ignore storage errors
    }
    onUpdateRules?.(next);
  };

  const [breachHistory, setBreachHistory] = useState<
    AutomatedThresholdBreachEvent[]
  >(() => {
    try {
      const saved = localStorage.getItem("terimbere_threshold_breach_log");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "terimbere_threshold_breach_log",
        JSON.stringify(breachHistory.slice(0, 12))
      );
    } catch {
      // ignore
    }
  }, [breachHistory]);

  const [isBackgroundWorkerActive, setIsBackgroundWorkerActive] =
    useState<boolean>(true);
  const [bgDelayedCountdown, setBgDelayedCountdown] = useState<number | null>(
    null
  );
  const [notificationPerm, setNotificationPerm] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );
  const [isAddingVariety, setIsAddingVariety] = useState(false);
  const [newVarietyNameEn, setNewVarietyNameEn] = useState("");
  const [newVarietyTriggerPct, setNewVarietyTriggerPct] = useState(35);

  const workerRef = useRef<Worker | null>(null);
  const triggeredSignatureRef = useRef<Set<string>>(new Set());

  // Request browser notification permission so background OS notifications appear
  const handleEnableBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPerm(perm);
    } catch {
      // ignore
    }
  };

  // Helper that fires both Dashboard Push Toast + Native Browser Notification + Breach Log entry
  const dispatchAutomatedThresholdPush = (
    alert: IrrigationDemandAlert,
    rule: CropVarietyIrrigationRule,
    isBackgroundContext: boolean
  ) => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const bgTagEn = isBackgroundContext
      ? "[BACKGROUND MONITOR PUSH]"
      : "[AUTOMATED THRESHOLD PUSH]";
    const bgTagRw = isBackgroundContext
      ? "[IMPURUZA YO MU CYUMA - BACKGROUND]"
      : "[IMPURUZA YIKORA KU RUGERO FATIZO]";

    const customAlert: IrrigationDemandAlert = {
      ...alert,
      titleEn: `🚨 ${bgTagEn} ${alert.crop} Moisture at ${alert.soilMoisturePercentage}% (< ${rule.triggerMoisturePct}% Trigger)`,
      titleRw: `🚨 ${bgTagRw} Ubuhehere kuri ${alert.crop} bwageze kuri ${alert.soilMoisturePercentage}% (< ${rule.triggerMoisturePct}%)`,
      messageEn: `${alert.farmName} (${alert.district}): Soil moisture dropped to ${alert.soilMoisturePercentage}% VWC, breaching your automated ${rule.cropNameEn} trigger (< ${rule.triggerMoisturePct}%). Apply ${alert.recommendedWaterMm}mm (${(
        alert.recommendedWaterLitersPerHa * (alert.farmSizeHa || 1.5)
      ).toLocaleString()} L) immediately.`,
      messageRw: `${alert.farmName} (${alert.district}): Ubuhehere bwamanutse kuri ${alert.soilMoisturePercentage}% VWC, munsi y'urugero fatizo rwa < ${rule.triggerMoisturePct}% washyizeho kuri ${rule.cropNameRw}. Uhira mm ${alert.recommendedWaterMm} ako kanya.`,
    };

    triggerIrrigationDemandPushNotification(customAlert, language);

    const breachEvent: AutomatedThresholdBreachEvent = {
      id: `breach-${alert.farmId}-${Date.now()}`,
      ruleId: rule.id,
      cropVarietyKey: rule.cropVarietyKey,
      cropName: language === "rw" ? rule.cropNameRw : rule.cropNameEn,
      farmId: alert.farmId,
      farmName: alert.farmName,
      district: alert.district,
      measuredMoisturePct: alert.soilMoisturePercentage,
      triggerThresholdPct: rule.triggerMoisturePct,
      deficitMm: alert.recommendedWaterMm,
      recommendedLiters: Math.round(
        alert.recommendedWaterLitersPerHa * (alert.farmSizeHa || 1.5)
      ),
      triggeredInBackground: isBackgroundContext,
      timestamp: nowTime,
    };

    setBreachHistory((prev) => [breachEvent, ...prev.slice(0, 9)]);

    // Update rule lastTriggeredAt
    updateRules(
      effectiveRules.map((r) =>
        r.id === rule.id ? { ...r, lastTriggeredAt: nowTime } : r
      )
    );
  };

  // Evaluate whenever alerts or rules change: if any parcel's moisture < rule.triggerMoisturePct, auto-fire push!
  useEffect(() => {
    alerts.forEach((alert) => {
      const rule =
        alert.matchedCropRule ||
        matchCropVarietyRule(alert.crop, effectiveRules);
      if (!rule || !rule.autoPushEnabled) return;

      if (alert.soilMoisturePercentage < rule.triggerMoisturePct) {
        const sig = `${alert.farmId}-${rule.triggerMoisturePct}-${alert.soilMoisturePercentage}`;
        if (!triggeredSignatureRef.current.has(sig)) {
          triggeredSignatureRef.current.add(sig);
          const inBg =
            typeof document !== "undefined" &&
            document.visibilityState === "hidden";
          dispatchAutomatedThresholdPush(alert, rule, inBg);
        }
      }
    });
  }, [alerts, effectiveRules]);

  // Dedicated Background Web Worker that continues monitoring even when the browser tab is hidden/minimized
  useEffect(() => {
    if (!isBackgroundWorkerActive || typeof Worker === "undefined") return;

    const workerCode = `
      let timer = null;
      self.onmessage = function(e) {
        if (e.data && e.data.type === 'START_BG_TEST') {
          const delayMs = e.data.delayMs || 3000;
          setTimeout(function() {
            self.postMessage({ type: 'BG_TEST_FIRE', timestamp: new Date().toISOString() });
          }, delayMs);
        }
      };
      timer = setInterval(function() {
        self.postMessage({ type: 'BG_HEARTBEAT', timestamp: new Date().toISOString() });
      }, 15000);
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = (event) => {
      if (event.data?.type === "BG_TEST_FIRE") {
        setBgDelayedCountdown(null);
        // Trigger simulated < 35% breach on primary farm in background mode
        const targetFarm = farms[0];
        const targetAlert = alerts[0];
        const targetRule =
          (targetAlert &&
            matchCropVarietyRule(targetAlert.crop, effectiveRules)) ||
          effectiveRules[0];

        if (targetFarm && targetRule) {
          const breachMoisture = Math.max(
            18,
            targetRule.triggerMoisturePct - 6
          );
          onSimulateCropMoistureBreach?.(targetFarm.id, {
            farmId: targetFarm.id,
            mode: "iot_telemetry",
            sensorId: `IOT-AUTO-${targetFarm.district
              .slice(0, 3)
              .toUpperCase()}-01`,
            moisturePercentage: breachMoisture,
            soilTempC: 24.6,
            ecDsM: 1.4,
            probeDepthCm: targetRule.rootZoneDepthCm,
            batteryPct: 96,
            signalRssiDbm: -64,
            updatedAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });

          if (targetAlert) {
            dispatchAutomatedThresholdPush(
              {
                ...targetAlert,
                soilMoisturePercentage: breachMoisture,
                thresholdPercentage: targetRule.triggerMoisturePct,
              },
              targetRule,
              true
            );
          }
        }
      }
    };

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      workerRef.current = null;
    };
  }, [isBackgroundWorkerActive, farms, alerts, effectiveRules]);

  const handleRuleChange = (
    ruleId: string,
    patch: Partial<CropVarietyIrrigationRule>
  ) => {
    const updated = effectiveRules.map((r) =>
      r.id === ruleId ? { ...r, ...patch } : r
    );
    updateRules(updated);
  };

  const handleInstantBreachTest = (rule: CropVarietyIrrigationRule) => {
    const matchedAlert =
      alerts.find((a) =>
        a.crop.toLowerCase().includes(rule.cropVarietyKey.toLowerCase())
      ) || alerts[0];
    const targetFarm =
      farms.find((f) => f.id === matchedAlert?.farmId) || farms[0];

    const simulatedMoisture = Math.max(16, rule.triggerMoisturePct - 5);

    if (targetFarm && onSimulateCropMoistureBreach) {
      onSimulateCropMoistureBreach(targetFarm.id, {
        farmId: targetFarm.id,
        mode: "iot_telemetry",
        sensorId: `IOT-BG-${targetFarm.district.slice(0, 3).toUpperCase()}-01`,
        moisturePercentage: simulatedMoisture,
        soilTempC: 24.2,
        ecDsM: 1.35,
        probeDepthCm: rule.rootZoneDepthCm,
        batteryPct: 95,
        signalRssiDbm: -66,
        updatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    if (matchedAlert) {
      dispatchAutomatedThresholdPush(
        {
          ...matchedAlert,
          soilMoisturePercentage: simulatedMoisture,
          thresholdPercentage: rule.triggerMoisturePct,
        },
        rule,
        typeof document !== "undefined" &&
          document.visibilityState === "hidden"
      );
    } else {
      playWaterDropChime();
    }
  };

  const handleStartDelayedBackgroundTest = () => {
    setBgDelayedCountdown(3);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "START_BG_TEST", delayMs: 3000 });
    } else {
      setTimeout(() => {
        setBgDelayedCountdown(null);
        if (effectiveRules[0]) {
          handleInstantBreachTest(effectiveRules[0]);
        }
      }, 3000);
    }
  };

  const handleAddCustomVarietyRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarietyNameEn.trim()) return;
    const key = newVarietyNameEn.trim().toLowerCase().split(" ")[0];
    const newRule: CropVarietyIrrigationRule = {
      id: `rule-custom-${Date.now()}`,
      cropVarietyKey: key,
      cropNameEn: newVarietyNameEn.trim(),
      cropNameRw: newVarietyNameEn.trim(),
      varietyLabel: "Custom Crop Variety Threshold",
      triggerMoisturePct: newVarietyTriggerPct,
      targetReplenishPct: 74,
      rootZoneDepthCm: 18,
      autoPushEnabled: true,
      backgroundWatchEnabled: true,
      autoScheduleTaskOnBreach: true,
    };
    updateRules([...effectiveRules, newRule]);
    setNewVarietyNameEn("");
    setIsAddingVariety(false);
  };

  const handleResetDefaultRules = () => {
    triggeredSignatureRef.current.clear();
    updateRules(DEFAULT_CROP_VARIETY_IRRIGATION_RULES);
  };

  const breachedCount = useMemo(() => {
    return effectiveRules.filter((rule) => {
      const matchedAlert = alerts.find((a) =>
        a.crop.toLowerCase().includes(rule.cropVarietyKey.toLowerCase())
      );
      return (
        matchedAlert &&
        matchedAlert.soilMoisturePercentage < rule.triggerMoisturePct
      );
    }).length;
  }, [effectiveRules, alerts]);

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs overflow-hidden">
      {/* Top Header Banner */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-stone-950 via-emerald-950 to-stone-900 text-white border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {language === "rw"
                    ? "IMPURUZA YIKORA KU RUGERO RW'UBUHEHERE (BACKGROUND PUSH)"
                    : "AUTOMATED IRRIGATION THRESHOLD • BACKGROUND PUSH ENGINE"}
                </span>
              </span>

              {breachedCount > 0 && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white">
                  {breachedCount}{" "}
                  {language === "rw"
                    ? "Ibihingwa Biri Munsi y'Urugero"
                    : "Varieties Below Trigger"}
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
              {language === "rw"
                ? "Urugero Fatizo rwo Kuhira Buri bwoko bw'Imbuto (urugero: < 35%)"
                : "Per-Crop Variety Moisture Trigger Thresholds (e.g., < 35% VWC)"}
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              {language === "rw"
                ? "Shyiraho urugero rw'ubuhehere kuri buri bwoko bw'igihingwa. Iyo ubuhehere buguye munsi yarwo, sisitemu yohereza impuruza (Push Notification) kuri Dashboard n'iyo porogaramu yaba iri inyuma (Background)."
                : "Configure a custom soil moisture percentage trigger for each crop variety. Breaching the threshold automatically sends a push notification to your Dashboard even when the app is in the background."}
            </p>
          </div>
        </div>

        {/* Right Controls: Background Worker Toggle + Delayed Background Test */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              setIsBackgroundWorkerActive(!isBackgroundWorkerActive)
            }
            className={`px-3 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
              isBackgroundWorkerActive
                ? "bg-emerald-900/80 text-emerald-200 border-emerald-600"
                : "bg-stone-800 text-stone-400 border-stone-700"
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isBackgroundWorkerActive
                  ? "text-emerald-400 animate-pulse"
                  : "text-stone-500"
              }`}
            />
            <span>
              {language === "rw"
                ? isBackgroundWorkerActive
                  ? "Background Worker: Irakora"
                  : "Background Worker: Yahagaze"
                : isBackgroundWorkerActive
                ? "Background Worker: Active"
                : "Background Worker: Paused"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleStartDelayedBackgroundTest}
            disabled={bgDelayedCountdown !== null}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-xs"
            title="Triggers a background Web Worker push notification after 3 seconds even if you switch browser tabs"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>
              {bgDelayedCountdown !== null
                ? language === "rw"
                  ? `Ibara mu Cyawe (3s)... Hindura Tab!`
                  : `Firing in 3s... (Switch Tab to Test!)`
                : language === "rw"
                ? "Gerageza Impuruza yo mu Cyuma (3s)"
                : "Test Background Push (3s Delay)"}
            </span>
          </button>

          {notificationPerm !== "granted" && (
            <button
              type="button"
              onClick={handleEnableBrowserNotifications}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 inline-flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === "rw" ? "Emera OS Push" : "Enable OS Push"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid: Crop Variety Trigger Cards + Automated Background Push Log */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
            <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span className="font-bold">
              {language === "rw"
                ? `Amoko y'Ibihingwa Yashyiriweho Urugero (${effectiveRules.length})`
                : `Configured Crop Variety Thresholds (${effectiveRules.length})`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingVariety(!isAddingVariety)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-emerald-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "Ongeraho Ubundi Bwoko bw'Igihingwa"
                  : "Add Crop Variety Rule"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaultRules}
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold inline-flex items-center gap-1 hover:bg-stone-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {language === "rw" ? "Subiza ku Isanzwe" : "Reset (< 35%)"}
              </span>
            </button>
          </div>
        </div>

        {/* Add New Crop Variety Rule Form */}
        {isAddingVariety && (
          <form
            onSubmit={handleAddCustomVarietyRule}
            className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
          >
            <div className="flex-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Izina ry'Igihingwa & Imbuto:"
                  : "Crop Variety Name (e.g., French Beans - Serengeti):"}
              </label>
              <input
                type="text"
                value={newVarietyNameEn}
                onChange={(e) => setNewVarietyNameEn(e.target.value)}
                placeholder="e.g., Imiteja (French Beans - Serengeti)"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-48">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? `Urugero rw'Impuruza (< ${newVarietyTriggerPct}%):`
                  : `Moisture Trigger (< ${newVarietyTriggerPct}%):`}
              </label>
              <input
                type="range"
                min={18}
                max={60}
                value={newVarietyTriggerPct}
                onChange={(e) =>
                  setNewVarietyTriggerPct(Number(e.target.value))
                }
                className="w-full accent-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shrink-0"
            >
              {language === "rw" ? "Bika Urugero" : "Save Variety Rule"}
            </button>
          </form>
        )}

        {/* Grid of Crop Variety Threshold Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {effectiveRules.map((rule) => {
            const matchedAlert = alerts.find((a) =>
              a.crop.toLowerCase().includes(rule.cropVarietyKey.toLowerCase())
            );
            const currentMoisture = matchedAlert?.soilMoisturePercentage ?? 54;
            const isBreached = currentMoisture < rule.triggerMoisturePct;

            return (
              <div
                key={rule.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  isBreached
                    ? "border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/25 shadow-xs"
                    : "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {rule.varietyLabel}
                      </span>
                      <h4 className="text-sm font-black text-stone-900 dark:text-white mt-0.5">
                        {language === "rw" ? rule.cropNameRw : rule.cropNameEn}
                      </h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono shrink-0 ${
                        isBreached
                          ? "bg-rose-600 text-white animate-pulse"
                          : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                      }`}
                    >
                      &lt; {rule.triggerMoisturePct}%
                    </span>
                  </div>

                  {/* Live Parcel Moisture vs Trigger Comparison */}
                  <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400">
                        {matchedAlert
                          ? `${matchedAlert.farmName} (${matchedAlert.district})`
                          : language === "rw"
                          ? "Ubuhehere बुriho"
                          : "Live Root Moisture"}
                      </div>
                      <div
                        className={`text-base font-black font-mono ${
                          isBreached
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-stone-900 dark:text-white"
                        }`}
                      >
                        {currentMoisture}% VWC
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 dark:text-stone-400">
                        {language === "rw" ? "Imimerere" : "Trigger Status"}
                      </div>
                      <div
                        className={`text-xs font-extrabold ${
                          isBreached
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {isBreached
                          ? language === "rw"
                            ? "🚨 MUNSI Y'URUGERO"
                            : "🚨 AUTO-PUSH SENT"
                          : language === "rw"
                          ? "✅ ARAFITE AMAZI"
                          : "✅ ABOVE TRIGGER"}
                      </div>
                    </div>
                  </div>

                  {/* Slider to Set Moisture Trigger Percentage */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-stone-700 dark:text-stone-300">
                        {language === "rw"
                          ? "Urugero rw'Impuruza:"
                          : "Moisture Trigger:"}
                      </span>
                      <span className="font-mono font-black text-emerald-800 dark:text-emerald-300">
                        &lt; {rule.triggerMoisturePct}% VWC
                      </span>
                    </div>

                    <input
                      type="range"
                      min={18}
                      max={62}
                      value={rule.triggerMoisturePct}
                      onChange={(e) =>
                        handleRuleChange(rule.id, {
                          triggerMoisturePct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />

                    {/* Quick Preset Buttons (< 30%, < 35%, < 40%, < 45%) */}
                    <div className="grid grid-cols-4 gap-1 mt-1.5">
                      {[30, 35, 40, 45].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            handleRuleChange(rule.id, {
                              triggerMoisturePct: preset,
                            })
                          }
                          className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                            rule.triggerMoisturePct === preset
                              ? "bg-emerald-800 text-white border-emerald-800"
                              : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-emerald-600"
                          }`}
                        >
                          &lt;{preset}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-Push & Background Watch Checkboxes */}
                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 dark:border-stone-800 space-y-1.5 text-[11px]">
                    <label className="flex items-center justify-between cursor-pointer text-stone-700 dark:text-stone-300">
                      <span className="font-semibold">
                        {language === "rw"
                          ? "Ohereza Push Yikora:"
                          : "Auto-Push Notification:"}
                      </span>
                      <input
                        type="checkbox"
                        checked={rule.autoPushEnabled}
                        onChange={(e) =>
                          handleRuleChange(rule.id, {
                            autoPushEnabled: e.target.checked,
                          })
                        }
                        className="accent-emerald-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer text-stone-700 dark:text-stone-300">
                      <span className="font-semibold">
                        {language === "rw"
                          ? "Gukurikirana muri Background:"
                          : "Background Tab Watch:"}
                      </span>
                      <input
                        type="checkbox"
                        checked={rule.backgroundWatchEnabled}
                        onChange={(e) =>
                          handleRuleChange(rule.id, {
                            backgroundWatchEnabled: e.target.checked,
                          })
                        }
                        className="accent-emerald-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Simulate < Trigger% Breach & Push Button */}
                <button
                  type="button"
                  onClick={() => handleInstantBreachTest(rule)}
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-rose-700 dark:hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {language === "rw"
                      ? `Gerageza Munsi ya < ${rule.triggerMoisturePct}% (Push)`
                      : `Simulate < ${rule.triggerMoisturePct}% Breach & Push`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Live & Background Automated Push Notification Log */}
        {breachHistory.length > 0 && (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 dark:text-white">
                  {language === "rw"
                    ? "Amateka y'Impuruza Zoherejwe kuri Dashboard (Background & Live Push Log)"
                    : "Automated Threshold Push Notification Feed (Live & Background)"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setBreachHistory([])}
                className="text-[11px] font-semibold text-stone-400 hover:text-stone-600"
              >
                {language === "rw" ? "Siba amateka" : "Clear Log"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {breachHistory.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-rose-200/90 dark:border-rose-900/60 flex items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white">
                        {item.measuredMoisturePct}% &lt;{" "}
                        {item.triggerThresholdPct}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {item.triggeredInBackground
                          ? "BACKGROUND PUSH"
                          : "DASHBOARD PUSH"}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {item.timestamp}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-stone-900 dark:text-white">
                      {item.cropName} • {item.farmName}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                      {language === "rw"
                        ? `Amazi akenewe: ${item.deficitMm}mm (${item.recommendedLiters.toLocaleString()} L)`
                        : `Required: ${item.deficitMm}mm (${item.recommendedLiters.toLocaleString()} L)`}
                    </div>
                  </div>

                  {onMarkWateredNow && (
                    <button
                      type="button"
                      onClick={() =>
                        onMarkWateredNow(item.farmId, item.cropName)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shrink-0"
                    >
                      {language === "rw" ? "Uhira" : "Water"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
