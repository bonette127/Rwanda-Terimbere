import {
  Expense,
  Farm,
  FarmActivity,
  FarmPlan,
  HarvestRecord,
  HiredLabor,
  SaleRecord,
  TransportLog,
  User,
} from "../types";

export type OfflineBackupScope = "all_local" | "unsynced_only";

export interface OfflineBackupCategorySelection {
  expenses: boolean;
  harvests: boolean;
  activities: boolean;
  includeFarmsAndPlans?: boolean;
  includeSalesAndLogistics?: boolean;
}

export interface OfflineBackupPayload {
  schemaVersion: "1.0.0";
  backupType: "TERIMBERE_LOCAL_OFFLINE_RECORDS_BACKUP";
  platform: string;
  exportedAt: string;
  exportedDate: string;
  seasonCode: string;
  connectionStatus: "offline" | "online";
  exportScope: OfflineBackupScope;
  farmer: {
    name: string;
    district: string;
    role: string;
  };
  integrityHash: string;
  summary: {
    totalRecordsExported: number;
    expensesCount: number;
    pendingExpensesCount: number;
    totalExpensesRwf: number;
    harvestsCount: number;
    pendingHarvestsCount: number;
    totalHarvestedKg: number;
    activitiesCount: number;
    pendingActivitiesCount: number;
    completedActivitiesCount: number;
    farmsCount: number;
    plansCount: number;
    salesCount: number;
  };
  records: {
    expenses: Expense[];
    harvests: HarvestRecord[];
    activities: FarmActivity[];
    farms?: Farm[];
    plans?: FarmPlan[];
    sales?: SaleRecord[];
    hiredLabor?: HiredLabor[];
    transportLogs?: TransportLog[];
  };
}

export interface BuildOfflineBackupParams {
  expenses: Expense[];
  harvests: HarvestRecord[];
  activities: FarmActivity[];
  farms?: Farm[];
  plans?: FarmPlan[];
  sales?: SaleRecord[];
  hiredLabor?: HiredLabor[];
  transportLogs?: TransportLog[];
  currentUser?: User | null;
  isOnline?: boolean;
  seasonCode?: string;
  scope?: OfflineBackupScope;
  categories?: OfflineBackupCategorySelection;
}

const isUnsyncedStatus = (status?: string): boolean => {
  return status === "offline_pending" || status === "local_pending";
};

/**
 * Generates a lightweight deterministic integrity fingerprint for the JSON backup
 */
export const computeBackupIntegrityHash = (content: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `TRM-JSON-${unsigned}-${content.length}`;
};

/**
 * Builds the structured Offline JSON Backup payload for expenses, harvests, and activities
 */
