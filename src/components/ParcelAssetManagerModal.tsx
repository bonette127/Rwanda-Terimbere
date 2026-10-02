import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  Farm,
  FarmAsset,
  FarmAssetCategory,
  FarmAssetCondition,
  Language,
} from "../types";
import { resolveFarmCoords } from "./FarmActivityGpsMap";
import {
  Wrench,
  QrCode,
  Plus,
  Camera,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ArrowRightLeft,
  Trash2,
  Upload,
  X,
  Copy,
  Check,
  ShieldCheck,
  User,
  Tag,
} from "lucide-react";

interface ParcelAssetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  farm: Farm;
  allFarms: Farm[];
  assets: FarmAsset[];
  onSelectFarm: (farm: Farm) => void;
  onAddAsset: (asset: Omit<FarmAsset, "id">) => void;
  onReassignAsset: (assetId: string, targetFarmId: string, targetFarmName: string) => void;
  onUpdateAssetCondition: (assetId: string, condition: FarmAssetCondition) => void;
  onDeleteAsset: (assetId: string) => void;
  isViewOnly?: boolean;
}

export function buildAssetQrPayloadUrl(asset: {
  id?: string;
  assetTagCode: string;
  farmId: string;
  farmName: string;
  name: string;
}): string {
  const origin =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://terimbere.rw/";
  const params = new URLSearchParams({
    qrType: "asset",
    tag: asset.assetTagCode,
    farmId: asset.farmId,
    assetId: asset.id || "new",
  });
  return `${origin}?${params.toString()}`;
}

