import React, { useState } from "react";
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
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  language,
  currentUser,
}) => {
  const t = getTranslation(language);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Primary daily workflow tabs (always visible in the main bar)
  const primaryTabs: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "dashboard",
      label: t.dashboard,
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "farms",
      label: language === "rw" ? "Imirima & Ikarita" : "Farms & Map",
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: "plans",
      label: language === "rw" ? "Igenamigambi" : "Crop Plans",
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      id: "activities",
      label: language === "rw" ? "Ihinga & Imirimo" : "Activities & Schedule",
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      id: "expenses",
      label: t.expenses,
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      id: "harvestSales",
      label: language === "rw" ? "Umusaruro & Isoko" : "Harvest & Sales",
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      id: "profit",
      label: language === "rw" ? "Inyungu & Raporo" : "Profit & Export",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "aiAdvisor",
      label: language === "rw" ? "Umujyanama AI" : "AI Advisor",
      icon: <Bot className="w-4 h-4" />,
    },
  ];

  // All specialized modules accessible in the non-clipped dropdown drawer
  const secondaryTabs: Array<{
    id: NavTab;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "cropDoctor",
      label: language === "rw" ? "Muganga w'Ibihingwa (AI)" : "Crop Doctor AI",
      description:
        language === "rw"
          ? "Gusuzuma indwara z'ibihingwa n'imiti ya RAB"
          : "Diagnose plant diseases & RAB treatments",
      icon: <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
    },
    {
      id: "cooperative",
      label: language === "rw" ? "Koperative & Ikipe" : "Cooperative Hub",
      description:
        language === "rw"
          ? "Umusaruro w'abakozi, ifumbire ya Nkunganire n'ikipe"
          : "Team activity heatmap, labor velocity & bulk inputs",
      icon: <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
    },
    {
      id: "operations",
      label: language === "rw" ? "Abakozi & Ubwikorezi" : "Labor & Transport",
      description:
        language === "rw"
          ? "Imibyizi y'abakozi ba nyakabyizi n'ingendo z'imodoka"
          : "Track hired workers and harvest transport logs",
      icon: <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
    },
    {
      id: "cycleReport",
      label: language === "rw" ? "Raporo z'Igihembwe & Banki" : "Season & Bank Reports",
      description:
        language === "rw"
          ? "Raporo za PDF/CSV zo kwaka inguzanyo muri Banki na SACCO"
          : "Exportable PDF & CSV dossiers for banks and cooperatives",
      icon: <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
    {
      id: "analytics",
      label: language === "rw" ? "Isesengura ry'Imibare" : "Analytics Summary",
      description:
        language === "rw"
          ? "Imbonerahamwe y'igishoro, umusaruro n'inyungu"
          : "Budget vs actuals, yield performance & financial metrics",
      icon: <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
    },
    {
      id: "marketWeather",
      label: language === "rw" ? "Ibiciro ku Masoko & Ikirere" : "Markets & Weather",
      description:
        language === "rw"
          ? "Ibiciro by'ibirayi, ibigori n'ibishyimbo mu masoko"
          : "Live wholesale crop prices & district weather advisories",
      icon: <LineChart className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
    {
      id: "suitability",
      label: language === "rw" ? "Ubutaka & GPS Suitability" : "Soil & GPS Suitability",
      description:
        language === "rw"
          ? "Gupima ubutumburuke, pH y'ubutaka n'ibihingwa bibereye"
          : "Match district elevation and soil pH to optimal crops",
      icon: <Compass className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
    },
    {
      id: "training",
      label: language === "rw" ? "Amahugurwa ya RAB" : "Agronomy Training",
      description:
        language === "rw"
          ? "Imfashanyigisho z'ubuhinzi bw'umwuga mu Kinyarwanda"
          : "Certified RAB crop cultivation guides and pest manuals",
      icon: <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
    ...(currentUser?.role === "admin"
      ? [
          {
            id: "admin" as NavTab,
            label: language === "rw" ? "Ubuyobozi (Admin)" : "Admin Console",
            description:
              language === "rw"
                ? "Gucunga ibiciro, amasomo n'abakoresha"
                : "Manage market prices, courses & platform governance",
            icon: <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          },
        ]
      : []),
  ];

  const isCurrentInSecondary = secondaryTabs.some((t) => t.id === currentTab);
  const activeSecondaryTab = secondaryTabs.find((t) => t.id === currentTab);

  return (
    <nav className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-16 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-2">
          {/* Scrollable Primary Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
            {primaryTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onTabChange(tab.id);
                    setIsMoreMenuOpen(false);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-emerald-800 text-white shadow-2xs"
                      : "text-stone-600 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  <span className={isActive ? "text-amber-300" : "text-emerald-700 dark:text-emerald-400"}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Non-clipped "More Modules" Menu Trigger (outside overflow-x-auto!) */}
          <div className="relative shrink-0 pl-1 border-l border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isCurrentInSecondary
                  ? "bg-amber-500 text-stone-950 shadow-2xs"
                  : isMoreMenuOpen
                  ? "bg-emerald-900 text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>
                {isCurrentInSecondary && activeSecondaryTab
                  ? activeSecondaryTab.label
                  : language === "rw"
                  ? "Izindi Serivisi"
                  : "More Modules"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  isMoreMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-[540px] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-3 z-50">
                  <div className="px-2 py-1.5 border-b border-stone-100 dark:border-stone-800 mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 dark:text-white block">
                        {language === "rw"
                          ? "Serivisi Zose za TERIMBERE"
                          : "All TERIMBERE Farm Modules"}
                      </span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        {language === "rw"
                          ? "Hitamo igice wifuza gukoresha"
                          : "Jump directly to any specialized tool or report"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[70vh] overflow-y-auto">
                    {secondaryTabs.map((sec) => {
                      const isSecActive = currentTab === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            onTabChange(sec.id);
                            setIsMoreMenuOpen(false);
                          }}
                          className={`flex items-start space-x-2.5 p-2.5 rounded-xl text-left transition-colors border ${
                            isSecActive
                              ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 text-emerald-950 dark:text-emerald-200"
                              : "border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/70 text-stone-700 dark:text-stone-300"
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 shrink-0 mt-0.5">
                            {sec.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                                {sec.label}
                              </span>
                              {isSecActive && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                              {sec.description}
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
      </div>
    </nav>
  );
};
