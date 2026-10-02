import React, { useMemo, useState } from "react";
import { Language } from "../types";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Filter,
  Leaf,
  MapPin,
  Microscope,
  Search,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Sun,
  X,
} from "lucide-react";

export type StapleCropCategoryId =
  | "all"
  | "ibirayi"
  | "ibigori"
  | "ibishyimbo"
  | "urutoki"
  | "imyumbati"
  | "inyanya_ikawa";

export type PathogenTypeId =
  | "all"
  | "fungal"
  | "bacterial"
  | "viral"
  | "pest";

export interface CropDiseaseCatalogEntry {
  id: string;
  cropCategoryId: Exclude<StapleCropCategoryId, "all">;
  cropNameRw: string;
  cropNameEn: string;
  diseaseNameRw: string;
  diseaseNameEn: string;
  scientificName: string;
  pathogenType: Exclude<PathogenTypeId, "all">;
  pathogenLabelRw: string;
  pathogenLabelEn: string;
  severityLevel: "High" | "Moderate" | "Critical";
  agroZonesAffectedRw: string;
  agroZonesAffectedEn: string;
  weatherTriggerRw: string;
  weatherTriggerEn: string;
  imageUrl: string;
  descriptionRw: string;
  descriptionEn: string;
  symptomsRw: string[];
  symptomsEn: string[];
  organicPreventionMethodsRw: string[];
  organicPreventionMethodsEn: string[];
  organicBotanicalRecipeRw: {
    title: string;
    ingredients: string;
    preparationAndDosage: string;
    applicationTiming: string;
  };
  organicBotanicalRecipeEn: {
    title: string;
    ingredients: string;
    preparationAndDosage: string;
    applicationTiming: string;
  };
  rabResistantVarieties: string[];
  rabReferenceCode: string;
}

