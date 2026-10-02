import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmPlan,
  IrrigationDemandAlert,
  Language,
} from "../types";
import {
  Calendar,
  Droplets,
  FlaskConical,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Layers,
  Maximize2,
  Minimize2,
  CalendarPlus,
} from "lucide-react";

export interface CalendarMappedEvent {
  id: string;
  activityId?: string;
  planId: string;
  planTitle: string;
  farmId: string;
  farmName: string;
  district: string;
  crop: string;
  growthStagePct: number;
  dateStr: string;
  dayOffset: number;
  category: "fertilizing" | "irrigation";
  titleEn: string;
  titleRw: string;
  dosageLabelEn: string;
  dosageLabelRw: string;
  shiftWindow: string;
  status: "pending" | "in_progress" | "completed" | "projected";
  assignedTo: string;
  rabProtocolEn: string;
  rabProtocolRw: string;
  waterLiters?: number;
  waterMm?: number;
  fertilizerKg?: number;
  fertilizerType?: string;
}

interface FourteenDayAgronomyCalendarOverlayProps {
  plans: FarmPlan[];
  farms: Farm[];
  activities: FarmActivity[];
  irrigationAlerts: IrrigationDemandAlert[];
  language: Language;
  onNavigateToActivityLog: (options?: {
    farmId?: string;
    category?: "fertilizing" | "irrigation";
    activityId?: string;
    dateStr?: string;
  }) => void;
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
  onCompleteActivity?: (activityId: string) => void;
  isModalOpenExternal?: boolean;
  onCloseModalExternal?: () => void;
}

export const FourteenDayAgronomyCalendarOverlay: React.FC<
  FourteenDayAgronomyCalendarOverlayProps
