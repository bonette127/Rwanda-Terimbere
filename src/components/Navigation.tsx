import React, { useState, useEffect, useMemo } from "react";
import { Language, User } from "../types";
import { getTranslation } from "../i18n";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Receipt,
  CalendarCheck,
  TrendingUp,
  Bot,
  GraduationCap,
  LineChart,
  ShoppingBag,
  Layers,
  BarChart3,
  ShieldCheck,
  Camera,
  Users,
  Compass,
  Building2,
  ChevronDown,
  Grid,
  Check,
  Menu,
  X,
  Search,
  SlidersHorizontal,
  Compass as WorkflowIcon,
  Download,
  HardDriveDownload,
  QrCode,
  Phone,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "cropDoctor"
  | "operations"
  | "cooperative"
  | "suitability"
  | "farms"
  | "plans"
  | "expenses"
  | "activities"
  | "harvestSales"
  | "profit"
  | "cycleReport"
  | "analytics"
  | "aiAdvisor"
  | "training"
  | "marketWeather"
  | "admin";

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  language: Language;
  currentUser: User | null;
  onOpenWorkflowGuide?: () => void;
  onOpenExportReport?: () => void;
  onOpenUssd?: () => void;
  onOpenContact?: () => void;
  onOpenDeployModal?: () => void;
  onOpenOfflineBackup?: () => void;
  onOpenQrScanner?: () => void;
}

