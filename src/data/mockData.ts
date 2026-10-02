import {
  AgronomyGuide,
  AuditLogEntry,
  Cooperative,
  CropDiagnosis,
  CultivationCycleStage,
  DailyAgronomyTip,
  Expense,
  Farm,
  FarmActivity,
  FarmAsset,
  FarmPlan,
  FertilizerApplicationLog,
  HarvestRecord,
  HiredLabor,
  LocationSuitability,
  MarketPrice,
  ParcelSoilSensorReading,
  SaleRecord,
  Season,
  TeamMember,
  TrainingCourse,
  TransportLog,
  User,
  WeatherForecast,
} from "../types";
import {
  getDynamicDailyTipsForDate,
  getDynamicMarketPricesForDate,
  getDynamicWeatherForecastsForDate,
} from "../utils/dynamicDayEngine";

// Clean Slate: All sample farms, plans, expenses, harvests, sales, diagnoses, and test users are empty ([]).
// Farmers and administrators start fresh from scratch.

export const initialUsers: User[] = [];

export const initialTeamMembers: TeamMember[] = [];

export const initialFarms: Farm[] = [];

export const initialPlans: FarmPlan[] = [];

export const initialExpenses: Expense[] = [];

export const initialActivities: FarmActivity[] = [];

export const initialHarvests: HarvestRecord[] = [];

export const initialSales: SaleRecord[] = [];

export const initialDiagnoses: CropDiagnosis[] = [];

export const initialCropDiagnoses: CropDiagnosis[] = [];

export const initialHiredLabor: HiredLabor[] = [];

export const initialTransportLogs: TransportLog[] = [];

export const initialFertilizerApplications: FertilizerApplicationLog[] = [];

export const initialFertilizerApplicationLogs: FertilizerApplicationLog[] = [];

export const initialSoilSensorReadings: ParcelSoilSensorReading[] = [];

export const initialFarmAssets: FarmAsset[] = [];

export const initialCooperatives: Cooperative[] = [];

export const initialAuditLogs: AuditLogEntry[] = [];

// Dynamically generated daily tips, market prices, and district weather snapshots for the current calendar day
export const initialDailyTips: DailyAgronomyTip[] = getDynamicDailyTipsForDate();

export const initialDailyAdvice: DailyAgronomyTip[] = initialDailyTips;

export const initialMarketPrices: MarketPrice[] = getDynamicMarketPricesForDate();

export const marketPrices: MarketPrice[] = initialMarketPrices;

export const weatherForecasts: WeatherForecast[] = getDynamicWeatherForecastsForDate();

export const seasons: Season[] = [
  {
    id: "season-2026a",
    name: "Igihembwe cy'Ihinga A (Nzeri - Gashyantare)",
    code: "2026A",
    description: "Igihembwe cy'ihinga ry'umuhindo (Season A)",
    startDate: "2025-09-01",
    endDate: "2026-02-28",
    isActive: true,
  },
  {
    id: "season-2026b",
    name: "Igihembwe cy'Ihinga B (Werurwe - Kamena)",
    code: "2026B",
    description: "Igihembwe cy'ihinga ry'itumba (Season B)",
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    isActive: false,
  },
  {
    id: "season-2026c",
    name: "Igihembwe cy'Ihinga C (Nyakanga - Kanama)",
    code: "2026C",
    description: "Igihembwe cy'ibishanga no kuhira (Season C)",
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    isActive: false,
  },
];

