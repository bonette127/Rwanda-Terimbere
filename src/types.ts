export type Language = "rw" | "en" | "fr";

export type UserRole = "farmer" | "admin" | "cooperative_manager";

export type TeamRole = "agronomist" | "worker" | "cooperative_inspector";
export type AccessPermission = "view" | "manage";

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: TeamRole;
  permission: AccessPermission; // "view" = View only, "manage" = Can record and manage operations
  assignedFarmIds: string[]; // empty array means all farms, or array of specific farm IDs
  status: "active" | "pending_invitation" | "revoked";
  invitedAt: string;
  acceptedAt?: string;
  invitedBy: string; // name or id of the Farm Owner
  inviteCode: string; // e.g. "TRM-INV-8492"
  avatarUrl?: string;
  notes?: string;
  specialization?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  district: string;
  sector: string;
  farmSizeHa: number;
  primaryCrop: string;
  avatarUrl?: string;
  verified: boolean;
  nationalId: string; // 16 digits Rwandan National ID (Indangamuntu)
  nidVerified: boolean; // Verified with NIDA / Minagri
  cooperativeId?: string;
  cooperativeName?: string;
  createdAt: string;
}

export type SyncStatus = "synced" | "offline_pending" | "local_pending";

export interface PendingSyncItem {
  id: string;
  type: "expense" | "harvest" | "sale" | "activity" | "labor" | "transport";
  title: string;
  farmName: string;
  crop?: string;
  details?: string;
  amountOrQuantity?: string;
  date: string;
  syncStatus: SyncStatus;
  rawRecord?: any;
}

export interface HiredLabor {
  id: string;
  farmId: string;
  farmName: string;
  date: string;
  taskType: "land_prep" | "planting" | "weeding" | "spraying" | "harvesting" | "sorting" | "other";
  workerCount: number;
  dailyRateRwf: number;
  totalAmountRwf: number;
  supervisorName: string;
  paymentStatus: "paid" | "pending";
  paymentMethod: "momo" | "cash";
  syncStatus?: SyncStatus;
  notes?: string;
}

export interface TransportLog {
  id: string;
  farmId: string;
  farmName: string;
  date: string;
  purpose: "inputs_delivery" | "harvest_to_market" | "storage_transfer";
  vehicleType: "truck" | "pickup" | "tricycle" | "bicycle" | "motorcycle";
  origin: string;
  destination: string;
  driverName: string;
  driverPhone: string;
  cargoWeightKg: number;
  costRwf: number;
  paymentStatus: "paid" | "pending";
  syncStatus?: SyncStatus;
  notes?: string;
}

export type FertilizerApplicationMethod =
  | "basal_incorporation"
  | "side_dressing"
  | "ring_placement"
  | "foliar_spray"
  | "fertigation"
  | "broadcasting";

export interface FertilizerApplicationLog {
  id: string;
  farmId: string;
  farmName: string;
  crop: string;
  seasonCode: string;
  date: string;
  fertilizerType: string;
  npkRatio: string; // e.g. "17-17-17", "18-46-0", "46-0-0"
  nitrogenPct: number;
  phosphorusPct: number;
  potassiumPct: number;
  amountKg: number;
  areaAppliedHa: number;
  rateKgPerHa: number;
  applicationMethod: FertilizerApplicationMethod;
  growthStageApplied?: string;
  costRwf: number;
  operatorName: string;
  syncStatus?: SyncStatus;
  notes?: string;
}

export interface CropDiagnosis {
  id: string;
  farmId?: string;
  cropType: string;
  imageUrl: string;
  diagnosisDate: string;
  diseaseNameRw: string;
  diseaseNameEn: string;
  pathogen: string;
  confidenceScore: number;
  severity: "low" | "medium" | "high" | "critical";
  symptomsObserved: string[];
  immediateActionRw: string;
  immediateActionEn: string;
  recommendedChemical: string;
  organicAlternative: string;
  preventionAdviceRw: string;
  rabCertifiedGuideline: string;
  district?: string;
  sector?: string;
  latitude?: number;
  longitude?: number;
}

export interface DailyAgronomyTip {
  id: string;
  date: string;
  titleRw: string;
  titleEn: string;
  cropCategory: string;
  season: string;
  alertLevel: "normal" | "caution" | "warning";
  preventionAdviceRw: string;
  preventionAdviceEn: string;
  actionItemRw: string;
  rabAdvisoryCode: string;
  acknowledged?: boolean;
}

