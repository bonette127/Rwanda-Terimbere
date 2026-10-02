import React, { useState } from "react";
import { Language, Cooperative, User, TeamMember, FarmActivity, Farm } from "../types";
import { initialCooperatives, initialUsers, initialTeamMembers, initialActivities, initialFarms } from "../data/mockData";
import {
  Building2,
  Users,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingDown,
  Phone,
  FileCheck,
  Award,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { LaborProductivityDashboard } from "./LaborProductivityDashboard";

interface CooperativeHubViewProps {
  language: Language;
  currentUser: User | null;
  teamMembers?: TeamMember[];
  activities?: FarmActivity[];
  farms?: Farm[];
  onUpdateActivityStatus?: (id: string, status: "pending" | "in_progress" | "completed") => void;
  onSimulateMemberLogin?: (member: TeamMember) => void;
  onOpenInviteModal?: () => void;
}

export const CooperativeHubView: React.FC<CooperativeHubViewProps> = ({
  language,
  currentUser,
  teamMembers = initialTeamMembers,
  activities = initialActivities,
  farms = initialFarms,
  onUpdateActivityStatus,
  onSimulateMemberLogin,
  onOpenInviteModal,
}) => {
  const [cooperatives, setCooperatives] = useState<Cooperative[]>(initialCooperatives);
  const [selectedCoopId, setSelectedCoopId] = useState<string>(cooperatives[0]?.id || "coop-1");
  const [activeTab, setActiveTab] = useState<"members" | "bulkOrders" | "sharedTrucks" | "laborProductivity">("laborProductivity");

  // New bulk order form modal
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [inputName, setInputName] = useState<string>("NPK 17-17-17 (Nkunganire)");
  const [totalKg, setTotalKg] = useState<number>(10000);
  const [subsidizedPrice, setSubsidizedPrice] = useState<number>(680);
  const [commercialPrice, setCommercialPrice] = useState<number>(1150);

  const selectedCoop = cooperatives.find((c) => c.id === selectedCoopId) || cooperatives[0];

  // Members of this coop from initialUsers
  const members = initialUsers.filter((u) => u.cooperativeId === selectedCoop.id || u.role === "farmer");

  const handleAddBulkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = cooperatives.map((c) => {
      if (c.id === selectedCoop.id) {
        return {
          ...c,
          bulkOrders: [
            {
              id: `bo-${Date.now()}`,
              inputName,
              totalKgNeeded: Number(totalKg),
              subsidizedPriceRwf: Number(subsidizedPrice),
              commercialPriceRwf: Number(commercialPrice),
              status: "open" as const,
            },
            ...c.bulkOrders,
          ],
        };
      }
      return c;
    });
    setCooperatives(updated);
    setShowOrderModal(false);
  };

  const totalSavedRwf = selectedCoop.bulkOrders.reduce((acc, curr) => {
    return acc + (curr.commercialPriceRwf - curr.subsidizedPriceRwf) * curr.totalKgNeeded;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-stone-900 to-teal-950 p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>
              {language === "rw"
                ? "Ihuriro rya Koperative z'Abahinzi (Cooperative Hub)"
                : "Rwanda Agricultural Cooperative Federation"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
            {language === "rw"
              ? "Guhuza Imbaraga z'Abahinzi, Kugurira Hamwe Ifumbire n'Isoko"
              : "Cooperative Management, Bulk Subsidies & Joint Transport"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
            {language === "rw"
              ? "Koperative z'abahinzi zemerera abanyamuryango kugura ifumbire ya Nkunganire ku giciro cyo hasi, gutumiza imodoka zisangiwe, no gucuruza umusaruro munini kuri ba rurangiza."
              : "Empowering agricultural cooperatives with verified national ID membership, collective input bargaining, shared transport routing, and market aggregation."}
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => setShowOrderModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "rw" ? "Ongeraho Komande y'Ifumbire/Imbuto" : "Create Bulk Input Order"}</span>
          </button>
        </div>
      </div>

      {/* Cooperative Selector & Info Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-xl font-display">
              {selectedCoop.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-display">
                {selectedCoop.name}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {selectedCoop.code}
                </span>
                <span>•</span>
                <span>{selectedCoop.district} ({selectedCoop.sector})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-stone-600 dark:text-stone-300 whitespace-nowrap">
              {language === "rw" ? "Hindura Koperative:" : "Switch Coop:"}
            </label>
            <select
              value={selectedCoopId}
              onChange={(e) => setSelectedCoopId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-stone-900 dark:text-white"
            >
              {cooperatives.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Coop KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <div className="text-[10px] uppercase font-bold text-stone-500">
              {language === "rw" ? "Abanyamuryango" : "Active Farmers"}
            </div>
            <div className="text-xl font-black text-stone-900 dark:text-white mt-0.5">
              {selectedCoop.memberCount} {language === "rw" ? "Abahinzi" : "Farmers"}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">100% NIDA Verified</span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <div className="text-[10px] uppercase font-bold text-stone-500">
              {language === "rw" ? "Ubuso Bwose" : "Total Farmland"}
            </div>
            <div className="text-xl font-black text-stone-900 dark:text-white mt-0.5">
              {selectedCoop.totalHectares} Ha
            </div>
            <span className="text-[10px] text-stone-500">Imirima yose hamwe</span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <div className="text-[10px] uppercase font-bold text-stone-500">
              {language === "rw" ? "Inyungu ya Nkunganire" : "Subsidy Savings"}
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {(totalSavedRwf / 1000000).toFixed(1)}M RWF
            </div>
            <span className="text-[10px] text-emerald-600">Nkunganire ya Leta</span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <div className="text-[10px] uppercase font-bold text-stone-500">
              {language === "rw" ? "Umuyobozi (President)" : "Leadership"}
            </div>
            <div className="text-sm font-bold text-stone-900 dark:text-white mt-0.5 truncate">
              {selectedCoop.presidentName}
            </div>
            <span className="text-[10px] text-stone-500">{selectedCoop.presidentPhone}</span>
          </div>
        </div>
      </div>

      {/* Tabs for Cooperative Functions */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("laborProductivity")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "laborProductivity"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-300" />
          <span>{language === "rw" ? "Umusaruro w'Umurimo n'Ikipe (Labor Productivity)" : "Labor Productivity Metrics"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px]">
            {teamMembers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("bulkOrders")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "bulkOrders"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{language === "rw" ? "Ifumbire & Imbuto za Nkunganire" : "Bulk Subsidized Orders"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {selectedCoop.bulkOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "members"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{language === "rw" ? "Abanyamuryango (Bafite Indangamuntu)" : "Verified Members Directory"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
            {members.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sharedTrucks")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "sharedTrucks"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === "rw" ? "Guhuza Imodoka z'Umusaruro" : "Shared Transport Routing"}</span>
        </button>
      </div>

      {/* TAB 0: LABOR PRODUCTIVITY DASHBOARD (PER TEAM MEMBER) */}
      {activeTab === "laborProductivity" && (
        <LaborProductivityDashboard
          language={language}
          teamMembers={teamMembers}
          activities={activities}
          farms={farms}
          onUpdateActivityStatus={onUpdateActivityStatus}
          onSimulateMemberLogin={onSimulateMemberLogin}
          onOpenInviteModal={onOpenInviteModal}
        />
      )}

      {/* TAB 1: BULK INPUT ORDERS */}
      {activeTab === "bulkOrders" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedCoop.bulkOrders.map((order) => {
              const savings = (order.commercialPriceRwf - order.subsidizedPriceRwf) * order.totalKgNeeded;
              const discountPercent = Math.round(
                ((order.commercialPriceRwf - order.subsidizedPriceRwf) / order.commercialPriceRwf) * 100
              );

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          order.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : order.status === "ordered"
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg">
                        -{discountPercent}% NKUNGANIRE
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {order.inputName}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {language === "rw" ? "Ingano ikenewe:" : "Quantity:"}{" "}
                      <strong className="text-stone-900 dark:text-white">
                        {order.totalKgNeeded.toLocaleString()} kg
                      </strong>
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">
                        {language === "rw" ? "Igiciro cya Nkunganire:" : "Subsidized Price:"}
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {order.subsidizedPriceRwf.toLocaleString()} RWF / kg
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-400 line-through">
                      <span>{language === "rw" ? "Igiciro gisanzwe cy'isoko:" : "Commercial Market:"}</span>
                      <span>{order.commercialPriceRwf.toLocaleString()} RWF / kg</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold block">
                        {language === "rw" ? "Amafaranga Abahinzi Bazigamye:" : "Total Cooperative Savings:"}
                      </span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                        +{savings.toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED MEMBERS WITH NATIONAL IDS */}
      {activeTab === "members" && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                {language === "rw" ? "Urutonde rw'Abahinzi Bafite Indangamuntu Zemejwe" : "Verified Farmer Members (NIDA Verified)"}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {language === "rw"
                  ? "Bose bafite nimero y'indangamuntu y'imibare 16 yemejwe na Minagri/NIDA"
                  : "All members verified with valid 16-digit Rwandan National Identification"}
              </p>
            </div>
            <span className="text-xs text-stone-400">{members.length} abanyamuryango</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/70 text-stone-600 dark:text-stone-300 font-bold uppercase border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-4 py-3">{language === "rw" ? "Umuhinzi" : "Farmer"}</th>
                  <th className="px-4 py-3">{language === "rw" ? "Indangamuntu (16 Digits)" : "National ID"}</th>
                  <th className="px-4 py-3">{language === "rw" ? "Telefone" : "Phone"}</th>
                  <th className="px-4 py-3">{language === "rw" ? "Akarere / Umurenge" : "Location"}</th>
                  <th className="px-4 py-3">{language === "rw" ? "Ubuso (Ha)" : "Land Size"}</th>
                  <th className="px-4 py-3">{language === "rw" ? "Igihingwa" : "Primary Crop"}</th>
                  <th className="px-4 py-3 text-center">{language === "rw" ? "NIDA Status" : "Verification"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-stone-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <img
                          src={m.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                          alt={m.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                      {m.nationalId || "1 1985 8 0054321 0 45"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {m.phone}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                      {m.district} - {m.sector}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900 dark:text-white">
                      {m.farmSizeHa} Ha
                    </td>
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                      {m.primaryCrop}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SHARED TRANSPORT */}
      {activeTab === "sharedTrucks" && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                {language === "rw" ? "Guhuza Imodoka yo Kugeza Umusaruro ku Masoko ya Kigali" : "Shared Transport Coordination"}
              </h3>
              <p className="text-xs text-stone-400">
                {language === "rw"
                  ? "Abahinzi benshi bahuriza umusaruro mu ikamyoneti imwe bikagabanya igiciro cy'urugendo kugeza kuri 50%."
                  : "Consolidate harvests from multiple farmers into a shared Fuso truck to slash transit costs by up to 50%."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Ikamyoneti 1: Kinigi Hub → Nyabugogo Market
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  IBURAMO TONI 2.5
                </span>
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                <p>• Umunsi wo guhaguruka: Kuwa Gatatu saa 04:00 za gitondo</p>
                <p>• Ubwoko bw'imodoka: Fuso Fighter (Toni 10)</p>
                <p>• Igiciro ku mufuka w'ibirayi: 800 RWF aho kuba 1,500 RWF</p>
                <p>• Abahinzi bamaze kwiyandikisha: Abahinzi 7</p>
              </div>
              <button
                type="button"
                className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                {language === "rw" ? "Saba Umwanya mu Kamyo (Book Slot)" : "Reserve Space"}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                  Ikamyoneti 2: Kinigi Hub → Kimironko Market
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  YUZUYE (10 TONI)
                </span>
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                <p>• Umunsi wo guhaguruka: Kuwa Gatanu saa 05:00 za gitondo</p>
                <p>• Umushoferi: Theogene Mugisha (0788667788)</p>
                <p>• Umusaruro: Ibirayi bya Kinigi (Grade A)</p>
                <p>• Abahinzi biyandikishije: Abahinzi 12</p>
              </div>
              <button
                type="button"
                disabled
                className="w-full py-2 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-400 text-xs font-bold cursor-not-allowed"
              >
                {language === "rw" ? "Imyanya Yuzuye" : "Full Capacity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BULK ORDER */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-bold text-base text-stone-900 dark:text-white font-display">
                {language === "rw" ? "Komande Nshya ya Nkunganire" : "New Bulk Input Subsidy Order"}
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBulkOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Izina ry'Ifumbire / Imbuto" : "Input Name"}
                </label>
                <input
                  type="text"
                  required
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ingano Yose Ikenewe (Kg)" : "Total Kg Needed"}
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  value={totalKg}
                  onChange={(e) => setTotalKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Igiciro cya Nkunganire (RWF)" : "Subsidized Price"}
                  </label>
                  <input
                    type="number"
                    required
                    value={subsidizedPrice}
                    onChange={(e) => setSubsidizedPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === "rw" ? "Igiciro cy'Isoko (RWF)" : "Commercial Price"}
                  </label>
                  <input
                    type="number"
                    required
                    value={commercialPrice}
                    onChange={(e) => setCommercialPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  {language === "rw" ? "Hagarika" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs"
                >
                  {language === "rw" ? "Ohereza Komande" : "Submit Bulk Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
