import {
  Expense,
  FarmActivity,
  HarvestRecord,
  SaleRecord,
  HiredLabor,
  TransportLog,
  PendingSyncItem,
} from "../types";

export const getPendingSyncItems = (
  expenses: Expense[] = [],
  activities: FarmActivity[] = [],
  harvests: HarvestRecord[] = [],
  sales: SaleRecord[] = [],
  hiredLabor: HiredLabor[] = [],
  transportLogs: TransportLog[] = []
): PendingSyncItem[] => {
  const items: PendingSyncItem[] = [];

  // 1. Expenses
  for (const exp of expenses) {
    if (exp.syncStatus === "offline_pending" || exp.syncStatus === "local_pending") {
      items.push({
        id: exp.id,
        type: "expense",
        title: exp.description || `Expense: ${exp.category}`,
        farmName: exp.farmName,
        crop: exp.crop,
        details: `${exp.category.toUpperCase()} • Recorded offline`,
        amountOrQuantity: `${exp.amount.toLocaleString()} RWF`,
        date: exp.date,
        syncStatus: exp.syncStatus,
        rawRecord: exp,
      });
    }
  }

  // 2. Harvests
  for (const h of harvests) {
    if (h.syncStatus === "offline_pending" || h.syncStatus === "local_pending") {
      items.push({
        id: h.id,
        type: "harvest",
        title: `Harvest: ${h.quantityKg.toLocaleString()} kg (${h.crop})`,
        farmName: h.farmName,
        crop: h.crop,
        details: `Quality Grade ${h.qualityGrade} • Storage: ${h.storageLocation}${
          h.batchCode ? ` • Batch ${h.batchCode}` : ""
        }`,
        amountOrQuantity: `${h.quantityKg.toLocaleString()} kg`,
        date: h.harvestDate,
        syncStatus: h.syncStatus,
        rawRecord: h,
      });
    }
  }

  // 3. Sales
  for (const s of sales) {
    if (s.syncStatus === "offline_pending" || s.syncStatus === "local_pending") {
      items.push({
        id: s.id,
        type: "sale",
        title: `Sale: ${s.quantityKg.toLocaleString()} kg to ${s.buyerName}`,
        farmName: s.crop,
        crop: s.crop,
        details: `${s.buyerType.toUpperCase()} • Paid via ${s.paymentMethod.toUpperCase()}`,
        amountOrQuantity: `${s.totalAmountRwf.toLocaleString()} RWF`,
        date: s.saleDate,
        syncStatus: s.syncStatus,
        rawRecord: s,
      });
    }
  }

  // 4. Activities
  for (const a of activities) {
    if (a.syncStatus === "offline_pending" || a.syncStatus === "local_pending") {
      items.push({
        id: a.id,
        type: "activity",
        title: `Field Activity: ${a.title}`,
        farmName: a.farmName,
        crop: a.crop,
        details: `Category: ${a.category} • Status: ${a.status.toUpperCase()}`,
        amountOrQuantity: a.status.toUpperCase(),
        date: a.dueDate,
        syncStatus: a.syncStatus,
        rawRecord: a,
      });
    }
  }

  // 5. Hired Labor
  for (const l of hiredLabor) {
    if (l.syncStatus === "offline_pending" || l.syncStatus === "local_pending") {
      items.push({
        id: l.id,
        type: "labor",
        title: `Labor: ${l.workerCount} workers for ${l.taskType.replace(/_/g, " ")}`,
        farmName: l.farmName,
        details: `Supervisor: ${l.supervisorName} • Rate: ${l.dailyRateRwf.toLocaleString()} RWF/day`,
        amountOrQuantity: `${l.totalAmountRwf.toLocaleString()} RWF`,
        date: l.date,
        syncStatus: l.syncStatus,
        rawRecord: l,
      });
    }
  }

  // 6. Transport Logs
  for (const t of transportLogs) {
    if (t.syncStatus === "offline_pending" || t.syncStatus === "local_pending") {
      items.push({
        id: t.id,
        type: "transport",
        title: `Transport: ${t.purpose.replace(/_/g, " ")}`,
        farmName: t.farmName,
        details: `${t.vehicleType.toUpperCase()} • Driver: ${t.driverName} (${t.origin} ➔ ${t.destination})`,
        amountOrQuantity: `${t.costRwf.toLocaleString()} RWF`,
        date: t.date,
        syncStatus: t.syncStatus,
        rawRecord: t,
      });
    }
  }

  return items;
};
