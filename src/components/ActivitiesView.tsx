import React, { useState, useMemo } from "react";
import { ActivityCategory, Farm, FarmActivity, Language } from "../types";
import { getTranslation } from "../i18n";
import { GpsCoordinatePicker } from "./GpsCoordinatePicker";
import { FarmActivityGpsMap, resolveActivityCoords, resolveFarmCoords } from "./FarmActivityGpsMap";
import { AltitudeWeatherTaskSuggester } from "./AltitudeWeatherTaskSuggester";
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Filter,
  User,
  AlertCircle,
  CloudRain,
  Sprout,
  ShieldCheck,
  Droplets,
  Thermometer,
  Layers,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Check,
  Info,
  Calendar,
  Compass,
  ChevronRight,
  MapPin,
  HardDriveDownload,
} from "lucide-react";

interface ActivitiesViewProps {
  activities: FarmActivity[];
  farms: Farm[];
  language: Language;
  onAddActivity: (activity: Omit<FarmActivity, "id">) => void;
  onUpdateStatus: (id: string, status: "pending" | "in_progress" | "completed") => void;
  onDeleteActivity: (id: string) => void;
  initialFarmId?: string;
  initialSubTab?: "readiness" | "calendar" | "all_activities" | "gps_map";
  onOpenOfflineBackup?: () => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  activities,
  farms,
  language,
  onAddActivity,
  onUpdateStatus,
  onDeleteActivity,
  initialFarmId,
  initialSubTab,
  onOpenOfflineBackup,
}) => {
  const t = getTranslation(language);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    initialFarmId || farms[0]?.id || "farm-1"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "readiness" | "calendar" | "all_activities" | "gps_map"
  >(initialSubTab || "readiness");

  // Simulated live rainfall trigger toggle (to test Meteo Rwanda 25mm threshold)
  const [simulatedRainfallMm, setSimulatedRainfallMm] = useState<number>(34);
  const [simulatedMoisturePct, setSimulatedMoisturePct] = useState<number>(78);

  // Form state for adding an activity
  const [farmId, setFarmId] = useState(farms[0]?.id || "");
  const [crop, setCrop] = useState("Ibirayi (Kinigi)");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("land_prep");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [latitudeInput, setLatitudeInput] = useState(
    farms[0]?.latitude ? String(farms[0].latitude) : "-1.4824"
  );
  const [longitudeInput, setLongitudeInput] = useState(
    farms[0]?.longitude ? String(farms[0].longitude) : "29.5892"
  );
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | undefined>(3.6);
  const [gpsCapturedAt, setGpsCapturedAt] = useState<string | undefined>(undefined);

  const currentFarm = useMemo(() => {
    return farms.find((f) => f.id === selectedFarmId) || farms[0];
  }, [farms, selectedFarmId]);

  // Farm-specific activities
  const farmActivities = useMemo(() => {
    return activities.filter((a) => a.farmId === selectedFarmId);
  }, [activities, selectedFarmId]);

  // 5-Gate Planting Readiness Calculation for Selected Farm
  const readinessAudit = useMemo(() => {
    // Gate 1: Land Prep & Terraces
    const hasLandPrep = farmActivities.some(
      (a) => a.category === "land_prep" && a.status === "completed"
    );

    // Gate 2: Soil Liming / pH check (Ishwagara)
    const hasLiming = farmActivities.some(
      (a) =>
        (a.title.toLowerCase().includes("liming") ||
          a.title.toLowerCase().includes("ishwagara") ||
          a.notes?.toLowerCase().includes("ishwagara")) &&
        a.status === "completed"
    );

    // Gate 3: Organic Farmyard Manure (Imborera)
    const hasManure = farmActivities.some(
      (a) =>
        (a.category === "fertilizing" ||
          a.title.toLowerCase().includes("manure") ||
          a.title.toLowerCase().includes("imborera")) &&
        a.status === "completed"
    );

    // Gate 4: Certified Seeds & Fertilizer (Imbuto & NPK)
    const hasSeeds = farmActivities.some(
      (a) =>
        (a.title.toLowerCase().includes("seed") ||
          a.title.toLowerCase().includes("imbuto") ||
          a.title.toLowerCase().includes("nkunganire")) &&
        (a.status === "completed" || a.status === "in_progress")
    );

    // Gate 5: Meteo Rwanda Rainfall Trigger (≥ 25mm rain onset)
    const isRainfallOptimal = simulatedRainfallMm >= 25 && simulatedMoisturePct >= 60;

    const gates = [
      {
        id: "gate-1",
        number: 1,
        titleRw: "Gutunganya Ubutaka & Kurwanya Isuri (Land Prep & Terraces)",
        titleEn: "Land Preparation & Anti-Erosion Terraces",
        descRw: "Gusana amaterasi, guhinga ubwa mbere (cm 30) no guharura ubutaka.",
        descEn: "Terrace repair, deep ploughing (30cm), and clod breaking.",
        status: hasLandPrep ? ("completed" as const) : ("pending" as const),
        rabCode: "RAB-SOP-TERRACE-2024",
      },
      {
        id: "gate-2",
        number: 2,
        titleRw: "Gukosora Uburure bw'Ubutaka (Ishwagara / Agricultural Lime)",
        titleEn: "Soil Acidity Correction (Agricultural Lime)",
        descRw: "Gushyiramo ishwagara (toni 2-3/ha) iminsi 30 mbere yo gutera niba pH < 5.5.",
        descEn: "Agricultural lime application 30 days prior if soil pH is acidic (<5.5).",
        status: hasLiming ? ("completed" as const) : ("pending" as const),
        rabCode: "RAB-SOIL-PH-REGULATION",
      },
      {
        id: "gate-3",
        number: 3,
        titleRw: "Ifumbire y'Imborera Iboze Neza (Organic Farmyard Manure)",
        titleEn: "Decomposed Organic Farmyard Manure (10-20 T/ha)",
        descRw: "Gushyiramo toni 10-20/ha z'ifumbire iboze neza iminsi 14 mbere yo gutera ngo idatwika imbuto.",
        descEn: "Well-cured compost incorporated 14 days prior to prevent fermentation heat burning seed sprouts.",
        status: hasManure ? ("completed" as const) : ("pending" as const),
        rabCode: "RAB-ORGANIC-BASE-2024",
      },
      {
        id: "gate-4",
        number: 4,
        titleRw: "Imbuto y'Indobanure & Nkunganire (Certified Seed & DAP/NPK)",
        titleEn: "Certified Sprouted Seeds & Subsidized Basal Fertilizer",
        descRw: "Imbuto yemejwe na RAB yameze imishito 3-5 y'icyatsi + ifumbire ya DAP/NPK ku murima.",
        descEn: "Chitted disease-free certified seeds (3-5 green sprouts) & basal NPK/DAP at farm site.",
        status: hasSeeds ? ("completed" as const) : ("pending" as const),
        rabCode: "MINAGRI-SMART-NKUNGANIRE",
      },
      {
        id: "gate-5",
        number: 5,
        titleRw: "Imvura Ifatika ya Meteo Rwanda (Cumulative Rainfall ≥ 25mm)",
        titleEn: "Meteo Rwanda Rainfall Onset (≥ 25mm in 2-3 Consecutive Days)",
        descRw: "Ubuhehere bugomba kugera kuri cm 15-20 z'ubujyakuzimu. Ntugatere mu butaka bwumye.",
        descEn: "Soil moisture must reach 15-20cm depth. Sowing into dry dust causes seed desiccation.",
        status: isRainfallOptimal ? ("completed" as const) : ("pending" as const),
        rabCode: "METEO-RW-ONSET-TRIGGER",
      },
    ];

    const completedCount = gates.filter((g) => g.status === "completed").length;
    const scorePct = Math.round((completedCount / 5) * 100);

    let verdict: "ready" | "almost" | "not_ready" = "not_ready";
    if (scorePct >= 80) verdict = "ready";
    else if (scorePct >= 50) verdict = "almost";

    return {
      gates,
      completedCount,
      totalGates: 5,
      scorePct,
      verdict,
      isRainfallOptimal,
    };
  }, [farmActivities, simulatedRainfallMm, simulatedMoisturePct]);

  // Handle auto-generating standard RAB chronological schedule
  const handleAutoScheduleRAB = () => {
    if (!currentFarm) return;
    const today = new Date();
    const formatDate = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split("T")[0];
    };

    const templateActivities: Array<Omit<FarmActivity, "id">> = [
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "Soil pH Liming (Gushyiramo Ishwagara)",
        category: "land_prep",
        dueDate: formatDate(-14),
        status: "completed",
        notes: "Gushyiramo ishwagara yo kugabanya uburure bw'ubutaka.",
      },
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "Well-decomposed Manure Application (Ifumbire y'Imborera)",
        category: "fertilizing",
        dueDate: formatDate(-7),
        status: "completed",
        notes: "Toni 15/ha z'ifumbire iboze neza mu mirongo.",
      },
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "Seed Inspection & Chitting Check (Kugenzura Imishito y'Imbuto)",
        category: "planting",
        dueDate: formatDate(-2),
        status: "completed",
        notes: "Gusuzuma ko imbuto ifite imishito 3-5 mikomeye.",
      },
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "Main Sowing / Planting (Gutera Imbuto mu Mirongo)",
        category: "planting",
        dueDate: formatDate(1),
        status: "in_progress",
        notes: "Gutera ku ntera ya cm 75x30 hashyirwamo NPK 17-17-17.",
      },
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "First Earthing-Up & Weeding (Kubagara no Gusasira bwa 1)",
        category: "weeding",
        dueDate: formatDate(21),
        status: "pending",
        notes: "Kurunda igitaka hejuru y'amashami.",
      },
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "Protective Late Blight Fungicide Spray (Mancozeb 80 WP)",
        category: "spraying",
        dueDate: formatDate(35),
        status: "pending",
        notes: "Kurinda urume mu gihe cy'imvura nini.",
      },
      {
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi (Kinigi)",
        title: "Top-dressing Fertilizer Application (Shyiramo Urea)",
        category: "fertilizing",
        dueDate: formatDate(45),
        status: "pending",
        notes: "Kugaburira ikirayi kikiri guto.",
      },
    ];

    templateActivities.forEach((act) => onAddActivity(act));
  };

  const handleToggleGateAction = (gateNumber: number) => {
    if (!currentFarm) return;
    if (gateNumber === 1) {
      onAddActivity({
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi",
        title: "Land Preparation & Terracing (Kurwanya Isuri)",
        category: "land_prep",
        dueDate: new Date().toISOString().split("T")[0],
        status: "completed",
        notes: "Amaterasi n'amadubu byatunganyijwe neza.",
      });
    } else if (gateNumber === 2) {
      onAddActivity({
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi",
        title: "Soil Liming (Ishwagara) Applied",
        category: "land_prep",
        dueDate: new Date().toISOString().split("T")[0],
        status: "completed",
        notes: "Ishwagara toni 2.5/ha yashyizwemo.",
      });
    } else if (gateNumber === 3) {
      onAddActivity({
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi",
        title: "Farmyard Manure (Ifumbire y'Imborera) Application",
        category: "fertilizing",
        dueDate: new Date().toISOString().split("T")[0],
        status: "completed",
        notes: "Toni 15 z'imborera ziboze zashyizwemo.",
      });
    } else if (gateNumber === 4) {
      onAddActivity({
        farmId: currentFarm.id,
        farmName: currentFarm.name,
        crop: currentFarm.mainCrops[0] || "Ibirayi",
        title: "Certified Seed & NPK Picked Up from Cooperative",
        category: "planting",
        dueDate: new Date().toISOString().split("T")[0],
        status: "completed",
        notes: "Imbuto y'indobanure igeze ku murima.",
      });
    } else if (gateNumber === 5) {
      // Toggle simulated rain
      setSimulatedRainfallMm(simulatedRainfallMm < 25 ? 32 : 12);
      setSimulatedMoisturePct(simulatedRainfallMm < 25 ? 80 : 35);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const farm = farms.find((f) => f.id === farmId) || farms[0];
    const parsedLat = parseFloat(latitudeInput);
    const parsedLng = parseFloat(longitudeInput);

    onAddActivity({
      farmId: farm ? farm.id : "farm-1",
      farmName: farm ? farm.name : "Umurima",
      crop,
      title: title.trim(),
      category,
      dueDate,
      status: "pending",
      assignedTo: assignedTo.trim() || undefined,
      notes: notes.trim() || undefined,
      latitude: !isNaN(parsedLat) ? parsedLat : undefined,
      longitude: !isNaN(parsedLng) ? parsedLng : undefined,
      gpsAccuracyMeters: !isNaN(parsedLat) && !isNaN(parsedLng) ? gpsAccuracyMeters || 3.8 : undefined,
      gpsCapturedAt: !isNaN(parsedLat) && !isNaN(parsedLng) ? gpsCapturedAt || new Date().toISOString() : undefined,
    });

    setTitle("");
    setNotes("");
    setAssignedTo("");
    setIsModalOpen(false);
  };

  const filtered = activities.filter((a) => {
    if (selectedFarmId && a.farmId !== selectedFarmId) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const categoryLabels: Record<ActivityCategory, string> = {
    land_prep: t.actLandPrep,
    planting: t.actPlanting,
    fertilizing: t.actFertilizing,
    weeding: t.actWeeding,
    spraying: t.actSpraying,
    irrigation: t.actIrrigation,
    harvesting: t.actHarvesting,
    post_harvest: t.actPostHarvest,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white border border-emerald-800/60 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 text-xs font-bold mb-3">
              <Sprout className="w-3.5 h-3.5 text-emerald-300" />
              <span>RWANDA AGRI SCHEDULING • SEASON A 2026 (UMUHINDO)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              {language === "rw"
                ? "Igenamigambi ry'Ihinga & Isuzuma ryo Gutera"
                : "Planting Readiness & Seasonal Activity Hub"}
            </h1>
            <p className="mt-2 text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              {language === "rw"
                ? "Genzura uko ibikorwa byo gutegura umurima bihagaze mbere yo gutera imbuto. Sisitemu isuzuma ubutaka, imborera, ishwagara n'itangiriro ry'imvura ya Meteo Rwanda (≥25mm) kugira ngo umenye igihe nyacyo cyo guhinga utangiza imbuto."
                : "Check prerequisites and activity status to determine exact planting timing. The system evaluates soil prep, compost, liming, and Meteo Rwanda rainfall onset triggers (≥25mm) to safeguard seeds."}
            </p>

            {/* Farm Switcher & District Tag */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-emerald-950/80 border border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs font-bold">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span className="text-stone-300">{language === "rw" ? "Hitamo Umurima:" : "Target Farm:"}</span>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="bg-transparent text-emerald-200 font-extrabold focus:outline-hidden cursor-pointer"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id} className="bg-stone-900 text-white">
                      {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-teal-900/60 border border-teal-700/40 text-teal-200 text-xs font-semibold flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-300" />
                <span>
                  {currentFarm?.district} • {currentFarm?.mainCrops.join(", ")}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-stone-950" />
              <span>{language === "rw" ? "Ongeraho Igikorwa Gishya" : "Add Farm Activity"}</span>
            </button>

            <button
              onClick={handleAutoScheduleRAB}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs border border-emerald-600/60 transition-colors shadow-sm"
              title="Kora ingengabihe yose y'iki gihembwe hakurikijwe amabwiriza ya RAB"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === "rw" ? "Kora Ingengabihe ya RAB" : "Auto-Generate RAB Schedule"}</span>
            </button>

            {onOpenOfflineBackup && (
              <button
                type="button"
                onClick={onOpenOfflineBackup}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 font-semibold text-xs border border-amber-500/40 transition-colors shadow-sm cursor-pointer"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === "rw"
                    ? "Bika Ububiko bwa JSON (Offline)"
                    : "Backup JSON (Offline)"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Automated Task Creation Suggestions for Altitude-Zone Rain & Heatwave Forecasts */}
      <AltitudeWeatherTaskSuggester
        farms={farms}
        activities={activities}
        language={language}
        selectedFarmIdFilter={selectedFarmId}
        onCreateActivity={onAddActivity}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("readiness")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "readiness"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>{language === "rw" ? "1. Isuzuma ryo Gutera (Readiness Score)" : "1. Planting Readiness Audit"}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-700 text-white">
            {readinessAudit.scorePct}%
          </span>
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "calendar"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{language === "rw" ? "2. Ingengabihe y'Umuhindo (RAB Calendar)" : "2. Season A Windows by District"}</span>
        </button>

        <button
          onClick={() => setActiveTab("all_activities")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "all_activities"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>{language === "rw" ? "3. Urutonde rw'Ibikorwa (Task List)" : "3. All Activities"}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold">
            {farmActivities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("gps_map")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "gps_map"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>{language === "rw" ? "4. Ikarita ya GPS (GPS Map)" : "4. Activity GPS Map"}</span>
        </button>
      </div>

      {/* TAB 1: PLANTING READINESS AUDIT (THE 5-GATE EVALUATION) */}
      {activeTab === "readiness" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Readiness Master Verdict Card */}
          <div
            className={`rounded-2xl p-6 sm:p-7 border transition-all shadow-sm ${
              readinessAudit.verdict === "ready"
                ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                : readinessAudit.verdict === "almost"
                ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                : "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    readinessAudit.verdict === "ready"
                      ? "bg-emerald-600 text-white"
                      : readinessAudit.verdict === "almost"
                      ? "bg-amber-500 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {readinessAudit.verdict === "ready" ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : readinessAudit.verdict === "almost" ? (
                    <Clock className="w-8 h-8" />
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        readinessAudit.verdict === "ready"
                          ? "bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200"
                          : readinessAudit.verdict === "almost"
                          ? "bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200"
                          : "bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200"
                      }`}
                    >
                      {readinessAudit.verdict === "ready"
                        ? language === "rw"
                          ? "IGIHE NI IKI: GUHINGA BYEMEWE!"
                          : "OPTIMAL PLANTING WINDOW IS OPEN!"
                        : readinessAudit.verdict === "almost"
                        ? language === "rw"
                          ? "URI HAFI: KOMEZA UTUNGANYE IMUTSI"
                          : "NEARLY READY: COMPLETE REMAINING GATES"
                        : language === "rw"
                        ? "TEGEREZA: NTUGATERE IMUTO UBU!"
                        : "DO NOT PLANT YET: PREREQUISITES PENDING"}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-1">
                    {language === "rw"
                      ? `${currentFarm?.name} — Ubwitegure: ${readinessAudit.scorePct}% (${readinessAudit.completedCount}/5 byarangiye)`
                      : `${currentFarm?.name} — Readiness Score: ${readinessAudit.scorePct}% (${readinessAudit.completedCount}/5 Gates Passed)`}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mt-1.5 leading-relaxed max-w-2xl">
                    {readinessAudit.verdict === "ready"
                      ? language === "rw"
                        ? "Ibikorwa by'ingenzi byo gutegura ubutaka, ishwagara, n'imborera byarangiye, kandi imvura ya Meteo Rwanda igeze ku gipimo fatizo (≥25mm). Ubuhehere bw'ubutaka burahagije; tangira gutera imbuto ako kanya."
                        : "All mandatory land preparation, liming, and compost gates are completed, and rainfall onset exceeds the 25mm threshold. Soil moisture is optimal for germination; begin planting."
                      : readinessAudit.verdict === "almost"
                      ? language === "rw"
                        ? "Wakoze ibikorwa byinshi byo gutegura umurima, ariko hari ibisabwa bitaruzura (urugero: kuzana imbuto mu koperative cyangwa gutegereza imvura ifatika y'Umuhindo). Ntugatere mu butaka budatunganijwe neza."
                        : "Most pre-planting steps are completed, but final requirements are pending (e.g. seed pick-up from cooperative or waiting for rainfall onset). Do not rush to plant in dry conditions."
                      : language === "rw"
                      ? "Ubutaka ntiburategurwa bihagije cyangwa ifumbire n'ishwagara ntibirashyirwamo. Gutera imbuto muri iki gihe bishobora gutera igihombo kuko imbuto ibora cyangwa ikuma."
                      : "Land preparation, liming, or manure application are incomplete. Sowing seed now risks seed rotting or failure to germinate."}
                  </p>
                </div>
              </div>

              {/* Visual Progress Bar & Score */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center min-w-[160px] text-center shrink-0">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  {language === "rw" ? "Ubwitegure bwose" : "Overall Readiness"}
                </span>
                <span
                  className={`text-3xl font-black mt-1 ${
                    readinessAudit.verdict === "ready"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : readinessAudit.verdict === "almost"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {readinessAudit.scorePct}%
                </span>
                <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      readinessAudit.verdict === "ready"
                        ? "bg-emerald-600"
                        : readinessAudit.verdict === "almost"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${readinessAudit.scorePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Meteo Rwanda Rainfall & Soil Moisture Live Sensor Bar */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-2">
                <CloudRain className="w-5 h-5 text-teal-600" />
                <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? `Iteganyagihe rya Meteo Rwanda (${currentFarm?.district})`
                    : `Meteo Rwanda Live Rainfall & Soil Moisture (${currentFarm?.district})`}
                </h4>
              </div>

              {/* Weather Simulator Button */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-stone-500">{language === "rw" ? "Igerageza:" : "Simulate:"}</span>
                <button
                  onClick={() => {
                    setSimulatedRainfallMm(simulatedRainfallMm < 25 ? 32 : 10);
                    setSimulatedMoisturePct(simulatedRainfallMm < 25 ? 80 : 38);
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 hover:bg-teal-100 transition-colors"
                >
                  {simulatedRainfallMm >= 25
                    ? language === "rw"
                      ? "Gerageza Igihe cy'Izuba (Dry Spell)"
                      : "Simulate Dry Spell"
                    : language === "rw"
                    ? "Gerageza Imvura Nini (Rainy Onset)"
                    : "Simulate Rain Onset"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>{language === "rw" ? "Imvura yaguye (Iminsi 3)" : "3-Day Cumulative Rain"}</span>
                  <CloudRain className="w-4 h-4 text-teal-500" />
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {simulatedRainfallMm} mm
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      simulatedRainfallMm >= 25 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {simulatedRainfallMm >= 25 ? "≥ 25mm (Yagezeho)" : "Munsi ya 25mm"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  {language === "rw"
                    ? "RAB isaba byibuze 25mm mu minsi 2-3 ngo imizi y'imbuto itazuma."
                    : "RAB standard mandates 25mm over 2-3 consecutive days to prevent desiccation."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>{language === "rw" ? "Ubuhehere bw'Ubutaka (Depth)" : "Soil Moisture (0-20cm)"}</span>
                  <Droplets className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {simulatedMoisturePct}%
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      simulatedMoisturePct >= 60 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {simulatedMoisturePct >= 60 ? "Ubuhehere Bwiza" : "Bukeneye Imvura"}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  {language === "rw"
                    ? "Ubujyakuzimu bw'amazi burenze cm 15; imbuto izamera nta nkomyi."
                    : "Soil moisture depth exceeds 15cm; ensures vigorous root emergence."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>{language === "rw" ? "Ubushyuhe & Akarere" : "Temperature & Agro-Zone"}</span>
                  <Thermometer className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                    19.2°C
                  </span>
                  <span className="text-xs font-bold text-emerald-600">Birunga Highland</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  {language === "rw"
                    ? "Ubushyuhe bwa Musanze bubereye ibirayi bya Kinigi & Victoria."
                    : "Optimal temperature range for high-altitude potato tuber bulking."}
                </p>
              </div>
            </div>
          </div>

          {/* The 5 Prerequisite Gate Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-stone-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>
                  {language === "rw"
                    ? "Inzira 5 z'Itegeko mbere yo Gutera (The 5 Mandatory Planting Gates)"
                    : "The 5 Mandatory Pre-Planting Readiness Gates"}
                </span>
              </h4>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw" ? "Kanda kuri buri nzira uhindure uko bihagaze" : "Click any gate to update status"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {readinessAudit.gates.map((gate) => (
                <div
                  key={gate.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    gate.status === "completed"
                      ? "bg-white dark:bg-stone-900 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                      : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          gate.status === "completed"
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                        }`}
                      >
                        {gate.status === "completed" ? <Check className="w-4 h-4" /> : gate.number}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                            {language === "rw" ? gate.titleRw : gate.titleEn}
                          </h5>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-normal">
                          {language === "rw" ? gate.descRw : gate.descEn}
                        </p>
                        <span className="inline-block mt-2 text-[10px] font-mono text-stone-400">
                          Code: {gate.rabCode}
                        </span>
                      </div>
                    </div>

                    {/* Status badge & Quick Action */}
                    <div className="shrink-0 flex flex-col items-end space-y-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          gate.status === "completed"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {gate.status === "completed"
                          ? language === "rw"
                            ? "Byarangiye"
                            : "Completed"
                          : language === "rw"
                          ? "Bitegerejwe"
                          : "Pending"}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleGateAction(gate.number)}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <span>
                          {gate.status === "completed"
                            ? language === "rw"
                              ? "Subiramo"
                              : "Review"
                            : language === "rw"
                            ? "Emeza ko byakozwe"
                            : "Mark Done"}
                        </span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SMS & USSD Feature Phone Integration Note */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start space-x-3">
            <PhoneCall className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">
                {language === "rw"
                  ? "Uburyo umuhinzi udafite smartphone abikurikirana (USSD *777# & SMS): "
                  : "How offline & feature phone farmers check planting readiness (*777# & SMS): "}
              </span>
              {language === "rw"
                ? "Abahinzi bashobora gukanda *777# bagahitamo '1. Igenamigambi ry'Ihinga' kugira ngo basuzume niba imvura y'umuhindo mu karere kabo igeze kuri 25mm. Koperative yohereza ubutumwa bwa SMS iyo igihe cyo gutera kigeze."
                : "Farmers can dial *777# and select '1. Planting Schedule' to query rainfall onset and cooperative seed dispatch status. Automated SMS broadcasts notify farmers when their district hits the 25mm threshold."}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISTRICT BY DISTRICT RWANDAN PLANTING CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xs">
            <h3 className="text-lg font-black text-stone-900 dark:text-white">
              {language === "rw"
                ? "Ingengabihe y'Igihembwe cya Season A (Umuhindo) mu Turere tw'u Rwanda"
                : "Official Rwanda Season A Planting Windows by Agro-Ecological Zone"}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {language === "rw"
                ? "Ibihe byemejwe na Minisiteri y'Ubuhinzi (MINAGRI) & RAB hakurikijwe imiterere y'akarere n'imvura."
                : "Official MINAGRI & RAB recommended planting onset periods tailored to regional soil and rainfall onset."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {/* Northern Volcanic Highlands */}
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    Amajyaruguru (Birunga)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                    Ubu birakora
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                  Musanze, Nyabihu, Rubavu
                </h4>
                <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Igihe cyo Gutera:</span> 15
                    Nzeri – 10 Ukwakira
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Ibihingwa:</span> Ibirayi
                    (Kinigi, Victoria), Ibishyimbo birandaranda, Amashu
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Inama ya RAB:</span> Banza
                    ushyiremo ishwagara n'imborera kuko ubutaka buba burura.
                  </p>
                </div>
              </div>

              {/* Eastern Plains */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
                    Uburasirazuba (Savanna)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    Biteganyijwe
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                  Nyagatare, Gatsibo, Kayonza, Bugesera
                </h4>
                <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Igihe cyo Gutera:</span> 25
                    Nzeri – 25 Ukwakira
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Ibihingwa:</span> Ibigori
                    (H628, Bazooka), Ibishyimbo bisanzwe, Soya
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Inama ya RAB:</span> Tegereza
                    imvura ifatika ya mbere (25mm) kuko izuba ryo mu Burasirazuba rishobora kwangiza imbuto.
                  </p>
                </div>
              </div>

              {/* Southern Plateau */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
                    Amajyepfo (Plateau)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                    Biteganyijwe
                  </span>
                </div>
                <h4 className="font-bold text-stone-900 dark:text-white text-sm">
                  Huye, Nyanza, Gisagara, Ruhango
                </h4>
                <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Igihe cyo Gutera:</span> 20
                    Nzeri – 20 Ukwakira
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Ibihingwa:</span> Ibishyimbo,
                    Ibigori, Imyumbati, Amasaka
                  </p>
                  <p>
                    <span className="font-semibold text-stone-900 dark:text-white">Inama ya RAB:</span> Huza
                    n'amatariki ya Nkunganire yo kugezwaho ifumbire ya DAP na NPK ku murenge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALL ACTIVITIES LIST */}
      {activeTab === "all_activities" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs font-bold shadow-2xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3.5 py-2 rounded-xl transition-all ${
                  statusFilter === "all"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {t.all} ({activities.length})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3.5 py-2 rounded-xl transition-all ${
                  statusFilter === "pending"
                    ? "bg-stone-800 text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {t.statusPending} ({activities.filter((a) => a.status === "pending").length})
              </button>
              <button
                onClick={() => setStatusFilter("in_progress")}
                className={`px-3.5 py-2 rounded-xl transition-all ${
                  statusFilter === "in_progress"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {t.statusInProgress} ({activities.filter((a) => a.status === "in_progress").length})
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-3.5 py-2 rounded-xl transition-all ${
                  statusFilter === "completed"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {t.statusCompleted} ({activities.filter((a) => a.status === "completed").length})
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addActivity}</span>
            </button>
          </div>

          {/* Activities List Cards */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-2xl p-12 text-center border border-dashed border-stone-300 dark:border-stone-700">
                <CalendarCheck className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <p className="text-stone-500 text-sm">
                  {language === "rw" ? "Nta gikorwa kigaragara muri iki cyiciro." : "No activities in this filter."}
                </p>
              </div>
            ) : (
              filtered.map((act) => (
                <div
                  key={act.id}
                  className={`bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    act.status === "completed"
                      ? "border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 opacity-80"
                      : act.status === "in_progress"
                      ? "border-amber-300 dark:border-amber-800 ring-1 ring-amber-200 dark:ring-amber-900/40"
                      : "border-stone-200 dark:border-stone-800 hover:border-emerald-500"
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    {/* Status Toggle Button */}
                    <button
                      onClick={() => {
                        const nextStatus =
                          act.status === "pending"
                            ? "in_progress"
                            : act.status === "in_progress"
                            ? "completed"
                            : "pending";
                        onUpdateStatus(act.id, nextStatus);
                      }}
                      title="Kanda uhindure uko bihagaze"
                      className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        act.status === "completed"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : act.status === "in_progress"
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-stone-300 hover:border-emerald-600 text-transparent"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-base font-bold ${
                            act.status === "completed"
                              ? "line-through text-stone-400 dark:text-stone-500"
                              : "text-stone-900 dark:text-white"
                          }`}
                        >
                          {act.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {categoryLabels[act.category] || act.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                          {act.farmName} ({act.crop})
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {t.dueDate}: {act.dueDate}
                          </span>
                        </span>
                        {act.assignedTo && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-1 text-stone-700 dark:text-stone-300 font-medium">
                              <User className="w-3.5 h-3.5 text-stone-400" />
                              <span>{act.assignedTo}</span>
                            </span>
                          </>
                        )}
                        {(() => {
                          const gps = resolveActivityCoords(act, farms);
                          return (
                            <>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => setActiveTab("gps_map")}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] hover:underline"
                                title={language === "rw" ? "Reba aho iki gikorwa giherereye ku ikarita ya GPS" : "View activity pin on GPS map"}
                              >
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span>
                                  {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)} (±{gps.accuracy}m)
                                </span>
                              </button>
                            </>
                          );
                        })()}
                      </div>

                      {act.notes && (
                        <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 italic bg-stone-50 dark:bg-stone-800 p-2 rounded-lg">
                          "{act.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                    <select
                      value={act.status}
                      onChange={(e) => onUpdateStatus(act.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-hidden ${
                        act.status === "completed"
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : act.status === "in_progress"
                          ? "bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          : "bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      <option value="pending">{t.statusPending}</option>
                      <option value="in_progress">{t.statusInProgress}</option>
                      <option value="completed">{t.statusCompleted}</option>
                    </select>

                    <button
                      onClick={() => onDeleteActivity(act.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GPS MAP VISUALIZATION */}
      {activeTab === "gps_map" && (
        <div className="animate-fadeIn">
          <FarmActivityGpsMap
            language={language}
            farms={farms}
            activities={activities}
            selectedFarmId={selectedFarmId}
            onSelectFarm={(id) => {
              if (id !== "all") setSelectedFarmId(id);
            }}
            onOpenAddActivity={() => setIsModalOpen(true)}
            onUpdateActivityStatus={onUpdateStatus}
          />
        </div>
      )}

      {/* Add Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">{t.addActivity}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Umurima (Farm)
                </label>
                <select
                  value={farmId}
                  onChange={(e) => {
                    const nextFarmId = e.target.value;
                    setFarmId(nextFarmId);
                    const targetFarm = farms.find((f) => f.id === nextFarmId);
                    if (targetFarm) {
                      const fCoords = resolveFarmCoords(targetFarm);
                      setLatitudeInput(String(fCoords.lat));
                      setLongitudeInput(String(fCoords.lng));
                      if (targetFarm.mainCrops[0]) {
                        setCrop(targetFarm.mainCrops[0]);
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Igihingwa (Crop)
                </label>
                <input
                  type="text"
                  required
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder="urugero: Ibirayi (Kinigi), Ibigori..."
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Izina ry'igikorwa (Activity Title)
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="urugero: Gushyiramo ishwagara, gutera ifumbire..."
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Icyiciro (Category)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  >
                    <option value="land_prep">{t.actLandPrep}</option>
                    <option value="planting">{t.actPlanting}</option>
                    <option value="fertilizing">{t.actFertilizing}</option>
                    <option value="weeding">{t.actWeeding}</option>
                    <option value="spraying">{t.actSpraying}</option>
                    <option value="irrigation">{t.actIrrigation}</option>
                    <option value="harvesting">{t.actHarvesting}</option>
                    <option value="post_harvest">{t.actPostHarvest}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Itariki (Due Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Ushinzwe igikorwa (Assigned To)
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="urugero: Jean Baptiste, Abakozi 5..."
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              {/* GPS Geolocation Capture & Interactive Map Pin Picker */}
              {(() => {
                const selectedModalFarm = farms.find((f) => f.id === farmId) || farms[0];
                const modalFarmCoords = selectedModalFarm
                  ? resolveFarmCoords(selectedModalFarm)
                  : { lat: -1.4824, lng: 29.5892 };
                return (
                  <GpsCoordinatePicker
                    language={language}
                    latitude={latitudeInput}
                    longitude={longitudeInput}
                    accuracyMeters={gpsAccuracyMeters}
                    districtContext={selectedModalFarm?.district || "Musanze"}
                    defaultCenter={{
                      lat: modalFarmCoords.lat,
                      lng: modalFarmCoords.lng,
                      altitude: selectedModalFarm?.altitudeMeters,
                    }}
                    onCoordinatesChange={(fix) => {
                      setLatitudeInput(String(fix.latitude));
                      setLongitudeInput(String(fix.longitude));
                      setGpsAccuracyMeters(fix.accuracyMeters);
                      setGpsCapturedAt(fix.capturedAt);
                    }}
                    onClear={() => {
                      setLatitudeInput("");
                      setLongitudeInput("");
                      setGpsAccuracyMeters(undefined);
                      setGpsCapturedAt(undefined);
                    }}
                  />
                );
              })()}

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Ibisobanuro (Notes)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ibisobanuro byisumbuyeho..."
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
