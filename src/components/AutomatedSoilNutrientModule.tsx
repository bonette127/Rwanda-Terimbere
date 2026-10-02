import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmPlan,
  HarvestRecord,
  Language,
  ParcelSoilSensorReading,
} from "../types";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  FlaskConical,
  Sprout,
  TrendingUp,
  Scale,
  CalendarPlus,
  CheckCircle2,
  Sliders,
  Layers,
  Award,
  ArrowUpRight,
  Sparkles,
  Info,
} from "lucide-react";

interface AutomatedSoilNutrientModuleProps {
  plans: FarmPlan[];
  farms: Farm[];
  harvests: HarvestRecord[];
  sensorReadingsByFarmId?: Record<string, ParcelSoilSensorReading>;
  language: Language;
  onScheduleFertilizerTask?: (activity: Omit<FarmActivity, "id">) => void;
  onUpdatePlanGrowthStage?: (
    planId: string,
    percentage: number,
    stageName: string,
    notes?: string
  ) => void;
  onNavigateToActivityLog?: (options?: {
    farmId?: string;
    category?: "fertilizing" | "irrigation";
  }) => void;
}

export interface NpkPrescriptionResult {
  planId: string;
  farmId: string;
  farmName: string;
  district: string;
  soilType: string;
  crop: string;
  sizeHa: number;
  growthStagePct: number;
  stageLabelEn: string;
  stageLabelRw: string;
  stageNutrientFocusEn: string;
  stageNutrientFocusRw: string;
  // Historical yield metrics
  historicalAvgYieldTonsHa: number;
  rabBenchmarkTonsHa: number;
  targetYieldTonsHa: number;
  yieldGapPct: number;
  historicalFueKgPerKg: number;
  // Elemental NPK recommendation (kg/Ha and total kg for parcel)
  nitrogenKgHa: number;
  phosphorusKgHa: number;
  potassiumKgHa: number;
  totalElementalKgHa: number;
  nitrogenTotalKg: number;
  phosphorusTotalKg: number;
  potassiumTotalKg: number;
  // Commercial RAB Nkunganire product breakdown (total kg for parcel)
  npk171717Kg: number;
  urea46Kg: number;
  dap1846Kg: number;
  potashKclKg: number;
  organicManureTons: number;
  // Economics
  estimatedSubsidizedCostRwf: number;
  projectedYieldBoostTonsHa: number;
  estimatedAdditionalRevenueRwf: number;
  nutrientRoiRatio: number;
  applicationMethodEn: string;
  applicationMethodRw: string;
}