export const RWANDA_CROP_DISEASE_KNOWLEDGE_BASE: CropDiseaseCatalogEntry[] = [
  {
    id: "kb-potato-late-blight",
    cropCategoryId: "ibirayi",
    cropNameRw: "Ibirayi",
    cropNameEn: "Irish Potatoes",
    diseaseNameRw: "Urume rw'Ibirayi (Imvura y'Ibirayi)",
    diseaseNameEn: "Potato Late Blight",
    scientificName: "Phytophthora infestans",
    pathogenType: "fungal",
    pathogenLabelRw: "Agahumyo (Oomycete)",
    pathogenLabelEn: "Fungal-like Oomycete",
    severityLevel: "Critical",
    agroZonesAffectedRw: "Imisozi miremire y'Ibirunga (Musanze, Burera, Nyabihu, Rubavu)",
    agroZonesAffectedEn: "Birunga Volcanic Highlands & Congo-Nile Crest",
    weatherTriggerRw: "Ubuhehere buri hejuru ya 85% n'ubushyuhe bwa 12°C–20°C mu gihe cy'imvura",
    weatherTriggerEn: "Relative humidity > 85% with cool mountain temperatures (12°C–20°C)",
    imageUrl: "/src/assets/images/potato_late_blight_1790945783792.jpg",
    descriptionRw:
      "Urume rw'ibirayi ni indwara ikomeye cyane mu misozi miremire y'u Rwanda. Ifata amababi, ingeri n'ibirayi bikiri mu butaka mu gihe ikirere gikonje kandi gihehereye cyane.",
    descriptionEn:
      "Potato Late Blight is the most destructive foliar and tuber disease in Rwanda's highland potato belt. It spreads rapidly during misty, humid mornings and consecutive rain days.",
    symptomsRw: [
      "Amabara y'umukara cyangwa ikigina gifite uruziga rw'icyatsi kibisi ku nkengero z'amababi",
      "Uruhu rwera rumeze nk'ipamba munsi y'ikibabi mu masaha ya mu gitondo hari ikime",
      "Ingeri n'amababi birabora bikirabura kandi bikagira impumuro yihariye mu murima",
    ],
    symptomsEn: [
      "Water-soaked dark brown to black lesions on leaf tips and margins with pale green halos",
      "Velvety white fungal sporulation on the underside of infected leaves during morning dew",
      "Rapid browning and collapse of stems and petioles within 4–7 days of humid weather",
    ],
    organicPreventionMethodsRw: [
      "Gutera imbuto z'indobanure zihanganira urume zemejwe na RAB (nka Kinigi, Kirundo, Ndamira)",
      "Guhinga ku ntera ikwiye (75 cm × 30 cm) kugira ngo umuyaga utambuke mu mababi yumuke vuba",
      "Kugira isuku mu murima ukuramo ibirayi byimeze (volunteer plants) no kurunda igitaka (buttage) ku ngeri",
      "Gusimburanya ibirayi n'ibinyamisogwe (ibishyimbo) cyangwa ibigori mu bihembwe 2–3",
    ],
    organicPreventionMethodsEn: [
      "Plant RAB-certified blight-tolerant seed varieties (Kinigi, Kirundo, Ndamira, Kazeneza)",
      "Maintain wide row spacing (75 cm × 30 cm) to improve canopy airflow and reduce leaf wetness duration",
      "Practice high earthing-up (hilling) around stems to shield developing tubers from washed-down spores",
      "Remove volunteer potato plants and rotate with climbing beans or maize for 2–3 seasons",
    ],
    organicBotanicalRecipeRw: {
      title: "Umuti w'Umwimerere wa Tungurusumu, Urusenda n'Igikakarubamba (Aloe + Garlic Bio-Spray)",
      ingredients: "500g za tungurusumu zisekuye + 250g z'amababi ya Neem cyangwa Igikakarubamba + 50g z'isabune idafite imibavu muri litiro 20 z'amazi",
      preparationAndDosage: "Inika ibikoresho mu mazi y'akazuyazi amasaha 12, uyungurure neza, hanyuma uvanze muri pompe ya litiro 20.",
      applicationTiming: "Tera mu gitondo kare ikime kimaze kumuka (08:00–10:30) buri minsi 7 mu gihe cy'imvura.",
    },
    organicBotanicalRecipeEn: {
      title: "Garlic, Chili & Aloe Vera Botanical Protective Spray + Compost Tea",
      ingredients: "500g crushed garlic bulbs + 250g fresh Aloe vera / Neem leaf extract + 50g mild potassium soap per 20L water",
      preparationAndDosage: "Steep crushed garlic and aloe in 2L warm water for 12 hours, strain through fine cloth, dilute to 20L knapsack sprayer.",
      applicationTiming: "Apply preventively every 7 days during cool morning hours (08:00–10:30) before rain onset.",
    },
    rabResistantVarieties: ["Kinigi", "Kirundo", "Ndamira", "Kazeneza"],
    rabReferenceCode: "RAB-KB-POT-01",
  },
  {
    id: "kb-maize-fall-armyworm",
    cropCategoryId: "ibigori",
    cropNameRw: "Ibigori",
    cropNameEn: "Maize",
    diseaseNameRw: "Nkongwa Ibyasi mu Bigori",
    diseaseNameEn: "Maize Fall Armyworm",
    scientificName: "Spodoptera frugiperda",
    pathogenType: "pest",
    pathogenLabelRw: "Agakoko k'Inkongwa (Lepidoptera)",
    pathogenLabelEn: "Invasive Caterpillar Pest",
    severityLevel: "High",
    agroZonesAffectedRw: "Iburasirazuba (Nyagatare, Gatsibo, Kayonza, Bugesera) n'Imisozi y'Hagati",
    agroZonesAffectedEn: "Eastern Savanna Lowlands, Bugesera & Central Plateau",
    weatherTriggerRw: "Ubushyuhe bwa 24°C–30°C buvanze n'iminsi y'izuba hagati mu gihembwe cy'ihinga",
    weatherTriggerEn: "Warm dry spells (24°C–30°C) during early vegetative stages (V2–V8)",
    imageUrl: "/src/assets/images/maize_fall_armyworm_1790945797849.jpg",
    descriptionRw:
      "Nkongwa ibyasi ni agasimba karya amababi akiri mato n'umutima w'ikigori. Iyo itabonywe kare mu byumweru 4 bya mbere nyuma yo kumera, yangiza umutima w'igihingwa ntikigire amahundo.",
    descriptionEn:
      "Fall Armyworm larvae feed deep inside the central whorl of young maize plants, leaving ragged windowpane holes and moist sawdust-like frass that stunts cob development.",
    symptomsRw: [
      "Utudirishya duto dusa n'aho urubabi rwaharitswe (windowpane feeding scars) ku mababi mashya",
      "Umwanda umeze nk'ibarizo ry'imbaho mu mutima w'ikigori (whorl frass)",
      "Amababi akura afite imyenge minini igaragara mu murima",
    ],
    symptomsEn: [
      "Translucent windowpane feeding patches on young emerging leaves (V2–V6 stage)",
      "Moist, yellowish-brown sawdust-like frass accumulating inside the central leaf whorl",
      "Ragged, perforated leaves and severed growing points ('dead heart') in severe cases",
    ],
    organicPreventionMethodsRw: [
      "Gukoresha uburyo bwa 'Push-Pull': gutera ubwatsi bwa Desmodium hagati mu mirongo y'ibigori n'urubingo (Napier grass) ku nkengero z'umurima",
      "Gutera ibigori hakiri kare imvura ya mbere ikigwa kugira ngo bikure nkongwa itaragwira",
      "Kuvanga ibigori n'ibishyimbo cyangwa soya mu murima umwe (intercropping) bifasha kongera udukoko twiza turwanya nkongwa",
      "Gusura umurima kabiri mu cyumweru ukoresha intoki ugakuramo amagi n'udusimba tukiri duto",
    ],
    organicPreventionMethodsEn: [
      "Adopt 'Push-Pull' climate-smart intercropping: plant Desmodium between maize rows to repel moths and Napier grass around borders to trap eggs",
      "Plant early with the first effective seasonal rains so maize passes the vulnerable V3–V6 whorl stage before peak moth flights",
      "Intercrop maize with bush beans or soybeans to harbor beneficial predatory wasps and earwigs",
      "Scout 20 plants along a W-pattern twice weekly and hand-crush egg masses on leaf undersides",
    ],
    organicBotanicalRecipeRw: {
      title: "Uburyo bw'Umwimerere bw'Ivumbi ry'Inkwi, Umucanga na Neem (Whorl Ash & Neem Protocol)",
      ingredients: "2 kg z'ivu ry'inkwi riyunguruye + 2 kg z'umucanga mwiza wumye + 100g z'ifu y'imbuto za Neem cyangwa Urusenda",
      preparationAndDosage: "Vanga ivu n'umucanga hamwe n'ifu ya Neem. Shyira akayiko gato (5g) mu mutima wa buri kigori kigaragaza ibimenyetso.",
      applicationTiming: "Shyiramo mu gitondo cyangwa nimugoroba; ivu n'umucanga bikomeretsa uruhu rw'inkongwa bikayibuza kurya umutima w'ikigori.",
    },
    organicBotanicalRecipeEn: {
      title: "Sieved Wood Ash, Fine Sand & Neem Botanical Whorl Application",
      ingredients: "2 kg sieved wood ash + 2 kg fine dry river sand + 100g crushed Neem seed powder (or Tephrosia leaf powder)",
      preparationAndDosage: "Mix thoroughly in a dry bucket. Drop one pinch (approx. 5g) directly into the central funnel (whorl) of each affected maize plant.",
      applicationTiming: "Apply at V3–V7 stage in the early morning; desiccates young larvae inside the whorl without synthetic chemicals.",
    },
    rabResistantVarieties: ["RHM 1407", "RHM 104", "WH 505", "PAN 53"],
    rabReferenceCode: "RAB-KB-MAZ-01",
  },
  {
    id: "kb-bean-anthracnose",
    cropCategoryId: "ibishyimbo",
    cropNameRw: "Ibishyimbo",
    cropNameEn: "Climbing & Bush Beans",
    diseaseNameRw: "Urubobi rw'Ibishyimbo (Anthracnose)",
    diseaseNameEn: "Bean Anthracnose",
    scientificName: "Colletotrichum lindemuthianum",
    pathogenType: "fungal",
    pathogenLabelRw: "Agahumyo gakwirakwizwa n'Imbuto n'Imvura",
    pathogenLabelEn: "Seed & Rain-Splash Fungal Pathogen",
    severityLevel: "High",
    agroZonesAffectedRw: "Amajyaruguru, Amajyepfo (Huye, Nyamagabe) n'Imisozi y'Iburengerazuba",
    agroZonesAffectedEn: "Northern Highlands, Southern Plateau & Western Ridge",
    weatherTriggerRw: "Imvura nyinshi itaruka ku mababi hamwe n'ubushyuhe buringaniye (15°C–22°C)",
    weatherTriggerEn: "Frequent rain splash, cool humid weather (15°C–22°C), and wet foliage",
    imageUrl: "/src/assets/images/bean_anthracnose_1790945809808.jpg",
    descriptionRw:
      "Urubobi rw'ibishyimbo rutera amabara yirabura ku mitsi y'amababi no ku mifuko y'ibishyimbo (imisogwe). Rwandurira cyane mu mbuto zisarurwa ku bihingwa birwaye.",
    descriptionEn:
      "Bean Anthracnose produces distinctive dark brick-red to black sunken lesions on pods, stems, and leaf veins, reducing both grain weight and market quality.",
    symptomsRw: [
      "Imitsi yo munsi y'amababi ihinduka umukara cyangwa ikigina cyijimye",
      "Utuziga tw'umukara dufite inkengero zitukura ku misogwe (pods) y'ibishyimbo",
      "Imbuto ziri mu musogwe warwaye zigira amabara y'ikigina",
    ],
    symptomsEn: [
      "Brick-red to purplish-black discoloration along the underside veins of trifoliate leaves",
      "Circular, sunken dark-brown cankers with raised reddish borders on developing green pods",
      "Discolored, shriveled seeds inside infected pods that carry the fungus to the next season",
    ],
    organicPreventionMethodsRw: [
      "Gutoranya imbuto zitarimo amabara n'iminkanyari, kandi ukazotsa ku zuba mbere yo kubika no gutera",
      "Gushingirira ibishyimbo by'imishingiriro hakoreshejwe imishingiriro miremire (2m) kugira ngo amababi ataguma ku butaka buhehereye",
      "Kwirinda kubagara cyangwa kugenda mu murima w'ibishyimbo mu gitondo amababi agitose ikime (bituma uduhumyo tudakwirakwira)",
      "Gusimburanya ibishyimbo n'ibigori cyangwa ibijumba nibura imyaka 2",
    ],
    organicPreventionMethodsEn: [
      "Strictly hand-sort clean, blemish-free seed from healthy mother plants and sun-dry thoroughly on clean tarpaulins",
      "Stake climbing beans promptly with 2.2m stakes so foliage stays aerated above damp soil splash",
      "Never walk through or weed bean plots while leaves are wet with morning dew or rain (prevents spore transfer)",
      "Incorporate well-decomposed farmyard compost and wood ash at planting to strengthen cell walls with potassium",
    ],
    organicBotanicalRecipeRw: {
      title: "Umuti w'Umwimerere w'Amababi y'Ipapayi, Bicarbonate na Tungurusumu",
      ingredients: "1 kg y'amababi y'ipapayi asekuye + 200g za tungurusumu + 30g za Bicarbonate de soude muri litiro 15 z'amazi",
      preparationAndDosage: "Sekura amababi y'ipapayi na tungurusumu, ubinike mu mazi amasaha 6, uyungurure kandi uvanze muri pompe.",
      applicationTiming: "Tera ku mababi no ku misogwe ikiri mito mu masaha ya mu gitondo hari akazuba.",
    },
    organicBotanicalRecipeEn: {
      title: "Papaya Leaf, Garlic & Baking Soda Bio-Fungicide Spray",
      ingredients: "1 kg crushed fresh papaya leaves + 200g garlic + 30g sodium bicarbonate + 20ml liquid soap in 15L water",
      preparationAndDosage: "Macerate papaya leaves and garlic in 2L water for 6 hours, filter through muslin cloth, top up to 15L and add baking soda.",
      applicationTiming: "Spray foliage and early pods during dry mid-morning hours every 10 days during rainy periods.",
    },
    rabResistantVarieties: ["MAC 44", "RWV 1129", "RWR 2245 (Bio-fortified Iron)", "CAB 2"],
    rabReferenceCode: "RAB-KB-BEN-01",
  },
  {
    id: "kb-banana-bxw",
    cropCategoryId: "urutoki",
    cropNameRw: "Urutoki (Ibitoki)",
    cropNameEn: "Highland Bananas",
    diseaseNameRw: "Kirabiranya y'Urutoki (BXW)",
    diseaseNameEn: "Banana Xanthomonas Wilt (BXW)",
    scientificName: "Xanthomonas campestris pv. musacearum",
    pathogenType: "bacterial",
    pathogenLabelRw: "udukoko twa Bagiteri (Bacterial Wilt)",
    pathogenLabelEn: "Systemic Bacterial Pathogen",
    severityLevel: "Critical",
    agroZonesAffectedRw: "Intara y'Iburasirazuba (Kayonza, Ngoma, Rwamagana), Inkengero za Kivu n'Amajyepfo",
    agroZonesAffectedEn: "Lake Kivu Belt, Eastern Banana Basin & Central Plateau",
    weatherTriggerRw: "Igihe cy'imvura n'iyororoka ry'udukoko tuguruka ku ndabyo z'imvano",
    weatherTriggerEn: "Year-round transmission via insect vectors on male buds and unsterilized cutting tools",
    imageUrl: "/src/assets/images/banana_bxw_wilt_1790945821983.jpg",
    descriptionRw:
      "Kirabiranya y'urutoki ni indwara iterwa na bagiteri ituma amababi y'insina ahinduka umuhondo akuma, imvano ikabora, kandi igitoki kikazamo amashereka y'umuhondo aho kwera neza.",
    descriptionEn:
      "Banana Xanthomonas Wilt is a systemic bacterial disease spread by insects visiting the male flower bud and by contaminated machetes/pruning knives.",
    symptomsRw: [
      "Amababi makuru ahinduka umuhondo uhereye ku nkombe akagenda aribwa kugeza ararabye",
      "Imvano (male bud) irarabirana ikuma uhereye ku ndabyo",
      "Iyo utemye umutumba cyangwa igitoki, hasohokamo amazi y'umuhondo (bacterial ooze) kandi imbere mu gitoki haba hijimye",
    ],
    symptomsEn: [
      "Progressive yellowing, wilting, and drooping of the youngest upper leaves",
      "Premature shriveling and blackening of the male flower bud (imvano)",
      "Yellowish-cream bacterial ooze exuding from cut pseudostems and rusty-brown internal fruit discoloration",
    ],
    organicPreventionMethodsRw: [
      "Gukura imvano (de-budding) ukoresheje ikibando gifite ikarahuri/ipfundo (forked wooden stick) igitoki kikimara kuzana ururabo rwa nyuma — ntukoreshe umuhoro!",
      "Gutwika cyangwa guhanagura umuhoro n'icyuma gishyushye cyangwa Jik (1:5) mbere yo kuva ku nsina imwe ujya ku yindi",
      "Kurandura insina yagaragaje ibimenyetso bya Kirabiranya ukayitaba mu cyobo mu murima kugira ngo itanduza izindi",
      "Gutera insina zisukuye zakuwe muri za laboratwari cyangwa pepiniyeri zemejwe na RAB (Tissue culture plantlets)",
    ],
    organicPreventionMethodsEn: [
      "Break off the male flower bud (gukura imvano) using a forked wooden stick as soon as the last female cluster forms — prevents insect vector transmission",
      "Flame-sterilize machetes and pruning knives over fire or dip in 20% household Jik bleach solution between every single banana mat",
      "Uproot and bury infected stems on-site in a deep compost pit and leave the spot fallow for 6 months",
      "Source clean, disease-free tissue-culture banana plantlets from RAB-accredited nurseries",
    ],
    organicBotanicalRecipeRw: {
      title: " Amabwiriza y'Isuku y'Ibikoresho n'Ifumbire y'Imborera Iboze (Sanitation & Ash Barrier)",
      ingredients: "Umuriro w'amakara/inkwi mu murima cyangwa amazi avanze na Jik (igice 1 cya Jik ku bice 4 by'amazi) + Ivu ry'inkwi",
      preparationAndDosage: "Shyira umuhoro mu muriro amasegonda 10 mbere yo gukonorera buri nsina. Nyuma yo gukuramo insina irwaye, minjagira ivu ryinshi mu mwobo.",
      applicationTiming: "Buri gihe uko ukonorera urutoki cyangwa ushyiramo isaso.",
    },
    organicBotanicalRecipeEn: {
      title: "On-Farm Flame Tool Sterilization & Wood Ash Soil Pit Sanitation",
      ingredients: "Field brazier flame (or 1:4 sodium hypochlorite solution) + 3 kg alkaline wood ash per uprooted mat pit",
      preparationAndDosage: "Heat machete blade over open flame until hot before cutting any leaf or sucker. Dust uprooted pits with wood ash to raise pH and suppress residual bacteria.",
      applicationTiming: "Mandatory during every pruning, desuckering, and harvesting operation.",
    },
    rabResistantVarieties: ["FHIA-17", "FHIA-25", "Mpologoma", "Injagi (Clean Tissue Culture)"],
    rabReferenceCode: "RAB-KB-BAN-01",
  },
  {
    id: "kb-cassava-mosaic",
    cropCategoryId: "imyumbati",
    cropNameRw: "Imyumbati",
    cropNameEn: "Cassava",
    diseaseNameRw: "Ububembe bw'Imyumbati (Cassava Mosaic Disease)",
    diseaseNameEn: "Cassava Mosaic Disease (CMD)",
    scientificName: "East African Cassava Mosaic Virus (EACMV)",
    pathogenType: "viral",
    pathogenLabelRw: "Virusi ikwirakwizwa n'Isazi z'Umweru (Whiteflies)",
    pathogenLabelEn: "Begomovirus (Whitefly-vectored)",
    severityLevel: "High",
    agroZonesAffectedRw: "Amajyepfo (Ruhango, Nyanza, Muhanga, Gisagara) na Bugesera",
    agroZonesAffectedEn: "Southern Mayaga Plateau, Bugesera & Eastern Lowlands",
    weatherTriggerRw: "Ubushyuhe bwinshi butuma isazi z'umweru (Bemisia tabaci) zororoka vuba",
    weatherTriggerEn: "Warm dry weather favoring whitefly (Bemisia tabaci) vector multiplication",
    imageUrl: "/src/assets/images/cassava_mosaic_disease_1790945832695.jpg",
    descriptionRw:
      "Ububembe bw'imyumbati ni indwara ya virusi ituma amababi agira amabara y'umuhondo n'icyatsi kibisi acagaguye, akihinahina, bigatuma imizi y'imyumbati iba mito cyane.",
    descriptionEn:
      "Cassava Mosaic Disease causes chlorotic yellow-green leaf mosaic patterns and leaf distortion, cutting root tuber yields by up to 70% if infected cuttings are planted.",
    symptomsRw: [
      "Amababi agira amabara y'umuhondo afashe mu cyatsi kibisi (mosaic pattern)",
      "Amababi akiri mato arahina, akagabanuka mu bunini kandi igiti kikagwingira",
      "Imizi y'imyumbati iba mike kandi mito mu gihe cy'isarura",
    ],
    symptomsEn: [
      "Distinctive yellow and pale-green chlorotic mosaic patches across palmate leaf blades",
      "Curling, twisting, and stunting of young emerging leaves and shoots",
      "Dwarfed plant stature and severely reduced storage root bulking",
    ],
    organicPreventionMethodsRw: [
      "Gutera ingeri z'imyumbati nshya zisukuye kandi zihanganira ububembe zatanzwe na RAB (nka NASE 14, Narocass 1)",
      "Kwirinda gufata ingeri zo gutera ku biti byagaragaje amababi y'umuhondo",
      "Kurandura hakiri kare (roguing) igiti cyose kigaragaje ububembe mu kwezi kwa mbere nyuma yo kumera",
      "Gutera utubuto twa Tagetes (Marigold) cyangwa urusenda ku nkengero z'umurima kugira ngo bikumire isazi z'umweru",
    ],
    organicPreventionMethodsEn: [
      "Exclusively plant certified virus-free stem cuttings of CMD-resistant varieties (NASE 14, Narocass 1)",
      "Inspect fields at 3–6 weeks after planting and rogue (uproot) any plant showing early mosaic leaf symptoms",
      "Plant border rows of Mexican marigold (Tagetes minuta) or basil to naturally repel whitefly vectors",
      "Avoid planting new cassava plots immediately downwind of older, infected cassava fields",
    ],
    organicBotanicalRecipeRw: {
      title: "Umuti w'Umwimerere wa Tephrosia (Umuruku) na Neem wirukana Isazi z'Umweru",
      ingredients: "500g z'amababi y'Umuruku (Tephrosia vogelii) cyangwa Neem + 40g z'isabune muri litiro 15 z'amazi",
      preparationAndDosage: "Sekura amababi y'umuruku cyangwa Neem uyashyire mu mazi ijoro ryose, uyungurure neza mbere yo gutera.",
      applicationTiming: "Tera munsi y'amababi mu masaha ya nimugoroba kugira ngo ukumire isazi z'umweru zikwirakwiza virusi.",
    },
    organicBotanicalRecipeEn: {
      title: "Neem & Tephrosia (Umuruku) Botanical Whitefly Repellent Spray",
      ingredients: "500g crushed fresh Tephrosia vogelii or Neem leaves + 40g mild natural soap in 15L water",
      preparationAndDosage: "Soak crushed leaves overnight in 3L water, strain carefully through cloth, dilute to 15L and add soap sticker.",
      applicationTiming: "Spray the undersides of young cassava leaves in the late afternoon to suppress whitefly vectors.",
    },
    rabResistantVarieties: ["NASE 14", "Narocass 1", "Mavoka", "TME 14"],
    rabReferenceCode: "RAB-KB-CAS-01",
  },
  {
    id: "kb-tomato-coffee-blight",
    cropCategoryId: "inyanya_ikawa",
    cropNameRw: "Inyanya & Ikawa",
    cropNameEn: "Tomatoes & Arabica Coffee",
    diseaseNameRw: "Kirabiranya n'Urubobi rw'Inyanya & Ikawa",
    diseaseNameEn: "Tomato Early Blight & Coffee Berry Disease (CBD)",
    scientificName: "Alternaria solani / Colletotrichum kahawae",
    pathogenType: "fungal",
    pathogenLabelRw: "Uduhumyo dufata Amababi n'Imbuto",
    pathogenLabelEn: "Foliar & Fruit Fungal Complex",
    severityLevel: "Moderate",
    agroZonesAffectedRw: "Uturere twose tw'u Rwanda (Huye, Rusizi, Nyamasheke, Rwamagana, Musanze)",
    agroZonesAffectedEn: "Lake Kivu Coffee Belt, Southern Plateau & Peri-Urban Horticulture Zones",
    weatherTriggerRw: "Ikime cya mu gitondo kivanze n'ubushyuhe bwa saa sita n'igicucu cyinshi",
    weatherTriggerEn: "Heavy morning dew, dense unpruned canopy humidity, and warm afternoons",
    imageUrl: "/src/assets/images/potato_late_blight_1790945783792.jpg",
    descriptionRw:
      "Mu nyanya n'ikawa, ubuhehere buguma mu mashami adakonorewe neza butera amabara y'uruziga ku mababi yo hasi no kwirabura kw'imbuto z'ikawa zitarera.",
    descriptionEn:
      "Target-like concentric rings on lower tomato leaves and dark sunken lesions on green coffee berries thrive when canopies remain dense and unmulched.",
    symptomsRw: [
      "Amabara y'uruziga rwigerekeranye (bullseye rings) ku mababi yo hasi y'inyanya",
      "Imbuto z'ikawa zikiri icyatsi zizaho ibibara by'umukara bikuma zigahunguka",
      "Amababi yo hasi ahinduka umuhondo agahunguka uhereye ku mizi",
    ],
    symptomsEn: [
      "Concentric 'target-board' brown rings on older lower tomato leaves progressing upward",
      "Dark, sunken brown-to-black spots on expanding green coffee cherries causing premature drop",
      "Defoliation of lower branches when soil splash contacts unmulched stems",
    ],
    organicPreventionMethodsRw: [
      "Gusasira inyanya n'ikawa hakoreshejwe ibyatsi byumye (mulching) kugira ngo amazi y'imvura adatarukira ku mababi yo hasi",
      "Gukonorera amashami yo hasi (pruning & desuckering) no gushingirira inyanya kugira ngo izuba n'umuyaga byinjire mu gihingwa",
      "Gusarura no gukuraho imbuto zose zagaragaje uburwayi ukazitaba kure y'umurima",
      "Gukoresha ifumbire y'imborera iboze neza irimo Trichoderma (uduhumyo twiza turinda imizi)",
    ],
    organicPreventionMethodsEn: [
      "Apply a 10cm organic straw mulch layer over the soil to block rain splash of soil-borne spores onto lower leaves",
      "Stake tomatoes and prune lower leaves (bottom 20cm) and coffee suckers to maximize sunlight penetration",
      "Strip and bury any mummified or blackened berries at the end of harvest to break the fungal cycle",
      "Enrich planting holes with well-cured compost inoculated with beneficial Trichoderma fungi",
    ],
    organicBotanicalRecipeRw: {
      title: "Icyayi cy'Ifumbire y'Imborera (Aerated Compost Tea) & Igisura",
      ingredients: "2 kg z'ifumbire y'imborera iboze neza + 500g z'amababi y'igisura (stinging nettle) muri litiro 20 z'amazi",
      preparationAndDosage: "Shyira ifumbire n'igisura mu gitambaro gipfumuye ubinike mu mazi iminsi 2 uvanga buri masaha 6, hanyuma uyungurure.",
      applicationTiming: "Tera ku mababi no ku mizi buri minsi 10; byongera ubudahangarwa bw'igihingwa.",
    },
    organicBotanicalRecipeEn: {
      title: "Aerated Compost Tea & Stinging Nettle (Igisura) Foliar Tonic",
      ingredients: "2 kg mature vermicompost + 500g fresh stinging nettle (Urtica) leaves steeped in 20L clean rainwater",
      preparationAndDosage: "Suspend compost and crushed nettle in a porous sack in 20L water for 36–48 hours, stirring aeratedly, then strain.",
      applicationTiming: "Spray foliage and drench root zones every 10–14 days in the cool morning.",
    },
    rabResistantVarieties: ["Anna F1", "Tengeru 97", "Ruiru 11 (Coffee)", "BM 139 (RAB Arabica)"],
    rabReferenceCode: "RAB-KB-HRT-01",
  },
];

