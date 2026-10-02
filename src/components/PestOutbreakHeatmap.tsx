import React, { useState, useMemo } from "react";
import { Language, CropDiagnosis, Farm, FarmActivity } from "../types";
import {
  RWANDA_DISTRICT_COORDS,
  projectRwandaLatLngToSvg,
} from "./GpsCoordinatePicker";
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  MapPin,
  Filter,
  Info,
  Calendar,
  Layers,
  Sprout,
  Compass,
  CheckCircle2,
  Bug,
  Activity,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  FlaskConical,
  ArrowUpRight,
  Radio,
  Crosshair,
} from "lucide-react";

export interface OutbreakHotspot {
  id: string;
  district: string;
  province: string;
  sector: string;
  crop: string;
  pestNameRw: string;
  pestNameEn: string;
  pathogen: string;
  severity: "critical" | "high" | "medium" | "low";
  activeCasesCount: number;
  riskScore: number; // 0 - 100 calculated from historical diagnoses
  avgConfidence: number;
  spreadVelocity: "fast" | "moderate" | "contained";
  proximityKmToUserFarm: number;
  nearestFarmName: string;
  nearestFarmId: string;
  threatLevel: "imminent" | "elevated" | "monitoring";
  recommendedDefenseRw: string;
  recommendedDefenseEn: string;
  recommendedChemical: string;
  rabGuideline: string;
  coordinates: {
    lat: number;
    lng: number;
    svgX: number;
    svgY: number;
  };
  lastDetected: string;
  matchingDiagnoses: CropDiagnosis[];
  zoneId: string;
}

interface RegionalZoneDefinition {
  id: string;
  nameRw: string;
  nameEn: string;
  agroEcologyRw: string;
  agroEcologyEn: string;
  districts: string[];
  polygonPoints: string;
  labelX: number;
  labelY: number;
}

const RWANDA_REGIONAL_ZONES: RegionalZoneDefinition[] = [
  {
    id: "zone-north",
    nameRw: "Intara y'Amajyaruguru & Ibirunga",
    nameEn: "Northern Volcanic Highlands",
    agroEcologyRw: "Ibirunga & Imisozi Miremire (2,200m+)",
    agroEcologyEn: "High-Altitude Volcanic Belt (High Humidity)",
    districts: ["Musanze", "Nyabihu", "Burera", "Gicumbi", "Rulindo"],
    polygonPoints: "135,52 175,30 235,28 298,42 308,95 235,115 155,105",
    labelX: 218,
    labelY: 68,
  },
  {
    id: "zone-east",
    nameRw: "Intara y'Iburasirazuba (Savannah)",
    nameEn: "Eastern Savannah Corridor",
    agroEcologyRw: "Umutara & Iburasirazuba bw'Izuba",
    agroEcologyEn: "Warm Lowland Cereal & Legume Belt",
    districts: ["Nyagatare", "Gatsibo", "Kayonza", "Rwamagana", "Kirehe", "Ngoma"],
    polygonPoints: "300,42 365,48 415,74 435,148 418,225 385,275 322,265 312,165 308,95",
    labelX: 368,
    labelY: 145,
  },
  {
    id: "zone-west",
    nameRw: "Intara y'Iburengerazuba (Kivu Belt)",
    nameEn: "Lake Kivu & Congo-Nile Crest",
    agroEcologyRw: "Inkombe z'Ikiyaga cya Kivu",
    agroEcologyEn: "Lake Kivu Humid Horticultural Corridor",
    districts: ["Rubavu", "Karongi", "Rutsiro", "Nyamasheke", "Rusizi"],
    polygonPoints: "135,52 155,105 182,165 162,235 135,275 102,210 92,152 112,102",
    labelX: 136,
    labelY: 168,
  },
  {
    id: "zone-central",
    nameRw: "Kigali & Ikibaya cya Bugesera",
    nameEn: "Central Plateau & Bugesera Basin",
    agroEcologyRw: "Kigali & Bugesera",
    agroEcologyEn: "Central Mid-Altitude & Bugesera Basin",
    districts: ["Bugesera", "Gasabo", "Kicukiro", "Nyarugenge"],
    polygonPoints: "235,115 308,95 312,165 322,265 268,268 232,215 182,165",
    labelX: 268,
    labelY: 186,
  },
  {
    id: "zone-south",
    nameRw: "Intara y'Amajyepfo (Huye-Nyamagabe)",
    nameEn: "Southern Plateau & Highlands",
    agroEcologyRw: "Imisozi y'Amajyepfo",
    agroEcologyEn: "Southern Intensive Mixed Cropping Zone",
    districts: ["Huye", "Nyamagabe", "Nyanza", "Ruhango", "Muhanga", "Kamonyi", "Gisagara"],
    polygonPoints: "162,235 182,165 232,215 268,268 322,265 348,312 280,345 205,345 158,312 135,275",
    labelX: 235,
    labelY: 298,
  },
];

// Haversine distance in km
function computeDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function resolveZoneIdForDistrict(district: string): string {
  const normalized = district.trim().toLowerCase();
  for (const zone of RWANDA_REGIONAL_ZONES) {
    if (zone.districts.some((d) => normalized.includes(d.toLowerCase()))) {
      return zone.id;
    }
  }
  return "zone-north";
}

interface PestOutbreakHeatmapProps {
  language: Language;
  diagnoses?: CropDiagnosis[];
  farms: Farm[];
  onNavigateToCropDoctor?: () => void;
  onNavigateToActivities?: () => void;
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
  onAddDiagnosis?: (diagnosis: CropDiagnosis) => void;
}

