import { useEffect, useState } from "react";
import { DailyAgronomyTip, Language, MarketPrice, WeatherForecast } from "../types";

export interface DynamicDayState {
  dateIso: string; // YYYY-MM-DD
  dayNumberOfYear: number;
  epochDayIndex: number;
  formattedDateRw: string;
  formattedDateEn: string;
  seasonCode: string; // e.g., "2026A"
  seasonLabelRw: string;
  seasonLabelEn: string;
  greetingRw: string;
  greetingEn: string;
}

const RW_DAYS = [
  "Ku Cyumweru",
  "Kuwa Mbere",
  "Kuwa Kabiri",
  "Kuwa Gatatu",
  "Kuwa Kane",
  "Kuwa Gatanu",
  "Kuwa Gatandatu",
];

const RW_MONTHS = [
  "Mutarama",
  "Gashyantare",
  "Werurwe",
  "Mata",
  "Gicurasi",
  "Kamena",
  "Nyakanga",
  "Kanama",
  "Nzeri",
  "Ukwakira",
  "Ugushyingo",
  "Ukuboza",
];

export const computeDynamicDayState = (now: Date = new Date()): DynamicDayState => {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0..11
  const dateNum = now.getDate();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  const dateIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    dateNum
  ).padStart(2, "0")}`;

  const startOfYear = new Date(year, 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayNumberOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const epochDayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));

  const formattedDateRw = `${RW_DAYS[dayOfWeek]}, ${dateNum} ${RW_MONTHS[month]} ${year}`;
  const formattedDateEn = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Determine Rwandan Agricultural Season dynamically from live month
  // Season A: Sept (8) - Feb (1)
  // Season B: Mar (2) - Jun (5)
  // Season C: Jul (6) - Aug (7)
  let seasonCode = `${year}A`;
  let seasonLabelRw = `Igihembwe cy'Ihinga ${year}A (Nzeri – Gashyantare)`;
  let seasonLabelEn = `Agricultural Season ${year}A (Sept – Feb)`;

  if (month >= 8) {
    seasonCode = `${year + 1}A`;
    seasonLabelRw = `Igihembwe cy'Ihinga ${year + 1}A (Nzeri ${year} – Gashyantare ${year + 1})`;
    seasonLabelEn = `Agricultural Season ${year + 1}A (Sept ${year} – Feb ${year + 1})`;
  } else if (month <= 1) {
    seasonCode = `${year}A`;
    seasonLabelRw = `Igihembwe cy'Ihinga ${year}A (Nzeri ${year - 1} – Gashyantare ${year})`;
    seasonLabelEn = `Agricultural Season ${year}A (Sept ${year - 1} – Feb ${year})`;
  } else if (month >= 2 && month <= 5) {
    seasonCode = `${year}B`;
    seasonLabelRw = `Igihembwe cy'Ihinga ${year}B (Werurwe – Kamena ${year})`;
    seasonLabelEn = `Agricultural Season ${year}B (Mar – Jun ${year})`;
  } else {
    seasonCode = `${year}C`;
    seasonLabelRw = `Igihembwe cy'Ihinga ${year}C (Imirima y'Igishanga: Nyakanga – Kanama ${year})`;
    seasonLabelEn = `Agricultural Season ${year}C (Marshland Season: Jul – Aug ${year})`;
  }

  const greetingRw =
    hour < 12
      ? "Mwaramutse neza, muhinzi mwiza!"
      : hour < 18
        ? "Mwiriwe neza, muhinzi mwiza!"
        : "Mugire umugoroba mwiza, muhinzi mwiza!";

  const greetingEn =
    hour < 12
      ? "Good morning, respected farmer!"
      : hour < 18
        ? "Good afternoon, respected farmer!"
        : "Good evening, respected farmer!";

  return {
    dateIso,
    dayNumberOfYear,
    epochDayIndex,
    formattedDateRw,
    formattedDateEn,
    seasonCode,
    seasonLabelRw,
    seasonLabelEn,
    greetingRw,
    greetingEn,
  };
};