interface CropDiseaseKnowledgeBaseProps {
  language: Language;
  onSelectForDiagnosis?: (entry: CropDiseaseCatalogEntry) => void;
}

export const CropDiseaseKnowledgeBase: React.FC<
  CropDiseaseKnowledgeBaseProps
> = ({ language, onSelectForDiagnosis }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCropFilter, setSelectedCropFilter] =
    useState<StapleCropCategoryId>("all");
  const [selectedPathogenFilter, setSelectedPathogenFilter] =
    useState<PathogenTypeId>("all");
  const [activeEntryId, setActiveEntryId] = useState<string>(
    RWANDA_CROP_DISEASE_KNOWLEDGE_BASE[0].id
  );
  const [loadedFeedbackId, setLoadedFeedbackId] = useState<string | null>(null);

  const cropFilterButtons: {
    id: StapleCropCategoryId;
    labelRw: string;
    labelEn: string;
  }[] = [
    { id: "all", labelRw: "Ibihingwa Byose", labelEn: "All Staple Crops" },
    { id: "ibirayi", labelRw: "Ibirayi", labelEn: "Potatoes" },
    { id: "ibigori", labelRw: "Ibigori", labelEn: "Maize" },
    { id: "ibishyimbo", labelRw: "Ibishyimbo", labelEn: "Beans" },
    { id: "urutoki", labelRw: "Urutoki", labelEn: "Bananas" },
    { id: "imyumbati", labelRw: "Imyumbati", labelEn: "Cassava" },
    { id: "inyanya_ikawa", labelRw: "Inyanya & Ikawa", labelEn: "Tomatoes & Coffee" },
  ];

  const pathogenFilterButtons: {
    id: PathogenTypeId;
    labelRw: string;
    labelEn: string;
  }[] = [
    { id: "all", labelRw: "Ubwoko Bwose", labelEn: "All Causes" },
    { id: "fungal", labelRw: "Uduhumyo (Fungal)", labelEn: "Fungal / Blight" },
    { id: "bacterial", labelRw: "Bagiteri (Bacterial)", labelEn: "Bacterial Wilt" },
    { id: "viral", labelRw: "Virusi (Viral)", labelEn: "Viral Mosaic" },
    { id: "pest", labelRw: "Ibyonyi (Pests)", labelEn: "Insect Pests" },
  ];

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return RWANDA_CROP_DISEASE_KNOWLEDGE_BASE.filter((entry) => {
      if (
        selectedCropFilter !== "all" &&
        entry.cropCategoryId !== selectedCropFilter
      ) {
        return false;
      }
      if (
        selectedPathogenFilter !== "all" &&
        entry.pathogenType !== selectedPathogenFilter
      ) {
        return false;
      }
      if (!q) return true;

      const searchableText = [
        entry.cropNameRw,
        entry.cropNameEn,
        entry.diseaseNameRw,
        entry.diseaseNameEn,
        entry.scientificName,
        entry.descriptionRw,
        entry.descriptionEn,
        entry.agroZonesAffectedRw,
        entry.agroZonesAffectedEn,
        ...entry.symptomsRw,
        ...entry.symptomsEn,
        ...entry.organicPreventionMethodsRw,
        ...entry.organicPreventionMethodsEn,
        entry.organicBotanicalRecipeRw.title,
        entry.organicBotanicalRecipeEn.title,
        ...entry.rabResistantVarieties,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [searchQuery, selectedCropFilter, selectedPathogenFilter]);

  const activeEntry = useMemo(
    () =>
      filteredEntries.find((e) => e.id === activeEntryId) ||
      filteredEntries[0] ||
      RWANDA_CROP_DISEASE_KNOWLEDGE_BASE[0],
    [filteredEntries, activeEntryId]
  );

  const handleLoadIntoScanner = (entry: CropDiseaseCatalogEntry) => {
    if (onSelectForDiagnosis) {
      onSelectForDiagnosis(entry);
      setLoadedFeedbackId(entry.id);
      window.setTimeout(() => setLoadedFeedbackId(null), 2500);
    }
  };

  return (
    <section
      aria-label="Crop Disease Knowledge Base"
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden"
    >
      {/* Header & Search Controls */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-teal-950 p-6 text-white space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>
                {language === "rw"
                  ? "Isomero ry'Indwara z'Ibihingwa & Uburyo Kamere bwo Kwirinda"
                  : "RAB Staple Crop Disease Knowledge Base & Organic Prevention Catalog"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {RWANDA_CROP_DISEASE_KNOWLEDGE_BASE.length}{" "}
                {language === "rw" ? "Indwara z'Ibihingwa" : "Reference Guides"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display">
              {language === "rw"
                ? "Shakisha Indwara z'Ibihingwa Ngandurarugo, Ibimenyetso & Umuti w'Umwimerere"
                : "Searchable Rwandan Crop Disease Catalog & Organic Prevention Guide"}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {language === "rw"
                ? " Reba amafoto y'ibimenyetso, uko indwara ifata ibirayi, ibigori, ibishyimbo, urutoki n'imyumbati, ndetse n'uburyo bw'umwimerere (Organic IPM) bwo kuyikumira mu buryo bworoheye umuhinzi."
                : "Explore high-resolution symptom photographs, botanical descriptions, and farm-ready organic prevention protocols for Rwanda's staple crops."}
            </p>
          </div>

          {/* Search Input */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === "rw"
                    ? "Shakisha indwara, igihingwa, cyangwa umuti (urugero: Urume, Nkongwa, Neem)..."
                    : "Search disease, staple crop, symptom, or organic remedy..."
                }
                aria-label="Search Crop Disease Knowledge Base"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-stone-900/90 border border-emerald-600/50 text-white placeholder:text-stone-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Filter Bars (Staple Crop + Pathogen Cause) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2 border-t border-emerald-800/60">
          {/* Staple Crop Segmented Control */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-200 mr-1 flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5" />
              {language === "rw" ? "Igihingwa:" : "Staple Crop:"}
            </span>
            {cropFilterButtons.map((btn) => {
              const isActive = selectedCropFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedCropFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-amber-400 text-stone-950 shadow-2xs"
                      : "bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800/80"
                  }`}
                >
                  {language === "rw" ? btn.labelRw : btn.labelEn}
                </button>
              );
            })}
          </div>

          {/* Pathogen Type Segmented Control */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-200 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              {language === "rw" ? " ikitera indwara:" : "Cause:"}
            </span>
            {pathogenFilterButtons.map((btn) => {
              const isActive = selectedPathogenFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedPathogenFilter(btn.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white text-stone-950 font-bold"
                      : "bg-stone-800/80 text-stone-300 hover:text-white"
                  }`}
                >
                  {language === "rw" ? btn.labelRw : btn.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Catalog Workspace: Left Catalog Grid + Right Detailed Inspector */}
      {filteredEntries.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
            {language === "rw"
              ? `Nta ndwara ihuye na "${searchQuery}" yabonetse.`
              : `No crop diseases matched "${searchQuery}".`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCropFilter("all");
              setSelectedPathogenFilter("all");
            }}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {language === "rw"
              ? "Erekana Indwara Zose"
              : "Reset Filters & Show All"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-200 dark:divide-stone-800">
          {/* Left 5 Columns: Searchable Catalog Cards */}
          <div className="lg:col-span-5 p-5 space-y-3 max-h-[820px] overflow-y-auto bg-stone-50/50 dark:bg-stone-900/40">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
              <span>
                {language === "rw"
                  ? `Habonetse indwara ${filteredEntries.length}`
                  : `Showing ${filteredEntries.length} staple crop diseases`}
              </span>
              <span>
                {language === "rw"
                  ? "Kanda ku ikarita usome birambuye"
                  : "Select an entry to inspect"}
              </span>
            </div>

            {filteredEntries.map((entry) => {
              const isSelected = entry.id === activeEntry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => setActiveEntryId(entry.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveEntryId(entry.id);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left flex gap-3.5 items-start ${
                    isSelected
                      ? "bg-white dark:bg-stone-800 border-emerald-600 ring-2 ring-emerald-600/20 shadow-sm"
                      : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-400"
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="w-24 h-20 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 shrink-0 border border-stone-200 dark:border-stone-700">
                    <img
                      src={entry.imageUrl}
                      alt={
                        language === "rw"
                          ? entry.diseaseNameRw
                          : entry.diseaseNameEn
                      }
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Card Text Content (Zero-Pill Unboxed Metadata) */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {language === "rw" ? entry.cropNameRw : entry.cropNameEn}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {language === "rw"
                          ? entry.pathogenLabelRw
                          : entry.pathogenLabelEn}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 dark:text-white leading-snug truncate">
                      {language === "rw"
                        ? entry.diseaseNameRw
                        : entry.diseaseNameEn}
                    </h3>

                    <p className="text-[11px] italic text-stone-500 dark:text-stone-400 truncate">
                      {entry.scientificName}
                    </p>

                    <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed pt-0.5">
                      {language === "rw"
                        ? entry.descriptionRw
                        : entry.descriptionEn}
                    </p>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                      isSelected
                        ? "text-emerald-600 translate-x-0.5"
                        : "text-stone-400"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Right 7 Columns: Detailed Visual Pathology & Organic Prevention Guide */}
          <div className="lg:col-span-7 p-6 space-y-6">
            {/* Top Hero Image + Primary Title */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-5 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-950 aspect-4/3">
                <img
                  src={activeEntry.imageUrl}
                  alt={
                    language === "rw"
                      ? activeEntry.diseaseNameRw
                      : activeEntry.diseaseNameEn
                  }
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="md:col-span-7 space-y-2.5">
                {/* Unboxed inline metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {language === "rw"
                      ? activeEntry.cropNameRw
                      : activeEntry.cropNameEn}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {language === "rw"
                      ? activeEntry.pathogenLabelRw
                      : activeEntry.pathogenLabelEn}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeEntry.rabReferenceCode}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-display leading-tight">
                  {language === "rw"
                    ? activeEntry.diseaseNameRw
                    : activeEntry.diseaseNameEn}
                </h3>

                <p className="text-xs italic text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <Microscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pathogen: {activeEntry.scientificName}</span>
                </p>

                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {language === "rw"
                    ? activeEntry.descriptionRw
                    : activeEntry.descriptionEn}
                </p>

                {onSelectForDiagnosis && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleLoadIntoScanner(activeEntry)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      {loadedFeedbackId === activeEntry.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>
                            {language === "rw"
                              ? "Yashyizwe muri AI Crop Doctor!"
                              : "Loaded into AI Diagnostic Studio!"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Stethoscope className="w-4 h-4 text-amber-300" />
                          <span>
                            {language === "rw"
                              ? "Suzuma iyi Ndwara muri Muganga wa AI"
                              : "Test & Analyze in AI Crop Doctor Studio"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AgroZone & Weather Trigger Context Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 dark:text-white block">
                    {language === "rw"
                      ? "Uturere & AgroZone Bikunze Kubonekamo"
                      : "Primary Rwandan AgroZones Affected"}
                  </span>
                  <span className="text-stone-600 dark:text-stone-300">
                    {language === "rw"
                      ? activeEntry.agroZonesAffectedRw
                      : activeEntry.agroZonesAffectedEn}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Sun className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 dark:text-white block">
                    {language === "rw"
                      ? "Ikirere Gitera Iyi Ndwara Kwiyongera"
                      : "Weather & Microclimate Trigger"}
                  </span>
                  <span className="text-stone-600 dark:text-stone-300">
                    {language === "rw"
                      ? activeEntry.weatherTriggerRw
                      : activeEntry.weatherTriggerEn}
                  </span>
                </div>
              </div>
            </div>

            {/* Symptoms & Organic Prevention Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Visual Symptoms */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-amber-600" />
                  <span>
                    {language === "rw"
                      ? "Ibimenyetso Wabonera mu Murima"
                      : "Field Diagnostic Symptoms"}
                  </span>
                </h4>
                <ul className="space-y-2">
                  {(language === "rw"
                    ? activeEntry.symptomsRw
                    : activeEntry.symptomsEn
                  ).map((symptom, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2 leading-relaxed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Organic & Cultural Prevention Methods */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/50 dark:bg-emerald-950/25 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === "rw"
                      ? "Uburyo Kamere bwo Kwirinda (Organic Prevention)"
                      : "Common Organic & Cultural Prevention Methods"}
                  </span>
                </h4>
                <ul className="space-y-2">
                  {(language === "rw"
                    ? activeEntry.organicPreventionMethodsRw
                    : activeEntry.organicPreventionMethodsEn
                  ).map((method, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-stone-800 dark:text-stone-200 flex items-start gap-2 leading-relaxed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{method}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* On-Farm Organic Botanical Preparation Box */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold flex items-center gap-2 text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {language === "rw"
                      ? activeEntry.organicBotanicalRecipeRw.title
                      : activeEntry.organicBotanicalRecipeEn.title}
                  </span>
                </h4>
                <span className="text-[11px] text-emerald-300">
                  {language === "rw"
                    ? "Uburyo bw'Umwimerere Budafite Uburozi"
                    : "Eco-Safe On-Farm Preparation"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/10 space-y-1">
                  <span className="font-bold text-amber-300 block">
                    {language === "rw"
                      ? "1. Ibikenerwa (Ingredients)"
                      : "1. Botanical Ingredients"}
                  </span>
                  <p className="text-emerald-50 leading-relaxed">
                    {language === "rw"
                      ? activeEntry.organicBotanicalRecipeRw.ingredients
                      : activeEntry.organicBotanicalRecipeEn.ingredients}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white/10 space-y-1">
                  <span className="font-bold text-amber-300 block">
                    {language === "rw"
                      ? "2. Uko Bitegurwa & Igipimo"
                      : "2. Preparation & Dosage"}
                  </span>
                  <p className="text-emerald-50 leading-relaxed">
                    {language === "rw"
                      ? activeEntry.organicBotanicalRecipeRw
                          .preparationAndDosage
                      : activeEntry.organicBotanicalRecipeEn
                          .preparationAndDosage}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white/10 space-y-1">
                  <span className="font-bold text-amber-300 block">
                    {language === "rw"
                      ? "3. Igihe cyo Gutera"
                      : "3. Safe Application Window"}
                  </span>
                  <p className="text-emerald-50 leading-relaxed">
                    {language === "rw"
                      ? activeEntry.organicBotanicalRecipeRw.applicationTiming
                      : activeEntry.organicBotanicalRecipeEn.applicationTiming}
                  </p>
                </div>
              </div>

              {/* RAB Tolerant Varieties Footer */}
              <div className="pt-2 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200">
                <div>
                  <span className="font-bold text-white">
                    {language === "rw"
                      ? "Imbuto zemejwe na RAB zihanganira iyi ndwara: "
                      : "RAB-Certified Tolerant Varieties: "}
                  </span>
                  <span>{activeEntry.rabResistantVarieties.join(" · ")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
