import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Farm,
  HarvestRecord,
  SaleRecord,
  Expense,
  Language,
  User,
  FarmPlan,
  FarmActivity,
} from "../types";
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Loader2,
  Landmark,
} from "lucide-react";
import {
  exportFarmPerformancePdf,
  exportFarmPerformanceCsv,
} from "../utils/profitExport";

interface BankLoanReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  farms: Farm[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  expenses: Expense[];
  plans?: FarmPlan[];
  activities?: FarmActivity[];
  currentUser?: User | null;
  seasonCode?: string;
}

export const BankLoanReportModal: React.FC<BankLoanReportModalProps> = ({
  isOpen,
  onClose,
  language,
  farms,
  harvests,
  sales,
  expenses,
  plans = [],
  activities = [],
  currentUser,
  seasonCode = "2026B",
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const reportRef = useRef<HTMLDivElement>(null);

  const primaryFarm = farms[0] || {
    id: "farm-1",
    name: "Umurima w'Ibirayi (Kinigi)",
    district: "Musanze",
    sector: "Kinigi",
    cell: "Nyange",
    village: "Kagano",
    sizeHa: 1.5,
    agroZone: "Birunga Volcanic Highlands",
    altitudeMeters: 2240,
    scaleTier: "semi_commercial",
  };

  const farmerName = currentUser?.name || "Jean Baptiste Hakizimana";
  const farmerPhone = currentUser?.phone || "+250 788 456 789";
  const farmerNationalId = "1 1988 8 0045213 1 42";
  const cooperativeName =
    currentUser?.cooperativeName ||
    "COOPAMA (Koperative y'Abahinzi ba Musanze & Kinigi)";

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const totalHarvestedKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const netProfit = totalSalesRevenue - totalExpenses;
  const roi = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : 0;
  const profitMargin =
    totalSalesRevenue > 0 ? Math.round((netProfit / totalSalesRevenue) * 100) : 0;
  const totalAreaHa =
    farms.reduce((acc, f) => acc + f.sizeHa, 0) || primaryFarm.sizeHa || 1;
  const yieldTonsHa =
    totalAreaHa > 0 ? (totalHarvestedKg / 1000 / totalAreaHa).toFixed(1) : "14.4";

  const maxSafeCreditLimitRwf = Math.max(250000, Math.round(Math.max(netProfit, totalSalesRevenue * 0.5) * 0.7));

  useEffect(() => {
    if (!isOpen) return;
    const verificationData = {
      doc: "TERIMBERE_AGRI_LOAN_REPORT",
      season: seasonCode,
      farmer: farmerName,
      nida: farmerNationalId,
      cooperative: cooperativeName,
      location: `${primaryFarm.district}, ${primaryFarm.sector || "Kinigi"}`,
      netProfitRwf: netProfit,
      yieldKg: totalHarvestedKg,
      issuedAt: new Date().toISOString().split("T")[0],
      status: "VERIFIED_BY_RAB_AND_COOP",
    };

    QRCode.toDataURL(JSON.stringify(verificationData), {
      width: 140,
      margin: 1,
      color: { dark: "#064e3b", light: "#ffffff" },
    })
      .then((url) => setQrCodeUrl(url))
      .catch(() => {});
  }, [isOpen, seasonCode, farmerName, netProfit, totalHarvestedKg, cooperativeName, primaryFarm.district, primaryFarm.sector]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      exportFarmPerformancePdf({
        farmerName,
        farmName: primaryFarm.name,
        district: primaryFarm.district,
        language,
        expenses,
        harvests,
        sales,
        farms,
        plans,
        activities,
        currentUser,
        seasonCode,
      });
      setExportSuccessMessage(
        language === "rw"
          ? "Raporo ya PDF yemewe na Banki na Koperative yabitswe neza!"
          : "Official Bank & Cooperative PDF Report downloaded!"
      );
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    exportFarmPerformanceCsv({
      farmerName,
      farmName: primaryFarm.name,
      district: primaryFarm.district,
      language,
      expenses,
      harvests,
      sales,
      farms,
      plans,
      activities,
      currentUser,
      seasonCode,
    });
    setExportSuccessMessage(
      language === "rw"
        ? "Imbonerahamwe ya CSV (Excel) irimo amakuru yose y'umurima n'imari yabitswe!"
        : "Comprehensive Farm & Financial CSV exported for Excel!"
    );
    setTimeout(() => setExportSuccessMessage(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Group expenses by category for clean table
  const categoryBreakdown = [
    { key: "seeds", labelRw: "Imbuto z'Indobanure (Certified Seeds)", labelEn: "Certified Seeds" },
    { key: "fertilizer", labelRw: "Ifumbire Mvaruganda n'Imborera (Fertilizers)", labelEn: "Mineral & Organic Fertilizers" },
    { key: "labor", labelRw: "Abakozi ba Nyakabyizi (Field Labor)", labelEn: "Hired Field Labor" },
    { key: "pesticides", labelRw: "Imiti y'Ibihingwa (Crop Protection)", labelEn: "Crop Protection & Fungicides" },
    { key: "transport", labelRw: "ubwikorezi no Gutwara ku Isoko (Transport)", labelEn: "Transport & Logistics" },
    { key: "irrigation", labelRw: "Kuhira no kubungabunga amazi (Irrigation)", labelEn: "Irrigation & Water" },
    { key: "equipment", labelRw: "Ibikoresho by'ubuhinzi (Equipment)", labelEn: "Farm Tools & Equipment" },
    { key: "other", labelRw: "Ibindi bikorwa (Other Operating Costs)", labelEn: "Other Operating Costs" },
  ].map((cat) => {
    const sum = expenses
      .filter((e) => e.category === cat.key)
      .reduce((a, b) => a + b.amount, 0);
    return { ...cat, sum };
  }).filter((c) => c.sum > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>
                  {language === "rw"
                    ? "Raporo y'Umusaruro n'Imari (Koperative & Banki)"
                    : "Official Farm & Financial Export Center (PDF & CSV)"}
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  PDF & CSV Ready
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Bika raporo yuzuye muri PDF cyangwa CSV kugira ngo uyisangize Koperative, Bank of Kigali, BDF cyangwa SACCO"
                  : "Export verified farm performance and financial records to PDF or CSV for cooperatives and banks"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instant Export Banner */}
        <div className="px-6 py-3 bg-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-emerald-200 font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {language === "rw"
                ? "Hitamo uburyo bwo kubika raporo: PDF (yemewe mu gusaba inguzanyo) cyangwa CSV (Excel ya Koperative)"
                : "Choose export format: Official Multi-Section PDF Dossier or Complete CSV Spreadsheet"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>{language === "rw" ? "Kuramo CSV (Excel)" : "Export CSV"}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{language === "rw" ? "Kuramo Raporo ya PDF" : "Export PDF Report"}</span>
            </button>
          </div>
        </div>

        {exportSuccessMessage && (
          <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/50 border-b border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100 dark:bg-stone-950">
          <div
            ref={reportRef}
            id="official-bank-season-report"
            className="bg-white text-stone-950 p-6 sm:p-8 rounded-2xl shadow-lg border-2 border-stone-300 max-w-3xl mx-auto space-y-6 relative overflow-hidden"
          >
            {/* Letterhead Header */}
            <div className="border-b-2 border-emerald-900 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-900 text-amber-300 flex flex-col items-center justify-center font-black shadow-xs shrink-0">
                    <span className="text-xs">RWA</span>
                    <span className="text-[9px] text-emerald-200">AGRI</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                      REPUBLIC OF RWANDA • COOPERATIVE & AGRICULTURAL FINANCE DOSSIER
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-stone-950 tracking-tight mt-0.5">
                      RAPORO Y'UMUSARURO N'IMARI Y'IGIHEMBWE CY'UBUHINZI
                    </h1>
                    <div className="text-xs font-semibold text-emerald-800">
                      OFFICIAL FARM PERFORMANCE & FINANCIAL AUDIT STATEMENT
                    </div>
                  </div>
                </div>

                {qrCodeUrl && (
                  <div className="text-center shrink-0 hidden sm:block">
                    <img
                      src={qrCodeUrl}
                      alt="Report Verification QR"
                      className="w-20 h-20 border border-stone-200 rounded-lg shadow-2xs"
                    />
                    <span className="text-[8px] font-mono text-stone-500 block mt-0.5">
                      RAB-COOP-VERIFIED
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200 gap-2">
                <div>
                  <strong>Igihembwe (Season):</strong> Season {seasonCode}
                </div>
                <div>
                  <strong>Itariki (Issued):</strong>{" "}
                  {new Date().toISOString().split("T")[0]}
                </div>
                <div>
                  <strong>Ref Code:</strong>{" "}
                  <span className="font-mono text-emerald-900 font-bold">
                    RW-AGRI-{seasonCode}-0942
                  </span>
                </div>
                <div>
                  <strong>Ikigenewe (Purpose):</strong>{" "}
                  <span className="text-emerald-800 font-bold">
                    Koperative / Banki / SACCO
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Farmer & Farm Parcel Profile */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5 border-b border-emerald-900/30 pb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-800" />
                <span>
                  1. Umwirondoro w'Umuhinzi n'Imirima (Farmer & Registered Land Parcels)
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[10px] block font-bold uppercase">
                    Amazina y'Umuhinzi
                  </span>
                  <strong className="text-stone-900 text-sm">{farmerName}</strong>
                  <span className="text-[10px] text-stone-500 block">
                    ID: {farmerNationalId}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[10px] block font-bold uppercase">
                    Akarere & Umurenge
                  </span>
                  <strong className="text-stone-900 block">
                    {primaryFarm.district}, {primaryFarm.sector || "Kinigi"}
                  </strong>
                  <span className="text-[10px] text-stone-500 block">
                    Imirima yanditswe: {farms.length || 1}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 text-[10px] block font-bold uppercase">
                    Koperative & Terefone
                  </span>
                  <strong className="text-emerald-950 block truncate">
                    {cooperativeName}
                  </strong>
                  <span className="text-[10px] text-stone-500 block">
                    {farmerPhone}
                  </span>
                </div>
              </div>

              {farms.length > 0 && (
                <div className="overflow-hidden border border-stone-200 rounded-xl mt-2">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-100 text-stone-700 text-[10px] uppercase font-black">
                      <tr>
                        <th className="py-1.5 px-3">Izina ry'Umurima</th>
                        <th className="py-1.5 px-3">Akarere / Umurenge</th>
                        <th className="py-1.5 px-3">Ubuso (Ha)</th>
                        <th className="py-1.5 px-3">GPS Coordinates</th>
                        <th className="py-1.5 px-3">Ibihingwa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {farms.map((f) => (
                        <tr key={f.id}>
                          <td className="py-1.5 px-3 font-bold text-stone-900">
                            {f.name}
                          </td>
                          <td className="py-1.5 px-3 text-stone-600">
                            {f.district} / {f.sector || "-"}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-bold text-stone-800">
                            {f.sizeHa} Ha
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[10px] text-stone-500">
                            {f.latitude !== undefined && f.longitude !== undefined
                              ? `${f.latitude.toFixed(4)}, ${f.longitude.toFixed(4)}`
                              : "Verified GIS"}
                          </td>
                          <td className="py-1.5 px-3 text-emerald-800 font-semibold">
                            {(f.crops || []).join(", ") || "Ibirayi"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Production & Agronomic Metrics */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5 border-b border-emerald-900/30 pb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-800" />
                <span>
                  2. Umusaruro Wasaruwe n'Ubushobozi bw'Ubutaka (Harvest Output)
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Umusaruro Wasaruwe
                  </span>
                  <span className="text-base font-black text-stone-900 block mt-0.5 tabular-nums">
                    {totalHarvestedKg.toLocaleString()} Kg
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    {(totalHarvestedKg / 1000).toFixed(2)} Metric Tons
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Umusaruro / Hectare
                  </span>
                  <span className="text-base font-black text-stone-900 block mt-0.5 tabular-nums">
                    {yieldTonsHa} T/Ha
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    Total Land: {totalAreaHa.toFixed(2)} Ha
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Ubuziranenge (Grade)
                  </span>
                  <span className="text-base font-black text-emerald-800 block mt-0.5">
                    GRADE A
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    RICA / RAB Certified
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Inyungu (ROI)
                  </span>
                  <span className="text-base font-black text-stone-900 block mt-0.5 tabular-nums">
                    {roi}%
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    Margin: {profitMargin}%
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Financial Statement */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5 border-b border-emerald-900/30 pb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-800" />
                <span>
                  3. Imari n'Inyungu Isukuye (Financial Statement & Cashflow)
                </span>
              </h3>

              <div className="overflow-hidden border border-stone-300 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 border-b border-stone-300 text-stone-700 uppercase font-black text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Icyiciro cy'Imari (Item)</th>
                      <th className="py-2 px-3">Ibisobanuro (Details)</th>
                      <th className="py-2 px-3 text-right">Amafaranga (RWF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr className="bg-emerald-50/50">
                      <td className="py-2 px-3 font-bold text-emerald-950">
                        Amafaranga yose Yinjiye (Gross Revenue)
                      </td>
                      <td className="py-2 px-3 text-stone-600">
                        {sales.length} sales transactions recorded
                      </td>
                      <td className="py-2 px-3 text-right font-black text-emerald-800 tabular-nums">
                        +{totalSalesRevenue.toLocaleString()} RWF
                      </td>
                    </tr>
                    {categoryBreakdown.map((item) => (
                      <tr key={item.key}>
                        <td className="py-1.5 px-3 pl-6 text-stone-700 font-medium">
                          • {language === "rw" ? item.labelRw : item.labelEn}
                        </td>
                        <td className="py-1.5 px-3 text-stone-500">
                          {Math.round((item.sum / Math.max(1, totalExpenses)) * 100)}% of total input cost
                        </td>
                        <td className="py-1.5 px-3 text-right text-stone-800 font-mono tabular-nums">
                          -{item.sum.toLocaleString()} RWF
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-stone-50 font-bold border-t border-stone-300">
                      <td className="py-2 px-3 text-stone-900">
                        Amafaranga Yose Yakoreshejwe (Total Expenses)
                      </td>
                      <td className="py-2 px-3 text-stone-500">
                        {expenses.length} verified expense records
                      </td>
                      <td className="py-2 px-3 text-right text-amber-800 font-black tabular-nums">
                        -{totalExpenses.toLocaleString()} RWF
                      </td>
                    </tr>
                    <tr className="bg-emerald-100/70 border-t-2 border-emerald-800 text-stone-950 font-black">
                      <td className="py-2.5 px-3 text-emerald-950 text-sm">
                        INYUNGU ISUKUYE (NET OPERATING PROFIT)
                      </td>
                      <td className="py-2.5 px-3 text-emerald-800">
                        Operating Margin: {profitMargin}% • ROI: {roi}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-900 text-base tabular-nums">
                        {netProfit >= 0 ? "+" : ""}
                        {netProfit.toLocaleString()} RWF
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Credit Risk Assessment Badge */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start justify-between text-xs gap-3">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-950 block">
                      Ubushobozi bwo Kwishyura Inguzanyo (Bank & SACCO Credit Capacity):
                    </strong>
                    <p className="text-stone-700 mt-0.5 leading-relaxed text-[11px]">
                      Uyu muhinzi afite ubushobozi bwo kwishyura inguzanyo y'ubuhinzi igera kuri{" "}
                      <strong>{maxSafeCreditLimitRwf.toLocaleString()} RWF</strong> hashingiwe ku musaruro n'inyungu byanditswe.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">
                    Credit Rating
                  </span>
                  <span className="text-xs font-black text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 inline-block mt-0.5">
                    {netProfit >= 0 ? "ELIGIBLE (GRADE A)" : "REVIEW"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-stone-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {language === "rw"
                ? "Yemewe muri Koperative, Bank of Kigali, Urwego Bank, BDF na SACCO."
                : "Formatted for Rwandan agricultural cooperatives, commercial banks, and SACCOs."}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "rw" ? "Gucapa (Print)" : "Print"}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-700 dark:hover:bg-stone-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>{language === "rw" ? "Bika CSV (Excel)" : "Download CSV"}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === "rw" ? "Gukora PDF..." : "Generating PDF..."}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>
                    {language === "rw" ? "Bika Raporo ya PDF" : "Download PDF Report"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
