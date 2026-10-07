import React, { useState, useEffect, useMemo } from "react";
import { Language } from "../types";
import {
  CheckCircle2,
  Circle,
  Plus,
  RotateCcw,
  Sparkles,
  Droplets,
  Eye,
  QrCode,
  Receipt,
  CloudSun,
  FlaskConical,
  Trophy,
  Check,
  ChevronRight,
  Flame,
} from "lucide-react";

export interface DailyGoalItem {
  id: string;
  titleRw: string;
  titleEn: string;
  category: "irrigation" | "crops" | "qr" | "finance" | "weather" | "nutrients" | "custom";
  completed: boolean;
  actionTab?: string;
  quickActionLabelRw?: string;
  quickActionLabelEn?: string;
}

interface DailyFarmGoalsCardProps {
  language: Language;
  onNavigate?: (tab: any) => void;
  onOpenSoilMap?: () => void;
  onOpenCropDoctor?: () => void;
  onOpenScanNewQr?: () => void;
}

const STORAGE_PREFIX = "terimbere_daily_goals_";

export const DailyFarmGoalsCard: React.FC<DailyFarmGoalsCardProps> = ({
  language,
  onNavigate,
  onOpenSoilMap,
  onOpenCropDoctor,
  onOpenScanNewQr,
}) => {
  const todayKey = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const defaultGoals: DailyGoalItem[] = useMemo(
    () => [
      {
        id: "goal-moisture-01",
        titleRw: "Genzura ubuhehere bw'ubutaka & ibikoresho byo kuhira",
        titleEn: "Check soil moisture & drip irrigation valves",
        category: "irrigation",
        completed: false,
        actionTab: "dashboard",
        quickActionLabelRw: "Genzura Ubuhehere",
        quickActionLabelEn: "Inspect Soil",
      },
      {
        id: "goal-scout-02",
        titleRw: "Suzuma ubuzima bw'ibihingwa & shaka udukoko ku mababi",
        titleEn: "Verify crop status & scout leaves for pests/fungus",
        category: "crops",
        completed: false,
        actionTab: "cropDoctor",
        quickActionLabelRw: "Crop Doctor",
        quickActionLabelEn: "Crop Doctor",
      },
      {
        id: "goal-qr-03",
        titleRw: "Genzura ibyapa by'umurima & sikana QR markers",
        titleEn: "Inspect parcel signposts & scan QR markers",
        category: "qr",
        completed: false,
        quickActionLabelRw: "Sikana QR",
        quickActionLabelEn: "Scan QR",
      },
      {
        id: "goal-finance-04",
        titleRw: "Andika amafaranga yasohotse cyangwa abakozi bakoze",
        titleEn: "Log daily farm expenses or worker attendance",
        category: "finance",
        completed: false,
        actionTab: "expenses",
        quickActionLabelRw: "Andika Imari",
        quickActionLabelEn: "Log Expense",
      },
      {
        id: "goal-weather-05",
        titleRw: "Reba iteganyagihe ry'imvura n'izuba ry'uyu munsi",
        titleEn: "Confirm weather forecast & rainfall advisory",
        category: "weather",
        completed: false,
        actionTab: "marketWeather",
        quickActionLabelRw: "Iteganyagihe",
        quickActionLabelEn: "Weather",
      },
      {
        id: "goal-nutrients-06",
        titleRw: "Genzura ingengabihe y'ifumbire n'imikurire y'ibihingwa",
        titleEn: "Review fertilizer schedule & growth milestones",
        category: "nutrients",
        completed: false,
        actionTab: "plans",
        quickActionLabelRw: "Ingengabihe",
        quickActionLabelEn: "Farm Plans",
      },
    ],
    []
  );

  const [goals, setGoals] = useState<DailyGoalItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${todayKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return defaultGoals;
  });

  const [newGoalText, setNewGoalText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Persist goals for today
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${todayKey}`, JSON.stringify(goals));
    } catch {
      // ignore
    }
  }, [goals, todayKey]);

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const handleAddCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGoalText.trim();
    if (!trimmed) return;

    const newItem: DailyGoalItem = {
      id: `goal-custom-${Date.now()}`,
      titleRw: trimmed,
      titleEn: trimmed,
      category: "custom",
      completed: false,
    };

    setGoals((prev) => [...prev, newItem]);
    setNewGoalText("");
    setIsAdding(false);
  };

  const handleResetGoals = () => {
    setGoals(defaultGoals);
  };

  // Calculations for Progress Ring
  const totalCount = goals.length;
  const completedCount = goals.filter((g) => g.completed).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  // SVG circular progress metrics
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getCategoryIcon = (category: DailyGoalItem["category"]) => {
    switch (category) {
      case "irrigation":
        return <Droplets className="w-4 h-4 text-sky-500" />;
      case "crops":
        return <Eye className="w-4 h-4 text-emerald-500" />;
      case "qr":
        return <QrCode className="w-4 h-4 text-amber-500" />;
      case "finance":
        return <Receipt className="w-4 h-4 text-violet-500" />;
      case "weather":
        return <CloudSun className="w-4 h-4 text-blue-500" />;
      case "nutrients":
        return <FlaskConical className="w-4 h-4 text-teal-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-sm relative overflow-hidden transition-all">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <span>{language === "rw" ? "Intego n'Inshingano z'Umunsi" : "Daily Farm Goals"}</span>
                {completedCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                    <Flame className="w-3 h-3 text-amber-500" />
                    {completedCount}/{totalCount}
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Koresha iyi lisiti y'inshingano z'ingenzi z'uyu munsi kugira ngo umusaruro wiyongere"
                  : "Quickly checklist essential agronomy tasks to ensure field resilience and crop health"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === "rw" ? "Ongeraho Intego" : "Add Goal"}</span>
          </button>
          <button
            type="button"
            onClick={handleResetGoals}
            title={language === "rw" ? "Subiza ku Ntego z'Ibanze" : "Reset to Default Goals"}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Ring and Metrics Row */}
      <div className="p-4 rounded-2xl bg-linear-to-r from-emerald-50/70 via-stone-50 to-amber-50/50 dark:from-emerald-950/20 dark:via-stone-900 dark:to-amber-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col sm:flex-row items-center justify-between gap-5 mb-5 relative z-10">
        <div className="flex items-center gap-4">
          {/* Circular SVG Progress Ring */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 96 96">
              {/* Background circle track */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-stone-200 dark:stroke-stone-800"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={isAllComplete ? "#10B981" : percentage >= 50 ? "#059669" : "#F59E0B"}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {isAllComplete ? (
                <Trophy className="w-6 h-6 text-amber-500 animate-bounce" />
              ) : (
                <>
                  <span className="text-xl font-black text-stone-900 dark:text-white leading-none">
                    {percentage}%
                  </span>
                  <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 mt-0.5">
                    {completedCount}/{totalCount}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Motivational Text */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {language === "rw" ? "Umunsi w'Uyu Munsi" : "Today's Agronomy Routine"}
              </span>
              <span className="text-[11px] text-stone-400">({todayKey})</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
              {isAllComplete
                ? language === "rw"
                  ? "🎉 Birashimishije! Intego zose z'umunsi zagezweho neza!"
                  : "🎉 Outstanding! All daily farm goals completed today!"
                : percentage >= 50
                ? language === "rw"
                  ? "Uri kugana ku musozo! Hasigaye inshingano nkeya."
                  : "Great progress! More than halfway through today's routine."
                : language === "rw"
                ? "Tangira ugenzura umurima kugira ngo ugere ku ntego."
                : "Check off your priority field tasks as you inspect parcels today."}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? `${completedCount} kuri ${totalCount} byarangiye (${percentage}%)`
                : `${completedCount} of ${totalCount} essential tasks completed (${percentage}%)`}
            </p>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200 dark:border-stone-800">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            {language === "rw" ? "Uko Bihagaze" : "Status"}
          </div>
          <div
            className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
              isAllComplete
                ? "bg-emerald-500 text-white shadow-xs"
                : percentage > 0
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
            }`}
          >
            {isAllComplete
              ? language === "rw"
                ? "Byuzuye 100%"
                : "Completed 100%"
              : `${percentage}% ${language === "rw" ? "Byarangiye" : "Done"}`}
          </div>
        </div>
      </div>

      {/* Add Custom Goal Inline Form */}
      {isAdding && (
        <form onSubmit={handleAddCustomGoal} className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newGoalText}
            onChange={(e) => setNewGoalText(e.target.value)}
            placeholder={
              language === "rw"
                ? "Andika intego yindi wifuza gushyiraho..."
                : "Enter custom daily goal (e.g. Clean storage crates)..."
            }
            className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#064E3B] text-white hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            {language === "rw" ? "Bika" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
          >
            {language === "rw" ? "Reka" : "Cancel"}
          </button>
        </form>
      )}

      {/* Checklist Tasks List */}
      <div className="space-y-2.5 relative z-10">
        {goals.map((goal) => {
          const isDone = goal.completed;
          const title = language === "rw" ? goal.titleRw : goal.titleEn;
          const quickLabel =
            language === "rw" ? goal.quickActionLabelRw : goal.quickActionLabelEn;

          return (
            <div
              key={goal.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isDone
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 opacity-80"
                  : "bg-stone-50/70 dark:bg-stone-850 border-stone-200 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              {/* Left Checkbox and Title */}
              <button
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className="flex items-center gap-3 text-left flex-1 cursor-pointer group"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : "border-2 border-stone-300 dark:border-stone-600 group-hover:border-emerald-500"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="shrink-0">{getCategoryIcon(goal.category)}</span>
                  <span
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isDone
                        ? "line-through text-stone-400 dark:text-stone-500"
                        : "text-stone-800 dark:text-stone-200"
                    }`}
                  >
                    {title}
                  </span>
                </div>
              </button>

              {/* Right Quick Action Shortcut (if available) */}
              {quickLabel && (
                <button
                  type="button"
                  onClick={() => {
                    if (goal.category === "qr" && onOpenScanNewQr) {
                      onOpenScanNewQr();
                    } else if (goal.actionTab === "cropDoctor" && onOpenCropDoctor) {
                      onOpenCropDoctor();
                    } else if (goal.actionTab && onNavigate) {
                      onNavigate(goal.actionTab);
                    }
                  }}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer shrink-0"
                >
                  <span>{quickLabel}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
