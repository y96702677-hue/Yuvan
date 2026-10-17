import React from 'react';
import { Sparkles, X, Compass, Feather, Palette, ArrowRight } from 'lucide-react';
import { FaceAnalysisData } from '../types.ts';

interface FaceAnalysisModalProps {
  analysis: FaceAnalysisData;
  isOpen: boolean;
  onClose: () => void;
  onSelectEra: (eraName: string) => void;
}

export const FaceAnalysisModal: React.FC<FaceAnalysisModalProps> = ({
  analysis,
  isOpen,
  onClose,
  onSelectEra,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-stone-200 overflow-hidden">
        {/* Subtle vintage texture */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 font-cinzel">
                AI Chrono-Facial Analysis
              </h3>
              <p className="text-xs text-stone-400">
                Powered by Gemini Image Understanding
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analysis Body */}
        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Archetype banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-800/40 to-stone-900/40 border border-amber-800/40">
            <span className="text-[11px] font-mono-tabular tracking-wider uppercase text-amber-400/90 block mb-1">
              HISTORICAL ARCHETYPE
            </span>
            <div className="text-lg font-bold text-amber-200 font-cinzel">
              {analysis.historicalArchetype}
            </div>
            <p className="mt-2 text-xs text-stone-300 leading-relaxed italic">
              "{analysis.historicalBackstory}"
            </p>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-stone-800/60 border border-stone-700/60">
              <span className="text-[10px] tracking-wide uppercase text-stone-400 block mb-0.5">
                Facial Demeanor
              </span>
              <span className="text-xs font-semibold text-stone-200">
                {analysis.expression}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-stone-800/60 border border-stone-700/60">
              <span className="text-[10px] tracking-wide uppercase text-stone-400 block mb-0.5">
                Lighting & Atmosphere
              </span>
              <span className="text-xs font-semibold text-stone-200">
                {analysis.lightingAngle}
              </span>
            </div>
          </div>

          {/* Costume & Styling Recommendation */}
          <div className="p-3.5 rounded-xl bg-stone-800/40 border border-stone-700/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Feather className="w-3.5 h-3.5" />
              <span>Recommended Attire & Adornments</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              {analysis.costumeDetails}
            </p>
          </div>

          {/* Palette recommendation */}
          <div className="p-3.5 rounded-xl bg-stone-800/40 border border-stone-700/50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Palette className="w-3.5 h-3.5" />
              <span>Color Grading Advice</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              {analysis.vintagePaletteRecommendation}
            </p>
          </div>

          {/* Recommended Eras quick jump */}
          <div>
            <span className="text-xs font-semibold text-stone-300 mb-2 block flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Optimal Time-Travel Destinations:
            </span>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedEras.map((era, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSelectEra(era);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{era}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Enter Studio & Blend
          </button>
        </div>
      </div>
    </div>
  );
};
