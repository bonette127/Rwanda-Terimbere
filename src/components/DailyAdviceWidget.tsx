import React, { useState } from "react";
import { Language, DailyAgronomyTip } from "../types";
import {
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Leaf,
  Info,
} from "lucide-react";

interface DailyAdviceWidgetProps {
  language: Language;
  tips: DailyAgronomyTip[];
  onAcknowledgeTip: (tipId: string) => void;
}

export const DailyAdviceWidget: React.FC<DailyAdviceWidgetProps> = ({
  language,
  tips,
  onAcknowledgeTip,
}) => {
  const [selectedTip, setSelectedTip] = useState<DailyAgronomyTip>(tips[0] || null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  if (!tips || tips.length === 0) return null;

  const currentTip = selectedTip || tips[0];

  return (
    <>
      {/* Prominent Daily Advisory Card */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border shadow-xs transition-all ${
          currentTip.alertLevel === "warning"
            ? "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-900/60"
            : currentTip.alertLevel === "caution"
            ? "bg-amber-500/5 border-amber-400/30 dark:bg-amber-950/20"
            : "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/30 dark:border-emerald-900/60"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                currentTip.alertLevel === "warning"
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-stone-900/10 dark:bg-white/10 text-stone-900 dark:text-white">
                  {language === "rw" ? "Inama y'Umunsi yo Kwirinda" : "Daily Prevention Advisory"}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {currentTip.date}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-stone-900 dark:text-white font-display mt-0.5">
                {language === "rw" ? currentTip.titleRw : currentTip.titleEn}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                currentTip.alertLevel === "warning"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {currentTip.alertLevel === "warning"
                ? language === "rw" ? "IBURIRA RIHANITSE" : "HIGH ALERT"
                : language === "rw" ? "INAMA Y'IBANZE" : "ROUTINE TIP"}
            </span>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-xs text-stone-600 dark:text-stone-300 hover:text-emerald-600 font-bold underline px-2 py-1"
            >
              {language === "rw" ? "Izindi nama" : "Past Tips"}
            </button>
          </div>
        </div>

        {/* Advisory Body */}
        <div className="mt-4 space-y-3">
          <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
            {language === "rw" ? currentTip.preventionAdviceRw : currentTip.preventionAdviceEn}
          </p>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-800/80 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-stone-900 dark:text-white block font-bold">
                {language === "rw" ? "Icyo gukora uyu munsi:" : "Action for today:"}
              </strong>
              <span className="text-stone-700 dark:text-stone-300">
                {currentTip.actionItemRw}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Amabwiriza ya RAB ({currentTip.rabAdvisoryCode})</span>
              <span>•</span>
              <span>{currentTip.cropCategory}</span>
            </div>

            <button
              type="button"
              onClick={() => onAcknowledgeTip(currentTip.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 ${
                currentTip.acknowledged
                  ? "bg-stone-200 dark:bg-stone-800 text-stone-500 cursor-default"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {currentTip.acknowledged
                  ? language === "rw" ? "Mwashyize mu bikorwa" : "Applied"
                  : language === "rw" ? "Nabyumvise / Shyira mu bikorwa" : "Acknowledge & Apply"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                <BellRing className="w-5 h-5" />
                <h3 className="font-bold text-base text-stone-900 dark:text-white font-display">
                  {language === "rw" ? "Inama z'Ubuhinzi zose zo Kwirinda Indwara" : "Daily Prevention Advice Archive"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  onClick={() => {
                    setSelectedTip(tip);
                    setShowHistoryModal(false);
                  }}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-900 dark:text-white">
                      {language === "rw" ? tip.titleRw : tip.titleEn}
                    </span>
                    <span className="text-[10px] text-stone-400">{tip.date}</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2">
                    {language === "rw" ? tip.preventionAdviceRw : tip.preventionAdviceEn}
                  </p>
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <span>{tip.cropCategory}</span>
                    <span>•</span>
                    <span>{tip.rabAdvisoryCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
