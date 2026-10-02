import React, { useMemo, useState } from "react";
import {
  Expense,
  Farm,
  FarmActivity,
  FarmPlan,
  HarvestRecord,
  HiredLabor,
  Language,
  SaleRecord,
  TransportLog,
  User,
} from "../types";
import {
  buildOfflineBackupPayload,
  downloadOfflineBackupJson,
  OfflineBackupCategorySelection,
  OfflineBackupPayload,
  OfflineBackupScope,
  parseOfflineBackupJson,
} from "../utils/offlineJsonBackup";
import {
  CalendarCheck,
  CheckCircle2,
  CloudOff,
  Copy,
  Database,
  Download,
  FileCode,
  HardDriveDownload,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

interface OfflineBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  isOnline: boolean;
  expenses: Expense[];
  harvests: HarvestRecord[];
  activities: FarmActivity[];
  farms: Farm[];
  plans: FarmPlan[];
  sales: SaleRecord[];
  hiredLabor?: HiredLabor[];
  transportLogs?: TransportLog[];
  currentUser: User | null;
  seasonCode?: string;
  onRestoreBackup?: (
    restored: OfflineBackupPayload["records"],
    mode: "merge" | "replace"
  ) => void;
  onAddOfflineSampleTriplet?: () => void;
  onShowToast?: (msg: string) => void;
}

