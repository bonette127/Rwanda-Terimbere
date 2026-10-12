import React, { useState, useEffect } from "react";
import {
  Language,
  Farm,
  FarmPlan,
  Expense,
  FarmActivity,
  HarvestRecord,
  SaleRecord,
  User,
  MarketPrice,
  TrainingCourse,
  CropDiagnosis,
  HiredLabor,
  TransportLog,
  DailyAgronomyTip,
  AuditLogEntry,
  TeamMember,
  ParcelSoilSensorReading,
  CropVarietyIrrigationRule,
  FertilizerApplicationLog,
} from "./types";
import {
  initialFarms,
  initialPlans,
  initialExpenses,
  initialActivities,
  initialHarvests,
  initialSales,
  initialUsers,
  marketPrices as initialMarketPrices,
  weatherForecasts,
  initialTrainingCourses,
  initialDiagnoses,
  initialHiredLabor,
  initialTransportLogs,
  initialFertilizerApplications,
  initialDailyAdvice,
  initialAuditLogs,
  initialTeamMembers,
} from "./data/mockData";
import { getTranslation } from "./i18n";
import { Header } from "./components/Header";
import { Navigation, NavTab } from "./components/Navigation";
import { DashboardView } from "./components/DashboardView";
import { CropDoctorView } from "./components/CropDoctorView";
import { OperationsLogView } from "./components/OperationsLogView";
import { CooperativeHubView } from "./components/CooperativeHubView";
import { LocationSuitabilityView } from "./components/LocationSuitabilityView";
import { FarmsView } from "./components/FarmsView";
import { PlansView } from "./components/PlansView";
import { ExpensesView } from "./components/ExpensesView";
import { ActivitiesView } from "./components/ActivitiesView";
import { HarvestSalesView } from "./components/HarvestSalesView";
import { ProfitAnalyticsView } from "./components/ProfitAnalyticsView";
import { AiAdvisorView } from "./components/AiAdvisorView";
import { TrainingView } from "./components/TrainingView";
import { MarketWeatherView } from "./components/MarketWeatherView";
import { AdminDashboardView } from "./components/AdminDashboardView";
import { SeasonReportView } from "./components/SeasonReportView";
import { AnalyticsSummaryView } from "./components/AnalyticsSummaryView";
import { PhoneMockupView } from "./components/PhoneMockupView";
import { AuthModal } from "./components/AuthModal";
import { ContactModal } from "./components/ContactModal";
import { UssdSimulatorModal } from "./components/UssdSimulatorModal";
import { ShareAppModal } from "./components/ShareAppModal";
import { ShareFarmAccessModal } from "./components/ShareFarmAccessModal";
import { NotificationCenterModal } from "./components/NotificationCenterModal";
import { SyncQueueModal } from "./components/SyncQueueModal";
import { BankLoanReportModal } from "./components/BankLoanReportModal";
import { SimulatedPushNotificationToast } from "./components/SimulatedPushNotificationToast";
import {
  QrScannerAndRecordModal,
  QrRecordType,
  QrModalMode,
} from "./components/QrScannerAndRecordModal";
import {
  exportFarmPerformancePdf,
  exportFarmPerformanceCsv,
} from "./utils/profitExport";
import { getHarvestNotificationsFromPlans } from "./utils/harvestNotifications";
import { evaluateActivityAlerts } from "./utils/activityAlerts";
import {
  evaluateIrrigationDemandAlerts,
  triggerIrrigationDemandPushNotification,
  DEFAULT_CRITICAL_HUMIDITY_THRESHOLD,
  DEFAULT_CROP_VARIETY_IRRIGATION_RULES,
} from "./utils/irrigationDemand";
import { getPendingSyncItems } from "./utils/syncQueue";
import {
  useGlobalDynamicDay,
  getDynamicDailyTipsForDate,
  getDynamicMarketPricesForDate,
} from "./utils/dynamicDayEngine";
import { GitHubRenderDeployModal } from "./components/GitHubRenderDeployModal";
import { OfflineBackupModal } from "./components/OfflineBackupModal";
import { PlantingCalendarExportModal } from "./components/PlantingCalendarExportModal";
import { FarmWorkflowGuideModal } from "./components/FarmWorkflowGuideModal";
import {
  OfflineBackupPayload,
  quickExportLocalOfflineJson,
} from "./utils/offlineJsonBackup";
import { Footer } from "./components/Footer";
import {
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Eye,
  Sparkles,
  Lock,
  UserPlus,
  LogIn,
  Cloud,
  Calendar,
  HardDriveDownload,
} from "lucide-react";

