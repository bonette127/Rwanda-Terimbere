import React, { useState } from "react";
import { AgronomyGuide, Language } from "../types";
import { agronomyGuides } from "../data/mockData";
import { getTranslation } from "../i18n";
import {
  GraduationCap,
  BookOpen,
  Sprout,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Layers,
} from "lucide-react";

interface TrainingViewProps {
  language: Language;
}

export const TrainingView: React.FC<TrainingViewProps> = ({ language }) => {
  const t = getTranslation(language);
  const [selectedGuide, setSelectedGuide] = useState<AgronomyGuide>(agronomyGuides[0]);

  const getGuideName = (g: AgronomyGuide) => {
    if (language === "rw") return g.nameRw;
    if (language === "fr") return g.nameFr;
    return g.nameEn;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-2">
          <GraduationCap className="w-4 h-4 text-emerald-800" />
          <span>Ishuri ry'Ubuhinzi Bw'Umwuga • TERIMBERE Media & RAB</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900">
          {t.trainingTitle}
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          {t.trainingSubtitle}
        </p>
      </div>

      {/* Two Columns: Guide Selector on Left, Lesson Reader on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guide List Selection */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
            {language === "rw" ? "Hitamo Isomo ry'Igihingwa:" : "Select Crop Guide:"}
          </span>
          {agronomyGuides.map((guide) => {
            const isSelected = selectedGuide.id === guide.id;
            return (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                    : "bg-white text-stone-900 border-stone-200 hover:border-emerald-500 shadow-2xs"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        isSelected ? "bg-emerald-700 text-emerald-100" : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      <Sprout className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-snug">
                        {getGuideName(guide)}
                      </h3>
                      <p
                        className={`text-xs mt-0.5 ${
                          isSelected ? "text-emerald-200" : "text-stone-500"
                        }`}
                      >
                        {guide.maturityDays} {language === "rw" ? "iminsi yo kwera" : "days cycle"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 ${isSelected ? "text-emerald-200" : "text-stone-300"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Lesson Reader */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                  RAB Certified Guide
                </span>
                <span className="text-xs text-stone-400">
                  Igihe cyo kwera: {selectedGuide.maturityDays} Iminsi
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-2">
                {getGuideName(selectedGuide)}
              </h2>
            </div>
          </div>

          {/* Seeds / Varieties */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
              <Sprout className="w-4 h-4 text-emerald-700" />
              <span>Imbuto z'Indobanure zemewe na RAB (Recommended Varieties)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedGuide.bestVarieties.map((v, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-200/80"
                >
                  🌱 {v}
                </span>
              ))}
            </div>
          </div>

          {/* Planting & Soil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <span className="font-bold text-stone-500 block mb-1">Intera yo gutera (Spacing):</span>
              <p className="text-stone-900 font-semibold text-sm">{selectedGuide.spacing}</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <span className="font-bold text-stone-500 block mb-1">Ifumbire ikenewe (Fertilization):</span>
              <p className="text-stone-900 font-semibold text-sm">{selectedGuide.fertilizerGuide}</p>
            </div>
          </div>

          {/* Soil Requirements */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
            <span className="font-bold text-stone-800 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Ubutaka n'ikirere bibereye iki gihingwa:</span>
            </span>
            <p className="text-stone-600 leading-relaxed">{selectedGuide.soilRequirements}</p>
          </div>

          {/* RAB Advice */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Inama z'Inzobere za RAB:</strong>
              <p className="leading-relaxed">{selectedGuide.rabAdvice}</p>
            </div>
          </div>

          {/* Common Diseases & Remedies */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-rose-900 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Indwara n'Ibyonnyi bikunze kwibasira iki gihingwa</span>
            </h3>
            <div className="space-y-2.5">
              {selectedGuide.diseasesAndPests.map((d, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-rose-950 font-bold text-sm">{d.name}</strong>
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                      Ibyago byo guhomba
                    </span>
                  </div>
                  <p className="text-stone-700">
                    <strong>Ibimenyetso:</strong> {d.symptoms}
                  </p>
                  <p className="text-emerald-900 font-medium">
                    <strong>Umuti & Uburyo bwo kuyirwanya:</strong> {d.treatment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
