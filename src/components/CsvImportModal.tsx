import React, { useState, useRef, useEffect } from "react";
import {
  Expense,
  ExpenseCategory,
  Farm,
  HarvestRecord,
  Language,
  SaleRecord,
} from "../types";
import {
  parseCsvRaw,
  autoDetectColumns,
  guessExpenseCategory,
  guessPaymentMethod,
  guessBuyerType,
  cleanNumericValue,
  normalizeDate,
  ParsedCsvRow,
  CsvColumnMapping,
  SAMPLE_MOMO_EXPENSES_CSV,
  SAMPLE_BANK_EXPENSES_CSV,
  SAMPLE_MOMO_SALES_CSV,
  SAMPLE_BANK_SALES_CSV,
  SAMPLE_HARVEST_CSV,
} from "../utils/csvParser";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  RefreshCw,
  Building2,
  Smartphone,
  Check,
  ChevronRight,
  Filter,
  DollarSign,
  Package,
} from "lucide-react";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "expenses" | "harvest_sales";
  farms: Farm[];
  language: Language;
  onImportExpenses?: (expenses: Omit<Expense, "id" | "syncStatus">[]) => void;
  onImportSales?: (sales: Omit<SaleRecord, "id">[]) => void;
  onImportHarvests?: (harvests: Omit<HarvestRecord, "id">[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  mode,
  farms,
  language,
  onImportExpenses,
  onImportSales,
  onImportHarvests,
}) => {
  // In harvest_sales mode, let user pick between Sales and Harvest yield
  const [subMode, setSubMode] = useState<"sales" | "harvests">("sales");
  const activeMode = mode === "expenses" ? "expenses" : subMode;

  const [rawText, setRawText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>({
    dateCol: "",
    descriptionCol: "",
    amountCol: "",
  });
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || "farm-1");
  const [defaultCrop, setDefaultCrop] = useState<string>("Ibirayi (Kinigi)");

  // Step flow: "upload" -> "preview"
  const [currentStep, setCurrentStep] = useState<"upload" | "preview">("upload");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open or change of mode
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("upload");
      setRawText("");
      setFileName("");
      setHeaders([]);
      setRawRows([]);
      setParsedRows([]);
      if (farms[0]) {
        setSelectedFarmId(farms[0].id);
      }
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleProcessCsvText = (csvString: string, name: string) => {
    try {
      const { headers: parsedHeaders, rows: parsedRawRows } = parseCsvRaw(csvString);
      if (parsedHeaders.length === 0 || parsedRawRows.length === 0) {
        alert(
          language === "rw"
            ? "Dosiye ya CSV ntabwo irimo amakuru asomeka neza cyangwa irimo ubusa."
            : "The selected CSV file appears to be empty or contains invalid rows."
        );
        return;
      }

      setFileName(name);
      setHeaders(parsedHeaders);
      setRawRows(parsedRawRows);

      // Auto-detect columns
      const detected = autoDetectColumns(parsedHeaders, activeMode);
      setColumnMapping(detected);

      // Generate initial parsed rows
      generateParsedRows(parsedRawRows, detected, activeMode, selectedFarmId, defaultCrop);
      setCurrentStep("preview");
    } catch {
      alert(
        language === "rw"
          ? "Habaye ikibazo mu gusoma iyi dosiye ya CSV."
          : "An error occurred while parsing the CSV file."
      );
    }
  };

  const generateParsedRows = (
    rows: Record<string, string>[],
    mapping: CsvColumnMapping,
    currentActiveMode: "expenses" | "sales" | "harvests",
    farmIdTarget: string,
    cropTarget: string
  ) => {
    const selectedFarm = farms.find((f) => f.id === farmIdTarget) || farms[0];
    const resolvedFarmName = selectedFarm ? selectedFarm.name : "Umurima";

    const mapped: ParsedCsvRow[] = rows.map((r, index) => {
      const rawDate = mapping.dateCol ? r[mapping.dateCol] : "";
      const rawDesc = mapping.descriptionCol ? r[mapping.descriptionCol] : "";

      // Amount handling
      let rawAmount = mapping.amountCol ? r[mapping.amountCol] : "0";
      // If dual debit/credit, and current mode is sales, check creditCol
      if (currentActiveMode === "sales" && mapping.creditCol && r[mapping.creditCol]) {
        rawAmount = r[mapping.creditCol];
      }
      const numAmount = cleanNumericValue(rawAmount);

      const normalizedDate = normalizeDate(rawDate);
      const cleanDesc = rawDesc || `${currentActiveMode === "expenses" ? "Expense" : "Transaction"} #${index + 1}`;

      const rowId = `csv-row-${index}-${Date.now()}`;

      if (currentActiveMode === "expenses") {
        const cat = guessExpenseCategory(cleanDesc);
        const isValid = numAmount > 0;
        return {
          id: rowId,
          original: r,
          date: normalizedDate,
          description: cleanDesc,
          amount: numAmount,
          category: cat,
          farmId: farmIdTarget,
          crop: cropTarget,
          isValid,
          validationError: !isValid ? (language === "rw" ? "Amafaranga agomba kurenga 0" : "Amount must be > 0") : undefined,
          isSelected: isValid,
        };
      } else if (currentActiveMode === "sales") {
        const isValid = numAmount > 0;
        const buyer = mapping.buyerCol ? r[mapping.buyerCol] || cleanDesc : cleanDesc;
        const payment = guessPaymentMethod(cleanDesc + " " + buyer);
        const bType = guessBuyerType(buyer);
        // Estimate quantity or unit price if available
        const qty = mapping.qtyCol ? cleanNumericValue(r[mapping.qtyCol]) || 500 : 500;
        const unitPrice = qty > 0 ? Math.round(numAmount / qty) : 350;

        return {
          id: rowId,
          original: r,
          date: normalizedDate,
          description: cleanDesc,
          amount: numAmount,
          crop: cropTarget,
          farmId: farmIdTarget,
          buyerName: buyer,
          buyerType: bType,
          quantityKg: qty,
          unitPriceRwf: unitPrice,
          paymentMethod: payment,
          isValid,
          validationError: !isValid ? (language === "rw" ? "Amafaranga agomba kurenga 0" : "Amount must be > 0") : undefined,
          isSelected: isValid,
        };
      } else {
        // Harvests
        const rawQty = mapping.qtyCol ? r[mapping.qtyCol] : rawAmount;
        const numQty = cleanNumericValue(rawQty);
        const isValid = numQty > 0;
        const batch = r["Batch Code"] || r["batch_code"] || `RW-HARV-IMP-${index + 1}`;
        const grade = (r["Quality Grade"] || r["grade"] || "A").toUpperCase() as "A" | "B" | "C";
        const loc = r["Storage Location"] || r["location"] || "Ububiko bwa Koperative";

        return {
          id: rowId,
          original: r,
          date: normalizedDate,
          description: cleanDesc,
          amount: numQty,
          quantityKg: numQty,
          qualityGrade: ["A", "B", "C"].includes(grade) ? grade : "A",
          storageLocation: loc,
          batchCode: batch,
          crop: mapping.cropCol && r[mapping.cropCol] ? r[mapping.cropCol] : cropTarget,
          farmId: farmIdTarget,
          isValid,
          validationError: !isValid ? (language === "rw" ? "Ibiro bigomba kurenga 0" : "Quantity must be > 0") : undefined,
          isSelected: isValid,
        };
      }
    });

    setParsedRows(mapped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sampleType: "momo_expenses" | "bank_expenses" | "momo_sales" | "bank_sales" | "harvest") => {
    let csv = "";
    let name = "";
    if (sampleType === "momo_expenses") {
      csv = SAMPLE_MOMO_EXPENSES_CSV;
      name = "MTN_MoMo_Statement_Agri_Expenses.csv";
    } else if (sampleType === "bank_expenses") {
      csv = SAMPLE_BANK_EXPENSES_CSV;
      name = "Bank_Of_Kigali_Statement_Farm_Expenses.csv";
    } else if (sampleType === "momo_sales") {
      csv = SAMPLE_MOMO_SALES_CSV;
      name = "MTN_MoMo_Statement_Crop_Sales.csv";
    } else if (sampleType === "bank_sales") {
      csv = SAMPLE_BANK_SALES_CSV;
      name = "Bank_Of_Kigali_Commercial_Sales.csv";
    } else {
      csv = SAMPLE_HARVEST_CSV;
      name = "Cooperative_Harvest_Weighing_Sheet.csv";
    }
    setRawText(csv);
    handleProcessCsvText(csv, name);
  };

  const handleDownloadTemplate = () => {
    let sample = "";
    let filename = "";
    if (activeMode === "expenses") {
      sample = SAMPLE_MOMO_EXPENSES_CSV;
      filename = "terimbere_expenses_template.csv";
    } else if (activeMode === "sales") {
      sample = SAMPLE_MOMO_SALES_CSV;
      filename = "terimbere_sales_template.csv";
    } else {
      sample = SAMPLE_HARVEST_CSV;
      filename = "terimbere_harvest_template.csv";
    }

    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleColumnMappingChange = (key: keyof CsvColumnMapping, value: string) => {
    const updated = { ...columnMapping, [key]: value };
    setColumnMapping(updated);
    generateParsedRows(rawRows, updated, activeMode, selectedFarmId, defaultCrop);
  };

  const handleToggleRowSelection = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isSelected: !r.isSelected } : r))
    );
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => ({ ...r, isSelected: select && r.isValid }))
    );
  };

  const handleUpdateRowField = (id: string, field: keyof ParsedCsvRow, value: any) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "amount") {
          const num = typeof value === "number" ? value : parseFloat(value) || 0;
          updated.amount = num;
          updated.isValid = num > 0;
        }
        return updated;
      })
    );
  };

  const handleApplyFarmToAll = (fId: string) => {
    setSelectedFarmId(fId);
    setParsedRows((prev) => prev.map((r) => ({ ...r, farmId: fId })));
  };

  const handleApplyCropToAll = (crop: string) => {
    setDefaultCrop(crop);
    setParsedRows((prev) => prev.map((r) => ({ ...r, crop })));
  };

  // Final Import submission
  const selectedRows = parsedRows.filter((r) => r.isSelected && r.isValid);
  const totalAmountSelected = selectedRows.reduce((acc, r) => acc + r.amount, 0);

  const handleExecuteImport = () => {
    if (selectedRows.length === 0) {
      alert(language === "rw" ? "Hitamo nibura umurongo umwe wo kwinjiza." : "Please select at least one row to import.");
      return;
    }

    if (activeMode === "expenses") {
      const expensesToImport: Omit<Expense, "id" | "syncStatus">[] = selectedRows.map((r) => {
        const farm = farms.find((f) => f.id === r.farmId) || farms[0];
        return {
          farmId: farm ? farm.id : "farm-1",
          farmName: farm ? farm.name : "Umurima",
          crop: r.crop || defaultCrop,
          category: r.category || "other",
          amount: r.amount,
          description: r.description,
          date: r.date,
        };
      });
      if (onImportExpenses) {
        onImportExpenses(expensesToImport);
      }
    } else if (activeMode === "sales") {
      const salesToImport: Omit<SaleRecord, "id">[] = selectedRows.map((r) => {
        const farm = farms.find((f) => f.id === r.farmId) || farms[0];
        const qty = r.quantityKg || 500;
        const unitPrice = r.unitPriceRwf || Math.round(r.amount / qty);
        return {
          farmId: farm ? farm.id : "farm-1",
          crop: r.crop || defaultCrop,
          saleDate: r.date,
          buyerName: r.buyerName || r.description,
          buyerType: r.buyerType || "wholesaler",
          quantityKg: qty,
          unitPriceRwf: unitPrice,
          totalAmountRwf: r.amount,
          paymentMethod: r.paymentMethod || "momo",
          notes: `Imported via CSV: ${r.description}`,
        };
      });
      if (onImportSales) {
        onImportSales(salesToImport);
      }
    } else {
      // Harvests
      const harvestsToImport: Omit<HarvestRecord, "id">[] = selectedRows.map((r) => {
        const farm = farms.find((f) => f.id === r.farmId) || farms[0];
        return {
          farmId: farm ? farm.id : "farm-1",
          farmName: farm ? farm.name : "Umurima",
          district: farm?.district,
          sector: farm?.sector,
          agroZone: farm?.agroZone,
          crop: r.crop || defaultCrop,
          harvestDate: r.date,
          quantityKg: r.quantityKg || r.amount,
          qualityGrade: r.qualityGrade || "A",
          storageLocation: r.storageLocation || "Ububiko bwa Koperative",
          batchCode: r.batchCode || `RW-HARV-IMP-${Math.floor(100 + Math.random() * 900)}`,
          notes: `Imported via CSV file (${fileName || "weighing sheet"})`,
        };
      });
      if (onImportHarvests) {
        onImportHarvests(harvestsToImport);
      }
    }

    onClose();
  };

  const expenseCategoryOptions: ExpenseCategory[] = [
    "seeds",
    "fertilizer",
    "pesticides",
    "labor",
    "irrigation",
    "transport",
    "equipment",
    "other",
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-500/20 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  {activeMode === "expenses"
                    ? language === "rw"
                      ? "Injiza Amafaranga muri CSV ya MoMo / Banki"
                      : "Import Expenses from MoMo or Bank CSV"
                    : activeMode === "sales"
                    ? language === "rw"
                      ? "Injiza Ubucuruzi muri CSV ya MoMo / Banki"
                      : "Import Sales Inflows from MoMo or Bank CSV"
                    : language === "rw"
                    ? "Injiza Umusaruro muri CSV ya Koperative"
                    : "Import Harvest Log from Cooperative CSV"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  {currentStep === "upload"
                    ? language === "rw"
                      ? "Intambwe ya 1: Hitamo dosiye"
                      : "Step 1: Upload"
                    : language === "rw"
                    ? "Intambwe ya 2: Genzura & Kwinjiza"
                    : "Step 2: Preview & Import"}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Soma inyemezabwishyu za MTN MoMo, Airtel Money, Bank of Kigali cyangwa amakuru ya koperative ku buryo bworoshye."
                  : "Effortlessly record agricultural transactions directly from MTN Mobile Money, Airtel, Bank of Kigali, or tally sheets."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Harvest / Sales sub-mode selector tabs if mode is harvest_sales */}
        {mode === "harvest_sales" && (
          <div className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800/40 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
            <div className="flex space-x-1.5 text-xs font-bold">
              <button
                onClick={() => {
                  setSubMode("sales");
                  setCurrentStep("upload");
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all ${
                  subMode === "sales"
                    ? "bg-white dark:bg-stone-700 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === "rw" ? "Ubucuruzi (Sales & MoMo Inflows)" : "Sales (MoMo / Bank Inflows)"}</span>
              </button>
              <button
                onClick={() => {
                  setSubMode("harvests");
                  setCurrentStep("upload");
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all ${
                  subMode === "harvests"
                    ? "bg-white dark:bg-stone-700 text-amber-800 dark:text-amber-300 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === "rw" ? "Umusaruro (Harvest Tally Sheets)" : "Harvest Yield (Weighing Sheets)"}</span>
              </button>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>{language === "rw" ? "Kura urugero rwa CSV" : "Download Template"}</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {currentStep === "upload" ? (
            <div className="space-y-6">
              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[0.99]"
                    : "border-stone-300 dark:border-stone-700 hover:border-emerald-500 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    {language === "rw"
                      ? "Kanda hano cyangwa ukurure dosiye ya CSV hano"
                      : "Click to browse or drag and drop your CSV file here"}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md">
                    {language === "rw"
                      ? "Yemera CSV zikuwe muri MTN MoMo, Airtel Money, Bank of Kigali, Equity Bank, I&M Bank cyangwa amadosiye ya Excel yabitswe nka CSV."
                      : "Supports CSV statements exported from MTN MoMo (*182# portal), Airtel Money, Bank of Kigali statements, or Excel CSVs."}
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Format: UTF-8 .CSV (Comma or Semicolon separated)</span>
                </div>
              </div>

              {/* Sample Statement Presets for Immediate Testing */}
              <div className="bg-stone-50 dark:bg-stone-800/40 rounded-2xl p-4 border border-stone-200 dark:border-stone-700/70">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      {language === "rw"
                        ? "Cyangwa Gerageza Urugero rw'Inyemezabwishyu (1-Click Test Statements)"
                        : "Or Test with Real Rwandan Statements (1-Click Sample Demo)"}
                    </h4>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === "rw" ? "Kura Template" : "Get Template"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeMode === "expenses" ? (
                    <>
                      <button
                        onClick={() => handleLoadSample("momo_expenses")}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all text-left shadow-2xs group flex items-start space-x-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-stone-900 dark:text-white block group-hover:text-amber-600">
                            MTN MoMo Agri Outflows (Rwanda)
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 block leading-snug">
                            5 transactions: DAP & NPK fertilizer, Day-labor wages, Kinigi seeds, moto transport & spray.
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleLoadSample("bank_expenses")}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left shadow-2xs group flex items-start space-x-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-stone-900 dark:text-white block group-hover:text-blue-600">
                            Bank of Kigali Farm Account
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 block leading-snug">
                            4 debits: Solar irrigation pump, tractor rental service, organic compost & farm crates.
                          </span>
                        </div>
                      </button>
                    </>
                  ) : activeMode === "sales" ? (
                    <>
                      <button
                        onClick={() => handleLoadSample("momo_sales")}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all text-left shadow-2xs group flex items-start space-x-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-stone-900 dark:text-white block group-hover:text-emerald-600">
                            MTN MoMo Crop Sales Deposits
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 block leading-snug">
                            4 sales payments: Nyabugogo potato buyer, Kinigi cooperative dividend, Kigali Fresh spuds.
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleLoadSample("bank_sales")}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left shadow-2xs group flex items-start space-x-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-stone-900 dark:text-white block group-hover:text-blue-600">
                            Bank Off-taker Commercial Transfers
                          </span>
                          <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 block leading-snug">
                            3 commercial credits: Rwanda Grain Milling Co, Inyange Industries produce & Export consignments.
                          </span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleLoadSample("harvest")}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all text-left shadow-2xs group flex items-start space-x-3 col-span-2"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-stone-900 dark:text-white block group-hover:text-amber-600">
                          Cooperative Weighing Sheet (Yield Logs)
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 block leading-snug">
                          3 batches: Kinigi Potatoes (1,800 kg Grade A), Nyagatare Hybrid Maize (2,400 kg), Huye Beans (950 kg).
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW AND COLUMN MAPPING STEP */
            <div className="space-y-4">
              {/* Top File & Column Mapping Bar */}
              <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 dark:text-white block">
                      {fileName || "imported_file.csv"}
                    </span>
                    <span className="text-stone-500 text-[11px]">
                      {rawRows.length} {language === "rw" ? "imirongo yabonetse" : "rows detected in CSV"}
                    </span>
                  </div>
                </div>

                {/* Column mapping selectors */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-stone-500 text-[11px] font-bold">Date:</span>
                    <select
                      value={columnMapping.dateCol}
                      onChange={(e) => handleColumnMappingChange("dateCol", e.target.value)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="text-stone-500 text-[11px] font-bold">
                      {activeMode === "harvests" ? "Qty:" : "Amount:"}
                    </span>
                    <select
                      value={columnMapping.amountCol}
                      onChange={(e) => handleColumnMappingChange("amountCol", e.target.value)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="text-stone-500 text-[11px] font-bold">Details:</span>
                    <select
                      value={columnMapping.descriptionCol}
                      onChange={(e) => handleColumnMappingChange("descriptionCol", e.target.value)}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setCurrentStep("upload")}
                    className="px-2.5 py-1 text-stone-500 hover:text-stone-900 dark:hover:text-white underline font-semibold"
                  >
                    {language === "rw" ? "Hindura Dosiye" : "Change File"}
                  </button>
                </div>
              </div>

              {/* Batch Controls Bar */}
              <div className="bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={selectedRows.length === parsedRows.filter((r) => r.isValid).length && selectedRows.length > 0}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="select-all" className="font-bold text-stone-700 dark:text-stone-200 cursor-pointer">
                      {language === "rw" ? "Hitamo Byose" : "Select All"} ({selectedRows.length}/{parsedRows.length})
                    </label>
                  </div>

                  <span className="text-stone-300 dark:text-stone-600">|</span>

                  {/* Batch Farm Assignment */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-stone-500 font-semibold">{language === "rw" ? "Umurima:" : "Farm:"}</span>
                    <select
                      value={selectedFarmId}
                      onChange={(e) => handleApplyFarmToAll(e.target.value)}
                      className="bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 dark:text-stone-200"
                    >
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.district})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Crop Assignment */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-stone-500 font-semibold">{language === "rw" ? "Igihingwa:" : "Crop:"}</span>
                    <select
                      value={defaultCrop}
                      onChange={(e) => handleApplyCropToAll(e.target.value)}
                      className="bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 dark:text-stone-200"
                    >
                      <option value="Ibirayi (Kinigi)">Ibirayi (Kinigi)</option>
                      <option value="Ibigori (Hybrid H628)">Ibigori (Hybrid H628)</option>
                      <option value="Ibishyimbo (RWR 2245)">Ibishyimbo (RWR 2245)</option>
                      <option value="Inyanya (Anna F1)">Inyanya (Anna F1)</option>
                      <option value="Icyayi (Tea)">Icyayi (Tea)</option>
                      <option value="Ikawa (Arabica)">Ikawa (Arabica)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-black">
                    {activeMode === "harvests" ? (
                      <span>
                        Total: {totalAmountSelected.toLocaleString()} Kg
                      </span>
                    ) : (
                      <span>
                        Total: {totalAmountSelected.toLocaleString()} RWF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable Preview Table */}
              <div className="border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold sticky top-0 z-10 border-b border-stone-200 dark:border-stone-700">
                      <tr>
                        <th className="px-3 py-2.5 w-10 text-center">
                          <Check className="w-3.5 h-3.5 mx-auto text-stone-400" />
                        </th>
                        <th className="px-3 py-2.5">{language === "rw" ? "Itariki" : "Date"}</th>
                        <th className="px-3 py-2.5">
                          {activeMode === "expenses"
                            ? language === "rw"
                              ? "Ubusobanuro / Narration"
                              : "Description / Narration"
                            : activeMode === "sales"
                            ? language === "rw"
                              ? "Umuguzi / Details"
                              : "Buyer / Details"
                            : language === "rw"
                            ? "Igihingwa & Ububiko"
                            : "Crop & Storage"}
                        </th>
                        {activeMode === "expenses" && (
                          <th className="px-3 py-2.5">{language === "rw" ? "Icyiciro (Category)" : "Category"}</th>
                        )}
                        {activeMode === "sales" && (
                          <th className="px-3 py-2.5">{language === "rw" ? "Uburyo bwo Kwishyura" : "Payment"}</th>
                        )}
                        {activeMode === "harvests" && (
                          <th className="px-3 py-2.5">Grade</th>
                        )}
                        <th className="px-3 py-2.5 text-right">
                          {activeMode === "harvests"
                            ? language === "rw"
                              ? "Ibiro (Kg)"
                              : "Quantity (Kg)"
                            : language === "rw"
                            ? "Amafaranga (RWF)"
                            : "Amount (RWF)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-700/60 bg-white dark:bg-stone-900">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors ${
                            !row.isSelected ? "opacity-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={row.isSelected}
                              disabled={!row.isValid}
                              onChange={() => handleToggleRowSelection(row.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => handleUpdateRowField(row.id, "date", e.target.value)}
                              className="bg-transparent border-0 border-b border-stone-300 dark:border-stone-700 p-0 text-xs font-semibold focus:ring-0 focus:border-emerald-600 text-stone-800 dark:text-stone-200"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => handleUpdateRowField(row.id, "description", e.target.value)}
                              className="w-full bg-transparent border-0 border-b border-stone-300 dark:border-stone-700 p-0 text-xs font-semibold focus:ring-0 focus:border-emerald-600 text-stone-900 dark:text-white"
                            />
                          </td>
                          {activeMode === "expenses" && (
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <select
                                value={row.category || "other"}
                                onChange={(e) => handleUpdateRowField(row.id, "category", e.target.value as ExpenseCategory)}
                                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-bold capitalize text-stone-800 dark:text-stone-200"
                              >
                                {expenseCategoryOptions.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {activeMode === "sales" && (
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <select
                                value={row.paymentMethod || "momo"}
                                onChange={(e) => handleUpdateRowField(row.id, "paymentMethod", e.target.value)}
                                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-bold uppercase text-stone-800 dark:text-stone-200"
                              >
                                <option value="momo">MTN MoMo</option>
                                <option value="airtel">Airtel</option>
                                <option value="bank">Bank</option>
                                <option value="cash">Cash</option>
                              </select>
                            </td>
                          )}
                          {activeMode === "harvests" && (
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <select
                                value={row.qualityGrade || "A"}
                                onChange={(e) => handleUpdateRowField(row.id, "qualityGrade", e.target.value)}
                                className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 dark:text-stone-200"
                              >
                                <option value="A">Grade A</option>
                                <option value="B">Grade B</option>
                                <option value="C">Grade C</option>
                              </select>
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1 font-bold">
                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) => handleUpdateRowField(row.id, "amount", e.target.value)}
                                className="w-24 text-right bg-transparent border-0 border-b border-stone-300 dark:border-stone-700 p-0 text-xs font-black focus:ring-0 focus:border-emerald-600 text-stone-900 dark:text-white"
                              />
                              <span className="text-[10px] text-stone-500">
                                {activeMode === "harvests" ? "Kg" : "RWF"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-stone-500 dark:text-stone-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {language === "rw"
                ? "Buri gikorwa cyinjijwe kibikwa muri telefone gihuzwe na Nkunganire"
                : "Imported records are cached locally and synchronized with central records"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors"
            >
              {language === "rw" ? "Reka" : "Cancel"}
            </button>

            {currentStep === "preview" && (
              <button
                onClick={handleExecuteImport}
                disabled={selectedRows.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs ${
                  selectedRows.length > 0
                    ? "bg-emerald-800 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer"
                    : "bg-stone-300 dark:bg-stone-700 text-stone-500 cursor-not-allowed"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {language === "rw"
                    ? `Injiza Ibyatoranyijwe (${selectedRows.length})`
                    : `Import Selected (${selectedRows.length})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
