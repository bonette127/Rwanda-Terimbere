import {
  AutomatedThresholdBreachEvent,
  CropVarietyIrrigationRule,
  Farm,
  FarmActivity,
  FarmPlan,
  IrrigationDemandAlert,
  IrrigationDemandLevel,
  Language,
  ParcelSoilSensorReading,
  PredictiveDailyDepletion,
  WeatherForecast,
} from "../types";
import { weatherForecasts as defaultWeatherForecasts } from "../data/mockData";

export interface MoistureEstimationFactors {
  crop: string;
  growthStagePercentage: number;
  cropCoefficientKc: number;
  isPeakWaterDemand: boolean;
  tempC: number;
  rainfallMm: number;
  humidity: number;
  soilType: string;
  irrigationType: string;
  district: string;
  hasRecentWatering: boolean;
}

/**
 * Calculates Crop Coefficient (Kc) and whether the crop is in its critical peak water demand phase
 * (Flowering, tuber bulking, or maize tasseling/silking where water stress leads to irreversible yield loss)
 */
export const getCropWaterSensitivity = (
  crop: string,
  growthPercentage: number = 50
): {
  cropCoefficientKc: number;
  isPeakWaterDemand: boolean;
  stageNameRw: string;
  stageNameEn: string;
  thresholdPercentage: number;
} => {
  const cropLower = crop.toLowerCase();

  // 1. Emergence / Seedling stage (0 - 15%)
  if (growthPercentage <= 15) {
    return {
      cropCoefficientKc: 0.45,
      isPeakWaterDemand: false,
      stageNameRw: "Kumera no Gusohoka (Seedling Emergence)",
      stageNameEn: "Seedling Emergence",
      thresholdPercentage: 42, // Shallow roots need surface moisture
    };
  }

  // 2. Vegetative Development (16 - 40%)
  if (growthPercentage <= 40) {
    return {
      cropCoefficientKc: 0.8,
      isPeakWaterDemand: false,
      stageNameRw: "Gukura kw'Amashami (Vegetative Canopy)",
      stageNameEn: "Vegetative Canopy Growth",
      thresholdPercentage: 40,
    };
  }

  // 3. Peak Reproductive / Bulking / Tasseling Stage (41 - 70%)
  // HIGHLY SENSITIVE: Water deficit here causes flower abortion, tuber cracking, or barren maize cobs
  if (growthPercentage <= 70) {
    let stageRw = "Kurabyo & Kwaguka (Flowering & Bulking)";
    let stageEn = "Flowering & Tuber Bulking";

    if (cropLower.includes("ibigori") || cropLower.includes("maize")) {
      stageRw = "Kurabyo & Imisomyo (Tasseling & Silking)";
      stageEn = "Tasseling & Silking";
    } else if (cropLower.includes("inyanya") || cropLower.includes("tomato")) {
      stageRw = "Kurabyo & Kurema Imbuto (Fruit Setting)";
      stageEn = "Flowering & Fruit Setting";
    }

    return {
      cropCoefficientKc: 1.15,
      isPeakWaterDemand: true, // Peak moisture sensitivity!
      stageNameRw: stageRw,
      stageNameEn: stageEn,
      thresholdPercentage: 50, // Higher trigger threshold (alert earlier before stress occurs)
    };
  }

  // 4. Grain Filling / Tuber Maturation (71 - 88%)
  if (growthPercentage <= 88) {
    return {
      cropCoefficientKc: 0.65,
      isPeakWaterDemand: false,
      stageNameRw: "Guhisha no Gukomera (Maturation)",
      stageNameEn: "Maturation & Grain Filling",
      thresholdPercentage: 35,
    };
  }

  // 5. Physiological Maturity / Harvest Ready (89 - 100%)
  return {
    cropCoefficientKc: 0.25,
    isPeakWaterDemand: false,
    stageNameRw: "Byiteguye Gusarurwa (Harvest Ready)",
    stageNameEn: "Harvest Ready (Drying)",
    thresholdPercentage: 25, // Less water needed so produce dries and tubers harden
  };
};

/**
 * Estimates current soil moisture level (0 - 100% available water capacity)
 * based on ambient weather, rainfall infiltration, soil water retention, and crop evapotranspiration.
 */
export const estimateSoilMoisturePercentage = (factors: MoistureEstimationFactors): number => {
  const {
    cropCoefficientKc,
    tempC,
    rainfallMm,
    humidity,
    soilType,
    irrigationType,
    district,
    hasRecentWatering,
  } = factors;

  // If watered recently today, soil is replenished
  if (hasRecentWatering) {
    return 88;
  }

  // Base soil water holding capacity by geological Rwandan soil type
  let baseRetention = 50;
  const soilLower = soilType.toLowerCase();

  if (soilLower.includes("amakoro") || soilLower.includes("volcanic")) {
    baseRetention = 62; // Volcanic loam in Musanze/Birunga retains moisture well
  } else if (soilLower.includes("umusenyi") || soilLower.includes("sandy")) {
    baseRetention = 36; // Sandy loam in Nyagatare/Eastern savannah drains rapidly
  } else if (soilLower.includes("urwondo") || soilLower.includes("clay") || soilLower.includes("swamp")) {
    baseRetention = 60; // Valley bottom or clay soils
  }

  // Additional adjustment for irrigation infrastructure
  if (irrigationType === "swamp") {
    baseRetention += 8;
  }

  // Weather Evaporative Stress Factor (ET₀ estimation)
  // Higher temp (>24°C) + low humidity (<65%) + low rainfall drastically drops soil water
  const tempDeficit = Math.max(0, (tempC - 20) * 1.8);
  const humidityDeficit = Math.max(0, (75 - humidity) * 0.45);
  const dailyEvaporativeLoss = (tempDeficit + humidityDeficit) * cropCoefficientKc;

  // Rainfall recharge: each mm of rain contributes significantly to soil layer
  const rainfallRecharge = rainfallMm * 2.8;

  // District microclimate penalty (e.g. Nyagatare drier winds vs Musanze mist)
  let districtModifier = 0;
  if (district.toLowerCase().includes("nyagatare") || district.toLowerCase().includes("kayonza")) {
    districtModifier = -10; // Arid savanna drying
  } else if (district.toLowerCase().includes("musanze") || district.toLowerCase().includes("nyabihu")) {
    districtModifier = 8; // High altitude coolness
  }

  // Compute final estimated percentage
  let estimatedMoisture = baseRetention + rainfallRecharge - dailyEvaporativeLoss + districtModifier;

  // Clamp within 12% to 98%
  estimatedMoisture = Math.max(12, Math.min(98, Math.round(estimatedMoisture)));

  return estimatedMoisture;
};

