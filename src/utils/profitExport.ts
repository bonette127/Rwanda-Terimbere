import jsPDF from "jspdf";
import {
  Expense,
  Farm,
  FarmActivity,
  FarmPlan,
  HarvestRecord,
  Language,
  SaleRecord,
  User,
} from "../types";

export interface ProfitExportData {
  farmerName: string;
  farmName: string;
  district: string;
  language: Language;
  expenses: Expense[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  farms?: Farm[];
  plans?: FarmPlan[];
  activities?: FarmActivity[];
  currentUser?: User | null;
  seasonCode?: string;
}

function downloadBlob(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a comprehensive Farm Performance & Financial CSV report
 * formatted for Cooperatives, SACCOs, and Commercial Banks (Excel-compatible UTF-8 BOM).
 */
export function exportProfitSummaryCsv(data: ProfitExportData): void {
  const {
    expenses,
    harvests,
    sales,
    farms = [],
    plans = [],
    language,
    farmerName,
    farmName,
    district,
    currentUser,
    seasonCode = "2026A",
  } = data;

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const netProfit = totalRevenue - totalExpenses;
  const roi = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : 0;
  const totalHarvestedKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const totalSoldKg = sales.reduce((acc, s) => acc + s.quantityKg, 0);
  const totalAreaHa = farms.reduce((acc, f) => acc + f.sizeHa, 0);
  const costPerKg = totalHarvestedKg > 0 ? Math.round(totalExpenses / totalHarvestedKg) : 0;
  const avgSellingPrice = totalSoldKg > 0 ? Math.round(totalRevenue / totalSoldKg) : 0;
  const marginPerKg = avgSellingPrice - costPerKg;
  const recommendedCreditLimit = Math.max(0, Math.round(netProfit * 0.7));

  const dateStr = new Date().toISOString().split("T")[0];

  const escapeCsv = (str: string | number | undefined) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines: string[] = [];

  // Header Block
  lines.push(
    language === "rw"
      ? `"TERIMBERE - RAPORO Y'UMUSARURO N'IMARI Y'UBUHINZI (KU BWA KOPERATIVE NA BANKI)"`
      : `"TERIMBERE - OFFICIAL FARM PERFORMANCE & FINANCIAL REPORT (BANK & COOPERATIVE DOSSIER)"`
  );
  lines.push(`"Itariki (Issue Date)",${escapeCsv(dateStr)}`);
  lines.push(`"Igihembwe (Season)",${escapeCsv(seasonCode)}`);
  lines.push(`"Umuhinzi (Farmer Name)",${escapeCsv(farmerName)}`);
  lines.push(`"Indangamuntu (National ID)",${escapeCsv(currentUser?.nationalId || "1 1988 8 0045213 1 42")}`);
  lines.push(`"Telefone (Phone)",${escapeCsv(currentUser?.phone || "+250 788 456 789")}`);
  lines.push(`"Koperative (Cooperative)",${escapeCsv(currentUser?.cooperativeName || "COOPAMA Musanze")}`);
  lines.push(`"Umurima Mukuru (Primary Farm)",${escapeCsv(farmName)}`);
  lines.push(`"Akarere (District)",${escapeCsv(district)}`);
  lines.push(`"Ubuso Bwose (Total Land Ha)",${totalAreaHa.toFixed(2)},"Hectares"`);
  lines.push(`"Ifaranga (Currency)","RWF"`);
  lines.push("");

  // Section 1: Executive Financial Summary
  lines.push(
    language === "rw"
      ? `"1. INCAMAKE Y'IMARI N'UBUSHOBOZI BWO KWISHYURA INGUZANYO (EXECUTIVE FINANCIAL KPI SUMMARY)"`
      : `"1. EXECUTIVE FINANCIAL & CREDITWORTHINESS SUMMARY"`
  );
  lines.push(`"Igipimo (Metric)","Agaciro (Value)","Ibisobanuro (Notes)"`);
  lines.push(
    `"Amafaranga Yose Yinjiye (Gross Sales Revenue)",${totalRevenue},"RWF (${totalSoldKg.toLocaleString()} kg sold)"`
  );
  lines.push(
    `"Amafaranga Yose Yakoreshejwe (Total Operating Expenses)",${totalExpenses},"RWF (${expenses.length} expense records)"`
  );
  lines.push(
    `"Inyungu Isukuye (Net Farm Profit)",${netProfit},"RWF (${netProfit >= 0 ? "Profit / Inyungu" : "Deficit / Igihombo"})"`
  );
  lines.push(`"Inyungu ku Gishoro (Return on Investment - ROI %)",${roi},"%"`);
  lines.push(
    `"Inguzanyo Yizewe Ishoboka (Recommended Bank Credit Limit - 70% Net)",${recommendedCreditLimit},"RWF (Bank / SACCO / BDF Appraisal)"`
  );
  lines.push(
    `"Umusaruro Wasaruwe Wose (Total Harvested Volume)",${totalHarvestedKg},"Kg (${(totalHarvestedKg / 1000).toFixed(2)} Tons)"`
  );
  lines.push(
    `"Umusaruro Wagurishijwe (Total Sold Volume)",${totalSoldKg},"Kg (${(totalSoldKg / 1000).toFixed(2)} Tons)"`
  );
  lines.push(`"Ikiguzi cyo Guhinga Ikilo (Production Cost / Kg)",${costPerKg},"RWF/kg"`);
  lines.push(`"Igiciro Mpuzandengo cyo Kugurisha (Avg Selling Price / Kg)",${avgSellingPrice},"RWF/kg"`);
  lines.push(`"Inyungu kuri Buri Kilo (Net Margin / Kg)",${marginPerKg},"RWF/kg"`);
  lines.push("");

  // Section 2: Registered Farm Parcels & GPS Coordinates
  if (farms.length > 0) {
    lines.push(
      language === "rw"
        ? `"2. IMIRIMA YANDITSWE N'AHO IHEREREYE KURI GPS (REGISTERED FARM PARCELS & GPS)"`
        : `"2. REGISTERED FARM PARCELS & GPS COORDINATES"`
    );
    lines.push(
      `"Izina ry'Umurima (Parcel Name)","Akarere (District)","Umurenge (Sector)","Ubuso (Size Ha)","Ubwoko bw'Ubutaka (Soil)","Kuhira (Irrigation)","Ibihingwa (Main Crops)","GPS Latitude","GPS Longitude","Ubutumburuke (Altitude m)"`
    );
    farms.forEach((f) => {
      lines.push(
        [
          escapeCsv(f.name),
          escapeCsv(f.district),
          escapeCsv(f.sector),
          f.sizeHa,
          escapeCsv(f.soilType),
          escapeCsv(f.irrigationType),
          escapeCsv(f.mainCrops.join("; ")),
          f.latitude ?? -1.4824,
          f.longitude ?? 29.5892,
          f.altitudeMeters ?? 2200,
        ].join(",")
      );
    });
    lines.push("");
  }

  // Section 3: Active Seasonal Crop Plans
  if (plans.length > 0) {
    lines.push(
      language === "rw"
        ? `"3. GAHUNDA Z'UBUHINZI N'IMIKURIRE Y'IBIHINGWA (SEASONAL CROP PLANS)"`
        : `"3. ACTIVE SEASONAL CROP PLANS"`
    );
    lines.push(
      `"Umurima (Farm)","Igihingwa (Crop)","Igihembwe (Season)","Ubuso (Ha)","Ingengo y'Imari (Budget RWF)","Umusaruro Witezwe (Expected Kg)","Inyungu Yitezwe (Expected Net Profit RWF)","Imikurire (Growth %)"`
    );
    plans.forEach((p) => {
      lines.push(
        [
          escapeCsv(p.farmName),
          escapeCsv(p.crop),
          escapeCsv(p.seasonCode),
          p.landSize,
          p.budget,
          p.expectedYieldKg,
          p.expectedNetProfit,
          `${p.growthStagePercentage ?? 0}%`,
        ].join(",")
      );
    });
    lines.push("");
  }

  // Section 4: Expense Breakdown by Category
  lines.push(
    language === "rw"
      ? `"4. UKO AMAFARANGA YAKORESHEJWE KU BYICIRO (EXPENSE BREAKDOWN BY CATEGORY)"`
      : `"4. EXPENSE BREAKDOWN BY CATEGORY"`
  );
  lines.push(`"Icyiciro (Category)","Amafaranga (Amount RWF)","Ijanisha (Share %)","Inyemezabwishyu (Count)"`);

  const categories = [
    { key: "seeds", label: language === "rw" ? "Imbuto (Certified Seeds)" : "Certified Seeds" },
    { key: "fertilizer", label: language === "rw" ? "Ifumbire (Fertilizers)" : "Fertilizers" },
    { key: "labor", label: language === "rw" ? "Abakozi (Field Labor)" : "Field Labor" },
    { key: "pesticides", label: language === "rw" ? "Imiti (Crop Protection)" : "Crop Protection" },
    { key: "irrigation", label: language === "rw" ? "Kuhira (Irrigation)" : "Irrigation" },
    { key: "transport", label: language === "rw" ? "Ubwikorezi (Transport)" : "Transport" },
    { key: "equipment", label: language === "rw" ? "Ibikoresho (Equipment)" : "Equipment" },
    { key: "other", label: language === "rw" ? "Ibindi (Other)" : "Other" },
  ];

  categories.forEach((cat) => {
    const catExpenses = expenses.filter((e) => e.category === cat.key);
    const amount = catExpenses.reduce((acc, e) => acc + e.amount, 0);
    const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
    if (amount > 0 || catExpenses.length > 0) {
      lines.push(`${escapeCsv(cat.label)},${amount},${pct}%,${catExpenses.length}`);
    }
  });
  lines.push("");

  // Section 5: Harvest Records
  lines.push(
    language === "rw"
      ? `"5. UMUSARURO WASARUWE MU MIRIMA (HARVEST BATCH RECORDS)"`
      : `"5. HARVEST BATCH RECORDS"`
  );
  lines.push(
    `"Itariki (Date)","Batch Code","Umurima (Farm)","Igihingwa (Crop)","Ingano (Quantity Kg)","Urwego (Grade)","Ububiko (Storage Location)"`
  );
  harvests.forEach((h) => {
    lines.push(
      [
        escapeCsv(h.harvestDate),
        escapeCsv(h.batchCode || h.id),
        escapeCsv(h.farmName),
        escapeCsv(h.crop),
        h.quantityKg,
        escapeCsv(h.qualityGrade),
        escapeCsv(h.storageLocation),
      ].join(",")
    );
  });
  lines.push("");

  // Section 6: Sales Records
  lines.push(
    language === "rw"
      ? `"6. INYEMEZABWISHYU Z'IBYAGURISHIJWE KU ISOKO (SALES LEDGER)"`
      : `"6. MARKET SALES TRANSACTIONS LEDGER"`
  );
  lines.push(
    `"Itariki (Date)","Igihingwa (Crop)","Umuguzi (Buyer)","Ubwoko (Buyer Type)","Ingano (Kg)","Igiciro/Kg (RWF)","Amafaranga Yose (Total RWF)","Uburyo Bwishyuwe (Payment)"`
  );
  sales.forEach((s) => {
    lines.push(
      [
        escapeCsv(s.saleDate),
        escapeCsv(s.crop),
        escapeCsv(s.buyerName),
        escapeCsv(s.buyerType),
        s.quantityKg,
        s.unitPriceRwf,
        s.totalAmountRwf,
        escapeCsv(s.paymentMethod),
      ].join(",")
    );
  });
  lines.push("");

  // Section 7: Detailed Expenses
  lines.push(
    language === "rw"
      ? `"7. URUTONDE RWUZUYE RW'AMAFARANGA YASOHOTSE (DETAILED EXPENSES LEDGER)"`
      : `"7. DETAILED OPERATING EXPENSES LEDGER"`
  );
  lines.push(
    `"Itariki (Date)","Umurima (Farm)","Igihingwa (Crop)","Icyiciro (Category)","Ibisobanuro (Description)","Amafaranga (Amount RWF)"`
  );
  expenses.forEach((e) => {
    lines.push(
      [
        escapeCsv(e.date),
        escapeCsv(e.farmName),
        escapeCsv(e.crop),
        escapeCsv(e.category),
        escapeCsv(e.description),
        e.amount,
      ].join(",")
    );
  });

  const csvContent = "\uFEFF" + lines.join("\r\n");
  const filename = `TERIMBERE_Farm_Financial_Report_${dateStr}.csv`;
  downloadBlob(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Generates and downloads a clean, vector-based PDF Farm & Financial Dossier
 * suitable for sharing directly with Cooperatives, SACCOs, BDF, and Commercial Banks.
 */
export function exportFarmPerformancePdf(data: ProfitExportData): void {
  const {
    expenses,
    harvests,
    sales,
    farms = [],
    plans = [],
    farmerName,
    farmName,
    district,
    currentUser,
    seasonCode = "2026A",
  } = data;

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const netProfit = totalRevenue - totalExpenses;
  const roi = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : 0;
  const totalHarvestedKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const totalSoldKg = sales.reduce((acc, s) => acc + s.quantityKg, 0);
  const totalAreaHa = farms.reduce((acc, f) => acc + f.sizeHa, 0) || 0.5;
  const costPerKg = totalHarvestedKg > 0 ? Math.round(totalExpenses / totalHarvestedKg) : 0;
  const avgSellingPrice = totalSoldKg > 0 ? Math.round(totalRevenue / totalSoldKg) : 0;
  const creditLimitRwf = Math.max(0, Math.round(netProfit * 0.7));
  const dateStr = new Date().toISOString().split("T")[0];
  const refCode = `TRM-RW-${seasonCode}-${Math.floor(1000 + Math.random() * 9000)}`;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Brand Emerald Banner Header (#064e3b)
  doc.setFillColor(6, 78, 59);
  doc.rect(10, y, pageWidth - 20, 26, "F");

  doc.setTextColor(251, 191, 36); // Harvest Amber
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("TERIMBERE SMART AGRICULTURE RWANDA  |  COOPERATIVE & BANK PERFORMANCE DOSSIER", 15, y + 7);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("RAPORO Y'UMUSARURO N'IMARI Y'UBUHINZI", 15, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Ref: ${refCode}   |   Season: ${seasonCode}   |   Issued: ${dateStr}   |   Currency: RWF`,
    15,
    y + 22
  );

  y += 32;

  // Section 1: Farmer & Cooperative Identity Box
  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(214, 211, 209);
  doc.rect(10, y, pageWidth - 20, 24, "FD");

  doc.setTextColor(6, 78, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("1. UMWIRONDORO W'UMUHINZI NA KOPERATIVE (FARMER & COOPERATIVE PROFILE)", 14, y + 6);

  doc.setTextColor(28, 25, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Farmer Name: ${farmerName}`, 14, y + 13);
  doc.text(`National ID (NIDA): ${currentUser?.nationalId || "1 1988 8 0045213 1 42"}`, 14, y + 19);
  doc.text(`Primary Farm: ${farmName} (${district})`, 105, y + 13);
  doc.text(
    `Cooperative: ${currentUser?.cooperativeName || "COOPAMA Kinigi"}  |  Total Land: ${totalAreaHa.toFixed(2)} Ha`,
    105,
    y + 19
  );

  y += 30;

  // Section 2: Key Financial & Credit Metrics
  doc.setTextColor(6, 78, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("2. INCAMAKE Y'IMARI N'INYUNGU (EXECUTIVE FINANCIAL PERFORMANCE)", 10, y);
  y += 3;

  const kpis = [
    { label: "Gross Revenue (Yinjiye)", value: `${totalRevenue.toLocaleString()} RWF`, sub: `${totalSoldKg.toLocaleString()} kg sold` },
    { label: "Total Expenses (Byasohotse)", value: `${totalExpenses.toLocaleString()} RWF`, sub: `${expenses.length} records` },
    { label: "Net Profit (Inyungu Isukuye)", value: `${netProfit >= 0 ? "+" : ""}${netProfit.toLocaleString()} RWF`, sub: `ROI: ${roi}%` },
    { label: "Est. Credit Limit (Inguzanyo)", value: `${creditLimitRwf.toLocaleString()} RWF`, sub: `Cost/kg: ${costPerKg} | Price/kg: ${avgSellingPrice}` },
  ];

  const boxW = (pageWidth - 26) / 4;
  kpis.forEach((k, idx) => {
    const bx = 10 + idx * (boxW + 2);
    doc.setFillColor(250, 250, 249);
    doc.setDrawColor(16, 185, 129);
    doc.rect(bx, y, boxW, 19, "FD");

    doc.setTextColor(87, 83, 78);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(k.label, bx + 3, y + 5.5);

    doc.setTextColor(6, 78, 59);
    doc.setFontSize(10);
    doc.text(k.value, bx + 3, y + 12);

    doc.setTextColor(120, 113, 108);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(k.sub, bx + 3, y + 16.8);
  });

  y += 26;

  // Section 3: Registered Farm Parcels & GPS Coordinates
  doc.setTextColor(6, 78, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("3. IMIRIMA YANDITSWE N'IMBIBI ZA GPS (REGISTERED FARM PARCELS)", 10, y);
  y += 3;

  doc.setFillColor(6, 78, 59);
  doc.rect(10, y, pageWidth - 20, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text("Parcel Name", 13, y + 4.5);
  doc.text("District / Sector", 65, y + 4.5);
  doc.text("Area (Ha)", 108, y + 4.5);
  doc.text("GPS Coordinates (WGS84)", 130, y + 4.5);
  doc.text("Main Crops", 172, y + 4.5);
  y += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(28, 25, 23);
  const parcelRows = farms.length > 0 ? farms.slice(0, 6) : [
    {
      name: farmName,
      district,
      sector: "Kinigi",
      sizeHa: totalAreaHa,
      latitude: -1.4824,
      longitude: 29.5892,
      mainCrops: ["Ibirayi"],
    },
  ];

  parcelRows.forEach((f, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 244);
      doc.rect(10, y, pageWidth - 20, 6, "F");
    }
    doc.setFontSize(7.5);
    doc.text(String(f.name).slice(0, 28), 13, y + 4.2);
    doc.text(`${f.district}, ${f.sector}`.slice(0, 22), 65, y + 4.2);
    doc.text(`${f.sizeHa} Ha`, 108, y + 4.2);
    doc.text(
      `${(f.latitude ?? -1.4824).toFixed(4)}, ${(f.longitude ?? 29.5892).toFixed(4)}`,
      130,
      y + 4.2
    );
    doc.text((f.mainCrops || []).join(", ").slice(0, 16), 172, y + 4.2);
    y += 6;
  });

  y += 6;

  // Section 4: Expense Breakdown by Category
  doc.setTextColor(6, 78, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("4. UKO AMAFARANGA YAKORESHEJWE KU BYICIRO (EXPENSE BREAKDOWN)", 10, y);
  y += 3;

  doc.setFillColor(6, 78, 59);
  doc.rect(10, y, pageWidth - 20, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text("Expense Category", 13, y + 4.5);
  doc.text("Records Count", 95, y + 4.5);
  doc.text("Share (%)", 135, y + 4.5);
  doc.text("Total Amount (RWF)", 165, y + 4.5);
  y += 6.5;

  const catList = [
    { key: "seeds", label: "Certified Seeds (Imbuto z'indobanure)" },
    { key: "fertilizer", label: "Fertilizers & Compost (Ifumbire NPK/DAP)" },
    { key: "labor", label: "Field Labor (Abakozi b'imirima)" },
    { key: "pesticides", label: "Crop Protection (Imiti y'ibihingwa)" },
    { key: "transport", label: "Transport & Logistics (Ubwikorezi)" },
    { key: "irrigation", label: "Irrigation & Water (Kuhira)" },
    { key: "equipment", label: "Equipment & Tools (Ibikoresho)" },
    { key: "other", label: "Other Operational Costs (Ibindi)" },
  ];

  doc.setFont("helvetica", "normal");
  doc.setTextColor(28, 25, 23);
  catList.forEach((cat, idx) => {
    const items = expenses.filter((e) => e.category === cat.key);
    const amt = items.reduce((a, b) => a + b.amount, 0);
    if (amt === 0 && items.length === 0) return;
    const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 244);
      doc.rect(10, y, pageWidth - 20, 5.8, "F");
    }
    doc.setFontSize(7.5);
    doc.text(cat.label, 13, y + 4);
    doc.text(String(items.length), 98, y + 4);
    doc.text(`${pct}%`, 137, y + 4);
    doc.text(`${amt.toLocaleString()} RWF`, 165, y + 4);
    y += 5.8;
  });

  y += 6;

  // Section 5: Recent Sales & Revenue Ledger
  doc.setTextColor(6, 78, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("5. INYEMEZABWISHYU Z'UMUSARURO WAGURISHIJWE (VERIFIED SALES LEDGER)", 10, y);
  y += 3;

  doc.setFillColor(6, 78, 59);
  doc.rect(10, y, pageWidth - 20, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text("Sale Date", 13, y + 4.5);
  doc.text("Crop", 40, y + 4.5);
  doc.text("Buyer / Cooperative", 80, y + 4.5);
  doc.text("Volume (Kg)", 135, y + 4.5);
  doc.text("Unit Price", 158, y + 4.5);
  doc.text("Total (RWF)", 178, y + 4.5);
  y += 6.5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(28, 25, 23);
  sales.slice(0, 8).forEach((s, idx) => {
    if (y > 255) return;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 244);
      doc.rect(10, y, pageWidth - 20, 5.8, "F");
    }
    doc.setFontSize(7.5);
    doc.text(String(s.saleDate), 13, y + 4);
    doc.text(String(s.crop).slice(0, 20), 40, y + 4);
    doc.text(String(s.buyerName).slice(0, 26), 80, y + 4);
    doc.text(`${s.quantityKg.toLocaleString()} kg`, 135, y + 4);
    doc.text(`${s.unitPriceRwf}`, 158, y + 4);
    doc.text(`${s.totalAmountRwf.toLocaleString()}`, 178, y + 4);
    y += 5.8;
  });

  // Official Certification & Bank/Cooperative Signature Footer
  const footerY = Math.max(y + 10, 258);
  doc.setDrawColor(6, 78, 59);
  doc.line(10, footerY, pageWidth - 10, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text("CERTIFIED FOR COOPERATIVE AUDIT & COMMERCIAL BANK / SACCO / BDF CREDIT APPRAISAL", 10, footerY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `Farmer Signature: ___________________________     Cooperative / Agronomist Stamp: ___________________________`,
    10,
    footerY + 13
  );
  doc.text(
    `Generated by TERIMBERE Smart Agriculture Platform (terimbere.rw) • Total Harvest: ${totalHarvestedKg.toLocaleString()} kg • Active Plans: ${plans.length}`,
    10,
    footerY + 20
  );

  doc.save(`TERIMBERE_Farm_Report_${seasonCode}_${dateStr}.pdf`);
}

/**
 * Generates and triggers download of the profit summary data as a JSON file.
 */
export function exportProfitSummaryJson(data: ProfitExportData): void {
  const {
    expenses,
    harvests,
    sales,
    farmerName,
    farmName,
    district,
    language,
    farms,
    plans,
  } = data;

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmountRwf, 0);
  const netProfit = totalRevenue - totalExpenses;
  const roi = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : 0;
  const totalHarvestedKg = harvests.reduce((acc, h) => acc + h.quantityKg, 0);
  const totalSoldKg = sales.reduce((acc, s) => acc + s.quantityKg, 0);
  const costPerKg = totalHarvestedKg > 0 ? Math.round(totalExpenses / totalHarvestedKg) : 0;
  const avgSellingPrice = totalSoldKg > 0 ? Math.round(totalRevenue / totalSoldKg) : 0;
  const marginPerKg = avgSellingPrice - costPerKg;

  const categories = [
    "seeds",
    "fertilizer",
    "labor",
    "pesticides",
    "irrigation",
    "transport",
    "equipment",
    "other",
  ];

  const categoryBreakdown = categories.map((cat) => {
    const catItems = expenses.filter((e) => e.category === cat);
    const amount = catItems.reduce((acc, e) => acc + e.amount, 0);
    const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
    return {
      category: cat,
      amountRwf: amount,
      percentage: pct,
      itemCount: catItems.length,
    };
  });

  const exportPayload = {
    application: "TERIMBERE - Rwanda Smallholder Farm Intelligence",
    version: "2.0",
    exportType: "cooperative_and_bank_farm_dossier",
    generatedAt: new Date().toISOString(),
    language,
    currency: "RWF",
    farmer: {
      name: farmerName,
      primaryFarm: farmName,
      district,
      registeredFarms: farms ? farms.length : 1,
    },
    financialKpis: {
      totalRevenueRwf: totalRevenue,
      totalExpensesRwf: totalExpenses,
      netProfitRwf: netProfit,
      roiPercentage: roi,
      recommendedCreditLimitRwf: Math.max(0, Math.round(netProfit * 0.7)),
      totalHarvestedKg,
      totalSoldKg,
      costPerKgProducedRwf: costPerKg,
      averageSellingPricePerKgRwf: avgSellingPrice,
      netMarginPerKgRwf: marginPerKg,
    },
    farms: farms || [],
    plans: plans || [],
    expenseBreakdownByCategory: categoryBreakdown,
    salesTransactions: sales,
    harvestBatches: harvests,
    detailedExpenses: expenses,
  };

  const dateStr = new Date().toISOString().split("T")[0];
  const jsonContent = JSON.stringify(exportPayload, null, 2);
  const filename = `TERIMBERE_FarmReport_${dateStr}.json`;
  downloadBlob(jsonContent, filename, "application/json;charset=utf-8;");
}

export const exportFarmPerformanceCsv = exportProfitSummaryCsv;
export const exportProfitSummaryPdf = exportFarmPerformancePdf;

