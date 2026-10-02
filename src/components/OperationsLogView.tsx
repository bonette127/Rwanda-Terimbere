import React, { useState } from "react";
import {
  Language,
  Farm,
  HiredLabor,
  TransportLog,
  FarmActivity,
  FertilizerApplicationLog,
} from "../types";
import { initialFertilizerApplications } from "../data/mockData";
import {
  FertilizerApplicationModal,
  getApplicationMethodLabel,
} from "./FertilizerApplicationModal";
import {
  Users,
  Truck,
  CalendarCheck,
  Plus,
  DollarSign,
  Briefcase,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Scale,
  CreditCard,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";

interface OperationsLogViewProps {
  language: Language;
  farms: Farm[];
  hiredLabor: HiredLabor[];
  onAddLabor: (labor: HiredLabor) => void;
  transportLogs: TransportLog[];
  onAddTransport: (log: TransportLog) => void;
  activities: FarmActivity[];
  onToggleActivity: (id: string) => void;
  fertilizerApplications?: FertilizerApplicationLog[];
  onAddFertilizerApplication?: (app: FertilizerApplicationLog) => void;
}

export const OperationsLogView: React.FC<OperationsLogViewProps> = ({
  language,
  farms,
  hiredLabor,
  onAddLabor,
  transportLogs,
  onAddTransport,
  activities,
  onToggleActivity,
  fertilizerApplications,
  onAddFertilizerApplication,
}) => {
  const [activeTab, setActiveTab] = useState<
    "labor" | "transport" | "fertilizer" | "activities"
  >("fertilizer");
  const [showFertilizerModal, setShowFertilizerModal] = useState<boolean>(false);
  const [localFertilizerLogs, setLocalFertilizerLogs] = useState<
    FertilizerApplicationLog[]
  >(initialFertilizerApplications);

  const effectiveFertilizerLogs = fertilizerApplications || localFertilizerLogs;

  const handleSaveFertilizerApp = (newApp: FertilizerApplicationLog) => {
    if (onAddFertilizerApplication) {
      onAddFertilizerApplication(newApp);
    } else {
      setLocalFertilizerLogs((prev) => [newApp, ...prev]);
    }
  };

  // Hired Labor Modal / Form state
  const [showLaborForm, setShowLaborForm] = useState<boolean>(false);
  const [laborFarmId, setLaborFarmId] = useState<string>(farms[0]?.id || "");
  const [laborDate, setLaborDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [laborTask, setLaborTask] = useState<HiredLabor["taskType"]>("weeding");
  const [workerCount, setWorkerCount] = useState<number>(6);
  const [dailyRateRwf, setDailyRateRwf] = useState<number>(2500);
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [laborPayMethod, setLaborPayMethod] = useState<"momo" | "cash">("momo");
  const [laborNotes, setLaborNotes] = useState<string>("");

  // Transport Log Modal / Form state
  const [showTransportForm, setShowTransportForm] = useState<boolean>(false);
  const [transFarmId, setTransFarmId] = useState<string>(farms[0]?.id || "");
  const [transDate, setTransDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [transPurpose, setTransPurpose] = useState<TransportLog["purpose"]>("harvest_to_market");
  const [transVehicle, setTransVehicle] = useState<TransportLog["vehicleType"]>("truck");
  const [transOrigin, setTransOrigin] = useState<string>("Umurima Kinigi Plot A");
  const [transDestination, setTransDestination] = useState<string>("Isoko rya Nyabugogo (Kigali)");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("078");
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(3500);
  const [transCostRwf, setTransCostRwf] = useState<number>(45000);
  const [transNotes, setTransNotes] = useState<string>("");

  // Calculations
  const totalLaborCost = hiredLabor.reduce((acc, curr) => acc + curr.totalAmountRwf, 0);
  const totalWorkerDays = hiredLabor.reduce((acc, curr) => acc + curr.workerCount, 0);

  const totalTransportCost = transportLogs.reduce((acc, curr) => acc + curr.costRwf, 0);
  const totalTonnageMoved = transportLogs.reduce((acc, curr) => acc + curr.cargoWeightKg, 0) / 1000;

  const handleLaborSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarm = farms.find((f) => f.id === laborFarmId) || farms[0];
    const newLabor: HiredLabor = {
      id: `labor-${Date.now()}`,
      farmId: targetFarm ? targetFarm.id : "farm-1",
      farmName: targetFarm ? targetFarm.name : "Umurima",
      date: laborDate,
      taskType: laborTask,
      workerCount: Number(workerCount),
      dailyRateRwf: Number(dailyRateRwf),
      totalAmountRwf: Number(workerCount) * Number(dailyRateRwf),
      supervisorName: supervisorName.trim() || "Ushinzwe Umurima",
      paymentStatus: "paid",
      paymentMethod: laborPayMethod,
      notes: laborNotes.trim(),
    };
    onAddLabor(newLabor);
    setShowLaborForm(false);
    setLaborNotes("");
  };

  const handleTransportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetFarm = farms.find((f) => f.id === transFarmId) || farms[0];
    const newTransport: TransportLog = {
      id: `trans-${Date.now()}`,
      farmId: targetFarm ? targetFarm.id : "farm-1",
      farmName: targetFarm ? targetFarm.name : "Umurima",
      date: transDate,
      purpose: transPurpose,
      vehicleType: transVehicle,
      origin: transOrigin.trim() || "Umurima",
      destination: transDestination.trim() || "Isoko",
      driverName: driverName.trim() || "Umwunguzi",
      driverPhone: driverPhone.trim() || "0788000000",
      cargoWeightKg: Number(cargoWeightKg),
      costRwf: Number(transCostRwf),
      paymentStatus: "paid",
      notes: transNotes.trim(),
    };
    onAddTransport(newTransport);
    setShowTransportForm(false);
    setTransNotes("");
  };

  const getTaskLabel = (task: HiredLabor["taskType"]) => {
    switch (task) {
      case "land_prep":
        return language === "rw" ? "Guharura & Gutegura ubutaka" : "Land Preparation";
      case "planting":
        return language === "rw" ? "Gutera imbuto" : "Planting";
      case "weeding":
        return language === "rw" ? "Kubagara & Gusasira" : "Weeding & Earthing-up";
      case "spraying":
        return language === "rw" ? "Gutera umuti" : "Spraying Pesticides";
      case "harvesting":
        return language === "rw" ? "Gusarura" : "Harvesting";
      case "sorting":
        return language === "rw" ? "Gutoranya & Gupakira" : "Sorting & Bagging";
      default:
        return task;
    }
  };

  const getPurposeLabel = (purpose: TransportLog["purpose"]) => {
    switch (purpose) {
      case "inputs_delivery":
        return language === "rw" ? "Kuzana ifumbire n'imbuto" : "Inputs Delivery";
      case "harvest_to_market":
        return language === "rw" ? "Kugeza umusaruro ku isoko" : "Harvest to Market";
      case "storage_transfer":
        return language === "rw" ? "Kujyana mu bubiko (Storage)" : "Storage Transfer";
      default:
        return purpose;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-800 via-stone-900 to-emerald-950 p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>
              {language === "rw"
                ? "Imicungire y'Imirimo, Abakozi b'Ibiraka n'Imodoka"
                : "Operations, Hired Labor & Logistics"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
            {language === "rw"
              ? "Kwandika Abakozi b'Ibiraka, Imodoka & Ibikorwa by'Umurima"
              : "Farm Labor, Transport Logs & Operational Activities"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
            {language === "rw"
              ? "Bika imyirondoro y'abakozi bakoze mu murima, amafaranga bishyuwe, ibiciro byo gutwara umusaruro n'ifumbire, ndetse n'ibikorwa bya buri munsi."
              : "Accurately track casual labor wages, transport vehicle dispatches, tonnage hauled, and field activity logs."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFertilizerModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shadow-sm transition-all"
          >
            <FlaskConical className="w-4 h-4" />
            <span>
              {language === "rw"
                ? "+ Andika Ifumbire (NPK)"
                : "+ Log Fertilizer Application"}
            </span>
          </button>

          {activeTab === "labor" && (
            <button
              onClick={() => setShowLaborForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === "rw" ? "Ongeraho Abakozi b'Ibiraka" : "Log Hired Labor"}</span>
            </button>
          )}
          {activeTab === "transport" && (
            <button
              onClick={() => setShowTransportForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === "rw" ? "Ongeraho Urugendo rw'Imodoka" : "Log Transport Trip"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("fertilizer")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "fertilizer"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>
            {language === "rw"
              ? "Ifumbire & NPK (Fertilizer Log)"
              : "Granular Fertilizer Log"}
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {effectiveFertilizerLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("labor")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "labor"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === "rw" ? "Abakozi b'Ibiraka (Labor)" : "Hired Labor"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {hiredLabor.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("transport")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "transport"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === "rw" ? "Gutwara Umusaruro & Imodoka" : "Transport & Logistics"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {transportLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("activities")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "activities"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>{language === "rw" ? "Ibikorwa by'Umurima" : "Farm Activities"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {activities.length}
          </span>
        </button>
      </div>

      {/* TAB 1: HIRED LABOR */}
      {activeTab === "labor" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw" ? "Amafaranga Yose y'Abakozi" : "Total Labor Expenditure"}
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {totalLaborCost.toLocaleString()} RWF
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Yishyuwe binyuze kuri MoMo & Cash" : "Verified via MoMo & Cash"}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw" ? "Imibyizi Yose Yakozwe" : "Total Worker Days"}
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {totalWorkerDays} {language === "rw" ? "Imibyizi" : "Man-days"}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {language === "rw" ? "Ku mirima yose y'umwuga" : "Across registered plots"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw" ? "Igiciro cy'Umubyizi (Average Wage)" : "Average Daily Rate"}
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {Math.round(totalLaborCost / (totalWorkerDays || 1)).toLocaleString()} RWF
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {language === "rw" ? "Henshi mu Rwanda ni 2,500 - 3,000 RWF" : "Standard Rwanda rate 2,500 - 3,000 RWF"}
              </div>
            </div>
          </div>

          {/* Hired Labor Table */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                {language === "rw" ? "Urutonde rw'Abakozi b'Ibiraka Bakoze" : "Hired Casual Labor Records"}
              </h3>
              <span className="text-xs text-stone-400">{hiredLabor.length} logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/70 text-stone-600 dark:text-stone-300 font-bold uppercase border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="px-4 py-3">{language === "rw" ? "Itariki" : "Date"}</th>
                    <th className="px-4 py-3">{language === "rw" ? "Umurima" : "Farm"}</th>
                    <th className="px-4 py-3">{language === "rw" ? "Umurimo Wakozwe" : "Task"}</th>
                    <th className="px-4 py-3 text-center">{language === "rw" ? "Abakozi" : "Workers"}</th>
                    <th className="px-4 py-3">{language === "rw" ? "Umubyizi" : "Rate"}</th>
                    <th className="px-4 py-3 font-black text-right">{language === "rw" ? "Yose Hamwe" : "Total (RWF)"}</th>
                    <th className="px-4 py-3">{language === "rw" ? "Ushinzwe Umurima" : "Supervisor"}</th>
                    <th className="px-4 py-3 text-center">{language === "rw" ? "Kwishyura" : "Payment"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {hiredLabor.map((row) => (
                    <tr key={row.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400 font-medium">
                        {row.farmName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-stone-900 dark:text-white block">
                          {getTaskLabel(row.taskType)}
                        </span>
                        {row.notes && (
                          <span className="text-[11px] text-stone-400 block truncate max-w-xs">
                            {row.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700 dark:text-emerald-400">
                        {row.workerCount}
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                        {row.dailyRateRwf.toLocaleString()} RWF
                      </td>
                      <td className="px-4 py-3 font-black text-right text-stone-900 dark:text-white whitespace-nowrap">
                        {row.totalAmountRwf.toLocaleString()} RWF
                      </td>
                      <td className="px-4 py-3 text-stone-700 dark:text-stone-300 font-medium">
                        {row.supervisorName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{row.paymentMethod.toUpperCase()}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSPORT & LOGISTICS */}
      {activeTab === "transport" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw" ? "Amafaranga Yose yo Gutwara" : "Total Logistics Expenditure"}
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {totalTransportCost.toLocaleString()} RWF
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {transportLogs.length} {language === "rw" ? "Ingendo zose z'imodoka" : "Trips logged"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw" ? "Ingano y'Umusaruro Watwawe" : "Total Cargo Transported"}
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {totalTonnageMoved.toFixed(1)} {language === "rw" ? "Toni" : "Tons"}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {(totalTonnageMoved * 1000).toLocaleString()} kg ku masoko
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw" ? "Impuzandengo ku rugendo" : "Average Cost per Trip"}
              </div>
              <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                {Math.round(totalTransportCost / (transportLogs.length || 1)).toLocaleString()} RWF
              </div>
              <div className="text-[11px] text-stone-400 mt-1">
                {language === "rw" ? "Ugereranyije n'ibiro (kg)" : "Kilogram cost efficiency"}
              </div>
            </div>
          </div>

          {/* Transport Trips List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transportLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                      {log.vehicleType.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-1.5">
                      {getPurposeLabel(log.purpose)}
                    </h3>
                    <p className="text-xs text-stone-500">{log.farmName} • {log.date}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-stone-900 dark:text-white">
                      {log.costRwf.toLocaleString()} RWF
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      PAID
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-1 text-xs">
                  <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>
                      <strong className="text-stone-900 dark:text-white">Ava:</strong> {log.origin}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="text-stone-900 dark:text-white">Ajya:</strong> {log.destination}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center space-x-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-stone-900 dark:text-white">
                      {log.cargoWeightKg.toLocaleString()} kg
                    </span>
                    <span>({(log.cargoWeightKg / 1000).toFixed(1)} T)</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{log.driverName} ({log.driverPhone})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FARM ACTIVITIES */}
      {activeTab === "activities" && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {language === "rw" ? "Gahunda y'Ibikorwa by'Ubuhinzi (Operational Tasks)" : "Daily Cultivation Tasks"}
            </h3>
            <span className="text-xs text-stone-400">{activities.length} tasks</span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {activities.map((act) => (
              <div
                key={act.id}
                className="py-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => onToggleActivity(act.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                      act.status === "completed"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-stone-300 dark:border-stone-600 hover:border-emerald-500"
                    }`}
                  >
                    {act.status === "completed" && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        act.status === "completed"
                          ? "line-through text-stone-400 dark:text-stone-500"
                          : "text-stone-900 dark:text-white"
                      }`}
                    >
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {act.farmName} • {act.crop} • {language === "rw" ? "Itariki:" : "Due:"} {act.dueDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    {act.category}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                      act.status === "completed"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GRANULAR FERTILIZER APPLICATIONS LOG */}
      {activeTab === "fertilizer" && (
        <div className="space-y-6">
          {/* Fertilizer Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw"
                  ? "Ingano Yose y'Ifumbire"
                  : "Total Fertilizer Applied"}
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
                {effectiveFertilizerLogs
                  .reduce((s, a) => s + a.amountKg, 0)
                  .toLocaleString()}{" "}
                kg
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                {effectiveFertilizerLogs.length}{" "}
                {language === "rw"
                  ? "inshuro zafumbiriwe"
                  : "recorded field applications"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw"
                  ? "Ubuso Bwafumbiriwe"
                  : "Total Area Applied"}
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                {effectiveFertilizerLogs
                  .reduce((s, a) => s + a.areaAppliedHa, 0)
                  .toFixed(2)}{" "}
                Ha
              </div>
              <div className="text-[11px] text-stone-500 mt-1 font-mono">
                Avg Rate:{" "}
                {Math.round(
                  effectiveFertilizerLogs.reduce((s, a) => s + a.amountKg, 0) /
                    Math.max(
                      0.1,
                      effectiveFertilizerLogs.reduce(
                        (s, a) => s + a.areaAppliedHa,
                        0
                      )
                    )
                )}{" "}
                kg/Ha
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw"
                  ? "Intungamubiri (N - P - K)"
                  : "Elemental NPK Delivered"}
              </div>
              <div className="text-base font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1.5 flex items-center gap-2">
                <span className="text-emerald-700 dark:text-emerald-400">
                  N:{" "}
                  {effectiveFertilizerLogs
                    .reduce(
                      (s, a) => s + (a.amountKg * a.nitrogenPct) / 100,
                      0
                    )
                    .toFixed(1)}
                  kg
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  P:{" "}
                  {effectiveFertilizerLogs
                    .reduce(
                      (s, a) => s + (a.amountKg * a.phosphorusPct) / 100,
                      0
                    )
                    .toFixed(1)}
                  kg
                </span>
                <span className="text-sky-600 dark:text-sky-400">
                  K:{" "}
                  {effectiveFertilizerLogs
                    .reduce(
                      (s, a) => s + (a.amountKg * a.potassiumPct) / 100,
                      0
                    )
                    .toFixed(1)}
                  kg
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                {language === "rw"
                  ? "Ibipimo by'intungamubiri z'umwimerere"
                  : "Pure elemental nutrient mass"}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-xs text-stone-500 font-bold uppercase">
                {language === "rw"
                  ? "Ikiguzi Cyose cy'Ifumbire"
                  : "Total Fertilizer Expenditure"}
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
                {effectiveFertilizerLogs
                  .reduce((s, a) => s + a.costRwf, 0)
                  .toLocaleString()}{" "}
                RWF
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                {language === "rw"
                  ? "Nkunganire ya RAB"
                  : "Subsidized Smart Nkunganire"}
              </div>
            </div>
          </div>

          {/* Granular Fertilizer Applications Log List */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  {language === "rw"
                    ? "Urutonde rw'Ifumbire Yashyizwe mu Mirima (Ubwoko, NPK Ratio, Ingano, Uburyo & Ubuso)"
                    : "Granular Fertilizer Applications Log (Type, NPK Ratio, Amount, Method & Area)"}
                </h3>
                <p className="text-xs text-stone-500">
                  {language === "rw"
                    ? "Igihembwe cya 2025B • Kanda '+ Andika Ifumbire (NPK)' uongeremo igikorwa gishya"
                    : "Season 2025B • Click '+ Log Fertilizer Application' to record a new granular entry"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFertilizerModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {language === "rw"
                    ? "Andika Ifumbire Nshya"
                    : "Record Fertilizer Application"}
                </span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3.5">
                      {language === "rw" ? "Itariki & Umurima" : "Date & Farm"}
                    </th>
                    <th className="py-3 px-3.5">
                      {language === "rw"
                        ? "Ubwoko bw'Ifumbire"
                        : "Fertilizer Type"}
                    </th>
                    <th className="py-3 px-3.5">NPK Ratio</th>
                    <th className="py-3 px-3.5">
                      {language === "rw" ? "Ingano (Kg)" : "Amount (Kg)"}
                    </th>
                    <th className="py-3 px-3.5">
                      {language === "rw"
                        ? "Ubuso (Ha) & Igipimo"
                        : "Area Applied & Rate"}
                    </th>
                    <th className="py-3 px-3.5">
                      {language === "rw"
                        ? "Uburyo bwo Gufumbira"
                        : "Application Method"}
                    </th>
                    <th className="py-3 px-3.5">
                      {language === "rw" ? "Ikiguzi (RWF)" : "Cost (RWF)"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800">
                  {effectiveFertilizerLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-stone-900 dark:text-white">
                          {log.farmName} ({log.crop})
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {log.date} • Season {log.seasonCode} •{" "}
                          {log.operatorName}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-stone-800 dark:text-stone-200">
                          {log.fertilizerType}
                        </div>
                        {log.growthStageApplied && (
                          <div className="text-[11px] text-stone-500">
                            {log.growthStageApplied}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-[11px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {log.npkRatio}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                        {log.amountKg.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {log.areaAppliedHa} Ha
                        </span>{" "}
                        <span className="text-stone-500">
                          ({log.rateKgPerHa} kg/Ha)
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-[11px]">
                          {getApplicationMethodLabel(
                            log.applicationMethod,
                            language
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                        {log.costRwf.toLocaleString()} RWF
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0: GRANULAR FERTILIZER APPLICATION MODAL */}
      <FertilizerApplicationModal
        isOpen={showFertilizerModal}
        onClose={() => setShowFertilizerModal(false)}
        farms={farms}
        language={language}
        onSaveApplication={handleSaveFertilizerApp}
      />

      {/* MODAL 1: ADD HIRED LABOR FORM */}
      {showLaborForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-base text-stone-900 dark:text-white font-display">
                  {language === "rw" ? "Kwandika Abakozi b'Ibiraka" : "Log Hired Casual Labor"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLaborForm(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLaborSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Hitamo Umurima" : "Select Farm"}
                  </label>
                  <select
                    value={laborFarmId}
                    onChange={(e) => setLaborFarmId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  >
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Itariki y'Akazi" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={laborDate}
                    onChange={(e) => setLaborDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Umurimo Wakozwe" : "Task Type"}
                  </label>
                  <select
                    value={laborTask}
                    onChange={(e) => setLaborTask(e.target.value as HiredLabor["taskType"])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  >
                    <option value="land_prep">{language === "rw" ? "Guharura & Gutegura" : "Land Prep"}</option>
                    <option value="planting">{language === "rw" ? "Gutera imbuto" : "Planting"}</option>
                    <option value="weeding">{language === "rw" ? "Kubagara & Gusasira" : "Weeding"}</option>
                    <option value="spraying">{language === "rw" ? "Gutera umuti" : "Spraying"}</option>
                    <option value="harvesting">{language === "rw" ? "Gusarura" : "Harvesting"}</option>
                    <option value="sorting">{language === "rw" ? "Gupakira mu mifuka" : "Sorting & Bagging"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Umubare w'Abakozi" : "Worker Count"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Igiciro cy'Umubyizi (RWF)" : "Daily Rate (RWF)"}
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="1000"
                    required
                    value={dailyRateRwf}
                    onChange={(e) => setDailyRateRwf(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Amafaranga Yose" : "Total Calculation"}
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {(workerCount * dailyRateRwf).toLocaleString()} RWF
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Ushinzwe Umurima (Supervisor)" : "Supervisor Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="urugero: Bizimana Celestin"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Uburyo bwo Kwishyura" : "Payment Method"}
                  </label>
                  <select
                    value={laborPayMethod}
                    onChange={(e) => setLaborPayMethod(e.target.value as "momo" | "cash")}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  >
                    <option value="momo">MTN / Airtel Mobile Money</option>
                    <option value="cash">Amafaranga mu ntoki (Cash)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ibisobanuro by'inyongera (Notes)" : "Notes"}
                </label>
                <input
                  type="text"
                  value={laborNotes}
                  onChange={(e) => setLaborNotes(e.target.value)}
                  placeholder={language === "rw" ? "Urugero: Babagaye hegitari 0.5 y'ibirayi" : "Optional notes"}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowLaborForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  {language === "rw" ? "Hagarika" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {language === "rw" ? "Bika Umubyizi" : "Save Labor Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TRANSPORT TRIP FORM */}
      {showTransportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                <Truck className="w-5 h-5" />
                <h3 className="font-bold text-base text-stone-900 dark:text-white font-display">
                  {language === "rw" ? "Kwandika Urugendo rw'Imodoka" : "Log Transport / Logistics"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransportForm(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransportSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Impamvu y'Urugendo" : "Trip Purpose"}
                  </label>
                  <select
                    value={transPurpose}
                    onChange={(e) => setTransPurpose(e.target.value as TransportLog["purpose"])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  >
                    <option value="harvest_to_market">{language === "rw" ? "Kujyana umusaruro ku isoko" : "Harvest to Market"}</option>
                    <option value="inputs_delivery">{language === "rw" ? "Kuzana ifumbire n'imbuto" : "Inputs Delivery"}</option>
                    <option value="storage_transfer">{language === "rw" ? "Kwimura mu bubiko" : "Storage Transfer"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Ubwoko bw'Ikinyabiziga" : "Vehicle Type"}
                  </label>
                  <select
                    value={transVehicle}
                    onChange={(e) => setTransVehicle(e.target.value as TransportLog["vehicleType"])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  >
                    <option value="truck">Ikamyoneti (Daihatsu / Fuso Truck)</option>
                    <option value="pickup">Pick-up (Toyota Hilux)</option>
                    <option value="tricycle">Kinyamitende (Tricycle / Keke)</option>
                    <option value="motorcycle">Moto (Motorbike cargo)</option>
                    <option value="bicycle">Igare (Bicycle)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Aho Byavuye (Origin)" : "Origin"}
                  </label>
                  <input
                    type="text"
                    required
                    value={transOrigin}
                    onChange={(e) => setTransOrigin(e.target.value)}
                    placeholder="urugero: Kinigi Ububiko"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Aho Byagejejwe (Destination)" : "Destination"}
                  </label>
                  <input
                    type="text"
                    required
                    value={transDestination}
                    onChange={(e) => setTransDestination(e.target.value)}
                    placeholder="urugero: Isoko rya Nyabugogo"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Ingano y'Ibyatwawe (Kg)" : "Cargo Weight (Kg)"}
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={cargoWeightKg}
                    onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Amafaranga yo Gutwara (RWF)" : "Transport Cost (RWF)"}
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="1000"
                    required
                    value={transCostRwf}
                    onChange={(e) => setTransCostRwf(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Izina ry'Umushoferi" : "Driver Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="urugero: Mugisha Theogene"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Telefone y'Umushoferi" : "Driver Phone"}
                  </label>
                  <input
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="0788667788"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowTransportForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  {language === "rw" ? "Hagarika" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {language === "rw" ? "Bika Urugendo" : "Save Transport Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
