import React, { useMemo, useState } from "react";
import {
  Farm,
  FertilizerApplicationLog,
  Language,
} from "../types";
import {
  FertilizerApplicationModal,
  getApplicationMethodLabel,
} from "./FertilizerApplicationModal";
import {
  FlaskConical,
  Plus,
  Scale,
  Sprout,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  Filter,
} from "lucide-react";

interface SeasonalFertilizerSummaryWidgetProps {
  applications: FertilizerApplicationLog[];
  farms: Farm[];
  language: Language;
  currentSeasonCode?: string;
  onAddApplication?: (app: FertilizerApplicationLog) => void;
  onNavigateToOperations?: () => void;
}

export const SeasonalFertilizerSummaryWidget: React.FC<
  SeasonalFertilizerSummaryWidgetProps
> = ({
  applications,
  farms,
  language,
  currentSeasonCode = "2025B",
  onAddApplication,
  onNavigateToOperations,
}) => {
  const [selectedSeason, setSelectedSeason] =
    useState<string>(currentSeasonCode);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [localAddedApps, setLocalAddedApps] = useState<
    FertilizerApplicationLog[]
  >([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const effectiveApplications = useMemo(() => {
    return [...localAddedApps, ...applications];
  }, [localAddedApps, applications]);

  const seasonApplications = useMemo(() => {
    return effectiveApplications.filter((app) => {
      if (selectedSeason !== "all" && app.seasonCode !== selectedSeason) {
        return false;
      }
      if (selectedFarmId !== "all" && app.farmId !== selectedFarmId) {
        return false;
      }
      return true;
    });
  }, [effectiveApplications, selectedSeason, selectedFarmId]);

  const summaryStats = useMemo(() => {
    let totalKg = 0;
    let totalAreaHa = 0;
    let totalCostRwf = 0;
    let totalElementalNKg = 0;
    let totalElementalPKg = 0;
    let totalElementalKKg = 0;

    const byType = new Map<
      string,
      { type: string; ratio: string; kg: number; areaHa: number; count: number }
    >();
    const byMethod = new Map<string, number>();

    for (const app of seasonApplications) {
      totalKg += app.amountKg;
      totalAreaHa += app.areaAppliedHa;
      totalCostRwf += app.costRwf;
      totalElementalNKg += (app.amountKg * app.nitrogenPct) / 100;
      totalElementalPKg += (app.amountKg * app.phosphorusPct) / 100;
      totalElementalKKg += (app.amountKg * app.potassiumPct) / 100;

      const existing = byType.get(app.fertilizerType) || {
        type: app.fertilizerType,
        ratio: app.npkRatio,
        kg: 0,
        areaHa: 0,
        count: 0,
      };
      existing.kg += app.amountKg;
      existing.areaHa += app.areaAppliedHa;
      existing.count += 1;
      byType.set(app.fertilizerType, existing);

      byMethod.set(
        app.applicationMethod,
        (byMethod.get(app.applicationMethod) || 0) + app.amountKg
      );
    }

    const avgRateKgPerHa =
      totalAreaHa > 0 ? Math.round(totalKg / totalAreaHa) : 0;

    return {
      totalKg,
      totalAreaHa: Number(totalAreaHa.toFixed(2)),
      avgRateKgPerHa,
      totalCostRwf,
      totalElementalNKg: Number(totalElementalNKg.toFixed(1)),
      totalElementalPKg: Number(totalElementalPKg.toFixed(1)),
      totalElementalKKg: Number(totalElementalKKg.toFixed(1)),
      typeBreakdown: Array.from(byType.values()).sort((a, b) => b.kg - a.kg),
      methodBreakdown: Array.from(byMethod.entries()).sort(
        (a, b) => b[1] - a[1]
      ),
    };
  }, [seasonApplications]);

  const handleSaveNewApplication = (newApp: FertilizerApplicationLog) => {
    if (onAddApplication) {
      onAddApplication(newApp);
    } else {
      setLocalAddedApps((prev) => [newApp, ...prev]);
    }
    setSavedNotice(
      language === "rw"
        ? `Ifumbire ya ${newApp.fertilizerType} (${newApp.amountKg} kg kuri ${newApp.areaAppliedHa} Ha) yanditswe neza!`
        : `Logged ${newApp.amountKg} kg of ${newApp.fertilizerType} (${newApp.npkRatio}) across ${newApp.areaAppliedHa} Ha!`
    );
    setTimeout(() => setSavedNotice(null), 5000);
  };

  const totalElementalAll = Math.max(
    1,
    summaryStats.totalElementalNKg +
      summaryStats.totalElementalPKg +
      summaryStats.totalElementalKKg
  );

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <FlaskConical className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold">
                  {language === "rw"
                    ? `INCAMAKE Y'IFUMBIRE Y'IGIHEMBWE (${selectedSeason})`
                    : `CURRENT SEASON FERTILIZER SUMMARY (${selectedSeason})`}
                </span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-white/10 text-amber-300 border border-white/15">
                  {seasonApplications.length}{" "}
                  {language === "rw"
                    ? "Inshuro Zafumbiriwe"
                    : "Applications Logged"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 tracking-tight">
                {language === "rw"
                  ? "Incamake y'Ifumbire Yakoreshejwe mu Gihembwe (Ubwoko, NPK, Ingano & Ubuso)"
                  : "Current Season Granular Fertilizer Applications Summary"}
              </h3>
              <p className="text-xs text-stone-300 mt-0.5 max-w-3xl">
                {language === "rw"
                  ? "ikurikirana ubwoko bw'ifumbire, igipimo cya NPK Ratio, ingano yakoreshejwe (kg), uburyo bwo gufumbira, n'ubuso bwafumbiriwe (Ha) mu gihembwe."
                  : "Tracks granular fertilizer type, NPK ratio, quantity applied (kg), application method, and total hectares treated during the current season."}
              </p>
            </div>
          </div>

          {/* Filter & Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by Season"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono font-bold"
            >
              <option value="2025B">Season 2025B (Active)</option>
              <option value="2026A">Season 2026A</option>
              <option value="2025C">Season 2025C</option>
              <option value="all">
                {language === "rw" ? "Ibihembwe Byose" : "All Seasons"}
              </option>
            </select>

            <select
              aria-label="Filter by Farm"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-medium"
            >
              <option value="all">
                {language === "rw" ? "Imirima Yose" : "All Farm Parcels"}
              </option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.sizeHa} Ha)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "+ Andika Ifumbire"
                  : "+ Log Fertilizer Application"}
              </span>
            </button>

            {onNavigateToOperations && (
              <button
                type="button"
                onClick={onNavigateToOperations}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-colors"
              >
                <span>
                  {language === "rw" ? "Operations Log" : "Operations Log"}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Saved Toast */}
      {savedNotice && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Seasonal KPI Summary Cards */}
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
            {language === "rw"
              ? "Ifumbire Yose Yakoreshejwe"
              : "Total Season Quantity"}
          </span>
          <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {summaryStats.totalKg.toLocaleString()}{" "}
            <span className="text-xs font-normal text-stone-500">kg</span>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
            {seasonApplications.length}{" "}
            {language === "rw"
              ? "inshuro zashyizwe mu murima"
              : "split field applications"}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
            {language === "rw"
              ? "Ubuso Bwafumbiriwe & Igipimo"
              : "Area Applied & Avg Rate"}
          </span>
          <div className="text-2xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
            {summaryStats.totalAreaHa}{" "}
            <span className="text-xs font-normal text-stone-500">Ha</span>
          </div>
          <div className="text-[11px] font-mono text-stone-600 dark:text-stone-300 mt-1">
            Avg Rate: <strong>{summaryStats.avgRateKgPerHa} kg/Ha</strong>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
            {language === "rw"
              ? "Intungamubiri za N - P - K (Kg)"
              : "Elemental NPK Delivered"}
          </span>
          <div className="flex items-baseline space-x-2 mt-1 font-mono tabular-nums">
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
              N:{summaryStats.totalElementalNKg}
            </span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              P:{summaryStats.totalElementalPKg}
            </span>
            <span className="text-sm font-black text-sky-600 dark:text-sky-400">
              K:{summaryStats.totalElementalKKg}
            </span>
            <span className="text-[10px] text-stone-400">kg</span>
          </div>
          {/* Proportional bar */}
          <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex mt-2">
            <div
              className="bg-emerald-600 h-full"
              style={{
                width: `${Math.round(
                  (summaryStats.totalElementalNKg / totalElementalAll) * 100
                )}%`,
              }}
            />
            <div
              className="bg-amber-500 h-full"
              style={{
                width: `${Math.round(
                  (summaryStats.totalElementalPKg / totalElementalAll) * 100
                )}%`,
              }}
            />
            <div
              className="bg-sky-600 h-full"
              style={{
                width: `${Math.round(
                  (summaryStats.totalElementalKKg / totalElementalAll) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
            {language === "rw"
              ? "Ikiguzi cy'Ifumbire mu Gihembwe"
              : "Season Fertilizer Cost"}
          </span>
          <div className="text-2xl font-black font-mono tabular-nums text-stone-900 dark:text-white mt-1">
            {summaryStats.totalCostRwf.toLocaleString()}{" "}
            <span className="text-xs font-normal text-stone-500">RWF</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {language === "rw"
              ? "Kubariwemo Nkunganire ya RAB"
              : "Includes RAB Smart Nkunganire subsidy"}
          </div>
        </div>
      </div>

      {/* Product Type Pills + Recent Granular Applications Table */}
      <div className="px-4 sm:px-5 pb-5 space-y-4">
        {/* Breakdown by Fertilizer Type */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
            {language === "rw" ? "Ubwoko bwakoreshejwe:" : "By Product Type:"}
          </span>
          {summaryStats.typeBreakdown.map((item) => (
            <div
              key={item.type}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs"
            >
              <span className="font-bold text-stone-900 dark:text-white">
                {item.type}
              </span>
              <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                NPK {item.ratio}
              </span>
              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                {item.kg} kg ({item.areaHa} Ha)
              </span>
            </div>
          ))}
        </div>

        {/* Granular Applications Table */}
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">
                  {language === "rw" ? "Itariki & Umurima" : "Date & Parcel"}
                </th>
                <th className="py-2.5 px-3">
                  {language === "rw"
                    ? "Ubwoko bw'Ifumbire"
                    : "Fertilizer Type"}
                </th>
                <th className="py-2.5 px-3">NPK Ratio</th>
                <th className="py-2.5 px-3">
                  {language === "rw" ? "Ingano (Kg)" : "Amount"}
                </th>
                <th className="py-2.5 px-3">
                  {language === "rw"
                    ? "Ubuso & Igipimo"
                    : "Area & Rate (Kg/Ha)"}
                </th>
                <th className="py-2.5 px-3">
                  {language === "rw"
                    ? "Uburyo bwo Gufumbira"
                    : "Application Method"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800">
              {seasonApplications.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-stone-900 dark:text-white">
                      {app.farmName}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {app.date} • {app.crop}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-stone-800 dark:text-stone-200">
                      {app.fertilizerType}
                    </div>
                    {app.growthStageApplied && (
                      <div className="text-[10px] text-stone-500">
                        {app.growthStageApplied}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-[11px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {app.npkRatio}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                    {app.amountKg.toLocaleString()} kg
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {app.areaAppliedHa} Ha
                    </span>{" "}
                    <span className="text-stone-500">
                      ({app.rateKgPerHa} kg/Ha)
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-[11px]">
                      {getApplicationMethodLabel(
                        app.applicationMethod,
                        language
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Granular Fertilizer Application Modal */}
      <FertilizerApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        farms={farms}
        language={language}
        defaultSeasonCode={selectedSeason === "all" ? "2025B" : selectedSeason}
        onSaveApplication={handleSaveNewApplication}
      />
    </div>
  );
};