export interface CooperativeMember {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  sector: string;
  farmSizeHa: number;
  crop: string;
  status: "active" | "pending_verification";
}

export interface Cooperative {
  id: string;
  name: string;
  code: string;
  district: string;
  sector: string;
  presidentName: string;
  presidentPhone: string;
  totalHectares: number;
  memberCount: number;
  primaryCrops: string[];
  bulkOrders: {
    id: string;
    inputName: string;
    totalKgNeeded: number;
    subsidizedPriceRwf: number;
    commercialPriceRwf: number;
    status: "open" | "ordered" | "delivered";
  }[];
}

export interface LocationSuitability {
  latitude: number;
  longitude: number;
  district: string;
  sector: string;
  agroZone: string;
  altitudeMeters: number;
  soilType: string;
  soilPh: number;
  annualRainfallMm: number;
  suitabilityScore: number; // 0 to 100
  recommendedCrops: {
    cropRw: string;
    cropEn: string;
    suitability: "Optimal" | "Moderate" | "Marginal";
    expectedYieldTonsHa: number;
    notesRw: string;
  }[];
  soilRisks: string[];
  conservationTechniques: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: "auth" | "farm" | "expense" | "labor" | "diagnosis" | "admin";
  details: string;
}

export type ProductionScale = 
  | "subsistence" // < 0.5 Ha, < 4,000 kg
  | "semi_commercial" // 0.5 - 2.0 Ha, 4,000 - 15,000 kg
  | "medium_commercial" // 2.0 - 5.0 Ha, 15,000 - 50,000 kg
  | "large_commercial"; // > 5.0 Ha, > 50,000 kg

