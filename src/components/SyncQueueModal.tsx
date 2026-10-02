import React, { useState } from "react";
import { PendingSyncItem, Language } from "../types";
import {
  X,
  CloudOff,
  CloudUpload,
  CheckCircle2,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Users,
  Truck,
  Wifi,
  WifiOff,
  Database,
  ArrowRight,
  ShieldCheck,
  Clock,
  RefreshCw,
  Plus,
  Download,
  HardDriveDownload,
} from "lucide-react";

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItems: PendingSyncItem[];
  isOnline: boolean;
  onSyncAll: () => void;
  onSimulateOfflineAdd?: () => void;
  onExportOfflineJson?: () => void;
  onOpenOfflineBackupModal?: () => void;
  language: Language;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  pendingItems,
  isOnline,
  onSyncAll,
  onSimulateOfflineAdd,
  onExportOfflineJson,
  onOpenOfflineBackupModal,
  language,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  if (!isOpen) return null;

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    // Give realistic feedback delay
    setTimeout(() => {
      onSyncAll();
      setIsSyncing(false);
    }, 900);
  };

  const filteredItems = pendingItems.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const getItemIcon = (type: PendingSyncItem["type"]) => {
    switch (type) {
      case "expense":
        return <Receipt className="w-4 h-4 text-rose-600" />;
      case "harvest":
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case "sale":
        return <TrendingUp className="w-4 h-4 text-amber-600" />;
      case "activity":
        return <Calendar className="w-4 h-4 text-sky-600" />;
      case "labor":
        return <Users className="w-4 h-4 text-indigo-600" />;
      case "transport":
        return <Truck className="w-4 h-4 text-teal-600" />;
      default:
        return <Database className="w-4 h-4 text-stone-600" />;
    }
  };

  const getItemTypeBadge = (type: PendingSyncItem["type"]) => {
    const labels: Record<PendingSyncItem["type"], { rw: string; en: string; bg: string }> = {
      expense: { rw: "Amafaranga", en: "Expense", bg: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
      harvest: { rw: "Umusaruro", en: "Harvest", bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
      sale: { rw: "Ubucuruzi", en: "Sale", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
      activity: { rw: "Igikorwa", en: "Activity", bg: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
      labor: { rw: "Abakozi", en: "Labor", bg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" },
      transport: { rw: "Imodoka", en: "Transport", bg: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" },
    };
    const item = labels[type] || { rw: type, en: type, bg: "bg-stone-100 text-stone-800" };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${item.bg}`}>
        {language === "rw" ? item.rw : item.en}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                pendingItems.length > 0
                  ? "bg-amber-500 text-stone-950 animate-pulse"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {pendingItems.length > 0 ? (
                <CloudOff className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? "Ibyanditswe Offline Bitegereje Guhuzwa"
                    : "Offline Sync Queue (Pending Uploads)"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                  {pendingItems.length} {language === "rw" ? "biri mu murongo" : "pending"}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Ibi bikorwa bibitse muri telefone (LocalStorage/Cache) bizoherezwa kuri seriveri ya Nkunganire/MINAGRI."
                  : "Items cached securely on this device that will upload automatically once internet is restored."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectivity Status Banner */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between text-xs gap-3 ${
            isOnline
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-300"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-emerald-500 animate-ping" : "bg-amber-500 animate-pulse"
              }`}
            />
            <div>
              <span className="font-extrabold uppercase tracking-wide">
                {isOnline
                  ? language === "rw"
                    ? "Murandasi Iraboneka (Online)"
                    : "Internet Connected (Online)"
                  : language === "rw"
                  ? "Nta Murandasi Ihari (Offline Mode)"
                  : "No Internet Connection (Offline Mode)"}
              </span>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isOnline
                  ? language === "rw"
                    ? "Ushobora kohereza ibi bikorwa ako kanya ukoresheje buto iri iburyo."
                    : "Ready to transmit queued changes to the central agricultural database."
                  : language === "rw"
                  ? "Iyo umaze kwandika, ubutumwa bubikwa neza kugeza wongeye kubona interineti."
                  : "Records are stored in browser offline storage and will sync automatically."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onExportOfflineJson && (
              <button
                type="button"
                onClick={onExportOfflineJson}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-xs transition-all cursor-pointer"
                title={
                  language === "rw"
                    ? "Kuramo idosiye ya JSON y'ububiko bwa offline"
                    : "Download local offline records as JSON file"
                }
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Kuramo JSON Backup" : "Export JSON (.json)"}
                </span>
              </button>
            )}

            {/* Sync Button */}
            {pendingItems.length > 0 && (
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-xs transition-all ${
                  isOnline
                    ? "bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95"
                    : "bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 cursor-not-allowed"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>
                  {isSyncing
                    ? language === "rw"
                      ? "Birimo guhuzwa..."
                      : "Syncing..."
                    : language === "rw"
                    ? "Kora Isanisha Ryose"
                    : "Sync All Now"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        {pendingItems.length > 0 && (
          <div className="px-5 py-2 bg-stone-100 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex items-center space-x-1 overflow-x-auto text-xs shrink-0">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                filterType === "all"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Byose" : "All"} ({pendingItems.length})
            </button>
            {["expense", "harvest", "sale", "activity", "labor", "transport"].map((type) => {
              const count = pendingItems.filter((i) => i.type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors ${
                    filterType === type
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs"
                      : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                {language === "rw"
                  ? "Nta bikorwa bitegereje isanisha!"
                  : "All records are fully synchronized!"}
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {language === "rw"
                  ? "Amakuru yose y'amafaranga, umusaruro, n'abakozi yamaze kugera kuri seriveri ya Nkunganire."
                  : "Every local change has been successfully verified and backed up."}
              </p>

              {onSimulateOfflineAdd && (
                <button
                  onClick={onSimulateOfflineAdd}
                  className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 text-xs font-semibold border border-stone-300 dark:border-stone-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {language === "rw"
                      ? "Gera amakuru ya offline (Simulate Offline Record)"
                      : "Simulate Offline Item"}
                  </span>
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-2xs hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getItemTypeBadge(item.type)}
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                        {item.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center space-x-1 animate-pulse">
                        <Clock className="w-2.5 h-2.5" />
                        <span>offline_pending</span>
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {item.farmName} {item.crop ? `• ${item.crop}` : ""} • {item.details}
                    </p>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Recorded: <span className="font-mono">{item.date}</span> • ID:{" "}
                      <span className="font-mono">{item.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 dark:border-stone-700 shrink-0">
                  {item.amountOrQuantity && (
                    <span className="text-sm font-black text-stone-900 dark:text-white">
                      {item.amountOrQuantity}
                    </span>
                  )}
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                    Waiting for upload
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info & Actions */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {language === "rw"
                ? "Umwirondoro w'ububiko urinzwe (Encrypted local storage)"
                : "AES-encrypted local offline cache"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenOfflineBackupModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOfflineBackupModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? "Ububiko bwa JSON & Kugarura"
                    : "JSON Backup & Restore Center"}
                </span>
              </button>
            )}

            {onSimulateOfflineAdd && (
              <button
                onClick={onSimulateOfflineAdd}
                className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors flex items-center space-x-1"
                title="Add a sample offline expense or harvest for testing"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "+ Ongera Offline" : "+ Add Offline Test"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-colors shadow-2xs"
            >
              {language === "rw" ? "Funga" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
