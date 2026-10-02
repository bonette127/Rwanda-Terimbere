import React, { useState } from "react";
import { Farm, HarvestRecord, Language, ProductionScale, SaleRecord, Expense, FarmActivity, TransportLog } from "../types";
import { getTranslation } from "../i18n";
import { BatchQrModal } from "./BatchQrModal";
import {
  ShoppingBag,
  Plus,
  Trash2,
  TrendingUp,
  PackageCheck,
  CreditCard,
  Building2,
  Coins,
  Warehouse,
  MapPin,
  Gauge,
  Sprout,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Scale,
  QrCode,
  FileBadge,
  Truck,
  Clock,
  FileSpreadsheet,
  FileText,
  Download,
  Camera,
  Eye,
  HardDriveDownload,
  Calendar,
} from "lucide-react";
import { CsvImportModal } from "./CsvImportModal";
import {
  exportFarmPerformancePdf,
  exportFarmPerformanceCsv,
} from "../utils/profitExport";

interface HarvestSalesViewProps {
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  farms: Farm[];
  language: Language;
  onAddHarvest: (harvest: Omit<HarvestRecord, "id">) => void;
  onAddHarvestsBulk?: (harvests: Omit<HarvestRecord, "id">[]) => void;
  onAddSale: (sale: Omit<SaleRecord, "id">) => void;
  onAddSalesBulk?: (sales: Omit<SaleRecord, "id">[]) => void;
  onDeleteHarvest: (id: string) => void;
  onDeleteSale: (id: string) => void;
  expenses?: Expense[];
  activities?: FarmActivity[];
  transportLogs?: TransportLog[];
  onOpenHarvestQr?: (
    harvest: HarvestRecord | null,
    mode: "qr_label" | "details" | "scanner" | "history"
  ) => void;
  onOpenOfflineBackup?: () => void;
  onOpenPlantingCalendarExport?: () => void;
}