/**
 * Determines demand category and urgency from moisture level vs threshold
 */
export const getMoistureStatus = (
  moisture: number,
  threshold: number,
  isPeakWaterDemand: boolean
): IrrigationDemandLevel => {
  if (moisture < 28 || (isPeakWaterDemand && moisture < 38)) {
    return "critical";
  }
  if (moisture <= threshold) {
    return "high";
  }
  if (moisture <= threshold + 12) {
    return "moderate";
  }
  if (moisture > 82) {
    return "saturated";
  }
  return "optimal";
};

export const DEFAULT_CRITICAL_HUMIDITY_THRESHOLD = 60;

export const DEFAULT_CROP_VARIETY_IRRIGATION_RULES: CropVarietyIrrigationRule[] = [
  {
    id: "rule-ibirayi-kinigi",
    cropVarietyKey: "ibirayi",
    cropNameEn: "Irish Potatoes (Kinigi / Kirundo)",
    cropNameRw: "Ibirayi (Imbuto ya Kinigi / Kirundo)",
    varietyLabel: "RAB Highland Seed • Tuber Bulking",
    triggerMoisturePct: 35,
    targetReplenishPct: 75,
    rootZoneDepthCm: 15,
    autoPushEnabled: true,
    backgroundWatchEnabled: true,
    autoScheduleTaskOnBreach: true,
  },
  {
    id: "rule-ibigori-zm607",
    cropVarietyKey: "ibigori",
    cropNameEn: "Hybrid Maize (ZM607 / WH505)",
    cropNameRw: "Ibigori (Imbuto ya ZM607 / WH505)",
    varietyLabel: "Savanna Hybrid • Tasseling & Silking",
    triggerMoisturePct: 35,
    targetReplenishPct: 72,
    rootZoneDepthCm: 25,
    autoPushEnabled: true,
    backgroundWatchEnabled: true,
    autoScheduleTaskOnBreach: true,
  },
  {
    id: "rule-inyanya-roma",
    cropVarietyKey: "inyanya",
    cropNameEn: "Tomatoes (Roma VF / Anna F1)",
    cropNameRw: "Inyanya (Imbuto ya Roma VF / Anna F1)",
    varietyLabel: "Horticulture • Flowering & Fruit Set",
    triggerMoisturePct: 38,
    targetReplenishPct: 76,
    rootZoneDepthCm: 15,
    autoPushEnabled: true,
    backgroundWatchEnabled: true,
    autoScheduleTaskOnBreach: false,
  },
  {
    id: "rule-ibishyimbo-mac44",
    cropVarietyKey: "ibishyimbo",
    cropNameEn: "Climbing Beans (MAC 44 High-Iron)",
    cropNameRw: "Ibishyimbo Bishora (MAC 44)",
    varietyLabel: "Biofortified Legume • Pod Filling",
    triggerMoisturePct: 32,
    targetReplenishPct: 70,
    rootZoneDepthCm: 20,
    autoPushEnabled: true,
    backgroundWatchEnabled: true,
    autoScheduleTaskOnBreach: false,
  },
];

export const matchCropVarietyRule = (
  cropName: string,
  rules: CropVarietyIrrigationRule[] = DEFAULT_CROP_VARIETY_IRRIGATION_RULES
): CropVarietyIrrigationRule | undefined => {
  const lower = cropName.toLowerCase();
  return (
    rules.find(
      (r) =>
        lower.includes(r.cropVarietyKey.toLowerCase()) ||
        r.cropNameEn.toLowerCase().includes(lower) ||
        r.cropNameRw.toLowerCase().includes(lower)
    ) || rules[0]
  );
};

/**
 * Calculates atmospheric Vapor Pressure Deficit (VPD in kPa) from temperature (°C) and relative humidity (%).
 * High VPD (> 1.4 kPa) combined with low relative humidity accelerates crop transpiration and soil drying.
 */
export const calculateVaporPressureDeficitKpa = (
  tempC: number,
  humidity: number
): number => {
  const saturationVaporPressure =
    0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const actualVaporPressure = saturationVaporPressure * (humidity / 100);
  const vpd = Math.max(0, saturationVaporPressure - actualVaporPressure);
  return Math.round(vpd * 100) / 100;
};

/**
 * Calculates a 3-day predictive soil moisture depletion and water usage forecast for a parcel
 * based on forecasted evapotranspiration (ET0 & ETc = ET0 * Kc), local temperature trends,
 * vapor pressure deficit (VPD), and soil water retention characteristics.
 */
