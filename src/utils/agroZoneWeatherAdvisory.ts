import {
  ActivityCategory,
  DailyWeatherForecast,
  Farm,
  FarmActivity,
  FarmPlan,
  ShiftWindowId,
} from "../types";
import { getForecastForDistrict } from "../data/weatherForecastData";

export type AgroZoneId =
  | "birunga_volcanic"
  | "eastern_savanna"
  | "central_plateau"
  | "kivu_borders"
  | "congo_nile_crest";

export type AgroZoneWeatherScenarioId =
  | "live_forecast"
  | "onset_planting_rains"
  | "high_humidity_blight_surge"
  | "dry_spell_pest_outbreak";

export type PlantingReadinessStatus =
  | "optimal_window"
  | "caution_wait_rain"
  | "delay_excess_rain"
  | "soil_prep_window";

export interface DailyPlantingWindowSlot {
  date: string;
  dayNameRw: string;
  dayNameEn: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  humidityPct: number;
  suitability: "optimal" | "good" | "caution" | "avoid";
  labelEn: string;
  labelRw: string;
  reasonEn: string;
  reasonRw: string;
}

export interface CropPlantingRecommendation {
  cropName: string;
  readinessStatus: PlantingReadinessStatus;
  readinessScore: number; // 0 - 100
  statusLabelEn: string;
  statusLabelRw: string;
  bestPlantingDatesLabelEn: string;
  bestPlantingDatesLabelRw: string;
  recommendedDateIso: string;
  rabCertifiedVarieties: string[];
  seedbedAndDepthEn: string;
  seedbedAndDepthRw: string;
  basalFertilizerTimingEn: string;
  basalFertilizerTimingRw: string;
  weatherRationaleEn: string;
  weatherRationaleRw: string;
}

export interface AgroZonePestRiskAssessment {
  id: string;
  pestOrDiseaseNameEn: string;
  pestOrDiseaseNameRw: string;
  scientificName: string;
  pestType: "fungal_pathogen" | "insect_pest" | "bacterial_viral";
  targetCrop: string;
  riskLevel: "critical" | "high" | "moderate" | "low";
  riskScore: number; // 0 - 100
  weatherTriggerSummaryEn: string;
  weatherTriggerSummaryRw: string;
  favorableConditionsLabel: string;
  scoutingProtocolEn: string;
  scoutingProtocolRw: string;
  ipmCulturalControlEn: string;
  ipmCulturalControlRw: string;
  rabRecommendedTreatmentEn: string;
  rabRecommendedTreatmentRw: string;
  optimalSprayDateIso: string;
  optimalSprayWindowLabelEn: string;
  optimalSprayWindowLabelRw: string;
  recommendedShiftWindow: ShiftWindowId;
}

export interface AgroZoneWeatherMetrics {
  cumulativeRain7dMm: number;
  rainyDaysCount: number;
  peakRainDayMm: number;
  peakRainDayDate: string;
  avgMaxTempC: number;
  avgMinTempC: number;
  meanTempC: number;
  avgHumidityPct: number;
  peakHumidityPct: number;
  estimatedLeafWetnessHoursPerDay: number;
  growingDegreeDays7d: number;
  soilMoistureProjectedPct: number;
  evapotranspiration7dMm: number;
}

export interface AgroZoneWeatherAnalysisReport {
  farmId: string;
  farmName: string;
  district: string;
  sector: string;
  altitude: number;
  agroZone: string;
  agroZoneId: AgroZoneId;
  elevationBandLabel: string;
  agroZoneCharacteristicsEn: string;
  agroZoneCharacteristicsRw: string;
  rabSeasonWindowEn: string;
  rabSeasonWindowRw: string;
  dataSourceLabel: string;
  fetchedAtIso: string;
  scenarioId: AgroZoneWeatherScenarioId;
  forecastDays: DailyWeatherForecast[];
  metrics: AgroZoneWeatherMetrics;
  dailyPlantingTimeline: DailyPlantingWindowSlot[];
  cropPlantingRecommendations: CropPlantingRecommendation[];
  pestRiskAssessments: AgroZonePestRiskAssessment[];
  overallPlantingVerdictEn: string;
  overallPlantingVerdictRw: string;
  overallPestAlertHeadlineEn: string;
  overallPestAlertHeadlineRw: string;
}

/**
 * Classifies a farm's agroZone string and altitude into a canonical AgroZoneId
 */
export const classifyAgroZoneId = (farm: Farm): AgroZoneId => {
  const z = (farm.agroZone || "").toLowerCase();
  if (
    z.includes("volcanic") ||
    z.includes("birunga") ||
    z.includes("buberuka") ||
    farm.altitude >= 2000
  ) {
    return "birunga_volcanic";
  }
  if (
    z.includes("savanna") ||
    z.includes("eastern") ||
    z.includes("bugesera") ||
    z.includes("mayaga") ||
    farm.altitude < 1500
  ) {
    return "eastern_savanna";
  }
  if (z.includes("kivu") || z.includes("imbo") || z.includes("rusizi")) {
    return "kivu_borders";
  }
  if (z.includes("congo") || z.includes("nile") || z.includes("crest")) {
    return "congo_nile_crest";
  }
  return "central_plateau";
};

/**
 * Applies optional weather scenario simulation or agroZone microclimate calibration
 * to the 7-day forecast for the farm's district & agroZone.
 */
export const getCalibratedForecastForFarmAgroZone = (
  farm: Farm,
  scenarioId: AgroZoneWeatherScenarioId = "live_forecast",
  externalForecastDays?: DailyWeatherForecast[]
): DailyWeatherForecast[] => {
  const baseDays =
    externalForecastDays && externalForecastDays.length > 0
      ? externalForecastDays
      : getForecastForDistrict(farm.district);

  const agroZoneId = classifyAgroZoneId(farm);

  return baseDays.map((day, index) => {
    let tempMax = day.tempMax;
    let tempMin = day.tempMin;
    let rainMm = day.rainMm;
    let rainChance = day.rainChance;
    let humidity = day.humidity;
    let condition = day.condition;

    // Apply scenario adjustments if selected for testing agroZone sensitivity
    if (scenarioId === "onset_planting_rains") {
      if (index <= 2) {
        rainMm = agroZoneId === "eastern_savanna" ? 14 : 18;
        rainChance = 78;
        humidity = agroZoneId === "eastern_savanna" ? 68 : 78;
        condition = "moderate_rain";
      } else {
        rainMm = 4;
        rainChance = 35;
        humidity = 65;
        condition = "partly_cloudy";
      }
    } else if (scenarioId === "high_humidity_blight_surge") {
      if (index <= 4) {
        rainMm = agroZoneId === "birunga_volcanic" ? 26 : 21;
        rainChance = 92;
        humidity = agroZoneId === "birunga_volcanic" ? 91 : 86;
        tempMax = agroZoneId === "birunga_volcanic" ? 18 : 22;
        tempMin = agroZoneId === "birunga_volcanic" ? 11 : 14;
        condition = "heavy_rain";
      }
    } else if (scenarioId === "dry_spell_pest_outbreak") {
      rainMm = index === 5 ? 2 : 0;
      rainChance = index === 5 ? 20 : 8;
      humidity = agroZoneId === "eastern_savanna" ? 36 : 46;
      tempMax =
        agroZoneId === "eastern_savanna"
          ? 34
          : agroZoneId === "central_plateau"
            ? 29
            : 25;
      tempMin = agroZoneId === "eastern_savanna" ? 20 : 15;
      condition = "sunny";
    }

    return {
      ...day,
      tempMax,
      tempMin,
      rainMm,
      rainChance,
      humidity,
      condition,
    };
  });
};

/**
 * Computes 7-day agro-meteorological metrics for a farm's agroZone
 */
export const computeAgroZoneWeatherMetrics = (
  farm: Farm,
  forecastDays: DailyWeatherForecast[]
): AgroZoneWeatherMetrics => {
  const days = forecastDays.slice(0, 7);
  const count = Math.max(1, days.length);

  const cumulativeRain7dMm = Math.round(
    days.reduce((sum, d) => sum + d.rainMm, 0) * 10
  ) / 10;
  const rainyDaysCount = days.filter((d) => d.rainMm >= 5).length;

  let peakRainDayMm = 0;
  let peakRainDayDate = days[0]?.date || "";
  days.forEach((d) => {
    if (d.rainMm >= peakRainDayMm) {
      peakRainDayMm = d.rainMm;
      peakRainDayDate = d.date;
    }
  });

  const avgMaxTempC =
    Math.round((days.reduce((s, d) => s + d.tempMax, 0) / count) * 10) / 10;
  const avgMinTempC =
    Math.round((days.reduce((s, d) => s + d.tempMin, 0) / count) * 10) / 10;
  const meanTempC = Math.round(((avgMaxTempC + avgMinTempC) / 2) * 10) / 10;

  const avgHumidityPct = Math.round(
    days.reduce((s, d) => s + d.humidity, 0) / count
  );
  const peakHumidityPct = Math.max(...days.map((d) => d.humidity));

  // Estimate daily leaf wetness hours from RH, rainfall, and altitude mist
  const altitudeMistBonus =
    farm.altitude >= 2000 ? 2.2 : farm.altitude >= 1650 ? 1.1 : 0.3;
  const rawLeafWetness =
    (avgHumidityPct > 80
      ? 7.5 + (avgHumidityPct - 80) * 0.25
      : avgHumidityPct > 65
        ? 4.0 + (avgHumidityPct - 65) * 0.2
        : 1.8) +
    rainyDaysCount * 0.65 +
    altitudeMistBonus;
  const estimatedLeafWetnessHoursPerDay =
    Math.min(18, Math.round(rawLeafWetness * 10) / 10);

  // Growing Degree Days (Base 10°C) over 7 days
  const growingDegreeDays7d = Math.round(
    days.reduce((sum, d) => {
      const dailyMean = (d.tempMax + d.tempMin) / 2;
      return sum + Math.max(0, dailyMean - 10);
    }, 0)
  );

  // Evapotranspiration 7d estimate (mm) based on mean temp & humidity
  const dailyEt0 =
    meanTempC >= 24
      ? 4.8
      : meanTempC >= 19
        ? 3.6
        : 2.5;
  const humidityFactor = avgHumidityPct < 50 ? 1.25 : avgHumidityPct > 80 ? 0.8 : 1.0;
  const evapotranspiration7dMm = Math.round(dailyEt0 * humidityFactor * count);

  // Projected soil moisture (%)
  const currentSoilMoisture = farm.soilMoisture || 60;
  const netWaterBalanceMm = cumulativeRain7dMm - evapotranspiration7dMm;
  const soilMoistureProjectedPct = Math.max(
    18,
    Math.min(96, Math.round(currentSoilMoisture + netWaterBalanceMm * 0.38))
  );

  return {
    cumulativeRain7dMm,
    rainyDaysCount,
    peakRainDayMm,
    peakRainDayDate,
    avgMaxTempC,
    avgMinTempC,
    meanTempC,
    avgHumidityPct,
    peakHumidityPct,
    estimatedLeafWetnessHoursPerDay,
    growingDegreeDays7d,
    soilMoistureProjectedPct,
    evapotranspiration7dMm,
  };
};

