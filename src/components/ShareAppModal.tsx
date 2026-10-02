import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Language } from "../types";
import {
  Share2,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  X,
  Smartphone,
  Lock,
  Users,
  Sparkles,
  QrCode,
  Info,
} from "lucide-react";

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Determine current origin and compute public preview link
  const currentOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://ais-dev-tq6yuf3cz3drl3b5dc4frl-921861656596.europe-west2.run.app";

  // The public URL replaces ais-dev- with ais-pre-
  const publicShareUrl = currentOrigin.replace("ais-dev-", "ais-pre-");
  const isDevUrl = currentOrigin.includes("ais-dev-");

  useEffect(() => {
    if (isOpen && publicShareUrl) {
      QRCode.toDataURL(publicShareUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: "#064e3b",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("Failed to generate share QR code:", err));
    }
  }, [isOpen, publicShareUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage =
    language === "rw"
      ? `Fungura urubuga rwa TERIMBERE - Smart Agriculture Platform mu Rwanda: ${publicShareUrl}`
      : `Check out TERIMBERE - Smart Agriculture Platform for Rwanda: ${publicShareUrl}`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <Share2 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display">
                {language === "rw"
                  ? "Gusangiza Abandi Urubuga (Public Access)"
                  : "Share Platform & Public Access"}
              </h2>
              <p className="text-xs text-emerald-100">
                {language === "rw"
                  ? "Uburyo abandi bahinzi n'abafatanyabikorwa bashobora gufungura uru rubuga"
                  : "How other users & farmers can open and access this app"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Important explanation why other users couldn't access */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-1">
                <span className="font-bold block text-sm">
                  {language === "rw"
                    ? "Kuki abandi batashoboraga gufungura link yawe?"
                    : "Why other users couldn't access your link:"}
                </span>
                <p className="leading-relaxed">
                  {language === "rw" ? (
                    <>
                      Iyo ukoze <code className="bg-amber-200 dark:bg-amber-900/80 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold text-amber-950 dark:text-amber-100">Copy</code> kuri link irimo <code className="bg-amber-200 dark:bg-amber-900/80 px-1 py-0.5 rounded font-mono text-[11px] font-bold">ais-dev-</code>, iyo link iba <strong>ifunzwe (Private)</strong> ikaba yemerera gusa konte yawe ya Google. Abandi bayifunguye bahita babwirwa ko batabyemerewe (<em>403 Forbidden / Access Denied</em>).
                    </>
                  ) : (
                    <>
                      If you sent the link containing <code className="bg-amber-200 dark:bg-amber-900/80 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold text-amber-950 dark:text-amber-100">ais-dev-</code>, that is your <strong>private development URL</strong> restricted only to your Google account. Anyone else will get an <em>Access Denied / 403 Forbidden</em> error.
                    </>
                  )}
                </p>
                <div className="pt-1 font-semibold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    {language === "rw"
                      ? "Igisubizo: Sangiza link ya 'ais-pre-' (Public Shared Link) iri munsi!"
                      : "Solution: Share the 'ais-pre-' Public Shared Link below!"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Public Link Card */}
          <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {language === "rw" ? "Link rusange ifungukira buri wese:" : "Public Link for Any User:"}
                </span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                Public / Buri wese
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="w-full text-xs sm:text-sm font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-800 dark:text-stone-200 focus:outline-hidden select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs"
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (language === "rw" ? "Yanakiriwe!" : "Copied!") : (language === "rw" ? "Koporora" : "Copy")}</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                <span>{language === "rw" ? "Ohereza kuri WhatsApp" : "Share on WhatsApp"}</span>
              </a>

              <a
                href={publicShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 text-xs font-bold transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{language === "rw" ? "Fungura wiyereke" : "Test Open Link"}</span>
              </a>
            </div>
          </div>

          {/* QR Code Section for scanning directly from smartphone */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            {qrCodeDataUrl ? (
              <div className="p-2 bg-white rounded-2xl border border-emerald-200 shadow-sm shrink-0">
                <img
                  src={qrCodeDataUrl}
                  alt="Public App QR Code"
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-32 h-32 bg-stone-200 rounded-xl animate-pulse" />
            )}

            <div className="text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{language === "rw" ? "Scan na Telefone" : "Scan with Mobile Camera"}</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {language === "rw"
                  ? "Umuhinzi cyangwa undi mukoresha ashobora kwerekeza camera ya telefone kuri iyi QR code igahita ifunguka ako kanya nta kintu asabwe kwinjizamo."
                  : "Any farmer or team member can point their smartphone camera at this QR code to load the app directly."}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-stone-500 dark:text-stone-400">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  📱 Android / iPhone
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  📶 Offline & PWA ready
                </span>
              </div>
            </div>
          </div>

          {/* Multi-User & Account Behavior Explanation */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-amber-500" />
              <span>
                {language === "rw"
                  ? "Uko konti n'amakuru y'abahinzi bikora (Multi-User Access):"
                  : "How User Accounts and Data Work:"}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/60 space-y-1">
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === "rw" ? "Abahinzi basanzwe" : "Farmer Users"}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                  {language === "rw"
                    ? "Buri mukoresha ashobora gufungura konte nshya cyangwa kwinjira akoresheje Quick Login agacunga imirima, amafaranga n'umusaruro."
                    : "Any user can register their own profile or log in to manage crops, track expenses, and view market prices."}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/60 space-y-1">
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>{language === "rw" ? "Ubuyobozi (Admin Access)" : "Admin Oversight"}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                  {language === "rw"
                    ? "Konti y'ubuyobozi irinzwe byihariye kugira ngo abandi batahindura igenamiterere ry'igihugu cyangwa amakuru y'ibiciro."
                    : "The system administrator dashboard is reserved for authorized managers to protect national agri data and settings."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100 dark:bg-stone-800/80 p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {language === "rw"
                ? "TERIMBERE ikora no kuri murandasi idafite imbaraga (PWA / Offline ready)"
                : "TERIMBERE works seamlessly across low-bandwidth & offline environments"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            {language === "rw" ? "Bifunze" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