export const calculateAutomatedNpkPrescription = (params: {
  plan: FarmPlan;
  farm?: Farm;
  harvests: HarvestRecord[];
  overrideGrowthPct?: number;
  overrideTargetYieldTonsHa?: number;
  sensorReading?: ParcelSoilSensorReading;
}): NpkPrescriptionResult => {
  const {
    plan,
    farm,
    harvests,
    overrideGrowthPct,
    overrideTargetYieldTonsHa,
    sensorReading,
  } = params;

  const sizeHa = farm?.sizeHa || plan.landSize || 1.5;
  const district = farm?.district || "Musanze";
  const soilType = farm?.soilType || "Amakoro (Volcanic Loam)";
  const cropLower = plan.crop.toLowerCase();
  const growthStagePct =
    overrideGrowthPct !== undefined
      ? overrideGrowthPct
      : plan.growthStagePercentage ?? 55;

  // 1. Evaluate historical harvest records for this farm or crop
  const matchingHarvests = harvests.filter(
    (h) =>
      h.farmId === plan.farmId ||
      h.crop
        .toLowerCase()
        .includes(cropLower.split(" ")[0].replace(/[^a-z]/g, ""))
  );

  let defaultBenchmarkTonsHa = 16.5;
  let baseN = 85;
  let baseP = 65;
  let baseK = 95;
  let pricePerKgRwf = plan.expectedPricePerKg || 340;

  if (cropLower.includes("ibirayi") || cropLower.includes("potato")) {
    defaultBenchmarkTonsHa = 18.5;
    baseN = 95;
    baseP = 75;
    baseK = 115; // Tubers require high Potassium (K2O)
    pricePerKgRwf = 350;
  } else if (cropLower.includes("ibigori") || cropLower.includes("maize")) {
    defaultBenchmarkTonsHa = 5.2;
    baseN = 110; // Maize is a heavy Nitrogen feeder
    baseP = 60;
    baseK = 55;
    pricePerKgRwf = 420;
  } else if (cropLower.includes("inyanya") || cropLower.includes("tomato")) {
    defaultBenchmarkTonsHa = 22.0;
    baseN = 90;
    baseP = 70;
    baseK = 120;
    pricePerKgRwf = 600;
  } else if (cropLower.includes("ibishyimbo") || cropLower.includes("bean")) {
    defaultBenchmarkTonsHa = 2.8;
    baseN = 35; // Legume N-fixation reduces N requirement
    baseP = 75; // High P for root nodulation
    baseK = 60;
    pricePerKgRwf = 880;
  }

  const historicalAvgYieldTonsHa =
    matchingHarvests.length > 0
      ? Math.round(
          (matchingHarvests.reduce(
            (sum, h) =>
              sum +
              (h.yieldPerHaTons ||
                h.quantityKg / 1000 / Math.max(0.2, h.areaHarvestedHa || sizeHa)),
            0
          ) /
            matchingHarvests.length) *
            10
        ) / 10
      : Math.round(defaultBenchmarkTonsHa * 0.76 * 10) / 10;

  const rabBenchmarkTonsHa =
    matchingHarvests[0]?.rabBenchmarkTonsHa || defaultBenchmarkTonsHa;

  const targetYieldTonsHa =
    overrideTargetYieldTonsHa !== undefined
      ? overrideTargetYieldTonsHa
      : Math.round(Math.max(rabBenchmarkTonsHa, historicalAvgYieldTonsHa * 1.22) * 10) /
        10;

  const yieldGapPct = Math.max(
    0,
    Math.round(
      ((targetYieldTonsHa - historicalAvgYieldTonsHa) /
        Math.max(1, targetYieldTonsHa)) *
        100
    )
  );

  const historicalFueKgPerKg =
    matchingHarvests[0]?.fertilizerConversionRatio ||
    (cropLower.includes("ibirayi") ? 36 : cropLower.includes("ibigori") ? 22 : 28);

  // 2. Growth Stage Allocation Weights (N-P-K partition by phenological stage)
  let stageLabelEn = "";
  let stageLabelRw = "";
  let stageNutrientFocusEn = "";
  let stageNutrientFocusRw = "";
  let nStageFactor = 1.0;
  let pStageFactor = 1.0;
  let kStageFactor = 1.0;
  let applicationMethodEn = "";
  let applicationMethodRw = "";

  if (growthStagePct <= 20) {
    stageLabelEn = "Emergence & Root Architecture (0–20%)";
    stageLabelRw = "Kumera no Gushora Imizi (0–20%)";
    stageNutrientFocusEn = "High Phosphorus (P₂O₅) for rapid root initiation";
    stageNutrientFocusRw = "Fosifore (P₂O₅) nyinshi yo gukomeza imizi";
    nStageFactor = 0.55;
    pStageFactor = 1.35;
    kStageFactor = 0.55;
    applicationMethodEn =
      "Basal furrow placement 5cm below seed depth mixed with cured organic manure.";
    applicationMethodRw =
      "Shyira ifumbire mu mpavu kuri cm 5 munsi y'imbuto ivanzwe n'imborera ihiye.";
  } else if (growthStagePct <= 45) {
    stageLabelEn = "Vegetative Canopy Expansion (21–45%)";
    stageLabelRw = "Gukura kw'Amashami n'Amababi (21–45%)";
    stageNutrientFocusEn = "Peak Nitrogen (N) surge for leaf & stem biomass";
    stageNutrientFocusRw = "Azote (N) nyinshi ituma amababi akura vuba";
    nStageFactor = 1.35;
    pStageFactor = 0.75;
    kStageFactor = 0.8;
    applicationMethodEn =
      "Side-dress along crop rows 6–8cm from stem collar during weeding/earthing-up.";
    applicationMethodRw =
      "Sukira ifumbire kuri cm 6–8 uvuye ku giti mu gihe cyo kubagara no gusukira.";
  } else if (growthStagePct <= 75) {
    stageLabelEn = "Reproductive Flowering & Bulking (46–75%)";
    stageLabelRw = "Kurabyo, Kurema Imbuto & Kubyibuha (46–75%)";
    stageNutrientFocusEn =
      "High Potassium (K₂O) + Balanced N for tuber/grain filling";
    stageNutrientFocusRw =
      "Potasiyumu (K₂O) na Azote uringaniye byo kubyibushya umusaruro";
    nStageFactor = 1.05;
    pStageFactor = 0.85;
    kStageFactor = 1.4;
    applicationMethodEn =
      "Split ring/band placement in moist root zone (>60% VWC) to drive translocation.";
    applicationMethodRw =
      "Shyira iruhande rw'imizi mu butaka buhehereye (>60% VWC) kugira ngo intungamubiri zinjire vuba.";
  } else {
    stageLabelEn = "Maturation & Harvest Conditioning (76–100%)";
    stageLabelRw = "Guhisha no Gukomera k'Umusaruro (76–100%)";
    stageNutrientFocusEn =
      "Finishing Potassium (K₂O) only; restrict Nitrogen to prevent rot";
    stageNutrientFocusRw =
      "Potasiyumu (K₂O) gusa yo gukomeza igishishwa; gabanya Azote";
    nStageFactor = 0.25;
    pStageFactor = 0.35;
    kStageFactor = 0.85;
    applicationMethodEn =
      "Light foliar/potash finish only; avoid heavy nitrogen before harvest.";
    applicationMethodRw =
      "irinde gushyiramo Azote nyinshi mu gihe cyo guhisha ngo umusaruro utabora.";
  }

  // 3. Yield-gap & soil sensor EC adjustment
  const yieldRecoveryFactor = 1 + Math.min(0.45, yieldGapPct / 100);
  const sensorEcBonus =
    sensorReading && sensorReading.ecDsM < 1.1 ? 1.14 : 1.0;

  const nitrogenKgHa = Math.round(
    baseN * nStageFactor * yieldRecoveryFactor * sensorEcBonus
  );
  const phosphorusKgHa = Math.round(
    baseP * pStageFactor * yieldRecoveryFactor * sensorEcBonus
  );
  const potassiumKgHa = Math.round(
    baseK * kStageFactor * yieldRecoveryFactor * sensorEcBonus
  );
  const totalElementalKgHa = nitrogenKgHa + phosphorusKgHa + potassiumKgHa;

  const nitrogenTotalKg = Math.round(nitrogenKgHa * sizeHa);
  const phosphorusTotalKg = Math.round(phosphorusKgHa * sizeHa);
  const potassiumTotalKg = Math.round(potassiumKgHa * sizeHa);

  // 4. Convert Elemental NPK into Rwandan Commercial Fertilizers (NPK 17-17-17, Urea 46%, DAP 18-46-0, KCl 60%)
  const npk171717Kg = Math.round(( Math.min(nitrogenTotalKg, phosphorusTotalKg, potassiumTotalKg) / 0.17 ) * 0.65);
  const suppliedByNpk = Math.round(npk171717Kg * 0.17);

  const remainingP = Math.max(0, phosphorusTotalKg - suppliedByNpk);
  const dap1846Kg = Math.round(remainingP / 0.46);
  const nFromDap = Math.round(dap1846Kg * 0.18);

  const remainingN = Math.max(0, nitrogenTotalKg - suppliedByNpk - nFromDap);
  const urea46Kg = Math.round(remainingN / 0.46);

  const remainingK = Math.max(0, potassiumTotalKg - suppliedByNpk);
  const potashKclKg = Math.round(remainingK / 0.6);

  const organicManureTons = Math.round(sizeHa * 4.5 * 10) / 10;

  // Smart Nkunganire subsidized pricing (~720 RWF/kg NPK, ~680 RWF/kg Urea, ~810 RWF/kg DAP, ~750 RWF/kg KCl)
  const estimatedSubsidizedCostRwf =
    npk171717Kg * 720 +
    urea46Kg * 680 +
    dap1846Kg * 810 +
    potashKclKg * 750;

  const projectedYieldBoostTonsHa =
    Math.round(
      Math.max(0.6, (targetYieldTonsHa - historicalAvgYieldTonsHa) * 0.82) * 10
    ) / 10;

  const estimatedAdditionalRevenueRwf = Math.round(
    projectedYieldBoostTonsHa * 1000 * sizeHa * pricePerKgRwf
  );

  const nutrientRoiRatio =
    estimatedSubsidizedCostRwf > 0
      ? Math.round(
          (estimatedAdditionalRevenueRwf / estimatedSubsidizedCostRwf) * 10
        ) / 10
      : 3.2;

  return {
    planId: plan.id,
    farmId: plan.farmId,
    farmName: plan.farmName,
    district,
    soilType,
    crop: plan.crop,
    sizeHa,
    growthStagePct,
    stageLabelEn,
    stageLabelRw,
    stageNutrientFocusEn,
    stageNutrientFocusRw,
    historicalAvgYieldTonsHa,
    rabBenchmarkTonsHa,
    targetYieldTonsHa,
    yieldGapPct,
    historicalFueKgPerKg,
    nitrogenKgHa,
    phosphorusKgHa,
    potassiumKgHa,
    totalElementalKgHa,
    nitrogenTotalKg,
    phosphorusTotalKg,
    potassiumTotalKg,
    npk171717Kg,
    urea46Kg,
    dap1846Kg,
    potashKclKg,
    organicManureTons,
    estimatedSubsidizedCostRwf,
    projectedYieldBoostTonsHa,
    estimatedAdditionalRevenueRwf,
    nutrientRoiRatio,
    applicationMethodEn,
    applicationMethodRw,
  };
};