export const calculateThreeDayWaterUsageForecast = (params: {
  currentMoisturePct: number;
  thresholdPct: number;
  cropCoefficientKc: number;
  baseTempC: number;
  baseHumidityPct: number;
  baseRainMm: number;
  soilType: string;
  district: string;
  sizeHa: number;
  tempTrendAdjustmentC?: number; // Optional simulation delta e.g. +2.5°C heatwave trend
}): PredictiveDailyDepletion[] => {
  const {
    currentMoisturePct,
    thresholdPct,
    cropCoefficientKc,
    baseTempC,
    baseHumidityPct,
    baseRainMm,
    soilType,
    district,
    sizeHa,
    tempTrendAdjustmentC = 0,
  } = params;

  const soilLower = soilType.toLowerCase();
  const districtLower = district.toLowerCase();

  // Soil depletion conversion factor (% VWC drop per mm of net water loss in active root zone)
  // Sandy loam loses % VWC faster per mm of ETc than deep volcanic Amakoro or valley clay
  let vwcDropPerMm = 2.05;
  if (soilLower.includes("umusenyi") || soilLower.includes("sandy")) {
    vwcDropPerMm = 2.55;
  } else if (soilLower.includes("amakoro") || soilLower.includes("volcanic")) {
    vwcDropPerMm = 1.75;
  } else if (soilLower.includes("urwondo") || soilLower.includes("clay")) {
    vwcDropPerMm = 1.65;
  }

  // Agro-zone solar / wind aerodynamic factor
  const zoneEtMultiplier =
    districtLower.includes("nyagatare") || districtLower.includes("kayonza")
      ? 1.22
      : districtLower.includes("musanze") || districtLower.includes("nyabihu")
      ? 0.92
      : 1.06;

  // Realistic 3-day local microclimate progression patterns per agro-zone
  const dailyTrajectories: Array<{
    dayOffset: 1 | 2 | 3;
    tempDelta: number;
    humidityDelta: number;
    rainFactor: number;
  }> = [
    { dayOffset: 1, tempDelta: 1.2, humidityDelta: -4, rainFactor: 0.35 },
    { dayOffset: 2, tempDelta: 2.1, humidityDelta: -7, rainFactor: 0.1 },
    { dayOffset: 3, tempDelta: 1.6, humidityDelta: -5, rainFactor: 0.25 },
  ];

  const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesRw = [
    "Ku Cyumweru",
    "Kuwa Mbere",
    "Kuwa Kabiri",
    "Kuwa Gatatu",
    "Kuwa Kane",
    "Kuwa Gatanu",
    "Kuwa Gatandatu",
  ];

  let runningMoisture = currentMoisturePct;
  const results: PredictiveDailyDepletion[] = [];

  dailyTrajectories.forEach((step) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + step.dayOffset);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dow = targetDate.getDay();

    const dayTempDelta =
      Math.round((step.tempDelta + tempTrendAdjustmentC) * 10) / 10;
    const forecastTempC =
      Math.round((baseTempC + dayTempDelta) * 10) / 10;
    const forecastHumidityPct = Math.max(
      24,
      Math.min(
        95,
        Math.round(
          baseHumidityPct + step.humidityDelta - tempTrendAdjustmentC * 2.2
        )
      )
    );

    // Higher temperature trend suppresses light convective shower probability
    const forecastRainMm =
      tempTrendAdjustmentC >= 2
        ? 0
        : Math.max(0, Math.round(baseRainMm * step.rainFactor * 10) / 10);

    const vpdKpa = calculateVaporPressureDeficitKpa(
      forecastTempC,
      forecastHumidityPct
    );

    // Reference Evapotranspiration ET0 (mm/day) driven by Temperature + VPD + Agro-Zone wind/radiation
    const rawEt0 =
      (0.14 * forecastTempC + 1.35 * vpdKpa + 0.45) * zoneEtMultiplier;
    const referenceEt0Mm = Math.max(2.1, Math.round(rawEt0 * 10) / 10);

    // Crop Evapotranspiration ETc = ET0 * Kc
    const cropEtcMm = Math.max(
      1.5,
      Math.round(referenceEt0Mm * cropCoefficientKc * 10) / 10
    );

    // Effective rain infiltration (75% of light rain reaches root zone)
    const effectiveRainMm = Math.round(forecastRainMm * 0.75 * 10) / 10;

    // Net water loss in mm
    const netWaterLossMm = Math.max(
      0,
      Math.round((cropEtcMm - effectiveRainMm) * 10) / 10
    );

    // Expected Soil Moisture Depletion (% VWC drop)
    const moistureDepletionPct = Math.max(
      1,
      Math.round(netWaterLossMm * vwcDropPerMm * 10) / 10
    );

    const startMoisturePct = Math.round(runningMoisture * 10) / 10;
    const projectedEndMoisturePct = Math.max(
      10,
      Math.min(
        96,
        Math.round(
          (startMoisturePct - moistureDepletionPct + effectiveRainMm * 1.1) * 10
        ) / 10
      )
    );

    const isBelowThreshold = projectedEndMoisturePct <= thresholdPct + 3;

    // Calculate predictive water usage (mm and Liters) required on this day
    // Target replenishment is 72% VWC when projected moisture approaches or drops below threshold
    const targetMoisture = 72;
    const deficitPct = Math.max(0, targetMoisture - projectedEndMoisturePct);
    const predictiveWaterMm = isBelowThreshold
      ? Math.max(
          Math.ceil(netWaterLossMm),
          Math.round(deficitPct * 0.48 + cropEtcMm * 0.6)
        )
      : Math.max(0, Math.round(netWaterLossMm * 0.85));

    const predictiveWaterLitersPerHa = predictiveWaterMm * 10000;
    const predictiveWaterLiters = Math.round(
      predictiveWaterLitersPerHa * Math.max(0.1, sizeHa)
    );

    // Typical smallholder solar/petrol drip & furrow pump flow ~ 18,000 Liters/hour
    const pumpRuntimeHours =
      Math.round((predictiveWaterLiters / 18000) * 10) / 10;

    results.push({
      dayOffset: step.dayOffset,
      dateStr,
      dayLabelEn:
        step.dayOffset === 1
          ? `Tomorrow (${dayNamesEn[dow]})`
          : `Day +${step.dayOffset} (${dayNamesEn[dow]})`,
      dayLabelRw:
        step.dayOffset === 1
          ? `Ejo (${dayNamesRw[dow]})`
          : `Umunsi +${step.dayOffset} (${dayNamesRw[dow]})`,
      forecastTempC,
      tempDeltaC: dayTempDelta,
      forecastHumidityPct,
      forecastRainMm,
      vaporPressureDeficitKpa: vpdKpa,
      referenceEt0Mm,
      cropEtcMm,
      effectiveRainMm,
      netWaterLossMm,
      moistureDepletionPct,
      startMoisturePct,
      projectedEndMoisturePct,
      isBelowThreshold,
      predictiveWaterMm,
      predictiveWaterLiters,
      predictiveWaterLitersPerHa,
      pumpRuntimeHours,
    });

    runningMoisture = projectedEndMoisturePct;
  });

  return results;
};

