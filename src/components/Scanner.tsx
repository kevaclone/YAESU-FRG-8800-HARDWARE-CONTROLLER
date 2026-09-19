/**
 * Automated Frequency and Memory Scanner for Yaesu FRG-8800
 * Supports Range Scan (VFO limit sweep) and Memory Bank Scan with adjustable dwell.
 */

import React, { useState, useEffect, useRef } from 'react';
import { MemoryChannel, RadioMode } from '../types';
import { formatFrequency } from '../services/catProtocol';
import { Play, Pause, Square, SkipForward, SkipBack, Search, FastForward } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface ScannerProps {
  currentFrequencyHz: number;
  currentMode: RadioMode;
  memories: MemoryChannel[];
  onTuneFrequency: (hz: number) => void;
  onTuneMemory: (channel: MemoryChannel) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
  disabled?: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({
  currentFrequencyHz,
  currentMode,
  memories,
  onTuneFrequency,
  onTuneMemory,
  isScanning,
  setIsScanning,
  disabled = false,
}) => {
  const [scanMode, setScanMode] = useState<'memory' | 'range'>('memory');
  const [dwellMs, setDwellMs] = useState(600); // 600ms default dwell
  const [startFreqMhz, setStartFreqMhz] = useState('14.000');
  const [stopFreqMhz, setStopFreqMhz] = useState('14.350');
  const [scanStepKhz, setScanStepKhz] = useState(5); // 5 kHz step

  const memoryIndexRef = useRef(0);
  const currentRangeHzRef = useRef(currentFrequencyHz);

  // Automated scan loop
  useEffect(() => {
    if (!isScanning) return;

    const timer = setInterval(() => {
      if (scanMode === 'memory') {
        if (memories.length === 0) {
          setIsScanning(false);
          return;
        }
        memoryIndexRef.current = (memoryIndexRef.current + 1) % memories.length;
        const targetChannel = memories[memoryIndexRef.current];
        if (targetChannel) {
          onTuneMemory(targetChannel);
          audioSynth.playKnobClick();
        }
      } else {
        // Range Scan
        const startHz = parseFloat(startFreqMhz) * 1000000;
        const stopHz = parseFloat(stopFreqMhz) * 1000000;
        const stepHz = scanStepKhz * 1000;

        let nextHz = currentRangeHzRef.current + stepHz;
        if (nextHz > stopHz || nextHz < startHz) {
          nextHz = startHz;
        }
        currentRangeHzRef.current = nextHz;
        onTuneFrequency(nextHz);
        audioSynth.playKnobClick();
      }
    }, dwellMs);

    return () => clearInterval(timer);
  }, [isScanning, scanMode, dwellMs, memories, startFreqMhz, stopFreqMhz, scanStepKhz, onTuneFrequency, onTuneMemory, setIsScanning]);

  const handleStartStop = () => {
    if (disabled) return;
    audioSynth.playKeyBeep(1800, 0.03);

    if (isScanning) {
      setIsScanning(false);
    } else {
      if (scanMode === 'range') {
        const startHz = parseFloat(startFreqMhz) * 1000000;
        currentRangeHzRef.current = startHz;
        onTuneFrequency(startHz);
      }
      setIsScanning(true);
    }
  };

  const handleSkipNext = () => {
    if (disabled) return;
    if (scanMode === 'memory' && memories.length > 0) {
      memoryIndexRef.current = (memoryIndexRef.current + 1) % memories.length;
      onTuneMemory(memories[memoryIndexRef.current]);
    } else {
      const stepHz = scanStepKhz * 1000;
      onTuneFrequency(currentFrequencyHz + stepHz);
    }
    audioSynth.playKnobClick();
  };

  const handleSkipPrev = () => {
    if (disabled) return;
    if (scanMode === 'memory' && memories.length > 0) {
      memoryIndexRef.current = (memoryIndexRef.current - 1 + memories.length) % memories.length;
      onTuneMemory(memories[memoryIndexRef.current]);
    } else {
      const stepHz = scanStepKhz * 1000;
      onTuneFrequency(Math.max(150000, currentFrequencyHz - stepHz));
    }
    audioSynth.playKnobClick();
  };

  return (
    <div
      id="scanner-control-panel"
      className="p-4 sm:p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <FastForward className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            AUTOMATED SCANNER CONTROL
          </h2>
        </div>

        {/* Scan Mode Toggle: Memory vs VFO Range */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            type="button"
            id="scan-mode-memory"
            onClick={() => {
              setScanMode('memory');
              audioSynth.playKeyBeep(1400, 0.02);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              scanMode === 'memory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Memory Channel Scan
          </button>
          <button
            type="button"
            id="scan-mode-range"
            onClick={() => {
              setScanMode('range');
              audioSynth.playKeyBeep(1400, 0.02);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              scanMode === 'range'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            VFO Frequency Range Sweep
          </button>
        </div>
      </div>

      {/* Main Scanner Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: Scan Controls */}
        <div className="md:col-span-5 flex items-center gap-2">
          <button
            type="button"
            id="btn-scan-start-stop"
            onClick={handleStartStop}
            disabled={disabled}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              isScanning
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-40`}
          >
            {isScanning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>PAUSE SCAN</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START SCAN</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-scan-skip-prev"
            onClick={handleSkipPrev}
            disabled={disabled}
            title="Step back"
            className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="btn-scan-skip-next"
            onClick={handleSkipNext}
            disabled={disabled}
            title="Step forward"
            className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Dwell Rate & Configuration */}
        <div className="md:col-span-7 flex flex-wrap items-center gap-4 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
          {/* Dwell Slider */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 mb-1">
              <span>DWELL SPEED</span>
              <span className="text-emerald-400 font-mono">{dwellMs} ms / step</span>
            </div>
            <input
              type="range"
              min="200"
              max="2500"
              step="50"
              value={dwellMs}
              onChange={(e) => setDwellMs(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Range Configuration if range mode */}
          {scanMode === 'range' && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Start MHz</span>
                <input
                  type="text"
                  value={startFreqMhz}
                  onChange={(e) => setStartFreqMhz(e.target.value)}
                  className="w-20 p-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-center"
                />
              </div>
              <span className="text-zinc-600 mt-3">-</span>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Stop MHz</span>
                <input
                  type="text"
                  value={stopFreqMhz}
                  onChange={(e) => setStopFreqMhz(e.target.value)}
                  className="w-20 p-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-center"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Step kHz</span>
                <select
                  value={scanStepKhz}
                  onChange={(e) => setScanStepKhz(Number(e.target.value))}
                  className="p-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-200"
                >
                  <option value={1}>1 kHz</option>
                  <option value={5}>5 kHz</option>
                  <option value={9}>9 kHz</option>
                  <option value={10}>10 kHz</option>
                  <option value={12.5}>12.5 kHz</option>
                  <option value={25}>25 kHz</option>
                </select>
              </div>
            </div>
          )}

          {scanMode === 'memory' && (
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Scanning through {memories.length} stored channels</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
