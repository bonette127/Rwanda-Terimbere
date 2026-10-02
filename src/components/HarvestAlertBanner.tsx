import React from "react";
import { HarvestNotification, Language } from "../types";
import {
  Clock,
  AlertTriangle,
  Calendar,
  ShoppingBag,
  Bell,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { NavTab } from "./Navigation";

interface HarvestAlertBannerProps {
  notifications: HarvestNotification[];
  language: Language;
  onOpenNotifications: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const HarvestAlertBanner: React.FC<HarvestAlertBannerProps> = ({
  notifications,
  language,
  onOpenNotifications,
  onNavigate,
}) => {
  if (!notifications || notifications.length === 0) return null;

  // Most urgent alert
  const topAlert = notifications[0];
  const totalAlerts = notifications.length;

  const isOverdue = topAlert.urgency === "overdue";
  const isUrgent = topAlert.urgency === "urgent";

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 text-white shadow-md border transition-all ${
        isOverdue
          ? "bg-gradient-to-r from-rose-950 via-rose-900 to-stone-900 border-rose-800"
          : isUrgent
          ? "bg-gradient-to-r from-amber-950 via-amber-900 to-emerald-950 border-amber-800/80 animate-pulse-slow"
          : "bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 border-emerald-800"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side Info */}
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-xs ${
              isOverdue
                ? "bg-rose-500 text-white"
                : isUrgent
                ? "bg-amber-400 text-stone-950 animate-bounce"
                : "bg-emerald-500 text-white"
            }`}
          >
            {isOverdue ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isUrgent ? (
              <Clock className="w-6 h-6" />
            ) : (
              <Calendar className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isOverdue
                    ? "bg-rose-800 text-rose-200 border border-rose-600"
                    : isUrgent
                    ? "bg-amber-400 text-stone-950 font-black"
                    : "bg-emerald-800 text-emerald-200 border border-emerald-600"
                }`}
              >
                {isOverdue
                  ? language === "rw"
                    ? "Isarura Ryarenze Igihe"
                    : "Harvest Overdue"
                  : isUrgent
                  ? language === "rw"
                    ? `Isarura Riregereje: Iminsi ${topAlert.daysRemaining}`
                    : `Urgent: ${topAlert.daysRemaining} Days to Harvest`
                  : language === "rw"
                  ? "Iteganyagihe ry'Isarura"
                  : "Harvest Window Open"}
              </span>

              {totalAlerts > 1 && (
                <button
                  onClick={onOpenNotifications}
                  className="text-[10px] font-bold text-amber-300 hover:underline flex items-center space-x-1"
                >
                  <Bell className="w-3 h-3" />
                  <span>
                    +{totalAlerts - 1} {language === "rw" ? "andi mezi/mirima" : "more alerts"}
                  </span>
                </button>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-black text-white">
              {language === "rw" ? topAlert.titleRw : topAlert.titleEn}
            </h3>

            <p className="text-xs text-stone-200/90 max-w-2xl leading-relaxed">
              {language === "rw" ? topAlert.messageRw : topAlert.messageEn}
            </p>

            <div className="flex items-center space-x-2 text-[11px] text-emerald-300 dark:text-emerald-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="italic line-clamp-1">
                {language === "rw" ? topAlert.rabAdvisoryRw : topAlert.rabAdvisoryEn}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={() => onNavigate("harvestSales")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{language === "rw" ? "Andika Umusaruro" : "Log Harvest"}</span>
          </button>

          <button
            onClick={onOpenNotifications}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/20"
          >
            <span>{language === "rw" ? "Reba Byose" : "View All"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
