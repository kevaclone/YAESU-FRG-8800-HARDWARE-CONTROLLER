/**
 * Vintage Heavy Anodized Rotary VFO Knob Component
 * Supports touch/mouse drag, wheel scroll, step increments, and tactile sound clicks.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface VfoKnobProps {
  currentFrequencyHz: number;
  stepHz: number;
  onFrequencyChange: (newHz: number) => void;
  onStepChange: (step: number) => void;
  disabled?: boolean;
}

const TUNING_STEPS = [
  { label: '100 Hz', value: 100 },
  { label: '1 kHz', value: 1000 },
  { label: '5 kHz', value: 5000 },
  { label: '9 kHz', value: 9000 },
  { label: '10 kHz', value: 10000 },
  { label: '25 kHz', value: 25000 },
  { label: '100 kHz', value: 100000 },
  { label: '1 MHz', value: 1000000 },
];

export const VfoKnob: React.FC<VfoKnobProps> = ({
  currentFrequencyHz,
  stepHz,
  onFrequencyChange,
  onStepChange,
  disabled = false,
}) => {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const centerRef = useRef({ x: 0, y: 0 });
  const lastAngleRef = useRef(0);
  const accumulatedAngleRef = useRef(0);

  // Keep latest props in refs to avoid stale closure during active window dragging
  const currentFrequencyHzRef = useRef(currentFrequencyHz);
  currentFrequencyHzRef.current = currentFrequencyHz;

  const stepHzRef = useRef(stepHz);
  stepHzRef.current = stepHz;

  const onFrequencyChangeRef = useRef(onFrequencyChange);
  onFrequencyChangeRef.current = onFrequencyChange;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const applyStep = useCallback((deltaSteps: number) => {
    if (disabledRef.current) return;
    const current = currentFrequencyHzRef.current;
    const step = stepHzRef.current;
    const newHz = Math.max(150000, Math.min(174000000, current + deltaSteps * step));
    if (newHz !== current) {
      onFrequencyChangeRef.current(newHz);
      audioSynth.playKnobClick();
    }
  }, []);

  const updateCenter = useCallback(() => {
    if (!knobRef.current) return;
    const rect = knobRef.current.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const getAngle = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    return Math.atan2(dy, dx) * (180 / Math.PI); // -180 to +180 deg
  }, []);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current || disabledRef.current) return;

    // Minimum radius guard to avoid jitter around exact dead-center
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    if (Math.hypot(dx, dy) < 12) return;

    const currentAngle = getAngle(clientX, clientY);
    let delta = currentAngle - lastAngleRef.current;

    // Handle seamless wrap-around across -180 / +180 degree boundary
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngleRef.current = currentAngle;
    setRotationAngle((prev) => prev + delta);

    accumulatedAngleRef.current += delta;

    // 6.0 degrees per tuning step (~60 encoder pulses per 360 degree full turn)
    const DEGREES_PER_STEP = 6.0;
    if (Math.abs(accumulatedAngleRef.current) >= DEGREES_PER_STEP) {
      const steps = Math.trunc(accumulatedAngleRef.current / DEGREES_PER_STEP);
      accumulatedAngleRef.current -= steps * DEGREES_PER_STEP;
      applyStep(steps);
    }
  }, [getAngle, applyStep]);

  // Window-level mouse move & up listeners to maintain tracking even outside the knob
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handlePointerMove]);

  // Mouse wheel tuning on the knob
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (disabledRef.current) return;
    const direction = e.deltaY < 0 ? 1 : -1;
    setRotationAngle((prev) => prev + direction * 12);
    applyStep(direction);
  };

  // Mouse Down to grab the knob
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabledRef.current || e.button !== 0) return;
    e.preventDefault();
    updateCenter();
    isDraggingRef.current = true;
    setIsDragging(true);
    accumulatedAngleRef.current = 0;
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
  };

  // Touch support for mobile/touchscreens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabledRef.current) return;
    updateCenter();
    isDraggingRef.current = true;
    setIsDragging(true);
    accumulatedAngleRef.current = 0;
    lastAngleRef.current = getAngle(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || disabledRef.current) return;
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleButtonStep = (steps: number) => {
    setRotationAngle((prev) => prev + steps * 12);
    applyStep(steps);
  };

  return (
    <div id="vfo-tuning-section" className="flex flex-col items-center justify-between p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 shadow-lg">
      <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2 flex items-center justify-between w-full">
        <span>MAIN VFO TUNING</span>
        <span className="text-[10px] text-zinc-500 font-mono">DRAG / SCROLL</span>
      </div>

      {/* Heavy Rotary Knob Visual & Interaction */}
      <div className="relative my-2">
        <div
          ref={knobRef}
          id="main-vfo-knob"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="Scroll or Drag to tune frequency"
          className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full select-none relative flex items-center justify-center p-3 shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.25)] ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
          style={{
            background: 'radial-gradient(circle, #2a2c30 0%, #17181c 70%, #0d0e11 100%)',
            border: '4px solid #373b42',
          }}
        >
          {/* Outer Knurled Ring texture */}
          <div
            className="w-full h-full rounded-full border-2 border-zinc-700/60 relative flex items-center justify-center"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            }}
          >
            {/* Knob Finger Dimple */}
            <div className="absolute top-3 w-6 h-6 rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_2px_rgba(255,255,255,0.15)] border border-zinc-600/70" />

            {/* Knurled notches around perimeter */}
            {Array.from({ length: 24 }).map((_, idx) => (
              <div
                key={idx}
                className="absolute w-1 h-2 bg-zinc-600/60 rounded-full"
                style={{
                  top: '4px',
                  transformOrigin: 'bottom center',
                  transform: `rotate(${idx * 15}deg) translateY(-4px)`,
                }}
              />
            ))}

            {/* Inner Anodized Core Cap */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-600/50 shadow-inner flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400">YAESU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slew and Step Increment Controls */}
      <div className="w-full mt-3 grid grid-cols-4 gap-1.5">
        <button
          type="button"
          id="btn-fast-down"
          onClick={() => handleButtonStep(-10)}
          disabled={disabled}
          title="Fast Down (10 Steps)"
          className="flex items-center justify-center py-2 px-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-300 transition-colors disabled:opacity-30 cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          id="btn-step-down"
          onClick={() => handleButtonStep(-1)}
          disabled={disabled}
          title="Step Down (-1 Step)"
          className="flex items-center justify-center py-2 px-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-200 font-semibold transition-colors disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-0.5" />
          <span className="text-xs font-mono">-</span>
        </button>
        <button
          type="button"
          id="btn-step-up"
          onClick={() => handleButtonStep(1)}
          disabled={disabled}
          title="Step Up (+1 Step)"
          className="flex items-center justify-center py-2 px-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-200 font-semibold transition-colors disabled:opacity-30 cursor-pointer"
        >
          <span className="text-xs font-mono">+</span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
        <button
          type="button"
          id="btn-fast-up"
          onClick={() => handleButtonStep(10)}
          disabled={disabled}
          title="Fast Up (10 Steps)"
          className="flex items-center justify-center py-2 px-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-300 transition-colors disabled:opacity-30 cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tuning Step Selector Buttons */}
      <div className="w-full mt-3">
        <div className="text-[10px] uppercase font-semibold text-zinc-400 mb-1.5 flex justify-between">
          <span>TUNING STEP RATE</span>
          <span className="text-emerald-400 font-mono">
            {TUNING_STEPS.find((s) => s.value === stepHz)?.label || `${stepHz} Hz`}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {TUNING_STEPS.map((step) => {
            const isSelected = stepHz === step.value;
            return (
              <button
                key={step.value}
                type="button"
                id={`step-${step.value}`}
                onClick={() => {
                  onStepChange(step.value);
                  audioSynth.playKeyBeep(1600, 0.02);
                }}
                disabled={disabled}
                className={`py-1 text-[11px] rounded font-mono font-medium transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
