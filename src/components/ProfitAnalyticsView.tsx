import React, { useState } from "react";
import {
  Expense,
  Farm,
  FarmActivity,
  FarmPlan,
  HarvestRecord,
  Language,
  SaleRecord,
  User,
} from "../types";
import { getTranslation } from "../i18n";
import {
  TrendingUp,
  PieChart,
  Scale,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  X,
  Share2,
  Landmark,
} from "lucide-react";
import {
  exportFarmPerformanceCsv,
  exportFarmPerformancePdf,
  exportProfitSummaryJson,
} from "../utils/profitExport";
import { BankLoanReportModal } from "./BankLoanReportModal";

interface ProfitAnalyticsViewProps {
  expenses: Expense[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  language: Language;
  farms?: Farm[];
  plans?: FarmPlan[];
  activities?: FarmActivity[];
  currentUser?: User | null;
  onShowToast?: (message: string) => void;
}

export const ProfitAnalyticsView: React.FC<ProfitAnalyticsViewProps> = ({
  expenses,
  harvests,
  sales,
  language,
  farms = [],
  plans = [],
  activities = [],
  currentUser,
  onShowToast,
}) => {
  const t = getTranslation(language);

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "csv" | "json">("pdf");
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const netProfit = totalRevenue - totalExpenses;
  const roi = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : 0;

  const totalHarvestedKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const totalSoldKg = sales.reduce((acc, s) => acc + s.quantityKg, 0);

  const costPerKg = totalHarvestedKg > 0 ? Math.round(totalExpenses / totalHarvestedKg) : 0;
  const avgSellingPrice = totalSoldKg > 0 ? Math.round(totalRevenue / totalSoldKg) : 0;
  const marginPerKg = avgSellingPrice - costPerKg;

  const primaryFarm = farms[0] || {
    name: "Umurima w'Ibirayi (Kinigi)",
    district: "Musanze",
  };
  const farmerName = currentUser?.name || "Jean Baptiste Hakizimana";

  // Unified Brand Color Palette only (Forest Emerald, Warm Harvest Amber, Stone Neutral)
  const categories = [
    { key: "seeds", label: t.expenseSeeds, color: "bg-emerald-800" },
    { key: "fertilizer", label: t.expenseFertilizer, color: "bg-emerald-600" },
    { key: "labor", label: t.expenseLabor, color: "bg-amber-600" },
    { key: "pesticides", label: t.expensePesticides, color: "bg-emerald-500" },
    { key: "transport", label: t.expenseTransport, color: "bg-amber-500" },
    { key: "other", label: t.expenseOther, color: "bg-stone-500" },
  ];

  const categoryTotals = categories.map((cat) => {
    const amount = expenses
      .filter((e) => e.category === cat.key)
      .reduce((acc, e) => acc + e.amount, 0);
    const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
    return { ...cat, amount, pct };
  });

  const notifyUser = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
    if (onShowToast) {
      onShowToast(msg);
    }
  };

