import React, { useState } from "react";
import { 
  User, 
  Language, 
  MarketPrice, 
  WeatherForecast, 
  Farm, 
  FarmPlan, 
  Expense, 
  HarvestRecord, 
  SaleRecord, 
  TrainingCourse 
} from "../types";
import { initialUsers, agronomyGuides } from "../data/mockData";
import {
  ShieldCheck,
  Users,
  Sprout,
  TrendingUp,
  LineChart,
  Radio,
  BookOpen,
  CloudLightning,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Send,
  Eye,
  RefreshCw,
  Award,
  Filter,
  ArrowUpRight
} from "lucide-react";

interface AdminDashboardViewProps {
  currentUser: User | null;
  language: Language;
  farms: Farm[];
  plans: FarmPlan[];
  expenses: Expense[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  marketPrices: MarketPrice[];
  onUpdateMarketPrices: (prices: MarketPrice[]) => void;
  weatherForecasts: WeatherForecast[];
  trainingCourses: TrainingCourse[];
  onAddTrainingCourse: (course: TrainingCourse) => void;
  onSwitchToFarmer: () => void;
}

type AdminTab = "overview" | "farmers" | "market" | "alerts" | "training" | "subsidies";

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  language,
  farms,
  plans,
  expenses,
  harvests,
  sales,
  marketPrices,
  onUpdateMarketPrices,
  weatherForecasts,
  trainingCourses,
  onAddTrainingCourse,
  onSwitchToFarmer,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [userList, setUserList] = useState<User[]>(initialUsers);
  const [searchFarmerQuery, setSearchFarmerQuery] = useState("");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("all");

  // Broadcast Alert State
  const [alertDistrict, setAlertDistrict] = useState("Musanze");
  const [alertType, setAlertType] = useState<"weather" | "pest" | "market">("weather");
  const [alertMessage, setAlertMessage] = useState("");
  const [broadcastLog, setBroadcastLog] = useState<Array<{ id: string; time: string; title: string; district: string; type: string }>>([
    {
      id: "b-1",
      time: "Uyu munsi, 08:30 AM",
      title: "Imvura nyinshi mu misozi y'ibirunga (Musanze & Nyabihu). Fata ingamba zo gukumira isuri.",
      district: "Musanze",
      type: "weather",
    },
    {
      id: "b-2",
      time: "Ejo hashize, 03:15 PM",
      title: "Ibiciro by'ibirayi byazamutse i Kigali kuri 340 RWF/kg ku bacuruzi ba Nyabugogo.",
      district: "National",
      type: "market",
    },
  ]);

  // Market Price Editing State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<number>(0);

  // New Training Course Modal / Form State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseInstructor, setNewCourseInstructor] = useState("Dr. Charles Bucagu (RAB)");
  const [newCourseCategory, setNewCourseCategory] = useState<TrainingCourse["category"]>("potato");
  const [newCourseDuration, setNewCourseDuration] = useState(30);