export function App() {
  // 1. Language state (defaults to Kinyarwanda)
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("terimbere_lang");
    return (saved as Language) || "rw";
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("terimbere_lang", lang);
  };

  const t = getTranslation(language);

  // Global Dynamic Day Engine: automatically tracks the current calendar day & Rwandan agricultural season
  const dynamicDayState = useGlobalDynamicDay();

  // 2. Active Tab state
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");

  // Registered users list (Clean Slate: starts empty with zero test users)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_users");
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  // 3. User Authentication state (Clean Slate: no pre-loaded test user)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_current_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [isUssdModalOpen, setIsUssdModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isShareFarmModalOpen, setIsShareFarmModalOpen] = useState<boolean>(false);
  const [isExportReportModalOpen, setIsExportReportModalOpen] = useState<boolean>(false);
  const [isOfflineBackupModalOpen, setIsOfflineBackupModalOpen] = useState<boolean>(false);
  const [isPlantingCalendarExportOpen, setIsPlantingCalendarExportOpen] = useState<boolean>(false);
  const [isWorkflowGuideOpen, setIsWorkflowGuideOpen] = useState<boolean>(false);
  const [shareTargetFarmId, setShareTargetFarmId] = useState<string | null>(null);
  const [simulatedMember, setSimulatedMember] = useState<TeamMember | null>(null);
  const [bgTheme, setBgTheme] = useState<"terraces" | "highlands" | "sunrise">("terraces");

  // QR Code Generator, Camera Scanner & Direct Scanned Record Details state
  const [isQrRecordModalOpen, setIsQrRecordModalOpen] = useState<boolean>(false);
  const [qrModalMode, setQrModalMode] = useState<QrModalMode>("qr_label");
  const [qrRecordType, setQrRecordType] = useState<QrRecordType>("parcel");
  const [qrSelectedFarm, setQrSelectedFarm] = useState<Farm | null>(null);
  const [qrSelectedHarvest, setQrSelectedHarvest] = useState<HarvestRecord | null>(null);

  const backgroundImages = {
    terraces: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&auto=format&fit=crop&q=80",
    highlands: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1920&auto=format&fit=crop&q=80",
    sunrise: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&auto=format&fit=crop&q=80",
  };

  // 4. Phone Mockup View Toggle
  const [isPhoneView, setIsPhoneView] = useState<boolean>(false);

  // 5. Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("terimbere_theme");
    return saved === "dark";
  });

  useEffect(() => {
    localStorage.setItem("terimbere_theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // 6. Online/Offline simulation state
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // 7. Core Entities state with Clean-Slate LocalStorage persistence (zero pre-loaded sample data)
  const [farms, setFarms] = useState<Farm[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_farms");
    if (!saved) return initialFarms;
    try {
      return JSON.parse(saved);
    } catch {
      return initialFarms;
    }
  });

  const [plans, setPlans] = useState<FarmPlan[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_plans");
    if (!saved) return initialPlans;
    try {
      return JSON.parse(saved);
    } catch {
      return initialPlans;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_expenses");
    if (!saved) return initialExpenses;
    try {
      return JSON.parse(saved);
    } catch {
      return initialExpenses;
    }
  });

  const [activities, setActivities] = useState<FarmActivity[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_activities");
    if (!saved) return initialActivities;
    try {
      return JSON.parse(saved);
    } catch {
      return initialActivities;
    }
  });

  const [harvests, setHarvests] = useState<HarvestRecord[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_harvests");
    if (!saved) return initialHarvests;
    try {
      return JSON.parse(saved);
    } catch {
      return initialHarvests;
    }
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_sales");
    return saved ? JSON.parse(saved) : initialSales;
  });

  // Handle direct phone camera QR scan deep-links (?qrType=parcel&qrId=... or ?qrType=harvest&qrId=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qType = params.get("qrType");
    const qId = params.get("qrId");
    if ((qType === "parcel" || qType === "harvest") && qId) {
      if (qType === "parcel") {
        const matchedFarm =
          farms.find((f) => f.id.toLowerCase() === qId.toLowerCase()) || farms[0] || null;
        setQrRecordType("parcel");
        setQrSelectedFarm(matchedFarm);
        setQrModalMode("details");
        setCurrentTab("farms");
        setIsQrRecordModalOpen(true);
      } else {
        const matchedHarvest =
          harvests.find(
            (h) =>
              h.id.toLowerCase() === qId.toLowerCase() ||
              (h.batchCode && h.batchCode.toLowerCase() === qId.toLowerCase())
          ) ||
          harvests[0] ||
          null;
        setQrRecordType("harvest");
        setQrSelectedHarvest(matchedHarvest);
        setQrModalMode("details");
        setCurrentTab("harvestSales");
        setIsQrRecordModalOpen(true);
      }
    }
  }, []);

  const handleOpenParcelQr = (
    farm: Farm | null,
    mode: QrModalMode = "qr_label"
  ) => {
    setQrRecordType("parcel");
    setQrSelectedFarm(farm);
    setQrModalMode(mode);
    setIsQrRecordModalOpen(true);
  };

  const handleOpenHarvestQr = (
    harvest: HarvestRecord | null,
    mode: QrModalMode = "qr_label"
  ) => {
    setQrRecordType("harvest");
    setQrSelectedHarvest(harvest);
    setQrModalMode(mode);
    setIsQrRecordModalOpen(true);
  };

  const handleSelectRecordFromScan = (type: QrRecordType, id: string) => {
    if (type === "parcel") {
      const found = farms.find((f) => f.id === id) || farms[0] || null;
      setQrRecordType("parcel");
      setQrSelectedFarm(found);
      setCurrentTab("farms");
    } else {
      const found =
        harvests.find((h) => h.id === id || h.batchCode === id) || harvests[0] || null;
      setQrRecordType("harvest");
      setQrSelectedHarvest(found);
      setCurrentTab("harvestSales");
    }
  };

  const [marketPricesList, setMarketPricesList] = useState<MarketPrice[]>(() =>
    getDynamicMarketPricesForDate(dynamicDayState.dateIso)
  );

  const [trainingCourseList, setTrainingCourseList] = useState<TrainingCourse[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_training_courses");
    return saved ? JSON.parse(saved) : initialTrainingCourses;
  });

  // New modules state: Crop Diagnoses, Hired Labor, Transport Logs, Daily Tips, Audit Logs
  const [diagnoses, setDiagnoses] = useState<CropDiagnosis[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_diagnoses");
    return saved ? JSON.parse(saved) : initialDiagnoses;
  });

  const [hiredLaborList, setHiredLaborList] = useState<HiredLabor[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_hired_labor");
    return saved ? JSON.parse(saved) : initialHiredLabor;
  });

  const [transportLogsList, setTransportLogsList] = useState<TransportLog[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_transport_logs");
    return saved ? JSON.parse(saved) : initialTransportLogs;
  });

  const [fertilizerApplications, setFertilizerApplications] = useState<
    FertilizerApplicationLog[]
  >(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_fertilizer_applications");
    return saved ? JSON.parse(saved) : initialFertilizerApplications;
  });

  useEffect(() => {
    localStorage.setItem(
      "terimbere_clean_v1_fertilizer_applications",
      JSON.stringify(fertilizerApplications)
    );
  }, [fertilizerApplications]);

  const handleAddFertilizerApplication = (app: FertilizerApplicationLog) => {
    setFertilizerApplications((prev) => [app, ...prev]);
    showToast(
      language === "rw"
        ? `Ifumbire ya ${app.fertilizerType} (${app.amountKg} kg kuri ${app.areaAppliedHa} Ha) yanditswe neza!`
        : `Recorded ${app.amountKg} kg of ${app.fertilizerType} (${app.npkRatio}) on ${app.areaAppliedHa} Ha!`
    );
  };

  const [dailyTipsList, setDailyTipsList] = useState<DailyAgronomyTip[]>(() =>
    getDynamicDailyTipsForDate(dynamicDayState.dateIso)
  );

  // Automatically refresh daily agronomy tips & market prices when the calendar day changes
  useEffect(() => {
    setDailyTipsList(getDynamicDailyTipsForDate(dynamicDayState.dateIso));
    setMarketPricesList(getDynamicMarketPricesForDate(dynamicDayState.dateIso));
  }, [dynamicDayState.dateIso]);

  const [auditLogsList, setAuditLogsList] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_audit_logs");
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  // Team Collaboration Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem("terimbere_clean_v1_team_members");
    if (!saved) return initialTeamMembers;
    try {
      return JSON.parse(saved);
    } catch {
      return initialTeamMembers;
    }
  });

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_team_members", JSON.stringify(teamMembers));
  }, [teamMembers]);

  // Harvest Cycle Notifications State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("terimbere_read_notifs");
    return saved ? JSON.parse(saved) : [];
  });
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("terimbere_dismissed_notifs");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("terimbere_read_notifs", JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  useEffect(() => {
    localStorage.setItem("terimbere_dismissed_notifs", JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  // Derive notifications dynamically from farm plans
  const rawHarvestNotifications = getHarvestNotificationsFromPlans(plans);
  const harvestNotifications = rawHarvestNotifications
    .filter((n) => !dismissedNotificationIds.includes(n.id))
    .map((n) => ({
      ...n,
      read: readNotificationIds.includes(n.id),
    }));

  // Derive 3-day advance alerts dynamically from scheduled farm activities (fertilizer & irrigation)
  const rawScheduledActivityAlerts = evaluateActivityAlerts(activities);
  const scheduledActivityAlerts = rawScheduledActivityAlerts.filter(
    (a) => !dismissedNotificationIds.includes(a.id)
  );

  // Irrigation Demand & Real-Time Low-Humidity Climate Alert State
  const [wateredFarmIdsToday, setWateredFarmIdsToday] = useState<string[]>(() => {
    const saved = localStorage.getItem("terimbere_watered_farms_today");
    return saved ? JSON.parse(saved) : [];
  });
  const [criticalHumidityThreshold, setCriticalHumidityThreshold] = useState<number>(
    DEFAULT_CRITICAL_HUMIDITY_THRESHOLD
  );
  const [humidityOverridesByDistrict, setHumidityOverridesByDistrict] = useState<
    Record<string, number>
  >({
    Nyagatare: 48,
  });
  const [isHumiditySimulated, setIsHumiditySimulated] = useState<boolean>(false);
  const [sensorReadingsByFarmId, setSensorReadingsByFarmId] = useState<
    Record<string, ParcelSoilSensorReading>
  >(() => {
    try {
      const saved = localStorage.getItem("terimbere_parcel_soil_sensors");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [cropVarietyRules, setCropVarietyRules] = useState<
    CropVarietyIrrigationRule[]
  >(() => {
    try {
      const saved = localStorage.getItem("terimbere_crop_variety_rules");
      return saved
        ? JSON.parse(saved)
        : DEFAULT_CROP_VARIETY_IRRIGATION_RULES;
    } catch {
      return DEFAULT_CROP_VARIETY_IRRIGATION_RULES;
    }
  });

  const [activityLogFocus, setActivityLogFocus] = useState<{
    farmId?: string;
    subTab?: "readiness" | "calendar" | "all_activities" | "gps_map";
  }>({});

  useEffect(() => {
    try {
      localStorage.setItem(
        "terimbere_crop_variety_rules",
        JSON.stringify(cropVarietyRules)
      );
    } catch {
      // ignore
    }
  }, [cropVarietyRules]);

  useEffect(() => {
    localStorage.setItem("terimbere_watered_farms_today", JSON.stringify(wateredFarmIdsToday));
  }, [wateredFarmIdsToday]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "terimbere_parcel_soil_sensors",
        JSON.stringify(sensorReadingsByFarmId)
      );
    } catch {
      // ignore storage error
    }
  }, [sensorReadingsByFarmId]);

  // Derive Irrigation Demand alerts based on soil moisture, IoT/manual sensor overrides, forecast humidity & growth stage
  const rawIrrigationDemandAlerts = evaluateIrrigationDemandAlerts(
    farms,
    plans,
    activities,
    weatherForecasts,
    wateredFarmIdsToday,
    criticalHumidityThreshold,
    humidityOverridesByDistrict,
    sensorReadingsByFarmId,
    cropVarietyRules
  );
  const irrigationDemandAlerts = rawIrrigationDemandAlerts.filter(
    (a) => !dismissedNotificationIds.includes(a.id)
  );

  const handleUpdateParcelSensorReading = (
    farmId: string,
    reading: ParcelSoilSensorReading | null
  ) => {
    setSensorReadingsByFarmId((prev) => {
      const next = { ...prev };
      if (!reading) {
        delete next[farmId];
      } else {
        next[farmId] = reading;
      }
      // If the new reading triggers a critical/high alert, un-dismiss and push notification
      if (reading && reading.moisturePercentage <= 38) {
        setWateredFarmIdsToday((wPrev) => wPrev.filter((id) => id !== farmId));
        setDismissedNotificationIds((dPrev) =>
          dPrev.filter((id) => id !== `irrig-demand-${farmId}`)
        );
        const updatedAlerts = evaluateIrrigationDemandAlerts(
          farms,
          plans,
          activities,
          weatherForecasts,
          wateredFarmIdsToday.filter((id) => id !== farmId),
          criticalHumidityThreshold,
          humidityOverridesByDistrict,
          next
        );
        const targetAlert = updatedAlerts.find((a) => a.farmId === farmId);
        if (
          targetAlert &&
          (targetAlert.status === "critical" || targetAlert.status === "high")
        ) {
          triggerIrrigationDemandPushNotification(targetAlert, language);
        }
      }
      return next;
    });
  };

  const handleBatchUpdateSensorReadings = (
    readings: Record<string, ParcelSoilSensorReading>
  ) => {
    setSensorReadingsByFarmId(readings);
    const hasDroughtReading = Object.values(readings).some(
      (r) => r && r.moisturePercentage <= 35
    );
    if (hasDroughtReading) {
      setWateredFarmIdsToday([]);
      const updatedAlerts = evaluateIrrigationDemandAlerts(
        farms,
        plans,
        activities,
        weatherForecasts,
        [],
        criticalHumidityThreshold,
        humidityOverridesByDistrict,
        readings
      );
      const urgentAlert =
        updatedAlerts.find((a) => a.status === "critical") || updatedAlerts[0];
      if (urgentAlert) {
        triggerIrrigationDemandPushNotification(urgentAlert, language);
      }
    }
  };

  // Automatically push a real-time climate alert to the Dashboard when local humidity drops below criticalHumidityThreshold
  useEffect(() => {
    const lowHumidityAlert = irrigationDemandAlerts.find((a) => a.isLowHumidityAlert);
    if (!lowHumidityAlert) return;
    const timer = setTimeout(() => {
      triggerIrrigationDemandPushNotification(lowHumidityAlert, language);
    }, 900);
    return () => clearTimeout(timer);
  }, [criticalHumidityThreshold, isHumiditySimulated]);

  const handleSimulateHumidityDrop = () => {
    const simulatedMap: Record<string, number> = {};
    farms.forEach((f, idx) => {
      simulatedMap[f.district] = Math.max(34, 41 - idx * 3);
    });
    setHumidityOverridesByDistrict(simulatedMap);
    setIsHumiditySimulated(true);

    const updatedAlerts = evaluateIrrigationDemandAlerts(
      farms,
      plans,
      activities,
      weatherForecasts,
      wateredFarmIdsToday,
      criticalHumidityThreshold,
      simulatedMap,
      sensorReadingsByFarmId
    );
    const firstLowHumidity = updatedAlerts.find((a) => a.isLowHumidityAlert) || updatedAlerts[0];
    if (firstLowHumidity) {
      triggerIrrigationDemandPushNotification(firstLowHumidity, language);
    }
  };

  const handleResetHumiditySimulation = () => {
    setHumidityOverridesByDistrict({ Nyagatare: 48 });
    setIsHumiditySimulated(false);
  };

  const unreadNotificationsCount =
    harvestNotifications.filter((n) => !n.read).length +
    scheduledActivityAlerts.length +
    irrigationDemandAlerts.filter((a) => a.status === "critical" || a.status === "high").length;

  const handleMarkNotifAsRead = (id: string) => {
    setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleMarkAllNotifsAsRead = () => {
    const allIds = harvestNotifications.map((n) => n.id);
    setReadNotificationIds((prev) => Array.from(new Set([...prev, ...allIds])));
    showToast(
      language === "rw"
        ? "Ubutumwa bwose bwashyizwe mu byasomwe."
        : "All harvest alerts marked as read."
    );
  };

  const handleDismissNotif = (id: string) => {
    setDismissedNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    showToast(
      language === "rw" ? "Ubutumwa bwakuweho." : "Notification dismissed."
    );
  };

  const handleScheduleWateringTask = (activityData: Omit<FarmActivity, "id">) => {
    handleAddActivity(activityData);
    showToast(
      language === "rw"
        ? "Igikorwa cyo kuhira cyashyizwe kuri gahunda y'uyu munsi!"
        : "Watering task scheduled for today!"
    );
  };

  const handleMarkWateredNow = (farmId: string, crop: string) => {
    setWateredFarmIdsToday((prev) => (prev.includes(farmId) ? prev : [...prev, farmId]));
    const targetFarm = farms.find((f) => f.id === farmId);
    const todayStr = new Date().toISOString().split("T")[0];

    // Log a completed activity for farm traceability
    handleAddActivity({
      farmId,
      farmName: targetFarm?.name || "Umurima",
      crop,
      title: `Kuhira Umurima (Watering Applied - ${crop})`,
      category: "irrigation",
      dueDate: todayStr,
      completedDate: todayStr,
      status: "completed",
      assignedTo: "Umuhinzi (Self)",
      notes: "Ubutaka bwuhiriwe neza, ubuhehere bwasubiye mu rugero rwa 88% (Optimal).",
    });

    showToast(
      language === "rw"
        ? `Umurima wa ${crop} wuhiriwe! Ubuhehere bw'ubutaka bwasubiye kuri 88%.`
        : `${crop} parcel watered! Soil moisture restored to 88% (optimal).`
    );
  };

  // Offline Sync Queue State
  const [isSyncQueueOpen, setIsSyncQueueOpen] = useState<boolean>(false);

  // Derive all pending items (offline_pending / local_pending) across all entities
  const pendingSyncItems = getPendingSyncItems(
    expenses,
    activities,
    harvests,
    sales,
    hiredLaborList,
    transportLogsList
  );
  const pendingSyncCount = pendingSyncItems.length;

  const handleSyncAll = () => {
    const countToSync = pendingSyncCount;
    setExpenses((prev) => prev.map((e) => ({ ...e, syncStatus: "synced" as const })));
    setActivities((prev) => prev.map((a) => ({ ...a, syncStatus: "synced" as const })));
    setHarvests((prev) => prev.map((h) => ({ ...h, syncStatus: "synced" as const })));
    setSales((prev) => prev.map((s) => ({ ...s, syncStatus: "synced" as const })));
    setHiredLaborList((prev) => prev.map((l) => ({ ...l, syncStatus: "synced" as const })));
    setTransportLogsList((prev) => prev.map((t) => ({ ...t, syncStatus: "synced" as const })));
    showToast(
      language === "rw"
        ? `Amakuru ${countToSync} ya offline yahujwe neza na seriveri ya Nkunganire!`
        : `All ${countToSync} offline records successfully synchronized to central server!`
    );
  };

  const handleSimulateOfflineAdd = () => {
    const timestamp = Date.now();
    const isHarvest = Math.random() > 0.5;

    if (isHarvest) {
      const sampleHarvest: HarvestRecord = {
        id: "harv-offline-" + timestamp,
        batchCode: "RW-HARV-MUS-OFFLINE-" + Math.floor(Math.random() * 900 + 100),
        farmId: "farm-1",
        farmName: "Ibirayi Farm (Kinigi)",
        district: "Musanze",
        sector: "Kinigi",
        agroZone: "Birunga Volcanic Highlands",
        crop: "Ibirayi (Kinigi)",
        harvestDate: new Date().toISOString().split("T")[0],
        quantityKg: 950,
        qualityGrade: "A",
        storageLocation: "Nyange Post-Harvest Store",
        syncStatus: "offline_pending",
        notes: "Umusaruro w'igerageza wanditswe igihe murandasi yari ifunze (offline_pending).",
      };
      setHarvests((prev) => [sampleHarvest, ...prev]);
    } else {
      const sampleExpense: Expense = {
        id: "exp-offline-" + timestamp,
        farmId: "farm-1",
        farmName: "Ibirayi Farm (Kinigi)",
        crop: "Ibirayi",
        category: "labor",
        amount: 32000,
        description: "Labor - Guhemba abakozi 6 bateguye ubutaka (Offline Field Log)",
        date: new Date().toISOString().split("T")[0],
        syncStatus: "offline_pending",
      };
      setExpenses((prev) => [sampleExpense, ...prev]);
    }

    showToast(
      language === "rw"
        ? "Icyitegererezo cyongewe mu murongo w'isanisha (offline_pending)!"
        : "Sample offline record added to queue (offline_pending)!"
    );
  };

  // Add a complete triplet of local offline records (1 Expense + 1 Harvest + 1 Activity) for testing offline JSON backup
  const handleAddOfflineSampleTriplet = () => {
    const timestamp = Date.now();
    const todayIso = new Date().toISOString().split("T")[0];
    const targetFarm = farms[0];
    const farmId = targetFarm?.id || "farm-local-1";
    const farmName = targetFarm?.name || "Umurima w'Ibirayi (Kinigi)";
    const district = targetFarm?.district || "Musanze";
    const sector = targetFarm?.sector || "Kinigi";

    const newExpense: Expense = {
      id: `exp-offline-${timestamp}`,
      farmId,
      farmName,
      crop: "Ibirayi (Kinigi)",
      category: "fertilizer",
      amount: 48500,
      description: "Ifumbire y'imborera n'imbuto z'indobanure (Recorded Offline)",
      date: todayIso,
      syncStatus: "offline_pending",
    };

    const newHarvest: HarvestRecord = {
      id: `harv-offline-${timestamp}`,
      batchCode: `RW-OFFLINE-${Math.floor(100 + Math.random() * 900)}`,
      farmId,
      farmName,
      district,
      sector,
      agroZone: targetFarm?.agroZone || "Birunga Volcanic Highlands",
      crop: "Ibirayi (Kinigi)",
      harvestDate: todayIso,
      quantityKg: 1250,
      qualityGrade: "A",
      storageLocation: "Ububiko bwa Kinigi Store",
      syncStatus: "offline_pending",
      notes: "Umusaruro wanditswe mu murima nta murandasi (Offline Backup Ready).",
    };

    const newActivity: FarmActivity = {
      id: `act-offline-${timestamp}`,
      farmId,
      farmName,
      crop: "Ibirayi (Kinigi)",
      title: "Kubagara no kurunda igitaka (Earthing-up & Weeding)",
      category: "weeding",
      dueDate: todayIso,
      completedDate: todayIso,
      status: "completed",
      assignedTo: currentUser?.name || "Umuhinzi",
      syncStatus: "offline_pending",
      notes: "Igikorwa cyakozwe kandi kibikwa kuri telefone nta murandasi.",
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setHarvests((prev) => [newHarvest, ...prev]);
    setActivities((prev) => [newActivity, ...prev]);

    showToast(
      language === "rw"
        ? "Amakuru 3 ya Offline (Amafaranga, Umusaruro, Igikorwa) yongewe mu bubiko bwa telefone!"
        : "Added 3 offline records (Expense, Harvest & Activity) to local storage!"
    );
  };

  // Immediate 1-click JSON export of local offline records
  const handleQuickExportOfflineJson = () => {
    const { filename, payload } = quickExportLocalOfflineJson({
      expenses,
      harvests,
      activities,
      farms,
      plans,
      sales,
      hiredLabor: hiredLaborList,
      transportLogs: transportLogsList,
      currentUser,
      isOnline,
      seasonCode: dynamicDayState.seasonCode,
      scope: "all_local",
      categories: {
        expenses: true,
        harvests: true,
        activities: true,
        includeFarmsAndPlans: true,
        includeSalesAndLogistics: false,
      },
    });
    showToast(
      language === "rw"
        ? `Ububiko bwa JSON (${filename} • amakuru ${payload.summary.totalRecordsExported}) bwabitswe!`
        : `Offline JSON backup (${filename} • ${payload.summary.totalRecordsExported} records) downloaded!`
    );
  };

  // Restore local records from an uploaded JSON backup file
  const handleRestoreOfflineBackup = (
    restored: OfflineBackupPayload["records"],
    mode: "merge" | "replace"
  ) => {
    if (mode === "replace") {
      setExpenses(restored.expenses || []);
      setHarvests(restored.harvests || []);
      setActivities(restored.activities || []);
      if (restored.farms) setFarms(restored.farms);
      if (restored.plans) setPlans(restored.plans);
      if (restored.sales) setSales(restored.sales);
    } else {
      setExpenses((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const incoming = (restored.expenses || []).filter(
          (i) => !existingIds.has(i.id)
        );
        return [...incoming, ...prev];
      });
      setHarvests((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const incoming = (restored.harvests || []).filter(
          (i) => !existingIds.has(i.id)
        );
        return [...incoming, ...prev];
      });
      setActivities((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const incoming = (restored.activities || []).filter(
          (i) => !existingIds.has(i.id)
        );
        return [...incoming, ...prev];
      });
      if (restored.farms && restored.farms.length > 0) {
        setFarms((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const incoming = restored.farms!.filter((i) => !existingIds.has(i.id));
          return [...incoming, ...prev];
        });
      }
      if (restored.plans && restored.plans.length > 0) {
        setPlans((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const incoming = restored.plans!.filter((i) => !existingIds.has(i.id));
          return [...incoming, ...prev];
        });
      }
    }

    const totalRestored =
      (restored.expenses?.length || 0) +
      (restored.harvests?.length || 0) +
      (restored.activities?.length || 0);

    showToast(
      language === "rw"
        ? `Amakuru ${totalRestored} y'ububiko bwa JSON yagaruwe neza muri telefone!`
        : `Successfully restored ${totalRestored} records from JSON backup!`
    );
  };

  // Clean-Slate LocalStorage persistence
  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_farms", JSON.stringify(farms));
  }, [farms]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_plans", JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_activities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_harvests", JSON.stringify(harvests));
  }, [harvests]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_sales", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_market_prices", JSON.stringify(marketPricesList));
  }, [marketPricesList]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_training_courses", JSON.stringify(trainingCourseList));
  }, [trainingCourseList]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_diagnoses", JSON.stringify(diagnoses));
  }, [diagnoses]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_hired_labor", JSON.stringify(hiredLaborList));
  }, [hiredLaborList]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_transport_logs", JSON.stringify(transportLogsList));
  }, [transportLogsList]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_daily_tips", JSON.stringify(dailyTipsList));
  }, [dailyTipsList]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_audit_logs", JSON.stringify(auditLogsList));
  }, [auditLogsList]);

  useEffect(() => {
    localStorage.setItem("terimbere_clean_v1_users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("terimbere_clean_v1_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("terimbere_clean_v1_current_user");
    }
  }, [currentUser]);

  const handleResetCleanSlate = () => {
    setFarms([]);
    setPlans([]);
    setExpenses([]);
    setActivities([]);
    setHarvests([]);
    setSales([]);
    setDiagnoses([]);
    setHiredLaborList([]);
    setTransportLogsList([]);
    setFertilizerApplications([]);
    setTeamMembers([]);
    setAuditLogsList([]);
    setRegisteredUsers([]);
    setCurrentUser(null);
    localStorage.clear();
    showToast(
      language === "rw"
        ? "Sisitemu yasubijwe kuri paji nshya isukuye (Clean Slate)!"
        : "Workspace reset to a fresh clean slate!"
    );
  };

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // AI Prompt jump helper
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>();
  const handleQuickAiPrompt = (promptText: string) => {
    setAiInitialPrompt(promptText);
    setCurrentTab("aiAdvisor");
  };

  // Handlers for authentication
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setRegisteredUsers((prev) =>
      prev.some((u) => u.id === user.id || u.email === user.email)
        ? prev
        : [...prev, user]
    );
    showToast(
      language === "rw"
        ? `Murakaza neza, ${user.name}! Winjiye neza.`
        : `Welcome, ${user.name}!`
    );
    if (user.role === "admin") {
      setCurrentTab("admin");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast(
      language === "rw" ? "Mwavuye muri konti neza." : "Logged out successfully."
    );
  };

  const handleSwitchToFarmer = () => {
    setCurrentTab("dashboard");
    setIsAuthModalOpen(true);
  };

  // Operations for Crop Diagnosis
  const handleAddDiagnosis = (diag: CropDiagnosis) => {
    setDiagnoses((prev) => [diag, ...prev]);
    showToast(
      language === "rw"
        ? "Isuzuma ry'indwara ryashyizwe mu mateka y'umurima!"
        : "Diagnosis added to farm health history!"
    );
  };

  // Operations for Hired Labor
  const handleAddLabor = (labor: HiredLabor) => {
    const updatedLabor = {
      ...labor,
      syncStatus: isOnline ? ("synced" as const) : ("offline_pending" as const),
    };
    setHiredLaborList((prev) => [updatedLabor, ...prev]);
    showToast(
      language === "rw"
        ? "Abakozi b'ibiraka babitswe neza!"
        : "Casual labor log successfully recorded!"
    );
  };

  // Operations for Transport
  const handleAddTransport = (log: TransportLog) => {
    const updatedTransport = {
      ...log,
      syncStatus: isOnline ? ("synced" as const) : ("offline_pending" as const),
    };
    setTransportLogsList((prev) => [updatedTransport, ...prev]);
    showToast(
      language === "rw"
        ? "Urugendo rw'imodoka rwanditswe neza!"
        : "Transport trip log recorded!"
    );
  };

  // Daily Advice Acknowledgement
  const handleAcknowledgeTip = (tipId: string) => {
    setDailyTipsList((prev) =>
      prev.map((t) => (t.id === tipId ? { ...t, acknowledged: true } : t))
    );
    showToast(
      language === "rw"
        ? "Inama yo gukumira yemejwe kandi yashyizwe mu bikorwa!"
        : "Advisory marked as acknowledged and applied!"
    );
  };

  // Data Operations for Farms, Plans, Expenses, Activities, Harvests, Sales
  const handleAddFarm = (farmData: Omit<Farm, "id" | "createdAt">) => {
    const newFarm: Farm = {
      ...farmData,
      id: "farm-" + Date.now(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setFarms((prev) => [newFarm, ...prev]);
    showToast(language === "rw" ? "Umurima mushya wanditswe neza!" : "New farm parcel added!");
  };

  const handleDeleteFarm = (id: string) => {
    setFarms((prev) => prev.filter((f) => f.id !== id));
    showToast(language === "rw" ? "Umurima wasibwe." : "Farm parcel removed.");
  };

  // Operations for Team Collaboration & Farm Parcel Sharing
  const handleAddTeamMember = (
    memberData: Omit<TeamMember, "id" | "invitedAt" | "inviteCode" | "status">
  ) => {
    const newMember: TeamMember = {
      ...memberData,
      id: "tm-" + Date.now(),
      status: "pending_invitation",
      invitedAt: new Date().toISOString().split("T")[0],
      inviteCode: `TRM-${memberData.role.toUpperCase().slice(0, 3)}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
    };
    setTeamMembers((prev) => [newMember, ...prev]);
    showToast(
      language === "rw"
        ? `Ubutumire bwa ${newMember.name} bwashyizweho neza!`
        : `Invitation created for ${newMember.name}!`
    );
  };

  const handleUpdateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    showToast(
      language === "rw"
        ? "Uburenganzira bw'umukozi bwavuguruwe!"
        : "Team member permissions updated!"
    );
  };

  const handleDeleteTeamMember = (id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    showToast(
      language === "rw"
        ? "Uburenganzira bwakuweho."
        : "Parcel access revoked."
    );
  };

  const handleOpenShareFarmModal = (farmId?: string) => {
    setShareTargetFarmId(farmId || null);
    setIsShareFarmModalOpen(true);
  };

  const handleSimulateMemberLogin = (member: TeamMember) => {
    setSimulatedMember(member);
    setCurrentTab("farms");
    showToast(
      language === "rw"
        ? `Ubu urimo kureba urubuga nka ${member.name} (${member.role} - ${member.permission})`
        : `Simulating view as: ${member.name} (${member.role})`
    );
  };

  const handleExitSimulation = () => {
    setSimulatedMember(null);
    showToast(
      language === "rw"
        ? "Mwasubiye mu miterere ya Nyirumurima (Master Farm Owner)"
        : "Returned to Master Farm Owner View"
    );
  };

  const handleAddPlan = (newPlan: FarmPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    showToast(language === "rw" ? "Gahunda y'ubuhinzi yabitswe neza!" : "Farm plan created successfully!");
  };

  const handleDeletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    showToast(language === "rw" ? "Gahunda yasibwe." : "Farm plan deleted.");
  };

  const handleUpdatePlan = (updatedPlan: FarmPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
    showToast(
      language === "rw"
        ? `Imikurire ya ${updatedPlan.crop} yashyizwe kuri ${updatedPlan.growthStagePercentage ?? 0}%!`
        : `Growth progress for ${updatedPlan.crop} updated to ${updatedPlan.growthStagePercentage ?? 0}%!`
    );
  };

  const handleUpdateGrowthStage = (
    planId: string,
    percentage: number,
    stageName?: string,
    notes?: string
  ) => {
    let cropName = "igihingwa";
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          cropName = p.crop;
          return {
            ...p,
            growthStagePercentage: percentage,
            currentGrowthStage: stageName || p.currentGrowthStage,
            stageNotes: notes !== undefined ? notes : p.stageNotes,
            lastStageUpdated: new Date().toISOString().split("T")[0],
          };
        }
        return p;
      })
    );
    showToast(
      language === "rw"
        ? `Imikurire ya ${cropName} yavuguruwe kuri ${percentage}%!`
        : `Growth progress for ${cropName} updated to ${percentage}%!`
    );
  };

  const handleAddExpense = (expData: Omit<Expense, "id" | "syncStatus">) => {
    const newExp: Expense = {
      ...expData,
      id: "exp-" + Date.now(),
      syncStatus: isOnline ? "synced" : "offline_pending",
    };
    setExpenses((prev) => [newExp, ...prev]);
    showToast(
      isOnline
        ? language === "rw"
          ? "Amafaranga yakoreshejwe yanditswe!"
          : "Expense recorded!"
        : language === "rw"
        ? "Amafaranga yanditswe muri telefone (offline_pending)!"
        : "Expense saved locally (offline_pending)!"
    );
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast(language === "rw" ? "Amafaranga yasibwe." : "Expense deleted.");
  };

  const handleAddExpensesBulk = (newExpenses: Omit<Expense, "id" | "syncStatus">[]) => {
    if (newExpenses.length === 0) return;
    const items: Expense[] = newExpenses.map((expData, idx) => ({
      ...expData,
      id: "exp-" + (Date.now() + idx),
      syncStatus: isOnline ? "synced" : "offline_pending",
    }));
    setExpenses((prev) => [...items, ...prev]);
    showToast(
      language === "rw"
        ? `Inyemezabwishyu ${items.length} zinjijwe neza muri Terimbere!`
        : `Successfully imported ${items.length} expenses into records!`
    );
  };

  const handleAddActivity = (actData: Omit<FarmActivity, "id">) => {
    const newAct: FarmActivity = {
      ...actData,
      id: "act-" + Date.now(),
      syncStatus: isOnline ? "synced" : "offline_pending",
    };
    setActivities((prev) => [newAct, ...prev]);
    showToast(language === "rw" ? "Igikorwa gishya cyashyizwe kuri gahunda!" : "Field activity scheduled!");
  };

  const handleUpdateActivityStatus = (id: string, status: "pending" | "in_progress" | "completed") => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    showToast(
      status === "completed"
        ? language === "rw"
          ? "Igikorwa cyarangiye neza!"
          : "Activity marked as completed!"
        : language === "rw"
        ? "Uko igikorwa gihagaze byahinduwe."
        : "Activity status updated."
    );
  };

  const handleUpdateActivity = (id: string, updates: Partial<FarmActivity>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    showToast(
      language === "rw"
        ? "Gahunda y'igikorwa n'integuza y'iminsi 2 byavuguruwe!"
        : "Scheduled task & 2-day alert updated!"
    );
  };

  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    showToast(language === "rw" ? "Igikorwa cyasibwe." : "Activity removed.");
  };

  const handleAddHarvest = (hData: Omit<HarvestRecord, "id">) => {
    const newH: HarvestRecord = {
      ...hData,
      id: "harv-" + Date.now(),
      syncStatus: isOnline ? "synced" : "offline_pending",
    };
    setHarvests((prev) => [newH, ...prev]);
    showToast(
      isOnline
        ? language === "rw"
          ? "Umusaruro winjiye mu bubiko neza!"
          : "Harvest recorded into storage!"
        : language === "rw"
        ? "Umusaruro wabitswe muri telefone (offline_pending)!"
        : "Harvest saved locally (offline_pending)!"
    );
  };

  const handleDeleteHarvest = (id: string) => {
    setHarvests((prev) => prev.filter((h) => h.id !== id));
    showToast(language === "rw" ? "Umusaruro wasibwe." : "Harvest record deleted.");
  };

  const handleAddHarvestsBulk = (newHarvests: Omit<HarvestRecord, "id">[]) => {
    if (newHarvests.length === 0) return;
    const items: HarvestRecord[] = newHarvests.map((hData, idx) => ({
      ...hData,
      id: "harv-" + (Date.now() + idx),
      syncStatus: isOnline ? "synced" : "offline_pending",
    }));
    setHarvests((prev) => [...items, ...prev]);
    showToast(
      language === "rw"
        ? `Umusaruro ${items.length} winjijwe neza mu bubiko!`
        : `Successfully imported ${items.length} harvest entries into storage!`
    );
  };

  const handleAddSale = (sData: Omit<SaleRecord, "id">) => {
    const newSale: SaleRecord = {
      ...sData,
      id: "sale-" + Date.now(),
      syncStatus: isOnline ? "synced" : "offline_pending",
    };
    setSales((prev) => [newSale, ...prev]);
    showToast(
      isOnline
        ? language === "rw"
          ? "Ubucuruzi bw'umusaruro bwanditswe neza!"
          : "Sale recorded successfully!"
        : language === "rw"
        ? "Ubucuruzi bwabitswe muri telefone (offline_pending)!"
        : "Sale saved locally (offline_pending)!"
    );
  };

  const handleAddSalesBulk = (newSales: Omit<SaleRecord, "id">[]) => {
    if (newSales.length === 0) return;
    const items: SaleRecord[] = newSales.map((sData, idx) => ({
      ...sData,
      id: "sale-" + (Date.now() + idx),
      syncStatus: isOnline ? "synced" : "offline_pending",
    }));
    setSales((prev) => [...items, ...prev]);
    showToast(
      language === "rw"
        ? `Ibyagurishijwe ${items.length} byinjijwe neza muri Terimbere!`
        : `Successfully imported ${items.length} sales records!`
    );
  };

  const handleDeleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
    showToast(language === "rw" ? "Ubucuruzi bwasibwe." : "Sale record removed.");
  };

  const handleToggleOnline = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (nextState && pendingSyncCount > 0) {
      handleSyncAll();
    } else {
      showToast(
        nextState
          ? language === "rw"
            ? "Wongeye kwinjira kuri murandasi (Online)."
            : "Back online."
          : language === "rw"
          ? "Uhagaritse murandasi (Offline Mode). Amakuru azabikwa nk'ategereje guhuzwa (offline_pending)."
          : "Offline mode active. New records will be marked as offline_pending."
      );
    }
  };

  // Parcel visibility & permissions when simulating a team member
  const visibleFarms =
    simulatedMember && simulatedMember.assignedFarmIds.length > 0
      ? farms.filter((f) => simulatedMember.assignedFarmIds.includes(f.id))
      : farms;

  const isViewOnly = simulatedMember?.permission === "view";

  const handleGlobalExportPdf = () => {
    const primaryFarm = farms[0] || {
      name: "Umurima w'Ibirayi (Kinigi)",
      district: "Musanze",
    };
    exportFarmPerformancePdf({
      farmerName: currentUser?.name || "Jean Baptiste Hakizimana",
      farmName: primaryFarm.name,
      district: primaryFarm.district,
      language,
      expenses,
      harvests,
      sales,
      farms,
      plans,
      activities,
      currentUser,
      seasonCode: "2026B",
    });
    showToast(
      language === "rw"
        ? "Raporo y'umurima n'imari yabitswe nka PDF!"
        : "Farm & Financial Report exported to PDF!"
    );
  };

  const handleGlobalExportCsv = () => {
    const primaryFarm = farms[0] || {
      name: "Umurima w'Ibirayi (Kinigi)",
      district: "Musanze",
    };
    exportFarmPerformanceCsv({
      farmerName: currentUser?.name || "Jean Baptiste Hakizimana",
      farmName: primaryFarm.name,
      district: primaryFarm.district,
      language,
      expenses,
      harvests,
      sales,
      farms,
      plans,
      activities,
      currentUser,
      seasonCode: "2026B",
    });
    showToast(
      language === "rw"
        ? "Imbonerahamwe y'imari n'umusaruro yabitswe nka CSV (Excel)!"
        : "Farm & Financial data exported to CSV!"
    );
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? "dark bg-stone-950 text-stone-100" : "bg-[#FAFAF7] text-stone-900"
      } flex flex-col font-sans transition-colors duration-200 relative`}
    >
      {/* Authentic Rwandan Agricultural Landscape Background Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: `url(${backgroundImages[bgTheme] || backgroundImages.terraces})`,
          opacity: isDarkMode ? 0.04 : 0.05,
        }}
        aria-hidden="true"
      />
      {/* Real-Time Push Notification Toast (Irrigation, Low-Humidity Climate & Activity Alerts) */}
      <SimulatedPushNotificationToast
        language={language}
        onCompleteActivity={(id) => {
          const matchingIrrig = irrigationDemandAlerts.find((a) => a.id === id);
          if (matchingIrrig) {
            handleMarkWateredNow(matchingIrrig.farmId, matchingIrrig.crop);
          } else {
            handleUpdateActivityStatus(id, "completed");
          }
        }}
        onNavigateToActivities={() => setCurrentTab("activities")}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-950 dark:bg-emerald-950 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-stone-800 dark:border-emerald-800 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Session Banner (No plain credentials shown!) */}
      {currentUser?.role === "admin" && (
        <div className="bg-stone-900 border-b border-amber-600/40 py-1.5 px-4 text-xs text-stone-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold text-amber-400">ADMINISTRATOR CONTROL CENTER ACTIVE</span>
              <span className="hidden sm:inline text-stone-400">• Full System Governance</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <button
                onClick={() => setCurrentTab("admin")}
                className="font-bold text-amber-300 hover:underline"
              >
                Admin Panel →
              </button>
              <span>|</span>
              <button
                onClick={handleSwitchToFarmer}
                className="text-stone-400 hover:text-white"
              >
                Switch to Farmer View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Role Simulation Banner */}
      {simulatedMember && (
        <div className="bg-emerald-950 text-white border-b border-emerald-600/50 py-2 px-4 text-xs shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-extrabold text-amber-300 uppercase tracking-wide">
                {language === "rw" ? "UBURENGANZIRA BW'IKIPE:" : "SIMULATED TEAM VIEW:"}
              </span>
              <span className="font-bold text-white">
                {simulatedMember.name} (
                {simulatedMember.role === "agronomist"
                  ? "Agronomist"
                  : simulatedMember.role === "worker"
                  ? "Field Worker"
                  : "Coop Inspector"}
                )
              </span>
              <span className="hidden md:inline text-emerald-200">
                • {simulatedMember.assignedFarmIds.length === 0
                  ? "Imirima Yose (All Parcels)"
                  : `${simulatedMember.assignedFarmIds.length} Imirima Yashinzwe`}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  simulatedMember.permission === "manage"
                    ? "bg-emerald-700 text-white"
                    : "bg-amber-500 text-stone-950"
                }`}
              >
                {simulatedMember.permission === "manage" ? "Manage & Record" : "View Only (Reba Gusa)"}
              </span>
            </div>

            <button
              onClick={handleExitSimulation}
              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs transition-all shadow-xs"
            >
              {language === "rw"
                ? "Subira nka Nyirumurima (Exit Simulation)"
                : "Exit to Master Farm Owner View"}
            </button>
          </div>
        </div>
      )}

      {/* 1. Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        pendingSyncCount={pendingSyncCount}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isPhoneView={isPhoneView}
        onTogglePhoneView={() => setIsPhoneView(!isPhoneView)}
        onOpenContact={() => setIsContactModalOpen(true)}
        onOpenUssd={() => setIsUssdModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenSyncQueue={() => setIsSyncQueueOpen(true)}
        pendingItems={pendingSyncItems}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenTeamModal={() => handleOpenShareFarmModal()}
        teamMemberCount={teamMembers.length}
        onOpenExportReport={() => setIsExportReportModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        onOpenOfflineBackup={() => setIsOfflineBackupModalOpen(true)}
        onOpenQrScanner={() => handleOpenParcelQr(farms[0] || null, "history")}
        onOpenPlantingCalendarExport={() => setIsPlantingCalendarExportOpen(true)}
        onOpenWorkflowGuide={() => setIsWorkflowGuideOpen(true)}
        dynamicDayState={dynamicDayState}
      />

      {/* 2. Navigation bar with tabs */}
      {!isPhoneView && (
        <Navigation
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          language={language}
          currentUser={currentUser}
          onOpenWorkflowGuide={() => setIsWorkflowGuideOpen(true)}
          onOpenExportReport={() => setIsExportReportModalOpen(true)}
          onOpenUssd={() => setIsUssdModalOpen(true)}
          onOpenContact={() => setIsContactModalOpen(true)}
          onOpenDeployModal={() => setIsDeployModalOpen(true)}
          onOpenOfflineBackup={() => setIsOfflineBackupModalOpen(true)}
          onOpenQrScanner={() => handleOpenParcelQr(farms[0] || null, "history")}
        />
      )}

      {/* 3. Main Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Clean-Slate Welcome & Dynamic Day Banner when no account is signed in yet */}
        {!currentUser && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-5 text-white shadow-sm border border-emerald-700/50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-200 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {language === "rw"
                    ? dynamicDayState.greetingRw
                    : dynamicDayState.greetingEn}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {language === "rw"
                    ? dynamicDayState.formattedDateRw
                    : dynamicDayState.formattedDateEn}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300">
                  {language === "rw"
                    ? dynamicDayState.seasonLabelRw
                    : dynamicDayState.seasonLabelEn}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                {language === "rw"
                  ? "Ikaze kuri Paji Nshya Isukuye ya TERIMBERE — Nta Makuru y'Igerageza cyangwa Abakoresha b'Igerageza"
                  : "Welcome to Your Clean-Slate TERIMBERE Workspace — Dynamically Updated Daily"}
              </h2>
              <p className="text-xs text-emerald-100/85 max-w-3xl leading-relaxed">
                {language === "rw"
                  ? "Tangira ufungure konti yawe, wandike imirima yawe n'igenamigambi, ushakishe mu Isomero ry'Indwara z'Ibihingwa (Crop Doctor), cyangwa ukoreshe ubuyobozi bwa GitHub & Render mu gusoza umushinga."
                  : "Register your own account and parcels from scratch, explore the Crop Disease Knowledge Base in Crop Doctor, or open the GitHub & Render Deployment Center to publish your app."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {language === "rw"
                    ? "Fungura Konti / Injira"
                    : "Create Account / Sign In"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsOfflineBackupModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-950/60 hover:bg-stone-950/85 text-amber-300 border border-amber-400/40 font-bold text-xs transition-colors cursor-pointer"
              >
                <HardDriveDownload className="w-4 h-4 text-amber-400" />
                <span>
                  {language === "rw"
                    ? "Bika JSON (Offline Backup)"
                    : "Backup JSON (Offline)"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeployModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs transition-colors cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-amber-300" />
                <span>
                  {language === "rw"
                    ? "GitHub & Render Guide"
                    : "Host on GitHub & Render"}
                </span>
              </button>
            </div>
          </div>
        )}

        {isPhoneView ? (
          <PhoneMockupView
            language={language}
            farms={farms}
            plans={plans}
            expenses={expenses}
            activities={activities}
            harvests={harvests}
            sales={sales}
            onClosePhoneView={() => setIsPhoneView(false)}
          />
        ) : (
          <>
            {currentTab === "dashboard" && (
              <DashboardView
                farms={farms}
                plans={plans}
                expenses={expenses}
                activities={activities}
                harvests={harvests}
                sales={sales}
                dailyTips={dailyTipsList}
                diagnoses={diagnoses}
                onAcknowledgeTip={handleAcknowledgeTip}
                language={language}
                onNavigate={(tab) => setCurrentTab(tab)}
                onQuickAiPrompt={handleQuickAiPrompt}
                onCompleteActivity={(id) => handleUpdateActivityStatus(id, "completed")}
                harvestNotifications={harvestNotifications}
                onOpenNotifications={() => setIsNotificationCenterOpen(true)}
                scheduledActivityAlerts={scheduledActivityAlerts}
                onDismissActivityAlert={handleDismissNotif}
                irrigationDemandAlerts={irrigationDemandAlerts}
                onCreateWateringTask={handleScheduleWateringTask}
                onMarkWateredNow={handleMarkWateredNow}
                onDismissIrrigationAlert={handleDismissNotif}
                criticalHumidityThreshold={criticalHumidityThreshold}
                onChangeHumidityThreshold={setCriticalHumidityThreshold}
                onSimulateHumidityDrop={handleSimulateHumidityDrop}
                onResetHumiditySimulation={handleResetHumiditySimulation}
                isHumiditySimulated={isHumiditySimulated}
                sensorReadingsByFarmId={sensorReadingsByFarmId}
                onUpdateParcelSensorReading={handleUpdateParcelSensorReading}
                onBatchUpdateSensorReadings={handleBatchUpdateSensorReadings}
                onCreateActivity={handleAddActivity}
                onShowToast={showToast}
                onExportPdf={handleGlobalExportPdf}
                onExportCsv={handleGlobalExportCsv}
                onOpenExportModal={() => setIsExportReportModalOpen(true)}
                onUpdateProgress={handleUpdateGrowthStage}
                cropVarietyRules={cropVarietyRules}
                onUpdateCropVarietyRules={setCropVarietyRules}
                fertilizerApplications={fertilizerApplications}
                onAddFertilizerApplication={handleAddFertilizerApplication}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onNavigateToActivityLog={(opts) => {
                  if (opts?.farmId) {
                    setActivityLogFocus({
                      farmId: opts.farmId,
                      subTab: "all_activities",
                    });
                  }
                  setCurrentTab("activities");
                }}
                onOpenPlantingCalendarExport={() => setIsPlantingCalendarExportOpen(true)}
                onOpenScanNewQr={() => handleOpenParcelQr(null, "qr_label")}
                onOpenWorkflowGuide={() => setIsWorkflowGuideOpen(true)}
                onOpenCropDoctor={() => setCurrentTab("cropDoctor")}
              />
            )}

            {currentTab === "cropDoctor" && (
              <CropDoctorView
                language={language}
                farms={farms}
                diagnoses={diagnoses}
                onAddDiagnosis={handleAddDiagnosis}
              />
            )}

            {currentTab === "operations" && (
              <OperationsLogView
                language={language}
                farms={farms}
                hiredLabor={hiredLaborList}
                onAddLabor={handleAddLabor}
                transportLogs={transportLogsList}
                onAddTransport={handleAddTransport}
                activities={activities}
                fertilizerApplications={fertilizerApplications}
                onAddFertilizerApplication={handleAddFertilizerApplication}
                onToggleActivity={(id) =>
                  handleUpdateActivityStatus(
                    id,
                    activities.find((a) => a.id === id)?.status === "completed"
                      ? "pending"
                      : "completed"
                  )
                }
              />
            )}

            {currentTab === "cooperative" && (
              <CooperativeHubView
                language={language}
                currentUser={currentUser}
                teamMembers={teamMembers}
                activities={activities}
                farms={farms}
                onUpdateActivityStatus={handleUpdateActivityStatus}
                onSimulateMemberLogin={handleSimulateMemberLogin}
                onOpenInviteModal={() => handleOpenShareFarmModal()}
              />
            )}

            {currentTab === "suitability" && (
              <LocationSuitabilityView language={language} />
            )}

            {currentTab === "farms" && (
              <FarmsView
                farms={visibleFarms}
                activities={activities}
                language={language}
                onAddFarm={handleAddFarm}
                onDeleteFarm={handleDeleteFarm}
                onUpdateActivityStatus={handleUpdateActivityStatus}
                onAddActivity={handleAddActivity}
                teamMembers={teamMembers}
                onOpenShareFarmModal={handleOpenShareFarmModal}
                onOpenParcelQr={handleOpenParcelQr}
                isViewOnly={isViewOnly}
              />
            )}

            {currentTab === "plans" && (
              <PlansView
                plans={plans}
                farms={farms}
                language={language}
                onAddPlan={handleAddPlan}
                onDeletePlan={handleDeletePlan}
                onUpdatePlan={handleUpdatePlan}
                onUpdateProgress={handleUpdateGrowthStage}
                onOpenCalendarExport={() => setIsPlantingCalendarExportOpen(true)}
              />
            )}

            {currentTab === "expenses" && (
              <ExpensesView
                expenses={expenses}
                farms={farms}
                language={language}
                onAddExpense={handleAddExpense}
                onAddExpensesBulk={handleAddExpensesBulk}
                onDeleteExpense={handleDeleteExpense}
                isOnline={isOnline}
                onOpenOfflineBackup={() => setIsOfflineBackupModalOpen(true)}
              />
            )}

            {currentTab === "activities" && (
              <ActivitiesView
                activities={activities}
                farms={farms}
                language={language}
                onAddActivity={handleAddActivity}
                onUpdateStatus={handleUpdateActivityStatus}
                onDeleteActivity={handleDeleteActivity}
                initialFarmId={activityLogFocus.farmId}
                initialSubTab={activityLogFocus.subTab}
                onOpenOfflineBackup={() => setIsOfflineBackupModalOpen(true)}
              />
            )}

            {currentTab === "harvestSales" && (
              <HarvestSalesView
                harvests={harvests}
                sales={sales}
                farms={farms}
                language={language}
                onAddHarvest={handleAddHarvest}
                onAddHarvestsBulk={handleAddHarvestsBulk}
                onAddSale={handleAddSale}
                onAddSalesBulk={handleAddSalesBulk}
                onDeleteHarvest={handleDeleteHarvest}
                onDeleteSale={handleDeleteSale}
                expenses={expenses}
                activities={activities}
                transportLogs={transportLogsList}
                onOpenHarvestQr={handleOpenHarvestQr}
                onOpenOfflineBackup={() => setIsOfflineBackupModalOpen(true)}
                onOpenPlantingCalendarExport={() => setIsPlantingCalendarExportOpen(true)}
              />
            )}

            {currentTab === "profit" && (
              <ProfitAnalyticsView
                expenses={expenses}
                harvests={harvests}
                sales={sales}
                language={language}
                farms={farms}
                plans={plans}
                activities={activities}
                currentUser={currentUser}
                onShowToast={showToast}
              />
            )}

            {currentTab === "cycleReport" && (
              <SeasonReportView
                farms={farms}
                plans={plans}
                expenses={expenses}
                activities={activities}
                harvests={harvests}
                sales={sales}
                language={language}
                currentUser={currentUser}
              />
            )}

            {currentTab === "analytics" && (
              <AnalyticsSummaryView
                plans={plans}
                expenses={expenses}
                harvests={harvests}
                sales={sales}
                language={language}
              />
            )}

            {currentTab === "aiAdvisor" && (
              <AiAdvisorView
                language={language}
                farms={farms}
                plans={plans}
                expenses={expenses}
                harvests={harvests}
                sales={sales}
                onSavePlanFromAi={handleAddPlan}
                onAddActivity={handleAddActivity}
                initialPrompt={aiInitialPrompt}
                onClearInitialPrompt={() => setAiInitialPrompt(undefined)}
              />
            )}

            {currentTab === "training" && <TrainingView language={language} />}

            {currentTab === "marketWeather" && (
              <MarketWeatherView
                language={language}
                marketPricesList={marketPricesList}
                farms={farms}
                criticalHumidityThreshold={criticalHumidityThreshold}
              />
            )}

            {currentTab === "admin" && (
              currentUser?.role === "admin" ? (
                <AdminDashboardView
                  currentUser={currentUser}
                  language={language}
                  farms={farms}
                  plans={plans}
                  expenses={expenses}
                  harvests={harvests}
                  sales={sales}
                  marketPrices={marketPricesList}
                  onUpdateMarketPrices={(prices) => setMarketPricesList(prices)}
                  weatherForecasts={weatherForecasts}
                  trainingCourses={trainingCourseList}
                  onAddTrainingCourse={(course) =>
                    setTrainingCourseList([course, ...trainingCourseList])
                  }
                  onSwitchToFarmer={handleSwitchToFarmer}
                />
              ) : (
                <div className="max-w-xl mx-auto my-12 bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center space-y-4 shadow-lg">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-white">
                    {language === "rw" ? "Uburenganzira Bwanganywe (Access Denied)" : "Unauthorized Administrator Access"}
                  </h2>
                  <p className="text-stone-600 dark:text-stone-400 text-sm">
                    {language === "rw"
                      ? "Nta burenganzira ufite bwo kwinjira mu Buyobozi Bukuru bwa Terimbere. Umwirondoro w'ubuyobozi urinzwe mu buryo bw'umutekano ukomeye."
                      : "You do not have authorization to access the central administration console. Administrator credentials are strictly restricted."}
                  </p>
                  <button
                    onClick={() => setCurrentTab("dashboard")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                  >
                    {language === "rw" ? "Subira kuri Dashboard" : "Return to Dashboard"}
                  </button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* 4. Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        language={language}
      />

      {/* 5. USSD Feature Phone Simulator Modal (*777#) */}
      <UssdSimulatorModal
        isOpen={isUssdModalOpen}
        onClose={() => setIsUssdModalOpen(false)}
        language={language}
      />

      {/* 6. Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLoginSuccess}
        language={language}
        registeredUsers={registeredUsers}
      />

      {/* GitHub & Render Cloud Deployment Center Modal */}
      <GitHubRenderDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        language={language}
        onResetCleanSlate={handleResetCleanSlate}
      />

      {/* 7. Crop Harvest & 3-Day Activity Notifications Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={harvestNotifications}
        scheduledActivityAlerts={scheduledActivityAlerts}
        irrigationDemandAlerts={irrigationDemandAlerts}
        language={language}
        onMarkAsRead={handleMarkNotifAsRead}
        onMarkAllAsRead={handleMarkAllNotifsAsRead}
        onDismiss={handleDismissNotif}
        onNavigateToTab={(tab) => {
          setCurrentTab(tab);
          setIsNotificationCenterOpen(false);
        }}
        onCompleteActivity={(id) => handleUpdateActivityStatus(id, "completed")}
        onCreateWateringTask={handleScheduleWateringTask}
        onMarkWateredNow={handleMarkWateredNow}
      />

      {/* Global Cooperative & Bank Export Report Modal (PDF & CSV) */}
      <BankLoanReportModal
        isOpen={isExportReportModalOpen}
        onClose={() => setIsExportReportModalOpen(false)}
        language={language}
        farms={farms}
        harvests={harvests}
        sales={sales}
        expenses={expenses}
        plans={plans}
        activities={activities}
        currentUser={currentUser}
        seasonCode="2026B"
      />

      {/* 8. Offline Pending Sync Queue Modal */}
      <SyncQueueModal
        isOpen={isSyncQueueOpen}
        onClose={() => setIsSyncQueueOpen(false)}
        pendingItems={pendingSyncItems}
        isOnline={isOnline}
        onSyncAll={handleSyncAll}
        onSimulateOfflineAdd={handleSimulateOfflineAdd}
        onExportOfflineJson={handleQuickExportOfflineJson}
        onOpenOfflineBackupModal={() => setIsOfflineBackupModalOpen(true)}
        language={language}
      />

      {/* Local Offline Records JSON Backup & Restore Modal */}
      <OfflineBackupModal
        isOpen={isOfflineBackupModalOpen}
        onClose={() => setIsOfflineBackupModalOpen(false)}
        language={language}
        isOnline={isOnline}
        expenses={expenses}
        harvests={harvests}
        activities={activities}
        farms={farms}
        plans={plans}
        sales={sales}
        hiredLabor={hiredLaborList}
        transportLogs={transportLogsList}
        currentUser={currentUser}
        seasonCode={dynamicDayState.seasonCode}
        onRestoreBackup={handleRestoreOfflineBackup}
        onAddOfflineSampleTriplet={handleAddOfflineSampleTriplet}
        onShowToast={showToast}
      />

      {/* Planting Calendar Export & Google / Device Calendar Sync Modal */}
      <PlantingCalendarExportModal
        isOpen={isPlantingCalendarExportOpen}
        onClose={() => setIsPlantingCalendarExportOpen(false)}
        plans={plans}
        harvests={harvests}
        activities={activities}
        farms={farms}
        language={language}
        onAddSamplePlans={(samples) => setPlans((prev) => [...prev, ...samples])}
        onShowToast={showToast}
      />

      {/* Share / Public Access Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        language={language}
      />

      {/* Team Collaboration & Parcel Access Sharing Modal */}
      <ShareFarmAccessModal
        isOpen={isShareFarmModalOpen}
        onClose={() => setIsShareFarmModalOpen(false)}
        farms={farms}
        language={language}
        teamMembers={teamMembers}
        onAddTeamMember={handleAddTeamMember}
        onUpdateTeamMember={handleUpdateTeamMember}
        onDeleteTeamMember={handleDeleteTeamMember}
        onSimulateMemberLogin={handleSimulateMemberLogin}
        currentUser={currentUser}
        targetFarmId={shareTargetFarmId}
      />

      {/* Farm Parcel & Harvest Batch QR Code Generator, Camera Scanner & Direct Details Modal */}
      <QrScannerAndRecordModal
        isOpen={isQrRecordModalOpen}
        onClose={() => setIsQrRecordModalOpen(false)}
        language={language}
        initialMode={qrModalMode}
        recordType={qrRecordType}
        selectedFarm={qrSelectedFarm}
        selectedHarvest={qrSelectedHarvest}
        farms={farms}
        harvests={harvests}
        plans={plans}
        expenses={expenses}
        activities={activities}
        sales={sales}
        hiredLabor={hiredLaborList}
        fertilizerApplications={fertilizerApplications}
        onSelectRecordFromScan={handleSelectRecordFromScan}
        onAddActivity={handleAddActivity}
        onAddExpense={handleAddExpense}
      />

      {/* Seed-to-Sale Agricultural Workflow Guide Modal */}
      <FarmWorkflowGuideModal
        isOpen={isWorkflowGuideOpen}
        onClose={() => setIsWorkflowGuideOpen(false)}
        language={language}
        onNavigateToTab={(tab) => {
          setCurrentTab(tab as any);
          setIsWorkflowGuideOpen(false);
        }}
        onOpenCropDoctor={() => {
          setCurrentTab("cropDoctor");
          setIsWorkflowGuideOpen(false);
        }}
        onOpenPlanCreator={() => {
          setCurrentTab("plans");
          setIsWorkflowGuideOpen(false);
        }}
        onOpenActivityModal={() => {
          setCurrentTab("activities");
          setIsWorkflowGuideOpen(false);
        }}
        onOpenHarvestModal={() => {
          setCurrentTab("harvestSales");
          setIsWorkflowGuideOpen(false);
        }}
        onOpenMarketPrices={() => {
          setCurrentTab("marketWeather");
          setIsWorkflowGuideOpen(false);
        }}
      />

      {/* 9. Footer */}
      <Footer
        language={language}
        onOpenContact={() => setIsContactModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isAdmin={currentUser?.role === "admin"}
        onOpenShare={() => setIsShareModalOpen(true)}
        onNavigate={(tab) => setCurrentTab(tab as any)}
        onOpenExportReport={() => setIsExportReportModalOpen(true)}
        onOpenUssd={() => setIsUssdModalOpen(true)}
      />
    </div>
  );
}

export default App;
