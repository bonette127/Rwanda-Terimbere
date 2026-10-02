import React, { useState, useMemo } from "react";
import {
  Language,
  TeamMember,
  FarmActivity,
  Farm,
  TeamRole,
  ActivityCategory,
} from "../types";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Sprout,
  Briefcase,
  Building2,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Calendar,
  MapPin,
  ExternalLink,
  MessageCircle,
  Phone,
  Printer,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";
import { PeakActivityHeatmapWidget } from "./PeakActivityHeatmapWidget";

interface LaborProductivityDashboardProps {
  language: Language;
  teamMembers: TeamMember[];
  activities: FarmActivity[];
  farms: Farm[];
  onUpdateActivityStatus?: (id: string, status: "pending" | "in_progress" | "completed") => void;
  onSimulateMemberLogin?: (member: TeamMember) => void;
  onOpenInviteModal?: () => void;
}

export const LaborProductivityDashboard: React.FC<LaborProductivityDashboardProps> = ({
  language,
  teamMembers,
  activities,
  farms,
  onUpdateActivityStatus,
  onSimulateMemberLogin,
  onOpenInviteModal,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rate" | "tasks" | "name">("rate");

  // Helper to map tasks to team members based on name keywords or assigned parcels
  const memberTaskMap = useMemo(() => {
    const map: Record<string, FarmActivity[]> = {};

    teamMembers.forEach((member) => {
      const memberNameParts = member.name.toLowerCase().split(" ").filter((p) => p.length > 2);
      
      const memberTasks = activities.filter((act) => {
        const assigned = (act.assignedTo || "").toLowerCase();
        
        // Match exact or partial name in assignedTo
        const nameMatches = memberNameParts.some((part) => assigned.includes(part));
        if (nameMatches) return true;

        // Match role keywords if specific
        if (member.role === "agronomist" && (assigned.includes("agronomist") || assigned.includes("umujyanama"))) {
          return true;
        }

        // If activity parcel matches member's assigned parcel and assignedTo contains generic worker
        if (
          member.role === "worker" &&
          (assigned.includes("abakozi") || assigned.includes("worker") || assigned.includes("lead")) &&
          (member.assignedFarmIds.length === 0 || member.assignedFarmIds.includes(act.farmId))
        ) {
          return true;
        }

        // If cooperative inspector matches audit / certified tag tasks
        if (
          member.role === "cooperative_inspector" &&
          (assigned.includes("inspector") || assigned.includes("umugenzuzi") || assigned.includes("koperative"))
        ) {
          return true;
        }

        return false;
      });

      map[member.id] = memberTasks;
    });

    return map;
  }, [teamMembers, activities]);

  // Compute labor stats per member
  const memberProductivityStats = useMemo(() => {
    return teamMembers.map((member) => {
      const tasks = memberTaskMap[member.id] || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "completed").length;
      const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
      const pendingTasks = tasks.filter((t) => t.status === "pending").length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Group tasks by category
      const categoryCount: Record<string, number> = {};
      tasks.forEach((t) => {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      });

      // Efficiency Rating
      let ratingLabelRw = "Iteganyijwe";
      let ratingLabelEn = "Standard";
      let ratingColor = "text-stone-500 bg-stone-100 dark:bg-stone-800";
      
      if (totalTasks >= 3 && completionRate >= 80) {
        ratingLabelRw = "🌟 Indashyikirwa (Top Velocity)";
        ratingLabelEn = "🌟 Top Velocity Performer";
        ratingColor = "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800";
      } else if (completionRate >= 50) {
        ratingLabelRw = "⚡ Umunyamwete (On Track)";
        ratingLabelEn = "⚡ On Track Performer";
        ratingColor = "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800";
      } else if (totalTasks > 0) {
        ratingLabelRw = "⏳ Akeneye Ubufasha (Needs Attention)";
        ratingLabelEn = "⏳ Needs Follow-Up";
        ratingColor = "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800";
      }

      return {
        member,
        tasks,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionRate,
        categoryCount,
        ratingLabelRw,
        ratingLabelEn,
        ratingColor,
      };
    });
  }, [teamMembers, memberTaskMap]);

  // Filtered and Sorted Member List
  const filteredMembers = useMemo(() => {
    return memberProductivityStats.filter((item) => {
      // Role filter
      if (selectedRole !== "all" && item.member.role !== selectedRole) {
        return false;
      }

      // Farm filter
      if (selectedFarmId !== "all") {
        const matchesParcel =
          item.member.assignedFarmIds.length === 0 ||
          item.member.assignedFarmIds.includes(selectedFarmId);
        if (!matchesParcel) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.member.name.toLowerCase().includes(q);
        const matchesPhone = item.member.phone.includes(q);
        const matchesSpecialization = (item.member.specialization || "").toLowerCase().includes(q);
        const matchesTask = item.tasks.some((t) => t.title.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesSpecialization && !matchesTask) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "rate") {
        return b.completionRate - a.completionRate || b.completedTasks - a.completedTasks;
      }
      if (sortBy === "tasks") {
        return b.totalTasks - a.totalTasks;
      }
      return a.member.name.localeCompare(b.member.name);
    });
  }, [memberProductivityStats, selectedRole, selectedFarmId, searchQuery, sortBy]);

  // Aggregate Cooperative Metrics
  const aggregateMetrics = useMemo(() => {
    let totalAssigned = 0;
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalPending = 0;

    memberProductivityStats.forEach((m) => {
      totalAssigned += m.totalTasks;
      totalCompleted += m.completedTasks;
      totalInProgress += m.inProgressTasks;
      totalPending += m.pendingTasks;
    });

    const overallRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    const avgCompletedPerMember = teamMembers.length > 0 ? (totalCompleted / teamMembers.length).toFixed(1) : "0";

    // Best performer
    const sortedByCompleted = [...memberProductivityStats].sort(
      (a, b) => b.completedTasks - a.completedTasks || b.completionRate - a.completionRate
    );
    const topPerformer = sortedByCompleted[0];

    return {
      totalAssigned,
      totalCompleted,
      totalInProgress,
      totalPending,
      overallRate,
      avgCompletedPerMember,
      topPerformer,
    };
  }, [memberProductivityStats, teamMembers]);

  const getRoleBadge = (role: TeamRole) => {
    switch (role) {
      case "agronomist":
        return {
          labelRw: "Umujyanama (Agronomist)",
          labelEn: "Agronomist Specialist",
          color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
          icon: <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        };
      case "worker":
        return {
          labelRw: "Umukozi (Field Worker)",
          labelEn: "Field Operator / Lead",
          color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800",
          icon: <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        };
      case "cooperative_inspector":
        return {
          labelRw: "Umugenzuzi (Inspector)",
          labelEn: "Coop Quality Inspector",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800",
          icon: <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
        };
    }
  };

  const getCategoryLabel = (cat: ActivityCategory) => {
    switch (cat) {
      case "land_prep":
        return language === "rw" ? "Guharura (Tillage)" : "Land Prep";
      case "planting":
        return language === "rw" ? "Gutera (Planting)" : "Planting";
      case "fertilizing":
        return language === "rw" ? "Gufumbira (Fertilizing)" : "Fertilizing";
      case "weeding":
        return language === "rw" ? "Kubagara (Weeding)" : "Weeding";
      case "spraying":
        return language === "rw" ? "Gutera Umuti (Spraying)" : "Spraying";
      case "irrigation":
        return language === "rw" ? "Kuhira (Irrigation)" : "Irrigation";
      case "harvesting":
        return language === "rw" ? "Gusarura (Harvesting)" : "Harvesting";
      case "post_harvest":
        return language === "rw" ? "Kwanika & Kubika" : "Post-Harvest";
      default:
        return cat;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 p-6 text-white border border-emerald-900/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-500/30 text-emerald-200 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {language === "rw"
                ? "Isesengura ry'Umurimo n'Ikipe (Labor Productivity Metrics)"
                : "Cooperative Labor Productivity & Team Execution Dashboard"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
            {language === "rw"
              ? "Umusaruro w'Abakozi n'Abajyanama b'Ubuhinzi"
              : "Team Task Velocity, Completed Operations & Productivity Benchmarks"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-3xl">
            {language === "rw"
              ? "Genzura ibikorwa byakozwe n'abakozi b'umurima, abajyanama ba RAB, n'abagenzuzi ba koperative. Gereranya uko imirimo yarangiye (Completed) n'igitegerejwe (Pending) kuri buri murima."
              : "Track individual task completion rates, compare logged agricultural operations against planned timelines, and audit labor velocity across parcels."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
          >
            <Printer className="w-3.5 h-3.5 text-stone-300" />
            <span>{language === "rw" ? "Capa Raporo (Print)" : "Print Report"}</span>
          </button>

          {onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-all shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === "rw" ? "Ohereza Ubutumire Bushya" : "Invite Member"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Assigned */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {language === "rw" ? "Imirimo Yose Yanditswe" : "Total Logged Tasks"}
            </span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mt-1">
            {aggregateMetrics.totalAssigned}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {language === "rw"
              ? `Kuri banyamuryango ${teamMembers.length}`
              : `Across ${teamMembers.length} team members`}
          </p>
        </div>

        {/* Completed Operations */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px] text-stone-500 dark:text-stone-400">
              {language === "rw" ? "Imirimo Yarangiye" : "Completed Tasks"}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {aggregateMetrics.totalCompleted}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mt-1">
            {aggregateMetrics.overallRate}% {language === "rw" ? "yarangiye neza" : "execution rate"}
          </p>
        </div>

        {/* In Progress & Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px] text-stone-500 dark:text-stone-400">
              {language === "rw" ? "Bitegereje / Birakorwa" : "Pending & Active"}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {aggregateMetrics.totalInProgress}
            </span>
            <span className="text-xs font-bold text-stone-400">
              + {aggregateMetrics.totalPending} {language === "rw" ? "biri ku murongo" : "queued"}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {language === "rw" ? "Biteganyijwe muri iki cyumweru" : "Active field sprint"}
          </p>
        </div>

        {/* Avg Completed Per Member */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {language === "rw" ? "Impuzandengo / Umukozi" : "Avg Tasks / Member"}
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mt-1">
            {aggregateMetrics.avgCompletedPerMember}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            {language === "rw" ? "Imirimo yemejwe buri muntu" : "Completed per collaborator"}
          </p>
        </div>

        {/* Top Performer MVP */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-teal-500/10 dark:from-amber-950/40 dark:to-emerald-950/30 border border-amber-300/80 dark:border-amber-700/60 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 dark:text-amber-300 flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{language === "rw" ? "Indashyikirwa (Top Performer)" : "Top Velocity"}</span>
            </span>
          </div>
          {aggregateMetrics.topPerformer ? (
            <div className="mt-1">
              <div className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white truncate">
                {aggregateMetrics.topPerformer.member.name}
              </div>
              <div className="flex items-center space-x-1.5 mt-1 text-[11px]">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {aggregateMetrics.topPerformer.completedTasks} {language === "rw" ? "byarangiye" : "done"}
                </span>
                <span className="text-stone-400">•</span>
                <span className="font-black text-amber-600 dark:text-amber-400">
                  {aggregateMetrics.topPerformer.completionRate}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-400 mt-2 italic">N/A</div>
          )}
        </div>
      </div>

      {/* Visual Productivity Comparison Benchmark Bar Chart */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>
                {language === "rw"
                  ? "Ikigereranyo cy'Umusaruro w'Ikipe (Team Velocity Benchmark)"
                  : "Team Labor Execution & Completion Benchmark"}
              </span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {language === "rw"
                ? "Gereranya imirimo yarangiye (Completed), irimo gukorwa (In Progress), n'itegerejwe (Pending)"
                : "Side-by-side comparison of completed operations versus pending tasks"}
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              <span className="text-stone-600 dark:text-stone-300 font-semibold">
                {language === "rw" ? "Byarangiye" : "Completed"}
              </span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-stone-600 dark:text-stone-300 font-semibold">
                {language === "rw" ? "Birakorwa" : "In Progress"}
              </span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-stone-300 dark:bg-stone-700 inline-block" />
              <span className="text-stone-600 dark:text-stone-300 font-semibold">
                {language === "rw" ? "Bitegereje" : "Pending"}
              </span>
            </span>
          </div>
        </div>

        {/* Stacked Comparative Bars per Member */}
        <div className="space-y-4 pt-1">
          {filteredMembers.map(({ member, totalTasks, completedTasks, inProgressTasks, pendingTasks, completionRate }) => {
            const roleMeta = getRoleBadge(member.role);
            const completedPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            const inProgressPct = totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0;
            const pendingPct = totalTasks > 0 ? (pendingTasks / totalTasks) * 100 : 0;

            return (
              <div key={member.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                  <div className="flex items-center space-x-2">
                    <img
                      src={member.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"}
                      alt={member.name}
                      className="w-6 h-6 rounded-full object-cover border border-emerald-500"
                    />
                    <span className="font-bold text-stone-900 dark:text-white">
                      {member.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${roleMeta.color}`}>
                      {roleMeta.icon}
                      <span>{language === "rw" ? roleMeta.labelRw : roleMeta.labelEn}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      {completedTasks} {language === "rw" ? "Byarangiye" : "Done"}
                    </span>
                    <span className="text-stone-400">/</span>
                    <span className="text-stone-600 dark:text-stone-300 font-semibold">
                      {totalTasks} {language === "rw" ? "Yose" : "Total"}
                    </span>
                    <span className="font-black px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white">
                      {completionRate}%
                    </span>
                  </div>
                </div>

                {/* Multi-segment progress bar */}
                <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                  {completedPct > 0 && (
                    <div
                      style={{ width: `${completedPct}%` }}
                      className="h-full bg-emerald-600 transition-all duration-500"
                      title={`${completedTasks} Completed (${Math.round(completedPct)}%)`}
                    />
                  )}
                  {inProgressPct > 0 && (
                    <div
                      style={{ width: `${inProgressPct}%` }}
                      className="h-full bg-amber-500 transition-all duration-500"
                      title={`${inProgressTasks} In Progress (${Math.round(inProgressPct)}%)`}
                    />
                  )}
                  {pendingPct > 0 && (
                    <div
                      style={{ width: `${pendingPct}%` }}
                      className="h-full bg-stone-300 dark:bg-stone-700 transition-all duration-500"
                      title={`${pendingTasks} Pending (${Math.round(pendingPct)}%)`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Peak Activity & Operational Bottleneck Heatmap Widget */}
      <PeakActivityHeatmapWidget
        language={language}
        teamMembers={teamMembers}
        activities={activities}
        farms={farms}
        selectedFarmFilter={selectedFarmId}
        selectedRoleFilter={selectedRole}
        onUpdateActivityStatus={onUpdateActivityStatus}
      />

      {/* Interactive Filters & Search Toolbar */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={language === "rw" ? "Shakisha umukozi cyangwa igikorwa..." : "Search member or task..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold text-stone-800 dark:text-stone-200 outline-hidden"
          >
            <option value="all">{language === "rw" ? "Inshingano Zose (All Roles)" : "All Roles"}</option>
            <option value="agronomist">{language === "rw" ? "Abajyanama b'Ubuhinzi (Agronomists)" : "Agronomists"}</option>
            <option value="worker">{language === "rw" ? "Abakozi b'Umurima (Field Workers)" : "Field Workers"}</option>
            <option value="cooperative_inspector">{language === "rw" ? "Abagenzuzi (Inspectors)" : "Coop Inspectors"}</option>
          </select>

          {/* Farm Filter */}
          <select
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold text-stone-800 dark:text-stone-200 outline-hidden"
          >
            <option value="all">{language === "rw" ? "Imirima Yose (All Parcels)" : "All Parcels"}</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div className="flex items-center space-x-2 self-end md:self-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
            {language === "rw" ? "Tondeka:" : "Sort:"}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold text-stone-800 dark:text-stone-200 outline-hidden"
          >
            <option value="rate">{language === "rw" ? "Igipimo cyo kurangiza (%)" : "Completion Rate (%)"}</option>
            <option value="tasks">{language === "rw" ? "Imirimo yose (Task Count)" : "Total Tasks"}</option>
            <option value="name">{language === "rw" ? "Amazina (Alphabetical)" : "Name (A-Z)"}</option>
          </select>
        </div>
      </div>

      {/* Member Cards Detailed Grid */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-500">
            <Users className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
            <p className="font-bold text-sm">
              {language === "rw" ? "Nta mukozi cyangwa igikorwa bihwanye n'ibyo ushakishije." : "No team member matches your filter."}
            </p>
            <button
              onClick={() => {
                setSelectedRole("all");
                setSelectedFarmId("all");
                setSearchQuery("");
              }}
              className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-bold"
            >
              {language === "rw" ? "Subiza ibipimo uko byari biri" : "Reset Filters"}
            </button>
          </div>
        ) : (
          filteredMembers.map(
            ({
              member,
              tasks,
              totalTasks,
              completedTasks,
              inProgressTasks,
              pendingTasks,
              completionRate,
              categoryCount,
              ratingLabelRw,
              ratingLabelEn,
              ratingColor,
            }) => {
              const roleMeta = getRoleBadge(member.role);
              const isExpanded = expandedMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  {/* Card Header Summary */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Member Profile */}
                    <div className="flex items-start space-x-3.5">
                      <img
                        src={member.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl border-2 border-emerald-500 object-cover shrink-0 shadow-xs"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-stone-900 dark:text-white text-base">
                            {member.name}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${roleMeta.color}`}>
                            {roleMeta.icon}
                            <span>{language === "rw" ? roleMeta.labelRw : roleMeta.labelEn}</span>
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${ratingColor}`}>
                            {language === "rw" ? ratingLabelRw : ratingLabelEn}
                          </span>
                        </div>

                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          {member.specialization || "Agricultural Field Collaborator"}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                          <span className="flex items-center space-x-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{member.phone}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-amber-500" />
                            <span>
                              {member.assignedFarmIds.length === 0
                                ? language === "rw"
                                  ? "Imirima Yose (All Parcels)"
                                  : "All Parcels"
                                : `${member.assignedFarmIds.length} Parcels Assigned`}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Numerical Stats & Progress */}
                    <div className="flex flex-wrap items-center gap-4 lg:gap-6 self-start lg:self-auto">
                      {/* Metric blocks */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 min-w-[70px]">
                          <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                            {language === "rw" ? "Byarangiye" : "Done"}
                          </span>
                          <span className="text-lg font-black text-emerald-800 dark:text-emerald-200">
                            {completedTasks}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 min-w-[70px]">
                          <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block">
                            {language === "rw" ? "Birakorwa" : "Active"}
                          </span>
                          <span className="text-lg font-black text-amber-800 dark:text-amber-200">
                            {inProgressTasks}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 min-w-[70px]">
                          <span className="text-[10px] font-bold uppercase text-stone-500 block">
                            {language === "rw" ? "Bitegereje" : "Queued"}
                          </span>
                          <span className="text-lg font-black text-stone-700 dark:text-stone-300">
                            {pendingTasks}
                          </span>
                        </div>
                      </div>

                      {/* Velocity Gauge */}
                      <div className="flex flex-col items-center">
                        <div className="text-xl font-black text-stone-900 dark:text-white">
                          {completionRate}%
                        </div>
                        <span className="text-[10px] font-semibold text-stone-400 uppercase">
                          {language === "rw" ? "Isesengura" : "Velocity"}
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center space-x-2">
                        {onSimulateMemberLogin && (
                          <button
                            onClick={() => onSimulateMemberLogin(member)}
                            title="Simulate view as this member"
                            className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold transition-all shadow-2xs"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}

                        <a
                          href={`https://wa.me/${member.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Contact member via WhatsApp"
                          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                          className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-colors"
                        >
                          <span>{isExpanded ? (language === "rw" ? "Hisha" : "Collapse") : (language === "rw" ? "Reba Imirimo" : "View Tasks")}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Category Pills Strip */}
                  <div className="px-4 sm:px-5 py-2.5 bg-stone-50/80 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800/60 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-stone-400 uppercase mr-1">
                      {language === "rw" ? "Ibyiciro by'Imirimo:" : "Specializations:"}
                    </span>
                    {Object.entries(categoryCount).length === 0 ? (
                      <span className="text-stone-400 italic text-[11px]">Nta mirimo yihariye yanditswe</span>
                    ) : (
                      Object.entries(categoryCount).map(([catKey, count]) => (
                        <span
                          key={catKey}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-semibold text-[11px] text-stone-700 dark:text-stone-300"
                        >
                          {getCategoryLabel(catKey as ActivityCategory)}: <strong>{count}</strong>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Expandable Task Log Details Drawer */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            {language === "rw"
                              ? `Urutonde rw'Imirimo ya ${member.name} (${tasks.length})`
                              : `Assigned Operations for ${member.name} (${tasks.length})`}
                          </span>
                        </h5>
                        <span className="text-[11px] text-stone-400">
                          {language === "rw" ? "Kanda kuri status uhindure" : "Click status to toggle"}
                        </span>
                      </div>

                      {tasks.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 text-center text-xs text-stone-400">
                          {language === "rw" ? "Nta mirimo irandikirwa uyu mukozi." : "No tasks assigned to this member yet."}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-stone-900 dark:text-white">
                                    {task.title}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                                    {getCategoryLabel(task.category)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                                  <span className="flex items-center space-x-1">
                                    <MapPin className="w-3 h-3 text-emerald-600" />
                                    <span>{task.farmName}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3 text-stone-400" />
                                    <span>Due: {task.dueDate}</span>
                                  </span>
                                  {task.completedDate && (
                                    <span className="text-emerald-600 font-semibold">
                                      Done: {task.completedDate}
                                    </span>
                                  )}
                                </div>

                                {task.notes && (
                                  <p className="text-[11px] text-stone-600 dark:text-stone-400 italic">
                                    "{task.notes}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                                <button
                                  onClick={() =>
                                    onUpdateActivityStatus &&
                                    onUpdateActivityStatus(
                                      task.id,
                                      task.status === "completed" ? "pending" : "completed"
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                    task.status === "completed"
                                      ? "bg-emerald-600 text-white border-emerald-500"
                                      : task.status === "in_progress"
                                      ? "bg-amber-500 text-stone-950 border-amber-400"
                                      : "bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700"
                                  }`}
                                >
                                  {task.status === "completed"
                                    ? "✓ Completed"
                                    : task.status === "in_progress"
                                    ? "⚡ In Progress"
                                    : "⏳ Pending"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )
        )}
      </div>

      {/* RAB Cooperative Labor Standards Guideline Box */}
      <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
        <div className="flex items-center space-x-2 text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <h4 className="font-bold text-sm">
            {language === "rw"
              ? "Amabwiriza ya RAB ku Musaruro w'Umurimo mu Bihinzi (Extension Standards)"
              : "Rwanda Agriculture Board (RAB) Agricultural Labor & Task Execution Standards"}
          </h4>
        </div>
        <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
          {language === "rw"
            ? "Muri gahunda yo gufasha koperative z'ubuhinzi kwesa imihigo y'umusaruro: 1. Ibirayi bisaba abakozi hagati ya 45 na 60 ku hegitari mu gihembwe cyose. 2. Gutera umuti wo kurinda urume (Late blight) bigomba gukorwa mu masaha 24 nyuma y'imvura nini mbere yuko ibimenyetso bigaragara. 3. Kubagara no kurunda igitaka cya kabiri (Second Buttage) bikorwa ku munsi wa 35-45 ngo ingiga zikube kabiri mu bunini."
            : "RAB Extension Guidelines: 1. Irish potato cultivation typically allocates 45-60 person-days per hectare. 2. Preventive fungicide application (Mancozeb/Ridomil Gold) must be carried out within 24 hours of sustained rainfall alerts. 3. Second earthing-up (Buttage) between days 35-45 doubles tuber bulking efficiency."}
        </p>
      </div>
    </div>
  );
};
