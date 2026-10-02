import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmPlan,
  FertilizerApplicationLog,
  FertilizerApplicationMethod,
  Language,
} from "../types";
import {
  buildTwoDayFertilizerAlertForActivity,
  calculateAdvanceAlertDate,
  isFertilizerOrIrrigationActivity,
  toMidnightTimestamp,
  triggerActivityPushNotification,
} from "../utils/activityAlerts";
import { getApplicationMethodLabel } from "./FertilizerApplicationModal";
import {
  BellRing,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FastForward,
  FlaskConical,
  MapPin,
  Plus,
  Scale,
  ShieldCheck,
  Smartphone,
  Sprout,
  Trash2,
  UserCheck,
} from "lucide-react";

interface FertilizerTaskSchedulerCardProps {
  activities: FarmActivity[];
  farms: Farm[];
  plans: FarmPlan[];
  language: Language;
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
  onUpdateActivity?: (id: string, updates: Partial<FarmActivity>) => void;
  onCompleteActivity: (id: string) => void;
  onDeleteActivity?: (id: string) => void;
  onAddFertilizerApplication?: (log: FertilizerApplicationLog) => void;
  onNavigateToActivities?: () => void;
  defaultOpenForm?: boolean;
}

interface FertilizerPresetOption {
  id: string;
  labelRw: string;
  labelEn: string;
  fertilizerType: string;
  npkRatio: string;
  defaultRateKgHa: number;
  defaultMethod: FertilizerApplicationMethod;
  unitCostRwfPerKg: number;
  stageAdviceRw: string;
  stageAdviceEn: string;
}

const FERTILIZER_SCHEDULER_PRESETS: FertilizerPresetOption[] = [
  {
    id: "npk-17",
    labelRw: "NPK 17-17-17 (Ifumbire Rusange ya RAB)",
    labelEn: "NPK 17-17-17 (Balanced Basal / Stolon)",
    fertilizerType: "NPK 17-17-17 (Ifumbire rusange)",
    npkRatio: "17-17-17",
    defaultRateKgHa: 250,
    defaultMethod: "side_dressing",
    unitCostRwfPerKg: 950,
    stageAdviceRw:
      "Shyira mu mirongo cyangwa ku ruhande rw'igihingwa ku ntera ya cm 8-10.",
    stageAdviceEn:
      "Apply in furrow bands or side-dress 8-10cm from plant stems.",
  },
  {
    id: "urea-46",
    labelRw: "Urea 46-0-0 (Kubagara & Kongera Amababi)",
    labelEn: "Urea 46-0-0 (Vegetative Top-Dressing)",
    fertilizerType: "Urea (46-0-0)",
    npkRatio: "46-0-0",
    defaultRateKgHa: 100,
    defaultMethod: "side_dressing",
    unitCostRwfPerKg: 880,
    stageAdviceRw:
      "Shyira ku ruhande rw'ikigori cyangwa imboga ubutaka buhehereye mu gitondo.",
    stageAdviceEn:
      "Side-dress on moist soil during cool morning hours and cover with 2cm soil.",
  },
  {
    id: "dap-18-46",
    labelRw: "DAP 18-46-0 ( Gutera & Gukomeza Imizi)",
    labelEn: "DAP 18-46-0 (Root Establishment Starter)",
    fertilizerType: "DAP (18-46-0)",
    npkRatio: "18-46-0",
    defaultRateKgHa: 120,
    defaultMethod: "broadcasting",
    unitCostRwfPerKg: 1050,
    stageAdviceRw:
      "Koresha mu gihe cyo gutera ibigori cyangwa ibishyimbo kugira ngo imizi ikure vuba.",
    stageAdviceEn:
      "Apply at planting to accelerate root establishment and early vigor.",
  },
  {
    id: "npk-15-mgo",
    labelRw: "NPK 15-15-15 + 2MgO (Ibirayi & Inyanya)",
    labelEn: "NPK 15-15-15 + 2MgO (Potato & Tomato Blend)",
    fertilizerType: "NPK 15-15-15 + 2MgO (Ibirayi & Imboga)",
    npkRatio: "15-15-15",
    defaultRateKgHa: 200,
    defaultMethod: "ring_placement",
    unitCostRwfPerKg: 980,
    stageAdviceRw:
      "Ifasha mu gihe cyo kurabya no kurema ibijumba by'ibirayi cyangwa inyanya.",
    stageAdviceEn:
      "Ideal during flowering and tuber/fruit initiation for solanaceous crops.",
  },
  {
    id: "mop-k60",
    labelRw: "MOP / KCl 0-0-60 (Kubyibushya Ibirayi)",
    labelEn: "MOP / KCl 0-0-60 (Tuber Bulking Potash)",
    fertilizerType: "MOP / KCl (0-0-60)",
    npkRatio: "0-0-60",
    defaultRateKgHa: 100,
    defaultMethod: "side_dressing",
    unitCostRwfPerKg: 920,
    stageAdviceRw:
      "Yongera uburemere bw'ibirayi n'ubushobozi bwo kubikwa igihe kirekire.",
    stageAdviceEn:
      "Boosts starch translocation, tuber dry matter, and skin curing.",
  },
];

