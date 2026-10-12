import { ExpenseCategory, Farm, ProductionScale } from "../types";

export interface ParsedCsvRow {
  id: string;
  original: Record<string, string>;
  date: string;
  description: string;
  amount: number;
  // For Expenses:
  category?: ExpenseCategory;
  farmId?: string;
  farmName?: string;
  crop?: string;
  // For Sales:
  buyerName?: string;
  buyerType?: "cooperative" | "wholesaler" | "local_market" | "retail";
  quantityKg?: number;
  unitPriceRwf?: number;
  paymentMethod?: "momo" | "airtel" | "cash" | "bank";
  // For Harvests:
  qualityGrade?: "A" | "B" | "C";
  storageLocation?: string;
  batchCode?: string;
  destinationMarket?: string;
  transporterName?: string;
  seedInputKg?: number;
  fertilizerInputKg?: number;
  totalInputCostRwf?: number;
  areaHarvestedHa?: number;
  yieldPerHaTons?: number;
  scaleTier?: ProductionScale;
  // Validation / Selection:
  isValid: boolean;
  validationError?: string;
  isSelected: boolean;
}

export interface CsvColumnMapping {
  dateCol: string;
  descriptionCol: string;
  amountCol: string; // Or Debit / Credit / Paid / Received / Qty
  typeCol?: string; // e.g. DR/CR or Type
  creditCol?: string; // For dual debit/credit files
  categoryCol?: string;
  buyerCol?: string;
  qtyCol?: string;
  cropCol?: string;
  farmCol?: string;
  gradeCol?: string;
  storageCol?: string;
  batchCol?: string;
  destCol?: string;
  transporterCol?: string;
  seedInputCol?: string;
  fertInputCol?: string;
  areaCol?: string;
  inputCostCol?: string;
}

/**
 * Robust CSV parser that handles:
 * - Comma and semicolon delimiters
 * - Quoted fields with commas and line breaks
 * - Escaped quotes ("")
 */
export function parseCsvRaw(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return { headers: [], rows: [] };

  const lines = splitCsvLines(cleanText);
  if (lines.length < 1) return { headers: [], rows: [] };

  // Detect delimiter (, or ;)
  const firstLine = lines[0];
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

  const rawHeaders = parseCsvLine(firstLine, delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const headers = rawHeaders.map((h, i) => h || `Column_${i + 1}`);

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line, delimiter);
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = (values[idx] || "").trim().replace(/^["']|["']$/g, "");
    });
    // Check if row is not completely empty
    if (Object.values(rowObj).some((val) => val !== "")) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++; // skip \n
      }
      if (current.trim()) {
        lines.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    lines.push(current);
  }
  return lines;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

/**
 * Intelligent guess of column mapping based on standard Rwandan MoMo / Bank headers
 */