export const OfflineBackupModal: React.FC<OfflineBackupModalProps> = ({
  isOpen,
  onClose,
  language,
  isOnline,
  expenses,
  harvests,
  activities,
  farms,
  plans,
  sales,
  hiredLabor = [],
  transportLogs = [],
  currentUser,
  seasonCode = "2026B",
  onRestoreBackup,
  onAddOfflineSampleTriplet,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "restore">("export");
  const [scope, setScope] = useState<OfflineBackupScope>("all_local");
  const [categories, setCategories] = useState<OfflineBackupCategorySelection>({
    expenses: true,
    harvests: true,
    activities: true,
    includeFarmsAndPlans: true,
    includeSalesAndLogistics: false,
  });
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(true);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(
    null
  );

  // Restore tab state
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [parsedRestorePayload, setParsedRestorePayload] =
    useState<OfflineBackupPayload | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const backupPayload = useMemo(() => {
    return buildOfflineBackupPayload({
      expenses,
      harvests,
      activities,
      farms,
      plans,
      sales,
      hiredLabor,
      transportLogs,
      currentUser,
      isOnline,
      seasonCode,
      scope,
      categories,
    });
  }, [
    expenses,
    harvests,
    activities,
    farms,
    plans,
    sales,
    hiredLabor,
    transportLogs,
    currentUser,
    isOnline,
    seasonCode,
    scope,
    categories,
  ]);

  const jsonPreviewText = useMemo(() => {
    return JSON.stringify(backupPayload, null, 2);
  }, [backupPayload]);

  const fileSizeKb = useMemo(() => {
    const bytes = new Blob([jsonPreviewText]).size;
    return Math.max(0.4, Number((bytes / 1024).toFixed(1)));
  }, [jsonPreviewText]);

  if (!isOpen) return null;

  const toggleCategory = (key: keyof OfflineBackupCategorySelection) => {
    setCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDownloadJson = () => {
    const filename = downloadOfflineBackupJson(backupPayload);
    setLastDownloadedFile(filename);
    if (onShowToast) {
      onShowToast(
        language === "rw"
          ? `Idosiye y'ububiko bwa offline (${filename}) yabitswe neza!`
          : `Offline JSON backup (${filename}) downloaded successfully!`
      );
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreviewText);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
      if (onShowToast) {
        onShowToast(
          language === "rw"
            ? "JSON y'ububiko yakoporowe mu bubiko bw'agateganyo!"
            : "Offline backup JSON copied to clipboard!"
        );
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      const res = parseOfflineBackupJson(content);
      if (!res.valid || !res.payload) {
        setRestoreError(
          res.error ||
            (language === "rw"
              ? "Idosiye ya JSON ntifite imiterere ikwiye."
              : "Invalid JSON backup file format.")
        );
        setParsedRestorePayload(null);
      } else {
        setParsedRestorePayload(res.payload);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!parsedRestorePayload || !onRestoreBackup) return;
    onRestoreBackup(parsedRestorePayload.records, restoreMode);
    setParsedRestorePayload(null);
    setUploadedFileName(null);
    onClose();
  };

  const pendingExpensesTotal = expenses.filter(
    (e) => e.syncStatus === "offline_pending" || e.syncStatus === "local_pending"
  ).length;
  const pendingHarvestsTotal = harvests.filter(
    (h) => h.syncStatus === "offline_pending" || h.syncStatus === "local_pending"
  ).length;
  const pendingActivitiesTotal = activities.filter(
    (a) => a.syncStatus === "offline_pending" || a.syncStatus === "local_pending"
  ).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-200 font-semibold">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>
                  {isOnline
                    ? language === "rw"
                      ? "Murandasi Iraboneka (Online)"
                      : "Online Mode"
                    : language === "rw"
                      ? "Nta Murandasi (Offline Mode Active)"
                      : "Offline Mode Active"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-amber-300">
                  {backupPayload.integrityHash}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                {language === "rw"
                  ? "Kubika Amakuru ya Offline mu Idosiye ya JSON (Local Offline Backup)"
                  : "Local Offline Records JSON Backup & Restore"}
              </h2>
              <p className="text-xs text-emerald-100/85 mt-0.5">
                {language === "rw"
                  ? " Kuramo idosiye ya JSON irimo amafaranga yakoreshejwe (Expenses), umusaruro (Harvests), n'ibikorwa by'umurima (Activities) kugira ngo uyibike neza nta murandasi."
                  : "Export your local offline farm records (expenses, harvests, activities) into a portable JSON file for manual backup without internet access."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Subtabs: Export JSON vs Restore JSON */}
        <div className="px-6 py-3 bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "export"
                  ? "bg-emerald-800 text-white shadow-2xs"
                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "Kuramo Ububiko bwa JSON (Export Backup)"
                  : "Export Local JSON Backup"}
              </span>
            </button>

            {onRestoreBackup && (
              <button
                type="button"
                onClick={() => setActiveTab("restore")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "restore"
                    ? "bg-emerald-800 text-white shadow-2xs"
                    : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Garura Ububiko bwa JSON (Restore File)"
                    : "Restore from JSON File"}
                </span>
              </button>
            )}
          </div>

          <div className="text-xs text-stone-500 dark:text-stone-400 font-mono">
            {backupPayload.summary.totalRecordsExported}{" "}
            {language === "rw" ? "amakuru yatoranyijwe" : "records selected"} · ~
            {fileSizeKb} KB
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "export" ? (
            <>
              {/* 3 Core Offline Record Category Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Expenses Card */}
                <div
                  onClick={() => toggleCategory("expenses")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    categories.expenses
                      ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                      : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-65"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                      <Receipt className="w-4 h-4" />
                      <span>
                        {language === "rw"
                          ? "1. Amafaranga (Expenses)"
                          : "1. Farm Expenses"}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={categories.expenses}
                      onChange={() => {}}
                      aria-label="Include Expenses"
                      className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-stone-900 dark:text-white font-mono tabular-nums">
                      {backupPayload.summary.expensesCount}
                    </span>
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 font-mono tabular-nums">
                      {backupPayload.summary.totalExpensesRwf.toLocaleString()} RWF
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {expenses.length} {language === "rw" ? "kuri telefone" : "local"} ·{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {pendingExpensesTotal}{" "}
                      {language === "rw" ? "offline_pending" : "offline pending"}
                    </span>
                  </p>
                </div>

                {/* 2. Harvests Card */}
                <div
                  onClick={() => toggleCategory("harvests")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    categories.harvests
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                      : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-65"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs">
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {language === "rw"
                          ? "2. Umusaruro (Harvests)"
                          : "2. Harvest Records"}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={categories.harvests}
                      onChange={() => {}}
                      aria-label="Include Harvests"
                      className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-stone-900 dark:text-white font-mono tabular-nums">
                      {backupPayload.summary.harvestsCount}
                    </span>
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 font-mono tabular-nums">
                      {backupPayload.summary.totalHarvestedKg.toLocaleString()} kg
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {harvests.length} {language === "rw" ? "kuri telefone" : "local"} ·{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {pendingHarvestsTotal}{" "}
                      {language === "rw" ? "offline_pending" : "offline pending"}
                    </span>
                  </p>
                </div>

                {/* 3. Activities Card */}
                <div
                  onClick={() => toggleCategory("activities")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    categories.activities
                      ? "bg-sky-50/60 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800"
                      : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-65"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-400 font-bold text-xs">
                      <CalendarCheck className="w-4 h-4" />
                      <span>
                        {language === "rw"
                          ? "3. Ibikorwa (Activities)"
                          : "3. Field Activities"}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={categories.activities}
                      onChange={() => {}}
                      aria-label="Include Activities"
                      className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-stone-900 dark:text-white font-mono tabular-nums">
                      {backupPayload.summary.activitiesCount}
                    </span>
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 font-mono tabular-nums">
                      {backupPayload.summary.completedActivitiesCount}{" "}
                      {language === "rw" ? "byakozwe" : "completed"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {activities.length} {language === "rw" ? "kuri telefone" : "local"} ·{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {pendingActivitiesTotal}{" "}
                      {language === "rw" ? "offline_pending" : "offline pending"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Filter Scope & Additional Context Controls */}
              <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-200">
                      {language === "rw"
                        ? "Hitamo Ubwoko bw'Amakuru Usohora (Backup Scope)"
                        : "Select Offline Backup Scope"}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {language === "rw"
                        ? "Ushobora kubika amakuru yose ari muri telefone yawe cyangwa ayanditswe nta murandasi (offline_pending) gusa."
                        : "Choose whether to export all local device records or strictly unsynchronized offline records."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScope("all_local")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        scope === "all_local"
                          ? "bg-emerald-800 text-white"
                          : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {language === "rw"
                        ? "Amakuru Yose yo kuri Telefone (All Local)"
                        : "All Local Records"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope("unsynced_only")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        scope === "unsynced_only"
                          ? "bg-amber-500 text-stone-950"
                          : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {language === "rw"
                        ? "Ayategereje Isanisha Gusa (Unsynced Only)"
                        : "Pending Offline Only"}
                    </button>
                  </div>
                </div>

                {/* Optional Context Checkboxes */}
                <div className="pt-3 border-t border-stone-200 dark:border-stone-700/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <label className="inline-flex items-center gap-2 text-stone-700 dark:text-stone-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(categories.includeFarmsAndPlans)}
                        onChange={() => toggleCategory("includeFarmsAndPlans")}
                        className="w-4 h-4 accent-emerald-700 rounded"
                      />
                      <span>
                        {language === "rw"
                          ? `Ongeraho Imirima (${farms.length}) n'Igenamigambi (${plans.length})`
                          : `Include Farm Parcels (${farms.length}) & Crop Plans (${plans.length})`}
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-stone-700 dark:text-stone-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(categories.includeSalesAndLogistics)}
                        onChange={() =>
                          toggleCategory("includeSalesAndLogistics")
                        }
                        className="w-4 h-4 accent-emerald-700 rounded"
                      />
                      <span>
                        {language === "rw"
                          ? `Ongeraho Ubucuruzi (${sales.length}) n'Abakozi`
                          : `Include Sales (${sales.length}), Labor & Transport`}
                      </span>
                    </label>
                  </div>

                  {onAddOfflineSampleTriplet && (
                    <button
                      type="button"
                      onClick={onAddOfflineSampleTriplet}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw"
                          ? "+ Ongeraho Icyitegererezo cya Offline (Expense, Harvest, Activity)"
                          : "+ Generate Sample Offline Records (Expense, Harvest, Activity)"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live JSON File Inspector */}
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="px-4 py-3 bg-stone-900 text-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white">
                      terimbere-
                      {scope === "unsynced_only"
                        ? "offline-pending"
                        : "local-records"}
                      -backup-{backupPayload.exportedDate}.json
                    </span>
                    <span aria-hidden="true" className="text-stone-500">
                      ·
                    </span>
                    <span className="text-emerald-400">
                      {backupPayload.summary.expensesCount} expenses ·{" "}
                      {backupPayload.summary.harvestsCount} harvests ·{" "}
                      {backupPayload.summary.activitiesCount} activities
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJsonPreview((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold transition-colors cursor-pointer"
                    >
                      {showJsonPreview
                        ? language === "rw"
                          ? "Hisha JSON"
                          : "Hide Preview"
                        : language === "rw"
                          ? "Reba JSON"
                          : "Show Preview"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold transition-colors cursor-pointer"
                    >
                      {copiedJson ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === "rw" ? "Byakoporowe!" : "Copied!"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{language === "rw" ? "Koporora JSON" : "Copy JSON"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showJsonPreview && (
                  <pre className="p-4 bg-stone-950 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-64">
                    {jsonPreviewText}
                  </pre>
                )}
              </div>

              {lastDownloadedFile && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {language === "rw"
                        ? `Idosiye ya JSON "${lastDownloadedFile}" yabitswe kuri mudasobwa/telefone yawe neza.`
                        : `Backup file "${lastDownloadedFile}" has been saved to your device downloads.`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold">
                    {backupPayload.integrityHash}
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Restore / Import JSON Backup Tab */
            <div className="space-y-5">
              <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {language === "rw"
                        ? "Garura Amakuru Wabitse mu Idosiye ya JSON"
                        : "Restore Local Farm Records from a JSON Backup File"}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                      {language === "rw"
                        ? "Hitamo idosiye ya .json wabitse mbere kugira ngo ugarure amafaranga yakoreshejwe (Expenses), umusaruro (Harvests), n'ibikorwa (Activities) muri iyi telefone cyangwa mudasobwa."
                        : "Upload a previously exported TERIMBERE .json backup file to restore your expenses, harvests, and field activities into local device storage."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-4 h-4" />
                    <span>
                      {language === "rw"
                        ? "Hitamo Idosiye ya JSON (.json)"
                        : "Choose .JSON Backup File"}
                    </span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">
                      {language === "rw" ? "Uburyo bwo Kugarura:" : "Restore Mode:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRestoreMode("merge")}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                        restoreMode === "merge"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                          : "bg-white dark:bg-stone-900 text-stone-600 border border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {language === "rw"
                        ? "Vanga n'ibisanzwe (Merge)"
                        : "Merge with Existing"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreMode("replace")}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                        restoreMode === "replace"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                          : "bg-white dark:bg-stone-900 text-stone-600 border border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {language === "rw"
                        ? "Simbuza byose (Replace)"
                        : "Replace Local Data"}
                    </button>
                  </div>
                </div>

                {restoreError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    {restoreError}
                  </div>
                )}

                {parsedRestorePayload && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {uploadedFileName} · {parsedRestorePayload.exportedDate}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-stone-500">
                        {parsedRestorePayload.integrityHash}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                        <div className="text-lg font-black text-stone-900 dark:text-white font-mono">
                          {parsedRestorePayload.summary.expensesCount}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {language === "rw" ? "Amafaranga (Expenses)" : "Expenses"}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                        <div className="text-lg font-black text-stone-900 dark:text-white font-mono">
                          {parsedRestorePayload.summary.harvestsCount}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {language === "rw" ? "Umusaruro (Harvests)" : "Harvests"}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800">
                        <div className="text-lg font-black text-stone-900 dark:text-white font-mono">
                          {parsedRestorePayload.summary.activitiesCount}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {language === "rw" ? "Ibikorwa (Activities)" : "Activities"}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleConfirmRestore}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        <Database className="w-4 h-4" />
                        <span>
                          {language === "rw"
                            ? "Emeza Kugarura Aya Makuru Muri Telefone"
                            : "Confirm & Restore Records to Local Storage"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {language === "rw"
                ? "Bikora 100% nta murandasi (Works 100% Offline via Browser LocalStorage)"
                : "Works 100% offline without internet connection"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {language === "rw" ? "Funga" : "Close"}
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={
                !categories.expenses &&
                !categories.harvests &&
                !categories.activities
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? `Kuramo JSON Backup (${backupPayload.summary.totalRecordsExported})`
                  : `Download JSON Backup (${backupPayload.summary.totalRecordsExported} records)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
