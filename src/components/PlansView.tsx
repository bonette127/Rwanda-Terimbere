import React, { useState } from "react";
import { Farm, FarmPlan, Language } from "../types";
import { getTranslation } from "../i18n";
import {
  ClipboardList,
  Plus,
  Sparkles,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  Bell,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { evaluateHarvestAlert, extractPredictedHarvestDate } from "../utils/harvestNotifications";
import { GrowthProgressTracker } from "./GrowthProgressTracker";
import { Sprout } from "lucide-react";
import { buildGoogleCalendarUrl, normalizeDateToIso } from "../utils/plantingCalendarExport";

interface PlansViewProps {
  plans: FarmPlan[];
  farms: Farm[];
  language: Language;
  onAddPlan: (plan: FarmPlan) => void;
  onDeletePlan: (id: string) => void;
  onUpdatePlan?: (plan: FarmPlan) => void;
  onUpdateProgress?: (
    planId: string,
    percentage: number,
    stageName?: string,
    notes?: string
  ) => void;
  onOpenCalendarExport?: () => void;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  farms,
  language,
  onAddPlan,
  onDeletePlan,
  onUpdatePlan,
  onUpdateProgress,
  onOpenCalendarExport,
}) => {
  const t = getTranslation(language);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(plans[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleUpdateProgress = (
    planId: string,
    percentage: number,
    stageName?: string,
    notes?: string
  ) => {
    if (onUpdateProgress) {
      onUpdateProgress(planId, percentage, stageName, notes);
    } else if (onUpdatePlan) {
      const existing = plans.find((p) => p.id === planId);
      if (existing) {
        onUpdatePlan({
          ...existing,
          growthStagePercentage: percentage,
          currentGrowthStage: stageName || existing.currentGrowthStage,
          stageNotes: notes !== undefined ? notes : existing.stageNotes,
          lastStageUpdated: new Date().toISOString().split("T")[0],
        });
      }
    }
  };

  // Form state
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [crop, setCrop] = useState("Ibirayi (Kinigi)");
  const [landSize, setLandSize] = useState("0.5");
  const [unit, setUnit] = useState("hegitari");
  const [budget, setBudget] = useState("500000");
  const [district, setDistrict] = useState("Musanze");
  const [seasonCode, setSeasonCode] = useState("2026A");

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingAi(true);
    setAiError(null);

    const farm = farms.find((f) => f.id === selectedFarmId) || farms[0];
    const farmName = farm ? farm.name : "Umurima Mushya";

    try {
      const res = await fetch("/api/gemini/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop,
          landSize: parseFloat(landSize) || 0.5,
          unit,
          budget: parseFloat(budget) || 500000,
          district: farm ? farm.district : district,
          season: seasonCode,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate plan from server");
      }

      const data = await res.json();
      const planResult = data.plan;

      const newPlan: FarmPlan = {
        id: "plan-" + Date.now(),
        farmId: selectedFarmId || (farm ? farm.id : "farm-1"),
        farmName,
        crop: planResult.crop || crop,
        seasonCode,
        landSize: planResult.landSize || parseFloat(landSize),
        unit: planResult.unit || unit,
        budget: planResult.budget || parseFloat(budget),
        expectedYieldKg: planResult.expectedYieldKg || 8000,
        expectedPricePerKg: planResult.expectedPricePerKg || 280,
        expectedGrossRevenue: planResult.expectedGrossRevenue || 2240000,
        expectedNetProfit: planResult.expectedNetProfit || 1740000,
        budgetBreakdown: planResult.budgetBreakdown || [
          { category: "Imbuto", amount: 220000, notes: "Imbuto yemejwe na RAB" },
          { category: "Ifumbire", amount: 130000, notes: "NPK na DAP" },
          { category: "Imiti", amount: 45000, notes: "Kurinda urume" },
          { category: "Abakozi", amount: 85000, notes: "Guharura no gutera" },
          { category: "Ibindi", amount: 20000, notes: "Amasaho n'ibindi" },
        ],
        timeline: planResult.timeline || [
          { step: 1, title: "Gutegura ubutaka", timing: "Icyumweru 1", advice: "Gucukura santimetero 30" },
          { step: 2, title: "Gutera imbuto nziza", timing: "Icyumweru 2", advice: "Intera ya cm 75x30 cm" },
          { step: 3, title: "Kubagara & Gufumbira", timing: "Icyumweru 4", advice: "Gukoresha Urea" },
          { step: 4, title: "Gutera umuti", timing: "Icyumweru 6-8", advice: "Kurinda urume n'ibyonnyi" },
          { step: 5, title: "Gusarura", timing: "Icyumweru 15", advice: "Kwanika ahari umwuka mwiza" },
        ],
        status: "active",
        rabTips: planResult.rabTips || "Kurikiza intera n'ifumbire byemejwe na RAB.",
        createdAt: new Date().toISOString().split("T")[0],
        growthStagePercentage: 15,
        currentGrowthStage: "Kumera no Gusohoka (Germination & Emergence)",
        lastStageUpdated: new Date().toISOString().split("T")[0],
        stageNotes: "Gahunda y'igihingwa yatangiye.",
      };

      onAddPlan(newPlan);
      setExpandedPlanId(newPlan.id);
      setIsModalOpen(false);
    } catch (err: any) {
      console.warn("Generating fallback plan offline:", err);
      // Generate reliable standard Rwandan agronomist plan
      const numBudget = parseFloat(budget) || 500000;
      const numLand = parseFloat(landSize) || 0.5;
      const isPotato = crop.toLowerCase().includes("ibirayi");
      const estYield = isPotato ? Math.round(numLand * 16000) : Math.round(numLand * 3800);
      const estPrice = isPotato ? 280 : 400;
      const grossRev = estYield * estPrice;

      const fallbackPlan: FarmPlan = {
        id: "plan-" + Date.now(),
        farmId: selectedFarmId || (farm ? farm.id : "farm-1"),
        farmName,
        crop,
        seasonCode,
        landSize: numLand,
        unit,
        budget: numBudget,
        expectedYieldKg: estYield,
        expectedPricePerKg: estPrice,
        expectedGrossRevenue: grossRev,
        expectedNetProfit: grossRev - numBudget,
        budgetBreakdown: [
          { category: "Imbuto yemejwe na RAB (Certified Seeds)", amount: Math.round(numBudget * 0.45), notes: "Imbuto yizewe irwanya indwara" },
          { category: "Ifumbire (NPK 17-17-17 & DAP)", amount: Math.round(numBudget * 0.25), notes: "Ifumbire y'imborera n'imvaruganda" },
          { category: "Imiti y'ubuhinzi (Crop protection)", amount: Math.round(numBudget * 0.10), notes: "Mancozeb/Ridomil na Rocket" },
          { category: "Abakozi b'umwuga (Hired Labor)", amount: Math.round(numBudget * 0.15), notes: "Guharura, gutera, kubagara" },
          { category: "Ibindi bitunguranye (Contingency)", amount: Math.round(numBudget * 0.05), notes: "Amasaho yo gupakiramo" },
        ],
        timeline: [
          { step: 1, title: "Gutegura ubutaka no gusasira ifumbire y'imborera", timing: "Icyumweru 1", advice: "Gucukura byibuze santimetero 30 z'ubujyakuzimu" },
          { step: 2, title: "Gutera imbuto nziza yatoranyijwe yemejwe", timing: "Icyumweru 2", advice: "Gukoresha intera ya 75cm x 30cm" },
          { step: 3, title: "Kubagara bwa mbere no gusasira (Buttage)", timing: "Icyumweru 4", advice: "Gushyiramo Urea ku rugero rwemejwe" },
          { step: 4, title: "Gutera umuti wo kurinda urume n'ibyonnyi", timing: "Icyumweru 6-8", advice: "Gutera umuti mu gitondo kare nta mvura" },
          { step: 5, title: "Gusarura, gutondeka mu byiciro no kwanika", timing: "Icyumweru 14-16", advice: "Kwitondera ibirayi bikomeretse mbere yo gupakira" },
        ],
        status: "active",
        rabTips: "Gukoresha imbuto yemejwe byongera umusaruro hejuru ya 40%.",
        createdAt: new Date().toISOString().split("T")[0],
        growthStagePercentage: 15,
        currentGrowthStage: "Kumera no Gusohoka (Germination & Emergence)",
        lastStageUpdated: new Date().toISOString().split("T")[0],
        stageNotes: "Gahunda y'igihingwa yatangiye.",
      };

      onAddPlan(fallbackPlan);
      setExpandedPlanId(fallbackPlan.id);
      setIsModalOpen(false);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            {t.plansTitle}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {t.plansSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenCalendarExport && (
            <button
              onClick={onOpenCalendarExport}
              className="flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-emerald-50 text-stone-800 hover:text-emerald-900 border border-stone-300 hover:border-emerald-400 font-bold text-xs transition-colors shadow-2xs"
              title={
                language === "rw"
                  ? "Kohereza amatariki yo gutera n'isarura muri Kalendari (.ICS / Google)"
                  : "Export planting and harvest schedule to calendar (.ICS / Google)"
              }
            >
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>
                {language === "rw"
                  ? "Kohereza muri Kalendari"
                  : "Export Calendar (.ICS)"}
              </span>
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                Google & Phone
              </span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.createPlan}</span>
          </button>
        </div>
      </div>

      {/* FarmPlan Growth Progress Overview Card */}
      {plans.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 rounded-2xl p-5 sm:p-6 text-white border border-emerald-800/80 shadow-xs relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800/80 text-emerald-300 flex items-center justify-center border border-emerald-600/40">
                  <Sprout className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight">
                      {language === "rw"
                        ? "Gukurikirana Imikurire y'Ibihingwa Byose"
                        : "Overall Farm Crop Growth Progress"}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {plans.length} {language === "rw" ? "Gahunda zikora" : "Active Plans"}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    {language === "rw"
                      ? "Igenzura ry'imikurire mu mirima yawe. Kanda kuri buri gahunda uhindure ijanisha ryayo."
                      : "Real-time crop maturity stages across all farm parcels. Click any plan below to update its stage."}
                  </p>
                </div>
              </div>

              {/* Average Progress Pill */}
              <div className="flex items-center space-x-3 bg-emerald-900/60 p-2.5 px-4 rounded-xl border border-emerald-700/50 self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-300/80 block">
                    {language === "rw" ? "Ikigereranyo" : "Average Growth"}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white font-mono">
                    {Math.round(
                      plans.reduce((acc, p) => acc + (p.growthStagePercentage ?? 0), 0) /
                        plans.length
                    )}
                    %
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-emerald-400/80 flex items-center justify-center font-bold text-xs bg-emerald-800/80 text-emerald-200">
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
            </div>

            {/* Quick Progress Cards Grid for each crop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {plans.map((p) => {
                const pct = p.growthStagePercentage ?? 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => setExpandedPlanId(p.id)}
                    className="p-3.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-700/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-white group-hover:text-emerald-200 transition-colors flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="truncate max-w-[140px] sm:max-w-[170px]">{p.crop}</span>
                      </div>
                      <span className="font-black font-mono text-emerald-300">{pct}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-700/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-300"
                        style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-emerald-300/80">
                      <span className="truncate">{p.currentGrowthStage || "Kumera (Germination)"}</span>
                      <span className="text-[10px] text-emerald-400 group-hover:underline font-bold">
                        {language === "rw" ? "Hindura →" : "Edit →"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Plans Accordion / Cards */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-300">
          <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-600 font-medium">Nta gahunda y'ubuhinzi irabikwa.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-800 text-white text-sm font-bold"
          >
            {t.createPlan}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const harvestDateStr = extractPredictedHarvestDate(plan);
            const harvestAlert = evaluateHarvestAlert(plan);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Plan Header Bar */}
                <div
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/70 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-stone-900">
                          {plan.crop}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-800 text-emerald-100">
                          {plan.seasonCode}
                        </span>

                        {/* Live Harvest Alert Badge */}
                        {harvestAlert && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 border ${
                              harvestAlert.urgency === "overdue"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : harvestAlert.urgency === "urgent"
                                ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                                : harvestAlert.urgency === "approaching"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                : "bg-stone-100 text-stone-700 border-stone-300"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {harvestAlert.urgency === "urgent"
                                ? language === "rw"
                                  ? `Isarura: Iminsi ${harvestAlert.daysRemaining}!`
                                  : `Harvest in ${harvestAlert.daysRemaining}d!`
                                : harvestAlert.urgency === "approaching"
                                ? language === "rw"
                                  ? `Isarura: Iminsi ${harvestAlert.daysRemaining}`
                                  : `Harvest: ${harvestAlert.daysRemaining}d`
                                : harvestAlert.urgency === "overdue"
                                ? language === "rw"
                                  ? "Isarura ryarenze!"
                                  : "Harvest overdue!"
                                : `Target: ${harvestDateStr}`}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {plan.farmName} • {plan.landSize} {plan.unit} • Isarura riteganijwe:{" "}
                        <strong className="text-stone-700">{harvestDateStr}</strong>
                      </p>

                      {/* Growth Stage Progress Bar on Card Header */}
                      <div className="mt-2.5 max-w-sm sm:max-w-md w-full">
                        <GrowthProgressTracker
                          plan={plan}
                          language={language}
                          onUpdateProgress={handleUpdateProgress}
                          variant="card_bar"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Figures */}
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 font-medium block">
                        {t.planTargetBudget}
                      </span>
                      <span className="text-sm font-bold text-stone-900">
                        {plan.budget.toLocaleString()} RWF
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 font-medium block">
                        {t.expectedProfit}
                      </span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        +{plan.expectedNetProfit.toLocaleString()} RWF
                      </span>
                    </div>

                    <div className="text-stone-400 p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-stone-50/50 border-t border-stone-200 space-y-6">
                    {/* Growth Progress Tracking Feature & Manual Percentage Updater */}
                    <GrowthProgressTracker
                      plan={plan}
                      language={language}
                      onUpdateProgress={handleUpdateProgress}
                      variant="full"
                    />

                    {/* Harvest Cycle & Readiness Countdown Card */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        harvestAlert?.urgency === "urgent"
                          ? "bg-amber-50/80 border-amber-300"
                          : harvestAlert?.urgency === "approaching"
                          ? "bg-emerald-50/80 border-emerald-300"
                          : "bg-white border-stone-200"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                            harvestAlert?.urgency === "urgent"
                              ? "bg-amber-500 text-stone-950"
                              : "bg-emerald-800 text-white"
                          }`}
                        >
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                              {language === "rw"
                                ? "Iteganyamurima: Igihembwe n'Isarura"
                                : "Crop Cycle & Harvest Prediction"}
                            </span>
                            {harvestAlert && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900">
                                {harvestAlert.urgency.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-stone-900 mt-0.5">
                            {language === "rw"
                              ? `Itariki y'Isarura iteganijwe: ${harvestDateStr}`
                              : `Target Harvest Date: ${harvestDateStr}`}
                          </h4>
                          <p className="text-xs text-stone-600 mt-0.5">
                            {harvestAlert
                              ? language === "rw"
                                ? harvestAlert.messageRw
                                : harvestAlert.messageEn
                              : language === "rw"
                              ? `Umusaruro witeganijwe: ${(plan.expectedYieldKg / 1000).toFixed(1)} Toni.`
                              : `Expected yield: ${(plan.expectedYieldKg / 1000).toFixed(1)} Metric Tons.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-stone-400 block">
                            {language === "rw" ? "Iminsi Isigaye" : "Days Remaining"}
                          </span>
                          <span className="text-lg font-black text-emerald-800">
                            {harvestAlert
                              ? `${harvestAlert.daysRemaining} ${
                                  language === "rw" ? "Iminsi" : "Days"
                                }`
                              : "Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 font-medium block">{t.expectedYield}</span>
                        <span className="text-base font-black text-stone-900 mt-0.5 block">
                          {plan.expectedYieldKg.toLocaleString()} {t.kg}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          ({(plan.expectedYieldKg / 1000).toFixed(1)} {t.tons})
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 font-medium block">{t.targetPrice}</span>
                        <span className="text-base font-black text-stone-900 mt-0.5 block">
                          {plan.expectedPricePerKg} RWF
                        </span>
                        <span className="text-[11px] text-stone-400">Isoko ry'i Kigali & Musanze</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 font-medium block">{t.expectedRevenue}</span>
                        <span className="text-base font-black text-stone-900 mt-0.5 block">
                          {plan.expectedGrossRevenue.toLocaleString()} RWF
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">Gross Income</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 font-medium block">{t.expectedProfit}</span>
                        <span className="text-base font-black text-emerald-700 mt-0.5 block">
                          +{plan.expectedNetProfit.toLocaleString()} RWF
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          ROI: {Math.round((plan.expectedNetProfit / plan.budget) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* RAB Agro Tips */}
                    {plan.rabTips && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Inama za RAB (Rwanda Agriculture Board):</strong>{" "}
                          {plan.rabTips}
                        </div>
                      </div>
                    )}

                    {/* Two-column layout: Budget Breakdown & Timeline */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Budget Breakdown */}
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200">
                        <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-amber-600" />
                          <span>{t.budgetBreakdown}</span>
                        </h4>
                        <div className="space-y-2.5">
                          {plan.budgetBreakdown.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 text-xs border border-stone-100"
                            >
                              <div>
                                <span className="font-bold text-stone-800 block">{item.category}</span>
                                <span className="text-stone-500 text-[11px]">{item.notes}</span>
                              </div>
                              <span className="font-bold text-stone-900 text-sm">
                                {item.amount.toLocaleString()} RWF
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Agronomic Timeline */}
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200">
                        <h4 className="text-sm font-bold text-stone-900 mb-3 flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-emerald-700" />
                          <span>{t.timelineSteps}</span>
                        </h4>
                        <div className="space-y-3">
                          {plan.timeline.map((step) => (
                            <div key={step.step} className="flex items-start space-x-3 text-xs">
                              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                {step.step}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-bold text-stone-900">{step.title}</h5>
                                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                                    {step.timing}
                                  </span>
                                </div>
                                <p className="text-stone-500 text-[11px] mt-0.5">{step.advice}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Plan Actions: Calendar Sync & Delete */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct Google Calendar Link for this plan */}
                        {(() => {
                          const plantDate = normalizeDateToIso(plan.plantedDate || plan.createdAt);
                          const gcalUrl = buildGoogleCalendarUrl(
                            language === "rw"
                              ? `🌱 Gutera: ${plan.crop} (${plan.seasonCode}) - ${plan.farmName}`
                              : `🌱 Planting: ${plan.crop} (${plan.seasonCode}) - ${plan.farmName}`,
                            plantDate,
                            plantDate,
                            `Plan: ${plan.crop}\nLand: ${plan.landSize} ${plan.unit}\nExpected Yield: ${plan.expectedYieldKg} kg\nTarget Harvest: ${harvestDateStr}`,
                            `${plan.farmName}, Rwanda`
                          );
                          return (
                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                              <span>+ Google Calendar (Planting)</span>
                              <ExternalLink className="w-3 h-3 text-emerald-600" />
                            </a>
                          );
                        })()}

                        {onOpenCalendarExport && (
                          <button
                            type="button"
                            onClick={onOpenCalendarExport}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-semibold transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5 text-stone-600" />
                            <span>
                              {language === "rw"
                                ? "Fungura Kalendari Yuzuye"
                                : "Full Calendar (.ICS)"}
                            </span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onDeletePlan(plan.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center space-x-1 py-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.delete} iyi gahunda</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-stone-900">{t.createPlan}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Hitamo Umurima (Select Farm)
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district} - {f.sizeHa} Ha)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Igihingwa (Crop)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Urugero: Ibirayi (Kinigi), Ibigori (H628), Inyanya (Anna F1)"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Ubuso bw'umurima
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.05"
                    required
                    value={landSize}
                    onChange={(e) => setLandSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Igipimo (Unit)
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  >
                    <option value="hegitari">Hegitari (Hectares)</option>
                    <option value="are">Are</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ingengo y'imari ufite (Budget in RWF) *
                </label>
                <input
                  type="number"
                  step="50000"
                  required
                  placeholder="500000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Akarere (District)
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Igihembwe (Season)
                  </label>
                  <select
                    value={seasonCode}
                    onChange={(e) => setSeasonCode(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  >
                    <option value="2026A">Season 2026A (Umuhindo)</option>
                    <option value="2026B">Season 2026B (Itumba)</option>
                    <option value="2026C">Season 2026C (Icyi / Marais)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 border border-emerald-200">
                ⚡ <strong>AI Agronomist Engine</strong> izasesengura ubu buso n'amafaranga, ikore gahunda yuzuye y'imbuto, ifumbire, imiti, no kwitega inyungu ishingiye ku masoko yo mu Rwanda.
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center space-x-2"
                >
                  {isGeneratingAi ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t.loading}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{t.aiGeneratePlan}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