export function autoDetectColumns(headers: string[], mode: "expenses" | "sales" | "harvests"): CsvColumnMapping {
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Helper to find header by keywords
  const findCol = (keywords: string[]): string => {
    for (const kw of keywords) {
      const idx = lowerHeaders.findIndex((h) => h.includes(kw));
      if (idx !== -1) return headers[idx];
    }
    return "";
  };

  // 1. Date column
  const dateCol = findCol(["date", "itariki", "time", "period", "timestamp"]) || headers[0] || "";

  // 2. Description / Narration / Recipient / Details
  const descriptionCol =
    findCol([
      "description",
      "narration",
      "details",
      "particulars",
      "ubusobanuro",
      "beneficiary",
      "recipient",
      "sender",
      "nom",
      "libelle",
      "memo",
      "notes",
    ]) ||
    (headers.length > 2 ? headers[2] : headers[1]) ||
    "";

  // 3. Amount logic
  let amountCol = "";
  let creditCol = "";

  if (mode === "expenses") {
    // For expenses: look for Debit, Paid Out, Outflow, Amount, Withdrawal
    const debitCol = findCol(["debit", "paid out", "outflow", "withdrawal", "amafaranga yasohotse", "debit (rwf)"]);
    if (debitCol) {
      amountCol = debitCol;
    } else {
      amountCol = findCol(["amount", "total", "amafaranga", "cost", "rwf", "frw", "net"]) || headers[headers.length - 1] || "";
    }
  } else if (mode === "sales") {
    // For sales: look for Credit, Received, Inflow, Amount, Deposit
    const crCol = findCol(["credit", "received", "inflow", "deposit", "amafaranga yinjiye", "credit (rwf)"]);
    if (crCol) {
      amountCol = crCol;
      creditCol = crCol;
    } else {
      amountCol = findCol(["amount", "total", "amafaranga", "revenue", "price", "rwf", "frw"]) || headers[headers.length - 1] || "";
    }
  } else {
    // Harvests: quantity
    amountCol = findCol(["quantity", "qty", "ibiro", "kg", "tons", "weight", "volume", "amount"]) || headers[2] || "";
  }

  // Category / Buyer / Crop / Farm
  const categoryCol = findCol(["category", "icyiciro", "type", "expense type", "nature"]);
  const buyerCol = findCol(["buyer", "customer", "client", "umuguzi", "sender", "details", "offtaker", "off-taker"]);
  const cropCol = findCol(["crop", "igihingwa", "produce", "item", "variety", "culture"]);
  const qtyCol = findCol(["qty", "quantity", "ibiro", "kg", "weight", "volume", "recolte", "yield"]);
  const farmCol = findCol(["farm", "parcel", "umurima", "plot", "field", "isambu", "site"]);

  // Harvest specific columns
  const gradeCol = findCol(["grade", "quality", "quality grade", "classe", "icyiciro"]);
  const storageCol = findCol(["storage", "location", "ububiko", "warehouse", "depot", "store"]);
  const batchCol = findCol(["batch", "batch code", "lot", "code", "qr", "tracking"]);
  const destCol = findCol(["destination", "market", "isoko", "dest", "marche"]);
  const transporterCol = findCol(["transporter", "transport", "driver", "umutwayi", "chauffeur"]);
  const seedInputCol = findCol(["seed input", "seeds (kg)", "imbuto", "semence"]);
  const fertInputCol = findCol(["fertilizer input", "fertilizer (kg)", "ifumbire", "engrais"]);
  const areaCol = findCol(["area", "ha", "hectare", "ubuso", "size"]);
  const inputCostCol = findCol(["input cost", "cost (rwf)", "ikiguzi", "expenses", "cout"]);

  return {
    dateCol,
    descriptionCol,
    amountCol,
    creditCol,
    categoryCol,
    buyerCol,
    cropCol,
    qtyCol,
    farmCol,
    gradeCol,
    storageCol,
    batchCol,
    destCol,
    transporterCol,
    seedInputCol,
    fertInputCol,
    areaCol,
    inputCostCol,
  };
}

/**
 * Clean & parse numeric strings like "45,000 RWF", "-12.500", "RWF 300,000"
 */