interface NavItem {
  id: NavTab;
  labelEn: string;
  labelRw: string;
  descEn: string;
  descRw: string;
  category: "core" | "precision" | "ops" | "reports";
  icon: React.ReactNode;
  badge?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  language,
  currentUser,
  onOpenWorkflowGuide,
  onOpenExportReport,
  onOpenUssd,
  onOpenContact,
  onOpenDeployModal,
  onOpenOfflineBackup,
  onOpenQrScanner,
}) => {
  const t = getTranslation(language);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMoreMenuOpen(false);
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Comprehensive master list of all 17 system modules
  const allNavItems: NavItem[] = useMemo(() => {
    return [
      // Category 1: Core Field Production
      {
        id: "dashboard",
        labelEn: "Dashboard",
        labelRw: t.dashboard,
        descEn: "Overview KPIs, daily goals, weather & irrigation triggers",
        descRw: "Incamake y'umunsi, intego, ikirere & kuhira",
        category: "core",
        icon: <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "farms",
        labelEn: "Farms & Map",
        labelRw: "Imirima & Ikarita",
        descEn: "GPS parcel boundaries, soil tests & elevation",
        descRw: "Ikarita y'ubutaka, GPS, pH & ubuhinzi",
        category: "core",
        icon: <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "plans",
        labelEn: "Crop Plans",
        labelRw: "Igenamigambi",
        descEn: "Growth timelines, harvest countdown & inputs",
        descRw: "Ingengabihe y'ihinga, imikurire & isarura",
        category: "core",
        icon: <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "activities",
        labelEn: "Activities",
        labelRw: "Imirimo & Ihinga",
        descEn: "Task schedules, shift windows & worker logging",
        descRw: "Gutegeka imibyizi, kuhira & gufumbira",
        category: "core",
        icon: <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "expenses",
        labelEn: "Expenses",
        labelRw: t.expenses,
        descEn: "Financial inputs, receipts & cost tracking",
        descRw: "Amafaranga yasohotse mu guhinga & inyemezabwishyu",
        category: "core",
        icon: <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      },
      {
        id: "harvestSales",
        labelEn: "Harvest & Sales",
        labelRw: "Umusaruro & Isoko",
        descEn: "Crop batch storage, grading & sales revenue",
        descRw: "Kubika umusaruro, icyiciro A/B & amafaranga yinjira",
        category: "core",
        icon: <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "profit",
        labelEn: "Profit & ROI",
        labelRw: "Inyungu & Raporo",
        descEn: "Realized net income, ROI % & CSV/PDF bank export",
        descRw: "Inyungu isaguka, igishoro & gukuramo dosiye",
        category: "core",
        icon: <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },

      // Category 2: AI & Precision Agronomy
      {
        id: "cropDoctor",
        labelEn: "Crop Doctor AI",
        labelRw: "Muganga w'Ibihingwa",
        descEn: "Camera leaf disease diagnosis & RAB approved treatments",
        descRw: "Gusuzuma indwara z'amababi & imiti ya RAB yemewe",
        category: "precision",
        badge: "AI Vision",
        icon: <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "aiAdvisor",
        labelEn: "AI Agronomist",
        labelRw: "Umujyanama AI",
        descEn: "24/7 intelligent agronomy advice in Kinyarwanda & English",
        descRw: "Umujyanama w'ubuhinzi usobanura byose mu Kinyarwanda",
        category: "precision",
        badge: "Gemini",
        icon: <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      },
      {
        id: "suitability",
        labelEn: "Soil & GPS Suitability",
        labelRw: "Ubutaka & GPS",
        descEn: "Match elevation & soil pH to optimal crop varieties",
        descRw: "Gupima ubujyakuzimu, pH & ibihingwa bibereye agace",
        category: "precision",
        icon: <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
      },

      // Category 3: Operations & Cooperative Hub
      {
        id: "cooperative",
        labelEn: "Cooperative Hub",
        labelRw: "Koperative & Ikipe",
        descEn: "Member harvest aggregation, bulk inputs & team sync",
        descRw: "Gukusanya umusaruro w'abanyamuryango & ifumbire",
        category: "ops",
        icon: <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      },
      {
        id: "operations",
        labelEn: "Labor & Transport",
        labelRw: "Abakozi & Ubwikorezi",
        descEn: "Daily casual laborer attendance & harvest logistics",
        descRw: "Imibyizi y'abakozi ba nyakabyizi & ingendo z'imodoka",
        category: "ops",
        icon: <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      },
      {
        id: "marketWeather",
        labelEn: "Markets & Weather",
        labelRw: "Amasoko & Ikirere",
        descEn: "Wholesale crop market prices & 7-day agro-forecasts",
        descRw: "Ibiciro by'ibirayi/ibigori ku masoko & iteganyagihe",
        category: "ops",
        icon: <LineChart className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      },
      {
        id: "training",
        labelEn: "Agronomy Training",
        labelRw: "Amahugurwa ya RAB",
        descEn: "Farmer guides, pest identification manuals & videos",
        descRw: "Imfashanyigisho z'ubuhinzi bw'umwuga & video",
        category: "ops",
        icon: <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      },

      // Category 4: Reports & Governance
      {
        id: "cycleReport",
        labelEn: "Season & Bank Reports",
        labelRw: "Raporo z'Igihembwe",
        descEn: "Official bank loan dossiers, BDF & SACCO credit sheets",
        descRw: "Dosiye zo kwaka inguzanyo muri Banki na SACCO",
        category: "reports",
        icon: <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      },
      {
        id: "analytics",
        labelEn: "Analytics Summary",
        labelRw: "Isesengura ry'Imibare",
        descEn: "Historical harvest trends, input efficiency & metrics",
        descRw: "Imbonerahamwe y'imibare y'umusaruro & igishoro",
        category: "reports",
        icon: <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      },
      ...(currentUser?.role === "admin"
        ? [
            {
              id: "admin" as NavTab,
              labelEn: "Admin Console",
              labelRw: "Ubuyobozi (Admin)",
              descEn: "National governance, price management & audit logs",
              descRw: "Igenzura ry'ubuyobozi bukuru, ibiciro & abakoresha",
              category: "reports" as const,
              badge: "Admin",
              icon: <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
            },
          ]
        : []),
    ];
  }, [t.dashboard, t.expenses, currentUser?.role]);

  // Primary desktop tabs (first 7 most frequent)
  const primaryDesktopTabs = useMemo(() => {
    return allNavItems.slice(0, 7);
  }, [allNavItems]);

  // Secondary desktop tabs for the dropdown
  const secondaryDesktopTabs = useMemo(() => {
    return allNavItems.slice(7);
  }, [allNavItems]);

  const activeTabMeta = useMemo(() => {
    return (
      allNavItems.find((item) => item.id === currentTab) || allNavItems[0]
    );
  }, [allNavItems, currentTab]);

  const isCurrentInSecondary = useMemo(() => {
    return secondaryDesktopTabs.some((t) => t.id === currentTab);
  }, [secondaryDesktopTabs, currentTab]);

  // Filtered items for mobile drawer search
  const filteredDrawerItems = useMemo(() => {
    if (!searchQuery.trim()) return allNavItems;
    const q = searchQuery.toLowerCase().trim();
    return allNavItems.filter(
      (item) =>
        item.labelEn.toLowerCase().includes(q) ||
        item.labelRw.toLowerCase().includes(q) ||
        item.descEn.toLowerCase().includes(q) ||
        item.descRw.toLowerCase().includes(q)
    );
  }, [allNavItems, searchQuery]);

  // Category groupings
  const categories = useMemo(
    () => [
      {
        id: "core",
        titleEn: "Field Production",
        titleRw: "Umusaruro w'Ingenzi",
        badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      },
      {
        id: "precision",
        titleEn: "AI & Precision Agronomy",
        titleRw: "Ikoranabuhanga & AI",
        badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
      },
      {
        id: "ops",
        titleEn: "Operations & Cooperative",
        titleRw: "Koperative & Imirimo",
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      },
      {
        id: "reports",
        titleEn: "Reports & Governance",
        titleRw: "Raporo & Ubuyobozi",
        badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
      },
    ],
    []
  );

  return (
    <>
      {/* ========================================================
          STICKY TOP NAVIGATION BAR (Responsive on all screen sizes)
          ======================================================== */}
      <nav className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 sticky top-16 z-30 shadow-2xs transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* DESKTOP & TABLET VIEW (md and up) */}
          <div className="hidden md:flex items-center justify-between gap-2 py-2">
            {/* Primary Desktop Tabs (scrollable with zero scrollbar) */}
            <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2">
              {primaryDesktopTabs.map((tab) => {
                const isActive = currentTab === tab.id;
                const label = language === "rw" ? tab.labelRw : tab.labelEn;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onTabChange(tab.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-emerald-800 text-white shadow-2xs"
                        : "text-stone-600 dark:text-stone-300 hover:text-emerald-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <span className={isActive ? "text-amber-300" : "text-emerald-700 dark:text-emerald-400"}>
                      {tab.icon}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop "More Modules" Dropdown Trigger */}
            <div className="relative shrink-0 pl-2 border-l border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isCurrentInSecondary
                    ? "bg-amber-500 text-stone-950 shadow-2xs"
                    : isMoreMenuOpen
                    ? "bg-emerald-900 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
                aria-expanded={isMoreMenuOpen}
              >
                <Grid className="w-4 h-4" />
                <span>
                  {isCurrentInSecondary
                    ? language === "rw"
                      ? activeTabMeta.labelRw
                      : activeTabMeta.labelEn
                    : language === "rw"
                    ? "Izindi Serivisi"
                    : "More Modules"}
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 text-[10px] font-mono">
                  {secondaryDesktopTabs.length}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMoreMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Desktop Dropdown Menu Window */}
              {isMoreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMoreMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-[580px] bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2 py-1.5 border-b border-stone-100 dark:border-stone-800 mb-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                          {language === "rw"
                            ? "Serivisi Zose z'Ubuhinzi (Modules)"
                            : "Specialized Farm Management Modules"}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">
                          {language === "rw"
                            ? "Hitamo igice wifuza gufungura ako kanya"
                            : "Direct access to AI diagnostics, cooperative tools, & bank reports"}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-stone-400">
                        {secondaryDesktopTabs.length} {language === "rw" ? "serivisi" : "tools"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-[68vh] overflow-y-auto pr-1">
                      {secondaryDesktopTabs.map((sec) => {
                        const isSecActive = currentTab === sec.id;
                        const label = language === "rw" ? sec.labelRw : sec.labelEn;
                        const desc = language === "rw" ? sec.descRw : sec.descEn;

                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => {
                              onTabChange(sec.id);
                              setIsMoreMenuOpen(false);
                            }}
                            className={`flex items-start space-x-3 p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                              isSecActive
                                ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-100 shadow-2xs"
                                : "border-stone-100 dark:border-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300"
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0 mt-0.5">
                              {sec.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                                  {label}
                                </span>
                                {sec.badge && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 shrink-0">
                                    {sec.badge}
                                  </span>
                                )}
                                {isSecActive && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                                {desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ========================================================
              MOBILE & SMARTPHONE VIEW (< md)
              ======================================================== */}
          <div className="flex md:hidden items-center justify-between py-2 gap-2">
            {/* Left: Active Tab Indicator with Quick Click to Open Menu */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold text-xs truncate max-w-[210px] cursor-pointer"
            >
              <span className="p-1 rounded-lg bg-emerald-600 text-white shrink-0">
                {activeTabMeta.icon}
              </span>
              <span className="truncate">
                {language === "rw" ? activeTabMeta.labelRw : activeTabMeta.labelEn}
              </span>
              <ChevronDown className="w-3 h-3 text-emerald-700 shrink-0" />
            </button>

            {/* Middle: 3 Quick Thumb-Friendly Shortcuts (Dashboard, Farms, Activities) */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={() => onTabChange("dashboard")}
                title={t.dashboard}
                className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentTab === "dashboard"
                    ? "bg-emerald-800 text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onTabChange("farms")}
                title={language === "rw" ? "Imirima" : "Farms"}
                className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentTab === "farms"
                    ? "bg-emerald-800 text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <MapPin className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onTabChange("activities")}
                title={language === "rw" ? "Imirimo" : "Schedule"}
                className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  currentTab === "activities"
                    ? "bg-emerald-800 text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Master Mobile Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open mobile menu"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-linear-to-r from-emerald-800 to-[#064E3B] text-white font-extrabold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Menu className="w-4 h-4 text-amber-300" />
              <span>{language === "rw" ? "Menu" : "Menu"}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* ========================================================
          FULL RESPONSIVE MOBILE NAVIGATION DRAWER (Slide-Out)
          ======================================================== */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content Panel */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-stone-900 text-stone-900 dark:text-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#064E3B] to-emerald-900 text-white flex items-center justify-between border-b border-emerald-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
                  <Grid className="w-5 h-5 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight leading-none">
                    TERIMBERE
                  </h3>
                  <p className="text-[11px] text-emerald-200 font-medium mt-0.5">
                    {language === "rw"
                      ? "Hitamo Serivisi cyangwa Igice (17 Modules)"
                      : "All 17 Agricultural Modules & Tools"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search / Filter in Drawer */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === "rw"
                      ? "Shakisha igice (urugero: Ikirere, Ubutaka)..."
                      : "Search tools (e.g. Doctor, Weather, Plans)..."
                  }
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List of Modules by Categories */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5">
              {categories.map((cat) => {
                const itemsInCat = filteredDrawerItems.filter(
                  (item) => item.category === cat.id
                );
                if (itemsInCat.length === 0) return null;

                const catTitle = language === "rw" ? cat.titleRw : cat.titleEn;

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        {catTitle}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cat.badgeColor}`}
                      >
                        {itemsInCat.length}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {itemsInCat.map((item) => {
                        const isActive = currentTab === item.id;
                        const label = language === "rw" ? item.labelRw : item.labelEn;
                        const desc = language === "rw" ? item.descRw : item.descEn;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onTabChange(item.id);
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-start space-x-3 p-2.5 rounded-2xl text-left transition-all border cursor-pointer ${
                              isActive
                                ? "bg-emerald-800 text-white border-emerald-700 shadow-sm"
                                : "bg-stone-50/70 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-white dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                              }`}
                            >
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-black truncate ${
                                    isActive
                                      ? "text-white"
                                      : "text-stone-900 dark:text-white"
                                  }`}
                                >
                                  {label}
                                </span>
                                {item.badge && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-black shrink-0 ${
                                      isActive
                                        ? "bg-amber-400 text-stone-950"
                                        : "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300"
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                                {isActive && (
                                  <Check className="w-4 h-4 text-amber-300 shrink-0" />
                                )}
                              </div>
                              <p
                                className={`text-[11px] line-clamp-1 mt-0.5 ${
                                  isActive
                                    ? "text-emerald-100"
                                    : "text-stone-500 dark:text-stone-400"
                                }`}
                              >
                                {desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions Footer inside Drawer */}
            <div className="p-3 bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 shrink-0 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-1">
                {language === "rw" ? "Ibyihutirwa" : "Quick Actions"}
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                {onOpenWorkflowGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenWorkflowGuide();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex items-center space-x-1.5 p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 transition-colors cursor-pointer"
                  >
                    <WorkflowIcon className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {language === "rw" ? "Urugendo rw'Ihinga" : "Workflow Guide"}
                    </span>
                  </button>
                )}

                {onOpenExportReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenExportReport();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex items-center space-x-1.5 p-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {language === "rw" ? "Raporo ya PDF" : "PDF Dossier"}
                    </span>
                  </button>
                )}

                {onOpenQrScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenQrScanner();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex items-center space-x-1.5 p-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span className="truncate">
                      {language === "rw" ? "Sikana QR" : "Scan QR"}
                    </span>
                  </button>
                )}

                {onOpenOfflineBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenOfflineBackup();
                      setIsMobileDrawerOpen(false);
                    }}
                    className="flex items-center space-x-1.5 p-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">
                      {language === "rw" ? "Offline Backup" : "JSON Backup"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
