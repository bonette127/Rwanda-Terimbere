import { Language } from "../types";

export interface GrowthStageMilestone {
  percentage: number;
  labelRw: string;
  labelEn: string;
  labelFr: string;
  descriptionRw: string;
  descriptionEn: string;
  agronomicTipRw: string;
  agronomicTipEn: string;
}

export interface GrowthStageInfo {
  percentage: number;
  stageName: string;
  stageDescription: string;
  stageCategory: "germination" | "vegetative" | "flowering" | "filling" | "maturing" | "ready";
  agronomicAdvice: string;
  colorClass: string;
  progressGradient: string;
  badgeBg: string;
  badgeText: string;
}

export const CROP_GROWTH_MILESTONES: GrowthStageMilestone[] = [
  {
    percentage: 15,
    labelRw: "Kumera no Gusohoka (15%)",
    labelEn: "Germination & Emergence (15%)",
    labelFr: "Germination & Levée (15%)",
    descriptionRw: "Imbuto zimaze kumera no kugaragara hejuru y'ubutaka.",
    descriptionEn: "Seedlings successfully emerged above ground level.",
    agronomicTipRw: "Kugenzura niba hari ibice bitameze neza no gusimbuza imbuto zangiritse kare.",
    agronomicTipEn: "Check germination uniformity and gap-fill missing spots within first 10 days.",
  },
  {
    percentage: 35,
    labelRw: "Gukura n'Amashami (35%)",
    labelEn: "Vegetative & Early Weeding (35%)",
    labelFr: "Croissance Végétative (35%)",
    descriptionRw: "Ibiti biragenda bikura bifite amashami menshi n'ibibabi bibisi.",
    descriptionEn: "Rapid leaf and canopy development, early root anchoring.",
    agronomicTipRw: "Kubagara bwa mbere no gushyiramo Urea cyangwa ifumbire yo hejuru y'amababi.",
    agronomicTipEn: "Perform first weeding and apply top-dressing nitrogen fertilizer (Urea/CAN).",
  },
  {
    percentage: 60,
    labelRw: "Kurabyo & Kuzana Ibirayi / Impeke (60%)",
    labelEn: "Flowering & Bulking / Tasseling (60%)",
    labelFr: "Floraison & Tubérisation (60%)",
    descriptionRw: "Igihingwa kirimo kurabyo no gukora ibirayi cyangwa amatoto y'ibigori.",
    descriptionEn: "Active flowering, tuber initiation, or silk and tassel emergence.",
    agronomicTipRw: "Kugenzura cyane urume (Late blight) n'udukoko; kuhira amazi ahagije.",
    agronomicTipEn: "High moisture and nutrient demand. Maintain preventive fungicide sprays against blight.",
  },
  {
    percentage: 85,
    labelRw: "Guhisha no Gukomera (85%)",
    labelEn: "Grain Filling & Tuber Maturation (85%)",
    labelFr: "Remplissage & Maturation (85%)",
    descriptionRw: "Umusaruro uri gukura no gufata ubukomere bwa nyuma.",
    descriptionEn: "Tubers expanding rapidly, grain moisture dropping, fruits ripening.",
    agronomicTipRw: "Hagarika gutera imiti ifite ubumara mbere y'isarura (Pre-harvest interval).",
    agronomicTipEn: "Observe chemical pre-harvest withdrawal periods. Prepare clean harvesting tools and sacks.",
  },
  {
    percentage: 100,
    labelRw: "Byiteguye Gusarurwa (100%)",
    labelEn: "Harvest Ready (100%)",
    labelFr: "Prêt pour la Récolte (100%)",
    descriptionRw: "Umusaruro wageze ku rugero rwo gusarurwa no kugezwa ku isoko.",
    descriptionEn: "Crop is at physiological maturity and ready for optimal harvest.",
    agronomicTipRw: "Sarura mu gihe cy'izuba riringaniye, urinde umusaruro ubuhehere bukabije.",
    agronomicTipEn: "Harvest under dry weather conditions. Sort and grade produce immediately for best market price.",
  },
];