export const cultivationCycleStages: CultivationCycleStage[] = [
  {
    stageNumber: 1,
    nameRw: "Gutegura Ubutaka & Ifumbire y'Imborera",
    nameEn: "Land Preparation & Organic Basal Composting",
    nameFr: "Préparation du sol et fumure organique",
    periodWeeks: "Icyumweru 1 - 2",
    tasks: [
      "Guhinga bwa mbere no gusibura imirwanyasuri",
      "Gushyiramo ifumbire y'imborera iboze neza (10-15 T/Ha)",
    ],
    keyInputs: ["Ifumbire y'imborera", "Ishwagara y'ubuhinzi (niba pH < 5.5)"],
    rabAdvice: "Tegura umurima iminsi 14 mbere yo gutera kugira ngo ifumbire yivange neza n'igitaka.",
    status: "current",
  },
  {
    stageNumber: 2,
    nameRw: "Gutera Imbuto z'Indobanure & NPK",
    nameEn: "Certified Seed Planting & Basal NPK Placement",
    nameFr: "Semis certifié et engrais de fond",
    periodWeeks: "Icyumweru 3 - 4",
    tasks: [
      "Gutera imbuto zemejwe na RAB ku ntera ikwiye",
      "Gushyiramo ifumbire ya NPK 17-17-17 cyangwa DAP",
    ],
    keyInputs: ["Imbuto y'indobanure ya RAB", "NPK 17-17-17 / DAP"],
    rabAdvice: "Tera mu gihe ubutaka bufite ubuhehere buhagije bwa cm 15 z'ubujyakuzimu.",
    status: "upcoming",
  },
  {
    stageNumber: 3,
    nameRw: "Kubagara, Kurunda Igitaka & Kurinda Ibihingwa",
    nameEn: "Weeding, Earthing-Up & Organic IPM Care",
    nameFr: "Sarclage, buttage et protection biologique",
    periodWeeks: "Icyumweru 5 - 10",
    tasks: [
      "Kubagara no kurunda igitaka ku ngeri (buttage)",
      "Gukurikirana amababi buri gitondo no gukoresha uburyo kamere bwo kwirinda indwara",
    ],
    keyInputs: ["Urea 46% N (Top-dressing)", "Umuti w'umwimerere (Neem / Garlic)"],
    rabAdvice: "Sura umurima kabiri mu cyumweru mu masaha ya mu gitondo.",
    status: "upcoming",
  },
  {
    stageNumber: 4,
    nameRw: "Gusarura, Kurobanura & Guhunika Neza",
    nameEn: "Harvesting, Grading & Post-Harvest Storage",
    nameFr: "Récolte, triage et stockage",
    periodWeeks: "Icyumweru 11 - 15",
    tasks: [
      "Gusarura ku munsi utagira imvura",
      "Kurobanura umusaruro mu byiciro (Grade A, B, C) no kuwubika ahantu humutse",
    ],
    keyInputs: ["Amakaziye asukuye", "Imifuka ya PICS / Hermetic bags"],
    rabAdvice: "Anika ibinyampeke kugeza ku buhehere buri munsi ya 13.5% mbere yo kubika.",
    status: "upcoming",
  },
];

// Educational RAB Agronomy Reference Guides
export const agronomyGuides: AgronomyGuide[] = [
  {
    id: "guide-potato",
    cropKey: "ibirayi",
    nameRw: "Ibirayi (Kinigi, Kirundo, Ndamira)",
    nameEn: "Irish Potatoes (Highland Varieties)",
    nameFr: "Pommes de terre (Variétés de montagne)",
    bestVarieties: ["Kinigi", "Kirundo", "Ndamira", "Kazeneza"],
    soilRequirements:
      "Ubutaka bw'amakoro cyangwa imborera buhitisha amazi neza (pH 5.5 - 6.5)",
    fertilizerGuide:
      "Toni 10–15/ha z'ifumbire y'imborera + 300 kg/ha NPK 17-17-17 mu gutera",
    spacing: "75 cm hagati y'imirongo × 30 cm hagati y'imbuto",
    maturityDays: 110,
    averageYieldTonsHa: 20,
    diseasesAndPests: [
      {
        name: "Urume rw'Ibirayi (Late Blight)",
        symptoms: "Amabara y'umukara ku mababi n'urume rwera munsi y'ikibabi",
        treatment:
          "Gutera imbuto zihanganira urume, gusimburanya ibihingwa, n'umuti w'umwimerere wa tungurusumu na Aloe",
      },
    ],
    rabAdvice:
      "Koresha imbuto z'indobanure kandi urunde igitaka ku ngeri (buttage) ku minsi 30 na 45.",
  },
  {
    id: "guide-maize",
    cropKey: "ibigori",
    nameRw: "Ibigori (RHM 1407, RHM 104, WH 505)",
    nameEn: "Maize (Highland & Lowland Hybrids)",
    nameFr: "Maïs (Hybrides certifiés RAB)",
    bestVarieties: ["RHM 1407", "RHM 104", "WH 505", "PAN 53"],
    soilRequirements: "Ubutaka bwose buhitisha amazi neza (pH 5.8 - 7.0)",
    fertilizerGuide:
      "100 kg/ha DAP mu gutera + 50 kg/ha Urea ku minsi 30 nyuma yo kumera",
    spacing: "75 cm hagati y'imirongo × 25 cm hagati y'ibigori",
    maturityDays: 125,
    averageYieldTonsHa: 5.5,
    diseasesAndPests: [
      {
        name: "Nkongwa Ibyasi (Fall Armyworm)",
        symptoms: "Imyenge ku mababi mashya n'umwanda mu mutima w'ikigori",
        treatment:
          "Uburyo bwa Push-Pull (Desmodium) no gushyira ivu ry'inkwi rivanze na Neem mu mutima w'ikigori",
      },
    ],
    rabAdvice:
      "Tera kare imvura ya mbere ikigwa kandi wanike umusaruro kugeza ku buhehere bwa 13.5%.",
  },
  {
    id: "guide-beans",
    cropKey: "ibishyimbo",
    nameRw: "Ibishyimbo (MAC 44, RWR 2245)",
    nameEn: "Climbing & Bio-Fortified Bush Beans",
    nameFr: "Haricots volubiles et nains",
    bestVarieties: ["MAC 44", "RWV 1129", "RWR 2245"],
    soilRequirements: "Ubutaka buringaniye budafite amazi areka (pH 5.8 - 6.8)",
    fertilizerGuide: "Toni 5–8/ha z'ifumbire y'imborera + 100 kg/ha DAP",
    spacing: "50 cm × 20 cm (imishingiriro) cyangwa 40 cm × 10 cm (ibigufi)",
    maturityDays: 90,
    averageYieldTonsHa: 3.2,
    diseasesAndPests: [
      {
        name: "Urubobi rw'Ibishyimbo (Anthracnose)",
        symptoms: "Utuziga twirabura ku misogwe n'imitsi y'amababi",
        treatment:
          "Gutoranya imbuto zisukuye, gushingirira hakiri kare, no kwirinda kugenda mu murima utose",
      },
    ],
    rabAdvice:
      "Shingirira ibishyimbo by'imishingiriro bikimara kugira santimetero 25.",
  },
];

