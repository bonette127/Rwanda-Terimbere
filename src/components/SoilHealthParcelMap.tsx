import React, { useMemo, useState } from "react";
import {
  Farm,
  FarmActivity,
  FarmPlan,
  FertilizerApplicationLog,
  Language,
  ParcelSoilSensorReading,
} from "../types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Droplets,
  FlaskConical,
  Layers,
  MapPin,
  Mountain,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Sprout,
  Thermometer,
  Zap,
} from "lucide-react";

export type SoilOverlayLayerId =
  | "composite_health"
  | "moisture"
  | "nitrogen"
  | "phosphorus"
  | "potassium"
  | "ph_ec";

export interface SubPlotCellTelemetry {
  cellId: string; // e.g., "A1" .. "D5"
  rowIdx: number; // 0..3 (Upslope to Valley Foot-Slope)
  colIdx: number; // 0..4 (West to East)
  slopeZoneLabelEn: string;
  slopeZoneLabelRw: string;
  elevationMeters: number;
  areaHa: number;
  moisturePct: number; // 15 - 95 % VWC
  nitrogenMgKg: number; // 15 - 120 mg/kg (ppm)
  phosphorusMgKg: number; // 8 - 65 mg/kg (ppm)
  potassiumMgKg: number; // 60 - 280 mg/kg (ppm)
  soilPh: number; // 4.6 - 7.0
  ecDsM: number; // 0.3 - 2.4 dS/m
  soilTempC: number;
  organicMatterPct: number;
  compositeScore: number; // 0 - 100
  status: "optimal" | "moderate" | "deficient";
  hasSensorNode: boolean;
  sensorNodeId?: string;
  recentFertilizerBoost: boolean;
  limitingFactorEn: string;
  limitingFactorRw: string;
  prescriptionEn: string;
  prescriptionRw: string;
}

interface SoilHealthParcelMapProps {
  farms: Farm[];
  plans?: FarmPlan[];
  sensorReadingsByFarmId?: Record<string, ParcelSoilSensorReading>;
  fertilizerApplications?: FertilizerApplicationLog[];
  language: Language;
  onUpdateParcelSensorReading?: (
    farmId: string,
    reading: ParcelSoilSensorReading | null
  ) => void;
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
  onAddFertilizerApplication?: (app: FertilizerApplicationLog) => void;
}

const ROW_LABELS = ["A", "B", "C", "D"];
const COL_LABELS = ["1", "2", "3", "4", "5"];

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

/**
 * Deterministic spatial gradient generator for a 4x5 (20 sub-plot) parcel grid
 * incorporating parcel altitude, slope topography, sensor reading, and recent fertilizer logs.
 */
