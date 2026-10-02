import React, { useMemo, useState } from "react";
import { Farm, Language, MarketPrice, WeatherForecast } from "../types";
import { initialFarms, marketPrices, weatherForecasts } from "../data/mockData";
import { getTranslation } from "../i18n";
import {
  CloudSun,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Droplets,
  Wind,
  Sparkles,
  Truck,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Compass,
  Sprout,
  CloudRain,
  Sun,
  RefreshCw,
  BarChart3,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface MarketWeatherViewProps {
  language: Language;
  marketPricesList?: MarketPrice[];
  farms?: Farm[];
  criticalHumidityThreshold?: number;
}

interface AgroZoneClimateProfile {
  district: string;
  province: string;
  agroZoneRw: string;
  agroZoneEn: string;
  agroZoneFr: string;
  altitudeMeters: number;
  soilTypeRw: string;
  soilTypeEn: string;
  signatureCrops: string[];
  dailyDeltas: {
    tempDelta: number;
    nightTempOffset: number;
    humidityDelta: number;
    rainfallMm: number;
    conditionRw: string;
    conditionEn: string;
    conditionFr: string;
    fieldActionRw: string;
    fieldActionEn: string;
  }[];
}

const AGRO_ZONE_PROFILES: Record<string, AgroZoneClimateProfile> = {
  Musanze: {
    district: "Musanze",
    province: "Amajyaruguru",
    agroZoneRw: "Imisozi y'Ibirunga (Birunga Volcanic Highlands)",
    agroZoneEn: "Birunga Volcanic Highlands Agro-Zone",
    agroZoneFr: "Zone Agro-Écologique des Hautes Terres Volcaniques",
    altitudeMeters: 2240,
    soilTypeRw: "Ubutaka bw'Amakoro (Volcanic Loam)",
    soilTypeEn: "Volcanic Andosol Loam (Rich Organic)",
    signatureCrops: ["Ibirayi (Kinigi)", "Ibigori byo mu Birunga", "Ibishyimbo (MAC 44)"],
    dailyDeltas: [
      {
        tempDelta: 0,
        nightTempOffset: -7,
        humidityDelta: 0,
        rainfallMm: 14,
        conditionRw: "Imvura y'akajagararo n'igicu cy'ubukonje",
        conditionEn: "Scattered showers & mountain mist",
        conditionFr: "Averses éparses et brume de montagne",
        fieldActionRw: "Irinde gutera umuti wa Mancozeb imvura ikiri hafi; genzura imiyoboro y'amazi.",
        fieldActionEn: "Hold fungicide spraying during active rain; inspect terrace drainage channels.",
      },
      {
        tempDelta: -1,
        nightTempOffset: -8,
        humidityDelta: 5,
        rainfallMm: 18,
        conditionRw: "Imvura nyinshi n'ubuhehere bwo hejuru",
        conditionEn: "Heavy highland rain & high humidity",
        conditionFr: "Fortes pluies et humidité élevée",
        fieldActionRw: "Ubuhehere buri kuri 87%: Genzura ibimenyetso by'Urume (Late Blight) munsi y'amababi y'ibirayi.",
        fieldActionEn: "Humidity at 87%: Scout lower potato canopy for Late Blight (Phytophthora) lesions.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -6,
        humidityDelta: -6,
        rainfallMm: 4,
        conditionRw: "Izuba ry'agasusuruko n'ibicu byoroheje",
        conditionEn: "Morning sunbreaks & mild clouds",
        conditionFr: "Éclaircies matinales et nuages doux",
        fieldActionRw: "Igihe cyiza cyo gutera Ridomil Gold / Mancozeb mu gitondo kare (06:30–09:30).",
        fieldActionEn: "Optimal morning window (06:30–09:30) for preventive Late Blight fungicide spray.",
      },
      {
        tempDelta: 3,
        nightTempOffset: -6,
        humidityDelta: -9,
        rainfallMm: 2,
        conditionRw: "Izuba riringaniye n'umuyaga wo mu misozi",
        conditionEn: "Pleasant highland sun & light breeze",
        conditionFr: "Soleil doux de montagne et brise légère",
        fieldActionRw: "Igihe cyiza cyo kubagara no gusasira ibirayi (Earthing-up / Buttage) ubutaka butarongerwa n'amazi.",
        fieldActionEn: "Ideal dry-foliage day for potato earthing-up (buttage) and NPK side-dressing.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -7,
        humidityDelta: -2,
        rainfallMm: 9,
        conditionRw: "Imvura ya nimugoroba mu Birunga",
        conditionEn: "Afternoon volcanic showers",
        conditionFr: "Averses volcaniques l'après-midi",
        fieldActionRw: "Shyiramo ifumbire ya Urea mu gitondo kugira ngo imvura ya nimugoroba iyicengeze mu mizi.",
        fieldActionEn: "Apply top-dress fertilizer in the morning so afternoon rain dissolves nutrients into root zone.",
      },
      {
        tempDelta: -1,
        nightTempOffset: -8,
        humidityDelta: 4,
        rainfallMm: 16,
        conditionRw: "Igicu cy'ubukonje n'imvura ihoraho",
        conditionEn: "Cool mountain fog & steady rain",
        conditionFr: "Brouillard frais et pluie continue",
        fieldActionRw: "Sibura imigende y'amaterasi kugira ngo amazi atareka mu mirongo y'ibirayi.",
        fieldActionEn: "Clear radical terrace furrows to prevent waterlogging around developing tubers.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -7,
        humidityDelta: -4,
        rainfallMm: 6,
        conditionRw: "Ibicu biringaniye n'akazuba",
        conditionEn: "Partly cloudy with sunny intervals",
        conditionFr: "Partiellement nuageux avec éclaircies",
        fieldActionRw: "Genzura ubukomere bw'uruhu rw'ibirayi (Skin-set check) ku mirima yitegura isarura.",
        fieldActionEn: "Perform pre-harvest tuber skin-set and dry matter inspection on maturing plots.",
      },
    ],
  },
  Nyagatare: {
    district: "Nyagatare",
    province: "Iburasirazuba",
    agroZoneRw: "Ibibaya n'Imisozi Migufi by'Uburasirazuba (Eastern Savanna & Plains)",
    agroZoneEn: "Eastern Savanna & Lowland Plains Agro-Zone",
    agroZoneFr: "Zone Agro-Écologique de la Savane Orientale",
    altitudeMeters: 1380,
    soilTypeRw: "Umusenyi n'Urusyo (Sandy Clay Loam)",
    soilTypeEn: "Savanna Sandy-Clay Loam",
    signatureCrops: ["Ibigori (Hybrid H628)", "Ibishyimbo (RWR 2245)", "Soya & Inyanya"],
    dailyDeltas: [
      {
        tempDelta: 0,
        nightTempOffset: -9,
        humidityDelta: 0,
        rainfallMm: 2,
        conditionRw: "Izuba n'umuyaga woroheje w'Uburasirazuba",
        conditionEn: "Sunny & dry savannah breezes",
        conditionFr: "Ensoleillé et brises sèches de savane",
        fieldActionRw: "Ubuhehere buri munsi ya 60% (58%): Kuhira imirima y'ibigori mu gitondo kare.",
        fieldActionEn: "Humidity below 60% threshold (58%): Run early morning drip/furrow irrigation on maize.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -8,
        humidityDelta: -7,
        rainfallMm: 0,
        conditionRw: "Izuba ryinshi n'umwuka wumye cyane",
        conditionEn: "Hot sunshine & dry continental air",
        conditionFr: "Fort ensoleillement et air sec",
        fieldActionRw: "IMPURUZA Y'UBUHEHERE (51% RH): Ongera amazi yo kuhira (+20% L/ha) kandi usasire ubutaka (Mulching).",
        fieldActionEn: "CRITICAL LOW HUMIDITY (51% RH): Increase irrigation volume (+20% L/ha) and apply grass mulch.",
      },
      {
        tempDelta: 3,
        nightTempOffset: -8,
        humidityDelta: -10,
        rainfallMm: 0,
        conditionRw: "Ubushyuhe bwo hejuru (30°C) nta mvura",
        conditionEn: "Peak savanna heat (30°C) & arid breeze",
        conditionFr: "Pic de chaleur de savane (30°C) sans pluie",
        fieldActionRw: "IMPURUZA IKOMEYE (48% RH): Kuhira saa 06:00–08:30 na 17:00–18:30 kugira ngo indabyo z'ibigori zituma.",
        fieldActionEn: "SEVERE DRY AIR (48% RH): Split irrigation between 06:00–08:30 and 17:00–18:30 to protect maize silking.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -9,
        humidityDelta: -4,
        rainfallMm: 1,
        conditionRw: "Izuba n'ibicu bike nimugoroba",
        conditionEn: "Mostly sunny with late clouds",
        conditionFr: "Ensoleillé avec quelques nuages tardifs",
        fieldActionRw: "Genzura imitego ya Nkongwa (Fall Armyworm) kuko ubushyuhe bwihutisha kororoka kwayo.",
        fieldActionEn: "Inspect Fall Armyworm pheromone traps; warm dry spells accelerate larval feeding.",
      },
      {
        tempDelta: -2,
        nightTempOffset: -8,
        humidityDelta: 8,
        rainfallMm: 11,
        conditionRw: "Imvura y'agasusuruko izana ubuhehere",
        conditionEn: "Refreshing convective rain showers",
        conditionFr: "Averses convectives rafraîchissantes",
        fieldActionRw: "Ubuhehere burazamuka (66% RH): Igihe cyiza cyo gushyiramo Urea ku bigori bikura.",
        fieldActionEn: "Humidity recovers (66% RH): Ideal soil moisture window for Urea nitrogen side-dressing.",
      },
      {
        tempDelta: -1,
        nightTempOffset: -9,
        humidityDelta: 5,
        rainfallMm: 6,
        conditionRw: "Ibicu biringaniye n'umuyaga uhehereye",
        conditionEn: "Partly cloudy & humid breeze",
        conditionFr: "Partiellement nuageux et brise humide",
        fieldActionRw: "Komeza kubika amazi mu mpande z'imirongo (Water harvesting basins) mu murima.",
        fieldActionEn: "Maintain tied ridges and furrow basins to retain rainwater in sandy loam soil.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -9,
        humidityDelta: -3,
        rainfallMm: 1,
        conditionRw: "Izuba riringaniye mu Burasirazuba",
        conditionEn: "Warm savanna sun returns",
        conditionFr: "Retour du soleil chaud de savane",
        fieldActionRw: "Ubuhehere busubiye kuri 55% RH: Tegura gahunda yo kuhira ku cyumweru gitaha.",
        fieldActionEn: "Humidity dips back to 55% RH: Schedule next solar pump irrigation cycle.",
      },
    ],
  },
  Huye: {
    district: "Huye",
    province: "Amajyepfo",
    agroZoneRw: "Imisozi yo Hagati n'Ibibaya (Southern Central Plateau)",
    agroZoneEn: "Southern Central Plateau & Valley Marshlands",
    agroZoneFr: "Plateau Central du Sud et Marais",
    altitudeMeters: 1720,
    soilTypeRw: "Urwondo rw'Igishanga n'Ubutaka bw'Umusozi (Valley Clay & Humic Loam)",
    soilTypeEn: "Humic Ferralsol & Valley Marsh Clay",
    signatureCrops: ["Inyanya (Anna F1)", "Ibishyimbo (RWR 2245)", "Ikawa & Imboga"],
    dailyDeltas: [
      {
        tempDelta: 0,
        nightTempOffset: -7,
        humidityDelta: 0,
        rainfallMm: 6,
        conditionRw: "Ibicu byinshi n'umuyaga ukonje",
        conditionEn: "Partly cloudy & moderate plateau breeze",
        conditionFr: "Partiellement nuageux et brise fraîche",
        fieldActionRw: "Igihe cyiza cyo kubagara no gushyiramo ifumbire y'imborera mu bishyimbo n'inyanya.",
        fieldActionEn: "Optimal period for weeding and applying organic compost on beans and staked tomatoes.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -7,
        humidityDelta: -4,
        rainfallMm: 3,
        conditionRw: "Akazuba keza mu kibaya cya Huye",
        conditionEn: "Mild sunshine across central plateau",
        conditionFr: "Soleil doux sur le plateau central",
        fieldActionRw: "Gushingirira inyanya za Anna F1 no gukuraho amashami y'indurwe (Pruning).",
        fieldActionEn: "Trellis and prune Anna F1 tomato suckers while foliage is dry to prevent bacterial spread.",
      },
      {
        tempDelta: 3,
        nightTempOffset: -6,
        humidityDelta: -16,
        rainfallMm: 0,
        conditionRw: "Izuba ryinshi n'umuyaga wumutsa ubutaka",
        conditionEn: "Warm dry plateau wind",
        conditionFr: "Vent chaud et sec sur le plateau",
        fieldActionRw: "IMPURUZA Y'UBUHEHERE (58% RH): Kuhira inyanya ku mizi (Drip) kugira ngo wirinde Blossom End Rot.",
        fieldActionEn: "LOW HUMIDITY ALERT (58% RH): Irrigate tomato root zones evenly to prevent Blossom End Rot.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -7,
        humidityDelta: -12,
        rainfallMm: 1,
        conditionRw: "Izuba n'ibicu bike",
        conditionEn: "Warm with scattered afternoon clouds",
        conditionFr: "Chaud avec nuages épars l'après-midi",
        fieldActionRw: "Tera ifumbire y'amazi irimo Calcium ku nyanya mu gitondo kare.",
        fieldActionEn: "Apply foliar Calcium-Boron feed to flowering tomatoes during cool morning hours.",
      },
      {
        tempDelta: -1,
        nightTempOffset: -7,
        humidityDelta: 4,
        rainfallMm: 12,
        conditionRw: "Imvura y'umugoroba mu Majyepfo",
        conditionEn: "Steady plateau showers",
        conditionFr: "Pluies régulières sur le plateau",
        fieldActionRw: "Genzura imigende ikamura amazi mu gishanga kugira ngo imizi y'inyanya itabora.",
        fieldActionEn: "Check marshland drainage ditches so valley tomato beds remain well-aerated.",
      },
      {
        tempDelta: -2,
        nightTempOffset: -8,
        humidityDelta: 7,
        rainfallMm: 15,
        conditionRw: "Imvura n'ubuhehere bwo hejuru (81%)",
        conditionEn: "Humid overcast & rain showers (81%)",
        conditionFr: "Couvert humide et averses (81%)",
        fieldActionRw: "Ubuhehere buri hejuru (81%): Rinda inyanya n'ibishyimbo indwara z'uduhumyo (Anthracnose & Early Blight).",
        fieldActionEn: "Elevated humidity (81%): Monitor bean pods for Anthracnose and tomato lower leaves for Early Blight.",
      },
      {
        tempDelta: 0,
        nightTempOffset: -7,
        humidityDelta: -2,
        rainfallMm: 5,
        conditionRw: "Ikirere kiringaniye n'akazuba",
        conditionEn: "Balanced plateau sun & clouds",
        conditionFr: "Équilibre soleil et nuages",
        fieldActionRw: "Gusoroma inyanya zeze mu gitondo kare no kuzipakira mu masanduku afite umwuka.",
        fieldActionEn: "Harvest breaker-stage tomatoes in the cool morning and pack in ventilated crates.",
      },
    ],
  },
  Rubavu: {
    district: "Rubavu",
    province: "Iburengerazuba",
    agroZoneRw: "Inkengero z'Ikiyaga cya Kivu (Lake Kivu Belt Agro-Zone)",
    agroZoneEn: "Lake Kivu Belt & Volcanic Foothills Agro-Zone",
    agroZoneFr: "Ceinture du Lac Kivu et Piémont Volcanique",
    altitudeMeters: 1560,
    soilTypeRw: "Ubutaka bw'Amakoro Buvanze n'Umusenyi (Alluvial Volcanic Loam)",
    soilTypeEn: "Alluvial Volcanic & Lacustrine Loam",
    signatureCrops: ["Inyanya", "Ikawa (Arabica)", "Ibishyimbo & Imboga"],
    dailyDeltas: [
      {
        tempDelta: 0,
        nightTempOffset: -6,
        humidityDelta: 2,
        rainfallMm: 11,
        conditionRw: "Umuyaga uhehereye uva mu kiyaga cya Kivu n'imvura",
        conditionEn: "Humid Lake Kivu breeze & convective showers",
        conditionFr: "Brise humide du lac Kivu et averses",
        fieldActionRw: "Genzura amababi yo hasi y'inyanya kugira ngo wirinde Early Blight.",
        fieldActionEn: "Inspect lower tomato foliage for Early Blight lesions after lake showers.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -6,
        humidityDelta: -3,
        rainfallMm: 5,
        conditionRw: "Akazuba k'agasusuruko n'ibicu baringaniye",
        conditionEn: "Warm morning sun & lake clouds",
        conditionFr: "Soleil matinal doux et nuages",
        fieldActionRw: "Igihe cyiza cyo kubagara imboga no gushyiramo ifumbire ya NPK.",
        fieldActionEn: "Favorable morning window for vegetable weeding and NPK top-dressing.",
      },
      {
        tempDelta: -1,
        nightTempOffset: -7,
        humidityDelta: 6,
        rainfallMm: 16,
        conditionRw: "Imvura nyinshi ya nimugoroba",
        conditionEn: "Heavy afternoon lake-effect rain",
        conditionFr: "Fortes averses l'après-midi",
        fieldActionRw: "Sibura imiferege ikamura amazi mu mirima y'imboga.",
        fieldActionEn: "Clear drainage furrows in vegetable beds to prevent root asphyxiation.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -6,
        humidityDelta: -5,
        rainfallMm: 2,
        conditionRw: "Izuba ryiza ku nkengero za Kivu",
        conditionEn: "Bright sunshine along Kivu shore",
        conditionFr: "Beau soleil sur les rives du Kivu",
        fieldActionRw: "Kwanika ikawa ku meza (raised drying tables) no gusoroma inyanya.",
        fieldActionEn: "Optimal low-rain day for parchment coffee drying and tomato harvest.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -6,
        humidityDelta: -2,
        rainfallMm: 7,
        conditionRw: "Ibicu n'imvura yoroheje",
        conditionEn: "Partly cloudy with light showers",
        conditionFr: "Partiellement nuageux avec averses",
        fieldActionRw: "Shingirira ibishyimbo n'inyanya kugira ngo umuyaga winjiremo.",
        fieldActionEn: "Stake climbing beans and trellis tomatoes to improve canopy airflow.",
      },
      {
        tempDelta: 0,
        nightTempOffset: -7,
        humidityDelta: 4,
        rainfallMm: 13,
        conditionRw: "Imvura ihoraho n'ubuhehere",
        conditionEn: "Steady lake showers & high humidity",
        conditionFr: "Pluies régulières et humidité",
        fieldActionRw: "Tera umuti w'uduhumyo mbere y'uko imvura ya nimugoroba igwa.",
        fieldActionEn: "Apply protective fungicide in early morning before afternoon rain.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -6,
        humidityDelta: -4,
        rainfallMm: 3,
        conditionRw: "Ikirere cyiza cyo gutwara umusaruro ku isoko",
        conditionEn: "Mild sun & clear market transport window",
        conditionFr: "Soleil doux et bon créneau de transport",
        fieldActionRw: "Tegura amasanduku y'inyanya n'imboga bijya ku isoko rya Rubavu na Kigali.",
        fieldActionEn: "Pack graded vegetables and tomatoes for Rubavu and Kigali markets.",
      },
    ],
  },
  Bugesera: {
    district: "Bugesera",
    province: "Iburasirazuba",
    agroZoneRw: "Ikibaya cya Bugesera & Mayaga (Bugesera Lowland Savanna)",
    agroZoneEn: "Bugesera & Mayaga Lowland Depression Agro-Zone",
    agroZoneFr: "Dépression de Bugesera et Savane de Mayaga",
    altitudeMeters: 1350,
    soilTypeRw: "Ubutaka bw'Umusenyi n'Inombe (Ferralsol Sandy Loam)",
    soilTypeEn: "Lowland Ferralsol Sandy-Clay Loam",
    signatureCrops: ["Imyumbati (NASE 14)", "Ibigori (WH 507)", "Ibishyimbo & Soya"],
    dailyDeltas: [
      {
        tempDelta: 1,
        nightTempOffset: -9,
        humidityDelta: -4,
        rainfallMm: 1,
        conditionRw: "Izuba ryinshi n'ubushyuhe mu kibaya cya Bugesera",
        conditionEn: "Warm lowland sun & dry breeze",
        conditionFr: "Soleil chaud et brise sèche",
        fieldActionRw: "Sasira imirima y'ibigori n'imyumbati kugira ngo ubuhehere bugume mu butaka.",
        fieldActionEn: "Mulch maize and cassava rows heavily to conserve topsoil moisture.",
      },
      {
        tempDelta: 3,
        nightTempOffset: -8,
        humidityDelta: -9,
        rainfallMm: 0,
        conditionRw: "Ubushyuhe bwinshi (30°C) n'umwuka wumye",
        conditionEn: "Hot dry spell (30°C) across Bugesera",
        conditionFr: "Forte chaleur sèche (30°C)",
        fieldActionRw: "Kuhira imboga n'ibigori mu gitondo kare (06:00–08:00).",
        fieldActionEn: "Irrigate horticulture and maize plots between 06:00 and 08:00.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -8,
        humidityDelta: -6,
        rainfallMm: 2,
        conditionRw: "Izuba n'ibicu bike nimugoroba",
        conditionEn: "Sunny with isolated late clouds",
        conditionFr: "Ensoleillé avec nuages isolés",
        fieldActionRw: "Genzura isazi z'umweru (Whiteflies) ku myumbati na Nkongwa ku bigori.",
        fieldActionEn: "Scout cassava for whitefly vectors and maize whorls for Fall Armyworm.",
      },
      {
        tempDelta: -2,
        nightTempOffset: -8,
        humidityDelta: 9,
        rainfallMm: 12,
        conditionRw: "Imvura y'itumba mu kibaya cya Bugesera",
        conditionEn: "Convective lowland rain shower",
        conditionFr: "Averse convective de plaine",
        fieldActionRw: "Igihe cyiza cyo gutera imbuto z'ibishyimbo (RWR 2245) no gushyiramo DAP.",
        fieldActionEn: "Prime moisture window for sowing RWR 2245 beans and basal DAP.",
      },
      {
        tempDelta: -1,
        nightTempOffset: -8,
        humidityDelta: 6,
        rainfallMm: 8,
        conditionRw: "Ibicu biringaniye n'imvura yoroheje",
        conditionEn: "Humid clouds & light rain",
        conditionFr: "Nuages humides et pluie fine",
        fieldActionRw: "Funga imirama (tied ridges) kugira ngo amazi y'imvura atembanwa.",
        fieldActionEn: "Reinforce tied ridges to trap rainwater in the root zone.",
      },
      {
        tempDelta: 1,
        nightTempOffset: -9,
        humidityDelta: -3,
        rainfallMm: 0,
        conditionRw: "Izuba riringaniye n'umuyaga",
        conditionEn: "Warm sun & clear skies",
        conditionFr: "Soleil chaud et ciel dégagé",
        fieldActionRw: "Kwanika umusaruro w'ibigori na soya ku mashitingi asukuye.",
        fieldActionEn: "Ideal dry day for post-harvest maize and soybean drying.",
      },
      {
        tempDelta: 2,
        nightTempOffset: -9,
        humidityDelta: -5,
        rainfallMm: 1,
        conditionRw: "Ubushyuhe buringaniye",
        conditionEn: "Warm lowland afternoon",
        conditionFr: "Après-midi chaud de plaine",
        fieldActionRw: "Tegura gahunda yo kuhira imirima y'imboga.",
        fieldActionEn: "Schedule next pump irrigation cycle for valley-edge plots.",
      },
    ],
  },
};

const DAY_NAMES_RW = ["Kwa Mbere", "Kwa Kabiri", "Kwa Gatatu", "Kwa Kane", "Kwa Gatanu", "Kuwa Gatandatu", "Ku Cyumweru"];
const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const MarketWeatherView: React.FC<MarketWeatherViewProps> = ({
  language,
  marketPricesList,
  farms = initialFarms,
  criticalHumidityThreshold = 60,
}) => {
  const t = getTranslation(language);
  const [selectedDistrict, setSelectedDistrict] = useState("Musanze");
  const [compareDistrict, setCompareDistrict] = useState<string>("Nyagatare");
  const [marketSearch, setMarketSearch] = useState("");
  const [chartMode, setChartMode] = useState<
    "precip_temp" | "precip_focus" | "temp_focus" | "district_compare" | "humidity"
  >("precip_temp");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [liveTelemetryByDistrict, setLiveTelemetryByDistrict] = useState<
    Record<
      string,
      {
        source: string;
        fetchedAt: string;
        days: {
          tempMax: number;
          tempMin: number;
          rainMm: number;
          rainChance: number;
          humidity: number;
        }[];
      }
    >
  >({});
  const [isSyncingLiveWeather, setIsSyncingLiveWeather] = useState(false);

  const activePrices = marketPricesList || marketPrices;

  // Merge all districts from weatherForecasts, AGRO_ZONE_PROFILES, and registered farms
  const availableDistricts = useMemo(() => {
    const baseMap = new Map<
      string,
      { district: string; province: string; tempC: number; rainfallMm: number; humidity: number }
    >();
    weatherForecasts.forEach((w) => {
      baseMap.set(w.district, {
        district: w.district,
        province: w.province,
        tempC: w.tempC,
        rainfallMm: w.rainfallMm,
        humidity: w.humidity,
      });
    });
    Object.values(AGRO_ZONE_PROFILES).forEach((prof) => {
      if (!baseMap.has(prof.district)) {
        baseMap.set(prof.district, {
          district: prof.district,
          province: prof.province,
          tempC: prof.altitudeMeters < 1500 ? 28 : 23,
          rainfallMm: prof.dailyDeltas[0]?.rainfallMm ?? 8,
          humidity: prof.altitudeMeters < 1500 ? 54 : 76,
        });
      }
    });
    farms.forEach((f) => {
      if (f.district && !baseMap.has(f.district)) {
        baseMap.set(f.district, {
          district: f.district,
          province: f.location || "Rwanda",
          tempC: f.altitude >= 2000 ? 19 : f.altitude < 1500 ? 27 : 22,
          rainfallMm: f.altitude >= 2000 ? 14 : f.altitude < 1500 ? 3 : 7,
          humidity: f.altitude >= 2000 ? 82 : f.altitude < 1500 ? 56 : 72,
        });
      }
    });
    return Array.from(baseMap.values());
  }, [farms]);

  const handleSyncLiveDistrictForecast = async () => {
    setIsSyncingLiveWeather(true);
    try {
      const profile =
        AGRO_ZONE_PROFILES[selectedDistrict] || AGRO_ZONE_PROFILES.Musanze;
      const matchingFarm = farms.find(
        (f) => f.district.toLowerCase() === selectedDistrict.toLowerCase()
      );
      const res = await fetch("/api/weather/agrozone-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district: selectedDistrict,
          agroZone: matchingFarm?.agroZone || profile.agroZoneEn,
          altitude: matchingFarm?.altitude || profile.altitudeMeters,
          latitude: matchingFarm?.latitude,
          longitude: matchingFarm?.longitude,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.forecastDays) && data.forecastDays.length >= 5) {
          setLiveTelemetryByDistrict((prev) => ({
            ...prev,
            [selectedDistrict]: {
              source:
                data.source ||
                `Live Open-Meteo + Meteo Rwanda (${selectedDistrict})`,
              fetchedAt: data.fetchedAt || new Date().toISOString(),
              days: data.forecastDays.map((d: any) => ({
                tempMax: d.tempMax,
                tempMin: d.tempMin,
                rainMm: d.rainMm,
                rainChance: d.rainChance ?? (d.rainMm >= 10 ? 80 : 35),
                humidity: d.humidity,
              })),
            },
          }));
        }
      }
    } catch (_err) {
      // Fallback handled deterministically
    } finally {
      setIsSyncingLiveWeather(false);
    }
  };

  const filteredPrices = activePrices.filter((p) => {
    if (!marketSearch.trim()) return true;
    const q = marketSearch.toLowerCase();
    return (
      p.crop.toLowerCase().includes(q) ||
      p.marketName.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q)
    );
  });

  const currentWeather = useMemo(() => {
    const found = weatherForecasts.find((w) => w.district === selectedDistrict);
    if (found) return found;
    const prof = AGRO_ZONE_PROFILES[selectedDistrict] || AGRO_ZONE_PROFILES.Musanze;
    return {
      district: selectedDistrict,
      province: prof.province,
      tempC: prof.altitudeMeters < 1500 ? 28 : 23,
      conditionRw: prof.dailyDeltas[0]?.conditionRw || weatherForecasts[0].conditionRw,
      conditionEn: prof.dailyDeltas[0]?.conditionEn || weatherForecasts[0].conditionEn,
      conditionFr: prof.dailyDeltas[0]?.conditionFr || weatherForecasts[0].conditionFr,
      rainfallMm: prof.dailyDeltas[0]?.rainfallMm ?? 8,
      humidity: prof.altitudeMeters < 1500 ? 54 : 76,
      agriAdvisoryRw: prof.dailyDeltas[0]?.fieldActionRw || weatherForecasts[0].agriAdvisoryRw,
      agriAdvisoryEn: prof.dailyDeltas[0]?.fieldActionEn || weatherForecasts[0].agriAdvisoryEn,
      agriAdvisoryFr: prof.dailyDeltas[0]?.conditionFr || weatherForecasts[0].agriAdvisoryFr,
    };
  }, [selectedDistrict]);

  const activeAgroProfile =
    AGRO_ZONE_PROFILES[selectedDistrict] || AGRO_ZONE_PROFILES.Musanze;

  const compareAgroProfile =
    AGRO_ZONE_PROFILES[compareDistrict] || AGRO_ZONE_PROFILES.Nyagatare;

  const compareBaseWeather =
    weatherForecasts.find((w) => w.district === compareDistrict) ||
    availableDistricts.find((d) => d.district === compareDistrict) ||
    weatherForecasts[1] ||
    weatherForecasts[0];

  // Match any farmer parcels located in the selected district
  const matchingFarms = useMemo(
    () => farms.filter((f) => f.district.toLowerCase() === selectedDistrict.toLowerCase()),
    [farms, selectedDistrict]
  );

  // Build 7-day agro-zone forecast dataset for Recharts (Precipitation + Temperature + Humidity + Comparison)
  const sevenDayForecast = useMemo(() => {
    const baseDate = new Date();
    const liveOverride = liveTelemetryByDistrict[selectedDistrict]?.days;
    let runningCumulativeRain = 0;

    return activeAgroProfile.dailyDeltas.map((delta, idx) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + idx);
      const jsDay = d.getDay(); // 0 = Sun .. 6 = Sat
      const isoIndex = jsDay === 0 ? 6 : jsDay - 1;

      const dayShortLabel =
        idx === 0
          ? language === "rw"
            ? "Uyu munsi"
            : language === "fr"
            ? "Auj."
            : "Today"
          : idx === 1
          ? language === "rw"
            ? "Ejo"
            : language === "fr"
            ? "Demain"
            : "Tomorrow"
          : language === "rw"
          ? DAY_NAMES_RW[isoIndex]
          : language === "fr"
          ? DAY_NAMES_FR[isoIndex]
          : DAY_NAMES_EN[isoIndex];

      const dateFormatted = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });

      const liveDay = liveOverride?.[idx];
      const tempMaxC =
        liveDay?.tempMax ??
        Math.round((currentWeather.tempC + delta.tempDelta) * 10) / 10;
      const tempMinC =
        liveDay?.tempMin ??
        Math.round((tempMaxC + delta.nightTempOffset) * 10) / 10;
      const tempAvgC = Math.round(((tempMaxC + tempMinC) / 2) * 10) / 10;
      const diurnalRangeC = Math.round((tempMaxC - tempMinC) * 10) / 10;
      const gddBase10 = Math.round(Math.max(0, tempAvgC - 10) * 10) / 10;

      const humidity =
        liveDay?.humidity ??
        Math.max(
          32,
          Math.min(96, Math.round(currentWeather.humidity + delta.humidityDelta))
        );
      const rainfallMm = liveDay?.rainMm ?? delta.rainfallMm;
      runningCumulativeRain =
        Math.round((runningCumulativeRain + rainfallMm) * 10) / 10;

      const rainChancePct =
        liveDay?.rainChance ??
        Math.min(
          96,
          Math.max(
            10,
            Math.round(
              rainfallMm >= 15
                ? 88
                : rainfallMm >= 8
                ? 72
                : rainfallMm >= 3
                ? 48
                : 18
            )
          )
        );

      // Calculate atmospheric Vapor Pressure Deficit (VPD kPa) & Evapotranspiration (ET0 mm/day)
      const es = 0.6108 * Math.exp((17.27 * tempMaxC) / (tempMaxC + 237.3));
      const vpdKpa = Math.max(0.2, Math.round(es * (1 - humidity / 100) * 100) / 100);
      const et0Mm =
        Math.round((2.1 + Math.max(0, tempMaxC - 16) * 0.22 + (100 - humidity) * 0.035) * 10) / 10;
      const netWaterBalanceMm = Math.round((rainfallMm - et0Mm) * 10) / 10;

      // Comparison district projection for day idx
      const compDelta =
        compareAgroProfile.dailyDeltas[idx] || compareAgroProfile.dailyDeltas[0];
      const compareTempMaxC =
        Math.round(((compareBaseWeather?.tempC || 25) + compDelta.tempDelta) * 10) / 10;
      const compareRainfallMm = compDelta.rainfallMm;

      const isLowHumidity = humidity < criticalHumidityThreshold;
      const isFungalRisk = humidity >= 82 && rainfallMm >= 10;
      const isHeavyRain = rainfallMm >= 14;
      const isHeatStress = tempMaxC >= 28;

      return {
        dayIndex: idx,
        dayLabel: `${dayShortLabel} (${dateFormatted})`,
        shortAxisLabel: idx === 0 ? `${dayShortLabel}` : `${dayShortLabel.slice(0, 6)} ${d.getDate()}`,
        dateFormatted,
        tempMaxC,
        tempMinC,
        tempAvgC,
        diurnalRangeC,
        gddBase10,
        humidity,
        criticalThreshold: criticalHumidityThreshold,
        rainfallMm,
        cumulativeRainMm: runningCumulativeRain,
        rainChancePct,
        vpdKpa,
        et0Mm,
        netWaterBalanceMm,
        compareTempMaxC,
        compareRainfallMm,
        isLowHumidity,
        isFungalRisk,
        isHeavyRain,
        isHeatStress,
        condition:
          language === "rw"
            ? delta.conditionRw
            : language === "fr"
            ? delta.conditionFr
            : delta.conditionEn,
        fieldAction: language === "rw" ? delta.fieldActionRw : delta.fieldActionEn,
      };
    });
  }, [
    activeAgroProfile,
    compareAgroProfile,
    compareBaseWeather,
    currentWeather,
    criticalHumidityThreshold,
    language,
    liveTelemetryByDistrict,
    selectedDistrict,
  ]);

  const sevenDayStats = useMemo(() => {
    const temps = sevenDayForecast.map((d) => d.tempMaxC);
    const minTemps = sevenDayForecast.map((d) => d.tempMinC);
    const humidities = sevenDayForecast.map((d) => d.humidity);
    const totalRain =
      Math.round(sevenDayForecast.reduce((acc, d) => acc + d.rainfallMm, 0) * 10) / 10;
    const totalEt0 =
      Math.round(sevenDayForecast.reduce((acc, d) => acc + d.et0Mm, 0) * 10) / 10;
    const netWaterBalance7d = Math.round((totalRain - totalEt0) * 10) / 10;
    const rainyDaysCount = sevenDayForecast.filter((d) => d.rainfallMm >= 4).length;
    const peakRainDay = [...sevenDayForecast].sort(
      (a, b) => b.rainfallMm - a.rainfallMm
    )[0];
    const totalGdd = Math.round(
      sevenDayForecast.reduce((acc, d) => acc + d.gddBase10, 0)
    );
    const lowHumidityDays = sevenDayForecast.filter((d) => d.isLowHumidity).length;
    const fungalRiskDays = sevenDayForecast.filter((d) => d.isFungalRisk).length;

    return {
      maxTemp: Math.max(...temps),
      minTemp: Math.min(...minTemps),
      avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
      avgMinTemp:
        Math.round((minTemps.reduce((a, b) => a + b, 0) / minTemps.length) * 10) / 10,
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities),
      avgHumidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
      totalRain,
      totalEt0,
      netWaterBalance7d,
      rainyDaysCount,
      peakRainDay,
      totalGdd,
      lowHumidityDays,
      fungalRiskDays,
    };
  }, [sevenDayForecast]);

  const selectedDay = sevenDayForecast[selectedDayIndex] || sevenDayForecast[0];

  const getCondition = (w: WeatherForecast) => {
    if (language === "rw") return w.conditionRw;
    if (language === "fr") return w.conditionFr;
    return w.conditionEn;
  };

  const getAdvisory = (w: WeatherForecast) => {
    if (language === "rw") return w.agriAdvisoryRw;
    if (language === "fr") return w.agriAdvisoryFr;
    return w.agriAdvisoryEn;
  };

  const getAgroZoneTitle = (p: AgroZoneClimateProfile) => {
    if (language === "rw") return p.agroZoneRw;
    if (language === "fr") return p.agroZoneFr;
    return p.agroZoneEn;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
          {t.marketTitle}
        </h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          {t.marketSubtitle}
        </p>
      </div>

      {/* Weather Forecast Widget with District & Farmer Agro-Zone Filter */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-stone-900 text-white p-6 rounded-2xl border border-emerald-700 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CloudSun className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-bold">
                {language === "rw"
                  ? "Iteganyagihe ry'Ubuhinzi & Imihindagurikire y'Iminsi 7"
                  : language === "fr"
                  ? "Météo Agricole & Tendances Climatiques sur 7 Jours"
                  : "Agro-Zone Weather & 7-Day Climate Fluctuation Forecast"}
              </h2>
            </div>
            <p className="text-xs text-emerald-200 flex flex-wrap items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{getAgroZoneTitle(activeAgroProfile)}</span>
              <span aria-hidden="true">·</span>
              <span>{activeAgroProfile.altitudeMeters}m ASL</span>
              <span aria-hidden="true">·</span>
              <span>
                {language === "rw" ? activeAgroProfile.soilTypeRw : activeAgroProfile.soilTypeEn}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-emerald-200 font-semibold">
              {language === "rw" ? "Akarere / Agro-Zone:" : "Select Farm District:"}
            </span>
            <select
              aria-label={language === "rw" ? "Hitamo Akarere" : "Select Farm District"}
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedDayIndex(0);
              }}
              className="bg-emerald-950 text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-emerald-600 outline-hidden focus:ring-2 focus:ring-amber-400"
            >
              {availableDistricts.map((w) => {
                const profile = AGRO_ZONE_PROFILES[w.district];
                return (
                  <option key={w.district} value={w.district}>
                    {w.district} ({w.province}) {profile ? `— ${profile.altitudeMeters}m` : ""}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={handleSyncLiveDistrictForecast}
              disabled={isSyncingLiveWeather}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-600 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncingLiveWeather ? "animate-spin" : ""}`}
              />
              <span>
                {language === "rw" ? "Kurura Iteganyagihe" : "Sync Live 7d"}
              </span>
            </button>
          </div>
        </div>

        {/* Farmer's Registered Parcels Quick-Switch Bar */}
        {farms.length > 0 && (
          <div className="bg-black/25 p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-emerald-200 flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                {language === "rw"
                  ? "Imirima Yawe Yanditswe (Kanda urebe Agro-Zone yayo):"
                  : "Your Registered Farm Parcels (Click to load parcel Agro-Zone):"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {farms.map((farm) => {
                const isSelected = farm.district.toLowerCase() === selectedDistrict.toLowerCase();
                return (
                  <button
                    key={farm.id}
                    type="button"
                    onClick={() => {
                      setSelectedDistrict(farm.district);
                      setSelectedDayIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? "bg-amber-400 text-stone-950 shadow-xs"
                        : "bg-white/10 text-stone-200 hover:bg-white/20"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {farm.name} ({farm.district})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Current District Weather Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/15">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xl">
              {currentWeather.tempC}°C
            </div>
            <div>
              <span className="text-xs font-bold text-stone-300 block">
                {currentWeather.district} ({currentWeather.province})
              </span>
              <p className="text-sm font-semibold text-white">{getCondition(currentWeather)}</p>
              <span className="text-[11px] text-emerald-200">
                {language === "rw" ? "Ijoro:" : "Night low:"} {sevenDayForecast[0]?.tempMinC}°C ·{" "}
                {activeAgroProfile.altitudeMeters}m
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-300 block">
                {language === "rw" ? "Ingano y'Imvura (Uyu munsi)" : "Expected Rainfall (Today)"}
              </span>
              <p className="text-sm font-semibold text-white">{currentWeather.rainfallMm} mm</p>
              <span className="text-[11px] text-blue-200">
                {language === "rw" ? "Iminsi 7 yose:" : "7-Day Cumulative:"} {sevenDayStats.totalRain} mm
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-300 block">
                {language === "rw" ? "Ubuhehere bw'Ikirere (Humidity)" : "Relative Humidity (RH)"}
              </span>
              <p className="text-sm font-semibold text-white">
                {currentWeather.humidity}%{" "}
                {currentWeather.humidity < criticalHumidityThreshold && (
                  <span className="text-rose-300 text-xs font-bold">
                    ({language === "rw" ? "Munsi ya" : "Below"} {criticalHumidityThreshold}%)
                  </span>
                )}
              </p>
              <span className="text-[11px] text-teal-200">
                VPD: {sevenDayForecast[0]?.vpdKpa} kPa · ET₀: {sevenDayForecast[0]?.et0Mm} mm/d
              </span>
            </div>
          </div>
        </div>

        {/* Agronomic Alert & Irrigation Demand Index */}
        <div className="p-4 rounded-xl bg-white/15 border border-white/20 text-xs space-y-2">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-200 block mb-0.5">
                {language === "rw"
                  ? `Inama y'Ubuhinzi muri ${currentWeather.district} (${activeAgroProfile.agroZoneRw}):`
                  : `Agro-Zone Advisory for ${currentWeather.district} (${activeAgroProfile.agroZoneEn}):`}
              </strong>
              <p className="text-stone-100 leading-relaxed">{getAdvisory(currentWeather)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-cyan-200 flex items-center space-x-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-300" />
              <span>
                {language === "rw" ? "Umuvuduko wo gukama kw'amazi (ET₀):" : "Soil Evaporation (ET₀):"}{" "}
                <strong>
                  {sevenDayForecast[0]?.et0Mm} mm/{language === "rw" ? "umunsi" : "day"}
                </strong>
                {" · "}
                {language === "rw" ? "Ibihingwa by'ingenzi:" : "Zone Crops:"}{" "}
                <strong>{activeAgroProfile.signatureCrops.join(", ")}</strong>
              </span>
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                currentWeather.humidity < criticalHumidityThreshold ||
                (currentWeather.rainfallMm <= 3 && currentWeather.tempC >= 25)
                  ? "bg-rose-500 text-white"
                  : currentWeather.rainfallMm <= 5
                  ? "bg-amber-400 text-stone-950"
                  : "bg-emerald-400 text-stone-950"
              }`}
            >
              {currentWeather.humidity < criticalHumidityThreshold ||
              (currentWeather.rainfallMm <= 3 && currentWeather.tempC >= 25)
                ? language === "rw"
                  ? "Ubushyuhe & Umwuka Wumye: Kuhira Bikenewe"
                  : "High Irrigation Demand (Low Humidity)"
                : currentWeather.rainfallMm <= 5
                ? language === "rw"
                  ? "Ubuhehere Buringaniye"
                  : "Moderate Irrigation Demand"
                : language === "rw"
                ? "Amazi Arahagije (Rain Fed)"
                : "Rainfall Sufficient"}
            </span>
          </div>
        </div>
      </div>

      {/* 7-DAY VISUAL WEATHER TREND CHART: PRECIPITATION & TEMPERATURE PROJECTIONS FOR SELECTED FARM DISTRICTS */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs p-6 space-y-6">
        {/* Chart Header, District Switcher & Projection Mode Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
              <span>
                {language === "rw"
                  ? "IGISHUSHANYO CY'IMVURA N'UBUSHYUHE BITEGANYIJWE MU MINSI 7"
                  : language === "fr"
                  ? "PROJECTIONS DES PRÉCIPITATIONS ET TEMPÉRATURES SUR 7 JOURS"
                  : "7-DAY PRECIPITATION & TEMPERATURE PROJECTION TREND CHART"}
              </span>
              {liveTelemetryByDistrict[selectedDistrict] && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold normal-case">
                  {liveTelemetryByDistrict[selectedDistrict].source}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
              {selectedDistrict} — {getAgroZoneTitle(activeAgroProfile)} (
              {activeAgroProfile.altitudeMeters}m ASL)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? `Iteganyagihe ry'imvura ya buri munsi (mm), imvura yose ikomatanyije (${sevenDayStats.totalRain}mm), n'ubushyuhe bwo ku manywa/nijoro (°C) mu karere ka ${selectedDistrict}.`
                : `7-day projected daily precipitation (mm), cumulative rainfall trajectory (${sevenDayStats.totalRain}mm), and daytime/nighttime temperature curves (°C) for ${selectedDistrict}.`}
              {matchingFarms.length > 0 && (
                <span className="ml-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  ({language === "rw" ? "Imirima yawe muri aka karere:" : "Registered parcels in district:"}{" "}
                  {matchingFarms.map((f) => f.name).join(", ")})
                </span>
              )}
            </p>
          </div>

          {/* Interactive Chart Projection Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setChartMode("precip_temp")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === "precip_temp"
                  ? "bg-emerald-800 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Imvura + Ubushyuhe" : "Precipitation + Temp"}
            </button>
            <button
              type="button"
              onClick={() => setChartMode("precip_focus")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === "precip_focus"
                  ? "bg-blue-700 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Imvura & Amazi (mm)" : "Rain & Water Balance"}
            </button>
            <button
              type="button"
              onClick={() => setChartMode("temp_focus")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === "temp_focus"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Ubushyuhe & GDD (°C)" : "Temp & Thermal GDD"}
            </button>
            <button
              type="button"
              onClick={() => setChartMode("district_compare")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === "district_compare"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Gereranya Uturere" : "Compare Districts"}
            </button>
            <button
              type="button"
              onClick={() => setChartMode("humidity")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                chartMode === "humidity"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Ubuhehere (% RH)" : "Humidity (% RH)"}
            </button>
          </div>
        </div>

        {/* District Selector Pills + Secondary District Comparison Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/50 px-4 py-3 rounded-xl border border-stone-200/80 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              {language === "rw" ? "Uturere tw'Imirima:" : "Farm Districts:"}
            </span>
            {availableDistricts.map((d) => {
              const isActive = d.district === selectedDistrict;
              const hasFarm = farms.some(
                (f) => f.district.toLowerCase() === d.district.toLowerCase()
              );
              return (
                <button
                  key={d.district}
                  type="button"
                  onClick={() => {
                    setSelectedDistrict(d.district);
                    setSelectedDayIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? "bg-emerald-800 text-white shadow-2xs"
                      : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-500"
                  }`}
                >
                  <span>{d.district}</span>
                  {hasFarm && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? "bg-amber-300" : "bg-emerald-500"
                      }`}
                      title={
                        language === "rw"
                          ? "Ufite umurima muri aka karere"
                          : "Registered farm parcel in this district"
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>

          {chartMode === "district_compare" && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                {language === "rw" ? "Gereranya na:" : "Compare vs:"}
              </span>
              <select
                aria-label={
                  language === "rw"
                    ? "Hitamo akarere ko kugereranya"
                    : "Select comparison district"
                }
                value={compareDistrict}
                onChange={(e) => setCompareDistrict(e.target.value)}
                className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700"
              >
                {availableDistricts
                  .filter((d) => d.district !== selectedDistrict)
                  .map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district} ({d.province})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* 7-Day Precipitation & Temperature Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: 7-Day Precipitation Projection */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50">
            <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-semibold">
              <span>
                {language === "rw"
                  ? "Imvura Iteganyijwe (Iminsi 7)"
                  : "7-Day Precipitation Projection"}
              </span>
              <CloudRain className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-black text-stone-900 dark:text-white mt-1 tabular-nums">
              {sevenDayStats.totalRain} mm{" "}
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                ({sevenDayStats.rainyDaysCount}/7 {language === "rw" ? "iminsi" : "wet days"})
              </span>
            </p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
              {language === "rw" ? "Umunsi ufite nyinshi:" : "Peak day:"}{" "}
              <strong>
                {sevenDayStats.peakRainDay?.rainfallMm}mm (
                {sevenDayStats.peakRainDay?.shortAxisLabel})
              </strong>
            </p>
          </div>

          {/* KPI 2: 7-Day Temperature Projection */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold">
              <span>
                {language === "rw"
                  ? "Ubushyuhe Buteganyijwe (Iminsi 7)"
                  : "7-Day Temperature Projection"}
              </span>
              <Thermometer className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-lg font-black text-stone-900 dark:text-white mt-1 tabular-nums">
              {sevenDayStats.minTemp}°C – {sevenDayStats.maxTemp}°C
            </p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
              {language === "rw" ? "Impuzandengo:" : "Avg High/Low:"}{" "}
              <strong>
                {sevenDayStats.avgTemp}°C / {sevenDayStats.avgMinTemp}°C
              </strong>{" "}
              · {sevenDayStats.totalGdd} GDD
            </p>
          </div>

          {/* KPI 3: Soil Water Balance (Rain vs ET0) */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/50">
            <div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-semibold">
              <span>
                {language === "rw"
                  ? "Imvura vs Gukama (Water Balance)"
                  : "7-Day Net Water Balance"}
              </span>
              <Droplets className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-lg font-black text-stone-900 dark:text-white mt-1 tabular-nums">
              {sevenDayStats.netWaterBalance7d >= 0 ? "+" : ""}
              {sevenDayStats.netWaterBalance7d} mm{" "}
              <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                ({sevenDayStats.avgHumidity}% RH)
              </span>
            </p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
              {language === "rw" ? "ET₀ y'iminsi 7:" : "7-Day ET₀ Loss:"}{" "}
              <strong>{sevenDayStats.totalEt0} mm</strong> ·{" "}
              {sevenDayStats.netWaterBalance7d >= 0
                ? language === "rw"
                  ? "Ubuhehere bwiyongera"
                  : "Positive soil recharge"
                : language === "rw"
                ? "Kuhira birakenewe"
                : "Irrigation deficit"}
            </p>
          </div>

          {/* KPI 4: Agro-Climate Risk Window */}
          <div
            className={`p-3.5 rounded-xl border ${
              sevenDayStats.lowHumidityDays > 0
                ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                : sevenDayStats.fungalRiskDays > 0
                ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
              <span>{language === "rw" ? "Isuzuma ry'Ibyago" : "Agro-Climate Risk Window"}</span>
              {sevenDayStats.lowHumidityDays > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p className="text-lg font-black text-stone-900 dark:text-white mt-1">
              {sevenDayStats.lowHumidityDays > 0
                ? language === "rw"
                  ? `Iminsi ${sevenDayStats.lowHumidityDays} Yumye (<${criticalHumidityThreshold}%)`
                  : `${sevenDayStats.lowHumidityDays} Dry-Air Days (<${criticalHumidityThreshold}%)`
                : sevenDayStats.fungalRiskDays > 0
                ? language === "rw"
                  ? `Iminsi ${sevenDayStats.fungalRiskDays} y'Urume (≥82% RH)`
                  : `${sevenDayStats.fungalRiskDays} Blight Risk Days`
                : language === "rw"
                ? "Ikirere Kiringaniye"
                : "Optimal Field Window"}
            </p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
              {sevenDayStats.lowHumidityDays > 0
                ? language === "rw"
                  ? "Tegura kuhira mu gitondo kare"
                  : "Schedule early morning irrigation"
                : sevenDayStats.fungalRiskDays > 0
                ? language === "rw"
                  ? "Rinda ibirayi/inyanya urume (Mancozeb)"
                  : "Scout for fungal spore germination"
                : language === "rw"
                ? "Nta mpuruza y'umwuka wumye"
                : "Favorable harvest & transport window"}
            </p>
          </div>
        </div>

        {/* Custom Chart Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 px-4 py-2.5 rounded-xl">
          <div className="flex flex-wrap items-center gap-4">
            {(chartMode === "precip_temp" || chartMode === "precip_focus") && (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                  <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
                  <span>
                    {language === "rw"
                      ? "Imvura ya Buri Munsi (mm)"
                      : "Daily Precipitation (mm)"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700 dark:text-sky-300">
                  <span className="w-4 border-t-2 border-sky-500 inline-block" />
                  <span>
                    {language === "rw"
                      ? "Imvura Yiteranyije (Cumulative mm)"
                      : "Cumulative 7d Rain (mm)"}
                  </span>
                </span>
              </>
            )}
            {(chartMode === "precip_temp" || chartMode === "temp_focus") && (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                  <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                  <span>
                    {language === "rw" ? "Ubushyuhe bwo ku Manywa (°C)" : "Daytime High Temp (°C)"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-orange-700 dark:text-orange-300">
                  <span className="w-4 border-t-2 border-dashed border-orange-400 inline-block" />
                  <span>
                    {language === "rw" ? "Ubushyuhe bwo mu Ijoro (°C)" : "Nighttime Low Temp (°C)"}
                  </span>
                </span>
              </>
            )}
            {chartMode === "precip_focus" && (
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-4 border-t-2 border-dashed border-rose-500 inline-block" />
                <span>
                  {language === "rw" ? "Gukama kw'Amazi ET₀ (mm/d)" : "Evapotranspiration ET₀ (mm/d)"}
                </span>
              </span>
            )}
            {chartMode === "district_compare" && (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                  <span>{selectedDistrict} Rain (mm)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300">
                  <span className="w-3 h-3 rounded-xs bg-purple-500 inline-block" />
                  <span>{compareDistrict} Rain (mm)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600">
                  <span className="w-4 border-t-2 border-amber-500 inline-block" />
                  <span>{selectedDistrict} High (°C)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-pink-600">
                  <span className="w-4 border-t-2 border-dashed border-pink-500 inline-block" />
                  <span>{compareDistrict} High (°C)</span>
                </span>
              </>
            )}
            {chartMode === "humidity" && (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
                  <span className="w-3 h-3 rounded-xs bg-teal-500 inline-block" />
                  <span>
                    {language === "rw" ? "Ubuhehere bw'Ikirere (% RH)" : "Expected Humidity (% RH)"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                  <span className="w-4 border-t-2 border-dashed border-rose-500 inline-block" />
                  <span>
                    {language === "rw"
                      ? `Umurongo Ntarengwa (${criticalHumidityThreshold}% RH)`
                      : `Critical Threshold (${criticalHumidityThreshold}% RH)`}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                  <span className="w-3 h-3 rounded-xs bg-blue-500/60 inline-block" />
                  <span>{language === "rw" ? "Imvura (mm)" : "Rainfall (mm)"}</span>
                </span>
              </>
            )}
          </div>
          <span className="text-[11px] text-stone-500">
            {language === "rw"
              ? "Shyira imbeba ku munsi cyangwa ukande hasi urebe inama y'ubuhinzi"
              : "Hover over chart bars/points or click a day below for field guidance"}
          </span>
        </div>

        {/* Recharts 7-Day Visual Precipitation & Temperature Trend Container */}
        <div className="h-84 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={sevenDayForecast}
              margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
              onClick={(state) => {
                if (state && typeof state.activeTooltipIndex === "number") {
                  setSelectedDayIndex(state.activeTooltipIndex);
                }
              }}
            >
              <defs>
                <linearGradient id="humidityAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="cumRainAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />

              <XAxis
                dataKey="shortAxisLabel"
                tick={{ fontSize: 11, fill: "#57534e", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#d6d3d1" }}
              />

              {/* Left Y-Axis: Temperature (°C) for precip_temp, temp_focus, and district_compare */}
              {(chartMode === "precip_temp" ||
                chartMode === "temp_focus" ||
                chartMode === "district_compare") && (
                <YAxis
                  yAxisId="temp"
                  orientation="left"
                  domain={[8, 35]}
                  unit="°C"
                  tick={{ fontSize: 11, fill: "#d97706", fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
              )}

              {/* Right Y-Axis: Precipitation (mm) for precip_temp, precip_focus, district_compare, humidity */}
              {(chartMode === "precip_temp" ||
                chartMode === "precip_focus" ||
                chartMode === "district_compare" ||
                chartMode === "humidity") && (
                <YAxis
                  yAxisId="rain"
                  orientation={chartMode === "precip_focus" ? "left" : "right"}
                  domain={[0, chartMode === "precip_focus" ? Math.max(40, Math.ceil(sevenDayStats.totalRain + 10)) : 30]}
                  unit="mm"
                  tick={{ fontSize: 11, fill: "#2563eb", fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
              )}

              {/* Humidity Y-Axis when in humidity mode */}
              {chartMode === "humidity" && (
                <YAxis
                  yAxisId="humidity"
                  orientation="left"
                  domain={[30, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "#0d9488", fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
              )}

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as (typeof sevenDayForecast)[number];
                  return (
                    <div className="bg-stone-950 text-white p-3.5 rounded-xl border border-stone-700 shadow-xl text-xs max-w-xs space-y-2">
                      <div className="flex items-center justify-between gap-3 border-b border-stone-800 pb-1.5">
                        <span className="font-bold text-amber-300">{point.dayLabel}</span>
                        <span className="text-[11px] text-stone-400">
                          {selectedDistrict} ({activeAgroProfile.altitudeMeters}m)
                        </span>
                      </div>
                      <p className="text-stone-200 font-medium">{point.condition}</p>

                      {/* Primary Precipitation & Temperature Readout */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-blue-950/60 border border-blue-800/60 p-2 rounded-lg">
                          <span className="text-[10px] text-blue-300 block">
                            {language === "rw" ? "Imvura (Umunsi / Yose)" : "Rain (Daily / 7d Cum.)"}
                          </span>
                          <span className="text-sm font-black text-blue-300">
                            {point.rainfallMm} mm{" "}
                            <span className="text-[11px] font-semibold text-sky-200">
                              ({point.cumulativeRainMm}mm)
                            </span>
                          </span>
                          <span className="text-[10px] text-blue-200/80 block mt-0.5">
                            {language === "rw" ? "Amahirwe y'imvura:" : "Rain prob:"}{" "}
                            {point.rainChancePct}%
                          </span>
                        </div>

                        <div className="bg-amber-950/60 border border-amber-800/60 p-2 rounded-lg">
                          <span className="text-[10px] text-amber-300 block">
                            {language === "rw" ? "Ubushyuhe (Max / Min)" : "Temp (High / Low)"}
                          </span>
                          <span className="text-sm font-black text-amber-400">
                            {point.tempMaxC}°C{" "}
                            <span className="text-xs font-normal text-stone-300">
                              / {point.tempMinC}°C
                            </span>
                          </span>
                          <span className="text-[10px] text-amber-200/80 block mt-0.5">
                            Mean {point.tempAvgC}°C · +{point.gddBase10} GDD
                          </span>
                        </div>
                      </div>

                      {chartMode === "district_compare" && (
                        <div className="bg-purple-950/60 border border-purple-800/60 p-2 rounded-lg text-[11px]">
                          <span className="font-bold text-purple-300 block">
                            vs {compareDistrict}:
                          </span>
                          <span>
                            Rain: <strong>{point.compareRainfallMm} mm</strong> · High Temp:{" "}
                            <strong>{point.compareTempMaxC}°C</strong>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-stone-300 pt-0.5">
                        <span>
                          RH:{" "}
                          <strong
                            className={
                              point.isLowHumidity ? "text-rose-400" : "text-teal-300"
                            }
                          >
                            {point.humidity}%
                          </strong>
                        </span>
                        <span>
                          ET₀: <strong>{point.et0Mm} mm/d</strong> · Net:{" "}
                          <strong
                            className={
                              point.netWaterBalanceMm >= 0
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }
                          >
                            {point.netWaterBalanceMm >= 0 ? "+" : ""}
                            {point.netWaterBalanceMm}mm
                          </strong>
                        </span>
                      </div>

                      {point.isHeavyRain && (
                        <div className="text-[11px] text-sky-300 font-semibold border-t border-stone-800 pt-1.5">
                          🌧️{" "}
                          {language === "rw"
                            ? "Imvura nyinshi (≥14mm): Sibura imiferege kandi wirinde gutera umuti!"
                            : "Heavy rain projection (≥14mm): Clear contour drains & hold spraying!"}
                        </div>
                      )}
                      {point.isLowHumidity && (
                        <div className="text-[11px] text-rose-300 font-semibold border-t border-stone-800 pt-1.5">
                          ⚠️{" "}
                          {language === "rw"
                            ? `Munsi y'umurongo ntarengwa wa ${criticalHumidityThreshold}% RH — Kuhira birakenewe!`
                            : `Below ${criticalHumidityThreshold}% RH critical threshold — Irrigation required!`}
                        </div>
                      )}
                      <div className="text-[11px] text-emerald-300 border-t border-stone-800 pt-1.5 leading-snug">
                        {point.fieldAction}
                      </div>
                    </div>
                  );
                }}
              />

              {/* Heavy Rain Erosion Warning Reference Line in Precipitation modes */}
              {chartMode === "precip_temp" && (
                <ReferenceLine
                  yAxisId="rain"
                  y={15}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.25}
                  label={{
                    value:
                      language === "rw"
                        ? "Imvura Nyinshi (15mm)"
                        : "Heavy Rain (15mm)",
                    position: "insideTopRight",
                    fill: "#2563eb",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Critical Humidity Threshold Reference Line */}
              {chartMode === "humidity" && (
                <ReferenceLine
                  yAxisId="humidity"
                  y={criticalHumidityThreshold}
                  stroke="#f43f5e"
                  strokeDasharray="5 5"
                  strokeWidth={1.75}
                  label={{
                    value:
                      language === "rw"
                        ? `Ntarengwa ${criticalHumidityThreshold}% RH`
                        : `Critical ${criticalHumidityThreshold}% RH`,
                    position: "insideTopRight",
                    fill: "#e11d48",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Cumulative 7-Day Rainfall Shaded Area in precip_focus mode */}
              {chartMode === "precip_focus" && (
                <Area
                  yAxisId="rain"
                  type="monotone"
                  dataKey="cumulativeRainMm"
                  name={
                    language === "rw"
                      ? "Imvura Yiteranyije (mm)"
                      : "Cumulative 7d Rain (mm)"
                  }
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fill="url(#cumRainAreaGrad)"
                  dot={{ r: 3.5, fill: "#0284c7" }}
                />
              )}

              {/* Daily Precipitation Bars (Primary visual element in precip_temp, precip_focus, humidity) */}
              {(chartMode === "precip_temp" ||
                chartMode === "precip_focus" ||
                chartMode === "humidity") && (
                <Bar
                  yAxisId="rain"
                  dataKey="rainfallMm"
                  name={
                    language === "rw"
                      ? "Imvura ya Buri Munsi (mm)"
                      : "Daily Precipitation (mm)"
                  }
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                >
                  {sevenDayForecast.map((entry, idx) => (
                    <Cell
                      key={`rain-cell-${idx}`}
                      fill={
                        entry.rainfallMm >= 14
                          ? "#1d4ed8"
                          : entry.rainfallMm >= 5
                          ? "#3b82f6"
                          : "#93c5fd"
                      }
                      fillOpacity={idx === selectedDayIndex ? 0.95 : 0.72}
                    />
                  ))}
                </Bar>
              )}

              {/* Evapotranspiration ET0 line in precip_focus mode */}
              {chartMode === "precip_focus" && (
                <Line
                  yAxisId="rain"
                  type="monotone"
                  dataKey="et0Mm"
                  name={
                    language === "rw"
                      ? "Gukama kw'Amazi ET₀ (mm/d)"
                      : "Daily Evapotranspiration ET₀ (mm)"
                  }
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#f43f5e" }}
                />
              )}

              {/* Multi-District Comparison Bars & Lines */}
              {chartMode === "district_compare" && (
                <>
                  <Bar
                    yAxisId="rain"
                    dataKey="rainfallMm"
                    name={`${selectedDistrict} Rain (mm)`}
                    fill="#2563eb"
                    fillOpacity={0.75}
                    radius={[5, 5, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    yAxisId="rain"
                    dataKey="compareRainfallMm"
                    name={`${compareDistrict} Rain (mm)`}
                    fill="#9333ea"
                    fillOpacity={0.65}
                    radius={[5, 5, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="tempMaxC"
                    name={`${selectedDistrict} High (°C)`}
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#f59e0b" }}
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="compareTempMaxC"
                    name={`${compareDistrict} High (°C)`}
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3.5, fill: "#ec4899" }}
                  />
                </>
              )}

              {/* Humidity Shaded Area in humidity mode */}
              {chartMode === "humidity" && (
                <Area
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humidity"
                  name={language === "rw" ? "Ubuhehere (%)" : "Humidity (%)"}
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#humidityAreaGrad)"
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff", fill: "#0d9488" }}
                />
              )}

              {/* Daytime High Temperature Area/Curve in precip_temp & temp_focus */}
              {(chartMode === "precip_temp" || chartMode === "temp_focus") && (
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tempMaxC"
                  name={language === "rw" ? "Ubushyuhe ku Manywa (°C)" : "Daytime High (°C)"}
                  stroke="#d97706"
                  strokeWidth={3}
                  fill="url(#tempAreaGrad)"
                  dot={{ r: 4, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff", fill: "#d97706" }}
                />
              )}

              {/* Daily Mean Temperature Line in temp_focus mode */}
              {chartMode === "temp_focus" && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tempAvgC"
                  name={language === "rw" ? "Ubushyuhe Mpuzandengo (°C)" : "Daily Mean Temp (°C)"}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                />
              )}

              {/* Nighttime Minimum Temperature Dashed Line */}
              {(chartMode === "precip_temp" || chartMode === "temp_focus") && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="tempMinC"
                  name={language === "rw" ? "Ubushyuhe mu Ijoro (°C)" : "Nighttime Low (°C)"}
                  stroke="#fb923c"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#fb923c" }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive 7-Day Daily Breakdown Selector Strip */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {sevenDayForecast.map((day) => {
              const isSelected = day.dayIndex === selectedDayIndex;
              return (
                <button
                  key={day.dayIndex}
                  type="button"
                  onClick={() => setSelectedDayIndex(day.dayIndex)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-emerald-950 text-white border-emerald-700 shadow-sm"
                      : day.isLowHumidity
                      ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-stone-900 dark:text-stone-100 hover:bg-rose-50"
                      : "bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11px] font-bold truncate ${
                        isSelected ? "text-amber-300" : "text-stone-500 dark:text-stone-400"
                      }`}
                    >
                      {day.shortAxisLabel}
                    </span>
                    {day.rainfallMm >= 10 ? (
                      <CloudRain className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    ) : day.tempMaxC >= 26 ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <CloudSun className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline space-x-1 tabular-nums">
                    <span className="text-base font-black">{day.tempMaxC}°</span>
                    <span
                      className={`text-xs ${
                        isSelected ? "text-stone-300" : "text-stone-400 dark:text-stone-500"
                      }`}
                    >
                      /{day.tempMinC}°C
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums">
                    <span
                      className={`font-bold ${
                        day.isLowHumidity
                          ? isSelected
                            ? "text-rose-300"
                            : "text-rose-600 dark:text-rose-400"
                          : isSelected
                          ? "text-teal-300"
                          : "text-teal-700 dark:text-teal-400"
                      }`}
                    >
                      {day.humidity}% RH
                    </span>
                    <span
                      className={
                        isSelected ? "text-blue-200" : "text-stone-500 dark:text-stone-400"
                      }
                    >
                      {day.rainfallMm}mm
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Detailed Agro-Zone Field Action Card */}
          {selectedDay && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                selectedDay.isLowHumidity
                  ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                  : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-200">
                  <span>{selectedDay.dayLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedDay.condition}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 dark:text-amber-300">
                    {selectedDay.tempMaxC}°C / {selectedDay.tempMinC}°C
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      selectedDay.isLowHumidity
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-teal-700 dark:text-teal-300"
                    }
                  >
                    {selectedDay.humidity}% RH
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white">
                  {selectedDay.fieldAction}
                </p>
              </div>

              <div className="text-xs text-stone-600 dark:text-stone-300 shrink-0 tabular-nums">
                <div>
                  ET₀: <strong>{selectedDay.et0Mm} mm/day</strong>
                </div>
                <div>
                  VPD: <strong>{selectedDay.vpdKpa} kPa</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Prices Table */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              {language === "rw" ? "Ibiciro byo mu Masoko Manini y'u Rwanda" : "Wholesale Market Price Ticker"}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Bishyirwa ku gihe buri gitondo n'abakusanyamakuru ba TERIMBERE
            </p>
          </div>

          <input
            type="text"
            placeholder={language === "rw" ? "Shakisha igihingwa cyangwa isoko..." : "Search crop or market..."}
            value={marketSearch}
            onChange={(e) => setMarketSearch(e.target.value)}
            className="px-3.5 py-2 border border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-white rounded-xl text-xs w-full sm:w-64 outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Igihingwa (Crop)</th>
                <th className="px-5 py-3.5">Isoko (Market)</th>
                <th className="px-5 py-3.5">Akarere (District)</th>
                <th className="px-5 py-3.5 text-right">Igiciro (RWF/kg)</th>
                <th className="px-5 py-3.5 text-center">Ihindagurika (Trend)</th>
                <th className="px-5 py-3.5 text-right">Itariki (Updated)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredPrices.map((mp) => (
                <tr key={mp.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap font-bold text-stone-900 dark:text-white text-xs">
                    {mp.crop}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    {mp.marketName}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-stone-600 dark:text-stone-400">
                    {mp.district}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right font-black text-stone-900 dark:text-white text-sm tabular-nums">
                    {mp.priceAvg} <span className="text-[10px] font-bold text-stone-400">RWF/kg</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    {mp.trend === "up" ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Kuri hejuru</span>
                      </span>
                    ) : mp.trend === "down" ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Bimanutse</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-stone-500 dark:text-stone-400">
                        <Minus className="w-3.5 h-3.5" />
                        <span>Bihagaze hamwe</span>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right text-xs text-stone-400">
                    {mp.lastUpdated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transport & Arbitrage Calculator */}
      <div className="bg-stone-50 dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center space-x-2">
          <Truck className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-stone-900 dark:text-white">
            {language === "rw"
              ? "Kugurisha ku murima (Farm Gate) vs Kujyana i Kigali (Market Arbitrage)"
              : "Farm Gate vs Kigali City Delivery"}
          </h3>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          Ku birenge by'ibirayi bya Kinigi: Igiciro ku murima i Musanze ni <strong>280 RWF/kg</strong>. Ku isoko rya Kimironko/Nyabugogo i Kigali ni <strong>340 RWF/kg</strong>. Ikiguzi cyo gutwara ikilo kimwe ni <strong>25 RWF</strong>.
          <br />
          Kujyana umusaruro w'ibirayi wa Toni 5 (5,000 kg) i Kigali byongera inyungu ya <strong>175,000 RWF</strong> nyuma yo gukuramo ikiguzi cy'imodoka!
        </p>
      </div>
    </div>
  );
};