export const buildOfflineBackupPayload = ({
  expenses = [],
  harvests = [],
  activities = [],
  farms = [],
  plans = [],
  sales = [],
  hiredLabor = [],
  transportLogs = [],
  currentUser = null,
  isOnline = false,
  seasonCode = "2026B",
  scope = "all_local",
  categories = {
    expenses: true,
    harvests: true,
    activities: true,
    includeFarmsAndPlans: false,
    includeSalesAndLogistics: false,
  },
}: BuildOfflineBackupParams): OfflineBackupPayload => {
  const now = new Date();
  const exportedAt = now.toISOString();
  const exportedDate = exportedAt.split("T")[0];

  const selectedExpenses = categories.expenses
    ? scope === "unsynced_only"
      ? expenses.filter((e) => isUnsyncedStatus(e.syncStatus))
      : expenses
    : [];

  const selectedHarvests = categories.harvests
    ? scope === "unsynced_only"
      ? harvests.filter((h) => isUnsyncedStatus(h.syncStatus))
      : harvests
    : [];

  const selectedActivities = categories.activities
    ? scope === "unsynced_only"
      ? activities.filter((a) => isUnsyncedStatus(a.syncStatus))
      : activities
    : [];

  const selectedFarms = categories.includeFarmsAndPlans ? farms : undefined;
  const selectedPlans = categories.includeFarmsAndPlans ? plans : undefined;

  const selectedSales = categories.includeSalesAndLogistics
    ? scope === "unsynced_only"
      ? sales.filter((s) => isUnsyncedStatus(s.syncStatus))
      : sales
    : undefined;

  const selectedLabor = categories.includeSalesAndLogistics
    ? scope === "unsynced_only"
      ? hiredLabor.filter((l) => isUnsyncedStatus(l.syncStatus))
      : hiredLabor
    : undefined;

  const selectedTransport = categories.includeSalesAndLogistics
    ? scope === "unsynced_only"
      ? transportLogs.filter((t) => isUnsyncedStatus(t.syncStatus))
      : transportLogs
    : undefined;

  const totalExpensesRwf = selectedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalHarvestedKg = selectedHarvests.reduce(
    (sum, h) => sum + (Number(h.quantityKg) || 0),
    0
  );
  const completedActivitiesCount = selectedActivities.filter(
    (a) => a.status === "completed"
  ).length;

  const pendingExpensesCount = selectedExpenses.filter((e) =>
    isUnsyncedStatus(e.syncStatus)
  ).length;
  const pendingHarvestsCount = selectedHarvests.filter((h) =>
    isUnsyncedStatus(h.syncStatus)
  ).length;
  const pendingActivitiesCount = selectedActivities.filter((a) =>
    isUnsyncedStatus(a.syncStatus)
  ).length;

  const totalRecordsExported =
    selectedExpenses.length +
    selectedHarvests.length +
    selectedActivities.length +
    (selectedFarms?.length || 0) +
    (selectedPlans?.length || 0) +
    (selectedSales?.length || 0) +
    (selectedLabor?.length || 0) +
    (selectedTransport?.length || 0);

  const recordsObj: OfflineBackupPayload["records"] = {
    expenses: selectedExpenses,
    harvests: selectedHarvests,
    activities: selectedActivities,
  };

  if (categories.includeFarmsAndPlans) {
    recordsObj.farms = selectedFarms;
    recordsObj.plans = selectedPlans;
  }

  if (categories.includeSalesAndLogistics) {
    recordsObj.sales = selectedSales;
    recordsObj.hiredLabor = selectedLabor;
    recordsObj.transportLogs = selectedTransport;
  }

  const rawCoreString = JSON.stringify({
    exportedDate,
    seasonCode,
    scope,
    records: recordsObj,
  });

  const integrityHash = computeBackupIntegrityHash(rawCoreString);

  return {
    schemaVersion: "1.0.0",
    backupType: "TERIMBERE_LOCAL_OFFLINE_RECORDS_BACKUP",
    platform: "TERIMBERE — AgriRwanda Pro (Local Offline Field Ledger)",
    exportedAt,
    exportedDate,
    seasonCode,
    connectionStatus: isOnline ? "online" : "offline",
    exportScope: scope,
    farmer: {
      name: currentUser?.name || "Umuhinzi wa TERIMBERE (Local Device)",
      district: currentUser?.district || farms[0]?.district || "Musanze",
      role: currentUser?.role || "farmer",
    },
    integrityHash,
    summary: {
      totalRecordsExported,
      expensesCount: selectedExpenses.length,
      pendingExpensesCount,
      totalExpensesRwf,
      harvestsCount: selectedHarvests.length,
      pendingHarvestsCount,
      totalHarvestedKg,
      activitiesCount: selectedActivities.length,
      pendingActivitiesCount,
      completedActivitiesCount,
      farmsCount: selectedFarms?.length || 0,
      plansCount: selectedPlans?.length || 0,
      salesCount: selectedSales?.length || 0,
    },
    records: recordsObj,
  };
};

/**
 * Triggers a browser download of the JSON backup payload
 */
export const downloadOfflineBackupJson = (
  payload: OfflineBackupPayload,
  customFilename?: string
): string => {
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], {
    type: "application/json;charset=utf-8",
  });

  const scopeSuffix =
    payload.exportScope === "unsynced_only" ? "offline-pending" : "local-records";
  const filename =
    customFilename ||
    `terimbere-${scopeSuffix}-backup-${payload.exportedDate}.json`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return filename;
};

/**
 * Convenience function for immediate 1-click JSON download of local expenses, harvests & activities
 */
export const quickExportLocalOfflineJson = (
  params: BuildOfflineBackupParams
): { filename: string; payload: OfflineBackupPayload } => {
  const payload = buildOfflineBackupPayload(params);
  const filename = downloadOfflineBackupJson(payload);
  return { filename, payload };
};

