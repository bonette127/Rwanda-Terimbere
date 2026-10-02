import { FarmPlan, HarvestNotification, HarvestAlertUrgency } from "../types";

/**
 * Returns formatted date YYYY-MM-DD
 */
export const formatDateISO = (d: Date): string => {
  return d.toISOString().split("T")[0];
};

/**
 * Helper to get a date offset by N days from now
 */
export const getDateOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
};

/**
 * Parses a harvest date string from a plan.
 * Accepts ISO dates, textual dates (e.g., "20 Jun 2025"), or timeline harvest steps.
 */
export const extractPredictedHarvestDate = (plan: FarmPlan): string => {
  if (plan.predictedHarvestDate) {
    return plan.predictedHarvestDate;
  }

  // Look in timeline for harvest step
  if (plan.timeline && plan.timeline.length > 0) {
    const harvestStep = plan.timeline.find(
      (t) =>
        t.title.toLowerCase().includes("harvest") ||
        t.title.toLowerCase().includes("sarur") ||
        t.step === 6 ||
        t.step === 5
    );
    if (harvestStep && harvestStep.timing) {
      // Try parsing date or timing
      const parsed = Date.parse(harvestStep.timing);
      if (!isNaN(parsed)) {
        return formatDateISO(new Date(parsed));
      }
    }
  }

  // Fallback: estimate from createdAt or plantedDate + standard crop cycle
  const baseDate = plan.plantedDate ? new Date(plan.plantedDate) : new Date(plan.createdAt || Date.now());
  const cropLower = plan.crop.toLowerCase();

  let days = 95; // Default for potato
  if (cropLower.includes("kigori") || cropLower.includes("maize") || cropLower.includes("corn")) {
    days = 125;
  } else if (cropLower.includes("shyimbo") || cropLower.includes("bean")) {
    days = 80;
  } else if (cropLower.includes("nyanya") || cropLower.includes("tomato")) {
    days = 75;
  } else if (cropLower.includes("kawa") || cropLower.includes("coffee")) {
    days = 240;
  }

  const estHarvest = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return formatDateISO(estHarvest);
};

/**
 * Evaluates days remaining to harvest and builds a detailed, actionable alert
 */
