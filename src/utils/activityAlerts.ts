import { ActivityAlertUrgency, FarmActivity, Language, ScheduledActivityAlert } from "../types";

/**
 * Normalizes a date to midnight UTC/local timestamp for accurate day difference calculations
 */
export const toMidnightTimestamp = (dateInput: Date | string): number => {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/**
 * Calculates the YYYY-MM-DD trigger date `leadDays` (default 2 days) prior to a scheduled due date
 */
export const calculateAdvanceAlertDate = (
  dueDateStr: string,
  leadDays: number = 2
): string => {
  if (!dueDateStr) return "";
  const parts = dueDateStr.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - leadDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const fallback = new Date(dueDateStr);
  if (isNaN(fallback.getTime())) return dueDateStr;
  fallback.setDate(fallback.getDate() - leadDays);
  return fallback.toISOString().split("T")[0];
};

/**
 * Evaluates whether an activity is a fertilizer or irrigation activity
 */
export const isFertilizerOrIrrigationActivity = (activity: FarmActivity): {
  isMatch: boolean;
  category: "fertilizing" | "irrigation";
} => {
  const cat = activity.category?.toLowerCase() || "";
  const title = activity.title?.toLowerCase() || "";
  const notes = activity.notes?.toLowerCase() || "";

  // Check category or keywords for fertilizing
  if (
    cat === "fertilizing" ||
    title.includes("fertiliz") ||
    title.includes("fumbire") ||
    title.includes("npk") ||
    title.includes("urea") ||
    title.includes("dap") ||
    title.includes("manure") ||
    title.includes("mborera") ||
    notes.includes("ifumbire") ||
    notes.includes("fertilizer")
  ) {
    return { isMatch: true, category: "fertilizing" };
  }

  // Check category or keywords for irrigation
  if (
    cat === "irrigation" ||
    title.includes("irrigat") ||
    title.includes("kuhira") ||
    title.includes("drip") ||
    title.includes("amazi") ||
    title.includes("watering") ||
    title.includes("sprinkler") ||
    notes.includes("kuhira") ||
    notes.includes("irrigation")
  ) {
    return { isMatch: true, category: "irrigation" };
  }

  return { isMatch: false, category: "fertilizing" };
};

export interface ActivityAlertFilterOptions {
  baseDate?: Date | string;
  maxDaysAhead?: number; // Default 3 days ahead as requested
  includeOverdue?: boolean;
}

/**
 * Evaluates activities and identifies scheduled fertilizer or irrigation activities
 * that are within 3 days (or overdue) of their due date.
 */
export const evaluateActivityAlerts = (
  activities: FarmActivity[],
  options: ActivityAlertFilterOptions = {}
): ScheduledActivityAlert[] => {
  const {
    baseDate = new Date(),
    maxDaysAhead = 3,
    includeOverdue = true,
  } = options;

  const baseTimestamp = toMidnightTimestamp(baseDate);

  const alerts: ScheduledActivityAlert[] = [];

  for (const activity of activities) {
    // Only pending or in_progress activities
    if (activity.status === "completed") continue;
    if (!activity.dueDate) continue;

    const matchInfo = isFertilizerOrIrrigationActivity(activity);
    if (!matchInfo.isMatch) continue;

    const dueTimestamp = toMidnightTimestamp(activity.dueDate);
    const diffMs = dueTimestamp - baseTimestamp;
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Filter by maxDaysAhead (e.g., 3 days ahead) and overdue status
    if (daysRemaining > maxDaysAhead) continue;
    if (daysRemaining < 0 && !includeOverdue) continue;

    let urgency: ActivityAlertUrgency;
    if (daysRemaining < 0) {
      urgency = "overdue";
    } else if (daysRemaining === 0) {
      urgency = "due_today";
    } else if (daysRemaining === 1) {
      urgency = "due_tomorrow";
    } else if (daysRemaining === 2) {
      urgency = "due_in_2_days";
    } else {
      urgency = "due_in_3_days";
    }

    const isThreeDaysBefore = daysRemaining === 3;
    const isTwoDaysBefore = daysRemaining === 2;
    const isFertilizer = matchInfo.category === "fertilizing";
    const alertTriggerDate =
      activity.alertTriggerDate || calculateAdvanceAlertDate(activity.dueDate, 2);

    // Build localized agronomic advisories based on category & Rwanda Agriculture Board (RAB) protocols
    let titleRw = "";
    let titleEn = "";
    let titleFr = "";
    let messageRw = "";
    let messageEn = "";
    let messageFr = "";
    let checklistRw: string[] = [];
    let checklistEn: string[] = [];
    let checklistFr: string[] = [];
    let suggestedInput = "";
    let weatherAdviceRw = "";
    let weatherAdviceEn = "";

    if (isFertilizer) {
      if (activity.fertilizerType) {
        const qtyPart = activity.amountKg ? ` · ${activity.amountKg} kg` : "";
        const npkPart = activity.npkRatio ? ` (${activity.npkRatio})` : "";
        suggestedInput = `${activity.fertilizerType}${npkPart}${qtyPart}`;
      } else {
        suggestedInput = activity.title.includes("Urea")
          ? "Urea (46% N) - 100 kg/ha"
          : activity.title.includes("DAP")
          ? "DAP (18-46-0) - 100 kg/ha"
          : "NPK 17-17-17 - 250 kg/ha (Smart Nkunganire)";
      }

      if (daysRemaining === 2) {
        titleRw = `🔔 Integuza y'Iminsi 2 Mbere: Gushyiramo Ifumbire kuri ${activity.crop}`;
        titleEn = `🔔 2-Day Advance Fertilizer Alert: ${activity.crop} Application in 2 Days`;
        titleFr = `🔔 Alerte Engrais (J-2) : Application prévue dans 2 jours pour ${activity.crop}`;
        messageRw = `Umurima wa ${activity.farmName}: Hasigaye iminsi 2 ngo ushyiremo ifumbire (${activity.dueDate}). Pima ingano y'ifumbire, tegura abakozi kandi ugenzure ko ubutaka buhehereye.`;
        messageEn = `Farm ${activity.farmName}: 2 days remaining until scheduled fertilizer application (${activity.dueDate}). Stage fertilizer bags on-site, brief workers, and verify root-zone moisture.`;
        messageFr = `Champ ${activity.farmName} : 2 jours avant l'application d'engrais (${activity.dueDate}). Préparez les sacs d'engrais et vérifiez l'humidité du sol.`;
      } else if (isThreeDaysBefore) {
        titleRw = `🚨 Integuza y'Ifumbire: Iminsi 3 isigaye kuri ${activity.crop}`;
        titleEn = `🚨 Fertilizer Alert: 3 Days Until Scheduled Application for ${activity.crop}`;
        titleFr = `🚨 Alerte Engrais : 3 jours avant l'application pour ${activity.crop}`;
        messageRw = `Umurima wa ${activity.farmName}: Tegura ifumbire n'abakozi iminsi 3 mbere. Genzura ko ubutaka bwawe buhehereye neza kandi ifumbire ibonetse muri Smart Nkunganire.`;
        messageEn = `Farm ${activity.farmName}: Prepare fertilizer stock and laborers 3 days ahead. Verify soil moisture and confirm NPK/Urea availability at your cooperative.`;
        messageFr = `Champ ${activity.farmName} : Préparez les engrais et la main-d'œuvre 3 jours à l'avance. Vérifiez l'humidité du sol et vos stocks certifiés.`;
      } else if (daysRemaining === 0) {
        titleRw = `⚡ Uyu Munsi: Gushyiramo Ifumbire kuri ${activity.crop}`;
        titleEn = `⚡ Due Today: Fertilizer Application for ${activity.crop}`;
        titleFr = `⚡ Aujourd'hui : Application d'engrais pour ${activity.crop}`;
        messageRw = `Koresha ifumbire uyu munsi mu gitondo hakiri kare. Shyira ifumbire ku ntera ya cm 10 ku giti kugira ngo utatwika imizi.`;
        messageEn = `Apply fertilizer today during early morning hours. Place 10cm from plant stem to protect delicate roots from burning.`;
        messageFr = `Appliquez les engrais aujourd'hui tôt le matin. Placez à 10 cm de la tige pour protéger les racines.`;
      } else if (daysRemaining < 0) {
        titleRw = `⚠️ Ifumbire Yarenze Igihe: ${activity.crop} (${Math.abs(daysRemaining)}d)`;
        titleEn = `⚠️ Overdue Fertilizer: ${activity.crop} (${Math.abs(daysRemaining)}d)`;
        titleFr = `⚠️ Engrais en Retard : ${activity.crop} (${Math.abs(daysRemaining)}d)`;
        messageRw = `Igihe cyo gushyiramo ifumbire kuri ${activity.crop} cyararenze. Kora iki gikorwa byihuse mbere y'uko igihingwa gikura nabi.`;
        messageEn = `Fertilizer application deadline passed for ${activity.crop}. Apply promptly to avoid nutrient deficiency in vegetative stage.`;
        messageFr = `Date d'application dépassée pour ${activity.crop}. Effectuez l'opération sans tarder.`;
      } else {
        titleRw = `🌱 Integuza y'Ifumbire: Hasigaye iminsi ${daysRemaining} (${activity.crop})`;
        titleEn = `🌱 Fertilizer Alert: ${daysRemaining} Days Left (${activity.crop})`;
        titleFr = `🌱 Alerte Engrais : ${daysRemaining} jours restants (${activity.crop})`;
        messageRw = `Umurima wa ${activity.farmName}: Tegura ifumbire izakoreshwa ku itariki ${activity.dueDate}.`;
        messageEn = `Farm ${activity.farmName}: Fertilizer application scheduled for ${activity.dueDate}. Ensure inputs are ready on site.`;
        messageFr = `Champ ${activity.farmName} : Application d'engrais prévue le ${activity.dueDate}. Préparez le matériel sur place.`;
      }

      checklistRw = [
        "Kugura ifumbire y'indobanure ya RAB muri Koperative cyangwa Agro-dealer",
        "Kugenzura ko ubutaka buhehereye (Ntukabishyire mu butaka bwumye cyane)",
        "Gushyira ifumbire ku ntera ya cm 5-10 ku mashami, ukarenzaho igitaka cya cm 2",
        "Kwirinda gushyira ifumbire mu gihe imvura nyinshi iguye ngo itayitembana",
      ];
      checklistEn = [
        "Procure RAB-certified fertilizer from cooperative agro-dealer via Smart Nkunganire",
        "Inspect field moisture level (never apply on parched dry or baking soil)",
        "Apply in continuous bands 5-10cm away from seedling collar and cover with 2cm soil",
        "Avoid applying immediately before forecasted torrential thunderstorms to prevent leaching",
      ];
      checklistFr = [
        "Acheter des engrais certifiés RAB auprès des coopératives agréées",
        "Vérifier le taux d'humidité du sol avant l'épandage",
        "Appliquer en bandes à 5-10 cm des tiges et recouvrir d'un peu de terre",
        "Éviter les jours de fortes pluies torrentielles pour prévenir le lessivage",
      ];
      weatherAdviceRw = "Meteo Rwanda: Ntukoreshe ifumbire mu gihe cy'imvura y'umurabyo cyangwa mu zuba ry'igikatu.";
      weatherAdviceEn = "Meteo Rwanda: Do not broadcast fertilizer under direct midday heat or severe storms.";
    } else {
      // Irrigation
      suggestedInput = "Amazi yo kuhira (Drip / Furrow) - Imbaga ya 15-20 mm";

      if (isThreeDaysBefore) {
        titleRw = `🚨 Integuza yo Kuhira: Iminsi 3 isigaye kuri ${activity.crop}`;
        titleEn = `🚨 Irrigation Alert: 3 Days Until Scheduled Cycle for ${activity.crop}`;
        titleFr = `🚨 Alerte Irrigation : 3 jours avant l'arrosage pour ${activity.crop}`;
        messageRw = `Umurima wa ${activity.farmName}: Tegura uburyo bwo kuhira iminsi 3 mbere. Genzura imiyoboro y'amazi, moteri cyangwa amatiyo ya drip irrigation.`;
        messageEn = `Farm ${activity.farmName}: Prepare irrigation equipment 3 days in advance. Check motorized pump fuel, filters, and drip lines.`;
        messageFr = `Champ ${activity.farmName} : Préparez les installations d'irrigation 3 jours à l'avance (tuyaux, motopompes, vannes).`;
      } else if (daysRemaining === 0) {
        titleRw = `💧 Uyu Munsi: Kuhira Umurima wa ${activity.crop}`;
        titleEn = `💧 Due Today: Irrigation Cycle for ${activity.crop}`;
        titleFr = `💧 Aujourd'hui : Cycle d'irrigation pour ${activity.crop}`;
        messageRw = `Uhira umurima wawe mu masaha ya mugitondo (06:00 - 08:30) kugira ngo amazi atazangizwa n'ubushyuhe bw'izuba.`;
        messageEn = `Execute your irrigation cycle between 06:00 - 08:30 AM to maximize absorption and eliminate solar leaf burn.`;
        messageFr = `Arrosez tôt le matin (06h00 - 08h30) pour maximiser l'absorption racinaire et limiter l'évaporation.`;
      } else if (daysRemaining < 0) {
        titleRw = `⚠️ Kuhira Byarenze Igihe: ${activity.crop} (${Math.abs(daysRemaining)}d)`;
        titleEn = `⚠️ Overdue Irrigation: ${activity.crop} (${Math.abs(daysRemaining)}d)`;
        titleFr = `⚠️ Irrigation en Retard : ${activity.crop} (${Math.abs(daysRemaining)}d)`;
        messageRw = `Iminsi yo kuhira yararenze. Genzura ubutumburuke bw'ubuhehere mu murima utange amazi byihuse.`;
        messageEn = `Scheduled irrigation overdue. Measure root zone dryness and supply moisture to prevent crop wilting.`;
        messageFr = `Retard d'irrigation. Contrôlez la zone racinaire et hydratez vos cultures immédiatement.`;
      } else {
        titleRw = `💧 Integuza yo Kuhira: Hasigaye iminsi ${daysRemaining} (${activity.crop})`;
        titleEn = `💧 Irrigation Alert: ${daysRemaining} Days Left (${activity.crop})`;
        titleFr = `💧 Alerte Irrigation : ${daysRemaining} jours restants (${activity.crop})`;
        messageRw = `Umurima wa ${activity.farmName}: Kuhira biteganyijwe ku itariki ${activity.dueDate}.`;
        messageEn = `Farm ${activity.farmName}: Irrigation scheduled for ${activity.dueDate}. Ensure reservoirs are topped up.`;
        messageFr = `Champ ${activity.farmName} : Irrigation programmée le ${activity.dueDate}.`;
      }

      checklistRw = [
        "Kugenzura amatiyo n'imiyoboro y'amazi ko itazibye",
        "Kuhira mu masaha ya mugitondo hakiri kare (06h00 - 08h30) cyangwa nimugoroba (16h30 - 18h30)",
        "Gupima ubuhehere ku bujyakuzimu bwa cm 15 mbere yo gutangira kuhira",
        "Kwirinda kurema ibinogo by'amazi ahahingwa ibirayi n'inyanya ngo bitoza imbuto",
      ];
      checklistEn = [
        "Inspect drip emitters, canals, and motorized pump fuel/filters",
        "Irrigate in cool morning (06:00 - 08:30 AM) or late afternoon (16:30 - 18:30 PM)",
        "Check root zone moisture depth (15cm) before initiating flow",
        "Prevent water stagnation around stems to prevent fungal rot and blight",
      ];
      checklistFr = [
        "Vérifier les filtres, canalisations et goutteurs d'irrigation",
        "Arroser aux heures fraîches du matin ou en fin d'après-midi",
        "Tester l'humidité du sol à 15 cm de profondeur",
        "Éviter la stagnation de l'eau pour prévenir le mildiou",
      ];
      weatherAdviceRw = "Meteo Rwanda: Niba hateganyijwe imvura mu masaha 24 ari imbere, gabanya ingano y'amazi yo kuhira.";
      weatherAdviceEn = "Meteo Rwanda: If rainfall is forecast within the next 24 hours, adjust irrigation volume.";
    }

    alerts.push({
      id: `alert-act-${activity.id}`,
      activityId: activity.id,
      farmId: activity.farmId,
      farmName: activity.farmName,
      crop: activity.crop,
      title: activity.title,
      category: matchInfo.category,
      dueDate: activity.dueDate,
      daysRemaining,
      urgency,
      isThreeDaysBefore,
      isTwoDaysBefore,
      alertTriggerDate,
      titleRw,
      titleEn,
      titleFr,
      messageRw,
      messageEn,
      messageFr,
      checklistRw,
      checklistEn,
      checklistFr,
      suggestedInput,
      weatherAdviceRw,
      weatherAdviceEn,
    });
  }

  // Sort alerts: 2-day fertilizer alerts, due today, tomorrow, and 3-day alerts first
  return alerts.sort((a, b) => {
    const priority = (alert: ScheduledActivityAlert) => {
      if (alert.category === "fertilizing" && alert.daysRemaining === 2) return 0; // Top prominence for 2-day fertilizer alert
      if (alert.daysRemaining === 0) return 1;
      if (alert.daysRemaining === 2) return 2;
      if (alert.daysRemaining === 1) return 3;
      if (alert.daysRemaining === 3) return 4;
      if (alert.daysRemaining < 0) return 5;
      return 6;
    };
    return priority(a) - priority(b);
  });
};

/**
 * Builds a 2-Day Advance Fertilizer Alert object for any scheduled fertilizer activity
 * (useful for previewing or simulating the 2-day alert even when the task is >2 days away)
 */
export const buildTwoDayFertilizerAlertForActivity = (
  activity: FarmActivity
): ScheduledActivityAlert => {
  const existing = evaluateActivityAlerts([activity], {
    maxDaysAhead: 365,
    includeOverdue: true,
  })[0];

  const alertTriggerDate =
    activity.alertTriggerDate || calculateAdvanceAlertDate(activity.dueDate, 2);
  const qtyText = activity.amountKg ? `${activity.amountKg} kg ` : "";
  const fertName = activity.fertilizerType || "NPK / Urea Fertilizer";

  return {
    id: existing?.id || `alert-act-${activity.id}`,
    activityId: activity.id,
    farmId: activity.farmId,
    farmName: activity.farmName,
    crop: activity.crop,
    title: activity.title,
    category: "fertilizing",
    dueDate: activity.dueDate,
    daysRemaining: existing ? existing.daysRemaining : 2,
    urgency: "due_in_2_days",
    isThreeDaysBefore: false,
    isTwoDaysBefore: true,
    alertTriggerDate,
    titleRw: `🔔 Integuza y'Iminsi 2 Mbere: Gushyiramo Ifumbire kuri ${activity.crop}`,
    titleEn: `🔔 2-Day Advance Fertilizer Alert: ${activity.crop} (${activity.farmName})`,
    titleFr: `🔔 Alerte Engrais (J-2) : Application prévue dans 2 jours (${activity.crop})`,
    messageRw: `Umurima wa ${activity.farmName}: Hasigaye iminsi 2 ngo ushyiremo ${qtyText}${fertName} ku itariki ya ${activity.dueDate}. Pima ingano y'ifumbire, tegura abakozi kandi ugenzure ko ubutaka buhehereye.`,
    messageEn: `Farm ${activity.farmName}: 2 days remaining until scheduled ${qtyText}${fertName} application on ${activity.dueDate}. Stage fertilizer bags on-site, brief workers, and verify soil moisture.`,
    messageFr: `Champ ${activity.farmName} : 2 jours avant l'application de ${qtyText}${fertName} (${activity.dueDate}). Préparez les intrants et vérifiez l'humidité du sol.`,
    checklistRw: existing?.checklistRw || [
      "Kugura no gupima ifumbire y'indobanure ya RAB (Smart Nkunganire)",
      "Kugenzura ko ubutaka buhehereye (Ntukabishyire mu butaka bwumye cyane)",
      "Gushyira ifumbire ku ntera ya cm 5-10 ku mashami, ukarenzaho igitaka cya cm 2",
      "Kwirinda gushyira ifumbire mu gihe imvura nyinshi iguye ngo itayitembana",
    ],
    checklistEn: existing?.checklistEn || [
      "Stage RAB-certified fertilizer bags from cooperative store 48 hours ahead",
      "Inspect root-zone soil moisture (never apply on parched dry soil)",
      "Place in bands or rings 5-10cm from plant stems and cover with 2cm soil",
      "Confirm Meteo Rwanda forecast has no heavy leaching storms on application day",
    ],
    checklistFr: existing?.checklistFr || [
      "Préparer les sacs d'engrais certifiés RAB 48h à l'avance",
      "Vérifier le taux d'humidité du sol avant l'épandage",
      "Appliquer à 5-10 cm des tiges et recouvrir de terre",
      "Vérifier les prévisions météo pour éviter le lessivage",
    ],
    suggestedInput:
      existing?.suggestedInput || `${fertName}${activity.npkRatio ? ` (${activity.npkRatio})` : ""}`,
    weatherAdviceRw:
      "Meteo Rwanda: Ntukoreshe ifumbire mu gihe cy'imvura y'umurabyo cyangwa mu zuba ry'igikatu.",
    weatherAdviceEn:
      "Meteo Rwanda: Apply during cool morning hours (06:30–09:30) when soil is moist.",
  };
};

/**
 * Plays an audible notification chime via browser Web Audio API.
 * Works completely offline with zero external audio assets!
 */
export const playNotificationChime = (): void => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First pleasant tone (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second higher chime tone (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn("Audio chime playback error:", e);
  }
};

/**
 * Triggers a simulated or real Web Push notification for a scheduled activity alert.
 * 1. Checks and requests browser Web Notification permission.
 * 2. Emits a custom DOM event 'terimbere:push_alert' for immediate in-app mobile push banner display.
 * 3. Plays an audible notification chime.
 */
export const triggerActivityPushNotification = async (
  alert: ScheduledActivityAlert,
  language: Language
): Promise<boolean> => {
  const title =
    language === "rw" ? alert.titleRw : language === "fr" ? alert.titleFr : alert.titleEn;
  const message =
    language === "rw" ? alert.messageRw : language === "fr" ? alert.messageFr : alert.messageEn;

  // Play auditory push notification bell tone
  playNotificationChime();

  // 1. Dispatch in-app simulated mobile push toast event
  window.dispatchEvent(
    new CustomEvent("terimbere:push_alert", {
      detail: {
        alert,
        title,
        message,
        timestamp: new Date().toISOString(),
      },
    })
  );

  // 2. Also try native browser Web Push Notification if supported and allowed
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: alert.id,
        });
        return true;
      } else if (Notification.permission !== "denied") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification(title, {
            body: message,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: alert.id,
          });
          return true;
        }
      }
    } catch (err) {
      console.warn("Browser Notification API call bypassed:", err);
    }
  }

  return true;
};
