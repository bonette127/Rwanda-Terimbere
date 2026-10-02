import React, { useMemo, useState } from "react";
import { Farm, FarmActivity, Language, ShiftWindowId } from "../types";
import {
  AltitudeBandId,
  AltitudeWeatherTaskSuggestion,
  classifyFarmAltitudeZone,
  evaluateAltitudeWeatherTaskSuggestions,
  WeatherSimulationScenario,
  WeatherTriggerType,
} from "../utils/altitudeWeatherTaskEngine";
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  CloudLightning,
  CloudRain,
  Clock,
  Compass,
  Droplets,
  Flame,
  Layers,
  Mountain,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  UserCheck,
} from "lucide-react";

interface AltitudeWeatherTaskSuggesterProps {
  farms: Farm[];
  activities: FarmActivity[];
  language: Language;
  selectedFarmIdFilter?: string;
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
  onNavigateToActivities?: () => void;
  compact?: boolean;
}

export const AltitudeWeatherTaskSuggester: React.FC<
  AltitudeWeatherTaskSuggesterProps
> = ({
  farms,
  activities,
  language,
  selectedFarmIdFilter = "all",
  onCreateActivity,
  onNavigateToActivities,
  compact = false,
}) => {
  const [scenario, setScenario] =
    useState<WeatherSimulationScenario>("live_meteo");
  const [bandFilter, setBandFilter] = useState<"all" | AltitudeBandId>("all");
  const [triggerFilter, setTriggerFilter] = useState<
    "all" | WeatherTriggerType
  >("all");
  const [farmFilter, setFarmFilter] = useState<string>(selectedFarmIdFilter);

  // Track locally created suggestion IDs for immediate visual feedback even if parent state is async
  const [scheduledSuggestionIds, setScheduledSuggestionIds] = useState<
    string[]
  >([]);
  // Optional per-suggestion custom due date or shift window overrides before scheduling
  const [customDatesById, setCustomDatesById] = useState<
    Record<string, string>
  >({});
  const [customShiftById, setCustomShiftById] = useState<
    Record<string, ShiftWindowId>
  >({});
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  const allSuggestions = useMemo(
    () =>
      evaluateAltitudeWeatherTaskSuggestions(farms, activities, scenario).map(
        (sug) => ({
          ...sug,
          isAlreadyScheduled:
            sug.isAlreadyScheduled || scheduledSuggestionIds.includes(sug.id),
        })
      ),
    [farms, activities, scenario, scheduledSuggestionIds]
  );

  const filteredSuggestions = useMemo(() => {
    return allSuggestions.filter((s) => {
      if (farmFilter !== "all" && s.farmId !== farmFilter) return false;
      if (bandFilter !== "all" && s.altitudeBand.bandId !== bandFilter)
        return false;
      if (triggerFilter !== "all" && s.triggerType !== triggerFilter)
        return false;
      return true;
    });
  }, [allSuggestions, farmFilter, bandFilter, triggerFilter]);

  const unscheduledFiltered = useMemo(
    () => filteredSuggestions.filter((s) => !s.isAlreadyScheduled),
    [filteredSuggestions]
  );

  const rainSuggestionCount = useMemo(
    () =>
      allSuggestions.filter((s) => s.triggerType === "rain_forecast").length,
    [allSuggestions]
  );

  const heatwaveSuggestionCount = useMemo(
    () =>
      allSuggestions.filter((s) => s.triggerType === "heatwave_forecast")
        .length,
    [allSuggestions]
  );

  const farmAltitudeProfiles = useMemo(
    () =>
      farms.map((farm) => ({
        farm,
        profile: classifyFarmAltitudeZone(farm),
        activeCount: allSuggestions.filter(
          (s) => s.farmId === farm.id && !s.isAlreadyScheduled
        ).length,
      })),
    [farms, allSuggestions]
  );

  const handleScheduleSingle = (suggestion: AltitudeWeatherTaskSuggestion) => {
    if (suggestion.isAlreadyScheduled) return;

    const targetDate =
      customDatesById[suggestion.id] || suggestion.forecastDate;
    const targetShift =
      customShiftById[suggestion.id] || suggestion.shiftWindow;

    const payload: Omit<FarmActivity, "id"> = {
      ...suggestion.activityPayload,
      title:
        language === "rw"
          ? suggestion.suggestedTitleRw
          : suggestion.suggestedTitleEn,
      dueDate: targetDate,
      shiftWindow: targetShift,
    };

    onCreateActivity?.(payload);
    setScheduledSuggestionIds((prev) => [...prev, suggestion.id]);

    setBannerFeedback(
      language === "rw"
        ? `✅ Igikorwa cy'ubutumburuke (${suggestion.altitudeMeters}m) "${suggestion.suggestedTitleRw.slice(0, 48)}..." cyashyizwe kuri gahunda yo ku wa ${targetDate}!`
        : `✅ Altitude-zone task (${suggestion.altitudeMeters}m) "${suggestion.suggestedTitleEn.slice(0, 48)}..." scheduled for ${targetDate}!`
    );
    setTimeout(() => setBannerFeedback(null), 5000);
  };

  const handleAutoScheduleAllPending = () => {
    if (unscheduledFiltered.length === 0) return;

    const newlyScheduledIds: string[] = [];
    unscheduledFiltered.forEach((suggestion) => {
      const targetDate =
        customDatesById[suggestion.id] || suggestion.forecastDate;
      const targetShift =
        customShiftById[suggestion.id] || suggestion.shiftWindow;

      onCreateActivity?.({
        ...suggestion.activityPayload,
        title:
          language === "rw"
            ? suggestion.suggestedTitleRw
            : suggestion.suggestedTitleEn,
        dueDate: targetDate,
        shiftWindow: targetShift,
      });
      newlyScheduledIds.push(suggestion.id);
    });

    setScheduledSuggestionIds((prev) => [...prev, ...newlyScheduledIds]);
    setBannerFeedback(
      language === "rw"
        ? `✅ Imirimo ${newlyScheduledIds.length} y'ubwirinzi bw'imvura n'ubushyuhe yakozwe kandi yashyizwe kuri gahunda y'imirima!`
        : `✅ Automatically created and scheduled ${newlyScheduledIds.length} altitude-calibrated weather tasks!`
    );
    setTimeout(() => setBannerFeedback(null), 5500);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
      {/* Top Command Header */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 p-5 sm:p-6 text-white border-b border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold">
                <span>
                  {language === "rw"
                    ? "UBUTUMBURUKE BW'UMURIMA & ITEGANYAGIHE RYA METEO RWANDA"
                    : "ALTITUDE-ZONE WEATHER TASK AUTOMATION"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {language === "rw"
                    ? "Imvura (≥8–10mm) & Ubushyuhe Bukabije (≥25–29°C)"
                    : "Rain (≥8–10mm) & Heatwave (≥25–29°C) Triggers"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                {language === "rw"
                  ? "Imirimo Yikora Ikomoka ku Mvura n'Ubushyuhe ku Butumburuke bw'Umurima"
                  : "Automated Task Suggestions for Altitude-Zone Rain & Heatwave Forecasts"}
              </h2>
              <p className="text-xs text-stone-300 mt-1 max-w-3xl leading-relaxed">
                {language === "rw"
                  ? "Sisitemu ipima ubutumburuke bwa buri murima (>2,000m Ibirunga, 1,500–2,000m Imisozi yo Hagati, <1,500m Ikibaya cy'Uburasirazuba) igahita ikugira inama yo gushyiraho imirimo yihutirwa iyo Meteo Rwanda iteganyije imvura cyangwa ubushyuhe bwinshi."
                  : "Calibrates Meteo Rwanda rain and heatwave forecasts against each farm parcel's elevation zone (>2,000m Highlands, 1,500–2,000m Plateau, <1,500m Savannah) to suggest immediate protective field tasks."}
              </p>
            </div>
          </div>

          {/* Primary Batch Auto-Create Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {unscheduledFiltered.length > 0 && (
              <button
                type="button"
                onClick={handleAutoScheduleAllPending}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm transition-colors shadow-2xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {language === "rw"
                    ? `Panga Imirimo Yose (${unscheduledFiltered.length})`
                    : `Auto-Create All Tasks (${unscheduledFiltered.length})`}
                </span>
              </button>
            )}

            {onNavigateToActivities && (
              <button
                type="button"
                onClick={onNavigateToActivities}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {language === "rw"
                    ? "Reba Ingengabihe Yose"
                    : "Open Activity Log"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Farm Altitude Zone Calibration Strip */}
        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-stone-800/80">
            {farmAltitudeProfiles.map(({ farm, profile, activeCount }) => {
              const isSelected = farmFilter === farm.id;
              return (
                <button
                  key={farm.id}
                  type="button"
                  onClick={() =>
                    setFarmFilter(isSelected ? "all" : farm.id)
                  }
                  className={`text-left rounded-xl p-3.5 border transition-all ${
                    isSelected
                      ? "bg-emerald-900/70 border-amber-400 ring-1 ring-amber-400/40"
                      : "bg-stone-900/80 border-stone-800 hover:border-emerald-600/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">
                      {farm.name} · {farm.district}
                    </span>
                    <span className="font-mono font-black text-amber-300">
                      {profile.altitudeMeters}m ASL
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                    {language === "rw" ? profile.nameRw : profile.nameEn}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] text-stone-300 font-mono tabular-nums">
                    <span>
                      🌧️ {language === "rw" ? "Imvura" : "Rain"} ≥
                      {profile.rainThresholdMm}mm
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      ☀️ {language === "rw" ? "Ubushyuhe" : "Heat"} ≥
                      {profile.heatwaveThresholdC}°C
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-bold">
                      {activeCount}{" "}
                      {language === "rw" ? "ibyifuzo" : "suggested"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Confirmation Toast Banner */}
        {bannerFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bannerFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerFeedback(null)}
              className="text-xs font-bold underline shrink-0"
            >
              {language === "rw" ? "Funga" : "Close"}
            </button>
          </div>
        )}

        {/* Controls Bar: Weather Scenario Simulator & Trigger / Altitude Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
          {/* Weather Forecast Simulator Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-stone-600 dark:text-stone-400 mr-1">
              {language === "rw"
                ? "Igerageza ry'Ikirere:"
                : "Forecast Scenario:"}
            </span>
            {(
              [
                {
                  id: "live_meteo",
                  labelRw: "Meteo Rwanda (Iteganyagihe Ririho)",
                  labelEn: "Live Meteo Forecast",
                },
                {
                  id: "highland_downpour",
                  labelRw: "🌧️ Imvura Nyinshi ku Misozi (28mm)",
                  labelEn: "🌧️ Highland Downpour (28mm)",
                },
                {
                  id: "savannah_heatwave",
                  labelRw: "☀️ Ubushyuhe Bukabije (34°C Heatwave)",
                  labelEn: "☀️ Extreme Heatwave (34°C)",
                },
                {
                  id: "dual_extreme",
                  labelRw: "⚡ Imvura + Ubushyuhe Bwinshi",
                  labelEn: "⚡ Storm + Heatwave Surge",
                },
              ] as Array<{
                id: WeatherSimulationScenario;
                labelRw: string;
                labelEn: string;
              }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenario(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                  scenario === item.id
                    ? "bg-emerald-800 text-white border-emerald-800"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200"
                }`}
              >
                {language === "rw" ? item.labelRw : item.labelEn}
              </button>
            ))}
          </div>

          {/* Trigger Type & Altitude Band Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Weather Trigger Filter */}
            <div className="inline-flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setTriggerFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  triggerFilter === "all"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                {language === "rw" ? "Byose" : "All"} ({allSuggestions.length})
              </button>
              <button
                type="button"
                onClick={() => setTriggerFilter("rain_forecast")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  triggerFilter === "rain_forecast"
                    ? "bg-white dark:bg-stone-900 text-sky-700 dark:text-sky-300 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                🌧️ {language === "rw" ? "Imvura" : "Rain"} (
                {rainSuggestionCount})
              </button>
              <button
                type="button"
                onClick={() => setTriggerFilter("heatwave_forecast")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  triggerFilter === "heatwave_forecast"
                    ? "bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                ☀️ {language === "rw" ? "Ubushyuhe" : "Heatwave"} (
                {heatwaveSuggestionCount})
              </button>
            </div>

            {/* Altitude Band Filter */}
            <select
              aria-label={
                language === "rw"
                  ? "Shungura ku butumburuke"
                  : "Filter by Altitude Zone"
              }
              value={bandFilter}
              onChange={(e) =>
                setBandFilter(e.target.value as "all" | AltitudeBandId)
              }
              className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200"
            >
              <option value="all">
                {language === "rw"
                  ? "Ubutumburuke Bwose (All Altitudes)"
                  : "All Altitude Zones"}
              </option>
              <option value="highland_volcanic">
                {language === "rw"
                  ? "> 2,000m (Imisozi Miremire / Musanze)"
                  : "> 2,000m (High-Altitude Highlands)"}
              </option>
              <option value="mid_altitude_plateau">
                {language === "rw"
                  ? "1,500m – 2,000m (Imisozi yo Hagati / Huye)"
                  : "1,500m – 2,000m (Mid-Altitude Plateau)"}
              </option>
              <option value="lowland_savannah">
                {language === "rw"
                  ? "< 1,500m (Ikibaya cy'Uburasirazuba / Nyagatare)"
                  : "< 1,500m (Low-Altitude Savannah)"}
              </option>
            </select>
          </div>
        </div>

        {/* Suggested Automated Task Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSuggestions.map((suggestion) => {
            const isRain = suggestion.triggerType === "rain_forecast";
            const customDate =
              customDatesById[suggestion.id] || suggestion.forecastDate;
            const customShift =
              customShiftById[suggestion.id] || suggestion.shiftWindow;

            return (
              <div
                key={suggestion.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between gap-4 ${
                  suggestion.isAlreadyScheduled
                    ? "bg-stone-50/80 dark:bg-stone-900/50 border-emerald-300 dark:border-emerald-800/60"
                    : isRain
                    ? "bg-white dark:bg-stone-900 border-sky-200 dark:border-sky-900/70 hover:border-sky-500"
                    : "bg-white dark:bg-stone-900 border-amber-200 dark:border-amber-900/70 hover:border-amber-500"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Metadata Kicker */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isRain ? (
                        <CloudRain className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      ) : (
                        <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                      <span
                        className={`font-black uppercase tracking-wide ${
                          isRain
                            ? "text-sky-800 dark:text-sky-300"
                            : "text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {isRain
                          ? language === "rw"
                            ? `Imvura Iteganyijwe (${suggestion.predictedRainfallMm}mm · ${suggestion.popPct}% POP)`
                            : `Rain Forecast (${suggestion.predictedRainfallMm}mm · ${suggestion.popPct}% POP)`
                          : language === "rw"
                          ? `Ubushyuhe Bukabije (${suggestion.predictedTempMaxC}°C · ${suggestion.humidityPct}% RH)`
                          : `Heatwave Forecast (${suggestion.predictedTempMaxC}°C · ${suggestion.humidityPct}% RH)`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                        {suggestion.altitudeMeters}m ASL (
                        {suggestion.altitudeBand.rangeLabel})
                      </span>
                    </div>

                    <span
                      className={`font-mono text-[11px] font-bold ${
                        suggestion.severity === "critical"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {suggestion.rabProtocolCode}
                    </span>
                  </div>

                  {/*Suggested Task Title */}
                  <div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      <strong className="text-stone-800 dark:text-stone-200">
                        {suggestion.farmName}
                      </strong>{" "}
                      ({suggestion.district}, {suggestion.sector}) ·{" "}
                      <span>{suggestion.crop}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white mt-0.5 leading-snug">
                      {language === "rw"
                        ? suggestion.suggestedTitleRw
                        : suggestion.suggestedTitleEn}
                    </h3>
                  </div>

                  {/* Why Altitude Matters Explanation Box */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    <div className="font-bold text-stone-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <Mountain className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {language === "rw"
                          ? `Impamvu ku Butumburuke bwa ${suggestion.altitudeMeters}m:`
                          : `Why ${suggestion.altitudeMeters}m Altitude Zone Matters:`}
                      </span>
                    </div>
                    <p>
                      {language === "rw"
                        ? suggestion.whyAltitudeMattersRw
                        : suggestion.whyAltitudeMattersEn}
                    </p>
                  </div>

                  {/* Editable Schedule Date & Shift Window Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 mb-1">
                        {language === "rw"
                          ? "Itariki y'Igikorwa (Due Date)"
                          : "Scheduled Task Date"}
                      </label>
                      <input
                        type="date"
                        value={customDate}
                        disabled={suggestion.isAlreadyScheduled}
                        onChange={(e) =>
                          setCustomDatesById((prev) => ({
                            ...prev,
                            [suggestion.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-mono font-bold text-stone-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 mb-1">
                        {language === "rw"
                          ? "Isaha y'Umurimo (Shift Window)"
                          : "Optimal Shift Window"}
                      </label>
                      <select
                        value={customShift}
                        disabled={suggestion.isAlreadyScheduled}
                        onChange={(e) =>
                          setCustomShiftById((prev) => ({
                            ...prev,
                            [suggestion.id]: e.target.value as ShiftWindowId,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-mono font-bold text-stone-900 dark:text-white"
                      >
                        <option value="06:00-08:00">06:00 - 08:00 (Dawn)</option>
                        <option value="08:00-10:00">08:00 - 10:00 (Morning)</option>
                        <option value="10:00-12:00">10:00 - 12:00 (Late Morning)</option>
                        <option value="14:00-16:00">14:00 - 16:00 (Afternoon)</option>
                        <option value="16:00-18:00">16:00 - 18:00 (Evening)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{suggestion.assignedTo}</span>
                  </div>

                  {suggestion.isAlreadyScheduled ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw"
                          ? "Cyashyizwe kuri Gahunda"
                          : "Scheduled in Activity Log"}
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleScheduleSingle(suggestion)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>
                        {language === "rw"
                          ? "+ Shyira mu Bikorwa"
                          : "+ Auto-Create Task"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