const generateParcelSubPlotGrid = (
  farm: Farm,
  sensorReading?: ParcelSoilSensorReading,
  farmFertilizerLogs: FertilizerApplicationLog[] = [],
  simulationPreset: "live" | "upslope_drought" | "leaching_rain" | "acidic_patch" = "live",
  cellOverrides: Record<string, Partial<SubPlotCellTelemetry>> = {}
): SubPlotCellTelemetry[] => {
  const baseMoisture =
    sensorReading?.moisturePercentage ??
    farm.soilMoisture ??
    (farm.altitude >= 2000 ? 72 : farm.altitude < 1500 ? 48 : 62);

  const baseTemp =
    sensorReading?.soilTempC ??
    (farm.altitude >= 2000 ? 15.8 : farm.altitude < 1500 ? 24.5 : 19.6);

  const baseEc = sensorReading?.ecDsM ?? 1.15;
  const basePh = farm.soilPh || 5.8;
  const baseOm = farm.organicMatter || 3.4;

  // Calculate nutrient boost from recorded fertilizer applications on this parcel
  const totalFertKg = farmFertilizerLogs.reduce((s, l) => s + l.amountKg, 0);
  const fertBoostN = Math.min(28, Math.round(totalFertKg * 0.09));
  const fertBoostP = Math.min(16, Math.round(totalFertKg * 0.05));
  const fertBoostK = Math.min(35, Math.round(totalFertKg * 0.11));

  // Base NPK by soil type / agroZone
  const isVolcanic =
    farm.altitude >= 2000 ||
    farm.soilType.toLowerCase().includes("volcanic") ||
    farm.soilType.toLowerCase().includes("urutare");
  const isSavanna =
    farm.altitude < 1500 ||
    farm.agroZone.toLowerCase().includes("savanna");

  const baseN = (isVolcanic ? 58 : isSavanna ? 38 : 48) + fertBoostN;
  const baseP = (isVolcanic ? 24 : isSavanna ? 18 : 22) + fertBoostP;
  const baseK = (isVolcanic ? 165 : isSavanna ? 125 : 148) + fertBoostK;

  const cells: SubPlotCellTelemetry[] = [];
  const subPlotAreaHa =
    Math.round(((farm.size || farm.sizeHa || 1.5) / 20) * 100) / 100;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const cellId = `${ROW_LABELS[r]}${COL_LABELS[c]}`;
      // Pseudo-random deterministic micro-variation per cell
      const seed = (r * 7 + c * 13 + farm.id.charCodeAt(farm.id.length - 1)) % 11;
      const microVar = seed - 5; // -5 .. +5

      // Topographic slope effect: Row 0 (A) is Upslope Crest (+12m, drier, lower N), Row 3 (D) is Foot-slope (-8m, wetter)
      const slopeElevDelta = (1.5 - r) * 6 + (c - 2) * 1.5;
      const elevationMeters = Math.round(farm.altitude + slopeElevDelta);

      const slopeZonesEn = [
        "Upslope Crest Terrace",
        "Upper-Mid Contour Bench",
        "Lower-Mid Radical Terrace",
        "Valley Foot-Slope Basin",
      ];
      const slopeZonesRw = [
        "Ku Gasongero k'Umurima (Upslope)",
        "Ku Iterasi ryo Hejuru",
        "Ku Iterasi ryo Hagati",
        "Mu Musozo / Ku Muyoboro w'Amazi",
      ];

      let moisturePct = clamp(
        Math.round(baseMoisture + (r - 1.5) * 6.5 + (c - 2) * 1.8 + microVar),
        16,
        94
      );
      let nitrogenMgKg = clamp(
        Math.round(baseN + (r - 1) * 4.5 + microVar * 2.2),
        18,
        115
      );
      let phosphorusMgKg = clamp(
        Math.round(baseP + (c - 2) * 2.8 + microVar * 1.4),
        9,
        62
      );
      let potassiumMgKg = clamp(
        Math.round(baseK + (r - 1.5) * 8 + microVar * 4.5),
        65,
        265
      );
      let soilPh =
        Math.round(
          clamp(basePh + (r - 1.5) * 0.12 + microVar * 0.04, 4.6, 7.1) * 10
        ) / 10;
      let ecDsM =
        Math.round(
          clamp(baseEc + (r - 1.5) * 0.14 + microVar * 0.05, 0.35, 2.35) * 100
        ) / 100;

      // Apply interactive simulation presets
      if (simulationPreset === "upslope_drought" && r <= 1) {
        moisturePct = clamp(moisturePct - 24, 18, 42);
        nitrogenMgKg = clamp(nitrogenMgKg - 12, 20, 90);
      } else if (simulationPreset === "leaching_rain") {
        moisturePct = clamp(moisturePct + 16, 65, 94);
        if (r <= 1) {
          nitrogenMgKg = clamp(nitrogenMgKg - 18, 19, 65);
          potassiumMgKg = clamp(potassiumMgKg - 28, 70, 180);
        } else if (r === 3) {
          nitrogenMgKg = clamp(nitrogenMgKg + 10, 35, 115);
        }
      } else if (simulationPreset === "acidic_patch" && c >= 2 && r >= 1) {
        soilPh = Math.round(clamp(soilPh - 0.75, 4.6, 5.2) * 10) / 10;
        phosphorusMgKg = clamp(phosphorusMgKg - 9, 9, 22);
      }

      // Apply manual cell overrides if user calibrated this cell
      const override = cellOverrides[cellId];
      if (override) {
        if (override.moisturePct !== undefined) moisturePct = override.moisturePct;
        if (override.nitrogenMgKg !== undefined) nitrogenMgKg = override.nitrogenMgKg;
        if (override.phosphorusMgKg !== undefined)
          phosphorusMgKg = override.phosphorusMgKg;
        if (override.potassiumMgKg !== undefined)
          potassiumMgKg = override.potassiumMgKg;
        if (override.soilPh !== undefined) soilPh = override.soilPh;
      }

      // Score calculation (0 - 100)
      const moistureScore =
        moisturePct >= 52 && moisturePct <= 80
          ? 92
          : moisturePct >= 40 && moisturePct <= 86
            ? 70
            : 38;
      const nScore = clamp(Math.round((nitrogenMgKg / 75) * 90), 25, 98);
      const pScore = clamp(Math.round((phosphorusMgKg / 32) * 90), 25, 98);
      const kScore = clamp(Math.round((potassiumMgKg / 180) * 90), 25, 98);
      const phScore =
        soilPh >= 5.5 && soilPh <= 6.6
          ? 94
          : soilPh >= 5.1 && soilPh <= 6.9
            ? 72
            : 42;

      const compositeScore = Math.round(
        moistureScore * 0.3 +
          nScore * 0.25 +
          pScore * 0.15 +
          kScore * 0.15 +
          phScore * 0.15
      );

      const status: SubPlotCellTelemetry["status"] =
        compositeScore >= 75
          ? "optimal"
          : compositeScore >= 56
            ? "moderate"
            : "deficient";

      // Identify primary limiting factor and precision prescription
      let limitingFactorEn = "Balanced Root-Zone Moisture & NPK";
      let limitingFactorRw = "Ubuhehere n'Intungamubiri Biringaniye";
      let prescriptionEn =
        "Maintain current mulch cover and standard RAB seasonal monitoring.";
      let prescriptionRw =
        "Komeza gusasira neza no gukurikirana umurima uko bisanzwe.";

      if (moisturePct < 44) {
        limitingFactorEn = `Low Root Moisture (${moisturePct}% VWC)`;
        limitingFactorRw = `Ubuhehere Buke mu Mizi (${moisturePct}% VWC)`;
        prescriptionEn = `Apply 18–22 mm spot drip/furrow irrigation in Zone ${cellId} (${slopeZonesEn[r]}) and add 8cm grass mulch.`;
        prescriptionRw = `Uhira agace ka ${cellId} (${slopeZonesRw[r]}) ku kigero cya 18–22 mm kandi usasire n'ibyatsi.`;
      } else if (moisturePct > 85) {
        limitingFactorEn = `Waterlogging & Leaching Risk (${moisturePct}% VWC)`;
        limitingFactorRw = `Amazi Menshi mu Butaka (${moisturePct}% VWC)`;
        prescriptionEn = `Clear contour drainage trench along Zone ${cellId} and delay soluble Urea application until VWC < 78%.`;
        prescriptionRw = `Sibura umuferege ukamura amazi muri ${cellId} kandi ube uretse gushyiramo Urea.`;
      } else if (soilPh < 5.3) {
        limitingFactorEn = `Soil Acidity / P-Fixation (pH ${soilPh})`;
        limitingFactorRw = `Ubutaka Busharira (pH ${soilPh})`;
        prescriptionEn = `Incorporate 1.5–2.0 t/ha agricultural lime (Ishwagara) + decomposed manure in Zone ${cellId} to unlock Phosphorus.`;
        prescriptionRw = `Shyiramo ishwagara (1.5–2.0 t/ha) n'ifumbire y'imborera muri ${cellId} kugira ngo ubutaka budasharira.`;
      } else if (nitrogenMgKg < 42) {
        limitingFactorEn = `Nitrogen Depletion (${nitrogenMgKg} mg/kg N)`;
        limitingFactorRw = `Azote Nke mu Butaka (${nitrogenMgKg} mg/kg N)`;
        prescriptionEn = `Variable-rate side-dress 65 kg/ha Urea (46-0-0) or NPK 17-17-17 across Zone ${cellId} rows.`;
        prescriptionRw = `Shyiramo 65 kg/ha za Urea (46-0-0) cyangwa NPK 17-17-17 mu mirongo yo muri ${cellId}.`;
      } else if (phosphorusMgKg < 18) {
        limitingFactorEn = `Low Available Phosphorus (${phosphorusMgKg} mg/kg P)`;
        limitingFactorRw = `Fosifore Nke (${phosphorusMgKg} mg/kg P)`;
        prescriptionEn = `Band-apply 80 kg/ha DAP (18-46-0) near root zone in Zone ${cellId} to boost root & tuber initiation.`;
        prescriptionRw = `Shyiramo 80 kg/ha za DAP (18-46-0) hafi y'imizi muri ${cellId}.`;
      }

      const hasSensorNode =
        (r === 1 && c === 1) || (r === 2 && c === 3);
      const sensorNodeId =
        r === 1 && c === 1
          ? sensorReading?.sensorId || `IOT-${farm.district.slice(0, 3).toUpperCase()}-01`
          : r === 2 && c === 3
            ? `IOT-${farm.district.slice(0, 3).toUpperCase()}-02`
            : undefined;

      cells.push({
        cellId,
        rowIdx: r,
        colIdx: c,
        slopeZoneLabelEn: slopeZonesEn[r],
        slopeZoneLabelRw: slopeZonesRw[r],
        elevationMeters,
        areaHa: subPlotAreaHa,
        moisturePct,
        nitrogenMgKg,
        phosphorusMgKg,
        potassiumMgKg,
        soilPh,
        ecDsM,
        soilTempC: Math.round((baseTemp + (r - 1.5) * 0.4) * 10) / 10,
        organicMatterPct:
          Math.round(clamp(baseOm + (r - 1.5) * 0.25, 1.8, 5.8) * 10) / 10,
        compositeScore,
        status,
        hasSensorNode,
        sensorNodeId,
        recentFertilizerBoost: fertBoostN > 0 && r >= 1 && r <= 2,
        limitingFactorEn,
        limitingFactorRw,
        prescriptionEn,
        prescriptionRw,
      });
    }
  }

  return cells;
};

