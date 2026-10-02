import React, { useState } from "react";
import { Language, CropDiagnosis, Farm } from "../types";
import {
  CropDiseaseCatalogEntry,
  CropDiseaseKnowledgeBase,
} from "./CropDiseaseKnowledgeBase";
import {
  BookOpen,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Leaf,
  FlaskConical,
  RefreshCw,
  Info,
  ChevronRight,
  Stethoscope,
} from "lucide-react";

interface CropDoctorViewProps {
  language: Language;
  farms: Farm[];
  diagnoses: CropDiagnosis[];
  onAddDiagnosis: (diagnosis: CropDiagnosis) => void;
}

const SAMPLE_CROP_CASES = [
  {
    nameRw: "Urume rw'Ibirayi (Late Blight)",
    nameEn: "Potato Late Blight",
    crop: "Ibirayi (Irish Potatoes)",
    imageUrl: "/src/assets/images/potato_late_blight_1790945783792.jpg",
    symptomsRw: "Amabara y'umukara ku mababi n'urume rwera munsi mu gitondo",
  },
  {
    nameRw: "Nkongwa Ibyasi (Fall Armyworm)",
    nameEn: "Fall Armyworm on Maize",
    crop: "Ibigori (Maize)",
    imageUrl: "/src/assets/images/maize_fall_armyworm_1790945797849.jpg",
    symptomsRw: "Amababi yacagaguwe n'umukungugu mu mutima w'ikigori",
  },
  {
    nameRw: "Urubobi rw'Ibishyimbo (Anthracnose)",
    nameEn: "Bean Anthracnose",
    crop: "Ibishyimbo (Beans)",
    imageUrl: "/src/assets/images/bean_anthracnose_1790945809808.jpg",
    symptomsRw: "Imitsi y'amababi yirabura n'ibibara ku mifuko y'ibishyimbo",
  },
  {
    nameRw: "Kirabiranya y'Urutoki (BXW Wilt)",
    nameEn: "Banana Xanthomonas Wilt",
    crop: "Urutoki (Bananas)",
    imageUrl: "/src/assets/images/banana_bxw_wilt_1790945821983.jpg",
    symptomsRw: "Amababi makuru ahinduka umuhondo kandi imvano ikuma",
  },
];

