import React, { useState } from "react";
import { Language, Farm, FarmPlan, Expense, FarmActivity, HarvestRecord, SaleRecord } from "../types";
import { 
  ArrowLeft, 
  Battery, 
  Wifi, 
  Signal, 
  Plus, 
  MapPin, 
  Receipt, 
  ShoppingBag, 
  TrendingUp, 
  Bot, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Send, 
  Mic, 
  Edit2, 
  ChevronRight,
  ChevronLeft
} from "lucide-react";

interface PhoneMockupViewProps {
  language: Language;
  farms: Farm[];
  plans: FarmPlan[];
  expenses: Expense[];
  activities: FarmActivity[];
  harvests: HarvestRecord[];
  sales: SaleRecord[];
  onClosePhoneView: () => void;
}

type PhoneScreen = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const PhoneMockupView: React.FC<PhoneMockupViewProps> = ({
  language,
  farms,
  plans,
  expenses,
  activities,
  harvests,
  sales,
  onClosePhoneView,
}) => {
  const [activeScreen, setActiveScreen] = useState<PhoneScreen>(0);
  const [harvestSalesSubTab, setHarvestSalesSubTab] = useState<"harvest" | "sales">("harvest");
  const [trainingSubTab, setTrainingSubTab] = useState<"courses" | "videos">("courses");

  const screens = [
    { num: 0, title: "0. APP SPLASH" },
    { num: 1, title: "1. DASHBOARD" },
    { num: 2, title: "2. MY FARMS" },
    { num: 3, title: "3. FARM PLAN" },
    { num: 4, title: "4. EXPENSES" },
    { num: 5, title: "5. ACTIVITIES" },
    { num: 6, title: "6. HARVEST & SALES" },
    { num: 7, title: "7. PROFIT" },
    { num: 8, title: "8. AI ADVISOR" },
    { num: 9, title: "9. TRAINING" },
    { num: 10, title: "10. ANALYTICS" },
  ];

  return (
    <div className="space-y-6">
      {/* Authentic Poster Header Banner from user's photo */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-700/60 relative overflow-hidden">
        <div className="max-w-4xl space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">
              TERIMBERE
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-300">
              — Smart Farming. Better Planning, Higher Profit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-2xl">
            {language === "rw"
              ? "Ubuhinzi bugezweho, igenamigambi ryiza, inyungu nyayo. Porogaramu y'abahinzi bose bo mu Rwanda."
              : "Smart digital farming platform: plan expenses, track harvests, and boost profits across Rwanda."}
          </p>
          <div className="flex flex-wrap gap-2 pt-2 text-xs font-bold text-emerald-950">
            {["Plan", "Track", "Harvest", "Analyze", "Improve"].map((step, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300/60">
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selector Bar for the screens */}
      <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClosePhoneView}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 transition-colors"
            title="Return to full desktop view"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-white">
              {language === "rw" ? "Imiterere y'Amasomo 10 yo muri Foto" : "10 Mobile Mockup Screens from Flyer Photo"}
            </h3>
            <p className="text-xs text-stone-500">
              {language === "rw" ? "Hitamo screen muri 0 kugeza kuri 10 urebe uko yubatse muri telefoni" : "Select a screen (0 - 10) to inspect its exact mobile interface"}
            </p>
          </div>
        </div>

        {/* Screen selector chips */}
        <div className="flex space-x-1.5 overflow-x-auto py-1 scrollbar-none">
          {screens.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveScreen(s.num as PhoneScreen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeScreen === s.num
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Centered Phone Shell Container */}
      <div className="flex justify-center py-4">
        <div className="w-[375px] h-[780px] bg-stone-900 rounded-[48px] p-3 shadow-2xl border-[6px] border-stone-800 relative flex flex-col overflow-hidden">
          {/* Top Notch / Dynamic Island */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-black rounded-full z-50 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-stone-800 mr-4" />
            <div className="w-2 h-2 rounded-full bg-stone-900" />
          </div>

          {/* Phone Screen Canvas */}
          <div className="w-full h-full bg-stone-50 rounded-[38px] overflow-y-auto flex flex-col relative text-stone-900">
            {/* Status Bar */}
            <div className="pt-3 px-6 pb-2 flex justify-between items-center text-[11px] font-bold text-stone-800 shrink-0">
              <span>9:41</span>
              <div className="flex items-center space-x-1.5">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4" />
              </div>
            </div>

            {/* SCREEN 0: APP SPLASH (HAND SMARTPHONE IN POSTER) */}
            {activeScreen === 0 && (
              <div className="h-full flex flex-col justify-between p-6 text-center text-white bg-gradient-to-b from-emerald-800 via-emerald-700 to-teal-900 rounded-[32px] m-1 shadow-inner">
                <div className="pt-12 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40 shadow-xl">
                    <span className="text-4xl">🌱</span>
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight font-display">
                      TERIMBERE
                    </h1>
                    <p className="text-xs font-bold text-amber-300 tracking-wide uppercase">
                      Terimbere Ubuhinzi, Terimbere Ubuzima
                    </p>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed max-w-[240px] mx-auto pt-2">
                    Smart farming platform for planning, tracking costs, and maximizing harvest profits across Rwanda.
                  </p>
                </div>

                <div className="space-y-3 pb-6">
                  <button
                    onClick={() => setActiveScreen(1)}
                    className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm shadow-lg transition-transform active:scale-95"
                  >
                    Tangira (Get Started) →
                  </button>
                  <button
                    onClick={() => setActiveScreen(1)}
                    className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs transition-colors"
                  >
                    Injira muri Konti (Login)
                  </button>
                  <div className="text-[11px] text-emerald-200/80 pt-2">
                    Kinyarwanda • English • Français
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 1: DASHBOARD */}
            {activeScreen === 1 && (
              <div className="p-4 space-y-4">
                {/* Header Welcome */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900">
                      Muraho, Jean!
                    </h2>
                    <p className="text-xs text-stone-500">Welcome back to your farm</p>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                    alt="Jean"
                    className="w-10 h-10 rounded-full border-2 border-emerald-600 object-cover"
                  />
                </div>

                {/* Total Profit Card matching photo */}
                <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-sm">
                  <span className="text-[11px] text-emerald-200 font-medium">Total Profit (This Season)</span>
                  <div className="text-2xl font-black mt-0.5">1,452,500 RWF</div>
                  <div className="mt-1 flex items-center space-x-1 text-[11px] text-emerald-300 font-semibold">
                    <span>+18.6% from last season</span>
                  </div>
                </div>

                {/* Quick Overview Grid matching photo */}
                <div>
                  <h3 className="text-xs font-bold text-stone-800 mb-2">Quick Overview</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500">Farms</span>
                      <div className="text-lg font-black">3</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500">Crops</span>
                      <div className="text-lg font-black">5</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500">Total Invested</span>
                      <div className="text-sm font-black">2,350,000 RWF</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500">Total Revenue</span>
                      <div className="text-sm font-black text-emerald-700">3,802,500 RWF</div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-xs font-bold text-stone-800 mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-stone-900 block">Fertilizer application</span>
                        <span className="text-[10px] text-stone-500">Today, 08:00 AM</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">Completed</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-stone-900 block">Harvest recorded</span>
                        <span className="text-[10px] text-stone-500">Yesterday, 04:30 PM</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">Recorded</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: MY FARMS */}
            {activeScreen === 2 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">My Farms</h2>
                  <button className="p-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Farm</span>
                  </button>
                </div>

                {/* 3 Farms from photo */}
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500"
                      alt="Ibirayi Farm"
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-stone-900">Ibirayi Farm</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          In Progress
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">0.5 Ha • Ibirayi</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Planted: 10 Mar 2025</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500"
                      alt="Ibigori Farm"
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-stone-900">Ibigori Farm</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          In Progress
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">1.0 Ha • Ibigori</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Planted: 05 Mar 2025</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=500"
                      alt="Inyanya Farm"
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-stone-900">Inyanya Farm</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          In Progress
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">0.25 Ha • Inyanya</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Planted: 12 Mar 2025</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 3: FARM PLAN */}
            {activeScreen === 3 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">Ibirayi Farm Plan</h2>
                  <button className="text-xs text-emerald-700 font-bold">Edit</button>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500">Estimated Total Cost</span>
                  <div className="text-xl font-black text-stone-900 mt-0.5">850,000 RWF</div>

                  {/* Donut breakdown representation */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <span className="text-emerald-700 font-bold">• Seeds 25%</span>
                    <span className="text-amber-700 font-bold">• Fertilizer 20%</span>
                    <span className="text-teal-700 font-bold">• Labor 30%</span>
                    <span className="text-blue-700 font-bold">• Pesticides 10%</span>
                    <span className="text-stone-600 font-bold">• Others 15%</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Crop</span>
                    <span className="font-bold">Ibirayi</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Land Size</span>
                    <span className="font-bold">0.5 Ha</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Planting Date</span>
                    <span className="font-bold">10 Mar 2025</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Harvest Date (Est.)</span>
                    <span className="font-bold">20 Jun 2025</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Expected Yield</span>
                    <span className="font-bold">8,000 kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Expected Revenue</span>
                    <span className="font-bold text-emerald-700">2,400,000 RWF</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Expected Profit</span>
                    <span className="font-black text-emerald-800">1,550,000 RWF</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 4: EXPENSES */}
            {activeScreen === 4 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">Expenses</h2>
                  <button className="p-1 px-2.5 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex justify-between items-center px-3 py-1.5 bg-stone-100 rounded-xl text-[11px] font-bold text-stone-700">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>10 Mar - 30 Apr 2025</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>

                <div className="bg-emerald-900 text-white p-3.5 rounded-2xl">
                  <span className="text-[10px] text-emerald-200 font-medium">Total Expenses</span>
                  <div className="text-2xl font-black mt-0.5">430,000 RWF</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between">
                    <div>
                      <span className="font-bold block">Seeds</span>
                      <span className="text-[10px] text-stone-400">10 Mar 2025</span>
                    </div>
                    <span className="font-black">120,000 RWF</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between">
                    <div>
                      <span className="font-bold block">Fertilizer</span>
                      <span className="text-[10px] text-stone-400">15 Mar 2025</span>
                    </div>
                    <span className="font-black">80,000 RWF</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between">
                    <div>
                      <span className="font-bold block">Labor</span>
                      <span className="text-[10px] text-stone-400">20 Mar 2025</span>
                    </div>
                    <span className="font-black">150,000 RWF</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between">
                    <div>
                      <span className="font-bold block">Pesticides</span>
                      <span className="text-[10px] text-stone-400">25 Mar 2025</span>
                    </div>
                    <span className="font-black">50,000 RWF</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between">
                    <div>
                      <span className="font-bold block">Transport</span>
                      <span className="text-[10px] text-stone-400">28 Mar 2025</span>
                    </div>
                    <span className="font-black">30,000 RWF</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 5: ACTIVITIES */}
            {activeScreen === 5 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">Activities</h2>
                  <button className="p-1 px-2.5 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Calendar strip matching photo */}
                <div className="bg-white p-2 rounded-2xl border border-stone-200 flex justify-between text-center text-xs font-bold">
                  <div className="p-1 text-stone-400"><span>M</span><br/>14</div>
                  <div className="p-1 text-stone-400"><span>T</span><br/>15</div>
                  <div className="p-1 text-stone-400"><span>W</span><br/>16</div>
                  <div className="p-1 bg-emerald-800 text-white rounded-xl shadow-xs"><span>T</span><br/>17</div>
                  <div className="p-1 text-stone-700"><span>F</span><br/>18</div>
                  <div className="p-1 text-stone-700"><span>S</span><br/>19</div>
                  <div className="p-1 text-stone-700"><span>S</span><br/>20</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900 block">Land preparation</span>
                      <span className="text-[10px] text-stone-400">10 Apr 2025</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Done
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900 block">Planting</span>
                      <span className="text-[10px] text-stone-400">12 Apr 2025</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Done
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-300 bg-amber-50/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900 block">Fertilizer application</span>
                      <span className="text-[10px] text-stone-400">18 Apr 2025</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Due
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900 block">Weeding</span>
                      <span className="text-[10px] text-stone-400">28 Apr 2025</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      Planned
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-stone-900 block">Pest control</span>
                      <span className="text-[10px] text-stone-400">05 May 2025</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      Planned
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 6: HARVEST & SALES */}
            {activeScreen === 6 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">Harvest & Sales</h2>
                  <button className="p-1 px-2.5 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Subtabs matching photo */}
                <div className="flex bg-stone-200 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setHarvestSalesSubTab("harvest")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      harvestSalesSubTab === "harvest" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                    }`}
                  >
                    Harvest
                  </button>
                  <button
                    onClick={() => setHarvestSalesSubTab("sales")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      harvestSalesSubTab === "sales" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                    }`}
                  >
                    Sales
                  </button>
                </div>

                {harvestSalesSubTab === "harvest" ? (
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Harvest Record</span>
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Date</span>
                      <span className="font-bold">20 Jun 2025</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Quantity</span>
                      <span className="font-bold">7,200 kg</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-500">Quality</span>
                      <span className="font-bold text-emerald-700">Good (Grade A)</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-teal-800 uppercase">Sales Record</span>
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Quantity Sold</span>
                      <span className="font-bold">7,000 kg</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-100">
                      <span className="text-stone-500">Price per kg</span>
                      <span className="font-bold">320 RWF</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-500">Total Revenue</span>
                      <span className="font-black text-emerald-800">2,240,000 RWF</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 7: PROFIT & PERFORMANCE */}
            {activeScreen === 7 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">Profit & Performance</h2>
                  <span className="text-xs text-stone-500 font-bold">This Season ▾</span>
                </div>

                <div className="bg-emerald-900 text-white p-4 rounded-2xl">
                  <span className="text-[10px] text-emerald-200">Total Profit</span>
                  <div className="text-2xl font-black mt-0.5">1,384,000 RWF</div>
                  <span className="text-[10px] text-emerald-300 font-bold">+15.3% from last season</span>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Total Invested</span>
                    <span className="font-bold">920,000 RWF</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Total Revenue</span>
                    <span className="font-bold text-emerald-700">2,304,000 RWF</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Profit Margin</span>
                    <span className="font-black text-emerald-800">60.0%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Cost per kg</span>
                    <span className="font-bold">128 RWF</span>
                  </div>
                </div>

                {/* Mini trend chart */}
                <div className="bg-white p-3 rounded-2xl border border-stone-200 text-center">
                  <span className="text-[10px] font-bold text-stone-400 block mb-2">Profit Trend (Mar - Jun)</span>
                  <div className="h-16 flex items-end justify-between px-4">
                    <div className="w-8 bg-emerald-300 rounded-t h-6 text-[9px] font-bold">Mar</div>
                    <div className="w-8 bg-emerald-400 rounded-t h-8 text-[9px] font-bold">Apr</div>
                    <div className="w-8 bg-emerald-500 rounded-t h-12 text-[9px] font-bold">May</div>
                    <div className="w-8 bg-emerald-700 rounded-t h-16 text-[9px] font-bold text-white">Jun</div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 8: AI FARM ADVISOR */}
            {activeScreen === 8 && (
              <div className="p-4 flex flex-col h-full justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold">AI Farm Advisor</h3>
                      <span className="text-[10px] text-emerald-600 font-bold">● Active</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 text-xs shadow-2xs leading-relaxed">
                    Muraho Jean! 🌾 Ndi hano kugufasha mu buhinzi bwawe. Wifuza ko nkugufasha iki?
                  </div>

                  {/* Suggestion Chips */}
                  <div className="space-y-1.5">
                    {[
                      "Kora plan y'ubuhinzi",
                      "Ese budget yanjye irahagije?",
                      "Ikibazo cy'igihingwa mfite",
                      "Ni iyihe miti nakoresha?",
                      "Andi makuru",
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left p-2 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:border-emerald-500"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input bar matching photo */}
                <div className="bg-white p-2 rounded-2xl border border-stone-300 flex items-center space-x-2 mt-4">
                  <input
                    type="text"
                    placeholder="Andika cyangwa uvuge..."
                    className="w-full text-xs px-2 focus:outline-hidden"
                  />
                  <button className="text-stone-400 hover:text-emerald-700">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 9: TRAINING & KNOWLEDGE */}
            {activeScreen === 9 && (
              <div className="p-4 space-y-4">
                <h2 className="text-base font-extrabold text-stone-900">Training & Knowledge</h2>

                {/* Subtabs */}
                <div className="flex bg-stone-200 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setTrainingSubTab("courses")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      trainingSubTab === "courses" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                    }`}
                  >
                    Courses
                  </button>
                  <button
                    onClick={() => setTrainingSubTab("videos")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      trainingSubTab === "videos" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                    }`}
                  >
                    Videos
                  </button>
                </div>

                {/* 4 Cards from photo */}
                <div className="space-y-2.5">
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500"
                      alt="Uko wahinga ibirayi"
                      className="w-full h-20 object-cover"
                    />
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-stone-900">
                        Uko wahinga ibirayi (Byoroshye gusobanukirwa)
                      </h4>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=500"
                      alt="Indwara z'ibihingwa"
                      className="w-full h-20 object-cover"
                    />
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-stone-900">
                        Indwara z'ibihingwa n'ukubirwanya
                      </h4>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1589923188900-85dae523342b?w=500"
                      alt="Gukoresha ifumbire neza"
                      className="w-full h-20 object-cover"
                    />
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-stone-900">
                        Gukoresha ifumbire neza
                      </h4>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <img
                      src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=500"
                      alt="Ubuhinzi bugezweho"
                      className="w-full h-20 object-cover"
                    />
                    <div className="p-2.5">
                      <h4 className="font-bold text-xs text-stone-900">
                        Ubuhinzi bugezweho (Modern Farming)
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 10: ANALYTICS SUMMARY */}
            {activeScreen === 10 && (
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-extrabold text-stone-900">Analytics Summary</h2>
                  <span className="text-xs text-stone-500 font-bold">This Season ▾</span>
                </div>

                {/* Crop Performance Bar Chart */}
                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2.5">
                  <span className="text-[11px] font-bold text-stone-800">Crop Performance</span>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between font-semibold">
                        <span>Ibirayi</span>
                        <span className="text-emerald-700 font-bold">1.8M</span>
                      </div>
                      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: "85%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold">
                        <span>Ibigori</span>
                        <span className="text-amber-700 font-bold">1.2M</span>
                      </div>
                      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: "60%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold">
                        <span>Inyanya</span>
                        <span className="text-teal-700 font-bold">1.5M</span>
                      </div>
                      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-teal-600 rounded-full" style={{ width: "72%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expense Breakdown Donut List */}
                <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2">
                  <span className="text-[11px] font-bold text-stone-800">Expense Breakdown</span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-medium">
                      <span>Seeds</span>
                      <span className="font-bold">26%</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Fertilizer</span>
                      <span className="font-bold">21%</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Labor</span>
                      <span className="font-bold">33%</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Pesticides</span>
                      <span className="font-bold">11%</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Others</span>
                      <span className="font-bold">9%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Feature Badges matching the poster footer */}
      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800">
            <span className="text-xl block mb-1">⚡</span>
            <strong className="text-xs text-stone-900 dark:text-white block">Works Offline</strong>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Ikora nta internet</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800">
            <span className="text-xl block mb-1">🔒</span>
            <strong className="text-xs text-stone-900 dark:text-white block">Secure & Private</strong>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Amakuru arinzwe</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800">
            <span className="text-xl block mb-1">✨</span>
            <strong className="text-xs text-stone-900 dark:text-white block">Simple & Easy</strong>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Byoroshye gukoresha</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800">
            <span className="text-xl block mb-1">🧠</span>
            <strong className="text-xs text-stone-900 dark:text-white block">AI Powered</strong>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Inama zubakiye kuri AI</span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800">
            <span className="text-xl block mb-1">🇷🇼</span>
            <strong className="text-xs text-stone-900 dark:text-white block">For Every Farmer</strong>
            <span className="text-[10px] text-stone-500 dark:text-stone-400">Kubahinzi bose</span>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 dark:text-stone-400 gap-2">
          <span>TERIMBERE Smart Farming • Kigali, Rwanda</span>
          <span className="font-bold text-stone-700 dark:text-stone-200">
            Call / WhatsApp: +250 788 000 000 | info@terimbere.rw
          </span>
        </div>
      </div>
    </div>
  );
};