  // Filter Farmers
  const filteredFarmers = userList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchFarmerQuery.toLowerCase()) ||
      u.district.toLowerCase().includes(searchFarmerQuery.toLowerCase()) ||
      u.primaryCrop.toLowerCase().includes(searchFarmerQuery.toLowerCase()) ||
      u.phone.includes(searchFarmerQuery);
    const matchesDistrict =
      selectedDistrictFilter === "all" || u.district.toLowerCase() === selectedDistrictFilter.toLowerCase();
    return matchesSearch && matchesDistrict;
  });

  const handleToggleVerify = (userId: string) => {
    setUserList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, verified: !u.verified } : u))
    );
  };

  const handleSavePrice = (id: string) => {
    if (editPriceVal <= 0) return;
    const updated = marketPrices.map((mp) =>
      mp.id === id
        ? {
            ...mp,
            priceAvg: editPriceVal,
            priceMax: Math.round(editPriceVal * 1.08),
            priceMin: Math.round(editPriceVal * 0.92),
            lastUpdated: "Ubu hashize akanya (Admin update)",
          }
        : mp
    );
    onUpdateMarketPrices(updated);
    setEditingPriceId(null);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;

    const newBroadcast = {
      id: `bc-${Date.now()}`,
      time: "Ubu ngubu (Just now)",
      title: alertMessage.trim(),
      district: alertDistrict,
      type: alertType,
    };
    setBroadcastLog([newBroadcast, ...broadcastLog]);
    setAlertMessage("");
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    const newCourse: TrainingCourse = {
      id: `course-${Date.now()}`,
      title: newCourseTitle.trim(),
      subtitle: "Isomo rishya ryemejwe na RAB & Terimbere",
      category: newCourseCategory,
      type: "course",
      durationMinutes: newCourseDuration,
      thumbnailUrl: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=500&auto=format&fit=crop&q=80",
      description: "Amasomo y'ubuhinzi bugezweho afasha abahinzi kongera umusaruro w'ubuhinzi.",
      instructor: newCourseInstructor,
      rabCertified: true,
    };

    onAddTrainingCourse(newCourse);
    setShowAddCourse(false);
    setNewCourseTitle("");
  };

  return (
    <div className="space-y-6">
      {/* Admin Master Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-teal-950 rounded-2xl p-6 sm:p-8 text-white shadow-md border border-emerald-800/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/60 text-emerald-200 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TERIMBERE ADMIN CONTROL CENTER • SUPER USER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {language === "rw" ? "Ubuyobozi Bukuru bwa Terimbere (Admin)" : "Terimbere Central Administration"}
            </h1>
            <p className="text-stone-300 text-sm mt-1.5 max-w-2xl">
              {language === "rw"
                ? "Genzura abahinzi bose, ibiciro by'isoko, ibyatewe ku gihugu hose, no gutangaza amatangazo n'amasomo y'ubuhinzi ya RAB."
                : "Manage all farmers, live market prices, national planting acreage, and broadcast urgent RAB agro-advisories."}
            </p>
            <div className="mt-3 flex items-center space-x-3 text-xs text-emerald-300 font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-emerald-200">
                Ubuyobozi Bukuru (Chief System Administrator)
              </span>
              <span>•</span>
              <span className="text-stone-300">Minagri / RAB Partner Network</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={onSwitchToFarmer}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-sm"
            >
              <Eye className="w-4 h-4" />
              <span>{language === "rw" ? "Reba nka Jean (Farmer View)" : "Switch to Farmer View (Jean)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 border-b border-stone-200 dark:border-stone-800">
        {[
          { id: "overview", label: language === "rw" ? "Isesengura Rusange (Overview)" : "National Overview", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "farmers", label: language === "rw" ? "Abahinzi Bose (Farmers)" : "Farmer Directory", icon: <Users className="w-4 h-4" /> },
          { id: "market", label: language === "rw" ? "Ibiciro by'Isoko (Markets)" : "Market Price Editor", icon: <LineChart className="w-4 h-4" /> },
          { id: "alerts", label: language === "rw" ? "Amatangazo & Ikirere (Alerts)" : "Weather & Pest Broadcast", icon: <Radio className="w-4 h-4" /> },
          { id: "training", label: language === "rw" ? "Amasomo ya RAB (Training)" : "Training CMS", icon: <BookOpen className="w-4 h-4" /> },
          { id: "subsidies", label: language === "rw" ? "Smart Nkunganire (Subsidies)" : "Subsidies & Inputs", icon: <Award className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-emerald-800 text-white shadow-xs"
                : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: NATIONAL OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top High-level Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">
                <span>{language === "rw" ? "Abahinzi Banditswe" : "Registered Farmers"}</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                5,420
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                +148 bariyandikishije muri uku kwezi
              </p>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">
                <span>{language === "rw" ? "Ubuso Buri Gukorerwa" : "Active Acreage"}</span>
                <Sprout className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                8,950 <span className="text-sm font-bold text-stone-500">Ha</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Uturere 30 tw'u Rwanda twose turimo
              </p>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">
                <span>{language === "rw" ? "Umusaruro Utegerejwe" : "Projected Yield"}</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                34,200 <span className="text-sm font-bold text-stone-500">Toni</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                Ibirayi 62% • Ibigori 24% • Inyanya 14%
              </p>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">
                <span>{language === "rw" ? "Amafaranga Yinjiye" : "Sales Volume"}</span>
                <ArrowUpRight className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                4.8 <span className="text-sm font-bold text-stone-500">Miliyari RWF</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Yishyuwe binyuze kuri MoMo & Banks
              </p>
            </div>
          </div>

          {/* District Distribution & Top Crops */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center space-x-2">
                <Sprout className="w-5 h-5 text-emerald-600" />
                <span>{language === "rw" ? "Ubuso Bwahinzwe ku Bihingwa (National Distribution)" : "National Crop Acreage"}</span>
              </h3>
              <div className="space-y-3.5 text-sm">
                <div>
                  <div className="flex justify-between font-semibold text-stone-800 dark:text-stone-200 mb-1">
                    <span>Ibirayi (Musanze, Nyabihu, Rubavu, Burera)</span>
                    <span className="font-bold text-emerald-700">5,540 Ha (62%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "62%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-stone-800 dark:text-stone-200 mb-1">
                    <span>Ibigori (Nyagatare, Gatsibo, Kayonza, Kirehe)</span>
                    <span className="font-bold text-amber-700">2,150 Ha (24%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "24%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-stone-800 dark:text-stone-200 mb-1">
                    <span>Inyanya & Imboga (Huye, Bugesera, Kamonyi)</span>
                    <span className="font-bold text-teal-700">1,260 Ha (14%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: "14%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs">
              <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center space-x-2">
                <Radio className="w-5 h-5 text-amber-600" />
                <span>{language === "rw" ? "Amatangazo n'Impumpu Biheruka Gutangazwa" : "Recent Broadcasted Alerts"}</span>
              </h3>
              <div className="space-y-3 text-xs">
                {broadcastLog.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60"
                  >
                    <div className="flex items-center justify-between text-stone-400 mb-1">
                      <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                        {b.district} • {b.type}
                      </span>
                      <span>{b.time}</span>
                    </div>
                    <p className="text-stone-800 dark:text-stone-200 font-medium">
                      {b.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FARMERS MANAGEMENT */}
      {activeTab === "farmers" && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {language === "rw" ? "Urutonde rw'Abahinzi Banditswe" : "Registered Farmers Directory"}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw" ? "Genzura konti z'abahinzi, umubare w'ubutaka, no kwemeza umwirondoro wabo" : "Manage accounts, verification status, and crop profiles"}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* District Filter */}
              <select
                value={selectedDistrictFilter}
                onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium"
              >
                <option value="all">{language === "rw" ? "Uturere Twose" : "All Districts"}</option>
                <option value="Musanze">Musanze</option>
                <option value="Nyagatare">Nyagatare</option>
                <option value="Huye">Huye</option>
                <option value="Rubavu">Rubavu</option>
              </select>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder={language === "rw" ? "Shakisha umuhinzi..." : "Search farmer..."}
                  value={searchFarmerQuery}
                  onChange={(e) => setSearchFarmerQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 uppercase font-bold">
                  <th className="py-3 px-3">Umuhinzi (Farmer)</th>
                  <th className="py-3 px-3">Akarere (District)</th>
                  <th className="py-3 px-3">Ubuso (Land Size)</th>
                  <th className="py-3 px-3">Igihingwa (Main Crop)</th>
                  <th className="py-3 px-3">Telefone & Email</th>
                  <th className="py-3 px-3">Imimerere (Status)</th>
                  <th className="py-3 px-3 text-right">Igikorwa (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredFarmers.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={f.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                          alt={f.name}
                          className="w-8 h-8 rounded-full object-cover border border-emerald-300"
                        />
                        <div>
                          <div className="font-bold text-stone-900 dark:text-white flex items-center space-x-1">
                            <span>{f.name}</span>
                            {f.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <span className="text-[10px] text-stone-400">@{f.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-stone-700 dark:text-stone-300">
                      {f.district} ({f.sector})
                    </td>
                    <td className="py-3.5 px-3 font-bold text-stone-900 dark:text-stone-100">
                      {f.farmSizeHa > 0 ? `${f.farmSizeHa} Ha` : "N/A"}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-emerald-800 dark:text-emerald-400">
                      {f.primaryCrop}
                    </td>
                    <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                      <div>{f.phone}</div>
                      <div className="text-[10px] text-stone-400">{f.email}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.verified
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {f.verified ? "Verified Farmer" : "Pending Verification"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleVerify(f.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200"
                      >
                        {f.verified ? "Deactivate" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MARKET PRICE EDITOR */}
      {activeTab === "market" && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              {language === "rw" ? "Gucunga Ibiciro by'Amasoko y'u Rwanda" : "Live Wholesale Market Price Controller"}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? "Hindura ibiciro by'isoko rya Kimironko, Musanze, Nyabugogo, Huye, n'ahandi kugira ngo abahinzi babone ibiciro nyabyo ubu."
                : "Update official benchmark market prices displayed across the entire Terimbere app."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketPrices.map((mp) => (
              <div
                key={mp.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/80 hover:border-emerald-500 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                      {mp.district}
                    </span>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-0.5">
                      {mp.crop}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{mp.marketName}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                    {mp.trend === "up" ? "↑ Zamutse" : mp.trend === "down" ? "↓ Zimanutse" : "→ Ziratebye"}
                  </span>
                </div>

                <div className="my-3 pt-3 border-t border-stone-200 dark:border-stone-700">
                  {editingPriceId === mp.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-bold text-sm"
                        />
                        <span className="text-xs text-stone-500 font-bold">{mp.unit}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSavePrice(mp.id)}
                          className="flex-1 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPriceId(null)}
                          className="px-2 py-1 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xl font-black text-stone-900 dark:text-white">
                          {mp.priceAvg.toLocaleString()} <span className="text-xs font-bold text-stone-500">{mp.unit}</span>
                        </div>
                        <span className="text-[10px] text-stone-400">{mp.lastUpdated}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingPriceId(mp.id);
                          setEditPriceVal(mp.priceAvg);
                        }}
                        className="p-2 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:text-emerald-600 font-bold text-xs flex items-center space-x-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Hindura</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WEATHER & PEST BROADCAST */}
      {activeTab === "alerts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Alert Form */}
          <div className="lg:col-span-1 bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Radio className="w-5 h-5 text-emerald-600" />
              <span>{language === "rw" ? "Tangaza Itangazo Rishya" : "Dispatch New Agri Alert"}</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? "Iri tangazo rihita rigera ku banyamuryango bose ba Terimbere mu karere wahisemo."
                : "This broadcast reaches all registered farmers in the targeted district immediately."}
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Akarere gakorerwamo" : "Target District"}
                </label>
                <select
                  value={alertDistrict}
                  onChange={(e) => setAlertDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="National (Rwanda Hose)">National (Rwanda Hose)</option>
                  <option value="Musanze">Musanze (Amajyaruguru)</option>
                  <option value="Nyagatare">Nyagatare (Iburasirazuba)</option>
                  <option value="Huye">Huye (Amajyepfo)</option>
                  <option value="Rubavu">Rubavu (Iburengerazuba)</option>
                  <option value="Nyabihu">Nyabihu</option>
                  <option value="Gicumbi">Gicumbi</option>
                  <option value="Bugesera">Bugesera</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ubwoko bw'Itangazo" : "Alert Type"}
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="weather">Ikirere n'Imvura (Weather & Flood)</option>
                  <option value="pest">Indwara n'Ibyonnyi (Pest & Disease Outbreak)</option>
                  <option value="market">Ibiciro n'Amasoko (Market Opportunity)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === "rw" ? "Ubutumwa bukubiyemo" : "Alert Text"}
                </label>
                <textarea
                  rows={4}
                  required
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder={
                    language === "rw"
                      ? "urugero: Imvura nyinshi iteganyijwe mu misozi ya Musanze. Abahinzi b'ibirayi barasabwa gukora imiringoti..."
                      : "Describe emergency conditions or advice..."
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Ohereza Itangazo" : "Broadcast to Farmers"}</span>
              </button>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="lg:col-span-2 bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <CloudLightning className="w-5 h-5 text-amber-600" />
              <span>{language === "rw" ? "Amatangazo Yatangajwe Ubu n'Igihembwe Gishize" : "Broadcast History & Feed"}</span>
            </h2>

            <div className="space-y-3">
              {broadcastLog.map((bc) => (
                <div
                  key={bc.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 uppercase">
                        {bc.district}
                      </span>
                      <span className="text-[10px] text-stone-400">{bc.time}</span>
                    </div>
                    <p className="text-xs text-stone-800 dark:text-stone-200 font-semibold leading-relaxed">
                      {bc.title}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TRAINING CMS */}
      {activeTab === "training" && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {language === "rw" ? "Gucunga Amasomo n'Inyigisho z'Ubuhinzi (RAB CMS)" : "Agronomy Training CMS"}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === "rw"
                  ? "Ongeramo amasomo mashya cyangwa amashusho yigisha abahinzi b'i Musanze na Nyagatare."
                  : "Publish guides and videos for farmers across Rwanda."}
              </p>
            </div>

            <button
              onClick={() => setShowAddCourse(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Ongeraho Isomo Rishya" : "Add New Course"}</span>
            </button>
          </div>

          {showAddCourse && (
            <form onSubmit={handleCreateCourse} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                {language === "rw" ? "Injiza Isomo Rishya" : "New Training Course Form"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Umutwe w'isomo (Title)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Urugero: Uko barinda ibirayi urume..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Umwarimu / Agronome
                  </label>
                  <input
                    type="text"
                    value={newCourseInstructor}
                    onChange={(e) => setNewCourseInstructor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs">
                  Save & Publish
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trainingCourses.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-2xs"
              >
                <img src={c.thumbnailUrl} alt={c.title} className="w-full h-32 object-cover" />
                <div className="p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {c.type === "video" ? "Video Course" : "Full Guide"}
                    </span>
                    <span className="text-stone-400">{c.durationMinutes} min</span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-white leading-snug">
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {c.instructor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SUBSIDIES & SMART NKUNGANIRE */}
      {activeTab === "subsidies" && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              {language === "rw" ? "Gukurikirana Nkunganire na Smart Nkunganire" : "Smart Nkunganire Subsidy Tracking"}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? "Kugenzura amakoni y'ifumbire na DAP/NPK yahawe abahinzi kuri Nkunganire ya Leta y'u Rwanda."
                : "Monitor fertilizer and certified seed subsidies provided under Government of Rwanda Smart Nkunganire."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Ifumbire NPK & DAP Yahawe Abahinzi</span>
              <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                1,420 <span className="text-sm">Toni</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Igiciro kigabanyijeho 40% binyuze muri Agrodealer</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300">Imbuto z'Ibirayi Byemejwe</span>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
                480 <span className="text-sm">Toni</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Imbuto ya Kinigi yemejwe na RAB</p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-300">Ubwishingizi bw'Ibihingwa (Tekana Urishingiwe)</span>
              <div className="text-2xl font-black text-teal-950 dark:text-teal-100 mt-1">
                3,890 <span className="text-sm">Abahinzi</span>
              </div>
              <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">Kwishyura igihombo cy'imvura n'izuba na BDF & SONARWA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