/**
 * Evaluates all farms and active plans to identify fields with unmet irrigation demand
 * and real-time climate alerts when local forecast humidity drops below the critical threshold.
 */
export const evaluateIrrigationDemandAlerts = (
  farms: Farm[],
  plans: FarmPlan[],
  activities: FarmActivity[],
  weatherForecasts: WeatherForecast[] = defaultWeatherForecasts,
  wateredFarmIdsToday: string[] = [],
  criticalHumidityThreshold: number = DEFAULT_CRITICAL_HUMIDITY_THRESHOLD,
  humidityOverridesByDistrict: Record<string, number> = {},
  sensorReadingsByFarmId: Record<string, ParcelSoilSensorReading> = {},
  cropVarietyRules: CropVarietyIrrigationRule[] = DEFAULT_CROP_VARIETY_IRRIGATION_RULES
): IrrigationDemandAlert[] => {
  const alerts: IrrigationDemandAlert[] = [];
  const todayStr = new Date().toISOString().split("T")[0];

  farms.forEach((farm) => {
    // Find active plan for this farm
    const activePlan = plans.find(
      (p) => p.farmId === farm.id && p.status !== "completed"
    );

    const cropName = activePlan?.crop || farm.mainCrops[0] || "Ibihingwa";
    const growthPercentage = activePlan?.growthStagePercentage ?? 55;

    // Check if an irrigation activity was completed today
    const hasCompletedIrrigationToday =
      wateredFarmIdsToday.includes(farm.id) ||
      activities.some(
        (a) =>
          a.farmId === farm.id &&
          a.category === "irrigation" &&
          a.status === "completed" &&
          (a.completedDate === todayStr || a.dueDate === todayStr)
      );

    // Weather forecast for this district
    const weather =
      weatherForecasts.find(
        (w) => w.district.toLowerCase() === farm.district.toLowerCase()
      ) ||
      weatherForecasts[0] || {
        district: farm.district,
        province: farm.province || "Rwanda",
        tempC: 23,
        conditionRw: "Ikirere gisanzwe",
        conditionEn: "Normal conditions",
        conditionFr: "Conditions normales",
        rainfallMm: 3,
        humidity: 68,
        agriAdvisoryRw: "Gukurikirana ubuhehere bw'umurima.",
        agriAdvisoryEn: "Monitor field moisture levels.",
        agriAdvisoryFr: "Surveiller l'humidité.",
      };

    const sensitivity = getCropWaterSensitivity(cropName, growthPercentage);
    const matchedCropRule = matchCropVarietyRule(cropName, cropVarietyRules);
    const effectiveThresholdPct = matchedCropRule
      ? matchedCropRule.triggerMoisturePct
      : sensitivity.thresholdPercentage;

    const effectiveHumidity =
      humidityOverridesByDistrict[farm.district] !== undefined
        ? humidityOverridesByDistrict[farm.district]
        : weather.humidity;

    const isLowHumidityAlert =
      !hasCompletedIrrigationToday && effectiveHumidity < criticalHumidityThreshold;

    const vaporPressureDeficitKpa = calculateVaporPressureDeficitKpa(
      weather.tempC,
      effectiveHumidity
    );

    const activeSensorReading = sensorReadingsByFarmId[farm.id];
    const hasActiveSensorOverride =
      activeSensorReading &&
      (activeSensorReading.mode === "manual_probe" ||
        activeSensorReading.mode === "iot_telemetry");

    const estimatedModelMoisture = estimateSoilMoisturePercentage({
      crop: cropName,
      growthStagePercentage: growthPercentage,
      cropCoefficientKc: sensitivity.cropCoefficientKc,
      isPeakWaterDemand: sensitivity.isPeakWaterDemand,
      tempC: weather.tempC,
      rainfallMm: weather.rainfallMm,
      humidity: effectiveHumidity,
      soilType: farm.soilType,
      irrigationType: farm.irrigationType,
      district: farm.district,
      hasRecentWatering: hasCompletedIrrigationToday,
    });

    const soilMoisturePercentage = hasActiveSensorOverride
      ? Math.max(8, Math.min(98, Math.round(activeSensorReading.moisturePercentage)))
      : estimatedModelMoisture;

    const isAutomatedThresholdBreached =
      !hasCompletedIrrigationToday &&
      soilMoisturePercentage < effectiveThresholdPct;

    let status = getMoistureStatus(
      soilMoisturePercentage,
      effectiveThresholdPct,
      sensitivity.isPeakWaterDemand
    );

    if (isAutomatedThresholdBreached && status !== "critical") {
      status =
        soilMoisturePercentage <= effectiveThresholdPct - 4
          ? "critical"
          : "high";
    }

    // Elevate alert status if local humidity drops below critical threshold (unless sensor shows soil is already saturated/optimal > 72%)
    if (isLowHumidityAlert && soilMoisturePercentage <= 72) {
      if (
        effectiveHumidity <= criticalHumidityThreshold - 10 ||
        sensitivity.isPeakWaterDemand ||
        status === "critical"
      ) {
        status = "critical";
      } else if (status === "optimal" || status === "moderate") {
        status = "high";
      }
    }

    // Calculate water deficit (target optimal moisture from crop variety rule or 75%)
    const targetMoisture = matchedCropRule?.targetReplenishPct || 75;
    const moistureGap = Math.max(0, targetMoisture - soilMoisturePercentage);
    const lowHumidityExtraWaterMm = isLowHumidityAlert
      ? Math.max(3, Math.round((criticalHumidityThreshold - effectiveHumidity) * 0.25))
      : 0;

    // Depth in mm: e.g. 35% gap corresponds to ~18 mm irrigation depth + low-humidity evaporative buffer
    const recommendedWaterMm =
      (Math.round(moistureGap * 0.5) || 12) + lowHumidityExtraWaterMm;
    // 1 mm depth across 1 hectare = 10,000 Liters (10 cubic meters)
    const recommendedWaterLitersPerHa = recommendedWaterMm * 10000;

    // Delivery method recommendations based on crop and terrain
    let recommendedMethodRw = "Kuhira ku bitonyanga (Drip Irrigation) ku murongo";
    let recommendedMethodEn = "Drip Irrigation lines along crop ridges";
    if (cropName.toLowerCase().includes("ibigori") || cropName.toLowerCase().includes("maize")) {
      recommendedMethodRw = "Kuhira mu miyoboro y'imigezi (Furrow / Ridge Infiltration)";
      recommendedMethodEn = "Furrow infiltration between crop rows";
    } else if (farm.irrigationType === "swamp") {
      recommendedMethodRw = "Kurekura amazi mu tuyoboro tw'igishanga (Controlled Basin canals)";
      recommendedMethodEn = "Controlled canal gate release in valley basin";
    }

    const suggestedTimeWindow = "06:00 - 08:30 AM (cyangwa 16:30 - 18:30 PM)";

    // Localized Titles & Advisories
    let titleRw = "";
    let titleEn = "";
    let titleFr = "";
    let messageRw = "";
    let messageEn = "";
    let messageFr = "";
    let rabAdvisoryRw = "";
    let rabAdvisoryEn = "";
    let rabAdvisoryFr = "";

    const sensorBadgeRw = hasActiveSensorOverride
      ? activeSensorReading.mode === "iot_telemetry"
        ? `[IoT Sensor ${activeSensorReading.sensorId} • ${activeSensorReading.probeDepthCm}cm] `
        : `[Igipimo cy'Intoki • ${activeSensorReading.probeDepthCm}cm] `
      : "";
    const sensorBadgeEn = hasActiveSensorOverride
      ? activeSensorReading.mode === "iot_telemetry"
        ? `[IoT Sensor ${activeSensorReading.sensorId} • ${activeSensorReading.probeDepthCm}cm] `
        : `[Manual Probe • ${activeSensorReading.probeDepthCm}cm] `
      : "";

    if (status === "critical") {
      titleRw = `🚨 ${sensorBadgeRw}Integuza yo Kuhira Byihuse: Ubuhehere buri hasi cyane (${soilMoisturePercentage}%) kuri ${cropName}`;
      titleEn = `🚨 ${sensorBadgeEn}Critical Irrigation Demand: Soil Moisture at ${soilMoisturePercentage}% for ${cropName}`;
      titleFr = `🚨 ${sensorBadgeEn}Alerte Critique d'Irrigation : Humidité du sol à ${soilMoisturePercentage}% (${cropName})`;

      messageRw = `Umurima wa ${farm.name} (${farm.district}): ${
        hasActiveSensorOverride
          ? `Igipimo cya ${activeSensorReading.sensorId} ku bujyakuzimu bwa cm ${activeSensorReading.probeDepthCm} cyerekanye ko ubuhehere bw'ubutaka bwageze kuri ${soilMoisturePercentage}% (EC: ${activeSensorReading.ecDsM} dS/m, Temp: ${activeSensorReading.soilTempC}°C)`
          : `Ubuhehere bw'ubutaka bwageze kuri ${soilMoisturePercentage}%`
      }, munsi y'urugero rwa ${sensitivity.thresholdPercentage}%. Kubera ko igihingwa kigeze mu gihe cya '${sensitivity.stageNameRw}', kutacyuhira uyu munsi bishobora kugabanya umusaruro hejuru ya 35%.`;
      messageEn = `Farm ${farm.name} (${farm.district}): ${
        hasActiveSensorOverride
          ? `Sensor ${activeSensorReading.sensorId} at ${activeSensorReading.probeDepthCm}cm root depth measured ${soilMoisturePercentage}% VWC (EC: ${activeSensorReading.ecDsM} dS/m, Soil Temp: ${activeSensorReading.soilTempC}°C)`
          : `Soil moisture dropped to ${soilMoisturePercentage}%`
      }, below safe threshold of ${sensitivity.thresholdPercentage}%. In this '${sensitivity.stageNameEn}' phase, moisture stress can cause irreversible yield reduction.`;
      messageFr = `Champ ${farm.name} (${farm.district}) : L'humidité est tombée à ${soilMoisturePercentage}%, sous le seuil de ${sensitivity.thresholdPercentage}%. Un arrosage immédiat est requis.`;

      rabAdvisoryRw = `Amabwiriza ya RAB: Uhira amazi angana na mm ${recommendedWaterMm} (${(recommendedWaterLitersPerHa * farm.sizeHa).toLocaleString()} L kuri Ha ${farm.sizeHa}) mu gitondo hakiri kare. Genzura ko amazi agera ku bujyakuzimu bwa cm 15 ku mizi.`;
      rabAdvisoryEn = `RAB Agronomy Protocol: Apply ${recommendedWaterMm}mm of water (${(recommendedWaterLitersPerHa * farm.sizeHa).toLocaleString()} Liters for ${farm.sizeHa} Ha) during early morning. Verify infiltration reaches 15cm root depth.`;
      rabAdvisoryFr = `Protocole RAB : Appliquer ${recommendedWaterMm} mm d'eau le matin tôt. Vérifier la profondeur d'infiltration à 15 cm.`;
    } else if (status === "high") {
      titleRw = `💧 ${sensorBadgeRw}Integuza yo Kuhira: Ubutaka burakenera amazi (${soilMoisturePercentage}%) kuri ${cropName}`;
      titleEn = `💧 ${sensorBadgeEn}High Irrigation Demand: ${cropName} Soil Moisture at ${soilMoisturePercentage}%`;
      titleFr = `💧 ${sensorBadgeEn}Besoin d'Irrigation Élevé : Humidité à ${soilMoisturePercentage}% (${cropName})`;

      messageRw = `Umurima wa ${farm.name}: ${
        hasActiveSensorOverride
          ? `Igipimo cya ${activeSensorReading.sensorId} (${activeSensorReading.probeDepthCm}cm) cyerekanye ubuhehere bwa ${soilMoisturePercentage}%.`
          : `Ubuhehere buri kugana ku mpera (${soilMoisturePercentage}%).`
      } Hateganyijwe ubushyuhe bwa ${weather.tempC}°C n'imvura nkeya (${weather.rainfallMm}mm). Uhira mu masaha 24 ari imbere.`;
      messageEn = `Farm ${farm.name}: ${
        hasActiveSensorOverride
          ? `Sensor ${activeSensorReading.sensorId} (${activeSensorReading.probeDepthCm}cm) reports ${soilMoisturePercentage}% VWC.`
          : `Soil moisture is at ${soilMoisturePercentage}%.`
      } Forecast shows ${weather.tempC}°C and ${weather.rainfallMm}mm rain. Schedule watering cycle within 24 hours.`;
      messageFr = `Champ ${farm.name} : Humidité à ${soilMoisturePercentage}%, température de ${weather.tempC}°C. Planifiez l'arrosage sous 24 heures.`;

      rabAdvisoryRw = `Amabwiriza ya RAB: Uhira hakiri kare kugira ngo amazi atazangizwa n'izuba. Koresha uburyo bwa ${recommendedMethodRw}.`;
      rabAdvisoryEn = `RAB Guidance: Irrigate early to minimize evaporative loss. Recommended method: ${recommendedMethodEn}.`;
      rabAdvisoryFr = `Directive RAB : Arroser tôt le matin pour limiter l'évaporation.`;
    } else if (status === "moderate") {
      titleRw = `⚠️ Ubuhehere buraringaniye (${soilMoisturePercentage}%) kuri ${cropName}`;
      titleEn = `⚠️ Moderate Moisture (${soilMoisturePercentage}%) for ${cropName}`;
      titleFr = `⚠️ Humidité Modérée (${soilMoisturePercentage}%) pour ${cropName}`;

      messageRw = `Umurima wa ${farm.name}: Ubuhehere buracyari mu rugero ruto (${soilMoisturePercentage}%). Tegura ibikoresho byo kuhira niba imvura itaguye mu minsi 2 iri imbere.`;
      messageEn = `Farm ${farm.name}: Soil moisture is acceptable (${soilMoisturePercentage}%) but declining. Prepare irrigation pumps and lines in case rainfall remains low.`;
      messageFr = `Champ ${farm.name} : Humidité modérée (${soilMoisturePercentage}%). Préparez les systèmes d'irrigation.`;

      rabAdvisoryRw = `Pima ubuhehere bw'igitaka ku bujyakuzimu bwa cm 10 mbere yo gufungura amazi.`;
      rabAdvisoryEn = `Perform soil ball test at 10cm depth before deciding to irrigate.`;
      rabAdvisoryFr = `Vérifier la cohésion de la motte de terre à 10 cm avant arrosage.`;
    } else if (status === "saturated") {
      titleRw = `🌧️ Amazi Arahagije / Imvura Yaraguye (${soilMoisturePercentage}%) kuri ${cropName}`;
      titleEn = `🌧️ Soil Saturated / Rain Sufficient (${soilMoisturePercentage}%) for ${cropName}`;
      titleFr = `🌧️ Sol Saturé / Pluie Suffisante (${soilMoisturePercentage}%)`;

      messageRw = `Umurima wa ${farm.name}: Ubutaka buhehereye cyane (${soilMoisturePercentage}%) kubera imvura ya mm ${weather.rainfallMm}. Ntukongereho amazi ngo udatera ibirayi cyangwa imizi kubora.`;
      messageEn = `Farm ${farm.name}: Soil moisture is saturated (${soilMoisturePercentage}%) following ${weather.rainfallMm}mm rain. Avoid watering to prevent waterlogging and root rot.`;
      messageFr = `Champ ${farm.name} : Sol suffisamment humide (${soilMoisturePercentage}%). N'arrosez pas.`;

      rabAdvisoryRw = `Fungura imiferege n'imiyoboro y'amazi kugira ngo amazi menshi adacengera mu birayi cyangwa inyanya.`;
      rabAdvisoryEn = `Clear drainage furrows to prevent standing water and late blight infection.`;
      rabAdvisoryFr = `Nettoyer les fossés de drainage pour éviter la stagnation d'eau.`;
    } else {
      titleRw = `✅ Ubuhehere Bwiza Cyane (${soilMoisturePercentage}%) kuri ${cropName}`;
      titleEn = `✅ Optimal Soil Moisture (${soilMoisturePercentage}%) for ${cropName}`;
      titleFr = `✅ Humidité Optimale (${soilMoisturePercentage}%) pour ${cropName}`;

      messageRw = `Umurima wa ${farm.name}: Ubuhehere buri mu rugero rwifuzwa (${soilMoisturePercentage}%). Igihingwa kiri gukura neza nta kibazo cy'amazi.`;
      messageEn = `Farm ${farm.name}: Soil moisture is in the optimal growth range (${soilMoisturePercentage}%). Crop water needs are currently satisfied.`;
      messageFr = `Champ ${farm.name} : Humidité optimale (${soilMoisturePercentage}%).`;

      rabAdvisoryRw = `Komeza gukurikirana buri munsi cyane cyane mu gihe cy'amashami n'indabyo.`;
      rabAdvisoryEn = `Continue daily monitoring, particularly through reproductive flowering phase.`;
      rabAdvisoryFr = `Poursuivre le suivi quotidien.`;
    }

    // Suggested immediate farm activity to insert with one click
    const suggestedActivity: Omit<FarmActivity, "id"> = {
      farmId: farm.id,
      farmName: farm.name,
      crop: cropName,
      title: `Kuhira Byihuse: ${cropName} (${recommendedWaterMm}mm / ${(recommendedWaterLitersPerHa * farm.sizeHa).toLocaleString()} L)`,
      category: "irrigation",
      dueDate: todayStr,
      status: "pending",
      assignedTo: "Abakozi bo Kuhira (Irrigation Team)",
      notes: `Integuza y'ubuhehere bwa ${soilMoisturePercentage}% (munsi ya ${sensitivity.thresholdPercentage}%). Kuhira hagati ya 06:00 na 08:30 za mugitondo ku ngano ya mm ${recommendedWaterMm}.`,
    };

    const humidityAlertTitleRw = isLowHumidityAlert
      ? `🌬️ Integuza y'Ikirere: Ubukonje bw'umwuka bwagabanutse (${effectiveHumidity}% < ${criticalHumidityThreshold}%) muri ${farm.district}`
      : undefined;
    const humidityAlertTitleEn = isLowHumidityAlert
      ? `🌬️ Real-Time Climate Alert: Local Humidity Dropped to ${effectiveHumidity}% (Below ${criticalHumidityThreshold}% Threshold)`
      : undefined;
    const humidityAlertMessageRw = isLowHumidityAlert
      ? `Meteo Rwanda irerekana ko ubukonje bw'umwuka muri ${farm.district} bwamanutse kuri ${effectiveHumidity}% (munsi y'urugero fatizo rwa ${criticalHumidityThreshold}%) hamwe n'ubushyuhe bwa ${weather.tempC}°C (VPD: ${vaporPressureDeficitKpa} kPa). Ibi bituma amazi acika mu butaka no mu mababi ya ${cropName} vuba cyane. Hiyongereyeho mm ${lowHumidityExtraWaterMm} z'amazi yo kuhira.`
      : undefined;
    const humidityAlertMessageEn = isLowHumidityAlert
      ? `Forecast relative humidity in ${farm.district} dropped to ${effectiveHumidity}% (below critical ${criticalHumidityThreshold}% threshold) at ${weather.tempC}°C (VPD: ${vaporPressureDeficitKpa} kPa). Accelerated evapotranspiration is drying ${cropName} root zones; +${lowHumidityExtraWaterMm}mm irrigation buffer added.`
      : undefined;

    const threeDayForecast = calculateThreeDayWaterUsageForecast({
      currentMoisturePct: soilMoisturePercentage,
      thresholdPct: effectiveThresholdPct,
      cropCoefficientKc: sensitivity.cropCoefficientKc,
      baseTempC: weather.tempC,
      baseHumidityPct: effectiveHumidity,
      baseRainMm: weather.rainfallMm,
      soilType: farm.soilType,
      district: farm.district,
      sizeHa: farm.sizeHa,
    });

    alerts.push({
      id: `irrig-demand-${farm.id}`,
      farmId: farm.id,
      farmName: farm.name,
      farmSizeHa: farm.sizeHa,
      planId: activePlan?.id,
      crop: cropName,
      district: farm.district,
      agroZone: farm.agroZone,
      soilType: farm.soilType,
      irrigationType: farm.irrigationType,
      soilMoisturePercentage,
      thresholdPercentage: effectiveThresholdPct,
      isAutomatedThresholdBreached,
      matchedCropRule,
      status,
      sensorReading: activeSensorReading,
      threeDayForecast,
      weatherSummary: {
        tempC: weather.tempC,
        rainfallMm: weather.rainfallMm,
        humidity: effectiveHumidity,
        conditionRw: weather.conditionRw,
        conditionEn: weather.conditionEn,
      },
      criticalHumidityThreshold,
      isLowHumidityAlert,
      vaporPressureDeficitKpa,
      humidityAlertTitleRw,
      humidityAlertTitleEn,
      humidityAlertMessageRw,
      humidityAlertMessageEn,
      growthStageSummary: {
        percentage: growthPercentage,
        stageName: sensitivity.stageNameRw,
        isPeakWaterDemand: sensitivity.isPeakWaterDemand,
        cropCoefficientKc: sensitivity.cropCoefficientKc,
      },
      waterDeficitMm: recommendedWaterMm,
      recommendedWaterMm,
      recommendedWaterLitersPerHa,
      recommendedMethodRw,
      recommendedMethodEn,
      suggestedTimeWindow,
      titleRw,
      titleEn,
      titleFr,
      messageRw,
      messageEn,
      messageFr,
      rabAdvisoryRw,
      rabAdvisoryEn,
      rabAdvisoryFr,
      suggestedActivity,
      createdAt: todayStr,
    });
  });

  // Sort alerts so Critical & High Demand appear first
  return alerts.sort((a, b) => {
    const order: Record<IrrigationDemandLevel, number> = {
      critical: 1,
      high: 2,
      moderate: 3,
      optimal: 4,
      saturated: 5,
    };
    return order[a.status] - order[b.status];
  });
};

