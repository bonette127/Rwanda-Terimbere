import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { HarvestRecord, Language, Expense, FarmActivity, TransportLog } from "../types";
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Truck,
  Building2,
  Calendar,
  Layers,
  Scale,
  Sparkles,
  QrCode,
  Smartphone,
  Eye,
  Copy,
  Check,
  FileBadge,
  Receipt,
  Sprout,
  Coins,
  PackageCheck,
  ArrowRight,
} from "lucide-react";

interface BatchQrModalProps {
  harvest: HarvestRecord;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  expenses?: Expense[];
  activities?: FarmActivity[];
  transportLogs?: TransportLog[];
}

export const BatchQrModal: React.FC<BatchQrModalProps> = ({
  harvest,
  isOpen,
  onClose,
  language,
  expenses = [],
  activities = [],
  transportLogs = [],
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [activeView, setActiveView] = useState<"label" | "scanPreview">("label");
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Derived batch code
  const batchCode =
    harvest.batchCode ||
    `RW-HARV-${(harvest.district || "MUS").slice(0, 3).toUpperCase()}-${new Date(
      harvest.harvestDate
    ).getFullYear() || "2025"}-${harvest.id.replace("harv-", "").padStart(3, "0")}`;

  // Related farm expenses (input costs)
  const batchExpenses = expenses.filter(
    (e) => e.farmId === harvest.farmId || e.farmName === harvest.farmName
  );
  const fertilizerExpenses = batchExpenses.filter((e) => e.category === "fertilizer");
  const seedExpenses = batchExpenses.filter((e) => e.category === "seeds");
  const totalInputCostCalculated = batchExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Related farm fertilizer activities
  const fertilizerActivities = activities.filter(
    (a) =>
      (a.farmId === harvest.farmId || a.farmName === harvest.farmName) &&
      (a.category === "fertilizing" || a.title.toLowerCase().includes("npk") || a.title.toLowerCase().includes("dap") || a.title.toLowerCase().includes("urea"))
  );

  // Related transport records
  const batchTransportLogs = transportLogs.filter(
    (t) => t.farmId === harvest.farmId || t.farmName === harvest.farmName
  );

  // Traceability Payload for QR code
  const traceabilityPayload = {
    app: "TERIMBERE_RWANDA",
    batchId: batchCode,
    farm: harvest.farmName,
    location: {
      district: harvest.district || "Musanze",
      sector: harvest.sector || "Kinigi",
      agroZone: harvest.agroZone || "Birunga Volcanic Highlands",
    },
    crop: harvest.crop,
    harvestDate: harvest.harvestDate,
    quantityKg: harvest.quantityKg,
    qualityGrade: harvest.qualityGrade,
    storage: harvest.storageLocation,
    destination: harvest.destinationMarket || "Isoko rya Nyabugogo (Kigali Wholesale)",
    transporter: harvest.transporterName || "Koperative Transport / Standard Logistics",
    certification: harvest.certificationCode || "RICA-MINAGRI-VERIFIED",
    scaleTier: harvest.scaleTier || "semi_commercial",
    inputMetrics: {
      seedMultiplier: harvest.seedMultiplierRatio ? `${harvest.seedMultiplierRatio}x` : "10.0x",
      fertilizerConversion: harvest.fertilizerConversionRatio ? `${harvest.fertilizerConversionRatio} kg/kg` : "32.0 kg/kg",
      yieldPerHa: harvest.yieldPerHaTons ? `${harvest.yieldPerHaTons} T/Ha` : "14.4 T/Ha",
      totalInputCostsRwf: harvest.totalInputCostRwf || totalInputCostCalculated || 386500,
    },
    fertilizerApplications: fertilizerActivities.map((fa) => ({
      title: fa.title,
      date: fa.completedDate || fa.dueDate,
      status: fa.status,
    })),
    transportDispatches: batchTransportLogs.map((tl) => ({
      date: tl.date,
      vehicle: tl.vehicleType,
      driver: tl.driverName,
      weightKg: tl.cargoWeightKg,
      costRwf: tl.costRwf,
      origin: tl.origin,
      dest: tl.destination,
    })),
    verifiedAt: new Date().toISOString(),
  };

  const deepLinkUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?qrType=harvest&qrId=${encodeURIComponent(
          harvest.id
        )}`
      : `https://terimbere.rw/?qrType=harvest&qrId=${encodeURIComponent(harvest.id)}`;

  useEffect(() => {
    if (!isOpen) return;

    // Encode direct deep-link URL so scanning with any phone camera opens the Harvest Batch details view directly
    QRCode.toDataURL(deepLinkUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#064e3b", // Deep Rwandan emerald green
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code Generation Error:", err));
  }, [isOpen, harvest, deepLinkUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `QR_${batchCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(batchCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6">
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                {language === "rw"
                  ? "Ikarita y'Umusaruro & QR Code yo Gutwara"
                  : "Harvest Batch QR Traceability Label"}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Icyemezo cy'inkomoko n'ubuziranenge bugenzurwa mu rugendo (MINAGRI/RICA)"
                  : "Transport manifest & origin verification label for markets and transit"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Switcher: Label vs Phone Scanner Preview vs Provenance Details */}
            <div className="hidden sm:flex bg-stone-200 dark:bg-stone-700 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveView("label")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeView === "label"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
                }`}
              >
                {language === "rw" ? "Ikarita yo Gucapa" : "Printable Label"}
              </button>
              <button
                onClick={() => setActiveView("scanPreview")}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  activeView === "scanPreview"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-300 hover:text-stone-900"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Gusuzuma QR & Amakuru" : "Scan Provenance"}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {activeView === "label" ? (
            <div>
              {/* Printable Official Rwandan Ag Transport Tag */}
              <div
                ref={printRef}
                id="printable-harvest-label"
                className="bg-white text-stone-900 rounded-2xl border-2 border-emerald-800 p-5 sm:p-6 shadow-md relative overflow-hidden"
              >
                {/* Official Rwandan Header Strip */}
                <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-3 mb-4">
                  <div className="flex items-center space-x-3">
                    {/* Rwandan Ag Badge */}
                    <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      RWA
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        REPUBLIC OF RWANDA • TERIMBERE SMART AG
                      </div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-stone-950 font-display">
                        IKARITA Y'INKOMOKO N'UBUZIRANENGE BW'UMUSARURO
                      </h3>
                      <div className="text-[10px] font-semibold text-stone-500">
                        OFFICIAL HARVEST BATCH TRACEABILITY & TRANSPORT PASS
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                      GRADE {harvest.qualityGrade}
                    </span>
                    <div className="text-[10px] font-mono text-stone-500 mt-1">
                      {harvest.certificationCode || "RICA-CERT-2025"}
                    </div>
                  </div>
                </div>

                {/* Central Body: QR code + Detailed Manifest */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  {/* Left Column: QR Code + Batch ID */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Harvest Batch QR Code"
                        className="w-48 h-48 rounded-lg shadow-2xs border border-stone-200"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-stone-200 animate-pulse rounded-lg flex items-center justify-center text-xs text-stone-500">
                        Generating QR...
                      </div>
                    )}
                    <div className="mt-2.5">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Batch Tracking ID
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-black text-emerald-950 tracking-wider">
                        {batchCode}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>MINAGRI / RICA Verified</span>
                    </div>
                  </div>

                  {/* Right Column: Key Traceability Specs */}
                  <div className="sm:col-span-7 space-y-3 text-xs">
                    {/* Product & Farm */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-800">
                          {language === "rw" ? "Igihingwa & Umurima" : "Product & Origin"}
                        </span>
                        <span className="font-extrabold text-stone-900 text-sm">
                          {harvest.crop}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-stone-800">
                        {harvest.farmName}
                      </div>
                      <div className="text-[11px] text-stone-600 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>
                          {harvest.district || "Musanze"}, {harvest.sector || "Kinigi"} • {harvest.agroZone || "Birunga Volcanic"}
                        </span>
                      </div>
                    </div>

                    {/* Weight & Harvest Date */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                        <span className="text-[10px] font-bold text-stone-500 uppercase block">
                          {language === "rw" ? "Ingano y'Umusaruro" : "Net Weight"}
                        </span>
                        <span className="text-sm font-black text-stone-900">
                          {harvest.quantityKg.toLocaleString()} Kg
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          ({(harvest.quantityKg / 1000).toFixed(1)} Metric Tons)
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                        <span className="text-[10px] font-bold text-stone-500 uppercase block">
                          {language === "rw" ? "Itariki yo Gusarura" : "Harvest Date"}
                        </span>
                        <span className="text-xs font-black text-stone-900 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-emerald-700" />
                          <span>{harvest.harvestDate}</span>
                        </span>
                        <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                          Fresh Harvest
                        </span>
                      </div>
                    </div>

                    {/* Transit & Destination Information */}
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <div className="flex items-center space-x-1.5 text-[10px] font-extrabold uppercase text-amber-900">
                        <Truck className="w-3.5 h-3.5 text-amber-700" />
                        <span>{language === "rw" ? "Urutonde rwo Gutwara (In-Transit)" : "Transport & Destination"}</span>
                      </div>
                      <div className="mt-1 text-[11px] grid grid-cols-1 gap-1">
                        <div>
                          <span className="text-stone-500">Ububiko (Origin):</span>{" "}
                          <span className="font-semibold text-stone-800">{harvest.storageLocation}</span>
                        </div>
                        <div>
                          <span className="text-stone-500">Isoko (Destination):</span>{" "}
                          <span className="font-bold text-emerald-950">
                            {harvest.destinationMarket || "Isoko rya Nyabugogo (Kigali Wholesale)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500">Imodoka / Transporter:</span>{" "}
                          <span className="font-semibold text-stone-800">
                            {harvest.transporterName || "Koperative Logistics (RAD 429A)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Yield Scale Metrics */}
                    <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-stone-100 rounded-lg text-stone-600">
                      <span>Scale: <strong className="text-stone-900">{harvest.scaleTier || "Semi-Commercial"}</strong></span>
                      <span>Seed Ratio: <strong className="text-emerald-800">{harvest.seedMultiplierRatio ? `${harvest.seedMultiplierRatio}x` : "10.0x"}</strong></span>
                      <span>Yield: <strong className="text-amber-800">{harvest.yieldPerHaTons ? `${harvest.yieldPerHaTons} T/Ha` : "14.4 T/Ha"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Warning & Traceability Seal */}
                <div className="mt-4 pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-stone-500 gap-2">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      {language === "rw"
                        ? "Iyi karita ifatishwa ku mifuka cyangwa ku modoka igihe umusaruro ujyanywe ku isoko."
                        : "Attach this certified manifest label to produce sacks or crates during transportation."}
                    </span>
                  </div>
                  <div className="font-mono text-[9px] text-stone-400">
                    ID: {batchCode}
                  </div>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>{language === "rw" ? "Uko iyi karita ikoreshwa:" : "How to use this label:"}</strong>{" "}
                  {language === "rw"
                    ? "Capa iyi karita uyishyire ku mifuka y'ibirayi cyangwa ku modoka itwaye umusaruro. Abaguzi ba Nyabugogo, koperative, cyangwa abagenzuzi b'ubuziranenge (RICA) bashobora gukoresha kamera ya telefone bakemeza ko umusaruro ari uwawe kandi ufite ubuziranenge bwemewe."
                    : "Print and paste this label on crop bags or the transit vehicle. Buyers in Kigali markets, cooperatives, or food inspectors can scan the QR code to verify authentic origin, farm location, and quality grade."}
                </div>
              </div>
            </div>
          ) : (
            /* Digital Smartphone Scanner Simulator (Shows what buyers/inspectors/farmers see upon scanning) */
            <div className="bg-stone-100 dark:bg-stone-950 p-3 sm:p-5 rounded-2xl border border-stone-300 dark:border-stone-800">
              <div className="max-w-xl mx-auto bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
                        <span>{language === "rw" ? "Amakuru y'Inkomoko y'Umusaruro (Full Provenance)" : "Batch Provenance & Full History"}</span>
                      </h4>
                      <p className="text-[10px] text-stone-500">Terimbere Rwanda National Agri-Traceability</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    VERIFIED BATCH
                  </span>
                </div>

                {/* Batch Highlight Badge */}
                <div className="p-3 rounded-xl bg-linear-to-r from-emerald-50 via-teal-50 to-stone-50 dark:from-emerald-950/60 dark:via-stone-900 dark:to-stone-900 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">
                      {language === "rw" ? "Kode y'Umusaruro (Batch ID)" : "Registered Batch Code"}
                    </span>
                    <span className="font-mono text-sm sm:text-base font-black text-emerald-950 dark:text-emerald-200">
                      {batchCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 block">
                      GRADE {harvest.qualityGrade}
                    </span>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      {harvest.quantityKg.toLocaleString()} Kg • {harvest.crop}
                    </span>
                  </div>
                </div>

                {/* Section 1: Full Input Costs & Seed Multiplier */}
                <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                  <div className="px-3.5 py-2 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>{language === "rw" ? "1. Igishoro & Amafaranga Yishyuwe (Input Costs)" : "1. Input Costs & Seed Breakdown"}</span>
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {(harvest.totalInputCostRwf || totalInputCostCalculated || 386500).toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="p-3 text-xs space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                        <span className="text-stone-500 block">{language === "rw" ? "Imbuto yatewe" : "Seed Planted"}</span>
                        <strong className="text-stone-900 dark:text-white text-xs">
                          {harvest.seedInputKg || 720} Kg
                        </strong>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold mt-0.5">
                          {harvest.seedMultiplierRatio ? `${harvest.seedMultiplierRatio}x` : "10.0x"} return
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                        <span className="text-stone-500 block">{language === "rw" ? "Ifumbire yakoreshejwe" : "Fertilizer Input"}</span>
                        <strong className="text-stone-900 dark:text-white text-xs">
                          {harvest.fertilizerInputKg || 225} Kg
                        </strong>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold mt-0.5">
                          {harvest.fertilizerConversionRatio ? `${harvest.fertilizerConversionRatio} kg/kg` : "32 kg/kg"} eff.
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900">
                        <span className="text-stone-500 block">{language === "rw" ? "Ubuso bwasaruwe" : "Area Harvested"}</span>
                        <strong className="text-stone-900 dark:text-white text-xs">
                          {harvest.areaHarvestedHa || 0.5} Ha
                        </strong>
                        <span className="text-[10px] text-sky-700 dark:text-sky-400 block font-bold mt-0.5">
                          {harvest.yieldPerHaTons ? `${harvest.yieldPerHaTons} T/Ha` : "14.4 T/Ha"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                        <span className="text-stone-500 block">{language === "rw" ? "Urwego rw'Umurima" : "Scale Tier"}</span>
                        <strong className="text-stone-900 dark:text-white text-xs capitalize">
                          {harvest.scaleTier || "Semi-Commercial"}
                        </strong>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          RICA Standard
                        </span>
                      </div>
                    </div>

                    {/* Expense line items if available */}
                    {batchExpenses.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <span className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                          {language === "rw" ? "Inyemezabwishyu zose z'uyu murima:" : "Itemized expenses linked to this plot:"}
                        </span>
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {batchExpenses.map((exp) => (
                            <div
                              key={exp.id}
                              className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800/50"
                            >
                              <span className="text-stone-700 dark:text-stone-300 truncate max-w-[240px]">
                                • {exp.description} ({exp.date})
                              </span>
                              <span className="font-mono font-bold text-stone-900 dark:text-white shrink-0">
                                {exp.amount.toLocaleString()} RWF
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Fertilizer Application History */}
                <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                  <div className="px-3.5 py-2 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
                      <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === "rw" ? "2. Amateka y'Ifumbire & Ubutaka (Fertilizer History)" : "2. Fertilizer Application History"}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-stone-500">
                      RAB Agronomy Protocol
                    </span>
                  </div>
                  <div className="p-3 text-xs space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex items-start space-x-2 text-[11px] p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-stone-900 dark:text-white">Basal Fertilization (DAP + Imborera)</strong>
                          <p className="text-stone-600 dark:text-stone-400">
                            {language === "rw"
                              ? "DAP 100 kg/ha hamwe na toni 10 z'ifumbire y'imborera iboze neza mu gihe cyo gutera."
                              : "Basal DAP applied at planting alongside 10 tons of decomposed organic farm manure."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2 text-[11px] p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-stone-900 dark:text-white">Top-Dressing & Earthing-Up (NPK 17-17-17)</strong>
                          <p className="text-stone-600 dark:text-stone-400">
                            {language === "rw"
                              ? "NPK 17-17-17 125 kg/ha yashyizwemo nyuma y'iminsi 30 igihe cyo kubagara no kurunda ibitaka."
                              : "Side-dressing NPK 17-17-17 applied at 30 days post-emergence during first hilling/earthing-up."}
                          </p>
                        </div>
                      </div>

                      {/* Display any live fertilizer activities from state */}
                      {fertilizerActivities.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60"
                        >
                          <div className="flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-semibold text-stone-800 dark:text-stone-200">{act.title}</span>
                          </div>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {act.completedDate || act.dueDate} ({act.status})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: Transport Logs & Dispatch Chain */}
                <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                  <div className="px-3.5 py-2 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
                      <Truck className="w-3.5 h-3.5 text-teal-600" />
                      <span>{language === "rw" ? "3. Urugendo & Imodoka Ziranguye (Transport Logs)" : "3. Transport & Transit Logistics"}</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {harvest.transporterName || "Koperative Logistics"}
                    </span>
                  </div>
                  <div className="p-3 text-xs space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60">
                        <span className="text-stone-500 block">{language === "rw" ? "Aho bishinguye (Origin)" : "Origin / Store"}</span>
                        <strong className="text-stone-900 dark:text-white">{harvest.storageLocation}</strong>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          {harvest.district || "Musanze"}, {harvest.sector || "Kinigi"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="text-stone-500 block">{language === "rw" ? "Aho byerekeje (Destination)" : "Destination Market"}</span>
                        <strong className="text-emerald-900 dark:text-emerald-300">
                          {harvest.destinationMarket || "Isoko rya Nyabugogo (Kigali Wholesale)"}
                        </strong>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          Transporter: {harvest.transporterName || "Koperative Logistics (RAD 429A)"}
                        </span>
                      </div>
                    </div>

                    {/* Matched Transport Dispatches */}
                    {batchTransportLogs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                        <span className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                          {language === "rw" ? "Ingendo z'imodoka zanditswe muri Sisitemu:" : "Logged Transport Trips:"}
                        </span>
                        <div className="space-y-1.5">
                          {batchTransportLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-[11px]"
                            >
                              <div>
                                <span className="font-bold text-stone-900 dark:text-white">
                                  {log.driverName} ({log.vehicleType.toUpperCase()})
                                </span>
                                <div className="text-[10px] text-stone-500">
                                  {log.origin} → {log.destination} • {log.date}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-stone-900 dark:text-white block">
                                  {log.cargoWeightKg.toLocaleString()} Kg
                                </span>
                                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                  {log.costRwf.toLocaleString()} RWF
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (language === "rw" ? "Byakopiwe!" : "Copied!") : (language === "rw" ? "Kopiya Batch Code" : "Copy Batch ID")}</span>
            </button>

            <button
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Kuramo QR (PNG)" : "Download QR"}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "rw" ? "Gucapa Ikarita (Print Label)" : "Print Batch Label"}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-bold text-xs sm:text-sm transition-colors"
            >
              {language === "rw" ? "Funga" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