const getDateWithOffset = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const FertilizerTaskSchedulerCard: React.FC<
  FertilizerTaskSchedulerCardProps
> = ({
  activities,
  farms,
  plans,
  language,
  onCreateActivity,
  onUpdateActivity,
  onCompleteActivity,
  onDeleteActivity,
  onAddFertilizerApplication,
  onNavigateToActivities,
  defaultOpenForm = false,
}) => {
  const defaultFarm = farms[0] || {
    id: "farm-1",
    name: "Ibirayi Farm (Kinigi)",
    district: "Musanze",
    sector: "Kinigi",
    sizeHa: 1.5,
    mainCrops: ["Ibirayi (Kinigi)"],
  };

  // Scheduler Form State
  const [isFormExpanded, setIsFormExpanded] = useState<boolean>(defaultOpenForm);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(defaultFarm.id);
  const [selectedCrop, setSelectedCrop] = useState<string>(
    defaultFarm.mainCrops?.[0] || "Ibirayi (Kinigi)"
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>("npk-17");
  const [fertilizerType, setFertilizerType] = useState<string>(
    FERTILIZER_SCHEDULER_PRESETS[0].fertilizerType
  );
  const [npkRatio, setNpkRatio] = useState<string>(
    FERTILIZER_SCHEDULER_PRESETS[0].npkRatio
  );
  const [amountKg, setAmountKg] = useState<number>(225);
  const [areaAppliedHa, setAreaAppliedHa] = useState<number>(
    Number((defaultFarm.sizeHa * 0.6).toFixed(2)) || 0.9
  );
  const [applicationMethod, setApplicationMethod] =
    useState<FertilizerApplicationMethod>("side_dressing");
  // Default scheduled date is +2 days so the farmer can immediately see the 2-day alert in action
  const [scheduledDate, setScheduledDate] = useState<string>(() =>
    getDateWithOffset(2)
  );
  const [assignedTo, setAssignedTo] = useState<string>(
    "Jean Baptiste & Abakozi 6"
  );
  const [notes, setNotes] = useState<string>("");
  const [autoTriggerTwoDayPush, setAutoTriggerTwoDayPush] =
    useState<boolean>(true);
  const [queueFilter, setQueueFilter] = useState<
    "all" | "two_day_active" | "future_armed"
  >("all");
  const [activePushActivityId, setActivePushActivityId] = useState<
    string | null
  >(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null
  );

  // Local fallback activities when parent doesn't supply mutation handlers
  const [localCreatedActivities, setLocalCreatedActivities] = useState<
    FarmActivity[]
  >([]);
  const [localDateOverrides, setLocalDateOverrides] = useState<
    Record<string, string>
  >({});

  const mergedActivities = useMemo(() => {
    const combined = [...localCreatedActivities, ...activities];
    return combined.map((act) =>
      localDateOverrides[act.id]
        ? {
            ...act,
            dueDate: localDateOverrides[act.id],
            alertTriggerDate: calculateAdvanceAlertDate(
              localDateOverrides[act.id],
              2
            ),
          }
        : act
    );
  }, [activities, localCreatedActivities, localDateOverrides]);

  // Extract all pending/in_progress fertilizer tasks and compute daysRemaining + 2-day alert trigger dates
  const scheduledFertilizerTasks = useMemo(() => {
    const todayTs = toMidnightTimestamp(new Date());

    return mergedActivities
      .filter((act) => {
        if (act.status === "completed") return false;
        const match = isFertilizerOrIrrigationActivity(act);
        return match.isMatch && match.category === "fertilizing";
      })
      .map((act) => {
        const dueTs = toMidnightTimestamp(act.dueDate);
        const daysRemaining = Math.round(
          (dueTs - todayTs) / (1000 * 60 * 60 * 24)
        );
        const alertTriggerDate =
          act.alertTriggerDate || calculateAdvanceAlertDate(act.dueDate, 2);
        const alertTriggerTs = toMidnightTimestamp(alertTriggerDate);
        const daysUntilAlertFires = Math.round(
          (alertTriggerTs - todayTs) / (1000 * 60 * 60 * 24)
        );
        const isTwoDayAlertActive = daysRemaining === 2;
        const isWithinTwoDayWindow = daysRemaining >= 0 && daysRemaining <= 2;

        return {
          activity: act,
          daysRemaining,
          alertTriggerDate,
          daysUntilAlertFires,
          isTwoDayAlertActive,
          isWithinTwoDayWindow,
        };
      })
      .sort((a, b) => {
        // Put exact 2-day alert tasks at the very top, then sort by dueDate ascending
        if (a.isTwoDayAlertActive && !b.isTwoDayAlertActive) return -1;
        if (!a.isTwoDayAlertActive && b.isTwoDayAlertActive) return 1;
        return a.daysRemaining - b.daysRemaining;
      });
  }, [mergedActivities]);

  const twoDayActiveTasks = useMemo(
    () =>
      scheduledFertilizerTasks.filter(
        (item) => item.daysRemaining === 2 || item.daysRemaining === 1
      ),
    [scheduledFertilizerTasks]
  );

  const exactTwoDayTasks = useMemo(
    () => scheduledFertilizerTasks.filter((item) => item.daysRemaining === 2),
    [scheduledFertilizerTasks]
  );

  const futureArmedTasks = useMemo(
    () => scheduledFertilizerTasks.filter((item) => item.daysRemaining > 2),
    [scheduledFertilizerTasks]
  );

  const filteredQueue = useMemo(() => {
    if (queueFilter === "two_day_active") {
      return scheduledFertilizerTasks.filter(
        (t) => t.daysRemaining >= 0 && t.daysRemaining <= 2
      );
    }
    if (queueFilter === "future_armed") {
      return scheduledFertilizerTasks.filter((t) => t.daysRemaining > 2);
    }
    return scheduledFertilizerTasks;
  }, [scheduledFertilizerTasks, queueFilter]);

  const totalScheduledKg = useMemo(
    () =>
      scheduledFertilizerTasks.reduce(
        (sum, item) => sum + (item.activity.amountKg || 120),
        0
      ),
    [scheduledFertilizerTasks]
  );

  // Calculated form preview values
  const formAlertTriggerDate = useMemo(
    () => calculateAdvanceAlertDate(scheduledDate, 2),
    [scheduledDate]
  );

  const formDaysFromToday = useMemo(() => {
    const todayTs = toMidnightTimestamp(new Date());
    const dueTs = toMidnightTimestamp(scheduledDate);
    return Math.round((dueTs - todayTs) / (1000 * 60 * 60 * 24));
  }, [scheduledDate]);

  const parsedFormNpk = useMemo(() => {
    const parts = npkRatio.split("-").map((v) => parseFloat(v.trim()) || 0);
    return {
      n: parts[0] || 0,
      p: parts[1] || 0,
      k: parts[2] || 0,
    };
  }, [npkRatio]);

  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    const foundFarm = farms.find((f) => f.id === farmId);
    if (foundFarm) {
      const activePlan = plans.find(
        (p) => p.farmId === farmId && p.status === "active"
      );
      setSelectedCrop(
        activePlan?.crop || foundFarm.mainCrops?.[0] || "Ibirayi (Kinigi)"
      );
      setAreaAppliedHa(Number(foundFarm.sizeHa.toFixed(2)));
      const preset =
        FERTILIZER_SCHEDULER_PRESETS.find((p) => p.id === selectedPresetId) ||
        FERTILIZER_SCHEDULER_PRESETS[0];
      setAmountKg(Math.round(foundFarm.sizeHa * preset.defaultRateKgHa));
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = FERTILIZER_SCHEDULER_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFertilizerType(preset.fertilizerType);
      setNpkRatio(preset.npkRatio);
      setApplicationMethod(preset.defaultMethod);
      setAmountKg(Math.max(10, Math.round(areaAppliedHa * preset.defaultRateKgHa)));
    }
  };

  const handleTriggerTwoDayAlert = async (activity: FarmActivity) => {
    setActivePushActivityId(activity.id);
    const alertObj = buildTwoDayFertilizerAlertForActivity(activity);
    await triggerActivityPushNotification(alertObj, language);
    setTimeout(() => {
      setActivePushActivityId(null);
    }, 3500);
  };

  const handleRescheduleTask = async (
    activity: FarmActivity,
    newDueDate: string,
    triggerAlertIfTwoDays = true
  ) => {
    const newAlertTriggerDate = calculateAdvanceAlertDate(newDueDate, 2);
    setLocalDateOverrides((prev) => ({
      ...prev,
      [activity.id]: newDueDate,
    }));
    onUpdateActivity?.(activity.id, {
      dueDate: newDueDate,
      alertTriggerDate: newAlertTriggerDate,
    });

    const todayTs = toMidnightTimestamp(new Date());
    const dueTs = toMidnightTimestamp(newDueDate);
    const newDaysRemaining = Math.round(
      (dueTs - todayTs) / (1000 * 60 * 60 * 24)
    );

    if (triggerAlertIfTwoDays && newDaysRemaining === 2) {
      const updatedAct: FarmActivity = {
        ...activity,
        dueDate: newDueDate,
        alertTriggerDate: newAlertTriggerDate,
      };
      await handleTriggerTwoDayAlert(updatedAct);
      setConfirmationMessage(
        language === "rw"
          ? `🔔 Itariki yahinduwe kuri ${newDueDate} (Hasigaye iminsi 2)! Integuza y'iminsi 2 mbere yakijijwe ako kanya.`
          : `🔔 Rescheduled to ${newDueDate} (2 days away)! 2-Day Advance Fertilizer Alert activated immediately.`
      );
      setTimeout(() => setConfirmationMessage(null), 5000);
    }
  };

  const handleCompleteAndRecord = (activity: FarmActivity) => {
    onCompleteActivity(activity.id);

    if (onAddFertilizerApplication) {
      const targetFarm =
        farms.find((f) => f.id === activity.farmId) || defaultFarm;
      const newLog: FertilizerApplicationLog = {
        id: `fert-sched-${Date.now()}`,
        farmId: activity.farmId,
        farmName: activity.farmName,
        crop: activity.crop,
        seasonCode: "2025B",
        date: new Date().toISOString().split("T")[0],
        fertilizerType:
          activity.fertilizerType || "NPK 17-17-17 (Ifumbire rusange)",
        npkRatio: activity.npkRatio || "17-17-17",
        amountKg: activity.amountKg || 120,
        method: activity.applicationMethod || "side_dressing",
        areaAppliedHa: activity.areaAppliedHa || targetFarm.sizeHa || 1.0,
        costRwf: Math.round((activity.amountKg || 120) * 950),
        appliedBy: activity.assignedTo || "Jean Baptiste",
        notes:
          activity.notes ||
          "Completed from Scheduled Fertilizer Task on Dashboard",
        syncStatus: "synced",
      };
      onAddFertilizerApplication(newLog);
    }

    setConfirmationMessage(
      language === "rw"
        ? `✅ Ifumbire kuri ${activity.crop} yemejwe ko yashyizwemo kandi yanditswe mu bitabo by'igihembwe!`
        : `✅ Fertilizer task for ${activity.crop} marked completed and recorded in the current season log!`
    );
    setTimeout(() => setConfirmationMessage(null), 5000);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarm =
      farms.find((f) => f.id === selectedFarmId) || defaultFarm;
    const methodInfo = getApplicationMethodLabel(applicationMethod, language);
    const alertDate = calculateAdvanceAlertDate(scheduledDate, 2);

    const taskTitle = `${fertilizerType.split("(")[0].trim()} (${npkRatio}) · ${amountKg} kg (${methodInfo.short})`;
    const defaultNote =
      language === "rw"
        ? `Integuza y'Iminsi 2 Mbere izatangwa ku itariki ${alertDate}. Uburyo: ${methodInfo.label} kuri Ha ${areaAppliedHa}.`
        : `2-Day Advance Alert scheduled for ${alertDate}. Method: ${methodInfo.label} across ${areaAppliedHa} Ha.`;

    const newActivityPayload: Omit<FarmActivity, "id"> = {
      farmId: targetFarm.id,
      farmName: targetFarm.name,
      crop: selectedCrop,
      title: taskTitle,
      category: "fertilizing",
      dueDate: scheduledDate,
      status: "pending",
      assignedTo: assignedTo.trim() || "Jean Baptiste",
      notes: notes.trim() ? `${notes.trim()} — ${defaultNote}` : defaultNote,
      fertilizerType,
      npkRatio,
      amountKg,
      areaAppliedHa,
      applicationMethod,
      alertLeadDays: 2,
      alertTriggerDate: alertDate,
    };

    const createdWithId: FarmActivity = {
      ...newActivityPayload,
      id: `act-fert-sched-${Date.now()}`,
    };

    if (onCreateActivity) {
      onCreateActivity(newActivityPayload);
    } else {
      setLocalCreatedActivities((prev) => [createdWithId, ...prev]);
    }

    // If scheduled within 2 days (or if user enabled immediate 2-day alert preview), trigger notification
    if (autoTriggerTwoDayPush && formDaysFromToday <= 2 && formDaysFromToday >= 0) {
      await handleTriggerTwoDayAlert(createdWithId);
    }

    setConfirmationMessage(
      formDaysFromToday === 2
        ? language === "rw"
          ? `🔔 Igikorwa cyo gushyiramo ${amountKg} kg za ${fertilizerType} cyashyizwe ku itariki ${scheduledDate} (Hasigaye iminsi 2)! Integuza y'iminsi 2 mbere yakijijwe.`
          : `🔔 Scheduled ${amountKg} kg of ${fertilizerType} for ${scheduledDate} (in 2 days)! Your 2-Day Advance Alert is active now.`
        : language === "rw"
        ? `📅 Igikorwa cyo gushyiramo ${amountKg} kg za ${fertilizerType} cyashyizwe ku itariki ${scheduledDate}. Uzabona integuza iminsi 2 mbere (${alertDate}).`
        : `📅 Scheduled ${amountKg} kg of ${fertilizerType} for ${scheduledDate}. You will receive an advance alert 2 days before (${alertDate}).`
    );
    setTimeout(() => setConfirmationMessage(null), 6000);
    setNotes("");
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 p-5 sm:p-6 text-white border-b border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold">
                <span>
                  {language === "rw"
                    ? "GAHUNDA Y'IFUMBIRE & INTEGUZA Y'IMINSI 2"
                    : "FUTURE FERTILIZER TASK SCHEDULER"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {language === "rw"
                    ? "Integuza Yikora: Iminsi 2 Mbere (48h)"
                    : "Auto-Alert Rule: 2 Days Prior (48h)"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                {language === "rw"
                  ? "Gupanga Gushyiramo Ifumbire n'Integuza y'Iminsi 2 Mbere"
                  : "Future Fertilizer Application Scheduler & 2-Day Advance Alerts"}
              </h2>
              <p className="text-xs text-stone-300 mt-1 max-w-3xl leading-relaxed">
                {language === "rw"
                  ? "Panga imirimo yo gushyiramo ifumbire (NPK, Urea, DAP) y'igihe kizaza maze uhabwe integuza yihariye hasigaye iminsi 2 ngo itariki igere."
                  : "Schedule future NPK, Urea, and DAP applications across your farm parcels and automatically receive advance alerts 2 days before the scheduled date."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {scheduledFertilizerTasks[0] && (
              <button
                type="button"
                onClick={() =>
                  handleTriggerTwoDayAlert(scheduledFertilizerTasks[0].activity)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>
                  {activePushActivityId ===
                  scheduledFertilizerTasks[0].activity.id
                    ? language === "rw"
                      ? "Integuza Yoherejwe!"
                      : "2-Day Alert Sent!"
                    : language === "rw"
                    ? "Gerageza Integuza y'Iminsi 2"
                    : "Test 2-Day Alert"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFormExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>
                {isFormExpanded
                  ? language === "rw"
                    ? "Funga Ifishi yo Gupanga"
                    : "Hide Scheduler Form"
                  : language === "rw"
                  ? "+ Panga Ifumbire y'Igihe Kizaza"
                  : "+ Schedule Future Fertilizer"}
              </span>
            </button>
          </div>
        </div>

        {/* 4-Metric Telemetry Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-800/80">
          <div className="bg-stone-900/90 border border-amber-500/40 rounded-xl p-3">
            <div className="text-[11px] text-amber-300 font-semibold">
              {language === "rw"
                ? "Integuza z'Iminsi 2 Zikora Ubu"
                : "Active 2-Day Advance Alerts"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white mt-0.5">
              {exactTwoDayTasks.length}{" "}
              <span className="text-xs font-normal text-amber-300">
                {language === "rw" ? "(Hasigaye 2d)" : "(Due in 2 Days)"}
              </span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {twoDayActiveTasks.length}{" "}
              {language === "rw"
                ? "ziri mu gihe cy'amasaha 48"
                : "total within 48h window"}
            </div>
          </div>

          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
            <div className="text-[11px] text-stone-400 font-semibold">
              {language === "rw"
                ? "Imirimo y'Ifumbire Iteganyijwe"
                : "Total Scheduled Fertilizer Tasks"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400 mt-0.5">
              {scheduledFertilizerTasks.length}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {futureArmedTasks.length}{" "}
              {language === "rw"
                ? "zitegereje iminsi >2"
                : "future tasks armed (>2d)"}
            </div>
          </div>

          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
            <div className="text-[11px] text-stone-400 font-semibold">
              {language === "rw"
                ? "Ingano y'Ifumbire Iteganyijwe"
                : "Planned Fertilizer Volume"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-white mt-0.5">
              {totalScheduledKg.toLocaleString()}{" "}
              <span className="text-xs font-normal text-stone-400">kg</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5 font-mono tabular-nums">
              ≈ {(totalScheduledKg / 50).toFixed(1)}{" "}
              {language === "rw" ? "imifuka ya 50kg" : "× 50kg bags"}
            </div>
          </div>

          <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3">
            <div className="text-[11px] text-stone-400 font-semibold">
              {language === "rw"
                ? "Igihe cyo Gutanga Integuza"
                : "Advance Alert Lead Window"}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-amber-400 mt-0.5">
              T - 2 {language === "rw" ? "Iminsi" : "Days"}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {language === "rw"
                ? "Amasaha 48 mbere y'itariki"
                : "Fires 48h prior to application"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Confirmation Banner */}
        {confirmationMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{confirmationMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmationMessage(null)}
              className="text-xs font-bold underline shrink-0"
            >
              {language === "rw" ? "Funga" : "Close"}
            </button>
          </div>
        )}

        {/* 1. ACTIVE 2-DAY ADVANCE ALERTS SPOTLIGHT (Tasks Due in 2 Days) */}
        {exactTwoDayTasks.length > 0 && (
          <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/25 border-2 border-amber-400 dark:border-amber-600/70 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/80 dark:border-amber-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 font-black">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    {language === "rw"
                      ? "🔔 INTEGUZA Y'IMINSI 2 MBERE YAKomotse (48-HOUR ADVANCE ALERT)"
                      : "🔔 ACTIVE 2-DAY ADVANCE FERTILIZER ALERTS (DUE IN 2 DAYS)"}
                  </div>
                  <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">
                    {language === "rw"
                      ? "Iyi mirimo yo gushyiramo ifumbire isigaje iminsi 2 gusa. Tegura imifuka y'ifumbire, abakozi kandi ugenzure ko ubutaka buhehereye."
                      : "These scheduled fertilizer applications are exactly 2 days away. Stage fertilizer bags on-site, brief workers, and verify soil moisture today."}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-950 dark:text-amber-200">
                {exactTwoDayTasks.length}{" "}
                {language === "rw" ? "Integuza Zikora" : "Active 2-Day Alerts"}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {exactTwoDayTasks.map(({ activity, alertTriggerDate }) => {
                const isPushing = activePushActivityId === activity.id;
                const methodLabel = activity.applicationMethod
                  ? getApplicationMethodLabel(
                      activity.applicationMethod,
                      language
                    ).short
                  : language === "rw"
                  ? "Ku ruhande"
                  : "Side-Dressing";

                return (
                  <div
                    key={activity.id}
                    className="rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/60 p-4 shadow-2xs flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                          <Sprout className="w-4 h-4 text-emerald-600" />
                          <span>{activity.farmName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-900 dark:text-white">
                            {activity.crop}
                          </span>
                        </div>
                        <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                          {language === "rw"
                            ? "HASIGAYE IMINSI 2 (J-2)"
                            : "2 DAYS LEFT (T-2d)"}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                        {activity.title}
                      </h3>

                      {/* Granular NPK & Date Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
                        {activity.fertilizerType && (
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                            {activity.fertilizerType}
                          </span>
                        )}
                        {activity.npkRatio && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-bold">
                              NPK {activity.npkRatio}
                            </span>
                          </>
                        )}
                        {activity.amountKg && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-bold text-stone-900 dark:text-white">
                              {activity.amountKg} kg
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{methodLabel}</span>
                      </div>

                      {/* Alert Trigger vs Scheduled Date Box */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-800 text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-stone-500 dark:text-stone-400 block">
                            {language === "rw"
                              ? "Itariki y'Integuza (2d Mbere)"
                              : "2-Day Alert Trigger Date"}
                          </span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {alertTriggerDate}{" "}
                            {language === "rw" ? "(Uyu Munsi)" : "(Today)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-stone-500 dark:text-stone-400 block">
                            {language === "rw"
                              ? "Itariki yo Gushyiramo"
                              : "Scheduled Application Date"}
                          </span>
                          <span className="font-mono font-bold text-stone-900 dark:text-white">
                            {activity.dueDate}
                          </span>
                        </div>
                      </div>

                      {activity.notes && (
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          {activity.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => handleTriggerTwoDayAlert(activity)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-colors"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>
                          {isPushing
                            ? language === "rw"
                              ? "Integuza Yavuzwe!"
                              : "Alert Triggered!"
                            : language === "rw"
                            ? "Subiramo Integuza (Push)"
                            : "Send 2-Day Push Alert"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCompleteAndRecord(activity)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {language === "rw"
                            ? "Yarangiye & Andika NPK"
                            : "Mark Applied & Log NPK"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. INTERACTIVE FORM TO SCHEDULE FUTURE FERTILIZER APPLICATION TASKS */}
        {isFormExpanded && (
          <form
            onSubmit={handleScheduleSubmit}
            className="rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-700/70">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? "Panga Igikorwa Gishya cyo Gushyiramo Ifumbire (mu Gihe Kizaza)"
                    : "Schedule New Future Fertilizer Application Task"}
                </h3>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Integuza y'iminsi 2 mbere yikora kuri buri gikorwa"
                  : "Automatic 2-day advance alert armed for every scheduled task"}
              </span>
            </div>

            {/* Quick Scheduled Date Horizon Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                {language === "rw"
                  ? "1. Hitamo Itariki yo Gushyiramo Ifumbire (Cyangwa Koresha Utubuto twihuse):"
                  : "1. Select Target Application Horizon (Quick Date Presets):"}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    days: 2,
                    labelRw: "Mu Minsi 2 (+2d · Ikora Integuza Ubu)",
                    labelEn: "In 2 Days (+2d · Triggers 2-Day Alert Now)",
                  },
                  {
                    days: 3,
                    labelRw: "Mu Minsi 3 (+3d)",
                    labelEn: "In 3 Days (+3d)",
                  },
                  {
                    days: 5,
                    labelRw: "Mu Minsi 5 (+5d)",
                    labelEn: "In 5 Days (+5d)",
                  },
                  {
                    days: 7,
                    labelRw: "Icyumweru Gitaha (+7d)",
                    labelEn: "Next Week (+7d)",
                  },
                  {
                    days: 14,
                    labelRw: "Mu Minsi 14 (+14d)",
                    labelEn: "In 14 Days (+14d)",
                  },
                ].map((preset) => {
                  const targetDate = getDateWithOffset(preset.days);
                  const isSelected = scheduledDate === targetDate;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setScheduledDate(targetDate)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                        isSelected
                          ? "bg-emerald-800 text-white border-emerald-800"
                          : preset.days === 2
                          ? "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100"
                          : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {language === "rw" ? preset.labelRw : preset.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Farm Parcel */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Umurima (Parcel)" : "Farm Parcel"}
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => handleFarmChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-medium text-stone-900 dark:text-white"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.sizeHa} Ha)
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Crop */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Igihingwa" : "Target Crop"}
                </label>
                <input
                  type="text"
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-medium text-stone-900 dark:text-white"
                />
              </div>

              {/* Scheduled Application Date */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Itariki yo Gushyiramo Ifumbire"
                    : "Scheduled Application Date"}
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-mono font-bold text-stone-900 dark:text-white"
                />
              </div>

              {/* Assigned Operator */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Uzayishyiramo (Umukozi)"
                    : "Assigned Field Operator"}
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-medium text-stone-900 dark:text-white"
                />
              </div>
            </div>

            {/* Fertilizer Product, NPK Ratio, Quantity & Application Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Ubwoko bw'Ifumbire (RAB Smart Nkunganire)"
                    : "Fertilizer Type Preset"}
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-medium text-stone-900 dark:text-white"
                >
                  {FERTILIZER_SCHEDULER_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {language === "rw" ? preset.labelRw : preset.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Igipimo cya NPK" : "NPK Ratio (N-P-K)"}
                </label>
                <input
                  type="text"
                  value={npkRatio}
                  onChange={(e) => setNpkRatio(e.target.value)}
                  placeholder="17-17-17"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-mono font-bold text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ingano (kg)" : "Planned Amount (kg)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={amountKg}
                  onChange={(e) =>
                    setAmountKg(Math.max(1, Number(e.target.value) || 0))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-mono font-bold text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Uburyo bwo Gushyiramo"
                    : "Application Method"}
                </label>
                <select
                  value={applicationMethod}
                  onChange={(e) =>
                    setApplicationMethod(
                      e.target.value as FertilizerApplicationMethod
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-medium text-stone-900 dark:text-white"
                >
                  {(
                    [
                      "side_dressing",
                      "broadcasting",
                      "ring_placement",
                      "foliar_spray",
                      "fertigation",
                    ] as FertilizerApplicationMethod[]
                  ).map((method) => (
                    <option key={method} value={method}>
                      {getApplicationMethodLabel(method, language).label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live 2-Day Advance Alert Calculation Preview Box */}
            <div className="rounded-xl bg-emerald-950 text-white p-4 border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-bold">
                  <BellRing className="w-4 h-4" />
                  <span>
                    {language === "rw"
                      ? "igenzura ry'Integuza y'Iminsi 2 Mbere (48h Advance Alert Preview)"
                      : "2-Day Advance Alert Schedule Preview"}
                  </span>
                </div>
                <p className="text-xs text-stone-200">
                  {formDaysFromToday === 2 ? (
                    language === "rw" ? (
                      <>
                        ⚡ Kubera ko wahisemo itariki iri mu{" "}
                        <strong>minsi 2 ({scheduledDate})</strong>, integuza
                        y&apos;iminsi 2 mbere irahita ikora{" "}
                        <strong>Uyu Munsi ({formAlertTriggerDate})</strong>!
                      </>
                    ) : (
                      <>
                        ⚡ Because the scheduled date is{" "}
                        <strong>2 days away ({scheduledDate})</strong>, the
                        2-Day Advance Alert triggers{" "}
                        <strong>Today ({formAlertTriggerDate})</strong>{" "}
                        immediately upon saving!
                      </>
                    )
                  ) : (
                    <>
                      {language === "rw"
                        ? `Itariki yo gushyiramo ifumbire: ${scheduledDate} · Integuza y'iminsi 2 mbere izatangwa ku itariki: `
                        : `Scheduled Application Date: ${scheduledDate} · 2-Day Advance Alert will fire on: `}
                      <strong className="font-mono text-amber-300">
                        {formAlertTriggerDate}
                      </strong>
                    </>
                  )}
                </p>
                <div className="text-[11px] text-emerald-300 font-mono tabular-nums">
                  {language === "rw" ? "Intungamubiri zizatangwa:" : "Elemental Delivery:"}{" "}
                  N: {((amountKg * parsedFormNpk.n) / 100).toFixed(1)} kg · P:{" "}
                  {((amountKg * parsedFormNpk.p) / 100).toFixed(1)} kg · K:{" "}
                  {((amountKg * parsedFormNpk.k) / 100).toFixed(1)} kg
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                <label className="inline-flex items-center gap-2 text-xs text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTriggerTwoDayPush}
                    onChange={(e) => setAutoTriggerTwoDayPush(e.target.checked)}
                    className="rounded border-stone-600 text-amber-400 focus:ring-amber-400"
                  />
                  <span>
                    {language === "rw"
                      ? "Ohereza Push Notification niba hasigaye iminsi ≤ 2"
                      : "Fire Push & Audio Alert if scheduled within 2 days"}
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {language === "rw"
                      ? "Bika Gahunda & Integuza y'Iminsi 2"
                      : "Schedule Task & Arm 2-Day Alert"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 3. SCHEDULED FUTURE FERTILIZER TASKS QUEUE & 2-DAY ALERT SIMULATOR */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                {language === "rw"
                  ? "Urutonde rw'Imirimo y'Ifumbire Iteganyijwe n'Integuza z'Iminsi 2"
                  : "Scheduled Fertilizer Tasks & 2-Day Advance Alert Queue"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Kanda 'Shyira ku Minsi 2 (+2d)' ku murimo wose w'igihe kizaza kugira ngo ugerageze integuza y'iminsi 2 mbere ako kanya."
                  : "Click 'Trigger 2-Day Window (+2d)' on any future task to test its 2-day advance alert immediately."}
              </p>
            </div>

            {/* Interactive Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setQueueFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  queueFilter === "all"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                {language === "rw" ? "Byose" : "All"} (
                {scheduledFertilizerTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("two_day_active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  queueFilter === "two_day_active"
                    ? "bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                {language === "rw"
                  ? "Integuza y'Iminsi 2 (≤2d)"
                  : "2-Day Alert Active (≤2d)"}{" "}
                (
                {
                  scheduledFertilizerTasks.filter(
                    (t) => t.daysRemaining >= 0 && t.daysRemaining <= 2
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter("future_armed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  queueFilter === "future_armed"
                    ? "bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                {language === "rw" ? "Igihe Kizaza (>2d)" : "Future Armed (>2d)"}{" "}
                ({futureArmedTasks.length})
              </button>
            </div>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-2">
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                {language === "rw"
                  ? "Nta murimo wo gushyiramo ifumbire ugaragara muri iki cyiciro."
                  : "No scheduled fertilizer tasks in this filter view."}
              </p>
              <button
                type="button"
                onClick={() => setIsFormExpanded(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Panga Igikorwa cy'Ifumbire"
                    : "Schedule Fertilizer Task"}
                </span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-200/80 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              {filteredQueue.map(
                ({
                  activity,
                  daysRemaining,
                  alertTriggerDate,
                  daysUntilAlertFires,
                  isTwoDayAlertActive,
                }) => {
                  const isPushing = activePushActivityId === activity.id;

                  return (
                    <div
                      key={activity.id}
                      className={`p-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isTwoDayAlertActive
                          ? "bg-amber-50/50 dark:bg-amber-950/20"
                          : "bg-white dark:bg-stone-900 hover:bg-stone-50/80 dark:hover:bg-stone-800/40"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-mono font-black ${
                              daysRemaining === 2
                                ? "text-amber-700 dark:text-amber-400"
                                : daysRemaining <= 1
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {daysRemaining === 2
                              ? language === "rw"
                                ? "🔔 INTEGUZA Y'IMINSI 2 MBERE IKORA (Hasigaye Iminsi 2)"
                                : "🔔 2-DAY ADVANCE ALERT ACTIVE (Due in 2 Days)"
                              : daysRemaining === 1
                              ? language === "rw"
                                ? "⏰ Ejo Hazaza (Hasigaye Umunsi 1)"
                                : "⏰ Due Tomorrow (1 Day Left)"
                              : daysRemaining === 0
                              ? language === "rw"
                                ? "⚡ Uyu Munsi (Due Today)"
                                : "⚡ Due Today"
                              : daysRemaining < 0
                              ? language === "rw"
                                ? `⚠️ Yarenze Igihe (${Math.abs(daysRemaining)}d)`
                                : `⚠️ Overdue (${Math.abs(daysRemaining)}d)`
                              : language === "rw"
                              ? `⏳ Hasigaye iminsi ${daysRemaining} (Integuza ku wa ${alertTriggerDate})`
                              : `⏳ In ${daysRemaining} Days (2-Day Alert fires ${alertTriggerDate} · in ${daysUntilAlertFires}d)`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-stone-700 dark:text-stone-300">
                            {activity.farmName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-600 dark:text-stone-400">
                            {activity.crop}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                          {activity.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {language === "rw" ? "Itariki:" : "Scheduled:"}{" "}
                              <strong className="text-stone-800 dark:text-stone-200">
                                {activity.dueDate}
                              </strong>
                            </span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              {language === "rw"
                                ? "Integuza (2d Mbere):"
                                : "2-Day Alert Date:"}{" "}
                              <strong className="text-amber-700 dark:text-amber-300">
                                {alertTriggerDate}
                              </strong>
                            </span>
                          </span>
                          {activity.amountKg && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                {activity.amountKg} kg{" "}
                                {activity.npkRatio
                                  ? `(NPK ${activity.npkRatio})`
                                  : ""}
                              </span>
                            </>
                          )}
                          {activity.assignedTo && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-sans">
                                {activity.assignedTo}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Interactive Task Controls */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* If task is >2 days away, allow 1-click Fast-Forward to +2 days to trigger 2-day alert */}
                        {daysRemaining !== 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRescheduleTask(
                                activity,
                                getDateWithOffset(2),
                                true
                              )
                            }
                            title={
                              language === "rw"
                                ? "Shyira uyu murimo ku minsi 2 iri imbere kugira ngo integuza y'iminsi 2 ihite ikora"
                                : "Move scheduled date to 2 days from today to activate 2-day alert immediately"
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-colors"
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            <span>
                              {language === "rw"
                                ? "Shyira kuri +2d (Ikore Integuza)"
                                : "Set to +2d (Trigger Alert)"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTriggerTwoDayAlert(activity)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {isPushing
                              ? language === "rw"
                                ? "Yoherejwe!"
                                : "Sent!"
                              : language === "rw"
                              ? "Gerageza Push (2d)"
                              : "Preview 2-Day Alert"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCompleteAndRecord(activity)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {language === "rw" ? "Yarangiye" : "Complete"}
                          </span>
                        </button>

                        {onDeleteActivity && (
                          <button
                            type="button"
                            onClick={() => onDeleteActivity(activity.id)}
                            title={
                              language === "rw" ? "Siba gahunda" : "Delete task"
                            }
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
