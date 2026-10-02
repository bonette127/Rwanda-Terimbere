import React, { useState, useRef, useEffect } from "react";
import {
  Expense,
  Farm,
  FarmActivity,
  FarmPlan,
  HarvestRecord,
  Language,
  SaleRecord,
} from "../types";
import { getTranslation } from "../i18n";
import { AgroZoneWeatherAdvisorPanel } from "./AgroZoneWeatherAdvisorPanel";
import {
  AgroZoneWeatherAnalysisReport,
  analyzeAgroZoneWeatherForFarm,
  formatAgroZoneAdvisoryMarkdown,
} from "../utils/agroZoneWeatherAdvisory";
import {
  Bot,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  User,
  PlusCircle,
  Mic,
  MicOff,
  MapPin,
  ExternalLink,
  Zap,
  Globe,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  structuredPlan?: Partial<FarmPlan>;
  groundingChunks?: Array<{
    maps?: {
      title?: string;
      uri?: string;
      placeAnswerSources?: { reviewSnippets?: string[] };
    };
    web?: {
      title?: string;
      uri?: string;
    };
  }>;
}

interface AiAdvisorViewProps {
  language: Language;
  farms: Farm[];
  plans?: FarmPlan[];
  expenses?: Expense[];
  harvests?: HarvestRecord[];
  sales?: SaleRecord[];
  onSavePlanFromAi: (plan: FarmPlan) => void;
  onAddActivity?: (activity: Omit<FarmActivity, "id">) => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const AiAdvisorView: React.FC<AiAdvisorViewProps> = ({
  language,
  farms,
  plans = [],
  expenses = [],
  harvests = [],
  sales = [],
  onSavePlanFromAi,
  onAddActivity,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const t = getTranslation(language);
  const [messages, setMessages] = useState<Message[]>(() => {
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const todayDate = new Date().toISOString().split("T")[0];
    return [
      {
        id: "welcome-1",
        sender: "ai",
        text:
          language === "rw"
            ? `Murakaza neza, muhinzi mwiza! (${todayDate})\n\nNdi Umujyanama w'Ubuhinzi muri TERIMBERE. Niteguye kubafasha mu buryo bwiyubashye kandi bwumvikana: kubara ingengo y'imari y'umurima, kumenya igihe cyiza cyo gutera n'uko mwarinda ibihingwa hakurikijwe ikirere cya AgroZone yanyu, cyangwa gushaka amaduka y'ifumbire ya Smart Nkunganire.\n\n mwahitamo ikibazo hasi cyangwa mukandika icyo mwifuza ko tuganiraho uyu munsi.`
            : language === "fr"
              ? `Bienvenue, cher agriculteur ! (${todayDate})\n\nJe suis votre Conseiller Agricole TERIMBERE. Je suis à votre disposition pour vous accompagner avec respect et clarté dans vos cultures, budgets, fenêtres de semis et protection phytosanitaire.`
              : `Welcome, respected farmer! (${todayDate})\n\nI am your TERIMBERE Agronomy & Financial Advisor. I am here to assist you with clear, helpful, and supportive guidance on crop budgets, AgroZone planting windows, pest care, and Smart Nkunganire inputs.\n\nPlease select a topic below or ask any question.`,
        timestamp: nowTime,
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelType, setModelType] = useState<"general" | "fast">("general");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribingStatus, setTranscribingStatus] = useState<string | null>(null);
  const [showMapsMode, setShowMapsMode] = useState(false);
  const [districtQuery, setDistrictQuery] = useState(farms[0]?.district || "Musanze");
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    farms[0]?.id || ""
  );
  const [activeAgroZoneReport, setActiveAgroZoneReport] =
    useState<AgroZoneWeatherAnalysisReport | null>(() =>
      farms[0] ? analyzeAgroZoneWeatherForFarm(farms[0], plans) : null
    );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isSearchingMaps]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const selectedFarm =
    farms.find((f) => f.id === selectedFarmId) || farms[0];
  const activeZoneLabel =
    selectedFarm?.agroZone || "Birunga Volcanic Highlands";
  const activeFarmLabel =
    selectedFarm?.name ||
    (language === "rw" ? "Umurima wanjye" : "My Farm Parcel");
  const activeAltLabel = selectedFarm?.altitude || 2200;

  const promptChips = [
    {
      label:
        language === "rw"
          ? `🌦️ Igihe cyo Gutera (${activeZoneLabel})`
          : `🌦️ Planting Times (${activeZoneLabel})`,
      query:
        language === "rw"
          ? `Mwamfasha gusesengura iteganyagihe ry'iminsi 7 rya AgroZone "${activeZoneLabel}" ku murima wa ${activeFarmLabel} (${activeAltLabel}m ASL) mukampa inama zihariye ku gihe cyiza cyo gutera n'imbuto zemejwe na RAB?`
          : `Could you kindly analyze the 7-day weather forecast for ${activeFarmLabel} in AgroZone "${activeZoneLabel}" (${activeAltLabel}m ASL) and recommend optimal planting times and RAB cultivars?`,
    },
    {
      label:
        language === "rw"
          ? `🛡️ Kurinda Ibihingwa (${activeZoneLabel})`
          : `🛡️ Pest Risk Care (${activeZoneLabel})`,
      query:
        language === "rw"
          ? `Hakurikijwe ubuhehere n'imvura biteganyijwe muri AgroZone "${activeZoneLabel}" (${activeFarmLabel}), mwamfasha kumenya ibyonyi n'indwara dukwiye kwirinda n'igihe cyiza cyo gutera umuti?`
          : `Based on the forecasted humidity, rainfall, and temperatures for AgroZone "${activeZoneLabel}" (${activeFarmLabel}), could you share supportive pest and disease prevention advice and optimal spray windows?`,
    },
    {
      label: language === "rw" ? "Kora gahunda y'ibirayi (0.5 Ha)" : "Potato Farm Plan (0.5 Ha)",
      query:
        language === "rw"
          ? "Mfite amafaranga 500,000 RWF. Ndashaka guhinga ibirayi kuri hegitari 0.5. Mwamfasha gukora gahunda y'ubuhinzi n'ingengo y'imari?"
          : "I have a 500,000 RWF budget and want to grow Irish potatoes on 0.5 hectares. Create a complete farm plan and budget.",
    },
    {
      label: language === "rw" ? "Kora gahunda y'ibigori (1 Ha)" : "Maize Farm Plan (1 Ha)",
      query:
        language === "rw"
          ? "Ndashaka guhinga ibigori bya H628 kuri hegitari 1.0 n'ingengo y'imari ya 450,000 RWF. Mpa gahunda yuzuye."
          : "I want to plant H628 hybrid maize on 1.0 hectare with 450,000 RWF. Give me the input quantities and expected profit.",
    },
    {
      label: language === "rw" ? "Uburwayi bw'urume (Late Blight)" : "Crop Disease / Late Blight",
      query:
        language === "rw"
          ? "Amababi y'ibirayi byanjye arizana urume n'amabara y'umukara. Ni ubuhe burwayi kandi nabukira nte?"
          : "My potato leaves have dark lesions and white morning mildew underneath. What disease is this and how do I treat it immediately?",
    },
    {
      label: language === "rw" ? "Smart Nkunganire & Ibiciro" : "Smart Nkunganire & Market Prices",
      query:
        language === "rw"
          ? "Mpa amakuru ku biciro by'ifumbire kuri Smart Nkunganire (*777#) n'ibiciro by'umusaruro ku masoko uyu munsi."
          : "Tell me about Smart Nkunganire subsidized fertilizer rates (*777#) and today's wholesale crop prices in Rwanda.",
    },
  ];

  const handleSendMessage = async (
    textToSend?: string,
    precomputedMarkdown?: string
  ) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputPrompt("");

    if (precomputedMarkdown) {
      const aiMessage: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: precomputedMarkdown,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMessage]);
      return;
    }

