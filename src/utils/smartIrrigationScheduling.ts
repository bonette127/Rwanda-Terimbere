import {
  Farm,
  FarmActivity,
  FarmPlan,
  ParcelSoilSensorReading,
  CropVarietyIrrigationRule,
} from "../types";
import { getForecastForDistrict } from "../data/weatherForecastData";
import { getCropWaterSensitivity } from "./irrigationDemand";

export interface HistoricalSoilHealthProfile {
  farmId: string;
  soilType: string;
  soilCategory: "volcanic" | "ferralsol" | "clay_loam" | "sandy_loam" | "alluvial";
  organicMatterPct: number;
  availableWaterCapacityMmPerM: number;
  infiltrationRateMmPerHour: number;
  rootZoneDepthCm: number;
  currentMoisturePct: number;
  historicalAvgMoisturePct: number;
  daysSinceLastIrrigation: number;
  lastIrrigationDate?: string;
  soilHealthScore: number; // 0 - 100
  compactionRisk: "low" | "medium" | "high";
  drainageCharacteristicRw: string;
  drainageCharacteristicEn: string;
}

export interface DayWeatherProjection {
  dateIso: string;
  dayOffset: number; // 0 = Today, 1 = Tomorrow, ..., 6
  dayNameRw: string;
  dayNameEn: string;
  tempMinC: number;
  tempMaxC: number;
  tempAvgC: number;
  rainfallMm: number;
  popPct: number;
  humidityPct: number;
  evapoTranspirationEt0Mm: number;
  projectedMoisturePctWithoutIrrigation: number;
  rainRisk: "none" | "light" | "heavy";
  weatherConditionRw: string;
  weatherConditionEn: string;
  weatherIcon: string;
  isOptimalDay: boolean;
}

export interface OptimalIrrigationWindowProposal {
  id: string;
  farmId: string;
  farmName: string;
  district: string;
  sector: string;
  crop: string;
  sizeHa: number;
  soilProfile: HistoricalSoilHealthProfile;
  scheduledDateIso: string;
  dayOffset: number;
  dayNameRw: string;
  dayNameEn: string;
  recommendedWindowPreset: "morning" | "evening" | "custom";
  timeRangeFormatted: string; // e.g., "06:00 – 08:30"
  windowLabelEn: string;
  windowLabelRw: string;
  waterDepthMm: number;
  waterVolumeLiters: number;
  waterVolumeLitersPerHa: number;
  estimatedRuntimeMinutes: number;
  irrigationMethod: "drip" | "sprinkler" | "furrow" | "manual";
  savingsPctVsMidday: number;
  efficiencyScore: number; // 0 - 100%
  justificationEn: string;
  justificationRw: string;
  soilReasoningEn: string;
  soilReasoningRw: string;
  urgency: "urgent" | "recommended" | "maintenance";
  isAccepted: boolean;
  isAdjusted: boolean;
  acceptedActivityId?: string;
  sevenDayProjections: DayWeatherProjection[];
}

// Reference fallback parcels when starting on a clean slate
export const CLEAN_SLATE_SMART_PARCELS: Farm[] = [
  {
    id: "parcel-kinigi-volcanic",
    name: "Kinigi Volcanic Terraced Plot A",
    location: "Musanze",
    province: "Amajyaruguru",
    district: "Musanze",
    sector: "Kinigi",
    agroZone: "Birunga Volcanic Highlands",
    altitude: 2240,
    altitudeMeters: 2240,
    sizeHa: 1.2,
    soilType: "Volcanic Andosol (Rich Loam)",
    irrigationType: "irrigated",
    mainCrops: ["Ibirayi (Kinigi)", "Ibishyimbo"],
    createdAt: "2026-01-01",
  },
  {
    id: "parcel-nyagatare-savanna",
    name: "Karangazi Irrigated Block B",
    location: "Nyagatare",
    province: "Iburasirazuba",
    district: "Nyagatare",
    sector: "Karangazi",
    agroZone: "Eastern Savanna & Dry Plains",
    altitude: 1410,
    altitudeMeters: 1410,
    sizeHa: 2.5,
    soilType: "Ferralsol Sandy Clay Loam",
    irrigationType: "irrigated",
    mainCrops: ["Ibigori (Hybrid WH 505)", "Soya"],
    createdAt: "2026-01-01",
  },
  {
    id: "parcel-huye-plateau",
    name: "Maraba Terraced Hillside C",
    location: "Huye",
    province: "Amajyepfo",
    district: "Huye",
    sector: "Maraba",
    agroZone: "Southern Central Plateau",
    altitude: 1765,
    altitudeMeters: 1765,
    sizeHa: 0.8,
    soilType: "Humic Clay Loam",
    irrigationType: "irrigated",
    mainCrops: ["Ibishyimbo (Climbing Beans)", "Imyumbati"],
    createdAt: "2026-01-01",
  },
];