export const HarvestSalesView: React.FC<HarvestSalesViewProps> = ({
  harvests,
  sales,
  farms,
  language,
  onAddHarvest,
  onAddHarvestsBulk,
  onAddSale,
  onAddSalesBulk,
  onDeleteHarvest,
  onDeleteSale,
  expenses = [],
  activities = [],
  transportLogs = [],
  onOpenHarvestQr,
  onOpenOfflineBackup,
  onOpenPlantingCalendarExport,
}) => {
  const t = getTranslation(language);
  const [activeTab, setActiveTab] = useState<"sales" | "harvests">("harvests");
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedBatchForQr, setSelectedBatchForQr] = useState<HarvestRecord | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Harvest form
  const [hFarmId, setHFarmId] = useState(farms[0]?.id || "");
  const [hCrop, setHCrop] = useState("Ibirayi (Kinigi)");
  const [hDate, setHDate] = useState(new Date().toISOString().split("T")[0]);
  const [hQty, setHQty] = useState("7200");
  const [hGrade, setHGrade] = useState<"A" | "B" | "C">("A");
  const [hLocation, setHLocation] = useState("Ububiko bwa Kinigi Modern Store");
  const [hBatchCode, setHBatchCode] = useState("");
  const [hDestinationMarket, setHDestinationMarket] = useState("Isoko rya Nyabugogo (Kigali Wholesale)");
  const [hTransporterName, setHTransporterName] = useState("Koperative Logistics / Murenzi (RAD 429A)");
  const [hSeedInputKg, setHSeedInputKg] = useState("720");
  const [hFertilizerInputKg, setHFertilizerInputKg] = useState("225");
  const [hInputCost, setHInputCost] = useState("386500");
  const [hAreaHa, setHAreaHa] = useState(farms[0]?.sizeHa ? String(farms[0].sizeHa) : "0.5");

  // Sale form
  const [sFarmId, setSFarmId] = useState(farms[0]?.id || "");
  const [sCrop, setSCrop] = useState("Ibirayi (Kinigi)");
  const [sDate, setSDate] = useState(new Date().toISOString().split("T")[0]);
  const [sBuyerName, setSBuyerName] = useState("");
  const [sBuyerType, setSBuyerType] = useState<"cooperative" | "wholesaler" | "local_market" | "retail">("wholesaler");
  const [sQty, setSQty] = useState("");
  const [sPrice, setSPrice] = useState("320");
  const [sPayment, setSPayment] = useState<"momo" | "airtel" | "cash" | "bank">("momo");
  const [sNotes, setSNotes] = useState("");

  // Inventory & Totals
  const totalHarvestedKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const totalSoldKg = sales.reduce((acc, s) => acc + s.quantityKg, 0);
  const inStockKg = Math.max(0, totalHarvestedKg - totalSoldKg);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const avgSellingPrice = totalSoldKg > 0 ? Math.round(totalSalesRevenue / totalSoldKg) : 0;

  // Input & Scale analytics
  const harvestsWithSeeds = harvests.filter((h) => h.seedInputKg && h.seedInputKg > 0);
  const avgSeedMultiplier =
    harvestsWithSeeds.length > 0
      ? (
          harvestsWithSeeds.reduce((acc, h) => acc + h.quantityKg / (h.seedInputKg || 1), 0) /
          harvestsWithSeeds.length
        ).toFixed(1)
      : "10.0";

  const harvestsWithFertilizer = harvests.filter((h) => h.fertilizerInputKg && h.fertilizerInputKg > 0);
  const avgFertilizerEfficiency =
    harvestsWithFertilizer.length > 0
      ? (
          harvestsWithFertilizer.reduce(
            (acc, h) => acc + h.quantityKg / (h.fertilizerInputKg || 1),
            0
          ) / harvestsWithFertilizer.length
        ).toFixed(1)
      : "28.5";

  const harvestsWithArea = harvests.filter((h) => h.areaHarvestedHa && h.areaHarvestedHa > 0);
  const avgYieldTonsHa =
    harvestsWithArea.length > 0
      ? (
          harvestsWithArea.reduce(
            (acc, h) => acc + h.quantityKg / 1000 / (h.areaHarvestedHa || 1),
            0
          ) / harvestsWithArea.length
        ).toFixed(1)
      : "12.2";

  // Production scale determination helper
  const determineScale = (ha?: number, qtyKg?: number): ProductionScale => {
    if (ha !== undefined) {
      if (ha < 0.5) return "subsistence";
      if (ha <= 2.0) return "semi_commercial";
      if (ha <= 5.0) return "medium_commercial";
      return "large_commercial";
    }
    if (qtyKg !== undefined) {
      if (qtyKg < 3000) return "subsistence";
      if (qtyKg <= 15000) return "semi_commercial";
      if (qtyKg <= 50000) return "medium_commercial";
      return "large_commercial";
    }
    return "semi_commercial";
  };

  const getScaleBadge = (scale?: ProductionScale, ha?: number, qtyKg?: number) => {
    const s = scale || determineScale(ha, qtyKg);
    switch (s) {
      case "subsistence":
        return {
          labelRw: "Ubutaka Buto (<0.5 Ha)",
          labelEn: "Smallholder (<0.5 Ha)",
          color: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700",
        };
      case "semi_commercial":
        return {
          labelRw: "Umucuruzi Wigenga (0.5 - 2 Ha)",
          labelEn: "Semi-Commercial (0.5 - 2 Ha)",
          color: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
        };
      case "medium_commercial":
        return {
          labelRw: "Ubuhinzi Bwagutse (2 - 5 Ha)",
          labelEn: "Medium Commercial (2 - 5 Ha)",
          color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
        };
      case "large_commercial":
        return {
          labelRw: "Ikigo Kinini cy'Ubuhinzi (>5 Ha)",
          labelEn: "Large Enterprise (>5 Ha)",
          color: "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700",
        };
    }
  };

  // Live calculations for harvest modal
  const liveQty = parseFloat(hQty) || 0;
  const liveSeeds = parseFloat(hSeedInputKg) || 0;
  const liveFertilizer = parseFloat(hFertilizerInputKg) || 0;
  const liveArea = parseFloat(hAreaHa) || 0.5;
  const liveSeedMultiplier = liveSeeds > 0 && liveQty > 0 ? (liveQty / liveSeeds).toFixed(1) : null;
  const liveFertilizerEfficiency = liveFertilizer > 0 && liveQty > 0 ? (liveQty / liveFertilizer).toFixed(1) : null;
  const liveYieldPerHa = liveArea > 0 && liveQty > 0 ? (liveQty / 1000 / liveArea).toFixed(1) : null;
  const liveScale = determineScale(liveArea, liveQty);

  const handleHarvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hQty || isNaN(Number(hQty))) return;

    const farm = farms.find((f) => f.id === hFarmId) || farms[0];
    const qty = parseFloat(hQty);
    const seeds = parseFloat(hSeedInputKg) || undefined;
    const fertilizer = parseFloat(hFertilizerInputKg) || undefined;
    const area = parseFloat(hAreaHa) || (farm ? farm.sizeHa : 0.5);
    const cost = parseFloat(hInputCost) || undefined;

    const yieldHa = area && area > 0 ? parseFloat((qty / 1000 / area).toFixed(2)) : undefined;
    const seedRatio = seeds && seeds > 0 ? parseFloat((qty / seeds).toFixed(1)) : undefined;
    const fertRatio = fertilizer && fertilizer > 0 ? parseFloat((qty / fertilizer).toFixed(1)) : undefined;

    const generatedBatchCode =
      hBatchCode.trim() ||
      `RW-HARV-${(farm?.district || "MUS").slice(0, 3).toUpperCase()}-${new Date(
        hDate
      ).getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newHarvestRecord: Omit<HarvestRecord, "id"> = {
      farmId: farm ? farm.id : "farm-1",
      farmName: farm ? farm.name : "Umurima",
      district: farm?.district,
      sector: farm?.sector,
      agroZone: farm?.agroZone,
      crop: hCrop,
      harvestDate: hDate,
      quantityKg: qty,
      qualityGrade: hGrade,
      storageLocation: hLocation.trim() || "Ububiko bwa Koperative",
      batchCode: generatedBatchCode,
      destinationMarket: hDestinationMarket.trim() || "Isoko rya Nyabugogo (Kigali Wholesale)",
      transporterName: hTransporterName.trim() || "Koperative Transport",
      certificationCode: `RICA-QMS-${new Date().getFullYear()}-A${Math.floor(10 + Math.random() * 90)}`,
      seedInputKg: seeds,
      fertilizerInputKg: fertilizer,
      totalInputCostRwf: cost,
      areaHarvestedHa: area,
      yieldPerHaTons: yieldHa,
      seedMultiplierRatio: seedRatio,
      fertilizerConversionRatio: fertRatio,
      scaleTier: determineScale(area, qty),
    };

    onAddHarvest(newHarvestRecord);

    setHQty("");
    setIsHarvestModalOpen(false);

    // Auto open QR Label Modal so the farmer can view/print immediately!
    setSelectedBatchForQr({
      ...newHarvestRecord,
      id: `harv-new-${Date.now()}`,
    });
    setIsQrModalOpen(true);
  };

  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(sQty);
    const price = parseFloat(sPrice);
    if (isNaN(qty) || isNaN(price)) return;

    onAddSale({
      farmId: sFarmId || (farms[0]?.id ?? "farm-1"),
      crop: sCrop,
      saleDate: sDate,
      buyerName: sBuyerName.trim() || "Umuguzi",
      buyerType: sBuyerType,
      quantityKg: qty,
      unitPriceRwf: price,
      totalAmountRwf: Math.round(qty * price),
      paymentMethod: sPayment,
      notes: sNotes.trim() || undefined,
    });

    setSBuyerName("");
    setSQty("");
    setIsSaleModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            {t.harvestTitle}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {language === "rw"
              ? "Umusaruro wasaruwe, aho uherereye (Location) n'ubushobozi bwawo hashingiwe ku mbuto n'ifumbire (Production Scale & Inputs)"
              : "Track harvests, location & agro-zones, and production scale based on seed/fertilizer inputs and yields."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenOfflineBackup && (
            <button
              type="button"
              onClick={onOpenOfflineBackup}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4 text-amber-400" />
              <span>
                {language === "rw" ? "Bika JSON (Offline)" : "Backup JSON (Offline)"}
              </span>
            </button>
          )}
          {onOpenPlantingCalendarExport && (
            <button
              type="button"
              onClick={onOpenPlantingCalendarExport}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white border border-emerald-800 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              title={
                language === "rw"
                  ? "Kohereza amatariki y'isarura muri Kalendari (.ICS / Google)"
                  : "Export harvest dates to calendar (.ICS / Google)"
              }
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>
                {language === "rw" ? "Kalendari (.ICS)" : "Calendar (.ICS)"}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              const primaryFarm = farms[0] || { name: "Umurima", district: "Musanze" };
              exportFarmPerformancePdf({
                farmerName: "Jean Baptiste Hakizimana",
                farmName: primaryFarm.name,
                district: primaryFarm.district,
                language,
                expenses,
                harvests,
                sales,
                farms,
                activities,
              });
            }}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>{language === "rw" ? "Bika PDF" : "Export PDF"}</span>
          </button>
          <button
            onClick={() => {
              const primaryFarm = farms[0] || { name: "Umurima", district: "Musanze" };
              exportFarmPerformanceCsv({
                farmerName: "Jean Baptiste Hakizimana",
                farmName: primaryFarm.name,
                district: primaryFarm.district,
                language,
                expenses,
                harvests,
                sales,
                farms,
                activities,
              });
            }}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-700 dark:text-stone-300" />
            <span>{language === "rw" ? "Bika CSV" : "Export CSV"}</span>
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800 font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{language === "rw" ? "Injiza CSV" : "Import CSV"}</span>
          </button>
          {harvests.length > 0 && (
            <button
              onClick={() => {
                setSelectedBatchForQr(harvests[0]);
                setIsQrModalOpen(true);
              }}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>{language === "rw" ? "Ikarita ya QR" : "QR Batch Label"}</span>
            </button>
          )}
          {onOpenHarvestQr && (
            <button
              type="button"
              onClick={() => onOpenHarvestQr(harvests[0] || null, "scanner")}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "Sikana QR & Amateka"
                  : "Scan Batch QR & History"}
              </span>
            </button>
          )}
          <button
            onClick={() => setIsHarvestModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
          >
            <PackageCheck className="w-4 h-4 text-amber-300" />
            <span>{t.recordHarvest}</span>
          </button>
          <button
            onClick={() => setIsSaleModalOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>{t.recordSale}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.harvestedQty}
          </span>
          <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
            {totalHarvestedKg.toLocaleString()} <span className="text-sm font-bold text-stone-500">Kg</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {(totalHarvestedKg / 1000).toFixed(1)} {t.tons} yasaruwe yose
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.soldQty}
          </span>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-1">
            {totalSoldKg.toLocaleString()} <span className="text-sm font-bold text-stone-500">Kg</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Mpuzandengo: {avgSellingPrice} RWF/kg
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.remainingStock}
          </span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 flex items-center space-x-1.5">
            <Warehouse className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{inStockKg.toLocaleString()}</span>
            <span className="text-sm font-bold text-stone-500">Kg</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium">
            Bitegereje kugurishwa mu bubiko
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.revenueTotal}
          </span>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {totalSalesRevenue.toLocaleString()} <span className="text-sm font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
            Amafaranga yinjiye kuri MoMo & Cash
          </p>
        </div>
      </div>

      {/* Production Scale & Input-to-Harvest Analytics Bento */}
      <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 p-6 rounded-2xl border border-emerald-900/60 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-800/60 border border-emerald-500/30 text-amber-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {language === "rw"
                  ? "Ubusesenguzi bw'Umusaruro hashingiwe ku Mbuto n'Ifumbire (Scale & Input Analytics)"
                  : "Production Scale & Input-to-Harvest Efficiency Analytics"}
              </h2>
              <p className="text-xs text-emerald-300/80">
                {language === "rw"
                  ? "Ikigero cy'ubuhinzi (Scale Tier) n'umuvuduko w'imbuto n'ifumbire muri buri zone"
                  : "Production tier benchmarks, input-to-yield multipliers, and location zone distribution"}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 w-fit">
            RAB / MINAGRI Benchmarks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Card 1: Seed Multiplier */}
          <div className="bg-stone-900/80 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Seed Multiplier (Ubwinshi bw'Imbuto)
                </span>
                <Sprout className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {avgSeedMultiplier}x
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Buri kilo 1 cy'imbuto kiva mo ibilo {avgSeedMultiplier} by'umusaruro
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[11px] text-emerald-400 flex items-center justify-between font-semibold">
              <span>Ibirayi: 10x • Ibigori: 184x</span>
              <span className="text-amber-400">Hejuru y'intego</span>
            </div>
          </div>

          {/* Card 2: Fertilizer Efficiency */}
          <div className="bg-stone-900/80 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Fertilizer Efficiency (Umurimo w'Ifumbire)
                </span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {avgFertilizerEfficiency} <span className="text-xs text-stone-400 font-bold">Kg / Kg NPK</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Buri kilo cy'ifumbire ya NPK/DAP gishyigikira ibilo {avgFertilizerEfficiency} by'ibiribwa
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[11px] text-blue-300 flex items-center justify-between font-semibold">
              <span>Smart Nkunganire Standard</span>
              <span className="text-emerald-400">94% Efficiency</span>
            </div>
          </div>

          {/* Card 3: Yield per Hectare & Scale */}
          <div className="bg-stone-900/80 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Umusaruro kuri Hectare (T/Ha)
                </span>
                <Gauge className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 mt-2">
                {avgYieldTonsHa} <span className="text-xs text-stone-400 font-bold">Tons / Ha</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Mpuzandengo y'ingano y'umusaruro ugereranyije na hectare yatewe
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-800/80 text-[11px] text-stone-300 flex items-center justify-between font-semibold">
              <span>RAB Benchmark: 14.5 T/Ha</span>
              <span className="text-emerald-400">Semi-Commercial Tier</span>
            </div>
          </div>
        </div>

        {/* Location & Production Scale Breakdown Bar */}
        <div className="mt-4 pt-4 border-t border-stone-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Amajyaruguru (Musanze - Kinigi)</span>
              <span className="text-stone-400 text-[11px]">Volcanic Zone • 14.4 T/Ha • Semi-Commercial</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Uburasirazuba (Nyagatare - Mimuri)</span>
              <span className="text-stone-400 text-[11px]">Eastern Savanna • 4.6 T/Ha (Maize) • Semi-Commercial</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-stone-900/60 p-2.5 rounded-xl border border-stone-800">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Amajyepfo (Huye - Tumba)</span>
              <span className="text-stone-400 text-[11px]">Central Plateau • Intensive Valley • Subsistence Tier</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={() => setActiveTab("harvests")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "harvests"
              ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          }`}
        >
          {language === "rw" ? "Umusaruro Wasaruwe & Scale (Harvest Log)" : "Harvest Log & Production Scale"} ({harvests.length})
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "sales"
              ? "border-emerald-800 text-emerald-900 dark:text-emerald-400 dark:border-emerald-400"
              : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          }`}
        >
          {language === "rw" ? "Ibicuruzwa Byagurishijwe (Sales)" : "Sales Transactions"} ({sales.length})
        </button>
      </div>

      {/* Harvests Tab Content with Location & Scale */}
      {activeTab === "harvests" && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          {harvests.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-sm">
              Nta musaruro urandikwa. Kanda kuri "Andika Umusaruro" kugira ngo ushyiremo mushya.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">{t.date}</th>
                    <th className="px-5 py-3.5">Umurima & Aho uherereye (Location)</th>
                    <th className="px-5 py-3.5">{t.cropName}</th>
                    <th className="px-5 py-3.5 text-right">{t.harvestedQty}</th>
                    <th className="px-5 py-3.5 text-center">Ubushobozi bw'Imbuto (Input Ratio)</th>
                    <th className="px-5 py-3.5 text-center">Umusaruro / Ha (Yield)</th>
                    <th className="px-5 py-3.5 text-center">Ikigero cy'Ubuhinzi (Scale)</th>
                    <th className="px-5 py-3.5 text-center">Icyiciro (Grade)</th>
                    <th className="px-5 py-3.5 text-center">Ikarita ya QR (Transport Pass)</th>
                    <th className="px-5 py-3.5 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {harvests.map((h) => {
                    const scaleBadge = getScaleBadge(h.scaleTier, h.areaHarvestedHa, h.quantityKg);
                    const multiplier = h.seedMultiplierRatio || (h.seedInputKg ? (h.quantityKg / h.seedInputKg).toFixed(1) : null);
                    const fertEfficiency = h.fertilizerConversionRatio || (h.fertilizerInputKg ? (h.quantityKg / h.fertilizerInputKg).toFixed(1) : null);
                    const yieldHa = h.yieldPerHaTons || (h.areaHarvestedHa ? (h.quantityKg / 1000 / h.areaHarvestedHa).toFixed(1) : null);

                    return (
                      <tr key={h.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-stone-600 dark:text-stone-400">
                          <div>{h.harvestDate}</div>
                          {h.syncStatus === "offline_pending" && (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.2 rounded-full animate-pulse mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>offline_pending</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-xs text-stone-900 dark:text-white">
                            {h.farmName}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>
                              {h.district ? `${h.district}, ${h.sector || ""}` : "Rwanda"} {h.agroZone ? `• ${h.agroZone}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-medium text-emerald-900 dark:text-emerald-400 text-xs">
                          {h.crop}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right font-black text-stone-900 dark:text-white">
                          {h.quantityKg.toLocaleString()} {t.kg}
                          <div className="text-[10px] text-stone-400 font-normal">
                            {(h.quantityKg / 1000).toFixed(1)} {t.tons}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          {multiplier ? (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                              {multiplier}x multiplier
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">-</span>
                          )}
                          {fertEfficiency && (
                            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {fertEfficiency} kg/kg ifumbire
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          {yieldHa ? (
                            <div>
                              <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                                {yieldHa} T/Ha
                              </span>
                              {h.rabBenchmarkTonsHa && (
                                <div className="text-[10px] text-stone-400">
                                  Benchmark: {h.rabBenchmarkTonsHa} T
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-block ${scaleBadge.color}`}>
                            {language === "rw" ? scaleBadge.labelRw : scaleBadge.labelEn}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            Grade {h.qualityGrade}
                          </span>
                          <div className="text-[10px] text-stone-400 mt-0.5 truncate max-w-[120px] mx-auto">
                            {h.storageLocation}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenHarvestQr) {
                                  onOpenHarvestQr(h, "qr_label");
                                } else {
                                  setSelectedBatchForQr(h);
                                  setIsQrModalOpen(true);
                                }
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold transition-all cursor-pointer"
                              title="Generate scannable Harvest Batch QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{language === "rw" ? "QR Code" : "Batch QR"}</span>
                            </button>
                            {onOpenHarvestQr && (
                              <button
                                type="button"
                                onClick={() => onOpenHarvestQr(h, "details")}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-500/20 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-bold transition-all cursor-pointer"
                                title="Open direct Batch Details view"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                                <span>{language === "rw" ? "Amakuru" : "Details"}</span>
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-stone-400 mt-0.5">
                            {h.batchCode || `RW-${(h.district || "MUS").slice(0, 3).toUpperCase()}-001`}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => onDeleteHarvest(h.id)}
                            className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                            title={t.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sales Tab Content */}
      {activeTab === "sales" && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-sm">
              Nta kintu kiragurishwa muri iki gihembwe.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">{t.date}</th>
                    <th className="px-5 py-3.5">{t.buyer}</th>
                    <th className="px-5 py-3.5">{t.cropName}</th>
                    <th className="px-5 py-3.5 text-right">{t.soldQty}</th>
                    <th className="px-5 py-3.5 text-right">Igiciro (RWF/kg)</th>
                    <th className="px-5 py-3.5 text-right">{t.total} (RWF)</th>
                    <th className="px-5 py-3.5 text-center">{t.paymentMethod}</th>
                    <th className="px-5 py-3.5 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-stone-600 dark:text-stone-400">
                        <div>{sale.saleDate}</div>
                        {sale.syncStatus === "offline_pending" && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.2 rounded-full animate-pulse mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            <span>offline_pending</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-xs text-stone-900 dark:text-white">
                          {sale.buyerName}
                        </div>
                        <div className="text-[11px] text-stone-500 capitalize">
                          {sale.buyerType}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-emerald-900 dark:text-emerald-400 text-xs">
                        {sale.crop}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right font-black text-stone-900 dark:text-white">
                        {sale.quantityKg.toLocaleString()} {t.kg}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right font-semibold text-stone-700 dark:text-stone-300">
                        {sale.unitPriceRwf.toLocaleString()} RWF
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right font-black text-emerald-700 dark:text-emerald-400">
                        {sale.totalAmountRwf.toLocaleString()} RWF
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => onDeleteSale(sale.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Harvest Modal with Production Scale & Input metrics */}
      {isHarvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">{t.recordHarvest}</h3>
              <button
                onClick={() => setIsHarvestModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHarvestSubmit} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Umurima n'Aho uherereye (Farm & Location) *
                </label>
                <select
                  value={hFarmId}
                  onChange={(e) => {
                    setHFarmId(e.target.value);
                    const selected = farms.find((f) => f.id === e.target.value);
                    if (selected && selected.sizeHa) {
                      setHAreaHa(String(selected.sizeHa));
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white outline-hidden font-medium"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.district}, {f.sector} ({f.sizeHa} Ha)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Igihingwa (Crop) *
                  </label>
                  <input
                    type="text"
                    required
                    value={hCrop}
                    onChange={(e) => setHCrop(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Itariki yo gusarura *
                  </label>
                  <input
                    type="date"
                    required
                    value={hDate}
                    onChange={(e) => setHDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ibiro byasaruwe (Harvested Kg) *
                  </label>
                  <input
                    type="number"
                    step="10"
                    required
                    placeholder="7200"
                    value={hQty}
                    onChange={(e) => setHQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl font-bold outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ubuso bwasaruwe (Ha) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    placeholder="0.5"
                    value={hAreaHa}
                    onChange={(e) => setHAreaHa(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl font-bold outline-hidden"
                  />
                </div>
              </div>

              {/* Input details: Seeds & Fertilizer */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Ibyinjijwe mu buhinzi (Inputs Applied to determine Scale & Efficiency):
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Imbuto zatewe (Seeds Kg)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="720"
                      value={hSeedInputKg}
                      onChange={(e) => setHSeedInputKg(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl text-xs font-bold outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Ifumbire yashyizwemo (NPK/DAP Kg)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="225"
                      value={hFertilizerInputKg}
                      onChange={(e) => setHFertilizerInputKg(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl text-xs font-bold outline-hidden"
                    />
                  </div>
                </div>

                {/* Real-time Calculation Preview */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-medium">Seed Multiplier</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {liveSeedMultiplier ? `${liveSeedMultiplier}x` : "-"}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-medium">Yield per Ha</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      {liveYieldPerHa ? `${liveYieldPerHa} T/Ha` : "-"}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 block font-medium">Scale Tier</span>
                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 truncate block">
                      {getScaleBadge(liveScale).labelRw}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ubuziranenge (Grade)
                  </label>
                  <select
                    value={hGrade}
                    onChange={(e) => setHGrade(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white outline-hidden font-bold"
                  >
                    <option value="A">Grade A (Ibyiza cyane - Premium)</option>
                    <option value="B">Grade B (Biringaniye - Standard)</option>
                    <option value="C">Grade C (Bitoya - Small)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Amafaranga yose yagiye mu mbuto/fumbire
                  </label>
                  <input
                    type="number"
                    value={hInputCost}
                    onChange={(e) => setHInputCost(e.target.value)}
                    placeholder="386500"
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Aho bihunitse (Storage facility)
                </label>
                <input
                  type="text"
                  value={hLocation}
                  onChange={(e) => setHLocation(e.target.value)}
                  placeholder="Urugero: Ububiko bwa Kinigi Modern Store"
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                />
              </div>

              {/* QR Code Batch & Market Transit Details */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Amakuru y'Ikarita ya QR & Gutwara ku Isoko (Transport & Traceability):</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Kode y'Umusaruro (Batch ID)
                    </label>
                    <input
                      type="text"
                      placeholder="RW-HARV-MUS-2025-001 (Auto)"
                      value={hBatchCode}
                      onChange={(e) => setHBatchCode(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl text-xs font-mono outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Isoko Rigenderewe (Destination)
                    </label>
                    <input
                      type="text"
                      value={hDestinationMarket}
                      onChange={(e) => setHDestinationMarket(e.target.value)}
                      placeholder="Isoko rya Nyabugogo (Kigali Wholesale)"
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Imodoka / Transporter
                  </label>
                  <input
                    type="text"
                    value={hTransporterName}
                    onChange={(e) => setHTransporterName(e.target.value)}
                    placeholder="Koperative Logistics / Murenzi (RAD 429A)"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl text-xs outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsHarvestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Sale Modal */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">{t.recordSale}</h3>
              <button
                onClick={() => setIsSaleModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Umurima (Farm origin)
                </label>
                <select
                  value={sFarmId}
                  onChange={(e) => setSFarmId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white outline-hidden"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t.cropName} *
                </label>
                <input
                  type="text"
                  required
                  value={sCrop}
                  onChange={(e) => setSCrop(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Izina ry'Umuguzi (Buyer) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Urugero: Koperative y'Iburayi Kigali"
                    value={sBuyerName}
                    onChange={(e) => setSBuyerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ubwoko bw'Umuguzi
                  </label>
                  <select
                    value={sBuyerType}
                    onChange={(e) => setSBuyerType(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white outline-hidden"
                  >
                    <option value="wholesaler">Umucuruzi munini (Wholesaler)</option>
                    <option value="cooperative">Koperative (Cooperative)</option>
                    <option value="local_market">Isoko ryo hafi (Local Market)</option>
                    <option value="retail">Umuguzi usanzwe (Retail)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ingano igurishijwe (Kg) *
                  </label>
                  <input
                    type="number"
                    step="10"
                    required
                    placeholder="7000"
                    value={sQty}
                    onChange={(e) => setSQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl font-bold outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Igiciro ku Kilo (RWF/kg) *
                  </label>
                  <input
                    type="number"
                    step="5"
                    required
                    placeholder="320"
                    value={sPrice}
                    onChange={(e) => setSPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl font-bold outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    {t.date} *
                  </label>
                  <input
                    type="date"
                    required
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Uburyo bwo Kwishyura
                  </label>
                  <select
                    value={sPayment}
                    onChange={(e) => setSPayment(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white outline-hidden font-bold"
                  >
                    <option value="momo">MTN Mobile Money</option>
                    <option value="airtel">Airtel Money</option>
                    <option value="cash">Kashi (Cash)</option>
                    <option value="bank">Bank Transfer (BK / BPR / I&M)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Ibyongeweho (Notes)
                </label>
                <textarea
                  rows={2}
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                  placeholder="Urugero: Amafaranga yakiriwe kuri MTN Mobile Money 0788123456..."
                  className="w-full px-3.5 py-2.5 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unique Batch QR Code Traceability Label Modal */}
      {selectedBatchForQr && (
        <BatchQrModal
          harvest={selectedBatchForQr}
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          language={language}
          expenses={expenses}
          activities={activities}
          transportLogs={transportLogs}
        />
      )}

      {/* CSV Import Modal for Sales & Harvest Yield Logs */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        mode="harvest_sales"
        farms={farms}
        language={language}
        onImportSales={(importedSales) => {
          if (onAddSalesBulk) {
            onAddSalesBulk(importedSales);
          } else {
            importedSales.forEach((s) => onAddSale(s));
          }
        }}
        onImportHarvests={(importedHarvests) => {
          if (onAddHarvestsBulk) {
            onAddHarvestsBulk(importedHarvests);
          } else {
            importedHarvests.forEach((h) => onAddHarvest(h));
          }
        }}
      />
    </div>
  );
};
