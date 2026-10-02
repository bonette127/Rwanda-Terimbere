import React, { useState, useMemo } from "react";
import {
  Language,
  TeamMember,
  FarmActivity,
  Farm,
  ShiftWindowId,
  ActivityCategory,
} from "../types";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  Users,
  Calendar,
  Zap,
  MapPin,
} from "lucide-react";

interface PeakActivityHeatmapWidgetProps {
  language: Language;
  teamMembers: TeamMember[];
  activities: FarmActivity[];
  farms: Farm[];
  selectedFarmFilter?: string;
  selectedRoleFilter?: string;
  onUpdateActivityStatus?: (
    id: string,
    status: "pending" | "in_progress" | "completed"
  ) => void;
}

export interface ShiftWindowMeta {
  id: ShiftWindowId;
  shortLabel: string;
  labelRw: string;
  labelEn: string;
  agronomicContextRw: string;
  agronomicContextEn: string;
  capacityThreshold: number; // tasks per window before bottleneck warning
}

export const SHIFT_WINDOWS: ShiftWindowMeta[] = [
  {
    id: "06:00-08:00",
    shortLabel: "06:00–08:00",
    labelRw: "Umuseso (06:00–08:00)",
    labelEn: "Early Morning (06:00–08:00)",
    agronomicContextRw: "Gutera imiti y'urume n'udukoko umuyaga utaraza",
    agronomicContextEn: "Optimal low-wind window for fungicide spraying & trap checks",
    capacityThreshold: 3,
  },
  {
    id: "08:00-10:00",
    shortLabel: "08:00–10:00",
    labelRw: "Igitondo (08:00–10:00)",
    labelEn: "Morning Peak (08:00–10:00)",
    agronomicContextRw: "Guharura, gutera imbuto, kubagara no gushyiramo ifumbire",
    agronomicContextEn: "Primary field labor: tillage, planting, weeding & fertilizing",
    capacityThreshold: 3,
  },
  {
    id: "10:00-12:00",
    shortLabel: "10:00–12:00",
    labelRw: "Saa Yine–Sita (10:00–12:00)",
    labelEn: "Late Morning (10:00–12:00)",
    agronomicContextRw: "Isuzuma ry'ubutaka (pH), igenzura rya RAB na Nkunganire",
    agronomicContextEn: "Agronomic soil pH audits, staking & input compliance checks",
    capacityThreshold: 3,
  },
  {
    id: "12:00-14:00",
    shortLabel: "12:00–14:00",
    labelRw: "Saa Sita (12:00–14:00)",
    labelEn: "Midday Window (12:00–14:00)",
    agronomicContextRw: "Kuvangura umusaruro mu bubiko bwa koperative (izuba ryinshi)",
    agronomicContextEn: "High solar heat; indoor depot grading & storage hygiene",
    capacityThreshold: 2,
  },
  {
    id: "14:00-16:00",
    shortLabel: "14:00–16:00",
    labelRw: "Ikigoroba (14:00–16:00)",
    labelEn: "Afternoon (14:00–16:00)",
    agronomicContextRw: "Kuhira imyaka, gusibura imigende y'amazi no gupakira",
    agronomicContextEn: "Irrigation checks, drainage maintenance & harvest haulage",
    capacityThreshold: 3,
  },
  {
    id: "16:00-18:00",
    shortLabel: "16:00–18:00",
    labelRw: "Umugoroba (16:00–18:00)",
    labelEn: "Evening Close (16:00–18:00)",
    agronomicContextRw: "Kubarura imirimo yakozwe, raporo ya USSD *777# no kubika ibikoresho",
    agronomicContextEn: "Daily labor reconciliation, USSD sync & tool lockup",
    capacityThreshold: 2,
  },
];

export const DAYS_OF_WEEK = [
  { index: 0, shortRw: "Mbe", fullRw: "Kuwa Mbere", shortEn: "Mon", fullEn: "Monday" },
  { index: 1, shortRw: "Kab", fullRw: "Kuwa Kabiri", shortEn: "Tue", fullEn: "Tuesday" },
  { index: 2, shortRw: "Gat", fullRw: "Kuwa Gatatu", shortEn: "Wed", fullEn: "Wednesday" },
  { index: 3, shortRw: "Kan", fullRw: "Kuwa Kane", shortEn: "Thu", fullEn: "Thursday" },
  { index: 4, shortRw: "Gtn", fullRw: "Kuwa Gatanu", shortEn: "Fri", fullEn: "Friday" },
  { index: 5, shortRw: "Gtd", fullRw: "Kuwa Gatandatu", shortEn: "Sat", fullEn: "Saturday" },
  { index: 6, shortRw: "Cyu", fullRw: "Ku Cyumweru", shortEn: "Sun", fullEn: "Sunday" },
];