/**
 * Generates the 7-day day-by-day planting suitability timeline for the farm's agroZone
 */
const buildDailyPlantingTimeline = (
  farm: Farm,
  agroZoneId: AgroZoneId,
  forecastDays: DailyWeatherForecast[]
): DailyPlantingWindowSlot[] => {
  return forecastDays.slice(0, 7).map((day, idx) => {
    const nextDayRain = forecastDays[idx + 1]?.rainMm ?? day.rainMm;

    // Waterlogging / seed washout risk on steep highland or heavy storm day
    if (
      day.rainMm >= 22 ||
      (agroZoneId === "birunga_volcanic" && day.rainMm >= 18)
    ) {
      return {
        date: day.date,
        dayNameRw: day.dayNameRw,
        dayNameEn: day.dayNameEn,
        tempMax: day.tempMax,
        tempMin: day.tempMin,
        rainMm: day.rainMm,
        humidityPct: day.humidity,
        suitability: "avoid",
        labelEn: "Avoid Sowing (Heavy Rain)",
        labelRw: "Irinde Gutera (Imvura Nyinshi)",
        reasonEn: `${day.rainMm}mm downpour risks seed washout & tuber/seed rot in ${farm.agroZone}. Focus on drainage trenches.`,
        reasonRw: `Imvura ya ${day.rainMm}mm ishobora gutwara imbuto cyangwa kuzibora muri ${farm.agroZone}. Sibura imiferege.`,
      };
    }

    // Extreme heat / dry topsoil risk
    if (
      day.tempMax >= 31 &&
      day.rainMm < 3 &&
      nextDayRain < 4 &&
      farm.soilMoisture < 52
    ) {
      return {
        date: day.date,
        dayNameRw: day.dayNameRw,
        dayNameEn: day.dayNameEn,
        tempMax: day.tempMax,
        tempMin: day.tempMin,
        rainMm: day.rainMm,
        humidityPct: day.humidity,
        suitability: "caution",
        labelEn: "Dry Topsoil — Pre-Irrigate / Wait",
        labelRw: "Ubutaka bwumye —uhira cyangwa tegereza",
        reasonEn: `High ${day.tempMax}°C heat & ${day.rainMm}mm rain in ${farm.agroZone} causes poor germination without furrow pre-watering.`,
        reasonRw: `Ubushyuhe bwa ${day.tempMax}°C n'imvura nke (${day.rainMm}mm) bibangamira kumera kw'imbuto utabanje kuhira.`,
      };
    }

    // Optimal sowing window: moderate rain (4–16mm) or day right before/after moderate rain with good soil moisture
    if (
      (day.rainMm >= 4 && day.rainMm <= 17) ||
      (day.rainMm < 6 && nextDayRain >= 5 && nextDayRain <= 18) ||
      (farm.soilMoisture >= 58 && day.rainMm <= 14 && day.tempMax <= 29)
    ) {
      return {
        date: day.date,
        dayNameRw: day.dayNameRw,
        dayNameEn: day.dayNameEn,
        tempMax: day.tempMax,
        tempMin: day.tempMin,
        rainMm: day.rainMm,
        humidityPct: day.humidity,
        suitability: "optimal",
        labelEn: "Optimal Planting Window",
        labelRw: "Igihe Cyiza Cyo Gutera",
        reasonEn: `Ideal soil moisture & ${day.tempMax}°C/${day.tempMin}°C thermal regime (${day.rainMm}mm rain) for rapid emergence in ${farm.agroZone}.`,
        reasonRw: `Ubuhehere bw'ubutaka bukwiye n'ubushyuhe bwa ${day.tempMax}°C/${day.tempMin}°C (${day.rainMm}mm) bifasha imbuto kumera neza.`,
      };
    }

    return {
      date: day.date,
      dayNameRw: day.dayNameRw,
      dayNameEn: day.dayNameEn,
      tempMax: day.tempMax,
      tempMin: day.tempMin,
      rainMm: day.rainMm,
      humidityPct: day.humidity,
      suitability: "good",
      labelEn: "Good for Ridging & Basal NPK",
      labelRw: "Gutegura Imirama n'Ifumbire",
      reasonEn: `Favorable field workability (${day.rainMm}mm rain, ${day.tempMax}°C) for seedbed preparation and basal manure incorporation.`,
      reasonRw: `Ikirere cyiza (${day.rainMm}mm, ${day.tempMax}°C) cyo gutegura umurima no gushyiramo ifumbire y'ibanze.`,
    };
  });
};

/**
 * Generates customized crop planting time & agronomic recommendations for each crop in the farm's agroZone
 */
