import React, { useState } from "react";
import { Language } from "../types";
import {
  Sprout,
  Shovel,
  Leaf,
  Droplets,
  Wheat,
  Coins,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Calendar,
  Smartphone,
  Eye,
  Check,
} from "lucide-react";

interface FarmWorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onNavigateToTab?: (tab: string) => void;
  onOpenSoilMap?: () => void;
  onOpenPlanCreator?: () => void;
  onOpenActivityModal?: () => void;
  onOpenCropDoctor?: () => void;
  onOpenHarvestModal?: () => void;
  onOpenMarketPrices?: () => void;
}

export interface WorkflowStage {
  step: number;
  id: string;
  iconName: "shovel" | "seed" | "leaf" | "water" | "harvest" | "market";
  titleRw: string;
  titleEn: string;
  timeframeRw: string;
  timeframeEn: string;
  summaryRw: string;
  summaryEn: string;
  bulletsRw: string[];
  bulletsEn: string[];
  goldenRuleRw: string;
  goldenRuleEn: string;
  targetTab: string;
  actionLabelRw: string;
  actionLabelEn: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    step: 1,
    id: "land_prep",
    iconName: "shovel",
    titleRw: "Intambwe ya 1: Gutegura Ubutaka & Gusuzuma",
    titleEn: "Step 1: Land Preparation & Soil Health Testing",
    timeframeRw: "Iminsi 15–30 mbere yo gutera",
    timeframeEn: "15–30 Days Before Planting",
    summaryRw:
      "Tegura umurima kare: hinga ushyiremo ifumbire y'imborera ishushe neza, upime pH n'ubushobozi bw'ubutaka.",
    summaryEn:
      "Prepare your parcel in advance: deep till 30cm, incorporate well-cured compost/manure, and assess soil pH.",
    bulletsRw: [
      "Cukura santimetero 30 z'ubujyakuzimu kugira ngo imizi izagende yisanzuye.",
      "Shyiramo ifumbire y'imborera iboze neza (toni 10 kugeza kuri 20 kuri hegitari).",
      "Pima ubutaka (Soil Test) kumenya niba bukeneye ishwagara yo kugabanya ubusharire.",
    ],
    bulletsEn: [
      "Deep-till at least 30cm to allow deep root penetration and aeration.",
      "Incorporate 10–20 tons/ha of fully decomposed organic manure.",
      "Check soil pH to verify if agricultural lime is needed to neutralize acidity.",
    ],
    goldenRuleRw:
      "Icyitonderwa: Ntukereze ifumbire y'imborera hejuru y'izuba; yinjize mu butaka ucecekeshe imizi.",
    goldenRuleEn:
      "Golden Rule: Never leave organic manure exposed to harsh sun; incorporate immediately into topsoil.",
    targetTab: "dashboard",
    actionLabelRw: "Reba Ikarita y'Ubutaka (Soil Health Map)",
    actionLabelEn: "View Parcel Soil Health Map",
    colorScheme: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-900 dark:text-amber-100",
      badgeBg: "bg-amber-100 dark:bg-amber-900/60",
      badgeText: "text-amber-800 dark:text-amber-200",
    },
  },
  {
    step: 2,
    id: "certified_planting",
    iconName: "seed",
    titleRw: "Intambwe ya 2: Imbuto Zemejwe & Gutera",
    titleEn: "Step 2: Certified Seeds Selection & Precise Planting",
    timeframeRw: "Umunsi wa mbere w'imvura iboneye",
    timeframeEn: "Onset of Consistent Rains (Day 1)",
    summaryRw:
      "Koresha imbuto yemejwe na RAB gusa, ubare intera iboneye, maze ushyiremo ifumbire ibanziriza izindi (DAP / NPK).",
    summaryEn:
      "Use only RAB-certified seed varieties, maintain exact row/plant spacing, and apply basal fertilizer (DAP).",
    bulletsRw: [
      "Ibirayi: Intera ya 75 cm hagati y'imirongo na 30 cm hagati y'ingeli.",
      "Ibigori: Intera ya 75 cm x 25 cm (imbuto imwe mu mwobo).",
      "Shyira ifumbire ya DAP cyangwa NPK 17-17-17 munsi y'imbuto itunganye itayikoraho.",
    ],
    bulletsEn: [
      "Irish Potatoes: 75 cm row spacing x 30 cm between seed tubers.",
      "Maize: 75 cm row spacing x 25 cm between plants (1 seed per hole).",
      "Apply basal DAP or NPK fertilizer below seed level with a soil buffer.",
    ],
    goldenRuleRw:
      "Icyitonderwa: Ntugakoreshe imbuto yasaruwe mu bubiko butizewe; ikoresheze imbuto yemejwe.",
    goldenRuleEn:
      "Golden Rule: Avoid degenerated grain as seed; certified seed doubles harvest yield.",
    targetTab: "plans",
    actionLabelRw: "Tegura Ihinga (Create Planting Plan)",
    actionLabelEn: "Create Certified Planting Plan",
    colorScheme: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-900 dark:text-emerald-100",
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/60",
      badgeText: "text-emerald-800 dark:text-emerald-200",
    },
  },
  {
    step: 3,
    id: "weeding_feeding",
    iconName: "leaf",
    titleRw: "Intambwe ya 3: Kubagara & Gusasira Ifumbire (Urea)",
    titleEn: "Step 3: Timely Weeding & Top-Dressing Fertilization",
    timeframeRw: "Icyumweru cya 3 kugeza ku cya 4 (Iminsi 21–30)",
    timeframeEn: "Weeks 3 to 4 (Days 21–30 Post-Emergence)",
    summaryRw:
      "Kura ibyatsi bibi mu murima amazi atarakendera, maze ushiremo ifumbire ya Urea ifasha amashami n'ibibabi gutoha.",
    summaryEn:
      "Eliminate weed competition early, apply nitrogenous top-dressing (Urea), and ridge soil around stems.",
    bulletsRw: [
      "Kubagara bwa mbere biba ku minsi 21–25 kugira ngo ibyatsi bitanywa ifumbire.",
      "Shyira ifumbire ya Urea (50–100 kg/ha) ku ntera ya cm 5 uvuye ku ruti rw'igihingwa.",
      "Fubika imizi (Earthing up) ku birayi no ku bigori kugira ngo bidahirika.",
    ],
    bulletsEn: [
      "First weeding must occur before weeds exceed 5cm height to stop nutrient theft.",
      "Side-dress Urea at 5cm distance from crop stems to prevent root scorch.",
      "Mound soil up (ridging) to support root anchor and tuber formation.",
    ],
    goldenRuleRw:
      "Icyitonderwa: Shira Urea mu butaka buhehereye; ntugashyire Urea mu zuba ry'amanywa rigurumana.",
    goldenRuleEn:
      "Golden Rule: Apply Urea only to moist soil; midday application on dry ground volatilizes nitrogen.",
    targetTab: "activities",
    actionLabelRw: "Andika Igikorwa cyo Kubagara (Log Activity)",
    actionLabelEn: "Log Weeding & Feeding Activity",
    colorScheme: {
      bg: "bg-teal-50 dark:bg-teal-950/40",
      border: "border-teal-200 dark:border-teal-800",
      text: "text-teal-900 dark:text-teal-100",
      badgeBg: "bg-teal-100 dark:bg-teal-900/60",
      badgeText: "text-teal-800 dark:text-teal-200",
    },
  },
  {
    step: 4,
    id: "watering_doctor",
    iconName: "water",
    titleRw: "Intambwe ya 4: Kuhira & Kurinda Indwara n'Ibyonnyi",
    titleEn: "Step 4: Smart Irrigation & Crop Disease Defense",
    timeframeRw: "Icyumweru cya 5 kugeza ku cya 10 (Imikurire n'Iburabyo)",
    timeframeEn: "Weeks 5 to 10 (Vegetative & Flowering)",
    summaryRw:
      "Genzura ubuhehere bw'ubutaka; fotora amababi arwaye ukoresheje AI Crop Doctor umenye umuti nyawo hakiri kare.",
    summaryEn:
      "Maintain optimal root moisture windows, and scan suspected leaves with AI Crop Doctor for instant remedy.",
    bulletsRw: [
      "Kuhira: Hira mu gitondo kare (06:00–08:00) cyangwa ku mugoroba (16:00–18:00) wizigame 35% y'amazi.",
      "Reba amabara ku mababi (Urume / Blight, Kirabiranya, Nkongwa y'Ibigori).",
      "Fata ifoto na telefone muri AI Crop Doctor uhite ubona umuti wemejwe na RAB.",
    ],
    bulletsEn: [
      "Irrigation: Water early morning or late afternoon to save 35% evaporation loss.",
      "Scout for early leaf lesions (Late Blight, Bacterial Wilt, Fall Armyworm).",
      "Snap a photo with AI Crop Doctor to receive instant RAB-certified agronomic remedies.",
    ],
    goldenRuleRw:
      "Icyitonderwa: Indwara y'urume yica umurima mu minsi 4; tera umuti w'urume mbere y'uko amababi yose yuma.",
    goldenRuleEn:
      "Golden Rule: Late Blight destroys fields in 96 hours; spray protective fungicides at the first sign.",
    targetTab: "cropDoctor",
    actionLabelRw: "Pima Amababi na AI Crop Doctor",
    actionLabelEn: "Diagnose with AI Crop Doctor",
    colorScheme: {
      bg: "bg-sky-50 dark:bg-sky-950/40",
      border: "border-sky-200 dark:border-sky-800",
      text: "text-sky-900 dark:text-sky-100",
      badgeBg: "bg-sky-100 dark:bg-sky-900/60",
      badgeText: "text-sky-800 dark:text-sky-200",
    },
  },
  {
    step: 5,
    id: "harvest_moisture",
    iconName: "harvest",
    titleRw: "Intambwe ya 5: Isarura & Kugenzura Ubuhehere",
    titleEn: "Step 5: Selective Harvesting & Moisture Verification",
    timeframeRw: "Icyumweru cya 12 kugeza ku cya 16 (Igihe cy'Isarura)",
    timeframeEn: "Weeks 12 to 16 (Full Maturity)",
    summaryRw:
      "Sarura igihe cyiza cy'izuba, pima ubuhehere bw'umusaruro, maze uhunike mu mifuka yizewe ya PICS.",
    summaryEn:
      "Harvest during clear weather, verify seed grain moisture (≤13.5%), and seal in hermetic PICS bags.",
    bulletsRw: [
      "Ibigori: Ubuhehere bugomba kugera munsi ya 13.5% mbere yo kubihunika mu bubiko.",
      "Ibirayi: Sarura nyuma y'iminsi 10 uruti rwumye kugira ngo uruhu rwikomeze.",
      "Koresha amakaziye n'imifuka ya PICS irinda udukoko n'uburozi bwa Aflatoxin.",
    ],
    bulletsEn: [
      "Maize: Moisture content must test below 13.5% before long-term storage to prevent mold.",
      "Potatoes: De-haulm (cut foliage) 10 days before harvest to harden skin and prevent bruising.",
      "Use clean crates and PICS hermetic bags to safeguard harvest against weevils and aflatoxin.",
    ],
    goldenRuleRw:
      "Icyitonderwa: Ntukahunike umusaruro utumye neza; ubuhehere burenze 14% buteza Aflatoxin.",
    goldenRuleEn:
      "Golden Rule: Never store damp grain; moisture >14% triggers dangerous mold and aflatoxin spoilage.",
    targetTab: "harvestSales",
    actionLabelRw: "Andika Umusaruro & Ikarita ya QR",
    actionLabelEn: "Record Harvest & Print QR Label",
    colorScheme: {
      bg: "bg-orange-50 dark:bg-orange-950/40",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-900 dark:text-orange-100",
      badgeBg: "bg-orange-100 dark:bg-orange-900/60",
      badgeText: "text-orange-800 dark:text-orange-200",
    },
  },
  {
    step: 6,
    id: "market_sales",
    iconName: "market",
    titleRw: "Intambwe ya 6: Kugurisha ku Isoko & Inyungu",
    titleEn: "Step 6: Smart Market Wholesale & Profit Analytics",
    timeframeRw: "Nyuma yo gusarura kugeza ku gucuruza",
    timeframeEn: "Post-Harvest to Commercial Sale",
    summaryRw:
      "Gereranya ibiciro by'amasoko manini y'u Rwanda, koresha ikarita ya QR ku bucuruzi, maze ubare inyungu y'umwimerere.",
    summaryEn:
      "Compare real-time wholesale market rates (Kigali, Musanze, Huye), verify batch QR, and log net profits.",
    bulletsRw: [
      "Reba ibiciro by'isoko rya Nyabugogo, Kimironko, n'iry'iwanyu mbere yo kwemeranya n'umucuruzi.",
      "Tanga ikarita ya QR (Traceability) yemeza aho umusaruro waturutse n'ubuziranenge bwawo.",
      "Andika igurisha ryose muri TERIMBERE urebe inyungu nyakuri usigaranye mu mufuka.",
    ],
    bulletsEn: [
      "Compare benchmark wholesale rates across Rwandan trading hubs before signing buyer contracts.",
      "Attach printable batch QR code to establish authentic single-origin farm traceability.",
      "Log sales digitally in TERIMBERE to calculate gross revenue, expenses, and net profit.",
    ],
    goldenRuleRw:
      "Icyitonderwa: Ntukurangure udafite igiciro k'isoko k'uyu munsi; amakuru niyo agutsindira inyungu!",
    goldenRuleEn:
      "Golden Rule: Never negotiate blindly; live market intelligence secures fair farmer profits.",
    targetTab: "profit",
    actionLabelRw: "Reba Inyungu & Ibiciro by'Isoko",
    actionLabelEn: "View Market Prices & Net Profit",
    colorScheme: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-900 dark:text-emerald-100",
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/60",
      badgeText: "text-emerald-800 dark:text-emerald-200",
    },
  },
];