/**
 * Returns fill color, stroke color, and formatted value label for a cell given the active overlay layer
 */
const getCellVisualStyle = (
  cell: SubPlotCellTelemetry,
  layer: SoilOverlayLayerId
): {
  fill: string;
  stroke: string;
  textColor: string;
  valueLabel: string;
  subLabel: string;
  levelTag: "optimal" | "moderate" | "critical";
} => {
  if (layer === "moisture") {
    const m = cell.moisturePct;
    if (m < 42) {
      return {
        fill: "#fef3c7", // amber-100 (dry stress)
        stroke: "#f59e0b",
        textColor: "#78350f",
        valueLabel: `${m}%`,
        subLabel: "Dry VWC",
        levelTag: "critical",
      };
    }
    if (m > 84) {
      return {
        fill: "#dbeafe", // blue-100 (saturated)
        stroke: "#2563eb",
        textColor: "#1e3a8a",
        valueLabel: `${m}%`,
        subLabel: "Saturated",
        levelTag: "moderate",
      };
    }
    if (m >= 60) {
      return {
        fill: "#ccfbf1", // teal-100 (optimal moist)
        stroke: "#0d9488",
        textColor: "#134e4a",
        valueLabel: `${m}%`,
        subLabel: "Optimal VWC",
        levelTag: "optimal",
      };
    }
    return {
      fill: "#e0f2fe", // sky-100
      stroke: "#0284c7",
      textColor: "#0c4a6e",
      valueLabel: `${m}%`,
      subLabel: "Moderate",
      levelTag: "moderate",
    };
  }

  if (layer === "nitrogen") {
    const n = cell.nitrogenMgKg;
    if (n >= 58) {
      return {
        fill: "#dcfce7",
        stroke: "#16a34a",
        textColor: "#14532d",
        valueLabel: `${n}`,
        subLabel: "mg/kg N",
        levelTag: "optimal",
      };
    }
    if (n >= 42) {
      return {
        fill: "#fef9c3",
        stroke: "#ca8a04",
        textColor: "#713f12",
        valueLabel: `${n}`,
        subLabel: "mg/kg N",
        levelTag: "moderate",
      };
    }
    return {
      fill: "#ffe4e6",
      stroke: "#e11d48",
      textColor: "#881337",
      valueLabel: `${n}`,
      subLabel: "Low N",
      levelTag: "critical",
    };
  }

  if (layer === "phosphorus") {
    const p = cell.phosphorusMgKg;
    if (p >= 24) {
      return {
        fill: "#f3e8ff",
        stroke: "#9333ea",
        textColor: "#581c87",
        valueLabel: `${p}`,
        subLabel: "mg/kg P",
        levelTag: "optimal",
      };
    }
    if (p >= 17) {
      return {
        fill: "#fef3c7",
        stroke: "#d97706",
        textColor: "#78350f",
        valueLabel: `${p}`,
        subLabel: "mg/kg P",
        levelTag: "moderate",
      };
    }
    return {
      fill: "#ffe4e6",
      stroke: "#e11d48",
      textColor: "#881337",
      valueLabel: `${p}`,
      subLabel: "Low P",
      levelTag: "critical",
    };
  }

  if (layer === "potassium") {
    const k = cell.potassiumMgKg;
    if (k >= 155) {
      return {
        fill: "#e0e7ff",
        stroke: "#4f46e5",
        textColor: "#312e81",
        valueLabel: `${k}`,
        subLabel: "mg/kg K",
        levelTag: "optimal",
      };
    }
    if (k >= 115) {
      return {
        fill: "#fef3c7",
        stroke: "#d97706",
        textColor: "#78350f",
        valueLabel: `${k}`,
        subLabel: "mg/kg K",
        levelTag: "moderate",
      };
    }
    return {
      fill: "#ffe4e6",
      stroke: "#e11d48",
      textColor: "#881337",
      valueLabel: `${k}`,
      subLabel: "Low K",
      levelTag: "critical",
    };
  }

  if (layer === "ph_ec") {
    const ph = cell.soilPh;
    if (ph >= 5.5 && ph <= 6.6) {
      return {
        fill: "#d1fae5",
        stroke: "#059669",
        textColor: "#064e3b",
        valueLabel: `pH ${ph}`,
        subLabel: `${cell.ecDsM} dS/m`,
        levelTag: "optimal",
      };
    }
    if (ph >= 5.2 && ph <= 6.9) {
      return {
        fill: "#fef3c7",
        stroke: "#d97706",
        textColor: "#78350f",
        valueLabel: `pH ${ph}`,
        subLabel: `${cell.ecDsM} dS/m`,
        levelTag: "moderate",
      };
    }
    return {
      fill: "#ffe4e6",
      stroke: "#e11d48",
      textColor: "#881337",
      valueLabel: `pH ${ph}`,
      subLabel: "Acidic",
      levelTag: "critical",
    };
  }

  // Default: composite_health
  if (cell.compositeScore >= 75) {
    return {
      fill: "#d1fae5",
      stroke: "#059669",
      textColor: "#064e3b",
      valueLabel: `${cell.compositeScore}/100`,
      subLabel: `${cell.moisturePct}% • N:${cell.nitrogenMgKg}`,
      levelTag: "optimal",
    };
  }
  if (cell.compositeScore >= 56) {
    return {
      fill: "#fef3c7",
      stroke: "#d97706",
      textColor: "#78350f",
      valueLabel: `${cell.compositeScore}/100`,
      subLabel: `${cell.moisturePct}% • N:${cell.nitrogenMgKg}`,
      levelTag: "moderate",
    };
  }
  return {
    fill: "#ffe4e6",
    stroke: "#e11d48",
    textColor: "#881337",
    valueLabel: `${cell.compositeScore}/100`,
    subLabel: `${cell.moisturePct}% • N:${cell.nitrogenMgKg}`,
    levelTag: "critical",
  };
};