const buildCropPlantingRecommendations = (
  farm: Farm,
  agroZoneId: AgroZoneId,
  metrics: AgroZoneWeatherMetrics,
  timeline: DailyPlantingWindowSlot[],
  plans: FarmPlan[]
): CropPlantingRecommendation[] => {
  const farmPlanCrops = plans
    .filter((p) => p.farmId === farm.id)
    .map((p) => p.crop);
  const allCrops = Array.from(new Set([...farm.mainCrops, ...farmPlanCrops]));
  const cropsToAnalyze =
    allCrops.length > 0 ? allCrops : ["Ibigori (Maize)", "Ibishyimbo (Beans)"];

  const optimalSlots = timeline.filter((t) => t.suitability === "optimal");
  const firstOptimalDate =
    optimalSlots[0]?.date ||
    timeline.find((t) => t.suitability === "good")?.date ||
    timeline[0]?.date ||
    new Date().toISOString().split("T")[0];
  const lastOptimalDate =
    optimalSlots[optimalSlots.length - 1]?.date || firstOptimalDate;

  return cropsToAnalyze.map((crop) => {
    const cLower = crop.toLowerCase();

    // 1. Irish Potatoes (Ibirayi) - Volcanic Highlands / Highland specialization
    if (cLower.includes("ibirayi") || cLower.includes("potato")) {
      const excessRain = metrics.cumulativeRain7dMm >= 70 || metrics.peakRainDayMm >= 24;
      const readinessStatus: PlantingReadinessStatus = excessRain
        ? "delay_excess_rain"
        : optimalSlots.length >= 2
          ? "optimal_window"
          : "soil_prep_window";
      const readinessScore = excessRain
        ? 58
        : Math.min(96, 76 + optimalSlots.length * 4);

      return {
        cropName: crop,
        readinessStatus,
        readinessScore,
        statusLabelEn: excessRain
          ? "Wait 48h After Peak Downpour Before Ridging"
          : "Optimal Highland Tuber Planting Window",
        statusLabelRw: excessRain
          ? "Tegereza amasaha 48 nyuma y'imvura nyinshi mbere yo gutera"
          : "Igihe Cyiza cyo Gutera Ibirayi mu Birunga",
        bestPlantingDatesLabelEn:
          optimalSlots.length > 0
            ? `${firstOptimalDate} to ${lastOptimalDate} (${optimalSlots.length} optimal days in forecast)`
            : `Target ${firstOptimalDate} after draining excess surface water`,
        bestPlantingDatesLabelRw:
          optimalSlots.length > 0
            ? `Kuva ${firstOptimalDate} kugeza ${lastOptimalDate} (iminsi ${optimalSlots.length} myiza)`
            : `Teganya ${firstOptimalDate} umaze kuyobora amazi menshi`,
        recommendedDateIso: firstOptimalDate,
        rabCertifiedVarieties: ["Kinigi", "Kirundo", "Cruza 148", "Rwangume"],
        seedbedAndDepthEn: `Plant pre-sprouted (chitted) seed tubers at 10–12 cm depth on raised 25 cm contour ridges spaced 75 cm × 30 cm across ${farm.soilType} (${farm.altitude}m ASL) to prevent waterlogging and Erwinia soft rot.`,
        seedbedAndDepthRw: `Tera imbuto z'ibirayi zashibijwe ku bujyakuzimu bwa 10–12 cm ku mirama izamuye ya 25 cm (75 cm × 30 cm) mu butaka bwa ${farm.soilType} (${farm.altitude}m) kugira ngo birinde kubora.`,
        basalFertilizerTimingEn: `Incorporate 10–15 t/ha well-decomposed compost + 300 kg/ha NPK 17-17-17 in the ridge furrow at planting on ${firstOptimalDate} when rain is <15mm/day.`,
        basalFertilizerTimingRw: `Shyiramo 10–15 t/ha z'ifumbire y'imborera + 300 kg/ha NPK 17-17-17 mu mirama igihe utera kuri ${firstOptimalDate} imvura itarenze 15mm.`,
        weatherRationaleEn: `7-day forecast for ${farm.agroZone} shows ${metrics.cumulativeRain7dMm}mm total rain (${metrics.rainyDaysCount} wet days) and ${metrics.avgMaxTempC}°C/${metrics.avgMinTempC}°C temperatures, providing ${metrics.soilMoistureProjectedPct}% soil moisture ideal for stolon initiation without thermal stress.`,
        weatherRationaleRw: `Iteganyagihe ry'iminsi 7 muri ${farm.agroZone} rigaragaza imvura ya ${metrics.cumulativeRain7dMm}mm n'ubushyuhe bwa ${metrics.avgMaxTempC}°C/${metrics.avgMinTempC}°C, bitanga ubuhehere bw'ubutaka bwa ${metrics.soilMoistureProjectedPct}% bukwiye kumera kw'ibirayi.`,
      };
    }

    // 2. Maize (Ibigori) - Eastern Savanna / Plateau specialization
    if (cLower.includes("ibigori") || cLower.includes("maize") || cLower.includes("corn")) {
      const tooDry =
        metrics.cumulativeRain7dMm < 15 && farm.soilMoisture < 52;
      const readinessStatus: PlantingReadinessStatus = tooDry
        ? "caution_wait_rain"
        : optimalSlots.length >= 2
          ? "optimal_window"
          : "soil_prep_window";
      const readinessScore = tooDry
        ? 54
        : Math.min(95, 78 + optimalSlots.length * 3);

      return {
        cropName: crop,
        readinessStatus,
        readinessScore,
        statusLabelEn: tooDry
          ? "Caution: Dry Spell — Pre-Irrigate Furrows or Sow Before Rain Day"
          : "Prime Savanna Maize Sowing Window",
        statusLabelRw: tooDry
          ? "itonde: Izuba ryinshi — Banza Kuhira cyangwa Utere Mbere y'Umunsi w'Imvura"
          : "Igihe Cyiza cyo Gutera Ibigori",
        bestPlantingDatesLabelEn:
          tooDry
            ? `Sow on ${metrics.peakRainDayDate} ahead of forecasted ${metrics.peakRainDayMm}mm shower`
            : `${firstOptimalDate} to ${lastOptimalDate} (${metrics.growingDegreeDays7d} GDD thermal units in 7d)`,
        bestPlantingDatesLabelRw:
          tooDry
            ? `Tera kuri ${metrics.peakRainDayDate} mbere y'imvura ya ${metrics.peakRainDayMm}mm iteganyijwe`
            : `Kuva ${firstOptimalDate} kugeza ${lastOptimalDate} (${metrics.growingDegreeDays7d} GDD mu minsi 7)`,
        recommendedDateIso: tooDry ? metrics.peakRainDayDate : firstOptimalDate,
        rabCertifiedVarieties:
          agroZoneId === "eastern_savanna"
            ? ["WH 507 (Drought-Tolerant)", "Hybrid H628", "RHM 1407", "ZM 607"]
            : ["H628", "Pool 9A (Highland)", "RHM 104"],
        seedbedAndDepthEn: `Sow 1–2 seeds per station at 5 cm depth (75 cm between rows × 25–30 cm within rows) in tied ridges across ${farm.agroZone} (${farm.altitude}m ASL) to capture every mm of the forecasted ${metrics.cumulativeRain7dMm}mm rainfall.`,
        seedbedAndDepthRw: `Tera imbuto 1–2 mu mwobo ku bujyakuzimu bwa 5 cm (75 cm × 25–30 cm) mu mirama ifunze muri ${farm.agroZone} (${farm.altitude}m) kugira ngo amazi y'imvura (${metrics.cumulativeRain7dMm}mm) agume mu butaka.`,
        basalFertilizerTimingEn: `Band-apply 100 kg/ha DAP (18-46-0) 5 cm beside the seed hole at sowing; schedule Urea (46-0-0) top-dressing at V6 knee-high stage (28–35 days after emergence).`,
        basalFertilizerTimingRw: `Shyiramo 100 kg/ha za DAP (18-46-0) kuri 5 cm iruhande rw'imbuto mu gihe cyo gutera; gahunda ya Urea (46-0-0) izakorwa ibigori bigeze mu mavi.`,
        weatherRationaleEn: `With ${metrics.avgMaxTempC}°C daytime highs, ${metrics.growingDegreeDays7d} GDD (Base 10°C), and ${metrics.cumulativeRain7dMm}mm 7-day rain in ${farm.agroZone}, coleoptile emergence will complete in 4–5 days if moisture is conserved with mulch.`,
        weatherRationaleRw: `Kubera ubushyuhe bwa ${metrics.avgMaxTempC}°C, ${metrics.growingDegreeDays7d} GDD, n'imvura ya ${metrics.cumulativeRain7dMm}mm muri ${farm.agroZone}, ibigori bizamera mu minsi 4–5 ubikoreye isaso.`,
      };
    }

    // 3. Coffee (Ikawa) - Central Plateau / Kivu specialization
    if (cLower.includes("ikawa") || cLower.includes("coffee")) {
      const readinessStatus: PlantingReadinessStatus =
        metrics.cumulativeRain7dMm >= 18 ? "optimal_window" : "soil_prep_window";
      const readinessScore =
        metrics.cumulativeRain7dMm >= 18 ? 91 : 74;

      return {
        cropName: crop,
        readinessStatus,
        readinessScore,
        statusLabelEn:
          metrics.cumulativeRain7dMm >= 18
            ? "Optimal Window for Infill Transplanting & Canopy Basin Mulching"
            : "Prepare 60×60×60cm Planting Holes & Shade Mulch",
        statusLabelRw:
          metrics.cumulativeRain7dMm >= 18
            ? "Igihe Cyiza cyo Gusimbura Ingemwe z'Ikawa no Gusasira"
            : "Tegura Imyobo ya 60×60×60cm n'Isaso y'Ikawa",
        bestPlantingDatesLabelEn: `${firstOptimalDate} to ${lastOptimalDate} (${metrics.rainyDaysCount} humid rain days in ${farm.agroZone})`,
        bestPlantingDatesLabelRw: `Kuva ${firstOptimalDate} kugeza ${lastOptimalDate} (iminsi ${metrics.rainyDaysCount} y'imvura muri ${farm.agroZone})`,
        recommendedDateIso: firstOptimalDate,
        rabCertifiedVarieties: [
          "BM 139 (Bourbon Mayaguez)",
          "Jackson 2/1257",
          "POP 3303/21",
        ],
        seedbedAndDepthEn: `Transplant 8–10 month polybag Bourbon seedlings into pre-weathered 60×60×60 cm pits spaced 2.0 m × 2.5 m at ${farm.altitude}m ASL; maintain a 10 cm Grevillea/banana leaf mulch ring 10 cm away from the collar.`,
        seedbedAndDepthRw: `Tera ingemwe za Bourbon zifite amezi 8–10 mu myobo ya 60×60×60 cm (2.0 m × 2.5 m) kuri ${farm.altitude}m; shyira isaso ya 10 cm iruhande rw'igiti.`,
        basalFertilizerTimingEn: `Mix 15 kg decomposed manure + 100g agricultural lime (soil pH ${farm.soilPh}) in planting hole; apply 120g/tree NPK 20-10-10 in a half-moon band under the drip line on ${firstOptimalDate}.`,
        basalFertilizerTimingRw: `Vanga 15 kg z'imborera + 100g z'ishwagara (pH ${farm.soilPh}) mu mwobo; shyira 120g ku giti za NPK 20-10-10 munsi y'amashami kuri ${firstOptimalDate}.`,
        weatherRationaleEn: `${farm.agroZone} forecast delivers ${metrics.cumulativeRain7dMm}mm gentle plateau rainfall with ${metrics.avgMaxTempC}°C/${metrics.avgMinTempC}°C temperatures and ${metrics.avgHumidityPct}% RH — minimizing transplant shock and supporting feeder root establishment.`,
        weatherRationaleRw: `Iteganyagihe rya ${farm.agroZone} ritanga imvura ya ${metrics.cumulativeRain7dMm}mm n'ubushyuhe bwa ${metrics.avgMaxTempC}°C/${metrics.avgMinTempC}°C (${metrics.avgHumidityPct}% RH) — birinda ingemwe kuma.`,
      };
    }

    // 4. Beans / Soybeans / Legumes (Ibishyimbo / Soya) or Bananas / Default
    const isLegume =
      cLower.includes("ibishyimbo") ||
      cLower.includes("bean") ||
      cLower.includes("soya") ||
      cLower.includes("soy");
    const readinessStatus: PlantingReadinessStatus =
      optimalSlots.length >= 2 ? "optimal_window" : "soil_prep_window";
    const readinessScore = Math.min(94, 77 + optimalSlots.length * 3);

    return {
      cropName: crop,
      readinessStatus,
      readinessScore,
      statusLabelEn: isLegume
        ? "Optimal Legume Sowing & Rhizobium Inoculation Window"
        : "Recommended AgroZone Planting & Field Establishment Window",
      statusLabelRw: isLegume
        ? "Igihe Cyiza cyo Gutera Ibishyimbo / Soya"
        : "Igihe Cyiza cyo Gutera muri iyi Ntara y'Ubuhinzi",
      bestPlantingDatesLabelEn: `${firstOptimalDate} to ${lastOptimalDate} (${optimalSlots.length} optimal days)`,
      bestPlantingDatesLabelRw: `Kuva ${firstOptimalDate} kugeza ${lastOptimalDate} (iminsi ${optimalSlots.length} myiza)`,
      recommendedDateIso: firstOptimalDate,
      rabCertifiedVarieties: isLegume
        ? agroZoneId === "birunga_volcanic"
          ? ["MAC 44 (High-Iron Climbing)", "RWV 1129", "Gasirida"]
          : ["RWR 2245 (Biofortified)", "Peka 6 (Soybean)", "Sc. Sequel"]
        : ["RAB Certified High-Yield Cultivar", "FHIA-17 / Injagi"],
      seedbedAndDepthEn: isLegume
        ? `Sow inoculated seeds at 3–4 cm depth in moist ${farm.soilType} (40 cm × 10 cm for bush/soy; 50 cm × 20 cm with 2.2m stakes for climbing beans at ${farm.altitude}m ASL). Avoid sowing during >20mm downpours to prevent seed coat splitting.`
        : `Plant in contour-aligned beds across ${farm.soilType} (${farm.altitude}m ASL) on ${firstOptimalDate} to leverage ${metrics.soilMoistureProjectedPct}% projected soil moisture.`,
      seedbedAndDepthRw: isLegume
        ? `Tera imbuto kuri 3–4 cm mu butaka bwa ${farm.soilType} (40 cm × 10 cm cyangwa 50 cm × 20 cm ufite imiganda ya 2.2m kuri ${farm.altitude}m). Irinde gutera mu mvura irenga 20mm.`
        : `Tera ku mirongo ihuza n'imiterere y'ubutaka bwa ${farm.soilType} (${farm.altitude}m) kuri ${firstOptimalDate}.`,
      basalFertilizerTimingEn: `Apply 50–80 kg/ha DAP (18-46-0) + Rhizobium bio-inoculant at sowing on ${firstOptimalDate} in ${farm.agroZone} to stimulate root nodulation.`,
      basalFertilizerTimingRw: `Shyiramo 50–80 kg/ha za DAP (18-46-0) + Rhizobium mu gihe cyo gutera kuri ${firstOptimalDate} muri ${farm.agroZone}.`,
      weatherRationaleEn: `${farm.agroZone} 7-day forecast (${metrics.cumulativeRain7dMm}mm rain, ${metrics.meanTempC}°C mean temp, ${metrics.soilMoistureProjectedPct}% projected moisture) supports uniform cotyledon emergence within 5–6 days.`,
      weatherRationaleRw: `Iteganyagihe ry'iminsi 7 muri ${farm.agroZone} (${metrics.cumulativeRain7dMm}mm, ${metrics.meanTempC}°C, ${metrics.soilMoistureProjectedPct}% ubuhehere) rifasha imbuto kumera mu minsi 5–6.`,
    };
  });
};

