import {
  ActivityCategory,
  DailyWeatherForecast,
  Farm,
  FarmActivity,
  ShiftWindowId,
} from "../types";
import { getForecastForDistrict } from "../data/weatherForecastData";

export type AltitudeBandId =
  | "highland_volcanic" // > 2,000m (e.g. Musanze 2,240m)
  | "mid_altitude_plateau" // 1,500m - 2,000m (e.g. Huye 1,720m)
  | "lowland_savannah"; // < 1,500m (e.g. Nyagatare 1,380m)

export type WeatherTriggerType = "rain_forecast" | "heatwave_forecast";

export type WeatherSimulationScenario =
  | "live_meteo"
  | "highland_downpour"
  | "savannah_heatwave"
  | "dual_extreme";

export interface AltitudeBandProfile {
  bandId: AltitudeBandId;
  altitudeMeters: number;
  rangeLabel: string;
  nameRw: string;
  nameEn: string;
  rainThresholdMm: number;
  heatwaveThresholdC: number;
  topographicRiskRw: string;
  topographicRiskEn: string;
}

export interface AltitudeWeatherTaskSuggestion {
  id: string;
  farmId: string;
  farmName: string;
  district: string;
  sector: string;
  crop: string;
  altitudeMeters: number;
  altitudeBand: AltitudeBandProfile;
  triggerType: WeatherTriggerType;
  severity: "critical" | "high" | "moderate";
  forecastDate: string;
  forecastDayLabelRw: string;
  forecastDayLabelEn: string;
  predictedRainfallMm: number;
  popPct: number;
  predictedTempMaxC: number;
  humidityPct: number;
  windSpeedKmh: number;
  conditionRw: string;
  conditionEn: string;
  suggestedTitleRw: string;
  suggestedTitleEn: string;
  category: ActivityCategory;
  shiftWindow: ShiftWindowId;
  assignedTo: string;
  whyAltitudeMattersRw: string;
  whyAltitudeMattersEn: string;
  rabProtocolCode: string;
  activityPayload: Omit<FarmActivity, "id">;
  isAlreadyScheduled: boolean;
}

/**
 * Classifies a farm's altitude (in meters) into Rwanda's 3 primary agro-altitudinal zones
 * with altitude-adjusted meteorological thresholds for rain and heatwaves.
 */
export const classifyFarmAltitudeZone = (farm: Farm): AltitudeBandProfile => {
  const defaultAlt =
    farm.district === "Musanze"
      ? 2240
      : farm.district === "Nyagatare"
      ? 1380
      : farm.district === "Huye"
      ? 1720
      : 1750;
  const alt = farm.altitudeMeters || defaultAlt;

  if (alt >= 2000) {
    return {
      bandId: "highland_volcanic",
      altitudeMeters: alt,
      rangeLabel: "> 2,000m ASL",
      nameRw: `Imisozi Miremire y'Ibirunga (${alt}m)`,
      nameEn: `High-Altitude Volcanic Highlands (${alt}m)`,
      rainThresholdMm: 10, // Steep volcanic slopes erode & waterlog rapidly above 10mm
      heatwaveThresholdC: 25, // Above 2,000m, ≥25°C is a severe highland thermal anomaly
      topographicRiskRw:
        "Imisozi ihanamye (>2,000m) igira isuri yihuse n'urume (Late Blight) mu mvura, cyangwa kuma kw'amababi mu bushyuhe budasanzwe.",
      topographicRiskEn:
        "Steep volcanic slopes (>2,000m) experience rapid nutrient runoff and Late Blight in rain, or aphid surges during highland heat spikes.",
    };
  }

  if (alt >= 1500) {
    return {
      bandId: "mid_altitude_plateau",
      altitudeMeters: alt,
      rangeLabel: "1,500m – 2,000m ASL",
      nameRw: `Imisozi yo Hagati & Ibibaya (${alt}m)`,
      nameEn: `Mid-Altitude Central Plateau (${alt}m)`,
      rainThresholdMm: 10,
      heatwaveThresholdC: 27,
      topographicRiskRw:
        "Ubutaka bw'inombe mu bibaya (1,500–2,000m) burekamo amazi mu mvura bigatera ububore bw'imizi, cyangwa bugasaduka mu zuba ryinshi.",
      topographicRiskEn:
        "Clay-loam valley benches (1,500–2,000m) waterlog during ≥10mm showers causing collar rot, and crust rapidly above 27°C.",
    };
  }

  return {
    bandId: "lowland_savannah",
    altitudeMeters: alt,
    rangeLabel: "< 1,500m ASL",
    nameRw: `Ikibaya cy'Uburasirazuba (${alt}m)`,
    nameEn: `Low-Altitude Eastern Savannah (${alt}m)`,
    rainThresholdMm: 8, // Even 8mm in dry savannah is a critical moisture/Urea window
    heatwaveThresholdC: 29, // ≥29°C in <1,500m lowlands drives extreme evapotranspiration
    topographicRiskRw:
      "Mu bibaya byo hasi (<1,500m), ubushyuhe ≥29°C bwikuba kabiri gutakaza amazi (ET₀ > 5.4mm/umunsi), naho imvura ≥8mm ni amahirwe adasanzwe yo gufumbira.",
    topographicRiskEn:
      "In low-altitude plains (<1,500m), temperatures ≥29°C trigger severe evapotranspiration stress, while ≥8mm rain opens a prime nutrient uptake window.",
  };
};