  const handleExportPdf = () => {
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
      seasonCode: "2026B",
    });
    notifyUser(
      language === "rw"
        ? "Raporo y'umurima n'imari yabitswe nka PDF!"
        : "Official Farm & Financial Performance PDF Report downloaded!"
    );
  };

  const handleExportCsv = () => {
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
      seasonCode: "2026B",
    });
    notifyUser(
      language === "rw"
        ? "Imbonerahamwe y'imari n'umusaruro yabitswe nka CSV (Excel)!"
        : "Farm performance & financial ledger exported as CSV!"
    );
  };

  const handleExportJson = () => {
    exportProfitSummaryJson({
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
    });
    notifyUser(
      language === "rw"
        ? "Incamake y'inyungu yabitswe nka JSON!"
        : "Financial summary exported as JSON!"
    );
  };

  const handleCopyJson = async () => {
    const payload = {
      app: "TERIMBERE",
      generatedAt: new Date().toISOString(),
      farmer: farmerName,
      farm: primaryFarm.name,
      currency: "RWF",
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        roiPercentage: roi,
        totalHarvestedKg,
        totalSoldKg,
        costPerKg,
        avgSellingPrice,
        marginPerKg,
      },
      categoryTotals,
      salesCount: sales.length,
      expensesCount: expenses.length,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedFormat("json");
      setTimeout(() => setCopiedFormat(null), 2500);
      notifyUser(
        language === "rw"
          ? "Amakuru ya JSON yakoporowe!"
          : "JSON data copied to clipboard!"
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Export & Reports Bar */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 block mb-1">
            {language === "rw"
              ? "ISESENGURA RY'INYUNGU & RAPORO ZA BANKI"
              : "FINANCIAL ANALYTICS & COOPERATIVE/BANK EXPORTS"}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            {t.profitTitle}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {t.profitSubtitle}
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct PDF Download */}
          <button
            onClick={handleExportPdf}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>{language === "rw" ? "Bika Raporo ya PDF" : "Export PDF Report"}</span>
          </button>

          {/* Direct CSV Download */}
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>{language === "rw" ? "Bika CSV (Excel)" : "Export CSV"}</span>
          </button>

          {/* Bank & Cooperative Preview Modal */}
          <button
            onClick={() => setIsBankModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            <Landmark className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>{language === "rw" ? "Icyemezo cya Banki" : "Bank Dossier"}</span>
          </button>

          {/* More Export Options Modal Trigger */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            title={language === "rw" ? "Amahitamo yose yo kubika" : "All export formats"}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main P&L Big KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            {t.grossRevenue}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mt-1 tabular-nums">
            {totalRevenue.toLocaleString()}{" "}
            <span className="text-xs font-bold text-stone-500">RWF</span>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-emerald-800 dark:text-emerald-400 mt-2 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            {totalSoldKg.toLocaleString()} Kg {t.sold}
          </span>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            {t.totalInvestment}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mt-1 tabular-nums">
            {totalExpenses.toLocaleString()}{" "}
            <span className="text-xs font-bold text-stone-500">RWF</span>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-stone-600 dark:text-stone-300 mt-2 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
            {expenses.length} {language === "rw" ? "inyemezabwishyu" : "records"}
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            {t.netProfit}
          </span>
          <div
            className={`text-2xl sm:text-3xl font-black mt-1 tabular-nums ${
              netProfit >= 0
                ? "text-emerald-800 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {netProfit >= 0 ? "+" : ""}
            {netProfit.toLocaleString()}{" "}
            <span className="text-xs font-bold text-stone-500">RWF</span>
          </div>
          <span
            className={`inline-flex items-center text-xs font-bold mt-2 px-2 py-0.5 rounded-md ${
              netProfit >= 0
                ? "text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60"
                : "text-amber-800 bg-amber-50 dark:bg-amber-950/60"
            }`}
          >
            ROI: {roi}%
          </span>
        </div>

        {/* Profit per Kg */}
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            {language === "rw" ? "Inyungu ku Kilo (Margin/Kg)" : "Profit Margin / Kg"}
          </span>
          <div
            className={`text-2xl sm:text-3xl font-black mt-1 tabular-nums ${
              marginPerKg >= 0
                ? "text-emerald-800 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {marginPerKg >= 0 ? "+" : ""}
            {marginPerKg} <span className="text-xs font-bold text-stone-500">RWF/kg</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
            {language === "rw" ? "Ikiguzi:" : "Cost:"} <strong>{costPerKg} RWF</strong> |{" "}
            {language === "rw" ? "Igurishwa:" : "Price:"}{" "}
            <strong>{avgSellingPrice} RWF</strong>
          </p>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Structure & Distribution */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {language === "rw"
                ? "Uko amafaranga yakoreshejwe (Cost Breakdown)"
                : "Cost Distribution"}
            </h3>
          </div>

          <div className="space-y-3">
            {categoryTotals.map((cat) => (
              <div key={cat.key} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <span>{cat.label}</span>
                  <span className="tabular-nums">
                    {cat.amount.toLocaleString()} RWF ({cat.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.color}`}
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 space-y-1">
            <span className="font-bold text-stone-900 dark:text-white block">
              {language === "rw"
                ? "Isesengura rya TERIMBERE:"
                : "TERIMBERE Agri-Insight:"}
            </span>
            <p>
              {language === "rw"
                ? "Amafaranga menshi yagiye mu mbuto n'ifumbire, ibi ni byiza mu buhinzi bw'umwuga buzahesha umusaruro mwinshi kandi bigashimangira icyizere muri Koperative na Banki."
                : "Investing primarily in certified seeds and balanced fertilizers aligns with RAB standards and strengthens creditworthiness with agricultural lenders."}
            </p>
          </div>
        </div>

        {/* Rwandan Agriculture Benchmarking */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {language === "rw"
                ? "Ugereranyije n'ibipimo bya RAB mu Rwanda"
                : "Rwanda Ag Benchmark"}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                  {language === "rw"
                    ? "Ikiguzi cyo guhinga ikilo kimwe (Cost/Kg):"
                    : "Production Cost per Kg:"}{" "}
                  {costPerKg} RWF
                </span>
                <p className="text-stone-600 dark:text-stone-300 mt-0.5">
                  {language === "rw"
                    ? `Mu misozi miremire ya Musanze na Nyabihu, ikiguzi cy'ibirayi kiri hagati ya 120 - 160 RWF/kg. Ikiguzi cyawe cya ${costPerKg} RWF kiri mu rugero rwiza rw'ubuhinzi butanga inyungu.`
                    : `In Rwandan volcanic soils, average potato production cost ranges between 120 - 160 RWF/kg. Your cost of ${costPerKg} RWF represents efficient operational management.`}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block">
                  {language === "rw"
                    ? "Igiciro cyo kugurisha (Selling Price):"
                    : "Selling Price:"}{" "}
                  {avgSellingPrice} RWF/kg
                </span>
                <p className="text-stone-600 dark:text-stone-300 mt-0.5">
                  {language === "rw"
                    ? `Ugurisheje koperative cyangwa abacuruzi banini ku giciro cya ${avgSellingPrice} RWF, usigarana inyungu ya ${marginPerKg} RWF kuri buri kilo.`
                    : `Selling to cooperatives and wholesale traders at ${avgSellingPrice} RWF yields a net operating profit margin of ${marginPerKg} RWF per kg.`}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950 dark:text-amber-200 block">
                  {language === "rw"
                    ? "Inama yo kongera inyungu (Profit Maximization):"
                    : "Profit Maximization Advice:"}
                </span>
                <p className="text-stone-700 dark:text-stone-300 mt-0.5">
                  {language === "rw"
                    ? "Koresha Raporo ya PDF cyangwa CSV igaragaza imirima yawe n'umusaruro kugira ngo ubone inguzanyo y'inyongeramusaruro ku nyungu nto muri SACCO cyangwa Banki."
                    : "Share your exported PDF or CSV performance dossier with your cooperative or SACCO to qualify for low-interest seasonal input financing."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    {language === "rw"
                      ? "Bika Raporo y'Umurima n'Imari (PDF / CSV)"
                      : "Export Farm & Financial Records"}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {language === "rw"
                      ? "Hitamo ubwoko bw'idosiye yo gusangiza Koperative cyangwa Banki"
                      : "Select format to share with cooperatives, banks, or accounting"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-stone-400 font-medium block">
                    {language === "rw" ? "Amafaranga Yinjiye" : "Total Revenue"}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-white tabular-nums">
                    {totalRevenue.toLocaleString()} RWF
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium block">
                    {language === "rw" ? "Ayakoreshejwe" : "Total Expenses"}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-white tabular-nums">
                    {totalExpenses.toLocaleString()} RWF
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium block">
                    {language === "rw" ? "Inyungu Isigaye" : "Net Profit"}
                  </span>
                  <span
                    className={`font-black tabular-nums ${
                      netProfit >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-amber-700"
                    }`}
                  >
                    {netProfit.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* PDF Card */}
                <div
                  onClick={() => setSelectedFormat("pdf")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                    selectedFormat === "pdf"
                      ? "border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30"
                      : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-white text-sm">
                        Official PDF Report (.pdf)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        Bank & Cooperative Ready
                      </span>
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 mt-1">
                      {language === "rw"
                        ? "Raporo yuzuye irimo imirima ya GPS, umusaruro, inyungu, n'imikono yo gusaba inguzanyo muri Banki cyangwa Koperative."
                        : "Multi-section PDF dossier with farm GPS parcels, harvest batches, expense audit, and signature blocks for banks and cooperatives."}
                    </p>
                  </div>
                </div>

                {/* CSV Card */}
                <div
                  onClick={() => setSelectedFormat("csv")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                    selectedFormat === "csv"
                      ? "border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30"
                      : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-white text-sm">
                        CSV Spreadsheet (.csv)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        Excel / Google Sheets
                      </span>
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 mt-1">
                      {language === "rw"
                        ? "Imbonerahamwe ya Excel irimo incamake y'imari, imirima yanditswe, amafaranga yakoreshejwe, n'umusaruro wagurishijwe."
                        : "Complete spreadsheet with executive KPIs, registered farm parcels, itemized expenses, harvest batches, and sales ledger."}
                    </p>
                  </div>
                </div>

                {/* JSON Card */}
                <div
                  onClick={() => setSelectedFormat("json")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                    selectedFormat === "json"
                      ? "border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30"
                      : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-white text-sm">
                        JSON Data Backup (.json)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        System Backup
                      </span>
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 mt-1">
                      {language === "rw"
                        ? "Kopi y'amakuru yose mu buryo bwa porogaramu."
                        : "Structured machine-readable data archive."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                {selectedFormat === "json" && (
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center space-x-1 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900"
                  >
                    {copiedFormat === "json" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700"
                >
                  {language === "rw" ? "Funga" : "Close"}
                </button>

                <button
                  onClick={() => {
                    if (selectedFormat === "pdf") {
                      handleExportPdf();
                    } else if (selectedFormat === "csv") {
                      handleExportCsv();
                    } else {
                      handleExportJson();
                    }
                    setIsExportModalOpen(false);
                  }}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {selectedFormat === "pdf"
                      ? language === "rw"
                        ? "Kuramo PDF"
                        : "Download PDF"
                      : selectedFormat === "csv"
                      ? language === "rw"
                        ? "Kuramo CSV"
                        : "Download CSV"
                      : "Download JSON"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank / Cooperative Loan Dossier Modal */}
      <BankLoanReportModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        language={language}
        farms={farms}
        harvests={harvests}
        sales={sales}
        expenses={expenses}
        plans={plans}
        activities={activities}
        currentUser={currentUser}
        seasonCode="2026B"
      />
    </div>
  );
};