export const CropDoctorView: React.FC<CropDoctorViewProps> = ({
  language,
  farms,
  diagnoses,
  onAddDiagnosis,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<
    "combined" | "knowledge_base"
  >("combined");
  const [selectedCrop, setSelectedCrop] = useState<string>("Ibirayi (Irish Potatoes)");
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || "");
  const [symptomsInput, setSymptomsInput] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<CropDiagnosis | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // File upload handler
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
        setCurrentResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_CROP_CASES[0]) => {
    setSelectedCrop(sample.crop);
    setSymptomsInput(sample.symptomsRw);
    setPreviewImage(sample.imageUrl);
    setCurrentResult(null);
  };

  const handleSelectFromKnowledgeBase = (entry: CropDiseaseCatalogEntry) => {
    setSelectedCrop(`${entry.cropNameRw} (${entry.cropNameEn})`);
    setSymptomsInput(
      language === "rw"
        ? entry.symptomsRw.join("; ")
        : entry.symptomsEn.join("; ")
    );
    setPreviewImage(entry.imageUrl);
    setCurrentResult({
      id: `kb-diag-${Date.now()}`,
      farmId: selectedFarmId,
      cropType: `${entry.cropNameRw} (${entry.cropNameEn})`,
      imageUrl: entry.imageUrl,
      diagnosisDate: new Date().toISOString().split("T")[0],
      diseaseNameRw: entry.diseaseNameRw,
      diseaseNameEn: entry.diseaseNameEn,
      pathogen: entry.scientificName,
      confidenceScore: 98,
      severity:
        entry.severityLevel === "Critical"
          ? "critical"
          : entry.severityLevel === "High"
            ? "high"
            : "moderate",
      symptomsObserved:
        language === "rw" ? entry.symptomsRw : entry.symptomsEn,
      immediateActionRw: entry.organicPreventionMethodsRw[0],
      immediateActionEn: entry.organicPreventionMethodsEn[0],
      recommendedChemical: `RAB Tolerant Varieties: ${entry.rabResistantVarieties.join(", ")}`,
      organicAlternative:
        language === "rw"
          ? `${entry.organicBotanicalRecipeRw.title}: ${entry.organicBotanicalRecipeRw.ingredients}`
          : `${entry.organicBotanicalRecipeEn.title}: ${entry.organicBotanicalRecipeEn.ingredients}`,
      preventionAdviceRw:
        language === "rw"
          ? entry.organicPreventionMethodsRw.join(" • ")
          : entry.organicPreventionMethodsEn.join(" • "),
      rabCertifiedGuideline: `${entry.rabReferenceCode} • ${
        language === "rw"
          ? entry.organicBotanicalRecipeRw.applicationTiming
          : entry.organicBotanicalRecipeEn.applicationTiming
      }`,
      district: farms[0]?.district || "Musanze",
      sector: farms[0]?.sector || "Kinigi",
    });
    setActiveViewMode("combined");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAnalyze = async () => {
    if (!previewImage) return;
    setIsAnalyzing(true);
    setSavedNotice(false);

    try {
      const res = await fetch("/api/gemini/diagnose-crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: previewImage,
          cropType: selectedCrop,
          symptoms: symptomsInput,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.diagnosis) {
          const matchedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
          const newDiag: CropDiagnosis = {
            id: `diag-${Date.now()}`,
            farmId: selectedFarmId,
            cropType: data.diagnosis.cropType || selectedCrop,
            imageUrl: previewImage,
            diagnosisDate: new Date().toISOString().split("T")[0],
            diseaseNameRw: data.diagnosis.diseaseNameRw,
            diseaseNameEn: data.diagnosis.diseaseNameEn,
            pathogen: data.diagnosis.pathogen,
            confidenceScore: data.diagnosis.confidenceScore || 95,
            severity: data.diagnosis.severity || "high",
            symptomsObserved: data.diagnosis.symptomsObserved || [],
            immediateActionRw: data.diagnosis.immediateActionRw,
            immediateActionEn: data.diagnosis.immediateActionEn,
            recommendedChemical: data.diagnosis.recommendedChemical,
            organicAlternative: data.diagnosis.organicAlternative,
            preventionAdviceRw: data.diagnosis.preventionAdviceRw,
            rabCertifiedGuideline: data.diagnosis.rabCertifiedGuideline,
            district: matchedFarm?.district || "Musanze",
            sector: matchedFarm?.sector || "Kinigi",
            latitude: matchedFarm?.latitude,
            longitude: matchedFarm?.longitude,
          };
          setCurrentResult(newDiag);
          onAddDiagnosis(newDiag);
          setSavedNotice(true);
        }
      }
    } catch (err) {
      console.error("Diagnosis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-stone-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 text-emerald-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {language === "rw"
                  ? "Muganga w'Ibihingwa wa TERIMBERE & Isomero ry'Indwara"
                  : "TERIMBERE AI Crop Doctor & Disease Knowledge Base"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              {language === "rw"
                ? "Suzuma Indwara y'Igihingwa cyangwa Ushakishe mu Isomero ry'Uburyo Kamere"
                : "AI Crop Diagnosis Studio & Staple Crop Disease Knowledge Base"}
            </h1>
            <p className="text-stone-200 text-sm sm:text-base leading-relaxed">
              {language === "rw"
                ? "Ohereza ifoto y'ikibabi kirwaye cyangwa ushakishe mu gitabo cy'indwara z'ibihingwa ngandurarugo byo mu Rwanda n'uko wakwirinda ukoresheje uburyo bw'umwimerere (Organic Prevention)."
                : "Upload a leaf photo for AI diagnosis or search the Rwandan staple crop disease catalog for visual symptoms and organic prevention protocols."}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-black/30 p-1.5 border border-emerald-600/40 shrink-0 self-start">
            <button
              type="button"
              onClick={() => setActiveViewMode("combined")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeViewMode === "combined"
                  ? "bg-amber-400 text-stone-950"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "Isuzuma rya AI + Isomero"
                  : "AI Scanner + Catalog"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode("knowledge_base")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeViewMode === "knowledge_base"
                  ? "bg-amber-400 text-stone-950"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "Isomero ry'Indwara Rirambuye"
                  : "Disease Knowledge Base"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Searchable Crop Disease Knowledge Base (Always Accessible in Crop Doctor) */}
      {activeViewMode === "knowledge_base" ? (
        <CropDiseaseKnowledgeBase
          language={language}
          onSelectForDiagnosis={handleSelectFromKnowledgeBase}
        />
      ) : (
        <>

      {/* Main Diagnosis Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Photo Upload & Input */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>{language === "rw" ? "1. Hitamo cyangwa Fotora Igihingwa" : "1. Capture or Select Crop Photo"}</span>
            </h2>

            {/* Farm & Crop Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Umurima" : "Farm Plot"}
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ubwoko bw'Igihingwa" : "Crop Type"}
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  <option value="Ibirayi (Irish Potatoes)">Ibirayi (Irish Potatoes)</option>
                  <option value="Ibigori (Maize)">Ibigori (Maize)</option>
                  <option value="Ibishyimbo (Beans)">Ibishyimbo (Beans)</option>
                  <option value="Inyanya (Tomatoes)">Inyanya (Tomatoes)</option>
                  <option value="Icyayi & Ikawa">Icyayi & Ikawa</option>
                  <option value="Imboga n'Imbuto">Imboga n'Imbuto</option>
                </select>
              </div>
            </div>

            {/* Image Upload Area */}
            <div className="relative border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl p-4 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-stone-50 dark:bg-stone-800/40">
              {previewImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden shadow-inner border border-stone-200 dark:border-stone-700 bg-black">
                    <img
                      src={previewImage}
                      alt="Crop symptom preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-medium hover:bg-rose-600 transition-colors"
                    >
                      {language === "rw" ? "Guhindura" : "Remove"}
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {language === "rw" ? "Ifoto yiteguye gusesengurwa na AI" : "Image ready for AI pathology analysis"}
                  </p>
                </div>
              ) : (
                <div className="py-8 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <label
                      htmlFor="crop-photo-input"
                      className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{language === "rw" ? "Fata Ifoto cyangwa Shyiraho" : "Upload or Snap Photo"}</span>
                    </label>
                    <input
                      id="crop-photo-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFile}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {language === "rw"
                      ? "Fata ifoto yegereye neza ikibabi cyangwa ikimenyetso (JPG, PNG)"
                      : "Clear close-up photo of the affected leaf, stem, or root"}
                  </p>
                </div>
              )}
            </div>

            {/* Symptoms Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === "rw"
                  ? "Sobanura ibimenyetso wabonye (Biteganyijwe)"
                  : "Describe observed symptoms (Optional)"}
              </label>
              <textarea
                rows={2}
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder={
                  language === "rw"
                    ? "Urugero: Amababi yirabuye, urume rwera mu gitondo, ibirayi biraraba..."
                    : "e.g. Black spots on leaves, powdery mildew, yellowing veins..."
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* Diagnose Action Button */}
            <button
              type="button"
              disabled={!previewImage || isAnalyzing}
              onClick={handleAnalyze}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-xs ${
                !previewImage || isAnalyzing
                  ? "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20 active:scale-[0.99]"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {language === "rw"
                      ? "AI irimo gusesengura ifoto..."
                      : "AI Pathologist Analyzing Image..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {language === "rw"
                      ? "Sesengura Indwara (Run AI Diagnosis)"
                      : "Diagnose Disease with AI"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sample Cases to Test */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
              {language === "rw" ? "Urugero rw'Ifoto ushobora gukoresha ubu" : "Quick Test Cases (RAB Reference Photos)"}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_CROP_CASES.map((sc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sc)}
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-colors group"
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden mb-2 bg-stone-200">
                    <img src={sc.imageUrl} alt={sc.nameRw} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                    {language === "rw" ? sc.nameRw : sc.nameEn}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{sc.crop}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Diagnostic Prescription Result */}
        <div className="lg:col-span-7 space-y-5">
          {currentResult ? (
            <div className="bg-white dark:bg-stone-900 border border-emerald-500/30 dark:border-emerald-500/30 rounded-2xl p-6 shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              {/* Top Diagnosis Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold">
                      {currentResult.cropType}
                    </span>
                    <span className="text-xs text-stone-400">|</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {currentResult.diagnosisDate}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-display">
                    {language === "rw" ? currentResult.diseaseNameRw : currentResult.diseaseNameEn}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                    Pathogen: {currentResult.pathogen}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-stone-400">
                      {language === "rw" ? "Icyizere cya AI" : "Confidence"}
                    </div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {currentResult.confidenceScore}%
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                      currentResult.severity === "critical"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                        : currentResult.severity === "high"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                        : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                    }`}
                  >
                    {currentResult.severity}
                  </span>
                </div>
              </div>

              {savedNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {language === "rw"
                      ? "Iyi raporo y'uburwayi yashyizwe mu mateka y'umurima wawe!"
                      : "Prescription successfully saved to your farm's digital health record!"}
                  </span>
                </div>
              )}

              {/* Observed Symptoms */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>{language === "rw" ? "Ibimenyetso byabonetse ku ifoto" : "Observed Diagnostic Symptoms"}</span>
                </h3>
                <ul className="space-y-1.5 pl-2">
                  {currentResult.symptomsObserved.map((sym, i) => (
                    <li key={i} className="text-xs text-stone-700 dark:text-stone-300 flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>{sym}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Immediate Curative Action */}
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
                <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{language === "rw" ? "Icyo gukora ako kanya (Immediate Curative Action)" : "Immediate Curative Action"}</span>
                </div>
                <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
                  {language === "rw" ? currentResult.immediateActionRw : currentResult.immediateActionEn}
                </p>
              </div>

              {/* Chemical vs Organic Prescription Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Registered Chemical Treatment */}
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <FlaskConical className="w-4 h-4" />
                    <span>{language === "rw" ? "Umuti wemejwe na RAB (Registered Chemical)" : "Registered Chemical Treatment"}</span>
                  </div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-white">
                    {currentResult.recommendedChemical}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {language === "rw"
                      ? "Baza agurudira (Agrodealer) wemewe cyangwa koperative yawe."
                      : "Obtain from a certified agrodealer or cooperative input hub."}
                  </p>
                </div>

                {/* Organic / Alternative Control */}
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <span>{language === "rw" ? "Uburyo bw'umwimerere (Organic / Biological)" : "Organic Alternative"}</span>
                  </div>
                  <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
                    {currentResult.organicAlternative}
                  </p>
                </div>
              </div>

              {/* Preventive Advice */}
              <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-1.5">
                <div className="flex items-center space-x-2 text-stone-900 dark:text-white font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span>{language === "rw" ? "Inama yo gukumira mu bihembwe bitaha" : "Long-term Prevention Strategy"}</span>
                </div>
                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {currentResult.preventionAdviceRw}
                </p>
              </div>

              {/* RAB Certification Stamp */}
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-emerald-900 text-white text-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="text-[11px] leading-snug">
                  <span className="font-extrabold text-emerald-200 block">
                    RAB Certified Agricultural Advisory
                  </span>
                  {currentResult.rabCertifiedGuideline}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                <Leaf className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                  {language === "rw" ? "Nta raporo y'uburwayi irakorwa" : "No Active Diagnosis Yet"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {language === "rw"
                    ? "Fotora igihingwa cyangwa ukande ku ngero z'ifoto ziri ku ruhande rw'ibumoso kugira ngo ubone inama n'umuti byahita bikoreshwa."
                    : "Upload a photo or tap one of the reference test samples on the left to generate an immediate prescription."}
                </p>
              </div>
            </div>
          )}

          {/* Past Diagnoses History */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider flex items-center justify-between">
              <span>{language === "rw" ? "Amateka y'Ibyasuzumwe (Diagnosis History)" : "Past Crop Diagnoses"}</span>
              <span className="text-[11px] font-normal text-stone-400">{diagnoses.length} cases</span>
            </h3>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {diagnoses.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => setCurrentResult(diag)}
                  className="py-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/50 p-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={diag.imageUrl}
                      alt={diag.cropType}
                      className="w-12 h-12 rounded-lg object-cover border border-stone-200 dark:border-stone-700 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                        {language === "rw" ? diag.diseaseNameRw : diag.diseaseNameEn}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {diag.cropType} • {diag.diagnosisDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {diag.confidenceScore}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Searchable Crop Disease Knowledge Base Catalog */}
      <CropDiseaseKnowledgeBase
        language={language}
        onSelectForDiagnosis={handleSelectFromKnowledgeBase}
      />
        </>
      )}
    </div>
  );
};