export interface ParsedOfflineBackupResult {
  valid: boolean;
  error?: string;
  payload?: OfflineBackupPayload;
}

/**
 * Parses and validates an uploaded JSON backup file for local restoration
 */
export const parseOfflineBackupJson = (
  rawJsonText: string
): ParsedOfflineBackupResult => {
  try {
    const parsed = JSON.parse(rawJsonText);
    if (!parsed || typeof parsed !== "object") {
      return {
        valid: false,
        error: "Invalid JSON object format.",
      };
    }

    // Support either our standard envelope `{ records: { expenses, harvests, activities } }`
    // or a direct object `{ expenses, harvests, activities }`
    const recordsSource = parsed.records && typeof parsed.records === "object"
      ? parsed.records
      : parsed;

    const expenses = Array.isArray(recordsSource.expenses)
      ? recordsSource.expenses
      : [];
    const harvests = Array.isArray(recordsSource.harvests)
      ? recordsSource.harvests
      : [];
    const activities = Array.isArray(recordsSource.activities)
      ? recordsSource.activities
      : [];

    if (
      !Array.isArray(recordsSource.expenses) &&
      !Array.isArray(recordsSource.harvests) &&
      !Array.isArray(recordsSource.activities)
    ) {
      return {
        valid: false,
        error:
          "JSON file does not contain valid expenses, harvests, or activities arrays.",
      };
    }

    const normalizedPayload: OfflineBackupPayload = {
      schemaVersion: "1.0.0",
      backupType: "TERIMBERE_LOCAL_OFFLINE_RECORDS_BACKUP",
      platform:
        parsed.platform || "TERIMBERE — AgriRwanda Pro (Restored Backup)",
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      exportedDate:
        parsed.exportedDate || new Date().toISOString().split("T")[0],
      seasonCode: parsed.seasonCode || "2026B",
      connectionStatus: parsed.connectionStatus || "offline",
      exportScope: parsed.exportScope || "all_local",
      farmer: parsed.farmer || {
        name: "Restored Farmer Profile",
        district: "Musanze",
        role: "farmer",
      },
      integrityHash: parsed.integrityHash || "TRM-JSON-RESTORED",
      summary: {
        totalRecordsExported:
          expenses.length + harvests.length + activities.length,
        expensesCount: expenses.length,
        pendingExpensesCount: expenses.filter((e: Expense) =>
          isUnsyncedStatus(e.syncStatus)
        ).length,
        totalExpensesRwf: expenses.reduce(
          (s: number, e: Expense) => s + (Number(e.amount) || 0),
          0
        ),
        harvestsCount: harvests.length,
        pendingHarvestsCount: harvests.filter((h: HarvestRecord) =>
          isUnsyncedStatus(h.syncStatus)
        ).length,
        totalHarvestedKg: harvests.reduce(
          (s: number, h: HarvestRecord) => s + (Number(h.quantityKg) || 0),
          0
        ),
        activitiesCount: activities.length,
        pendingActivitiesCount: activities.filter((a: FarmActivity) =>
          isUnsyncedStatus(a.syncStatus)
        ).length,
        completedActivitiesCount: activities.filter(
          (a: FarmActivity) => a.status === "completed"
        ).length,
        farmsCount: Array.isArray(recordsSource.farms)
          ? recordsSource.farms.length
          : 0,
        plansCount: Array.isArray(recordsSource.plans)
          ? recordsSource.plans.length
          : 0,
        salesCount: Array.isArray(recordsSource.sales)
          ? recordsSource.sales.length
          : 0,
      },
      records: {
        expenses,
        harvests,
        activities,
        farms: Array.isArray(recordsSource.farms)
          ? recordsSource.farms
          : undefined,
        plans: Array.isArray(recordsSource.plans)
          ? recordsSource.plans
          : undefined,
        sales: Array.isArray(recordsSource.sales)
          ? recordsSource.sales
          : undefined,
      },
    };

    return {
      valid: true,
      payload: normalizedPayload,
    };
  } catch (err) {
    return {
      valid: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to parse JSON backup file.",
    };
  }
};
