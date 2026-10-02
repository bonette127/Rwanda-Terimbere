import React, { useState, useMemo } from "react";
import {
  Farm,
  FarmPlan,
  Expense,
  FarmActivity,
  HarvestRecord,
  SaleRecord,
  Language,
  DailyAgronomyTip,
  CropDiagnosis,
  HarvestNotification,
  ScheduledActivityAlert,
  IrrigationDemandAlert,
  ParcelSoilSensorReading,
  CropVarietyIrrigationRule,
  FertilizerApplicationLog,
  User,
} from "../types";
import { initialFertilizerApplications } from "../data/mockData";
import { getTranslation } from "../i18n";
import {
  MapPin,
  TrendingUp,
  Receipt,
  CalendarCheck,
  Bot,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  CloudSun,
  Camera,
  Users,
  Building2,
  Compass,
  ArrowRight,
  Sprout,
  FileText,
  FileSpreadsheet,
  Bell,
  ShieldAlert,
  LayoutGrid,
  Calendar,
  FlaskConical,
} from "lucide-react";
import { NavTab } from "./Navigation";
import { DailyAdviceWidget } from "./DailyAdviceWidget";
import { HarvestAlertBanner } from "./HarvestAlertBanner";
import { HarvestReadinessScoringCard } from "./HarvestReadinessScoringCard";
import { ScheduledActivityAlertBanner } from "./ScheduledActivityAlertBanner";
import { IrrigationDemandAlertBanner } from "./IrrigationDemandAlertBanner";
import { PredictiveWaterUsageWidget } from "./PredictiveWaterUsageWidget";
import { AutomatedIrrigationThresholdPanel } from "./AutomatedIrrigationThresholdPanel";
import { SmartIrrigationScheduler } from "./SmartIrrigationScheduler";
import { FourteenDayAgronomyCalendarOverlay } from "./FourteenDayAgronomyCalendarOverlay";
import { AutomatedSoilNutrientModule } from "./AutomatedSoilNutrientModule";
import { SeasonalFertilizerSummaryWidget } from "./SeasonalFertilizerSummaryWidget";
import { FertilizerTaskSchedulerCard } from "./FertilizerTaskSchedulerCard";
import { AltitudeWeatherTaskSuggester } from "./AltitudeWeatherTaskSuggester";
import { SoilHealthParcelMap } from "./SoilHealthParcelMap";
import { WeatherForecastWidget } from "./WeatherForecastWidget";
import { PestOutbreakHeatmap } from "./PestOutbreakHeatmap";
import { GrowthCycleTimeline } from "./GrowthCycleTimeline";
import { evaluateActivityAlerts } from "../utils/activityAlerts";
import {
  DEFAULT_CROP_VARIETY_IRRIGATION_RULES,
  evaluateIrrigationDemandAlerts,
} from "../utils/irrigationDemand";
import {
  exportFarmPerformancePdf,
  exportProfitSummaryCsv,
} from "../utils/profitExport";

