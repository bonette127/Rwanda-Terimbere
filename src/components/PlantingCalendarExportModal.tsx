import React, { useState, useMemo } from "react";
import { Farm, FarmPlan, HarvestRecord, FarmActivity, Language } from "../types";
import {
  extractCalendarEvents,
  generateIcsCalendar,
  downloadIcsFile,
  CalendarExportOptions,
  generateSamplePlantingPlans,
  CalendarEventItem,
} from "../utils/plantingCalendarExport";
import {
  Calendar,
  Download,
  Share2,
  ExternalLink,
  Check,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Layers,
  Sprout,
  Filter,
  Copy,
  ChevronRight,
  HelpCircle,
  X,
  Smartphone,
  Laptop,
  Flame,
  FileText,
} from "lucide-react";

interface PlantingCalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: FarmPlan[];
  harvests: HarvestRecord[];
  activities?: FarmActivity[];
  farms: Farm[];
  language: Language;
  onAddSamplePlans?: (samplePlans: FarmPlan[]) => void;
  onShowToast?: (msg: string) => void;
}

export const PlantingCalendarExportModal: React.FC<PlantingCalendarExportModalProps> = ({
  isOpen,
  onClose,
  plans,
  harvests,
  activities = [],
  farms,
  language,
  onAddSamplePlans,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<"events" | "guide" | "preview_ics">("events");
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [includePlantingDates, setIncludePlantingDates] = useState<boolean>(true);
  const [includeHarvestDates, setIncludeHarvestDates] = useState<boolean>(true);
  const [includeGrowthMilestones, setIncludeGrowthMilestones] = useState<boolean>(true);
  const [includeActualHarvestBatches, setIncludeActualHarvestBatches] = useState<boolean>(true);
  const [includeScheduledActivities, setIncludeScheduledActivities] = useState<boolean>(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(1);
  const [copiedIcs, setCopiedIcs] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Available seasons from plans
  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    plans.forEach((p) => {
      if (p.seasonCode) set.add(p.seasonCode);
    });
    return Array.from(set);
  }, [plans]);

  // Build options
  const exportOptions: CalendarExportOptions = useMemo(
    () => ({
      selectedFarmId,
      selectedSeason,
      includePlantingDates,
      includeHarvestDates,
      includeGrowthMilestones,
      includeActualHarvestBatches,
      includeScheduledActivities,
      reminderDaysBefore,
    }),
    [
      selectedFarmId,
      selectedSeason,
      includePlantingDates,
      includeHarvestDates,
      includeGrowthMilestones,
      includeActualHarvestBatches,
      includeScheduledActivities,
      reminderDaysBefore,
    ]
  );

  // Extract events
  const events = useMemo(() => {
    return extractCalendarEvents(
      plans,
      harvests,
      activities,
      farms,
      exportOptions,
      language
    );
  }, [plans, harvests, activities, farms, exportOptions, language]);

  // Generate ICS string
  const icsCalendarContent = useMemo(() => {
    const calendarName =
      selectedFarmId !== "all"
        ? `Terimbere - ${farms.find((f) => f.id === selectedFarmId)?.name || "Umurima"}`
        : "Terimbere Rwanda - Planting & Harvest Calendar";
    return generateIcsCalendar(events, calendarName, reminderDaysBefore);
  }, [events, selectedFarmId, farms, reminderDaysBefore]);

  if (!isOpen) return null;

  const handleDownloadIcs = () => {
    const stamp = new Date().toISOString().split("T")[0];
    const fileName =
      selectedFarmId !== "all"
        ? `terimbere_planting_calendar_${selectedFarmId}_${stamp}.ics`
        : `terimbere_planting_calendar_${stamp}.ics`;

    downloadIcsFile(icsCalendarContent, fileName);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);

    if (onShowToast) {
      onShowToast(
        language === "rw"
          ? `Dosiye ya Kalendari (.ics) yamanuwe! Kanda kuri yo uhite uyifungura muri Kalendari ya telefone cyangwa mudasobwa.`
          : `Calendar (.ics) downloaded! Tap to open directly in your phone or computer calendar.`
      );
    }
  };

  const handleCopyIcs = async () => {
    try {
      await navigator.clipboard.writeText(icsCalendarContent);
      setCopiedIcs(true);
      setTimeout(() => setCopiedIcs(false), 2500);
      if (onShowToast) {
        onShowToast(
          language === "rw"
            ? "Amakuru ya Kalendari (ICS) yakoporowe neza!"
            : "Calendar ICS text copied to clipboard!"
        );
      }
    } catch {
      // Fallback
    }
  };

  const handleLoadSamplePlans = () => {
    if (onAddSamplePlans) {
      const samples = generateSamplePlantingPlans(farms);
      onAddSamplePlans(samples);
      if (onShowToast) {
        onShowToast(
          language === "rw"
            ? "Gahunda 3 z'icyitegererezo (Ibirayi, Ibigori, Ibishyimbo) zashyizwemo!"
            : "3 model planting plans (Potatoes, Maize, Beans) loaded!"
        );
      }
    }
  };

  const calculateDaysRemaining = (dateIso: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateIso + "T00:00:00");
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white border-b border-emerald-800/80 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {language === "rw"
                    ? "Kohereza Gahunda y'Ihinza n'Isarura muri Kalendari"
                    : "Planting & Harvest Calendar Export"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  RFC 5545 .ICS
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
                {language === "rw"
                  ? "Huza amatariki yo gutera, intambwe z'imikurire, n'igihe cyo gusarura na Google Calendar cyangwa kalendari isanzwe yo kuri telefone yawe."
                  : "Sync crop planting dates, agronomic growth milestones, and harvest windows directly to Google Calendar or your native phone calendar app."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation & Statistics */}
        <div className="px-5 sm:px-6 pt-3 pb-0 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("events")}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === "events"
                  ? "border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Ibikorwa na Kalendari" : "Events & Export"}
                </span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                  {events.length}
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab("guide")}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === "guide"
                  ? "border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Uko bikoreshwa muri Google Calendar"
                    : "Google Calendar Guide"}
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab("preview_ics")}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === "preview_ics"
                  ? "border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-white dark:bg-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Dosiye ya ICS" : ".ICS Code Preview"}</span>
              </span>
            </button>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center space-x-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400 pb-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800">
              {plans.length} {language === "rw" ? "Gahunda" : "Plans"}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800">
              {harvests.length} {language === "rw" ? "Isarura" : "Harvests"}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === "events" && (
            <>
              {/* Filter & Export Preferences Card */}
              <div className="bg-stone-50 dark:bg-stone-900/40 p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    <Filter className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {language === "rw"
                        ? "Ihitamo ry'Imirima n'Ibikorwa Byoherezwa"
                        : "Filter Parcels & Included Events"}
                    </span>
                  </div>

                  {/* Reminder alarm selector */}
                  <div className="flex items-center space-x-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-stone-600 dark:text-stone-400">
                      {language === "rw" ? "Kumenyesha:" : "Reminder:"}
                    </span>
                    <select
                      value={reminderDaysBefore}
                      onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                      className="text-xs font-semibold px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                    >
                      <option value={1}>
                        {language === "rw" ? "Umunsi 1 mbere" : "1 day before"}
                      </option>
                      <option value={2}>
                        {language === "rw" ? "Iminsi 2 mbere" : "2 days before"}
                      </option>
                      <option value={7}>
                        {language === "rw" ? "Icyumweru 1 mbere" : "1 week before"}
                      </option>
                      <option value={0}>
                        {language === "rw" ? "Nta kumenyesha" : "No alarm"}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Farm selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      {language === "rw" ? "Umurima (Parcel)" : "Farm Parcel"}
                    </label>
                    <select
                      value={selectedFarmId}
                      onChange={(e) => setSelectedFarmId(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                    >
                      <option value="all">
                        {language === "rw"
                          ? "Imirima yose (All Parcels)"
                          : "All Parcels"}
                      </option>
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.district})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Season selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      {language === "rw" ? "Igihembwe (Season)" : "Agricultural Season"}
                    </label>
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                    >
                      <option value="all">
                        {language === "rw"
                          ? "Ibihembwe byose (All Seasons)"
                          : "All Seasons"}
                      </option>
                      {availableSeasons.map((s) => (
                        <option key={s} value={s}>
                          Season {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Summary / Total Events preview */}
                  <div className="flex flex-col justify-end">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                        {language === "rw" ? "Ibikorwa byateguwe:" : "Selected Events:"}
                      </span>
                      <span className="text-base font-black font-mono text-emerald-800 dark:text-emerald-300">
                        {events.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkbox Options */}
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  <label className="flex items-center space-x-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includePlantingDates}
                      onChange={(e) => setIncludePlantingDates(e.target.checked)}
                      className="rounded-sm text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                    />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      🌱 {language === "rw" ? "Gutera" : "Planting"}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeHarvestDates}
                      onChange={(e) => setIncludeHarvestDates(e.target.checked)}
                      className="rounded-sm text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                    />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      🌾 {language === "rw" ? "Isarura Ritezwe" : "Target Harvest"}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeGrowthMilestones}
                      onChange={(e) => setIncludeGrowthMilestones(e.target.checked)}
                      className="rounded-sm text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                    />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      🌿 {language === "rw" ? "Intambwe z'Ihinga" : "Milestones"}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeActualHarvestBatches}
                      onChange={(e) => setIncludeActualHarvestBatches(e.target.checked)}
                      className="rounded-sm text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                    />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      🧺 {language === "rw" ? "Umusaruro Wasaruwe" : "Batches"}
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer hover:border-emerald-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeScheduledActivities}
                      onChange={(e) => setIncludeScheduledActivities(e.target.checked)}
                      className="rounded-sm text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                    />
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      🚜 {language === "rw" ? "Ibikorwa" : "Activities"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Primary Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-950 text-white border border-emerald-800 shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800/80 border border-emerald-600/60 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {language === "rw"
                        ? "Manura Dosiye cyangwa Uhuze na Google Calendar"
                        : "Download File or Sync to Google Calendar"}
                    </h4>
                    <p className="text-[11px] text-emerald-300/80">
                      {language === "rw"
                        ? "Dosiye ya .ICS ikora muri Apple Calendar, Google Calendar, Outlook na telefone zose."
                        : ".ICS standard works seamlessly on iPhone, Android, Google Calendar, and Outlook."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDownloadIcs}
                    disabled={events.length === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-stone-950" />
                        <span>{language === "rw" ? "Yamanuwe!" : "Downloaded!"}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-stone-950" />
                        <span>
                          {language === "rw"
                            ? "Manura .ICS Calendar"
                            : "Download .ICS Calendar"}
                        </span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://calendar.google.com/calendar/r/settings/export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {language === "rw"
                        ? "Fungura Google Calendar"
                        : "Open Google Calendar"}
                    </span>
                  </a>

                  <button
                    onClick={handleCopyIcs}
                    disabled={events.length === 0}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
                    title={language === "rw" ? "Koporora ICS" : "Copy ICS code"}
                  >
                    {copiedIcs ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-stone-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Empty State or Event Cards List */}
              {events.length === 0 ? (
                <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/30 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Sprout className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                      {language === "rw"
                        ? "Nta gahunda y'ubuhinzi cyangwa isarura birabikwa"
                        : "No planting plans or harvests match your filter"}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {language === "rw"
                        ? "Kugira ngo ugerageze iyi kalendari, kanda hano hasi ushyiremo gahunda 3 z'icyitegererezo z'ibihingwa by'u Rwanda (Ibirayi, Ibigori, Ibishyimbo)."
                        : "To test calendar export right now, load 3 sample model crop plans tailored for Rwandan agriculture (Kinigi Potatoes, Hybrid Maize, Climbing Beans)."}
                    </p>
                  </div>
                  {onAddSamplePlans && (
                    <button
                      onClick={handleLoadSamplePlans}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {language === "rw"
                          ? "Shyiramo Gahunda z'Icyitegererezo (Sample Plans)"
                          : "Load Model Planting Plans"}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-bold px-1">
                    <span>
                      {language === "rw"
                        ? `Urutonde rw'Ibikorwa Byo Muri Kalendari (${events.length})`
                        : `Chronological Calendar Events Schedule (${events.length})`}
                    </span>
                    <span className="text-[11px] font-normal">
                      {language === "rw"
                        ? "Kanda 'Ohereza muri Google Calendar' kuri buri gikorwa"
                        : "Click 'Add to Google Calendar' on any event"}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {events.map((ev) => {
                      const daysRem = calculateDaysRemaining(ev.startDateIso);
                      const isPast = daysRem < 0;
                      const isToday = daysRem === 0;

                      return (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start space-x-3">
                            {/* Category Icon Badge */}
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                ev.category === "planting"
                                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                  : ev.category === "harvest_target"
                                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                  : ev.category === "growth_milestone"
                                  ? "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800"
                                  : ev.category === "harvest_batch"
                                  ? "bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                                  : "bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                              }`}
                            >
                              {ev.category === "planting" && <Sprout className="w-5 h-5" />}
                              {ev.category === "harvest_target" && <Flame className="w-5 h-5" />}
                              {ev.category === "growth_milestone" && <CheckCircle2 className="w-5 h-5" />}
                              {ev.category === "harvest_batch" && <Calendar className="w-5 h-5" />}
                              {ev.category === "scheduled_activity" && <Clock className="w-5 h-5" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                                  {ev.title}
                                </h4>
                                {ev.seasonCode && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                                    {ev.seasonCode}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {ev.farmName}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-stone-700 dark:text-stone-300 font-bold">
                                  {ev.startDateIso}
                                </span>
                                <span>•</span>
                                <span>
                                  {isToday ? (
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                      {language === "rw" ? "Uyu munsi" : "Today"}
                                    </strong>
                                  ) : isPast ? (
                                    <span className="text-stone-400">
                                      {language === "rw"
                                        ? `Yarangiye (iminsi ${Math.abs(daysRem)})`
                                        : `${Math.abs(daysRem)}d ago`}
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                      {language === "rw"
                                        ? `Mu minsi ${daysRem}`
                                        : `In ${daysRem} days`}
                                    </span>
                                  )}
                                </span>
                              </div>

                              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                                {ev.description.split("\n")[0]}
                              </p>
                            </div>
                          </div>

                          {/* Action Button: One-click Add to Google Calendar */}
                          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                            <a
                              href={ev.googleCalendarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-50 dark:bg-stone-800 dark:hover:bg-emerald-950/60 text-stone-800 hover:text-emerald-800 dark:text-stone-200 dark:hover:text-emerald-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-300 text-xs font-semibold transition-all shadow-2xs"
                              title={
                                language === "rw"
                                  ? "Kanda hano uhite ubyandika muri Google Calendar"
                                  : "Click to add directly into your Google Calendar"
                              }
                            >
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                {language === "rw"
                                  ? "+ Google Calendar"
                                  : "+ Google Calendar"}
                              </span>
                              <ExternalLink className="w-3 h-3 text-stone-400" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "guide" && (
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3 text-xs text-amber-950 dark:text-amber-200">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1">
                    {language === "rw"
                      ? "Uko dosiye ya .ICS ikorana na Google Calendar na Telefone"
                      : "How .ICS Calendar Sync Works with Google Calendar & Phones"}
                  </h4>
                  <p className="leading-relaxed">
                    {language === "rw"
                      ? "Dosiye ya .ICS ni uburyo bwemewe mpuzamahanga (RFC 5545) bwo guhanahana amatariki y'ingenzi. Iyo uyi manuye, ushobora kuyifungura mu buryo butatu butandukanye bworoshye cyane:"
                      : "The .ICS file format is the universal open calendar standard (RFC 5545). Once downloaded, you can import and sync your farm operations in 3 simple ways:"}
                  </p>
                </div>
              </div>

              {/* Step by step cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Method 1: Google Calendar Web Import */}
                <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h4 className="font-black text-stone-900 dark:text-stone-100 text-sm flex items-center space-x-1.5">
                    <Laptop className="w-4 h-4 text-emerald-700" />
                    <span>Google Calendar Web</span>
                  </h4>
                  <ol className="text-xs text-stone-600 dark:text-stone-400 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      {language === "rw"
                        ? "Kanda 'Manura .ICS Calendar' hasi."
                        : "Click 'Download .ICS Calendar' below."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Fungura Google Calendar kuri mudasobwa."
                        : "Open Google Calendar on your PC or browser."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Kanda ku kimenyetso cy'Igenamiterere (⚙️ Settings) > Import & export."
                        : "Click Settings (⚙️) > Import & export."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Hitamo dosiye ya .ICS wamanuye uhite ukanda Import."
                        : "Select your downloaded .ics file and hit Import."}
                    </li>
                  </ol>
                </div>

                {/* Method 2: Android Phone Native Calendar */}
                <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h4 className="font-black text-stone-900 dark:text-stone-100 text-sm flex items-center space-x-1.5">
                    <Smartphone className="w-4 h-4 text-blue-700" />
                    <span>Android / Samsung</span>
                  </h4>
                  <ol className="text-xs text-stone-600 dark:text-stone-400 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      {language === "rw"
                        ? "Manura dosiye ya .ICS kuri telefone yawe."
                        : "Download the .ICS file to your phone."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Kanda kuri iyo dosiye muri Downloads cyangwa Notification."
                        : "Tap the downloaded file in your Notification or Downloads."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Telefone ihita ikubaza: 'Add to Calendar' cyangwa 'Shyira muri Kalendari'."
                        : "Phone automatically prompts: 'Add all events to Calendar'."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Kanda 'Save' - amatariki yose ahita ajya muri kalendari yawe!"
                        : "Confirm 'Save' - all farm tasks sync instantly!"}
                    </li>
                  </ol>
                </div>

                {/* Method 3: Apple iPhone & iPad */}
                <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 space-y-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h4 className="font-black text-stone-900 dark:text-stone-100 text-sm flex items-center space-x-1.5">
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    <span>Apple iPhone (iOS)</span>
                  </h4>
                  <ol className="text-xs text-stone-600 dark:text-stone-400 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      {language === "rw"
                        ? "Kanda 'Manura .ICS Calendar' muri Safari cyangwa Chrome."
                        : "Download the .ICS file in Safari or Chrome."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "iOS ihita ifungura Apple Calendar yerekana ibikorwa byose."
                        : "iOS automatically opens Apple Calendar previewing all events."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Kanda 'Add All' hejuru iburyo."
                        : "Tap 'Add All' at the top right corner."}
                    </li>
                    <li>
                      {language === "rw"
                        ? "Amatariki azajya aguha integuza (Reminders) ku munsi wateguwe!"
                        : "Reminders will alert you right on your iPhone lock screen!"}
                    </li>
                  </ol>
                </div>
              </div>

              {/* Direct links container */}
              <div className="p-5 rounded-2xl bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  <strong className="block text-stone-900 dark:text-stone-100 font-bold mb-0.5">
                    {language === "rw"
                      ? "Ukeneye guhita ufungura urubuga rwa Google Calendar?"
                      : "Want to open Google Calendar directly now?"}
                  </strong>
                  <span>
                    {language === "rw"
                      ? "Kanda aha ufungure Google Calendar aho bashyirira dosiye (Import):"
                      : "Navigate straight to Google Calendar's import section:"}
                  </span>
                </div>
                <a
                  href="https://calendar.google.com/calendar/r/settings/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-2 shrink-0 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Google Calendar Import Settings</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === "preview_ics" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {language === "rw"
                    ? "Inyandiko y'amabwiriza ya RFC 5545 iCalendar (Ready for any calendar app)"
                    : "Standard RFC 5545 iCalendar payload (Universal calendar protocol)"}
                </div>
                <button
                  onClick={handleCopyIcs}
                  className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center space-x-1.5 transition-colors"
                >
                  {copiedIcs ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === "rw" ? "Yakoporowe!" : "Copied!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === "rw" ? "Koporora" : "Copy Code"}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto border border-stone-800 select-all">
                <pre>{icsCalendarContent}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {language === "rw"
                ? `${events.length} amatariki y'ingenzi muri Kalendari`
                : `${events.length} farm milestones ready to sync`}
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs transition-colors"
            >
              {language === "rw" ? "Funga (Close)" : "Close"}
            </button>
            <button
              onClick={handleDownloadIcs}
              disabled={events.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>
                {language === "rw" ? "Manura .ICS Kalendari" : "Download .ICS File"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