const CLEAN_SLATE_SOIL_PRESETS: Farm[] = [
  {
    id: "soil-ref-birunga",
    name: "Birunga Volcanic Soil Reference Grid",
    location: "Musanze",
    district: "Musanze",
    sector: "Kinigi",
    altitude: 2240,
    altitudeMeters: 2240,
    agroZone: "Volcanic Highlands (Birunga)",
    size: 1.0,
    sizeHa: 1.0,
    soilType: "Volcanic Loam (Andosols)",
    soilPh: 5.8,
    soilMoisture: 72,
    mainCrops: ["Ibirayi (Kinigi)"],
    latitude: -1.4824,
    longitude: 29.5892,
  },
  {
    id: "soil-ref-savanna",
    name: "Eastern Savanna Soil Reference Grid",
    location: "Nyagatare",
    district: "Nyagatare",
    sector: "Mimuri",
    altitude: 1380,
    altitudeMeters: 1380,
    agroZone: "Eastern Savanna",
    size: 1.5,
    sizeHa: 1.5,
    soilType: "Sandy Clay Loam (Ferralsols)",
    soilPh: 6.3,
    soilMoisture: 54,
    mainCrops: ["Ibigori (Maize)"],
    latitude: -1.3512,
    longitude: 30.3391,
  },
  {
    id: "soil-ref-plateau",
    name: "Southern Plateau Soil Reference Grid",
    location: "Huye",
    district: "Huye",
    sector: "Tumba",
    altitude: 1750,
    altitudeMeters: 1750,
    agroZone: "Southern Plateau",
    size: 1.0,
    sizeHa: 1.0,
    soilType: "Humic Clay Loam (Acrisols)",
    soilPh: 5.5,
    soilMoisture: 64,
    mainCrops: ["Ibishyimbo (Beans)"],
    latitude: -2.6074,
    longitude: 29.7394,
  },
];

