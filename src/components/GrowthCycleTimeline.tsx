import React, { useState, useMemo } from "react";
import { FarmPlan, Language } from "../types";
import {
  Sprout,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Scale,
  MapPin,
  Timer,
} from "lucide-react";

interface GrowthCycleTimelineProps {
  plans: FarmPlan[];
  language: Language;
  onSelectPlan?: (planId: string) => void;
  onUpdateProgress?: (
    planId: string,
    percentage: number,
    stageName: string,
    notes?: string
  ) => void;
}

interface ComputedPlanTimeline {
  plan: FarmPlan;
  plantedDateFormatted: string;
  harvestDateFormatted: string;
  totalCycleDays: number;
  daysElapsed: number;
  daysRemaining: number;
  computedProgressPct: number;
  urgencyLevel: "harvest_imminent" | "approaching" | "on_track" | "completed";
  currentPhaseLabel: string;
  nextMilestoneLabel: string;
}

const GROWTH_MILESTONES = [
  { pct: 0, labelRw: "Gutera", labelEn: "Planting", labelFr: "Semis" },
  { pct: 25, labelRw: "Kumeza", labelEn: "Sprouting", labelFr: "Levée" },
  { pct: 50, labelRw: "Gukura", labelEn: "Vegetative", labelFr: "Croissance" },
  { pct: 75, labelRw: "Kuzana Imbuto", labelEn: "Maturation", labelFr: "Maturation" },
  { pct: 100, labelRw: "Gusarura", labelEn: "Harvest", labelFr: "Récolte" },
];

