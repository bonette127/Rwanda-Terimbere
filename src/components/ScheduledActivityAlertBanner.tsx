import React, { useState } from "react";
import { Language, ScheduledActivityAlert } from "../types";
import {
  BellRing,
  Droplets,
  Sprout,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Check,
} from "lucide-react";
import { triggerActivityPushNotification } from "../utils/activityAlerts";

interface ScheduledActivityAlertBannerProps {
  alerts: ScheduledActivityAlert[];
  language: Language;
  onCompleteActivity: (activityId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  onNavigateToActivities?: () => void;
  onOpenFertilizerScheduler?: () => void;
}

export const ScheduledActivityAlertBanner: React.FC<ScheduledActivityAlertBannerProps> = ({
  alerts,
  language,
  onCompleteActivity,
  onDismissAlert,
  onNavigateToActivities,
  onOpenFertilizerScheduler,
}) => {
  const [expandedChecklistAlertId, setExpandedChecklistAlertId] = useState<string | null>(null);
  const [lastTestedAlertId, setLastTestedAlertId] = useState<string | null>(null);

  if (!alerts || alerts.length === 0) return null;

  const handleSimulatePush = async (alert: ScheduledActivityAlert) => {
    setLastTestedAlertId(alert.id);
    await triggerActivityPushNotification(alert, language);
    setTimeout(() => {
      setLastTestedAlertId(null);
    }, 4000);
  };

  const getUrgencyBadge = (alert: ScheduledActivityAlert) => {
    const days = alert.daysRemaining;
    if (alert.isThreeDaysBefore) {
      return {
        text: language === "rw" ? "🚨 Iminsi 3 Isigaye (3 Days Left - Preparatory)" : "🚨 3 Days Left (Preparatory Alert)",
        badgeClass: "bg-amber-500 text-stone-950 font-black animate-pulse",
      };
    }
    if (days === 0) {
      return {
        text: language === "rw" ? "⚡ Uyu Munsi (Due Today)" : "⚡ Due Today",
        badgeClass: "bg-rose-500 text-white font-black animate-bounce",
      };
    }
    if (days === 1) {
      return {
        text: language === "rw" ? "⏰ Ejo Hazaza (Tomorrow)" : "⏰ Due Tomorrow",
        badgeClass: "bg-amber-400 text-stone-950 font-bold",
      };
    }
    if (days === 2) {
      return {
        text:
          language === "rw"
            ? "🔔 Integuza y'Iminsi 2 Mbere (2 Days Left)"
            : "🔔 2-Day Advance Alert (2 Days Left)",
        badgeClass: "bg-amber-400 text-stone-950 font-black animate-pulse",
      };
    }
    if (days < 0) {
      return {
        text: language === "rw" ? `⚠️ Yarenze Igihe (${Math.abs(days)}d)` : `⚠️ Overdue (${Math.abs(days)}d)`,
        badgeClass: "bg-rose-700 text-white font-bold",
      };
    }
    return {
      text: language === "rw" ? `Hasigaye iminsi ${days}` : `${days} Days Left`,
      badgeClass: "bg-stone-600 text-white font-medium",
    };
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-stone-900 via-stone-850 to-emerald-950 border border-emerald-700/60 p-4 sm:p-5 text-white shadow-lg space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                {language === "rw"
                  ? "Integuza y'Iminsi 2 Mbere: Ifumbire & Kuhira (2-Day Advance Alerts)"
                  : "2-Day Advance Fertilizer & Field Activity Alerts"}
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                {alerts.length} {alerts.length === 1 ? "ALERT" : "ALERTS"}
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              {language === "rw"
                ? "Kumenyeshwa iminsi 2 mbere y'itariki yo gushyiramo ifumbire kugira ngo upime NPK/Urea kandi ugenzure ubuhehere bw'ubutaka."
                : "Automatic alerts triggered 2 days before scheduled fertilizer application dates to stage NPK/Urea and verify soil moisture."}
            </p>
          </div>
        </div>

        {/* Global Quick Test Push Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenFertilizerScheduler && (
            <button
              type="button"
              onClick={onOpenFertilizerScheduler}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-all shadow-xs active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "+ Panga Ifumbire n'Integuza (2d)"
                  : "+ Schedule Fertilizer Task"}
              </span>
            </button>
          )}

          {alerts[0] && (
            <button
              onClick={() => handleSimulatePush(alerts[0])}
              title={language === "rw" ? "Kora igerageza rya Push Notification" : "Test simulate push notification"}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs active:scale-95 border border-emerald-500/50"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {lastTestedAlertId === alerts[0].id
                  ? language === "rw"
                    ? "Yoherejwe kuri Telefoni!"
                    : "Push Sent!"
                  : language === "rw"
                  ? "Gerageza Push Notification"
                  : "Simulate Push Alert"}
              </span>
            </button>
          )}

          {onNavigateToActivities && (
            <button
              onClick={onNavigateToActivities}
              className="p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition-colors text-xs font-bold flex items-center space-x-1"
            >
              <span>{language === "rw" ? "Reba Byose" : "All"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Itemized Alert Cards */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const isFertilizer = alert.category === "fertilizing";
          const urgencyBadge = getUrgencyBadge(alert);
          const isChecklistExpanded = expandedChecklistAlertId === alert.id;
          const isTestingThis = lastTestedAlertId === alert.id;

          const title =
            language === "rw" ? alert.titleRw : language === "fr" ? alert.titleFr : alert.titleEn;
          const message =
            language === "rw"
              ? alert.messageRw
              : language === "fr"
              ? alert.messageFr
              : alert.messageEn;
          const checklist =
            language === "rw"
              ? alert.checklistRw
              : language === "fr"
              ? alert.checklistFr
              : alert.checklistEn;

          return (
            <div
              key={alert.id}
              className={`rounded-xl p-3.5 sm:p-4 border transition-all ${
                alert.daysRemaining === 2 || alert.isThreeDaysBefore
                  ? "bg-gradient-to-r from-stone-900/90 via-amber-950/40 to-stone-900/90 border-amber-500/60 ring-1 ring-amber-500/30"
                  : isFertilizer
                  ? "bg-stone-900/80 border-emerald-700/50 hover:border-emerald-500/70"
                  : "bg-stone-900/80 border-sky-700/50 hover:border-sky-500/70"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                {/* Left details */}
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isFertilizer
                        ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/40"
                        : "bg-sky-600/30 text-sky-300 border border-sky-500/40"
                    }`}
                  >
                    {isFertilizer ? (
                      <Sprout className="w-5 h-5" />
                    ) : (
                      <Droplets className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${urgencyBadge.badgeClass}`}>
                        {urgencyBadge.text}
                      </span>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isFertilizer
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-sky-950 text-sky-300 border border-sky-800"
                        }`}
                      >
                        {isFertilizer
                          ? language === "rw"
                            ? "Ifumbire (Fertilizer)"
                            : "Fertilizer"
                          : language === "rw"
                          ? "Kuhira (Irrigation)"
                          : "Irrigation"}
                      </span>

                      <span className="text-xs text-stone-400">
                        {alert.farmName} • {alert.crop}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                      {alert.title}
                    </h4>

                    <p className="text-xs text-stone-300 leading-relaxed">
                      {message}
                    </p>

                    {/* Input suggestion */}
                    {alert.suggestedInput && (
                      <div className="inline-flex items-center text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg mt-1 font-medium">
                        <Sparkles className="w-3 h-3 mr-1 text-amber-400 shrink-0" />
                        <span>{alert.suggestedInput}</span>
                      </div>
                    )}

                    {/* Due Date Indicator */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 pt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        <span>
                          {language === "rw" ? "Itariki yo Gushyiramo:" : "Scheduled Date:"}{" "}
                          <strong className="text-white font-mono">{alert.dueDate}</strong>
                        </span>
                      </span>

                      {alert.alertTriggerDate && (
                        <span className="flex items-center space-x-1 text-amber-300">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>
                            {language === "rw" ? "Integuza (Iminsi 2 Mbere):" : "2-Day Alert Trigger:"}{" "}
                            <strong className="font-mono">{alert.alertTriggerDate}</strong>
                          </span>
                        </span>
                      )}

                      {/* Expand RAB checklist toggle */}
                      <button
                        onClick={() =>
                          setExpandedChecklistAlertId(
                            isChecklistExpanded ? null : alert.id
                          )
                        }
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-0.5 underline text-[11px]"
                      >
                        <span>
                          {language === "rw"
                            ? "Amabwiriza ya RAB (4)"
                            : "RAB Checklist (4)"}
                        </span>
                        {isChecklistExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Collapsible RAB Checklist */}
                    {isChecklistExpanded && (
                      <div className="mt-2.5 p-3 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2 animate-in fade-in">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>
                            {language === "rw"
                              ? "Intambwe 4 zo kwitegura mbere y'iminsi 3 (RAB Guide):"
                              : "4-Step 3-Day Preparation Protocol (RAB Standards):"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {checklist.map((step, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-stone-300 flex items-start space-x-1.5 bg-stone-900/60 p-2 rounded-lg border border-stone-800"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right action buttons */}
                <div className="flex flex-wrap md:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 md:pt-0">
                  {/* Simulate Push notification button */}
                  <button
                    onClick={() => handleSimulatePush(alert)}
                    title={language === "rw" ? "Ohereza Push Notification kuri telefoni" : "Simulate Push Notification"}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
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
                        : "Simulate Push"}
                    </span>
                  </button>

                  {/* Mark Completed Button */}
                  <button
                    onClick={() => onCompleteActivity(alert.activityId)}
                    title={language === "rw" ? "Kanda hano niba iki gikorwa cyarangiye" : "Mark activity as completed"}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-xs active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === "rw" ? "Yarangiye" : "Complete"}</span>
                  </button>

                  {/* Dismiss / Snooze alert button */}
                  {onDismissAlert && (
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      title={language === "rw" ? "Hisha iyi nteguza by'agateganyo" : "Dismiss / snooze alert"}
                      className="text-[11px] text-stone-400 hover:text-stone-200 px-2 py-1 transition-colors"
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
    </div>
  );
};
