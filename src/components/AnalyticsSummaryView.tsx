import React, { useState } from "react";
import { Language, FarmPlan, Expense, HarvestRecord, SaleRecord } from "../types";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  CheckCircle2,
  Filter
} from "lucide-react";

interface AnalyticsSummaryViewProps {
  plans: FarmPlan[];
  expenses: Expense[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  language: Language;
}

export const AnalyticsSummaryView: React.FC<AnalyticsSummaryViewProps> = ({
  plans,
  expenses,
  harvests,
  sales,
  language,
}) => {
  const [seasonFilter, setSeasonFilter] = useState("This Season");

  // Screen 10 specific figures from flyer photo
  const cropPerformance = [
    { crop: "Ibirayi", revenueRwf: 1800000, color: "bg-emerald-600", width: "85%" },
    { crop: "Ibigori", revenueRwf: 1200000, color: "bg-amber-500", width: "58%" },
    { crop: "Inyanya", revenueRwf: 1500000, color: "bg-teal-600", width: "70%" },
  ];

  const expenseBreakdown = [
    { name: "Labor (Abakozi)", percentage: 33, amount: 150000, color: "#059669" },
    { name: "Seeds (Imbuto)", percentage: 26, amount: 120000, color: "#10b981" },
    { name: "Fertilizer (Ifumbire)", percentage: 21, amount: 80000, color: "#d97706" },
    { name: "Pesticides (Imiti)", percentage: 11, amount: 50000, color: "#3b82f6" },
    { name: "Others (Transport)", percentage: 9, amount: 30000, color: "#6b7280" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Filter */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
            Screen 10 • Analytics Summary
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white mt-1">
            {language === "rw" ? "Isesengura ry'Umurima (Analytics)" : "Farm Analytics & Performance"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {language === "rw"
              ? "Reba uburyo buri gihingwa cyinjije amafaranga n'uko amafaranga yakoreshejwe."
              : "Review crop revenue comparison and precise expense distributions."}
          </p>
        </div>

        {/* Season dropdown matching photo "This Season ▾" */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-white shadow-2xs focus:outline-hidden"
          >
            <option value="This Season">This Season (2025B) ▾</option>
            <option value="Last Season">Last Season (2025A) ▾</option>
            <option value="All Time">All Time (2024 - 2026) ▾</option>
          </select>
        </div>
      </div>

      {/* Screen 10 Dual Visual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crop Performance Bar Chart */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Crop Performance (Amafaranga Yinjiye)</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Total: 4.5M RWF
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {cropPerformance.map((item) => (
              <div key={item.crop} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                  <span>{item.crop}</span>
                  <span className="text-emerald-800 dark:text-emerald-400">
                    {item.revenueRwf.toLocaleString()} RWF
                  </span>
                </div>
                <div className="w-full h-4 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
            🌱 <strong>Ibyavuye mu isesengura:</strong> Ibirayi nibyo byinjije amafaranga menshi (1.8M RWF), bikurikiwe n'Inyanya (1.5M RWF).
          </div>
        </div>

        {/* Expense Breakdown matching photo donut chart */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-amber-600" />
              <span>Expense Breakdown (Ibyakoreshejwe)</span>
            </h3>
            <span className="text-xs font-bold text-stone-500">
              Total: 430,000 RWF
            </span>
          </div>

          {/* SVG Donut Visual representation */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* 33% Labor */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#059669" strokeWidth="6" strokeDasharray="33 67" strokeDashoffset="0" />
                {/* 26% Seeds */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray="26 74" strokeDashoffset="-33" />
                {/* 21% Fertilizer */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#d97706" strokeWidth="6" strokeDasharray="21 79" strokeDashoffset="-59" />
                {/* 11% Pesticides */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#3b82f6" strokeWidth="6" strokeDasharray="11 89" strokeDashoffset="-80" />
                {/* 9% Others */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#6b7280" strokeWidth="6" strokeDasharray="9 91" strokeDashoffset="-91" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black text-stone-800 dark:text-white">100%</span>
                <span className="text-[9px] text-stone-500">Expenses</span>
              </div>
            </div>

            <div className="space-y-1.5 w-full text-xs">
              {expenseBreakdown.map((e) => (
                <div key={e.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-stone-700 dark:text-stone-300 font-medium">{e.name}</span>
                  </div>
                  <span className="font-bold text-stone-900 dark:text-white">{e.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