const getOffsetIsoDate = (daysAhead: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Evaluates all farms against their district's 5-day forecast and specific altitude zone,
 * returning automated task suggestions when rain or heatwaves are predicted.
 */
export const evaluateAltitudeWeatherTaskSuggestions = (
  farms: Farm[],
  existingActivities: FarmActivity[],
  scenario: WeatherSimulationScenario = "live_meteo"
): AltitudeWeatherTaskSuggestion[] => {
  const suggestions: AltitudeWeatherTaskSuggestion[] = [];

  for (const farm of farms) {
    const altitudeBand = classifyFarmAltitudeZone(farm);
    const districtForecast = getForecastForDistrict(farm.district);
    const primaryCrop = farm.mainCrops?.[0] || "Ibirayi (Kinigi)";

    // Map forecast days onto dynamic upcoming dates (Day 0 = Today, Day 1 = +1d, etc.)
    const dailyForecasts: Array<DailyWeatherForecast & { dynamicDate: string; dayIndex: number }> =
      districtForecast.daily.map((day, idx) => {
        let rainfallMm = day.rainfallMm;
        let pop = day.pop;
        let tempMaxC = day.tempMaxC;
        let humidity = day.humidity;
        let conditionRw = day.conditionRw;
        let conditionEn = day.conditionEn;

        if (scenario === "highland_downpour" && idx <= 1) {
          rainfallMm = Math.max(rainfallMm, altitudeBand.bandId === "highland_volcanic" ? 28 : 22);
          pop = Math.max(pop, 90);
          humidity = Math.max(humidity, 89);
          conditionRw = "Imvura nyinshi y'inkubi n'isuri ku misozi";
          conditionEn = "Heavy mountain downpour & runoff alert";
        } else if (scenario === "savannah_heatwave" && idx <= 1) {
          tempMaxC =
            altitudeBand.bandId === "lowland_savannah"
              ? 34
              : altitudeBand.bandId === "mid_altitude_plateau"
              ? 30
              : 27;
          rainfallMm = 0;
          pop = 5;
          humidity = 38;
          conditionRw = "Ubushyuhe bukabije (Heatwave) n'umwuka wumye";
          conditionEn = "Severe heatwave spike & high evapotranspiration";
        } else if (scenario === "dual_extreme") {
          if (idx === 0) {
            rainfallMm = Math.max(rainfallMm, 26);
            pop = 92;
            humidity = 90;
            conditionRw = "Imvura nyinshi y'umurabyo";
            conditionEn = "Intense convective rainstorm";
          } else if (idx === 1) {
            tempMaxC =
              altitudeBand.bandId === "lowland_savannah"
                ? 34
                : altitudeBand.bandId === "mid_altitude_plateau"
                ? 30
                : 26;
            rainfallMm = 0;
            humidity = 40;
            conditionRw = "Ubushyuhe bwinshi nyuma y'imvura (Heatwave)";
            conditionEn = "Post-rain thermal heatwave spike";
          }
        }

        return {
          ...day,
          rainfallMm,
          pop,
          tempMaxC,
          humidity,
          conditionRw,
          conditionEn,
          dynamicDate: getOffsetIsoDate(idx),
          dayIndex: idx,
        };
      });

    // 1. Check for RAIN FORECAST triggers in this farm's altitude zone
    const peakRainDay = dailyForecasts.find(
      (d) =>
        d.rainfallMm >= altitudeBand.rainThresholdMm || d.pop >= 75
    );

    if (peakRainDay) {
      if (altitudeBand.bandId === "highland_volcanic") {
        // Suggestion A1: Highland Terrace & Anti-Erosion Drainage Maintenance
        const titleEn1 = `Highland Terrace Drainage & Furrow Clearing (${altitudeBand.altitudeMeters}m — ${peakRainDay.rainfallMm}mm Rain Forecast)`;
        const titleRw1 = `Gusibura Imiferege y'Amaterasi ku Misozi (${altitudeBand.altitudeMeters}m — Imvura ya ${peakRainDay.rainfallMm}mm)`;
        const id1 = `sug-rain-highland-drain-${farm.id}-${peakRainDay.dynamicDate}`;
        const already1 = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            a.dueDate === peakRainDay.dynamicDate &&
            (a.title.includes("Terrace Drainage") ||
              a.title.includes("Gusibura Imiferege"))
        );

        suggestions.push({
          id: id1,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "rain_forecast",
          severity: peakRainDay.rainfallMm >= 16 ? "critical" : "high",
          forecastDate: peakRainDay.dynamicDate,
          forecastDayLabelRw: peakRainDay.dayNameRw,
          forecastDayLabelEn: peakRainDay.dayNameEn,
          predictedRainfallMm: peakRainDay.rainfallMm,
          popPct: peakRainDay.pop,
          predictedTempMaxC: peakRainDay.tempMaxC,
          humidityPct: peakRainDay.humidity,
          windSpeedKmh: peakRainDay.windSpeedKmh,
          conditionRw: peakRainDay.conditionRw,
          conditionEn: peakRainDay.conditionEn,
          suggestedTitleRw: titleRw1,
          suggestedTitleEn: titleEn1,
          category: "land_prep",
          shiftWindow: "06:00-08:00",
          assignedTo: "Jean Baptiste & Abakozi 4 b'i Kinigi",
          whyAltitudeMattersRw: `Ku butumburuke bwa ${altitudeBand.altitudeMeters}m (${farm.sector}), imvura ya ${peakRainDay.rainfallMm}mm ihanamuka ku birunga itera isuri ikomeye n'amazi areka mu mirongo y'ibirayi niba amaterasi adasibuwe mbere y'uko imvura igwa.`,
          whyAltitudeMattersEn: `At ${altitudeBand.altitudeMeters}m altitude (${farm.sector} volcanic slopes), ${peakRainDay.rainfallMm}mm of forecasted rain accelerates downhill runoff and tuber rot unless contour cut-off drains are cleared ahead of the storm.`,
          rabProtocolCode: "RAB-HIGHLAND-EROSION-2200M",
          isAlreadyScheduled: already1,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn1,
            category: "land_prep",
            dueDate: peakRainDay.dynamicDate,
            status: "pending",
            shiftWindow: "06:00-08:00",
            assignedTo: "Jean Baptiste & Abakozi 4 b'i Kinigi",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Meteo Rwanda predicts ${peakRainDay.rainfallMm}mm rain (${peakRainDay.pop}% POP). Clear contour water traps and reinforce potato ridges before afternoon downpour.`,
          },
        });

        // Suggestion A2: Highland Pre-Rain Protective Late Blight Fungicide Spray (Scheduled on drier morning window)
        const drySprayDay =
          dailyForecasts.find((d) => d.rainfallMm <= 5 && d.dayIndex >= 0) ||
          peakRainDay;
        const titleEn2 = `Pre-Rain Late Blight (Urume) Systemic Spray — Ridomil Gold (${altitudeBand.altitudeMeters}m Highland Mist)`;
        const titleRw2 = `Gutera Umuti w'Urume (Ridomil Gold) Mbere y'Imvura n'Igihu (${altitudeBand.altitudeMeters}m)`;
        const id2 = `sug-rain-highland-blight-${farm.id}-${drySprayDay.dynamicDate}`;
        const already2 = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Pre-Rain Late Blight") ||
              a.title.includes("Gutera Umuti w'Urume"))
        );

        suggestions.push({
          id: id2,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "rain_forecast",
          severity: "high",
          forecastDate: drySprayDay.dynamicDate,
          forecastDayLabelRw: drySprayDay.dayNameRw,
          forecastDayLabelEn: drySprayDay.dayNameEn,
          predictedRainfallMm: peakRainDay.rainfallMm,
          popPct: peakRainDay.pop,
          predictedTempMaxC: peakRainDay.tempMaxC,
          humidityPct: peakRainDay.humidity,
          windSpeedKmh: peakRainDay.windSpeedKmh,
          conditionRw: peakRainDay.conditionRw,
          conditionEn: peakRainDay.conditionEn,
          suggestedTitleRw: titleRw2,
          suggestedTitleEn: titleEn2,
          category: "spraying",
          shiftWindow: "08:00-10:00",
          assignedTo: "Jean Baptiste (Knapsack Sprayer)",
          whyAltitudeMattersRw: `Mu misozi miremire (>2,000m), imvura ya ${peakRainDay.rainfallMm}mm n'ubuhehere bwa ${peakRainDay.humidity}% ku bushyuhe bwa ${peakRainDay.tempMaxC}°C bitera udukoko twa Phytophthora infestans (Urume) gukwirakwira mu masaha 24.`,
          whyAltitudeMattersEn: `Above 2,000m altitude, ${peakRainDay.rainfallMm}mm rain combined with ${peakRainDay.humidity}% relative humidity and cool ${peakRainDay.tempMaxC}°C air creates a critical Late Blight sporulation window.`,
          rabProtocolCode: "RAB-CIP-BLIGHT-HIGHLAND",
          isAlreadyScheduled: already2,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn2,
            category: "spraying",
            dueDate: drySprayDay.dynamicDate,
            status: "pending",
            shiftWindow: "08:00-10:00",
            assignedTo: "Jean Baptiste (Knapsack Sprayer)",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Apply systemic fungicide (Ridomil Gold MZ 68 WG at 2.5 kg/ha) during morning calm at least 4 hours before ${peakRainDay.rainfallMm}mm rain.`,
          },
        });
      } else if (altitudeBand.bandId === "mid_altitude_plateau") {
        // Mid-Altitude Plateau Rain Suggestion (e.g. Huye 1,720m Valley/Plateau)
        const titleEn = `Mid-Altitude Valley Bed Drainage & Rainwater Cistern Capture (${altitudeBand.altitudeMeters}m — ${peakRainDay.rainfallMm}mm Rain)`;
        const titleRw = `Gucukura Imigende mu Gishanga & Guhunitse Amazi y'Imvura (${altitudeBand.altitudeMeters}m — ${peakRainDay.rainfallMm}mm)`;
        const id = `sug-rain-plateau-${farm.id}-${peakRainDay.dynamicDate}`;
        const already = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Mid-Altitude Valley Bed Drainage") ||
              a.title.includes("Guhunitse Amazi y'Imvura"))
        );

        suggestions.push({
          id,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "rain_forecast",
          severity: peakRainDay.rainfallMm >= 12 ? "high" : "moderate",
          forecastDate: peakRainDay.dynamicDate,
          forecastDayLabelRw: peakRainDay.dayNameRw,
          forecastDayLabelEn: peakRainDay.dayNameEn,
          predictedRainfallMm: peakRainDay.rainfallMm,
          popPct: peakRainDay.pop,
          predictedTempMaxC: peakRainDay.tempMaxC,
          humidityPct: peakRainDay.humidity,
          windSpeedKmh: peakRainDay.windSpeedKmh,
          conditionRw: peakRainDay.conditionRw,
          conditionEn: peakRainDay.conditionEn,
          suggestedTitleRw: titleRw,
          suggestedTitleEn: titleEn,
          category: "land_prep",
          shiftWindow: "06:00-08:00",
          assignedTo: "Habimana Emmanuel",
          whyAltitudeMattersRw: `Ku butumburuke bwa ${altitudeBand.altitudeMeters}m mu bibaya by'Amajyepfo (${farm.sector}), ubutaka bw'inombe burekamo amazi ya ${peakRainDay.rainfallMm}mm bikabora imizi y'inyanya. Kuyobora amazi mu kigega birinda imizi kandi bikazigama amazi.`,
          whyAltitudeMattersEn: `At ${altitudeBand.altitudeMeters}m mid-altitude valley clay-loam (${farm.sector}), ${peakRainDay.rainfallMm}mm rainfall pools around tomato root collars. Diverting runoff into lined ponds prevents root asphyxiation.`,
          rabProtocolCode: "RAB-PLATEAU-DRAIN-1700M",
          isAlreadyScheduled: already,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn,
            category: "land_prep",
            dueDate: peakRainDay.dynamicDate,
            status: "pending",
            shiftWindow: "06:00-08:00",
            assignedTo: "Habimana Emmanuel",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Open raised-bed drainage channels and route ${peakRainDay.rainfallMm}mm forecasted rain into storage cisterns; stake lower tomato trusses off wet mud.`,
          },
        });
      } else {
        // Low-Altitude Savannah Rain Suggestion (< 1,500m, e.g. Nyagatare 1,380m)
        const titleEn = `Savannah Rain-Synchronized Urea Side-Dressing & Dam Intake Check (${altitudeBand.altitudeMeters}m — ${peakRainDay.rainfallMm}mm Rain)`;
        const titleRw = `Gufumbira Urea mu Mvura Nkeya & Kugenzura Icyuzi mu Kibaya (${altitudeBand.altitudeMeters}m — ${peakRainDay.rainfallMm}mm)`;
        const id = `sug-rain-savannah-${farm.id}-${peakRainDay.dynamicDate}`;
        const already = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Savannah Rain-Synchronized Urea") ||
              a.title.includes("Gufumbira Urea mu Mvura Nkeya"))
        );

        suggestions.push({
          id,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "rain_forecast",
          severity: "moderate",
          forecastDate: peakRainDay.dynamicDate,
          forecastDayLabelRw: peakRainDay.dayNameRw,
          forecastDayLabelEn: peakRainDay.dayNameEn,
          predictedRainfallMm: peakRainDay.rainfallMm,
          popPct: peakRainDay.pop,
          predictedTempMaxC: peakRainDay.tempMaxC,
          humidityPct: peakRainDay.humidity,
          windSpeedKmh: peakRainDay.windSpeedKmh,
          conditionRw: peakRainDay.conditionRw,
          conditionEn: peakRainDay.conditionEn,
          suggestedTitleRw: titleRw,
          suggestedTitleEn: titleEn,
          category: "fertilizing",
          shiftWindow: "08:00-10:00",
          assignedTo: "Jean de Dieu Nshimiyimana",
          whyAltitudeMattersRw: `Mu kibaya cyo hasi (${altitudeBand.altitudeMeters}m i ${farm.district}), imvura ya ${peakRainDay.rainfallMm}mm ni amahirwe adasanzwe yo gushyiramo ifumbire ya Urea kugira ngo yinjiye mu mizi idatakaye mu mwuka (volatilization) no gufunga imiyoboro ya moteri.`,
          whyAltitudeMattersEn: `In low-altitude savannah plains (${altitudeBand.altitudeMeters}m in ${farm.district}), a ${peakRainDay.rainfallMm}mm rainfall window dissolves Urea into the root zone without ammonia volatilization and allows pausing fuel irrigation pumps.`,
          rabProtocolCode: "RAB-SAVANNAH-RAIN-CAPTURE-1380M",
          isAlreadyScheduled: already,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn,
            category: "fertilizing",
            dueDate: peakRainDay.dynamicDate,
            status: "pending",
            shiftWindow: "08:00-10:00",
            assignedTo: "Jean de Dieu Nshimiyimana",
            latitude: farm.latitude,
            longitude: farm.longitude,
            fertilizerType: "Urea (46-0-0)",
            npkRatio: "46-0-0",
            amountKg: Math.round(farm.sizeHa * 100),
            areaAppliedHa: farm.sizeHa,
            applicationMethod: "side_dressing",
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Synchronize Urea side-dressing with forecasted ${peakRainDay.rainfallMm}mm rain and suspend auxiliary diesel pump cycle to save fuel.`,
          },
        });
      }
    }

    // 2. Check for HEATWAVE FORECAST triggers in this farm's altitude zone
    const peakHeatDay = dailyForecasts.find(
      (d) => d.tempMaxC >= altitudeBand.heatwaveThresholdC
    );

    if (peakHeatDay) {
      if (altitudeBand.bandId === "lowland_savannah") {
        // Suggestion B1: Lowland Savannah Heatwave Dawn Irrigation Pulse
        const titleEn1 = `Savannah Heatwave Dawn Drip Irrigation Pulse (${peakHeatDay.tempMaxC}°C Forecast at ${altitudeBand.altitudeMeters}m)`;
        const titleRw1 = `Kuhira mu Rukerera Mbere y'Ubushyuhe Bukabije bwa ${peakHeatDay.tempMaxC}°C mu Kibaya (${altitudeBand.altitudeMeters}m)`;
        const id1 = `sug-heat-savannah-irrig-${farm.id}-${peakHeatDay.dynamicDate}`;
        const already1 = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Savannah Heatwave Dawn Drip") ||
              a.title.includes("Kuhira mu Rukerera Mbere y'Ubushyuhe"))
        );

        suggestions.push({
          id: id1,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "heatwave_forecast",
          severity: peakHeatDay.tempMaxC >= 31 ? "critical" : "high",
          forecastDate: peakHeatDay.dynamicDate,
          forecastDayLabelRw: peakHeatDay.dayNameRw,
          forecastDayLabelEn: peakHeatDay.dayNameEn,
          predictedRainfallMm: peakHeatDay.rainfallMm,
          popPct: peakHeatDay.pop,
          predictedTempMaxC: peakHeatDay.tempMaxC,
          humidityPct: peakHeatDay.humidity,
          windSpeedKmh: peakHeatDay.windSpeedKmh,
          conditionRw: peakHeatDay.conditionRw,
          conditionEn: peakHeatDay.conditionEn,
          suggestedTitleRw: titleRw1,
          suggestedTitleEn: titleEn1,
          category: "irrigation",
          shiftWindow: "06:00-08:00",
          assignedTo: "Nyagatare Irrigation Attendant",
          whyAltitudeMattersRw: `Ku butumburuke bwo hasi bwa ${altitudeBand.altitudeMeters}m (${farm.district}), ubushyuhe bwa ${peakHeatDay.tempMaxC}°C n'ubuhehere bwa ${peakHeatDay.humidity}% bituma ubutaka butakaza mm 5.4 z'amazi ku munsi. Kuhira hagati ya 06:00–08:00 birinda ibigori kuzinga amababi.`,
          whyAltitudeMattersEn: `At ${altitudeBand.altitudeMeters}m lowland elevation (${farm.district}), a ${peakHeatDay.tempMaxC}°C heatwave with ${peakHeatDay.humidity}% humidity drives evapotranspiration above 5.4 mm/day. Irrigating at 06:00–08:00 prevents maize leaf rolling and tassel blast.`,
          rabProtocolCode: "RAB-SAVANNAH-HEATWAVE-1380M",
          isAlreadyScheduled: already1,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn1,
            category: "irrigation",
            dueDate: peakHeatDay.dynamicDate,
            status: "pending",
            shiftWindow: "06:00-08:00",
            assignedTo: "Nyagatare Irrigation Attendant",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Deliver 22mm dawn drip irrigation cycle between 06:00-08:00 AM before ${peakHeatDay.tempMaxC}°C midday heat peak.`,
          },
        });

        // Suggestion B2: Lowland Savannah Organic Mulching & Soil Moisture Retention
        const titleEn2 = `Heatwave Organic Straw Mulching & Inter-Row Shade Cover (${peakHeatDay.tempMaxC}°C at ${altitudeBand.altitudeMeters}m)`;
        const titleRw2 = `Gusasira Ibigori (Mulching) mu Kwirinda Ubushyuhe bwa ${peakHeatDay.tempMaxC}°C (${altitudeBand.altitudeMeters}m)`;
        const id2 = `sug-heat-savannah-mulch-${farm.id}-${peakHeatDay.dynamicDate}`;
        const already2 = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Heatwave Organic Straw Mulching") ||
              a.title.includes("Gusasira Ibigori (Mulching)"))
        );

        suggestions.push({
          id: id2,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "heatwave_forecast",
          severity: "high",
          forecastDate: peakHeatDay.dynamicDate,
          forecastDayLabelRw: peakHeatDay.dayNameRw,
          forecastDayLabelEn: peakHeatDay.dayNameEn,
          predictedRainfallMm: peakHeatDay.rainfallMm,
          popPct: peakHeatDay.pop,
          predictedTempMaxC: peakHeatDay.tempMaxC,
          humidityPct: peakHeatDay.humidity,
          windSpeedKmh: peakHeatDay.windSpeedKmh,
          conditionRw: peakHeatDay.conditionRw,
          conditionEn: peakHeatDay.conditionEn,
          suggestedTitleRw: titleRw2,
          suggestedTitleEn: titleEn2,
          category: "weeding",
          shiftWindow: "08:00-10:00",
          assignedTo: "Jean de Dieu & Abakozi 5",
          whyAltitudeMattersRw: `Mu butaka bw'umusenyi bwo ku butumburuke bwa ${altitudeBand.altitudeMeters}m, izuba rya ${peakHeatDay.tempMaxC}°C rishyushya ubutaka bwo hejuru kugeza kuri 42°C. Gusasira ibisigazwa by'ibihingwa bigabanya ubushyuhe bw'imizi ho 6°C.`,
          whyAltitudeMattersEn: `On sandy-loam savannah soils at ${altitudeBand.altitudeMeters}m, ${peakHeatDay.tempMaxC}°C air temperatures heat bare topsoil above 42°C. Applying a 5cm organic mulch blanket cools the root zone by 6°C and cuts evaporation by 45%.`,
          rabProtocolCode: "RAB-MULCH-THERMAL-SHIELD",
          isAlreadyScheduled: already2,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn2,
            category: "weeding",
            dueDate: peakHeatDay.dynamicDate,
            status: "pending",
            shiftWindow: "08:00-10:00",
            assignedTo: "Jean de Dieu & Abakozi 5",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Lay 5cm dry grass/stover mulch along crop rows to insulate roots against ${peakHeatDay.tempMaxC}°C heatwave.`,
          },
        });
      } else if (altitudeBand.bandId === "mid_altitude_plateau") {
        // Mid-Altitude Plateau Heatwave Suggestion (1,500m - 2,000m)
        const titleEn = `Plateau Heat-Spike Evening Irrigation & Blossom Protection (${peakHeatDay.tempMaxC}°C at ${altitudeBand.altitudeMeters}m)`;
        const titleRw = `Kuhira Nimugoroba & Kurinda Indabo z'Inyanya Gushya (${peakHeatDay.tempMaxC}°C kuri ${altitudeBand.altitudeMeters}m)`;
        const id = `sug-heat-plateau-${farm.id}-${peakHeatDay.dynamicDate}`;
        const already = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Plateau Heat-Spike Evening Irrigation") ||
              a.title.includes("Kurinda Indabo z'Inyanya Gushya"))
        );

        suggestions.push({
          id,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "heatwave_forecast",
          severity: "high",
          forecastDate: peakHeatDay.dynamicDate,
          forecastDayLabelRw: peakHeatDay.dayNameRw,
          forecastDayLabelEn: peakHeatDay.dayNameEn,
          predictedRainfallMm: peakHeatDay.rainfallMm,
          popPct: peakHeatDay.pop,
          predictedTempMaxC: peakHeatDay.tempMaxC,
          humidityPct: peakHeatDay.humidity,
          windSpeedKmh: peakHeatDay.windSpeedKmh,
          conditionRw: peakHeatDay.conditionRw,
          conditionEn: peakHeatDay.conditionEn,
          suggestedTitleRw: titleRw,
          suggestedTitleEn: titleEn,
          category: "irrigation",
          shiftWindow: "16:00-18:00",
          assignedTo: "Habimana Emmanuel",
          whyAltitudeMattersRw: `Ku butumburuke bwa ${altitudeBand.altitudeMeters}m (${farm.district}), ubushyuhe bwa ${peakHeatDay.tempMaxC}°C butera indabo z'inyanya za Anna F1 guhunguka (blossom drop) n'imbuto kubora ku mutwe (blossom-end rot) niba zituhiriwe nimugoroba.`,
          whyAltitudeMattersEn: `At ${altitudeBand.altitudeMeters}m mid-altitude plateau (${farm.district}), a thermal spike to ${peakHeatDay.tempMaxC}°C triggers tomato flower abortion and calcium-transport blossom-end rot unless root moisture is stabilized.`,
          rabProtocolCode: "RAB-HORT-HEAT-1720M",
          isAlreadyScheduled: already,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn,
            category: "irrigation",
            dueDate: peakHeatDay.dynamicDate,
            status: "pending",
            shiftWindow: "16:00-18:00",
            assignedTo: "Habimana Emmanuel",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Apply root-zone watering and foliar Calcium-Boron mist at 16:30 to prevent blossom drop during ${peakHeatDay.tempMaxC}°C heat spike.`,
          },
        });
      } else {
        // High-Altitude Volcanic Heat Anomaly Suggestion (> 2,000m, ≥25°C)
        const titleEn = `Highland Thermal Anomaly Ridge Earthing-Up & Aphid Vector Scouting (${peakHeatDay.tempMaxC}°C at ${altitudeBand.altitudeMeters}m)`;
        const titleRw = `Kurunda Igitaka ku Birayi & Gusuzuma Inda z'Ibihingwa mu Bushyuhe (${peakHeatDay.tempMaxC}°C kuri ${altitudeBand.altitudeMeters}m)`;
        const id = `sug-heat-highland-${farm.id}-${peakHeatDay.dynamicDate}`;
        const already = existingActivities.some(
          (a) =>
            a.farmId === farm.id &&
            (a.title.includes("Highland Thermal Anomaly") ||
              a.title.includes("Gusuzuma Inda z'Ibihingwa mu Bushyuhe"))
        );

        suggestions.push({
          id,
          farmId: farm.id,
          farmName: farm.name,
          district: farm.district,
          sector: farm.sector,
          crop: primaryCrop,
          altitudeMeters: altitudeBand.altitudeMeters,
          altitudeBand,
          triggerType: "heatwave_forecast",
          severity: "high",
          forecastDate: peakHeatDay.dynamicDate,
          forecastDayLabelRw: peakHeatDay.dayNameRw,
          forecastDayLabelEn: peakHeatDay.dayNameEn,
          predictedRainfallMm: peakHeatDay.rainfallMm,
          popPct: peakHeatDay.pop,
          predictedTempMaxC: peakHeatDay.tempMaxC,
          humidityPct: peakHeatDay.humidity,
          windSpeedKmh: peakHeatDay.windSpeedKmh,
          conditionRw: peakHeatDay.conditionRw,
          conditionEn: peakHeatDay.conditionEn,
          suggestedTitleRw: titleRw,
          suggestedTitleEn: titleEn,
          category: "weeding",
          shiftWindow: "06:00-08:00",
          assignedTo: "Jean Baptiste & Abakozi 6",
          whyAltitudeMattersRw: `Mu misozi y'ibirunga (${altitudeBand.altitudeMeters}m), ubushyuhe budasanzwe bwa ${peakHeatDay.tempMaxC}°C busatura ubutaka bw'amakoro bikinjiza izuba n'udukoko twa Potato Tuber Moth ku birayi biri mu butaka.`,
          whyAltitudeMattersEn: `In cool volcanic highlands (${altitudeBand.altitudeMeters}m), an unseasonal ${peakHeatDay.tempMaxC}°C heat anomaly cracks dark Andosol ridges, exposing shallow potato tubers to greening and Potato Tuber Moth entry.`,
          rabProtocolCode: "RAB-HIGHLAND-HEAT-2240M",
          isAlreadyScheduled: already,
          activityPayload: {
            farmId: farm.id,
            farmName: farm.name,
            crop: primaryCrop,
            title: titleEn,
            category: "weeding",
            dueDate: peakHeatDay.dynamicDate,
            status: "pending",
            shiftWindow: "06:00-08:00",
            assignedTo: "Jean Baptiste & Abakozi 6",
            latitude: farm.latitude,
            longitude: farm.longitude,
            notes: `Auto-Suggested for ${altitudeBand.nameEn}: Seal soil cracks on potato ridges with 5cm moist volcanic soil and scout upper leaves for aphid virus vectors triggered by ${peakHeatDay.tempMaxC}°C highland heat.`,
          },
        });
      }
    }
  }

  // Sort: critical first, then unscheduled before already scheduled
  return suggestions.sort((a, b) => {
    if (a.isAlreadyScheduled !== b.isAlreadyScheduled) {
      return a.isAlreadyScheduled ? 1 : -1;
    }
    const sevOrder = { critical: 0, high: 1, moderate: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
};
