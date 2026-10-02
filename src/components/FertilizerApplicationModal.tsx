import React, { useState, useEffect } from "react";
import {
  Farm,
  FertilizerApplicationLog,
  FertilizerApplicationMethod,
  Language,
} from "../types";
import {
  FlaskConical,
  Scale,
  MapPin,
  Sprout,
  CheckCircle2,
  Calculator,
  Calendar,
  User,
} from "lucide-react";

interface FertilizerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  farms: Farm[];
  language: Language;
  defaultSeasonCode?: string;
  onSaveApplication: (application: FertilizerApplicationLog) => void;
}

interface FertilizerPreset {
  key: string;
  labelEn: string;
  labelRw: string;
  n: number;
  p: number;
  k: number;
  defaultPricePerKgRwf: number;
  defaultMethod: FertilizerApplicationMethod;
}

const FERTILIZER_PRESETS: FertilizerPreset[] = [
  {
    key: "NPK 17-17-17 (Nkunganire)",
    labelEn: "NPK 17-17-17 (Balanced Compound - Nkunganire)",
    labelRw: "NPK 17-17-17 (Ifumbire Mvaruganda ya Nkunganire)",
    n: 17,
    p: 17,
    k: 17,
    defaultPricePerKgRwf: 680,
    defaultMethod: "basal_incorporation",
  },
  {
    key: "DAP (Di-Ammonium Phosphate)",
    labelEn: "DAP 18-46-0 (Di-Ammonium Phosphate Starter)",
    labelRw: "DAP 18-46-0 (Ifumbire yo Gutera)",
    n: 18,
    p: 46,
    k: 0,
    defaultPricePerKgRwf: 720,
    defaultMethod: "basal_incorporation",
  },
  {
    key: "Urea 46% N (Prilled)",
    labelEn: "Urea 46-0-0 (High-Nitrogen Top-Dress)",
    labelRw: "Urea 46-0-0 (Ifumbire ya Azote yo Kubagara)",
    n: 46,
    p: 0,
    k: 0,
    defaultPricePerKgRwf: 720,
    defaultMethod: "side_dressing",
  },
  {
    key: "MOP / Muriate of Potash (KCl)",
    labelEn: "MOP / KCl 0-0-60 (Potassium Bulking Booster)",
    labelRw: "MOP / Potasiyumu 0-0-60 (Kubuza Ibirayi Kubora)",
    n: 0,
    p: 0,
    k: 60,
    defaultPricePerKgRwf: 780,
    defaultMethod: "side_dressing",
  },
  {
    key: "CAN (Calcium Ammonium Nitrate)",
    labelEn: "CAN 26-0-0 (Calcium Ammonium Nitrate)",
    labelRw: "CAN 26-0-0 (Ifumbire y'Inyanya n'Imboga)",
    n: 26,
    p: 0,
    k: 0,
    defaultPricePerKgRwf: 750,
    defaultMethod: "ring_placement",
  },
  {
    key: "Organic Compost / Manure",
    labelEn: "Enriched Organic Compost / Farmyard Manure (3-2-3)",
    labelRw: "Ifumbire y'Imborera Yaboze Neza (3-2-3)",
    n: 3,
    p: 2,
    k: 3,
    defaultPricePerKgRwf: 85,
    defaultMethod: "basal_incorporation",
  },
  {
    key: "Custom NPK Blend",
    labelEn: "Custom NPK Formulation (Specify N-P-K %)",
    labelRw: "Urundi Ruvange rwa NPK (Andika Igipimo)",
    n: 20,
    p: 10,
    k: 10,
    defaultPricePerKgRwf: 750,
    defaultMethod: "side_dressing",
  },
];