/**
 * Selects the best low-rain, low-wind spray/intervention day from the 7-day forecast
 */
const selectOptimalSprayDay = (
  forecastDays: DailyWeatherForecast[]
): DailyWeatherForecast => {
  const sorted = [...forecastDays].sort((a, b) => {
    // Prefer rainMm <= 4 and moderate humidity
    const scoreA = a.rainMm * 3 + (a.tempMax > 30 ? 15 : 0);
    const scoreB = b.rainMm * 3 + (b.tempMax > 30 ? 15 : 0);
    return scoreA - scoreB;
  });
  return sorted[0] || forecastDays[0];
};

/**
 * Evaluates agroZone-specific pest and disease risks from the 7-day weather forecast
 */
const buildAgroZonePestRiskAssessments = (
  farm: Farm,
  agroZoneId: AgroZoneId,
  metrics: AgroZoneWeatherMetrics,
  forecastDays: DailyWeatherForecast[]
): AgroZonePestRiskAssessment[] => {
  const bestSprayDay = selectOptimalSprayDay(forecastDays);
  const sprayDateIso =
    bestSprayDay?.date || new Date().toISOString().split("T")[0];

  if (agroZoneId === "birunga_volcanic") {
    // 1. Late Blight (Phytophthora infestans)
    const blightScore = Math.min(
      98,
      Math.max(
        25,
        Math.round(
          (metrics.avgHumidityPct - 55) * 1.4 +
            metrics.rainyDaysCount * 7 +
            (metrics.avgMaxTempC <= 21 && metrics.avgMinTempC >= 10 ? 22 : 8)
        )
      )
    );
    const blightLevel: AgroZonePestRiskAssessment["riskLevel"] =
      blightScore >= 80
        ? "critical"
        : blightScore >= 62
          ? "high"
          : blightScore >= 42
            ? "moderate"
            : "low";

    // 2. Bean Anthracnose & Angular Leaf Spot
    const anthracnoseScore = Math.min(
      94,
      Math.max(
        22,
        Math.round(
          (metrics.peakHumidityPct - 60) * 1.2 +
            (metrics.cumulativeRain7dMm >= 30 ? 26 : 12)
        )
      )
    );
    const anthracnoseLevel: AgroZonePestRiskAssessment["riskLevel"] =
      anthracnoseScore >= 78
        ? "critical"
        : anthracnoseScore >= 58
          ? "high"
          : "moderate";

    // 3. Potato Aphids & Cutworms (vector risk rises if drier/warmer)
    const aphidScore = Math.min(
      88,
      Math.max(
        20,
        Math.round(
          (metrics.avgMaxTempC - 14) * 4.2 +
            (metrics.rainyDaysCount <= 2 ? 28 : 10)
        )
      )
    );
    const aphidLevel: AgroZonePestRiskAssessment["riskLevel"] =
      aphidScore >= 70 ? "high" : aphidScore >= 45 ? "moderate" : "low";

    return [
      {
        id: `${farm.id}-pest-late-blight`,
        pestOrDiseaseNameEn: "Potato Late Blight (Imvune y'Ibirayi)",
        pestOrDiseaseNameRw: "Imvune y'Ibirayi (Phytophthora infestans)",
        scientificName: "Phytophthora infestans",
        pestType: "fungal_pathogen",
        targetCrop: "Ibirayi (Irish Potatoes)",
        riskLevel: blightLevel,
        riskScore: blightScore,
        weatherTriggerSummaryEn: `Forecasted ${metrics.avgHumidityPct}% avg RH (peak ${metrics.peakHumidityPct}%), ${metrics.cumulativeRain7dMm}mm rain over ${metrics.rainyDaysCount} days, and ${metrics.avgMaxTempC}°C/${metrics.avgMinTempC}°C at ${farm.altitude}m ASL generate ~${metrics.estimatedLeafWetnessHoursPerDay}h/day leaf wetness — prime for sporangia infection.`,
        weatherTriggerSummaryRw: `Ubuhehere bwa ${metrics.avgHumidityPct}% (bukabije ${metrics.peakHumidityPct}%), imvura ya ${metrics.cumulativeRain7dMm}mm mu minsi ${metrics.rainyDaysCount}, n'ubushyuhe bwa ${metrics.avgMaxTempC}°C/${metrics.avgMinTempC}°C kuri ${farm.altitude}m bitera ubuhehere ku mababi bwa ${metrics.estimatedLeafWetnessHoursPerDay}h/umunsi.`,
        favorableConditionsLabel: `RH > 80% • Temp 12–20°C • Leaf Wetness ${metrics.estimatedLeafWetnessHoursPerDay}h/d`,
        scoutingProtocolEn: `Inspect lower canopy leaves and stems along valley bottoms and windward volcanic slopes every 48h for water-soaked dark brown lesions with white underside sporulation rings at dawn.`,
        scoutingProtocolRw: `igenzure amababi yo hasi n'ibishishwa by'ibirayi buri masaha 48 urebe ibizinga by'ikigina bijimye n'uruhumbu rwera munsi y'ikibabi mu gitondo.`,
        ipmCulturalControlEn: `Hill up soil 20–25cm high around stems to shield tubers from washed-down zoospores; destroy volunteer potato plants and Rogue infected haulms into covered pits.`,
        ipmCulturalControlRw: `Sukira ibirayi ku buhagarike bwa 20–25cm kugira ngo urinde ibijumba; randura ibirayi byimeze kandi utwike cyangwa uhambire ibyafashwe.`,
        rabRecommendedTreatmentEn: `Alternate systemic Ridomil Gold MZ 68WG (Mefenoxam + Mancozeb, 50g/20L knapsack) with contact Mancozeb 80WP + 15mL sticker adjuvant so spray resists highland wash-off.`,
        rabRecommendedTreatmentRw: `Simburanya Ridomil Gold MZ 68WG (50g/20L) na Mancozeb 80WP + 15mL kole ifasha umuti gufata ku mababi mu gihe cy'imvura yo mu Birunga.`,
        optimalSprayDateIso: sprayDateIso,
        optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 06:00–08:30 Morning Shift (${bestSprayDay.rainMm}mm rain forecast)`,
        optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 06:00–08:30 Mu Gitondo (imvura: ${bestSprayDay.rainMm}mm)`,
        recommendedShiftWindow: "early_morning",
      },
      {
        id: `${farm.id}-pest-bean-anthracnose`,
        pestOrDiseaseNameEn: "Climbing Bean Anthracnose (Amakara y'Ibishyimbo)",
        pestOrDiseaseNameRw: "Indwara y'Amakara ku Bishyimbo",
        scientificName: "Colletotrichum lindemuthianum",
        pestType: "fungal_pathogen",
        targetCrop: "Ibishyimbo (Climbing Beans)",
        riskLevel: anthracnoseLevel,
        riskScore: anthracnoseScore,
        weatherTriggerSummaryEn: `Highland mist and ${metrics.cumulativeRain7dMm}mm rain splash across ${farm.agroZone} (${metrics.avgMinTempC}°C–${metrics.avgMaxTempC}°C) accelerate conidial spread along climbing bean vines.`,
        weatherTriggerSummaryRw: `Igihu cyo mu misozi miremire n'imvura ya ${metrics.cumulativeRain7dMm}mm muri ${farm.agroZone} bikwirakwiza udukoko tw'amakara ku bishyimbo bishingirirwa.`,
        favorableConditionsLabel: `Rain Splash • Cool Mist 13–21°C • RH ${metrics.avgHumidityPct}%`,
        scoutingProtocolEn: `Check underside leaf veins, petioles, and young pods for sunken brick-red to black lesions; never walk through wet bean plots before foliage dries at 09:30.`,
        scoutingProtocolRw: `Reba imitsi yo munsi y'amababi n'imisogwe mito niba hariho utuzinga tw'umukara; wirinde kugenda mu murima w'ibishyimbo bikiri bitose mbere ya saa 09:30.`,
        ipmCulturalControlEn: `Stake climbing beans early with 2.2m vertical poles at 50cm row spacing to maximize airflow and accelerate morning canopy drying.`,
        ipmCulturalControlRw: `Shingirira ibishyimbo hakiri kare ukoresheje imiganda ya 2.2m kugira ngo umuyaga winjiremo kandi amababi yumuke vuba.`,
        rabRecommendedTreatmentEn: `Seed-dress before planting with Thiram/Carbendazim; spray Copper Oxychloride (40g/20L) or Azoxystrobin if vein lesions exceed 5% incidence.`,
        rabRecommendedTreatmentRw: `Vanga imbuto n'umuti mbere yo gutera; tera Copper Oxychloride (40g/20L) niba ibimenyetso birenze 5% mu murima.`,
        optimalSprayDateIso: sprayDateIso,
        optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 08:00–10:00 Mid-Morning Shift`,
        optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 08:00–10:00 Mu Gitondo`,
        recommendedShiftWindow: "mid_morning",
      },
      {
        id: `${farm.id}-pest-aphids-cutworm`,
        pestOrDiseaseNameEn: "Seed Potato Aphids & Black Cutworm (inda z'ibirayi)",
        pestOrDiseaseNameRw: "Inda z'Ibirayi na Sikoropiyo y'Imizi",
        scientificName: "Myzus persicae / Agrotis ipsilon",
        pestType: "insect_pest",
        targetCrop: "Ibirayi (Seed & Ware Potatoes)",
        riskLevel: aphidLevel,
        riskScore: aphidScore,
        weatherTriggerSummaryEn: `Intermittent dry/warm breaks (${metrics.avgMaxTempC}°C) between highland rains trigger winged aphid flights that transmit Potato Leafroll Virus (PLRV).`,
        weatherTriggerSummaryRw: `Ibihe by'izuba (${metrics.avgMaxTempC}°C) hagati y'imvura bituma inda z'ibirayi ziguruka zikanduza virusi ya PLRV.`,
        favorableConditionsLabel: `Warm Breaks >18°C • Emergent Shoots`,
        scoutingProtocolEn: `Place yellow water pan traps at canopy height and inspect 50 compound leaves per hectare for wingless green peach aphids.`,
        scoutingProtocolRw: `Shyira imitego y'umuhondo mu murima kandi ugenzure amababi 50 kuri hegitari urebe inda z'icyatsi.`,
        ipmCulturalControlEn: `Maintain weed-free field borders (remove wild Solanum & brassica hosts) and hill soil firmly over emerging stolons.`,
        ipmCulturalControlRw: `Kuraho ibyatsi bibi ku nkengero z'umurima kandi usukire neza ku mizi.`,
        rabRecommendedTreatmentEn: `Apply Neem oil botanical extract (Azadirachtin 0.15% EC at 40mL/20L) or Imidacloprid only if threshold exceeds 5 aphids per 100 leaves.`,
        rabRecommendedTreatmentRw: `Tera amavuta ya Neem (Azadirachtin 40mL/20L) cyangwa Imidacloprid igihe inda zirenze 5 ku mababi 100.`,
        optimalSprayDateIso: sprayDateIso,
        optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 16:00–18:00 Late Afternoon Shift`,
        optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 16:00–18:00 Nimugoroba`,
        recommendedShiftWindow: "late_afternoon",
      },
    ];
  }

  if (agroZoneId === "eastern_savanna") {
    // 1. Fall Armyworm (Spodoptera frugiperda)
    const fawScore = Math.min(
      98,
      Math.max(
        30,
        Math.round(
          (metrics.avgMaxTempC - 21) * 5.2 +
            (70 - metrics.avgHumidityPct) * 0.8 +
            (metrics.cumulativeRain7dMm < 20 ? 18 : 4)
        )
      )
    );
    const fawLevel: AgroZonePestRiskAssessment["riskLevel"] =
      fawScore >= 80
        ? "critical"
        : fawScore >= 62
          ? "high"
          : fawScore >= 42
            ? "moderate"
            : "low";

    // 2. Maize Stalk Borer & Aphid MLND Vectors
    const borerScore = Math.min(
      92,
      Math.max(
        28,
        Math.round((metrics.meanTempC - 16) * 5.0 + metrics.rainyDaysCount * 4)
      )
    );
    const borerLevel: AgroZonePestRiskAssessment["riskLevel"] =
      borerScore >= 75 ? "high" : borerScore >= 50 ? "moderate" : "low";

    // 3. Soybean Red Spider Mites / Rust
    const miteScore = Math.min(
      94,
      Math.max(
        25,
        Math.round(
          (metrics.avgMaxTempC - 22) * 5.5 +
            (metrics.avgHumidityPct < 55 ? 24 : 8)
        )
      )
    );
    const miteLevel: AgroZonePestRiskAssessment["riskLevel"] =
      miteScore >= 78
        ? "critical"
        : miteScore >= 58
          ? "high"
          : "moderate";

    return [
      {
        id: `${farm.id}-pest-faw`,
        pestOrDiseaseNameEn: "Fall Armyworm (Nkongwa y'Ibigori)",
        pestOrDiseaseNameRw: "Nkongwa y'Ibigori (Spodoptera frugiperda)",
        scientificName: "Spodoptera frugiperda",
        pestType: "insect_pest",
        targetCrop: "Ibigori (Maize)",
        riskLevel: fawLevel,
        riskScore: fawScore,
        weatherTriggerSummaryEn: `Savanna daytime highs of ${metrics.avgMaxTempC}°C, ${metrics.avgHumidityPct}% RH, and only ${metrics.cumulativeRain7dMm}mm rain over 7 days in ${farm.agroZone} accelerate egg hatching to 48–72h and prevent rain-wash mortality of neonate larvae.`,
        weatherTriggerSummaryRw: `Ubushyuhe bwa ${metrics.avgMaxTempC}°C, ubuhehere bwa ${metrics.avgHumidityPct}% RH, n'imvura nke ya ${metrics.cumulativeRain7dMm}mm muri ${farm.agroZone} bituma amagi ya Nkongwa aturika mu masaha 48–72.`,
        favorableConditionsLabel: `Temp ${metrics.avgMaxTempC}°C • Low Rain ${metrics.cumulativeRain7dMm}mm • ${metrics.growingDegreeDays7d} GDD`,
        scoutingProtocolEn: `Walk a "W" pattern across the parcel twice weekly at 06:30; inspect 20 consecutive maize whorls at 5 stations for papery windowpane leaf feeding, fresh frass plugs, and pale egg masses.`,
        scoutingProtocolRw: `Genda mu murima mu ishusho ya "W" kabiri mu cyumweru saa 06:30; genzura imitima y'ibigori 20 kuri sitasiyo 5 urebe utwenge ku mababi n'amagi ya Nkongwa.`,
        ipmCulturalControlEn: `Intercrop maize with Desmodium + border Napier grass (Push-Pull technology), hand-crush egg masses during early scouting, and apply wood ash/fine sand mixed with chili into infested whorls.`,
        ipmCulturalControlRw: `Teranya ibigori na Desmodium + urubingo ku nkengero (Push-Pull), fyonda amagi ukoresheje intoki, kandi ushyire ivu rivanze n'urusenda mu mutima w'ikigori.`,
        rabRecommendedTreatmentEn: `Direct nozzle spray into the whorl with Emamectin benzoate 5% SG (10g/20L) or Spinetoram / Bacillus thuringiensis (Bt) when >=10% of plants show fresh whorl damage.`,
        rabRecommendedTreatmentRw: `Tera umuti mu mutima w'ikigori ukoresheje Emamectin benzoate 5% SG (10g/20L) cyangwa Spinetoram / Bt igihe ibigori >=10% byagaragaje ibimenyetso.`,
        optimalSprayDateIso: sprayDateIso,
        optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 06:00–08:00 Dawn Shift or 16:30–18:00 Dusk (when larvae feed actively)`,
        optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 06:00–08:00 Mu Gitondo cyangwa 16:30–18:00 Nimugoroba`,
        recommendedShiftWindow: "early_morning",
      },
      {
        id: `${farm.id}-pest-spider-mites`,
        pestOrDiseaseNameEn: "Soybean Red Spider Mite & Leaf Webbing (Utugonyi twa Soya)",
        pestOrDiseaseNameRw: "Utugonyi Dutukura twa Soya (Tetranychus urticae)",
        scientificName: "Tetranychus urticae",
        pestType: "insect_pest",
        targetCrop: "Soya (Soybeans)",
        riskLevel: miteLevel,
        riskScore: miteScore,
        weatherTriggerSummaryEn: `Hot, dry savanna air (${metrics.avgMaxTempC}°C, ${metrics.avgHumidityPct}% RH) in ${farm.agroZone} shortens spider mite generation cycles to 6 days on moisture-stressed soybean foliage.`,
        weatherTriggerSummaryRw: `Umwuka ushyushye kandi wumye (${metrics.avgMaxTempC}°C, ${metrics.avgHumidityPct}% RH) muri ${farm.agroZone} utuma utugonyi twiyororoka mu minsi 6 ku mababi ya soya.`,
        favorableConditionsLabel: `Hot & Dry >29°C • RH ${metrics.avgHumidityPct}%`,
        scoutingProtocolEn: `Use a 10× hand lens to inspect the underside of lower and middle trifoliate soybean leaves along dusty field edges for yellow stippling and fine silk webbing.`,
        scoutingProtocolRw: `Reba munsi y'amababi ya soya yo hasi no hagati ku nkengero z'umurima niba hariho utudomo tw'umuhondo n'urubobi rw'utugonyi.`,
        ipmCulturalControlEn: `Maintain furrow irrigation/mulch to reduce plant water stress and avoid broad-spectrum pyrethroids that kill predatory phytoseiid mites.`,
        ipmCulturalControlRw: `Uhira kandi usasire soya kugira ngo igabanye umwuma, wirinde imiti yica udukoko tw'ingirakamaro.`,
        rabRecommendedTreatmentEn: `Spot-spray affected field margins with Abamectin 1.8% EC (15mL/20L) or Sulfur 80% WP in the cool morning hours.`,
        rabRecommendedTreatmentRw: `Tera Abamectin 1.8% EC (15mL/20L) cyangwa Sulfur 80% WP ku nkengero zafashwe mu masaha ya mu gitondo.`,
        optimalSprayDateIso: sprayDateIso,
        optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 06:00–08:00 Morning Shift (avoid >28°C phytotoxicity)`,
        optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 06:00–08:00 Mu Gitondo (irinde izuba ryinshi)`,
        recommendedShiftWindow: "early_morning",
      },
      {
        id: `${farm.id}-pest-stalk-borer`,
        pestOrDiseaseNameEn: "Maize Stalk Borer & MLND Vectors ( Nkongwa y'Igihimba)",
        pestOrDiseaseNameRw: "Udukoko duca Igihimba cy'Ibigori (Busseola fusca)",
        scientificName: "Busseola fusca / Rhopalosiphum maidis",
        pestType: "insect_pest",
        targetCrop: "Ibigori (Maize)",
        riskLevel: borerLevel,
        riskScore: borerScore,
        weatherTriggerSummaryEn: `Warm nights (${metrics.avgMinTempC}°C) and ${metrics.cumulativeRain7dMm}mm showers stimulate moth emergence from crop residues in ${farm.agroZone}.`,
        weatherTriggerSummaryRw: `Ijoro rishyushye (${metrics.avgMinTempC}°C) n'imvura ya ${metrics.cumulativeRain7dMm}mm bituma ibinyugunyugu bitera amagi biva mu bisigazwa by'ibihingwa.`,
        favorableConditionsLabel: `Night Temp ${metrics.avgMinTempC}°C • Early Vegetative Stage`,
        scoutingProtocolEn: `Check young maize stems and whorls at 14–28 days after emergence for pin-hole leaf rows and dead-heart symptoms.`,
        scoutingProtocolRw: `Genzura ibigori bifite iminsi 14–28 bimeze urebe utwenge tutondekanye ku mababi no kuma k'umutima.`,
        ipmCulturalControlEn: `Compost or deeply incorporate previous season maize stover and practice 1-season legume crop rotation with soybeans.`,
        ipmCulturalControlRw: `Simburanya ibigori na soya kandi ukureho ibisigazwa by'ibigori byo mu gihembwe cyashize.`,
        rabRecommendedTreatmentEn: `Apply Beauveria bassiana biological granules or Beta-cypermethrin into the funnel before larvae bore into the stalk.`,
        rabRecommendedTreatmentRw: `Shyira Beauveria bassiana cyangwa Beta-cypermethrin mu mutima w'ikigori mbere y'uko urunyo rwinjira mu gihimba.`,
        optimalSprayDateIso: sprayDateIso,
        optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 16:00–18:00 Late Afternoon Shift`,
        optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 16:00–18:00 Nimugoroba`,
        recommendedShiftWindow: "late_afternoon",
      },
    ];
  }

  // Central Plateau / Kivu Borders / Congo-Nile Crest (Huye / Maraba Coffee & Banana Estate)
  const cbdScore = Math.min(
    96,
    Math.max(
      28,
      Math.round(
        (metrics.avgHumidityPct - 52) * 1.35 +
          metrics.rainyDaysCount * 7 +
          (metrics.meanTempC >= 15 && metrics.meanTempC <= 23 ? 20 : 8)
      )
    )
  );
  const cbdLevel: AgroZonePestRiskAssessment["riskLevel"] =
    cbdScore >= 78
      ? "critical"
      : cbdScore >= 60
        ? "high"
        : cbdScore >= 40
          ? "moderate"
          : "low";

  const antestiaScore = Math.min(
    92,
    Math.max(
      32,
      Math.round((metrics.avgMaxTempC - 16) * 5.0 + metrics.avgHumidityPct * 0.35)
    )
  );
  const antestiaLevel: AgroZonePestRiskAssessment["riskLevel"] =
    antestiaScore >= 75 ? "high" : antestiaScore >= 52 ? "moderate" : "low";

  const bxwScore = Math.min(
    90,
    Math.max(
      26,
      Math.round(metrics.rainyDaysCount * 9 + metrics.avgHumidityPct * 0.45)
    )
  );
  const bxwLevel: AgroZonePestRiskAssessment["riskLevel"] =
    bxwScore >= 74 ? "high" : bxwScore >= 48 ? "moderate" : "low";

  return [
    {
      id: `${farm.id}-pest-cbd`,
      pestOrDiseaseNameEn: "Coffee Berry Disease & Leaf Rust (Indwara y'Imbuto z'Ikawa)",
      pestOrDiseaseNameRw: "Indwara y'Imbuto z'Ikawa n'Umugese (Colletotrichum kahawae)",
      scientificName: "Colletotrichum kahawae / Hemileia vastatrix",
      pestType: "fungal_pathogen",
      targetCrop: "Ikawa (Specialty Arabica Coffee)",
      riskLevel: cbdLevel,
      riskScore: cbdScore,
      weatherTriggerSummaryEn: `Plateau humidity (${metrics.avgHumidityPct}% avg, ${metrics.peakHumidityPct}% peak), ${metrics.cumulativeRain7dMm}mm rainfall across ${metrics.rainyDaysCount} days, and ${metrics.meanTempC}°C mean temperature at ${farm.altitude}m ASL sustain ${metrics.estimatedLeafWetnessHoursPerDay}h/day berry wetness.`,
      weatherTriggerSummaryRw: `Ubuhehere bwa ${metrics.avgHumidityPct}% (bukabije ${metrics.peakHumidityPct}%), imvura ya ${metrics.cumulativeRain7dMm}mm mu minsi ${metrics.rainyDaysCount}, n'ubushyuhe bwa ${metrics.meanTempC}°C kuri ${farm.altitude}m bituma imbuto z'ikawa zihorana ubuhehere (${metrics.estimatedLeafWetnessHoursPerDay}h/umunsi).`,
      favorableConditionsLabel: `RH ${metrics.avgHumidityPct}% • Temp 15–23°C • Wet Berries`,
      scoutingProtocolEn: `Inspect expanding pinhead and green cherry clusters on 30 trees per block for dark sunken lesions and premature black mummified berries, plus orange powdery rust pustules under leaves.`,
      scoutingProtocolRw: `Genzura amaseri y'ikawa ikiri icyatsi ku biti 30 muri buri gice urebe ibizinga by'umukara birebamo imbere n'umugese w'icunga munsi y'amababi.`,
      ipmCulturalControlEn: `Perform open-center canopy pruning and de-suckering to lower internal tree humidity below 70%; strip and bury all mummified carryover berries.`,
      ipmCulturalControlRw: `Konorera ikawa hagati mu giti kugira ngo umuyaga n'urumuri byinjiremo bigabanye ubuhehere; kuraho imbuto zumye zose uzitabe.`,
      rabRecommendedTreatmentEn: `Apply Copper Oxychloride 50% WP (70g/20L) or Copper Hydroxide protective spray before afternoon rain showers coat developing berries.`,
      rabRecommendedTreatmentRw: `Tera Copper Oxychloride 50% WP (70g/20L) mbere y'uko imvura ya nimugoroba igwa ku mbuto z'ikawa zikiri nto.`,
      optimalSprayDateIso: sprayDateIso,
      optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 06:30–09:00 Morning Shift (${bestSprayDay.rainMm}mm rain forecast)`,
      optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 06:30–09:00 Mu Gitondo (imvura: ${bestSprayDay.rainMm}mm)`,
      recommendedShiftWindow: "early_morning",
    },
    {
      id: `${farm.id}-pest-antestia`,
      pestOrDiseaseNameEn: "Antestia Coffee Bug — Potato Taste Defect Vector (Agasimba k'Ikawa)",
      pestOrDiseaseNameRw: "Agasimba k'Ikawa Gatera Impumuro y'Ibirayi (Antestiopsis orbitalis)",
      scientificName: "Antestiopsis orbitalis",
      pestType: "insect_pest",
      targetCrop: "Ikawa (Specialty Arabica Coffee)",
      riskLevel: antestiaLevel,
      riskScore: antestiaScore,
      weatherTriggerSummaryEn: `Warm daytime temperatures (${metrics.avgMaxTempC}°C) in dense ${farm.agroZone} coffee canopies favor Antestia nymph feeding on green cherries, introducing Pantoea bacteria (Potato Taste Defect).`,
      weatherTriggerSummaryRw: `Ubushyuhe bwa ${metrics.avgMaxTempC}°C mu biti by'ikawa bitoshye muri ${farm.agroZone} bufasha udusimba twa Antestia konona imbuto bikazana impumuro y'ibirayi mu ikawa.`,
      favorableConditionsLabel: `Canopy Temp 20–25°C • Dense Foliage`,
      scoutingProtocolEn: `Beat branches over a white cloth on 20 trees per hectare at 07:00; action threshold in Rwanda specialty coffee zones is >=1–2 Antestia bugs per tree.`,
      scoutingProtocolRw: `Koma amashami y'ikawa hejuru y'igitambaro cyera ku biti 30 kuri hegitari saa 07:00; ingamba zifatwa iyo habonetse agasimba >=1–2 ku giti.`,
      ipmCulturalControlEn: `Keep coffee bushes pruned to single/double stem open architecture; harvest ripe cherries promptly every 7 days.`,
      ipmCulturalControlRw: `Konorera ikawa neza kandi usarure ikawa yahiye buri minsi 7 udategereje.`,
      rabRecommendedTreatmentEn: `Spot-apply Pyrethrum botanical extract (Pyrethrins 25mL/20L) or NAEB-approved Fastac when threshold >=1 bug/tree is reached.`,
      rabRecommendedTreatmentRw: `Tera umuti ukomoka ku birabyo bya Pyrethrum (25mL/20L) cyangwa Fastac yemejwe na NAEB ku biti byagaragayeho Antestia.`,
      optimalSprayDateIso: sprayDateIso,
      optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 06:00–08:00 Early Morning (when bugs are sluggish)`,
      optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 06:00–08:00 Mu Gitondo Cya Kare`,
      recommendedShiftWindow: "early_morning",
    },
    {
      id: `${farm.id}-pest-bxw-sigatoka`,
      pestOrDiseaseNameEn: "Banana Xanthomonas Wilt & Yellow Sigatoka (Kirabiranya n'Umugese w'Urutoki)",
      pestOrDiseaseNameRw: "Kirabiranya n'Indwara y'Amababi y'Urutoki",
      scientificName: "Xanthomonas campestris pv. musacearum / Mycosphaerella musicola",
      pestType: "bacterial_viral",
      targetCrop: "Urutoki (Bananas)",
      riskLevel: bxwLevel,
      riskScore: bxwScore,
      weatherTriggerSummaryEn: `Humid plateau showers (${metrics.cumulativeRain7dMm}mm over ${metrics.rainyDaysCount} days) increase insect visits to male banana buds and fungal spore germination on lower leaves.`,
      weatherTriggerSummaryRw: `Imvura n'ubuhehere (${metrics.cumulativeRain7dMm}mm mu minsi ${metrics.rainyDaysCount}) byongera udukoko tugenderera imisumba y'insina bikwirakwiza Kirabiranya.`,
      favorableConditionsLabel: `Wet Days ${metrics.rainyDaysCount}/7 • RH ${metrics.avgHumidityPct}%`,
      scoutingProtocolEn: `Check banana mats weekly for premature yellowing of upper leaves, bacterial ooze in pseudostems, and premature ripening of fingers.`,
      scoutingProtocolRw: `Genzura insina buri cyumweru urebe niba amababi yo hejuru ahinduka umuhondo imburagihe cyangwa igitoki kikaba umuhondo kitarakomera.`,
      ipmCulturalControlEn: `Break off male buds (de-budding) with a forked wooden stick immediately after the last female hand forms; flame-sterilize machetes or disinfect with Jik (Sodium hypochlorite 1:5) between mats.`,
      ipmCulturalControlRw: `Kura umusumba ku gitoki ukoresheje igiti gifite amahwa akimara guheta; sukura umupanga n'umuriro cyangwa Jik mbere yo kujya ku yindi nsina.`,
      rabRecommendedTreatmentEn: `Sanitary de-leafing of Sigatoka-spotted lower leaves + strict single-stem uprooting of any BXW-positive mat per RAB protocol.`,
      rabRecommendedTreatmentRw: `Kuraho amababi yo hasi yafashwe na Sigatoka kandi urandure insina yose yagaragaje Kirabiranya ukurikije amabwiriza ya RAB.`,
      optimalSprayDateIso: sprayDateIso,
      optimalSprayWindowLabelEn: `${sprayDateIso} (${bestSprayDay.dayNameEn}) • 08:00–10:00 Dry Canopy Sanitation Window`,
      optimalSprayWindowLabelRw: `${sprayDateIso} (${bestSprayDay.dayNameRw}) • 08:00–10:00 Mu Gitondo Amababi Yumutse`,
      recommendedShiftWindow: "mid_morning",
    },
  ];
};