interface DashboardViewProps {
  farms: Farm[];
  plans: FarmPlan[];
  expenses: Expense[];
  activities: FarmActivity[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  dailyTips: DailyAgronomyTip[];
  diagnoses: CropDiagnosis[];
  onAcknowledgeTip: (id: string) => void;
  language: Language;
  onNavigate: (tab: NavTab) => void;
  onQuickAiPrompt: (promptText: string) => void;
  onCompleteActivity: (id: string) => void;
  harvestNotifications?: HarvestNotification[];
  onOpenNotifications?: () => void;
  scheduledActivityAlerts?: ScheduledActivityAlert[];
  onDismissActivityAlert?: (alertId: string) => void;
  irrigationDemandAlerts?: IrrigationDemandAlert[];
  onCreateWateringTask?: (activity: Omit<FarmActivity, "id">) => void;
  onMarkWateredNow?: (farmId: string, crop: string) => void;
  onDismissIrrigationAlert?: (alertId: string) => void;
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
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
  currentUser?: User | null;
  onOpenExportModal?: () => void;
  onShowToast?: (msg: string) => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  onUpdateProgress?: (
    planId: string,
    percentage: number,
    stageName: string,
    notes?: string
  ) => void;
  cropVarietyRules?: CropVarietyIrrigationRule[];
  onUpdateCropVarietyRules?: (rules: CropVarietyIrrigationRule[]) => void;
  fertilizerApplications?: FertilizerApplicationLog[];
  onAddFertilizerApplication?: (app: FertilizerApplicationLog) => void;
  onUpdateActivity?: (id: string, updates: Partial<FarmActivity>) => void;
  onDeleteActivity?: (id: string) => void;
  onNavigateToActivityLog?: (options?: {
    farmId?: string;
    category?: "fertilizing" | "irrigation";
    activityId?: string;
    dateStr?: string;
  }) => void;
  onOpenPlantingCalendarExport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  farms,
  plans,
  expenses,
  activities,
  harvests,
  sales,
  dailyTips,
  diagnoses,
  onAcknowledgeTip,
  language,
  onNavigate,
  onQuickAiPrompt,
  onCompleteActivity,
  harvestNotifications = [],
  onOpenNotifications = () => {},
  scheduledActivityAlerts,
  onDismissActivityAlert,
  irrigationDemandAlerts,
  onCreateWateringTask,
  onMarkWateredNow,
  onDismissIrrigationAlert,
  criticalHumidityThreshold,
  onChangeHumidityThreshold,
  onSimulateHumidityDrop,
  onResetHumiditySimulation,
  isHumiditySimulated,
  sensorReadingsByFarmId,
  onUpdateParcelSensorReading,
  onBatchUpdateSensorReadings,
  onCreateActivity,
  currentUser,
  onOpenExportModal,
  onShowToast,
  onUpdateProgress,
  cropVarietyRules,
  onUpdateCropVarietyRules,
  fertilizerApplications,
  onAddFertilizerApplication,
  onUpdateActivity,
  onDeleteActivity,
  onNavigateToActivityLog,
  onOpenPlantingCalendarExport,
}) => {
  const t = getTranslation(language);
  const [dashboardSection, setDashboardSection] = useState<
    "overview" | "weatherAlerts" | "plantHealth" | "soilNutrients"
  >("overview");
  const [isCalendarOverlayModalOpen, setIsCalendarOverlayModalOpen] =
    useState(false);
  const [localCropRules, setLocalCropRules] = useState<
    CropVarietyIrrigationRule[]
  >(DEFAULT_CROP_VARIETY_IRRIGATION_RULES);
  const effectiveCropRules = cropVarietyRules || localCropRules;
  const [localDismissedAlertIds, setLocalDismissedAlertIds] = useState<string[]>([]);
  const [localDismissedIrrigationIds, setLocalDismissedIrrigationIds] = useState<
    string[]
  >([]);
  const [localSensorReadings, setLocalSensorReadings] = useState<
    Record<string, ParcelSoilSensorReading>
  >({});

  const effectiveSensorReadings = sensorReadingsByFarmId || localSensorReadings;

  const handleUpdateParcelSensor = (
    farmId: string,
    reading: ParcelSoilSensorReading | null
  ) => {
    if (onUpdateParcelSensorReading) {
      onUpdateParcelSensorReading(farmId, reading);
    } else {
      setLocalSensorReadings((prev) => {
        const next = { ...prev };
        if (!reading) {
          delete next[farmId];
        } else {
          next[farmId] = reading;
        }
        return next;
      });
    }
  };

  const handleBatchUpdateSensors = (
    readings: Record<string, ParcelSoilSensorReading>
  ) => {
    if (onBatchUpdateSensorReadings) {
      onBatchUpdateSensorReadings(readings);
    } else {
      setLocalSensorReadings(readings);
    }
  };

  const computedAlerts = useMemo(() => {
    if (scheduledActivityAlerts) return scheduledActivityAlerts;
    return evaluateActivityAlerts(activities);
  }, [scheduledActivityAlerts, activities]);

  const effectiveActivityAlerts = computedAlerts.filter(
    (a) => !localDismissedAlertIds.includes(a.id)
  );

  const handleDismissActivityAlert = (alertId: string) => {
    setLocalDismissedAlertIds((prev) => [...prev, alertId]);
    onDismissActivityAlert?.(alertId);
  };

  const computedIrrigationAlerts = useMemo(() => {
    if (irrigationDemandAlerts) return irrigationDemandAlerts;
    return evaluateIrrigationDemandAlerts(
      farms,
      plans,
      activities,
      undefined,
      [],
      criticalHumidityThreshold,
      {},
      effectiveSensorReadings,
      effectiveCropRules
    );
  }, [
    irrigationDemandAlerts,
    farms,
    plans,
    activities,
    criticalHumidityThreshold,
    effectiveSensorReadings,
    effectiveCropRules,
  ]);

  const effectiveIrrigationAlerts = computedIrrigationAlerts.filter(
    (a) => !localDismissedIrrigationIds.includes(a.id)
  );

  const handleDismissIrrigationAlert = (alertId: string) => {
    setLocalDismissedIrrigationIds((prev) => [...prev, alertId]);
    onDismissIrrigationAlert?.(alertId);
  };

  // Core KPI Calculations
  const totalAreaHa = farms.reduce((acc, f) => acc + f.sizeHa, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const netProfitRealized = totalSalesRevenue - totalExpenses;
  const roi =
    totalExpenses > 0 ? Math.round((netProfitRealized / totalExpenses) * 100) : 0;

  const urgentActivities = activities
    .filter((a) => a.status !== "completed")
    .slice(0, 5);

  const totalActiveAlertCount =
    effectiveIrrigationAlerts.length +
    effectiveActivityAlerts.length +
    harvestNotifications.length;

  const primaryFarm = farms[0] || {
    name: "Ibirayi Farm (Kinigi)",
    district: "Musanze",
  };
  const farmerName = currentUser?.name || "Jean Baptiste Hakizimana";

  const handleQuickExportPdf = () => {
    exportFarmPerformancePdf({
      farmerName,
      farmName: primaryFarm.name,
      district: primaryFarm.district,
      language,
      expenses,
      harvests,
      sales,
      farms,
      plans,
      activities,
      currentUser,
    });
    onShowToast?.(
      language === "rw"
        ? "Raporo ya PDF y'umurima n'imari yabitswe neza!"
        : "Farm & financial PDF dossier downloaded!"
    );
  };

  const handleQuickExportCsv = () => {
    exportProfitSummaryCsv({
      farmerName,
      farmName: primaryFarm.name,
      district: primaryFarm.district,
      language,
      expenses,
      harvests,
      sales,
      farms,
      plans,
      activities,
      currentUser,
    });
    onShowToast?.(
      language === "rw"
        ? "Amakuru y'imari n'umusaruro yabitswe muri CSV (Excel)!"
        : "Financial & farm performance CSV exported!"
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Clean Brand Hero Command Banner */}
      <div className="bg-emerald-900 dark:bg-stone-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-emerald-800 dark:border-stone-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-semibold mb-2">
              <Sprout className="w-4 h-4" />
              <span>TERIMBERE · {t.currentSeasonBadge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              {t.overviewTitle}
            </h1>
            <p className="mt-1.5 text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              {t.overviewSubtitle}
            </p>
          </div>

          {/* Primary Actions + PDF & CSV Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleQuickExportPdf}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <FileText className="w-4 h-4" />
              <span>{language === "rw" ? "Raporo PDF (Banki)" : "Export PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleQuickExportCsv}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
              <span>{language === "rw" ? "Bika CSV (Excel)" : "Export CSV"}</span>
            </button>

            {onOpenPlantingCalendarExport && (
              <button
                type="button"
                onClick={onOpenPlantingCalendarExport}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm border border-emerald-700 transition-colors shadow-2xs"
                title={
                  language === "rw"
                    ? "Kohereza amatariki yo gutera n'isarura muri Kalendari (.ICS / Google)"
                    : "Export planting and harvest schedule to calendar (.ICS / Google)"
                }
              >
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>
                  {language === "rw" ? "Kalendari (.ICS)" : "Calendar (.ICS)"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate("aiAdvisor")}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm border border-emerald-700 transition-colors"
            >
              <Bot className="w-4 h-4 text-amber-300" />
              <span>{language === "rw" ? "Baza AI" : "AI Advisor"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Financial & Parcel KPI Cards (Tabular Numerals, Brand Palette) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate("farms")}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {t.activeFarmsCount}
            </span>
            <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums text-stone-900 dark:text-white">
            {farms.length}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-mono tabular-nums">
            {totalAreaHa.toFixed(1)} {t.hectares} {t.total}
          </p>
        </div>

        <div
          onClick={() => onNavigate("expenses")}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {t.totalInvestment}
            </span>
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums text-stone-900 dark:text-white">
            {totalExpenses.toLocaleString()}{" "}
            <span className="text-xs font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {expenses.length} {language === "rw" ? "inyemezabwishyu" : "records"}
          </p>
        </div>

        <div
          onClick={() => onNavigate("harvestSales")}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {t.actualSales}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums text-stone-900 dark:text-white">
            {totalSalesRevenue.toLocaleString()}{" "}
            <span className="text-xs font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            {sales.length} {language === "rw" ? "ibyagurishijwe" : "sales logged"}
          </p>
        </div>

        <div
          onClick={() => onNavigate("profit")}
          className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {t.netProfit}
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {netProfitRealized >= 0 ? "+" : ""}
            {netProfitRealized.toLocaleString()}{" "}
            <span className="text-xs font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono tabular-nums">
            ROI: {roi}% · {language === "rw" ? "Kuramo Raporo →" : "Export Report →"}
          </p>
        </div>
      </div>

      {/* 3. Clean Dashboard Section Switcher (Eliminates Vertical Clutter) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 p-2 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setDashboardSection("overview")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
              dashboardSection === "overview"
                ? "bg-emerald-800 text-white"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>
              {language === "rw"
                ? "Incamake & Imirimo"
                : "Operations & Crop Progress"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardSection("weatherAlerts")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
              dashboardSection === "weatherAlerts"
                ? "bg-emerald-800 text-white"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>
              {language === "rw"
                ? "Ikirere & Impuruza"
                : "Weather & Field Alerts"}
            </span>
            {totalActiveAlertCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-amber-500 text-stone-950 font-black">
                {totalActiveAlertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDashboardSection("plantHealth")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
              dashboardSection === "plantHealth"
                ? "bg-emerald-800 text-white"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>
              {language === "rw"
                ? "Ubuzima bw'Ibihingwa"
                : "Pest Radar & Advisories"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardSection("soilNutrients")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
              dashboardSection === "soilNutrients"
                ? "bg-emerald-800 text-white"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>
              {language === "rw"
                ? "Ifumbire & NPK Yikora"
                : "Automated NPK & Nutrients"}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCalendarOverlayModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-2xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {language === "rw"
                ? "Ingengabihe y'Iminsi 14 (Ifumbire & Kuhira)"
                : "14-Day Fertilizer & Irrigation Calendar"}
            </span>
          </button>

          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              {language === "rw"
                ? "Fungura Dosiye ya Banki / Koperative →"
                : "Open Bank & Cooperative Dossier →"}
            </button>
          )}
        </div>
      </div>

      {/* SECTION A: OVERVIEW, TASKS & GROWTH */}
      {dashboardSection === "overview" && (
        <div className="space-y-6">
          {/* 2-Day Advance Fertilizer & Field Activity Alerts Banner */}
          {effectiveActivityAlerts.length > 0 && (
            <ScheduledActivityAlertBanner
              alerts={effectiveActivityAlerts}
              language={language}
              onCompleteActivity={onCompleteActivity}
              onDismissAlert={handleDismissActivityAlert}
              onNavigateToActivities={() => onNavigate("activities")}
              onOpenFertilizerScheduler={() =>
                setDashboardSection("soilNutrients")
              }
            />
          )}

          {/* Future Fertilizer Application Task Scheduler & 2-Day Advance Alert Center */}
          <FertilizerTaskSchedulerCard
            activities={activities}
            farms={farms}
            plans={plans}
            language={language}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onUpdateActivity={onUpdateActivity}
            onCompleteActivity={onCompleteActivity}
            onDeleteActivity={onDeleteActivity}
            onAddFertilizerApplication={onAddFertilizerApplication}
            onNavigateToActivities={() => onNavigate("activities")}
            defaultOpenForm={true}
          />

          {/* Altitude-Zone Rain & Heatwave Automated Task Creation Suggestions */}
          <AltitudeWeatherTaskSuggester
            farms={farms}
            activities={activities}
            language={language}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onNavigateToActivities={() => onNavigate("activities")}
          />

          {/* Real-Time Irrigation Demand & Low-Humidity Climate Alerts Banner */}
          {effectiveIrrigationAlerts.length > 0 && (
            <IrrigationDemandAlertBanner
              alerts={effectiveIrrigationAlerts}
              language={language}
              onCreateWateringTask={onCreateWateringTask || (() => {})}
              onMarkWateredNow={onMarkWateredNow || (() => {})}
              onDismissAlert={handleDismissIrrigationAlert}
              onNavigateToActivities={() => onNavigate("activities")}
              criticalHumidityThreshold={criticalHumidityThreshold}
              onChangeHumidityThreshold={onChangeHumidityThreshold}
              onSimulateHumidityDrop={onSimulateHumidityDrop}
              onResetHumiditySimulation={onResetHumiditySimulation}
              isHumiditySimulated={isHumiditySimulated}
              sensorReadingsByFarmId={effectiveSensorReadings}
              onUpdateParcelSensorReading={handleUpdateParcelSensor}
              onBatchUpdateSensorReadings={handleBatchUpdateSensors}
            />
          )}

          {/* Smart Scheduling: Automated Optimal Irrigation Windows (Fused Soil Health + 7-Day Forecast) */}
          <SmartIrrigationScheduler
            farms={farms}
            plans={plans}
            activities={activities}
            sensorReadingsByFarmId={effectiveSensorReadings}
            cropVarietyRules={effectiveCropRules}
            language={language}
            onCreateWateringTask={onCreateWateringTask || onCreateActivity}
            onNavigateToActivities={() => onNavigate("activities")}
            onShowToast={onShowToast}
          />

          {/* Automated Irrigation Threshold by Crop Variety (with Background Push Monitor) */}
          <AutomatedIrrigationThresholdPanel
            rules={effectiveCropRules}
            onUpdateRules={onUpdateCropVarietyRules || setLocalCropRules}
            alerts={effectiveIrrigationAlerts}
            farms={farms}
            language={language}
            onSimulateCropMoistureBreach={(farmId, reading) =>
              handleUpdateParcelSensor(farmId, reading)
            }
            onCreateWateringTask={onCreateWateringTask || onCreateActivity}
            onMarkWateredNow={onMarkWateredNow}
          />

          {/* 3-Day Predictive Water Usage & Soil Moisture Depletion Forecast Widget */}
          {effectiveIrrigationAlerts.length > 0 && (
            <PredictiveWaterUsageWidget
              alerts={effectiveIrrigationAlerts}
              farms={farms}
              language={language}
              onSchedulePredictiveWatering={
                onCreateWateringTask || onCreateActivity
              }
              onNavigateToActivities={() => onNavigate("activities")}
            />
          )}

          {/* Precision Parcel Soil Health & Moisture SVG Spatial Map Overlay */}
          <SoilHealthParcelMap
            farms={farms}
            plans={plans}
            sensorReadingsByFarmId={effectiveSensorReadings}
            fertilizerApplications={
              fertilizerApplications || initialFertilizerApplications
            }
            language={language}
            onUpdateParcelSensorReading={handleUpdateParcelSensor}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onAddFertilizerApplication={onAddFertilizerApplication}
          />

          {/* Automated Soil Nutrient Management (Optimal NPK from Historical Yield & Growth Stage %) */}
          <AutomatedSoilNutrientModule
            plans={plans}
            farms={farms}
            harvests={harvests}
            sensorReadingsByFarmId={effectiveSensorReadings}
            language={language}
            onScheduleFertilizerTask={onCreateWateringTask || onCreateActivity}
            onUpdatePlanGrowthStage={onUpdateProgress}
            onNavigateToActivityLog={(opts) => {
              if (onNavigateToActivityLog) {
                onNavigateToActivityLog(opts);
              } else {
                onNavigate("activities");
              }
            }}
          />

          {/* Current Season Granular Fertilizer Applications Summary */}
          <SeasonalFertilizerSummaryWidget
            applications={
              fertilizerApplications || initialFertilizerApplications
            }
            farms={farms}
            language={language}
            onAddApplication={onAddFertilizerApplication}
            onNavigateToOperations={() => onNavigate("operations")}
          />

          {/* 14-Day Interactive Fertilizer & Irrigation Calendar Overlay */}
          <FourteenDayAgronomyCalendarOverlay
            plans={plans}
            farms={farms}
            activities={activities}
            irrigationAlerts={effectiveIrrigationAlerts}
            language={language}
            onNavigateToActivityLog={(opts) => {
              if (onNavigateToActivityLog) {
                onNavigateToActivityLog(opts);
              } else {
                onNavigate("activities");
              }
            }}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onCompleteActivity={onCompleteActivity}
            isModalOpenExternal={isCalendarOverlayModalOpen}
            onCloseModalExternal={() => setIsCalendarOverlayModalOpen(false)}
          />

          {/* Regional Pest & Disease Outbreak Risk Zone Map (driven by historical `diagnoses` patterns) */}
          <PestOutbreakHeatmap
            language={language}
            diagnoses={diagnoses}
            farms={farms}
            onNavigateToCropDoctor={() => onNavigate("cropDoctor")}
            onNavigateToActivities={() => onNavigate("activities")}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
          />

          {/* Quick Module Gateway Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => onNavigate("farms")}
              className="text-left p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 shadow-2xs transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-3 group-hover:text-emerald-700">
                {language === "rw" ? "Ikarita y'Imirima (GPS)" : "Interactive Farm Map"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? "Reba imbibi z'imirima yawe na GPS ku ikarita."
                  : "Visualize stored parcel GPS coordinates and boundaries."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("cooperative")}
              className="text-left p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 shadow-2xs transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-3 group-hover:text-emerald-700">
                {language === "rw" ? "Koperative & Ikipe" : "Cooperative Hub"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? "Isaha y'imirimo (Heatmap), abakozi n'ifumbire ya Nkunganire."
                  : "Team peak activity heatmap, labor velocity & bulk inputs."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("cropDoctor")}
              className="text-left p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 shadow-2xs transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-3 group-hover:text-emerald-700">
                {language === "rw" ? "Muganga w'Ibihingwa" : "Crop Doctor AI"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? "Suzuma indwara z'ibihingwa ubone umuti wemewe na RAB."
                  : "Diagnose plant diseases and get RAB chemical dosages."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("operations")}
              className="text-left p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 shadow-2xs transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-3 group-hover:text-emerald-700">
                {language === "rw" ? "Abakozi & Imodoka" : "Labor & Transport"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? "Andika imibyizi y'abakozi n'ingendo z'umusaruro."
                  : "Record casual worker wages and harvest logistics."}
              </p>
            </button>
          </div>

          {/* Harvest Readiness Scoring (0-100% from Growth Stage, Days Since Planting & Local Weather Sensor Precipitation) */}
          <HarvestReadinessScoringCard
            plans={plans}
            farms={farms}
            sensorReadingsByFarmId={effectiveSensorReadings}
            language={language}
            onScheduleHarvestTask={onCreateWateringTask || onCreateActivity}
            onUpdatePlanGrowthStage={onUpdateProgress}
            onNavigateToHarvests={() => onNavigate("harvestSales")}
            onNavigateToActivities={() => onNavigate("activities")}
          />

          {/* Visual Growth Cycle Timeline Widget */}
          <GrowthCycleTimeline
            plans={plans}
            language={language}
            onSelectPlan={() => onNavigate("plans")}
            onUpdateProgress={onUpdateProgress}
          />

          {/* Urgent Tasks + Market & Weather Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    {t.urgentTasks}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("activities")}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {t.all} ({activities.length}) →
                </button>
              </div>

              {urgentActivities.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-sm">
                  {language === "rw"
                    ? "Imirimo yose yarangiye neza!"
                    : "All scheduled field tasks are complete!"}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {urgentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40"
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          type="button"
                          onClick={() => onCompleteActivity(act.id)}
                          className="mt-0.5 w-5 h-5 rounded-md border border-stone-300 dark:border-stone-600 hover:border-emerald-600 flex items-center justify-center transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 opacity-40 hover:opacity-100" />
                        </button>
                        <div>
                          <h4 className="text-sm font-semibold text-stone-900 dark:text-white">
                            {act.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500 dark:text-stone-400">
                            <span className="font-medium text-emerald-800 dark:text-emerald-400">
                              {act.farmName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{act.dueDate}</span>
                            </span>
                            {act.assignedTo && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{act.assignedTo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {act.status === "in_progress"
                          ? t.statusInProgress
                          : t.statusPending}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weather & Market Prices Card */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CloudSun className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {t.weatherTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate("marketWeather")}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {t.all} →
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        {primaryFarm.district}
                      </span>
                      <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-0.5">
                        19°C
                      </div>
                    </div>
                    <div className="text-right text-xs text-stone-600 dark:text-stone-300 font-mono tabular-nums">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300">
                        14mm Rain
                      </div>
                      <div>Humidity: 82%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                    {language === "rw"
                      ? "Ibiciro ku Masoko Uyu Munsi"
                      : "Wholesale Market Prices"}
                  </h3>
                  <span className="text-[11px] text-stone-400">RWF / Kg</span>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { name: "Ibirayi (Kinigi) - Kigali", price: "340 RWF/kg" },
                    { name: "Ibigori byumye - Nyabugogo", price: "420 RWF/kg" },
                    { name: "Ibishyimbo (MAC 44) - Huye", price: "920 RWF/kg" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800"
                    >
                      <span className="font-medium text-stone-700 dark:text-stone-200">
                        {item.name}
                      </span>
                      <span className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: WEATHER & FIELD ALERTS */}
      {dashboardSection === "weatherAlerts" && (
        <div className="space-y-6">
          <AutomatedIrrigationThresholdPanel
            rules={effectiveCropRules}
            onUpdateRules={onUpdateCropVarietyRules || setLocalCropRules}
            alerts={effectiveIrrigationAlerts}
            farms={farms}
            language={language}
            onSimulateCropMoistureBreach={(farmId, reading) =>
              handleUpdateParcelSensor(farmId, reading)
            }
            onCreateWateringTask={onCreateWateringTask || onCreateActivity}
            onMarkWateredNow={onMarkWateredNow}
          />

          <WeatherForecastWidget
            language={language}
            defaultDistrict={farms[0]?.district || "Musanze"}
            onNavigateToActivities={() => onNavigate("activities")}
            onCreateActivity={onCreateActivity}
          />

          {/* Altitude-Zone Rain & Heatwave Automated Task Creation Suggestions */}
          <AltitudeWeatherTaskSuggester
            farms={farms}
            activities={activities}
            language={language}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onNavigateToActivities={() => onNavigate("activities")}
          />

          {effectiveIrrigationAlerts.length > 0 && (
            <IrrigationDemandAlertBanner
              alerts={effectiveIrrigationAlerts}
              language={language}
              onCreateWateringTask={onCreateWateringTask || (() => {})}
              onMarkWateredNow={onMarkWateredNow || (() => {})}
              onDismissAlert={handleDismissIrrigationAlert}
              onNavigateToActivities={() => onNavigate("activities")}
              criticalHumidityThreshold={criticalHumidityThreshold}
              onChangeHumidityThreshold={onChangeHumidityThreshold}
              onSimulateHumidityDrop={onSimulateHumidityDrop}
              onResetHumiditySimulation={onResetHumiditySimulation}
              isHumiditySimulated={isHumiditySimulated}
              sensorReadingsByFarmId={effectiveSensorReadings}
              onUpdateParcelSensorReading={handleUpdateParcelSensor}
              onBatchUpdateSensorReadings={handleBatchUpdateSensors}
            />
          )}

          {effectiveIrrigationAlerts.length > 0 && (
            <PredictiveWaterUsageWidget
              alerts={effectiveIrrigationAlerts}
              farms={farms}
              language={language}
              onSchedulePredictiveWatering={
                onCreateWateringTask || onCreateActivity
              }
              onNavigateToActivities={() => onNavigate("activities")}
            />
          )}

          {effectiveActivityAlerts.length > 0 && (
            <ScheduledActivityAlertBanner
              alerts={effectiveActivityAlerts}
              language={language}
              onCompleteActivity={onCompleteActivity}
              onDismissAlert={handleDismissActivityAlert}
              onNavigateToActivities={() => onNavigate("activities")}
              onOpenFertilizerScheduler={() =>
                setDashboardSection("soilNutrients")
              }
            />
          )}

          <FertilizerTaskSchedulerCard
            activities={activities}
            farms={farms}
            plans={plans}
            language={language}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onUpdateActivity={onUpdateActivity}
            onCompleteActivity={onCompleteActivity}
            onDeleteActivity={onDeleteActivity}
            onAddFertilizerApplication={onAddFertilizerApplication}
            onNavigateToActivities={() => onNavigate("activities")}
            defaultOpenForm={false}
          />

          {harvestNotifications.length > 0 && (
            <HarvestAlertBanner
              notifications={harvestNotifications}
              language={language}
              onOpenNotifications={onOpenNotifications}
              onNavigate={onNavigate}
            />
          )}

          <HarvestReadinessScoringCard
            plans={plans}
            farms={farms}
            sensorReadingsByFarmId={effectiveSensorReadings}
            language={language}
            onScheduleHarvestTask={onCreateWateringTask || onCreateActivity}
            onUpdatePlanGrowthStage={onUpdateProgress}
            onNavigateToHarvests={() => onNavigate("harvestSales")}
            onNavigateToActivities={() => onNavigate("activities")}
          />
        </div>
      )}

      {/* SECTION C: PLANT HEALTH & DAILY ADVISORIES */}
      {dashboardSection === "plantHealth" && (
        <div className="space-y-6">
          <DailyAdviceWidget
            language={language}
            tips={dailyTips}
            onAcknowledgeTip={onAcknowledgeTip}
          />

          <PestOutbreakHeatmap
            language={language}
            diagnoses={diagnoses}
            farms={farms}
            onNavigateToCropDoctor={() => onNavigate("cropDoctor")}
            onNavigateToActivities={() => onNavigate("activities")}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
          />
        </div>
      )}

      {/* SECTION D: AUTOMATED SOIL NUTRIENT MANAGEMENT (NPK OPTIMIZER) */}
      {dashboardSection === "soilNutrients" && (
        <div className="space-y-6">
          <SoilHealthParcelMap
            farms={farms}
            plans={plans}
            sensorReadingsByFarmId={effectiveSensorReadings}
            fertilizerApplications={
              fertilizerApplications || initialFertilizerApplications
            }
            language={language}
            onUpdateParcelSensorReading={handleUpdateParcelSensor}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onAddFertilizerApplication={onAddFertilizerApplication}
          />

          <FertilizerTaskSchedulerCard
            activities={activities}
            farms={farms}
            plans={plans}
            language={language}
            onCreateActivity={onCreateWateringTask || onCreateActivity}
            onUpdateActivity={onUpdateActivity}
            onCompleteActivity={onCompleteActivity}
            onDeleteActivity={onDeleteActivity}
            onAddFertilizerApplication={onAddFertilizerApplication}
            onNavigateToActivities={() => onNavigate("activities")}
            defaultOpenForm={true}
          />

          <SeasonalFertilizerSummaryWidget
            applications={
              fertilizerApplications || initialFertilizerApplications
            }
            farms={farms}
            language={language}
            onAddApplication={onAddFertilizerApplication}
            onNavigateToOperations={() => onNavigate("operations")}
          />

          <AutomatedSoilNutrientModule
            plans={plans}
            farms={farms}
            harvests={harvests}
            sensorReadingsByFarmId={effectiveSensorReadings}
            language={language}
            onScheduleFertilizerTask={onCreateWateringTask || onCreateActivity}
            onUpdatePlanGrowthStage={onUpdateProgress}
            onNavigateToActivityLog={(opts) => {
              if (onNavigateToActivityLog) {
                onNavigateToActivityLog(opts);
              } else {
                onNavigate("activities");
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