export function getApplicationMethodLabel(
  method: FertilizerApplicationMethod,
  language: Language
): string {
  switch (method) {
    case "basal_incorporation":
      return language === "rw"
        ? "Mu Mwobo / Gutera (Basal Incorporation)"
        : "Basal Furrow / Hole Incorporation";
    case "side_dressing":
      return language === "rw"
        ? "Ku Ruhande rw'Igihingwa (Side-Dressing)"
        : "Side-Dressing / Banding";
    case "ring_placement":
      return language === "rw"
        ? "Uruziga ku Mizi (Ring Placement)"
        : "Ring Placement Around Stems";
    case "foliar_spray":
      return language === "rw"
        ? "Gutera ku Mababi (Foliar Spray)"
        : "Foliar Liquid Application";
    case "fertigation":
      return language === "rw"
        ? "Mu Mazi yo Kuhira (Fertigation)"
        : "Drip Fertigation";
    case "broadcasting":
      return language === "rw"
        ? "Kumena mu Murima (Broadcasting)"
        : "Uniform Surface Broadcasting";
    default:
      return method;
  }
}

export const FertilizerApplicationModal: React.FC<
  FertilizerApplicationModalProps
> = ({
  isOpen,
  onClose,
  farms,
  language,
  defaultSeasonCode = "2025B",
  onSaveApplication,
}) => {
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    farms[0]?.id || "farm-1"
  );
  const [crop, setCrop] = useState<string>(
    farms[0]?.mainCrops?.[0] || "Ibirayi (Kinigi)"
  );
  const [seasonCode, setSeasonCode] = useState<string>(defaultSeasonCode);
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [fertilizerType, setFertilizerType] = useState<string>(
    FERTILIZER_PRESETS[0].key
  );
  const [nitrogenPct, setNitrogenPct] = useState<number>(17);
  const [phosphorusPct, setPhosphorusPct] = useState<number>(17);
  const [potassiumPct, setPotassiumPct] = useState<number>(17);
  const [amountKg, setAmountKg] = useState<number>(125);
  const [areaAppliedHa, setAreaAppliedHa] = useState<number>(
    farms[0]?.sizeHa || 0.5
  );
  const [applicationMethod, setApplicationMethod] =
    useState<FertilizerApplicationMethod>("basal_incorporation");
  const [growthStageApplied, setGrowthStageApplied] = useState<string>(
    "Planting / Basal Furrow"
  );
  const [costRwf, setCostRwf] = useState<number>(85000);
  const [operatorName, setOperatorName] = useState<string>("Faustin Mugabo");
  const [notes, setNotes] = useState<string>("");

  // Sync farm change with default crop and parcel area
  useEffect(() => {
    const farm = farms.find((f) => f.id === selectedFarmId);
    if (farm) {
      if (farm.mainCrops && farm.mainCrops.length > 0) {
        setCrop(farm.mainCrops[0]);
      }
      if (farm.sizeHa) {
        setAreaAppliedHa(farm.sizeHa);
      }
    }
  }, [selectedFarmId, farms]);

  if (!isOpen) return null;

  const handlePresetChange = (newType: string) => {
    setFertilizerType(newType);
    const preset = FERTILIZER_PRESETS.find((p) => p.key === newType);
    if (preset) {
      setNitrogenPct(preset.n);
      setPhosphorusPct(preset.p);
      setPotassiumPct(preset.k);
      setApplicationMethod(preset.defaultMethod);
      setCostRwf(Math.round(amountKg * preset.defaultPricePerKgRwf));
    }
  };

  const handleAmountChange = (newAmountKg: number) => {
    setAmountKg(newAmountKg);
    const preset = FERTILIZER_PRESETS.find((p) => p.key === fertilizerType);
    const unitPrice = preset ? preset.defaultPricePerKgRwf : 700;
    setCostRwf(Math.round(newAmountKg * unitPrice));
  };

  const safeAreaHa = Math.max(0.05, Number(areaAppliedHa) || 0.5);
  const calculatedRateKgPerHa = Math.round((Number(amountKg) || 0) / safeAreaHa);
  const npkRatioString = `${nitrogenPct}-${phosphorusPct}-${potassiumPct}`;

  const elementalNKg = Number(((amountKg * nitrogenPct) / 100).toFixed(1));
  const elementalPKg = Number(((amountKg * phosphorusPct) / 100).toFixed(1));
  const elementalKKg = Number(((amountKg * potassiumPct) / 100).toFixed(1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

    const newRecord: FertilizerApplicationLog = {
      id: `fert-${Date.now()}`,
      farmId: targetFarm?.id || "farm-1",
      farmName: targetFarm?.name || "Ibirayi Farm",
      crop: crop.trim() || "Ibirayi",
      seasonCode,
      date,
      fertilizerType,
      npkRatio: npkRatioString,
      nitrogenPct: Number(nitrogenPct),
      phosphorusPct: Number(phosphorusPct),
      potassiumPct: Number(potassiumPct),
      amountKg: Number(amountKg),
      areaAppliedHa: safeAreaHa,
      rateKgPerHa: calculatedRateKgPerHa,
      applicationMethod,
      growthStageApplied: growthStageApplied.trim(),
      costRwf: Number(costRwf),
      operatorName: operatorName.trim() || "Faustin Mugabo",
      syncStatus: "synced",
      notes:
        notes.trim() ||
        `${fertilizerType} (${npkRatioString}) applied via ${getApplicationMethodLabel(
          applicationMethod,
          "en"
        )} across ${safeAreaHa} Ha (${calculatedRateKgPerHa} kg/Ha).`,
    };

    onSaveApplication(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                {language === "rw"
                  ? "IBIKORWA BYO GUFUMBIRA (NPK LOG)"
                  : "GRANULAR NUTRIENT APPLICATION LOG"}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {language === "rw"
                  ? "Kwandika Ifumbire Yashyizwe mu Murima (NPK, Ingano & Uburyo)"
                  : "Record Granular Fertilizer Application Details"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white text-lg font-bold px-2 py-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Row 1: Farm Parcel, Crop & Season */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw" ? "Umurima (Farm Parcel)" : "Farm Parcel"}
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.district} • {f.sizeHa} Ha)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw" ? "Igihingwa (Crop)" : "Target Crop"}
              </label>
              <input
                type="text"
                required
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw" ? "Igihembwe & Itariki" : "Season & Date"}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={seasonCode}
                  onChange={(e) => setSeasonCode(e.target.value)}
                  className="px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold"
                >
                  <option value="2025B">2025B</option>
                  <option value="2026A">2026A</option>
                  <option value="2025C">2025C</option>
                  <option value="2025A">2025A</option>
                </select>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Fertilizer Type & Granular NPK Ratio (N% - P% - K%) */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Ubwoko bw'Ifumbire (Fertilizer Type)"
                    : "Fertilizer Product Type"}
                </label>
                <select
                  value={fertilizerType}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-semibold"
                >
                  {FERTILIZER_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {language === "rw" ? p.labelRw : p.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    {language === "rw"
                      ? "Igipimo cya NPK Ratio (N% - P% - K%)"
                      : "NPK Ratio Breakdown (N% - P% - K%)"}
                  </label>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    NPK {npkRatioString}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 block mb-0.5">
                      Nitrogen (N%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={nitrogenPct}
                      onChange={(e) => setNitrogenPct(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-stone-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 block mb-0.5">
                      Phosphorus (P%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={phosphorusPct}
                      onChange={(e) => setPhosphorusPct(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-stone-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 block mb-0.5">
                      Potassium (K%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={potassiumPct}
                      onChange={(e) => setPotassiumPct(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-stone-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Elemental Nutrient Delivery Live Strip */}
            <div className="pt-2 border-t border-stone-200/80 dark:border-stone-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-stone-600 dark:text-stone-300 font-semibold flex items-center space-x-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === "rw"
                    ? "Intungamubiri z'Umwimerere zinjira mu butaka:"
                    : "Pure Elemental Nutrients Delivered:"}
                </span>
              </span>
              <div className="flex flex-wrap items-center gap-2 font-mono font-bold">
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  N: {elementalNKg} kg
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  P₂O₅: {elementalPKg} kg
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  K₂O: {elementalKKg} kg
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Amount (Kg), Area Applied (Ha), Calculated Rate (Kg/Ha), and Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Ingano y'Ifumbire (Amount in Kg)"
                  : "Amount Applied (Kg)"}
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={amountKg}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-stone-700 dark:text-stone-300">
                  {language === "rw"
                    ? "Ubuso Bwafumbiriwe (Ha)"
                    : "Area Applied (Ha)"}
                </label>
                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  Rate: {calculatedRateKgPerHa} kg/Ha
                </span>
              </div>
              <input
                type="number"
                min={0.05}
                max={50}
                step={0.05}
                required
                value={areaAppliedHa}
                onChange={(e) => setAreaAppliedHa(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Uburyo bwo Gufumbira (Method)"
                  : "Application Method"}
              </label>
              <select
                value={applicationMethod}
                onChange={(e) =>
                  setApplicationMethod(
                    e.target.value as FertilizerApplicationMethod
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium"
              >
                <option value="basal_incorporation">
                  {getApplicationMethodLabel("basal_incorporation", language)}
                </option>
                <option value="side_dressing">
                  {getApplicationMethodLabel("side_dressing", language)}
                </option>
                <option value="ring_placement">
                  {getApplicationMethodLabel("ring_placement", language)}
                </option>
                <option value="foliar_spray">
                  {getApplicationMethodLabel("foliar_spray", language)}
                </option>
                <option value="fertigation">
                  {getApplicationMethodLabel("fertigation", language)}
                </option>
                <option value="broadcasting">
                  {getApplicationMethodLabel("broadcasting", language)}
                </option>
              </select>
            </div>
          </div>

          {/* Row 4: Growth Stage, Cost (RWF), and Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Ikigero cy'Igihingwa (Growth Stage)"
                  : "Crop Growth Stage"}
              </label>
              <select
                value={growthStageApplied}
                onChange={(e) => setGrowthStageApplied(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium"
              >
                <option value="Planting / Basal Furrow">
                  {language === "rw"
                    ? "Gutera / Mu Mwobo (Basal)"
                    : "Planting / Basal Furrow"}
                </option>
                <option value="Vegetative / Earthing-Up (Buttage)">
                  {language === "rw"
                    ? "Kubagara & Gusasira (Vegetative)"
                    : "Vegetative / Earthing-Up"}
                </option>
                <option value="Flowering & Fruit Set">
                  {language === "rw"
                    ? "Kurabya no Guheka (Flowering)"
                    : "Flowering & Fruit Set"}
                </option>
                <option value="Tuber Bulking & Grain Filling">
                  {language === "rw"
                    ? "Gukura kw'Ibirayi / Intete (Bulking)"
                    : "Tuber Bulking & Grain Filling"}
                </option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Ikiguzi cy'Ifumbire (Cost RWF)"
                  : "Total Cost (RWF)"}
              </label>
              <input
                type="number"
                min={0}
                step={500}
                required
                value={costRwf}
                onChange={(e) => setCostRwf(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Ushinzwe Igikorwa (Operator)"
                  : "Field Operator / Supervisor"}
              </label>
              <input
                type="text"
                required
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 5: Notes */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              {language === "rw"
                ? "Ibisobanuro by'Inyongera (Notes)"
                : "Agronomic Field Notes"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                language === "rw"
                  ? "Urugero: Yashyizwe mu mirongo ya cm 75 nyuma y'imvura..."
                  : "e.g. Incorporated into moist volcanic soil at 75cm row spacing..."
              }
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {language === "rw" ? "Hagarika" : "Cancel"}
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "Bika Ifumbire Yakoreshejwe"
                  : "Save Fertilizer Application"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