/**
 * Generates the complete AgroZone Weather Forecast & Agronomic Analysis Report for a farm
 */
export const analyzeAgroZoneWeatherForFarm = (
  farm: Farm,
  plans: FarmPlan[] = [],
  scenarioId: AgroZoneWeatherScenarioId = "live_forecast",
  externalForecastDays?: DailyWeatherForecast[],
  dataSourceLabel = "Meteo Rwanda + AgroZone Telemetry"
): AgroZoneWeatherAnalysisReport => {
  const agroZoneId = classifyAgroZoneId(farm);
  const forecastDays = getCalibratedForecastForFarmAgroZone(
    farm,
    scenarioId,
    externalForecastDays
  );
  const metrics = computeAgroZoneWeatherMetrics(farm, forecastDays);
  const dailyPlantingTimeline = buildDailyPlantingTimeline(
    farm,
    agroZoneId,
    forecastDays
  );
  const cropPlantingRecommendations = buildCropPlantingRecommendations(
    farm,
    agroZoneId,
    metrics,
    dailyPlantingTimeline,
    plans
  );
  const pestRiskAssessments = buildAgroZonePestRiskAssessments(
    farm,
    agroZoneId,
    metrics,
    forecastDays
  );

  // AgroZone Profile metadata
  let elevationBandLabel = "1,500m – 1,900m ASL (Mid-Altitude)";
  let agroZoneCharacteristicsEn =
    "Bi-modal rainfall regime (1,150–1,300mm/yr), moderate temperatures (17–24°C), Humic Acrisol/Ferralsol hillsides requiring contour erosion control and organic matter replenishment.";
  let agroZoneCharacteristicsRw =
    "Imvura igwa mu bihe bibiri (1,150–1,300mm ku mwaka), ubushyuhe buringaniye (17–24°C), ubutaka bw'imisozi bukeneye amaterasi n'ifumbire y'imborera.";
  let rabSeasonWindowEn =
    "Season A: Sept 10 – Oct 15 • Season B: Feb 15 – Mar 20";
  let rabSeasonWindowRw =
    "Igihembwe A: 10 Nzeri – 15 Ukwakira • Igihembwe B: 15 Gashyantare – 20 Werurwe";

  if (agroZoneId === "birunga_volcanic") {
    elevationBandLabel = "1,950m – 2,600m ASL (Volcanic Highlands)";
    agroZoneCharacteristicsEn =
      "Cool, humid volcanic microclimate (1,400–1,800mm/yr), deep fertile Andosols (Urutare/inombe) with high water-holding capacity, frequent morning mist, and high late-blight pressure.";
    agroZoneCharacteristicsRw =
      "Ikirere gikonje kandi gifite ubuhehere bwinshi mu Birunga (1,400–1,800mm), ubutaka bw'amakoro bufumbire ariko bugira igihu cyinshi gitera imvune y'ibirayi.";
    rabSeasonWindowEn =
      "Season A: Sept 01 – Oct 10 • Season B: Feb 05 – Mar 10 (Highland Early Onset)";
    rabSeasonWindowRw =
      "Igihembwe A: 01 Nzeri – 10 Ukwakira • Igihembwe B: 05 Gashyantare – 10 Werurwe";
  } else if (agroZoneId === "eastern_savanna") {
    elevationBandLabel = "1,250m – 1,500m ASL (Eastern Lowland Savanna)";
    agroZoneCharacteristicsEn =
      "Warm semi-arid savanna microclimate (800–950mm/yr), high daytime evapotranspiration (28–33°C), shorter rain seasons requiring drought-tolerant hybrids, tied-ridging water harvesting, and early sowing on first onset rains.";
    agroZoneCharacteristicsRw =
      "Ikirere gishyushye cy'iburasirazuba (800–950mm ku mwaka), izuba ryinshi (28–33°C), gikeneye imbuto zihanganira izuba, kubika amazi mu mirama, no gutera ku mvura ya mbere.";
    rabSeasonWindowEn =
      "Season A: Sept 20 – Oct 25 (Onset Dependent) • Season B: Feb 20 – Mar 25";
    rabSeasonWindowRw =
      "Igihembwe A: 20 Nzeri – 25 Ukwakira • Igihembwe B: 20 Gashyantare – 25 Werurwe";
  }

  const optimalCount = dailyPlantingTimeline.filter(
    (d) => d.suitability === "optimal"
  ).length;
  const topPest = [...pestRiskAssessments].sort(
    (a, b) => b.riskScore - a.riskScore
  )[0];

  const overallPlantingVerdictEn =
    optimalCount >= 3
      ? `Favorable Planting Window (${optimalCount}/7 optimal days) in ${farm.agroZone}: ${metrics.cumulativeRain7dMm}mm rain & ${metrics.soilMoistureProjectedPct}% projected soil moisture.`
      : optimalCount >= 1
        ? `Selective Planting Window (${optimalCount}/7 optimal days) in ${farm.agroZone}: Time sowing closely with moisture slots and avoid storm/dry extremes.`
        : `Caution Planting Window in ${farm.agroZone}: Prioritize soil moisture conservation or drainage before seed placement.`;

  const overallPlantingVerdictRw =
    optimalCount >= 3
      ? `Igihe Cyiza cyo Gutera (iminsi ${optimalCount}/7 myiza) muri ${farm.agroZone}: Imvura ya ${metrics.cumulativeRain7dMm}mm n'ubuhehere bw'ubutaka bwa ${metrics.soilMoistureProjectedPct}%.`
      : optimalCount >= 1
        ? `Hitamo Umunsi Mwiza wo Gutera (iminsi ${optimalCount}/7) muri ${farm.agroZone}: Huza gutera n'iminsi ifite ubuhehere bukwiye.`
        : `Itonde mu Gutera muri ${farm.agroZone}: Banza utunganye imiferege cyangwa ubuhehere bw'ubutaka.`;

  const overallPestAlertHeadlineEn = topPest
    ? `${topPest.riskLevel.toUpperCase()} RISK (${topPest.riskScore}/100): ${topPest.pestOrDiseaseNameEn} on ${topPest.targetCrop} — Next spray/IPM window ${topPest.optimalSprayDateIso}`
    : `Low-to-Moderate Pest Pressure across ${farm.agroZone}`;

  const overallPestAlertHeadlineRw = topPest
    ? `IBYAGO BYO KU RWEGO RWO HEJURU (${topPest.riskScore}/100): ${topPest.pestOrDiseaseNameRw} kuri ${topPest.targetCrop} — Umunsi mwiza wo gutera umuti: ${topPest.optimalSprayDateIso}`
    : `Ibyago by'indwara n'ibyonyi biri hasi muri ${farm.agroZone}`;

  return {
    farmId: farm.id,
    farmName: farm.name,
    district: farm.district,
    sector: farm.sector,
    altitude: farm.altitude,
    agroZone: farm.agroZone,
    agroZoneId,
    elevationBandLabel,
    agroZoneCharacteristicsEn,
    agroZoneCharacteristicsRw,
    rabSeasonWindowEn,
    rabSeasonWindowRw,
    dataSourceLabel,
    fetchedAtIso: new Date().toISOString(),
    scenarioId,
    forecastDays,
    metrics,
    dailyPlantingTimeline,
    cropPlantingRecommendations,
    pestRiskAssessments,
    overallPlantingVerdictEn,
    overallPlantingVerdictRw,
    overallPestAlertHeadlineEn,
    overallPestAlertHeadlineRw,
  };
};