    setIsLoading(true);

    try {
      const totalExp = expenses.reduce((a, b) => a + b.amount, 0);
      const totalRev = sales.reduce((a, b) => a + b.totalAmountRwf, 0);
      const totalHarv = harvests.reduce((a, b) => a + b.quantityKg, 0);
      const currentReport =
        activeAgroZoneReport ||
        (selectedFarm ? analyzeAgroZoneWeatherForFarm(selectedFarm, plans) : null);

      const farmContext = [
        `Active Farm: ${selectedFarm?.name} (AgroZone: ${selectedFarm?.agroZone}, Altitude: ${selectedFarm?.altitude}m ASL, District: ${selectedFarm?.district}, Soil: ${selectedFarm?.soilType} pH ${selectedFarm?.soilPh})`,
        `All Parcels: ${farms.map((f) => `${f.name} (${f.district}, ${f.agroZone}, ${f.altitude}m, ${f.size}Ha, crops: ${f.mainCrops.join("/")})`).join("; ")}`,
        `Financials: Total Revenue=${totalRev} RWF, Total Expenses=${totalExp} RWF, Net Profit=${totalRev - totalExp} RWF, Harvested=${totalHarv} kg`,
      ].join(" | ");

      const chatPayload = updatedHistory.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text,
      }));

      const qLower = query.toLowerCase();
      const isAgroZoneWeatherQuery =
        qLower.includes("agrozone") ||
        qLower.includes("iteganyagihe") ||
        qLower.includes("forecast") ||
        qLower.includes("planting time") ||
        qLower.includes("igihe cyiza cyo gutera") ||
        qLower.includes("pest risk") ||
        qLower.includes("kurinda ibyonyi");

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          messages: chatPayload,
          modelType,
          language,
          farmContext,
          context: {
            farmContext,
            agroZoneWeatherReport: currentReport,
          },
        }),
      });

      const data = await res.json();
      let replyText = data.reply || "Niteguye kugufasha mu buhinzi bwawe.";

      // If the user specifically asked about AgroZone weather/planting/pest risk and the reply doesn't already include the AgroZone telemetry block, append the customized AgroZone analysis
      if (
        isAgroZoneWeatherQuery &&
        currentReport &&
        !replyText.includes(currentReport.agroZone)
      ) {
        replyText = formatAgroZoneAdvisoryMarkdown(currentReport, language);
      }

      const aiMessage: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        structuredPlan: data.structuredPlan || data.suggestedPlan,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (_err) {
      const currentReport =
        activeAgroZoneReport ||
        (selectedFarm ? analyzeAgroZoneWeatherForFarm(selectedFarm, plans) : null);
      const aiMessage: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: currentReport
          ? formatAgroZoneAdvisoryMarkdown(currentReport, language)
          : language === "rw"
            ? "Habaye ikibazo gito mu itumanaho. Ongera ukande ku kibazo cyawe."
            : "A temporary connection issue occurred. Please click your question again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        setTranscribingStatus(
          language === "rw"
            ? "Guhindura ijwi mu nyandiko..."
            : "Transcribing voice input..."
        );

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          try {
            const res = await fetch("/api/gemini/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: "audio/webm",
              }),
            });

            const data = await res.json();
            if (data.text) {
              setInputPrompt(data.text);
            }
          } catch {
            // Ignore transcription error
          } finally {
            setTranscribingStatus(null);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setTranscribingStatus(
        language === "rw"
          ? "Micro ntiyabonetse. Koresha inyandiko cyangwa wemeze micro muri browser."
          : "Microphone access unavailable. Please type your question below."
      );
      setTimeout(() => setTranscribingStatus(null), 3500);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSearchMapsGrounding = async () => {
    setIsSearchingMaps(true);
    const query = `Find certified agro-dealers, fertilizer collection points, and seed cooperatives in ${districtQuery}, Rwanda on Google Maps.`;

    const userMsg: Message = {
      id: "msg-" + Date.now(),
      sender: "user",
      text:
        language === "rw"
          ? `Shakisha ububiko bw'ifumbire n'imbuto byemewe kuri Google Maps muri ${districtQuery}`
          : `Find certified agro-dealers and seed depots in ${districtQuery} on Google Maps`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/gemini/maps-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          district: districtQuery,
        }),
      });

      const data = await res.json();
      const aiMsg: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text:
          data.reply ||
          `Dore amaduka y'ubuhinzi byemejwe na RAB muri ${districtQuery}:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        groundingChunks: data.groundingChunks || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
      setShowMapsMode(false);
    } catch {
      // Handled gracefully
    } finally {
      setIsSearchingMaps(false);
    }
  };

  // Safe Audio Playback (prevents "Failed to load because no supported source was found")
  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    const speakWithBrowserFallback = () => {
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const clean = text.replace(/[*#_`~]/g, "");
          const utterance = new SpeechSynthesisUtterance(clean);
          utterance.lang =
            language === "rw" ? "sw-TZ" : language === "fr" ? "fr-FR" : "en-US";
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } catch {
          setIsSpeaking(false);
        }
      } else {
        setIsSpeaking(false);
      }
    };

    try {
      setIsSpeaking(true);
      const res = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64 && typeof data.audioBase64 === "string" && data.audioBase64.length > 100) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => speakWithBrowserFallback();
          try {
            await audio.play();
            return;
          } catch {
            speakWithBrowserFallback();
            return;
          }
        }
      }
      speakWithBrowserFallback();
    } catch {
      speakWithBrowserFallback();
    }
  };

  const handleSavePlan = (msgId: string, planData: Partial<FarmPlan>) => {
    const farm = farms[0] || { id: "farm-1", name: "Ibirayi Farm (Kinigi)" };
    const fullPlan: FarmPlan = {
      id: "plan-ai-" + Date.now(),
      farmId: farm.id,
      farmName: farm.name,
      crop: planData.crop || "Ibirayi (Kinigi)",
      seasonCode: "2026A",
      landSize: planData.landSize || 0.5,
      unit: planData.unit || "hegitari",
      budget: planData.budget || 500000,
      expectedYieldKg: planData.expectedYieldKg || 8000,
      expectedPricePerKg: planData.expectedPricePerKg || 340,
      expectedGrossRevenue: planData.expectedGrossRevenue || 2720000,
      expectedNetProfit: planData.expectedNetProfit || 2220000,
      budgetBreakdown: planData.budgetBreakdown || [],
      timeline: [
        {
          step: 1,
          title: "Gutegura umurima no gushyiramo ifumbire y'imborera",
          timing: "Icyumweru 1",
          advice: "Shyiramo ifumbire y'imborera iboze neza",
        },
        {
          step: 2,
          title: "Gutera imbuto y'indobanure n'ifumbire ya DAP/NPK",
          timing: "Icyumweru 2",
          advice: planData.rabTips || "Kurikiza intera yemejwe na RAB",
        },
        {
          step: 3,
          title: "Kubagara no gusasira",
          timing: "Icyumweru 4",
          advice: "Gusasira bituma imizi ikura neza kandi bikarinda ubuhehere",
        },
        {
          step: 4,
          title: "Kurinda indwara n'ibyonnyi",
          timing: "Icyumweru 6-9",
          advice: "Tera umuti wemewe mu gitondo izuba rigisohoka",
        },
        {
          step: 5,
          title: "Gusarura no kwanika ahari umuyaga",
          timing: "Icyumweru 14-16",
          advice: "Robanura umusaruro mbere yo kuwushyira mu bubiko",
        },
      ],
      status: "active",
      growthStagePercentage: 15,
      rabTips:
        planData.rabTips ||
        "Ubuhinzi bukurikiza amabwiriza ya RAB bwongera inyungu.",
      createdAt: new Date().toISOString().split("T")[0],
    };

    onSavePlanFromAi(fullPlan);
    setSavedPlanId(msgId);
  };

  return (
    <div className="space-y-6">
      {/* Brand Header Banner */}
      <div className="bg-emerald-900 dark:bg-stone-900 p-6 rounded-2xl border border-emerald-800 dark:border-stone-800 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-amber-300 font-semibold">
            <Bot className="w-4 h-4" />
            <span>TERIMBERE AI • RAB Agronomy & Financial Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1 font-display">
            {t.aiTitle}
          </h1>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
            {language === "rw"
              ? "Baza ikibazo cyose ku bihingwa, ingengo y'imari, imiti yemewe na RAB, cyangwa amaduka y'ifumbire ya Smart Nkunganire."
              : "Ask any question about crop budgets, RAB disease treatments, Smart Nkunganire subsidies, or market prices."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-emerald-950 border border-emerald-800 text-xs">
            <button
              type="button"
              onClick={() => setModelType("general")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                modelType === "general"
                  ? "bg-emerald-700 text-white"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              Deep Agronomy
            </button>
            <button
              type="button"
              onClick={() => setModelType("fast")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 ${
                modelType === "fast"
                  ? "bg-amber-500 text-stone-950"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Fast Reply</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMapsMode(!showMapsMode)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {language === "rw" ? "Amaduka y'Ifumbire (Maps)" : "Find Agro-Dealers"}
            </span>
          </button>
        </div>
      </div>

      {/* Google Maps Grounding Search Box */}
      {showMapsMode && (
        <div className="bg-white dark:bg-stone-900 border border-emerald-700/50 p-4 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                {language === "rw"
                  ? "Shakisha Amaduka y'Ifumbire n'Imbuto Hafi Yawe kuri Google Maps"
                  : "Locate Accredited Agro-Dealers & Seed Hubs via Google Maps"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowMapsMode(false)}
              className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white font-semibold"
            >
              ✕ {language === "rw" ? "Funga" : "Close"}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={districtQuery}
              onChange={(e) => setDistrictQuery(e.target.value)}
              placeholder="Musanze, Nyagatare, Huye, Rubavu, Rwamagana..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm text-stone-900 dark:text-white focus:border-emerald-600 outline-hidden"
            />
            <button
              type="button"
              onClick={handleSearchMapsGrounding}
              disabled={isSearchingMaps}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shrink-0"
            >
              {isSearchingMaps ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {language === "rw" ? "Shakisha kuri Maps" : "Search Locations"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* AgroZone Weather Forecast & Planting / Pest Risk Intelligence Hub */}
      <AgroZoneWeatherAdvisorPanel
        farms={farms}
        plans={plans}
        selectedFarmId={selectedFarmId}
        onSelectFarmId={(id) => {
          setSelectedFarmId(id);
          const f = farms.find((item) => item.id === id);
          if (f) setDistrictQuery(f.district);
        }}
        language={language}
        onAskAiPrompt={(promptText, precomputedMd) =>
          handleSendMessage(promptText, precomputedMd)
        }
        onAddActivity={onAddActivity}
        onReportUpdated={(rep) => setActiveAgroZoneReport(rep)}
      />

      {/* Quick Inquiry Prompts */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2.5">
        <span className="text-xs font-bold text-stone-500 dark:text-stone-400 block">
          {language === "rw"
            ? "Ibibazo bikunze kubazwa (Kanda uhitemo):"
            : "Quick Agronomy & Budget Inquiries:"}
        </span>
        <div className="flex flex-wrap gap-2">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(chip.query)}
              className="text-left text-xs bg-stone-50 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-stone-700 dark:text-stone-200 hover:text-emerald-900 dark:hover:text-emerald-300 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-600 transition-all flex items-center space-x-1.5 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs p-4 sm:p-6 min-h-[420px] max-h-[600px] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold ${
                msg.sender === "user" ? "bg-stone-800" : "bg-emerald-800"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4 text-amber-300" />
              )}
            </div>

            <div
              className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-800 text-white font-medium"
                  : "bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5 text-xs text-stone-500 dark:text-stone-400">
                <span
                  className={`font-bold ${
                    msg.sender === "user" ? "text-emerald-100" : "text-emerald-800 dark:text-emerald-400"
                  }`}
                >
                  {msg.sender === "user"
                    ? language === "rw"
                      ? "Wowe (Umuhinzi)"
                      : "You (Farmer)"
                    : "TERIMBERE Agronomy Advisor"}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    msg.sender === "user" ? "text-emerald-200" : ""
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              <div className="whitespace-pre-line text-sm">{msg.text}</div>

              {/* Google Maps Grounding Links */}
              {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {language === "rw"
                        ? "Amaduka n'ibigo kuri Google Maps:"
                        : "Verified Locations on Google Maps:"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.groundingChunks.map((chunk, cIdx) => {
                      const mapInfo = chunk.maps;
                      if (!mapInfo) return null;
                      return (
                        <a
                          key={cIdx}
                          href={mapInfo.uri || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-emerald-600 transition-colors flex items-center justify-between group text-xs text-stone-900 dark:text-white"
                        >
                          <div className="truncate mr-2">
                            <span className="font-bold block truncate text-emerald-900 dark:text-emerald-300">
                              {mapInfo.title || "Agro-Dealer Location"}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              Google Maps →
                            </span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Structured Farm Plan Card */}
              {msg.structuredPlan && (
                <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 rounded-xl border space-y-3 text-stone-900 dark:text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <h4 className="font-bold text-sm">
                        {language === "rw"
                          ? "Gahunda y'Ubuhinzi Yateguwe"
                          : "Generated Seasonal Farm Plan"}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {msg.structuredPlan.crop}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-stone-50 dark:bg-stone-800 p-2.5 rounded-lg">
                      <span className="text-stone-500 block">
                        {language === "rw" ? "Igishoro" : "Budget"}
                      </span>
                      <strong className="font-mono tabular-nums text-stone-900 dark:text-white text-sm">
                        {msg.structuredPlan.budget?.toLocaleString()} RWF
                      </strong>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800 p-2.5 rounded-lg">
                      <span className="text-stone-500 block">
                        {language === "rw" ? "Ubuso" : "Area"}
                      </span>
                      <strong className="font-mono tabular-nums text-stone-900 dark:text-white text-sm">
                        {msg.structuredPlan.landSize} {msg.structuredPlan.unit}
                      </strong>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800 p-2.5 rounded-lg">
                      <span className="text-stone-500 block">
                        {language === "rw" ? "Umusaruro" : "Est. Yield"}
                      </span>
                      <strong className="font-mono tabular-nums text-stone-900 dark:text-white text-sm">
                        {msg.structuredPlan.expectedYieldKg?.toLocaleString()} Kg
                      </strong>
                    </div>
                    <div className="bg-stone-50 dark:bg-stone-800 p-2.5 rounded-lg">
                      <span className="text-stone-500 block">
                        {language === "rw" ? "Inyungu" : "Net Profit"}
                      </span>
                      <strong className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400 text-sm">
                        +{msg.structuredPlan.expectedNetProfit?.toLocaleString()} RWF
                      </strong>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="text-xs text-stone-500">
                      {language === "rw"
                        ? "Bika iyi gahunda kugira ngo ukurikirane imikurire y'igihingwa."
                        : "Save this plan to track crop growth and input expenses."}
                    </span>
                    {savedPlanId === msg.id ? (
                      <span className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{language === "rw" ? "Yabitswe!" : "Plan Saved!"}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSavePlan(msg.id, msg.structuredPlan!)}
                        className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                      >
                        <PlusCircle className="w-4 h-4 text-amber-300" />
                        <span>
                          {language === "rw" ? "Bika muri Gahunda" : "Save as Farm Plan"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {msg.sender === "ai" && (
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSpeak(msg.text)}
                    className="flex items-center space-x-1 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                        <span>{language === "rw" ? "Hagarika ijwi" : "Stop Audio"}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>
                          {language === "rw" ? "Umva mu ijwi" : "Listen"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>
                {language === "rw"
                  ? "Umujyanama arimo kubara no gutegura igisubizo..."
                  : "Calculating agronomic and financial response..."}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {transcribingStatus && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 p-3 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>{transcribingStatus}</span>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white dark:bg-stone-900 p-3 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs flex items-center space-x-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={
            language === "rw"
              ? "Andika ikibazo cyawe hano (urugero: Mfite 500,000 RWF ndashaka guhinga ibirayi kuri 0.5 Ha)..."
              : "Ask about crop budgets, fertilizers, diseases, or market prices..."
          }
          className="flex-1 px-4 py-3 border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 rounded-xl text-sm text-stone-900 dark:text-white focus:border-emerald-600 outline-hidden"
        />

        {!isRecording ? (
          <button
            type="button"
            onClick={startAudioRecording}
            className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors shrink-0"
            title={language === "rw" ? "Vuga mu ijwi" : "Voice Input"}
          >
            <Mic className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={stopAudioRecording}
            className="p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors animate-pulse shrink-0"
            title={language === "rw" ? "Hagarika gufata ijwi" : "Stop Recording"}
          >
            <MicOff className="w-5 h-5" />
          </button>
        )}

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center space-x-1.5 transition-colors shrink-0"
        >
          <Send className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">{t.send}</span>
        </button>
      </form>
    </div>
  );
};
