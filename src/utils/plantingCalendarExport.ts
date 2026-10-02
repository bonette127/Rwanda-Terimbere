import { Farm, FarmPlan, HarvestRecord, FarmActivity, Language } from "../types";
import { extractPredictedHarvestDate } from "./harvestNotifications";

export interface CalendarExportOptions {
  selectedFarmId: string; // "all" or specific farm ID
  selectedSeason: string; // "all" or e.g. "2026A"
  includePlantingDates: boolean;
  includeHarvestDates: boolean;
  includeGrowthMilestones: boolean;
  includeActualHarvestBatches: boolean;
  includeScheduledActivities: boolean;
  reminderDaysBefore: number; // e.g. 1, 2, or 7 days
}

export interface CalendarEventItem {
  id: string;
  uid: string;
  title: string;
  startDateIso: string; // "YYYY-MM-DD"
  endDateIso: string; // "YYYY-MM-DD" (inclusive or exclusive for all-day)
  isAllDay: boolean;
  description: string;
  location: string;
  category:
    | "planting"
    | "harvest_target"
    | "growth_milestone"
    | "harvest_batch"
    | "scheduled_activity";
  crop: string;
  farmName: string;
  seasonCode?: string;
  googleCalendarUrl: string;
}

/**
 * Normalizes any date string (ISO, YYYY-MM-DD, or DD/MM/YYYY) into "YYYY-MM-DD"
 */
export function normalizeDateToIso(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toISOString().split("T")[0];
  }
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes("T")) {
    return trimmed.split("T")[0];
  }
  // Check DD/MM/YYYY or DD-MM-YYYY
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

/**
 * Adds days to a "YYYY-MM-DD" string and returns a new "YYYY-MM-DD" string
 */
export function addDaysToIso(dateIso: string, days: number): string {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Estimates milestone day offset from timeline timing text like:
 * "Icyumweru 1", "Week 2", "Icyumweru 4", "Week 6-8", "Icyumweru 15"
 */
function parseTimingOffsetDays(timingStr?: string, defaultStep: number = 1): number {
  if (!timingStr) return defaultStep * 14;
  const match = timingStr.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // If it mentions week or icyumweru, multiply by 7
    const lower = timingStr.toLowerCase();
    if (lower.includes("cyumweru") || lower.includes("week") || lower.includes("semaine")) {
      return num * 7;
    }
    if (lower.includes("munsi") || lower.includes("day") || lower.includes("jour")) {
      return num;
    }
    if (lower.includes("kwezi") || lower.includes("month") || lower.includes("mois")) {
      return num * 30;
    }
    // Default assumed weeks if single digit
    return num <= 20 ? num * 7 : num;
  }
  return defaultStep * 14;
}

/**
 * Generates direct Google Calendar Web Event creation URL
 */
