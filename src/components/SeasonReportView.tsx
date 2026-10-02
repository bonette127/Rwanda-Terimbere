import React, { useState } from "react";
import { 
  Farm, 
  FarmPlan, 
  Expense, 
  FarmActivity, 
  HarvestRecord, 
  SaleRecord, 
  Language,
  CultivationCycleStage,
  User 
} from "../types";
import { cultivationCycleStages } from "../data/mockData";
import { BankLoanReportModal } from "./BankLoanReportModal";
import {
  exportFarmPerformancePdf,
  exportFarmPerformanceCsv,
} from "../utils/profitExport";
import { 
  Calendar, 
  Sprout, 
  TrendingUp, 
  Receipt, 
  ShoppingBag, 
  CheckCircle2, 
  Printer, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  FileText,
  FileSpreadsheet,
  Layers,
  BarChart3,
  CalendarRange,
  Download,
  Landmark,
} from "lucide-react";

interface SeasonReportViewProps {
  farms: Farm[];
  plans: FarmPlan[];
  expenses: Expense[];
  activities: FarmActivity[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  language: Language;
  currentUser?: User | null;
}

type ReportViewMode = "cycle" | "monthly" | "annual" | "seasons";

export const SeasonReportView: React.FC<SeasonReportViewProps> = ({
  farms,
  plans,
  expenses,
  activities,
  harvests,
  sales,
  language,
  currentUser,
}) => {
  const [viewMode, setViewMode] = useState<ReportViewMode>("cycle");
  const [selectedMonth, setSelectedMonth] = useState<string>("Mar 2025");
  const [selectedSeasonCode, setSelectedSeasonCode] = useState<string>("2025B");
  const [cycleStages, setCycleStages] = useState<CultivationCycleStage[]>(cultivationCycleStages);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // Financial totals
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalHarvestKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const totalSalesAmount = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const totalSoldKg = sales.reduce((acc, s) => acc + s.quantityKg, 0);
  const netProfit = totalSalesAmount - totalExpenseAmount;
  const roi = totalExpenseAmount > 0 ? Math.round((netProfit / totalExpenseAmount) * 100) : 0;

  const handleToggleTask = (stageNum: number, taskIndex: number) => {
    // Interactive progress tracking
    setCycleStages((prev) =>
      prev.map((s) => {
        if (s.stageNumber === stageNum) {
          return {
            ...s,
            status: s.status === "completed" ? "current" : "completed",
          };
        }
        return s;
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const primaryFarm = farms[0] || {
    name: "Umurima w'Ibirayi (Kinigi)",
    district: "Musanze",
  };
  const farmerName = currentUser?.name || "Jean Baptiste Hakizimana";

  const handleExportPdfDirect = () => {
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
      seasonCode: selectedSeasonCode,
    });
  };

  const handleExportCsvDirect = () => {
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
      seasonCode: selectedSeasonCode,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-navigation */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full Cultivation Cycle & Performance Reports</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
              {language === "rw"
                ? "Gahunda y'Ubuhinzi & Raporo z'Ibihembwe"
                : "Cultivation Cycle Tracking & Season Reports"}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-2xl">
              {language === "rw"
                ? "Kurikirana igihingwa kuva ku butaka kugeza gusarura, hamwe na raporo z'amezi, umwaka, n'igihembwe."
                : "Track the complete lifecycle from soil prep to sales with monthly, annual, and season breakdowns."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPdfDirect}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>{language === "rw" ? "Bika Raporo ya PDF" : "Export PDF"}</span>
            </button>
            <button
              onClick={handleExportCsvDirect}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{language === "rw" ? "Bika CSV" : "Export CSV"}</span>
            </button>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-amber-700" />
              <span>{language === "rw" ? "Icyemezo cya Banki" : "Bank Dossier"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "rw" ? "Gucapa" : "Print"}</span>
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex space-x-2 overflow-x-auto mt-6 pt-4 border-t border-stone-100 dark:border-stone-700">
          {[
            { id: "cycle", label: language === "rw" ? "Inzira y'Ubuhinzi (Cultivation Cycle)" : "Cultivation Cycle (6 Stages)", icon: <Layers className="w-4 h-4" /> },
            { id: "seasons", label: language === "rw" ? "Raporo y'Igihembwe (Season Report)" : "Season 2025B Report", icon: <Calendar className="w-4 h-4" /> },
            { id: "monthly", label: language === "rw" ? "Raporo y'Amezi (Monthly Summary)" : "Monthly Summary", icon: <CalendarRange className="w-4 h-4" /> },
            { id: "annual", label: language === "rw" ? "Raporo y'Umwaka (Annual Summary)" : "Annual Summary", icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ReportViewMode)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                viewMode === tab.id
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-stone-100 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: FULL CULTIVATION CYCLE (STAGES 1 to 6) */}
      {viewMode === "cycle" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  {language === "rw" ? "Umurima: Ibirayi Farm (0.5 Ha • Musanze)" : "Active Farm: Ibirayi Farm (0.5 Ha • Musanze)"}
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {language === "rw" ? "Igihembwe cya 2025B (Itumba) • Ubu turi mu cyiciro cya 3 (Kubagara & Gufumbira)" : "Season 2025B • Currently on Stage 3 (Weeding & Top-Dressing)"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-600 text-white rounded-full">
              Stage 3 / 6
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cycleStages.map((stage) => {
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";

              return (
                <div
                  key={stage.stageNumber}
                  className={`rounded-2xl p-5 border transition-all ${
                    isCurrent
                      ? "bg-white dark:bg-stone-800 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                      : isCompleted
                      ? "bg-stone-50/80 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700"
                      : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 opacity-90"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      {stage.periodWeeks}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : isCurrent
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                          : "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {isCompleted ? "Byararangiye" : isCurrent ? "Birakorwa ubu" : "Bizakorwa"}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 dark:text-white leading-snug">
                    {stage.nameRw}
                  </h4>

                  {/* Tasks List */}
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase">
                      Ibikorwa by'ingenzi:
                    </p>
                    {stage.tasks.map((task, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs text-stone-700 dark:text-stone-300">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isCompleted ? "text-emerald-600" : "text-stone-400"
                          }`}
                        />
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>

                  {/* Key Inputs */}
                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">
                      Imiti & Ifumbire (Inputs):
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stage.keyInputs.map((input, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-[10px] font-medium"
                        >
                          {input}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* RAB Agronomy Advice */}
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/50 text-[11px] text-emerald-950 dark:text-emerald-200">
                    <strong className="block text-[10px] uppercase text-emerald-800 dark:text-emerald-400">
                      Inama ya RAB:
                    </strong>
                    {stage.rabAdvice}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SEASON SPECIFIC REPORT (2025B) */}
      {viewMode === "seasons" && (
        <div className="space-y-6">
          {/* Bank Loan Application / Cooperative Dossier CTA Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-emerald-800/60">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                  <span>{language === "rw" ? "Icyemezo Cyemewe cyo Kwaka Inguzanyo muri Banki" : "Certified Agri-Credit Performance Dossier"}</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-emerald-950">
                    PDF Export
                  </span>
                </h4>
                <p className="text-xs text-emerald-200/90 mt-0.5 max-w-xl">
                  {language === "rw"
                    ? "Koresha iyi raporo yujuje ibisabwa na Bank of Kigali, Urwego, BDF, na SACCO igaragaza umusaruro wa 7,200 kg, inyungu isukuye ya 1,810,000 RWF na ROI ya 420%."
                    : "Certified performance document ready for credit risk appraisal by commercial banks and cooperative loan boards."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs sm:text-sm shrink-0 transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{language === "rw" ? "Kuramo PDF ya Banki" : "Download Loan PDF"}</span>
            </button>
          </div>

          {/* Season KPIs matching image values */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Umusaruro Wasaruwe</span>
              <div className="mt-1 text-2xl font-black text-stone-900 dark:text-white">
                7,200 <span className="text-xs font-bold text-stone-500">kg</span>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Ubuziranenge bwa Grade A (Good)
              </p>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Amafaranga Yakoreshejwe</span>
              <div className="mt-1 text-2xl font-black text-stone-900 dark:text-white">
                430,000 <span className="text-xs font-bold text-stone-500">RWF</span>
              </div>
              <p className="text-xs text-amber-700 font-semibold mt-1">
                Imbuto, Ifumbire, Abakozi, Imiti
              </p>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Amafaranga Yinjiye</span>
              <div className="mt-1 text-2xl font-black text-stone-900 dark:text-white">
                2,240,000 <span className="text-xs font-bold text-stone-500">RWF</span>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                7,000 kg zikagurishwa kuri 320 RWF/kg
              </p>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Inyungu Isukuye (Net Profit)</span>
              <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">
                +1,810,000 <span className="text-xs font-bold text-stone-500">RWF</span>
              </div>
              <p className="text-xs text-emerald-800 font-bold mt-1">
                ROI: 420% kuri Igihembwe 2025B
              </p>
            </div>
          </div>

          {/* Harvest Breakdown vs Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span>Umusaruro n'Ubucuruzi (Harvest & Sales Log)</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-700/50 border border-stone-200 dark:border-stone-600">
                  <div className="flex justify-between font-bold text-stone-800 dark:text-stone-200">
                    <span>Isarura: Ibirayi bya Kinigi</span>
                    <span className="text-emerald-700 font-extrabold">7,200 kg</span>
                  </div>
                  <div className="text-stone-500 mt-1 flex justify-between">
                    <span>Itariki: 20 Jun 2025</span>
                    <span>Ubuziranenge: Grade A (Good)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex justify-between font-bold text-emerald-950 dark:text-emerald-200">
                    <span>Kugurisha: Koperative y'Abacuruzi (Kigali)</span>
                    <span className="text-emerald-700 font-extrabold">2,240,000 RWF</span>
                  </div>
                  <div className="text-emerald-800 dark:text-emerald-400 mt-1 flex justify-between">
                    <span>Ingano: 7,000 kg</span>
                    <span>Igiciro: 320 RWF/kg (MoMo)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <span>Ibyakoreshejwe muri Igihembwe (Expenses Breakdown)</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-700/50">
                  <span>Imbuto (Seeds - 10 Mar 2025)</span>
                  <span className="font-bold text-stone-900 dark:text-white">120,000 RWF</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-700/50">
                  <span>Ifumbire (Fertilizer - 15 Mar 2025)</span>
                  <span className="font-bold text-stone-900 dark:text-white">80,000 RWF</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-700/50">
                  <span>Abakozi (Labor - 20 Mar 2025)</span>
                  <span className="font-bold text-stone-900 dark:text-white">150,000 RWF</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-700/50">
                  <span>Imiti (Pesticides - 25 Mar 2025)</span>
                  <span className="font-bold text-stone-900 dark:text-white">50,000 RWF</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-700/50">
                  <span>Gutwara (Transport - 28 Mar 2025)</span>
                  <span className="font-bold text-stone-900 dark:text-white">30,000 RWF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY SUMMARY */}
      {viewMode === "monthly" && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {language === "rw" ? "Incamake y'Amezi y'Ubuhinzi (Monthly Cashflow & Tasks)" : "Monthly Cultivation Cashflow"}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw" ? "Reba ibyakozwe n'amafaranga yasohotse cyangwa yinjiye buri kwezi" : "Review work done and expenses logged month-by-month"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 uppercase font-bold">
                  <th className="py-2.5 px-3">Ukwezi (Month)</th>
                  <th className="py-2.5 px-3">Ibikorwa Byakozwe (Activities)</th>
                  <th className="py-2.5 px-3">Amafaranga Yasohotse (Expenses)</th>
                  <th className="py-2.5 px-3">Umusaruro (Yield)</th>
                  <th className="py-2.5 px-3">Amafaranga Yinjiye (Revenue)</th>
                  <th className="py-2.5 px-3 text-right">Inyungu (Net)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                <tr className="hover:bg-stone-50 dark:hover:bg-stone-700/40">
                  <td className="py-3 px-3 font-bold text-stone-900 dark:text-white">Werurwe (Mar 2025)</td>
                  <td className="py-3 px-3 text-stone-600 dark:text-stone-300">Guharura, gutera imbuto n'ifumbire</td>
                  <td className="py-3 px-3 font-bold text-amber-700">380,000 RWF</td>
                  <td className="py-3 px-3 text-stone-500">-</td>
                  <td className="py-3 px-3 text-stone-500">-</td>
                  <td className="py-3 px-3 text-right font-bold text-amber-700">-380,000 RWF</td>
                </tr>
                <tr className="hover:bg-stone-50 dark:hover:bg-stone-700/40">
                  <td className="py-3 px-3 font-bold text-stone-900 dark:text-white">Mata (Apr 2025)</td>
                  <td className="py-3 px-3 text-stone-600 dark:text-stone-300">Kubagara, gusasira, gutera umuti w'urume</td>
                  <td className="py-3 px-3 font-bold text-amber-700">50,000 RWF</td>
                  <td className="py-3 px-3 text-stone-500">-</td>
                  <td className="py-3 px-3 text-stone-500">-</td>
                  <td className="py-3 px-3 text-right font-bold text-amber-700">-50,000 RWF</td>
                </tr>
                <tr className="hover:bg-stone-50 dark:hover:bg-stone-700/40">
                  <td className="py-3 px-3 font-bold text-stone-900 dark:text-white">Gicurasi (May 2025)</td>
                  <td className="py-3 px-3 text-stone-600 dark:text-stone-300">Gukurikirana ikirere no gusuzuma ingiga</td>
                  <td className="py-3 px-3 font-bold text-stone-500">15,000 RWF</td>
                  <td className="py-3 px-3 text-stone-500">-</td>
                  <td className="py-3 px-3 text-stone-500">-</td>
                  <td className="py-3 px-3 text-right font-bold text-stone-500">-15,000 RWF</td>
                </tr>
                <tr className="hover:bg-stone-50 dark:hover:bg-stone-700/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <td className="py-3 px-3 font-bold text-emerald-900 dark:text-emerald-300">Kamena (Jun 2025)</td>
                  <td className="py-3 px-3 text-stone-600 dark:text-stone-300">Gusarura no kugurisha kuri Koperative</td>
                  <td className="py-3 px-3 font-bold text-stone-500">25,000 RWF</td>
                  <td className="py-3 px-3 font-bold text-emerald-700">7,200 kg</td>
                  <td className="py-3 px-3 font-bold text-emerald-700">2,240,000 RWF</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-700">+2,215,000 RWF</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: ANNUAL SUMMARY (2024 vs 2025 vs 2026) */}
      {viewMode === "annual" && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {language === "rw" ? "Raporo y'Umwaka (Annual Comparison 2024 - 2026)" : "Annual Farming Performance"}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw" ? "Uko inyungu n'umusaruro byazamutse uko wakoresheje Terimbere" : "Progress in yield, revenue, and profit over multi-year cultivation"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60">
              <span className="text-xs font-bold text-stone-500 uppercase">Umwaka wa 2024</span>
              <div className="text-xl font-black text-stone-800 dark:text-stone-100 mt-1">11,200 kg</div>
              <div className="mt-3 space-y-1 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex justify-between"><span>Amafaranga Yinjiye:</span> <span className="font-bold">2,800,000 RWF</span></div>
                <div className="flex justify-between"><span>Amafaranga Yasohotse:</span> <span className="font-bold">1,450,000 RWF</span></div>
                <div className="flex justify-between pt-1 border-t border-stone-200 dark:border-stone-700 font-bold text-emerald-700">
                  <span>Inyungu:</span> <span>+1,350,000 RWF</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">Umwaka wa 2025 (Terimbere)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">+28%</span>
              </div>
              <div className="text-xl font-black text-emerald-950 dark:text-emerald-100 mt-1">15,400 kg</div>
              <div className="mt-3 space-y-1 text-xs text-emerald-900 dark:text-emerald-300">
                <div className="flex justify-between"><span>Amafaranga Yinjiye:</span> <span className="font-bold">4,120,000 RWF</span></div>
                <div className="flex justify-between"><span>Amafaranga Yasohotse:</span> <span className="font-bold">1,620,000 RWF</span></div>
                <div className="flex justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800 font-black text-emerald-700 dark:text-emerald-400">
                  <span>Inyungu:</span> <span>+2,500,000 RWF</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60">
              <span className="text-xs font-bold text-stone-500 uppercase">Icyitegererezo 2026 (Projected)</span>
              <div className="text-xl font-black text-stone-800 dark:text-stone-100 mt-1">18,500 kg</div>
              <div className="mt-3 space-y-1 text-xs text-stone-600 dark:text-stone-400">
                <div className="flex justify-between"><span>Amafaranga Yinjiye:</span> <span className="font-bold">5,550,000 RWF</span></div>
                <div className="flex justify-between"><span>Amafaranga Yasohotse:</span> <span className="font-bold">1,850,000 RWF</span></div>
                <div className="flex justify-between pt-1 border-t border-stone-200 dark:border-stone-700 font-bold text-emerald-700">
                  <span>Inyungu Ityoza:</span> <span>+3,700,000 RWF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Bank Loan & Cooperative Performance Dossier Modal */}
      <BankLoanReportModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        language={language}
        farms={farms}
        harvests={harvests}
        sales={sales}
        expenses={expenses}
        currentUser={currentUser}
        seasonCode={selectedSeasonCode}
      />
    </div>
  );
};