export const FarmWorkflowGuideModal: React.FC<FarmWorkflowGuideModalProps> = ({
  isOpen,
  onClose,
  language,
  onNavigateToTab,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentStage = WORKFLOW_STAGES[activeStepIndex];

  const handleNext = () => {
    stopSpeech();
    if (activeStepIndex < WORKFLOW_STAGES.length - 1) {
      setActiveStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    stopSpeech();
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handlePlayVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (isSpeaking) {
      stopSpeech();
      return;
    }

    const textToRead =
      language === "rw"
        ? `${currentStage.titleRw}. ${currentStage.summaryRw} ${currentStage.goldenRuleRw}`
        : `${currentStage.titleEn}. ${currentStage.summaryEn} ${currentStage.goldenRuleEn}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStepAction = (targetTab: string) => {
    stopSpeech();
    onClose();
    if (onNavigateToTab) {
      onNavigateToTab(targetTab);
    }
  };

  const renderIcon = (name: string, className: string) => {
    switch (name) {
      case "shovel":
        return <Shovel className={className} />;
      case "seed":
        return <Sprout className={className} />;
      case "leaf":
        return <Leaf className={className} />;
      case "water":
        return <Droplets className={className} />;
      case "harvest":
        return <Wheat className={className} />;
      case "market":
        return <Coins className={className} />;
      default:
        return <Sprout className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-3xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white border-b border-emerald-800 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {language === "rw"
                    ? "Urugendo rw'Umuhinzi kuva ku Butaka kugeza ku Isoko"
                    : "Farmer Seed-to-Sale Visual Workflow Guide"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {activeStepIndex + 1}/6
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 max-w-xl leading-relaxed">
                {language === "rw"
                  ? "Intambwe 6 z'ingenzi ziboneye ku muhinzi wese mu buryo bworoshye kandi bugaragara neza."
                  : "6 visual, clear operational stages mapped from planting to profitable market sale."}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6-Step Visual Timeline Progress Bar */}
        <div className="bg-stone-100 dark:bg-stone-850 px-4 sm:px-6 py-3 border-b border-stone-200 dark:border-stone-800">
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {WORKFLOW_STAGES.map((s, idx) => {
              const isCurrent = idx === activeStepIndex;
              const isPast = idx < activeStepIndex;

              return (
                <button
                  key={s.id}
                  onClick={() => {
                    stopSpeech();
                    setActiveStepIndex(idx);
                  }}
                  className={`flex flex-col items-center text-center p-1.5 sm:p-2 rounded-xl transition-all ${
                    isCurrent
                      ? "bg-white dark:bg-stone-800 shadow-xs border-2 border-emerald-600 scale-102"
                      : isPast
                      ? "bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                      : "opacity-60 hover:opacity-100 text-stone-500"
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 transition-all ${
                      isCurrent
                        ? "bg-emerald-800 text-white shadow-xs"
                        : isPast
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : s.step}
                  </div>
                  <span className="hidden sm:block text-[10px] font-bold truncate max-w-full">
                    {language === "rw"
                      ? s.titleRw.split(":")[1]?.split("&")[0]?.trim() || s.titleRw
                      : s.titleEn.split(":")[1]?.split("&")[0]?.trim() || s.titleEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Stage Detail Card */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div
            className={`p-5 sm:p-6 rounded-3xl border transition-all ${currentStage.colorScheme.bg} ${currentStage.colorScheme.border}`}
          >
            {/* Stage Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400 border border-stone-200/80 dark:border-stone-700">
                  {renderIcon(currentStage.iconName, "w-6 h-6")}
                </div>
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider mb-1 ${currentStage.colorScheme.badgeBg} ${currentStage.colorScheme.badgeText}`}
                  >
                    {language === "rw"
                      ? currentStage.timeframeRw
                      : currentStage.timeframeEn}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                    {language === "rw" ? currentStage.titleRw : currentStage.titleEn}
                  </h3>
                </div>
              </div>

              {/* Read Aloud Button for Farmers */}
              <button
                type="button"
                onClick={handlePlayVoice}
                className={`self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                  isSpeaking
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-50 border border-stone-300 dark:border-stone-700"
                }`}
                title={
                  language === "rw"
                    ? "Kanda wumve ibisobanuro bivugwa"
                    : "Listen to audio explanation"
                }
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>{language === "rw" ? "Hagarika" : "Stop Voice"}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {language === "rw" ? "Umva Ibisobanuro" : "Listen Audio"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Stage Summary */}
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 mt-4 leading-relaxed">
              {language === "rw" ? currentStage.summaryRw : currentStage.summaryEn}
            </p>

            {/* Checklist Bullets */}
            <div className="mt-4 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">
                {language === "rw"
                  ? "Ibintu 3 by'ingenzi ugomba gukora:"
                  : "Key Action Items for this Stage:"}
              </h4>
              <div className="space-y-2">
                {(language === "rw"
                  ? currentStage.bulletsRw
                  : currentStage.bulletsEn
                ).map((b, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-2.5 p-3 rounded-2xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/70 dark:border-stone-800/70 shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Golden Agronomist Rule Callout */}
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/70 flex items-start space-x-2.5 text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed">
              <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  {language === "rw"
                    ? "Inama ya Zahabu y'Umugenzuzi wa RAB:"
                    : "RAB Agronomist Golden Recommendation:"}
                </strong>
                {language === "rw"
                  ? currentStage.goldenRuleRw
                  : currentStage.goldenRuleEn}
              </div>
            </div>

            {/* One-click Action to corresponding app feature */}
            <div className="mt-5 pt-4 border-t border-stone-200/80 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Kanda aha ufungure uruhande rukurikira:"
                  : "Open matching module directly:"}
              </span>
              <button
                type="button"
                onClick={() => handleStepAction(currentStage.targetTab)}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md active:scale-98"
              >
                <span>
                  {language === "rw"
                    ? currentStage.actionLabelRw
                    : currentStage.actionLabelEn}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeStepIndex === 0}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{language === "rw" ? "Ibanjirije" : "Previous Stage"}</span>
          </button>

          <span className="text-xs font-mono font-bold text-stone-500 dark:text-stone-400">
            {activeStepIndex + 1} / 6
          </span>

          {activeStepIndex < WORKFLOW_STAGES.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs"
            >
              <span>{language === "rw" ? "Ikindi Gikorwa" : "Next Stage"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{language === "rw" ? "Birarangiye" : "Done / Got It"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
