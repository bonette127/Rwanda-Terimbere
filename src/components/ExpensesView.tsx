import React, { useState } from "react";
import { Expense, ExpenseCategory, Farm, Language } from "../types";
import { getTranslation } from "../i18n";
import {
  Receipt,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingDown,
  Wheat,
  Shovel,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Download,
  HardDriveDownload,
} from "lucide-react";
import { CsvImportModal } from "./CsvImportModal";
import {
  exportFarmPerformancePdf,
  exportFarmPerformanceCsv,
} from "../utils/profitExport";

interface ExpensesViewProps {
  expenses: Expense[];
  farms: Farm[];
  language: Language;
  onAddExpense: (expense: Omit<Expense, "id" | "syncStatus">) => void;
  onAddExpensesBulk?: (expenses: Omit<Expense, "id" | "syncStatus">[]) => void;
  onDeleteExpense: (id: string) => void;
  isOnline: boolean;
  onOpenOfflineBackup?: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  farms,
  language,
  onAddExpense,
  onAddExpensesBulk,
  onDeleteExpense,
  isOnline,
  onOpenOfflineBackup,
}) => {
  const t = getTranslation(language);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterFarm, setFilterFarm] = useState<string>("all");

  // Form state
  const [farmId, setFarmId] = useState(farms[0]?.id || "");
  const [crop, setCrop] = useState("Ibirayi (Kinigi)");
  const [category, setCategory] = useState<ExpenseCategory>("seeds");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterFarm !== "all" && e.farmId !== filterFarm) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    const farm = farms.find((f) => f.id === farmId) || farms[0];
    onAddExpense({
      farmId: farm ? farm.id : "farm-1",
      farmName: farm ? farm.name : "Umurima",
      crop,
      category,
      amount: parseFloat(amount),
      description: description.trim() || `${category} - ${crop}`,
      date,
    });

    setAmount("");
    setDescription("");
    setIsModalOpen(false);
  };

  const categoryLabels: Record<ExpenseCategory, string> = {
    seeds: t.expenseSeeds,
    fertilizer: t.expenseFertilizer,
    pesticides: t.expensePesticides,
    labor: t.expenseLabor,
    irrigation: t.expenseIrrigation,
    transport: t.expenseTransport,
    equipment: t.expenseEquipment,
    other: t.expenseOther,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            {t.expensesTitle}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {t.expensesSubtitle}
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
          <button
            onClick={() => {
              const primaryFarm = farms[0] || { name: "Umurima", district: "Musanze" };
              exportFarmPerformancePdf({
                farmerName: "Jean Baptiste Hakizimana",
                farmName: primaryFarm.name,
                district: primaryFarm.district,
                language,
                expenses,
                harvests: [],
                sales: [],
                farms,
              });
            }}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
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
                harvests: [],
                sales: [],
                farms,
              });
            }}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-700" />
            <span>{language === "rw" ? "Bika CSV" : "Export CSV"}</span>
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800 font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{language === "rw" ? "Injiza CSV ya MoMo" : "Import CSV"}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.totalSpent}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
            {totalSpent.toLocaleString()} <span className="text-sm font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            {expenses.length} {language === "rw" ? "Inyemezabwishyu zose" : "transactions recorded"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.expenseSeeds} & {t.expenseFertilizer}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
            {expenses
              .filter((e) => e.category === "seeds" || e.category === "fertilizer")
              .reduce((acc, e) => acc + e.amount, 0)
              .toLocaleString()}{" "}
            <span className="text-sm font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            {language === "rw" ? "Ibikoresho by'ibanze mu murima" : "Primary farm inputs"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {t.expenseLabor} (Ibiraka)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
            {expenses
              .filter((e) => e.category === "labor")
              .reduce((acc, e) => acc + e.amount, 0)
              .toLocaleString()}{" "}
            <span className="text-sm font-bold text-stone-500">RWF</span>
          </div>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            {language === "rw" ? "Guharura, gutera no kubagara" : "Field workers compensation"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{t.filter}:</span>
          </span>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-medium"
          >
            <option value="all">{t.all} - Ibyiciro</option>
            <option value="seeds">{t.expenseSeeds}</option>
            <option value="fertilizer">{t.expenseFertilizer}</option>
            <option value="pesticides">{t.expensePesticides}</option>
            <option value="labor">{t.expenseLabor}</option>
            <option value="irrigation">{t.expenseIrrigation}</option>
            <option value="transport">{t.expenseTransport}</option>
            <option value="equipment">{t.expenseEquipment}</option>
            <option value="other">{t.expenseOther}</option>
          </select>

          <select
            value={filterFarm}
            onChange={(e) => setFilterFarm(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white font-medium"
          >
            <option value="all">{t.all} - Imirima</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-stone-500">
          Ibyabonetse: <strong>{filteredExpenses.length}</strong>
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            Nta mafaranga yakoreshejwe ahuye n'ibyo wahisemo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{t.date}</th>
                  <th className="px-5 py-3.5">{t.category}</th>
                  <th className="px-5 py-3.5">{t.farmName} & Igihingwa</th>
                  <th className="px-5 py-3.5">Ibisobanuro (Description)</th>
                  <th className="px-5 py-3.5 text-right">{t.amount}</th>
                  <th className="px-5 py-3.5 text-center">{t.status}</th>
                  <th className="px-5 py-3.5 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-stone-600">
                      {exp.date}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-stone-100 text-stone-800">
                        {categoryLabels[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-stone-900 text-xs">{exp.farmName}</div>
                      <div className="text-[11px] text-emerald-800">{exp.crop}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-600 max-w-xs truncate font-medium">
                      {exp.description}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right font-black text-stone-900">
                      {exp.amount.toLocaleString()} <span className="text-[10px] font-bold text-stone-400">RWF</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      {exp.syncStatus === "synced" ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.synced}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>offline_pending</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="text-stone-400 hover:text-rose-600 transition-colors p-1"
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

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-bold text-stone-900">{t.addExpense}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Umurima (Farm) *
                </label>
                <select
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Igihingwa (Crop)
                  </label>
                  <input
                    type="text"
                    required
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {t.category} *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  >
                    <option value="seeds">{t.expenseSeeds}</option>
                    <option value="fertilizer">{t.expenseFertilizer}</option>
                    <option value="pesticides">{t.expensePesticides}</option>
                    <option value="labor">{t.expenseLabor}</option>
                    <option value="irrigation">{t.expenseIrrigation}</option>
                    <option value="transport">{t.expenseTransport}</option>
                    <option value="equipment">{t.expenseEquipment}</option>
                    <option value="other">{t.expenseOther}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Amafaranga yakoreshejwe (RWF) *
                </label>
                <input
                  type="number"
                  step="500"
                  required
                  placeholder="Urugero: 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl font-bold text-base focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ibisobanuro birambuye (Description)
                </label>
                <input
                  type="text"
                  placeholder="Urugero: Imifuka 2 ya NPK 17-17-17 ku mucuruzi wa Kinigi"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.date}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              {!isOnline && (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200">
                  ⚠️ Ubu uri offline. Aya mafaranga azabikwa ku bikoresho byawe ako kanya, azahuzwa na seriveri nugaruka kuri murandasi.
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-50"
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

      {/* CSV Import Modal for MoMo & Bank Statements */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        mode="expenses"
        farms={farms}
        language={language}
        onImportExpenses={(importedList) => {
          if (onAddExpensesBulk) {
            onAddExpensesBulk(importedList);
          } else {
            importedList.forEach((e) => onAddExpense(e));
          }
        }}
      />
    </div>
  );
};
