/**
 * Authentic 21-Button Style Numeric Keypad for Yaesu FRG-8800
 * Direct frequency entry via digits, MHz, and kHz buttons, plus clear and recall keys.
 */

import React, { useState } from 'react';
import { Delete, CornerDownLeft, Radio, Bookmark } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface NumericKeypadProps {
  onDirectFrequencySet: (frequencyHz: number) => void;
  onRecallMemory?: (channelNum: number) => void;
  onStoreMemory?: () => void;
  disabled?: boolean;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onDirectFrequencySet,
  onRecallMemory,
  onStoreMemory,
  disabled = false,
}) => {
  const [buffer, setBuffer] = useState<string>('');
  const [isMemoryMode, setIsMemoryMode] = useState(false);

  const handleDigit = (digit: string) => {
    if (disabled) return;
    audioSynth.playKeyBeep(1400, 0.03);
    if (buffer.length < 8) {
      setBuffer((prev) => prev + digit);
    }
  };

  const handleDot = () => {
    if (disabled) return;
    audioSynth.playKeyBeep(1400, 0.03);
    if (!buffer.includes('.')) {
      setBuffer((prev) => (prev === '' ? '0.' : prev + '.'));
    }
  };

  const handleClear = () => {
    if (disabled) return;
    audioSynth.playKeyBeep(900, 0.04);
    setBuffer('');
    setIsMemoryMode(false);
  };

  const handleEnterMhz = () => {
    if (disabled || !buffer) return;
    const num = parseFloat(buffer);
    if (!isNaN(num) && num >= 0.15 && num <= 174) {
      audioSynth.playKeyBeep(2000, 0.05);
      const hz = Math.round(num * 1000000);
      onDirectFrequencySet(hz);
      setBuffer('');
    } else {
      audioSynth.playKeyBeep(500, 0.1);
    }
  };

  const handleEnterKhz = () => {
    if (disabled || !buffer) return;
    const num = parseFloat(buffer);
    if (!isNaN(num) && num >= 150 && num <= 174000) {
      audioSynth.playKeyBeep(2000, 0.05);
      const hz = Math.round(num * 1000);
      onDirectFrequencySet(hz);
      setBuffer('');
    } else {
      audioSynth.playKeyBeep(500, 0.1);
    }
  };

  const handleEnterGeneral = () => {
    if (disabled || !buffer) return;

    if (isMemoryMode && onRecallMemory) {
      const ch = parseInt(buffer, 10);
      if (!isNaN(ch) && ch >= 1 && ch <= 99) {
        audioSynth.playKeyBeep(1800, 0.04);
        onRecallMemory(ch);
        setBuffer('');
        setIsMemoryMode(false);
        return;
      }
    }

    const num = parseFloat(buffer);
    if (!isNaN(num)) {
      if (num < 300) {
        // Assume MHz if less than 300 (e.g. 14.254 or 145)
        handleEnterMhz();
      } else {
        // Assume kHz if 300 or greater (e.g. 7150 or 14254)
        handleEnterKhz();
      }
    }
  };

  return (
    <div
      id="frg8800-numeric-keypad"
      className="p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 shadow-lg flex flex-col justify-between"
    >
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
        <span>KEYPAD ENTRY</span>
        <span className="text-[10px] font-mono text-emerald-400">
          {isMemoryMode ? 'MR CHANNEL SELECT' : 'DIRECT FREQ'}
        </span>
      </div>

      {/* Entry Input Readout Box */}
      <div className="bg-black/80 border border-zinc-700 rounded-lg p-2.5 mb-3 flex items-center justify-between font-mono">
        <span className="text-xs text-zinc-500 font-sans">
          {isMemoryMode ? 'CH#' : 'INPUT:'}
        </span>
        <span
          id="keypad-buffer-display"
          className="text-lg font-bold text-emerald-300 tracking-wider h-6 flex items-center"
        >
          {buffer || <span className="opacity-30 text-xs">READY...</span>}
        </span>
      </div>

      {/* Button Matrix */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Row 1 */}
        <button
          type="button"
          id="keypad-btn-1"
          onClick={() => handleDigit('1')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          1
        </button>
        <button
          type="button"
          id="keypad-btn-2"
          onClick={() => handleDigit('2')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          2
        </button>
        <button
          type="button"
          id="keypad-btn-3"
          onClick={() => handleDigit('3')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          3
        </button>
        <button
          type="button"
          id="keypad-btn-mhz"
          onClick={handleEnterMhz}
          disabled={disabled || !buffer}
          title="Enter frequency as MHz (e.g. 14.254)"
          className="py-2.5 rounded bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 border border-emerald-600 text-emerald-100 font-bold text-xs tracking-wider transition-colors cursor-pointer disabled:opacity-30"
        >
          MHz
        </button>

        {/* Row 2 */}
        <button
          type="button"
          id="keypad-btn-4"
          onClick={() => handleDigit('4')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          4
        </button>
        <button
          type="button"
          id="keypad-btn-5"
          onClick={() => handleDigit('5')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          5
        </button>
        <button
          type="button"
          id="keypad-btn-6"
          onClick={() => handleDigit('6')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          6
        </button>
        <button
          type="button"
          id="keypad-btn-khz"
          onClick={handleEnterKhz}
          disabled={disabled || !buffer}
          title="Enter frequency as kHz (e.g. 7150)"
          className="py-2.5 rounded bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 border border-emerald-600 text-emerald-100 font-bold text-xs tracking-wider transition-colors cursor-pointer disabled:opacity-30"
        >
          kHz
        </button>

        {/* Row 3 */}
        <button
          type="button"
          id="keypad-btn-7"
          onClick={() => handleDigit('7')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          7
        </button>
        <button
          type="button"
          id="keypad-btn-8"
          onClick={() => handleDigit('8')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          8
        </button>
        <button
          type="button"
          id="keypad-btn-9"
          onClick={() => handleDigit('9')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          9
        </button>
        <button
          type="button"
          id="keypad-btn-ce"
          onClick={handleClear}
          disabled={disabled}
          title="Clear Entry"
          className="py-2.5 rounded bg-rose-900/60 hover:bg-rose-800 active:bg-rose-950 border border-rose-700/80 text-rose-200 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
        >
          <Delete className="w-4 h-4 mr-1" />
          CE
        </button>

        {/* Row 4 */}
        <button
          type="button"
          id="keypad-btn-dot"
          onClick={handleDot}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          .
        </button>
        <button
          type="button"
          id="keypad-btn-0"
          onClick={() => handleDigit('0')}
          disabled={disabled}
          className="py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold font-mono text-sm transition-colors cursor-pointer disabled:opacity-30"
        >
          0
        </button>
        <button
          type="button"
          id="keypad-btn-mr"
          onClick={() => {
            setIsMemoryMode((prev) => !prev);
            audioSynth.playKeyBeep(1500, 0.03);
          }}
          disabled={disabled}
          title="Toggle Memory Recall Mode"
          className={`py-2.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center ${
            isMemoryMode
              ? 'bg-amber-600 text-white border-amber-400'
              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 mr-1" />
          MR
        </button>
        <button
          type="button"
          id="keypad-btn-ent"
          onClick={handleEnterGeneral}
          disabled={disabled || !buffer}
          title="Submit frequency or recall channel"
          className="py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-400 text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
        >
          <CornerDownLeft className="w-4 h-4 mr-1" />
          ENT
        </button>
      </div>

      {/* Helper text */}
      <div className="text-[10px] text-zinc-500 mt-2 text-center">
        Type <strong className="text-zinc-400">14.254</strong> & click{' '}
        <strong className="text-emerald-400">MHz</strong>, or{' '}
        <strong className="text-zinc-400">7150</strong> & click{' '}
        <strong className="text-emerald-400">kHz</strong>
      </div>
    </div>
  );
};