function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function formatReadableDate(dateStr: string | undefined, language: Language): string {
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr || "—";
  const locale = language === "rw" ? "en-GB" : language === "fr" ? "fr-FR" : "en-US";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPhaseLabelForPercentage(pct: number, language: Language): string {
  if (pct >= 95) {
    return language === "rw"
      ? "Igihe cyo Gusarura (Harvest Ready)"
      : language === "fr"
      ? "Prêt pour la récolte"
      : "Ready for Harvest";
  }
  if (pct >= 75) {
    return language === "rw"
      ? "Guhisha no Gukomera (Maturation & Bulking)"
      : language === "fr"
      ? "Maturation et remplissage"
      : "Maturation & Bulking Stage";
  }
  if (pct >= 45) {
    return language === "rw"
      ? "Gukura kw'Ibibabi n'Ururabo (Vegetative & Flowering)"
      : language === "fr"
      ? "Croissance végétative et floraison"
      : "Vegetative & Flowering Stage";
  }
  if (pct >= 15) {
    return language === "rw"
      ? "Kumeza no Gufata Imizi (Sprouting & Rooting)"
      : language === "fr"
      ? "Germination et enracinement"
      : "Sprouting & Root Establishment";
  }
  return language === "rw"
    ? "Gutera Imbuto (Initial Planting)"
    : language === "fr"
    ? "Semis initial"
    : "Initial Planting Stage";
}

export const GrowthCycleTimeline: React.FC<GrowthCycleTimelineProps> = ({
  plans,
  language,
  onSelectPlan,
  onUpdateProgress,
}) => {
  const [sortBy, setSortBy] = useState<"daysRemaining" | "progress">("daysRemaining");
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const computedTimelines = useMemo<ComputedPlanTimeline[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const items = plans.map((plan) => {
      const plantedDate = parseDateSafe(plan.plantedDate);
      const harvestDate = parseDateSafe(plan.predictedHarvestDate);

      let totalCycleDays = plan.daysToMaturity || 90;
      let daysRemaining = 30;
      let daysElapsed = 60;

      if (plantedDate && harvestDate) {
        const diffTotal = Math.round(
          (harvestDate.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffTotal > 0) {
          totalCycleDays = diffTotal;
        }
        daysRemaining = Math.max(
          0,
          Math.ceil((harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
        daysElapsed = Math.max(
          0,
          Math.min(
            totalCycleDays,
            Math.floor((now.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24))
          )
        );
      } else if (harvestDate) {
        daysRemaining = Math.max(
          0,
          Math.ceil((harvestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        );
        daysElapsed = Math.max(0, totalCycleDays - daysRemaining);
      } else if (plan.growthStagePercentage !== undefined) {
        daysElapsed = Math.round((plan.growthStagePercentage / 100) * totalCycleDays);
        daysRemaining = Math.max(0, totalCycleDays - daysElapsed);
      }

      const dateBasedPct =
        totalCycleDays > 0
          ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalCycleDays) * 100)))
          : 0;

      const computedProgressPct =
        plan.growthStagePercentage !== undefined
          ? plan.growthStagePercentage
          : dateBasedPct;

      let urgencyLevel: ComputedPlanTimeline["urgencyLevel"] = "on_track";
      if (daysRemaining === 0 || computedProgressPct >= 100) {
        urgencyLevel = "completed";
      } else if (daysRemaining <= 5) {
        urgencyLevel = "harvest_imminent";
      } else if (daysRemaining <= 14) {
        urgencyLevel = "approaching";
      }

      const currentPhaseLabel =
        plan.currentGrowthStage ||
        getPhaseLabelForPercentage(computedProgressPct, language);

      const nextStep =
        plan.timeline && plan.timeline.length > 0
          ? plan.timeline[
              Math.min(
                plan.timeline.length - 1,
                Math.floor((computedProgressPct / 100) * plan.timeline.length)
              )
            ]?.title || "Harvesting"
          : "Harvesting";

      return {
        plan,
        plantedDateFormatted: formatReadableDate(plan.plantedDate, language),
        harvestDateFormatted: formatReadableDate(plan.predictedHarvestDate, language),
        totalCycleDays,
        daysElapsed,
        daysRemaining,
        computedProgressPct,
        urgencyLevel,
        currentPhaseLabel,
        nextMilestoneLabel: nextStep,
      };
    });

    return items.sort((a, b) => {
      if (sortBy === "daysRemaining") {
        return a.daysRemaining - b.daysRemaining;
      }
      return b.computedProgressPct - a.computedProgressPct;
    });
  }, [plans, language, sortBy]);

  // Summary metrics across all active crop plans
  const nearestHarvestDays =
    computedTimelines.length > 0
      ? Math.min(...computedTimelines.map((t) => t.daysRemaining))
      : 0;
  const avgCompletionPct =
    computedTimelines.length > 0
      ? Math.round(
          computedTimelines.reduce((acc, t) => acc + t.computedProgressPct, 0) /
            computedTimelines.length
        )
      : 0;
  const totalExpectedYieldKg = plans.reduce(
    (acc, p) => acc + (p.expectedYieldKg || 0),
    0
  );

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Widget Header */}
      <div className="p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                {language === "rw"
                  ? "INGENGABIHE Y'IMIKURIRE Y'IBIHINGWA"
                  : language === "fr"
                  ? "CHRONOLOGIE DU CYCLE DE CROISSANCE"
                  : "GROWTH CYCLE TIMELINE"}
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {plans.length}{" "}
                {language === "rw"
                  ? "Gahunda Zikora"
                  : language === "fr"
                  ? "Cycles Actifs"
                  : "Active Crop Plans"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white mt-0.5">
              {language === "rw"
                ? "urugendo rwo Gutera kugeza ku Isarura (Planting-to-Harvest Progress)"
                : language === "fr"
                ? "Suivi du Semis à la Récolte & Jours Restants"
                : "Planting-to-Harvest Timeline & Harvest Countdown"}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {language === "rw"
                ? " Buri murongo ugaragaza igihe igihingwa kimaze mu murima n'iminsi isigaye ngo gisarurwe."
                : language === "fr"
                ? "Visualisez la progression de chaque culture et le nombre de jours avant la date de récolte estimée."
                : "Visual progress bars tracking each crop from planting date to estimated harvest date with live day countdowns."}
            </p>
          </div>
        </div>

        {/* Controls: Sort + Navigate to Full Plans */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-stone-200/70 dark:bg-stone-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSortBy("daysRemaining")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                sortBy === "daysRemaining"
                  ? "bg-emerald-800 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
              }`}
            >
              {language === "rw" ? "Isarura Rya Bugufi" : "Nearest Harvest"}
            </button>
            <button
              type="button"
              onClick={() => setSortBy("progress")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                sortBy === "progress"
                  ? "bg-emerald-800 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
              }`}
            >
              {language === "rw" ? "Imikurire (%)" : "By Progress %"}
            </button>
          </div>

          {onSelectPlan && (
            <button
              type="button"
              onClick={() => onSelectPlan(plans[0]?.id || "")}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-emerald-800 dark:text-emerald-300 border border-stone-200 dark:border-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>{language === "rw" ? "Gahunda Zose" : "Manage Plans"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary KPI Strip */}
      <div className="grid grid-cols-3 divide-x divide-stone-200 dark:divide-stone-800 bg-stone-50/40 dark:bg-stone-950/40 border-b border-stone-200 dark:border-stone-800 text-xs">
        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
              {language === "rw" ? "Isarura Rya Vuba" : "Next Harvest In"}
            </span>
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {nearestHarvestDays}{" "}
              {language === "rw"
                ? nearestHarvestDays === 1
                  ? "Umunsi"
                  : "Iminsi"
                : nearestHarvestDays === 1
                ? "Day"
                : "Days"}
            </span>
          </div>
          <Timer className="w-4 h-4 text-amber-600 hidden sm:block" />
        </div>

        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
              {language === "rw" ? "Mpuzandengo y'Ikura" : "Avg. Cycle Progress"}
            </span>
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-emerald-800 dark:text-emerald-400">
              {avgCompletionPct}%
            </span>
          </div>
          <Sprout className="w-4 h-4 text-emerald-700 hidden sm:block" />
        </div>

        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
              {language === "rw" ? "Umusaruro Witeze" : "Projected Yield"}
            </span>
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-stone-900 dark:text-white">
              {totalExpectedYieldKg.toLocaleString()}{" "}
              <span className="text-xs font-bold text-stone-500">kg</span>
            </span>
          </div>
          <Scale className="w-4 h-4 text-emerald-700 hidden sm:block" />
        </div>
      </div>

      {/* Graphical Timeline Bars for Each Plan */}
      <div className="p-5 sm:p-6 space-y-5">
        {computedTimelines.map((item) => {
          const {
            plan,
            plantedDateFormatted,
            harvestDateFormatted,
            totalCycleDays,
            daysElapsed,
            daysRemaining,
            computedProgressPct,
            urgencyLevel,
            currentPhaseLabel,
            nextMilestoneLabel,
          } = item;

          const isExpanded = expandedPlanId === plan.id;
          const clampedPct = Math.max(4, Math.min(100, computedProgressPct));

          // Brand color styling based on days remaining
          const barFillClass =
            urgencyLevel === "harvest_imminent"
              ? "bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-500"
              : "bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-500";

          const countdownBadgeClass =
            urgencyLevel === "harvest_imminent"
              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700"
              : urgencyLevel === "approaching"
              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";

          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 hover:border-emerald-600/70 transition-all p-4 sm:p-5 space-y-4"
            >
              {/* Plan Top Row: Crop Name, Parcel, and Days Until Harvest Countdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      urgencyLevel === "harvest_imminent"
                        ? "bg-amber-500 text-stone-950"
                        : "bg-emerald-800 text-white"
                    }`}
                  >
                    {computedProgressPct}%
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-stone-900 dark:text-white">
                        {plan.crop}
                      </h3>
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>{plan.farmName}</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {plan.landSize} {plan.unit} · {plan.seasonCode}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 mt-0.5">
                      {language === "rw" ? "Icyiciro ugezemo:" : "Current Stage:"}{" "}
                      <span className="text-stone-700 dark:text-stone-200">
                        {currentPhaseLabel}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Days Until Estimated Harvest Date Badge */}
                <div className="flex items-center space-x-2 self-start sm:self-center">
                  <div
                    className={`px-3.5 py-2 rounded-xl border flex items-center space-x-2 ${countdownBadgeClass}`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <div className="text-right sm:text-left">
                      <div className="text-sm font-black font-mono tabular-nums leading-none">
                        {daysRemaining === 0
                          ? language === "rw"
                            ? "Igihe cyo Gusarura!"
                            : "Ready to Harvest!"
                          : language === "rw"
                          ? `Hasigaye Iminsi ${daysRemaining}`
                          : language === "fr"
                          ? `${daysRemaining} Jours Restants`
                          : `${daysRemaining} ${
                              daysRemaining === 1 ? "Day" : "Days"
                            } Until Harvest`}
                      </div>
                      <span className="text-[10px] font-semibold opacity-80 block mt-0.5 font-mono tabular-nums">
                        {language === "rw"
                          ? `Umunsi wa ${daysElapsed} / ${totalCycleDays}`
                          : `Day ${daysElapsed} of ${totalCycleDays} cycle`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphical Planting-to-Harvest Progress Bar with Stage Markers */}
              <div className="space-y-2 pt-1">
                {/* Date Endpoints Above Bar */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>
                      {language === "rw" ? "Byatewe:" : "Planted:"}{" "}
                      <strong className="text-stone-900 dark:text-white">
                        {plantedDateFormatted}
                      </strong>
                    </span>
                  </span>

                  <span className="hidden md:inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {language === "rw" ? "Igikorwa gikurikira:" : "Next Step:"}{" "}
                      {nextMilestoneLabel}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      {language === "rw" ? "Isarura Riteganyijwe:" : "Est. Harvest:"}{" "}
                      <strong className="text-stone-900 dark:text-white">
                        {harvestDateFormatted}
                      </strong>
                    </span>
                  </span>
                </div>

                {/* Graphical Timeline Track */}
                <div className="relative pt-2 pb-1">
                  {/* Main Bar Background */}
                  <div className="h-4 w-full rounded-xl bg-stone-200 dark:bg-stone-800 overflow-hidden relative shadow-inner border border-stone-300/60 dark:border-stone-700">
                    {/* Stage Tick Dividers at 25%, 50%, 75% */}
                    <div className="absolute inset-y-0 left-1/4 w-px bg-white/50 dark:bg-stone-950/50 z-10" />
                    <div className="absolute inset-y-0 left-2/4 w-px bg-white/50 dark:bg-stone-950/50 z-10" />
                    <div className="absolute inset-y-0 left-3/4 w-px bg-white/50 dark:bg-stone-950/50 z-10" />

                    {/* Graphical Progress Fill */}
                    <div
                      className={`h-full rounded-l-xl transition-all duration-500 ${barFillClass}`}
                      style={{ width: `${clampedPct}%` }}
                    />
                  </div>

                  {/* Current Position Pin Indicator */}
                  <div
                    className="absolute top-0.5 -translate-x-1/2 z-20 transition-all duration-500 pointer-events-none"
                    style={{ left: `${clampedPct}%` }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 border-white dark:border-stone-900 shadow-md flex items-center justify-center ${
                        urgencyLevel === "harvest_imminent"
                          ? "bg-amber-500"
                          : "bg-emerald-700"
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                </div>

                {/* 5 Growth Stage Checkpoints Below Bar */}
                <div className="grid grid-cols-5 text-[10px] sm:text-[11px] pt-1">
                  {GROWTH_MILESTONES.map((m, idx) => {
                    const isReached = computedProgressPct >= m.pct;
                    const alignClass =
                      idx === 0
                        ? "text-left"
                        : idx === GROWTH_MILESTONES.length - 1
                        ? "text-right"
                        : "text-center";
                    return (
                      <div key={m.pct} className={alignClass}>
                        <span
                          className={`font-bold ${
                            isReached
                              ? "text-emerald-800 dark:text-emerald-400"
                              : "text-stone-400 dark:text-stone-500"
                          }`}
                        >
                          {language === "rw"
                            ? m.labelRw
                            : language === "fr"
                            ? m.labelFr
                            : m.labelEn}
                        </span>
                        <span className="block text-[9px] font-mono text-stone-400 dark:text-stone-500">
                          {m.pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Footer: Expected Yield, Quick Stage Update & Expandable Milestones */}
              <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-stone-600 dark:text-stone-400">
                  <span>
                    {language === "rw" ? "Umusaruro witeze:" : "Expected Yield:"}{" "}
                    <strong className="font-mono tabular-nums text-stone-900 dark:text-white">
                      {plan.expectedYieldKg.toLocaleString()} kg
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {language === "rw" ? "Inyungu iteganyijwe:" : "Est. Net Profit:"}{" "}
                    <strong className="font-mono tabular-nums text-emerald-800 dark:text-emerald-400">
                      +{plan.expectedNetProfit.toLocaleString()} RWF
                    </strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPlanId(isExpanded ? null : plan.id)
                    }
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <span>
                      {language === "rw"
                        ? "Intambwe z'Ubuhinzi"
                        : "Cycle Milestones"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {onSelectPlan && (
                    <button
                      type="button"
                      onClick={() => onSelectPlan(plan.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <span>
                        {language === "rw" ? "Vugurura Ikura" : "Update Stage"}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Chronological Milestones & Quick Stage Buttons */}
              {isExpanded && (
                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3 animate-in fade-in duration-150">
                  {onUpdateProgress && (
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        {language === "rw"
                          ? "Vugurura ikigero cy'imikurire ako kanya:"
                          : "Quick-update crop growth percentage:"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[25, 50, 75, 90, 100].map((pctVal) => (
                          <button
                            key={pctVal}
                            type="button"
                            onClick={() =>
                              onUpdateProgress(
                                plan.id,
                                pctVal,
                                getPhaseLabelForPercentage(pctVal, language)
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                              computedProgressPct === pctVal
                                ? "bg-emerald-800 text-white"
                                : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-100 dark:hover:bg-emerald-950"
                            }`}
                          >
                            {pctVal}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {plan.timeline && plan.timeline.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {plan.timeline.map((stepItem, idx) => {
                        const stepThresholdPct = Math.round(
                          ((idx + 1) / plan.timeline.length) * 100
                        );
                        const isStepDone =
                          computedProgressPct >= stepThresholdPct - 10;
                        return (
                          <div
                            key={stepItem.step}
                            className={`p-3 rounded-xl border text-xs ${
                              isStepDone
                                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70"
                                : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-stone-900 dark:text-white flex items-center gap-1.5">
                                <CheckCircle2
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isStepDone
                                      ? "text-emerald-600"
                                      : "text-stone-400"
                                  }`}
                                />
                                <span>
                                  {stepItem.step}. {stepItem.title}
                                </span>
                              </span>
                              <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400">
                                {stepItem.timing}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                              {stepItem.advice}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