/**
 * Builds a structured FarmActivity payload from either a CropPlantingRecommendation
 * or an AgroZonePestRiskAssessment so farmers can one-click schedule it into their farm log.
 */
export const buildActivityFromPlantingRecommendation = (
  farm: Farm,
  rec: CropPlantingRecommendation
): Omit<FarmActivity, "id"> => {
  return {
    farmId: farm.id,
    farmName: farm.name,
    crop: rec.cropName,
    title: `[AgroZone Planting] ${rec.cropName} — ${rec.statusLabelEn} (${farm.agroZone})`,
    category: "planting" as ActivityCategory,
    dueDate: rec.recommendedDateIso,
    shiftWindow: "early_morning",
    status: "pending",
    assignedWorker: "Jean Bosco (Agronomist)",
    estimatedCost: 25000,
    notes: `${rec.seedbedAndDepthEn} | Basal Fertilizer: ${rec.basalFertilizerTimingEn} | Weather Rationale: ${rec.weatherRationaleEn}`,
    latitude: farm.latitude,
    longitude: farm.longitude,
  };
};

export const buildActivityFromPestAssessment = (
  farm: Farm,
  pest: AgroZonePestRiskAssessment
): Omit<FarmActivity, "id"> => {
  return {
    farmId: farm.id,
    farmName: farm.name,
    crop: pest.targetCrop,
    title: `[AgroZone IPM: ${pest.riskLevel.toUpperCase()}] ${pest.pestOrDiseaseNameEn} Control (${farm.agroZone})`,
    category: "pest_control" as ActivityCategory,
    dueDate: pest.optimalSprayDateIso,
    shiftWindow: pest.recommendedShiftWindow,
    status: "pending",
    assignedWorker: "Jean Bosco (Agronomist)",
    estimatedCost: 18500,
    notes: `Trigger: ${pest.weatherTriggerSummaryEn} | Scouting: ${pest.scoutingProtocolEn} | RAB Treatment: ${pest.rabRecommendedTreatmentEn} | Window: ${pest.optimalSprayWindowLabelEn}`,
    latitude: farm.latitude,
    longitude: farm.longitude,
  };
};

