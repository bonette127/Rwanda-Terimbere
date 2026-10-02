import React, { useState, useEffect } from "react";
import { FarmPlan, Language } from "../types";
import {
  Sprout,
  CheckCircle2,
  Sliders,
  Sparkles,
  Calendar,
  AlertCircle,
  TrendingUp,
  Save,
  RotateCcw,
  Info,
  ChevronRight,
} from "lucide-react";
import {
  getGrowthStageDetails,
  CROP_GROWTH_MILESTONES,
  GrowthStageInfo,
} from "../utils/growthTracking";

interface GrowthProgressTrackerProps {
  plan: FarmPlan;
  language: Language;
  onUpdateProgress: (
    planId: string,
    percentage: number,
    stageName?: string,
    notes?: string
  ) => void;
  variant?: "full" | "compact" | "card_bar";
  onOpenFullEditor?: () => void;
}

export const GrowthProgressTracker: React.FC<GrowthProgressTrackerProps> = ({
  plan,
  language,
  onUpdateProgress,
  variant = "full",
  onOpenFullEditor,
}) => {
  const currentPct = plan.growthStagePercentage ?? 0;
  const [sliderValue, setSliderValue] = useState<number>(currentPct);
  const [stageNotes, setStageNotes] = useState<string>(plan.stageNotes || "");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // Keep local state in sync when plan changes
  useEffect(() => {
    setSliderValue(plan.growthStagePercentage ?? 0);
    setStageNotes(plan.stageNotes || "");
  }, [plan.growthStagePercentage, plan.stageNotes]);

  const previewInfo: GrowthStageInfo = getGrowthStageDetails(
    plan.crop,
    isEditing ? sliderValue : currentPct,
    language
  );

  const handleSave = () => {
    onUpdateProgress(plan.id, sliderValue, previewInfo.stageName, stageNotes.trim());
    setIsSavedRecently(true);
    setIsEditing(false);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  const handleReset = () => {
    setSliderValue(currentPct);
    setStageNotes(plan.stageNotes || "");
    setIsEditing(false);
  };

  const handleMilestoneClick = (targetPct: number) => {
    setSliderValue(targetPct);
    if (!isEditing) setIsEditing(true);
  };

  // If card_bar variant: show elegant progress bar for collapsed plan cards or summary rows
  if (variant === "card_bar") {
    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5">
            <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-stone-700 dark:text-stone-300">
              {language === "rw" ? "Imikurire:" : "Growth:"}
            </span>
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              {previewInfo.stageName}
            </span>
          </div>
          <span className="font-black text-xs text-stone-900 dark:text-white px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
            {currentPct}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-200 dark:border-stone-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${previewInfo.progressGradient} transition-all duration-500`}
            style={{ width: `${Math.max(4, Math.min(100, currentPct))}%` }}
          />
        </div>
      </div>
    );
  }

  // If compact variant: for dashboard widget list
  if (variant === "compact") {
    return (
      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
              <span>{plan.crop}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {plan.seasonCode}
              </span>
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {plan.farmName} • {previewInfo.stageName}
            </p>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
              {currentPct}%
            </span>
          </div>
        </div>

        <div className="h-2.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-200 dark:border-stone-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${previewInfo.progressGradient} transition-all duration-500`}
            style={{ width: `${Math.max(4, Math.min(100, currentPct))}%` }}
          />
        </div>

        {onOpenFullEditor && (
          <div className="flex justify-end pt-1">
            <button
              onClick={onOpenFullEditor}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>{language === "rw" ? "Hindura urugero" : "Update stage"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full Variant: Comprehensive interactive tracker & manual updater
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                {language === "rw"
                  ? "Gukurikirana Imikurire y'Igihingwa (Growth Progress Tracking)"
                  : "Crop Growth Progress Tracking"}
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${previewInfo.badgeBg} ${previewInfo.badgeText}`}
              >
                {previewInfo.stageCategory.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {language === "rw"
                ? "Hindura urugero rw'imikurire (0-100%) kugira ngo uhuze gahunda n'uko umurima uhagaze ubu."
                : "Manually update the growth percentage (0-100%) to reflect the real stage in your field."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-colors shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Hindura Iterambere" : "Update Progress"}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 transition-colors"
              >
                {language === "rw" ? "Kureka" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Bika Iterambere" : "Save Progress"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Visual Progress Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
          <div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
              {language === "rw" ? "Icyiciro cy'Imikurire kiriho" : "Current Growth Stage"}
            </span>
            <span className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
              {previewInfo.stageName}
            </span>
          </div>

          <div className="flex items-baseline space-x-1 sm:text-right">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {isEditing ? sliderValue : currentPct}%
            </span>
            <span className="text-xs font-bold text-stone-400">
              {isEditing && sliderValue !== currentPct
                ? `(Ubu: ${currentPct}%)`
                : "/ 100%"}
            </span>
          </div>
        </div>

        {/* The Visual Bar with Tick Marks */}
        <div className="relative pt-1 pb-4">
          <div className="h-4 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-200 dark:border-stone-700 relative">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${previewInfo.progressGradient} transition-all duration-300 relative`}
              style={{
                width: `${Math.max(2, Math.min(100, isEditing ? sliderValue : currentPct))}%`,
              }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Milestone markers on track */}
          <div className="relative w-full flex justify-between mt-1 text-[10px] font-bold text-stone-400 px-1 select-none">
            <span className="cursor-pointer hover:text-emerald-600" onClick={() => handleMilestoneClick(0)}>
              0% Gutera
            </span>
            <span className="cursor-pointer hover:text-emerald-600" onClick={() => handleMilestoneClick(25)}>
              25% Kubagara
            </span>
            <span className="cursor-pointer hover:text-emerald-600" onClick={() => handleMilestoneClick(50)}>
              50% Kurabyo
            </span>
            <span className="cursor-pointer hover:text-emerald-600" onClick={() => handleMilestoneClick(75)}>
              75% Guhisha
            </span>
            <span className="cursor-pointer hover:text-emerald-600" onClick={() => handleMilestoneClick(100)}>
              100% Isarura
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls when Editing */}
      {isEditing && (
        <div className="p-4 sm:p-5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-emerald-200 dark:border-emerald-800/60 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>
                {language === "rw"
                  ? "Kurura umurongo cyangwa winjize ijanisha (0 - 100%):"
                  : "Slide or type percentage (0 - 100%):"}
              </span>
            </label>

            {/* Step adjustment buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setSliderValue((v) => Math.max(0, v - 5))}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600 font-bold text-xs hover:bg-stone-100 active:scale-95"
              >
                -5%
              </button>
              <button
                type="button"
                onClick={() => setSliderValue((v) => Math.max(0, v - 1))}
                className="px-2 py-1 rounded-lg bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600 font-bold text-xs hover:bg-stone-100 active:scale-95"
              >
                -1%
              </button>
              <input
                type="number"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setSliderValue(Math.max(0, Math.min(100, val)));
                }}
                className="w-16 px-2 py-1 text-center font-black text-sm rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-emerald-800 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-xs font-bold text-stone-500">%</span>
              <button
                type="button"
                onClick={() => setSliderValue((v) => Math.min(100, v + 1))}
                className="px-2 py-1 rounded-lg bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600 font-bold text-xs hover:bg-stone-100 active:scale-95"
              >
                +1%
              </button>
              <button
                type="button"
                onClick={() => setSliderValue((v) => Math.min(100, v + 5))}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600 font-bold text-xs hover:bg-stone-100 active:scale-95"
              >
                +5%
              </button>
            </div>
          </div>

          {/* The Range Slider */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full h-3 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-700"
          />

          {/* Quick Milestone Shortcut Buttons */}
          <div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block mb-2 uppercase tracking-wider">
              {language === "rw"
                ? "Hitamo icyiciro cy'ingenzi byihuse (Quick Milestones):"
                : "Quick Stage Milestones:"}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CROP_GROWTH_MILESTONES.map((milestone) => {
                const isSelected = sliderValue === milestone.percentage;
                return (
                  <button
                    key={milestone.percentage}
                    type="button"
                    onClick={() => setSliderValue(milestone.percentage)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-500/50"
                        : "bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:border-emerald-400"
                    }`}
                  >
                    <span className="font-extrabold block">
                      {milestone.percentage}%
                    </span>
                    <span
                      className={`text-[11px] font-medium leading-tight line-clamp-2 mt-1 ${
                        isSelected ? "text-emerald-100" : "text-stone-500 dark:text-stone-400"
                      }`}
                    >
                      {language === "rw" ? milestone.labelRw : milestone.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Stage Notes */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
              {language === "rw"
                ? "Ibyo wabonye mu murima (Ibyitonderwa / Notes):"
                : "Field Observations & Notes:"}
            </label>
            <input
              type="text"
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              placeholder={
                language === "rw"
                  ? "Urugero: Ibibabi biragenda bikura neza, nta ndwara y'urume yagaragaye..."
                  : "e.g., Healthy leaf expansion, good moisture, no signs of pest damage..."
              }
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-200 dark:border-stone-700">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold hover:bg-stone-300 transition-colors"
            >
              {language === "rw" ? "Kureka" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-200" />
              <span>
                {language === "rw"
                  ? `Emeza Iterambere (${sliderValue}%)`
                  : `Save Progress (${sliderValue}%)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Agronomic Advisory for Current / Previewed Stage */}
      <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
        <div className="flex items-start space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-black text-emerald-900 dark:text-emerald-200">
                {language === "rw"
                  ? "Inama ya RAB ku cyiciro cy'ubu:"
                  : "RAB Agronomic Guidance for Current Stage:"}
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {previewInfo.stageName}
              </span>
            </div>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
              {previewInfo.agronomicAdvice}
            </p>
          </div>
        </div>

        {plan.stageNotes && !isEditing && (
          <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-start space-x-2 text-xs">
            <span className="font-bold text-stone-500 dark:text-stone-400 shrink-0">
              {language === "rw" ? "Ibyanditswe mu murima:" : "Field Notes:"}
            </span>
            <span className="text-stone-800 dark:text-stone-200 italic">
              "{plan.stageNotes}"
            </span>
          </div>
        )}

        {plan.lastStageUpdated && (
          <div className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center space-x-1 pt-1">
            <Calendar className="w-3 h-3" />
            <span>
              {language === "rw" ? "Iheruka kuvugururwa:" : "Last updated:"}{" "}
              {plan.lastStageUpdated}
            </span>
          </div>
        )}
      </div>

      {/* Success Notification Pill */}
      {isSavedRecently && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>
            {language === "rw"
              ? `Imikurire y'igihingwa yabitswe neza kuri ${plan.growthStagePercentage}%!`
              : `Crop growth progress successfully recorded at ${plan.growthStagePercentage}%!`}
          </span>
        </div>
      )}
    </div>
  );
};