export const ParcelAssetManagerModal: React.FC<ParcelAssetManagerModalProps> = ({
  isOpen,
  onClose,
  language,
  farm,
  allFarms,
  assets,
  onSelectFarm,
  onAddAsset,
  onReassignAsset,
  onUpdateAssetCondition,
  onDeleteAsset,
  isViewOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "add_qr" | "scan_qr">("inventory");
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [focusedStickerAsset, setFocusedStickerAsset] = useState<FarmAsset | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Add New Asset Form State
  const districtPrefix = (farm.district || "RWA").slice(0, 3).toUpperCase();
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<FarmAssetCategory>("sprayer");
  const [newTagCode, setNewTagCode] = useState(
    `TRM-EQP-${districtPrefix}-${String(assets.length + 1).padStart(3, "0")}`
  );
  const [newSerialNumber, setNewSerialNumber] = useState("");
  const [newCustodian, setNewCustodian] = useState("Faustin Mugabo");
  const [newValueRwf, setNewValueRwf] = useState("150000");
  const [newCondition, setNewCondition] = useState<FarmAssetCondition>("excellent");
  const [newNotes, setNewNotes] = useState("");
  const [previewQrUrl, setPreviewQrUrl] = useState<string>("");

  // QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedAsset, setScannedAsset] = useState<FarmAsset | null>(null);
  const [scannedRawTag, setScannedRawTag] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const plotAssets = useMemo(
    () => assets.filter((a) => a.farmId === farm.id),
    [assets, farm.id]
  );

  const otherPlotAssets = useMemo(
    () => assets.filter((a) => a.farmId !== farm.id),
    [assets, farm.id]
  );

  const totalPlotAssetValue = useMemo(
    () => plotAssets.reduce((sum, a) => sum + a.purchaseValueRwf, 0),
    [plotAssets]
  );

  // Keep default tag code fresh when farm or assets change
  useEffect(() => {
    const prefix = (farm.district || "RWA").slice(0, 3).toUpperCase();
    const randomSuffix = String(assets.length + 1).padStart(3, "0");
    setNewTagCode(`TRM-EQP-${prefix}-${randomSuffix}`);
  }, [farm.district, assets.length]);

  // Generate QR codes for all assets
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const generateAll = async () => {
      const nextMap: Record<string, string> = {};
      for (const item of assets) {
        try {
          const payloadUrl = buildAssetQrPayloadUrl(item);
          const url = await QRCode.toDataURL(payloadUrl, {
            width: 260,
            margin: 1,
            color: { dark: "#064E3B", light: "#FFFFFF" },
          });
          nextMap[item.id] = url;
        } catch {
          // ignore individual error
        }
      }
      if (!isCancelled) {
        setQrDataUrls(nextMap);
      }
    };

    generateAll();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, assets]);

  // Generate live QR preview for new equipment form
  useEffect(() => {
    if (!isOpen || activeTab !== "add_qr") return;
    const payload = buildAssetQrPayloadUrl({
      assetTagCode: newTagCode || "TRM-EQP-NEW",
      farmId: farm.id,
      farmName: farm.name,
      name: newName || "Farm Equipment",
    });
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: "#064E3B", light: "#FFFFFF" },
    })
      .then((url) => setPreviewQrUrl(url))
      .catch(() => {});
  }, [isOpen, activeTab, newTagCode, newName, farm.id, farm.name]);

  // Stop camera on close or tab change
  const stopCamera = () => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== "scan_qr") {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const getCategoryLabel = (cat: FarmAssetCategory) => {
    switch (cat) {
      case "sprayer":
        return language === "rw" ? "Pompayi yo Gutera Umuti" : "Sprayer & Crop Protection";
      case "irrigation_pump":
        return language === "rw" ? "Ibikoresho byo Kuhira (Pump/Drip)" : "Irrigation Pump & Drip Kit";
      case "tillage_tool":
        return language === "rw" ? "Ibikoresho byo Guhinga & Amaterasi" : "Tillage & Terrace Tools";
      case "soil_sensor":
        return language === "rw" ? "Ibipimo by'Ubutaka & Ubuhehere" : "Soil pH & Moisture Sensor";
      case "harvest_crate":
        return language === "rw" ? "Amasanduku n'Ibikoresho by'Isarura" : "Harvest Crates & Post-Harvest";
      case "tractor_implement":
        return language === "rw" ? "Imashini z'Ubuhinzi (Mechanization)" : "Mechanized Implement";
    }
  };

  const getConditionInfo = (cond: FarmAssetCondition) => {
    switch (cond) {
      case "excellent":
        return {
          label: language === "rw" ? "Gishya / Gikora Neza Cyane" : "Excellent Condition",
          textClass: "text-emerald-700 dark:text-emerald-400",
        };
      case "good":
        return {
          label: language === "rw" ? "Gikora Neza" : "Good Working Order",
          textClass: "text-teal-700 dark:text-teal-400",
        };
      case "maintenance_due":
        return {
          label: language === "rw" ? "Gikeneye Gusuzumwa / Gusana" : "Maintenance Due",
          textClass: "text-rose-600 dark:text-rose-400",
        };
    }
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTagCode.trim()) return;

    const today = new Date().toISOString().split("T")[0];
    onAddAsset({
      assetTagCode: newTagCode.trim().toUpperCase(),
      name: newName.trim(),
      category: newCategory,
      farmId: farm.id,
      farmName: farm.name,
      serialNumber: newSerialNumber.trim() || `SN-${Date.now().toString().slice(-6)}`,
      condition: newCondition,
      assignedCustodian: newCustodian.trim() || "Farm Manager",
      purchaseValueRwf: parseInt(newValueRwf) || 50000,
      lastInspectedDate: today,
      qrLinkedAt: today,
      notes: newNotes.trim() || undefined,
    });

    setNewName("");
    setNewSerialNumber("");
    setNewNotes("");
    setActiveTab("inventory");
    showFeedback(
      language === "rw"
        ? `Igikoresho gishya cyahujwe na ${farm.name} hakoreshejwe QR (${newTagCode.toUpperCase()})!`
        : `Equipment linked to ${farm.name} via unique QR code (${newTagCode.toUpperCase()})!`
    );
  };

  const handleDecodedQrText = (rawText: string) => {
    stopCamera();
    setScannedRawTag(rawText);

    // Parse URL or raw tag
    let matched: FarmAsset | undefined;
    try {
      if (rawText.startsWith("http")) {
        const url = new URL(rawText);
        const tagParam = url.searchParams.get("tag");
        const assetIdParam = url.searchParams.get("assetId");
        matched = assets.find(
          (a) =>
            (tagParam && a.assetTagCode.toLowerCase() === tagParam.toLowerCase()) ||
            (assetIdParam && a.id === assetIdParam)
        );
      }
    } catch {
      // Not a URL
    }

    if (!matched) {
      matched = assets.find(
        (a) =>
          rawText.toLowerCase().includes(a.assetTagCode.toLowerCase()) ||
          a.id.toLowerCase() === rawText.trim().toLowerCase()
      );
    }

    if (matched) {
      setScannedAsset(matched);
    } else {
      setScannedAsset(null);
    }
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setScannedAsset(null);
    setScannedRawTag(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const tick = () => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
              handleDecodedQrText(code.data);
              return;
            }
          }
        }
        scanFrameRef.current = requestAnimationFrame(tick);
      };
      scanFrameRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError(
        language === "rw"
          ? "Camera ntibonetse. Koresha 'Pakira Ifoto ya QR' cyangwa 'Gerageza Gusikana' hasi."
          : "Camera unavailable in this browser context. Upload a QR image or use Quick Tool Scan below."
      );
      setIsCameraActive(false);
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDecodedQrText(code.data);
        } else {
          setCameraError(
            language === "rw"
              ? "Nta kimenyetso cya QR cyagaragaye muri iyi foto."
              : "No valid QR code detected in the uploaded image."
          );
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadSticker = (asset: FarmAsset) => {
    const dataUrl = qrDataUrls[asset.id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${asset.assetTagCode}-${asset.farmName.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const gpsCoords = resolveFarmCoords(farm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-4xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 text-white p-5 sm:p-6 border-b border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Wrench className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "GUCUNGA IBIKORESHO BY'UMURIMA KURI QR CODE"
                  : "PLOT PHYSICAL ASSET & EQUIPMENT QR MANAGER"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex flex-wrap items-center gap-2">
              <span>{farm.name}</span>
              <span className="text-xs font-semibold text-emerald-200">
                ({farm.district}, {farm.sector} · {farm.sizeHa} Ha)
              </span>
            </h2>
            <p className="text-xs text-stone-300">
              GPS: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)} ·{" "}
              {language === "rw"
                ? "Buri gikoresho cyose gifite ikimenyetso cya QR kigihuza n'uyu murima"
                : "Associate physical farm tools and machinery with this specific plot via unique QR tags"}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {allFarms.length > 1 && (
              <select
                value={farm.id}
                onChange={(e) => {
                  const target = allFarms.find((f) => f.id === e.target.value);
                  if (target) {
                    onSelectFarm(target);
                    setFocusedStickerAsset(null);
                  }
                }}
                className="bg-emerald-950 text-white text-xs font-bold px-3 py-2 rounded-xl border border-emerald-700 outline-hidden"
              >
                {allFarms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.district})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedbackBanner && (
          <div className="bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
            <button onClick={() => setFeedbackBanner(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Plot Asset Summary Bar & Mode Navigation */}
        <div className="px-5 sm:px-6 pt-4 pb-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-stone-500 dark:text-stone-400 block">
                {language === "rw" ? "Ibikoresho by'uyu Murima" : "Plot Assigned Assets"}
              </span>
              <strong className="text-base font-black text-stone-900 dark:text-white tabular-nums">
                {plotAssets.length}{" "}
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  ({language === "rw" ? "Byose bifite QR" : "QR Tagged"})
                </span>
              </strong>
            </div>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">
              |
            </span>
            <div>
              <span className="text-stone-500 dark:text-stone-400 block">
                {language === "rw" ? "Agaciro k'Ibikoresho" : "Plot Equipment Value"}
              </span>
              <strong className="text-base font-black text-stone-900 dark:text-white tabular-nums">
                {totalPlotAssetValue.toLocaleString()} RWF
              </strong>
            </div>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">
              |
            </span>
            <div>
              <span className="text-stone-500 dark:text-stone-400 block">
                {language === "rw" ? " Bikeneye Gusuzumwa" : "Maintenance Alerts"}
              </span>
              <strong
                className={`text-base font-black tabular-nums ${
                  plotAssets.some((a) => a.condition === "maintenance_due")
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {plotAssets.filter((a) => a.condition === "maintenance_due").length}
              </strong>
            </div>
          </div>

          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1 p-1 bg-stone-200/80 dark:bg-stone-900 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "inventory"
                  ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {language === "rw"
                  ? `Ibikoresho (${plotAssets.length})`
                  : `Plot Assets (${plotAssets.length})`}
              </span>
            </button>

            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setActiveTab("add_qr")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === "add_qr"
                    ? "bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === "rw" ? "Huza Igikoresho na QR" : "Link Tool via QR"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("scan_qr")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "scan_qr"
                  ? "bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-300 shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === "rw" ? "Sikana QR y'Igikoresho" : "Scan Tool QR"}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Focused Printable QR Sticker Drawer */}
          {focusedStickerAsset && (
            <div className="p-5 rounded-2xl bg-emerald-950 text-white border border-emerald-700 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-3 rounded-xl shadow-md shrink-0 text-center">
                  {qrDataUrls[focusedStickerAsset.id] && (
                    <img
                      src={qrDataUrls[focusedStickerAsset.id]}
                      alt={focusedStickerAsset.assetTagCode}
                      className="w-32 h-32 mx-auto"
                    />
                  )}
                  <span className="block text-[10px] font-mono font-black text-stone-900 mt-1">
                    {focusedStickerAsset.assetTagCode}
                  </span>
                </div>

                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    {language === "rw"
                      ? "IKarita ya QR yo Komeka ku Gikoresho (Weatherproof Asset Tag)"
                      : "Weatherproof Physical Equipment QR Tag"}
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {focusedStickerAsset.name}
                  </h4>
                  <p className="text-xs text-emerald-200">
                    {language === "rw" ? "Umurima:" : "Assigned Plot:"}{" "}
                    <strong>{focusedStickerAsset.farmName}</strong> · SN:{" "}
                    <span className="font-mono">{focusedStickerAsset.serialNumber}</span> ·{" "}
                    {language === "rw" ? "Ushinzwe:" : "Custodian:"}{" "}
                    <strong>{focusedStickerAsset.assignedCustodian}</strong>
                  </p>
                  <p className="text-[11px] text-stone-300 font-mono break-all">
                    {buildAssetQrPayloadUrl(focusedStickerAsset)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadSticker(focusedStickerAsset)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === "rw" ? "Manura PNG" : "Download QR"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === "rw" ? "Sohora (Print)" : "Print Sticker"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFocusedStickerAsset(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white"
                >
                  {language === "rw" ? "Funga" : "Close"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: PLOT ASSET INVENTORY */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              {plotAssets.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 space-y-3">
                  <Wrench className="w-10 h-10 text-stone-400 mx-auto" />
                  <h4 className="text-base font-bold text-stone-900 dark:text-white">
                    {language === "rw"
                      ? `Nta gikoresho kirahuzwa na ${farm.name}`
                      : `No physical equipment linked to ${farm.name} yet`}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    {language === "rw"
                      ? "Kanda 'Huza Igikoresho na QR' kugira ngo wandike pompayi, amasuka, imashini y'amazi cyangwa ibipimo by'ubutaka kuri uyu murima."
                      : "Click 'Link Tool via QR' to associate sprayers, irrigation pumps, soil sensors, or crates with this plot via unique QR codes."}
                  </p>
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("add_qr")}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4 text-amber-300" />
                      <span>
                        {language === "rw" ? "Huza Igikoresho Gishya na QR" : "Associate First Asset via QR"}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plotAssets.map((asset) => {
                    const condInfo = getConditionInfo(asset.condition);
                    return (
                      <div
                        key={asset.id}
                        className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-600/60 transition-all flex flex-col justify-between gap-4 shadow-2xs"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Scannable Asset QR Thumbnail */}
                          <button
                            type="button"
                            onClick={() => setFocusedStickerAsset(asset)}
                            className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0 text-center group hover:border-emerald-600 transition-colors"
                            title={
                              language === "rw"
                                ? "Kanda urebe cyangwa usohora ikarita ya QR"
                                : "Click to enlarge or print QR tag"
                            }
                          >
                            {qrDataUrls[asset.id] ? (
                              <img
                                src={qrDataUrls[asset.id]}
                                alt={asset.assetTagCode}
                                className="w-16 h-16 object-contain"
                              />
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-emerald-700" />
                              </div>
                            )}
                            <span className="block text-[9px] font-mono font-bold text-emerald-800 dark:text-emerald-300 mt-1 group-hover:underline">
                              {asset.assetTagCode}
                            </span>
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                              <span className="truncate font-semibold">
                                {getCategoryLabel(asset.category)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(asset.assetTagCode);
                                  setCopiedTag(asset.id);
                                  setTimeout(() => setCopiedTag(null), 1800);
                                }}
                                className="inline-flex items-center space-x-1 font-mono text-[10px] text-stone-500 hover:text-stone-900 dark:hover:text-white shrink-0"
                                title="Copy QR Tag Code"
                              >
                                <span>{asset.assetTagCode}</span>
                                {copiedTag === asset.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <h4 className="text-sm font-black text-stone-900 dark:text-white leading-snug">
                              {asset.name}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
                              <span className={`font-bold ${condInfo.textClass}`}>
                                {condInfo.label}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <User className="w-3 h-3 text-stone-400" />
                                {asset.assignedCustodian}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-bold text-stone-900 dark:text-white tabular-nums">
                                {asset.purchaseValueRwf.toLocaleString()} RWF
                              </span>
                            </div>

                            {asset.notes && (
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 pt-0.5">
                                {asset.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Asset Actions Footer */}
                        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFocusedStickerAsset(asset)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors"
                            >
                              <QrCode className="w-3.5 h-3.5 text-amber-300" />
                              <span>{language === "rw" ? "QR Tag" : "QR Label"}</span>
                            </button>

                            {!isViewOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextOrder: Record<FarmAssetCondition, FarmAssetCondition> = {
                                    excellent: "good",
                                    good: "maintenance_due",
                                    maintenance_due: "excellent",
                                  };
                                  onUpdateAssetCondition(asset.id, nextOrder[asset.condition]);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-[11px] transition-colors"
                              >
                                {language === "rw" ? "Hindura Imimerere" : "Cycle Status"}
                              </button>
                            )}
                          </div>

                          {!isViewOnly && (
                            <div className="flex items-center gap-1.5">
                              {allFarms.length > 1 && (
                                <select
                                  aria-label="Reassign equipment to another parcel"
                                  value={asset.farmId}
                                  onChange={(e) => {
                                    const targetFarm = allFarms.find(
                                      (f) => f.id === e.target.value
                                    );
                                    if (targetFarm && targetFarm.id !== asset.farmId) {
                                      onReassignAsset(asset.id, targetFarm.id, targetFarm.name);
                                      showFeedback(
                                        language === "rw"
                                          ? `${asset.assetTagCode} yimuriwe kuri ${targetFarm.name}!`
                                          : `${asset.assetTagCode} reassigned via QR to ${targetFarm.name}!`
                                      );
                                    }
                                  }}
                                  className="px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-[11px] font-semibold outline-hidden"
                                >
                                  {allFarms.map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.id === asset.farmId
                                        ? `📍 ${f.name}`
                                        : `↪ ${language === "rw" ? "Imura:" : "Move to:"} ${f.name}`}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <button
                                type="button"
                                onClick={() => onDeleteAsset(asset.id)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title={language === "rw" ? "Kuraho igikoresho" : "Remove equipment"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Transfer Equipment from Other Parcels via QR */}
              {!isViewOnly && otherPlotAssets.length > 0 && (
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center space-x-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {language === "rw"
                          ? `Ibikoresho biri ku Yindi Mirima (${otherPlotAssets.length}) — Kanda ubizane kuri ${farm.name}`
                          : `Equipment on Other Parcels (${otherPlotAssets.length}) — 1-Click QR Transfer to ${farm.name}`}
                      </span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {otherPlotAssets.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                            {item.assetTagCode} · {item.farmName}
                          </span>
                          <p className="font-bold text-stone-900 dark:text-white truncate">
                            {item.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onReassignAsset(item.id, farm.id, farm.name);
                            showFeedback(
                              language === "rw"
                                ? `Igikoresho ${item.assetTagCode} cyahujwe na ${farm.name}!`
                                : `Equipment ${item.assetTagCode} associated with ${farm.name}!`
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 transition-colors"
                        >
                          {language === "rw" ? "+ Huza n'uyu Murima" : "+ Assign to Plot"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSOCIATE NEW EQUIPMENT WITH PARCEL VIA QR */}
          {activeTab === "add_qr" && (
            <form onSubmit={handleCreateAsset} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4 text-sm">
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>
                      {language === "rw"
                        ? `Guhuza Igikoresho na ${farm.name} (${farm.district}):`
                        : `Associating Physical Equipment with ${farm.name} (${farm.district}):`}
                    </strong>{" "}
                    {language === "rw"
                      ? "Ikimenyetso cya QR gihita gikorwa kandi kikabika izina ry'umurima, nimero y'igikoresho na GPS."
                      : "A unique QR code is generated and cryptographically linked to this farm parcel's ID and GPS coordinates."}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw"
                      ? "Izina ry'Igikoresho cyangwa Imashini *"
                      : "Equipment / Tool Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={
                      language === "rw"
                        ? "urugero: Pompayi ya Moteri 20L / Solar Drip Pump"
                        : "e.g., Motorized Knapsack Sprayer 20L / Soil pH Meter"
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-sm outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Icyiciro cy'Igikoresho" : "Equipment Category"}
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as FarmAssetCategory)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs font-semibold outline-hidden"
                    >
                      <option value="sprayer">
                        {language === "rw" ? "Pompayi yo Gutera Umuti" : "Sprayer & Crop Protection"}
                      </option>
                      <option value="irrigation_pump">
                        {language === "rw" ? "Imashini & Imiyoboro yo Kuhira" : "Irrigation Pump & Drip Kit"}
                      </option>
                      <option value="tillage_tool">
                        {language === "rw" ? "Amasuka & Ibikoresho by'Amaterasi" : "Tillage & Terrace Tools"}
                      </option>
                      <option value="soil_sensor">
                        {language === "rw" ? "Igipimo cya pH & Ubuhehere" : "Soil pH & Moisture Sensor"}
                      </option>
                      <option value="harvest_crate">
                        {language === "rw" ? "Amasanduku n'Ibikoresho by'Isarura" : "Harvest Crates & Post-Harvest"}
                      </option>
                      <option value="tractor_implement">
                        {language === "rw" ? "Imashini z'Ubuhinzi (Tractor)" : "Mechanized Implement"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Kode Yihariye ya QR Tag *" : "Unique Asset QR Code ID *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newTagCode}
                      onChange={(e) => setNewTagCode(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-xs outline-hidden focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Nimero ya Serie (Serial #)" : "Serial / Model Number"}
                    </label>
                    <input
                      type="text"
                      value={newSerialNumber}
                      onChange={(e) => setNewSerialNumber(e.target.value)}
                      placeholder="Jacto-PJH-092"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Ushinzwe Igikoresho" : "Assigned Custodian"}
                    </label>
                    <input
                      type="text"
                      value={newCustodian}
                      onChange={(e) => setNewCustodian(e.target.value)}
                      placeholder="Faustin Mugabo"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Agaciro (RWF)" : "Value (RWF)"}
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      value={newValueRwf}
                      onChange={(e) => setNewValueRwf(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs font-bold outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Imimerere y'Igikoresho" : "Condition Status"}
                    </label>
                    <select
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value as FarmAssetCondition)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs font-semibold outline-hidden"
                    >
                      <option value="excellent">
                        {language === "rw" ? "Gishya / Gikora Neza Cyane" : "Excellent Condition"}
                      </option>
                      <option value="good">
                        {language === "rw" ? "Gikora Neza" : "Good Working Order"}
                      </option>
                      <option value="maintenance_due">
                        {language === "rw" ? "Gikeneye Gusuzumwa" : "Maintenance Due"}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      {language === "rw" ? "Ibisobanuro (Notes)" : "Usage Notes"}
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder={
                        language === "rw"
                          ? "urugero: Gutera umuti w'urume mu birayi"
                          : "e.g., Dedicated to Kinigi potato ridge spraying"
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("inventory")}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold"
                  >
                    {language === "rw" ? "Subira Inyuma" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-amber-300" />
                    <span>
                      {language === "rw"
                        ? `Bika & Huza Igikoresho na ${farm.name}`
                        : `Bind Equipment QR to ${farm.name}`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live QR Sticker Preview Card */}
              <div className="p-5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {language === "rw" ? "Ikigereranyo cya QR Sticker" : "Live Plot QR Tag Preview"}
                </span>

                <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-stone-200">
                  {previewQrUrl ? (
                    <img src={previewQrUrl} alt="Preview QR" className="w-36 h-36 mx-auto" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-emerald-800" />
                    </div>
                  )}
                  <span className="block font-mono text-xs font-black text-stone-900 mt-1.5">
                    {newTagCode || "TRM-EQP-001"}
                  </span>
                </div>

                <div className="space-y-0.5 text-xs">
                  <p className="font-black text-stone-900 dark:text-white">
                    {newName || (language === "rw" ? "Izina ry'Igikoresho" : "New Plot Equipment")}
                  </p>
                  <p className="text-stone-500 dark:text-stone-400">
                    {farm.name} ({farm.district})
                  </p>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: SCAN EQUIPMENT QR TO VERIFY OR BIND TO THIS PLOT */}
          {activeTab === "scan_qr" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Camera & Image Upload Box */}
                <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-stone-900 dark:text-white flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>
                        {language === "rw"
                          ? "Sikana QR iri ku Gikoresho"
                          : "Scan Physical Equipment QR Code"}
                      </span>
                    </h4>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {language === "rw"
                      ? `Tunga camera ya telefone ku kimenyetso cya QR cyometse ku gikoresho kugira ngo ugenzure umurima kibaruyeho cyangwa ugihuze na ${farm.name}.`
                      : `Point your phone camera at any equipment QR sticker to verify its assigned plot or transfer it to ${farm.name}.`}
                  </p>

                  {isCameraActive ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-4 border-2 border-amber-400/80 rounded-xl pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="w-full py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                      >
                        {language === "rw" ? "Hagarika Camera" : "Stop Camera"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        <Camera className="w-4 h-4 text-amber-300" />
                        <span>{language === "rw" ? "Fungura Camera" : "Start Camera Scan"}</span>
                      </button>

                      <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold cursor-pointer hover:bg-stone-100">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>{language === "rw" ? "Pakira Ifoto ya QR" : "Upload QR Image"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {cameraError && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                      {cameraError}
                    </p>
                  )}

                  {/* Quick Simulated Scan for All Registered Farm Tools */}
                  <div className="pt-3 border-t border-stone-200 dark:border-stone-700 space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">
                      {language === "rw"
                        ? "Gerageza Gusikana Igikoresho Cyanditswe (1-Click Scan Simulation):"
                        : "Simulate Instant Camera Scan of Registered Equipment:"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assets.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleDecodedQrText(buildAssetQrPayloadUrl(a))}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                            scannedAsset?.id === a.id
                              ? "bg-emerald-900 text-white border-emerald-700"
                              : "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-emerald-600"
                          }`}
                        >
                          {a.assetTagCode} ({a.farmName})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scanned Equipment Verification & Plot Binding Result */}
                <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between">
                  {scannedAsset ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                        <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">
                          {scannedAsset.assetTagCode}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            scannedAsset.farmId === farm.id
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {scannedAsset.farmId === farm.id
                            ? language === "rw"
                              ? `✓ Kiri kuri ${farm.name}`
                              : `✓ Assigned to ${farm.name}`
                            : language === "rw"
                            ? `Kibaruye kuri ${scannedAsset.farmName}`
                            : `Currently on ${scannedAsset.farmName}`}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-base font-black text-stone-900 dark:text-white">
                          {scannedAsset.name}
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-300">
                          {getCategoryLabel(scannedAsset.category)} · SN:{" "}
                          <span className="font-mono">{scannedAsset.serialNumber}</span>
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-300">
                          {language === "rw" ? "Ushinzwe:" : "Custodian:"}{" "}
                          <strong>{scannedAsset.assignedCustodian}</strong> ·{" "}
                          {language === "rw" ? "Agaciro:" : "Value:"}{" "}
                          <strong>{scannedAsset.purchaseValueRwf.toLocaleString()} RWF</strong>
                        </p>
                        {scannedAsset.notes && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 pt-1">
                            {scannedAsset.notes}
                          </p>
                        )}
                      </div>

                      {!isViewOnly && scannedAsset.farmId !== farm.id && (
                        <button
                          type="button"
                          onClick={() => {
                            onReassignAsset(scannedAsset.id, farm.id, farm.name);
                            setScannedAsset({
                              ...scannedAsset,
                              farmId: farm.id,
                              farmName: farm.name,
                            });
                            showFeedback(
                              language === "rw"
                                ? `${scannedAsset.assetTagCode} yahujwe na ${farm.name}!`
                                : `${scannedAsset.assetTagCode} bound to ${farm.name} via QR scan!`
                            );
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-2"
                        >
                          <ArrowRightLeft className="w-4 h-4 text-amber-300" />
                          <span>
                            {language === "rw"
                              ? `Huza iki Gikoresho na ${farm.name}`
                              : `Bind Scanned Equipment to ${farm.name}`}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : scannedRawTag ? (
                    <div className="space-y-3 text-center my-auto py-6">
                      <Tag className="w-8 h-8 text-amber-500 mx-auto" />
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                        {language === "rw"
                          ? "Kode ya QR Nshya Yabonetse"
                          : "Unregistered QR Sticker Detected"}
                      </h4>
                      <p className="text-xs font-mono text-stone-600 dark:text-stone-400 break-all">
                        {scannedRawTag}
                      </p>
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewTagCode(scannedRawTag.slice(0, 24).toUpperCase());
                            setActiveTab("add_qr");
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold"
                        >
                          {language === "rw"
                            ? `Andika iki Gikoresho kuri ${farm.name}`
                            : `Register QR Tag to ${farm.name}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center my-auto py-8 space-y-2 text-stone-400">
                      <QrCode className="w-10 h-10 mx-auto opacity-60" />
                      <p className="text-xs">
                        {language === "rw"
                          ? "Sikana QR cyangwa ukande ku gikoresho kiri ibumoso urebe amakuru yacyo."
                          : "Scan an equipment QR code or click any registered tag on the left to inspect or reassign it."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