> = ({
  plans,
  farms,
  activities,
  irrigationAlerts,
  language,
  onNavigateToActivityLog,
  onCreateActivity,
  isModalOpenExternal,
  onCloseModalExternal,
}) => {
  const [isFullscreenOverlay, setIsFullscreenOverlay] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "fertilizing" | "irrigation"
  >("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "swimlane">("grid");
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loggedProjectedIds, setLoggedProjectedIds] = useState<string[]>([]);

  const isOverlayOpen = Boolean(isModalOpenExternal || isFullscreenOverlay);

  const handleCloseOverlay = () => {
    setIsFullscreenOverlay(false);
    onCloseModalExternal?.();
  };

  const activePlans = useMemo(() => {
    const nonCompleted = plans.filter((p) => p.status !== "completed");
    return nonCompleted.length > 0 ? nonCompleted : plans;
  }, [plans]);

  const fourteenDays = useMemo(() => {
    const days: Array<{
      dayOffset: number;
      dateStr: string;
      dayNumber: number;
      monthShort: string;
      weekdayShortEn: string;
      weekdayShortRw: string;
      fullLabelEn: string;
      fullLabelRw: string;
    }> = [];

    const weekdaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdaysRw = ["Cyu", "Mbe", "Kab", "Gat", "Kan", "Gatn", "Gtd"];
    const monthsEn = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let offset = 0; offset < 14; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const dateStr = d.toISOString().split("T")[0];
      const dow = d.getDay();
      const dayNumber = d.getDate();
      const monthShort = monthsEn[d.getMonth()];

      days.push({
        dayOffset: offset,
        dateStr,
        dayNumber,
        monthShort,
        weekdayShortEn: weekdaysEn[dow],
        weekdayShortRw: weekdaysRw[dow],
        fullLabelEn:
          offset === 0
            ? `Today (${weekdaysEn[dow]}, ${monthShort} ${dayNumber})`
            : offset === 1
            ? `Tomorrow (${weekdaysEn[dow]}, ${monthShort} ${dayNumber})`
            : `${weekdaysEn[dow]}, ${monthShort} ${dayNumber} (Day +${offset})`,
        fullLabelRw:
          offset === 0
            ? `Uyu Munsi (${weekdaysRw[dow]}, ${dayNumber} ${monthShort})`
            : offset === 1
            ? `Ejo (${weekdaysRw[dow]}, ${dayNumber} ${monthShort})`
            : `${weekdaysRw[dow]}, ${dayNumber} ${monthShort} (Umunsi +${offset})`,
      });
    }

    return days;
  }, []);

  const mappedEvents = useMemo(() => {
    const events: CalendarMappedEvent[] = [];
    const dateSet = new Set(fourteenDays.map((d) => d.dateStr));

    activities.forEach((act) => {
      if (act.category !== "fertilizing" && act.category !== "irrigation") {
        return;
      }
      if (!dateSet.has(act.dueDate)) return;

      const dayEntry = fourteenDays.find((d) => d.dateStr === act.dueDate);
      if (!dayEntry) return;

      const matchedPlan =
        activePlans.find((p) => p.farmId === act.farmId) || activePlans[0];
      const matchedFarm = farms.find((f) => f.id === act.farmId);

      events.push({
        id: `act-${act.id}`,
        activityId: act.id,
        planId: matchedPlan?.id || `plan-${act.farmId}`,
        planTitle: `${act.crop} (${act.farmName})`,
        farmId: act.farmId,
        farmName: act.farmName,
        district: matchedFarm?.district || "Musanze",
        crop: act.crop,
        growthStagePct: matchedPlan?.growthStagePercentage ?? 55,
        dateStr: act.dueDate,
        dayOffset: dayEntry.dayOffset,
        category: act.category,
        titleEn: act.title,
        titleRw: act.title,
        dosageLabelEn:
          act.category === "fertilizing"
            ? "Logged Fertilizer Task"
            : "Logged Irrigation Task",
        dosageLabelRw:
          act.category === "fertilizing"
            ? "Ifumbire yanditswe mu gitabo"
            : "Kuhira kwanditswe mu gitabo",
        shiftWindow: act.shiftWindow || "06:30 - 09:00 AM",
        status: act.status,
        assignedTo: act.assignedTo || "Agronomy Field Team",
        rabProtocolEn:
          act.notes ||
          "Follow RAB certified field application dosage and verify soil moisture prior to application.",
        rabProtocolRw:
          act.notes ||
          "Kurikiza ingano yemewe na RAB kandi ugenzure ubuhehere bw'ubutaka.",
      });
    });

    activePlans.forEach((plan, planIndex) => {
      const farm = farms.find((f) => f.id === plan.farmId);
      const sizeHa = farm?.sizeHa || plan.landSize || 1.5;
      const district = farm?.district || "Musanze";
      const growthPct = plan.growthStagePercentage ?? 55;
      const cropLower = plan.crop.toLowerCase();

      const irrigAlert = irrigationAlerts.find((a) => a.farmId === plan.farmId);

      const irrigationOffsets =
        planIndex === 0
          ? [0, 2, 5, 8, 11]
          : planIndex === 1
          ? [0, 1, 4, 7, 10, 13]
          : [1, 3, 6, 9, 12];

      irrigationOffsets.forEach((dayOffset) => {
        const dayObj = fourteenDays[dayOffset];
        if (!dayObj) return;

        const alreadyLogged = events.some(
          (e) =>
            e.farmId === plan.farmId &&
            e.dateStr === dayObj.dateStr &&
            e.category === "irrigation"
        );
        if (alreadyLogged) return;

        const predictiveDay = irrigAlert?.threeDayForecast?.find(
          (d) => d.dayOffset === dayOffset
        );

        const waterMm =
          dayOffset === 0
            ? irrigAlert?.recommendedWaterMm || 14
            : predictiveDay?.predictiveWaterMm ||
              (district.toLowerCase().includes("nyagatare") ? 18 : 13);

        const waterLiters = Math.round(waterMm * 10000 * sizeHa);

        events.push({
          id: `proj-irrig-${plan.id}-d${dayOffset}`,
          planId: plan.id,
          planTitle: `${plan.crop} (${plan.farmName})`,
          farmId: plan.farmId,
          farmName: plan.farmName,
          district,
          crop: plan.crop,
          growthStagePct: growthPct,
          dateStr: dayObj.dateStr,
          dayOffset,
          category: "irrigation",
          titleEn:
            dayOffset === 0
              ? `Immediate Root-Zone Irrigation: ${plan.crop} (${waterMm}mm)`
              : `Scheduled Crop Irrigation Cycle: ${plan.crop} (${waterMm}mm)`,
          titleRw:
            dayOffset === 0
              ? `Kuhira Byihuse ku Mizi: ${plan.crop} (${waterMm}mm)`
              : `Gahunda yo Kuhira Igihingwa: ${plan.crop} (${waterMm}mm)`,
          dosageLabelEn: `${waterMm} mm • ${waterLiters.toLocaleString()} L (${sizeHa} Ha)`,
          dosageLabelRw: `${waterMm} mm • Litiro ${waterLiters.toLocaleString()} L (${sizeHa} Ha)`,
          shiftWindow: "06:00 - 08:30 AM",
          status: loggedProjectedIds.includes(
            `proj-irrig-${plan.id}-d${dayOffset}`
          )
            ? "pending"
            : "projected",
          assignedTo: "Abakozi bo Kuhira (Irrigation Team)",
          rabProtocolEn: `Apply ${waterMm}mm (${waterLiters.toLocaleString()} L) via ${
            irrigAlert?.recommendedMethodEn || "drip/furrow lines"
          } during early morning hours to minimize ETc loss.`,
          rabProtocolRw: `Uhira mm ${waterMm} (${waterLiters.toLocaleString()} L) mu gitondo hakiri kare kugira ngo izuba ritangiza amazi.`,
          waterLiters,
          waterMm,
        });
      });

      const fertilizerSchedules =
        cropLower.includes("ibirayi") || cropLower.includes("potato")
          ? [
              {
                dayOffset: 1,
                fertType: "NPK 17-17-17 (Nkunganire Top-Dress)",
                kgPerHa: 150,
                titleEn: `NPK 17-17-17 Tuber Bulking Side-Dress — ${plan.crop}`,
                titleRw: `Gusukira & Gushyiramo NPK 17-17-17 — ${plan.crop}`,
                protocolEn:
                  "Band-apply NPK 17-17-17 along potato ridges 5cm from stems after morning irrigation (>60% VWC).",
                protocolRw:
                  "Shyira NPK 17-17-17 ku mirongo y'ibirayi kuri cm 5 uvuye ku giti nyuma yo kuhira.",
              },
              {
                dayOffset: 6,
                fertType: "Potassium Sulfate (K₂SO₄) + Magnesium",
                kgPerHa: 80,
                titleEn: `Potash Tuber Density Application — ${plan.crop}`,
                titleRw: `Ifumbire yo Kubyibushya Ibirayi (Potash) — ${plan.crop}`,
                protocolEn:
                  "Boost starch translocation and skin quality during peak tuber bulking stage.",
                protocolRw:
                  "Ifasha ibirayi kubyibuha vuba no kugira igishishwa gikomeye.",
              },
              {
                dayOffset: 12,
                fertType: "Foliar Calcium-Boron + Organic Compost Tea",
                kgPerHa: 25,
                titleEn: `Foliar Calcium-Boron Micronutrient Feed — ${plan.crop}`,
                titleRw: `Ifumbire y'Amazi (Calcium-Boron) ku Mababi — ${plan.crop}`,
                protocolEn:
                  "Prevents internal brown spot and hollow heart in volcanic highland tubers.",
                protocolRw:
                  "Irinda ibirayi kubora imbere no gusaduka mu gihe cyo gukura.",
              },
            ]
          : cropLower.includes("ibigori") || cropLower.includes("maize")
          ? [
              {
                dayOffset: 2,
                fertType: "Urea 46% N (Split Tasseling Top-Dress)",
                kgPerHa: 100,
                titleEn: `Urea 46% N Tasseling Boost Application — ${plan.crop}`,
                titleRw: `Gushyiramo Urea 46% N mu Gihe cy'Imisatsi — ${plan.crop}`,
                protocolEn:
                  "Apply Urea 46% N in moist furrow pockets 8cm from maize stalks; cover with soil immediately.",
                protocolRw:
                  "Shyira Urea kuri cm 8 uvuye ku giti cy'ikigori ubundi woroseho igitaka ako kanya.",
              },
              {
                dayOffset: 7,
                fertType: "DAP + Zinc Ear-Filling Supplement",
                kgPerHa: 75,
                titleEn: `DAP & Zinc Cob-Filling Nutrient Application — ${plan.crop}`,
                titleRw: `Ifumbire ya DAP + Zinc yo Kuzuza Amahundo — ${plan.crop}`,
                protocolEn:
                  "Supports full kernel set and prevents barren cob tips in Eastern Savanna soils.",
                protocolRw:
                  "Ifasha amahundo y'ibigori kuzura imbuto neza kugeza ku mutwe.",
              },
              {
                dayOffset: 11,
                fertType: "Organic Farmyard Compost Mulch (Imborera)",
                kgPerHa: 400,
                titleEn: `Composted Manure Moisture-Lock Side Dress — ${plan.crop}`,
                titleRw: `Kongeramo Imborera Ihiye Gufata Ubuhehere — ${plan.crop}`,
                protocolEn:
                  "Conserves root-zone moisture and buffers soil pH during grain filling.",
                protocolRw:
                  "Igumana ubuhehere mu butaka bw'umusenyi ikanongerera intungamubiri.",
              },
            ]
          : [
              {
                dayOffset: 3,
                fertType: "Calcium Nitrate (Ca(NO₃)₂) Fruit-Set Feed",
                kgPerHa: 90,
                titleEn: `Calcium Nitrate Blossom-End Protection — ${plan.crop}`,
                titleRw: `Ifumbire ya Calcium Nitrate Irinda Inyanya Kubora — ${plan.crop}`,
                protocolEn:
                  "Prevents blossom-end rot during fruit setting; apply directly to irrigated root zone.",
                protocolRw:
                  "Irinda inyanya kubora ku mutwe mu gihe cyo kurema imbuto.",
              },
              {
                dayOffset: 9,
                fertType: "NPK 15-9-20 High-Potassium Fruit Feed",
                kgPerHa: 110,
                titleEn: `High-K NPK 15-9-20 Fruit Ripening Feed — ${plan.crop}`,
                titleRw: `Ifumbire ya NPK 15-9-20 yo Guhisha Inyanya — ${plan.crop}`,
                protocolEn:
                  "Enhances fruit firmness, brix sugar content, and shelf life for market transport.",
                protocolRw:
                  "Ituma inyanya zikomera kandi zigatukura neza mbere yo kujyanwa ku isoko.",
              },
            ];

      fertilizerSchedules.forEach((sched) => {
        const dayObj = fourteenDays[sched.dayOffset];
        if (!dayObj) return;

        const alreadyLogged = events.some(
          (e) =>
            e.farmId === plan.farmId &&
            e.dateStr === dayObj.dateStr &&
            e.category === "fertilizing"
        );
        if (alreadyLogged) return;

        const totalKg = Math.round(sched.kgPerHa * sizeHa);

        events.push({
          id: `proj-fert-${plan.id}-d${sched.dayOffset}`,
          planId: plan.id,
          planTitle: `${plan.crop} (${plan.farmName})`,
          farmId: plan.farmId,
          farmName: plan.farmName,
          district,
          crop: plan.crop,
          growthStagePct: growthPct,
          dateStr: dayObj.dateStr,
          dayOffset: sched.dayOffset,
          category: "fertilizing",
          titleEn: sched.titleEn,
          titleRw: sched.titleRw,
          dosageLabelEn: `${totalKg} kg total (${sched.kgPerHa} kg/Ha • ${sched.fertType})`,
          dosageLabelRw: `Kg ${totalKg} zose (${sched.kgPerHa} kg/Ha • ${sched.fertType})`,
          shiftWindow: "07:30 - 10:00 AM",
          status: loggedProjectedIds.includes(
            `proj-fert-${plan.id}-d${sched.dayOffset}`
          )
            ? "pending"
            : "projected",
          assignedTo: "Dr. Emmanuel Hakizimana (Agronomy Team)",
          rabProtocolEn: sched.protocolEn,
          rabProtocolRw: sched.protocolRw,
          fertilizerKg: totalKg,
          fertilizerType: sched.fertType,
        });
      });
    });

    return events.sort((a, b) => a.dayOffset - b.dayOffset);
  }, [
    fourteenDays,
    activities,
    activePlans,
    farms,
    irrigationAlerts,
    loggedProjectedIds,
  ]);

  const filteredEvents = useMemo(() => {
    return mappedEvents.filter((ev) => {
      if (selectedPlanId !== "all" && ev.planId !== selectedPlanId) {
        return false;
      }
      if (categoryFilter !== "all" && ev.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [mappedEvents, selectedPlanId, categoryFilter]);

  const selectedDayObj =
    fourteenDays.find((d) => d.dayOffset === selectedDayOffset) ||
    fourteenDays[0];

  const selectedDayEvents = useMemo(() => {
    return filteredEvents.filter((ev) => ev.dayOffset === selectedDayOffset);
  }, [filteredEvents, selectedDayOffset]);

  const activeInspectedEvent = useMemo(() => {
    if (selectedEventId) {
      const found = filteredEvents.find((e) => e.id === selectedEventId);
      if (found) return found;
    }
    return selectedDayEvents[0] || filteredEvents[0] || null;
  }, [filteredEvents, selectedEventId, selectedDayEvents]);

  const summaryStats = useMemo(() => {
    const fertEvents = filteredEvents.filter(
      (e) => e.category === "fertilizing"
    );
    const irrigEvents = filteredEvents.filter(
      (e) => e.category === "irrigation"
    );
    const totalFertKg = fertEvents.reduce(
      (sum, e) => sum + (e.fertilizerKg || 120),
      0
    );
    const totalWaterLiters = irrigEvents.reduce(
      (sum, e) => sum + (e.waterLiters || 150000),
      0
    );

    return {
      fertCount: fertEvents.length,
      irrigCount: irrigEvents.length,
      totalFertKg,
      totalWaterLiters,
    };
  }, [filteredEvents]);

  const handleLogEventToActivityBook = (ev: CalendarMappedEvent) => {
    if (ev.activityId || loggedProjectedIds.includes(ev.id)) return;

    onCreateActivity?.({
      farmId: ev.farmId,
      farmName: ev.farmName,
      crop: ev.crop,
      title: language === "rw" ? ev.titleRw : ev.titleEn,
      category: ev.category,
      dueDate: ev.dateStr,
      status: "pending",
      assignedTo: ev.assignedTo,
      notes: `${
        language === "rw" ? ev.dosageLabelRw : ev.dosageLabelEn
      } — ${language === "rw" ? ev.rabProtocolRw : ev.rabProtocolEn}`,
    });

    setLoggedProjectedIds((prev) => [...prev, ev.id]);
  };

  const renderCalendarContent = (inModal: boolean) => (
    <div
      className={`rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs overflow-hidden ${
        inModal ? "border-0 shadow-none" : ""
      }`}
    >
      {/* Top Header Banner */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-stone-950 via-emerald-950 to-stone-900 text-white border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {language === "rw"
                  ? "INGENGABIHE Y'IMINSI 14 (IFUMBIRE & KUHIRA)"
                  : "14-DAY INTERACTIVE AGRONOMY CALENDAR OVERLAY"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {activePlans.length}{" "}
                {language === "rw" ? "Imigambi Ikora" : "Active Farm Plans"}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
              {language === "rw"
                ? "Ikarita y'Iminsi 14 y'Ifumbire n'Ubwuhirizi kuri Buri Mugambi w'Ihinga"
                : "14-Day Fertilizer Application & Irrigation Schedule by Farm Plan"}
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              {language === "rw"
                ? "Kanda ku munsi cyangwa ku gikorwa urebe ingano ya NPK/Urea n'amazi, cyangwa ujyane ako kanya mu gitabo cy'imirimo (Activity Log)."
                : "Click any date or event badge to inspect fertilizer & water dosages and jump directly to the relevant Activity Log."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center p-1 rounded-xl bg-stone-900/90 border border-stone-700">
            <button
              type="button"
              onClick={() => setViewLayout("grid")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewLayout === "grid"
                  ? "bg-emerald-600 text-white"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {language === "rw" ? "Kalendari (14d)" : "14-Day Grid"}
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("swimlane")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewLayout === "swimlane"
                  ? "bg-emerald-600 text-white"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              {language === "rw" ? "Imigambi (Swimlanes)" : "Plan Swimlanes"}
            </button>
          </div>

          {!inModal ? (
            <button
              type="button"
              onClick={() => setIsFullscreenOverlay(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all shadow-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "Fungura Kalendari Yagutse"
                  : "Expand Calendar Overlay"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCloseOverlay}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold border border-stone-700 transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>
                {language === "rw" ? "Funga Kalendari" : "Close Overlay"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & KPI Bar */}
      <div className="px-4 sm:px-6 py-3 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200/80 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>
              {language === "rw" ? "Umugambi w'Ihinga:" : "Active Farm Plan:"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedPlanId("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              selectedPlanId === "all"
                ? "bg-stone-900 dark:bg-white text-white dark:text-stone-950 border-stone-900 dark:border-white"
                : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-600"
            }`}
          >
            {language === "rw"
              ? `Imigambi Yose (${activePlans.length})`
              : `All Active Plans (${activePlans.length})`}
          </button>

          {activePlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-emerald-800 text-white border-emerald-800"
                    : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-600"
                }`}
              >
                <span>{plan.crop}</span>
                <span className="text-[10px] opacity-80">({plan.farmName})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              categoryFilter === "all"
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
            }`}
          >
            {language === "rw" ? "Byose" : "All"} ({filteredEvents.length})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("fertilizing")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
              categoryFilter === "fertilizing"
                ? "bg-amber-500 text-stone-950 border-amber-500"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>
              {language === "rw" ? "Ifumbire" : "Fertilizer"} (
              {summaryStats.fertCount} • {summaryStats.totalFertKg} kg)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("irrigation")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-all ${
              categoryFilter === "irrigation"
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>
              {language === "rw" ? "Kuhira" : "Irrigation"} (
              {summaryStats.irrigCount} •{" "}
              {Math.round(summaryStats.totalWaterLiters / 1000)}k L)
            </span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8">
          {viewLayout === "grid" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span className="font-bold uppercase tracking-wider">
                  {language === "rw"
                    ? "Ibyumweru 2 Biri Imbere (Iminsi 14)"
                    : "Upcoming 14-Day Operational Horizon (2 Weeks)"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    {language === "rw" ? "Ifumbire (NPK/Urea)" : "Fertilizer"}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    {language === "rw" ? "Kuhira (Irrigation)" : "Irrigation"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {fourteenDays.map((day) => {
                  const dayEvents = filteredEvents.filter(
                    (e) => e.dayOffset === day.dayOffset
                  );
                  const fertEvents = dayEvents.filter(
                    (e) => e.category === "fertilizing"
                  );
                  const irrigEvents = dayEvents.filter(
                    (e) => e.category === "irrigation"
                  );
                  const isSelectedDay = selectedDayOffset === day.dayOffset;
                  const hasBothFertAndIrrig =
                    fertEvents.length > 0 && irrigEvents.length > 0;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => {
                        setSelectedDayOffset(day.dayOffset);
                        if (dayEvents[0]) {
                          setSelectedEventId(dayEvents[0].id);
                        }
                      }}
                      className={`rounded-2xl p-2.5 border transition-all cursor-pointer flex flex-col justify-between min-h-[124px] ${
                        isSelectedDay
                          ? "border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/30"
                          : day.dayOffset === 0
                          ? "border-amber-400/80 dark:border-amber-600/70 bg-amber-50/20 dark:bg-stone-900"
                          : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-500/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-black uppercase ${
                              day.dayOffset === 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-stone-400"
                            }`}
                          >
                            {day.dayOffset === 0
                              ? language === "rw"
                                ? "NONE"
                                : "TODAY"
                              : language === "rw"
                              ? day.weekdayShortRw
                              : day.weekdayShortEn}
                          </span>
                          <span className="text-xs font-black font-mono text-stone-900 dark:text-white">
                            {day.monthShort} {day.dayNumber}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1">
                          {dayEvents.length === 0 ? (
                            <div className="text-[10px] text-stone-400 italic py-2 text-center">
                              {language === "rw"
                                ? "Nta gikorwa"
                                : "Routine monitor"}
                            </div>
                          ) : (
                            dayEvents.slice(0, 3).map((ev) => (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDayOffset(day.dayOffset);
                                  setSelectedEventId(ev.id);
                                }}
                                className={`w-full text-left px-1.5 py-1 rounded-lg text-[10px] font-bold truncate flex items-center gap-1 transition-all ${
                                  ev.category === "fertilizing"
                                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800"
                                    : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-800"
                                } ${
                                  selectedEventId === ev.id
                                    ? "ring-2 ring-stone-900 dark:ring-white"
                                    : ""
                                }`}
                              >
                                {ev.category === "fertilizing" ? (
                                  <FlaskConical className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                ) : (
                                  <Droplets className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                )}
                                <span className="truncate">
                                  {ev.crop.split(" ")[0]}
                                </span>
                              </button>
                            ))
                          )}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] font-mono text-center text-stone-500">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-1.5 mt-1 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[9px] font-mono text-stone-500">
                        <span>D+{day.dayOffset}</span>
                        {hasBothFertAndIrrig && (
                          <span className="px-1 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold">
                            Fert+H₂O
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 overflow-x-auto">
              <div className="min-w-[680px] space-y-3">
                {activePlans.map((plan) => {
                  const planEvents = filteredEvents.filter(
                    (e) => e.planId === plan.id
                  );

                  return (
                    <div
                      key={plan.id}
                      className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-stone-900 dark:text-white">
                            {plan.crop}
                          </span>
                          <span className="text-[11px] text-stone-500 ml-2">
                            {plan.farmName} • Stage{" "}
                            {plan.growthStagePercentage ?? 55}%
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToActivityLog({ farmId: plan.farmId })
                          }
                          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>
                            {language === "rw"
                              ? "Igitabo cy'imirimo"
                              : "Open Plan Activity Log"}
                          </span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                        {fourteenDays.map((d) => {
                          const cellEvents = planEvents.filter(
                            (e) => e.dayOffset === d.dayOffset
                          );
                          const hasFert = cellEvents.some(
                            (e) => e.category === "fertilizing"
                          );
                          const hasIrrig = cellEvents.some(
                            (e) => e.category === "irrigation"
                          );

                          return (
                            <button
                              key={d.dateStr}
                              type="button"
                              onClick={() => {
                                setSelectedDayOffset(d.dayOffset);
                                if (cellEvents[0]) {
                                  setSelectedEventId(cellEvents[0].id);
                                }
                              }}
                              className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                selectedDayOffset === d.dayOffset
                                  ? "ring-2 ring-emerald-500 border-emerald-600"
                                  : "border-stone-200 dark:border-stone-800"
                              } ${
                                hasFert && hasIrrig
                                  ? "bg-gradient-to-br from-amber-500/25 to-emerald-500/25"
                                  : hasFert
                                  ? "bg-amber-100/80 dark:bg-amber-950/60"
                                  : hasIrrig
                                  ? "bg-emerald-100/80 dark:bg-emerald-950/60"
                                  : "bg-white dark:bg-stone-900"
                              }`}
                            >
                              <span className="text-[9px] font-mono text-stone-400">
                                D+{d.dayOffset}
                              </span>
                              <div className="flex items-center gap-1">
                                {hasFert && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-amber-500"
                                    title="Fertilizer Application"
                                  />
                                )}
                                {hasIrrig && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-emerald-600"
                                    title="Irrigation Event"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Selected Day & Event Inspector */}
        <div className="xl:col-span-4 flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {language === "rw"
                    ? "IBIKORWA BYO KU MUNSI WATORANYIJWE"
                    : "SELECTED DATE SCHEDULE INSPECTOR"}
                </span>
                <h4 className="text-sm font-black text-stone-900 dark:text-white mt-0.5">
                  {language === "rw"
                    ? selectedDayObj.fullLabelRw
                    : selectedDayObj.fullLabelEn}
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-stone-200/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
                {selectedDayEvents.length}{" "}
                {language === "rw" ? "ibikorwa" : "events"}
              </span>
            </div>

            {selectedDayEvents.length > 0 ? (
              <div className="mt-3 space-y-2.5">
                {selectedDayEvents.map((ev) => {
                  const isLogged =
                    Boolean(ev.activityId) ||
                    loggedProjectedIds.includes(ev.id);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        activeInspectedEvent?.id === ev.id
                          ? "border-emerald-600 dark:border-emerald-500 bg-white dark:bg-stone-900 shadow-xs"
                          : "border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              ev.category === "fertilizing"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {ev.category === "fertilizing" ? (
                              <FlaskConical className="w-4 h-4" />
                            ) : (
                              <Droplets className="w-4 h-4" />
                            )}
                          </span>
                          <div>
                            <span
                              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                ev.category === "fertilizing"
                                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                                  : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              }`}
                            >
                              {ev.category === "fertilizing"
                                ? language === "rw"
                                  ? "IFUMBIRE"
                                  : "FERTILIZER"
                                : language === "rw"
                                ? "KUHIRA"
                                : "IRRIGATION"}
                            </span>
                            <h5 className="text-xs font-bold text-stone-900 dark:text-white mt-1">
                              {language === "rw" ? ev.titleRw : ev.titleEn}
                            </h5>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                        {language === "rw"
                          ? ev.dosageLabelRw
                          : ev.dosageLabelEn}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">
                          {ev.farmName}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-amber-500" />
                          {ev.shiftWindow}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed bg-stone-50 dark:bg-stone-800/60 p-2 rounded-lg">
                        {language === "rw"
                          ? ev.rabProtocolRw
                          : ev.rabProtocolEn}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToActivityLog({
                              farmId: ev.farmId,
                              category: ev.category,
                              activityId: ev.activityId,
                              dateStr: ev.dateStr,
                            });
                            handleCloseOverlay();
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span>
                            {language === "rw"
                              ? "Jya mu Gitabo cy'Imirimo"
                              : "Open in Activity Log"}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        {!isLogged ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLogEventToActivityBook(ev);
                            }}
                            className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold inline-flex items-center gap-1 transition-all"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>
                              {language === "rw" ? "Andika" : "Sync Task"}
                            </span>
                          </button>
                        ) : (
                          <span className="py-2 px-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {language === "rw" ? "Yanditswe" : "In Log"}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 p-5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-2">
                <Calendar className="w-6 h-6 text-stone-400 mx-auto" />
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                  {language === "rw"
                    ? "Nta gikorwa cy'ifumbire cyangwa kuhira cyateganyijwe kuri uyu munsi."
                    : "No fertilizer or irrigation events scheduled on this specific date."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? `Ibikorwa ${filteredEvents.length} mu minsi 14`
                : `${filteredEvents.length} mapped events in 14 days`}
            </span>
            <button
              type="button"
              onClick={() => {
                onNavigateToActivityLog({
                  farmId: activeInspectedEvent?.farmId,
                  category: activeInspectedEvent?.category,
                });
                handleCloseOverlay();
              }}
              className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
            >
              <span>
                {language === "rw"
                  ? "Reba Urutonde Rwose rw'Imirimo →"
                  : "View Full Activity Log →"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderCalendarContent(false)}

      {isOverlayOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-700 bg-white dark:bg-stone-900 shadow-2xl">
            {renderCalendarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