export const evaluateHarvestAlert = (plan: FarmPlan): HarvestNotification | null => {
  const harvestDateStr = extractPredictedHarvestDate(plan);
  const harvestDate = new Date(harvestDateStr);
  const now = new Date();

  // Normalize dates to midnight for clean day counting
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const harvestMidnight = new Date(harvestDate.getFullYear(), harvestDate.getMonth(), harvestDate.getDate()).getTime();
  const diffMs = harvestMidnight - todayMidnight;
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Determine urgency
  let urgency: HarvestAlertUrgency;
  if (daysRemaining < 0) {
    urgency = "overdue";
  } else if (daysRemaining <= 3) {
    urgency = "urgent";
  } else if (daysRemaining <= 10) {
    urgency = "approaching";
  } else if (daysRemaining <= 21) {
    urgency = "upcoming";
  } else {
    // Too far in the future (> 21 days), don't trigger urgent notification yet
    return null;
  }

  // Localized Titles & Advisory
  let titleRw = "";
  let titleEn = "";
  let messageRw = "";
  let messageEn = "";
  let rabAdvisoryRw = "";
  let rabAdvisoryEn = "";

  const isPotato = plan.crop.toLowerCase().includes("ibirayi") || plan.crop.toLowerCase().includes("potato");
  const isMaize = plan.crop.toLowerCase().includes("kigori") || plan.crop.toLowerCase().includes("maize");

  if (urgency === "overdue") {
    const overdueDays = Math.abs(daysRemaining);
    titleRw = `⚠️ Isarura ryarenze igihe (${overdueDays} ${overdueDays === 1 ? "munsi" : "minsi"})!`;
    titleEn = `⚠️ Harvest overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}!`;
    messageRw = `Umusaruro wa ${plan.crop} ku murima ${plan.farmName} wari uteganijwe ku ya ${harvestDateStr}. Sarura byihuse wirinde kubora cyangwa kwangirika.`;
    messageEn = `Harvest for ${plan.crop} at ${plan.farmName} was scheduled for ${harvestDateStr}. Harvest promptly to prevent field loss or rot.`;
    rabAdvisoryRw = "Gusarura byihuse igihe ubutaka bworoshye bituma ibirayi bitaborera mu gitaka kandi bitangirika.";
    rabAdvisoryEn = "RAB Standard: Delaying harvest increases susceptibility to soil-borne fungi and bacterial soft rot.";
  } else if (urgency === "urgent") {
    if (daysRemaining === 0) {
      titleRw = `🚨 Isarura ni Uyu Munsi! (${plan.crop})`;
      titleEn = `🚨 Harvest is Today! (${plan.crop})`;
    } else {
      titleRw = `🚨 Isarura Riregereje: Hasigaye Iminsi ${daysRemaining}!`;
      titleEn = `🚨 Harvest in ${daysRemaining} Day${daysRemaining === 1 ? "" : "s"}!`;
    }
    messageRw = `Umusaruro wa ${plan.crop} (${plan.farmName}) ugeze mu gihe nyacyo cyo gusarurwa ku ya ${harvestDateStr}. Tegura ububiko, imifuka isukuye, n'abakozi.`;
    messageEn = `Optimal harvest window for ${plan.crop} (${plan.farmName}) is on ${harvestDateStr}. Prepare crates, ventilated storage, and casual laborers.`;
    rabAdvisoryRw = isPotato
      ? "Hagarika gutera imiti y'amoko yose. Cya ibirayi mu gitondo zuba rigitangira, ntukabyanike ku zuba ry'igikatu ngo bitaba icyatsi."
      : isMaize
      ? "Genkura ubuhehere bw'ibigori (Moisture content ≤13.5%) mbere yo kubihunika mu mifuka ya PICS."
      : "Hagarika imiti (Pre-Harvest Interval) kandi utegure ububiko bufite umwuka mwiza mbere yo gupakira.";
    rabAdvisoryEn = isPotato
      ? "RAB Rule: Cease all chemical sprays immediately. Harvest during dry morning hours; cure in shaded, ventilated shed to prevent greening."
      : "Ensure maize grain moisture is below 13.5% to prevent aflatoxin contamination before bag storage.";
  } else if (urgency === "approaching") {
    titleRw = `🌾 Iteganyagihe ry'Isarura: Hasigaye Iminsi ${daysRemaining}`;
    titleEn = `🌾 Harvest Approaching: ${daysRemaining} Days Left`;
    messageRw = `Isarura rya ${plan.crop} ryegereje ku ya ${harvestDateStr}. Menyesha koperative n'abacuruzi ba Nyabugogo/Mahoko kugira ngo bakatire umusaruro wose ku giciro cyiza.`;
    messageEn = `Harvest window for ${plan.crop} approaches on ${harvestDateStr}. Notify your cooperative and wholesale buyers at Kigali markets for pre-booking.`;
    rabAdvisoryRw = "Kora isuku mu bubiko ukoresheje amazi n'umuti wica udukoko (disinfection) iminsi 7 mbere yo kwinjiza umusaruro mushya.";
    rabAdvisoryEn = "Disinfect and ventilate storage areas at least 7 days prior to intake of newly harvested produce.";
  } else {
    // upcoming (11 - 21 days)
    titleRw = `📅 Itegure Isarura: Iminsi ${daysRemaining}`;
    titleEn = `📅 Harvest Preparation: ${daysRemaining} Days Out`;
    messageRw = `Gahunda y'umurima wa ${plan.farmName} yerekana ko isarura rya ${plan.crop} rizaba ku ya ${harvestDateStr}. Baza ibiciro by'isoko ry'ibiribwa.`;
    messageEn = `Farm plan shows ${plan.crop} harvest scheduled on ${harvestDateStr}. Monitor current market price trends to optimize timing.`;
    rabAdvisoryRw = "Genzura igipimo cyo gukura kw'ibijumba n'ibinyampeke. Tegura amakaziye n'imifuka yujuje ubuziranenge.";
    rabAdvisoryEn = "Inspect crop maturation uniformity and pre-order certified produce sacks or crates.";
  }

  return {
    id: `notif-${plan.id}-${harvestDateStr}`,
    planId: plan.id,
    farmId: plan.farmId,
    farmName: plan.farmName,
    crop: plan.crop,
    predictedHarvestDate: harvestDateStr,
    daysRemaining,
    urgency,
    titleRw,
    titleEn,
    messageRw,
    messageEn,
    rabAdvisoryRw,
    rabAdvisoryEn,
    expectedYieldKg: plan.expectedYieldKg,
    read: false,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Generates all harvest notifications from farm plans
 */
export const getHarvestNotificationsFromPlans = (plans: FarmPlan[]): HarvestNotification[] => {
  const notifications: HarvestNotification[] = [];

  for (const plan of plans) {
    if (plan.status === "completed") continue;
    const alert = evaluateHarvestAlert(plan);
    if (alert) {
      notifications.push(alert);
    }
  }

  // Sort: overdue first, then urgent (<3 days), then approaching (<10 days), then upcoming
  const priorityOrder: Record<HarvestAlertUrgency, number> = {
    urgent: 1,
    overdue: 2,
    approaching: 3,
    upcoming: 4,
  };

  return notifications.sort((a, b) => {
    if (priorityOrder[a.urgency] !== priorityOrder[b.urgency]) {
      return priorityOrder[a.urgency] - priorityOrder[b.urgency];
    }
    return a.daysRemaining - b.daysRemaining;
  });
};