/**
 * Derives soil physical traits and historical health metrics from soil type
 */
export const deriveHistoricalSoilHealth = (
  farm: Farm,
  sensorReading?: ParcelSoilSensorReading | null,
  activities: FarmActivity[] = []
): HistoricalSoilHealthProfile => {
  const soilLower = (farm.soilType || "").toLowerCase();

  let soilCategory: HistoricalSoilHealthProfile["soilCategory"] = "clay_loam";
  let organicMatterPct = 3.6;
  let availableWaterCapacityMmPerM = 140;
  let infiltrationRateMmPerHour = 18;
  let defaultMoisture = 48;
  let drainageCharacteristicRw = "Ihererekanya ry'amazi riringaniye";
  let drainageCharacteristicEn = "Moderate drainage with balanced water retention";

  if (soilLower.includes("volcanic") || soilLower.includes("andosol") || farm.district === "Musanze" || farm.district === "Nyabihu") {
    soilCategory = "volcanic";
    organicMatterPct = 4.8;
    availableWaterCapacityMmPerM = 180; // High porosity & AWC
    infiltrationRateMmPerHour = 28; // Rapid infiltration without runoff
    defaultMoisture = 54;
    drainageCharacteristicRw = "Ubushobozi buhebuje bwo gufata amazi n'ifumbire (High Porosity)";
    drainageCharacteristicEn = "High water holding capacity & permeable volcanic crumb structure";
  } else if (soilLower.includes("ferralsol") || soilLower.includes("sand") || farm.district === "Nyagatare" || farm.district === "Kayonza") {
    soilCategory = "sandy_loam";
    organicMatterPct = 2.1;
    availableWaterCapacityMmPerM = 95; // Fast drying
    infiltrationRateMmPerHour = 35; // Drains quickly
    defaultMoisture = 36;
    drainageCharacteristicRw = "Amazi atemba vuba; bikeneye kuhira kenshi mu bice bito";
    drainageCharacteristicEn = "Rapid drainage & lower water retention; requires frequent pulses";
  } else if (soilLower.includes("clay") || farm.district === "Huye" || farm.district === "Gisagara") {
    soilCategory = "clay_loam";
    organicMatterPct = 3.8;
    availableWaterCapacityMmPerM = 160;
    infiltrationRateMmPerHour = 12; // Slower absorption
    defaultMoisture = 44;
    drainageCharacteristicRw = "Ubutaka bufata amazi igihe kirekire; bumenyereye amaterasi";
    drainageCharacteristicEn = "Dense clay matrix with high retention; prone to surface ponding if over-watered";
  }

  // Find last irrigation activity in past activities
  const farmWaterings = activities
    .filter(
      (a) =>
        (a.farmId === farm.id || a.farmName === farm.name) &&
        (a.category === "irrigation" || a.title.toLowerCase().includes("kuhira") || a.title.toLowerCase().includes("water"))
    )
    .sort((a, b) => (b.completedDate || b.dueDate).localeCompare(a.completedDate || a.dueDate));

  const lastWatering = farmWaterings[0];
  const today = new Date();
  let daysSinceLastIrrigation = 5;

  if (lastWatering) {
    const lastDate = new Date(lastWatering.completedDate || lastWatering.dueDate);
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    daysSinceLastIrrigation = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  const currentMoisture = sensorReading
    ? sensorReading.moisturePercentage
    : Math.max(18, Math.min(85, defaultMoisture - daysSinceLastIrrigation * 3.5));

  // Composite soil health score (0 - 100)
  const omScore = Math.min(100, (organicMatterPct / 5.0) * 100);
  const moistureScore = Math.min(100, (currentMoisture / 65) * 100);
  const soilHealthScore = Math.round(omScore * 0.45 + moistureScore * 0.55);

  return {
    farmId: farm.id,
    soilType: farm.soilType || "Volcanic Andosol Loam",
    soilCategory,
    organicMatterPct,
    availableWaterCapacityMmPerM,
    infiltrationRateMmPerHour,
    rootZoneDepthCm: farm.altitudeMeters && farm.altitudeMeters > 2000 ? 25 : 30,
    currentMoisturePct: Math.round(currentMoisture),
    historicalAvgMoisturePct: Math.round(defaultMoisture),
    daysSinceLastIrrigation,
    lastIrrigationDate: lastWatering?.completedDate || lastWatering?.dueDate,
    soilHealthScore,
    compactionRisk: soilCategory === "clay_loam" ? "medium" : "low",
    drainageCharacteristicRw,
    drainageCharacteristicEn,
  };
};

/**
 * Computes 7-day weather projections and projected soil moisture drop without irrigation
 */
export const projectSevenDayMoisture = (
  farm: Farm,
  soil: HistoricalSoilHealthProfile,
  districtForecast: ReturnType<typeof getForecastForDistrict>,
  cropSensitivity: ReturnType<typeof getCropWaterSensitivity>
): DayWeatherProjection[] => {
  let runningMoisture = soil.currentMoisturePct;

  return districtForecast.daily.map((day, idx) => {
    const tempAvgC = Math.round((day.tempMaxC + day.tempMinC) / 2);
    const rain = day.rainfallMm || 0;
    const pop = day.pop || 0;
    const humidity = day.humidity || 70;

    // Et0 estimated via temperature and humidity proxy
    const baseEt0 = 2.8 + (day.tempMaxC - 18) * 0.18 + (100 - humidity) * 0.02;
    const et0Mm = Math.max(1.5, Math.min(6.5, Math.round(baseEt0 * 10) / 10));

    // Crop Evapotranspiration ETc = ET0 * Kc
    const etcMm = Math.round(et0Mm * cropSensitivity.cropCoefficientKc * 10) / 10;

    // Effective rain infiltration into root zone (subtract initial leaf interception & runoff)
    const effectiveRainMm = rain > 1.5 ? Math.min(30, (rain - 1.2) * (soil.infiltrationRateMmPerHour > 25 ? 0.85 : 0.7)) : 0;

    // Moisture delta (% VWC)
    // 1 mm water in 250mm root zone is roughly ~0.4% VWC
    const netWaterDeltaMm = effectiveRainMm - etcMm;
    const moistureDeltaPct = netWaterDeltaMm * 0.42;

    runningMoisture = Math.max(12, Math.min(92, Math.round(runningMoisture + moistureDeltaPct)));

    let rainRisk: DayWeatherProjection["rainRisk"] = "none";
    if (rain >= 8 || pop >= 65) {
      rainRisk = "heavy";
    } else if (rain >= 2 || pop >= 35) {
      rainRisk = "light";
    }

    // A day is optimal for irrigation if:
    // 1. Projected moisture is below or near threshold
    // 2. No heavy rain is forecast that day or immediately following (avoid wash-off / leaching)
    // 3. Max temperature is moderate (allows morning absorption before extreme heat)
    const isOptimalDay =
      runningMoisture <= cropSensitivity.thresholdPercentage + 5 &&
      rainRisk !== "heavy" &&
      pop < 50;

    return {
      dateIso: day.date,
      dayOffset: idx,
      dayNameRw: day.dayNameRw,
      dayNameEn: day.dayNameEn,
      tempMinC: day.tempMinC,
      tempMaxC: day.tempMaxC,
      tempAvgC,
      rainfallMm: rain,
      popPct: pop,
      humidityPct: humidity,
      evapoTranspirationEt0Mm: et0Mm,
      projectedMoisturePctWithoutIrrigation: runningMoisture,
      rainRisk,
      weatherConditionRw: day.conditionRw,
      weatherConditionEn: day.conditionEn,
      weatherIcon: day.icon,
      isOptimalDay,
    };
  });
};

/**
 * Fuses soil health data with 7-day weather forecasts to generate optimal irrigation window proposals
 */
export const generateSmartIrrigationProposals = ({
  farms,
  plans = [],
  activities = [],
  sensorReadingsByFarmId = {},
  cropVarietyRules = [],
}: {
  farms: Farm[];
  plans?: FarmPlan[];
  activities?: FarmActivity[];
  sensorReadingsByFarmId?: Record<string, ParcelSoilSensorReading>;
  cropVarietyRules?: CropVarietyIrrigationRule[];
}): OptimalIrrigationWindowProposal[] => {
  const targetFarms = farms.length > 0 ? farms : CLEAN_SLATE_SMART_PARCELS;
  const proposals: OptimalIrrigationWindowProposal[] = [];

  for (const farm of targetFarms) {
    const matchedPlan = plans.find((p) => p.farmId === farm.id || p.farmName === farm.name);
    const cropName = matchedPlan?.crop || farm.mainCrops[0] || "Ibirayi (Irish Potatoes)";
    const growthStagePct = matchedPlan?.growthStagePercentage ?? 45;

    const sensor = sensorReadingsByFarmId[farm.id] || null;
    const soil = deriveHistoricalSoilHealth(farm, sensor, activities);
    const districtForecast = getForecastForDistrict(farm.district || "Musanze");
    const cropSensitivity = getCropWaterSensitivity(cropName, growthStagePct);

    // Override threshold if custom variety rule exists
    const customRule = cropVarietyRules.find(
      (r) =>
        r.cropNameEn.toLowerCase().includes(cropName.toLowerCase()) ||
        r.cropNameRw.toLowerCase().includes(cropName.toLowerCase())
    );
    if (customRule) {
      cropSensitivity.thresholdPercentage = customRule.triggerMoisturePct;
    }

    const projections = projectSevenDayMoisture(farm, soil, districtForecast, cropSensitivity);

    // Find the primary optimal day
    // Pick the earliest day where isOptimalDay is true, or the day with lowest moisture without heavy rain
    let chosenDay = projections.find((d) => d.isOptimalDay && d.dayOffset >= 0);
    if (!chosenDay) {
      // Pick day with minimum rain and lowest moisture
      chosenDay = [...projections]
        .sort((a, b) => a.projectedMoisturePctWithoutIrrigation - b.projectedMoisturePctWithoutIrrigation)[0];
    }

    // Default to tomorrow (dayOffset = 1) if today already has rain or evening
    if (chosenDay.dayOffset === 0 && chosenDay.rainRisk === "heavy") {
      chosenDay = projections[1] || chosenDay;
    }

    // Time window selection:
    // If maximum temperature is high (> 24°C) or wind is notable: Morning 06:00 - 08:30 is best (zero sun evaporation)
    // If cool mountain morning with high humidity: Evening 16:30 - 18:45 is an alternative
    const isHotDay = chosenDay.tempMaxC >= 23;
    const recommendedWindowPreset: OptimalIrrigationWindowProposal["recommendedWindowPreset"] =
      isHotDay || soil.soilCategory === "volcanic" ? "morning" : "evening";

    const timeRangeFormatted =
      recommendedWindowPreset === "morning" ? "06:00 – 08:30" : "17:00 – 19:15";

    const windowLabelEn =
      recommendedWindowPreset === "morning"
        ? "Early Morning (06:00 – 08:30 Calm)"
        : "Late Afternoon (17:00 – 19:15 Twilight)";

    const windowLabelRw =
      recommendedWindowPreset === "morning"
        ? "Mu Gitondo Kare (06:00 – 08:30 Ibicu bitaraka)"
        : "Ku Gicamunsi (17:00 – 19:15 Izuba rirenze)";

    // Water volume calculation:
    // Deficit mm = Target Moisture (75% AWC) - Projected Moisture
    const moistureDeficit = Math.max(8, (customRule?.targetReplenishPct || 72) - chosenDay.projectedMoisturePctWithoutIrrigation);
    // Convert % deficit to mm depth: ~2.2mm per 10% VWC deficit in root zone
    const rawWaterMm = Math.round((moistureDeficit * 0.28) * 10) / 10;
    const waterDepthMm = Math.max(6, Math.min(26, rawWaterMm));

    // Volume in Liters = mm * 10,000 L/ha-mm * sizeHa
    const sizeHa = farm.sizeHa || 1.0;
    const waterVolumeLiters = Math.round(waterDepthMm * 10000 * sizeHa);
    const waterVolumeLitersPerHa = Math.round(waterDepthMm * 10000);

    // Runtime: standard drip is ~4mm/hr, furrow is ~10mm/hr, manual ~6mm/hr
    const isDrip = (farm.irrigationType || "").toLowerCase().includes("drip");
    const isSprinkler = (farm.irrigationType || "").toLowerCase().includes("sprinkler");
    const irrigationMethod = isDrip ? "drip" : isSprinkler ? "sprinkler" : "furrow";
    const appRateMmPerHour = isDrip ? 4.2 : isSprinkler ? 6.5 : 9.0;
    const estimatedRuntimeMinutes = Math.round((waterDepthMm / appRateMmPerHour) * 60);

    // Evaporative savings compared to midday watering
    const savingsPctVsMidday = recommendedWindowPreset === "morning" ? 34 : 26;
    const efficiencyScore = Math.min(98, Math.round(82 + (soil.soilHealthScore * 0.12) + (savingsPctVsMidday * 0.15)));

    // Urgency determination
    let urgency: OptimalIrrigationWindowProposal["urgency"] = "recommended";
    if (soil.currentMoisturePct <= cropSensitivity.thresholdPercentage || cropSensitivity.isPeakWaterDemand) {
      urgency = "urgent";
    } else if (soil.currentMoisturePct >= 62) {
      urgency = "maintenance";
    }

    // Check if an activity for this farm and date is already accepted/scheduled
    const existingActivity = activities.find(
      (a) =>
        (a.farmId === farm.id || a.farmName === farm.name) &&
        a.category === "irrigation" &&
        a.dueDate === chosenDay.dateIso &&
        a.status !== "completed"
    );

    // Justification texts
    const justificationEn =
      chosenDay.rainfallMm === 0
        ? `Zero rain forecast on ${chosenDay.dayNameEn} with ${chosenDay.tempMaxC}°C peak. Irrigating at ${timeRangeFormatted} delivers ${efficiencyScore}% root absorption, saving ${savingsPctVsMidday}% water vs midday evaporation.`
        : `Light passing shower (${chosenDay.rainfallMm}mm) insufficient to penetrate root zone. Supplementing ${waterDepthMm}mm on ${chosenDay.dayNameEn} morning preserves ${cropSensitivity.stageNameEn} yield.`;

    const justificationRw =
      chosenDay.rainfallMm === 0
        ? `Nta mvura iteganyijwe ku ${chosenDay.dayNameRw} (ubushyuhe ${chosenDay.tempMaxC}°C). Kuhira ${timeRangeFormatted} bituma 95% by'amazi agera mu mizi y'ibihingwa, bikazigama ${savingsPctVsMidday}% by'amazi yari gupfa ubusa n'izuba ryo ku manywa.`
        : `Imvura nke cyane (${chosenDay.rainfallMm}mm) ntiyahagije imizi y'igihingwa cya ${cropName}. Kuhiraho ${waterDepthMm}mm ku ${chosenDay.dayNameRw} birinda igihingwa gukanyarara mu gihe cyo ${cropSensitivity.stageNameRw}.`;

    const soilReasoningEn = `${soil.soilType} with ${soil.organicMatterPct}% organic matter has an infiltration rate of ${soil.infiltrationRateMmPerHour}mm/hr. ${soil.drainageCharacteristicEn}.`;
    const soilReasoningRw = `${soil.soilType} irimo ${soil.organicMatterPct}% by'imborera yinjiza amazi ku rugero rwa ${soil.infiltrationRateMmPerHour}mm/isaha. ${soil.drainageCharacteristicRw}.`;

    proposals.push({
      id: `smart-sched-${farm.id}-${chosenDay.dateIso}`,
      farmId: farm.id,
      farmName: farm.name,
      district: farm.district,
      sector: farm.sector || "Centre",
      crop: cropName,
      sizeHa,
      soilProfile: soil,
      scheduledDateIso: chosenDay.dateIso,
      dayOffset: chosenDay.dayOffset,
      dayNameRw: chosenDay.dayNameRw,
      dayNameEn: chosenDay.dayNameEn,
      recommendedWindowPreset,
      timeRangeFormatted,
      windowLabelEn,
      windowLabelRw,
      waterDepthMm,
      waterVolumeLiters,
      waterVolumeLitersPerHa,
      estimatedRuntimeMinutes,
      irrigationMethod,
      savingsPctVsMidday,
      efficiencyScore,
      justificationEn,
      justificationRw,
      soilReasoningEn,
      soilReasoningRw,
      urgency,
      isAccepted: Boolean(existingActivity),
      isAdjusted: false,
      acceptedActivityId: existingActivity?.id,
      sevenDayProjections: projections,
    });
  }

  return proposals;
};

/**
 * Builds a FarmActivity object from an accepted or adjusted smart schedule proposal
 */
export const buildActivityFromProposal = (
  proposal: OptimalIrrigationWindowProposal,
  language: "rw" | "en" | "fr" = "rw",
  overrides?: {
    dateIso?: string;
    timeRange?: string;
    waterDepthMm?: number;
    waterVolumeLiters?: number;
    irrigationMethod?: "drip" | "sprinkler" | "furrow" | "manual";
  }
): Omit<FarmActivity, "id"> => {
  const date = overrides?.dateIso || proposal.scheduledDateIso;
  const time = overrides?.timeRange || proposal.timeRangeFormatted;
  const depth = overrides?.waterDepthMm || proposal.waterDepthMm;
  const liters = overrides?.waterVolumeLiters || proposal.waterVolumeLiters;
  const method = overrides?.irrigationMethod || proposal.irrigationMethod;

  const titleRw = `Kuhira Umurima (Smart Irrigation) — ${proposal.crop} [${time}]`;
  const titleEn = `Smart Irrigation Window — ${proposal.crop} [${time}]`;

  const notesRw = `Gahunda y'ubuhinzi bw'ikoranabuhanga (Smart Irrigation Scheduler):\n• Igihe: ${date} (${time})\n• Ubutaka: ${proposal.soilProfile.soilType} (${proposal.soilProfile.organicMatterPct}% imborera)\n• Ingano y'amazi: ${depth} mm (${liters.toLocaleString()} Litres kuri ${proposal.sizeHa} Ha)\n• Uburyo: ${method.toUpperCase()}\n• Ubusobanuro: ${proposal.justificationRw}`;
  const notesEn = `Smart Irrigation Automated Window:\n• Window: ${date} (${time})\n• Soil Profile: ${proposal.soilProfile.soilType} (${proposal.soilProfile.organicMatterPct}% OM)\n• Recommended Depth: ${depth} mm (${liters.toLocaleString()} Liters for ${proposal.sizeHa} Ha)\n• Method: ${method.toUpperCase()}\n• Meteorological Justification: ${proposal.justificationEn}`;

  return {
    farmId: proposal.farmId,
    farmName: proposal.farmName,
    crop: proposal.crop,
    title: language === "rw" ? titleRw : titleEn,
    category: "irrigation",
    dueDate: date,
    status: "pending",
    assignedTo: "Umuhinzi (Smart Auto-Schedule)",
    notes: language === "rw" ? notesRw : notesEn,
    syncStatus: "offline_pending",
  };
};
