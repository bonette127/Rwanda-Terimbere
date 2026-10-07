import React, { useState } from "react";
import { Language, User, PendingSyncItem } from "../types";
import { getTranslation } from "../i18n";
import {
  Sprout,
  Wifi,
  WifiOff,
  ShieldCheck,
  LogOut,
  LogIn,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Phone,
  Bell,
  CloudUpload,
  Share2,
  Users,
  Download,
  SlidersHorizontal,
  Cloud,
  Calendar,
  HardDriveDownload,
  QrCode,
  Compass,
} from "lucide-react";
import { DynamicDayState } from "../utils/dynamicDayEngine";

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  pendingSyncCount: number;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isPhoneView: boolean;
  onTogglePhoneView: () => void;
  onOpenContact: () => void;
  onOpenUssd: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenSyncQueue?: () => void;
  pendingItems?: PendingSyncItem[];
  onOpenShare?: () => void;
  onOpenTeamModal?: () => void;
  teamMemberCount?: number;
  onOpenExportModal?: () => void;
  onOpenExportReport?: () => void;
  onOpenDeployModal?: () => void;
  onOpenOfflineBackup?: () => void;
  onOpenQrScanner?: () => void;
  onOpenPlantingCalendarExport?: () => void;
  onOpenWorkflowGuide?: () => void;
  dynamicDayState?: DynamicDayState;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  isOnline,
  onToggleOnline,
  pendingSyncCount,
  currentUser,
  onOpenAuth,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  isPhoneView,
  onTogglePhoneView,
  onOpenContact,
  onOpenUssd,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenSyncQueue,
  onOpenShare,
  onOpenTeamModal,
  teamMemberCount = 0,
  onOpenExportModal,
  onOpenExportReport,
  onOpenDeployModal,
  onOpenOfflineBackup,
  onOpenQrScanner,
  onOpenPlantingCalendarExport,
  onOpenWorkflowGuide,
  dynamicDayState,
}) => {
  const t = getTranslation(language);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const handleExportTrigger = onOpenExportReport || onOpenExportModal;

  return (
    <header className="bg-emerald-900 dark:bg-stone-950 text-white border-b border-emerald-800 dark:border-stone-800 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-bold shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-black tracking-tight font-display text-white">
                  TERIMBERE
                </span>
                <span className="hidden sm:inline text-xs text-emerald-200 font-medium">
                  · Rwanda Smart Ag
                </span>
                {currentUser?.role === "admin" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-stone-950 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ADMIN</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200/80 hidden md:flex items-center gap-1.5">
                {dynamicDayState ? (
                  <>
                    <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      {language === "rw"
                        ? dynamicDayState.formattedDateRw
                        : dynamicDayState.formattedDateEn}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-semibold">
                      Season {dynamicDayState.seasonCode}
                    </span>
                  </>
                ) : (
                  t.tagline
                )}
              </p>
            </div>
          </div>

          {/* Streamlined Right Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* GitHub & Render Cloud Deployment Guide Button */}
            {onOpenDeployModal && (
              <button
                type="button"
                onClick={onOpenDeployModal}
                className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white border border-teal-500/50 transition-colors shadow-2xs cursor-pointer"
                title={
                  language === "rw"
                    ? "Kubika kuri GitHub & Kohereza kuri Render"
                    : "Host on GitHub & Deploy to Render"
                }
              >
                <Cloud className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {language === "rw" ? "GitHub & Render" : "GitHub & Render"}
                </span>
              </button>
            )}

            {/* Offline JSON Backup Button */}
            {onOpenOfflineBackup && (
              <button
                type="button"
                onClick={onOpenOfflineBackup}
                className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/90 hover:bg-emerald-800 text-amber-300 border border-amber-500/40 transition-colors shadow-2xs cursor-pointer"
                title={
                  language === "rw"
                    ? "Bika Amakuru ya Offline mu Idosiye ya JSON (Expenses, Harvests, Activities)"
                    : "Export Local Offline Records to JSON File"
                }
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === "rw" ? "JSON Backup" : "Offline JSON"}
                </span>
              </button>
            )}

            {/* Primary Export PDF / CSV Button (Bank & Cooperative Dossier) */}
            {handleExportTrigger && (
              <button
                type="button"
                onClick={handleExportTrigger}
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Raporo PDF / CSV" : "Export PDF / CSV"}
                </span>
              </button>
            )}

            {/* Seed-to-Sale Workflow Guide Button */}
            {onOpenWorkflowGuide && (
              <button
                type="button"
                onClick={onOpenWorkflowGuide}
                title={
                  language === "rw"
                    ? "Urugendo rw'Umuhinzi kuva ku Butaka kugeza ku Isoko (Intambwe 6)"
                    : "Farmer Seed-to-Sale Workflow Guide (6 Steps)"
                }
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>
                  {language === "rw" ? "Urugendo rw'Umuhinzi" : "Workflow Guide"}
                </span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              title={
                language === "rw"
                  ? `Ubutumwa (${unreadNotificationsCount})`
                  : `Notifications (${unreadNotificationsCount})`
              }
              className="p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-800 text-emerald-100 border border-emerald-800 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-stone-950 text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Quick Tools Dropdown (USSD *777#, Team, Sync Queue, Mobile View, Share, Support) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsToolsOpen((prev) => !prev)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-800 text-emerald-100 border border-emerald-800 text-xs font-semibold transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">
                  {language === "rw" ? "Ibikoresho" : "Tools"}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>

              {isToolsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsToolsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-2 z-50 space-y-1">
                    <div className="px-2.5 py-1.5 border-b border-stone-100 dark:border-stone-800 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                      {language === "rw"
                        ? "Ibikoresho by'Umuhinzi"
                        : "Platform Utilities"}
                    </div>

                    {onOpenWorkflowGuide && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenWorkflowGuide();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <Compass className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {language === "rw"
                              ? "Urugendo rw'Umuhinzi (Intambwe 6)"
                              : "Seed-to-Sale Guide (6 Steps)"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] font-bold text-amber-600">
                          1-6
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onOpenUssd();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                        <span>USSD *777# Simulator</span>
                      </span>
                      <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        Offline
                      </span>
                    </button>

                    {onOpenQrScanner && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenQrScanner();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            {language === "rw"
                              ? "QR Scanner & Amateka (Last 5)"
                              : "QR Scanner & Scan History"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] font-bold text-amber-600">
                          5 max
                        </span>
                      </button>
                    )}

                    {onOpenTeamModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenTeamModal();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <Users className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            {language === "rw"
                              ? "Ikipe n'Uburenganzira"
                              : "Team & Parcel Access"}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] font-bold text-stone-500">
                          {teamMemberCount}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onOpenSyncQueue?.();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <CloudUpload className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          {language === "rw"
                            ? "Amakuru ya Offline"
                            : "Offline Sync Queue"}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-600">
                        {pendingSyncCount}
                      </span>
                    </button>

                    {onOpenOfflineBackup && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenOfflineBackup();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <HardDriveDownload className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            {language === "rw"
                              ? "Ububiko bwa Offline (JSON)"
                              : "Offline JSON Backup (.json)"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          .JSON
                        </span>
                      </button>
                    )}

                    {onOpenPlantingCalendarExport && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenPlantingCalendarExport();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {language === "rw"
                              ? "Kalendari y'Ihinza n'Isarura"
                              : "Planting Calendar (.ICS)"}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          .ICS
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onToggleOnline();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        {isOnline ? (
                          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>
                          {isOnline ? "Mode: Online" : "Mode: Offline"}
                        </span>
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        {language === "rw" ? "Hindura" : "Toggle"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onTogglePhoneView();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        {isPhoneView ? (
                          <Monitor className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>
                          {isPhoneView ? "Desktop View" : "Mobile Preview"}
                        </span>
                      </span>
                    </button>

                    {onOpenShare && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenShare();
                          setIsToolsOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          {language === "rw"
                            ? "Sangiza Urubuga (QR)"
                            : "Share App & QR"}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onOpenContact();
                        setIsToolsOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        {language === "rw"
                          ? "Twandikire / Ubufasha"
                          : "Contact & Support"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
              className="p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-800 text-emerald-100 border border-emerald-800 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-emerald-950/80 rounded-xl p-0.5 border border-emerald-800">
              {(["rw", "en", "fr"] as const).map((langCode) => (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => onLanguageChange(langCode)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                    language === langCode
                      ? "bg-emerald-700 text-white"
                      : "text-emerald-200 hover:text-white"
                  }`}
                >
                  {langCode}
                </button>
              ))}
            </div>

            {/* User Account */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-emerald-800">
                <img
                  src={
                    currentUser.avatarUrl ||
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                  }
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border border-amber-400 object-cover"
                />
                <div className="hidden xl:block text-left">
                  <span className="text-xs font-bold text-white block leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-emerald-200 font-medium">
                    {currentUser.role === "admin"
                      ? "Admin"
                      : currentUser.district}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Injira" : "Sign In"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