/**
 * Plays a refreshing water drip acoustic chime tone via Web Audio API.
 * Works completely offline without requiring audio files!
 */
export const playWaterDropChime = (): void => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First droplet pitch bend (700Hz -> 1320Hz droplet splash)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(700, now);
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second ripple tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.14); // C6
    osc2.frequency.exponentialRampToValueAtTime(1568, now + 0.24); // G6
    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Water audio playback:", e);
  }
};

/**
 * Triggers a simulated or native Push Notification specifically for an Irrigation Demand Alert
 */
export const triggerIrrigationDemandPushNotification = async (
  alert: IrrigationDemandAlert,
  language: Language
): Promise<boolean> => {
  const title = alert.isLowHumidityAlert
    ? language === "rw"
      ? alert.humidityAlertTitleRw || alert.titleRw
      : alert.humidityAlertTitleEn || alert.titleEn
    : language === "rw"
    ? alert.titleRw
    : language === "fr"
    ? alert.titleFr
    : alert.titleEn;

  const message = alert.isLowHumidityAlert
    ? language === "rw"
      ? alert.humidityAlertMessageRw || alert.messageRw
      : alert.humidityAlertMessageEn || alert.messageEn
    : language === "rw"
    ? alert.messageRw
    : language === "fr"
    ? alert.messageFr
    : alert.messageEn;

  // Play water sound effect
  playWaterDropChime();

  // 1. Dispatch custom in-app push alert event
  window.dispatchEvent(
    new CustomEvent("terimbere:irrigation_push", {
      detail: {
        alert,
        title,
        message,
        timestamp: new Date().toISOString(),
      },
    })
  );

  // 2. Also dispatch generic push alert so SimulatedPushNotificationToast receives it
  window.dispatchEvent(
    new CustomEvent("terimbere:push_alert", {
      detail: {
        alert: {
          id: alert.id,
          activityId: alert.id,
          farmId: alert.farmId,
          farmName: alert.farmName,
          crop: alert.crop,
          title: alert.titleEn,
          category: "irrigation" as const,
          dueDate: new Date().toISOString().split("T")[0],
          daysRemaining: 0,
          urgency: "due_today" as const,
          isThreeDaysBefore: false,
          titleRw: alert.titleRw,
          titleEn: alert.titleEn,
          titleFr: alert.titleFr,
          messageRw: alert.messageRw,
          messageEn: alert.messageEn,
          messageFr: alert.messageFr,
          checklistRw: [
            "Kugenzura ko imiyoboro y'amazi itazibye",
            "Kuhira mu masaha ya mugitondo hakiri kare (06h00 - 08h30)",
            "Gupima ubuhehere ku bujyakuzimu bwa cm 15",
          ],
          checklistEn: [
            "Inspect drip lines and clean pump filters",
            "Irrigate in cool morning (06:00 - 08:30 AM)",
            "Verify moisture infiltration depth reaches 15cm",
          ],
          checklistFr: [
            "Inspecter les canalisations et goutteurs",
            "Arroser tôt le matin (06h00 - 08h30)",
            "Tester l'humidité à 15 cm de profondeur",
          ],
          suggestedInput: `Amazi yo kuhira: mm ${alert.recommendedWaterMm} (${alert.recommendedWaterLitersPerHa.toLocaleString()} L/Ha)`,
        },
        title,
        message,
        timestamp: new Date().toISOString(),
      },
    })
  );

  // 3. Native browser Web Notification if permitted
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: alert.id,
        });
        return true;
      } else if (Notification.permission !== "denied") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification(title, {
            body: message,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: alert.id,
          });
          return true;
        }
      }
    } catch (e) {
      console.warn("Browser Notification API call:", e);
    }
  }

  return true;
};