export function cleanNumericValue(val: string | undefined): number {
  if (!val) return 0;
  // Remove currency signs, letters, spaces, keep digits, decimal dot, minus
  const cleaned = val
    .replace(/[^\d.-]/g, "")
    .replace(/(?!^)-/g, ""); // only leading minus
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Parse any date string into YYYY-MM-DD or readable Rwandan date
 */
export function normalizeDate(rawDate: string | undefined): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const trimmed = rawDate.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Try standard Date parsing
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  } catch {
    // ignore
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Smart Rwandan agricultural category matcher
 */
export function guessExpenseCategory(desc: string): ExpenseCategory {
  const s = desc.toLowerCase();

  // Labor
  if (
    s.includes("labor") ||
    s.includes("abakozi") ||
    s.includes("umukozi") ||
    s.includes("guhemba") ||
    s.includes("ibiraka") ||
    s.includes("salary") ||
    s.includes("wages") ||
    s.includes("weeding crew") ||
    s.includes("planting crew") ||
    s.includes("travailleur")
  ) {
    return "labor";
  }

  // Fertilizer
  if (
    s.includes("fertilizer") ||
    s.includes("ifumbire") ||
    s.includes("dap") ||
    s.includes("npk") ||
    s.includes("urea") ||
    s.includes("compost") ||
    s.includes("imborera") ||
    s.includes("engrais") ||
    s.includes("yaramila") ||
    s.includes("nkunganire")
  ) {
    return "fertilizer";
  }

  // Seeds
  if (
    s.includes("seed") ||
    s.includes("imbuto") ||
    s.includes("semence") ||
    s.includes("tubers") ||
    s.includes("seedling") ||
    s.includes("germoir") ||
    s.includes("certified seed")
  ) {
    return "seeds";
  }

  // Pesticides
  if (
    s.includes("pesticide") ||
    s.includes("umuti") ||
    s.includes("imiti") ||
    s.includes("mancozeb") ||
    s.includes("karate") ||
    s.includes("fungicide") ||
    s.includes("insecticide") ||
    s.includes("fongicide") ||
    s.includes("spray") ||
    s.includes("booster") ||
    s.includes("dudu")
  ) {
    return "pesticides";
  }

  // Transport
  if (
    s.includes("transport") ||
    s.includes("gutwara") ||
    s.includes("moto") ||
    s.includes("imodoka") ||
    s.includes("fuso") ||
    s.includes("daihatsu") ||
    s.includes("pickup") ||
    s.includes("fret") ||
    s.includes("livraison") ||
    s.includes("delivery") ||
    s.includes("toll") ||
    s.includes("gasoil") ||
    s.includes("essence")
  ) {
    return "transport";
  }

  // Irrigation
  if (
    s.includes("irrigation") ||
    s.includes("kuhira") ||
    s.includes("amazi") ||
    s.includes("water") ||
    s.includes("pump") ||
    s.includes("pompe") ||
    s.includes("motopompe") ||
    s.includes("pipe") ||
    s.includes("tiyaro") ||
    s.includes("hose") ||
    s.includes("solar pump")
  ) {
    return "irrigation";
  }

  // Equipment
  if (
    s.includes("equipment") ||
    s.includes("ibikoresho") ||
    s.includes("isuka") ||
    s.includes("umuhoro") ||
    s.includes("sprayer") ||
    s.includes("pulverisateur") ||
    s.includes("sac") ||
    s.includes("crate") ||
    s.includes("agashumi") ||
    s.includes("tractor") ||
    s.includes("imashini")
  ) {
    return "equipment";
  }

  return "other";
}

/**
 * Smart payment method guess
 */
export function guessPaymentMethod(desc: string): "momo" | "airtel" | "cash" | "bank" {
  const s = desc.toLowerCase();
  if (s.includes("momo") || s.includes("mtn") || s.includes("mobile money") || s.includes("*182")) {
    return "momo";
  }
  if (s.includes("airtel")) {
    return "airtel";
  }
  if (s.includes("bank") || s.includes("bk") || s.includes("equity") || s.includes("cheque") || s.includes("transfer") || s.includes("virement")) {
    return "bank";
  }
  return "momo";
}

/**
 * Smart buyer type guess
 */
export function guessBuyerType(buyer: string): "cooperative" | "wholesaler" | "local_market" | "retail" {
  const s = buyer.toLowerCase();
  if (s.includes("coop") || s.includes("koperative") || s.includes("cooperative") || s.includes("union")) {
    return "cooperative";
  }
  if (
    s.includes("wholesale") ||
    s.includes("nyabugogo") ||
    s.includes("milling") ||
    s.includes("factory") ||
    s.includes("inyange") ||
    s.includes("minimex") ||
    s.includes("processing") ||
    s.includes("depot") ||
    s.includes("bulk")
  ) {
    return "wholesaler";
  }
  if (s.includes("market") || s.includes("isoko") || s.includes("centre") || s.includes("agakiriro")) {
    return "local_market";
  }
  return "retail";
}

/**
 * Robust Category parser that maps raw text / keywords directly to valid ExpenseCategory
 */
export function parseCategoryValue(raw: string | undefined): ExpenseCategory {
  if (!raw) return "other";
  const s = raw.toLowerCase().trim();

  // Direct matches
  const validCategories: ExpenseCategory[] = [
    "seeds",
    "fertilizer",
    "pesticides",
    "labor",
    "irrigation",
    "transport",
    "equipment",
    "other",
  ];
  if (validCategories.includes(s as ExpenseCategory)) {
    return s as ExpenseCategory;
  }

  // Multilingual keyword mapping (Kinyarwanda, French, English)
  if (
    s.includes("seed") ||
    s.includes("imbuto") ||
    s.includes("semence") ||
    s.includes("seedling") ||
    s.includes("tuber") ||
    s.includes("germoir")
  ) {
    return "seeds";
  }

  if (
    s.includes("fert") ||
    s.includes("ifumbire") ||
    s.includes("engrais") ||
    s.includes("dap") ||
    s.includes("npk") ||
    s.includes("urea") ||
    s.includes("compost") ||
    s.includes("imborera") ||
    s.includes("yaramila")
  ) {
    return "fertilizer";
  }

  if (
    s.includes("pest") ||
    s.includes("umuti") ||
    s.includes("imiti") ||
    s.includes("fongicide") ||
    s.includes("insecticide") ||
    s.includes("spray") ||
    s.includes("mancozeb") ||
    s.includes("karate") ||
    s.includes("fungicide")
  ) {
    return "pesticides";
  }

  if (
    s.includes("labor") ||
    s.includes("abakozi") ||
    s.includes("umukozi") ||
    s.includes("salary") ||
    s.includes("wages") ||
    s.includes("ibiraka") ||
    s.includes("guhemba") ||
    s.includes("main d'oeuvre") ||
    s.includes("travail")
  ) {
    return "labor";
  }

  if (
    s.includes("irrig") ||
    s.includes("kuhira") ||
    s.includes("amazi") ||
    s.includes("pump") ||
    s.includes("water") ||
    s.includes("pompe")
  ) {
    return "irrigation";
  }

  if (
    s.includes("trans") ||
    s.includes("gutwara") ||
    s.includes("moto") ||
    s.includes("imodoka") ||
    s.includes("fuso") ||
    s.includes("delivery") ||
    s.includes("fret")
  ) {
    return "transport";
  }

  if (
    s.includes("equip") ||
    s.includes("ibikoresho") ||
    s.includes("outil") ||
    s.includes("isuka") ||
    s.includes("sprayer") ||
    s.includes("tractor") ||
    s.includes("crate")
  ) {
    return "equipment";
  }

  return "other";
}

/**
 * Parse Quality Grade ("A", "B", "C")
 */
export function parseGradeValue(raw: string | undefined): "A" | "B" | "C" {
  if (!raw) return "A";
  const s = raw.trim().toUpperCase();
  if (s.startsWith("B") || s.includes("GRADE B") || s.includes("B1") || s.includes("B2")) return "B";
  if (s.startsWith("C") || s.includes("GRADE C") || s.includes("C1")) return "C";
  return "A";
}

/**
 * Match farm from CSV column to application's farms list
 */
export function matchFarm(rawVal: string | undefined, farms: Farm[]): Farm | undefined {
  if (!rawVal || farms.length === 0) return undefined;
  const s = rawVal.trim().toLowerCase();

  // 1. Direct ID match
  const byId = farms.find((f) => f.id.toLowerCase() === s);
  if (byId) return byId;

  // 2. Direct Name match
  const byName = farms.find((f) => f.name.toLowerCase() === s);
  if (byName) return byName;

  // 3. Substring match
  const byPartial = farms.find(
    (f) =>
      f.name.toLowerCase().includes(s) ||
      s.includes(f.name.toLowerCase()) ||
      (f.district && s.includes(f.district.toLowerCase()))
  );
  if (byPartial) return byPartial;

  return undefined;
}

/**
 * Pre-packaged Rwandan Statements & Templates for 1-Click Simulation / Testing
 */

export const SAMPLE_MOMO_EXPENSES_CSV = `Date,Transaction ID,Details,Debit (RWF),Credit (RWF),Balance (RWF)
2026-09-18,TXN-8921102,Twahirwa Agro-dealers - DAP and NPK fertilizer,45000,,125000
2026-09-19,TXN-8921145,Paid to Jean Pierre - 8 Day-laborers Kinigi Potato Weeding,32000,,93000
2026-09-20,TXN-8921201,Certified Potato Seed Kinigi Spuds Cooperative,60000,,33000
2026-09-21,TXN-8921255,Moto Transport Sacks from field to Nyange center,8500,,24500
2026-09-22,TXN-8921310,Agri-Vet Pharmacy Mancozeb & Booster Spray,16500,,8000`;

export const SAMPLE_EXPENSES_STANDARD_CSV = `Date,Farm,Crop,Category,Amount (RWF),Description
2026-09-18,Kinigi Volcanic Farm,Ibirayi (Kinigi),fertilizer,52000,YaraMila Cereal and NPK 17-17-17 application
2026-09-19,Kinigi Volcanic Farm,Ibirayi (Kinigi),labor,36000,Weeding crew (6 casual workers x 6000 RWF)
2026-09-20,Nyagatare Karangazi Block,Ibigori (Hybrid H628),seeds,64000,Certified certified hybrid maize seed bags
2026-09-21,Nyagatare Karangazi Block,Ibigori (Hybrid H628),transport,18500,Transporting fertilizer from cooperative depot
2026-09-22,Huye Plateau Terraces,Ibishyimbo (RWR 2245),pesticides,24000,Fungicide spray for bean anthracnose prevention`;

export const SAMPLE_BANK_EXPENSES_CSV = `Date,Reference,Narration / Details,Debit,Credit,Balance
2026-09-15,BK-FT-202609-01,Irrigation Solar Water Pump downpayment,85000,,415000
2026-09-17,BK-FT-202609-04,Tractor ploughing rental service Musanze,40000,,375000
2026-09-19,BK-FT-202609-09,Bulk Organic Compost bags delivery,28000,,347000
2026-09-22,BK-FT-202609-12,Hand sprayers and harvesting crates purchase,22000,,325000`;

export const SAMPLE_MOMO_SALES_CSV = `Date,Transaction ID,Details / Sender,Amount (RWF),Type,Balance (RWF)
2026-09-18,TXN-902144,Nyabugogo Wholesale Buyer - 2500kg Potato Harvest,750000,Credit,820000
2026-09-19,TXN-902198,Kinigi Farmers Cooperative - Potato dividend payout,180000,Credit,1000000
2026-09-21,TXN-902250,Kigali Fresh Market - 500kg Premium Grade A Spuds,200000,Credit,1200000
2026-09-22,TXN-902315,Local School Feeding Program - 800kg Maize Supply,320000,Credit,1520000`;

export const SAMPLE_BANK_SALES_CSV = `Date,Reference,Narration / Off-taker,Debit,Credit,Balance
2026-09-16,BK-CR-4401,Rwanda Grain Milling Co - 3500kg Hybrid Maize Batch,0,1225000,1850000
2026-09-20,BK-CR-4432,Inyange Industries - Agro raw produce supply,0,640000,2490000
2026-09-22,BK-CR-4488,East Africa Potato Export Ltd - Grade A Consignment,0,980000,3470000`;

export const SAMPLE_HARVEST_CSV = `Date,Farm,Crop,Quantity (Kg),Quality Grade,Storage Location,Batch Code,Destination Market,Area (Ha),Seed Input (Kg),Fertilizer Input (Kg)
2026-09-17,Kinigi Volcanic Farm,Ibirayi (Kinigi),7500,A,Kinigi Modern Cold Storage B-1,RW-HARV-MUS-2026-101,Nyabugogo Wholesale Kigali,0.5,750,250
2026-09-19,Nyagatare Karangazi Block,Ibigori (Hybrid H628),5400,A,Koperative Nyagatare Grain Silo,RW-HARV-NYA-2026-102,Rwanda Grain Milling Co,1.2,30,120
2026-09-21,Huye Plateau Terraces,Ibishyimbo (RWR 2245),1850,B,Huye Valley Drying Crib,RW-HARV-HUY-2026-103,Huye Regional Market,0.8,65,70
2026-09-23,Kinigi Volcanic Farm,Ibirayi (Kinigi),3200,A,Kinigi Modern Cold Storage B-2,RW-HARV-MUS-2026-104,Rubavu Cross-Border Market,0.3,320,100`;

export const SAMPLE_HARVEST_EXPANDED_CSV = `Date,Farm,Crop,Quantity (Kg),Quality Grade,Storage Location,Batch Code,Destination Market,Transporter,Area (Ha),Seed Input (Kg),Fertilizer Input (Kg),Input Cost (RWF)
2026-09-17,Kinigi Volcanic Farm,Ibirayi (Kinigi),7500,A,Kinigi Modern Cold Storage B-1,RW-HARV-MUS-2026-101,Nyabugogo Wholesale Kigali,Koperative Transport Truck 1,0.5,750,250,145000
2026-09-19,Nyagatare Karangazi Block,Ibigori (Hybrid H628),5400,A,Koperative Nyagatare Grain Silo,RW-HARV-NYA-2026-102,Rwanda Grain Milling Co,Eastern Logistics Daihatsu,1.2,30,120,82000
2026-09-21,Huye Plateau Terraces,Ibishyimbo (RWR 2245),1850,B,Huye Valley Drying Crib,RW-HARV-HUY-2026-103,Huye Regional Market,Agro-Trans Co-op Pickup,0.8,65,70,54000
2026-09-23,Kinigi Volcanic Farm,Ibirayi (Kinigi),3200,A,Kinigi Modern Cold Storage B-2,RW-HARV-MUS-2026-104,Rubavu Cross-Border Market,Koperative Transport Truck 2,0.3,320,100,68000
2026-09-24,Nyagatare Karangazi Block,Ibigori (Hybrid H628),4100,B,Nyagatare Central Depot,RW-HARV-NYA-2026-105,Nyagatare Local Market,Farm Tractor Trailer,1.0,25,95,62000`;