export const initialTrainingCourses: TrainingCourse[] = [
  {
    id: "course-1",
    title: "Uburyo Bunoze bwo Guhinga Ibirayi n'Imbuto z'Indobanure",
    subtitle: "RAB Highland Potato Agronomy Guide",
    category: "potato",
    type: "course",
    durationMinutes: 25,
    thumbnailUrl: "/src/assets/images/potato_late_blight_1790945783792.jpg",
    description:
      " amabwiriza yo gutegura umurima, intera ya 75x30cm, no kurinda urume rw'ibirayi mu buryo bw'umwimerere.",
    instructor: "RAB Extension Services",
    rabCertified: true,
  },
  {
    id: "course-2",
    title: "Kurwanya Nkongwa Ibyasi mu Bigori hakoreshejwe Uburyo Kamere",
    subtitle: "Integrated & Organic Fall Armyworm Control",
    category: "maize",
    type: "course",
    durationMinutes: 20,
    thumbnailUrl: "/src/assets/images/maize_fall_armyworm_1790945797849.jpg",
    description:
      "Uko wakoresha Push-Pull, ivu ry'inkwi, n'imbuto za Neem mu kurinda ibigori nta burozi.",
    instructor: "RAB IPM Team",
    rabCertified: true,
  },
];

// Reference Agro-Ecological Suitability Engine Data for Rwandan Districts
export const initialLocationSuitabilities: Record<string, LocationSuitability> = {
  Musanze: {
    latitude: -1.5002,
    longitude: 29.6338,
    district: "Musanze",
    sector: "Kinigi",
    agroZone: "Ikirunga & Imisozi Miremire (Volcanic Highlands)",
    altitudeMeters: 2250,
    soilType: "Ubutaka bw'amakoro y'ibirunga (Andosols / Volcanic)",
    soilPh: 5.8,
    annualRainfallMm: 1450,
    suitabilityScore: 95,
    recommendedCrops: [
      {
        cropRw: "Ibirayi (Kinigi, Victoria)",
        cropEn: "Irish Potatoes (Kinigi)",
        suitability: "Optimal",
        expectedYieldTonsHa: 22,
        notesRw: "Ubutaka buhehereye cyane butanga umusaruro mwiza.",
      },
      {
        cropRw: "Ibisheke by'imiti (Pyrethrum)",
        cropEn: "Pyrethrum Flowers",
        suitability: "Optimal",
        expectedYieldTonsHa: 1.8,
        notesRw: "Ubushyuhe bwo hasi n'ubutumburuke bwo hejuru bifasha iki gihingwa.",
      },
      {
        cropRw: "Ibigori bya Hybrid (H628)",
        cropEn: "Highland Maize",
        suitability: "Moderate",
        expectedYieldTonsHa: 5.2,
        notesRw: "Bifata igihe kiringaniye kwera kubera ikirere gikonje.",
      },
    ],
    soilRisks: [
      "Isuri y'amazi atemba mu gihe cy'imvura nyinshi",
      "Kurenda kw'amazi mu binogo mu gihe imigende idasibuye",
    ],
    conservationTechniques: [
      "Gucukura imirwanyasuri ihanamye (Radical Terraces)",
      "Gutera ibyatsi bifata ubutaka (Vetiver / Pennisetum) ku nkengero z'umurima",
      "Gusasira ibishogoshogo mu murima (Mulching)",
    ],
  },
  Nyagatare: {
    latitude: -1.2974,
    longitude: 30.3253,
    district: "Nyagatare",
    sector: "Mimuri",
    agroZone: "Ikibaya cy'Uburasirazuba (Eastern Savannah Lowlands)",
    altitudeMeters: 1380,
    soilType: "Ubutaka bw'imborera n'umusenyi woroheje (Ferralsols)",
    soilPh: 6.4,
    annualRainfallMm: 850,
    suitabilityScore: 88,
    recommendedCrops: [
      {
        cropRw: "Ibigori (H628, PAN 53)",
        cropEn: "Maize (Savannah Hybrids)",
        suitability: "Optimal",
        expectedYieldTonsHa: 6.0,
        notesRw: "Izuba rihagije ryihutisha ikura ry'ibigori.",
      },
      {
        cropRw: "Ibishyimbo bitukura (RWR 2245)",
        cropEn: "Bush Beans",
        suitability: "Optimal",
        expectedYieldTonsHa: 2.8,
        notesRw: "Bihanganira izuba kandi bifata azote mu kirere.",
      },
      {
        cropRw: "Soya & Ubunyobwa",
        cropEn: "Soybeans & Groundnuts",
        suitability: "Optimal",
        expectedYieldTonsHa: 2.5,
        notesRw: "Bikenera amazi aringaniye kandi bigira isoko ryiza.",
      },
    ],
    soilRisks: [
      "Izuba ryinshi mu bihe by'icyi",
      "Kuma k'ubutaka bwo hejuru mu gihe hatasasiwe",
    ],
    conservationTechniques: [
      "Gufata amazi y'imvura mu bigega n'ibidendezi",
      "Kuhira ku bitonyanga (Drip irrigation) mu masaha ya mu gitondo",
      "Gusasira umurima kugira ngo ubuhehere butagabanuka",
    ],
  },
  Huye: {
    latitude: -2.6074,
    longitude: 29.7394,
    district: "Huye",
    sector: "Tumba",
    agroZone: "Imisozi y'Amajyepfo (Southern Plateau)",
    altitudeMeters: 1750,
    soilType: "Ubutaka butukura bufite aside yoroheje (Acrisols)",
    soilPh: 5.2,
    annualRainfallMm: 1200,
    suitabilityScore: 86,
    recommendedCrops: [
      {
        cropRw: "Ikawa y'Umwimerere (Arabica Coffee)",
        cropEn: "Specialty Arabica Coffee",
        suitability: "Optimal",
        expectedYieldTonsHa: 2.4,
        notesRw: "Ikura neza mu misozi y'amajyepfo.",
      },
      {
        cropRw: "Ibishyimbo by'Imishingiriro (MAC 44)",
        cropEn: "Climbing Beans",
        suitability: "Optimal",
        expectedYieldTonsHa: 3.5,
        notesRw: "Gushingirira bifasha kubona umusaruro mwiza ku buso buto.",
      },
      {
        cropRw: "Inyanya z'umwuga (Anna F1)",
        cropEn: "Greenhouse / Staked Tomatoes",
        suitability: "Optimal",
        expectedYieldTonsHa: 38,
        notesRw: "Zikura neza kandi zifite isoko ryiza.",
      },
    ],
    soilRisks: [
      "Aside y'ubutaka ishobora kwiyongera (Soil pH < 5.5)",
      "Kugabanuka kw'ifumbire y'imborera mu gihe hatongerwamo indi",
    ],
    conservationTechniques: [
      "Gufumbiza ifumbire y'imborera n'ishwagara y'ubuhinzi (Agricultural lime)",
      "Kubungabunga amaterasi y'indinganire ku misozi",
    ],
  },
};

export const rwandaDistricts: Record<string, string[]> = {
  Amajyaruguru: ["Musanze", "Burera", "Gicumbi", "Rulindo", "Gakenke"],
  Amajyepfo: [
    "Huye",
    "Nyanza",
    "Gisagara",
    "Nyaruguru",
    "Nyamagabe",
    "Ruhango",
    "Muhanga",
    "Kamonyi",
  ],
  Iburasirazuba: [
    "Nyagatare",
    "Gatsibo",
    "Kayonza",
    "Rwamagana",
    "Ngoma",
    "Kirehe",
    "Bugesera",
  ],
  Iburengerazuba: [
    "Rubavu",
    "Nyabihu",
    "Ngororero",
    "Rusizi",
    "Nyamasheke",
    "Karongi",
    "Rutsiro",
  ],
  "Umujyi wa Kigali": ["Gasabo", "Kicukiro", "Nyarugenge"],
};
