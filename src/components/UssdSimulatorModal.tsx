import React, { useState } from "react";
import { X, PhoneCall, Delete, Smartphone, Signal, Wifi, Battery, CheckCircle2, RotateCcw } from "lucide-react";
import { Language } from "../types";

interface UssdSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const UssdSimulatorModal: React.FC<UssdSimulatorModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [dialedNumber, setDialedNumber] = useState("*777#");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionScreen, setSessionScreen] = useState<
    "main" | "plan" | "subsidy" | "market" | "tip" | "done"
  >("main");
  const [inputVal, setInputVal] = useState("");
  const [screenMessage, setScreenMessage] = useState("");

  if (!isOpen) return null;

  const handleKeyClick = (char: string) => {
    if (!sessionActive) {
      setDialedNumber((prev) => prev + char);
    } else {
      setInputVal((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    if (!sessionActive) {
      setDialedNumber((prev) => prev.slice(0, -1));
    } else {
      setInputVal((prev) => prev.slice(0, -1));
    }
  };

  const startSession = () => {
    if (dialedNumber.trim() === "*777#" || dialedNumber.trim().startsWith("*777")) {
      setSessionActive(true);
      setSessionScreen("main");
      setInputVal("");
      setScreenMessage(
        "TERIMBERE SMART AGRI (*777#)\n" +
        "1. Gahunda y'Ubuhinzi (Farm Plan)\n" +
        "2. Nkunganire & Ifumbire (Subsidies)\n" +
        "3. Ibiciro by'Isoko (Kimironko/Musanze)\n" +
        "4. Inama yo Kurinda Ibihingwa\n" +
        "5. Reba NIDA Status (Indangamuntu)\n" +
        "0. Gusohoka"
      );
    } else {
      alert(language === "rw" ? "Kanda *777# kugira ngo winjire muri Terimbere USSD." : "Dial *777# to open Terimbere USSD service.");
    }
  };

  const handleSendInput = () => {
    const choice = inputVal.trim();
    setInputVal("");

    if (sessionScreen === "main") {
      if (choice === "1") {
        setSessionScreen("plan");
        setScreenMessage(
          "GAHUNDA Y'UBUHINZI (IBIRAYI 0.5 Ha)\n" +
          "Ingengo y'imari: 500,000 RWF\n" +
          "Imbuto (Kinigi): 1,000 kg\n" +
          "NPK + DAP: 120,000 RWF\n" +
          "Umusaruro witezwe: 8,000 kg\n" +
          "1. Kwemeza no kohereza SMS\n" +
          "0. Gusubira inyuma"
        );
      } else if (choice === "2") {
        setSessionScreen("subsidy");
        setScreenMessage(
          "SMART NKUNGANIRE (MINAGRI)\n" +
          "Status: YEMEWE (VERIFIED)\n" +
          "NIDA: 1199080012345088\n" +
          "NPK 17-17-17: 50kg (Nkunganire 40%)\n" +
          "DAP: 50kg (Nkunganire 40%)\n" +
          "Ahakusanyirizwa: Musanze Depot\n" +
          "0. Gusubira inyuma"
        );
      } else if (choice === "3") {
        setSessionScreen("market");
        setScreenMessage(
          "IBICIRO BY'ISOKO UYU MUNSI\n" +
          "- Ibirayi (Kinigi): 320 RWF/kg (Musanze)\n" +
          "- Ibigori byumye: 380 RWF/kg (Nyagatare)\n" +
          "- Ibishyimbo: 700 RWF/kg (Kimironko)\n" +
          "- Inyanya: 450 RWF/kg (Huye)\n" +
          "0. Gusubira inyuma"
        );
      } else if (choice === "4") {
        setSessionScreen("tip");
        setScreenMessage(
          "INAMA Y'UMUNSI (RAB ADVISORY)\n" +
          "Urume ruribasira ibirayi mu Majyaruguru.\n" +
          "Tera Ridomil Gold (50g/20L) cyangwa Mancozeb mbere y'imvura nini.\n" +
          "0. Gusubira inyuma"
        );
      } else if (choice === "5") {
        setSessionScreen("done");
        setScreenMessage(
          "INDANGAMUNTU YAWE:\n" +
          "NIDA: 1199080012345088\n" +
          "Amazina: Queen Mary / Ndahiro Jean\n" +
          "Koperative: KABOKU Kinigi\n" +
          "Murakoze gukoresha TERIMBERE!"
        );
      } else if (choice === "0") {
        endSession();
      }
    } else {
      if (choice === "0") {
        setSessionScreen("main");
        setScreenMessage(
          "TERIMBERE SMART AGRI (*777#)\n" +
          "1. Gahunda y'Ubuhinzi (Farm Plan)\n" +
          "2. Nkunganire & Ifumbire (Subsidies)\n" +
          "3. Ibiciro by'Isoko (Kimironko/Musanze)\n" +
          "4. Inama yo Kurinda Ibihingwa\n" +
          "5. Reba NIDA Status (Indangamuntu)\n" +
          "0. Gusohoka"
        );
      } else if (sessionScreen === "plan" && choice === "1") {
        setSessionScreen("done");
        setScreenMessage(
          "Ubutumwa bugufi (SMS) bukubiyemo ingengo y'imari n'uburyo bwo gufata ifumbire yohererejwe kuri telefone yawe. Murakoze!"
        );
      }
    }
  };

  const endSession = () => {
    setSessionActive(false);
    setSessionScreen("main");
    setInputVal("");
    setDialedNumber("*777#");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-sm bg-stone-900 border-4 border-stone-700 rounded-[40px] shadow-2xl overflow-hidden p-6 text-white space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Feature Phone Header */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-700 text-emerald-300 text-[11px] font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{language === "rw" ? "Uburyo bw'Abahinzi badafite Internet (*777#)" : "Offline Feature Phone / USSD (*777#)"}</span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {language === "rw" ? "Buri munyarwanda wese afite telefone asanzwe aragerwaho" : "Accessible to every Rwandan with any standard mobile phone"}
          </p>
        </div>

        {/* Phone LCD Screen */}
        <div className="bg-[#8ba888] text-stone-900 font-mono rounded-2xl p-4 shadow-inner border-2 border-stone-800 space-y-2 min-h-[190px] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-stone-800 border-b border-stone-700/30 pb-1">
            <span className="font-bold flex items-center space-x-1">
              <Signal className="w-3 h-3" />
              <span>MTN-RW / Airtel</span>
            </span>
            <span className="flex items-center space-x-1">
              <Battery className="w-3.5 h-3.5" />
            </span>
          </div>

          {!sessionActive ? (
            <div className="my-auto text-center space-y-2">
              <p className="text-xs text-stone-700">Kanda numero cyangwa uhamagare:</p>
              <div className="text-2xl font-black tracking-widest text-stone-950 py-1">
                {dialedNumber || "..."}
              </div>
              <p className="text-[10px] text-stone-600">Smart Nkunganire & Terimbere Service</p>
            </div>
          ) : (
            <div className="space-y-2 text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap font-mono text-[11px] font-semibold text-stone-900">
                {screenMessage}
              </pre>
              {sessionScreen !== "done" && (
                <div className="flex items-center space-x-1.5 pt-1 border-t border-stone-700/30">
                  <span className="font-bold">&gt;</span>
                  <input
                    type="text"
                    readOnly
                    value={inputVal}
                    placeholder="Hitamo..."
                    className="bg-transparent text-stone-950 font-bold outline-hidden w-full text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center text-[10px] text-stone-800 pt-1 border-t border-stone-700/30 font-bold">
            <span>{!sessionActive ? "Dial *777#" : "0=Back"}</span>
            <span>{sessionActive ? "Terimbere USSD" : "Ready"}</span>
          </div>
        </div>

        {/* Action Call / Send Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {!sessionActive ? (
            <button
              onClick={startSession}
              className="col-span-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Hamagara *777# (Dial USSD)</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSendInput}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-md"
              >
                <span>Ohereza (Send)</span>
              </button>
              <button
                onClick={endSession}
                className="py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-md"
              >
                <span>Funga (End)</span>
              </button>
            </>
          )}
        </div>

        {/* 12-Button Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { key: "1", sub: "" },
            { key: "2", sub: "ABC" },
            { key: "3", sub: "DEF" },
            { key: "4", sub: "GHI" },
            { key: "5", sub: "JKL" },
            { key: "6", sub: "MNO" },
            { key: "7", sub: "PQRS" },
            { key: "8", sub: "TUV" },
            { key: "9", sub: "WXYZ" },
            { key: "*", sub: "" },
            { key: "0", sub: "+" },
            { key: "#", sub: "" },
          ].map((k) => (
            <button
              key={k.key}
              onClick={() => handleKeyClick(k.key)}
              className="py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-100 flex flex-col items-center justify-center border border-stone-700/60 shadow-xs transition-colors"
            >
              <span className="text-base font-bold leading-none">{k.key}</span>
              {k.sub && <span className="text-[9px] text-stone-400 font-medium leading-none mt-0.5">{k.sub}</span>}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center text-xs text-stone-400 px-1">
          <button
            onClick={handleBackspace}
            className="flex items-center space-x-1 hover:text-white py-1"
          >
            <Delete className="w-4 h-4" />
            <span>Siba (Clear)</span>
          </button>
          <button
            onClick={() => {
              setDialedNumber("*777#");
              setInputVal("");
            }}
            className="flex items-center space-x-1 hover:text-white py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ongera (Reset)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
