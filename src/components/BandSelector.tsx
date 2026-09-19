/**
 * Band Presets and Quick Frequency Selector
 * Categories: Amateur Radio, Shortwave Broadcast, Utility & Time
 */

import React, { useState } from 'react';
import { BAND_PRESETS } from '../data/radioData';
import { BandPreset, RadioMode } from '../types';
import { formatFrequency } from '../services/catProtocol';
import { Radio, Globe, Compass, RadioTower } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface BandSelectorProps {
  currentFrequencyHz: number;
  onSelectBand: (preset: BandPreset) => void;
  disabled?: boolean;
}

export const BandSelector: React.FC<BandSelectorProps> = ({
  currentFrequencyHz,
  onSelectBand,
  disabled = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Amateur' | 'Shortwave' | 'Utility' | 'VHF'>('All');

  const categories = [
    { id: 'All', label: 'All Presets', icon: Globe },
    { id: 'Amateur', label: 'Amateur HF/VHF', icon: Radio },
    { id: 'Shortwave', label: 'SW Broadcast', icon: RadioTower },
    { id: 'Utility', label: 'Utility & Time', icon: Compass },
  ] as const;

  const filteredPresets = BAND_PRESETS.filter((b) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Amateur') return b.category === 'Amateur' || b.category === 'VHF';
    return b.category === activeCategory;
  });

  return (
    <div
      id="band-selector-panel"
      className="p-4 sm:p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl"
    >
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <RadioTower className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            BAND PRESETS & QUICK JUMP
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                id={`band-tab-${cat.id.toLowerCase()}`}
                onClick={() => {
                  setActiveCategory(cat.id as typeof activeCategory);
                  audioSynth.playKeyBeep(1400, 0.02);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {filteredPresets.map((preset) => {
          const isWithinRange =
            currentFrequencyHz >= preset.range.startHz &&
            currentFrequencyHz <= preset.range.endHz;

          return (
            <button
              key={preset.name}
              type="button"
              id={`preset-${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => {
                if (!disabled) {
                  audioSynth.playKeyBeep(1800, 0.03);
                  onSelectBand(preset);
                }
              }}
              disabled={disabled}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group disabled:opacity-40 ${
                isWithinRange
                  ? 'bg-zinc-800/90 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  {preset.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-emerald-300 border border-zinc-700">
                  {preset.defaultMode}
                </span>
              </div>

              <div className="text-sm font-bold font-mono text-emerald-400 mb-1">
                {formatFrequency(preset.frequencyHz)}
              </div>

              <div className="text-[11px] text-zinc-500 line-clamp-2 leading-tight">
                {preset.description}
              </div>

              {isWithinRange && (
                <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  TUNED IN BAND
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