export interface Farm {
  id: string;
  name: string;
  province?: string; // e.g. "Amajyaruguru", "Uburasirazuba", "Amajyepfo", "Iburengerazuba", "Umujyi wa Kigali"
  district: string;
  sector: string;
  cell?: string;
  village?: string;
  agroZone?: string; // e.g. "Birunga Volcanic Highlands", "Eastern Savanna & Plains", "Southern Central Plateau"
  altitudeMeters?: number; // e.g. 2240
  latitude?: number; // e.g. -1.482
  longitude?: number; // e.g. 29.589
  gpsAccuracyMeters?: number;
  gpsCapturedAt?: string;
  sizeHa: number;
  scaleTier?: ProductionScale;
  soilType: string;
  irrigationType: "rainfed" | "irrigated" | "swamp";
  mainCrops: string[];
  plantedDate?: string;
  status?: "In Progress" | "Completed" | "Planning";
  imageUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Season {
  id: string;
  name: string;
  code: "2025A" | "2025B" | "2025C" | "2026A" | "2026B" | "2026C";
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface BudgetBreakdownItem {
  category: string;
  amount: number;
  notes: string;
}

export interface PlanTimelineItem {
  step: number;
  title: string;
  timing: string;
  advice: string;
}

export interface FarmPlan {
  id: string;
  farmId: string;
  farmName: string;
  crop: string;
  seasonCode: string;
  landSize: number;
  unit: string;
  budget: number;
  expectedYieldKg: number;
  expectedPricePerKg: number;
  expectedGrossRevenue: number;
  expectedNetProfit: number;
  budgetBreakdown: BudgetBreakdownItem[];
  timeline: PlanTimelineItem[];
  status: "planning" | "active" | "completed";
  plantedDate?: string;
  predictedHarvestDate?: string;
  daysToMaturity?: number;
  rabTips?: string;
  createdAt: string;
  growthStagePercentage?: number; // 0 - 100%
  currentGrowthStage?: string;
  lastStageUpdated?: string;
  stageNotes?: string;
}

export type ExpenseCategory = 
  | "seeds" 
  | "fertilizer" 
  | "pesticides" 
  | "labor" 
  | "irrigation" 
  | "transport" 
  | "equipment" 
  | "other";

export interface Expense {
  id: string;
  farmId: string;
  farmName: string;
  crop: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  syncStatus: SyncStatus;
}

export type ActivityCategory = 
  | "land_prep" 
  | "planting" 
  | "fertilizing" 
  | "weeding" 
  | "spraying" 
  | "irrigation" 
  | "harvesting" 
  | "post_harvest";

export type ShiftWindowId =
  | "06:00-08:00"
  | "08:00-10:00"
  | "10:00-12:00"
  | "12:00-14:00"
  | "14:00-16:00"
  | "16:00-18:00";

export interface FarmActivity {
  id: string;
  farmId: string;
  farmName: string;
  crop: string;
  title: string;
  category: ActivityCategory;
  dueDate: string;
  completedDate?: string;
  status: "pending" | "in_progress" | "completed";
  assignedTo?: string;
  syncStatus?: SyncStatus;
  notes?: string;
  shiftWindow?: ShiftWindowId;
  dayOfWeekIndex?: number; // 0 = Mon, 1 = Tue, ..., 6 = Sun
  latitude?: number;
  longitude?: number;
  gpsAccuracyMeters?: number;
  gpsCapturedAt?: string;
  fertilizerType?: string;
  npkRatio?: string;
  amountKg?: number;
  areaAppliedHa?: number;
  applicationMethod?: FertilizerApplicationMethod;
  alertLeadDays?: number;
  alertTriggerDate?: string;
}

export interface HarvestRecord {
  id: string;
  farmId: string;
  farmName: string;
  district?: string;
  sector?: string;
  agroZone?: string;
  crop: string;
  harvestDate: string;
  quantityKg: number;
  qualityGrade: "A" | "B" | "C";
  storageLocation: string;
  syncStatus?: SyncStatus;
  // QR Batch & Transport Traceability fields
  batchCode?: string; // Unique QR batch tracking code (e.g. RW-HARV-MUS-2025-001)
  destinationMarket?: string; // e.g. "Isoko rya Nyabugogo / Kigali Wholesale"
  transporterName?: string; // e.g. "COOPAMA Transport / Murenzi (RAD 812B)"
  transporterPhone?: string; // e.g. "+250 788 345 678"
  certificationCode?: string; // e.g. "RICA-CERT-2025-089A"
  // Input and Production Scale Analytics
  seedInputKg?: number; // Total seeds planted in Kg
  fertilizerInputKg?: number; // Total mineral/organic fertilizer in Kg
  totalInputCostRwf?: number; // Total expenses for inputs
  areaHarvestedHa?: number; // Area in Ha
  yieldPerHaTons?: number; // Calculated Tons/Ha
  seedMultiplierRatio?: number; // e.g. 10.0x (1kg seed -> 10kg harvest)
  fertilizerConversionRatio?: number; // e.g. 32 kg harvest / kg fertilizer
  rabBenchmarkTonsHa?: number; // e.g. 14.5 T/Ha for Kinigi potatoes, 4.0 T/Ha for maize
  scaleTier?: ProductionScale;
  notes?: string;
}

export interface SaleRecord {
  id: string;
  farmId: string;
  crop: string;
  saleDate: string;
  buyerName: string;
  buyerType: "cooperative" | "wholesaler" | "local_market" | "retail";
  quantityKg: number;
  unitPriceRwf: number;
  totalAmountRwf: number;
  paymentMethod: "momo" | "airtel" | "cash" | "bank";
  syncStatus?: SyncStatus;
  notes?: string;
}

export interface CropDisease {
  name: string;
  symptoms: string;
  treatment: string;
}

export interface AgronomyGuide {
  id: string;
  cropKey: string;
  nameRw: string;
  nameEn: string;
  nameFr: string;
  bestVarieties: string[];
  soilRequirements: string;
  fertilizerGuide: string;
  spacing: string;
  maturityDays: number;
  averageYieldTonsHa: number;
  diseasesAndPests: CropDisease[];
  rabAdvice: string;
}

export interface MarketPrice {
  id: string;
  marketName: string;
  district: string;
  crop: string;
  priceMin: number;
  priceMax: number;
  priceAvg: number;
  unit: string;
  trend: "up" | "down" | "stable";
  lastUpdated: string;
}

export interface HourlyWeatherForecast {
  time: string; // e.g., "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"
  tempC: number;
  rainfallMm: number;
  pop: number; // probability of precipitation (0-100%)
  conditionRw: string;
  conditionEn: string;
  conditionFr: string;
  icon: "sun" | "cloud-sun" | "cloud-rain" | "cloud-lightning" | "wind" | "cloud";
  farmingSuitability: "optimal" | "moderate" | "unfavorable";
  farmingTipRw: string;
  farmingTipEn: string;
}

export interface DailyWeatherForecast {
  date: string; // "2026-09-25"
  dayNameRw: string; // "Uyu munsi", "Kuwa Gatandatu", etc.
  dayNameEn: string; // "Today", "Sat", "Sun", etc.
  dayNameFr: string; // "Aujourd'hui", "Sam", "Dim", etc.
  tempMinC: number;
  tempMaxC: number;
  conditionRw: string;
  conditionEn: string;
  conditionFr: string;
  rainfallMm: number;
  pop: number; // probability of precipitation %
  humidity: number;
  windSpeedKmh: number;
  icon: "sun" | "cloud-sun" | "cloud-rain" | "cloud-lightning" | "wind" | "cloud";
  recommendedFarmingActivitiesRw: string[];
  recommendedFarmingActivitiesEn: string[];
  cautionRw?: string;
  cautionEn?: string;
  farmingSuitability: "optimal" | "moderate" | "unfavorable";
}

export interface WeatherForecast {
  district: string;
  province: string;
  tempC: number;
  conditionRw: string;
  conditionEn: string;
  conditionFr: string;
  rainfallMm: number;
  humidity: number;
  agriAdvisoryRw: string;
  agriAdvisoryEn: string;
  agriAdvisoryFr: string;
}


export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  suggestedPlan?: {
    cropName: string;
    area: number;
    unit: string;
    estimatedBudget: number;
    projectedYieldKg: number;
    targetPricePerKg: number;
    expectedGrossRevenue: number;
    expectedNetProfit: number;
    durationDays: number;
    phases: Array<{ phase: string; days: string; cost: number }>;
  };
}

export interface TrainingCourse {
  id: string;
  title: string;
  subtitle?: string;
  category: "potato" | "maize" | "fertilizer" | "modern" | "diseases" | "general";
  type: "course" | "video";
  durationMinutes: number;
  thumbnailUrl: string;
  description: string;
  instructor: string;
  rabCertified: boolean;
  videoUrl?: string;
}

export interface CultivationCycleStage {
  stageNumber: number;
  nameRw: string;
  nameEn: string;
  nameFr: string;
  periodWeeks: string;
  tasks: string[];
  keyInputs: string[];
  rabAdvice: string;
  status: "completed" | "current" | "upcoming";
}

export type HarvestAlertUrgency = "urgent" | "approaching" | "upcoming" | "overdue";

export interface HarvestNotification {
  id: string;
  planId: string;
  farmId: string;
  farmName: string;
  crop: string;
  predictedHarvestDate: string;
  daysRemaining: number;
  urgency: HarvestAlertUrgency;
  titleRw: string;
  titleEn: string;
  messageRw: string;
  messageEn: string;
  rabAdvisoryRw: string;
  rabAdvisoryEn: string;
  expectedYieldKg?: number;
  read: boolean;
  dismissed?: boolean;
  createdAt: string;
}

export type ActivityAlertUrgency = "due_today" | "due_tomorrow" | "due_in_2_days" | "due_in_3_days" | "overdue";

export interface ScheduledActivityAlert {
  id: string;
  activityId: string;
  farmId: string;
  farmName: string;
  crop: string;
  title: string;
  category: "fertilizing" | "irrigation";
  dueDate: string;
  daysRemaining: number;
  urgency: ActivityAlertUrgency;
  isThreeDaysBefore: boolean;
  isTwoDaysBefore?: boolean;
  alertTriggerDate?: string;
  titleRw: string;
  titleEn: string;
  titleFr: string;
  messageRw: string;
  messageEn: string;
  messageFr: string;
  checklistRw: string[];
  checklistEn: string[];
  checklistFr: string[];
  suggestedInput?: string;
  weatherAdviceRw?: string;
  weatherAdviceEn?: string;
  read?: boolean;
  dismissed?: boolean;
}

export type IrrigationDemandLevel = "critical" | "high" | "moderate" | "optimal" | "saturated";

export type SoilSensorSourceMode = "weather_model" | "manual_probe" | "iot_telemetry";

export interface ParcelSoilSensorReading {
  farmId: string;
  mode: SoilSensorSourceMode;
  sensorId: string; // e.g. "IOT-SM-MUS-01" or "MANUAL-PROBE-15CM"
  moisturePercentage: number; // 10 - 98% VWC
  soilTempC: number; // e.g. 18.5°C
  ecDsM: number; // Electrical Conductivity (dS/m), e.g. 1.2 dS/m
  probeDepthCm: number; // e.g. 15cm or 25cm root zone
  batteryPct?: number; // e.g. 94% for IoT telemetry
  signalRssiDbm?: number; // e.g. -68 dBm LoRaWAN / GSM
  updatedAt: string;
}

export interface PredictiveDailyDepletion {
  dayOffset: 1 | 2 | 3;
  dateStr: string;
  dayLabelEn: string;
  dayLabelRw: string;
  forecastTempC: number;
  tempDeltaC: number;
  forecastHumidityPct: number;
  forecastRainMm: number;
  vaporPressureDeficitKpa: number;
  referenceEt0Mm: number; // Reference evapotranspiration (mm/day)
  cropEtcMm: number; // Crop evapotranspiration ETc = ET0 * Kc (mm/day)
  effectiveRainMm: number; // Infiltrated rain recharge (mm/day)
  netWaterLossMm: number; // Net root-zone water loss (mm/day)
  moistureDepletionPct: number; // Expected % VWC drop during this day
  startMoisturePct: number;
  projectedEndMoisturePct: number;
  isBelowThreshold: boolean;
  predictiveWaterMm: number; // Irrigation depth (mm) needed on this day
  predictiveWaterLiters: number; // Total water volume (Liters) for parcel sizeHa
  predictiveWaterLitersPerHa: number;
  pumpRuntimeHours: number;
}

export interface CropVarietyIrrigationRule {
  id: string;
  cropVarietyKey: string;
  cropNameEn: string;
  cropNameRw: string;
  varietyLabel: string;
  triggerMoisturePct: number; // e.g. 35 (triggers when moisture < triggerMoisturePct)
  targetReplenishPct: number; // e.g. 75% VWC
  rootZoneDepthCm: number; // e.g. 15cm or 25cm
  autoPushEnabled: boolean;
  backgroundWatchEnabled: boolean;
  autoScheduleTaskOnBreach: boolean;
  lastTriggeredAt?: string;
}

export interface AutomatedThresholdBreachEvent {
  id: string;
  ruleId: string;
  cropVarietyKey: string;
  cropName: string;
  farmId: string;
  farmName: string;
  district: string;
  measuredMoisturePct: number;
  triggerThresholdPct: number;
  deficitMm: number;
  recommendedLiters: number;
  triggeredInBackground: boolean;
  timestamp: string;
  acknowledged?: boolean;
}

export interface IrrigationDemandAlert {
  id: string;
  farmId: string;
  farmName: string;
  farmSizeHa?: number;
  planId?: string;
  crop: string;
  district: string;
  agroZone?: string;
  soilType: string;
  irrigationType: "rainfed" | "irrigated" | "swamp";
  soilMoisturePercentage: number; // 0 - 100% estimated or sensor-measured available water capacity
  thresholdPercentage: number; // Moisture trigger threshold (e.g., 35% or 40%)
  isAutomatedThresholdBreached?: boolean;
  matchedCropRule?: CropVarietyIrrigationRule;
  status: IrrigationDemandLevel;
  sensorReading?: ParcelSoilSensorReading;
  threeDayForecast?: PredictiveDailyDepletion[];
  weatherSummary: {
    tempC: number;
    rainfallMm: number;
    humidity: number;
    conditionRw: string;
    conditionEn: string;
  };
  criticalHumidityThreshold?: number;
  isLowHumidityAlert?: boolean;
  vaporPressureDeficitKpa?: number;
  humidityAlertTitleRw?: string;
  humidityAlertTitleEn?: string;
  humidityAlertMessageRw?: string;
  humidityAlertMessageEn?: string;
  growthStageSummary: {
    percentage: number;
    stageName: string;
    isPeakWaterDemand: boolean;
    cropCoefficientKc: number;
  };
  waterDeficitMm: number;
  recommendedWaterMm: number;
  recommendedWaterLitersPerHa: number;
  recommendedMethodRw: string;
  recommendedMethodEn: string;
  suggestedTimeWindow: string;
  titleRw: string;
  titleEn: string;
  titleFr: string;
  messageRw: string;
  messageEn: string;
  messageFr: string;
  rabAdvisoryRw: string;
  rabAdvisoryEn: string;
  rabAdvisoryFr: string;
  suggestedActivity: Omit<FarmActivity, "id">;
  read?: boolean;
  dismissed?: boolean;
  createdAt: string;
}

export type FarmAssetCategory =
  | "sprayer"
  | "irrigation_pump"
  | "tillage_tool"
  | "soil_sensor"
  | "harvest_crate"
  | "tractor_implement";

export type FarmAssetCondition = "excellent" | "good" | "maintenance_due";

export interface FarmAsset {
  id: string;
  assetTagCode: string; // Unique QR Code identifier e.g. "TRM-EQP-MUS-001"
  name: string;
  category: FarmAssetCategory;
  farmId: string;
  farmName: string;
  serialNumber: string;
  condition: FarmAssetCondition;
  assignedCustodian: string;
  purchaseValueRwf: number;
  lastInspectedDate: string;
  qrLinkedAt: string;
  notes?: string;
}

