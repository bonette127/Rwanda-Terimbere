import React, { useState } from "react";
import { Language, LocationSuitability } from "../types";
import { initialLocationSuitabilities } from "../data/mockData";
import {
  MapPin,
  Compass,
  Mountain,
  Droplets,
  Sprout,
  ShieldAlert,
  Layers,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Send,
} from "lucide-react";

interface LocationSuitabilityViewProps {
  language: Language;
}

const EXTENDED_DISTRICT_SUITABILITY: Record<string, LocationSuitability> = {
  ...initialLocationSuitabilities,
  Rubavu: {
    latitude: -1.6761,
    longitude: 29.2611,
    district: "Rubavu",
    sector: "Kanama & Mudende",
    agroZone: "Imisozi y'Ibirunga & Inkengero za Kivu (Volcanic & Lake Kivu Belt)",
    altitudeMeters: 1920,
    soilType: "Ubutaka bw'amakoro n'imborera nyinshi (Volcanic Andosols)",
    soilPh: 6.1,
    annualRainfallMm: 1380,
    suitabilityScore: 94,
    recommendedCrops: [
      {
        cropRw: "Ibirayi (Kinigi & Rwangume)",
        cropEn: "Irish Potatoes (Kinigi)",
        suitability: "Optimal",
        expectedYieldTonsHa: 21,
        notesRw: "Ubutaka bw'amakoro ya Mudende na Kanama bweza ibirayi ku rwego rwo hejuru.",
      },
      {
        cropRw: "Imboga ( Karoti, Amashu, Ibitunguru)",
        cropEn: "Vegetables (Carrots, Cabbage, Onions)",
        suitability: "Optimal",
        expectedYieldTonsHa: 26,
        notesRw: "Isoko ryagutse i Gisenyi n'i Kigali rituma imboga zunguka cyane.",
      },
      {
        cropRw: "Ibishyimbo by'Imishingiriro (MAC 44)",
        cropEn: "Climbing Beans (MAC 44)",
        suitability: "Optimal",
        expectedYieldTonsHa: 3.2,
        notesRw: "Byera vuba kandi bifata azote mu butaka.",
      },
    ],
    soilRisks: [
      "Isuri ku misozi ihanamye ya Kanama mu gihe cy'imvura y'itumba",
      "Urume rw'ibirayi mu gihe cy'igihu cyinshi",
    ],
    conservationTechniques: [
      "Gucukura imirwanyasuri no gutera urubingo ku nkengero",
      "Guhinduranya ibirayi n'ibishyimbo by'imishingiriro",
    ],
  },
  Bugesera: {
    latitude: -2.2081,
    longitude: 30.1453,
    district: "Bugesera",
    sector: "Nyamata & Rilima",
    agroZone: "Ikibaya cy'Amayaga na Bugesera (Bugesera Savannah Depression)",
    altitudeMeters: 1390,
    soilType: "Ubutaka bw'umusenyi n'inombe (Sandy-Clay Ferralsols)",
    soilPh: 6.2,
    annualRainfallMm: 880,
    suitabilityScore: 87,
    recommendedCrops: [
      {
        cropRw: "Imyumbati, Ibigori (PAN 53) &amasaka",
        cropEn: "Cassava & Drought-Tolerant Maize",
        suitability: "Optimal",
        expectedYieldTonsHa: 18,
        notesRw: "Byihanganira izuba kandi byera neza mu butaka bwa Bugesera.",
      },
      {
        cropRw: "Urusenda, Inyanya & Avoka (Hass)",
        cropEn: "Export Chili, Tomatoes & Hass Avocado",
        suitability: "Optimal",
        expectedYieldTonsHa: 24,
        notesRw: "Kuhira ukoresheje amazi y'ibiyaga bitanga umusaruro w'isoko mpuzamahanga.",
      },
      {
        cropRw: "Ibishyimbo birwanya izuba (RWR 2245)",
        cropEn: "Iron-Biofortified Bush Beans",
        suitability: "Optimal",
        expectedYieldTonsHa: 2.6,
        notesRw: "Byera mu minsi 75 gusa mbere y'uko izuba ry'icyi rikara.",
      },
    ],
    soilRisks: [
      "Izuba ryinshi n'ugukama kw'amazi mu butaka mu gihembwe cya C",
    ],
    conservationTechniques: [
      "Gusasira ibishogoshogo mu murima (Mulching) kugira ngo ubuhehere bugumemo",
      "Kuhira ku bitonyanga (Drip/Solar Irrigation) hifashishijwe ibiyaga",
    ],
  },
  Rwamagana: {
    latitude: -1.9487,
    longitude: 30.4347,
    district: "Rwamagana",
    sector: "Muhazi & Karenge",
    agroZone: "Imisozi Iringaniye y'Uburasirazuba (Eastern Plateau)",
    altitudeMeters: 1520,
    soilType: "Ubutaka bw'imborera isanzwe (Humic Ferralsols)",
    soilPh: 6.0,
    annualRainfallMm: 1020,
    suitabilityScore: 90,
    recommendedCrops: [
      {
        cropRw: "Urutoki ( Kamaramasenge,Injagi, Fia)",
        cropEn: "Bananas & Plantains",
        suitability: "Optimal",
        expectedYieldTonsHa: 25,
        notesRw: "Akarere ka Rwamagana n'Uburasirazuba ni ikigega cy'urutoki na avoka.",
      },
      {
        cropRw: "Ibigori (H628) & Ibishyimbo",
        cropEn: "Maize & Intercropped Beans",
        suitability: "Optimal",
        expectedYieldTonsHa: 5.5,
        notesRw: "Ubutumburuke buringaniye n'izuba byihutisha ikura.",
      },
    ],
    soilRisks: ["Kugabanuka kw'ifumbire y'imborera mu butaka budasasiriwe"],
    conservationTechniques: [
      "Gusasira urutoki no kuvanga ifumbire y'imborera na NPK",
    ],
  },
  Karongi: {
    latitude: -2.0601,
    longitude: 29.3492,
    district: "Karongi",
    sector: "Bwishyura & Rubengera",
    agroZone: "Inkengero za Kivu n'Isunzu rya Congo-Nile (Kivu Lake Ridge)",
    altitudeMeters: 1780,
    soilType: "Ubutaka bw'inombe n'ibumba (Clay Loam Acrisols)",
    soilPh: 5.5,
    annualRainfallMm: 1320,
    suitabilityScore: 89,
    recommendedCrops: [
      {
        cropRw: "Ikawa ya Arabica & Icyayi",
        cropEn: "Specialty Arabica Coffee & Highland Tea",
        suitability: "Optimal",
        expectedYieldTonsHa: 3.1,
        notesRw: "Ikawa yo ku nkengero za Kivu igira uburyohe bwihariye ku isoko mpuzamahanga.",
      },
      {
        cropRw: "Imyumbati, Ibijumba & Ibishyimbo",
        cropEn: "Cassava, Sweet Potatoes & Beans",
        suitability: "Optimal",
        expectedYieldTonsHa: 16,
        notesRw: "Bibereye imisozi ya Karongi na Rutsiro.",
      },
    ],
    soilRisks: ["Aside yo mu butaka (pH 5.5) n'isuri ku misozi ihanamye"],
    conservationTechniques: [
      "Gushyiramo ishwagara y'ubuhinzi (Travertin / Agricultural Lime) buri myaka 2",
      "Amaterasi y'indinganire (Radical Terraces)",
    ],
  },
  Kigali: {
    latitude: -1.9441,
    longitude: 30.0619,
    district: "Kigali",
    sector: "Gasabo (Rutunga / Kabuye) & Kicukiro",
    agroZone: "Imisozi n'Ibishanga bya Kigali (Urban & Peri-Urban Valleys)",
    altitudeMeters: 1495,
    soilType: "Urwondo mu bishanga n'imborera ku misozi (Alluvial & Loam)",
    soilPh: 6.1,
    annualRainfallMm: 1050,
    suitabilityScore: 91,
    recommendedCrops: [
      {
        cropRw: "Inyanya, Imboga, Urusenda & Watermelon",
        cropEn: "High-Value Horticulture (Tomatoes, Peppers, Greens)",
        suitability: "Optimal",
        expectedYieldTonsHa: 28,
        notesRw: "Kuba hafi y'amasoko manini ya Kimironko na Nyabugogo bitanga inyungu nyinshi nta kiguzi kinini cy'ubwikorezi.",
      },
      {
        cropRw: "Umuceri n'Ibigori mu bishanga",
        cropEn: "Marshland Rice & Green Maize",
        suitability: "Optimal",
        expectedYieldTonsHa: 6.2,
        notesRw: "Ibishanga bya Nyabarongo na Kabuye bihorana amazi.",
      },
    ],
    soilRisks: ["Umwuzure mu bishanga mu gihe cy'imvura nyinshi ya Mata"],
    conservationTechniques: [
      "Kuvugurura imigende y'amazi mu bishanga no gukoresha greenhouses",
    ],
  },
};