// Deterministic default assignment of shift window and day of week based on task properties
function deriveDefaultSlot(activity: FarmActivity): {
  shiftWindow: ShiftWindowId;
  dayOfWeekIndex: number;
} {
  if (activity.shiftWindow && typeof activity.dayOfWeekIndex === "number") {
    return {
      shiftWindow: activity.shiftWindow,
      dayOfWeekIndex: activity.dayOfWeekIndex,
    };
  }

  // Known IDs tuned to create realistic cooperative peak patterns and bottlenecks
  const presetMap: Record<string, { shiftWindow: ShiftWindowId; dayOfWeekIndex: number }> = {
    "act-tm-hakizimana-1": { shiftWindow: "10:00-12:00", dayOfWeekIndex: 0 }, // Mon 10-12
    "act-tm-hakizimana-2": { shiftWindow: "06:00-08:00", dayOfWeekIndex: 1 }, // Tue 06-08
    "act-tm-hakizimana-3": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 1 }, // Tue 08-10 (Peak!)
    "act-tm-hakizimana-4": { shiftWindow: "10:00-12:00", dayOfWeekIndex: 3 }, // Thu 10-12
    "act-tm-hakizimana-5": { shiftWindow: "12:00-14:00", dayOfWeekIndex: 4 }, // Fri 12-14

    "act-tm-mugabo-1": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 0 }, // Mon 08-10
    "act-tm-mugabo-2": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 1 }, // Tue 08-10 (Peak!)
    "act-tm-mugabo-3": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 1 }, // Tue 08-10 (Peak!)
    "act-tm-mugabo-4": { shiftWindow: "14:00-16:00", dayOfWeekIndex: 2 }, // Wed 14-16
    "act-tm-mugabo-5": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 2 }, // Wed 08-10 (Peak!)
    "act-tm-mugabo-6": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 1 }, // Tue 08-10 (Peak!)

    "act-tm-umutoni-1": { shiftWindow: "10:00-12:00", dayOfWeekIndex: 0 }, // Mon 10-12
    "act-tm-umutoni-2": { shiftWindow: "10:00-12:00", dayOfWeekIndex: 2 }, // Wed 10-12
    "act-tm-umutoni-3": { shiftWindow: "12:00-14:00", dayOfWeekIndex: 3 }, // Thu 12-14
    "act-tm-umutoni-4": { shiftWindow: "16:00-18:00", dayOfWeekIndex: 4 }, // Fri 16-18

    "act-tm-nshimiyimana-1": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 0 }, // Mon 08-10
    "act-tm-nshimiyimana-2": { shiftWindow: "14:00-16:00", dayOfWeekIndex: 1 }, // Tue 14-16
    "act-tm-nshimiyimana-3": { shiftWindow: "06:00-08:00", dayOfWeekIndex: 1 }, // Tue 06-08
    "act-tm-nshimiyimana-4": { shiftWindow: "08:00-10:00", dayOfWeekIndex: 2 }, // Wed 08-10 (Peak!)
    "act-tm-nshimiyimana-5": { shiftWindow: "14:00-16:00", dayOfWeekIndex: 5 }, // Sat 14-16
  };

  if (presetMap[activity.id]) {
    return presetMap[activity.id];
  }

  // Fallback deterministic mapping by category & hash
  let shiftWindow: ShiftWindowId = "08:00-10:00";
  switch (activity.category) {
    case "spraying":
      shiftWindow = "06:00-08:00";
      break;
    case "land_prep":
    case "planting":
    case "weeding":
      shiftWindow = "08:00-10:00";
      break;
    case "fertilizing":
      shiftWindow = "10:00-12:00";
      break;
    case "post_harvest":
      shiftWindow = "12:00-14:00";
      break;
    case "irrigation":
      shiftWindow = "14:00-16:00";
      break;
    case "harvesting":
      shiftWindow = "16:00-18:00";
      break;
  }

  // Compute day index from dueDate or id characters
  let hash = 0;
  for (let i = 0; i < activity.id.length; i++) {
    hash = (hash * 31 + activity.id.charCodeAt(i)) % 7;
  }
  const dayOfWeekIndex = Math.abs(hash) % 6; // Mon-Sat mostly

  return { shiftWindow, dayOfWeekIndex };
}

