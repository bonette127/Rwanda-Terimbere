import React, { useState } from "react";
import {
  HarvestNotification,
  Language,
  HarvestAlertUrgency,
  ScheduledActivityAlert,
  IrrigationDemandAlert,
  FarmActivity,
} from "../types";
import {
  X,
  Bell,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  Check,
  Filter,
  PackageCheck,
  ChevronRight,
  Info,
  Droplets,
  Sprout,
  Volume2,
  Thermometer,
  CloudRain,
  CalendarPlus,
} from "lucide-react";
import { NavTab } from "./Navigation";
import { triggerActivityPushNotification } from "../utils/activityAlerts";
import { triggerIrrigationDemandPushNotification } from "../utils/irrigationDemand";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: HarvestNotification[];
  scheduledActivityAlerts?: ScheduledActivityAlert[];
  irrigationDemandAlerts?: IrrigationDemandAlert[];
  language: Language;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onNavigateToTab: (tab: NavTab) => void;
  onCompleteActivity?: (activityId: string) => void;
  onCreateWateringTask?: (activity: Omit<FarmActivity, "id">) => void;
  onMarkWateredNow?: (farmId: string, crop: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  scheduledActivityAlerts = [],
  irrigationDemandAlerts = [],
  language,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNavigateToTab,
  onCompleteActivity,
  onCreateWateringTask,
  onMarkWateredNow,
}) => {
  const [activeSection, setActiveSection] = useState<"all" | "irrigation" | "activities" | "harvests">("all");
  const [filter, setFilter] = useState<"all" | "urgent" | "unread">("all");
  const [simulatedSms, setSimulatedSms] = useState<HarvestNotification | null>(null);
  const [testingPushId, setTestingPushId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulatePush = async (alert: ScheduledActivityAlert) => {
    setTestingPushId(alert.id);
    await triggerActivityPushNotification(alert, language);
    setTimeout(() => {
      setTestingPushId(null);
    }, 3000);
  };

  const handleSimulateIrrigationPush = async (alert: IrrigationDemandAlert) => {
    setTestingPushId(alert.id);
    await triggerIrrigationDemandPushNotification(alert, language);
    setTimeout(() => {
      setTestingPushId(null);
    }, 3000);
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "urgent") return n.urgency === "urgent" || n.urgency === "overdue";
    if (filter === "unread") return !n.read;
    return true;
  });

  const unreadCount =
    notifications.filter((n) => !n.read).length +
    scheduledActivityAlerts.length +
    irrigationDemandAlerts.filter((a) => a.status === "critical" || a.status === "high").length;

  const getUrgencyBadge = (urgency: HarvestAlertUrgency, days: number) => {
    switch (urgency) {
      case "overdue":
        return {
          labelRw: `Yarenze igihe (${Math.abs(days)}d)`,
          labelEn: `Overdue (${Math.abs(days)}d)`,
          bg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case "urgent":
        return {
          labelRw: days === 0 ? "Uyu Munsi (Today)" : `Iminsi ${days} gusa!`,
          labelEn: days === 0 ? "Today!" : `${days} Days Left!`,
          bg: "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        };
      case "approaching":
        return {
          labelRw: `Hasigaye iminsi ${days}`,
          labelEn: `${days} Days Left`,
          bg: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
          icon: <Calendar className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "upcoming":
        return {
          labelRw: `Iminsi ${days}`,
          labelEn: `${days} Days`,
          bg: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-700",
          icon: <Info className="w-3.5 h-3.5 text-stone-500" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  {language === "rw" ? "Ubutumwa & Integuza z'Ubuhinzi" : "Farm Alerts & Notifications"}
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                    {unreadCount} {language === "rw" ? "bishya" : "new"}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Kumenyeshwa iminsi 3 mbere y'ifumbire/kuhira hamwe n'iteganyagihe ry'isarura"
                  : "3-day advance alerts for fertilizer/irrigation alongside harvest maturity schedules"}
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

        {/* Section Tabs (All vs Irrigation vs Activities vs Harvests) */}
        <div className="px-5 py-2 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800 flex items-center space-x-2 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => setActiveSection("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              activeSection === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <span>{language === "rw" ? "Byose Hamwe" : "All Alerts"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {notifications.length + scheduledActivityAlerts.length + irrigationDemandAlerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("irrigation")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              activeSection === "irrigation"
                ? "bg-cyan-600 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-300" />
            <span>
              {language === "rw" ? "Ubuhehere & Kuhira" : "Soil Moisture & Irrigation"}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {irrigationDemandAlerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("activities")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              activeSection === "activities"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <Sprout className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {language === "rw"
                ? "Ifumbire & Kuhira (Iminsi 3)"
                : "Fertilizer & Irrigation (3-Day)"}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {scheduledActivityAlerts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection("harvests")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
              activeSection === "harvests"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{language === "rw" ? "Isarura (Harvests)" : "Harvest Cycles"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {notifications.length}
            </span>
          </button>
        </div>

        {/* Filter & Quick Actions Sub-bar */}
        <div className="px-5 py-2.5 bg-stone-100/70 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs gap-2 shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                filter === "all"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Byose" : "All"}
            </button>
            <button
              onClick={() => setFilter("urgent")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                filter === "urgent"
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shadow-2xs"
                  : "text-stone-500 hover:text-amber-700"
              }`}
            >
              {language === "rw" ? "Byihutirwa" : "Urgent"}
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                filter === "unread"
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 shadow-2xs"
                  : "text-stone-500 hover:text-emerald-700"
              }`}
            >
              {language === "rw" ? "Bitarasomwa" : "Unread"} ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Bose byasomwe" : "Mark all read"}</span>
            </button>
          )}
        </div>

        {/* Notifications & Activity Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {/* Soil Moisture & Irrigation Demand Alerts Section */}
          {(activeSection === "all" || activeSection === "irrigation") &&
            irrigationDemandAlerts.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-cyan-700 dark:text-cyan-400 px-1">
                  <Droplets className="w-4 h-4 text-cyan-600 animate-pulse" />
                  <span>
                    {language === "rw"
                      ? "Ubuhehere bw'Ubutaka & Integuza zo Kuhira (Irrigation Demand)"
                      : "Soil Moisture & Irrigation Demand Alerts"}
                  </span>
                </div>

                {irrigationDemandAlerts.map((alert) => {
                  const isCritical = alert.status === "critical";
                  const isHigh = alert.status === "high";
                  const isTesting = testingPushId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isCritical
                          ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-400 dark:border-rose-800 shadow-xs"
                          : isHigh
                          ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-800 shadow-xs"
                          : "bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {/* Soil Moisture Circle */}
                          <div
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border text-center font-black ${
                              isCritical
                                ? "bg-rose-600 text-white border-rose-700"
                                : isHigh
                                ? "bg-amber-500 text-stone-950 border-amber-600"
                                : "bg-cyan-600 text-white border-cyan-700"
                            }`}
                          >
                            <span className="text-xs leading-none">{alert.soilMoisturePercentage}%</span>
                            <span className="text-[8px] font-mono leading-none mt-0.5 opacity-90">
                              &lt;{alert.thresholdPercentage}%
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  isCritical
                                    ? "bg-rose-600 text-white animate-pulse"
                                    : isHigh
                                    ? "bg-amber-500 text-stone-950 font-black"
                                    : "bg-cyan-700 text-white"
                                }`}
                              >
                                {isCritical
                                  ? language === "rw"
                                    ? "🚨 Byihutirwa Cyane"
                                    : "🚨 Critical Deficit"
                                  : isHigh
                                  ? language === "rw"
                                    ? "💧 Bikenewe Vuba"
                                    : "💧 High Demand"
                                  : language === "rw"
                                  ? "Gukurikirana"
                                  : "Moderate"}
                              </span>

                              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                                {alert.farmName} • {alert.crop}
                              </span>

                              {alert.growthStageSummary.isPeakWaterDemand && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                                  🔥 {language === "rw" ? "Peak Water Need" : "Peak Water Stage"}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1">
                              {language === "rw" ? alert.titleRw : alert.titleEn}
                            </h4>

                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                              {language === "rw" ? alert.messageRw : alert.messageEn}
                            </p>

                            {/* Weather & Dosage summary */}
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-stone-600 dark:text-stone-300">
                              <span className="flex items-center space-x-1 bg-white dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700">
                                <Thermometer className="w-3 h-3 text-amber-500" />
                                <span>{alert.weatherSummary.tempC}°C</span>
                              </span>
                              <span className="flex items-center space-x-1 bg-white dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700">
                                <CloudRain className="w-3 h-3 text-cyan-500" />
                                <span>{alert.weatherSummary.rainfallMm} mm</span>
                              </span>
                              <span className="flex items-center space-x-1 bg-white dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700">
                                <Droplets className="w-3 h-3 text-cyan-600" />
                                <span>
                                  {language === "rw"
                                    ? `Ingano: mm ${alert.recommendedWaterMm}`
                                    : `Dose: ${alert.recommendedWaterMm}mm`}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 shrink-0"
                          title={language === "rw" ? "Kura mu rutonde" : "Dismiss"}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Immediate action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80 dark:border-stone-800">
                        <button
                          onClick={() => handleSimulateIrrigationPush(alert)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                            isTesting
                              ? "bg-cyan-400 text-stone-950"
                              : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>
                            {isTesting
                              ? language === "rw"
                                ? "Push Yagezeho!"
                                : "Push Sent!"
                              : language === "rw"
                              ? "Gerageza Push"
                              : "Simulate Push"}
                          </span>
                        </button>

                        <div className="flex items-center space-x-2">
                          {onCreateWateringTask && (
                            <button
                              onClick={() => {
                                onCreateWateringTask(alert.suggestedActivity);
                                onDismiss(alert.id);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              <span>{language === "rw" ? "Shyira muri Gahunda" : "Schedule Task"}</span>
                            </button>
                          )}

                          {onMarkWateredNow && (
                            <button
                              onClick={() => {
                                onMarkWateredNow(alert.farmId, alert.crop);
                                onDismiss(alert.id);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{language === "rw" ? "Nuhiriye Ubu" : "Watered Now"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {/* Scheduled 3-Day Activity Alerts Section */}
          {(activeSection === "all" || activeSection === "activities") &&
            scheduledActivityAlerts.length > 0 && (
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-700 dark:text-amber-400 px-1">
                  <Sprout className="w-4 h-4" />
                  <span>
                    {language === "rw"
                      ? "Integuza z'Ifumbire & Kuhira (Iminsi 3 mbere)"
                      : "3-Day Scheduled Input & Irrigation Alerts"}
                  </span>
                </div>

                {scheduledActivityAlerts.map((alert) => {
                  const isFertilizer = alert.category === "fertilizing";
                  const isTesting = testingPushId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-stone-850 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              isFertilizer
                                ? "bg-emerald-600 text-white"
                                : "bg-sky-600 text-white"
                            }`}
                          >
                            {isFertilizer ? (
                              <Sprout className="w-5 h-5" />
                            ) : (
                              <Droplets className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  alert.isThreeDaysBefore
                                    ? "bg-amber-400 text-stone-950 animate-pulse"
                                    : alert.daysRemaining === 0
                                    ? "bg-rose-600 text-white"
                                    : "bg-emerald-700 text-white"
                                }`}
                              >
                                {alert.isThreeDaysBefore
                                  ? language === "rw"
                                    ? "🚨 Iminsi 3 isigaye"
                                    : "🚨 3 Days Left"
                                  : alert.daysRemaining === 0
                                  ? language === "rw"
                                    ? "⚡ Uyu munsi"
                                    : "⚡ Today"
                                  : `${alert.daysRemaining}d`}
                              </span>

                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                                {isFertilizer
                                  ? language === "rw"
                                    ? "Ifumbire"
                                    : "Fertilizer"
                                  : language === "rw"
                                  ? "Kuhira"
                                  : "Irrigation"}
                              </span>

                              <span className="text-xs text-stone-500 dark:text-stone-400">
                                {alert.farmName} • {alert.dueDate}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1">
                              {alert.title}
                            </h4>

                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 leading-relaxed">
                              {language === "rw" ? alert.messageRw : alert.messageEn}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => onDismiss(alert.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 shrink-0"
                          title={language === "rw" ? "Kura mu rutonde" : "Dismiss"}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Input recommendation */}
                      {alert.suggestedInput && (
                        <div className="text-[11px] bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-emerald-800 dark:text-emerald-300 font-medium">
                          💡 {alert.suggestedInput}
                        </div>
                      )}

                      {/* Modal Action Buttons */}
                      <div className="flex items-center justify-between pt-1 gap-2 border-t border-stone-200/80 dark:border-stone-800">
                        <button
                          onClick={() => handleSimulatePush(alert)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                            isTesting
                              ? "bg-amber-400 text-stone-950"
                              : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>
                            {isTesting
                              ? language === "rw"
                                ? "Push Yagezeho!"
                                : "Push Sent!"
                              : language === "rw"
                              ? "Gerageza Push Notification"
                              : "Simulate Push"}
                          </span>
                        </button>

                        <div className="flex items-center space-x-2">
                          {onCompleteActivity && (
                            <button
                              onClick={() => {
                                onCompleteActivity(alert.activityId);
                                onDismiss(alert.id);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{language === "rw" ? "Yarangiye" : "Mark Done"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          {filteredNotifs.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                {language === "rw"
                  ? "Nta butumwa bw'isarura buhari muri aka kanya!"
                  : "No pending harvest alerts right now!"}
              </p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                {language === "rw"
                  ? "Iyo igihingwa kigeze mu minsi 21 mbere yo gusarurwa ukurikije gahunda y'umurima, uzahita ubona ubutumwa hano."
                  : "When any crop reaches within 21 days of its predicted harvest date, alerts will populate automatically."}
              </p>
            </div>
          ) : (
            filteredNotifs.map((n) => {
              const badge = getUrgencyBadge(n.urgency, n.daysRemaining);

              return (
                <div
                  key={n.id}
                  onClick={() => onMarkAsRead(n.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    !n.read
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs"
                      : "bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5 shrink-0">{badge.icon}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                            {language === "rw" ? n.titleRw : n.titleEn}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg}`}
                          >
                            {language === "rw" ? badge.labelRw : badge.labelEn}
                          </span>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          )}
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                          {language === "rw" ? n.messageRw : n.messageEn}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(n.id);
                      }}
                      className="text-stone-400 hover:text-rose-600 p-1"
                      title={language === "rw" ? "Kura mu rutonde" : "Dismiss"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* RAB Agronomy Tip Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 flex items-start space-x-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-800 dark:text-emerald-400">
                        {language === "rw" ? "Amabwiriza ya RAB:" : "RAB Harvest Rule:"}
                      </strong>{" "}
                      <span>{language === "rw" ? n.rabAdvisoryRw : n.rabAdvisoryEn}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-stone-700 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-stone-400 flex items-center space-x-2">
                      <span>{n.farmName}</span>
                      <span>•</span>
                      <span>
                        Target: <strong>{n.predictedHarvestDate}</strong>
                      </span>
                      {n.expectedYieldKg && (
                        <>
                          <span>•</span>
                          <span>{(n.expectedYieldKg / 1000).toFixed(1)} T</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Simulate SMS button for offline Rwandan farmers */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimulatedSms(n);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
                        title="Simulate SMS notification on farmer phone"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>SMS Alert</span>
                      </button>

                      {/* Log Harvest directly */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onNavigateToTab("harvestSales");
                        }}
                        className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                      >
                        <ShoppingBag className="w-3 h-3 text-amber-300" />
                        <span>{language === "rw" ? "Andika Umusaruro" : "Log Harvest"}</span>
                      </button>

                      {/* View Farm Plan */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onNavigateToTab("plans");
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-medium border border-stone-300 dark:border-stone-600 transition-colors"
                      >
                        <span>{language === "rw" ? "Reba Gahunda" : "Plan"}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal SMS Simulation Drawer */}
        {simulatedSms && (
          <div className="p-4 bg-emerald-950 text-white border-t border-emerald-800 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Ubutumwa bwa SMS (Feature Phone / MINAGRI Dispatch)
                </span>
              </div>
              <button
                onClick={() => setSimulatedSms(null)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="bg-stone-900 rounded-xl p-3 border border-stone-700 text-xs font-mono space-y-1">
              <div className="text-emerald-400 text-[10px]">
                FROM: MINAGRI-SMART-AGRI (+250 788 111 222)
              </div>
              <div className="text-stone-200">
                "{language === "rw" ? simulatedSms.messageRw : simulatedSms.messageEn}{" "}
                RAB Advice: {language === "rw" ? simulatedSms.rabAdvisoryRw : simulatedSms.rabAdvisoryEn}"
              </div>
              <div className="text-[10px] text-stone-400 pt-1">
                Koresha *777# cyangwa fungura terimbere.rw kugira ngo wandike umusaruro.
              </div>
            </div>
          </div>
        )}

        {/* Bottom Footer info */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>
            {language === "rw"
              ? "Ubutumwa buhuzwa buri munsi na kalendari y'ihinga ya RAB"
              : "Synchronized with RAB seasonal harvest milestones"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold hover:bg-stone-300 transition-colors"
          >
            {language === "rw" ? "Funga" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
