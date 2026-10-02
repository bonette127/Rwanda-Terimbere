import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  Farm,
  HarvestRecord,
  Language,
  Expense,
  FarmActivity,
  FarmPlan,
  SaleRecord,
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
} from "lucide-react";

export type QrRecordType = "parcel" | "harvest";
export type QrModalMode = "qr_label" | "details" | "scanner" | "history";

const SCAN_HISTORY_STORAGE_KEY = "terimbere_qr_scan_history_v1";
const MAX_SCAN_HISTORY = 5;

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
  scanMethod: "camera" | "qr_image" | "camera_simulation";
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
  onSelectRecordFromScan: (type: QrRecordType, id: string) => void;
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
  onSelectRecordFromScan,
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

  // Persisted Last 5 Camera Scans History
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

      setActiveRecordType("harvest");
      setActiveHarvestOverride(targetHarvest);
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
      if (entry.cachedFarm) {
        setActiveFarmOverride(entry.cachedFarm);
      }
      onSelectRecordFromScan("parcel", entry.recordId);
    } else {
      setActiveRecordType("harvest");
      if (entry.cachedHarvest) {
        setActiveHarvestOverride(entry.cachedHarvest);
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
  };

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deepLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `TERIMBERE_QR_${activeRecordType.toUpperCase()}_${activeId}.png`;
    a.click();
  };

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

  const filteredHistory = scanHistory.filter((entry) => {
    if (historyFilter === "all") return true;
    return entry.type === historyFilter;
  });

  const getScanMethodLabel = (method: QrScanHistoryEntry["scanMethod"]) => {
    switch (method) {
      case "camera":
        return language === "rw" ? "Camera ya Telefoni" : "Live Camera Scan";
      case "qr_image":
        return language === "rw" ? "Ifoto ya QR" : "Uploaded QR Image";
      default:
        return language === "rw" ? "Camera Scan" : "Camera Scan";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6">
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
                    ? "bg-amber-500 text-stone-950"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Amateka" : "Scan History"} (
                  {scanHistory.length}/{MAX_SCAN_HISTORY})
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
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>
                      {language === "rw" ? "Kuramo PNG ya QR" : "Download QR PNG"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 font-bold text-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{language === "rw" ? "Capa Ikarita" : "Print Label"}</span>
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
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                    {activeId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMode("history")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    <History className="w-3 h-3 text-amber-300" />
                    <span>
                      {language === "rw" ? "Amateka" : "Scan History"} (
                      {scanHistory.length}/{MAX_SCAN_HISTORY})
                    </span>
                  </button>
                </div>
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
                              {p.season} · Est. {p.expectedYieldKg.toLocaleString()} kg
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
                              {s.pricePerKg} RWF)
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

          {/* MODE 4: SCAN HISTORY TAB (Last 5 Parcels or Harvests Scanned Using Camera) */}
          {mode === "history" && (
            <div className="space-y-5">
              {/* Top Summary Banner */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>
                      {language === "rw"
                        ? `Imirima n'Imisaruro 5 ya Nyuma Yasikanwe (${scanHistory.length}/${MAX_SCAN_HISTORY})`
                        : `Last 5 Camera-Scanned Parcels & Harvest Batches (${scanHistory.length}/${MAX_SCAN_HISTORY})`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {language === "rw"
                      ? "Kanda ku murima cyangwa umusaruro uwo ari wo wose mu ishakiro ry'ibyabanje gusikanwa kugira ngo ufungure amakuru yawo arambuye ako kanya."
                      : "Quickly reopen any of the last 5 farm parcels or harvest batches scanned with your camera without needing to re-scan the physical tag."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMode("scanner")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {language === "rw" ? "Sikana QR Nshya" : "Scan New QR"}
                    </span>
                  </button>

                  {scanHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearScanHistory}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-700 dark:text-stone-200 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw" ? "Siba Amateka" : "Clear History"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("all")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      historyFilter === "all"
                        ? "bg-emerald-800 text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    {language === "rw" ? "Byose" : "All Scans"} ({scanHistory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("parcel")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      historyFilter === "parcel"
                        ? "bg-emerald-800 text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    {language === "rw" ? "Imirima" : "Parcels"} (
                    {scanHistory.filter((i) => i.type === "parcel").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("harvest")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                      historyFilter === "harvest"
                        ? "bg-emerald-800 text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
                    }`}
                  >
                    {language === "rw" ? "Umusaruro" : "Harvests"} (
                    {scanHistory.filter((i) => i.type === "harvest").length})
                  </button>
                </div>

                {scanHistory.length < MAX_SCAN_HISTORY && (
                  <button
                    type="button"
                    onClick={handlePopulateSampleScans}
                    className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {language === "rw"
                        ? "Gerageza Ibisikano 5 bya Camera (Load 5 Sample Scans)"
                        : "Simulate Last 5 Camera Scans"}
                    </span>
                  </button>
                )}
              </div>

              {/* History List (Up to 5 Recent Scans) */}
              {filteredHistory.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                      {language === "rw"
                        ? "Nta murima cyangwa umusaruro urasikanwa"
                        : "No Recent Camera Scans Recorded Yet"}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      {language === "rw"
                        ? "Sikana QR Code y'umurima cyangwa umusaruro ukoresheje camera kugira ngo imirima cyangwa imisaruro 5 iheruka igaragare hano."
                        : "Scan a Farm Parcel signpost or Harvest Batch tag using the camera scanner—your last 5 scanned items will appear here for instant access."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setMode("scanner")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {language === "rw" ? "Fungura Scanner" : "Open QR Scanner"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePopulateSampleScans}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw"
                          ? "Gerageza Ibisikano 5 bya Camera"
                          : "Simulate 5 Camera Scans"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((entry, idx) => (
                    <div
                      key={entry.scanId}
                      className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-600/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                            entry.type === "parcel"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                            <span
                              className={
                                entry.type === "parcel"
                                  ? "font-bold text-emerald-700 dark:text-emerald-400"
                                  : "font-bold text-amber-700 dark:text-amber-400"
                              }
                            >
                              {entry.type === "parcel" ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>PARCEL</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <PackageCheck className="w-3 h-3" />
                                  <span>HARVEST BATCH</span>
                                </span>
                              )}
                            </span>
                            <span aria-hidden="true" className="text-stone-400">
                              ·
                            </span>
                            <span className="text-stone-600 dark:text-stone-300 font-semibold">
                              {entry.codeLabel}
                            </span>
                            <span aria-hidden="true" className="text-stone-400">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 text-stone-500">
                              <Clock className="w-3 h-3" />
                              <span>{entry.scannedTimeDisplay}</span>
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-stone-900 dark:text-white">
                            {entry.title}
                          </h4>

                          <p className="text-stone-600 dark:text-stone-400">
                            {entry.subtitle}
                          </p>

                          <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400 tabular-nums">
                            {entry.metricsLine} · {getScanMethodLabel(entry.scanMethod)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-stone-100 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryItem(entry, "details")}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <span>
                            {language === "rw" ? "Fungura Amakuru" : "Open Details"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenHistoryItem(entry, "qr_label")}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                          title={
                            language === "rw"
                              ? "Reba Ikarita ya QR"
                              : "View Printable QR Label"
                          }
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveHistoryItem(entry.scanId)}
                          aria-label="Remove scan from history"
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
