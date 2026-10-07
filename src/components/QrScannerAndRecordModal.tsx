import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import jsPDF from "jspdf";
import {
  Farm,
  HarvestRecord,
  Language,
  Expense,
  FarmActivity,
  FarmPlan,
  SaleRecord,
  ActivityCategory,
  ExpenseCategory,
  HiredLabor,
  FertilizerApplicationLog,
  FertilizerApplicationMethod,
} from "../types";
import {
  X,
  QrCode,
  Camera,
  Download,
  Printer,
  Copy,
  Check,
  MapPin,
  Sprout,
  Calendar,
  ShieldCheck,
  Upload,
  ExternalLink,
  PackageCheck,
  History,
  Clock,
  Trash2,
  ArrowRight,
  RotateCcw,
  BarChart3,
  TrendingUp,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileText,
  CalendarRange,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Layers,
  Sparkles,
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  ClipboardList,
  Receipt,
  Brain,
  Users,
  FlaskConical,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  PlusCircle,
  Wrench,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

export type QrRecordType = "parcel" | "harvest";
export type QrModalMode = "qr_label" | "details" | "scanner" | "history" | "trends";

const SCAN_HISTORY_STORAGE_KEY = "terimbere_qr_scan_history_v1";
const SCAN_30D_PARCEL_LOG_KEY = "terimbere_qr_30d_parcel_scans_v2";
const SCAN_30D_COMBINED_LOG_KEY = "terimbere_qr_30d_combined_scans_v3";
const MAX_SCAN_HISTORY = 250;

export type ScanTypeCategoryGroup = "parcel" | "harvest";

export interface Scan30dItem {
  id: string;
  categoryGroup: ScanTypeCategoryGroup;
  typeKey: string;
  typeNameEn: string;
  typeNameRw: string;
  recordId: string;
  recordName: string;
  timestamp: number;
}
export type ParcelScan30dItem = Scan30dItem;

export const classifyParcelTypeKey = (
  farm?: Farm | null,
  title?: string,
  subtitle?: string
): "volcanic" | "terraced" | "savanna" | "marshland" | "plateau" => {
  const text = `${title || ""} ${subtitle || ""} ${farm?.name || ""} ${farm?.agroZone || ""} ${farm?.soilType || ""} ${farm?.location || ""} ${farm?.district || ""}`.toLowerCase();

  if (text.includes("volcan") || text.includes("birunga") || text.includes("kinigi") || text.includes("musanze") || text.includes("burera")) {
    return "volcanic";
  }
  if (text.includes("savanna") || text.includes("nyagatare") || text.includes("kayonza") || text.includes("gatsibo") || text.includes("eastern")) {
    return "savanna";
  }
  if (text.includes("marsh") || text.includes("valley") || text.includes("irrigat") || text.includes("drip") || text.includes("umukoki") || text.includes("bugesera")) {
    return "marshland";
  }
  if (text.includes("terrace") || text.includes("amaterasi") || text.includes("huye") || text.includes("maraba") || text.includes("nyamagabe") || text.includes("karongi") || text.includes("southern") || text.includes("western")) {
    return "terraced";
  }
  return "plateau";
};

const classifyParcelType = classifyParcelTypeKey;

export const classifyHarvestTypeKey = (
  harvest?: HarvestRecord | null,
  title?: string,
  subtitle?: string
): "potato" | "maize" | "coffee" | "beans" | "soya" | "tea" | "horticulture" => {
  const text = `${title || ""} ${subtitle || ""} ${harvest?.crop || ""} ${harvest?.batchCode || ""}`.toLowerCase();

  if (text.includes("potat") || text.includes("birayi") || text.includes("kinigi") || text.includes("kuruseke")) {
    return "potato";
  }
  if (text.includes("maiz") || text.includes("bigori") || text.includes("corn") || text.includes("sc403")) {
    return "maize";
  }
  if (text.includes("coffe") || text.includes("kawa") || text.includes("bourbon") || text.includes("arabica")) {
    return "coffee";
  }
  if (text.includes("bean") || text.includes("shyimbo") || text.includes("rwv") || text.includes("legume")) {
    return "beans";
  }
  if (text.includes("soya") || text.includes("soy") || text.includes("peka")) {
    return "soya";
  }
  if (text.includes("tea") || text.includes("cyayi") || text.includes("mulindi") || text.includes("gisovu")) {
    return "tea";
  }
  return "horticulture";
};

export interface QrScanHistoryEntry {
  scanId: string;
  type: QrRecordType;
  recordId: string;
  title: string;
  subtitle: string;
  codeLabel: string;
  metricsLine: string;
  scannedAtIso: string;
  scannedTimeDisplay: string;
  scanMethod: "camera" | "qr_image" | "camera_simulation" | "batch_csv";
  cachedFarm?: Farm;
  cachedHarvest?: HarvestRecord;
}

interface QrScannerAndRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialMode: QrModalMode;
  recordType: QrRecordType;
  selectedFarm?: Farm | null;
  selectedHarvest?: HarvestRecord | null;
  farms: Farm[];
  harvests: HarvestRecord[];
  plans?: FarmPlan[];
  expenses?: Expense[];
  activities?: FarmActivity[];
  sales?: SaleRecord[];
  hiredLabor?: HiredLabor[];
  fertilizerApplications?: FertilizerApplicationLog[];
  onSelectRecordFromScan: (type: QrRecordType, id: string) => void;
  onAddActivity?: (data: Omit<FarmActivity, "id">) => void;
  onAddExpense?: (data: Omit<Expense, "id" | "syncStatus">) => void;
}

// Reference scannable targets when workspace starts on a clean slate with 0 farms/harvests
const REFERENCE_SCANNABLE_PARCELS: Farm[] = [
  {
    id: "parcel-kinigi-volcanic-01",
    name: "Kinigi Volcanic Seed Parcel A",
    location: "Musanze",
    province: "Amajyaruguru (Northern)",
    district: "Musanze",
    sector: "Kinigi",
    cell: "Kampanga",
    agroZone: "Birunga Volcanic Highlands",
    altitude: 2240,
    altitudeMeters: 2240,
    latitude: -1.4521,
    longitude: 29.5892,
    sizeHa: 1.4,
    soilType: "Volcanic Andosol (Rich Loam)",
    irrigationType: "Rainfed + Gravity Micro-Catchment",
    mainCrops: ["Ibirayi (Kinigi)", "Ibishyimbo (MAC 44)"],
    createdAt: new Date().toISOString().split("T")[0],
  },
  {
    id: "parcel-nyagatare-savanna-02",
    name: "Nyagatare Karangazi Irrigated Block B",
    location: "Nyagatare",
    province: "Iburasirazuba (Eastern)",
    district: "Nyagatare",
    sector: "Karangazi",
    cell: "Ndama",
    agroZone: "Eastern Savanna & Lowland Plains",
    altitude: 1410,
    altitudeMeters: 1410,
    latitude: -1.2981,
    longitude: 30.3245,
    sizeHa: 2.8,
    soilType: "Ferralsol Sandy Clay Loam",
    irrigationType: "Solar Drip & Valley Dam",
    mainCrops: ["Ibigori (Hybrid WH 505)", "Soya"],
    createdAt: new Date().toISOString().split("T")[0],
  },
  {
    id: "parcel-huye-plateau-03",
    name: "Huye Maraba Terraced Hillside C",
    location: "Huye",
    province: "Amajyepfo (Southern)",
    district: "Huye",
    sector: "Maraba",
    cell: "Shanga",
    agroZone: "Central & Southern Plateau",
    altitude: 1765,
    altitudeMeters: 1765,
    latitude: -2.5684,
    longitude: 29.6912,
    sizeHa: 0.9,
    soilType: "Humic Clay Loam",
    irrigationType: "Hillside Radical Terraces",
    mainCrops: ["Ibishyimbo", "Imyumbati (NASE 14)"],
    createdAt: new Date().toISOString().split("T")[0],
  },
];

const REFERENCE_SCANNABLE_HARVESTS: HarvestRecord[] = [
  {
    id: "harv-kinigi-batch-101",
    batchCode: "RW-HARV-MUS-2026-101",
    farmId: "parcel-kinigi-volcanic-01",
    farmName: "Kinigi Volcanic Seed Parcel A",
    district: "Musanze",
    sector: "Kinigi",
    agroZone: "Birunga Volcanic Highlands",
    crop: "Ibirayi (Kinigi)",
    harvestDate: new Date().toISOString().split("T")[0],
    quantityKg: 4850,
    qualityGrade: "A",
    storageLocation: "Kinigi Modern Ventilated Store",
    destinationMarket: "Nyabugogo Wholesale Market (Kigali)",
    transporterName: "Koperative Twizamure Logistics",
    certificationCode: "RICA-CERT-MUS-101",
    yieldPerHaTons: 16.2,
    seedMultiplierRatio: 11.4,
    syncStatus: "synced",
  },
  {
    id: "harv-nyagatare-batch-204",
    batchCode: "RW-HARV-NYA-2026-204",
    farmId: "parcel-nyagatare-savanna-02",
    farmName: "Nyagatare Karangazi Irrigated Block B",
    district: "Nyagatare",
    sector: "Karangazi",
    agroZone: "Eastern Savanna & Lowland Plains",
    crop: "Ibigori (Maize Hybrid)",
    harvestDate: new Date().toISOString().split("T")[0],
    quantityKg: 6200,
    qualityGrade: "A",
    storageLocation: "Karangazi Hermetic Silo #3",
    destinationMarket: "EAX East Africa Exchange Silo",
    transporterName: "Eastern Agro-Haulers",
    certificationCode: "RICA-CERT-NYA-204",
    yieldPerHaTons: 5.8,
    seedMultiplierRatio: 42.0,
    syncStatus: "synced",
  },
  {
    id: "harv-huye-batch-309",
    batchCode: "RW-HARV-HUY-2026-309",
    farmId: "parcel-huye-plateau-03",
    farmName: "Huye Maraba Terraced Hillside C",
    district: "Huye",
    sector: "Maraba",
    agroZone: "Central & Southern Plateau",
    crop: "Ibishyimbo (Iron-Biofortified Beans)",
    harvestDate: new Date().toISOString().split("T")[0],
    quantityKg: 1950,
    qualityGrade: "A",
    storageLocation: "Maraba Cooperative Collection Center",
    destinationMarket: "Huye Regional Market",
    transporterName: "Coop Maraba Transport",
    certificationCode: "RICA-CERT-HUY-309",
    yieldPerHaTons: 2.4,
    seedMultiplierRatio: 18.5,
    syncStatus: "synced",
  },
];

export function buildDeepLinkUrl(type: QrRecordType, id: string): string {
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://terimbere.rw/";
  return `${base}?qrType=${encodeURIComponent(type)}&qrId=${encodeURIComponent(id)}`;
}

export function parseScannedQrPayload(
  rawText: string,
  farms: Farm[],
  harvests: HarvestRecord[]
): { type: QrRecordType; id: string } | null {
  const trimmed = rawText.trim();
  const allFarms = [...farms, ...REFERENCE_SCANNABLE_PARCELS];
  const allHarvests = [...harvests, ...REFERENCE_SCANNABLE_HARVESTS];

  // 1. Check URL with ?qrType=...&qrId=...
  try {
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.includes("qrType=")
    ) {
      const url = new URL(trimmed, "https://terimbere.rw");
      const qType = url.searchParams.get("qrType");
      const qId = url.searchParams.get("qrId");
      if ((qType === "parcel" || qType === "harvest") && qId) {
        return { type: qType, id: qId };
      }
    }
  } catch {
    // ignore URL parse errors
  }

  // 2. Check JSON payload from legacy or structured QR labels
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.qrType && parsed.qrId) {
      return { type: parsed.qrType, id: parsed.qrId };
    }
    if (parsed.farmId && !parsed.batchId) {
      return { type: "parcel", id: parsed.farmId };
    }
    if (parsed.batchId || parsed.harvestId) {
      const foundH = allHarvests.find(
        (h) => h.id === parsed.harvestId || h.batchCode === parsed.batchId
      );
      if (foundH) return { type: "harvest", id: foundH.id };
    }
  } catch {
    // ignore JSON parse errors
  }

  // 3. Direct ID or Batch Code match
  const matchedFarm = allFarms.find(
    (f) =>
      f.id.toLowerCase() === trimmed.toLowerCase() ||
      f.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (matchedFarm) return { type: "parcel", id: matchedFarm.id };

  const matchedHarvest = allHarvests.find(
    (h) =>
      h.id.toLowerCase() === trimmed.toLowerCase() ||
      (h.batchCode && h.batchCode.toLowerCase() === trimmed.toLowerCase())
  );
  if (matchedHarvest) return { type: "harvest", id: matchedHarvest.id };

  return null;
}