export const LocationSuitabilityView: React.FC<LocationSuitabilityViewProps> = ({
  language,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Musanze");
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [customQuery, setCustomQuery] = useState<string>("");
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);

  const currentData: LocationSuitability =
    EXTENDED_DISTRICT_SUITABILITY[selectedDistrict] ||
    EXTENDED_DISTRICT_SUITABILITY["Musanze"];

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError(
        language === "rw"
          ? "GPS ntabwo yemewe muri iyi browser."
          : "Geolocation is not supported by your browser."
      );
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingGps(false);
        const { latitude, longitude } = position.coords;
        setLiveCoords({ lat: latitude, lng: longitude });

        if (latitude > -1.7 && longitude < 29.5) {
          setSelectedDistrict("Rubavu");
        } else if (latitude > -1.7 && longitude < 29.9) {
          setSelectedDistrict("Musanze");
        } else if (longitude > 30.25 && latitude > -1.6) {
          setSelectedDistrict("Nyagatare");
        } else if (longitude > 30.25) {
          setSelectedDistrict("Rwamagana");
        } else if (latitude < -2.3) {
          setSelectedDistrict("Huye");
        } else if (latitude < -2.05 && longitude > 29.95) {
          setSelectedDistrict("Bugesera");
        } else if (longitude < 29.5) {
          setSelectedDistrict("Karongi");
        } else {
          setSelectedDistrict("Kigali");
        }
      },
      () => {
        setIsDetectingGps(false);
        setGpsError(
          language === "rw"
            ? "Hitamo Akarere kawe ku rutonde kugira ngo ubone isesengura ry'ubutaka."
            : "Please select your Rwandan district from the menu to inspect soil suitability."
        );
      },
      { timeout: 8000 }
    );
  };

  const handleAskSuitabilityQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    const q = customQuery.toLowerCase();

    // Auto-switch district if mentioned in query
    for (const distKey of Object.keys(EXTENDED_DISTRICT_SUITABILITY)) {
      if (q.includes(distKey.toLowerCase())) {
        setSelectedDistrict(distKey);
      }
    }

    const active =
      Object.entries(EXTENDED_DISTRICT_SUITABILITY).find(([k]) =>
        q.includes(k.toLowerCase())
      )?.[1] || currentData;

    const topCrops = active.recommendedCrops
      .map((c) => `${language === "rw" ? c.cropRw : c.cropEn} (${c.expectedYieldTonsHa} T/Ha)`)
      .join(", ");

    if (language === "rw") {
      setQueryAnswer(
        `Muri **${active.district}** (${active.agroZone}, Ubutumburuke: ${active.altitudeMeters}m, pH y'ubutaka: ${active.soilPh}, Imvura: ${active.annualRainfallMm} mm/umwaka): Ibihingwa bibereye cyane kandi bitanga inyungu nyinshi ni **${topCrops}**. Inama ya RAB: ${active.conservationTechniques[0]}.`
      );
    } else {
      setQueryAnswer(
        `In **${active.district}** (${active.agroZone}, Altitude: ${active.altitudeMeters}m, Soil pH: ${active.soilPh}, Rainfall: ${active.annualRainfallMm} mm/yr): The highest-performing crops are **${topCrops}** with a ${active.suitabilityScore}% agro-ecological suitability score. RAB Recommendation: ${active.conservationTechniques[0]}.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-emerald-900 dark:bg-stone-900 p-6 sm:p-8 text-white shadow-xs border border-emerald-800 dark:border-stone-800">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-emerald-800 border border-emerald-700 text-amber-300 text-xs font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>
              {language === "rw"
                ? "Isesengura ry'Aho Uri n'Ubutaka bwawe"
                : "Agro-Ecological Suitability Engine"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
            {language === "rw"
              ? "Genzura niba aho uri hajyanye n'ubuhinzi ushaka gukora"
              : "Location & Soil Suitability for Farming in Rwanda"}
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
            {language === "rw"
              ? "Dukoresheje GPS cyangwa Akarere kawe, sisitemu isuzuma ubutumburuke, ubwoko bw'ubutaka (soil type), pH, n'ibihingwa bitanga umusaruro munini."
              : "Cross-references your district or GPS coordinates with Rwanda's agro-ecological zones, altitude, soil pH, and rainfall profiles."}
          </p>
        </div>
      </div>

      {/* Geolocation Controls, District Selector & Custom Suitability Query */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isDetectingGps}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isDetectingGps ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{language === "rw" ? "Gupima GPS..." : "Detecting GPS..."}</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-amber-300" />
                  <span>
                    {language === "rw"
                      ? "Genzura aho ndi ubu (GPS)"
                      : "Use Current GPS Location"}
                  </span>
                </>
              )}
            </button>

            {liveCoords && (
              <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                GPS: {liveCoords.lat.toFixed(4)}, {liveCoords.lng.toFixed(4)}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 whitespace-nowrap">
              {language === "rw" ? "Hitamo Akarere:" : "Select District:"}
            </span>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setQueryAnswer(null);
              }}
              className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            >
              <option value="Musanze">Musanze (Amajyaruguru - Ibirunga)</option>
              <option value="Rubavu">Rubavu (Iburengerazuba - Amakoro)</option>
              <option value="Nyagatare">Nyagatare (Uburasirazuba - Imirambi)</option>
              <option value="Bugesera">Bugesera (Uburasirazuba - Amayaga)</option>
              <option value="Rwamagana">Rwamagana (Uburasirazuba - Imisozi)</option>
              <option value="Huye">Huye (Amajyepfo - Imisozi yo Hagati)</option>
              <option value="Karongi">Karongi (Iburengerazuba - Inkengero za Kivu)</option>
              <option value="Kigali">Kigali (Gasabo & Kicukiro)</option>
            </select>
          </div>
        </div>

        {/* Interactive Suitability Query Input */}
        <form
          onSubmit={handleAskSuitabilityQuery}
          className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-stone-100 dark:border-stone-800"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder={
                language === "rw"
                  ? "Baza ku butaka cyangwa igihingwa (urugero: Ni iki nahinga i Bugesera cyangwa i Rubavu?)..."
                  : "Ask about any district or crop suitability (e.g. What grows best in Rubavu or Bugesera?)..."
              }
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === "rw" ? "Suzuma Ubutaka" : "Check Suitability"}</span>
          </button>
        </form>

        {queryAnswer && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-200 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{queryAnswer}</p>
          </div>
        )}
      </div>

      {gpsError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Main Suitability Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {language === "rw" ? "Amanota y'Ubutaka" : "Suitability Score"}
            </span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-4xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {currentData.suitabilityScore}%
              </span>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                {language === "rw" ? "Bremewe Cyane" : "High Potential"}
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
            {currentData.agroZone}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {language === "rw" ? "Ubutumburuke" : "Elevation"}
            </span>
            <Mountain className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white">
              {currentData.altitudeMeters} m
            </div>
            <span className="text-xs text-stone-500">
              {language === "rw" ? "Hejuru y'inyanja" : "Above sea level"}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            GPS: {currentData.latitude.toFixed(3)}, {currentData.longitude.toFixed(3)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {language === "rw" ? "Ubwoko bw'Ubutaka & pH" : "Soil Profile & pH"}
            </span>
            <Layers className="w-5 h-5 text-amber-600" />
          </div>
          <div className="my-2">
            <div className="text-sm font-black text-stone-900 dark:text-white">
              {currentData.soilType}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-stone-500">Soil pH:</span>
            <span className="font-black font-mono text-emerald-700 dark:text-emerald-400">
              {currentData.soilPh} (Optimal)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {language === "rw" ? "Imvura ku Mwaka" : "Annual Rainfall"}
            </span>
            <Droplets className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white">
              {currentData.annualRainfallMm} mm
            </div>
            <span className="text-xs text-stone-500">
              {language === "rw"
                ? "Mpuzandengo y'imvura mu mwaka"
                : "Mean annual precipitation"}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {currentData.annualRainfallMm > 1100
              ? language === "rw"
                ? "Imvura ihagije cyane"
                : "High rainfall reliability"
              : language === "rw"
              ? " Kuhira byongera umusaruro"
              : "Supplemental irrigation advised"}
          </div>
        </div>
      </div>

      {/* Recommended Crops & Conservation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Sprout className="w-5 h-5 text-emerald-700" />
              <span>
                {language === "rw"
                  ? `Ibihingwa Bibereye Akarere ka ${currentData.district}`
                  : `Recommended Crops for ${currentData.district}`}
              </span>
            </h2>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md">
              RAB Certified
            </span>
          </div>

          <div className="space-y-3">
            {currentData.recommendedCrops.map((crop, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-stone-900 dark:text-white">
                      {language === "rw" ? crop.cropRw : crop.cropEn}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        crop.suitability === "Optimal"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                      }`}
                    >
                      {crop.suitability === "Optimal"
                        ? language === "rw"
                          ? "Bibereye Cyane"
                          : "Optimal"
                        : language === "rw"
                        ? "Biringaniye"
                        : "Moderate"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {crop.notesRw}
                  </p>
                </div>

                <div className="sm:text-right shrink-0 bg-white dark:bg-stone-900 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700">
                  <span className="text-[10px] text-stone-400 block uppercase font-bold">
                    {language === "rw" ? "Umusaruro / Ha" : "Expected Yield"}
                  </span>
                  <span className="text-base font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {crop.expectedYieldTonsHa} T/Ha
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>
                {language === "rw"
                  ? "Ingorane z'Ubutaka zo Kwitondera"
                  : "Local Soil & Climate Risks"}
              </span>
            </h3>
            <ul className="space-y-2">
              {currentData.soilRisks.map((risk, idx) => (
                <li
                  key={idx}
                  className="text-xs text-stone-700 dark:text-stone-300 flex items-start space-x-2 bg-amber-50/70 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/40"
                >
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>
                {language === "rw"
                  ? "Uburyo bwo Kubungabunga Ubutaka"
                  : "Recommended Soil Conservation"}
              </span>
            </h3>
            <ul className="space-y-2">
              {currentData.conservationTechniques.map((tech, idx) => (
                <li
                  key={idx}
                  className="text-xs text-stone-700 dark:text-stone-300 flex items-start space-x-2 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{tech}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
