import React, { useState } from "react";
import { Language, FarmActivity } from "../types";
import {
  DistrictForecastPlan,
  getForecastForDistrict,
} from "../data/weatherForecastData";
import {
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Plus,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";

interface WeatherForecastWidgetProps {
  language: Language;
  defaultDistrict?: string;
  onNavigateToActivities?: () => void;
  onCreateActivity?: (activity: Omit<FarmActivity, "id">) => void;
}

export const WeatherForecastWidget: React.FC<WeatherForecastWidgetProps> = ({
  language,
  defaultDistrict = "Musanze",
  onNavigateToActivities,
  onCreateActivity,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>(defaultDistrict);
  const [viewMode, setViewMode] = useState<"daily" | "hourly">("daily");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [showQuickScheduleModal, setShowQuickScheduleModal] = useState<boolean>(false);
  const [quickActivityTitle, setQuickActivityTitle] = useState<string>("");
  const [quickActivityDueDate, setQuickActivityDueDate] = useState<string>("");
  const [quickActivityCategory, setQuickActivityCategory] = useState<string>("fertilizing");
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(null);

  const forecastData: DistrictForecastPlan = getForecastForDistrict(selectedDistrict);
  const selectedDay = forecastData.daily[selectedDayIndex] || forecastData.daily[0];

  const renderWeatherIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case "sun":
        return <Sun className={`${className} text-amber-500`} />;
      case "cloud-sun":
        return <CloudSun className={`${className} text-amber-400`} />;
      case "cloud-rain":
        return <CloudRain className={`${className} text-sky-500`} />;
      case "cloud-lightning":
        return <CloudLightning className={`${className} text-indigo-500`} />;
      case "wind":
        return <Wind className={`${className} text-teal-500`} />;
      default:
        return <CloudSun className={`${className} text-stone-400`} />;
    }
  };

  const getSuitabilityBadge = (suitability: "optimal" | "moderate" | "unfavorable") => {
    if (suitability === "optimal") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{language === "rw" ? "Ikirere Cyiza cyane" : language === "fr" ? "Très Favorable" : "Optimal Conditions"}</span>
        </span>
      );
    }
    if (suitability === "moderate") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>{language === "rw" ? "Witondere Ikirere" : language === "fr" ? "Modéré / Vigilance" : "Moderate Watch"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
        <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        <span>{language === "rw" ? "Ntibikwiye gukora" : language === "fr" ? "Défavorable" : "Unfavorable"}</span>
      </span>
    );
  };

  const handleOpenScheduleForDay = (activityText: string, date: string) => {
    setQuickActivityTitle(activityText);
    setQuickActivityDueDate(date);
    // Auto-detect category
    const lower = activityText.toLowerCase();
    if (lower.includes("fumbir") || lower.includes("npk") || lower.includes("urea") || lower.includes("fertiliz")) {
      setQuickActivityCategory("fertilizing");
    } else if (lower.includes("hira") || lower.includes("irrigat") || lower.includes("amazi")) {
      setQuickActivityCategory("irrigation");
    } else if (lower.includes("muti") || lower.includes("spray") || lower.includes("fungicid")) {
      setQuickActivityCategory("spraying");
    } else if (lower.includes("bagar") || lower.includes("weed")) {
      setQuickActivityCategory("weeding");
    } else if (lower.includes("tera") || lower.includes("plant") || lower.includes("ingemwe")) {
      setQuickActivityCategory("planting");
    } else if (lower.includes("sarur") || lower.includes("harvest")) {
      setQuickActivityCategory("harvesting");
    } else {
      setQuickActivityCategory("land_prep");
    }
    setShowQuickScheduleModal(true);
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickActivityTitle.trim() || !quickActivityDueDate) return;

    if (onCreateActivity) {
      onCreateActivity({
        farmId: selectedDistrict === "Nyagatare" ? "farm-2" : selectedDistrict === "Huye" ? "farm-3" : "farm-1",
        farmName: selectedDistrict === "Nyagatare" ? "Ibigori Farm" : selectedDistrict === "Huye" ? "Inyanya Farm" : "Ibirayi Farm",
        crop: selectedDistrict === "Nyagatare" ? "Ibigori (Maize)" : selectedDistrict === "Huye" ? "Inyanya (Tomato)" : "Ibirayi (Kinigi)",
        title: quickActivityTitle,
        category: quickActivityCategory as any,
        dueDate: quickActivityDueDate,
        status: "pending",
        syncStatus: "local_pending",
        notes: `Scheduled from Meteo Rwanda 5-Day Agro-Weather Forecast (${selectedDistrict} District).`,
      });
    }

    setShowQuickScheduleModal(false);
    setScheduleSuccessMessage(
      language === "rw"
        ? `Gahunda yawe "${quickActivityTitle.slice(0, 30)}..." yanditswe neza muri gahunda z'umurima!`
        : `Activity "${quickActivityTitle.slice(0, 30)}..." successfully scheduled in Farm Activities!`
    );
    setTimeout(() => setScheduleSuccessMessage(null), 4500);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-linear-to-r from-sky-50/70 via-stone-50 to-emerald-50/70 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-sky-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <CloudSun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white font-display">
                  {language === "rw"
                    ? "Iteganyagihe ry'Iminsi 5 & Ibyerekezo by'Amasaha"
                    : language === "fr"
                    ? "Prévisions Météo 5 Jours & Horaires Agricoles"
                    : "5-Day Weather & Hourly Agricultural Forecast"}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Meteo Rwanda
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                {language === "rw"
                  ? "Reba uko ikirere cyifashe kugira ngo utegure imirimo: kuhira, gufumbira, no gutera imiti"
                  : language === "fr"
                  ? "Planifiez vos activités agricoles : irrigation, épandage et pulvérisation selon le temps"
                  : "Sync farming operations with high-precision forecasts: spraying, fertilizing, & irrigation"}
              </p>
            </div>
          </div>

          {/* Controls: District Selector & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* District Selector */}
            <div className="relative inline-flex items-center">
              <MapPin className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 pointer-events-none" />
              <select
                aria-label={language === "rw" ? "Hitamo Akarere k'umurima" : "Select Farm District"}
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedDayIndex(0);
                }}
                className="pl-7 pr-8 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold appearance-none cursor-pointer hover:border-sky-400 transition-colors focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              >
                <option value="Musanze">Musanze · 2,240m (Highlands)</option>
                <option value="Nyagatare">Nyagatare · 1,380m (Savannah)</option>
                <option value="Huye">Huye · 1,720m (Central Plateau)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Toggle: Hourly vs Daily */}
            <div className="inline-flex rounded-xl p-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "daily"
                    ? "bg-white dark:bg-stone-700 text-sky-700 dark:text-sky-300 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Iminsi 5 (Daily)" : "5-Day"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("hourly")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "hourly"
                    ? "bg-white dark:bg-stone-700 text-sky-700 dark:text-sky-300 shadow-2xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{language === "rw" ? "Amasaha (Hourly)" : "Hourly"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success toast if activity scheduled */}
        {scheduleSuccessMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{scheduleSuccessMessage}</span>
            </div>
            {onNavigateToActivities && (
              <button
                onClick={onNavigateToActivities}
                className="text-xs font-bold underline hover:text-emerald-950 dark:hover:text-emerald-100 ml-3 shrink-0"
              >
                {language === "rw" ? "Kureba Ibikorwa" : "View Activities"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Forecast Body */}
      <div className="p-4 sm:p-5">
        {viewMode === "daily" ? (
          /* 5-DAY DAILY VIEW */
          <div className="space-y-4">
            {/* 5 Day Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {forecastData.daily.map((day, idx) => {
                const isSelected = idx === selectedDayIndex;
                const dayLabel =
                  language === "rw"
                    ? day.dayNameRw
                    : language === "fr"
                    ? day.dayNameFr
                    : day.dayNameEn;
                const conditionText =
                  language === "rw"
                    ? day.conditionRw
                    : language === "fr"
                    ? day.conditionFr
                    : day.conditionEn;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`text-left p-3 rounded-xl border transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-xs ring-2 ring-sky-400/30"
                        : "bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-black ${
                            isSelected
                              ? "text-sky-900 dark:text-sky-300"
                              : "text-stone-800 dark:text-stone-200"
                          }`}
                        >
                          {dayLabel}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {day.date.slice(5)}
                        </span>
                      </div>

                      <div className="my-1.5 flex items-center justify-center py-1">
                        {renderWeatherIcon(day.icon, "w-8 h-8")}
                      </div>

                      <div className="text-center">
                        <div className="text-sm font-black text-stone-900 dark:text-white">
                          {day.tempMaxC}°{" "}
                          <span className="text-stone-600 dark:text-stone-400 font-normal text-xs">
                            / {day.tempMinC}°C
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-1 mt-0.5 font-medium">
                          {conditionText}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between text-[10px] text-stone-600 dark:text-stone-400">
                      <span className="flex items-center space-x-1">
                        <Droplets className="w-3 h-3 text-sky-500" />
                        <span>{day.rainfallMm}mm</span>
                      </span>
                      <span className="font-semibold text-sky-700 dark:text-sky-400">
                        {day.pop}% pop
                      </span>
                    </div>

                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-white dark:ring-stone-900" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Deep-Dive Details & Farming Activity Planner */}
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-4 border border-stone-200 dark:border-stone-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 shadow-2xs">
                    {renderWeatherIcon(selectedDay.icon, "w-7 h-7")}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                        {language === "rw"
                          ? `${selectedDay.dayNameRw} (${selectedDay.date})`
                          : `${selectedDay.dayNameEn} (${selectedDay.date})`}
                      </h4>
                      {getSuitabilityBadge(selectedDay.farmingSuitability)}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                      {language === "rw" ? selectedDay.conditionRw : selectedDay.conditionEn} •{" "}
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {selectedDay.tempMaxC}°C Max / {selectedDay.tempMinC}°C Min
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-400">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    <span>
                      {language === "rw" ? "Imvura:" : "Precipitation:"}{" "}
                      <strong className="text-stone-800 dark:text-stone-200">
                        {selectedDay.rainfallMm} mm ({selectedDay.pop}%)
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-400">
                    <Wind className="w-4 h-4 text-teal-500" />
                    <span>
                      {language === "rw" ? "Umuyaga:" : "Wind:"}{" "}
                      <strong className="text-stone-800 dark:text-stone-200">
                        {selectedDay.windSpeedKmh} km/h
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-stone-600 dark:text-stone-400">
                    <CloudSun className="w-4 h-4 text-amber-500" />
                    <span>
                      {language === "rw" ? "Ubuhehere:" : "Humidity:"}{" "}
                      <strong className="text-stone-800 dark:text-stone-200">
                        {selectedDay.humidity}%
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Weather Caution Banner (if any) */}
              {(selectedDay.cautionRw || selectedDay.cautionEn) && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center space-x-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>{language === "rw" ? "Icyitonderwa:" : "Agronomic Caution:"}</strong>{" "}
                    {language === "rw" ? selectedDay.cautionRw : selectedDay.cautionEn}
                  </span>
                </div>
              )}

              {/* Suggested Farming Tasks for this Day */}
              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {language === "rw"
                        ? `Imirimo yikora ku butumburuke bwa ${
                            selectedDistrict === "Musanze"
                              ? "2,240m (>2,000m Highland)"
                              : selectedDistrict === "Nyagatare"
                              ? "1,380m (<1,500m Savannah)"
                              : "1,720m (1,500-2,000m Plateau)"
                          }`
                        : `Altitude-Calibrated Tasks (${
                            selectedDistrict === "Musanze"
                              ? "2,240m Volcanic Highlands"
                              : selectedDistrict === "Nyagatare"
                              ? "1,380m Lowland Savannah"
                              : "1,720m Central Plateau"
                          })`}
                    </span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {selectedDay.rainfallMm >= 8
                      ? language === "rw"
                        ? `🌧️ Imvura (${selectedDay.rainfallMm}mm)`
                        : `🌧️ Rain Trigger (${selectedDay.rainfallMm}mm)`
                      : selectedDay.tempMaxC >= 27
                      ? language === "rw"
                        ? `☀️ Ubushyuhe (${selectedDay.tempMaxC}°C)`
                        : `☀️ Heatwave Trigger (${selectedDay.tempMaxC}°C)`
                      : language === "rw"
                      ? "Kanda kugira ngo ubyinjize muri gahunda"
                      : "Click to schedule instantly"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(language === "rw"
                    ? selectedDay.recommendedFarmingActivitiesRw
                    : selectedDay.recommendedFarmingActivitiesEn
                  ).map((activityText, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between gap-2 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-stone-800 dark:text-stone-200 font-medium">
                          {activityText}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleForDay(activityText, selectedDay.date)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-bold transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{language === "rw" ? "Tegura" : "Schedule"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* HOURLY VIEW FOR FARMING WINDOWS */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-sky-500" />
                <span>
                  {language === "rw"
                    ? `Ibyerekezo by'Amasaha muri ${selectedDistrict} - Uyu munsi`
                    : `Hourly Farm Planning Windows in ${selectedDistrict} - Today`}
                </span>
              </span>
              <span>{language === "rw" ? "Igipimo cy'amazi n'ubushyuhe" : "Soil evap & spray window analysis"}</span>
            </div>

            {/* Hourly Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {forecastData.hourly.map((hour, hIdx) => {
                const tipText = language === "rw" ? hour.farmingTipRw : hour.farmingTipEn;
                const condText = language === "rw" ? hour.conditionRw : hour.conditionEn;

                return (
                  <div
                    key={hIdx}
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      hour.farmingSuitability === "optimal"
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                        : hour.farmingSuitability === "unfavorable"
                        ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                        : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-stone-200/50 dark:border-stone-700/50">
                        <span className="text-xs font-black font-mono text-stone-900 dark:text-white">
                          {hour.time}
                        </span>
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                          {hour.pop}% rain
                        </span>
                      </div>

                      <div className="my-2 flex items-center justify-center">
                        {renderWeatherIcon(hour.icon, "w-7 h-7")}
                      </div>

                      <div className="text-center">
                        <div className="text-base font-black text-stone-900 dark:text-white">
                          {hour.tempC}°C
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 font-medium truncate">
                          {condText}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>{language === "rw" ? "Inama:" : "Window:"}</span>
                        {hour.farmingSuitability === "optimal" ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ Good</span>
                        ) : hour.farmingSuitability === "unfavorable" ? (
                          <span className="text-rose-700 dark:text-rose-400 font-bold">✕ Hold</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">~ Fair</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-snug">
                        {tipText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hourly Farm Action Callout */}
            <div className="bg-sky-50 dark:bg-sky-950/40 rounded-xl p-3.5 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Wind className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-sky-950 dark:text-sky-200">
                    {language === "rw"
                      ? "Amasaha meza yo gutera imiti: 06:00 - 08:30 na 16:30 - 18:30"
                      : "Best chemical spraying & fertilization windows: 06:00 - 08:30 and 16:30 - 18:30"}
                  </p>
                  <p className="text-sky-800 dark:text-sky-300">
                    {language === "rw"
                      ? "Urugero rw'umuyaga ruri hasi cyane kandi izuba ntirituma imiti ihumeka mu kirere."
                      : "Low wind drift and negligible evaporation ensure maximum agrochemical adherence."}
                  </p>
                </div>
              </div>

              {onNavigateToActivities && (
                <button
                  type="button"
                  onClick={onNavigateToActivities}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
                >
                  <span>{language === "rw" ? "Reba Gahunda Zose" : "Open Farm Activities"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Schedule Activity Modal */}
      {showQuickScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-emerald-50 dark:bg-emerald-950/40">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-white">
                    {language === "rw" ? "Gushyira Igikorwa muri Gahunda" : "Schedule Weather-Aligned Task"}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {language === "rw"
                      ? "Huza umurimo w'ubuhinzi n'ikirere cya Meteo Rwanda"
                      : "Sync field labor with local meteorology forecast"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmSchedule} className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                  {language === "rw" ? "Izina ry'igikorwa" : "Activity Title"}
                </label>
                <input
                  type="text"
                  value={quickActivityTitle}
                  onChange={(e) => setQuickActivityTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                    {language === "rw" ? "Itariki (Date)" : "Scheduled Date"}
                  </label>
                  <input
                    type="date"
                    value={quickActivityDueDate}
                    onChange={(e) => setQuickActivityDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                    {language === "rw" ? "Ubwoko (Category)" : "Category"}
                  </label>
                  <select
                    value={quickActivityCategory}
                    onChange={(e) => setQuickActivityCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="fertilizing">{language === "rw" ? "Ifumbire (Fertilizing)" : "Fertilizing"}</option>
                    <option value="irrigation">{language === "rw" ? "Kuhira (Irrigation)" : "Irrigation"}</option>
                    <option value="spraying">{language === "rw" ? "Gutera Imiti (Spraying)" : "Spraying"}</option>
                    <option value="weeding">{language === "rw" ? "Kubagara (Weeding)" : "Weeding"}</option>
                    <option value="planting">{language === "rw" ? "Gutera Imbuto (Planting)" : "Planting"}</option>
                    <option value="harvesting">{language === "rw" ? "Gusarura (Harvesting)" : "Harvesting"}</option>
                    <option value="land_prep">{language === "rw" ? "Gutunganya Umurima" : "Land Prep"}</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400">
                <p>
                  <strong>{language === "rw" ? "Akarere:" : "District Target:"}</strong> {selectedDistrict} (
                  {forecastData.province})
                </p>
                <p className="mt-0.5">
                  <strong>{language === "rw" ? "Umurima:" : "Assigned Parcel:"}</strong>{" "}
                  {selectedDistrict === "Nyagatare" ? "Ibigori Farm" : selectedDistrict === "Huye" ? "Inyanya Farm" : "Ibirayi Farm"}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold transition-colors"
                >
                  {language === "rw" ? "Reka" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
                >
                  {language === "rw" ? "Emeza Igikorwa" : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