export const PestOutbreakHeatmap: React.FC<PestOutbreakHeatmapProps> = ({
  language,
  diagnoses = [],
  farms = [],
  onNavigateToCropDoctor,
  onNavigateToActivities,
  onCreateActivity,
  onAddDiagnosis,
}) => {
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>("all");
  const [selectedThreatFilter, setSelectedThreatFilter] = useState<string>("all");
  const [selectedPathogenFilter, setSelectedPathogenFilter] = useState<string>("all");
  const [mapLayerMode, setMapLayerMode] = useState<
    "zones_and_pins" | "heatmap_contours" | "pins_only"
  >("zones_and_pins");
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>("");
  const [selectedDiagnosisPinId, setSelectedDiagnosisPinId] = useState<
    string | null
  >(null);
  const [showRABProtocolModal, setShowRABProtocolModal] = useState<boolean>(false);
  const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
  const [scheduledToastMsg, setScheduledToastMsg] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  // Local simulated diagnoses when user tests adding a new outbreak pattern on the map
  const [localSimulatedDiagnoses, setLocalSimulatedDiagnoses] = useState<
    CropDiagnosis[]
  >([]);

  // Simulation form state
  const [simDistrict, setSimDistrict] = useState<string>("Musanze");
  const [simDiseasePreset, setSimDiseasePreset] = useState<string>("late_blight");
  const [simSeverity, setSimSeverity] = useState<"critical" | "high" | "medium">(
    "critical"
  );

  // Combine prop diagnoses with any locally simulated field diagnoses
  const allDiagnoses = useMemo(() => {
    return [...localSimulatedDiagnoses, ...diagnoses];
  }, [localSimulatedDiagnoses, diagnoses]);

  // Enrich each diagnosis with resolved district, coordinates, SVG projection, and regional zone
  const geoDiagnoses = useMemo(() => {
    return allDiagnoses.map((diag, idx) => {
      const linkedFarm = farms.find((f) => f.id === diag.farmId);
      const district =
        diag.district || linkedFarm?.district || "Musanze";
      const sector = diag.sector || linkedFarm?.sector || "Kinigi";
      const districtRef =
        RWANDA_DISTRICT_COORDS[district] || RWANDA_DISTRICT_COORDS["Musanze"];

      // Deterministic slight offset if multiple diagnoses share the exact same lat/lng so pins don't overlap completely
      const jitterLat = ((idx % 5) - 2) * 0.012;
      const jitterLng = (((idx * 3) % 5) - 2) * 0.012;

      const lat =
        diag.latitude ??
        linkedFarm?.latitude ??
        Number((districtRef.lat + jitterLat).toFixed(4));
      const lng =
        diag.longitude ??
        linkedFarm?.longitude ??
        Number((districtRef.lng + jitterLng).toFixed(4));

      const svgPt = projectRwandaLatLngToSvg(lat, lng);
      const zoneId = resolveZoneIdForDistrict(district);

      const pathogenLower = (diag.pathogen || "").toLowerCase();
      let pathogenCategory: "fungal" | "insect" | "bacterial_viral" = "fungal";
      if (
        pathogenLower.includes("spodoptera") ||
        pathogenLower.includes("tuta") ||
        pathogenLower.includes("insect") ||
        pathogenLower.includes("gelechiidae")
      ) {
        pathogenCategory = "insect";
      } else if (
        pathogenLower.includes("ralstonia") ||
        pathogenLower.includes("bacteri") ||
        pathogenLower.includes("virus") ||
        pathogenLower.includes("mcmv") ||
        pathogenLower.includes("potyvir")
      ) {
        pathogenCategory = "bacterial_viral";
      }

      return {
        ...diag,
        resolvedDistrict: district,
        resolvedSector: sector,
        resolvedProvince: districtRef.province,
        resolvedLat: lat,
        resolvedLng: lng,
        svgX: svgPt.x,
        svgY: svgPt.y,
        zoneId,
        pathogenCategory,
      };
    });
  }, [allDiagnoses, farms]);

  // Filter diagnoses based on crop & pathogen filters
  const filteredGeoDiagnoses = useMemo(() => {
    return geoDiagnoses.filter((d) => {
      if (selectedCropFilter !== "all") {
        if (!d.cropType.toLowerCase().includes(selectedCropFilter.toLowerCase())) {
          return false;
        }
      }
      if (
        selectedPathogenFilter !== "all" &&
        d.pathogenCategory !== selectedPathogenFilter
      ) {
        return false;
      }
      return true;
    });
  }, [geoDiagnoses, selectedCropFilter, selectedPathogenFilter]);

  // Dynamically compute District & Regional Outbreak Hotspots from `filteredGeoDiagnoses`
  const hotspots: OutbreakHotspot[] = useMemo(() => {
    const byDistrict = new Map<string, typeof filteredGeoDiagnoses>();

    for (const d of filteredGeoDiagnoses) {
      const key = d.resolvedDistrict;
      const list = byDistrict.get(key) || [];
      list.push(d);
      byDistrict.set(key, list);
    }

    const computed: OutbreakHotspot[] = [];

    byDistrict.forEach((diagList, district) => {
      // Sort by severity then date
      const severityRank: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      const sorted = [...diagList].sort((a, b) => {
        const diff =
          (severityRank[b.severity] || 1) - (severityRank[a.severity] || 1);
        if (diff !== 0) return diff;
        return b.diagnosisDate.localeCompare(a.diagnosisDate);
      });

      const primary = sorted[0];
      const criticalCount = diagList.filter((d) => d.severity === "critical").length;
      const highCount = diagList.filter((d) => d.severity === "high").length;
      const mediumCount = diagList.filter((d) => d.severity === "medium").length;
      const lowCount = diagList.filter((d) => d.severity === "low").length;

      // Calculate composite outbreak risk score (0-100) from historical diagnosis patterns
      const rawScore =
        criticalCount * 36 +
        highCount * 26 +
        mediumCount * 16 +
        lowCount * 10 +
        (diagList.length > 1 ? 12 : 0) +
        Math.round(
          diagList.reduce((acc, item) => acc + (item.confidenceScore || 88), 0) /
            diagList.length /
            10
        );
      const riskScore = Math.min(99, Math.max(18, rawScore));

      const maxSeverity: "critical" | "high" | "medium" | "low" =
        criticalCount > 0 || riskScore >= 75
          ? "critical"
          : highCount > 0 || riskScore >= 50
          ? "high"
          : mediumCount > 0
          ? "medium"
          : "low";

      // Compute centroid coordinates of the historical diagnoses in this district
      const avgLat =
        diagList.reduce((s, d) => s + d.resolvedLat, 0) / diagList.length;
      const avgLng =
        diagList.reduce((s, d) => s + d.resolvedLng, 0) / diagList.length;
      const centroidSvg = projectRwandaLatLngToSvg(avgLat, avgLng);

      // Find closest user farm
      let minDistKm = 12.5;
      let nearestFarmName = farms[0]?.name || "Musanze Parcel";
      let nearestFarmId = farms[0]?.id || "farm-1";

      if (farms.length > 0) {
        let best = Infinity;
        for (const farm of farms) {
          const ref =
            RWANDA_DISTRICT_COORDS[farm.district] ||
            RWANDA_DISTRICT_COORDS["Musanze"];
          const fLat = farm.latitude ?? ref.lat;
          const fLng = farm.longitude ?? ref.lng;
          const dist = computeDistanceKm(avgLat, avgLng, fLat, fLng);
          if (dist < best) {
            best = dist;
            nearestFarmName = farm.name;
            nearestFarmId = farm.id;
          }
        }
        // Ensure realistic non-zero field buffer distance (min 1.2 km)
        minDistKm = Math.max(1.2, best);
      }

      const threatLevel: "imminent" | "elevated" | "monitoring" =
        maxSeverity === "critical" || (minDistKm <= 8 && riskScore >= 55)
          ? "imminent"
          : maxSeverity === "high" || riskScore >= 45
          ? "elevated"
          : "monitoring";

      const spreadVelocity: "fast" | "moderate" | "contained" =
        maxSeverity === "critical"
          ? "fast"
          : maxSeverity === "high"
          ? "moderate"
          : "contained";

      const avgConfidence = Math.round(
        diagList.reduce((s, d) => s + (d.confidenceScore || 90), 0) /
          diagList.length
      );

      const distinctSectors = Array.from(
        new Set(diagList.map((d) => d.resolvedSector))
      ).join(" & ");

      const distinctCrops = Array.from(
        new Set(diagList.map((d) => d.cropType.split("(")[0].trim()))
      ).join(" & ");

      // Estimate regional multiplier from confirmed AI diagnoses in district
      const activeCasesCount =
        diagList.length * 6 + criticalCount * 5 + highCount * 3;

      computed.push({
        id: `hotspot-${district.toLowerCase()}`,
        district,
        province: primary.resolvedProvince,
        sector: distinctSectors,
        crop: distinctCrops || primary.cropType,
        pestNameRw: primary.diseaseNameRw,
        pestNameEn: primary.diseaseNameEn,
        pathogen: primary.pathogen,
        severity: maxSeverity,
        activeCasesCount,
        riskScore,
        avgConfidence,
        spreadVelocity,
        proximityKmToUserFarm: minDistKm,
        nearestFarmName,
        nearestFarmId,
        threatLevel,
        recommendedDefenseRw: primary.immediateActionRw,
        recommendedDefenseEn: primary.immediateActionEn,
        recommendedChemical: primary.recommendedChemical,
        rabGuideline: primary.rabCertifiedGuideline,
        coordinates: {
          lat: avgLat,
          lng: avgLng,
          svgX: centroidSvg.x,
          svgY: centroidSvg.y,
        },
        lastDetected: primary.diagnosisDate,
        matchingDiagnoses: sorted,
        zoneId: primary.zoneId,
      });
    });

    return computed.sort((a, b) => b.riskScore - a.riskScore);
  }, [filteredGeoDiagnoses, farms]);

  // Compute Regional Zone Risk Aggregations for the 5 Agro-Ecological Polygon Zones
  const regionalZoneSummaries = useMemo(() => {
    return RWANDA_REGIONAL_ZONES.map((zone) => {
      const zoneHotspots = hotspots.filter((h) => h.zoneId === zone.id);
      const zoneDiagnoses = filteredGeoDiagnoses.filter(
        (d) => d.zoneId === zone.id
      );

      const maxRiskScore =
        zoneHotspots.length > 0
          ? Math.min(
              99,
              Math.max(...zoneHotspots.map((h) => h.riskScore)) +
                (zoneHotspots.length > 1 ? 6 : 0)
            )
          : 12;

      const riskTier: "critical" | "high" | "moderate" | "low" =
        maxRiskScore >= 75
          ? "critical"
          : maxRiskScore >= 50
          ? "high"
          : maxRiskScore >= 25
          ? "moderate"
          : "low";

      return {
        ...zone,
        zoneHotspots,
        zoneDiagnoses,
        diagnosisCount: zoneDiagnoses.length,
        maxRiskScore,
        riskTier,
        primaryHotspot: zoneHotspots[0] || null,
      };
    });
  }, [hotspots, filteredGeoDiagnoses]);

  // Apply Threat Filter to Hotspots
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h) => {
      if (
        selectedThreatFilter !== "all" &&
        h.threatLevel !== selectedThreatFilter
      ) {
        return false;
      }
      return true;
    });
  }, [hotspots, selectedThreatFilter]);

  const activeSelectedHotspot =
    filteredHotspots.find((h) => h.id === selectedHotspotId) ||
    hotspots.find((h) => h.id === selectedHotspotId) ||
    filteredHotspots[0] ||
    hotspots[0];

  const activePinDiagnosis = useMemo(() => {
    if (!selectedDiagnosisPinId) return null;
    return (
      filteredGeoDiagnoses.find((d) => d.id === selectedDiagnosisPinId) || null
    );
  }, [selectedDiagnosisPinId, filteredGeoDiagnoses]);

  const imminentThreatsCount = hotspots.filter(
    (h) => h.threatLevel === "imminent"
  ).length;
  const elevatedThreatsCount = hotspots.filter(
    (h) => h.threatLevel === "elevated"
  ).length;

  // Handle scheduling preventive spray activity from selected hotspot/diagnosis
  const handleSchedulePreventiveSpray = () => {
    if (!activeSelectedHotspot) return;
    const dueDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const targetFarm =
      farms.find((f) => f.id === activeSelectedHotspot.nearestFarmId) ||
      farms[0];

    if (onCreateActivity && targetFarm) {
      onCreateActivity({
        farmId: targetFarm.id,
        farmName: targetFarm.name,
        title:
          language === "rw"
            ? `Gutera umuti ukumira: ${activeSelectedHotspot.pestNameRw.split("(")[0].trim()} (${activeSelectedHotspot.recommendedChemical})`
            : `Preventive Outbreak Spray: ${activeSelectedHotspot.pestNameEn.split("(")[0].trim()} (${activeSelectedHotspot.recommendedChemical})`,
        category: "pest_control",
        dueDate,
        status: "pending",
        assignedTo: "Jean-Paul Habimana (Agronomist)",
        notes: `Triggered by regional outbreak pattern (${activeSelectedHotspot.matchingDiagnoses.length} historical diagnoses in ${activeSelectedHotspot.district}, Risk Score ${activeSelectedHotspot.riskScore}/100). Protocol: ${activeSelectedHotspot.recommendedDefenseEn}`,
      });
      setScheduledToastMsg(
        language === "rw"
          ? `Igikorwa cyo gutera umuti (${activeSelectedHotspot.recommendedChemical}) cyashyizwe ku ngengabihe kuri ${targetFarm.name}!`
          : `Preventive spray task (${activeSelectedHotspot.recommendedChemical}) scheduled for ${targetFarm.name} on ${dueDate}!`
      );
      setTimeout(() => setScheduledToastMsg(null), 5000);
    } else if (onNavigateToActivities) {
      onNavigateToActivities();
    }
  };

  // Handle simulating / logging a new historical diagnosis on the map
  const handleAddSimulatedDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    const presets: Record<
      string,
      {
        cropType: string;
        diseaseNameRw: string;
        diseaseNameEn: string;
        pathogen: string;
        chemical: string;
        actionRw: string;
        actionEn: string;
        guideline: string;
      }
    > = {
      late_blight: {
        cropType: "Ibirayi (Irish Potatoes)",
        diseaseNameRw: "Urume / Mirasire y'Ibirayi (Late Blight)",
        diseaseNameEn: "Potato Late Blight (Phytophthora infestans)",
        pathogen: "Phytophthora infestans (Oomycete)",
        chemical: "Ridomil Gold MZ 68 WG (2.5 kg/ha)",
        actionRw:
          "Hagarika kuhira hejuru ku mababi; tera Ridomil Gold MZ 68 WG ako kanya.",
        actionEn:
          "Stop overhead irrigation immediately; apply systemic Ridomil Gold MZ 68 WG.",
        guideline: "RAB Highland Potato Protection SOP 2026",
      },
      fall_armyworm: {
        cropType: "Ibigori (Maize)",
        diseaseNameRw: "Nkongwa Ibyasi (Fall Armyworm)",
        diseaseNameEn: "Fall Armyworm (Spodoptera frugiperda)",
        pathogen: "Spodoptera frugiperda (Insect Pest)",
        chemical: "Ampligo 150 ZC (100 ml/ha) cyangwa Radiant 120 SC",
        actionRw:
          "Tera Ampligo 150 ZC mu mutima w'ikigori nimugoroba; tega feromone.",
        actionEn:
          "Drench maize whorls with Ampligo 150 ZC at dusk and deploy pheromone traps.",
        guideline: "RAB Cereal Pest Containment Protocol",
      },
      tuta_absoluta: {
        cropType: "Inyanya (Tomato)",
        diseaseNameRw: "Ikirondamababi cy'Inyanya (Tuta Absoluta)",
        diseaseNameEn: "Tomato Leafminer (Tuta absoluta)",
        pathogen: "Tuta absoluta (Gelechiidae)",
        chemical: "Coragen 20 SC (60 ml/ha)",
        actionRw:
          "Shyiraho imitego ya feromone n'amazi arimo amavuta; tera Coragen 20 SC.",
        actionEn:
          "Deploy delta pheromone water traps and spray Chlorantraniliprole (Coragen 20 SC).",
        guideline: "RAB Horticulture Biosecurity Guideline",
      },
      bacterial_wilt: {
        cropType: "Ibirayi & Inyanya",
        diseaseNameRw: "Ubwuma bw'Imbuto n'Imizi (Bacterial Wilt)",
        diseaseNameEn: "Bacterial Wilt (Ralstonia solanacearum)",
        pathogen: "Ralstonia solanacearum (Bacterium)",
        chemical: "10% Sodium Hypochlorite Tool Disinfection + Agricultural Lime",
        actionRw:
          "Rimbura ibiti byafashwe ubitwike; sukura amasuka na Javel 10%.",
        actionEn:
          "Rogue and burn infected plants; quarantine soil runoff and sterilize tools.",
        guideline: "RAB Quarantine Alert: 3-Year Solanaceae Rotation",
      },
    };

    const preset = presets[simDiseasePreset] || presets.late_blight;
    const coordRef =
      RWANDA_DISTRICT_COORDS[simDistrict] || RWANDA_DISTRICT_COORDS["Musanze"];
    const jitterLat = (Math.random() - 0.5) * 0.035;
    const jitterLng = (Math.random() - 0.5) * 0.035;

    const newDiag: CropDiagnosis = {
      id: `diag-sim-${Date.now()}`,
      farmId: farms[0]?.id || "farm-1",
      cropType: preset.cropType,
      imageUrl:
        "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80",
      diagnosisDate: new Date().toISOString().split("T")[0],
      diseaseNameRw: preset.diseaseNameRw,
      diseaseNameEn: preset.diseaseNameEn,
      pathogen: preset.pathogen,
      confidenceScore: 94,
      severity: simSeverity,
      symptomsObserved: [
        "Field scouting GPS report logged onto regional outbreak radar",
      ],
      immediateActionRw: preset.actionRw,
      immediateActionEn: preset.actionEn,
      recommendedChemical: preset.chemical,
      organicAlternative: "Neem oil extract + certified clean seed stock",
      preventionAdviceRw:
        "Kurikirana imirima ihana imbibi buri minsi 3 mu gihe cy'imvura.",
      rabCertifiedGuideline: preset.guideline,
      district: simDistrict,
      sector: `${simDistrict} Sector`,
      latitude: Number((coordRef.lat + jitterLat).toFixed(4)),
      longitude: Number((coordRef.lng + jitterLng).toFixed(4)),
    };

    if (onAddDiagnosis) {
      onAddDiagnosis(newDiag);
    } else {
      setLocalSimulatedDiagnoses((prev) => [newDiag, ...prev]);
    }
    setSelectedHotspotId(`hotspot-${simDistrict.toLowerCase()}`);
    setSelectedDiagnosisPinId(newDiag.id);
    setShowSimulateModal(false);
  };

  if (!activeSelectedHotspot) return null;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-rose-950 via-stone-900 to-emerald-950 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
              <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-400/30 font-semibold">
                  {language === "rw"
                    ? "IKARITA Y'IBYOREZO BISHINGIYE KURI DIAGNOSES"
                    : "HISTORICAL DIAGNOSIS OUTBREAK RISK RADAR"}
                </span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-white/10 text-amber-300 border border-white/15">
                  {allDiagnoses.length}{" "}
                  {language === "rw"
                    ? "Isuzuma rya AI Ryasesenguwe"
                    : "Historical Diagnoses Mapped"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 tracking-tight">
                {language === "rw"
                  ? "Ikarita y'Uturere dufite Ibyago by'Ibyorezo n'Indwara z'Ibihingwa"
                  : language === "fr"
                  ? "Carte Régionale des Zones à Risque d'Épidémies Agricoles"
                  : "Regional Pest & Disease Outbreak Risk Zone Map"}
              </h3>
              <p className="text-xs text-stone-300 mt-0.5 max-w-3xl">
                {language === "rw"
                  ? " Iyi karita ikoresha amateka y'indwara zasuzumwe (diagnoses array) mu kugaragaza uturere dufite ibyago byinshi n'intera iri hagati y'icyorezo n'imirima yawe."
                  : "Spatial risk polygons and hotspot clusters computed directly from historical crop diagnosis patterns (severity, pathogen recurrence & GPS proximity to your parcels)."}
              </p>
            </div>
          </div>

          {/* Key Outbreak Metrics & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-400/30 text-xs font-bold font-mono tabular-nums">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>
                {imminentThreatsCount}{" "}
                {language === "rw" ? "Uturere turi mu Kaga" : "Critical Zones"}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 text-xs font-bold font-mono tabular-nums">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {elevatedThreatsCount}{" "}
                {language === "rw" ? "Biri Gukurikiranwa" : "Elevated Zones"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSimulateModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "+ Andika Isuzuma ku Ikarita"
                  : "+ Log Field Diagnosis on Map"}
              </span>
            </button>

            {onNavigateToCropDoctor && (
              <button
                type="button"
                onClick={onNavigateToCropDoctor}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-2xs"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Muganga w'Ibihingwa" : "AI Crop Doctor"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Map Layer Controls Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-stone-300 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {language === "rw" ? "Akayunguruzo:" : "Pattern Filters:"}
              </span>
            </span>

            {/* Crop Selector */}
            <select
              aria-label={
                language === "rw" ? "Hitamo Igihingwa" : "Filter by Crop"
              }
              value={selectedCropFilter}
              onChange={(e) => setSelectedCropFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-medium cursor-pointer text-xs"
            >
              <option value="all">
                {language === "rw"
                  ? "Ibihingwa Byose (All Crops)"
                  : "All Crops"}
              </option>
              <option value="ibirayi">
                {language === "rw"
                  ? "Ibirayi (Irish Potatoes)"
                  : "Irish Potatoes (Ibirayi)"}
              </option>
              <option value="ibigori">
                {language === "rw" ? "Ibigori (Maize)" : "Maize (Ibigori)"}
              </option>
              <option value="inyanya">
                {language === "rw"
                  ? "Inyanya (Tomatoes)"
                  : "Tomatoes (Inyanya)"}
              </option>
              <option value="ibishyimbo">
                {language === "rw"
                  ? "Ibishyimbo (Beans)"
                  : "Climbing Beans (Ibishyimbo)"}
              </option>
              <option value="imyumbati">
                {language === "rw"
                  ? "Imyumbati (Cassava)"
                  : "Cassava (Imyumbati)"}
              </option>
            </select>

            {/* Pathogen Class Filter */}
            <select
              aria-label="Filter by Pathogen Type"
              value={selectedPathogenFilter}
              onChange={(e) => setSelectedPathogenFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-medium cursor-pointer text-xs"
            >
              <option value="all">
                {language === "rw"
                  ? "Indwara & Udusimba Byose"
                  : "All Pathogen Classes"}
              </option>
              <option value="fungal">
                {language === "rw"
                  ? "Urubobi / Urume (Fungal & Oomycete)"
                  : "Fungal & Oomycete (Blight/Anthracnose)"}
              </option>
              <option value="insect">
                {language === "rw"
                  ? "Udusimba (FAW / Tuta Absoluta)"
                  : "Migratory Insect Pests (FAW / Tuta)"}
              </option>
              <option value="bacterial_viral">
                {language === "rw"
                  ? "Bagiteri na Virusi (Wilt / MLND / CBSD)"
                  : "Bacterial & Viral (Wilt / MLND / CBSD)"}
              </option>
            </select>

            {/* Threat Level */}
            <div className="inline-flex rounded-lg p-0.5 bg-stone-800 border border-stone-700">
              <button
                type="button"
                onClick={() => setSelectedThreatFilter("all")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  selectedThreatFilter === "all"
                    ? "bg-emerald-600 text-white"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                {language === "rw" ? "Byose" : "All Zones"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedThreatFilter("imminent")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  selectedThreatFilter === "imminent"
                    ? "bg-rose-600 text-white"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                {language === "rw" ? "Critical" : "Critical"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedThreatFilter("elevated")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  selectedThreatFilter === "elevated"
                    ? "bg-amber-500 text-stone-950"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                {language === "rw" ? "High Risk" : "High Risk"}
              </button>
            </div>
          </div>

          {/* Map Layer Mode Switcher */}
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-stone-400" />
            <div className="inline-flex rounded-lg p-0.5 bg-stone-800 border border-stone-700">
              <button
                type="button"
                onClick={() => setMapLayerMode("zones_and_pins")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  mapLayerMode === "zones_and_pins"
                    ? "bg-white text-stone-900"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                {language === "rw" ? "Uturere & Pins" : "Risk Polygons + Pins"}
              </button>
              <button
                type="button"
                onClick={() => setMapLayerMode("heatmap_contours")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  mapLayerMode === "heatmap_contours"
                    ? "bg-white text-stone-900"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                {language === "rw" ? "bushyuhe (Heatmap)" : "Thermal Contours"}
              </button>
              <button
                type="button"
                onClick={() => setMapLayerMode("pins_only")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  mapLayerMode === "pins_only"
                    ? "bg-white text-stone-900"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                {language === "rw" ? "Diagnoses Zonyine" : "Diagnosis Pins"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Spray Toast Feedback */}
      {scheduledToastMsg && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{scheduledToastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduledToastMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Regional Risk Zone KPI Strip (5 Agro-Ecological Zones of Rwanda) */}
      <div className="px-4 sm:px-5 pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {regionalZoneSummaries.map((zone) => {
          const isZoneSelected = activeSelectedHotspot?.zoneId === zone.id;
          const badgeColors =
            zone.riskTier === "critical"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              : zone.riskTier === "high"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200";

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                if (zone.primaryHotspot) {
                  setSelectedHotspotId(zone.primaryHotspot.id);
                  setSelectedDiagnosisPinId(null);
                }
              }}
              className={`text-left p-2.5 rounded-xl border transition-all ${badgeColors} ${
                isZoneSelected ? "ring-2 ring-rose-500 shadow-xs" : "opacity-90 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono uppercase font-black tracking-wider truncate">
                  {language === "rw" ? zone.nameRw : zone.nameEn}
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                    zone.riskTier === "critical"
                      ? "bg-rose-600 text-white"
                      : zone.riskTier === "high"
                      ? "bg-amber-500 text-stone-950"
                      : "bg-emerald-700 text-white"
                  }`}
                >
                  {zone.maxRiskScore}/100
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold truncate">
                  {zone.primaryHotspot
                    ? zone.primaryHotspot.pestNameEn.split("(")[0].trim()
                    : language === "rw"
                    ? "Nta cyorezo"
                    : "Low Activity"}
                </span>
                <span className="font-mono text-[10px] opacity-80 shrink-0 ml-1">
                  {zone.diagnosisCount} diag.
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Heatmap Visual & Detail Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Rwanda Interactive Geospatial Risk Zone Map (7 Cols) */}
        <div className="lg:col-span-7 bg-stone-950 rounded-2xl p-4 relative border border-stone-800 overflow-hidden min-h-[430px] flex flex-col justify-between shadow-inner">
          {/* Top Map Legend & Zoom Controls */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300 border-b border-stone-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-white tracking-wide">
                RWANDA GEOSPATIAL OUTBREAK RISK ZONES
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/80 border border-rose-300 inline-block" />
                <span className="text-rose-300 font-semibold">
                  Critical Zone (&ge;75)
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/80 border border-amber-300 inline-block" />
                <span className="text-amber-300 font-semibold">
                  High Risk (50-74)
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-emerald-300 font-semibold">
                  Your Farms ({farms.length})
                </span>
              </span>
              {/* Zoom buttons */}
              <div className="inline-flex items-center rounded-lg bg-stone-900 border border-stone-700 p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.2).toFixed(1))))}
                  title="Zoom In"
                  className="p-1 text-stone-300 hover:text-white"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
                  title="Zoom Out"
                  className="p-1 text-stone-300 hover:text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Reset View"
                  className="p-1 text-stone-300 hover:text-white"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Rwanda Stylized SVG Geospatial Projection */}
          <div className="relative my-2 flex-1 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 500 380"
              className="w-full h-full max-h-[360px] select-none transition-transform duration-300"
              style={{ transform: `scale(${zoom})` }}
            >
              <defs>
                {/* Hotspot Radial Glows */}
                <radialGradient id="criticalGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="55%" stopColor="#f43f5e" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="elevatedGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#d97706" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="moderateGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#eab308" stopOpacity="0.7" />
                  <stop offset="65%" stopColor="#ca8a04" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#854d0e" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="farmGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#059669" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                </radialGradient>
                <linearGradient
                  id="rwandaLandGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#1c1917" />
                  <stop offset="50%" stopColor="#0c0a09" />
                  <stop offset="100%" stopColor="#1c1917" />
                </linearGradient>
              </defs>

              {/* Rwanda Geographic Outline Boundary */}
              <path
                d="M 170 30 
                   Q 220 20 280 35 
                   Q 350 40 410 70 
                   Q 440 110 435 150 
                   Q 425 210 395 270 
                   Q 355 330 280 345 
                   Q 215 350 180 330 
                   Q 150 310 135 270 
                   Q 120 240 100 200 
                   Q 80 160 110 110 
                   Q 135 60 170 30 Z"
                fill="url(#rwandaLandGrad)"
                stroke="#44403c"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* LAYER 1: Regional Outbreak Risk Zone Polygons computed from `diagnoses` */}
              {mapLayerMode !== "pins_only" &&
                regionalZoneSummaries.map((zone) => {
                  const isZoneActive = activeSelectedHotspot?.zoneId === zone.id;
                  const fillColor =
                    zone.riskTier === "critical"
                      ? "rgba(239, 68, 68, 0.24)"
                      : zone.riskTier === "high"
                      ? "rgba(245, 158, 11, 0.20)"
                      : "rgba(16, 185, 129, 0.12)";
                  const strokeColor =
                    zone.riskTier === "critical"
                      ? "#f43f5e"
                      : zone.riskTier === "high"
                      ? "#f59e0b"
                      : "#10b981";

                  return (
                    <g
                      key={zone.id}
                      onClick={() => {
                        if (zone.primaryHotspot) {
                          setSelectedHotspotId(zone.primaryHotspot.id);
                          setSelectedDiagnosisPinId(null);
                        }
                      }}
                      className="cursor-pointer transition-opacity hover:opacity-95"
                    >
                      <polygon
                        points={zone.polygonPoints}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isZoneActive ? "2.4" : "1.2"}
                        strokeDasharray={isZoneActive ? "none" : "5 3"}
                      />
                      {/* Regional Risk Score Label on Map */}
                      <rect
                        x={zone.labelX - 38}
                        y={zone.labelY - 10}
                        width="76"
                        height="18"
                        rx="4"
                        fill="#0c0a09"
                        fillOpacity="0.78"
                        stroke={strokeColor}
                        strokeWidth="0.9"
                      />
                      <text
                        x={zone.labelX}
                        y={zone.labelY + 2}
                        fill="#f5f5f4"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {zone.nameEn.split(" ")[0].toUpperCase()} • {zone.maxRiskScore}%
                      </text>
                    </g>
                  );
                })}

              {/* Lake Kivu & Water Body indication (West) */}
              <path
                d="M 95 120 Q 75 160 95 210 Q 115 250 95 285"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeDasharray="3 3"
                fill="none"
                opacity="0.7"
              />
              <text
                x="55"
                y="200"
                fill="#38bdf8"
                fontSize="9.5"
                opacity="0.8"
                fontFamily="sans-serif"
              >
                Lake Kivu
              </text>

              {/* Capital City Reference */}
              <text
                x="252"
                y="168"
                fill="#e7e5e4"
                fontSize="10.5"
                fontWeight="bold"
              >
                ★ Kigali
              </text>

              {/* LAYER 2: District Outbreak Thermal Contours & Centroids */}
              {filteredHotspots.map((hotspot) => {
                const cx = hotspot.coordinates.svgX;
                const cy = hotspot.coordinates.svgY;
                const isSelected = hotspot.id === activeSelectedHotspot.id;
                const radius =
                  hotspot.severity === "critical"
                    ? 48
                    : hotspot.severity === "high"
                    ? 36
                    : 26;

                return (
                  <g
                    key={hotspot.id}
                    onClick={() => {
                      setSelectedHotspotId(hotspot.id);
                      setSelectedDiagnosisPinId(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Outbreak Threat Aura */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={
                        hotspot.severity === "critical"
                          ? "url(#criticalGlow)"
                          : hotspot.severity === "high"
                          ? "url(#elevatedGlow)"
                          : "url(#moderateGlow)"
                      }
                      className={
                        hotspot.severity === "critical" ? "animate-pulse" : ""
                      }
                    />
                    {mapLayerMode === "heatmap_contours" && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius * 0.78}
                        stroke={
                          hotspot.severity === "critical"
                            ? "#ef4444"
                            : "#f59e0b"
                        }
                        strokeWidth="1.2"
                        fill="none"
                        opacity="0.65"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius * 0.5}
                      stroke={
                        hotspot.severity === "critical" ? "#ef4444" : "#f59e0b"
                      }
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      fill="none"
                      opacity="0.75"
                    />

                    {/* District Cluster Hub Anchor */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 11 : 8.5}
                      fill={
                        hotspot.severity === "critical"
                          ? "#dc2626"
                          : hotspot.severity === "high"
                          ? "#d97706"
                          : "#ca8a04"
                      }
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.8 : 1.8}
                    />

                    {/* Risk Score inside Cluster Hub */}
                    <text
                      x={cx}
                      y={cy + 3}
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {hotspot.riskScore}
                    </text>

                    {/* District & Diagnosis Count Label */}
                    <text
                      x={cx}
                      y={cy - 15}
                      fill={isSelected ? "#fecdd3" : "#e7e5e4"}
                      fontSize={isSelected ? "10.5" : "9.5"}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {hotspot.district} ({hotspot.matchingDiagnoses.length} diag)
                    </text>
                  </g>
                );
              })}

              {/* LAYER 3: Individual Historical Diagnosis Pins from `diagnoses` array */}
              {mapLayerMode !== "heatmap_contours" &&
                filteredGeoDiagnoses.map((diag) => {
                  const isPinSelected = selectedDiagnosisPinId === diag.id;
                  const pinColor =
                    diag.severity === "critical"
                      ? "#fb7185"
                      : diag.severity === "high"
                      ? "#fbbf24"
                      : "#34d399";

                  return (
                    <g
                      key={diag.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDiagnosisPinId(diag.id);
                        setSelectedHotspotId(
                          `hotspot-${diag.resolvedDistrict.toLowerCase()}`
                        );
                      }}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={diag.svgX}
                        cy={diag.svgY}
                        r={isPinSelected ? 6.5 : 4.2}
                        fill={pinColor}
                        stroke="#0c0a09"
                        strokeWidth="1.5"
                      />
                      {isPinSelected && (
                        <circle
                          cx={diag.svgX}
                          cy={diag.svgY}
                          r={11}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                      )}
                    </g>
                  );
                })}

              {/* LAYER 4: User Farm Location Anchors & Threat Proximity Vector Line */}
              {farms.map((farm, idx) => {
                const ref =
                  RWANDA_DISTRICT_COORDS[farm.district] ||
                  RWANDA_DISTRICT_COORDS["Musanze"];
                const fLat = farm.latitude ?? ref.lat;
                const fLng = farm.longitude ?? ref.lng;
                const pt = projectRwandaLatLngToSvg(fLat, fLng);
                const fx = pt.x + (idx % 2 === 0 ? -8 : 8);
                const fy = pt.y + (idx % 2 === 0 ? 6 : -6);
                const isNearestToSelected =
                  activeSelectedHotspot?.nearestFarmId === farm.id;

                return (
                  <g key={farm.id} className="cursor-pointer">
                    {/* Vector line from active outbreak hotspot to nearest user farm */}
                    {isNearestToSelected && activeSelectedHotspot && (
                      <g>
                        <line
                          x1={activeSelectedHotspot.coordinates.svgX}
                          y1={activeSelectedHotspot.coordinates.svgY}
                          x2={fx}
                          y2={fy}
                          stroke="#fb7185"
                          strokeWidth="1.6"
                          strokeDasharray="4 3"
                        />
                      </g>
                    )}

                    <circle cx={fx} cy={fy} r={14} fill="url(#farmGlow)" />
                    <polygon
                      points={`${fx},${fy - 6} ${fx + 6},${fy} ${fx},${fy + 6} ${fx - 6},${fy}`}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.8"
                    />
                    <text
                      x={fx}
                      y={fy + 17}
                      fill="#a7f3d0"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {farm.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Map Telemetry Strip */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-stone-800 text-[11px] text-stone-400">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {language === "rw"
                  ? ` Isuzuma ry'indwara ${filteredGeoDiagnoses.length} mu turere ${hotspots.length} (RAB Plant Pathology)`
                  : `Showing ${filteredGeoDiagnoses.length} historical diagnoses clustered across ${hotspots.length} districts`}
              </span>
            </span>
            <span className="text-stone-300 font-mono">
              {language === "rw"
                ? `Intera ku murima wawe: ${activeSelectedHotspot.proximityKmToUserFarm} km (${activeSelectedHotspot.nearestFarmName})`
                : `Nearest Parcel Vector: ${activeSelectedHotspot.proximityKmToUserFarm} km to ${activeSelectedHotspot.nearestFarmName}`}
            </span>
          </div>
        </div>

        {/* Right Column: Selected Risk Zone & Historical Diagnosis Pattern Evidence (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-800/40 space-y-3.5">
            {/* Risk Zone Header */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-200 dark:border-stone-700">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide ${
                      activeSelectedHotspot.threatLevel === "imminent"
                        ? "bg-rose-600 text-white"
                        : activeSelectedHotspot.threatLevel === "elevated"
                        ? "bg-amber-500 text-stone-950"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>
                      {activeSelectedHotspot.threatLevel === "imminent"
                        ? language === "rw"
                          ? "AKAGA GAKOMEYE (CRITICAL ZONE)"
                          : "CRITICAL RISK ZONE"
                        : activeSelectedHotspot.threatLevel === "elevated"
                        ? language === "rw"
                          ? "IBYAGO BYO HEJURU (HIGH RISK)"
                          : "HIGH OUTBREAK RISK"
                        : language === "rw"
                        ? "GUKURIKIRANA"
                        : "MODERATE WATCH"}
                    </span>
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-600 dark:text-stone-300">
                    {activeSelectedHotspot.proximityKmToUserFarm} km →{" "}
                    {activeSelectedHotspot.nearestFarmName.split("(")[0].trim()}
                  </span>
                </div>

                <h4 className="text-base font-black text-stone-900 dark:text-white mt-1.5">
                  {activeSelectedHotspot.district} ({activeSelectedHotspot.sector})
                </h4>
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mt-0.5">
                  {language === "rw"
                    ? activeSelectedHotspot.pestNameRw
                    : activeSelectedHotspot.pestNameEn}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                  Pathogen: {activeSelectedHotspot.pathogen} •{" "}
                  {activeSelectedHotspot.crop}
                </p>
              </div>

              {/* Calculated Risk Score Dial */}
              <div className="text-right shrink-0 bg-white dark:bg-stone-900 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">
                  {language === "rw" ? "Igipimo cy'Ibyago" : "Risk Index"}
                </span>
                <span
                  className={`text-xl font-black font-mono tabular-nums ${
                    activeSelectedHotspot.riskScore >= 75
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {activeSelectedHotspot.riskScore}
                  <span className="text-xs font-normal text-stone-400">/100</span>
                </span>
              </div>
            </div>

            {/* Key Quantitative Pattern Metrics */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                <span className="text-stone-500 text-[10px] uppercase font-bold block">
                  {language === "rw" ? "Isuzuma (Diagnoses)" : "Logged Diagnoses"}
                </span>
                <div className="text-base font-black font-mono tabular-nums text-stone-900 dark:text-white mt-0.5">
                  {activeSelectedHotspot.matchingDiagnoses.length}{" "}
                  <span className="text-[11px] font-normal text-stone-500">
                    ({activeSelectedHotspot.avgConfidence}% AI)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                <span className="text-stone-500 text-[10px] uppercase font-bold block">
                  {language === "rw" ? "Imirima Yanduye" : "Regional Cases"}
                </span>
                <div className="text-base font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                  {activeSelectedHotspot.activeCasesCount}{" "}
                  <span className="text-[11px] text-stone-500 font-normal">
                    parcels
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                <span className="text-stone-500 text-[10px] uppercase font-bold block">
                  {language === "rw" ? "Umuvuduko" : "Spread Velocity"}
                </span>
                <div className="text-base font-black text-stone-900 dark:text-white capitalize mt-0.5">
                  {activeSelectedHotspot.spreadVelocity}
                </div>
              </div>
            </div>

            {/* Recommended Preventive Defense & Chemical Protocol */}
            <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <span className="flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {language === "rw"
                      ? "Umuti n'Ingamba zo Gukumira (RAB SOP):"
                      : "RAB Interception Protocol & Chemical Dosage:"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                {language === "rw"
                  ? activeSelectedHotspot.recommendedDefenseRw
                  : activeSelectedHotspot.recommendedDefenseEn}
              </p>
              <div className="pt-1 flex items-center space-x-1.5 text-[11px] font-mono font-bold text-emerald-950 dark:text-emerald-300">
                <FlaskConical className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span className="truncate">
                  {activeSelectedHotspot.recommendedChemical}
                </span>
              </div>
            </div>

            {/* Historical Diagnosis Evidence List from `diagnoses` array */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {language === "rw"
                    ? `Amateka y'Isuzuma muri ${activeSelectedHotspot.district} (Diagnoses Array):`
                    : `Historical Diagnoses in ${activeSelectedHotspot.district} (${activeSelectedHotspot.matchingDiagnoses.length}):`}
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  {language === "rw" ? "Kanda urebe kuri GPS" : "Click to focus pin"}
                </span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {activeSelectedHotspot.matchingDiagnoses.map((diag) => {
                  const isFocused = selectedDiagnosisPinId === diag.id;
                  return (
                    <button
                      key={diag.id}
                      type="button"
                      onClick={() => setSelectedDiagnosisPinId(diag.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 ${
                        isFocused
                          ? "bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 ring-1 ring-rose-400"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-start space-x-2.5 min-w-0">
                        <img
                          src={diag.imageUrl}
                          alt={diag.diseaseNameEn}
                          className="w-9 h-9 rounded-lg object-cover border border-stone-200 dark:border-stone-700 shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 dark:text-white truncate">
                            {language === "rw"
                              ? diag.diseaseNameRw
                              : diag.diseaseNameEn}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                            {diag.cropType} • {diag.sector || activeSelectedHotspot.sector}
                          </div>
                          <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                            {diag.diagnosisDate} • AI Confidence: {diag.confidenceScore}%
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono uppercase font-black px-1.5 py-0.5 rounded shrink-0 ${
                          diag.severity === "critical"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : diag.severity === "high"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {diag.severity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons: Schedule Preventive Spray or View RAB Biosecurity Protocol */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRABProtocolModal(true)}
              className="flex-1 min-w-[135px] flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors"
            >
              <Info className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span>
                {language === "rw" ? "Amabwiriza ya RAB" : "RAB Biosecurity SOP"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSchedulePreventiveSpray}
              className="flex-1 min-w-[180px] flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-2xs"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "Shyira Umuti ku Ngengabihe"
                  : "Schedule Preventive Spray"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Simulate / Log New Field Diagnosis on Map */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Crosshair className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold">
                    {language === "rw"
                      ? "Andika Isuzuma ry'Indwara ku Ikarita"
                      : "Log Field Diagnosis to Outbreak Radar"}
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    {language === "rw"
                      ? " Yongera isuzuma rishya muri diagnoses array ihindure ikarita ako kanya"
                      : "Appends to historical diagnoses and recalculates regional risk zones"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-stone-400 hover:text-white text-sm font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAddSimulatedDiagnosis}
              className="p-4 sm:p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Akarere (Rwanda District)"
                    : "Target District"}
                </label>
                <select
                  value={simDistrict}
                  onChange={(e) => setSimDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium"
                >
                  {Object.keys(RWANDA_DISTRICT_COORDS).map((d) => (
                    <option key={d} value={d}>
                      {d} ({RWANDA_DISTRICT_COORDS[d].province})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Indwara cyangwa Agasimba"
                    : "Detected Pathogen / Pest Pattern"}
                </label>
                <select
                  value={simDiseasePreset}
                  onChange={(e) => setSimDiseasePreset(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium"
                >
                  <option value="late_blight">
                    Potato Late Blight (Phytophthora infestans) - Ibirayi
                  </option>
                  <option value="fall_armyworm">
                    Fall Armyworm (Spodoptera frugiperda) - Ibigori
                  </option>
                  <option value="tuta_absoluta">
                    Tomato Leafminer (Tuta absoluta) - Inyanya
                  </option>
                  <option value="bacterial_wilt">
                    Bacterial Wilt (Ralstonia solanacearum) - Ibirayi
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw"
                    ? "Uburemere bw'Icyorezo (Severity)"
                    : "Outbreak Severity Level"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["critical", "high", "medium"] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSimSeverity(sev)}
                      className={`py-2 rounded-xl font-bold uppercase border transition-all ${
                        simSeverity === sev
                          ? sev === "critical"
                            ? "bg-rose-600 text-white border-rose-600"
                            : sev === "high"
                            ? "bg-amber-500 text-stone-950 border-amber-500"
                            : "bg-emerald-600 text-white border-emerald-600"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold"
                >
                  {language === "rw" ? "Reka" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  {language === "rw"
                    ? "Shyira ku Ikarita"
                    : "Plot Diagnosis & Update Risk Map"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: RAB Pest Protocol Modal */}
      {showRABProtocolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-white">
                    {language === "rw"
                      ? "Amabwiriza y'Uburinzi bw'Ibihingwa ya RAB"
                      : "RAB National Pest Biosecurity Protocol"}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Rwanda Agriculture and Animal Resources Development Board
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRABProtocolModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs text-stone-700 dark:text-stone-300">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <h5 className="font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    {language === "rw"
                      ? "Ingamba z'Imbata (Early Interception)"
                      : "Early Interception Imperative"}
                  </span>
                </h5>
                <p className="leading-relaxed">
                  {activeSelectedHotspot.rabGuideline}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? "Amategeko y'Ubuhinzi Bwemejwe:"
                    : "Mandatory RAB Biosecurity Steps:"}
                </h5>
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li>
                    {language === "rw"
                      ? "Gukoresha gusa imiti yanditswe mu gitabo cya RICA n'ibikoresho by'umutekano (PPE)."
                      : "Spray exclusively RICA-registered agrochemicals adhering to strict buffer strips and pre-harvest intervals."}
                  </li>
                  <li>
                    {language === "rw"
                      ? "Kumenyesha abahinzi baturanye muri koperative kugira ngo baterere rimwe (Synchronized Spraying)."
                      : "Coordinate synchronized cooperative spraying windows to eliminate pest reservoir refuge."}
                  </li>
                  <li>
                    {language === "rw"
                      ? "Gufata ifoto y'amababi muri Muganga w'Ibihingwa kugira ngo AI itange umuti unogeye."
                      : "Submit suspected leaf lesions into AI Crop Doctor for real-time microscopic diagnosis."}
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRABProtocolModal(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
                >
                  {language === "rw" ? "Nabyumvise" : "I Understand"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
