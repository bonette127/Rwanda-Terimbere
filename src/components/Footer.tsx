import React from "react";
import { Language } from "../types";
import { getTranslation } from "../i18n";
import {
  Sprout,
  Phone,
  Mail,
  MapPin,
  Lock,
  Share2,
  FileDown,
  LayoutDashboard,
  TrendingUp,
  Bot,
  Stethoscope,
  CloudSun,
  Smartphone,
} from "lucide-react";

interface FooterProps {
  language: Language;
  onOpenContact: () => void;
  onOpenAuth?: () => void;
  isAdmin?: boolean;
  onOpenShare?: () => void;
  onNavigate?: (tab: string) => void;
  onOpenExportReport?: () => void;
  onOpenUssd?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  onOpenContact,
  onOpenAuth,
  isAdmin,
  onOpenShare,
  onNavigate,
  onOpenExportReport,
  onOpenUssd,
}) => {
  const t = getTranslation(language);

  const handleNavClick = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#064E3B] dark:bg-stone-950 text-emerald-100/80 border-t border-emerald-800/80 dark:border-stone-800 mt-12 transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Column 1: Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center text-amber-300 border border-emerald-600/60 shadow-xs">
                <Sprout className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight text-base font-display block leading-none">
                  {t.appName}
                </span>
                <span className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase">
                  Rwanda Smart Agriculture & Dairy
                </span>
              </div>
            </div>
            <p className="text-xs text-emerald-100/75 leading-relaxed">
              {t.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onOpenExportReport && (
                <button
                  type="button"
                  onClick={onOpenExportReport}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{language === "rw" ? "Raporo PDF / CSV" : "Export PDF / CSV"}</span>
                </button>
              )}
              {onOpenUssd && (
                <button
                  type="button"
                  onClick={onOpenUssd}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-100 hover:text-white bg-emerald-900/80 hover:bg-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-700/60 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                  <span>*777# USSD</span>
                </button>
              )}
            </div>
          </div>

          {/* Column 2: Quick Module Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              {language === "rw"
                ? "Ibice by'Ingenzi"
                : language === "fr"
                ? "Navigation Rapide"
                : "Quick Navigation"}
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleNavClick("dashboard")}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white py-1 text-left transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{language === "rw" ? "Incamake" : "Dashboard"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick("cattle")}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white py-1 text-left transition-colors cursor-pointer"
              >
                <Sprout className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{language === "rw" ? "Ubworozi bw'Inka" : "Cattle & Dairy"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick("profit")}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white py-1 text-left transition-colors cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{language === "rw" ? "Inyungu & Banki" : "Profit & Bank"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick("aiAdvisor")}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white py-1 text-left transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{language === "rw" ? "Umujyanama" : "Agronomist"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick("cropDoctor")}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white py-1 text-left transition-colors cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{language === "rw" ? "Isuzuma ry'Indwara" : "Crop Doctor"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick("marketWeather")}
                className="flex items-center space-x-1.5 text-emerald-100/80 hover:text-white py-1 text-left transition-colors cursor-pointer"
              >
                <CloudSun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{language === "rw" ? "Isoko & Ikirere" : "Market & Weather"}</span>
              </button>
            </div>
          </div>

          {/* Column 3: Farmer Support & Helpdesk */}
          <div className="space-y-2.5 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              {language === "rw"
                ? "Ubufasha ku Bahinzi n'Aborozi"
                : language === "fr"
                ? "Assistance aux Agriculteurs"
                : "Farmer & Dairy Helpdesk"}
            </h4>
            <div className="space-y-1.5 text-emerald-100/85">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>+250 794 285 883 (Toll-Free RAB: 4675)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>kibondoqueenmary2022@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Kigali, Musanze, Huye & Nyagatare, Rwanda</span>
              </div>
            </div>
          </div>

          {/* Column 4: Actions & Governance */}
          <div className="flex flex-col md:items-end justify-between space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {onOpenShare && (
                <button
                  type="button"
                  onClick={onOpenShare}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 px-3.5 py-2 rounded-xl border border-emerald-600/60 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {language === "rw"
                      ? "Sangiza Porogaramu"
                      : language === "fr"
                      ? "Partager l'App"
                      : "Share App"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenContact}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-100 hover:text-white bg-emerald-900/90 hover:bg-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-700/70 transition-colors cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {language === "rw"
                    ? "Saba Ubufasha"
                    : language === "fr"
                    ? "Obtenir de l'Aide"
                    : "Get Support"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-emerald-200/70 text-[11px]">
              <span>
                © {new Date().getFullYear()} {t.appName} •{" "}
                {language === "rw"
                  ? "Uburenganzira bwose burarinzwe."
                  : language === "fr"
                  ? "Tous droits réservés."
                  : "All rights reserved."}
              </span>
              {onOpenAuth && !isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center space-x-1 text-[11px] text-emerald-300/70 hover:text-white transition-colors cursor-pointer"
                  title="System Governance Login"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