export function buildGoogleCalendarUrl(
  title: string,
  startDateIso: string,
  endDateIso: string,
  description: string,
  location: string
): string {
  // All day dates in Google Calendar: YYYYMMDD/YYYYMMDD (end date is exclusive)
  const startClean = startDateIso.replace(/-/g, "");
  // For all day event, end date is next day
  const endPlusOne = addDaysToIso(endDateIso, 1).replace(/-/g, "");
  const datesParam = `${startClean}/${endPlusOne}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: datesParam,
    details: description,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Escapes plain text for RFC 5545 iCalendar values
 */
function escapeIcsText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Extracts all calendar events according to the user's filter options
 */
export function extractCalendarEvents(
  plans: FarmPlan[],
  harvests: HarvestRecord[] = [],
  activities: FarmActivity[] = [],
  farms: Farm[] = [],
  options: CalendarExportOptions,
  language: Language = "rw"
): CalendarEventItem[] {
  const events: CalendarEventItem[] = [];
  const farmMap = new Map<string, Farm>();
  farms.forEach((f) => farmMap.set(f.id, f));

  // Filter plans by farm and season
  const filteredPlans = plans.filter((p) => {
    if (options.selectedFarmId !== "all" && p.farmId !== options.selectedFarmId) {
      return false;
    }
    if (options.selectedSeason !== "all" && p.seasonCode !== options.selectedSeason) {
      return false;
    }
    return true;
  });

  filteredPlans.forEach((plan) => {
    const farm = farmMap.get(plan.farmId);
    const farmName = plan.farmName || (farm ? farm.name : "Umurima");
    const district = farm ? farm.district : "Rwanda";
    const sector = farm ? farm.sector : "";
    const fullLocation = sector ? `${farmName}, ${sector}, ${district}, Rwanda` : `${farmName}, ${district}, Rwanda`;

    // 1. Planting Date Event
    if (options.includePlantingDates) {
      const plantedDateIso = normalizeDateToIso(plan.plantedDate || plan.createdAt);
      const title =
        language === "rw"
          ? `🌱 Gutera: ${plan.crop} (${plan.seasonCode}) - ${farmName}`
          : `🌱 Planting: ${plan.crop} (${plan.seasonCode}) - ${farmName}`;

      const desc = [
        language === "rw"
          ? `Gahunda yo gutera ${plan.crop} mu murima wa ${farmName}.`
          : `Planting plan for ${plan.crop} at ${farmName}.`,
        `Season: ${plan.seasonCode}`,
        `Land Size: ${plan.landSize} ${plan.unit}`,
        `Budget: ${plan.budget.toLocaleString()} RWF`,
        `Expected Yield: ${plan.expectedYieldKg.toLocaleString()} kg`,
        plan.rabTips ? `RAB Guidance: ${plan.rabTips}` : "",
        `Status: ${plan.status}`,
      ]
        .filter(Boolean)
        .join("\n");

      events.push({
        id: `planting-${plan.id}`,
        uid: `planting-${plan.id}@terimbere.rw`,
        title,
        startDateIso: plantedDateIso,
        endDateIso: plantedDateIso,
        isAllDay: true,
        description: desc,
        location: fullLocation,
        category: "planting",
        crop: plan.crop,
        farmName,
        seasonCode: plan.seasonCode,
        googleCalendarUrl: buildGoogleCalendarUrl(
          title,
          plantedDateIso,
          plantedDateIso,
          desc,
          fullLocation
        ),
      });
    }

    // 2. Predicted Harvest Target Window Event
    if (options.includeHarvestDates) {
      const harvestDateRaw = extractPredictedHarvestDate(plan);
      const harvestDateIso = normalizeDateToIso(
        harvestDateRaw ||
          (plan.daysToMaturity && plan.plantedDate
            ? addDaysToIso(normalizeDateToIso(plan.plantedDate), plan.daysToMaturity)
            : addDaysToIso(normalizeDateToIso(plan.createdAt), 90))
      );

      const title =
        language === "rw"
          ? `🌾 Isarura Ritezwe: ${plan.crop} (${plan.expectedYieldKg.toLocaleString()} kg) - ${farmName}`
          : `🌾 Target Harvest: ${plan.crop} (${plan.expectedYieldKg.toLocaleString()} kg) - ${farmName}`;

      const desc = [
        language === "rw"
          ? `Igihe giteganijwe cyo gusarura ${plan.crop} (${plan.seasonCode}) mu murima ${farmName}.`
          : `Target harvest window for ${plan.crop} (${plan.seasonCode}) at ${farmName}.`,
        `Expected Yield: ${plan.expectedYieldKg.toLocaleString()} kg (${(plan.expectedYieldKg / 1000).toFixed(1)} tons)`,
        `Target Price: ${plan.expectedPricePerKg} RWF/kg`,
        `Expected Net Profit: +${plan.expectedNetProfit.toLocaleString()} RWF`,
        plan.stageNotes ? `Growth Notes: ${plan.stageNotes}` : "",
        language === "rw"
          ? "Tegura imifuka ya PICS, ububiko bwumye, n'abaguzi kare."
          : "Prepare PICS hermetic bags, clean dry storage, and wholesale buyers in advance.",
      ]
        .filter(Boolean)
        .join("\n");

      events.push({
        id: `harvest-target-${plan.id}`,
        uid: `harvest-target-${plan.id}@terimbere.rw`,
        title,
        startDateIso: harvestDateIso,
        endDateIso: harvestDateIso,
        isAllDay: true,
        description: desc,
        location: fullLocation,
        category: "harvest_target",
        crop: plan.crop,
        farmName,
        seasonCode: plan.seasonCode,
        googleCalendarUrl: buildGoogleCalendarUrl(
          title,
          harvestDateIso,
          harvestDateIso,
          desc,
          fullLocation
        ),
      });
    }

    // 3. Growth Milestones (Derived from plan timeline)
    if (options.includeGrowthMilestones && plan.timeline && plan.timeline.length > 0) {
      const basePlantDate = normalizeDateToIso(plan.plantedDate || plan.createdAt);

      plan.timeline.forEach((step, idx) => {
        // Skip generic planting/harvest if already covered, or include with specific step guidance
        const offsetDays = parseTimingOffsetDays(step.timing, idx + 1);
        const stepDateIso = addDaysToIso(basePlantDate, offsetDays);

        const title =
          language === "rw"
            ? `🌿 ${step.title} (${plan.crop}) - ${farmName}`
            : `🌿 ${step.title} (${plan.crop}) - ${farmName}`;

        const desc = [
          `Crop: ${plan.crop} (${plan.seasonCode})`,
          `Parcel: ${farmName}`,
          `Timeline Stage: Step ${step.step} (${step.timing})`,
          `Agronomic Action: ${step.advice}`,
          plan.rabTips ? `RAB Note: ${plan.rabTips}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        events.push({
          id: `milestone-${plan.id}-${step.step}`,
          uid: `milestone-${plan.id}-${step.step}@terimbere.rw`,
          title,
          startDateIso: stepDateIso,
          endDateIso: stepDateIso,
          isAllDay: true,
          description: desc,
          location: fullLocation,
          category: "growth_milestone",
          crop: plan.crop,
          farmName,
          seasonCode: plan.seasonCode,
          googleCalendarUrl: buildGoogleCalendarUrl(
            title,
            stepDateIso,
            stepDateIso,
            desc,
            fullLocation
          ),
        });
      });
    }
  });

  // 4. Actual & Recorded Harvest Batches
  if (options.includeActualHarvestBatches && harvests.length > 0) {
    const filteredHarvests = harvests.filter((h) => {
      if (options.selectedFarmId !== "all" && h.farmId !== options.selectedFarmId) {
        return false;
      }
      return true;
    });

    filteredHarvests.forEach((h) => {
      const farm = farmMap.get(h.farmId);
      const farmName = h.farmName || (farm ? farm.name : "Umurima");
      const harvestDateIso = normalizeDateToIso(h.harvestDate);
      const location = h.storageLocation || (farm ? `${farm.district}, Rwanda` : "Rwanda");

      const title =
        language === "rw"
          ? `🧺 Umusaruro Wasaruwe: ${h.crop} (${h.quantityKg.toLocaleString()} kg - Icyiciro ${h.qualityGrade})`
          : `🧺 Harvest Batch: ${h.crop} (${h.quantityKg.toLocaleString()} kg - Grade ${h.qualityGrade})`;

      const desc = [
        `Harvest Batch Record: ${h.crop}`,
        `Quantity: ${h.quantityKg.toLocaleString()} kg`,
        `Quality Grade: Grade ${h.qualityGrade}`,
        `Storage Location: ${h.storageLocation}`,
        h.batchCode ? `Traceability Batch Code: ${h.batchCode}` : "",
        h.destinationMarket ? `Destination Market: ${h.destinationMarket}` : "",
        h.transporterName ? `Transporter: ${h.transporterName}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      events.push({
        id: `harvest-batch-${h.id}`,
        uid: `harvest-batch-${h.id}@terimbere.rw`,
        title,
        startDateIso: harvestDateIso,
        endDateIso: harvestDateIso,
        isAllDay: true,
        description: desc,
        location,
        category: "harvest_batch",
        crop: h.crop,
        farmName,
        googleCalendarUrl: buildGoogleCalendarUrl(
          title,
          harvestDateIso,
          harvestDateIso,
          desc,
          location
        ),
      });
    });
  }

  // 5. Scheduled Farm Activities (e.g. weeding, fertilizing, spraying, irrigation)
  if (options.includeScheduledActivities && activities.length > 0) {
    const scheduledActivities = activities.filter(
      (a) =>
        a.status !== "completed" &&
        (options.selectedFarmId === "all" || a.farmId === options.selectedFarmId)
    );

    scheduledActivities.forEach((act) => {
      const actDateIso = normalizeDateToIso(act.dueDate);
      const farmName = act.farmName || "Umurima";
      const title = `🚜 ${act.title} - ${farmName}`;

      const desc = [
        `Scheduled Farm Activity: ${act.title}`,
        `Category: ${act.category}`,
        `Parcel: ${farmName}`,
        act.crop ? `Crop: ${act.crop}` : "",
        act.notes ? `Field Notes: ${act.notes}` : "",
        `Due Date: ${actDateIso}`,
        `Status: ${act.status}`,
      ]
        .filter(Boolean)
        .join("\n");

      events.push({
        id: `activity-${act.id}`,
        uid: `activity-${act.id}@terimbere.rw`,
        title,
        startDateIso: actDateIso,
        endDateIso: actDateIso,
        isAllDay: true,
        description: desc,
        location: farmName,
        category: "scheduled_activity",
        crop: act.crop || "Farm Activity",
        farmName,
        googleCalendarUrl: buildGoogleCalendarUrl(
          title,
          actDateIso,
          actDateIso,
          desc,
          farmName
        ),
      });
    });
  }

  // Sort events chronologically
  events.sort((a, b) => a.startDateIso.localeCompare(b.startDateIso));

  return events;
}

/**
 * Builds standard RFC 5545 iCalendar format string (.ics)
 */
export function generateIcsCalendar(
  events: CalendarEventItem[],
  calendarName: string = "Terimbere Rwanda - Planting & Harvest Calendar",
  reminderDaysBefore: number = 1
): string {
  const nowIso = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Terimbere Smart Agriculture Rwanda//Planting Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    "X-WR-TIMEZONE:Africa/Kigali",
    "X-WR-CALDESC:Farm planting plans, growth milestones, and harvest dates tracked with Terimbere Smart Ag.",
  ];

  events.forEach((ev) => {
    // For all-day events in RFC 5545, DTSTART;VALUE=DATE:YYYYMMDD, and DTEND is the next day
    const dtstart = ev.startDateIso.replace(/-/g, "");
    const dtend = addDaysToIso(ev.endDateIso, 1).replace(/-/g, "");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${nowIso}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.title)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:TRANSPARENT");

    // Add reminder alarm (default 1 day before at 08:00 AM)
    if (reminderDaysBefore > 0) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeIcsText("Terimbere Reminder: " + ev.title)}`);
      lines.push(`TRIGGER:-P${reminderDaysBefore}D`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  // Join lines with standard CRLF
  return lines.join("\r\n");
}

/**
 * Triggers a browser download of the `.ics` calendar file
 */
export function downloadIcsFile(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates sample model plans for Rwanda if user has zero plans yet (clean slate)
 */
export function generateSamplePlantingPlans(farms: Farm[]): FarmPlan[] {
  const now = new Date();
  const year = now.getFullYear();
  const todayIso = now.toISOString().split("T")[0];

  const primaryFarm = farms[0] || {
    id: "farm-musanze-model",
    name: "Musanze Volcanic Highland Parcel",
    district: "Musanze",
    sector: "Kinigi",
    sizeHa: 1.2,
  };

  const secondaryFarm = farms[1] || {
    id: "farm-nyagatare-model",
    name: "Nyagatare Savanna Parcel",
    district: "Nyagatare",
    sector: "Mimuri",
    sizeHa: 2.0,
  };

  return [
    {
      id: "plan-model-potato",
      farmId: primaryFarm.id,
      farmName: primaryFarm.name,
      crop: "Ibirayi (Kinigi Seed Potato)",
      seasonCode: `${year}A`,
      landSize: 0.8,
      unit: "hegitari",
      budget: 680000,
      expectedYieldKg: 12500,
      expectedPricePerKg: 320,
      expectedGrossRevenue: 4000000,
      expectedNetProfit: 3320000,
      plantedDate: todayIso,
      predictedHarvestDate: addDaysToIso(todayIso, 95),
      daysToMaturity: 95,
      growthStagePercentage: 20,
      currentGrowthStage: "Kumera & Amashami (Vegetative Emergence)",
      rabTips: "Gukoresha imbuto ya Kinigi yemejwe na RAB, intera ya 75x30cm, no gusasira ifumbire y'imborera.",
      createdAt: todayIso,
      status: "active",
      budgetBreakdown: [
        { category: "Imbuto", amount: 320000, notes: "Imbuto ya Kinigi yemejwe na RAB" },
        { category: "Ifumbire", amount: 180000, notes: "NPK 17-17-17 & DAP" },
        { category: "Imiti", amount: 65000, notes: "Mancozeb yo kurinda urume" },
        { category: "Abakozi", amount: 115000, notes: "Guharura, gutera no kubagara" },
      ],
      timeline: [
        { step: 1, title: "Gutegura ubutaka & Gufumbira", timing: "Icyumweru 1", advice: "Gucukura santimetero 30 no gushyiramo imborera ishushe." },
        { step: 2, title: "Gutera imbuto nziza ya Kinigi", timing: "Icyumweru 2", advice: "Intera ya 75cm hagati y'imirongo na 30cm hagati y'ingeli." },
        { step: 3, title: "Kubagara & Gusasira ifumbire (Top-dressing)", timing: "Icyumweru 4", advice: "Gukoresha Urea no kwinjiza ifumbire mu butaka." },
        { step: 4, title: "Kureba ibimenyetso by'urume (Blight)", timing: "Icyumweru 7", advice: "Gutera umuti wa Ridomil cyangwa Dithane mu gitondo kare." },
        { step: 5, title: "Isarura n'Ubwanikiro", timing: "Icyumweru 14", advice: "Gusarura izuba ritari ryinshi, kwanika ahari igicucu n'umwuka mwiza." },
      ],
    },
    {
      id: "plan-model-maize",
      farmId: secondaryFarm.id,
      farmName: secondaryFarm.name,
      crop: "Ibigori (Hybrid Maize H629)",
      seasonCode: `${year}A`,
      landSize: 1.5,
      unit: "hegitari",
      budget: 520000,
      expectedYieldKg: 7800,
      expectedPricePerKg: 290,
      expectedGrossRevenue: 2262000,
      expectedNetProfit: 1742000,
      plantedDate: addDaysToIso(todayIso, -14),
      predictedHarvestDate: addDaysToIso(todayIso, 110),
      daysToMaturity: 125,
      growthStagePercentage: 35,
      currentGrowthStage: "Kumurika & Gutotoma (Knee-high vegetative)",
      rabTips: "Intera ya 75x25cm, gushyira ifumbire ya DAP mu mwobo wa mbere, Urea ku minsi 30 na 55.",
      createdAt: addDaysToIso(todayIso, -14),
      status: "active",
      budgetBreakdown: [
        { category: "Imbuto", amount: 140000, notes: "Hybrid Maize H629" },
        { category: "Ifumbire", amount: 210000, notes: "DAP & Urea" },
        { category: "Abakozi", amount: 120000, notes: "Gutera no kubagara kabiri" },
        { category: "Imifuka ya PICS", amount: 50000, notes: "Imifuka yo guhunika yemejwe" },
      ],
      timeline: [
        { step: 1, title: "Gutera imbuto y'ibigori", timing: "Icyumweru 1", advice: "Gushyira imbuto 1 mu mwobo ku ntera ya 75x25cm." },
        { step: 2, title: "Kubagara bwa mbere & Gufumbira Urea", timing: "Icyumweru 4", advice: "Gukura ibyatsi no gushyira Urea hafi y'uruti." },
        { step: 3, title: "Kugenzura Nkongwa y'ibigori (Fall Armyworm)", timing: "Icyumweru 6", advice: "Kureba mu mutima w'ibigori niba harimo amagi cyangwa udukoko." },
        { step: 4, title: "Isarura & Gusuzuma ubuhehere (Moisture ≤13.5%)", timing: "Icyumweru 17", advice: "Kwanika ku masaso meza mbere yo guhunika mu mifuka ya PICS." },
      ],
    },
    {
      id: "plan-model-beans",
      farmId: primaryFarm.id,
      farmName: primaryFarm.name,
      crop: "Ibishyimbo Birandata (Climbing Beans RWV 1129)",
      seasonCode: `${year}A`,
      landSize: 0.5,
      unit: "hegitari",
      budget: 310000,
      expectedYieldKg: 2400,
      expectedPricePerKg: 650,
      expectedGrossRevenue: 1560000,
      expectedNetProfit: 1250000,
      plantedDate: addDaysToIso(todayIso, -7),
      predictedHarvestDate: addDaysToIso(todayIso, 78),
      daysToMaturity: 85,
      growthStagePercentage: 25,
      currentGrowthStage: "Gushingirira (Staking stage)",
      rabTips: "Gushingirira hakiri kare ku ntera nziza kugira ngo ibishyimbo bidakora ku butaka.",
      createdAt: addDaysToIso(todayIso, -7),
      status: "active",
      budgetBreakdown: [
        { category: "Imbuto", amount: 85000, notes: "RWV 1129 Biofortified Iron Beans" },
        { category: "Ibiti byo gushingirira", amount: 110000, notes: "Imishingiriro 5000" },
        { category: "Ifumbire", amount: 75000, notes: "DAP & Imborera" },
        { category: "Abakozi", amount: 40000, notes: "Gushingirira no kubagara" },
      ],
      timeline: [
        { step: 1, title: "Gutera & Gufumbira", timing: "Icyumweru 1", advice: "Intera ya 50x20cm, imbuto 2 mu mwobo." },
        { step: 2, title: "Gushingirira (Staking)", timing: "Icyumweru 3", advice: "Gushinga imishingiriro ikomeye ku ntera iboneye." },
        { step: 3, title: "Isarura ry'ibishyimbo byumye", timing: "Icyumweru 12", advice: "Gusarura ibijumba byumye no kubihura ku masaso meza." },
      ],
    },
  ];
}