/**
 * Formats a detailed markdown briefing from an AgroZoneWeatherAnalysisReport
 * for direct injection into the AI Advisor chat stream or prompt context.
 */
export const formatAgroZoneAdvisoryMarkdown = (
  report: AgroZoneWeatherAnalysisReport,
  language: "rw" | "en"
): string => {
  const m = report.metrics;
  if (language === "rw") {
    const plantingLines = report.cropPlantingRecommendations
      .map(
        (c) =>
          `- **${c.cropName}** — *${c.statusLabelRw}* (Amanota: **${c.readinessScore}/100**)\n  - **Itariki Nziza yo Gutera:** ${c.bestPlantingDatesLabelRw}\n  - **Imbuto Zemejwe na RAB:** ${c.rabCertifiedVarieties.join(", ")}\n  - **Gutegura Umurima n'Ubujyakuzimu:** ${c.seedbedAndDepthRw}\n  - **Ifumbire y'Ibanze:** ${c.basalFertilizerTimingRw}\n  - **Impamvu y'Iteganyagihe:** ${c.weatherRationaleRw}`
      )
      .join("\n\n");

    const pestLines = report.pestRiskAssessments
      .map(
        (p) =>
          `- **${p.pestOrDiseaseNameRw}** (*${p.scientificName}*) kuri **${p.targetCrop}** — Urwego rw'Ibyago: **${p.riskLevel.toUpperCase()} (${p.riskScore}/100)**\n  - **Impamvu y'Ikirere muri ${report.agroZone}:** ${p.weatherTriggerSummaryRw}\n  - **Uko Bagenzura Umurima (Scouting):** ${p.scoutingProtocolRw}\n  - **Uburyo Kamere (IPM):** ${p.ipmCulturalControlRw}\n  - **Umuti Wemejwe na RAB:** ${p.rabRecommendedTreatmentRw}\n  - **Igihe Cyiza cyo Gutera Umuti:** ${p.optimalSprayWindowLabelRw}`
      )
      .join("\n\n");

    return `### 🌦️ Isesengura ry'Iteganyagihe rya AgroZone: **${report.agroZone}**\n**Umurima:** ${report.farmName} (${report.district} - ${report.sector}, **${report.altitude}m ASL**) • **Inkomoko:** ${report.dataSourceLabel}\n\n#### 1. Incamake y'Iteganyagihe ry'Iminsi 7 muri ${report.agroZone}\n- **Imvura Yose mu Minsi 7:** **${m.cumulativeRain7dMm} mm** (iminsi ${m.rainyDaysCount} y'imvura, umunsi ufite nyinshi: ${m.peakRainDayMm}mm kuri ${m.peakRainDayDate})\n- **Ubushyuhe Mpuzandengo:** **${m.avgMaxTempC}°C** (amanywa) / **${m.avgMinTempC}°C** (ijoro) • **GDD (Base 10°C):** ${m.growingDegreeDays7d} units\n- **Ubuhehere bw'Umwuka (RH):** **${m.avgHumidityPct}%** (bukabije **${m.peakHumidityPct}%**) • **Ubuhehere ku Mababi:** ~${m.estimatedLeafWetnessHoursPerDay} amasaha/umunsi\n- **Ubuhehere bw'Ubutaka Buteganyijwe:** **${m.soilMoistureProjectedPct}%** (Evapotranspiration: ${m.evapotranspiration7dMm}mm)\n\n---\n\n#### 2. 🌱 Inama Zihariye ku Gihe Cyo Gutera (Planting Time Advisory)\n> **Umwanzuro rusange:** ${report.overallPlantingVerdictRw}\n\n${plantingLines}\n\n---\n\n#### 3. 🛡️ Gukumira Ibyonyi n'Indwara hakurikijwe Ikirere cya ${report.agroZone} (Pest & Disease Risk Management)\n> **Integuza y'Ibyonyi:** ${report.overallPestAlertHeadlineRw}\n\n${pestLines}`;
  }

  const plantingLines = report.cropPlantingRecommendations
    .map(
      (c) =>
        `- **${c.cropName}** — *${c.statusLabelEn}* (Readiness Score: **${c.readinessScore}/100**)\n  - **Optimal Planting Window:** ${c.bestPlantingDatesLabelEn}\n  - **RAB-Certified Varieties:** ${c.rabCertifiedVarieties.join(", ")}\n  - **Seedbed & Planting Depth:** ${c.seedbedAndDepthEn}\n  - **Basal Fertilizer Timing:** ${c.basalFertilizerTimingEn}\n  - **Forecast Rationale:** ${c.weatherRationaleEn}`
    )
    .join("\n\n");

  const pestLines = report.pestRiskAssessments
    .map(
      (p) =>
        `- **${p.pestOrDiseaseNameEn}** (*${p.scientificName}*) on **${p.targetCrop}** — Risk Level: **${p.riskLevel.toUpperCase()} (${p.riskScore}/100)**\n  - **${report.agroZone} Weather Trigger:** ${p.weatherTriggerSummaryEn}\n  - **Field Scouting Protocol:** ${p.scoutingProtocolEn}\n  - **Cultural & Preventive IPM:** ${p.ipmCulturalControlEn}\n  - **RAB-Approved Intervention:** ${p.rabRecommendedTreatmentEn}\n  - **Optimal Low-Washout Spray Window:** ${p.optimalSprayWindowLabelEn}`
    )
    .join("\n\n");

  return `### 🌦️ AgroZone Weather & Agronomic Intelligence: **${report.agroZone}**\n**Parcel:** ${report.farmName} (${report.district} - ${report.sector}, **${report.altitude}m ASL**) • **Telemetry Source:** ${report.dataSourceLabel}\n\n#### 1. 7-Day AgroZone Microclimate Summary\n- **Cumulative 7-Day Rainfall:** **${m.cumulativeRain7dMm} mm** (${m.rainyDaysCount} wet days, peak ${m.peakRainDayMm}mm on ${m.peakRainDayDate})\n- **Thermal Regime:** **${m.avgMaxTempC}°C** avg high / **${m.avgMinTempC}°C** avg low • **7-Day GDD (Base 10°C):** ${m.growingDegreeDays7d} thermal units\n- **Relative Humidity & Canopy Wetness:** **${m.avgHumidityPct}%** avg (**${m.peakHumidityPct}%** peak) • **Leaf Wetness Duration:** ~${m.estimatedLeafWetnessHoursPerDay} hrs/day\n- **Projected Soil Moisture Balance:** **${m.soilMoistureProjectedPct}%** (7d ET₀ demand: ${m.evapotranspiration7dMm}mm)\n\n---\n\n#### 2. 🌱 Customized Planting Time Recommendations\n> **AgroZone Verdict:** ${report.overallPlantingVerdictEn}\n\n${plantingLines}\n\n---\n\n#### 3. 🛡️ Customized Pest & Disease Risk Management for ${report.agroZone}\n> **Epidemiological Alert:** ${report.overallPestAlertHeadlineEn}\n\n${pestLines}`;
};
