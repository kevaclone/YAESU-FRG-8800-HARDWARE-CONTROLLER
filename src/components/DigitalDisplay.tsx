/**
 * Authentic Vintage LCD Display for Yaesu FRG-8800
 * Features 7-segment digital frequency readout (100Hz resolution),
 * dual 24-hour clocks (Local + UTC/GMT), LCD S-meter / SINPO bar graph,
 * and illuminated annunciator indicators.
 */

import React, { useEffect, useState } from 'react';
import { RadioMode, RadioState } from '../types';
import { formatFrequencyDigits } from '../services/catProtocol';
import { Download } from 'lucide-react';

interface DigitalDisplayProps {
  radioState: RadioState;
  displayColor?: 'emerald' | 'amber' | 'cyan';
  channelLabel?: string | null;
  onOpenDownloadModal?: () => void;
  onOpenOperaInstall?: () => void;
}

export const DigitalDisplay: React.FC<DigitalDisplayProps> = ({
  radioState,
  displayColor = 'emerald',
  channelLabel,
  onOpenDownloadModal,
  onOpenOperaInstall,
}) => {
  const [utcTime, setUtcTime] = useState<string>('00:00:00');
  const [localTime, setLocalTime] = useState<string>('00:00:00');

  // Update dual 24-hour clocks every second
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(
        `${now.getUTCHours().toString().padStart(2, '0')}:${now
          .getUTCMinutes()
          .toString()
          .padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')}`
      );
      setLocalTime(
        `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const { mhz, khz, fraction } = formatFrequencyDigits(radioState.frequencyHz);

  // Theme color styles
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-950/90',
      border: 'border-emerald-800/60',
      textPrimary: 'text-emerald-400',
      textDim: 'text-emerald-900/60',
      textBright: 'text-emerald-300',
      glow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]',
      meterActive: 'bg-emerald-400',
      meterRed: 'bg-amber-400',
    },
    amber: {
      bg: 'bg-amber-950/90',
      border: 'border-amber-800/60',
      textPrimary: 'text-amber-400',
      textDim: 'text-amber-900/60',
      textBright: 'text-amber-300',
      glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]',
      meterActive: 'bg-amber-400',
      meterRed: 'bg-rose-500',
    },
    cyan: {
      bg: 'bg-cyan-950/90',
      border: 'border-cyan-800/60',
      textPrimary: 'text-cyan-400',
      textDim: 'text-cyan-900/60',
      textBright: 'text-cyan-300',
      glow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]',
      meterActive: 'bg-cyan-400',
      meterRed: 'bg-rose-400',
    },
  }[displayColor];

  const modesList: RadioMode[] = ['AM-W', 'AM-N', 'LSB', 'USB', 'CW-W', 'CW-N', 'FM'];

  return (
    <div
      id="frg8800-digital-display"
      className={`relative rounded-xl p-4 sm:p-5 border-2 ${colorStyles.bg} ${colorStyles.border} shadow-[inset_0_2px_15px_rgba(0,0,0,0.85)] font-mono select-none overflow-hidden`}
    >
      {/* Subtle CRT / LCD pixel grid scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_3px]" />

      {/* Top Banner: Dual Clocks & Status Annunciators */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/40 pb-2 mb-3 text-xs">
        {/* Dual 24-Hour Clocks */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] tracking-wider uppercase ${colorStyles.textDim}`}>
              CLK 1 (LOCAL)
            </span>
            <span className={`font-semibold tracking-widest ${colorStyles.textBright}`}>
              {radioState.powerOn ? localTime : '--:--:--'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] tracking-wider uppercase ${colorStyles.textDim}`}>
              CLK 2 (UTC/GMT)
            </span>
            <span className={`font-semibold tracking-widest ${colorStyles.textBright}`}>
              {radioState.powerOn ? utcTime : '--:--:--'}
            </span>
          </div>
        </div>

        {/* Annunciators: CAT status, Memory slot, Scanning */}
        <div className="flex items-center gap-2">
          {radioState.catActive && (
            <span
              id="cat-active-annunciator"
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse"
            >
              CAT ACTIVE
            </span>
          )}

          {radioState.isScanning && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse">
              SCANNING
            </span>
          )}

          {radioState.currentMemoryIndex !== null ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
              MEM CH-{radioState.currentMemoryIndex.toString().padStart(2, '0')}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-emerald-900/60">
              VFO A
            </span>
          )}

          {/* Download App / Install Trigger */}
          {onOpenDownloadModal && (
            <button
              type="button"
              id="display-download-app-btn"
              onClick={onOpenDownloadModal}
              title="Install Desktop App (Edge/Chrome) or Download Package (ZIP / APK)"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/60 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 ml-1"
            >
              <Download className="w-3 h-3 text-emerald-300 stroke-[2.5]" />
              <span>INSTALL / DOWNLOAD APP</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Readout Area: Frequency + S-Meter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Frequency Digits */}
        <div className="md:col-span-8 flex flex-col justify-center">
          <div className="flex items-baseline gap-1">
            {/* 7-Segment frequency display */}
            <div
              className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight ${colorStyles.textPrimary} ${colorStyles.glow} font-['Courier_New',monospace]`}
            >
              {radioState.powerOn ? (
                <>
                  <span>{mhz}</span>
                  <span className="opacity-80">.{khz}</span>
                  <span className="text-2xl sm:text-3xl lg:text-4xl opacity-90">.{fraction}</span>
                  <span className="text-xl sm:text-2xl lg:text-3xl text-emerald-600/80 ml-1">0</span>
                </>
              ) : (
                <span className="opacity-20">--.---.- -</span>
              )}
            </div>
            <span className={`text-sm sm:text-base font-semibold tracking-wider ${colorStyles.textBright}`}>
              MHz
            </span>
          </div>

          {/* Sub-label for memory channel name if loaded */}
          {channelLabel && radioState.powerOn && (
            <div className={`text-xs mt-1 truncate ${colorStyles.textBright} opacity-85 font-sans flex items-center gap-1.5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{channelLabel}</span>
            </div>
          )}
        </div>

        {/* Right: S-Meter & SINPO Bar Graph */}
        <div className="md:col-span-4 flex flex-col justify-between h-full space-y-2 border-t md:border-t-0 md:border-l border-emerald-900/40 pt-2 md:pt-0 md:pl-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-emerald-600">
            <span>SIGNAL (S-METER)</span>
            <span className={colorStyles.textBright}>
              {radioState.powerOn
                ? radioState.sMeter <= 9
                  ? `S-${radioState.sMeter}`
                  : `S9+${(radioState.sMeter - 9) * 10}dB`
                : 'OFF'}
            </span>
          </div>

          {/* S-Meter Bar Segment Grid */}
          <div className="flex items-end gap-1 h-6 bg-black/40 p-1 rounded border border-emerald-950">
            {Array.from({ length: 15 }).map((_, idx) => {
              const isActive = radioState.powerOn && idx < radioState.sMeter;
              const isOverNine = idx >= 9;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-xs transition-all duration-150 ${
                    isActive
                      ? isOverNine
                        ? colorStyles.meterRed
                        : colorStyles.meterActive
                      : 'bg-emerald-950/40'
                  }`}
                  style={{
                    height: `${Math.min(100, 35 + idx * 4.5)}%`,
                  }}
                />
              );
            })}
          </div>

          {/* S-Meter Scale Labels */}
          <div className="flex justify-between text-[9px] text-emerald-700/80 font-mono tracking-tighter">
            <span>1</span>
            <span>3</span>
            <span>5</span>
            <span>7</span>
            <span>9</span>
            <span className="text-amber-500/80">+20</span>
            <span className="text-amber-500/80">+40</span>
            <span className="text-amber-500/80">+60</span>
          </div>
        </div>
      </div>

      {/* Bottom Mode Indicators Row (Matching FRG-8800 LCD indicators) */}
      <div className="mt-4 pt-2.5 border-t border-emerald-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {modesList.map((m) => {
            const isSelected = radioState.powerOn && radioState.mode === m;
            return (
              <span
                key={m}
                className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider transition-colors ${
                  isSelected
                    ? `${colorStyles.textBright} bg-emerald-500/20 border border-emerald-500/60 shadow-[0_0_6px_rgba(52,211,153,0.3)]`
                    : `${colorStyles.textDim} opacity-40`
                }`}
              >
                {m}
              </span>
            );
          })}
        </div>

        {/* Filter / Receiver Indicators */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-emerald-600">
          <span>ATT: <strong className={colorStyles.textBright}>{radioState.attenuator}</strong></span>
          <span>AGC: <strong className={colorStyles.textBright}>{radioState.agc}</strong></span>
          <span>NB: <strong className={colorStyles.textBright}>{radioState.noiseBlanker}</strong></span>
          <span>TONE: <strong className={colorStyles.textBright}>{radioState.tone}</strong></span>
        </div>
      </div>
    </div>
  );
};