export const SoilHealthParcelMap: React.FC<SoilHealthParcelMapProps> = ({
  farms,
  sensorReadingsByFarmId = {},
  fertilizerApplications = [],
  language,
  onUpdateParcelSensorReading,
  onCreateActivity,
  onAddFertilizerApplication,
}) => {
  const effectiveFarms = farms.length > 0 ? farms : CLEAN_SLATE_SOIL_PRESETS;
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    effectiveFarms[0]?.id || "soil-ref-birunga"
  );
  const [activeLayer, setActiveLayer] =
    useState<SoilOverlayLayerId>("composite_health");
  const [mapMode, setMapMode] = useState<"parcel_grid" | "multi_parcel">(
    "parcel_grid"
  );
  const [simulationPreset, setSimulationPreset] = useState<
    "live" | "upslope_drought" | "leaching_rain" | "acidic_patch"
  >("live");
  const [selectedCellId, setSelectedCellId] = useState<string>("B3");
  const [cellOverridesByFarm, setCellOverridesByFarm] = useState<
    Record<string, Record<string, Partial<SubPlotCellTelemetry>>>
  >({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const activeFarm = useMemo(
    () =>
      effectiveFarms.find((f) => f.id === selectedFarmId) || effectiveFarms[0],
    [effectiveFarms, selectedFarmId]
  );

  const farmFertilizerLogs = useMemo(
    () =>
      fertilizerApplications.filter((app) => app.farmId === activeFarm?.id),
    [fertilizerApplications, activeFarm?.id]
  );

  const gridCells = useMemo(() => {
    if (!activeFarm) return [];
    return generateParcelSubPlotGrid(
      activeFarm,
      sensorReadingsByFarmId[activeFarm.id],
      farmFertilizerLogs,
      simulationPreset,
      cellOverridesByFarm[activeFarm.id] || {}
    );
  }, [
    activeFarm,
    sensorReadingsByFarmId,
    farmFertilizerLogs,
    simulationPreset,
    cellOverridesByFarm,
  ]);

  const selectedCell = useMemo(
    () =>
      gridCells.find((c) => c.cellId === selectedCellId) ||
      gridCells[7] ||
      gridCells[0],
    [gridCells, selectedCellId]
  );

  // Aggregate spatial statistics across all 20 sub-plots
  const spatialSummary = useMemo(() => {
    if (gridCells.length === 0) {
      return {
        avgMoisture: 60,
        avgN: 50,
        avgP: 22,
        avgK: 150,
        avgPh: 5.8,
        avgScore: 76,
        optimalCount: 14,
        moderateCount: 4,
        deficientCount: 2,
      };
    }
    const count = gridCells.length;
    return {
      avgMoisture: Math.round(
        gridCells.reduce((s, c) => s + c.moisturePct, 0) / count
      ),
      avgN: Math.round(
        gridCells.reduce((s, c) => s + c.nitrogenMgKg, 0) / count
      ),
      avgP: Math.round(
        gridCells.reduce((s, c) => s + c.phosphorusMgKg, 0) / count
      ),
      avgK: Math.round(
        gridCells.reduce((s, c) => s + c.potassiumMgKg, 0) / count
      ),
      avgPh:
        Math.round(
          (gridCells.reduce((s, c) => s + c.soilPh, 0) / count) * 10
        ) / 10,
      avgScore: Math.round(
        gridCells.reduce((s, c) => s + c.compositeScore, 0) / count
      ),
      optimalCount: gridCells.filter((c) => c.status === "optimal").length,
      moderateCount: gridCells.filter((c) => c.status === "moderate").length,
      deficientCount: gridCells.filter((c) => c.status === "deficient").length,
    };
  }, [gridCells]);

  if (!activeFarm || !selectedCell) return null;

  const showTemporaryFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleUpdateSelectedCellValue = (
    updates: Partial<SubPlotCellTelemetry>
  ) => {
    setCellOverridesByFarm((prev) => ({
      ...prev,
      [activeFarm.id]: {
        ...(prev[activeFarm.id] || {}),
        [selectedCell.cellId]: {
          ...(prev[activeFarm.id]?.[selectedCell.cellId] || {}),
          ...updates,
        },
      },
    }));

    // If moisture was calibrated and parent sensor callback exists, sync parcel sensor reading
    if (updates.moisturePct !== undefined && onUpdateParcelSensorReading) {
      const existing = sensorReadingsByFarmId[activeFarm.id];
      onUpdateParcelSensorReading(activeFarm.id, {
        farmId: activeFarm.id,
        mode: existing?.mode || "iot_telemetry",
        sensorId:
          existing?.sensorId ||
          `IOT-${activeFarm.district.slice(0, 3).toUpperCase()}-01`,
        moisturePercentage: updates.moisturePct,
        soilTempC: selectedCell.soilTempC,
        ecDsM: selectedCell.ecDsM,
        probeDepthCm: 20,
        batteryPct: 94,
        signalRssiDbm: -66,
        updatedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
  };

  const handleScheduleZoneIrrigation = () => {
    if (!onCreateActivity) return;
    const todayIso = new Date().toISOString().split("T")[0];
    onCreateActivity({
      farmId: activeFarm.id,
      farmName: activeFarm.name,
      crop: activeFarm.mainCrops[0] || "Ibihingwa",
      title: `[Spatial Map Zone ${selectedCell.cellId}] Spot Irrigation (${selectedCell.moisturePct}% VWC → 72% Target)`,
      category: "irrigation",
      dueDate: todayIso,
      shiftWindow: "early_morning",
      status: "pending",
      assignedWorker: "Jean Bosco (Irrigation Lead)",
      estimatedCost: 12000,
      notes: `${selectedCell.prescriptionEn} | Elevation: ${selectedCell.elevationMeters}m ASL`,
      latitude: activeFarm.latitude,
      longitude: activeFarm.longitude,
    });
    handleUpdateSelectedCellValue({
      moisturePct: Math.max(68, selectedCell.moisturePct + 20),
    });
    showTemporaryFeedback(
      language === "rw"
        ? `Gahunda yo kuhira Agace ka ${selectedCell.cellId} yashyizwe mu bikorwa!`
        : `Spot irrigation scheduled for Sub-Plot ${selectedCell.cellId} & moisture projection updated!`
    );
  };

  const handleScheduleZoneNutrientTask = () => {
    const todayIso = new Date().toISOString().split("T")[0];
    const recommendedKg = Math.max(15, Math.round(selectedCell.areaHa * 150));

    if (onCreateActivity) {
      onCreateActivity({
        farmId: activeFarm.id,
        farmName: activeFarm.name,
        crop: activeFarm.mainCrops[0] || "Ibihingwa",
        title: `[Spatial Map Zone ${selectedCell.cellId}] Variable-Rate NPK / Soil Amendment (${recommendedKg} kg)`,
        category: "fertilizing",
        dueDate: todayIso,
        shiftWindow: "early_morning",
        status: "pending",
        assignedWorker: "Jean Bosco (Agronomist)",
        estimatedCost: recommendedKg * 680,
        fertilizerType:
          selectedCell.soilPh < 5.3
            ? "NPK 17-17-17 + Agricultural Lime"
            : selectedCell.nitrogenMgKg < 45
              ? "Urea (46-0-0)"
              : "NPK 17-17-17",
        npkRatio: selectedCell.nitrogenMgKg < 45 ? "46-0-0" : "17-17-17",
        amountKg: recommendedKg,
        areaAppliedHa: selectedCell.areaHa,
        applicationMethod: "side_dressing",
        notes: `${selectedCell.prescriptionEn} | Sub-Plot ${selectedCell.cellId} (${selectedCell.slopeZoneLabelEn})`,
        latitude: activeFarm.latitude,
        longitude: activeFarm.longitude,
      });
    }

    if (onAddFertilizerApplication) {
      onAddFertilizerApplication({
        id: `fert-map-${Date.now()}`,
        farmId: activeFarm.id,
        farmName: activeFarm.name,
        crop: activeFarm.mainCrops[0] || "Ibihingwa",
        applicationDate: todayIso,
        season: "2026A",
        fertilizerType:
          selectedCell.nitrogenMgKg < 45 ? "Urea (46-0-0)" : "NPK 17-17-17",
        npkRatio: selectedCell.nitrogenMgKg < 45 ? "46-0-0" : "17-17-17",
        amountKg: recommendedKg,
        areaAppliedHa: selectedCell.areaHa,
        method: "side_dressing",
        costRwf: recommendedKg * 680,
        operatorName: "Jean Bosco",
        growthStageAtApplication: `Precision Map Zone ${selectedCell.cellId}`,
        notes: selectedCell.prescriptionEn,
      });
    }

    handleUpdateSelectedCellValue({
      nitrogenMgKg: Math.min(110, selectedCell.nitrogenMgKg + 22),
      phosphorusMgKg: Math.min(58, selectedCell.phosphorusMgKg + 10),
      potassiumMgKg: Math.min(245, selectedCell.potassiumMgKg + 25),
      soilPh:
        selectedCell.soilPh < 5.4
          ? Math.round((selectedCell.soilPh + 0.5) * 10) / 10
          : selectedCell.soilPh,
    });

    showTemporaryFeedback(
      language === "rw"
        ? `Ifumbire yo mu gace ka ${selectedCell.cellId} (${recommendedKg} kg) yanditswe kandi ikarita yavuguruwe!`
        : `Variable-rate NPK (${recommendedKg} kg) applied to Zone ${selectedCell.cellId} & spatial map updated!`
    );
  };

  const layerTabs: {
    id: SoilOverlayLayerId;
    labelEn: string;
    labelRw: string;
    unitLabel: string;
  }[] = [
    {
      id: "composite_health",
      labelEn: "Composite Soil Health",
      labelRw: "Ubuzima Rusange bw'Ubutaka",
      unitLabel: "0–100 Index",
    },
    {
      id: "moisture",
      labelEn: "Soil Moisture (% VWC)",
      labelRw: "Ubuhehere bw'Ubutaka (%)",
      unitLabel: "% VWC",
    },
    {
      id: "nitrogen",
      labelEn: "Nitrogen (N)",
      labelRw: "Azote (N)",
      unitLabel: "mg/kg N",
    },
    {
      id: "phosphorus",
      labelEn: "Phosphorus (P)",
      labelRw: "Fosifore (P)",
      unitLabel: "mg/kg P",
    },
    {
      id: "potassium",
      labelEn: "Potassium (K)",
      labelRw: "Potasiyumu (K)",
      unitLabel: "mg/kg K",
    },
    {
      id: "ph_ec",
      labelEn: "Soil pH & EC",
      labelRw: "Aside (pH) & EC",
      unitLabel: "pH / dS/m",
    },
  ];

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-teal-950 px-5 py-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  {language === "rw"
                    ? "Ikarita y'Ubuzima bw'Ubutaka (SVG Grid)"
                    : "Precision Soil Health & Moisture SVG Spatial Map"}
                </span>
                <span className="text-[11px] text-emerald-200/90 flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-amber-300" />
                  {activeFarm.agroZone} • {activeFarm.altitude}m ASL
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {language === "rw"
                  ? `Ikarita y'Ubuhehere n'Intungamubiri (NPK & pH) mu Mirima: ${activeFarm.name}`
                  : `Parcel Moisture & Nutrient Spatial Overlay Map: ${activeFarm.name}`}
              </h3>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {language === "rw"
                  ? `Utuce 20 tw'umurima (A1–D5) dusesenguye hakurikijwe ibipimo bya IoT, imiterere y'umusozi (${activeFarm.soilType}), n'ifumbire yashyizwemo.`
                  : `20 micro-zone sub-plots (A1–D5) mapped across contour elevation gradients (${activeFarm.soilType}), live IoT probes, and seasonal NPK logs.`}
              </p>
            </div>
          </div>

          {/* Parcel Selector & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label={
                language === "rw"
                  ? "Hitamo Umurima kuri Ikarita"
                  : "Select Parcel for Soil Health Map"
              }
              value={activeFarm.id}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="bg-emerald-950/90 text-white text-xs font-bold rounded-xl px-3 py-2 border border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {effectiveFarms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.district} • {f.size || f.sizeHa || 1} Ha)
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl bg-black/30 p-1 border border-emerald-700/50">
              <button
                type="button"
                onClick={() => setMapMode("parcel_grid")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mapMode === "parcel_grid"
                    ? "bg-amber-400 text-stone-950"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                {language === "rw" ? "Utuce 20 (Grid)" : "20-Zone SVG Grid"}
              </button>
              <button
                type="button"
                onClick={() => setMapMode("multi_parcel")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mapMode === "multi_parcel"
                    ? "bg-amber-400 text-stone-950"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                {language === "rw" ? "Imirima Yose" : "All Parcels Map"}
              </button>
            </div>
          </div>
        </div>

        {/* Layer Overlay Selector Strip + Topographic Scenario Simulator */}
        <div className="mt-3 pt-3 border-t border-emerald-800/80 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-300 mr-1">
              {language === "rw" ? "Hitamo Igipimo:" : "Overlay Layer:"}
            </span>
            {layerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLayer(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeLayer === tab.id
                    ? "bg-white text-emerald-950 shadow-2xs"
                    : "bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800/80 border border-emerald-700/50"
                }`}
              >
                {language === "rw" ? tab.labelRw : tab.labelEn}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-emerald-300 font-medium">
              {language === "rw" ? " Igerageza:" : "Field Condition:"}
            </span>
            {(
              [
                {
                  id: "live",
                  labelEn: "Live IoT Baseline",
                  labelRw: "Ibipimo Biriho (Live)",
                },
                {
                  id: "upslope_drought",
                  labelEn: "Upslope Dry Stress",
                  labelRw: "Umwuma ku Gasongero",
                },
                {
                  id: "leaching_rain",
                  labelEn: "Post-Storm N Leaching",
                  labelRw: " Gutwarwa kw'Ifumbire",
                },
                {
                  id: "acidic_patch",
                  labelEn: "Acidic Pocket (pH < 5.2)",
                  labelRw: "Ubusharire bw'Ubutaka",
                },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSimulationPreset(preset.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  simulationPreset === preset.id
                    ? "bg-amber-400/90 text-stone-950 font-bold"
                    : "bg-black/25 text-emerald-200 hover:bg-black/40 border border-white/10"
                }`}
              >
                {language === "rw" ? preset.labelRw : preset.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parcel Spatial Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-4 bg-stone-50 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 text-xs">
        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 font-semibold block">
            {language === "rw" ? "Amanota y'Ubutaka" : "Mean Soil Health"}
          </span>
          <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
            {spatialSummary.avgScore}/100
          </span>
          <span className="text-[10px] text-stone-500 block">
            {spatialSummary.optimalCount}/20{" "}
            {language === "rw" ? "utuce twiza" : "optimal zones"}
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 font-semibold block">
            {language === "rw" ? "Ubuhehere (% VWC)" : "Mean Moisture"}
          </span>
          <span className="text-base font-black text-teal-700 dark:text-teal-400">
            {spatialSummary.avgMoisture}% VWC
          </span>
          <span className="text-[10px] text-stone-500 block">
            Target: 55% – 78% VWC
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 font-semibold block">
            {language === "rw" ? "Azote (Available N)" : "Mean Nitrogen (N)"}
          </span>
          <span className="text-base font-black text-green-700 dark:text-green-400">
            {spatialSummary.avgN} mg/kg
          </span>
          <span className="text-[10px] text-stone-500 block">
            RAB Benchmark: ≥55 mg/kg
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 font-semibold block">
            {language === "rw" ? "Fosifore (Available P)" : "Mean Phosphorus (P)"}
          </span>
          <span className="text-base font-black text-purple-700 dark:text-purple-400">
            {spatialSummary.avgP} mg/kg
          </span>
          <span className="text-[10px] text-stone-500 block">
            RAB Benchmark: ≥22 mg/kg
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 font-semibold block">
            {language === "rw" ? "Potasiyumu (Exch. K)" : "Mean Potassium (K)"}
          </span>
          <span className="text-base font-black text-indigo-700 dark:text-indigo-400">
            {spatialSummary.avgK} mg/kg
          </span>
          <span className="text-[10px] text-stone-500 block">
            RAB Benchmark: ≥145 mg/kg
          </span>
        </div>

        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
          <span className="text-[11px] text-stone-500 font-semibold block">
            {language === "rw" ? "Aside (pH) & Utuce Dukeneye Ubufasha" : "Mean pH & Alert Zones"}
          </span>
          <span className="text-base font-black text-amber-700 dark:text-amber-400">
            pH {spatialSummary.avgPh}
          </span>
          <span className="text-[10px] text-rose-600 font-semibold block">
            {spatialSummary.deficientCount}{" "}
            {language === "rw" ? "utuce dukeneye ifumbire/amazi" : "zones need intervention"}
          </span>
        </div>
      </div>

      {actionFeedback && (
        <div className="mx-5 mt-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* MAIN BODY: LEFT = INTERACTIVE SVG SPATIAL MAP, RIGHT = MICRO-ZONE TELEMETRY & PRESCRIPTION INSPECTOR */}
      {mapMode === "parcel_grid" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 p-5">
          {/* Left 7 Cols: Interactive SVG Parcel Grid & Contour Map */}
          <div className="xl:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {language === "rw"
                    ? `Ikarita ya SVG (${activeFarm.size} Ha • ${activeFarm.district} - ${activeFarm.sector})`
                    : `Interactive SVG Parcel Map (${activeFarm.size} Ha • ${activeFarm.district} - ${activeFarm.sector})`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  {language === "rw" ? "Byiza (Optimal)" : "Optimal"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
                  {language === "rw" ? "Biringaniye (Moderate)" : "Moderate"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                  {language === "rw" ? "Bikeneye Ubufasha (Deficient)" : "Deficient / Stress"}
                </span>
              </div>
            </div>

            {/* SVG Spatial Map Canvas */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-950 p-3 shadow-inner overflow-x-auto">
              <svg
                viewBox="0 0 680 420"
                className="w-full h-auto min-w-[520px] select-none"
                role="img"
                aria-label={`Soil health spatial map for ${activeFarm.name}`}
              >
                <defs>
                  <pattern
                    id="topoGridPattern"
                    width="34"
                    height="34"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 34 0 L 0 0 0 34"
                      fill="none"
                      stroke="#1c1917"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                {/* Dark Field Background */}
                <rect width="680" height="420" rx="14" fill="#0c0a09" />
                <rect
                  width="680"
                  height="420"
                  rx="14"
                  fill="url(#topoGridPattern)"
                />

                {/* Topographic Elevation Contour Lines across background */}
                <path
                  d="M 20 85 Q 340 60 660 90"
                  fill="none"
                  stroke="#065f46"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  opacity="0.55"
                />
                <path
                  d="M 20 185 Q 340 165 660 195"
                  fill="none"
                  stroke="#065f46"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  opacity="0.55"
                />
                <path
                  d="M 20 285 Q 340 265 660 295"
                  fill="none"
                  stroke="#065f46"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  opacity="0.55"
                />

                {/* Top Header Strip inside SVG: Compass + Slope Direction + GPS */}
                <text
                  x="68"
                  y="24"
                  fill="#a8a29e"
                  fontSize="10"
                  fontWeight="700"
                >
                  ▲ UPSLOPE RIDGE ({activeFarm.altitude + 10}m ASL) • WEST → EAST SECTORS (1–5)
                </text>
                <text
                  x="648"
                  y="24"
                  fill="#34d399"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="end"
                >
                  GPS: {(activeFarm.latitude ?? -1.501).toFixed(4)}°S,{" "}
                  {(activeFarm.longitude ?? 29.635).toFixed(4)}°E
                </text>

                {/* Column Header Labels (1..5) */}
                {COL_LABELS.map((col, cIdx) => {
                  const xCenter = 68 + cIdx * 116 + 54;
                  return (
                    <text
                      key={`col-lbl-${col}`}
                      x={xCenter}
                      y="44"
                      fill="#d6d3d1"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      Sector {col}
                    </text>
                  );
                })}

                {/* Row Labels (A..D) and 4x5 Interactive Sub-Plot Cells */}
                {ROW_LABELS.map((rowLbl, rIdx) => {
                  const yTop = 54 + rIdx * 80;
                  return (
                    <g key={`row-grp-${rowLbl}`}>
                      <text
                        x="34"
                        y={yTop + 36}
                        fill="#d6d3d1"
                        fontSize="11"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        Row {rowLbl}
                      </text>
                      <text
                        x="34"
                        y={yTop + 50}
                        fill="#78716c"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {activeFarm.altitude + Math.round((1.5 - rIdx) * 6)}m
                      </text>
                    </g>
                  );
                })}

                {/* Render 20 Sub-Plot Cells */}
                {gridCells.map((cell) => {
                  const x = 68 + cell.colIdx * 116;
                  const y = 54 + cell.rowIdx * 80;
                  const w = 108;
                  const h = 72;
                  const isSelected = cell.cellId === selectedCell.cellId;
                  const style = getCellVisualStyle(cell, activeLayer);

                  return (
                    <g
                      key={cell.cellId}
                      onClick={() => setSelectedCellId(cell.cellId)}
                      className="cursor-pointer transition-opacity hover:opacity-95"
                    >
                      {/* Cell Rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx="10"
                        fill={style.fill}
                        stroke={isSelected ? "#ffffff" : style.stroke}
                        strokeWidth={isSelected ? 3.2 : 1.6}
                      />

                      {/* Selected Halo Ring */}
                      {isSelected && (
                        <rect
                          x={x - 3}
                          y={y - 3}
                          width={w + 6}
                          height={h + 6}
                          rx="12"
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Cell ID Badge (Top-Left) */}
                      <rect
                        x={x + 6}
                        y={y + 6}
                        width="24"
                        height="16"
                        rx="4"
                        fill={style.stroke}
                      />
                      <text
                        x={x + 18}
                        y={y + 17}
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {cell.cellId}
                      </text>

                      {/* IoT Sensor Node Indicator (Top-Right) */}
                      {cell.hasSensorNode && (
                        <g>
                          <circle
                            cx={x + w - 14}
                            cy={y + 14}
                            r="6"
                            fill="#0f172a"
                          />
                          <circle
                            cx={x + w - 14}
                            cy={y + 14}
                            r="3.5"
                            fill="#38bdf8"
                          />
                        </g>
                      )}

                      {/* Primary Metric Value (Center) */}
                      <text
                        x={x + w / 2}
                        y={y + 42}
                        fill={style.textColor}
                        fontSize="15"
                        fontWeight="900"
                        textAnchor="middle"
                      >
                        {style.valueLabel}
                      </text>

                      {/* Sub-Label (Bottom) */}
                      <text
                        x={x + w / 2}
                        y={y + 60}
                        fill={style.textColor}
                        fontSize="9.5"
                        fontWeight="700"
                        textAnchor="middle"
                        opacity="0.85"
                      >
                        {style.subLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Valley Drainage Channel Footer Strip inside SVG */}
                <path
                  d="M 68 386 L 640 386"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeDasharray="8 4"
                />
                <text
                  x="68"
                  y="404"
                  fill="#38bdf8"
                  fontSize="10"
                  fontWeight="700"
                >
                  ▼ VALLEY FOOT-SLOPE & CONTOUR DRAINAGE CHANNEL ({activeFarm.altitude - 9}m ASL)
                </text>
                <text
                  x="640"
                  y="404"
                  fill="#a8a29e"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                >
                  ● Blue Dot = Active IoT Soil Probe • Click any cell (A1–D5) to inspect & calibrate
                </text>
              </svg>
            </div>
          </div>

          {/* Right 5 Cols: Selected Sub-Plot Inspector & Variable-Rate Prescription Controls */}
          <div className="xl:col-span-5 flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-4 space-y-4">
            <div className="space-y-3">
              {/* Sub-Plot Header */}
              <div className="flex items-start justify-between gap-2 border-b border-stone-200 dark:border-stone-700 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-800 text-white text-xs font-black">
                      Zone {selectedCell.cellId}
                    </span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      {language === "rw"
                        ? selectedCell.slopeZoneLabelRw
                        : selectedCell.slopeZoneLabelEn}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {selectedCell.elevationMeters}m ASL • {selectedCell.areaHa} Ha •{" "}
                    {selectedCell.hasSensorNode
                      ? `IoT Probe: ${selectedCell.sensorNodeId}`
                      : language === "rw"
                        ? "Igipimo cya Topografiya & NPK"
                        : "Topographic & NPK Interpolated Zone"}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase ${
                    selectedCell.status === "optimal"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : selectedCell.status === "moderate"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}
                >
                  {selectedCell.compositeScore}/100 • {selectedCell.status}
                </span>
              </div>

              {/* 6-Metric Micro-Zone Readout Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    {language === "rw" ? "Ubuhehere (Moisture)" : "Moisture (VWC)"}
                  </span>
                  <span className="text-sm font-black text-teal-700 dark:text-teal-400">
                    {selectedCell.moisturePct}%
                  </span>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${selectedCell.moisturePct}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    {language === "rw" ? "Azote (Nitrogen)" : "Nitrogen (N)"}
                  </span>
                  <span className="text-sm font-black text-green-700 dark:text-green-400">
                    {selectedCell.nitrogenMgKg} mg/kg
                  </span>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{
                        width: `${Math.min(100, selectedCell.nitrogenMgKg)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    {language === "rw" ? "Fosifore (Phosphorus)" : "Phosphorus (P)"}
                  </span>
                  <span className="text-sm font-black text-purple-700 dark:text-purple-400">
                    {selectedCell.phosphorusMgKg} mg/kg
                  </span>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${Math.min(100, selectedCell.phosphorusMgKg * 1.8)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    {language === "rw" ? "Potasiyumu (K)" : "Potassium (K)"}
                  </span>
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                    {selectedCell.potassiumMgKg} mg/kg
                  </span>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${Math.min(100, selectedCell.potassiumMgKg / 2.5)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    {language === "rw" ? "Aside (Soil pH)" : "Soil pH & EC"}
                  </span>
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                    pH {selectedCell.soilPh}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    EC: {selectedCell.ecDsM} dS/m
                  </span>
                </div>

                <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 font-semibold block">
                    {language === "rw" ? "Imborera & Ubushyuhe" : "Organic Matter & Temp"}
                  </span>
                  <span className="text-sm font-black text-stone-800 dark:text-stone-200">
                    {selectedCell.organicMatterPct}% OM
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Soil Temp: {selectedCell.soilTempC}°C
                  </span>
                </div>
              </div>

              {/* Interactive Probe Calibration Sliders for Selected Sub-Plot */}
              <div className="bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-700 dark:text-stone-300">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                    {language === "rw"
                      ? `Hindura Ibipimo bya Zone ${selectedCell.cellId} (Probe Calibration):`
                      : `Calibrate Zone ${selectedCell.cellId} Sensor / Probe Values:`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCellOverridesByFarm((prev) => ({
                        ...prev,
                        [activeFarm.id]: {},
                      }))
                    }
                    className="text-[10px] text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
                  >
                    {language === "rw" ? "Subiza ku mimerere" : "Reset All Zones"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="flex justify-between text-stone-600 mb-0.5">
                      <span>Moisture (% VWC)</span>
                      <span className="font-bold text-teal-700">
                        {selectedCell.moisturePct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={92}
                      value={selectedCell.moisturePct}
                      onChange={(e) =>
                        handleUpdateSelectedCellValue({
                          moisturePct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-stone-600 mb-0.5">
                      <span>Nitrogen (mg/kg N)</span>
                      <span className="font-bold text-green-700">
                        {selectedCell.nitrogenMgKg} mg/kg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={115}
                      value={selectedCell.nitrogenMgKg}
                      onChange={(e) =>
                        handleUpdateSelectedCellValue({
                          nitrogenMgKg: Number(e.target.value),
                        })
                      }
                      className="w-full accent-green-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Agronomic Diagnosis & Variable-Rate Prescription Box */}
              <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-xs">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    {language === "rw"
                      ? selectedCell.limitingFactorRw
                      : selectedCell.limitingFactorEn}
                  </span>
                </div>
                <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                  {language === "rw"
                    ? selectedCell.prescriptionRw
                    : selectedCell.prescriptionEn}
                </p>
              </div>
            </div>

            {/* Action Buttons for Selected Micro-Zone */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleScheduleZoneIrrigation}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-colors cursor-pointer"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? `Kuhira Zone ${selectedCell.cellId}`
                    : `Spot-Irrigate Zone ${selectedCell.cellId}`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleScheduleZoneNutrientTask}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition-colors cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>
                  {language === "rw"
                    ? `Shyiramo NPK muri ${selectedCell.cellId}`
                    : `Apply NPK to Zone ${selectedCell.cellId}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MULTI-PARCEL REGIONAL OVERVIEW MAP (ALL FARMER PARCELS) */
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {effectiveFarms.map((farm) => {
              const cells = generateParcelSubPlotGrid(
                farm,
                sensorReadingsByFarmId[farm.id],
                fertilizerApplications.filter((a) => a.farmId === farm.id),
                simulationPreset,
                cellOverridesByFarm[farm.id] || {}
              );
              const avgMoist = Math.round(
                cells.reduce((s, c) => s + c.moisturePct, 0) / cells.length
              );
              const avgN = Math.round(
                cells.reduce((s, c) => s + c.nitrogenMgKg, 0) / cells.length
              );
              const avgP = Math.round(
                cells.reduce((s, c) => s + c.phosphorusMgKg, 0) / cells.length
              );
              const avgK = Math.round(
                cells.reduce((s, c) => s + c.potassiumMgKg, 0) / cells.length
              );
              const avgScore = Math.round(
                cells.reduce((s, c) => s + c.compositeScore, 0) / cells.length
              );
              const isCurrent = farm.id === activeFarm.id;

              return (
                <div
                  key={farm.id}
                  onClick={() => {
                    setSelectedFarmId(farm.id);
                    setMapMode("parcel_grid");
                  }}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    isCurrent
                      ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm"
                      : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        {farm.agroZone} • {farm.altitude}m
                      </span>
                      <h4 className="text-sm font-black text-stone-900 dark:text-white mt-0.5">
                        {farm.name}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {farm.district} ({farm.sector}) • {farm.size} Ha
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-emerald-800 text-white text-xs font-black">
                      {avgScore}/100
                    </span>
                  </div>

                  {/* Mini 4x5 SVG Preview Grid */}
                  <div className="mt-3 rounded-xl bg-stone-950 p-2">
                    <svg viewBox="0 0 210 120" className="w-full h-auto">
                      {cells.map((c) => {
                        const st = getCellVisualStyle(c, activeLayer);
                        return (
                          <rect
                            key={c.cellId}
                            x={5 + c.colIdx * 40}
                            y={5 + c.rowIdx * 28}
                            width="36"
                            height="24"
                            rx="4"
                            fill={st.fill}
                            stroke={st.stroke}
                            strokeWidth="1"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                      <span className="text-[10px] text-stone-500 block">
                        Moisture
                      </span>
                      <span className="font-bold text-teal-700 dark:text-teal-400">
                        {avgMoist}% VWC
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800">
                      <span className="text-[10px] text-stone-500 block">
                        NPK (mg/kg)
                      </span>
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {avgN} - {avgP} - {avgK}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