/**
 * React hook that keeps the app globally synchronized with the current calendar day.
 * Automatically updates when midnight passes or when the browser tab regains focus on a new day.
 */
export const useGlobalDynamicDay = (): DynamicDayState => {
  const [dayState, setDayState] = useState<DynamicDayState>(() =>
    computeDynamicDayState(new Date())
  );

  useEffect(() => {
    const checkDayRollover = () => {
      const latest = computeDynamicDayState(new Date());
      setDayState((prev) =>
        prev.dateIso !== latest.dateIso ? latest : prev
      );
    };

    const intervalId = window.setInterval(checkDayRollover, 30000);
    const handleVisibilityOrFocus = () => checkDayRollover();

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  return dayState;
};

/**
 * Generates respectful, helpful, and dynamically updated daily agronomy tips for the current date.
 */
export const getDynamicDailyTipsForDate = (
  dateIso: string = new Date().toISOString().split("T")[0]
): DailyAgronomyTip[] => {
  const dt = new Date(`${dateIso}T00:00:00`);
  const daySeed = Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
  const dynState = computeDynamicDayState(dt);

  const tipPool: Omit<DailyAgronomyTip, "id" | "date" | "season">[] = [
    {
      titleRw: "Inama y'Uyu Munsi: Gukurikirana Ubuhehere bw'Ubutaka n'Imirama",
      titleEn: "Today's Helpful Tip: Gentle Soil Moisture & Contour Care",
      cropCategory: "Ibirayi & Ibishyimbo",
      alertLevel: "normal",
      preventionAdviceRw:
        "Muhinzi mwiza, turabugira inama yo kugenzura ubuhehere bw'ubutaka mu gitondo kare. Gusasira imirima no gusibura imiferege y'amazi bifasha imizi gukura neza no kwirinda kubora.",
      preventionAdviceEn:
        "Dear farmer, we kindly recommend checking your root-zone moisture early in the morning. Keeping contour trenches clear and maintaining organic mulch helps roots thrive.",
      actionItemRw:
        "Genzura imiringoti y'amazi mu murima kandi wongere isaso aho ubutaka bugaragaza kumuka.",
      rabAdvisoryCode: `RAB-DYN-${(daySeed % 90) + 10}`,
      acknowledged: false,
    },
    {
      titleRw: "Inama y'Ubuhinzi: Gukoresha Ifumbire ku Gihe n'Uburyo Bunoze",
      titleEn: "Agronomy Guidance: Respectful & Effective Nutrient Timing",
      cropCategory: "Ibigori & Soya",
      alertLevel: "normal",
      preventionAdviceRw:
        "Kugira ngo ifumbire ugura ikugirire akamaro kanini, ni byiza kuyishyira mu butaka bufite ubuhehere buringaniye, kuri santimetero 5 iruhande rw'igihingwa.",
      preventionAdviceEn:
        "To get the best return from your fertilizer investment, we gently advise applying nutrients when the soil is moderately moist, placed 5 cm beside the plant stem.",
      actionItemRw:
        "Pima ubuhehere bw'ubutaka mbere yo gushyiramo ifumbire ya NPK cyangwa Urea.",
      rabAdvisoryCode: `RAB-NPK-${(daySeed % 80) + 15}`,
      acknowledged: false,
    },
    {
      titleRw: "Ubufasha mu Kurinda Ibihingwa: Kugenzura Amababi mu Gitondo",
      titleEn: "Supportive Crop Protection: Morning Canopy Scouting",
      cropCategory: "Ibihingwa Byose",
      alertLevel: "caution",
      preventionAdviceRw:
        "Gusura umurima wawe kabiri mu cyumweru mu masaha ya mu gitondo bigufasha kubona hakiri kare ibimenyetso by'ibyonyi cyangwa uduhumyo, bigatuma ubikemura bitaratera igihombo.",
      preventionAdviceEn:
        "Walking through your parcel twice a week in the cool morning hours helps you spot early signs of pests or mildew peacefully and address them before they spread.",
      actionItemRw:
        "Reba munsi y'amababi 20 mu murima wawe; niba ubonye ikimenyetso, baza Umujyanama wa AI agufashe.",
      rabAdvisoryCode: `RAB-IPM-${(daySeed % 70) + 20}`,
      acknowledged: false,
    },
    {
      titleRw: "Kubungabunga Umusaruro n'Ubuziranenge ku Isoko",
      titleEn: "Post-Harvest Care & Market Quality Preparation",
      cropCategory: "Ikawa, Ibirayi & Imboga",
      alertLevel: "normal",
      preventionAdviceRw:
        "Gusarura mu gitondo ikime kimaze kumuka no kurobanura umusaruro mu buryo bwitonze byongera agaciro k'ibyo ujyana ku isoko.",
      preventionAdviceEn:
        "Harvesting in the morning after dew dries and gently grading your produce helps preserve freshness and secures better wholesale prices.",
      actionItemRw:
        "Tegura neza aho ubihunika hubakiye ku buryo umwuka mwiza winjiramo.",
      rabAdvisoryCode: `RAB-PHV-${(daySeed % 60) + 25}`,
      acknowledged: false,
    },
  ];

  // Rotate tips dynamically based on the current day of the year
  return [0, 1, 2].map((offset) => {
    const item = tipPool[(daySeed + offset) % tipPool.length];
    return {
      ...item,
      id: `tip-${dateIso}-${offset + 1}`,
      date: dateIso,
      season: dynState.seasonLabelEn,
    };
  });
};

/**
 * Generates dynamically updated market prices for the current calendar day
 */
export const getDynamicMarketPricesForDate = (
  dateIso: string = new Date().toISOString().split("T")[0]
): MarketPrice[] => {
  const dt = new Date(`${dateIso}T00:00:00`);
  const daySeed = Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
  const wave = ((daySeed % 7) - 3) * 5; // Gentle daily market fluctuation (-15 to +15 RWF)

  return [
    {
      id: "mp-1",
      marketName: "Isoko rya Musanze (GOICO)",
      district: "Musanze",
      crop: "Ibirayi (Kinigi - Grade A)",
      priceMin: 310 + wave,
      priceMax: 360 + wave,
      priceAvg: 340 + wave,
      unit: "RWF/kg",
      trend: wave >= 0 ? "up" : "stable",
      lastUpdated: `${dateIso} (Uyu munsi / Today)`,
    },
    {
      id: "mp-2",
      marketName: "Isoko rya Kimironko (Kigali)",
      district: "Gasabo",
      crop: "Ibirayi (Kinigi)",
      priceMin: 360 + wave,
      priceMax: 410 + wave,
      priceAvg: 385 + wave,
      unit: "RWF/kg",
      trend: "up",
      lastUpdated: `${dateIso} (Uyu munsi / Today)`,
    },
    {
      id: "mp-3",
      marketName: "Isoko rya Nyagatare",
      district: "Nyagatare",
      crop: "Ibigori (Dry Grain)",
      priceMin: 260 + wave,
      priceMax: 300 + wave,
      priceAvg: 280 + wave,
      unit: "RWF/kg",
      trend: "stable",
      lastUpdated: `${dateIso} (Uyu munsi / Today)`,
    },
    {
      id: "mp-4",
      marketName: "Isoko rya Huye",
      district: "Huye",
      crop: "Ibishyimbo (MAC 44 / RWR 2245)",
      priceMin: 680 + wave,
      priceMax: 760 + wave,
      priceAvg: 720 + wave,
      unit: "RWF/kg",
      trend: wave >= 0 ? "up" : "stable",
      lastUpdated: `${dateIso} (Uyu munsi / Today)`,
    },
    {
      id: "mp-5",
      marketName: "Isoko rya Kayonza",
      district: "Kayonza",
      crop: "Soya (Cleaned Seed)",
      priceMin: 620 + wave,
      priceMax: 690 + wave,
      priceAvg: 650 + wave,
      unit: "RWF/kg",
      trend: "up",
      lastUpdated: `${dateIso} (Uyu munsi / Today)`,
    },
    {
      id: "mp-6",
      marketName: "Isoko rya Rubavu",
      district: "Rubavu",
      crop: "Inyanya (Anna F1)",
      priceMin: 450 + wave,
      priceMax: 550 + wave,
      priceAvg: 500 + wave,
      unit: "RWF/kg",
      trend: "stable",
      lastUpdated: `${dateIso} (Uyu munsi / Today)`,
    },
  ];
};

/**
 * Generates dynamically updated district weather snapshots for the current calendar day
 */
export const getDynamicWeatherForecastsForDate = (
  dateIso: string = new Date().toISOString().split("T")[0]
): WeatherForecast[] => {
  const dt = new Date(`${dateIso}T00:00:00`);
  const daySeed = Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
  const tempShift = (daySeed % 3) - 1; // -1, 0, +1 °C daily variation
  const rainShift = ((daySeed % 4) - 1) * 2;

  return [
    {
      district: "Musanze",
      province: "Amajyaruguru",
      tempC: 19 + tempShift,
      conditionRw: "Imvura yoroheje n'ikirere gihehereye cyo mu Birunga",
      conditionEn: "Gentle highland showers & refreshing mountain mist",
      conditionFr: "Averses douces et brume fraîche de montagne",
      rainfallMm: Math.max(2, 12 + rainShift),
      humidity: 80 + tempShift * 2,
      agriAdvisoryRw:
        "Muhinzi mwiza, ikirere cya none kirafasha imbuto kumera neza. Turabugira inama yo gutera imiti y'ubwirinzi mu masaha ya mu gitondo imvura itaragwa.",
      agriAdvisoryEn:
        "Dear farmer, today's highland moisture supports healthy root establishment. We kindly suggest scheduling any foliar care during dry morning hours.",
      agriAdvisoryFr:
        "Cher agriculteur, l'humidité d'aujourd'hui favorise l'enracinement. Planifiez les soins foliaires le matin au sec.",
    },
    {
      district: "Nyagatare",
      province: "Iburasirazuba",
      tempC: 27 + tempShift,
      conditionRw: "Akazuba keza n'umuyaga woroheje",
      conditionEn: "Warm sunshine & gentle savanna breeze",
      conditionFr: "Soleil doux et brise légère de savane",
      rainfallMm: Math.max(0, 3 + rainShift),
      humidity: 58 - tempShift * 2,
      agriAdvisoryRw:
        "Turabugira inama yo gusasira imirima y'ibigori na soya no kuhira mu gitondo kare kugira ngo ubuhehere bugume mu mizi.",
      agriAdvisoryEn:
        "We kindly recommend mulching maize and soybean rows and watering early in the morning to preserve root-zone moisture.",
      agriAdvisoryFr:
        "Nous vous conseillons de pailler les rangs de maïs et d'arroser tôt le matin pour conserver l'humidité.",
    },
    {
      district: "Huye",
      province: "Amajyepfo",
      tempC: 22 + tempShift,
      conditionRw: "Ikirere kiringaniye n'ibicu bitanga ubuhehere",
      conditionEn: "Balanced plateau sunshine & mild clouds",
      conditionFr: "Temps équilibré sur le plateau avec nuages doux",
      rainfallMm: Math.max(1, 6 + rainShift),
      humidity: 72 + tempShift,
      agriAdvisoryRw:
        "Igihe cyiza cyo gukurikirana imirima, kubagara witonze, no gushyiramo ifumbire y'imborera.",
      agriAdvisoryEn:
        "A wonderful window for gentle weeding, canopy care, and incorporating organic compost.",
      agriAdvisoryFr:
        "Une excellente période pour le désherbage doux et l'apport de compost organique.",
    },
  ];
};
