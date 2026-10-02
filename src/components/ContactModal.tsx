import React from "react";
import { Language } from "../types";
import { 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Instagram, 
  MessageCircle, 
  Send, 
  Globe, 
  Clock, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <MessageCircle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight font-display">
                {language === "rw" ? "Twandikire / Tuvugishe" : "Contact & Support"}
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                TERIMBERE Rwanda • Smart Farming Platform
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Official Contact Cards */}
          <div className="space-y-3">
            {/* WhatsApp */}
            <a
              href="https://wa.me/250792259699?text=Muraho%20Terimbere!%20Ndashaka%20ubufasha%20ku%20buhinzi%20bwanjye."
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    WhatsApp Chat
                  </span>
                  <div className="text-sm font-bold text-stone-900 dark:text-white">
                    0792259699 (+250 792 259 699)
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Kanda hano uvugane natwe kuri WhatsApp ako kanya
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                Chat →
              </span>
            </a>

            {/* Email */}
            <a
              href="mailto:kibondoqueenmary2022@gmail.com"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wider">
                    Official Email
                  </span>
                  <div className="text-sm font-bold text-stone-900 dark:text-white">
                    kibondoqueenmary2022@gmail.com
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Ohereza ubutumwa, ubusabe cyangwa ibibazo
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 group-hover:translate-x-1 transition-transform">
                Email →
              </span>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/bonette127"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                    Instagram Community
                  </span>
                  <div className="text-sm font-bold text-stone-900 dark:text-white">
                    @bonette127
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Kurikirana amakuru mashya n'ubuhinzi kuri Instagram
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
                Follow →
              </span>
            </a>

            {/* Physical Address */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                    Aho Dukorera (Physical Address)
                  </span>
                  <div className="text-sm font-bold text-stone-900 dark:text-white">
                    Kigali Heights, 5th Floor, KG 7 Ave
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                    Kigali City, Rwanda & Musanze Agri-Innovation Hub (Northern Province)
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-[10px] text-stone-400">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>Kuwa Mbere - Kuwa Gatanu: 08:00 AM - 05:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
