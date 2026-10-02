import React, { useEffect, useState } from "react";
import { Language, ScheduledActivityAlert } from "../types";
import {
  Bell,
  CheckCircle2,
  Droplets,
  Sprout,
  X,
  Clock,
  ArrowRight,
  Volume2,
} from "lucide-react";
import { playNotificationChime } from "../utils/activityAlerts";

export interface PushAlertEventDetail {
  alert: ScheduledActivityAlert;
  title: string;
  message: string;
  timestamp: string;
}

interface SimulatedPushNotificationToastProps {
  language: Language;
  onCompleteActivity?: (activityId: string) => void;
  onNavigateToActivities?: () => void;
}

export const SimulatedPushNotificationToast: React.FC<SimulatedPushNotificationToastProps> = ({
  language,
  onCompleteActivity,
  onNavigateToActivities,
}) => {
  const [activeAlert, setActiveAlert] = useState<PushAlertEventDetail | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PushAlertEventDetail>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
        setIsVisible(true);
      }
    };

    window.addEventListener("terimbere:push_alert", handlePushEvent);
    return () => {
      window.removeEventListener("terimbere:push_alert", handlePushEvent);
    };
  }, []);

  // Auto hide after 9 seconds
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, [isVisible, activeAlert]);

  if (!isVisible || !activeAlert) return null;

  const { alert, title, message } = activeAlert;
  const isFertilizer = alert.category === "fertilizing";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg transition-all duration-300 animate-in slide-in-from-top-4 fade-in">
      <div className="rounded-2xl bg-stone-900/95 dark:bg-stone-900/98 backdrop-blur-md text-white border border-stone-700/80 shadow-2xl p-4 sm:p-4.5">
        {/* Top bar simulating phone push notification */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-800/80 mb-2.5">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white text-[10px] font-black">
              T
            </div>
            <span className="text-[11px] font-black tracking-wider text-emerald-400 uppercase">
              TERIMBERE • {language === "rw" ? "UBU HANO" : "PUSH NOTIFICATION"}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => playNotificationChime()}
              title="Play sound chime again"
              className="p-1 rounded-md text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex items-start space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isFertilizer
                ? "bg-gradient-to-br from-emerald-600 to-amber-600 text-white"
                : "bg-gradient-to-br from-sky-600 to-blue-700 text-white"
            }`}
          >
            {isFertilizer ? <Sprout className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h4 className="text-sm font-bold text-white truncate">{title}</h4>
              <span
                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                  alert.daysRemaining === 3
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : alert.daysRemaining === 0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-stone-700 text-stone-300"
                }`}
              >
                {alert.daysRemaining === 0
                  ? language === "rw"
                    ? "Uyu Munsi"
                    : "Today"
                  : language === "rw"
                  ? `Iminsi ${alert.daysRemaining} isigaye`
                  : `${alert.daysRemaining} Days Left`}
              </span>
            </div>

            <p className="text-xs text-stone-300 mt-1 line-clamp-2 leading-relaxed">
              {message}
            </p>

            {alert.suggestedInput && (
              <div className="mt-2 text-[11px] text-emerald-300 font-medium bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                💡 {alert.suggestedInput}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-stone-800/80">
          <div className="text-[10px] text-stone-400">
            {alert.farmName} • {alert.dueDate}
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToActivities && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onNavigateToActivities();
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors flex items-center space-x-1"
              >
                <span>{language === "rw" ? "Reba Gahunda" : "View Schedule"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {onCompleteActivity && (
              <button
                onClick={() => {
                  onCompleteActivity(alert.activityId);
                  setIsVisible(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-xs ${
                  isFertilizer
                    ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white"
                }`}
              >
                {isFertilizer ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Droplets className="w-3.5 h-3.5" />
                )}
                <span>
                  {isFertilizer
                    ? language === "rw"
                      ? "Yarangiye"
                      : "Mark Done"
                    : language === "rw"
                    ? "Nuhiriye Ubu"
                    : "Watered Now"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