export const AutomatedSoilNutrientModule: React.FC<
  AutomatedSoilNutrientModuleProps
> = ({
  plans,
  farms,
  harvests,
  sensorReadingsByFarmId = {},
  language,
  onScheduleFertilizerTask,
  onUpdatePlanGrowthStage,
  onNavigateToActivityLog,
}) => {
  const activePlans = useMemo(() => {
    const nonCompleted = plans.filter((p) => p.status !== "completed");
    return nonCompleted.length > 0 ? nonCompleted : plans;
  }, [plans]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    activePlans[0]?.id || ""
  );
  const [growthStageOverrides, setGrowthStageOverrides] = useState<
    Record<string, number>
  >({});
  const [targetYieldOverrides, setTargetYieldOverrides] = useState<
    Record<string, number>
  >({});
  const [scheduledPlanIds, setScheduledPlanIds] = useState<string[]>([]);

  const selectedPlan =
    activePlans.find((p) => p.id === selectedPlanId) || activePlans[0];

  const selectedFarm = useMemo(() => {
    if (!selectedPlan) return farms[0];
    return farms.find((f) => f.id === selectedPlan.farmId) || farms[0];
  }, [farms, selectedPlan]);

  // Compute prescription for the selected plan
  const currentPrescription = useMemo(() => {
    if (!selectedPlan) return null;
    return calculateAutomatedNpkPrescription({
      plan: selectedPlan,
      farm: selectedFarm,
      harvests,
      overrideGrowthPct: growthStageOverrides[selectedPlan.id],
      overrideTargetYieldTonsHa: targetYieldOverrides[selectedPlan.id],
      sensorReading: sensorReadingsByFarmId[selectedPlan.farmId],
    });
  }, [
    selectedPlan,
    selectedFarm,
    harvests,
    growthStageOverrides,
    targetYieldOverrides,
    sensorReadingsByFarmId,
  ]);

  // Build stage-by-stage NPK demand curve for Recharts (0% -> 15% -> 35% -> 60% -> 85%)
  const stageCurveData = useMemo(() => {
    if (!selectedPlan) return [];
    const stages = [
      { pct: 12, labelEn: "1. Emergence (12%)", labelRw: "1. Kumera (12%)" },
      { pct: 32, labelEn: "2. Vegetative (32%)", labelRw: "2. Amababi (32%)" },
      { pct: 58, labelEn: "3. Flowering/Bulk (58%)", labelRw: "3. Kurabyo (58%)" },
      { pct: 82, labelEn: "4. Maturation (82%)", labelRw: "4. Guhisha (82%)" },
    ];

    return stages.map((st) => {
      const calc = calculateAutomatedNpkPrescription({
        plan: selectedPlan,
        farm: selectedFarm,
        harvests,
        overrideGrowthPct: st.pct,
        overrideTargetYieldTonsHa: targetYieldOverrides[selectedPlan.id],
      });
      return {
        stage: language === "rw" ? st.labelRw : st.labelEn,
        pct: st.pct,
        N: calc.nitrogenKgHa,
        P: calc.phosphorusKgHa,
        K: calc.potassiumKgHa,
        totalKgHa: calc.totalElementalKgHa,
      };
    });
  }, [selectedPlan, selectedFarm, harvests, targetYieldOverrides, language]);

  if (!selectedPlan || !currentPrescription) return null;

  const handleStageSliderChange = (newPct: number) => {
    setGrowthStageOverrides((prev) => ({
      ...prev,
      [selectedPlan.id]: newPct,
    }));
  };

  const handleApplyGrowthStageToPlan = () => {
    if (!onUpdatePlanGrowthStage) return;
    onUpdatePlanGrowthStage(
      selectedPlan.id,
      currentPrescription.growthStagePct,
      language === "rw"
        ? currentPrescription.stageLabelRw
        : currentPrescription.stageLabelEn,
      language === "rw"
        ? currentPrescription.stageNutrientFocusRw
        : currentPrescription.stageNutrientFocusEn
    );
  };

  const handleScheduleNpkApplication = () => {
    const key = `${selectedPlan.id}-${currentPrescription.growthStagePct}`;
    if (scheduledPlanIds.includes(key)) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateStr = tomorrow.toISOString().split("T")[0];

    onScheduleFertilizerTask?.({
      farmId: currentPrescription.farmId,
      farmName: currentPrescription.farmName,
      crop: currentPrescription.crop,
      title:
        language === "rw"
          ? `Gushyiramo NPK Yabazwe (${currentPrescription.growthStagePct}% Stage): NPK ${currentPrescription.npk171717Kg}kg + Urea ${currentPrescription.urea46Kg}kg + DAP ${currentPrescription.dap1846Kg}kg`
          : `Automated NPK Application (${currentPrescription.growthStagePct}% Stage): NPK ${currentPrescription.npk171717Kg}kg + Urea ${currentPrescription.urea46Kg}kg + DAP ${currentPrescription.dap1846Kg}kg`,
      category: "fertilizing",
      dueDate: dueDateStr,
      status: "pending",
      assignedTo: "Dr. Emmanuel Hakizimana (Agronomy Team)",
      notes:
        language === "rw"
          ? `Elemental NPK: N=${currentPrescription.nitrogenKgHa}kg/Ha, P=${currentPrescription.phosphorusKgHa}kg/Ha, K=${currentPrescription.potassiumKgHa}kg/Ha. ${currentPrescription.applicationMethodRw}`
          : `Elemental NPK: N=${currentPrescription.nitrogenKgHa}kg/Ha, P=${currentPrescription.phosphorusKgHa}kg/Ha, K=${currentPrescription.potassiumKgHa}kg/Ha. ${currentPrescription.applicationMethodEn}`,
    });

    setScheduledPlanIds((prev) => [...prev, key]);
  };

  const isCurrentScheduled = scheduledPlanIds.includes(
    `${selectedPlan.id}-${currentPrescription.growthStagePct}`
  );

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-950 via-stone-900 to-amber-950/90 text-white border-b border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {language === "rw"
                  ? "ICUNGA RY'INTUNGAMUBIRI Z'UBUTAKA (AUTOMATED NPK ENGINE)"
                  : "AUTOMATED SOIL NUTRIENT MANAGEMENT • NPK OPTIMIZER"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                RAB Smart Nkunganire + Historical Yield Calibration
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
              {language === "rw"
                ? "Ibara Ryikora ry'Ingano ya N-P-K Hashingiwe ku Musaruro w'Igihembwe Cyashize n'Imikurire (%)"
                : "Optimal NPK Application Calculator (Historical Yield × Crop Growth Stage %)"}
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              {language === "rw"
                ? "Iyi sisitemu isesengura umusaruro wabonetse mu bihembwe byashize (Tons/Ha) hamwe n'urwego rw'imikurire y'igihingwa (%) kugira ngo ikugenera ingano nyayo ya Azote (N), Fosifore (P) na Potasiyumu (K)."
                : "Synthesizes historical parcel harvest yields (Tons/Ha) and real-time crop growth stage percentages (%) to prescribe exact elemental N-P-K and commercial Nkunganire fertilizer bags."}
            </p>
          </div>
        </div>

        {/* Plan Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {activePlans.map((plan) => {
            const isSelected = plan.id === selectedPlan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-amber-400 text-stone-950 border-amber-400 shadow-2xs"
                    : "bg-stone-900/80 text-stone-300 border-stone-700 hover:border-amber-400/60"
                }`}
              >
                <span>{plan.crop}</span>
                <span className="text-[10px] font-mono opacity-80">
                  ({plan.growthStagePercentage ?? 55}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 4 KPI Cards: Historical Yield vs Target | Elemental N-P-K | Nkunganire Bags | Nutrient ROI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:px-6 bg-stone-50/80 dark:bg-stone-950/50 border-b border-stone-200/80 dark:border-stone-800">
        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Umusaruro w'Amateka vs Intego"
                : "Historical vs. Target Yield"}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {currentPrescription.historicalAvgYieldTonsHa} →{" "}
            <span className="text-emerald-700 dark:text-emerald-400">
              {currentPrescription.targetYieldTonsHa} T/Ha
            </span>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            {language === "rw"
              ? `Icyuho cy'umusaruro: +${currentPrescription.yieldGapPct}% (RAB: ${currentPrescription.rabBenchmarkTonsHa} T/Ha)`
              : `Yield gap recovery: +${currentPrescription.yieldGapPct}% (RAB: ${currentPrescription.rabBenchmarkTonsHa} T/Ha)`}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Ingano ya N-P-K kuri Hagitari"
                : "Optimal Elemental N-P-K / Ha"}
            </span>
            <FlaskConical className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {currentPrescription.nitrogenKgHa}N ·{" "}
            {currentPrescription.phosphorusKgHa}P ·{" "}
            {currentPrescription.potassiumKgHa}K
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
            Total: {currentPrescription.totalElementalKgHa} kg/Ha elemental
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? `Ifumbire Yose (${currentPrescription.sizeHa} Ha)`
                : `Total Parcel Input (${currentPrescription.sizeHa} Ha)`}
            </span>
            <Scale className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {(
              currentPrescription.npk171717Kg +
              currentPrescription.urea46Kg +
              currentPrescription.dap1846Kg +
              currentPrescription.potashKclKg
            ).toLocaleString()}{" "}
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              kg
            </span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
            + {currentPrescription.organicManureTons} T{" "}
            {language === "rw" ? "Imborera" : "Compost Manure"}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400">
            <span>
              {language === "rw"
                ? "Inyungu y'Ifumbire (Expected ROI)"
                : "Projected Fertilizer ROI"}
            </span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {currentPrescription.nutrientRoiRatio}x{" "}
            <span className="text-xs font-bold text-stone-500">return</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
            +{currentPrescription.estimatedAdditionalRevenueRwf.toLocaleString()}{" "}
            RWF est. gain
          </div>
        </div>
      </div>

      {/* Main Interactive Body */}
      <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Growth Stage & Yield Target Sliders + Elemental & Commercial Bag Breakdown */}
        <div className="xl:col-span-7 space-y-5">
          {/* Interactive Calibration Box */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-white">
                  {language === "rw"
                    ? `1. Gena Imikurire y'Igihingwa (%) n'Intego y'Umusaruro (${currentPrescription.farmName})`
                    : `1. Calibrate Growth Stage (%) & Yield Goal (${currentPrescription.farmName})`}
                </h4>
              </div>

              {growthStageOverrides[selectedPlan.id] !== undefined &&
                onUpdatePlanGrowthStage && (
                  <button
                    type="button"
                    onClick={handleApplyGrowthStageToPlan}
                    className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-900"
                  >
                    {language === "rw"
                      ? "Bika % ku Mugambi"
                      : "Sync % to Active Plan"}
                  </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Growth Stage Percentage Slider */}
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    {language === "rw"
                      ? "Imikurire y'Igihingwa (%):"
                      : "Crop Growth Stage (%):"}
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                    {currentPrescription.growthStagePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={currentPrescription.growthStagePct}
                  onChange={(e) =>
                    handleStageSliderChange(Number(e.target.value))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="text-[11px] font-bold text-stone-800 dark:text-stone-200 mt-1">
                  {language === "rw"
                    ? currentPrescription.stageLabelRw
                    : currentPrescription.stageLabelEn}
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                  {language === "rw"
                    ? currentPrescription.stageNutrientFocusRw
                    : currentPrescription.stageNutrientFocusEn}
                </div>
              </div>

              {/* Target Yield Goal Slider */}
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-stone-700 dark:text-stone-300">
                    {language === "rw"
                      ? "Intego y'Umusaruro (T/Ha):"
                      : "Target Yield Goal (Tons/Ha):"}
                  </span>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                    {currentPrescription.targetYieldTonsHa} T/Ha
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.max(
                    2,
                    Math.round(currentPrescription.historicalAvgYieldTonsHa * 0.8)
                  )}
                  max={Math.round(currentPrescription.rabBenchmarkTonsHa * 1.35)}
                  step={0.5}
                  value={currentPrescription.targetYieldTonsHa}
                  onChange={(e) =>
                    setTargetYieldOverrides((prev) => ({
                      ...prev,
                      [selectedPlan.id]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mt-1">
                  <span>
                    Hist: {currentPrescription.historicalAvgYieldTonsHa} T/Ha
                  </span>
                  <span>
                    RAB Benchmark: {currentPrescription.rabBenchmarkTonsHa} T/Ha
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Elemental N - P - K Bars + Commercial Fertilizer Bags */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Nitrogen (N) */}
            <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/50 dark:bg-emerald-950/25">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                  NITROGEN (N)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-700 text-white">
                  {currentPrescription.nitrogenKgHa} kg/Ha
                </span>
              </div>
              <div className="text-xl font-black font-mono text-stone-900 dark:text-white mt-1.5">
                {currentPrescription.nitrogenTotalKg} kg{" "}
                <span className="text-xs font-normal text-stone-500">
                  total N
                </span>
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? `Urea 46% N: ${currentPrescription.urea46Kg} kg (${
                      Math.round((currentPrescription.urea46Kg / 50) * 10) / 10
                    } imifuka)`
                  : `Urea 46% N: ${currentPrescription.urea46Kg} kg (${
                      Math.round((currentPrescription.urea46Kg / 50) * 10) / 10
                    } bags)`}
              </div>
            </div>

            {/* Phosphorus (P2O5) */}
            <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/50 dark:bg-amber-950/25">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                  PHOSPHORUS (P₂O₅)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-600 text-white">
                  {currentPrescription.phosphorusKgHa} kg/Ha
                </span>
              </div>
              <div className="text-xl font-black font-mono text-stone-900 dark:text-white mt-1.5">
                {currentPrescription.phosphorusTotalKg} kg{" "}
                <span className="text-xs font-normal text-stone-500">
                  total P₂O₅
                </span>
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? `DAP 18-46-0: ${currentPrescription.dap1846Kg} kg + NPK 17-17-17: ${currentPrescription.npk171717Kg} kg`
                  : `DAP 18-46-0: ${currentPrescription.dap1846Kg} kg + NPK 17-17-17: ${currentPrescription.npk171717Kg} kg`}
              </div>
            </div>

            {/* Potassium (K2O) */}
            <div className="p-3.5 rounded-2xl border border-cyan-200 dark:border-cyan-900/70 bg-cyan-50/50 dark:bg-cyan-950/25">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-900 dark:text-cyan-200">
                  POTASSIUM (K₂O)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-700 text-white">
                  {currentPrescription.potassiumKgHa} kg/Ha
                </span>
              </div>
              <div className="text-xl font-black font-mono text-stone-900 dark:text-white mt-1.5">
                {currentPrescription.potassiumTotalKg} kg{" "}
                <span className="text-xs font-normal text-stone-500">
                  total K₂O
                </span>
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                {language === "rw"
                  ? `Potash (MOP/K₂SO₄): ${currentPrescription.potashKclKg} kg`
                  : `Potash (MOP/K₂SO₄): ${currentPrescription.potashKclKg} kg`}
              </div>
            </div>
          </div>

          {/* RAB Placement Protocol + 1-Click Schedule Action */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>
                  {language === "rw"
                    ? "Uburyo bwo Gushyiramo Ifumbire (RAB Placement Protocol):"
                    : "RAB Precision Application Protocol:"}
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                {language === "rw"
                  ? currentPrescription.applicationMethodRw
                  : currentPrescription.applicationMethodEn}
              </p>
              <div className="text-[11px] font-mono text-stone-500">
                {language === "rw"
                  ? `Ikiguzi cya Nkunganire: ${currentPrescription.estimatedSubsidizedCostRwf.toLocaleString()} RWF • Inyungu yitezwe: +${currentPrescription.projectedYieldBoostTonsHa} T/Ha`
                  : `Est. Subsidized Cost: ${currentPrescription.estimatedSubsidizedCostRwf.toLocaleString()} RWF • Expected Yield Boost: +${currentPrescription.projectedYieldBoostTonsHa} T/Ha`}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleScheduleNpkApplication}
                disabled={isCurrentScheduled}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all ${
                  isCurrentScheduled
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                    : "bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
                }`}
              >
                {isCurrentScheduled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {language === "rw"
                        ? "Yashyizwe kuri Gahunda"
                        : "NPK Task Scheduled"}
                    </span>
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4" />
                    <span>
                      {language === "rw"
                        ? "Shyira Ifumbire kuri Gahunda"
                        : "Schedule NPK Application"}
                    </span>
                  </>
                )}
              </button>

              {onNavigateToActivityLog && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToActivityLog({
                      farmId: currentPrescription.farmId,
                      category: "fertilizing",
                    })
                  }
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center justify-center gap-1"
                >
                  <span>
                    {language === "rw"
                      ? "Reba Igitabo cy'Imirimo →"
                      : "Open Activity Log →"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Recharts NPK Demand Curve Across Growth Stages */}
        <div className="xl:col-span-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? `Imbonerahamwe ya N-P-K ku Mikurire (${currentPrescription.crop})`
                    : `Stage-Specific N-P-K Uptake Curve (${currentPrescription.crop})`}
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {language === "rw"
                    ? "Ingano ya N, P₂O₅ na K₂O (kg/Ha) ikenerwa kuri buri cyiciro cy'imikurire"
                    : "Recommended elemental N, P₂O₅, and K₂O (kg/Ha) across phenological stages"}
                </p>
              </div>
            </div>

            <div className="h-60 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={stageCurveData}
                  margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#78716c"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 10, fill: "#78716c", fontWeight: 600 }}
                  />
                  <YAxis
                    unit="kg"
                    tick={{ fontSize: 11, fill: "#78716c" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1917",
                      borderColor: "#44403c",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#f5f5f4",
                    }}
                  />
                  <Bar
                    dataKey="N"
                    name="Nitrogen (N kg/Ha)"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="P"
                    name="Phosphorus (P₂O₅ kg/Ha)"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="K"
                    name="Potassium (K₂O kg/Ha)"
                    fill="#0891b2"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalKgHa"
                    name="Total Elemental (kg/Ha)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3.5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                N (Azote)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                P₂O₅ (Fosifore)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
                K₂O (Potasiyumu)
              </span>
            </div>
            <span className="font-mono text-[10px]">
              FUE: {currentPrescription.historicalFueKgPerKg} kg/kg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