export function getGrowthStageDetails(
  crop: string,
  rawPercentage: number | undefined,
  language: Language = "rw"
): GrowthStageInfo {
  const percentage = Math.max(0, Math.min(100, Math.round(rawPercentage ?? 0)));
  const cropLower = crop.toLowerCase();

  let stageCategory: GrowthStageInfo["stageCategory"] = "germination";
  let stageName = "";
  let stageDescription = "";
  let agronomicAdvice = "";
  let colorClass = "text-emerald-700 dark:text-emerald-400";
  let progressGradient = "from-emerald-500 to-teal-500";
  let badgeBg = "bg-emerald-100 dark:bg-emerald-950/80";
  let badgeText = "text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";

  if (percentage <= 15) {
    stageCategory = "germination";
    colorClass = "text-lime-700 dark:text-lime-400";
    progressGradient = "from-lime-500 to-emerald-500";
    badgeBg = "bg-lime-100 dark:bg-lime-950/80";
    badgeText = "text-lime-800 dark:text-lime-300 border-lime-300 dark:border-lime-700";

    if (language === "rw") {
      stageName = "Kumera no Gusohoka";
      stageDescription = "Imbuto zimaze kumera mu butaka, ibishibu biri kugaragara neza.";
      agronomicAdvice = "Kora isuzuma ry'aho imbuto zitamereye neza uzisimbuze vuba mbere y'iminsi 14.";
    } else {
      stageName = "Germination & Emergence";
      stageDescription = "Seeds have germinated with active seedling emergence.";
      agronomicAdvice = "Scout for uniform germination and perform gap filling if necessary within 10 days.";
    }
  } else if (percentage <= 40) {
    stageCategory = "vegetative";
    colorClass = "text-emerald-700 dark:text-emerald-400";
    progressGradient = "from-emerald-500 to-teal-500";
    badgeBg = "bg-emerald-100 dark:bg-emerald-950/80";
    badgeText = "text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";

    if (language === "rw") {
      stageName = "Gukura kw'Amashami (Vegetative)";
      stageDescription = "Ibibabi biri kwaguka no gushinga imizi ifite imbaraga.";
      agronomicAdvice = cropLower.includes("ibirayi")
        ? "Kubagara bwa mbere no gusasira ibitaka ku mashami (Buttage) kugira ngo bitazatwikwa n'izuba."
        : "Kubagara no gushyiramo Urea hejuru kugira ngo igihingwa gikure vuba.";
    } else {
      stageName = "Vegetative Growth & Canopy";
      stageDescription = "Rapid canopy expansion, leaf development, and strong root system.";
      agronomicAdvice = cropLower.includes("potato") || cropLower.includes("ibirayi")
        ? "Carry out first weeding and hilling/ridging (buttage) to protect expanding tubers from greening."
        : "Perform timely weeding and apply top-dress nitrogen fertilizer.";
    }
  } else if (percentage <= 65) {
    stageCategory = "flowering";
    colorClass = "text-teal-700 dark:text-teal-400";
    progressGradient = "from-teal-500 to-emerald-600";
    badgeBg = "bg-teal-100 dark:bg-teal-950/80";
    badgeText = "text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700";

    if (language === "rw") {
      stageName = cropLower.includes("ibirayi")
        ? "Kurabyo no Kwaguka kw'Ibirayi (Tuber Bulking)"
        : cropLower.includes("ibigori")
        ? "Kurabyo n'Imisomyo (Tasseling & Silking)"
        : "Kurabyo no Kuzana Umusaruro";
      stageDescription = "Igihe cyo gukenera amazi n'ifumbire cyane; umusaruro urimo kwirema.";
      agronomicAdvice = "Kurinda indwara z'urume (Blight) cyangwa inyonnyi zica imbuto; irinde kubura kw'amazi.";
    } else {
      stageName = cropLower.includes("potato") || cropLower.includes("ibirayi")
        ? "Flowering & Tuber Bulking"
        : cropLower.includes("maize") || cropLower.includes("ibigori")
        ? "Tasseling & Silking Stage"
        : "Flowering & Fruit Setting";
      stageDescription = "Critical physiological stage where yield potential is determined.";
      agronomicAdvice = "Crucial period for moisture and pest scouting. Apply preventive protection against late blight.";
    }
  } else if (percentage <= 88) {
    stageCategory = "filling";
    colorClass = "text-amber-700 dark:text-amber-400";
    progressGradient = "from-teal-600 via-emerald-600 to-amber-500";
    badgeBg = "bg-amber-100 dark:bg-amber-950/80";
    badgeText = "text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700";

    if (language === "rw") {
      stageName = "Guhisha no Gukomera (Maturing)";
      stageDescription = "Intete zirimo gukomera, amababi y'ibirayi arimo kugenda ahinduka umuhondo.";
      agronomicAdvice = "Hagarika gutera imiti y'ubumara (observe Pre-harvest interval). Tegura ububiko n'amasaho yo gusaruriramo.";
    } else {
      stageName = "Grain Filling / Skin Setting";
      stageDescription = "Final yield development, skin hardening, and grain drying.";
      agronomicAdvice = "Respect mandatory chemical pre-harvest withdrawal intervals. Prepare hermetic storage bags and crates.";
    }
  } else if (percentage < 100) {
    stageCategory = "maturing";
    colorClass = "text-emerald-700 dark:text-emerald-300";
    progressGradient = "from-emerald-600 via-amber-500 to-emerald-500";
    badgeBg = "bg-emerald-100 dark:bg-emerald-950/80";
    badgeText = "text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700";

    if (language === "rw") {
      stageName = "Guhisha Byuzuye (Ready in Days)";
      stageDescription = "Umusaruro ugeze ku mpera y'igihe cy'imikurire, usigaje iminsi mike ngo usarurwe.";
      agronomicAdvice = "Genzura ubuhehere bw'umusaruro mbere yo guca ibirayi cyangwa gutema ibigori.";
    } else {
      stageName = "Late Maturation (Ready Shortly)";
      stageDescription = "Crop reached full physiological maturity; nearing scheduled harvest.";
      agronomicAdvice = "Check grain moisture or skin firmness before scheduling labor crews.";
    }
  } else {
    stageCategory = "ready";
    colorClass = "text-emerald-600 dark:text-emerald-300";
    progressGradient = "from-emerald-500 via-teal-500 to-amber-400";
    badgeBg = "bg-emerald-100 dark:bg-emerald-950";
    badgeText = "text-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 font-black";

    if (language === "rw") {
      stageName = "Kweze Neza - Byiteguye Gusarurwa (100%)";
      stageDescription = "Umusaruro wageze ku rugero rwa 100%. Byiteguye gusarurwa no kwinjizwa mu bubiko!";
      agronomicAdvice = "Sarura hakiri kare wirinde imvura yakangiza umusaruro cyangwa gutinda mu murima bikawonona.";
    } else {
      stageName = "Harvest Ready (100%)";
      stageDescription = "Crop has reached 100% maturity and is ready for immediate harvest!";
      agronomicAdvice = "Harvest promptly to prevent field loss, mold, or over-ripening. Log yields into storage!";
    }
  }

  return {
    percentage,
    stageName,
    stageDescription,
    stageCategory,
    agronomicAdvice,
    colorClass,
    progressGradient,
    badgeBg,
    badgeText,
  };
}