export const PeakActivityHeatmapWidget: React.FC<PeakActivityHeatmapWidgetProps> = ({
  language,
  teamMembers,
  activities,
  farms,
  selectedFarmFilter = "all",
  selectedRoleFilter = "all",
  onUpdateActivityStatus,
}) => {
  // View mode: "weekly_shifts" (6 shifts x 7 days) or "member_shifts" (Team Members x 6 shifts)
  const [matrixMode, setMatrixMode] = useState<"weekly_shifts" | "member_shifts">("weekly_shifts");
  const [focusedMemberId, setFocusedMemberId] = useState<string>("all");
  const [statusScope, setStatusScope] = useState<"all" | "active_only">("all");

  // Local overrides when user rebalances tasks across shifts/days to resolve bottlenecks
  const [slotOverrides, setSlotOverrides] = useState<
    Record<string, { shiftWindow: ShiftWindowId; dayOfWeekIndex: number }>
  >({});
  const [rebalanceToast, setRebalanceToast] = useState<string | null>(null);

  // Selected cell for drill-down inspection
  const [selectedCell, setSelectedCell] = useState<{
    mode: "weekly_shifts" | "member_shifts";
    shiftId: ShiftWindowId;
    dayIndex?: number;
    memberId?: string;
  }>({
    mode: "weekly_shifts",
    shiftId: "08:00-10:00",
    dayIndex: 1, // Default selected: Tuesday 08:00-10:00 (the primary bottleneck cell)
  });

  // Match activity to a team member
  const resolveMemberForActivity = (act: FarmActivity): TeamMember | undefined => {
    const assigned = (act.assignedTo || "").toLowerCase();
    for (const member of teamMembers) {
      const parts = member.name
        .toLowerCase()
        .split(" ")
        .filter((p) => p.length > 2);
      if (parts.some((p) => assigned.includes(p))) {
        return member;
      }
    }
    for (const member of teamMembers) {
      if (
        member.role === "agronomist" &&
        (assigned.includes("agronomist") || assigned.includes("umujyanama"))
      ) {
        return member;
      }
      if (
        member.role === "worker" &&
        (assigned.includes("abakozi") || assigned.includes("worker") || assigned.includes("lead")) &&
        (member.assignedFarmIds.length === 0 || member.assignedFarmIds.includes(act.farmId))
      ) {
        return member;
      }
      if (
        member.role === "cooperative_inspector" &&
        (assigned.includes("inspector") || assigned.includes("umugenzuzi"))
      ) {
        return member;
      }
    }
    return teamMembers[0];
  };

  // Enrich activities with resolved member, shiftWindow, and dayOfWeekIndex
  const enrichedActivities = useMemo(() => {
    return activities
      .map((act) => {
        const override = slotOverrides[act.id];
        const defaultSlot = deriveDefaultSlot(act);
        const shiftWindow = override ? override.shiftWindow : defaultSlot.shiftWindow;
        const dayOfWeekIndex = override ? override.dayOfWeekIndex : defaultSlot.dayOfWeekIndex;
        const member = resolveMemberForActivity(act);

        return {
          ...act,
          shiftWindow,
          dayOfWeekIndex,
          resolvedMember: member,
        };
      })
      .filter((act) => {
        if (selectedFarmFilter !== "all" && act.farmId !== selectedFarmFilter) {
          return false;
        }
        if (
          selectedRoleFilter !== "all" &&
          act.resolvedMember &&
          act.resolvedMember.role !== selectedRoleFilter
        ) {
          return false;
        }
        if (focusedMemberId !== "all" && act.resolvedMember?.id !== focusedMemberId) {
          return false;
        }
        if (statusScope === "active_only" && act.status === "completed") {
          return false;
        }
        return true;
      });
  }, [
    activities,
    slotOverrides,
    teamMembers,
    selectedFarmFilter,
    selectedRoleFilter,
    focusedMemberId,
    statusScope,
  ]);

  // Build Weekly Matrix: [shiftWindowId][dayIndex] -> EnrichedActivity[]
  const weeklyMatrix = useMemo(() => {
    const grid: Record<ShiftWindowId, Record<number, typeof enrichedActivities>> = {
      "06:00-08:00": { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      "08:00-10:00": { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      "10:00-12:00": { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      "12:00-14:00": { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      "14:00-16:00": { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      "16:00-18:00": { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    };

    enrichedActivities.forEach((act) => {
      const s = act.shiftWindow;
      const d = act.dayOfWeekIndex;
      if (grid[s] && grid[s][d]) {
        grid[s][d].push(act);
      }
    });

    return grid;
  }, [enrichedActivities]);

  // Build Member × Shift Matrix: [memberId][shiftWindowId] -> EnrichedActivity[]
  const memberShiftMatrix = useMemo(() => {
    const grid: Record<string, Record<ShiftWindowId, typeof enrichedActivities>> = {};
    teamMembers.forEach((m) => {
      grid[m.id] = {
        "06:00-08:00": [],
        "08:00-10:00": [],
        "10:00-12:00": [],
        "12:00-14:00": [],
        "14:00-16:00": [],
        "16:00-18:00": [],
      };
    });

    enrichedActivities.forEach((act) => {
      const mId = act.resolvedMember?.id;
      if (mId && grid[mId] && grid[mId][act.shiftWindow]) {
        grid[mId][act.shiftWindow].push(act);
      }
    });

    return grid;
  }, [enrichedActivities, teamMembers]);

  // Bottleneck & Peak Analytics Computation
  const heatmapAnalytics = useMemo(() => {
    let peakCount = 0;
    let peakShift: ShiftWindowId = "08:00-10:00";
    let peakDayIndex = 1;
    let bottleneckSlotCount = 0;
    let morningTasksCount = 0; // 06:00-10:00

    SHIFT_WINDOWS.forEach((shift) => {
      DAYS_OF_WEEK.forEach((day) => {
        const cellTasks = weeklyMatrix[shift.id][day.index];
        const count = cellTasks.length;
        if (count > peakCount) {
          peakCount = count;
          peakShift = shift.id;
          peakDayIndex = day.index;
        }
        if (count >= shift.capacityThreshold) {
          bottleneckSlotCount += 1;
        }
        if (shift.id === "06:00-08:00" || shift.id === "08:00-10:00") {
          morningTasksCount += count;
        }
      });
    });

    const totalCount = enrichedActivities.length;
    const morningConcentrationPct =
      totalCount > 0 ? Math.round((morningTasksCount / totalCount) * 100) : 0;

    // Detect member-specific shift overload (>= 3 tasks in the same shift window across the week)
    const overloadedMembers: {
      member: TeamMember;
      shiftId: ShiftWindowId;
      count: number;
    }[] = [];

    teamMembers.forEach((member) => {
      SHIFT_WINDOWS.forEach((shift) => {
        const mTasks = memberShiftMatrix[member.id]?.[shift.id] || [];
        if (mTasks.length >= 3) {
          overloadedMembers.push({
            member,
            shiftId: shift.id,
            count: mTasks.length,
          });
        }
      });
    });

    return {
      peakCount,
      peakShift,
      peakDayIndex,
      bottleneckSlotCount,
      morningConcentrationPct,
      overloadedMembers,
      totalCount,
    };
  }, [weeklyMatrix, memberShiftMatrix, enrichedActivities, teamMembers]);

  // Tasks inside the currently selected cell
  const selectedCellTasks = useMemo(() => {
    if (selectedCell.mode === "weekly_shifts") {
      const d = selectedCell.dayIndex ?? 1;
      return weeklyMatrix[selectedCell.shiftId]?.[d] || [];
    } else {
      const mId = selectedCell.memberId || teamMembers[0]?.id;
      return (mId && memberShiftMatrix[mId]?.[selectedCell.shiftId]) || [];
    }
  }, [selectedCell, weeklyMatrix, memberShiftMatrix, teamMembers]);

  // Handler to move a single task to a new shift window or day
  const handleMoveTaskSlot = (
    taskId: string,
    newShift: ShiftWindowId,
    newDayIndex: number
  ) => {
    setSlotOverrides((prev) => ({
      ...prev,
      [taskId]: {
        shiftWindow: newShift,
        dayOfWeekIndex: newDayIndex,
      },
    }));

    const taskObj = activities.find((a) => a.id === taskId);
    setRebalanceToast(
      language === "rw"
        ? `Igikorwa "${taskObj?.title || ""}" cyimuriwe kuri ${
            DAYS_OF_WEEK[newDayIndex]?.fullRw
          } (${newShift}) kugira ngo hagabanuke umuvundo.`
        : `Moved "${taskObj?.title || ""}" to ${
            DAYS_OF_WEEK[newDayIndex]?.fullEn
          } (${newShift}) to relieve shift congestion.`
    );
    setTimeout(() => setRebalanceToast(null), 4500);
  };

  // Auto-rebalance operational bottlenecks across the week
  const handleAutoLevelBottlenecks = () => {
    const newOverrides: Record<
      string,
      { shiftWindow: ShiftWindowId; dayOfWeekIndex: number }
    > = { ...slotOverrides };
    let movedCount = 0;

    SHIFT_WINDOWS.forEach((shift) => {
      DAYS_OF_WEEK.forEach((day) => {
        const cellTasks = weeklyMatrix[shift.id][day.index];
        if (cellTasks.length >= shift.capacityThreshold) {
          // Move excess tasks above threshold-1 to under-utilized windows
          const excessTasks = cellTasks.slice(shift.capacityThreshold - 1);
          excessTasks.forEach((task, idx) => {
            const targetShift: ShiftWindowId =
              task.category === "weeding" || task.category === "fertilizing"
                ? "10:00-12:00"
                : "14:00-16:00";
            const targetDay = (day.index + idx + 1) % 6; // Keep Mon-Sat
            newOverrides[task.id] = {
              shiftWindow: targetShift,
              dayOfWeekIndex: targetDay,
            };
            movedCount++;
          });
        }
      });
    });

    if (movedCount > 0) {
      setSlotOverrides(newOverrides);
      setRebalanceToast(
        language === "rw"
          ? `Imirimo ${movedCount} yari ifite umuvundo mu gitondo yagabanyijwe mu masaha y'ikigoroba n'indi minsi!`
          : `Auto-leveled ${movedCount} bottlenecked tasks into balanced shift windows.`
      );
      setTimeout(() => setRebalanceToast(null), 5000);
    }
  };

  const handleResetOverrides = () => {
    setSlotOverrides({});
    setRebalanceToast(
      language === "rw"
        ? "Ingengabihe y'imirimo yasubijwe uko yari imeze mbere."
        : "Reset heatmap schedule to baseline field logs."
    );
    setTimeout(() => setRebalanceToast(null), 3500);
  };

  // Determine cell visual styling (Color + accessible label/border)
  const getCellAppearance = (count: number, threshold: number, isSelected: boolean) => {
    const selectionRing = isSelected
      ? "ring-2 ring-stone-900 dark:ring-white ring-offset-2 dark:ring-offset-stone-900 z-10"
      : "";

    if (count === 0) {
      return {
        bg: `bg-stone-50 dark:bg-stone-800/40 text-stone-400 dark:text-stone-600 border-stone-200/70 dark:border-stone-800 hover:border-stone-300 ${selectionRing}`,
        statusText: language === "rw" ? "Nta gikorwa" : "Idle",
        isBottleneck: false,
      };
    }

    if (count >= threshold + 1) {
      // Severe bottleneck (Crimson/Rose alert)
      return {
        bg: `bg-rose-600 text-white border-rose-700 dark:bg-rose-600 dark:border-rose-400 shadow-xs ${selectionRing}`,
        statusText: language === "rw" ? "Umuvundo Ukabije" : "Critical Bottleneck",
        isBottleneck: true,
      };
    }

    if (count === threshold) {
      // Warning / High load (Amber)
      return {
        bg: `bg-amber-500 text-stone-950 border-amber-600 dark:bg-amber-500 dark:text-stone-950 font-bold ${selectionRing}`,
        statusText: language === "rw" ? "Umuvundo Mwinshi" : "Peak Contention",
        isBottleneck: true,
      };
    }

    if (count === 2) {
      // Moderate optimal load (Deep Emerald)
      return {
        bg: `bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-600 dark:border-emerald-500 ${selectionRing}`,
        statusText: language === "rw" ? "Biringaniye" : "Optimal Flow",
        isBottleneck: false,
      };
    }

    // Light load (1 task)
    return {
      bg: `bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 ${selectionRing}`,
      statusText: language === "rw" ? "Igikorwa 1" : "Light Load",
      isBottleneck: false,
    };
  };

  const getCategoryLabel = (cat: ActivityCategory) => {
    switch (cat) {
      case "land_prep":
        return language === "rw" ? "Guharura" : "Land Prep";
      case "planting":
        return language === "rw" ? "Gutera" : "Planting";
      case "fertilizing":
        return language === "rw" ? "Gufumbira" : "Fertilizing";
      case "weeding":
        return language === "rw" ? "Kubagara" : "Weeding";
      case "spraying":
        return language === "rw" ? "Gutera Umuti" : "Spraying";
      case "irrigation":
        return language === "rw" ? "Kuhira" : "Irrigation";
      case "harvesting":
        return language === "rw" ? "Gusarura" : "Harvesting";
      case "post_harvest":
        return language === "rw" ? "Kwanika & Kubika" : "Post-Harvest";
      default:
        return cat;
    }
  };

  const peakDayObj = DAYS_OF_WEEK[heatmapAnalytics.peakDayIndex] || DAYS_OF_WEEK[1];

  return (
    <section className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 sm:p-6 space-y-6">
      {/* Top Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {language === "rw"
                ? "Isesengura ry'Amasaha y'Akazi n'Umuvundo (Operational Bottleneck Heatmap)"
                : "Operational Activity Heatmap & Shift Bottleneck Analyzer"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {heatmapAnalytics.totalCount}{" "}
              {language === "rw" ? "ibikorwa byanditswe" : "tracked operations"}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white tracking-tight">
            {language === "rw"
              ? "Ikarita y'Ubukana bw'Imirimo ku Masaha no ku Bakozi"
              : "Peak Field Activity Hours & Team Concurrency Bottlenecks"}
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            {language === "rw"
              ? "Reba amasaha abakozi n'abajyanama bahuriramo n'imirimo myinshi icyarimwe (Bottlenecks). Kanda ku gasanduku k'isaha kugira ngo wimurire imirimo idahutirwa mu masaha afite ubwinyagamburiro."
              : "Identify high-contention field shifts where multiple parcel operations collide. Select any time slot cell to inspect concurrent tasks and rebalance schedules."}
          </p>
        </div>

        {/* Interactive Mode Switcher & Auto-Rebalance Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Matrix Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200/80 dark:border-stone-700">
            <button
              type="button"
              onClick={() => {
                setMatrixMode("weekly_shifts");
                setSelectedCell({
                  mode: "weekly_shifts",
                  shiftId: heatmapAnalytics.peakShift,
                  dayIndex: heatmapAnalytics.peakDayIndex,
                });
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                matrixMode === "weekly_shifts"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Iminsi × Amasaha" : "Day × Shift Grid"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMatrixMode("member_shifts");
                setSelectedCell({
                  mode: "member_shifts",
                  shiftId: "08:00-10:00",
                  memberId: teamMembers[0]?.id,
                });
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                matrixMode === "member_shifts"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs"
                  : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {language === "rw" ? "Abakozi × Amasaha" : "Member × Shift Load"}
            </button>
          </div>

          {/* Auto-Level Bottlenecks Action */}
          {heatmapAnalytics.bottleneckSlotCount > 0 && (
            <button
              type="button"
              onClick={handleAutoLevelBottlenecks}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors whitespace-nowrap shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {language === "rw"
                  ? "Gabanya Umuvundo (Auto-Rebalance)"
                  : "Auto-Rebalance Bottlenecks"}
              </span>
            </button>
          )}

          {Object.keys(slotOverrides).length > 0 && (
            <button
              type="button"
              onClick={handleResetOverrides}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Subiza Mbere" : "Reset"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Rebalance Feedback Banner */}
      {rebalanceToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{rebalanceToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setRebalanceToast(null)}
            className="text-xs font-semibold underline text-emerald-700 dark:text-emerald-300"
          >
            {language === "rw" ? "Funga" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Bottleneck Diagnostic KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Peak Contention Slot */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {language === "rw" ? "Isaha Ifite Umuvundo kurusha Izindi" : "Primary Peak Bottleneck Window"}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
              {language === "rw" ? peakDayObj.fullRw : peakDayObj.fullEn} ·{" "}
              <span className="font-mono tabular-nums">{heatmapAnalytics.peakShift}</span>
            </span>
            <span className="font-mono tabular-nums text-sm font-bold text-rose-600 dark:text-rose-400">
              {heatmapAnalytics.peakCount} {language === "rw" ? "imirimo" : "tasks"}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {language === "rw"
              ? "Guhurirana kw'imirimo yo kubagara, gutera imbuto no gupima ifumbire mu gitondo."
              : "Concurrent tillage, earthing-up, and fertilizer calibration collide in this window."}
          </p>
        </div>

        {/* Morning Shift Concentration */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {language === "rw"
              ? "Ubwiganze bw'Imirimo ya Mu Gitondo (06:00–10:00)"
              : "Morning Shift Concentration (06:00–10:00)"}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-white">
              {heatmapAnalytics.morningConcentrationPct}%
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {heatmapAnalytics.morningConcentrationPct > 55
                ? language === "rw"
                  ? "Umuvundo wo mu gitondo"
                  : "High morning skew"
                : language === "rw"
                ? "Biringaniye neza"
                : "Well distributed"}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {language === "rw"
              ? "Inama ya RAB: Imirimo yo gusibura imigende no kubika umusaruro yakwimurirwa saa 14:00–16:00."
              : "Recommendation: Shift drainage maintenance & depot grading to 14:00–16:00."}
          </p>
        </div>

        {/* Active Bottleneck Count & Member Contention */}
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {language === "rw"
              ? "Amasaha Arengeje Ubushobozi (Bottleneck Slots)"
              : "Over-Capacity Shift Slots"}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-stone-900 dark:text-white">
              {heatmapAnalytics.bottleneckSlotCount}{" "}
              <span className="text-xs font-normal text-stone-500">
                {language === "rw" ? "amasaha" : "windows"}
              </span>
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-300 font-mono tabular-nums">
              {heatmapAnalytics.overloadedMembers.length}{" "}
              {language === "rw" ? "abakozi barengeje" : "member alerts"}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {heatmapAnalytics.overloadedMembers.length > 0
              ? `${heatmapAnalytics.overloadedMembers[0].member.name} (${heatmapAnalytics.overloadedMembers[0].count} tasks @ ${heatmapAnalytics.overloadedMembers[0].shiftId})`
              : language === "rw"
              ? "Nta mukozi ufite imirimo igongana ku isaha imwe."
              : "Zero team members exceeding safe per-shift task concurrency."}
          </p>
        </div>
      </div>

      {/* Secondary Filter Bar: Focus Specific Team Member & Task Scope */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {language === "rw" ? " Kurikirana Umukozi:" : "Filter Collaborator:"}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setFocusedMemberId("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                focusedMemberId === "all"
                  ? "bg-emerald-700 text-white"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
              }`}
            >
              {language === "rw" ? "Ikipe Yose" : "All Team"} ({teamMembers.length})
            </button>
            {teamMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFocusedMemberId(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  focusedMemberId === m.id
                    ? "bg-emerald-700 text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                }`}
              >
                {m.name.split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        </div>

        {/* Scope Filter & Intensity Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center space-x-1.5 cursor-pointer text-stone-600 dark:text-stone-300">
            <input
              type="checkbox"
              checked={statusScope === "active_only"}
              onChange={(e) =>
                setStatusScope(e.target.checked ? "active_only" : "all")
              }
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              {language === "rw"
                ? "Erekana gusa ibitararangira (Pending & Active)"
                : "Pending & In-Progress Only"}
            </span>
          </label>

          {/* Accessible Color + Number Legend */}
          <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-xs bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 inline-block" />
              <span>0 (Idle)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 inline-block" />
              <span>1 (Light)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
              <span>2 (Optimal)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
              <span>3 (Peak)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" />
              <span>4+ (Bottleneck)</span>
            </span>
          </div>
        </div>
      </div>

      {/* HEATMAP MATRIX VIEW 1: WEEKLY SHIFT × DAY OF WEEK */}
      {matrixMode === "weekly_shifts" ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-left">
                <th className="py-2.5 pr-3 text-xs font-semibold text-stone-500 dark:text-stone-400 w-52">
                  {language === "rw" ? "Isaha y'Umurimo (Shift Window)" : "Field Shift Window"}
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th
                    key={day.index}
                    className="py-2.5 px-1.5 text-center text-xs font-semibold text-stone-700 dark:text-stone-300"
                  >
                    <div>{language === "rw" ? day.shortRw : day.shortEn}</div>
                    <div className="text-[10px] font-normal text-stone-400 hidden sm:block">
                      {language === "rw" ? day.fullRw : day.fullEn}
                    </div>
                  </th>
                ))}
                <th className="py-2.5 pl-3 text-right text-xs font-semibold text-stone-500 dark:text-stone-400 w-24">
                  {language === "rw" ? "Igiteranyo" : "Shift Total"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/70">
              {SHIFT_WINDOWS.map((shift) => {
                const rowTotal = DAYS_OF_WEEK.reduce(
                  (acc, d) => acc + (weeklyMatrix[shift.id][d.index]?.length || 0),
                  0
                );

                return (
                  <tr key={shift.id} className="group">
                    {/* Shift label column */}
                    <td className="py-2.5 pr-3 align-middle">
                      <div className="font-mono tabular-nums text-xs font-bold text-stone-900 dark:text-white">
                        {shift.shortLabel}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                        {language === "rw" ? shift.agronomicContextRw : shift.agronomicContextEn}
                      </div>
                    </td>

                    {/* 7 Day Cells */}
                    {DAYS_OF_WEEK.map((day) => {
                      const cellTasks = weeklyMatrix[shift.id][day.index] || [];
                      const count = cellTasks.length;
                      const isSelected =
                        selectedCell.mode === "weekly_shifts" &&
                        selectedCell.shiftId === shift.id &&
                        selectedCell.dayIndex === day.index;

                      const appearance = getCellAppearance(
                        count,
                        shift.capacityThreshold,
                        isSelected
                      );

                      return (
                        <td key={day.index} className="p-1 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCell({
                                mode: "weekly_shifts",
                                shiftId: shift.id,
                                dayIndex: day.index,
                              })
                            }
                            className={`w-full h-12 rounded-xl border transition-transform active:scale-95 flex flex-col items-center justify-center px-1 ${appearance.bg}`}
                            title={`${
                              language === "rw" ? day.fullRw : day.fullEn
                            } (${shift.shortLabel}): ${count} tasks — ${appearance.statusText}`}
                          >
                            <div className="flex items-center space-x-1 font-mono tabular-nums text-xs sm:text-sm font-bold leading-none">
                              <span>{count}</span>
                              {appearance.isBottleneck && (
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] opacity-85 truncate max-w-full mt-0.5">
                              {count === 0
                                ? "—"
                                : appearance.isBottleneck
                                ? language === "rw"
                                  ? "Umuvundo"
                                  : "Bottleneck"
                                : language === "rw"
                                ? "Imirimo"
                                : count === 1
                                ? "1 task"
                                : `${count} tasks`}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    {/* Shift Row Total */}
                    <td className="py-2.5 pl-3 text-right align-middle font-mono tabular-nums text-xs font-bold text-stone-700 dark:text-stone-300">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* HEATMAP MATRIX VIEW 2: TEAM MEMBER × SHIFT WINDOW LOAD */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-left">
                <th className="py-2.5 pr-3 text-xs font-semibold text-stone-500 dark:text-stone-400 w-56">
                  {language === "rw" ? "Umukozi / Umujyanama" : "Team Collaborator"}
                </th>
                {SHIFT_WINDOWS.map((shift) => (
                  <th
                    key={shift.id}
                    className="py-2.5 px-1.5 text-center text-xs font-semibold text-stone-700 dark:text-stone-300 font-mono tabular-nums"
                  >
                    {shift.shortLabel}
                  </th>
                ))}
                <th className="py-2.5 pl-3 text-right text-xs font-semibold text-stone-500 dark:text-stone-400 w-28">
                  {language === "rw" ? "Isaha y'Umuvundo" : "Peak Shift"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/70">
              {teamMembers.map((member) => {
                let memberMax = 0;
                let memberPeakShift: ShiftWindowId = "08:00-10:00";

                SHIFT_WINDOWS.forEach((s) => {
                  const c = memberShiftMatrix[member.id]?.[s.id]?.length || 0;
                  if (c > memberMax) {
                    memberMax = c;
                    memberPeakShift = s.id;
                  }
                });

                return (
                  <tr key={member.id}>
                    <td className="py-2.5 pr-3 align-middle">
                      <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {member.role === "agronomist"
                          ? language === "rw"
                            ? "Umujyanama wa RAB"
                            : "Agronomist"
                          : member.role === "worker"
                          ? language === "rw"
                            ? "Umukozi w'Umurima"
                            : "Field Operator"
                          : language === "rw"
                          ? "Umugenzuzi wa Koperative"
                          : "Coop Inspector"}
                      </div>
                    </td>

                    {SHIFT_WINDOWS.map((shift) => {
                      const cellTasks = memberShiftMatrix[member.id]?.[shift.id] || [];
                      const count = cellTasks.length;
                      const isSelected =
                        selectedCell.mode === "member_shifts" &&
                        selectedCell.memberId === member.id &&
                        selectedCell.shiftId === shift.id;

                      const appearance = getCellAppearance(count, 3, isSelected);

                      return (
                        <td key={shift.id} className="p-1 align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCell({
                                mode: "member_shifts",
                                memberId: member.id,
                                shiftId: shift.id,
                              })
                            }
                            className={`w-full h-12 rounded-xl border transition-transform active:scale-95 flex flex-col items-center justify-center px-1 ${appearance.bg}`}
                          >
                            <div className="flex items-center space-x-1 font-mono tabular-nums text-xs sm:text-sm font-bold leading-none">
                              <span>{count}</span>
                              {appearance.isBottleneck && (
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] opacity-85 mt-0.5">
                              {count === 0
                                ? "—"
                                : appearance.isBottleneck
                                ? language === "rw"
                                  ? "Umuvundo"
                                  : "Overload"
                                : `${count} ops`}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-2.5 pl-3 text-right align-middle">
                      <span className="font-mono tabular-nums text-xs font-bold text-stone-800 dark:text-stone-200 block">
                        {memberPeakShift}
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono tabular-nums">
                        {memberMax} {language === "rw" ? "imirimo" : "tasks"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Cell Drill-Down & Interactive Shift Rebalancer Panel */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center space-x-2">
              <span>
                {selectedCell.mode === "weekly_shifts"
                  ? `${
                      language === "rw"
                        ? DAYS_OF_WEEK[selectedCell.dayIndex ?? 1]?.fullRw
                        : DAYS_OF_WEEK[selectedCell.dayIndex ?? 1]?.fullEn
                    } · ${selectedCell.shiftId}`
                  : `${
                      teamMembers.find((m) => m.id === selectedCell.memberId)?.name ||
                      ""
                    } · ${selectedCell.shiftId}`}
              </span>
              <span className="text-stone-400 font-normal">·</span>
              <span className="font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400">
                {selectedCellTasks.length}{" "}
                {language === "rw"
                  ? "ibikorwa muri iri saha"
                  : "scheduled operations in slot"}
              </span>
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? "Hindura isaha cyangwa umunsi ku murimo uwo ari wo wose kugira ngo ukureho umuvundo w'abakozi."
                : "Reassign shift window or day below to resolve concurrent labor bottlenecks."}
            </p>
          </div>
        </div>

        {selectedCellTasks.length === 0 ? (
          <div className="p-5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-400">
            {language === "rw"
              ? "Nta bikorwa byanditse muri iri saha. Iri saha ifite ubwinyagamburiro bwo kwakira imirimo yimuwe ahandi."
              : "No tasks scheduled in this shift slot. Available capacity for rebalancing congested morning tasks."}
          </div>
        ) : (
          <div className="divide-y divide-stone-200/70 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
            {selectedCellTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-white dark:bg-stone-900 hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm">
                      {task.title}
                    </span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-600 dark:text-stone-300 font-medium">
                      {getCategoryLabel(task.category)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {task.resolvedMember?.name || task.assignedTo}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{task.farmName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Due {task.dueDate}</span>
                  </div>
                </div>

                {/* Interactive Shift & Day Reassignment Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <label className="text-[11px] text-stone-500 dark:text-stone-400">
                    {language === "rw" ? "Imura ku:" : "Move to:"}
                  </label>

                  {/* Day Selector */}
                  <select
                    value={task.dayOfWeekIndex}
                    onChange={(e) =>
                      handleMoveTaskSlot(
                        task.id,
                        task.shiftWindow,
                        Number(e.target.value)
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.index} value={d.index}>
                        {language === "rw" ? d.fullRw : d.fullEn}
                      </option>
                    ))}
                  </select>

                  {/* Shift Window Selector */}
                  <select
                    value={task.shiftWindow}
                    onChange={(e) =>
                      handleMoveTaskSlot(
                        task.id,
                        e.target.value as ShiftWindowId,
                        task.dayOfWeekIndex
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono tabular-nums font-medium text-stone-800 dark:text-stone-200"
                  >
                    {SHIFT_WINDOWS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortLabel}
                      </option>
                    ))}
                  </select>

                  {/* Status Toggle Button */}
                  {onUpdateActivityStatus && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateActivityStatus(
                          task.id,
                          task.status === "completed" ? "pending" : "completed"
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap border ${
                        task.status === "completed"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      {task.status === "completed"
                        ? language === "rw"
                          ? "Byarangiye"
                          : "Completed"
                        : language === "rw"
                        ? "Emeza ko byakozwe"
                        : "Mark Done"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