export const QrScannerAndRecordModal: React.FC<QrScannerAndRecordModalProps> = ({
  isOpen,
  onClose,
  language,
  initialMode,
  recordType,
  selectedFarm,
  selectedHarvest,
  farms,
  harvests,
  plans = [],
  expenses = [],
  activities = [],
  sales = [],
  hiredLabor = [],
  fertilizerApplications = [],
  onSelectRecordFromScan,
  onAddActivity,
  onAddExpense,
}) => {
  const [mode, setMode] = useState<QrModalMode>(initialMode);
  const [activeRecordType, setActiveRecordType] = useState<QrRecordType>(recordType);
  const [activeFarmOverride, setActiveFarmOverride] = useState<Farm | null>(null);
  const [activeHarvestOverride, setActiveHarvestOverride] =
    useState<HarvestRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "parcel" | "harvest">(
    "all"
  );

  // Persisted Scans History (expanded for granular tracking & batch processing)
  const [scanHistory, setScanHistory] = useState<QrScanHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(SCAN_HISTORY_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_SCAN_HISTORY) : [];
    } catch {
      return [];
    }
  });

  // Granular Table Sorting, Filtering, and Multi-Selection State
  const [tableSortField, setTableSortField] = useState<"timestamp" | "recordId" | "type" | "title">("timestamp");
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">("desc");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"all" | "parcel" | "harvest">("all");
  const [historyDatePreset, setHistoryDatePreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [historyCustomStart, setHistoryCustomStart] = useState<string>("");
  const [historyCustomEnd, setHistoryCustomEnd] = useState<string>("");
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set());

  // Batch PDF & CSV Upload State
  const [isGeneratingBatchPdf, setIsGeneratingBatchPdf] = useState(false);
  const [batchPdfProgress, setBatchPdfProgress] = useState("");
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [batchUploadRawText, setBatchUploadRawText] = useState("");
  const [batchUploadFeedback, setBatchUploadFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Print Preview Modal Overlay State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<QrScanHistoryEntry[]>([]);
  const [previewTotalPages, setPreviewTotalPages] = useState<number>(1);
  const [previewActiveTab, setPreviewActiveTab] = useState<"document" | "interactive">("document");
  const [previewPageNumber, setPreviewPageNumber] = useState<number>(1);
  const [previewQrDataUrls, setPreviewQrDataUrls] = useState<Record<string, string>>({});
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // AUTO-COMPLETE FIELDS STATE:
  // When enabled after a successful scan, automatically pre-fills creation forms
  // for new related activities or expenses based on scanned parcel or harvest data.
  const AUTO_COMPLETE_STORAGE_KEY = "terimbere_qr_auto_complete_enabled_v2";
  const [autoCompleteFieldsEnabled, setAutoCompleteFieldsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTO_COMPLETE_STORAGE_KEY);
      return saved !== null ? saved === "true" : true; // Enabled by default for seamless workflow
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_COMPLETE_STORAGE_KEY, String(autoCompleteFieldsEnabled));
    } catch {
      // ignore
    }
  }, [autoCompleteFieldsEnabled]);

  // Quick Creation Forms State for Related Activities & Expenses
  const [activeCreationTab, setActiveCreationTab] = useState<"activity" | "expense">("activity");
  const [creationFeedback, setCreationFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPreFilledByScan, setIsPreFilledByScan] = useState(false);

  // Internal activity creation form data
  const [activityFormData, setActivityFormData] = useState({
    title: "",
    category: "weeding" as ActivityCategory,
    crop: "",
    farmId: "",
    farmName: "",
    dueDate: new Date().toISOString().split("T")[0],
    status: "pending" as "pending" | "in_progress" | "completed",
    estimatedCost: 0,
    assignedWorker: "",
    fertilizerType: "",
    notes: "",
  });

  // Internal expense creation form data
  const [expenseFormData, setExpenseFormData] = useState({
    description: "",
    category: "fertilizer" as ExpenseCategory,
    crop: "",
    farmId: "",
    farmName: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
  });

  // Local synced activities and expenses for immediate feedback when added in modal
  const [localAddedActivities, setLocalAddedActivities] = useState<FarmActivity[]>([]);
  const [localAddedExpenses, setLocalAddedExpenses] = useState<Expense[]>([]);

  // 30-Day Scanned Parcel & Harvest Types Log for Recharts Visualization
  const [scannedItems30d, setScannedItems30d] = useState<Scan30dItem[]>(() => {
    try {
      const savedCombined = localStorage.getItem(SCAN_30D_COMBINED_LOG_KEY);
      if (savedCombined) {
        const parsed = JSON.parse(savedCombined);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedParcel = localStorage.getItem(SCAN_30D_PARCEL_LOG_KEY);
      if (savedParcel) {
        const parsed = JSON.parse(savedParcel);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize older parcel logs into unified format
          return parsed.map((p: any) => ({
            id: p.id,
            categoryGroup: "parcel",
            typeKey: p.typeKey,
            typeNameEn: "Parcel",
            typeNameRw: "Umurima",
            recordId: p.farmId || p.recordId || "parcel",
            recordName: p.farmName || p.recordName || "Farm Parcel",
            timestamp: p.timestamp,
          }));
        }
      }
    } catch {
      // ignore
    }

    const now = Date.now();
    const dayMs = 86400000;
    return [
      // Diverse baseline of parcel ecological zones
      { id: "s30-p1", categoryGroup: "parcel", typeKey: "volcanic", typeNameEn: "Volcanic Highlands", typeNameRw: "Imisozi y'Ibirunga", recordId: "parcel-kinigi-volcanic-01", recordName: "Kinigi Volcanic Seed Parcel A", timestamp: now - 1 * dayMs },
      { id: "s30-p2", categoryGroup: "parcel", typeKey: "volcanic", typeNameEn: "Volcanic Highlands", typeNameRw: "Imisozi y'Ibirunga", recordId: "parcel-kinigi-volcanic-01", recordName: "Kinigi Volcanic Seed Parcel A", timestamp: now - 3 * dayMs },
      { id: "s30-p3", categoryGroup: "parcel", typeKey: "savanna", typeNameEn: "Eastern Savanna", typeNameRw: "Ubutayu bw'Iburasirazuba", recordId: "parcel-nyagatare-savanna-02", recordName: "Nyagatare Karangazi Block B", timestamp: now - 5 * dayMs },
      { id: "s30-p4", categoryGroup: "parcel", typeKey: "terraced", typeNameEn: "Terraced Slopes", typeNameRw: "Amaterasi y'Imisozi", recordId: "parcel-huye-plateau-03", recordName: "Huye Maraba Terraced Hillside C", timestamp: now - 7 * dayMs },
      { id: "s30-p5", categoryGroup: "parcel", typeKey: "volcanic", typeNameEn: "Volcanic Highlands", typeNameRw: "Imisozi y'Ibirunga", recordId: "parcel-kinigi-volcanic-01", recordName: "Kinigi Volcanic Seed Parcel A", timestamp: now - 11 * dayMs },
      { id: "s30-p6", categoryGroup: "parcel", typeKey: "savanna", typeNameEn: "Eastern Savanna", typeNameRw: "Ubutayu bw'Iburasirazuba", recordId: "parcel-nyagatare-savanna-02", recordName: "Nyagatare Karangazi Block B", timestamp: now - 15 * dayMs },
      { id: "s30-p7", categoryGroup: "parcel", typeKey: "marshland", typeNameEn: "Valley Marshland", typeNameRw: "Ibifunzo n'Imikoki", recordId: "parcel-bugesera-marsh-04", recordName: "Bugesera Valley Catchment", timestamp: now - 19 * dayMs },
      { id: "s30-p8", categoryGroup: "parcel", typeKey: "terraced", typeNameEn: "Terraced Slopes", typeNameRw: "Amaterasi y'Imisozi", recordId: "parcel-huye-plateau-03", recordName: "Huye Maraba Terraced Hillside C", timestamp: now - 23 * dayMs },
      { id: "s30-p9", categoryGroup: "parcel", typeKey: "plateau", typeNameEn: "Central Plateau", typeNameRw: "Imisozi yo Hagati", recordId: "parcel-muhanga-plateau-05", recordName: "Muhanga Hillside Parcel", timestamp: now - 26 * dayMs },

      // Diverse baseline of harvest commodity batches
      { id: "s30-h1", categoryGroup: "harvest", typeKey: "potato", typeNameEn: "Irish Potatoes", typeNameRw: "Ibirayi (Kinigi)", recordId: "harv-kinigi-batch-101", recordName: "Irish Potatoes (18,400 kg · Kinigi Grade 1)", timestamp: now - 2 * dayMs },
      { id: "s30-h2", categoryGroup: "harvest", typeKey: "potato", typeNameEn: "Irish Potatoes", typeNameRw: "Ibirayi (Kinigi)", recordId: "harv-kinigi-batch-101", recordName: "Irish Potatoes (18,400 kg · Kinigi Grade 1)", timestamp: now - 4 * dayMs },
      { id: "s30-h3", categoryGroup: "harvest", typeKey: "maize", typeNameEn: "Hybrid Maize", typeNameRw: "Ibigori (Hybrid)", recordId: "harv-nyagatare-batch-202", recordName: "Hybrid Maize (32,000 kg · Karangazi Lot 1)", timestamp: now - 6 * dayMs },
      { id: "s30-h4", categoryGroup: "harvest", typeKey: "coffee", typeNameEn: "Specialty Coffee", typeNameRw: "Ikawa y'Umwimerere", recordId: "harv-maraba-batch-303", recordName: "Arabica Coffee (6,200 kg · Maraba Grade AA)", timestamp: now - 8 * dayMs },
      { id: "s30-h5", categoryGroup: "harvest", typeKey: "potato", typeNameEn: "Irish Potatoes", typeNameRw: "Ibirayi (Kinigi)", recordId: "harv-kinigi-batch-101", recordName: "Irish Potatoes (18,400 kg · Kinigi Grade 1)", timestamp: now - 12 * dayMs },
      { id: "s30-h6", categoryGroup: "harvest", typeKey: "beans", typeNameEn: "Climbing Beans", typeNameRw: "Ibishyimbo by'Ubutare", recordId: "harv-beans-batch-404", recordName: "Biofortified Beans (8,500 kg · RWV1129)", timestamp: now - 16 * dayMs },
      { id: "s30-h7", categoryGroup: "harvest", typeKey: "maize", typeNameEn: "Hybrid Maize", typeNameRw: "Ibigori (Hybrid)", recordId: "harv-nyagatare-batch-202", recordName: "Hybrid Maize (32,000 kg · Karangazi Lot 1)", timestamp: now - 20 * dayMs },
      { id: "s30-h8", categoryGroup: "harvest", typeKey: "coffee", typeNameEn: "Specialty Coffee", typeNameRw: "Ikawa y'Umwimerere", recordId: "harv-maraba-batch-303", recordName: "Arabica Coffee (6,200 kg · Maraba Grade AA)", timestamp: now - 24 * dayMs },
      { id: "s30-h9", categoryGroup: "harvest", typeKey: "soya", typeNameEn: "Soya Beans", typeNameRw: "Soya y'Umusaruro", recordId: "harv-soya-batch-505", recordName: "Certified Soya (11,000 kg · Peka 6)", timestamp: now - 27 * dayMs },
    ];
  });

  // Backward compatible alias
  const scannedParcels30d = scannedItems30d;
  const setScannedParcels30d = setScannedItems30d;

  // Scan Trends filter and sort controls
  const [trendFilterGroup, setTrendFilterGroup] = useState<"all" | "parcel" | "harvest">("all");
  const [trendSortBy, setTrendSortBy] = useState<"count" | "name">("count");

  const logScan30d = (
    type: QrRecordType,
    details: {
      farm?: Farm | null;
      harvest?: HarvestRecord | null;
      recordId?: string;
      title?: string;
      subtitle?: string;
    }
  ) => {
    const now = Date.now();
    let newItem: Scan30dItem;
    if (type === "parcel") {
      const typeKey = classifyParcelTypeKey(details.farm, details.title, details.subtitle);
      const nameEn =
        typeKey === "volcanic"
          ? "Volcanic Highlands"
          : typeKey === "terraced"
          ? "Terraced Slopes"
          : typeKey === "savanna"
          ? "Eastern Savanna"
          : typeKey === "marshland"
          ? "Valley Marshland"
          : "Central Plateau";
      const nameRw =
        typeKey === "volcanic"
          ? "Imisozi y'Ibirunga"
          : typeKey === "terraced"
          ? "Amaterasi y'Imisozi"
          : typeKey === "savanna"
          ? "Ubutayu bw'Iburasirazuba"
          : typeKey === "marshland"
          ? "Ibifunzo n'Imikoki"
          : "Imisozi yo Hagati";

      newItem = {
        id: `scan30-${now}-${Math.random().toString(36).slice(2, 6)}`,
        categoryGroup: "parcel",
        typeKey,
        typeNameEn: nameEn,
        typeNameRw: nameRw,
        recordId: details.farm?.id || details.recordId || "parcel-unknown",
        recordName: details.farm?.name || details.title || "Scanned Parcel",
        timestamp: now,
      };
    } else {
      const typeKey = classifyHarvestTypeKey(details.harvest, details.title, details.subtitle);
      const nameEn =
        typeKey === "potato"
          ? "Irish Potatoes"
          : typeKey === "maize"
          ? "Hybrid Maize"
          : typeKey === "coffee"
          ? "Specialty Coffee"
          : typeKey === "beans"
          ? "Climbing Beans"
          : typeKey === "soya"
          ? "Soya Beans"
          : typeKey === "tea"
          ? "Highland Tea"
          : "Horticulture & Veg";
      const nameRw =
        typeKey === "potato"
          ? "Ibirayi (Kinigi)"
          : typeKey === "maize"
          ? "Ibigori (Hybrid)"
          : typeKey === "coffee"
          ? "Ikawa y'Umwimerere"
          : typeKey === "beans"
          ? "Ibishyimbo by'Ubutare"
          : typeKey === "soya"
          ? "Soya y'Umusaruro"
          : typeKey === "tea"
          ? "Icyayi cy'Imisozi"
          : "Imboga n'Imbuto";

      newItem = {
        id: `scan30-${now}-${Math.random().toString(36).slice(2, 6)}`,
        categoryGroup: "harvest",
        typeKey,
        typeNameEn: nameEn,
        typeNameRw: nameRw,
        recordId: details.harvest?.id || details.recordId || "harvest-unknown",
        recordName: details.title || details.harvest?.crop || "Scanned Harvest Batch",
        timestamp: now,
      };
    }

    setScannedItems30d((prev) => {
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      const filtered = prev.filter((p) => p.timestamp >= thirtyDaysAgo);
      const updated = [newItem, ...filtered];
      try {
        localStorage.setItem(SCAN_30D_COMBINED_LOG_KEY, JSON.stringify(updated));
        localStorage.setItem(SCAN_30D_PARCEL_LOG_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const logParcelScan30d = (farm: Farm | null | undefined, title?: string, subtitle?: string) => {
    logScan30d("parcel", { farm, title, subtitle });
  };

  const logHarvestScan30d = (harvest: HarvestRecord | null | undefined, title?: string, subtitle?: string) => {
    logScan30d("harvest", { harvest, title, subtitle });
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        SCAN_30D_COMBINED_LOG_KEY,
        JSON.stringify(scannedItems30d)
      );
      localStorage.setItem(
        SCAN_30D_PARCEL_LOG_KEY,
        JSON.stringify(scannedItems30d)
      );
    } catch {
      // ignore
    }
  }, [scannedItems30d]);

  // Comprehensive 30-Day Frequency Data for Recharts BarChart (Both Parcels and Harvests)
  const thirtyDaysChartData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const validScans = scannedItems30d.filter((s) => s.timestamp >= thirtyDaysAgo);

    const parcelDefs = [
      {
        key: "volcanic",
        group: "parcel" as const,
        shortNameEn: "Volcanic",
        shortNameRw: "Ibirunga",
        fullNameEn: "Volcanic Highlands",
        fullNameRw: "Imisozi y'Ibirunga",
        color: "#059669",
        zoneExample: "Musanze & Burera (Volcanic Andosols · Irish Potatoes)",
      },
      {
        key: "terraced",
        group: "parcel" as const,
        shortNameEn: "Terraced",
        shortNameRw: "Amaterasi",
        fullNameEn: "Terraced Slopes",
        fullNameRw: "Amaterasi y'Imisozi",
        color: "#D97706",
        zoneExample: "Huye & Karongi (Bench Terraces · Arabica Coffee)",
      },
      {
        key: "savanna",
        group: "parcel" as const,
        shortNameEn: "Savanna",
        shortNameRw: "Ubutayu",
        fullNameEn: "Eastern Savanna",
        fullNameRw: "Ubutayu bw'Iburasirazuba",
        color: "#2563EB",
        zoneExample: "Nyagatare & Kayonza (Lowland Plains · Maize & Soya)",
      },
      {
        key: "marshland",
        group: "parcel" as const,
        shortNameEn: "Marshland",
        shortNameRw: "Ibifunzo",
        fullNameEn: "Valley Marshland",
        fullNameRw: "Ibifunzo n'Imikoki",
        color: "#0D9488",
        zoneExample: "Bugesera & Bugarama (Valley Flats · Irrigated Rice & Veg)",
      },
      {
        key: "plateau",
        group: "parcel" as const,
        shortNameEn: "Plateau",
        shortNameRw: "Imisozi",
        fullNameEn: "Central Plateau",
        fullNameRw: "Imisozi yo Hagati",
        color: "#7C3AED",
        zoneExample: "Kigali & Muhanga (Weathered Ferralsol · Beans & Cassava)",
      },
    ];

    const harvestDefs = [
      {
        key: "potato",
        group: "harvest" as const,
        shortNameEn: "Irish Potato",
        shortNameRw: "Ibirayi",
        fullNameEn: "Irish Potatoes",
        fullNameRw: "Ibirayi (Kinigi)",
        color: "#10B981",
        zoneExample: "Kinigi & Kuruseke Certified Seed & Table Tubers",
      },
      {
        key: "maize",
        group: "harvest" as const,
        shortNameEn: "Hybrid Maize",
        shortNameRw: "Ibigori",
        fullNameEn: "Hybrid Maize",
        fullNameRw: "Ibigori (Hybrid)",
        color: "#EAB308",
        zoneExample: "SC403 & Pan 53 Certified Grain Batches",
      },
      {
        key: "coffee",
        group: "harvest" as const,
        shortNameEn: "Coffee",
        shortNameRw: "Ikawa",
        fullNameEn: "Specialty Coffee",
        fullNameRw: "Ikawa y'Umwimerere",
        color: "#EF4444",
        zoneExample: "Arabica Bourbon Fully Washed Lot AA & Micro-lots",
      },
      {
        key: "beans",
        group: "harvest" as const,
        shortNameEn: "Climbing Beans",
        shortNameRw: "Ibishyimbo",
        fullNameEn: "Climbing Beans",
        fullNameRw: "Ibishyimbo by'Ubutare",
        color: "#16A34A",
        zoneExample: "RWV1129 Iron-Biofortified Harvest Batches",
      },
      {
        key: "soya",
        group: "harvest" as const,
        shortNameEn: "Soya Beans",
        shortNameRw: "Soya",
        fullNameEn: "Certified Soya",
        fullNameRw: "Soya y'Umusaruro",
        color: "#3B82F6",
        zoneExample: "Peka 6 Certified Oilseed & Flour Stock",
      },
      {
        key: "tea",
        group: "harvest" as const,
        shortNameEn: "Highland Tea",
        shortNameRw: "Icyayi",
        fullNameEn: "Highland Tea",
        fullNameRw: "Icyayi cy'Imisozi",
        color: "#14B8A6",
        zoneExample: "Mulindi & Gisovu Export Green Leaf Crates",
      },
      {
        key: "horticulture",
        group: "harvest" as const,
        shortNameEn: "Horticulture",
        shortNameRw: "Imboga",
        fullNameEn: "Horticulture & Veg",
        fullNameRw: "Imboga n'Imbuto",
        color: "#8B5CF6",
        zoneExample: "Fresh Market Tomatoes, French Beans & Cabbages",
      },
    ];

    const candidateCategories =
      trendFilterGroup === "parcel"
        ? parcelDefs
        : trendFilterGroup === "harvest"
        ? harvestDefs
        : [...parcelDefs, ...harvestDefs];

    const activeScopedScans = validScans.filter((s) => {
      if (trendFilterGroup === "parcel") return s.categoryGroup === "parcel";
      if (trendFilterGroup === "harvest") return s.categoryGroup === "harvest";
      return true;
    });

    const totalScopedCount = activeScopedScans.length;

    const items = candidateCategories.map((cat) => {
      const matchingScans = validScans.filter(
        (s) => s.typeKey === cat.key && s.categoryGroup === cat.group
      );
      const count = matchingScans.length;
      const percentage =
        totalScopedCount > 0 ? Math.round((count / totalScopedCount) * 100) : 0;
      const recentScan = matchingScans[0];

      return {
        key: cat.key,
        group: cat.group,
        groupLabel:
          cat.group === "parcel"
            ? language === "rw"
              ? "Umurima"
              : "Parcel Zone"
            : language === "rw"
            ? "Umusaruro"
            : "Harvest Lot",
        shortName: language === "rw" ? cat.shortNameRw : cat.shortNameEn,
        fullName: language === "rw" ? cat.fullNameRw : cat.fullNameEn,
        count,
        percentage,
        color: cat.color,
        zoneExample: cat.zoneExample,
        recentRecordName: recentScan?.recordName || undefined,
      };
    });

    if (trendSortBy === "count") {
      return items.sort((a, b) => b.count - a.count);
    } else {
      return items.sort((a, b) => a.shortName.localeCompare(b.shortName));
    }
  }, [scannedItems30d, trendFilterGroup, trendSortBy, language]);

  const total30dScans = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    return scannedItems30d.filter((s) => s.timestamp >= thirtyDaysAgo).length;
  }, [scannedItems30d]);

  const totalParcelScansIn30Days = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    return scannedItems30d.filter(
      (s) => s.timestamp >= thirtyDaysAgo && s.categoryGroup === "parcel"
    ).length;
  }, [scannedItems30d]);

  const totalHarvestScansIn30Days = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    return scannedItems30d.filter(
      (s) => s.timestamp >= thirtyDaysAgo && s.categoryGroup === "harvest"
    ).length;
  }, [scannedItems30d]);

  const topScannedType = useMemo(() => {
    if (thirtyDaysChartData.length === 0) return null;
    return [...thirtyDaysChartData].sort((a, b) => b.count - a.count)[0];
  }, [thirtyDaysChartData]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SCAN_HISTORY_STORAGE_KEY,
        JSON.stringify(scanHistory.slice(0, MAX_SCAN_HISTORY))
      );
    } catch {
      // ignore storage quota errors
    }
  }, [scanHistory]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setActiveRecordType(recordType);
    setActiveFarmOverride(null);
    setActiveHarvestOverride(null);
    setScanError("");
  }, [initialMode, recordType, selectedFarm?.id, selectedHarvest?.id, isOpen]);

  const allScannableFarms =
    farms.length > 0 ? farms : REFERENCE_SCANNABLE_PARCELS;
  const allScannableHarvests =
    harvests.length > 0 ? harvests : REFERENCE_SCANNABLE_HARVESTS;

  const currentFarm =
    activeFarmOverride ||
    selectedFarm ||
    (selectedHarvest
      ? allScannableFarms.find((f) => f.id === selectedHarvest.farmId) ||
        allScannableFarms[0]
      : allScannableFarms[0]);

  const currentHarvest =
    activeHarvestOverride || selectedHarvest || allScannableHarvests[0];

  const activeId =
    activeRecordType === "parcel"
      ? currentFarm?.id || "parcel-kinigi-volcanic-01"
      : currentHarvest?.id || "harv-kinigi-batch-101";

  const deepLinkUrl = buildDeepLinkUrl(activeRecordType, activeId);

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(deepLinkUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#064E3B",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [isOpen, deepLinkUrl]);

  // Helper to record a scanned parcel or harvest into the last 5 scan history
  const recordScanInHistory = (
    type: QrRecordType,
    id: string,
    scanMethod: QrScanHistoryEntry["scanMethod"]
  ) => {
    const now = new Date();
    const scannedAtIso = now.toISOString();
    const scannedTimeDisplay = `${scannedAtIso.split("T")[0]} ${now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    )}`;

    const lookupFarms = [...farms, ...REFERENCE_SCANNABLE_PARCELS];
    const lookupHarvests = [...harvests, ...REFERENCE_SCANNABLE_HARVESTS];

    if (type === "parcel") {
      const targetFarm =
        lookupFarms.find(
          (f) =>
            f.id.toLowerCase() === id.toLowerCase() ||
            f.name.toLowerCase() === id.toLowerCase()
        ) || lookupFarms[0];
      if (!targetFarm) return;

      const newEntry: QrScanHistoryEntry = {
        scanId: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "parcel",
        recordId: targetFarm.id,
        title: targetFarm.name,
        subtitle: `${targetFarm.district}, Sector ${targetFarm.sector} · ${
          targetFarm.agroZone || "Highland Zone"
        }`,
        codeLabel: `PARCEL: ${targetFarm.id.toUpperCase()}`,
        metricsLine: `${targetFarm.sizeHa} Ha · ${
          targetFarm.altitudeMeters || targetFarm.altitude || 2200
        }m · ${targetFarm.mainCrops.join(", ")}`,
        scannedAtIso,
        scannedTimeDisplay,
        scanMethod,
        cachedFarm: targetFarm,
      };

      setScanHistory((prev) => {
        const withoutDuplicate = prev.filter(
          (item) => !(item.type === "parcel" && item.recordId === targetFarm.id)
        );
        return [newEntry, ...withoutDuplicate].slice(0, MAX_SCAN_HISTORY);
      });

      // Log to 30-day parcel scans frequency database
      logParcelScan30d(targetFarm, newEntry.title, newEntry.subtitle);

      setActiveRecordType("parcel");
      setActiveFarmOverride(targetFarm);
    } else {
      const targetHarvest =
        lookupHarvests.find(
          (h) =>
            h.id.toLowerCase() === id.toLowerCase() ||
            (h.batchCode && h.batchCode.toLowerCase() === id.toLowerCase())
        ) || lookupHarvests[0];
      if (!targetHarvest) return;

      const newEntry: QrScanHistoryEntry = {
        scanId: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "harvest",
        recordId: targetHarvest.id,
        title: `${targetHarvest.crop} (${targetHarvest.quantityKg.toLocaleString()} kg)`,
        subtitle: `Origin: ${targetHarvest.farmName} · ${targetHarvest.storageLocation}`,
        codeLabel: `BATCH: ${targetHarvest.batchCode || targetHarvest.id}`,
        metricsLine: `${targetHarvest.quantityKg.toLocaleString()} kg · Grade ${
          targetHarvest.qualityGrade
        } · ${targetHarvest.harvestDate}`,
        scannedAtIso,
        scannedTimeDisplay,
        scanMethod,
        cachedHarvest: targetHarvest,
      };

      setScanHistory((prev) => {
        const withoutDuplicate = prev.filter(
          (item) =>
            !(item.type === "harvest" && item.recordId === targetHarvest.id)
        );
        return [newEntry, ...withoutDuplicate].slice(0, MAX_SCAN_HISTORY);
      });

      // Log to 30-day harvest scans frequency database
      logHarvestScan30d(targetHarvest, newEntry.title, newEntry.subtitle);

      setActiveRecordType("harvest");
      setActiveHarvestOverride(targetHarvest);
    }
  };

  // SMART FIELD CONTEXT DETECTOR:
  // Analyzes the scanned parcel or harvest ID and its linked historical data
  // (past activities, expenses, fertilizer applications, hired labor, crop plans)
  // to detect common fertilizer types, recent laborers/supervisors, and benchmark costs.
  const smartFieldContext = useMemo(() => {
    if (!currentFarm) return null;
    const farmId = currentFarm.id;
    const farmName = currentFarm.name;

    // 1. Gather all historical records specifically linked to this parcel
    const parcelActivities = activities.filter(
      (a) => a.farmId === farmId || (a.farmName && a.farmName.toLowerCase() === farmName.toLowerCase())
    );
    const parcelExpenses = expenses.filter(
      (e) => e.farmId === farmId || (e.farmName && e.farmName.toLowerCase() === farmName.toLowerCase())
    );
    const parcelFertilizers = fertilizerApplications.filter(
      (f) => f.farmId === farmId || (f.farmName && f.farmName.toLowerCase() === farmName.toLowerCase())
    );
    const parcelLabor = hiredLabor.filter(
      (l) => l.farmId === farmId || (l.farmName && l.farmName.toLowerCase() === farmName.toLowerCase())
    );

    // 2. Aggregate Historical & Agronomic Fertilizer Context
    const fertilizerMap: Record<
      string,
      {
        count: number;
        npkRatio?: string;
        method: FertilizerApplicationMethod;
        totalKg: number;
        totalCost: number;
        costEntries: number;
        lastDate?: string;
      }
    > = {};

    // From actual fertilizer logs
    parcelFertilizers.forEach((f) => {
      const key = f.fertilizerType.trim();
      if (!key) return;
      if (!fertilizerMap[key]) {
        fertilizerMap[key] = {
          count: 0,
          npkRatio: f.npkRatio,
          method: f.applicationMethod || "side_dressing",
          totalKg: 0,
          totalCost: 0,
          costEntries: 0,
          lastDate: f.date,
        };
      }
      fertilizerMap[key].count += 1;
      fertilizerMap[key].totalKg += f.amountKg || 0;
      if (f.costRwf) {
        fertilizerMap[key].totalCost += f.costRwf;
        fertilizerMap[key].costEntries += 1;
      }
      if (!fertilizerMap[key].lastDate || (f.date && f.date > fertilizerMap[key].lastDate!)) {
        fertilizerMap[key].lastDate = f.date;
      }
    });

    // From activities
    parcelActivities.forEach((a) => {
      const fertName = a.fertilizerType?.trim() || "";
      if (fertName) {
        if (!fertilizerMap[fertName]) {
          fertilizerMap[fertName] = {
            count: 0,
            npkRatio: a.npkRatio,
            method: a.applicationMethod || "side_dressing",
            totalKg: 0,
            totalCost: 0,
            costEntries: 0,
            lastDate: a.dueDate,
          };
        }
        fertilizerMap[fertName].count += 1;
        if (a.amountKg) fertilizerMap[fertName].totalKg += a.amountKg;
        if (a.estimatedCost) {
          fertilizerMap[fertName].totalCost += a.estimatedCost;
          fertilizerMap[fertName].costEntries += 1;
        }
      } else if (a.category === "fertilizing" || a.title.toLowerCase().includes("fumbir")) {
        const text = `${a.title} ${a.notes || ""}`.toLowerCase();
        let detected = "";
        let npk = "";
        if (text.includes("npk") || text.includes("17-17-17")) {
          detected = "NPK 17-17-17";
          npk = "17-17-17";
        } else if (text.includes("dap") || text.includes("18-46-0")) {
          detected = "DAP 18-46-0";
          npk = "18-46-0";
        } else if (text.includes("urea") || text.includes("46-0-0")) {
          detected = "Urea 46-0-0";
          npk = "46-0-0";
        } else if (text.includes("imborera") || text.includes("compost")) {
          detected = "Ifumbire y'Imborera (Organic Compost)";
          npk = "Organic";
        }
        if (detected) {
          if (!fertilizerMap[detected]) {
            fertilizerMap[detected] = {
              count: 0,
              npkRatio: npk,
              method: "side_dressing",
              totalKg: 0,
              totalCost: 0,
              costEntries: 0,
              lastDate: a.dueDate,
            };
          }
          fertilizerMap[detected].count += 1;
        }
      }
    });

    // From expenses
    parcelExpenses.forEach((e) => {
      if (e.category === "fertilizer") {
        const desc = e.description.toLowerCase();
        let detected = "";
        let npk = "";
        if (desc.includes("npk") || desc.includes("17-17-17")) {
          detected = "NPK 17-17-17";
          npk = "17-17-17";
        } else if (desc.includes("dap") || desc.includes("18-46-0")) {
          detected = "DAP 18-46-0";
          npk = "18-46-0";
        } else if (desc.includes("urea")) {
          detected = "Urea 46-0-0";
          npk = "46-0-0";
        } else if (desc.includes("imborera") || desc.includes("compost") || desc.includes("manure")) {
          detected = "Ifumbire y'Imborera (Organic Compost)";
          npk = "Organic";
        }
        if (detected) {
          if (!fertilizerMap[detected]) {
            fertilizerMap[detected] = {
              count: 0,
              npkRatio: npk,
              method: "side_dressing",
              totalKg: 0,
              totalCost: 0,
              costEntries: 0,
              lastDate: e.date,
            };
          }
          fertilizerMap[detected].count += 1;
          fertilizerMap[detected].totalCost += e.amount;
          fertilizerMap[detected].costEntries += 1;
        }
      }
    });

    // Regional soil & RAB agronomic benchmarks if history is sparse
    const soilLower = `${currentFarm.soilType} ${currentFarm.agroZone || ""} ${currentFarm.district}`.toLowerCase();
    const isVolcanic = soilLower.includes("volcan") || soilLower.includes("birunga") || currentFarm.district?.toLowerCase() === "musanze";
    const isSavanna = soilLower.includes("savanna") || currentFarm.district?.toLowerCase() === "nyagatare";

    const rabBenchmarkFertilizers = isVolcanic
      ? [
          { name: "NPK 17-17-17", npk: "17-17-17", method: "side_dressing" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 250), defaultCost: Math.round(currentFarm.sizeHa * 48000), note: "High Potassium for Volcanic Irish Potatoes" },
          { name: "Ifumbire y'Imborera (Organic Compost)", npk: "Organic", method: "basal_incorporation" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 4500), defaultCost: Math.round(currentFarm.sizeHa * 35000), note: "Soil structure & moisture retention" },
          { name: "DAP 18-46-0", npk: "18-46-0", method: "basal_incorporation" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 100), defaultCost: Math.round(currentFarm.sizeHa * 34000), note: "Root establishment at planting" },
        ]
      : isSavanna
      ? [
          { name: "DAP 18-46-0", npk: "18-46-0", method: "basal_incorporation" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 120), defaultCost: Math.round(currentFarm.sizeHa * 36000), note: "Basal phosphorus for Maize & Soya" },
          { name: "Urea 46-0-0", npk: "46-0-0", method: "broadcasting" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 80), defaultCost: Math.round(currentFarm.sizeHa * 28000), note: "Nitrogen top-dressing at knee-high" },
          { name: "NPK 17-17-17", npk: "17-17-17", method: "side_dressing" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 120), defaultCost: Math.round(currentFarm.sizeHa * 36000), note: "Secondary growth booster" },
        ]
      : [
          { name: "DAP 18-46-0", npk: "18-46-0", method: "basal_incorporation" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 90), defaultCost: Math.round(currentFarm.sizeHa * 30000), note: "Phosphorus for legume nodulation" },
          { name: "Ishwagara (Agricultural Lime CaCO3)", npk: "Soil Conditioner", method: "broadcasting" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 800), defaultCost: Math.round(currentFarm.sizeHa * 25000), note: "Acid neutralization for terraced hillsides" },
          { name: "Ifumbire y'Imborera (Organic Compost)", npk: "Organic", method: "basal_incorporation" as FertilizerApplicationMethod, defaultKg: Math.round(currentFarm.sizeHa * 3000), defaultCost: Math.round(currentFarm.sizeHa * 28000), note: "Organic matter restoration" },
        ];

    const detectedFertilizers = Object.entries(fertilizerMap)
      .map(([name, data]) => ({
        name,
        npkRatio: data.npkRatio || "17-17-17",
        method: data.method,
        typicalKg: data.count > 0 && data.totalKg > 0 ? Math.round(data.totalKg / data.count) : Math.round(currentFarm.sizeHa * 100),
        typicalCost: data.costEntries > 0 ? Math.round(data.totalCost / data.costEntries) : Math.round(currentFarm.sizeHa * 35000),
        frequency: data.count,
        lastDate: data.lastDate,
        isHistorical: true,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    rabBenchmarkFertilizers.forEach((bench) => {
      if (!detectedFertilizers.some((f) => f.name.toLowerCase() === bench.name.toLowerCase())) {
        detectedFertilizers.push({
          name: bench.name,
          npkRatio: bench.npk,
          method: bench.method,
          typicalKg: bench.defaultKg,
          typicalCost: bench.defaultCost,
          frequency: 0,
          lastDate: undefined,
          isHistorical: false,
        });
      }
    });

    const topFertilizer = detectedFertilizers[0];

    // 3. Aggregate Recent Laborers / Supervisors Context
    const laborMap: Record<
      string,
      {
        count: number;
        role: string;
        dailyRate: number;
        crewSize: number;
        lastDate?: string;
      }
    > = {};

    // From hiredLabor
    parcelLabor.forEach((l) => {
      const name = l.supervisorName?.trim();
      if (!name) return;
      if (!laborMap[name]) {
        laborMap[name] = {
          count: 0,
          role: l.taskType || "weeding",
          dailyRate: l.dailyRateRwf || 3000,
          crewSize: l.workerCount || 4,
          lastDate: l.date,
        };
      }
      laborMap[name].count += 1;
      if (l.dailyRateRwf) laborMap[name].dailyRate = l.dailyRateRwf;
      if (l.workerCount) laborMap[name].crewSize = l.workerCount;
      if (!laborMap[name].lastDate || (l.date && l.date > laborMap[name].lastDate!)) {
        laborMap[name].lastDate = l.date;
      }
    });

    // From activities
    parcelActivities.forEach((a) => {
      const worker = a.assignedWorker?.trim() || a.assignedTo?.trim() || "";
      if (worker) {
        if (!laborMap[worker]) {
          laborMap[worker] = {
            count: 0,
            role: a.category || "weeding",
            dailyRate: 3000,
            crewSize: 3,
            lastDate: a.dueDate,
          };
        }
        laborMap[worker].count += 1;
        if (!laborMap[worker].lastDate || (a.dueDate && a.dueDate > laborMap[worker].lastDate!)) {
          laborMap[worker].lastDate = a.dueDate;
        }
      }
    });

    // From expenses
    parcelExpenses.forEach((e) => {
      if (e.category === "labor") {
        const desc = e.description;
        let workerName = "";
        if (desc.includes("Jean Bosco") || desc.includes("Bosco")) workerName = "Jean Bosco Uwimana";
        else if (desc.includes("Mukamana") || desc.includes("Chantal")) workerName = "Mukamana Chantal";
        else if (desc.includes("Eric") || desc.includes("Ndayisaba")) workerName = "Eric Ndayisaba";
        else if (desc.includes("Hakizimana") || desc.includes("Emmanuel")) workerName = "Emmanuel Hakizimana";
        if (workerName) {
          if (!laborMap[workerName]) {
            laborMap[workerName] = {
              count: 0,
              role: "weeding",
              dailyRate: 3000,
              crewSize: Math.max(1, Math.round(e.amount / 3000)),
              lastDate: e.date,
            };
          }
          laborMap[workerName].count += 1;
        }
      }
    });

    // Cooperative qualified labor pool defaults (if 0 or sparse logs)
    const cooperativeLaborPool = [
      { name: "Jean Bosco Uwimana", role: "weeding", roleLabel: "Coop Field Crew Lead · Weeding & Tillage", dailyRate: 3000, crewSize: 4 },
      { name: "Mukamana Chantal", role: "planting", roleLabel: "Agronomy Field Scout · Planting & Thinning", dailyRate: 2800, crewSize: 3 },
      { name: "Eric Ndayisaba", role: "spraying", roleLabel: "Certified Sprayer Operator · Plant Protection", dailyRate: 3500, crewSize: 2 },
      { name: "Emmanuel Hakizimana", role: "fertilizing", roleLabel: "Fertilizer & Irrigation Specialist", dailyRate: 3000, crewSize: 3 },
    ];

    const detectedLaborers = Object.entries(laborMap)
      .map(([name, data]) => ({
        name,
        role: data.role,
        roleLabel: `${data.role} · ${data.crewSize} workers @ ${data.dailyRate.toLocaleString()} RWF/day`,
        dailyRate: data.dailyRate,
        crewSize: data.crewSize,
        frequency: data.count,
        lastDate: data.lastDate,
        isHistorical: true,
      }))
      .sort((a, b) => {
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        return (b.lastDate || "").localeCompare(a.lastDate || "");
      });

    cooperativeLaborPool.forEach((worker) => {
      if (!detectedLaborers.some((l) => l.name.toLowerCase() === worker.name.toLowerCase())) {
        detectedLaborers.push({
          name: worker.name,
          role: worker.role,
          roleLabel: worker.roleLabel,
          dailyRate: worker.dailyRate,
          crewSize: worker.crewSize,
          frequency: 0,
          lastDate: undefined,
          isHistorical: false,
        });
      }
    });

    const topLaborer = detectedLaborers[0];

    const primaryCrop = currentFarm.mainCrops?.[0] || (currentHarvest ? currentHarvest.crop : "Ibirayi (Kinigi)");
    const totalActivities = parcelActivities.length;
    const totalExpenses = parcelExpenses.length;
    const totalLaborLogs = parcelLabor.length;
    const totalFertilizers = parcelFertilizers.length;
    const hasHistoricalRecords = totalActivities > 0 || totalExpenses > 0 || totalLaborLogs > 0 || totalFertilizers > 0;

    return {
      farmId,
      farmName,
      district: currentFarm.district,
      sector: currentFarm.sector,
      sizeHa: currentFarm.sizeHa,
      soilType: currentFarm.soilType,
      primaryCrop,
      totalActivities,
      totalExpenses,
      totalLaborLogs,
      totalFertilizers,
      hasHistoricalRecords,
      detectedFertilizers,
      topFertilizer,
      detectedLaborers,
      topLaborer,
    };
  }, [currentFarm, currentHarvest, activities, expenses, fertilizerApplications, hiredLabor, plans, harvests]);

  // Reusable Smart Field Context suggestion applier for activity & expense forms
  const applySmartContextSuggestion = (
    presetType: "fertilizer" | "labor" | "spraying" | "transport" | "custom_fert" | "custom_labor",
    customPayload?: any
  ) => {
    if (!smartFieldContext) return;
    const today = new Date().toISOString().split("T")[0];
    const { farmId, farmName, primaryCrop, sizeHa, topFertilizer, topLaborer } = smartFieldContext;

    if (presetType === "fertilizer" || presetType === "custom_fert") {
      const fertItem = customPayload || topFertilizer;
      const fertName = fertItem.name;
      const fertCost = fertItem.typicalCost || Math.round(sizeHa * 36000);
      const fertKg = fertItem.typicalKg || Math.round(sizeHa * 80);

      setActivityFormData((prev) => ({
        ...prev,
        title:
          language === "rw"
            ? `Gufumbira Umurima (${fertName} · ${farmName})`
            : `Fertilizer Application (${fertName} · ${farmName})`,
        category: "fertilizing",
        crop: primaryCrop,
        farmId,
        farmName,
        fertilizerType: fertName,
        assignedWorker: prev.assignedWorker || topLaborer.name,
        dueDate: today,
        estimatedCost: fertCost,
        notes: `[Smart Field Context: Fertilizer] Historical fertilizer: ${fertName} (${fertItem.npkRatio || "17-17-17"}). Est. ${fertKg} kg for ${sizeHa} Ha. Method: ${fertItem.method || "side_dressing"}.`,
      }));

      setExpenseFormData({
        description:
          language === "rw"
            ? `Ifumbire ya ${fertName} (${fertKg} kg) - ${farmName}`
            : `${fertName} Fertilizer Purchase (${fertKg} kg) - ${farmName}`,
        category: "fertilizer",
        crop: primaryCrop,
        farmId,
        farmName,
        amount: fertCost,
        date: today,
      });

      setIsPreFilledByScan(true);
      setCreationFeedback({
        type: "success",
        message:
          language === "rw"
            ? `Smart Field Context: Ifishi yujujwe n'ifumbire ya ${fertName} (${fertCost.toLocaleString()} RWF)!`
            : `Smart Field Context: Pre-filled forms with ${fertName} fertilizer (${fertCost.toLocaleString()} RWF)!`,
      });
    } else if (presetType === "labor" || presetType === "custom_labor") {
      const labItem = customPayload || topLaborer;
      const workerName = labItem.name;
      const dailyRate = labItem.dailyRate || 3000;
      const crewSize = labItem.crewSize || 4;
      const totalLaborCost = dailyRate * crewSize;

      setActivityFormData((prev) => ({
        ...prev,
        title:
          language === "rw"
            ? `Kubagara & Kwita ku Murima (Umuhagarikizi: ${workerName})`
            : `Field Maintenance & Weeding (Lead: ${workerName})`,
        category: "weeding",
        crop: primaryCrop,
        farmId,
        farmName,
        assignedWorker: workerName,
        dueDate: today,
        estimatedCost: totalLaborCost,
        notes: `[Smart Field Context: Labor] Recent laborer/supervisor: ${workerName}. Crew: ${crewSize} workers @ ${dailyRate.toLocaleString()} RWF/day.`,
      }));

      setExpenseFormData({
        description:
          language === "rw"
            ? `Amafaranga y'abakozi: ${workerName} (${crewSize} abakozi) - ${farmName}`
            : `Hired Labor: ${workerName} Crew (${crewSize} workers) - ${farmName}`,
        category: "labor",
        crop: primaryCrop,
        farmId,
        farmName,
        amount: totalLaborCost,
        date: today,
      });

      setIsPreFilledByScan(true);
      setCreationFeedback({
        type: "success",
        message:
          language === "rw"
            ? `Smart Field Context: Ifishi yujujwe n'abakozi bayobowe na ${workerName} (${totalLaborCost.toLocaleString()} RWF)!`
            : `Smart Field Context: Pre-filled forms with labor crew led by ${workerName} (${totalLaborCost.toLocaleString()} RWF)!`,
      });
    } else if (presetType === "spraying") {
      const sprayCost = Math.round(sizeHa * 18000);
      const sprayerName = smartFieldContext.detectedLaborers.find((l) => l.name.includes("Eric"))?.name || topLaborer.name;

      setActivityFormData((prev) => ({
        ...prev,
        title:
          language === "rw"
            ? `Gutera Umuti wo Kurinda Imyaka (${farmName} · ${primaryCrop})`
            : `Plant Protection Spraying (${farmName} · ${primaryCrop})`,
        category: "spraying",
        crop: primaryCrop,
        farmId,
        farmName,
        assignedWorker: sprayerName,
        dueDate: today,
        estimatedCost: sprayCost,
        notes: `[Smart Field Context: Spraying] Preventative fungicide/insecticide application for ${primaryCrop}. Certified operator: ${sprayerName}.`,
      }));

      setExpenseFormData({
        description:
          language === "rw"
            ? `Imiti yo Kurinda Imyaka (Fungicide & Insecticide) - ${farmName}`
            : `Pest & Disease Plant Protection Chemicals - ${farmName}`,
        category: "pesticides",
        crop: primaryCrop,
        farmId,
        farmName,
        amount: sprayCost,
        date: today,
      });

      setIsPreFilledByScan(true);
      setCreationFeedback({
        type: "success",
        message:
          language === "rw"
            ? `Smart Field Context: Ifishi yujujwe n'ibikorwa byo gutera umuti!`
            : `Smart Field Context: Pre-filled forms with plant protection & spraying!`,
      });
    } else if (presetType === "transport") {
      const transportCost = Math.round(sizeHa * 28000);
      setActivityFormData((prev) => ({
        ...prev,
        title:
          language === "rw"
            ? `Gupakira & Gutwara Umusaruro (${farmName})`
            : `Harvest Packing & Market Dispatch (${farmName})`,
        category: "post_harvest",
        crop: primaryCrop,
        farmId,
        farmName,
        dueDate: today,
        estimatedCost: transportCost,
        notes: `[Smart Field Context: Transport] Post-harvest logistics & quality sorting for ${primaryCrop}.`,
      }));

      setExpenseFormData({
        description:
          language === "rw"
            ? `Gutwara & Gupakira Umusaruro - ${farmName}`
            : `Logistics & Transport to Wholesale Market - ${farmName}`,
        category: "transport",
        crop: primaryCrop,
        farmId,
        farmName,
        amount: transportCost,
        date: today,
      });

      setIsPreFilledByScan(true);
      setCreationFeedback({
        type: "success",
        message:
          language === "rw"
            ? `Smart Field Context: Ifishi yujujwe n'ibikorwa byo gutwara umusaruro!`
            : `Smart Field Context: Pre-filled forms with transport & dispatch!`,
      });
    }
  };

  // Auto-Complete helper: pre-fills creation forms based on scanned parcel or harvest data
  const applyAutoCompleteFromRecord = (
    type: QrRecordType,
    id: string,
    overrideFarm?: Farm | null,
    overrideHarvest?: HarvestRecord | null
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const allFarms = farms.length > 0 ? farms : REFERENCE_SCANNABLE_PARCELS;
    const allHarvests = harvests.length > 0 ? harvests : REFERENCE_SCANNABLE_HARVESTS;

    if (type === "parcel") {
      const targetFarm =
        overrideFarm ||
        allFarms.find((f) => f.id.toLowerCase() === id.toLowerCase() || f.name.toLowerCase() === id.toLowerCase()) ||
        allFarms[0];

      const mainCrop = targetFarm.mainCrops?.[0] || "Ibirayi (Kinigi)";

      // Prioritize Smart Field Context analysis if available for this parcel
      const topFert = smartFieldContext?.topFertilizer;
      const topLab = smartFieldContext?.topLaborer;

      const fertName = topFert?.name || "NPK 17-17-17";
      const fertCost = topFert?.typicalCost || Math.round(targetFarm.sizeHa * 35000);
      const workerName = topLab?.name || "Jean Bosco Uwimana";

      setActivityFormData({
        title:
          language === "rw"
            ? `Gufumbira Umurima (${fertName} · ${targetFarm.name})`
            : `Fertilizer Application (${fertName} · ${targetFarm.name})`,
        category: "fertilizing",
        crop: mainCrop,
        farmId: targetFarm.id,
        farmName: targetFarm.name,
        fertilizerType: fertName,
        assignedWorker: workerName,
        dueDate: today,
        status: "pending",
        estimatedCost: fertCost,
        notes: `[Smart Field Context Auto-Fill] Parcel: ${targetFarm.name} (${targetFarm.id}) · Soil: ${targetFarm.soilType} · Area: ${targetFarm.sizeHa} Ha · Top Fertilizer: ${fertName} · Recent Laborer: ${workerName}.`,
      });

      setExpenseFormData({
        description:
          language === "rw"
            ? `Ifumbire ya ${fertName} (${topFert?.typicalKg || 50} kg) - ${targetFarm.name}`
            : `${fertName} Fertilizer Input (${topFert?.typicalKg || 50} kg) - ${targetFarm.name}`,
        category: "fertilizer",
        crop: mainCrop,
        farmId: targetFarm.id,
        farmName: targetFarm.name,
        amount: fertCost,
        date: today,
      });

      setIsPreFilledByScan(true);
    } else {
      const targetHarvest =
        overrideHarvest ||
        allHarvests.find(
          (h) =>
            h.id.toLowerCase() === id.toLowerCase() ||
            (h.batchCode && h.batchCode.toLowerCase() === id.toLowerCase())
        ) ||
        allHarvests[0];

      setActivityFormData({
        title:
          language === "rw"
            ? `Gupakira & Kugenzura Ubuziranenge (${targetHarvest.crop} · ${targetHarvest.batchCode || targetHarvest.id})`
            : `Post-Harvest Dispatch & Quality Control (${targetHarvest.crop} · ${targetHarvest.batchCode || targetHarvest.id})`,
        category: "post_harvest",
        crop: targetHarvest.crop,
        farmId: targetHarvest.farmId,
        farmName: targetHarvest.farmName,
        fertilizerType: "",
        assignedWorker: smartFieldContext?.topLaborer.name || "Jean Bosco Uwimana",
        dueDate: today,
        status: "pending",
        estimatedCost: Math.round(targetHarvest.quantityKg * 8),
        notes: `[Auto-Filled from Harvest QR Scan] Batch Code: ${targetHarvest.batchCode || targetHarvest.id}, Volume: ${targetHarvest.quantityKg.toLocaleString()} kg, Grade ${targetHarvest.qualityGrade}, Facility: ${targetHarvest.storageLocation}`,
      });

      setExpenseFormData({
        description:
          language === "rw"
            ? `Gutwara & Gupakira Umusaruro (${targetHarvest.crop} - Batch ${targetHarvest.batchCode || targetHarvest.id})`
            : `Logistics & Transport for ${targetHarvest.crop} (Batch ${targetHarvest.batchCode || targetHarvest.id})`,
        category: "transport",
        crop: targetHarvest.crop,
        farmId: targetHarvest.farmId,
        farmName: targetHarvest.farmName,
        amount: Math.round(targetHarvest.quantityKg * 12),
        date: today,
      });

      setIsPreFilledByScan(true);
    }
  };

  // Unified handler when a QR code is decoded or triggered
  const handleCompleteScan = (
    type: QrRecordType,
    id: string,
    scanMethod: QrScanHistoryEntry["scanMethod"],
    targetView: QrModalMode = "details"
  ) => {
    recordScanInHistory(type, id, scanMethod);
    onSelectRecordFromScan(type, id);
    setMode(targetView);

    // If Auto-Complete Fields is enabled, automatically pre-fill the activity & expense creation forms!
    if (autoCompleteFieldsEnabled) {
      applyAutoCompleteFromRecord(type, id);
      setCreationFeedback({
        type: "success",
        message:
          language === "rw"
            ? `Auto-Complete ikora: Ifishi y'igikorwa gishya n'amafaranga byujujwe n'amakuru ya QR (${id})!`
            : `Auto-Complete active: Creation forms for new related activity and expense pre-filled from scanned QR (${id})!`,
      });
    } else {
      setIsPreFilledByScan(false);
    }
  };

  // Submit handler for Activity Creation Form
  const handleSaveActivityForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activityFormData.title.trim()) {
      setCreationFeedback({
        type: "error",
        message: language === "rw" ? "Shyiramo umutwe w'igikorwa." : "Please provide an activity title.",
      });
      return;
    }

    const newActivityPayload: Omit<FarmActivity, "id"> = {
      title: activityFormData.title.trim(),
      category: activityFormData.category,
      crop: activityFormData.crop || (activeRecordType === "parcel" ? currentFarm?.mainCrops?.[0] || "Mixed" : currentHarvest?.crop || "Produce"),
      farmId: activityFormData.farmId || (activeRecordType === "parcel" ? currentFarm?.id || "parcel-01" : currentHarvest?.farmId || "parcel-01"),
      farmName: activityFormData.farmName || (activeRecordType === "parcel" ? currentFarm?.name || "Farm Parcel" : currentHarvest?.farmName || "Farm Parcel"),
      dueDate: activityFormData.dueDate,
      status: activityFormData.status,
      assignedWorker: activityFormData.assignedWorker?.trim() || undefined,
      fertilizerType: activityFormData.fertilizerType?.trim() || undefined,
      estimatedCost: Number(activityFormData.estimatedCost) || 0,
      notes: activityFormData.notes,
    };

    if (onAddActivity) {
      onAddActivity(newActivityPayload);
    }

    const createdRecord: FarmActivity = {
      ...newActivityPayload,
      id: `act-${Date.now()}`,
      syncStatus: "synced",
    };
    setLocalAddedActivities((prev) => [createdRecord, ...prev]);

    setCreationFeedback({
      type: "success",
      message:
        language === "rw"
          ? `Igikorwa "${activityFormData.title}" cyashyizweho neza ku murima!`
          : `Activity "${activityFormData.title}" logged successfully for this parcel!`,
    });
  };

  // Submit handler for Expense Creation Form
  const handleSaveExpenseForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!expenseFormData.description.trim() || Number(expenseFormData.amount) <= 0) {
      setCreationFeedback({
        type: "error",
        message: language === "rw" ? "Shyiramo ibisobanuro n'amafaranga yemewe." : "Please enter a valid description and amount.",
      });
      return;
    }

    const newExpensePayload: Omit<Expense, "id" | "syncStatus"> = {
      description: expenseFormData.description.trim(),
      category: expenseFormData.category,
      crop: expenseFormData.crop || (activeRecordType === "parcel" ? currentFarm?.mainCrops?.[0] || "Mixed" : currentHarvest?.crop || "Produce"),
      farmId: expenseFormData.farmId || (activeRecordType === "parcel" ? currentFarm?.id || "parcel-01" : currentHarvest?.farmId || "parcel-01"),
      farmName: expenseFormData.farmName || (activeRecordType === "parcel" ? currentFarm?.name || "Farm Parcel" : currentHarvest?.farmName || "Farm Parcel"),
      amount: Number(expenseFormData.amount),
      date: expenseFormData.date,
    };

    if (onAddExpense) {
      onAddExpense(newExpensePayload);
    }

    const createdRecord: Expense = {
      ...newExpensePayload,
      id: `exp-${Date.now()}`,
      syncStatus: "synced",
    };
    setLocalAddedExpenses((prev) => [createdRecord, ...prev]);

    setCreationFeedback({
      type: "success",
      message:
        language === "rw"
          ? `Amafaranga (${expenseFormData.amount.toLocaleString()} RWF) yanditswe neza!`
          : `Expense of ${Number(expenseFormData.amount).toLocaleString()} RWF recorded successfully!`,
    });
  };

  // Stop camera helper
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen || mode !== "scanner") {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, mode]);

  const startCameraScanner = async () => {
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        requestAnimationFrame(tickCameraFrame);
      }
    } catch {
      setScanError(
        language === "rw"
          ? "Camera ntiyashoboye gufunguka. Ushobora gushyiraho ifoto ya QR Code cyangwa ugakanda kuri QR yo kugerageza hasi."
          : "Camera access unavailable in this browser frame. Upload a QR image or click any parcel/harvest below to simulate a camera scan."
      );
    }
  };

  const tickCameraFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          const resolved = parseScannedQrPayload(code.data, farms, harvests);
          if (resolved) {
            stopCamera();
            handleCompleteScan(resolved.type, resolved.id, "camera", "details");
            return;
          }
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(tickCameraFrame);
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError("");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (decoded && decoded.data) {
          const resolved = parseScannedQrPayload(decoded.data, farms, harvests);
          if (resolved) {
            handleCompleteScan(resolved.type, resolved.id, "qr_image", "details");
            return;
          }
        }
        setScanError(
          language === "rw"
            ? "Ifoto yashyizwemo ntiyagaragaje QR Code y'umurima cyangwa umusaruro."
            : "Could not decode a valid Farm Parcel or Harvest Batch QR code from that image."
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenHistoryItem = (
    entry: QrScanHistoryEntry,
    targetMode: "details" | "qr_label" = "details"
  ) => {
    if (entry.type === "parcel") {
      setActiveRecordType("parcel");
      const resolvedFarm =
        entry.cachedFarm ||
        allScannableFarms.find(
          (f) =>
            f.id.toLowerCase() === entry.recordId.toLowerCase() ||
            f.name.toLowerCase() === entry.title.toLowerCase()
        ) ||
        allScannableFarms[0];
      if (resolvedFarm) {
        setActiveFarmOverride(resolvedFarm);
      }
      onSelectRecordFromScan("parcel", entry.recordId);
    } else {
      setActiveRecordType("harvest");
      const resolvedHarvest =
        entry.cachedHarvest ||
        allScannableHarvests.find(
          (h) =>
            h.id.toLowerCase() === entry.recordId.toLowerCase() ||
            (h.batchCode && h.batchCode.toLowerCase() === entry.recordId.toLowerCase())
        ) ||
        allScannableHarvests[0];
      if (resolvedHarvest) {
        setActiveHarvestOverride(resolvedHarvest);
      }
      onSelectRecordFromScan("harvest", entry.recordId);
    }
    setMode(targetMode);
  };

  const handleRemoveHistoryItem = (scanId: string) => {
    setScanHistory((prev) => prev.filter((item) => item.scanId !== scanId));
  };

  const handleClearScanHistory = () => {
    setScanHistory([]);
  };

  // Helper to populate up to 5 recent camera scans for immediate field verification
  const handlePopulateSampleScans = () => {
    const p1 = allScannableFarms[0] || REFERENCE_SCANNABLE_PARCELS[0];
    const h1 = allScannableHarvests[0] || REFERENCE_SCANNABLE_HARVESTS[0];
    const p2 = allScannableFarms[1] || REFERENCE_SCANNABLE_PARCELS[1];
    const h2 = allScannableHarvests[1] || REFERENCE_SCANNABLE_HARVESTS[1];
    const p3 = allScannableFarms[2] || REFERENCE_SCANNABLE_PARCELS[2];

    const nowMs = Date.now();
    const makeTime = (offsetMinutes: number) => {
      const d = new Date(nowMs - offsetMinutes * 60000);
      const iso = d.toISOString();
      return {
        iso,
        display: `${iso.split("T")[0]} ${d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`,
      };
    };

    const t1 = makeTime(1);
    const t2 = makeTime(6);
    const t3 = makeTime(14);
    const t4 = makeTime(28);
    const t5 = makeTime(45);

    const sampleEntries: QrScanHistoryEntry[] = [
      {
        scanId: `scan-${nowMs}-1`,
        type: "parcel",
        recordId: p1.id,
        title: p1.name,
        subtitle: `${p1.district}, Sector ${p1.sector} · ${
          p1.agroZone || "Highland Zone"
        }`,
        codeLabel: `PARCEL: ${p1.id.toUpperCase()}`,
        metricsLine: `${p1.sizeHa} Ha · ${
          p1.altitudeMeters || p1.altitude || 2240
        }m · ${p1.mainCrops.join(", ")}`,
        scannedAtIso: t1.iso,
        scannedTimeDisplay: t1.display,
        scanMethod: "camera",
        cachedFarm: p1,
      },
      {
        scanId: `scan-${nowMs}-2`,
        type: "harvest",
        recordId: h1.id,
        title: `${h1.crop} (${h1.quantityKg.toLocaleString()} kg)`,
        subtitle: `Origin: ${h1.farmName} · ${h1.storageLocation}`,
        codeLabel: `BATCH: ${h1.batchCode || h1.id}`,
        metricsLine: `${h1.quantityKg.toLocaleString()} kg · Grade ${
          h1.qualityGrade
        } · ${h1.harvestDate}`,
        scannedAtIso: t2.iso,
        scannedTimeDisplay: t2.display,
        scanMethod: "camera",
        cachedHarvest: h1,
      },
      {
        scanId: `scan-${nowMs}-3`,
        type: "parcel",
        recordId: p2.id,
        title: p2.name,
        subtitle: `${p2.district}, Sector ${p2.sector} · ${
          p2.agroZone || "Eastern Savanna"
        }`,
        codeLabel: `PARCEL: ${p2.id.toUpperCase()}`,
        metricsLine: `${p2.sizeHa} Ha · ${
          p2.altitudeMeters || p2.altitude || 1410
        }m · ${p2.mainCrops.join(", ")}`,
        scannedAtIso: t3.iso,
        scannedTimeDisplay: t3.display,
        scanMethod: "camera",
        cachedFarm: p2,
      },
      {
        scanId: `scan-${nowMs}-4`,
        type: "harvest",
        recordId: h2.id,
        title: `${h2.crop} (${h2.quantityKg.toLocaleString()} kg)`,
        subtitle: `Origin: ${h2.farmName} · ${h2.storageLocation}`,
        codeLabel: `BATCH: ${h2.batchCode || h2.id}`,
        metricsLine: `${h2.quantityKg.toLocaleString()} kg · Grade ${
          h2.qualityGrade
        } · ${h2.harvestDate}`,
        scannedAtIso: t4.iso,
        scannedTimeDisplay: t4.display,
        scanMethod: "qr_image",
        cachedHarvest: h2,
      },
      {
        scanId: `scan-${nowMs}-5`,
        type: "parcel",
        recordId: p3.id,
        title: p3.name,
        subtitle: `${p3.district}, Sector ${p3.sector} · ${
          p3.agroZone || "Southern Plateau"
        }`,
        codeLabel: `PARCEL: ${p3.id.toUpperCase()}`,
        metricsLine: `${p3.sizeHa} Ha · ${
          p3.altitudeMeters || p3.altitude || 1765
        }m · ${p3.mainCrops.join(", ")}`,
        scannedAtIso: t5.iso,
        scannedTimeDisplay: t5.display,
        scanMethod: "camera",
        cachedFarm: p3,
      },
    ];

    setScanHistory(sampleEntries.slice(0, MAX_SCAN_HISTORY));

    // Also populate 30-day log with diverse sample parcels and harvests for visualization
    const now = Date.now();
    const dayMs = 86400000;
    const sample30d: Scan30dItem[] = [
      { id: `p30-${now}-1`, categoryGroup: "parcel", typeKey: "volcanic", typeNameEn: "Volcanic Highlands", typeNameRw: "Imisozi y'Ibirunga", recordId: p1.id, recordName: p1.name, timestamp: now - 1 * dayMs },
      { id: `p30-${now}-2`, categoryGroup: "parcel", typeKey: "savanna", typeNameEn: "Eastern Savanna", typeNameRw: "Ubutayu bw'Iburasirazuba", recordId: p2.id, recordName: p2.name, timestamp: now - 3 * dayMs },
      { id: `p30-${now}-3`, categoryGroup: "parcel", typeKey: "terraced", typeNameEn: "Terraced Slopes", typeNameRw: "Amaterasi y'Imisozi", recordId: p3.id, recordName: p3.name, timestamp: now - 7 * dayMs },
      { id: `p30-${now}-4`, categoryGroup: "parcel", typeKey: "volcanic", typeNameEn: "Volcanic Highlands", typeNameRw: "Imisozi y'Ibirunga", recordId: p1.id, recordName: p1.name, timestamp: now - 11 * dayMs },
      { id: `p30-${now}-5`, categoryGroup: "parcel", typeKey: "marshland", typeNameEn: "Valley Marshland", typeNameRw: "Ibifunzo n'Imikoki", recordId: "parcel-marsh-01", recordName: "Bugarama Valley Rice Marsh", timestamp: now - 18 * dayMs },
      { id: `p30-${now}-6`, categoryGroup: "harvest", typeKey: "potato", typeNameEn: "Irish Potatoes", typeNameRw: "Ibirayi (Kinigi)", recordId: h1.id, recordName: `${h1.crop} Batch`, timestamp: now - 2 * dayMs },
      { id: `p30-${now}-7`, categoryGroup: "harvest", typeKey: "maize", typeNameEn: "Hybrid Maize", typeNameRw: "Ibigori (Hybrid)", recordId: h2.id, recordName: `${h2.crop} Batch`, timestamp: now - 5 * dayMs },
      { id: `p30-${now}-8`, categoryGroup: "harvest", typeKey: "coffee", typeNameEn: "Specialty Coffee", typeNameRw: "Ikawa y'Umwimerere", recordId: "harv-coffee-01", recordName: "Arabica Coffee Lot", timestamp: now - 9 * dayMs },
      { id: `p30-${now}-9`, categoryGroup: "harvest", typeKey: "potato", typeNameEn: "Irish Potatoes", typeNameRw: "Ibirayi (Kinigi)", recordId: h1.id, recordName: `${h1.crop} Batch`, timestamp: now - 14 * dayMs },
      { id: `p30-${now}-10`, categoryGroup: "harvest", typeKey: "beans", typeNameEn: "Climbing Beans", typeNameRw: "Ibishyimbo by'Ubutare", recordId: "harv-beans-01", recordName: "RWV1129 Beans", timestamp: now - 22 * dayMs },
    ];
    setScannedItems30d(sample30d);
  };

  const handleSimulateRandomScan = () => {
    const isParcel = Math.random() > 0.5;
    if (isParcel) {
      const randomFarm =
        allScannableFarms[Math.floor(Math.random() * allScannableFarms.length)] ||
        REFERENCE_SCANNABLE_PARCELS[0];
      logParcelScan30d(
        randomFarm,
        randomFarm.name,
        `${randomFarm.district} · ${randomFarm.agroZone || "Agro-Ecological Zone"}`
      );
    } else {
      const randomHarvest =
        allScannableHarvests[Math.floor(Math.random() * allScannableHarvests.length)] ||
        REFERENCE_SCANNABLE_HARVESTS[0];
      logHarvestScan30d(
        randomHarvest,
        `${randomHarvest.crop} (${randomHarvest.quantityKg.toLocaleString()} kg)`,
        `Origin: ${randomHarvest.farmName} · Storage: ${randomHarvest.storageLocation}`
      );
    }
  };

  const handleClear30dScans = () => {
    setScannedItems30d([]);
    try {
      localStorage.removeItem(SCAN_30D_COMBINED_LOG_KEY);
      localStorage.removeItem(SCAN_30D_PARCEL_LOG_KEY);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deepLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reusable helper to generate and download a single QR code PNG image for printing
  const handleDownloadQrPng = async (
    type: QrRecordType,
    id: string,
    entityName?: string
  ) => {
    try {
      const url = buildDeepLinkUrl(type, id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: type === "parcel" ? "#064E3B" : "#78350F",
          light: "#FFFFFF",
        },
      });
      const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `TERIMBERE_QR_${type.toUpperCase()}_${cleanId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate and download QR PNG image:", err);
    }
  };

  const handleDownloadQr = () => {
    handleDownloadQrPng(activeRecordType, activeId, currentFarm?.name || currentHarvest?.crop);
  };

  // Generate a single PDF document containing all selected QR codes for batch printing
  const generateBatchQrPdf = async (
    itemsToPrint: QrScanHistoryEntry[],
    openPreview: boolean = true
  ) => {
    if (itemsToPrint.length === 0) return;
    setIsGeneratingBatchPdf(true);
    setBatchPdfProgress(language === "rw" ? "Gutegura impapuro za PDF..." : "Initializing Batch PDF layout...");

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 12;
      const cardWidth = 92;
      const cardHeight = 85;
      const gapX = 6;
      const gapY = 6;
      const cardsPerPage = 6;

      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];
        setBatchPdfProgress(
          language === "rw"
            ? `Gukora QR ${i + 1} kuri ${itemsToPrint.length}...`
            : `Generating QR card ${i + 1} of ${itemsToPrint.length}...`
        );

        const pageIndex = Math.floor(i / cardsPerPage);
        const cardOnPageIndex = i % cardsPerPage;

        if (cardOnPageIndex === 0 && pageIndex > 0) {
          doc.addPage();
        }

        const col = cardOnPageIndex % 2;
        const row = Math.floor(cardOnPageIndex / 2);

        const cardX = marginX + col * (cardWidth + gapX);
        const cardY = marginY + row * (cardHeight + gapY);

        // Cutting guideline (dashed border)
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, "S");
        doc.setLineDashPattern([], 0);

        // Card header banner
        const isParcel = item.type === "parcel";
        doc.setFillColor(isParcel ? 6 : 217, isParcel ? 78 : 119, isParcel ? 59 : 6);
        doc.rect(cardX, cardY, cardWidth, 10, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("TERIMBERE AGRI-TRACK · RWANDA", cardX + 4, cardY + 6.8);

        const typeBadge = isParcel ? "PARCEL SIGNPOST" : "HARVEST BATCH";
        doc.setFontSize(7);
        doc.text(typeBadge, cardX + cardWidth - 4, cardY + 6.8, { align: "right" });

        // Generate QR code data URL
        const qrUrl = buildDeepLinkUrl(item.type, item.recordId);
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 320,
          margin: 1,
          color: { dark: isParcel ? "#064E3B" : "#78350F", light: "#FFFFFF" },
        });

        // Place QR code image
        const qrSize = 36;
        doc.addImage(qrDataUrl, "PNG", cardX + 3.5, cardY + 13, qrSize, qrSize);

        // Text details next to QR
        const textX = cardX + 42;
        doc.setTextColor(20, 20, 20);

        // Record ID
        doc.setFont("courier", "bold");
        doc.setFontSize(8);
        doc.text(`ID: ${item.recordId}`, textX, cardY + 17);

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        const splitTitle = doc.splitTextToSize(item.title, 46);
        doc.text(splitTitle.slice(0, 2), textX, cardY + 22);

        // Subtitle / Location
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(70, 70, 70);
        const splitSub = doc.splitTextToSize(item.subtitle, 46);
        doc.text(splitSub.slice(0, 2), textX, cardY + 30);

        // Metrics
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(5, 150, 105);
        const splitMetrics = doc.splitTextToSize(item.metricsLine, 46);
        doc.text(splitMetrics.slice(0, 2), textX, cardY + 38);

        // Verification box below QR
        doc.setFillColor(248, 250, 252);
        doc.rect(cardX + 3.5, cardY + 52, cardWidth - 7, 24, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text("Official Digital Traceability & Provenance QR", cardX + 6, cardY + 57);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Scan using camera to view verified soil tests, fertilizer", cardX + 6, cardY + 61.5);
        doc.text("logs, harvest batches, and cooperative bank dossiers.", cardX + 6, cardY + 65.5);

        doc.setFont("courier", "normal");
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(`Time: ${item.scannedTimeDisplay}`, cardX + 6, cardY + 71);

        // Bottom footer of card
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text("MINAGRI / RAB / COOPERATIVE AUTHENTICATED", cardX + cardWidth - 6, cardY + 81, { align: "right" });
      }

      // Add page numbers at bottom
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `TERIMBERE Rwanda Agri-Track · Batch QR Print Sheet · Page ${p} of ${totalPages} · Exported on ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      }

      if (openPreview) {
        const pdfBlob = doc.output("blob");
        if (previewPdfBlobUrl) {
          URL.revokeObjectURL(previewPdfBlobUrl);
        }
        const newBlobUrl = URL.createObjectURL(pdfBlob);
        setPreviewPdfBlobUrl(newBlobUrl);
        setPreviewItems(itemsToPrint);
        setPreviewTotalPages(totalPages);
        setPreviewPageNumber(1);

        // Preload interactive QR image map
        const qrMap: Record<string, string> = {};
        for (const item of itemsToPrint) {
          const qrUrl = buildDeepLinkUrl(item.type, item.recordId);
          try {
            qrMap[item.scanId] = await QRCode.toDataURL(qrUrl, {
              width: 280,
              margin: 1,
              color: { dark: item.type === "parcel" ? "#064E3B" : "#78350F", light: "#FFFFFF" },
            });
          } catch {
            // ignore
          }
        }
        setPreviewQrDataUrls(qrMap);
        setIsPreviewModalOpen(true);
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        doc.save(`TERIMBERE_Batch_QR_Labels_${todayStr}.pdf`);
      }
    } catch (err) {
      console.error("Failed to generate batch PDF:", err);
    } finally {
      setIsGeneratingBatchPdf(false);
      setBatchPdfProgress("");
    }
  };

  // Trigger browser print dialog for the generated PDF document
  const handleTriggerBrowserPrint = () => {
    if (printIframeRef.current?.contentWindow) {
      try {
        printIframeRef.current.contentWindow.focus();
        printIframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn("Iframe direct print error, falling back to window.print():", err);
      }
    }
    window.print();
  };

  // Download PDF file directly from the preview
  const handleDownloadFromPreview = () => {
    if (!previewPdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = previewPdfBlobUrl;
    const todayStr = new Date().toISOString().slice(0, 10);
    a.download = `TERIMBERE_Batch_QR_Labels_${todayStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // CSV Batch Template Downloader
  const handleDownloadCsvTemplate = () => {
    const templateContent = `id,type,name,crop,district,metrics
parcel-kinigi-05,parcel,Kinigi Seed Multiplier Block 5,Ibirayi (Kinigi),Musanze,2.8 Ha · 2310m Alt
parcel-kayonza-12,parcel,Kayonza Irrigated Soya Block B,Soya (Peka 6),Kayonza,4.5 Ha · Solar Drip
BATCH-RW-2026-140,harvest,Musanze Seed Potato Lot 140,Ibirayi,Musanze,4200 kg · Grade A1
BATCH-RW-2026-141,harvest,Nyagatare Hybrid Maize Lot 141,Ibigori,Nyagatare,6800 kg · Grade A
BATCH-RW-2026-142,harvest,Huye Maraba Climbing Bean Lot 142,Ibishyimbo,Huye,2100 kg · Certified
parcel-gatsibo-03,parcel,Gatsibo Valley Marshland Block,Ibigori & Soya,Gatsibo,3.0 Ha · Valley Flat
parcel-musanze-07,parcel,Musanze Volcanic Highland Parcel G,Ibirayi (Kinigi),Musanze,1.9 Ha · Andosol
BATCH-RW-2026-145,harvest,Burera Highland Seed Potato Lot 145,Ibirayi,Burera,3100 kg · Grade A1`;

    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "terimbere_batch_qr_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Batch CSV Processor
  const handleProcessCsvContent = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setBatchUploadFeedback({
        type: "error",
        message: language === "rw" ? "Nta makuru aboneka muri CSV yoherejwe." : "No data lines found in uploaded CSV.",
      });
      return;
    }

    const allFarms = [...farms, ...REFERENCE_SCANNABLE_PARCELS];
    const allHarvests = [...harvests, ...REFERENCE_SCANNABLE_HARVESTS];
    const newHistoryEntries: QrScanHistoryEntry[] = [];
    const now = new Date();
    const nowMs = now.getTime();

    // Check if line 0 is a header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes("id") ||
      firstLineLower.includes("type") ||
      firstLineLower.includes("name") ||
      firstLineLower.includes("crop");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, index) => {
      const parts = line.split(/[,\t;]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length === 0 || !parts[0]) return;

      const rawId = parts[0];
      let rawType: QrRecordType = "parcel";

      // Detect type
      if (parts[1] && (parts[1].toLowerCase() === "harvest" || parts[1].toLowerCase() === "batch")) {
        rawType = "harvest";
      } else if (parts[1] && (parts[1].toLowerCase() === "parcel" || parts[1].toLowerCase() === "farm")) {
        rawType = "parcel";
      } else if (
        rawId.toLowerCase().includes("batch") ||
        rawId.toLowerCase().includes("harvest") ||
        rawId.startsWith("har-") ||
        rawId.startsWith("h-")
      ) {
        rawType = "harvest";
      }

      // Match against existing registered farms/harvests
      const matchedFarm = allFarms.find(
        (f) => f.id.toLowerCase() === rawId.toLowerCase() || f.name.toLowerCase() === rawId.toLowerCase()
      );
      const matchedHarvest = allHarvests.find(
        (h) => h.id.toLowerCase() === rawId.toLowerCase() || (h.batchCode && h.batchCode.toLowerCase() === rawId.toLowerCase())
      );

      const customName = parts[2] || "";
      const customCrop = parts[3] || "";
      const customDistrict = parts[4] || "";
      const customMetrics = parts[5] || "";

      const itemTime = new Date(nowMs - index * 60000);
      const iso = itemTime.toISOString();
      const display = `${iso.split("T")[0]} ${itemTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

      if (matchedFarm || rawType === "parcel") {
        const farm = matchedFarm;
        const entryTitle = customName || farm?.name || `Farm Parcel ${rawId}`;
        const entrySubtitle = customDistrict
          ? `${customDistrict} · ${customCrop || "Registered Crop"}`
          : farm
          ? `${farm.district}, Sector ${farm.sector} · ${farm.agroZone || "Highlands"}`
          : "Registered Cooperative Parcel";
        const entryMetrics = customMetrics
          ? customMetrics
          : farm
          ? `${farm.sizeHa} Ha · ${farm.altitudeMeters || farm.altitude || 2200}m Alt · ${farm.soilType}`
          : "Verified Field Boundary";

        const newEntry: QrScanHistoryEntry = {
          scanId: `batch-scan-${nowMs}-${index}`,
          type: "parcel",
          recordId: farm?.id || rawId,
          title: entryTitle,
          subtitle: entrySubtitle,
          codeLabel: `PARCEL: ${(farm?.id || rawId).toUpperCase()}`,
          metricsLine: entryMetrics,
          scannedAtIso: iso,
          scannedTimeDisplay: display,
          scanMethod: "batch_csv",
          cachedFarm: farm,
        };
        newHistoryEntries.push(newEntry);
        logParcelScan30d(farm, entryTitle, entrySubtitle);
      } else {
        const harvest = matchedHarvest;
        const entryTitle =
          customName ||
          (harvest ? `${harvest.crop} (${harvest.quantityKg.toLocaleString()} kg)` : `Harvest Lot ${rawId}`);
        const entrySubtitle = customDistrict
          ? `Origin: ${customDistrict} · Batch ${rawId}`
          : harvest
          ? `Origin: ${harvest.farmName} · ${harvest.storageLocation}`
          : "Verified Cooperative Harvest Batch";
        const entryMetrics = customMetrics
          ? customMetrics
          : harvest
          ? `${harvest.quantityKg.toLocaleString()} kg · Grade ${harvest.qualityGrade} · ${harvest.harvestDate}`
          : "Quality Grade A · Ready for Dispatch";

        const newEntry: QrScanHistoryEntry = {
          scanId: `batch-scan-${nowMs}-${index}`,
          type: "harvest",
          recordId: harvest?.id || rawId,
          title: entryTitle,
          subtitle: entrySubtitle,
          codeLabel: `BATCH: ${harvest?.batchCode || harvest?.id || rawId}`,
          metricsLine: entryMetrics,
          scannedAtIso: iso,
          scannedTimeDisplay: display,
          scanMethod: "batch_csv",
          cachedHarvest: harvest,
        };
        newHistoryEntries.push(newEntry);
        logHarvestScan30d(harvest, entryTitle, entrySubtitle);
      }
    });

    if (newHistoryEntries.length === 0) {
      setBatchUploadFeedback({
        type: "error",
        message: language === "rw" ? "Nta mirima cyangwa imisaruro yabashije kwinjizwa." : "No valid records could be extracted from CSV.",
      });
      return;
    }

    // Merge into scanHistory
    setScanHistory((prev) => {
      const existingIds = new Set(newHistoryEntries.map((e) => `${e.type}-${e.recordId}`));
      const filteredPrev = prev.filter((e) => !existingIds.has(`${e.type}-${e.recordId}`));
      return [...newHistoryEntries, ...filteredPrev].slice(0, MAX_SCAN_HISTORY);
    });

    // Auto-select all newly imported items for immediate bulk processing or printing!
    const newScanIds = new Set(newHistoryEntries.map((e) => e.scanId));
    setSelectedScanIds(newScanIds);

    setBatchUploadFeedback({
      type: "success",
      message:
        language === "rw"
          ? `Byakunze! Hinjijwe imirima n'imisaruro ${newHistoryEntries.length} mu mbonerahamwe kandi byatoranyijwe guhita bicapwa muri PDF.`
          : `Successfully loaded ${newHistoryEntries.length} records into the scan table! All records are auto-selected for bulk printing.`,
    });
    setBatchUploadRawText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessCsvContent(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSampleCooperativeBatch = () => {
    const sampleBatchCsv = `id,type,name,crop,district,metrics
parcel-kinigi-volcanic-01,parcel,Kinigi Volcanic Seed Parcel A,Ibirayi (Kinigi),Musanze,1.4 Ha · 2240m Alt
parcel-nyagatare-savanna-02,parcel,Nyagatare Karangazi Irrigated Block B,Ibigori & Soya,Nyagatare,2.8 Ha · Drip
parcel-huye-plateau-03,parcel,Huye Maraba Terraced Hillside C,Ibishyimbo & Kawa,Huye,1.9 Ha · Terraced
BATCH-RW-2026-081,harvest,Kinigi Certified Seed Potatoes,Ibirayi (Kinigi),Musanze,4200 kg · Grade A1
BATCH-RW-2026-082,harvest,Nyagatare Karangazi Hybrid Maize,Ibigori (WH 505),Nyagatare,6400 kg · Grade A
BATCH-RW-2026-083,harvest,Maraba Premium Biofortified Beans,Ibishyimbo (RWR 2245),Huye,2800 kg · Grade A
parcel-burera-highlands-04,parcel,Burera Lake Catchment Parcel D,Ibirayi & Amashu,Burera,1.6 Ha · 2190m Alt
BATCH-RW-2026-084,harvest,Burera Highland Harvest Lot,Ibirayi (Victoria),Burera,3500 kg · Grade A1`;

    handleProcessCsvContent(sampleBatchCsv);
  };

  // Selection handlers
  const handleToggleSelectAll = (visibleItems: QrScanHistoryEntry[]) => {
    if (selectedScanIds.size === visibleItems.length && visibleItems.length > 0) {
      setSelectedScanIds(new Set());
    } else {
      const allIds = new Set(visibleItems.map((item) => item.scanId));
      setSelectedScanIds(allIds);
    }
  };

  const handleToggleSelectOne = (scanId: string) => {
    setSelectedScanIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const handleSelectByType = (type: QrRecordType, visibleItems: QrScanHistoryEntry[]) => {
    const matchingIds = visibleItems
      .filter((item) => item.type === type)
      .map((item) => item.scanId);
    setSelectedScanIds(new Set(matchingIds));
  };

  const handleToggleSort = (field: "timestamp" | "recordId" | "type" | "title") => {
    if (tableSortField === field) {
      setTableSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTableSortField(field);
      setTableSortDirection(field === "timestamp" ? "desc" : "asc");
    }
  };

  // Helper to test if a scan timestamp is within the active date filter
  const isWithinDateFilter = (isoString: string): boolean => {
    if (historyDatePreset === "all") return true;
    const itemTime = new Date(isoString).getTime();
    if (isNaN(itemTime)) return true;
    const now = Date.now();

    if (historyDatePreset === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return itemTime >= todayStart.getTime();
    }
    if (historyDatePreset === "7d") {
      return itemTime >= now - 7 * 86400000;
    }
    if (historyDatePreset === "30d") {
      return itemTime >= now - 30 * 86400000;
    }
    if (historyDatePreset === "custom") {
      let valid = true;
      if (historyCustomStart) {
        const start = new Date(historyCustomStart).getTime();
        if (!isNaN(start) && itemTime < start) valid = false;
      }
      if (historyCustomEnd) {
        const end = new Date(historyCustomEnd).getTime() + 86400000 - 1;
        if (!isNaN(end) && itemTime > end) valid = false;
      }
      return valid;
    }
    return true;
  };

  // Memoized Granular Sortable and Filterable History
  const filteredAndSortedHistory = useMemo(() => {
    const result = scanHistory.filter((entry) => {
      // 1. Record Type Filter
      if (historyTypeFilter !== "all" && entry.type !== historyTypeFilter) {
        return false;
      }
      // 2. Date Range Filter
      if (!isWithinDateFilter(entry.scannedAtIso)) {
        return false;
      }
      // 3. Search query
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const text = `${entry.recordId} ${entry.title} ${entry.subtitle} ${entry.metricsLine} ${entry.codeLabel} ${entry.type} ${entry.scanMethod}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    // Sort result
    result.sort((a, b) => {
      let comparison = 0;
      if (tableSortField === "timestamp") {
        const timeA = new Date(a.scannedAtIso).getTime() || 0;
        const timeB = new Date(b.scannedAtIso).getTime() || 0;
        comparison = timeA - timeB;
      } else if (tableSortField === "recordId") {
        comparison = a.recordId.localeCompare(b.recordId);
      } else if (tableSortField === "type") {
        comparison = a.type.localeCompare(b.type);
      } else if (tableSortField === "title") {
        comparison = a.title.localeCompare(b.title);
      }
      return tableSortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    scanHistory,
    historyTypeFilter,
    historyDatePreset,
    historyCustomStart,
    historyCustomEnd,
    historySearchQuery,
    tableSortField,
    tableSortDirection,
  ]);

  // Related data for Farm Parcel Details View
  const farmPlans = currentFarm
    ? plans.filter(
        (p) => p.farmId === currentFarm.id || p.farmName === currentFarm.name
      )
    : [];
  const farmExpenses = currentFarm
    ? expenses.filter(
        (e) => e.farmId === currentFarm.id || e.farmName === currentFarm.name
      )
    : [];
  const farmActivities = currentFarm
    ? activities.filter(
        (a) => a.farmId === currentFarm.id || a.farmName === currentFarm.name
      )
    : [];
  const farmHarvests = currentFarm
    ? harvests.filter(
        (h) => h.farmId === currentFarm.id || h.farmName === currentFarm.name
      )
    : [];
  const totalFarmSpent = farmExpenses.reduce((s, e) => s + e.amount, 0);
  const totalFarmHarvestKg = farmHarvests.reduce((s, h) => s + h.quantityKg, 0);

  // Related data for Harvest Batch Details View
  const batchSales = currentHarvest
    ? sales.filter(
        (s) =>
          s.farmId === currentHarvest.farmId && s.crop === currentHarvest.crop
      )
    : [];

  const getScanMethodLabel = (method: QrScanHistoryEntry["scanMethod"]) => {
    switch (method) {
      case "camera":
        return language === "rw" ? "Camera ya Telefoni" : "Live Camera";
      case "qr_image":
        return language === "rw" ? "Ifoto ya QR" : "QR Image File";
      case "camera_simulation":
        return language === "rw" ? "Igerageza rya Scan" : "Simulation";
      case "batch_csv":
        return language === "rw" ? "CSV Batch" : "Batch CSV";
      default:
        return language === "rw" ? "Camera" : "Camera";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-5xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6">
        {/* Top Bar */}
        <div className="bg-[#064E3B] text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-amber-300 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                {activeRecordType === "parcel"
                  ? language === "rw"
                    ? "QR Code y'Umurima (Farm Parcel Traceability)"
                    : "Farm Parcel QR & Direct Details"
                  : language === "rw"
                    ? "QR Code y'Umusaruro (Harvest Batch Traceability)"
                    : "Harvest Batch QR & Direct Details"}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {activeRecordType === "parcel"
                  ? currentFarm?.name || "Farm Parcel"
                  : `${currentHarvest?.crop || "Harvest"} — ${
                      currentHarvest?.batchCode || currentHarvest?.id
                    }`}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-1.5">
            <div className="flex flex-wrap bg-emerald-950/80 p-1 rounded-xl border border-emerald-700/60 text-xs font-bold gap-0.5">
              <button
                type="button"
                onClick={() => setMode("qr_label")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mode === "qr_label"
                    ? "bg-amber-500 text-stone-950"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                {language === "rw" ? "QR Code" : "QR Label"}
              </button>
              <button
                type="button"
                onClick={() => setMode("details")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mode === "details"
                    ? "bg-amber-500 text-stone-950"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                {language === "rw" ? "Amakuru" : "Record Details"}
              </button>
              <button
                type="button"
                onClick={() => setMode("scanner")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  mode === "scanner"
                    ? "bg-amber-500 text-stone-950"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Sikana" : "Scan QR"}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("history")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mode === "history"
                    ? "bg-amber-500 text-stone-950 font-bold"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Amateka" : "Scan History"} (
                  {scanHistory.length}/{MAX_SCAN_HISTORY})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("trends")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  mode === "trends"
                    ? "bg-amber-500 text-stone-950 font-bold shadow-xs"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Imigendekere (Trends)" : "Scan Trends"}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-5">
          {/* MODE 1: QR CODE GENERATOR & PRINTABLE FIELD/BATCH SIGN */}
          {mode === "qr_label" && (
            <div className="space-y-5">
              <div className="border-2 border-[#064E3B] rounded-2xl p-5 bg-stone-50/70 dark:bg-stone-950/60 flex flex-col md:flex-row items-center gap-6">
                {/* QR Image Box */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center shrink-0">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scannable Deep-Link QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-xs text-stone-400">
                      Generating QR...
                    </div>
                  )}
                  <span className="text-[11px] font-mono font-bold text-[#064E3B] mt-2">
                    {activeRecordType === "parcel"
                      ? `PARCEL: ${currentFarm?.id.toUpperCase()}`
                      : `BATCH: ${currentHarvest?.batchCode || currentHarvest?.id}`}
                  </span>
                </div>

                {/* Metadata & Direct Camera Link Explanation */}
                <div className="flex-1 space-y-3 text-xs">
                  <div className="text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider">
                    {activeRecordType === "parcel"
                      ? "Official Rwandan Farm Parcel Field Signpost"
                      : "Official RICA / MINAGRI Harvest Batch Tag"}
                  </div>

                  {activeRecordType === "parcel" && currentFarm ? (
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-stone-900 dark:text-white">
                        {currentFarm.name}
                      </h3>
                      <p className="text-stone-600 dark:text-stone-300">
                        {currentFarm.district}, Sector {currentFarm.sector} ·{" "}
                        {currentFarm.agroZone || "Highland Zone"}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <span className="text-stone-400 block">Area & Altitude</span>
                          <span className="font-bold text-stone-900 dark:text-white font-mono tabular-nums">
                            {currentFarm.sizeHa} Ha ·{" "}
                            {currentFarm.altitudeMeters || currentFarm.altitude || 2200}m
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                          <span className="text-stone-400 block">GPS Coordinates</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {currentFarm.latitude?.toFixed(4) || "-1.4824"},{" "}
                            {currentFarm.longitude?.toFixed(4) || "29.5892"}
                          </span>
                        </div>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300">
                        <strong>Main Crops:</strong> {currentFarm.mainCrops.join(", ")} ·{" "}
                        <strong>Soil:</strong> {currentFarm.soilType}
                      </p>
                    </div>
                  ) : (
                    currentHarvest && (
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-stone-900 dark:text-white">
                          {currentHarvest.crop} (
                          {currentHarvest.quantityKg.toLocaleString()} kg)
                        </h3>
                        <p className="text-stone-600 dark:text-stone-300">
                          Origin Parcel: <strong>{currentHarvest.farmName}</strong> · Grade{" "}
                          <strong>{currentHarvest.qualityGrade}</strong>
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                            <span className="text-stone-400 block">Harvest Date</span>
                            <span className="font-mono font-bold text-stone-900 dark:text-white">
                              {currentHarvest.harvestDate}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                            <span className="text-stone-400 block">Storage / Market</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate block">
                              {currentHarvest.storageLocation}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Scannable Deep-Link URL Box */}
                  <div className="p-3 rounded-xl bg-emerald-950/10 dark:bg-emerald-950/40 border border-emerald-700/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300">
                        {language === "rw"
                          ? "URL Ifunguka ako kanya kuri Camera ya Telefoni:"
                          : "Direct Phone Camera Deep-Link URL:"}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold hover:underline cursor-pointer"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copied ? "Copied" : "Copy Link"}</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-stone-600 dark:text-stone-400 break-all">
                      {deepLinkUrl}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                    title={language === "rw" ? "Kuramo PNG ya QR yo gucapa" : "Download current QR code as PNG image for printing"}
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>
                      {language === "rw" ? "Kuramo QR Code (PNG)" : "Download QR Code"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const singleEntry: QrScanHistoryEntry = {
                        scanId: `single-preview-${Date.now()}`,
                        type: activeRecordType,
                        recordId: activeId,
                        title: currentFarm?.name || currentHarvest?.crop || "QR Code",
                        subtitle:
                          activeRecordType === "parcel"
                            ? `${currentFarm?.district || "Rwanda"}, Sector ${currentFarm?.sector || ""}`
                            : `Origin: ${currentHarvest?.farmName || "Cooperative Store"}`,
                        codeLabel:
                          activeRecordType === "parcel"
                            ? `PARCEL: ${activeId}`
                            : `BATCH: ${currentHarvest?.batchCode || activeId}`,
                        metricsLine:
                          activeRecordType === "parcel"
                            ? `${currentFarm?.sizeHa || 1} Ha · ${currentFarm?.altitudeMeters || 2200}m Alt · ${currentFarm?.soilType || "Volcanic"}`
                            : `${currentHarvest?.quantityKg || 1000} kg · Grade ${currentHarvest?.qualityGrade || "A1"} · ${currentHarvest?.harvestDate || "Verified"}`,
                        scannedAtIso: new Date().toISOString(),
                        scannedTimeDisplay: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        scanMethod: "camera_simulation",
                        cachedFarm: currentFarm || undefined,
                        cachedHarvest: currentHarvest || undefined,
                      };
                      generateBatchQrPdf([singleEntry], true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 font-bold text-xs cursor-pointer shadow-2xs"
                    title={language === "rw" ? "Reba mbere yo gucapa" : "Preview print layout before printing"}
                  >
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <Printer className="w-4 h-4" />
                    <span>{language === "rw" ? "Reba Mbere yo Gucapa" : "Print Preview"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCompleteScan(
                      activeRecordType,
                      activeId,
                      "camera_simulation",
                      "details"
                    )
                  }
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {language === "rw"
                      ? "Fungura Amakuru & Bika mu Mateka (Simulate Scan)"
                      : "Simulate Camera Scan & Open Details →"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: DIRECT RECORD DETAILS VIEW (Opened when QR is scanned!) */}
          {mode === "details" && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {activeRecordType === "parcel"
                      ? language === "rw"
                        ? `Amakuru Yuzuye y'Umurima (${currentFarm?.name}) — Verified via QR`
                        : `Verified Farm Parcel Dossier (${currentFarm?.name})`
                      : language === "rw"
                        ? `Amakuru Yuzuye y'Umusaruro (${currentHarvest?.batchCode || currentHarvest?.id}) — Verified via QR`
                        : `Verified Harvest Batch Provenance (${currentHarvest?.batchCode || currentHarvest?.id})`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-stone-900/70 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                    {activeId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadQrPng(activeRecordType, activeId, currentFarm?.name || currentHarvest?.crop)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                    title={language === "rw" ? "Kuramo PNG ya QR yo gucapa" : "Download current parcel/harvest QR code as PNG image"}
                  >
                    <Download className="w-3 h-3 text-amber-300" />
                    <span>{language === "rw" ? "Kuramo QR Code" : "Download QR Code"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("qr_label")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-[11px] font-bold transition-colors cursor-pointer"
                    title={language === "rw" ? "Reba Ikarita ya QR" : "View Printable QR Label"}
                  >
                    <QrCode className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === "rw" ? "Ikarita" : "QR Label"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("history")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    <History className="w-3 h-3 text-amber-300" />
                    <span>
                      {language === "rw" ? "Amateka" : "History"} ({scanHistory.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* SMART FIELD CONTEXT DETECTOR & AUTO-COMPLETE PANEL */}
              {smartFieldContext && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:via-stone-900 dark:to-stone-900 p-4 sm:p-5 space-y-4 shadow-sm">
                  {/* Panel Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                        <Brain className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-1.5">
                            <span>Smart Field Context Detector</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                              AI/Engine Active
                            </span>
                          </h3>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300">
                          {language === "rw"
                            ? `Gusesengura amateka y'umurima (${smartFieldContext.farmName}) · Yujuje amakuru y'ifumbire n'abakozi`
                            : `Historical telemetry analyzed for ${smartFieldContext.farmName} (${smartFieldContext.farmId})`}
                        </p>
                      </div>
                    </div>

                    {/* Auto-Complete Fields Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoCompleteFieldsEnabled((prev) => !prev)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          autoCompleteFieldsEnabled
                            ? "bg-emerald-700 hover:bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                        }`}
                        title={
                          language === "rw"
                            ? "Fungura cyangwa funga ikoreshwa rya Auto-Complete ku ifishi"
                            : "Toggle Auto-Complete Fields to pre-fill activities & expenses on QR scan"
                        }
                      >
                        {autoCompleteFieldsEnabled ? (
                          <ToggleRight className="w-5 h-5 text-amber-300" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-stone-400" />
                        )}
                        <span>
                          {language === "rw" ? "Auto-Complete:" : "Auto-Complete Fields:"}{" "}
                          <strong className="uppercase">
                            {autoCompleteFieldsEnabled
                              ? language === "rw"
                                ? "IRAFUNGUYE (ON)"
                                : "ENABLED (ON)"
                              : language === "rw"
                              ? "IRAFUNZE (OFF)"
                              : "DISABLED (OFF)"}
                          </strong>
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Historical Analysis Metrics Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium">
                      📊 <strong>{smartFieldContext.totalActivities}</strong> {language === "rw" ? "Ibikorwa byabanje" : "Past Activities"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium">
                      💰 <strong>{smartFieldContext.totalExpenses}</strong> {language === "rw" ? "Amafaranga yasohotse" : "Historical Expenses"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium">
                      🌱 <strong>{smartFieldContext.totalFertilizers}</strong> {language === "rw" ? "Gufumbira byanditswe" : "Fertilizer Logs"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-medium">
                      👷 <strong>{smartFieldContext.totalLaborLogs}</strong> {language === "rw" ? "Amatsinda y'abakozi" : "Labor Crew Logs"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold ml-auto">
                      {smartFieldContext.hasHistoricalRecords
                        ? language === "rw"
                          ? "✓ Amakuru nyayo y'amateka yabonetse"
                          : "✓ Ground-Truth History Detected"
                        : language === "rw"
                        ? "💡 RAB Agronomy Soil Benchmarks"
                        : "💡 RAB Agronomic Benchmarks"}
                    </span>
                  </div>

                  {/* Context Highlights: Common Fertilizers & Recent Laborers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {/* Common Fertilizer Types Pillar */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-stone-900 dark:text-white">
                          <FlaskConical className="w-4 h-4 text-emerald-600" />
                          <span>{language === "rw" ? "Ifumbire Isanzwe Ikoreshwa" : "Common Fertilizer Types"}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {smartFieldContext.topFertilizer.npkRatio || "17-17-17"}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                              {smartFieldContext.topFertilizer.name}
                            </span>
                            <span className="text-[11px] text-stone-500 block">
                              Est. {smartFieldContext.topFertilizer.typicalKg} kg · {smartFieldContext.topFertilizer.typicalCost.toLocaleString()} RWF
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => applySmartContextSuggestion("fertilizer")}
                            className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
                          >
                            {language === "rw" ? "Koresha" : "Apply"}
                          </button>
                        </div>

                        {/* Additional Detected Fertilizer Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {smartFieldContext.detectedFertilizers.slice(1, 4).map((fert, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applySmartContextSuggestion("custom_fert", fert)}
                              className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-emerald-100 dark:bg-stone-800 dark:hover:bg-emerald-900/40 text-stone-700 dark:text-stone-300 text-[10px] font-medium transition-colors cursor-pointer border border-stone-200 dark:border-stone-700 flex items-center gap-1"
                              title={`Apply ${fert.name}`}
                            >
                              <span>{fert.name.split(" ")[0]}</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400">({fert.npkRatio})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recent Laborers & Field Supervisors Pillar */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-stone-900 dark:text-white">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>{language === "rw" ? "Abakozi n'Abahagarikizi Baheruka" : "Recent Laborers & Crew"}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {smartFieldContext.topLaborer.dailyRate.toLocaleString()} RWF/day
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                              {smartFieldContext.topLaborer.name}
                            </span>
                            <span className="text-[11px] text-stone-500 block">
                              {smartFieldContext.topLaborer.roleLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => applySmartContextSuggestion("labor")}
                            className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
                          >
                            {language === "rw" ? "Koresha" : "Apply"}
                          </button>
                        </div>

                        {/* Additional Detected Laborer Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {smartFieldContext.detectedLaborers.slice(1, 4).map((worker, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applySmartContextSuggestion("custom_labor", worker)}
                              className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-emerald-100 dark:bg-stone-800 dark:hover:bg-emerald-900/40 text-stone-700 dark:text-stone-300 text-[10px] font-medium transition-colors cursor-pointer border border-stone-200 dark:border-stone-700 flex items-center gap-1"
                              title={`Assign ${worker.name}`}
                            >
                              <span>{worker.name.split(" ")[0]}</span>
                              <span className="text-stone-400">({worker.role})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Smart Suggestion Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/15">
                    <span className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                      {language === "rw" ? "Guhitamo vuba:" : "1-Click Smart Presets:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => applySmartContextSuggestion("fertilizer")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-700 flex items-center gap-1"
                    >
                      <span>🌱</span>
                      <span>{language === "rw" ? "Gufumbira" : "Fertilizer Task"} ({smartFieldContext.topFertilizer.name.split(" ")[0]})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySmartContextSuggestion("labor")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-700 flex items-center gap-1"
                    >
                      <span>👷</span>
                      <span>{language === "rw" ? "Abakozi" : "Labor Crew"} ({smartFieldContext.topLaborer.name.split(" ")[0]})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySmartContextSuggestion("spraying")}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer border border-stone-300 dark:border-stone-700 flex items-center gap-1"
                    >
                      <span>🛡️</span>
                      <span>{language === "rw" ? "Gutera Umuti" : "Plant Protection"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySmartContextSuggestion("transport")}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer border border-stone-300 dark:border-stone-700 flex items-center gap-1"
                    >
                      <span>📦</span>
                      <span>{language === "rw" ? "Gutwara Umusaruro" : "Transport & Dispatch"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* QUICK CREATION FORMS: RELATED ACTIVITIES & EXPENSES */}
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {language === "rw"
                        ? "Andika Igikorwa cyangwa Amafaranga bishya kuri uyu Murima"
                        : "Log New Related Activity or Expense for this Parcel"}
                    </h3>
                  </div>

                  {/* Switch between Activity & Expense forms */}
                  <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveCreationTab("activity")}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeCreationTab === "activity"
                          ? "bg-emerald-700 text-white shadow-2xs"
                          : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === "rw" ? "Igikorwa Gishya" : "New Activity"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCreationTab("expense")}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeCreationTab === "expense"
                          ? "bg-emerald-700 text-white shadow-2xs"
                          : "text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{language === "rw" ? "Amafaranga Mashya" : "New Expense"}</span>
                    </button>
                  </div>
                </div>

                {/* Pre-fill Notice Banner */}
                {isPreFilledByScan && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        {language === "rw"
                          ? "Amakuru y'ifishi yuzujwe n'ubwenge bwa Smart Field Context. Urashobora kuyahindura mbere yo kubika."
                          : "Fields automatically suggested & pre-filled by Smart Field Context from this parcel's historical profile."}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPreFilledByScan(false)}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer shrink-0"
                    >
                      {language === "rw" ? "Komeza" : "Dismiss"}
                    </button>
                  </div>
                )}

                {/* Feedback Toast */}
                {creationFeedback && (
                  <div
                    className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
                      creationFeedback.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                        : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {creationFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{creationFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreationFeedback(null)}
                      className="text-stone-400 hover:text-stone-600 cursor-pointer ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* TAB 1: ACTIVITY CREATION FORM */}
                {activeCreationTab === "activity" && (
                  <form onSubmit={handleSaveActivityForm} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Umutwe w'Igikorwa *" : "Activity Title *"}
                        </label>
                        <input
                          type="text"
                          value={activityFormData.title}
                          onChange={(e) => setActivityFormData({ ...activityFormData, title: e.target.value })}
                          placeholder="e.g. Fertilizer side-dressing or weeding"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Icyiciro cy'Igikorwa" : "Activity Category"}
                        </label>
                        <select
                          value={activityFormData.category}
                          onChange={(e) => setActivityFormData({ ...activityFormData, category: e.target.value as ActivityCategory })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="fertilizing">🌱 Fertilizing (Gufumbira)</option>
                          <option value="weeding">🌿 Weeding (Kubagara)</option>
                          <option value="spraying">🛡️ Spraying (Gutera Umuti)</option>
                          <option value="planting">🌾 Planting (Gutera)</option>
                          <option value="land_prep">🚜 Land Preparation (Guhirika/Guhana)</option>
                          <option value="irrigation">💧 Irrigation (Kuhira)</option>
                          <option value="harvesting">🧺 Harvesting (Gusoroma)</option>
                          <option value="post_harvest">📦 Post-Harvest & Quality (Gupakira)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Assigned Worker / Laborer with Clickable Chips */}
                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Umuhagarikizi cyangwa Umukozi" : "Assigned Laborer / Supervisor"}
                        </label>
                        <input
                          type="text"
                          value={activityFormData.assignedWorker || ""}
                          onChange={(e) => setActivityFormData({ ...activityFormData, assignedWorker: e.target.value })}
                          placeholder="e.g. Jean Bosco Uwimana"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        {/* Laborer Suggestions from Smart Field Context */}
                        {smartFieldContext && smartFieldContext.detectedLaborers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-stone-400 font-semibold">
                              {language === "rw" ? "Abakozi baheruka:" : "Recent laborers:"}
                            </span>
                            {smartFieldContext.detectedLaborers.slice(0, 3).map((w, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActivityFormData({ ...activityFormData, assignedWorker: w.name })}
                                className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                + {w.name.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fertilizer Type with Clickable Chips */}
                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Ubwoko bw'Ifumbire" : "Fertilizer Type (if applicable)"}
                        </label>
                        <input
                          type="text"
                          value={activityFormData.fertilizerType || ""}
                          onChange={(e) => setActivityFormData({ ...activityFormData, fertilizerType: e.target.value })}
                          placeholder="e.g. NPK 17-17-17 or DAP"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        {/* Fertilizer Suggestions from Smart Field Context */}
                        {smartFieldContext && smartFieldContext.detectedFertilizers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] text-stone-400 font-semibold">
                              {language === "rw" ? "Ifumbire isanzwe:" : "Common fertilizers:"}
                            </span>
                            {smartFieldContext.detectedFertilizers.slice(0, 3).map((f, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActivityFormData({ ...activityFormData, fertilizerType: f.name })}
                                className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] hover:bg-emerald-100 transition-colors cursor-pointer"
                              >
                                + {f.name.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Itariki yo Gukora" : "Due Date"}
                        </label>
                        <input
                          type="date"
                          value={activityFormData.dueDate}
                          onChange={(e) => setActivityFormData({ ...activityFormData, dueDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Igiciro Giteganyijwe (RWF)" : "Estimated Cost (RWF)"}
                        </label>
                        <input
                          type="number"
                          value={activityFormData.estimatedCost}
                          onChange={(e) => setActivityFormData({ ...activityFormData, estimatedCost: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Imyaka / Igihingwa" : "Crop Target"}
                        </label>
                        <input
                          type="text"
                          value={activityFormData.crop}
                          onChange={(e) => setActivityFormData({ ...activityFormData, crop: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                        {language === "rw" ? "Ibisobanuro & Amabwiriza" : "Field Notes & Instructions"}
                      </label>
                      <textarea
                        rows={2}
                        value={activityFormData.notes}
                        onChange={(e) => setActivityFormData({ ...activityFormData, notes: e.target.value })}
                        placeholder="Additional details..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => applySmartContextSuggestion("fertilizer")}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold transition-colors cursor-pointer"
                      >
                        {language === "rw" ? "Garura Ifishi" : "Reset from Smart Context"}
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        <PlusCircle className="w-4 h-4 text-amber-300" />
                        <span>{language === "rw" ? "Bika Igikorwa ku Murima" : "Save Activity to Parcel"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: EXPENSE CREATION FORM */}
                {activeCreationTab === "expense" && (
                  <form onSubmit={handleSaveExpenseForm} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Ibisobanuro by'Amafaranga *" : "Expense Description *"}
                        </label>
                        <input
                          type="text"
                          value={expenseFormData.description}
                          onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                          placeholder="e.g. NPK 17-17-17 Fertilizer purchase (50kg)"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Icyiciro cy'Ikiguzi" : "Expense Category"}
                        </label>
                        <select
                          value={expenseFormData.category}
                          onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="fertilizer">🌱 Fertilizer (Ifumbire)</option>
                          <option value="labor">👷 Labor & Workers (Abakozi)</option>
                          <option value="pesticides">🛡️ Pesticides / Fungicides (Imiti)</option>
                          <option value="seeds">🌾 Seeds (Imbuto)</option>
                          <option value="equipment">⚙️ Equipment & Tools (Ibikoresho)</option>
                          <option value="transport">🚚 Transport & Logistics (Gutwara)</option>
                          <option value="other">📝 Other (Ibindi)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Amafaranga (RWF) *" : "Amount (RWF) *"}
                        </label>
                        <input
                          type="number"
                          value={expenseFormData.amount}
                          onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                          required
                          min={1}
                        />
                        {/* Quick Presets for Amount */}
                        {smartFieldContext && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={() => setExpenseFormData({ ...expenseFormData, amount: smartFieldContext.topFertilizer.typicalCost })}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] cursor-pointer"
                            >
                              Fertilizer ({smartFieldContext.topFertilizer.typicalCost.toLocaleString()} RWF)
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpenseFormData({ ...expenseFormData, amount: smartFieldContext.topLaborer.dailyRate * smartFieldContext.topLaborer.crewSize })}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] cursor-pointer"
                            >
                              Labor ({(smartFieldContext.topLaborer.dailyRate * smartFieldContext.topLaborer.crewSize).toLocaleString()} RWF)
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Itariki" : "Date"}
                        </label>
                        <input
                          type="date"
                          value={expenseFormData.date}
                          onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 dark:text-stone-300 font-bold mb-1">
                          {language === "rw" ? "Igihingwa" : "Crop"}
                        </label>
                        <input
                          type="text"
                          value={expenseFormData.crop}
                          onChange={(e) => setExpenseFormData({ ...expenseFormData, crop: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => applySmartContextSuggestion("fertilizer")}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold transition-colors cursor-pointer"
                      >
                        {language === "rw" ? "Garura Ifishi" : "Reset"}
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        <Receipt className="w-4 h-4 text-amber-300" />
                        <span>{language === "rw" ? "Bika Ikiguzi cy'uyu Murima" : "Record Expense for Parcel"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Session Recorded History summary */}
                {(localAddedActivities.length > 0 || localAddedExpenses.length > 0) && (
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-[11px] font-bold text-stone-500 block mb-1.5">
                      {language === "rw" ? "Ibyanditswe muri iki gice (Current Session Log):" : "Recorded During This Session:"}
                    </span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {localAddedActivities.map((act) => (
                        <span key={act.id} className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200">
                          📋 {act.title}
                        </span>
                      ))}
                      {localAddedExpenses.map((exp) => (
                        <span key={exp.id} className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200">
                          💰 {exp.description} ({exp.amount.toLocaleString()} RWF)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeRecordType === "parcel" && currentFarm ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                      <span className="text-stone-500 block">Parcel Size</span>
                      <span className="text-lg font-black text-stone-900 dark:text-white font-mono tabular-nums">
                        {currentFarm.sizeHa} Ha
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                      <span className="text-stone-500 block">Altitude & GPS</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                        {currentFarm.altitudeMeters || currentFarm.altitude || 2200}m
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                      <span className="text-stone-500 block">Total Input Spend</span>
                      <span className="text-sm font-black text-stone-900 dark:text-white font-mono tabular-nums">
                        {totalFarmSpent.toLocaleString()} RWF
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                      <span className="text-stone-500 block">Recorded Harvest</span>
                      <span className="text-sm font-black text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                        {totalFarmHarvestKg.toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                      Soil, Location & Agronomic Profile
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600 dark:text-stone-300">
                      <p>
                        <strong>Location:</strong> {currentFarm.district}, Sector{" "}
                        {currentFarm.sector} ({currentFarm.agroZone || "Highlands"})
                      </p>
                      <p>
                        <strong>Soil Type:</strong> {currentFarm.soilType}
                      </p>
                      <p>
                        <strong>Irrigation:</strong> {currentFarm.irrigationType}
                      </p>
                      <p>
                        <strong>Crops Planted:</strong>{" "}
                        {currentFarm.mainCrops.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                      <h4 className="font-bold text-stone-900 dark:text-white">
                        Active Crop Plans ({farmPlans.length})
                      </h4>
                      {farmPlans.length === 0 ? (
                        <p className="text-stone-400">No active plans recorded.</p>
                      ) : (
                        farmPlans.map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 flex justify-between"
                          >
                            <span className="font-bold">{p.crop}</span>
                            <span className="font-mono text-emerald-700 dark:text-emerald-400">
                              {p.seasonCode || (p as any).season} · Est. {p.expectedYieldKg.toLocaleString()} kg
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                      <h4 className="font-bold text-stone-900 dark:text-white">
                        Recent Field Activities ({farmActivities.length})
                      </h4>
                      {farmActivities.length === 0 ? (
                        <p className="text-stone-400">No recent activities logged.</p>
                      ) : (
                        farmActivities.slice(0, 4).map((act) => (
                          <div
                            key={act.id}
                            className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 flex justify-between"
                          >
                            <span className="truncate pr-2">{act.title}</span>
                            <span className="font-mono text-stone-500 shrink-0">
                              {act.dueDate}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                currentHarvest && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-500 block">Batch Quantity</span>
                        <span className="text-lg font-black text-stone-900 dark:text-white font-mono tabular-nums">
                          {currentHarvest.quantityKg.toLocaleString()} kg
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-500 block">Quality Grade</span>
                        <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                          Grade {currentHarvest.qualityGrade}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-500 block">Yield / Ha</span>
                        <span className="text-sm font-black text-stone-900 dark:text-white font-mono tabular-nums">
                          {currentHarvest.yieldPerHaTons || 14.4} Tons/Ha
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
                        <span className="text-stone-500 block">Seed Multiplier</span>
                        <span className="text-sm font-black text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                          {currentHarvest.seedMultiplierRatio || 10.0}x return
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                      <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                        Origin Parcel, Storage & Market Traceability
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600 dark:text-stone-300">
                        <p>
                          <strong>Farm Parcel:</strong> {currentHarvest.farmName} (
                          {currentHarvest.district || "Musanze"})
                        </p>
                        <p>
                          <strong>Harvest Date:</strong> {currentHarvest.harvestDate}
                        </p>
                        <p>
                          <strong>Storage Facility:</strong>{" "}
                          {currentHarvest.storageLocation}
                        </p>
                        <p>
                          <strong>Destination Market:</strong>{" "}
                          {currentHarvest.destinationMarket ||
                            "Nyabugogo Wholesale Market"}
                        </p>
                        <p>
                          <strong>Transporter:</strong>{" "}
                          {currentHarvest.transporterName ||
                            "Cooperative Logistics"}
                        </p>
                        <p>
                          <strong>RICA Certificate:</strong>{" "}
                          {currentHarvest.certificationCode ||
                            "RICA-QMS-VERIFIED"}
                        </p>
                      </div>
                    </div>

                    {batchSales.length > 0 && (
                      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                        <h4 className="font-bold text-stone-900 dark:text-white">
                          Linked Commercial Sales ({batchSales.length})
                        </h4>
                        {batchSales.map((s) => (
                          <div
                            key={s.id}
                            className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 flex justify-between"
                          >
                            <span>
                              {s.buyerName} ({s.quantityKg.toLocaleString()} kg @{" "}
                              {s.unitPriceRwf || Math.round(s.totalAmountRwf / (s.quantityKg || 1))} RWF)
                            </span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {s.totalAmountRwf.toLocaleString()} RWF
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* MODE 3: LIVE PHONE CAMERA & PHOTO QR SCANNER */}
          {mode === "scanner" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-center space-y-3">
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  {language === "rw"
                    ? "Sikana QR Code y'Umurima cyangwa Umusaruro ukoresheje Camera"
                    : "Scan Farm Parcel or Harvest Batch QR Code"}
                </h3>
                <p className="text-xs text-stone-500 max-w-lg mx-auto">
                  {language === "rw"
                    ? "Erekera camera ya telefoni kuri QR Code cyangwa ushyiremo ifoto ya QR Code. Imirima cyangwa imisaruro 5 ya nyuma wasikanye ibikwa ako kanya mu gice cy'Amateka (Scan History)."
                    : "Point your phone camera at any Farm Parcel or Harvest Batch QR code, or upload a saved QR image. The last 5 scanned records are automatically saved in the Scan History tab."}
                </p>

                {/* Auto-Complete & Smart Field Context Scanner Header */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 py-1">
                  <button
                    type="button"
                    onClick={() => setAutoCompleteFieldsEnabled((prev) => !prev)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      autoCompleteFieldsEnabled
                        ? "bg-emerald-700 hover:bg-emerald-600 border-emerald-600 text-white shadow-xs"
                        : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
                    }`}
                    title="Toggle Auto-Complete Fields to pre-fill activities & expenses based on scanned parcel's Smart Field Context"
                  >
                    {autoCompleteFieldsEnabled ? (
                      <ToggleRight className="w-4 h-4 text-amber-300" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-stone-400" />
                    )}
                    <span>
                      {language === "rw" ? "Auto-Complete ku ifishi:" : "Auto-Complete Fields:"}{" "}
                      <strong className="uppercase">
                        {autoCompleteFieldsEnabled
                          ? language === "rw"
                            ? "IRAFUNGUYE (ON)"
                            : "ENABLED (ON)"
                          : language === "rw"
                          ? "IRAFUNZE (OFF)"
                          : "DISABLED (OFF)"}
                      </strong>
                    </span>
                  </button>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {language === "rw"
                        ? "Smart Field Context yuzuza ifishi n'ifumbire cyangwa abakozi b'umurima usikanye!"
                        : "Smart Field Context auto-fills forms using historical fertilizer & laborers on scan!"}
                    </span>
                  </span>
                </div>

                {isCameraActive ? (
                  <div className="space-y-3">
                    <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-emerald-600 bg-black aspect-square">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 rounded-xl bg-stone-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      <span>
                        {language === "rw"
                          ? "Fungura Camera ya Telefoni"
                          : "Start Phone Camera"}
                      </span>
                    </button>

                    <label
                      htmlFor="qr-image-upload"
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {language === "rw"
                          ? "Shyiramo Ifoto ya QR"
                          : "Scan from QR Image"}
                      </span>
                      <input
                        id="qr-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleQrImageUpload}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setMode("history")}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs cursor-pointer"
                    >
                      <History className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>
                        {language === "rw"
                          ? `Reba Amateka (${scanHistory.length}/${MAX_SCAN_HISTORY})`
                          : `View Scan History (${scanHistory.length}/${MAX_SCAN_HISTORY})`}
                      </span>
                    </button>
                  </div>
                )}

                {scanError && (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {scanError}
                  </p>
                )}
              </div>

              {/* Instant Camera Scan Simulator for Farm Parcels & Harvest Batches */}
              <div className="space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    {language === "rw"
                      ? "Sikana Umurima cyangwa Umusaruro (Camera Scan & Save to Last 5 History):"
                      : "Quick-Scan a Farm Parcel or Harvest Batch (Saves to Last 5 Scan History):"}
                  </h4>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {scanHistory.length}/{MAX_SCAN_HISTORY}{" "}
                    {language === "rw" ? "mu mateka" : "recent scans stored"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allScannableFarms.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        handleCompleteScan("parcel", f.id, "camera", "details")
                      }
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-600 bg-white dark:bg-stone-900 text-left flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 block">
                          PARCEL QR · {f.id}
                        </span>
                        <span className="font-bold text-stone-900 dark:text-white">
                          {f.name} ({f.sizeHa} Ha)
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          {f.district}, {f.sector} · {f.mainCrops.join(", ")}
                        </span>
                      </div>
                      <QrCode className="w-4 h-4 text-emerald-700 shrink-0" />
                    </button>
                  ))}

                  {allScannableHarvests.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() =>
                        handleCompleteScan("harvest", h.id, "camera", "details")
                      }
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 bg-white dark:bg-stone-900 text-left flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 block">
                          BATCH QR · {h.batchCode || h.id}
                        </span>
                        <span className="font-bold text-stone-900 dark:text-white">
                          {h.crop} — {h.quantityKg.toLocaleString()} kg
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          Grade {h.qualityGrade} · {h.storageLocation}
                        </span>
                      </div>
                      <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: SCAN HISTORY TAB (Recently Scanned Parcels & Harvests with Quick Jump) */}
          {mode === "history" && (
            <div className="space-y-5">
              {/* Top Summary Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-50 via-emerald-50/40 to-stone-50 dark:from-stone-900 dark:via-emerald-950/30 dark:to-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-900 dark:text-emerald-200">
                    <History className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {language === "rw"
                        ? `Amateka y'Ibisikano: Imirima n'Imisaruro Yaherutse Gusikanwa (${scanHistory.length})`
                        : `Scan History: Recently Scanned Parcels & Harvests (${scanHistory.length})`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    {language === "rw"
                      ? "Reba amateka y'ibyasikanywe byose, ukande 'Simbukira' kugira ngo uhite ugaruka ku murima cyangwa umusaruro wabanje gukoraho."
                      : "Review your recent QR scan history and quickly jump back to previously interacted parcels or harvests to view dossiers, smart context, and logs."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMode("scanner")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {language === "rw" ? "Sikana QR Nshya" : "Scan New QR"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePopulateSampleScans}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                    title={language === "rw" ? "Injiza sample zo kugerageza" : "Load sample cooperative scans"}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === "rw" ? "Sample Scans" : "Sample Scans"}</span>
                  </button>

                  {scanHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearScanHistory}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-700 dark:text-stone-200 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw" ? "Siba Byose" : "Clear History"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* RECENTLY SCANNED ITEMS: QUICK JUMP CARDS SHELF */}
              {scanHistory.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {language === "rw"
                          ? "Ibyaherutse Gusikanwa (Kanda Usimbukireho ako kanya):"
                          : "Recently Interacted Items (Click to Quick Jump):"}
                      </span>
                    </h4>
                    <span className="text-[11px] font-mono text-stone-500">
                      {Math.min(scanHistory.length, 6)} {language === "rw" ? "bya mbere" : "most recent"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scanHistory.slice(0, 6).map((entry) => {
                      const isParcel = entry.type === "parcel";
                      return (
                        <div
                          key={entry.scanId}
                          className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-2.5 group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                                  isParcel
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                }`}
                              >
                                {isParcel ? <MapPin className="w-2.5 h-2.5" /> : <PackageCheck className="w-2.5 h-2.5" />}
                                <span>{isParcel ? "PARCEL" : "HARVEST"}</span>
                              </span>
                              <span className="text-[10px] font-mono text-stone-400">
                                {entry.scannedTimeDisplay.split(" ")[1] || entry.scannedTimeDisplay}
                              </span>
                            </div>

                            <div>
                              <h5 className="font-bold text-xs text-stone-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {entry.title}
                              </h5>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                                {entry.subtitle}
                              </p>
                            </div>

                            <div className="text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-stone-50 dark:bg-stone-850 px-2 py-1 rounded-lg border border-stone-200/60 dark:border-stone-800/60 truncate">
                              {entry.recordId} · {entry.metricsLine}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-stone-100 dark:border-stone-800/80">
                            <button
                              type="button"
                              onClick={() => handleOpenHistoryItem(entry, "details")}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title={
                                language === "rw"
                                  ? `Simbukira kuri ${entry.title}`
                                  : `Quick jump back to ${entry.title} (${entry.recordId})`
                              }
                            >
                              <span>{language === "rw" ? "Simbukira Hano" : "Jump Back"}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenHistoryItem(entry, "qr_label")}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                              title={language === "rw" ? "Reba ikarita ya QR" : "View printable QR label"}
                            >
                              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadQrPng(entry.type, entry.recordId, entry.title)}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                              title={language === "rw" ? "Kuramo PNG" : "Download QR Code PNG"}
                            >
                              <Download className="w-3.5 h-3.5 text-amber-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 30-Day Scanned Parcel Types Frequency (Recharts BarChart Visualization) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                        <span>
                          {language === "rw"
                            ? "Ubwoko bw'Imirima Yasikanwe mu Minsi 30 Ishize"
                            : "Scanned Parcel Types Frequency (Last 30 Days)"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                          Recharts
                        </span>
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {language === "rw"
                          ? `Ibyegeranyo by'imirima yasikanwe hakurikijwe ubutaka & ikirere (Igiteranyo: ${totalParcelScansIn30Days} scans)`
                          : `Visual frequency distribution of parcel ecological zones scanned over the last 30 days (${totalParcelScansIn30Days} total parcel scans)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMode("trends")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors cursor-pointer shadow-2xs"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-stone-950" />
                      <span>{language === "rw" ? "Reba Imigendekere Yose (Trends)" : "Open Full Trends"}</span>
                    </button>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                      30 {language === "rw" ? "Iminsi" : "Days"}
                    </span>
                  </div>
                </div>

                {/* Small BarChart using Recharts */}
                <div className="w-full h-48 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={thirtyDaysChartData}
                      margin={{ top: 12, right: 12, left: -22, bottom: 25 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#88888820"
                      />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-stone-600 dark:text-stone-400"
                        interval={0}
                        angle={-14}
                        textAnchor="end"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-stone-600 dark:text-stone-400"
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="p-3 rounded-xl bg-stone-950 text-white text-xs shadow-xl border border-stone-800 space-y-1 z-50">
                                <div className="font-bold flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span>{item.fullName}</span>
                                </div>
                                <div className="text-stone-300 flex justify-between gap-4">
                                  <span>
                                    {language === "rw"
                                      ? "Inshuro yasikanwe:"
                                      : "Scan Frequency:"}
                                  </span>
                                  <span className="font-extrabold text-white">
                                    {item.count}{" "}
                                    {language === "rw" ? "ibisikano" : "scans"}
                                  </span>
                                </div>
                                <div className="text-stone-300 flex justify-between gap-4">
                                  <span>
                                    {language === "rw"
                                      ? "Ijanisha:"
                                      : "Percentage Share:"}
                                  </span>
                                  <span className="font-bold text-amber-300">
                                    {item.percentage}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-stone-400 pt-1 border-t border-stone-800">
                                  {item.zoneExample}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {thirtyDaysChartData.map((entry: { color: string }, index: number) => (
                          <Cell key={`bar-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Categorical breakdown summary badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-stone-100 dark:border-stone-800 text-[11px]">
                  {thirtyDaysChartData.map((item: { color: string; shortName: string; fullName: string; count: number; percentage: number }, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          className="font-semibold text-stone-700 dark:text-stone-300 truncate"
                          title={item.fullName}
                        >
                          {item.shortName}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-base font-black text-stone-900 dark:text-white">
                          {item.count}
                        </span>
                        <span className="text-[10px] text-stone-500 font-bold">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter & Batch Actions Toolbar */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left: Record Type Filter */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        historyTypeFilter === "all"
                          ? "bg-emerald-800 text-white shadow-2xs"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                      }`}
                    >
                      {language === "rw" ? "Byose" : "All Records"} ({scanHistory.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("parcel")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        historyTypeFilter === "parcel"
                          ? "bg-emerald-800 text-white shadow-2xs"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                      }`}
                    >
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>{language === "rw" ? "Imirima" : "Parcels"}</span>
                      <span className="text-[10px] opacity-80">
                        ({scanHistory.filter((i) => i.type === "parcel").length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("harvest")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        historyTypeFilter === "harvest"
                          ? "bg-emerald-800 text-white shadow-2xs"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                      }`}
                    >
                      <PackageCheck className="w-3 h-3 text-amber-500" />
                      <span>{language === "rw" ? "Umusaruro" : "Harvests"}</span>
                      <span className="text-[10px] opacity-80">
                        ({scanHistory.filter((i) => i.type === "harvest").length})
                      </span>
                    </button>
                  </div>

                  {/* Right: Batch Upload CSV and Sample Simulator Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchUploadOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        isBatchUploadOpen
                          ? "bg-emerald-900 text-white border-emerald-700"
                          : "bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {language === "rw"
                          ? "Injiza CSV (Batch Upload)"
                          : "Batch Upload CSV"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePopulateSampleScans}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                      title={
                        language === "rw"
                          ? "Gerageza ibisikano bya sample"
                          : "Simulate 5 camera scans"
                      }
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw" ? "Sample Scans" : "Sample Scans"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Date Range & Search Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs">
                  {/* Date Range Selector */}
                  <div className="flex items-center gap-1.5">
                    <CalendarRange className="w-4 h-4 text-emerald-600 shrink-0" />
                    <select
                      value={historyDatePreset}
                      onChange={(e) => setHistoryDatePreset(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="all">
                        {language === "rw" ? "Igihe Cyose (All Time)" : "All Time"}
                      </option>
                      <option value="today">
                        {language === "rw" ? "Uyu Munsi (Today)" : "Today"}
                      </option>
                      <option value="7d">
                        {language === "rw" ? "Iminsi 7 Ishize (Last 7 Days)" : "Last 7 Days"}
                      </option>
                      <option value="30d">
                        {language === "rw" ? "Iminsi 30 Ishize (Last 30 Days)" : "Last 30 Days"}
                      </option>
                      <option value="custom">
                        {language === "rw" ? "Hitamo Itariki (Custom Range)" : "Custom Date Range"}
                      </option>
                    </select>
                  </div>

                  {/* Custom Date Pickers */}
                  {historyDatePreset === "custom" && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={historyCustomStart}
                        onChange={(e) => setHistoryCustomStart(e.target.value)}
                        className="px-2 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-mono"
                        placeholder="Start"
                      />
                      <span className="text-stone-400">→</span>
                      <input
                        type="date"
                        value={historyCustomEnd}
                        onChange={(e) => setHistoryCustomEnd(e.target.value)}
                        className="px-2 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-mono"
                        placeholder="End"
                      />
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder={
                        language === "rw"
                          ? "Shakisha ID, izina ry'umurima, cyangwa umusaruro..."
                          : "Filter by ID, parcel name, crop, or district..."
                      }
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {historySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setHistorySearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Reset Filters Button */}
                  {(historyTypeFilter !== "all" ||
                    historyDatePreset !== "all" ||
                    historySearchQuery.trim() !== "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryTypeFilter("all");
                        setHistoryDatePreset("all");
                        setHistoryCustomStart("");
                        setHistoryCustomEnd("");
                        setHistorySearchQuery("");
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-stone-500 hover:text-rose-600 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                    >
                      {language === "rw" ? "Kugarura (Reset)" : "Reset Filters"}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Batch Upload Panel */}
              {isBatchUploadOpen && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 dark:border-emerald-800/80 pb-2.5">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>
                          {language === "rw"
                            ? "Kwinjiza Imirima & Imisaruro Byinshi (Batch CSV Upload)"
                            : "Batch Upload Parcel & Harvest Records (CSV)"}
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        {language === "rw"
                          ? "Ohereza idosiye ya CSV cyangwa wandike IDs hano kugira ngo bihite byinjira mu mbonerahamwe kandi bicapwe muri PDF imwe."
                          : "Upload a CSV spreadsheet or paste IDs below to auto-populate the table for batch processing and single-click multi-QR PDF printing."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadCsvTemplate}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-emerald-400 text-xs font-bold hover:bg-emerald-100 cursor-pointer shadow-2xs"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{language === "rw" ? "Urugero rwa CSV" : "Download Template"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLoadSampleCooperativeBatch}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{language === "rw" ? "Urugero rw'Ikipe (8)" : "Load 8 Sample Records"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag-and-drop or File Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 p-3 rounded-xl bg-white dark:bg-stone-900 border border-dashed border-emerald-400 dark:border-emerald-700 flex flex-col items-center justify-center text-center space-y-2">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      <div className="text-xs">
                        <span className="font-bold text-stone-900 dark:text-white block">
                          {language === "rw" ? "Hitamo Idosiye ya CSV" : "Upload CSV File"}
                        </span>
                        <span className="text-[10px] text-stone-500">.csv, .txt</span>
                      </div>
                      <label className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-2xs">
                        <span>{language === "rw" ? "Hitamo Idosiye" : "Choose File"}</span>
                        <input
                          type="file"
                          accept=".csv, .txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Textarea for Direct Paste */}
                    <div className="sm:col-span-2 space-y-2">
                      <textarea
                        rows={3}
                        value={batchUploadRawText}
                        onChange={(e) => setBatchUploadRawText(e.target.value)}
                        placeholder={
                          language === "rw"
                            ? "Paste CSV hano: id,type,name,crop,district,metrics\nparcel-kinigi-01,parcel,Kinigi Parcel A,Ibirayi,Musanze,1.4 Ha\nBATCH-RW-2026-081,harvest,Seed Potato Lot,Ibirayi,Musanze,4200 kg"
                            : "Or paste CSV rows directly here: id,type,name,crop,district,metrics\nparcel-kinigi-01,parcel,Kinigi Parcel A,Ibirayi,Musanze,1.4 Ha\nBATCH-RW-2026-081,harvest,Seed Potato Lot,Ibirayi,Musanze,4200 kg"
                        }
                        className="w-full p-2.5 rounded-xl text-xs font-mono bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!batchUploadRawText.trim()}
                          onClick={() => handleProcessCsvContent(batchUploadRawText)}
                          className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-2xs"
                        >
                          {language === "rw"
                            ? "Injiza & Shyira mu Mbonerahamwe (Process CSV)"
                            : "Process & Auto-Populate Table"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {batchUploadFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 ${
                        batchUploadFeedback.type === "success"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                          : "bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {batchUploadFeedback.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-semibold">{batchUploadFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBatchUploadFeedback(null)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Select Batch Action Bar (Sticky when records are checked) */}
              {selectedScanIds.size > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500 text-stone-950 shadow-md border border-amber-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <CheckSquare className="w-4 h-4" />
                    <span>
                      {selectedScanIds.size}{" "}
                      {language === "rw"
                        ? "byatoranyijwe muri kopi zo gucapa"
                        : "records selected for bulk printing & processing"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary Button: Open Print Preview Modal Overlay */}
                    <button
                      type="button"
                      disabled={isGeneratingBatchPdf}
                      onClick={() => {
                        const selectedItems = scanHistory.filter((item) =>
                          selectedScanIds.has(item.scanId)
                        );
                        generateBatchQrPdf(selectedItems, true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-950 hover:bg-stone-900 text-amber-300 font-extrabold text-xs shadow-sm cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <Printer className="w-4 h-4" />
                      <span>
                        {isGeneratingBatchPdf
                          ? batchPdfProgress || "Preparing Preview..."
                          : language === "rw"
                          ? `Reba Mbere yo Gucapa (${selectedScanIds.size})`
                          : `Print Preview (${selectedScanIds.size})`}
                      </span>
                    </button>

                    {/* Direct Download PDF Button */}
                    <button
                      type="button"
                      disabled={isGeneratingBatchPdf}
                      onClick={() => {
                        const selectedItems = scanHistory.filter((item) =>
                          selectedScanIds.has(item.scanId)
                        );
                        generateBatchQrPdf(selectedItems, false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/15 hover:bg-black/25 text-stone-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                      title={language === "rw" ? "Kuramo PDF ako kanya" : "Download PDF directly"}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedScanIds(new Set())}
                      className="px-2.5 py-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-xs font-bold cursor-pointer"
                    >
                      {language === "rw" ? "Kureka Byose" : "Clear"}
                    </button>
                  </div>
                </div>
              )}

              {/* GRANULAR SORTABLE SCAN ACTIVITY DATA TABLE */}
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-800">
                        {/* Checkbox Col */}
                        <th className="p-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectAll(filteredAndSortedHistory)}
                            className="cursor-pointer text-stone-600 dark:text-stone-300 hover:text-emerald-700"
                            title="Select / Deselect all visible"
                          >
                            {selectedScanIds.size > 0 &&
                            selectedScanIds.size === filteredAndSortedHistory.length ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>

                        {/* Scan Timestamp */}
                        <th className="p-3 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          onClick={() => handleToggleSort("timestamp")}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{language === "rw" ? "Igihe Yasikanwe" : "Scan Timestamp"}</span>
                            {tableSortField === "timestamp" ? (
                              tableSortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-stone-400" />
                            )}
                          </div>
                        </th>

                        {/* Parcel / Harvest ID */}
                        <th className="p-3 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          onClick={() => handleToggleSort("recordId")}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{language === "rw" ? "Nimero (ID)" : "Parcel / Harvest ID"}</span>
                            {tableSortField === "recordId" ? (
                              tableSortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-stone-400" />
                            )}
                          </div>
                        </th>

                        {/* Record Type */}
                        <th className="p-3 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          onClick={() => handleToggleSort("type")}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{language === "rw" ? "Ubwoko" : "Record Type"}</span>
                            {tableSortField === "type" ? (
                              tableSortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-stone-400" />
                            )}
                          </div>
                        </th>

                        {/* Entity Name & Crop */}
                        <th className="p-3 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          onClick={() => handleToggleSort("title")}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{language === "rw" ? "Izina & Igihingwa" : "Entity Name & Crop"}</span>
                            {tableSortField === "title" ? (
                              tableSortDirection === "asc" ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-stone-400" />
                            )}
                          </div>
                        </th>

                        {/* Zone & Metrics */}
                        <th className="p-3">
                          <span>{language === "rw" ? "Ubutaka / Umusaruro" : "Agronomic Metrics"}</span>
                        </th>

                        {/* Scan Method */}
                        <th className="p-3">
                          <span>{language === "rw" ? "Uburyo" : "Method"}</span>
                        </th>

                        {/* Granular Actions */}
                        <th className="p-3 text-right">
                          <span>{language === "rw" ? "Ibikorwa" : "Actions"}</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredAndSortedHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-stone-500">
                            <div className="max-w-xs mx-auto space-y-2">
                              <History className="w-8 h-8 text-stone-400 mx-auto" />
                              <p className="font-bold text-stone-800 dark:text-stone-200">
                                {language === "rw"
                                  ? "Nta bisikano bihuje n'ibyo wahisemo"
                                  : "No scan activity matches current filters"}
                              </p>
                              <p className="text-[11px] text-stone-500">
                                {language === "rw"
                                  ? "Hindura akayunguruzo cyangwa ukoreshe Batch Upload."
                                  : "Try changing your filters or upload a CSV file with IDs."}
                              </p>
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={handlePopulateSampleScans}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-2xs"
                                >
                                  {language === "rw" ? "Kanda Hano Ugerageze Sample" : "Load Sample Scans"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedHistory.map((entry) => {
                          const isSelected = selectedScanIds.has(entry.scanId);
                          const isParcel = entry.type === "parcel";

                          return (
                            <tr
                              key={entry.scanId}
                              className={`hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${
                                isSelected ? "bg-amber-50/70 dark:bg-amber-950/20" : ""
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectOne(entry.scanId)}
                                  className="cursor-pointer text-stone-600 dark:text-stone-300 hover:text-emerald-700"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-stone-400" />
                                  )}
                                </button>
                              </td>

                              {/* Timestamp */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <div className="font-mono text-xs font-semibold text-stone-900 dark:text-white flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-stone-400" />
                                    <span>{entry.scannedTimeDisplay}</span>
                                  </div>
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    {entry.scannedAtIso.split("T")[0]}
                                  </span>
                                </div>
                              </td>

                              {/* Parcel / Harvest ID */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-xs text-stone-900 dark:text-white px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                                    {entry.recordId}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(entry.recordId);
                                    }}
                                    title="Copy ID"
                                    className="p-1 rounded text-stone-400 hover:text-emerald-700 hover:bg-stone-200 dark:hover:bg-stone-700"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* Type Badge */}
                              <td className="p-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                                    isParcel
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                      : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                  }`}
                                >
                                  {isParcel ? (
                                    <>
                                      <MapPin className="w-3 h-3" />
                                      <span>PARCEL</span>
                                    </>
                                  ) : (
                                    <>
                                      <PackageCheck className="w-3 h-3" />
                                      <span>HARVEST</span>
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* Entity Name & Subtitle */}
                              <td className="p-3 min-w-[180px]">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-stone-900 dark:text-white block line-clamp-1">
                                    {entry.title}
                                  </span>
                                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block line-clamp-1">
                                    {entry.subtitle}
                                  </span>
                                </div>
                              </td>

                              {/* Metrics */}
                              <td className="p-3 min-w-[160px]">
                                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block line-clamp-1">
                                  {entry.metricsLine}
                                </span>
                              </td>

                              {/* Method */}
                              <td className="p-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-mono text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                                  {getScanMethodLabel(entry.scanMethod)}
                                </span>
                              </td>

                              {/* Granular Actions */}
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Download QR Code PNG Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadQrPng(entry.type, entry.recordId, entry.title)}
                                    title={
                                      language === "rw"
                                        ? "Kuramo PNG ya QR yo gucapa"
                                        : "Download QR Code PNG for printing"
                                    }
                                    className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Download className="w-3.5 h-3.5 text-amber-300" />
                                  </button>

                                  {/* Open Details Dossier */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistoryItem(entry, "details")}
                                    title={
                                      language === "rw"
                                        ? "Fungura amakuru arambuye"
                                        : "Open full record dossier"
                                    }
                                    className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>

                                  {/* View / Print Label */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistoryItem(entry, "qr_label")}
                                    title={
                                      language === "rw"
                                        ? "Reba Ikarita ya QR"
                                        : "View printable QR label"
                                    }
                                    className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHistoryItem(entry.scanId)}
                                    title="Delete from history"
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Summary */}
                <div className="p-3 bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 font-semibold">
                  <div className="flex items-center gap-3">
                    <span>
                      {language === "rw" ? "Ibisikano Byose:" : "Total Records:"}{" "}
                      <strong className="text-stone-900 dark:text-white font-mono">{scanHistory.length}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      {language === "rw" ? "Biri Kugaragara:" : "Visible Filtered:"}{" "}
                      <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                        {filteredAndSortedHistory.length}
                      </strong>
                    </span>
                    {selectedScanIds.size > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {selectedScanIds.size} {language === "rw" ? "byatoranyijwe" : "selected for PDF batch"}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {scanHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearScanHistory}
                        className="text-stone-400 hover:text-rose-600 cursor-pointer font-normal"
                      >
                        {language === "rw" ? "Siba amateka yose" : "Clear all scan history"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 5: SCAN TRENDS VISUALIZATION (Recharts 30-Day Frequency & Distribution) */}
          {mode === "trends" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Top Summary Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-50 via-amber-50/30 to-emerald-50/40 dark:from-stone-900 dark:via-amber-950/20 dark:to-emerald-950/30 border border-stone-200 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 font-black shadow-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
                        <span>
                          {language === "rw"
                            ? "Imigendekere y'Ibisikano: Isesengura ry'Iminsi 30"
                            : "Scan Trends: 30-Day QR Frequency & Distribution"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                          Recharts
                        </span>
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-300">
                        {language === "rw"
                          ? "Reba imbonerahamwe y'ubwoko bw'imirima (agro-zones) n'imisaruro (harvest batches) byasikanywe kenshi mu minsi 30 ishize hakurikijwe amakuru nyayo ya Terimbere."
                          : "Visual frequency distribution of the most scanned parcel agro-ecological zones and certified harvest commodity batches over the past 30 days."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSimulateRandomScan}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title={language === "rw" ? "Ongeraho igisikano cy'ikitegererezo (+1)" : "Simulate +1 random scan to test live bar updates"}
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>{language === "rw" ? "Gerageza Igisikano (+1)" : "Simulate Scan (+1)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePopulateSampleScans}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                    title={language === "rw" ? "Subiza ibyegeranyo by'ibanze bya sample" : "Load sample cooperative scans"}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{language === "rw" ? "Sample Scans" : "Sample Scans"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("history")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === "rw" ? "Amateka" : "History Table"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("scanner")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-300" />
                    <span>{language === "rw" ? "Sikana" : "Scan QR"}</span>
                  </button>
                </div>
              </div>

              {/* 4 Stat KPI Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total 30-Day Scans */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold">
                    <span>{language === "rw" ? "Ibisikano Byose (Iminsi 30)" : "Total Scans (30 Days)"}</span>
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-stone-900 dark:text-white font-mono">
                    {total30dScans}
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      {totalParcelScansIn30Days} {language === "rw" ? "imirima" : "parcels"}
                    </span>
                    <span>·</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      {totalHarvestScansIn30Days} {language === "rw" ? "imisaruro" : "harvests"}
                    </span>
                  </div>
                </div>

                {/* Most Frequently Scanned Type */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold">
                    <span>{language === "rw" ? "Icyasikanywe Kenshi" : "Top Scanned Type"}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-sm font-black text-stone-900 dark:text-white truncate" title={topScannedType?.fullName}>
                    {topScannedType ? topScannedType.fullName : "N/A"}
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {topScannedType ? `${topScannedType.count} scans` : "0 scans"}
                    </span>
                    <span className="text-stone-400">
                      ({topScannedType ? `${topScannedType.percentage}% share` : "0%"})
                    </span>
                  </div>
                </div>

                {/* Active Scope Filter */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold">
                    <span>{language === "rw" ? "Icyiciro Gihebuje" : "Active Group Scope"}</span>
                    <Filter className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-sm font-black text-stone-900 dark:text-white capitalize truncate">
                    {trendFilterGroup === "all"
                      ? language === "rw" ? "Byose (Imirima + Imisaruro)" : "All (Parcels + Harvests)"
                      : trendFilterGroup === "parcel"
                      ? language === "rw" ? "Imirima Gusa (Agro-Zones)" : "Parcels Only (Zones)"
                      : language === "rw" ? "Imisaruro Gusa (Batches)" : "Harvests Only (Lots)"}
                  </div>
                  <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {thirtyDaysChartData.length} {language === "rw" ? "amoko agaragara" : "categories graphed"}
                    </span>
                  </div>
                </div>

                {/* Traceability Compliance */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-[11px] font-bold">
                    <span>{language === "rw" ? "Ubusugire bwa QR" : "Traceability Index"}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>100% MINAGRI Compliant</span>
                  </div>
                  <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <span>{language === "rw" ? "Imbonerahamwe ifite umutekano" : "Digital field provenance active"}</span>
                  </div>
                </div>
              </div>

              {/* Chart Filter, Sort & Action Controls Toolbar */}
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Group Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    <span>{language === "rw" ? "Akayunguruzo:" : "Filter:"}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setTrendFilterGroup("all")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      trendFilterGroup === "all"
                        ? "bg-stone-900 dark:bg-white text-white dark:text-stone-950 shadow-xs"
                        : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span>{language === "rw" ? "Byose Byasikanywe" : "All Types"}</span>
                    <span className="ml-1.5 opacity-75 text-[10px]">({total30dScans})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrendFilterGroup("parcel")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      trendFilterGroup === "parcel"
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{language === "rw" ? "Imirima (Agro-Zones)" : "Parcel Agro-Zones"}</span>
                    <span className="ml-1 opacity-75 text-[10px]">({totalParcelScansIn30Days})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrendFilterGroup("harvest")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      trendFilterGroup === "harvest"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <PackageCheck className="w-3 h-3 text-amber-300" />
                    <span>{language === "rw" ? "Imisaruro (Commodities)" : "Harvest Batches"}</span>
                    <span className="ml-1 opacity-75 text-[10px]">({totalHarvestScansIn30Days})</span>
                  </button>
                </div>

                {/* Sort Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{language === "rw" ? "Gushungura:" : "Sort:"}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setTrendSortBy("count")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                      trendSortBy === "count"
                        ? "bg-amber-500 text-stone-950 font-black"
                        : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    {language === "rw" ? "Inshuro Nyinshi" : "Most Scanned"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrendSortBy("name")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                      trendSortBy === "name"
                        ? "bg-amber-500 text-stone-950 font-black"
                        : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    {language === "rw" ? "Inyuguti (A-Z)" : "Alphabetical"}
                  </button>

                  {scannedItems30d.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear30dScans}
                      className="text-stone-400 hover:text-rose-600 text-[11px] cursor-pointer ml-1"
                      title="Clear 30-day trend logs"
                    >
                      {language === "rw" ? "Siba Log" : "Reset Log"}
                    </button>
                  )}
                </div>
              </div>

              {/* The Main Recharts Bar Chart Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>
                        {trendFilterGroup === "all"
                          ? language === "rw"
                            ? "Ibyegeranyo Byose by'Imirima n'Imisaruro Yasikanwe (Iminsi 30)"
                            : "Most Frequently Scanned Parcel & Harvest Types (Last 30 Days)"
                          : trendFilterGroup === "parcel"
                          ? language === "rw"
                            ? "Ubwoko bw'Imirima Yasikanwe Hakurikijwe Akarere k'Ubutaka (Iminsi 30)"
                            : "Most Scanned Parcel Agro-Ecological Zones (Last 30 Days)"
                          : language === "rw"
                          ? "Ubwoko bw'Imisaruro Yasikanwe Hakurikijwe Igihingwa (Iminsi 30)"
                          : "Most Scanned Harvest Commodity Batch Types (Last 30 Days)"}
                      </span>
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {language === "rw"
                        ? "Kanda ku nkingi (bar) cyangwa uyinyuzeho imbeba kugira ngo urebe amakuru arambuye y'ubwoko n'urugero byasikanywe."
                        : "Interactive bar chart powered by recharts. Hover over or tap any bar for detailed scan frequency, percentage share, and regional provenance."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      <span>Rolling 30-Day Window</span>
                    </span>
                  </div>
                </div>

                {/* Recharts BarChart Canvas */}
                <div className="w-full h-80 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={thirtyDaysChartData}
                      margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#88888820"
                      />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-stone-600 dark:text-stone-400"
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={55}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-stone-600 dark:text-stone-400"
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="p-3.5 rounded-2xl bg-stone-950 text-white text-xs shadow-2xl border border-stone-800 space-y-2 max-w-xs z-50">
                                <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
                                  <div className="font-bold flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full shrink-0"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm font-black">{item.fullName}</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-stone-800 text-stone-300">
                                    {item.groupLabel}
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-stone-300 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span>
                                      {language === "rw" ? "Inshuro Yasikanwe:" : "Scan Frequency:"}
                                    </span>
                                    <span className="font-extrabold text-white text-sm font-mono">
                                      {item.count} {language === "rw" ? "ibisikano" : "scans"}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span>
                                      {language === "rw" ? "Ijanisha (Share):" : "Percentage Share:"}
                                    </span>
                                    <span className="font-bold text-amber-300 font-mono">
                                      {item.percentage}%
                                    </span>
                                  </div>

                                  {/* Visual mini-bar */}
                                  <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color }}
                                    />
                                  </div>

                                  {item.recentRecordName && (
                                    <div className="pt-1 text-[11px] text-stone-400">
                                      <span className="text-stone-500">
                                        {language === "rw" ? "Ibyaherutse:" : "Latest Scan:"}{" "}
                                      </span>
                                      <span className="text-stone-200 font-medium">{item.recentRecordName}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-[10px] text-stone-400 pt-2 border-t border-stone-800 leading-relaxed">
                                  {item.zoneExample}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {thirtyDaysChartData.map((entry: { color: string }, index: number) => (
                          <Cell key={`trends-bar-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Categorical Breakdown Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {language === "rw"
                        ? "Ibisobanuro n'Imibare Byimbitse kuri Buri Bwoko:"
                        : "Granular Category Breakdown & Regional Provenance:"}
                    </span>
                  </h4>
                  <span className="text-[11px] font-mono text-stone-500">
                    {thirtyDaysChartData.length} {language === "rw" ? "amoko" : "categories"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {thirtyDaysChartData.map((item) => {
                    const isParcel = item.group === "parcel";
                    return (
                      <div
                        key={`trend-card-${item.key}-${item.group}`}
                        className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all shadow-xs flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                                isParcel
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              }`}
                            >
                              {isParcel ? <MapPin className="w-2.5 h-2.5" /> : <PackageCheck className="w-2.5 h-2.5" />}
                              <span>{item.groupLabel.toUpperCase()}</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-mono text-xs font-black text-stone-900 dark:text-white">
                                {item.count} scans
                              </span>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-bold text-xs text-stone-900 dark:text-white flex items-center justify-between">
                              <span>{item.fullName}</span>
                              <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                                {item.percentage}%
                              </span>
                            </h5>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 pt-0.5 line-clamp-2">
                              {item.zoneExample}
                            </p>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color }}
                            />
                          </div>

                          {item.recentRecordName && (
                            <div className="text-[10px] text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-850 px-2.5 py-1.5 rounded-xl border border-stone-200/60 dark:border-stone-800/60 truncate">
                              <span className="font-semibold text-stone-500">
                                {language === "rw" ? "Ibyaherutse:" : "Recent:"}{" "}
                              </span>
                              <span>{item.recentRecordName}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              logScan30d(item.group, {
                                recordId: `${item.key}-test`,
                                title: item.fullName,
                                subtitle: item.zoneExample,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Add +1 scan to this category"
                          >
                            <Plus className="w-3 h-3 text-emerald-600" />
                            <span>+1 Scan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMode("history")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            <span>{language === "rw" ? "Amateka" : "View History"}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINT PREVIEW MODAL OVERLAY: Verify layout before printing     */}
      {/* ============================================================== */}
      {isPreviewModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Batch QR Code Print Preview"
        >
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-5xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Top Bar of Print Preview */}
            <div className="bg-[#064E3B] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-amber-300 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {language === "rw" ? "Igaragaza ryo Gucapa (Print Preview)" : "Print Layout Verification"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 border border-emerald-700 text-emerald-200">
                      A4 Standard · 300 DPI
                    </span>
                  </div>
                  <h3 className="text-base font-black">
                    {language === "rw"
                      ? `Reba Kopi za QR mbere yo Gucapa (${previewItems.length} zatoranyijwe)`
                      : `Batch QR Code Print Preview (${previewItems.length} records · ${previewTotalPages} page${previewTotalPages > 1 ? "s" : ""})`}
                  </h3>
                </div>
              </div>

              {/* View Switcher & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Switcher */}
                <div className="flex bg-emerald-950/80 p-0.5 rounded-xl border border-emerald-700/60 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewActiveTab("document")}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      previewActiveTab === "document"
                        ? "bg-amber-500 text-stone-950"
                        : "text-emerald-100 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === "rw" ? "Idosiye ya PDF" : "PDF Document"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewActiveTab("interactive")}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      previewActiveTab === "interactive"
                        ? "bg-amber-500 text-stone-950"
                        : "text-emerald-100 hover:text-white"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === "rw" ? "Ikarita ku Rupapuro" : "Sheet Cards"}</span>
                  </button>
                </div>

                {/* Primary: Trigger Browser Print Dialog */}
                <button
                  type="button"
                  onClick={handleTriggerBrowserPrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-md transition-transform active:scale-95"
                >
                  <Printer className="w-4 h-4 text-stone-950" />
                  <span>
                    {language === "rw" ? "Capa Ako Kanya (Print)" : "Print Document"}
                  </span>
                </button>

                {/* Secondary: Download PDF File */}
                <button
                  type="button"
                  onClick={handleDownloadFromPreview}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer border border-emerald-600 transition-colors"
                  title="Download PDF file"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>PDF</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Subheader info bar */}
            <div className="bg-stone-50 dark:bg-stone-850 px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                <span className="font-semibold">
                  {language === "rw"
                    ? "Genzura ko buri karita ifite QR, ID, n'amakuru y'umurima cyangwa umusaruro:"
                    : "Inspect layout alignment, cut lines, and data accuracy prior to printing:"}
                </span>
                <span className="font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                  {previewItems.length} {language === "rw" ? "Kopi za QR" : "Labels"}
                </span>
                <span className="font-mono px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-[11px]">
                  {previewTotalPages} A4 Page{previewTotalPages > 1 ? "s" : ""}
                </span>
              </div>

              {/* Pagination controls for interactive view */}
              {previewActiveTab === "interactive" && previewTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={previewPageNumber <= 1}
                    onClick={() => setPreviewPageNumber((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold font-mono text-xs">
                    Page {previewPageNumber} of {previewTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={previewPageNumber >= previewTotalPages}
                    onClick={() => setPreviewPageNumber((p) => Math.min(previewTotalPages, p + 1))}
                    className="p-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-stone-100 dark:bg-stone-950">
              {previewActiveTab === "document" ? (
                <div className="space-y-3">
                  {previewPdfBlobUrl ? (
                    <div className="rounded-2xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-md overflow-hidden">
                      <iframe
                        ref={printIframeRef}
                        src={`${previewPdfBlobUrl}#toolbar=1`}
                        className="w-full h-[60vh] sm:h-[65vh] border-0"
                        title="Batch QR Code PDF Document Print Preview"
                      />
                    </div>
                  ) : (
                    <div className="p-12 text-center text-stone-500">
                      Loading PDF preview...
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-stone-500">
                    <p>
                      {language === "rw"
                        ? "Inama: Kanda 'Print Document' hejuru kugira ngo ufungure idirishya ryo gucapa rya mudasobwa cyangwa telefoni."
                        : "Tip: Click 'Print Document' to trigger the browser's print dialog, or switch to 'Sheet Cards' view to inspect individual cut cards."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewActiveTab("interactive")}
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      {language === "rw" ? "Reba amakarita yose arambuye →" : "Switch to Sheet Cards View →"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Interactive Sheet Preview */
                <div className="space-y-4">
                  {/* Simulated A4 Page Container */}
                  <div className="max-w-4xl mx-auto bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-300 dark:border-stone-800 p-5 sm:p-8 space-y-4">
                    {/* Simulated A4 Header Banner */}
                    <div className="border-b-2 border-emerald-800 pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wider">
                          TERIMBERE AGRI-TRACK · OFFICIAL BATCH QR PRINT SHEET
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Rwanda Digital Parcel & Harvest Traceability System · High-Resolution (300 DPI)
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs font-bold text-stone-600 dark:text-stone-300">
                        <span>Page {previewPageNumber} of {previewTotalPages}</span>
                      </div>
                    </div>

                    {/* 2 columns x 3 rows grid of printable QR Label Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {previewItems
                        .slice((previewPageNumber - 1) * 6, previewPageNumber * 6)
                        .map((item, idx) => {
                          const isParcel = item.type === "parcel";
                          const qrDataUrl = previewQrDataUrls[item.scanId];

                          return (
                            <div
                              key={item.scanId || idx}
                              className="rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 overflow-hidden shadow-xs relative flex flex-col justify-between"
                            >
                              {/* Card Header Strip */}
                              <div
                                className={`px-3 py-1.5 text-white flex items-center justify-between font-bold text-[10px] ${
                                  isParcel ? "bg-[#064E3B]" : "bg-amber-700"
                                }`}
                              >
                                <span className="tracking-wider">TERIMBERE AGRI-TRACK</span>
                                <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-white/20">
                                  {isParcel ? "PARCEL SIGNPOST" : "HARVEST BATCH"}
                                </span>
                              </div>

                              {/* Card Body */}
                              <div className="p-3.5 flex items-start gap-3">
                                {/* High-Res QR Code Preview */}
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-stone-200 dark:border-stone-700 p-1 bg-white shrink-0 flex items-center justify-center">
                                  {qrDataUrl ? (
                                    <img
                                      src={qrDataUrl}
                                      alt={item.title}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <QrCode className="w-12 h-12 text-stone-400 animate-pulse" />
                                  )}
                                </div>

                                {/* Text Metadata */}
                                <div className="space-y-1 text-xs min-w-0 flex-1">
                                  <div className="font-mono font-black text-[11px] text-stone-900 dark:text-white truncate">
                                    ID: {item.recordId}
                                  </div>
                                  <div className="font-bold text-stone-800 dark:text-stone-100 line-clamp-1">
                                    {item.title}
                                  </div>
                                  <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                                    {item.subtitle}
                                  </div>
                                  <div className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 line-clamp-1">
                                    {item.metricsLine}
                                  </div>
                                  <div className="text-[9px] text-stone-400 font-mono pt-0.5">
                                    Scanned/Created: {item.scannedTimeDisplay}
                                  </div>
                                </div>
                              </div>

                              {/* Card Verification Bottom Guideline */}
                              <div className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-700 text-[9px] text-stone-500 flex items-center justify-between">
                                <span className="italic">Cut along dashed line · Scan with camera</span>
                                <span className="font-bold uppercase text-[8px] text-stone-400">
                                  MINAGRI / RAB AUTHENTICATED
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Simulated A4 Page Footer */}
                    <div className="border-t border-stone-200 dark:border-stone-800 pt-3 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                      <span>TERIMBERE Cooperative Provenance</span>
                      <span>Page {previewPageNumber} of {previewTotalPages}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="bg-white dark:bg-stone-900 px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>300 DPI Vector QR</span>
                </span>
                <span>·</span>
                <span>Ready for A4 paper, label stickers, or field signposts</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  {language === "rw" ? "Funga (Close)" : "Close Preview"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFromPreview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>{language === "rw" ? "Kuramo PDF" : "Download PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerBrowserPrint}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-md transition-transform active:scale-95"
                >
                  <Printer className="w-4 h-4 text-stone-950" />
                  <span>
                    {language === "rw" ? "Capa Ako Kanya (Print)" : "Print Now"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
