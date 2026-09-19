/**
 * Main Yaesu FRG-8800 Receiver Front Panel Component
 * Emulates the classic heavy brushed dark aluminum chassis,
 * tactile push-buttons with illuminated LEDs, rotary dials, and power/CAT switches.
 */

import React from 'react';
import { RadioMode, RadioState, ConnectionStatus } from '../types';
import { DigitalDisplay } from './DigitalDisplay';
import { VfoKnob } from './VfoKnob';
import { NumericKeypad } from './NumericKeypad';
import { Power, Radio, Sliders, Volume2, VolumeX, Activity, Download, Cable, AlertCircle, CheckCircle2 } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface RadioPanelProps {
  radioState: RadioState;
  channelLabel?: string | null;
  connectionStatus: ConnectionStatus;
  statusMessage?: string;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  onFrequencyChange: (newHz: number) => void;
  onStepChange: (step: number) => void;
  onModeChange: (mode: RadioMode) => void;
  onPowerToggle: () => void;
  onCatToggle: () => void;
  onAttenuatorChange: (att: '0dB' | '10dB' | '20dB') => void;
  onAgcChange: (agc: 'SLOW' | 'FAST' | 'OFF') => void;
  onNoiseBlankerChange: (nb: 'OFF' | 'NARROW' | 'WIDE') => void;
  onToneChange: (tone: 'LOW' | 'HIGH') => void;
  onRecallMemory?: (ch: number) => void;
  onMuteToggle: () => void;
  isMuted: boolean;
  onOpenDownloadModal?: () => void;
  onOpenOperaInstall?: () => void;
}

const MODES: Array<{ mode: RadioMode; label: string; desc: string }> = [
  { mode: 'AM-W', label: 'AM-W', desc: 'AM Wide (6 kHz) for SW Broadcast' },
  { mode: 'AM-N', label: 'AM-N', desc: 'AM Narrow (2.7 kHz) for Splatter Filter' },
  { mode: 'LSB', label: 'LSB', desc: 'Lower Sideband (160m/80m/40m)' },
  { mode: 'USB', label: 'USB', desc: 'Upper Sideband (20m-10m & Utilities)' },
  { mode: 'CW-W', label: 'CW-W', desc: 'Continuous Wave Morse Wide' },
  { mode: 'CW-N', label: 'CW-N', desc: 'Continuous Wave Morse Narrow' },
  { mode: 'FM', label: 'FM', desc: 'Frequency Modulation (10m/2m)' },
];

export const RadioPanel: React.FC<RadioPanelProps> = ({
  radioState,
  channelLabel,
  connectionStatus,
  statusMessage,
  onConnectSerial,
  onDisconnectSerial,
  onFrequencyChange,
  onStepChange,
  onModeChange,
  onPowerToggle,
  onCatToggle,
  onAttenuatorChange,
  onAgcChange,
  onNoiseBlankerChange,
  onToneChange,
  onRecallMemory,
  onMuteToggle,
  isMuted,
  onOpenDownloadModal,
  onOpenOperaInstall,
}) => {
  return (
    <div
      id="frg8800-receiver-faceplate"
      className="w-full rounded-2xl bg-gradient-to-b from-zinc-900 via-neutral-900 to-black border-4 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] p-4 sm:p-6 text-zinc-200"
    >
      {/* Top Header Plate: Yaesu Badging & Model Identification */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-zinc-950 border border-zinc-700 rounded shadow-inner flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="font-extrabold tracking-widest text-zinc-100 text-sm sm:text-base font-mono">
              YAESU
            </span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wider text-zinc-200 uppercase font-sans">
              FRG-8800 <span className="text-xs text-zinc-400 font-normal">COMMUNICATIONS RECEIVER</span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono">
              ALL-MODE GENERAL COVERAGE 0.15–30 MHz / CAT SYSTEM
            </p>
          </div>
        </div>

        {/* Top Control Toggles: Hardware COM Port, Power, CAT, Audio Mute, and Download App */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* PRIMARY ACTION: Hardware USB COM Port Button */}
          {connectionStatus === 'connected' ? (
            <div className="flex items-center gap-2 bg-emerald-950/90 border border-emerald-500 rounded-lg px-3 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-mono font-bold text-emerald-300 leading-tight">COM PORT LINKED</span>
                <span className="text-[9px] font-mono text-emerald-400/80">4800 Baud • 8N2</span>
              </div>
              <button
                type="button"
                id="faceplate-disconnect-btn"
                onClick={onDisconnectSerial}
                title="Disconnect serial port"
                className="ml-1 text-[10px] font-bold text-zinc-400 hover:text-rose-300 hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="faceplate-connect-serial-btn"
              onClick={onConnectSerial}
              title="Select USB COM Port to connect your physical Yaesu FRG-8800"
              className="px-3.5 py-2 rounded-lg border text-xs font-black flex items-center gap-2 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)] hover:scale-[1.03] active:scale-95"
            >
              <Cable className="w-4 h-4 stroke-[2.5]" />
              <span>CONNECT COM PORT</span>
            </button>
          )}

          {/* Sound / Mute Toggle */}
          <button
            type="button"
            id="toggle-audio-mute"
            onClick={onMuteToggle}
            title={isMuted ? 'Unmute tactile relay & click sounds' : 'Mute tactile sounds'}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isMuted
                ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                : 'bg-zinc-800 text-emerald-400 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMuted ? 'MUTED' : 'AUDIO'}</span>
          </button>

          {/* CAT External Control Toggle Switch */}
          <button
            type="button"
            id="toggle-cat-control"
            onClick={() => {
              audioSynth.playRelayClick();
              if (!radioState.catActive && connectionStatus !== 'connected') {
                onConnectSerial();
              } else {
                onCatToggle();
              }
            }}
            disabled={!radioState.powerOn}
            title="Toggle CAT External Computer Control (connects COM port if offline)"
            className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
              radioState.catActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                radioState.catActive
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-zinc-600'
              }`}
            />
            <span>CAT {radioState.catActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Master Power Switch */}
          <button
            type="button"
            id="toggle-power"
            onClick={() => {
              audioSynth.playRelayClick();
              onPowerToggle();
            }}
            title="Toggle Receiver Main Power"
            className={`px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              radioState.powerOn
                ? 'bg-rose-950 text-rose-300 border-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Power className={`w-4 h-4 ${radioState.powerOn ? 'text-rose-400' : 'text-zinc-500'}`} />
            <span>POWER {radioState.powerOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Hardware Link Status Strip */}
      <div className={`mb-4 px-3 py-2 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 border transition-all ${
        connectionStatus === 'connected'
          ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200'
          : connectionStatus === 'connecting'
          ? 'bg-amber-950/50 border-amber-600/70 text-amber-200 animate-pulse'
          : 'bg-zinc-950/80 border-zinc-800 text-zinc-300'
      }`}>
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Cable className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <div className="text-xs">
            {connectionStatus === 'connected' ? (
              <span>
                <strong className="text-emerald-300">REAL HARDWARE CAT ACTIVE:</strong> Transmitting binary packets directly to physical receiver (4800 Baud, 8N2).
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span>
                <strong className="text-amber-300">SELECT COM PORT:</strong> Waiting for serial port authorization in browser...
              </span>
            ) : (
              <span>
                <strong className="text-zinc-200">PHYSICAL HARDWARE READY:</strong> Plug in your USB-to-TTL serial cable and click <strong>&quot;CONNECT COM PORT&quot;</strong> to control your Yaesu FRG-8800.
              </span>
            )}
          </div>
        </div>

        {connectionStatus !== 'connected' && (
          <button
            type="button"
            onClick={onConnectSerial}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-[11px] cursor-pointer transition-colors shadow-sm ml-auto"
          >
            Connect Port
          </button>
        )}
      </div>

      {/* Main Centerpiece: Vintage Digital LCD Display */}
      <div className="mb-5">
        <DigitalDisplay
          radioState={radioState}
          channelLabel={channelLabel}
          onOpenDownloadModal={onOpenDownloadModal}
          onOpenOperaInstall={onOpenOperaInstall}
        />
      </div>

      {/* Mode Push-Button Bank (Classic 80s tactile horizontal keys) */}
      <div className="mb-5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 shadow-inner">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
          <span>OPERATING MODE SELECT</span>
          <span className="text-zinc-500 font-mono">
            ACTIVE: <span className="text-emerald-400 font-bold">{radioState.mode}</span>
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {MODES.map(({ mode, label, desc }) => {
            const isSelected = radioState.powerOn && radioState.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                id={`mode-btn-${mode.toLowerCase()}`}
                onClick={() => {
                  if (radioState.powerOn) {
                    audioSynth.playKeyBeep(1600, 0.03);
                    onModeChange(mode);
                  }
                }}
                disabled={!radioState.powerOn}
                title={desc}
                className={`py-2 px-1 rounded-lg border text-xs font-bold tracking-wider transition-all flex flex-col items-center justify-center cursor-pointer disabled:opacity-40 ${
                  isSelected
                    ? 'bg-zinc-800 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                    : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]'
                        : 'bg-zinc-700'
                    }`}
                  />
                  <span>{label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Surface Grid: VFO Knob + Numeric Keypad + Receiver Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: VFO Rotary Knob & Tuning Slew */}
        <div className="lg:col-span-5">
          <VfoKnob
            currentFrequencyHz={radioState.frequencyHz}
            stepHz={radioState.tuningStepHz}
            onFrequencyChange={onFrequencyChange}
            onStepChange={onStepChange}
            disabled={!radioState.powerOn}
          />
        </div>

        {/* Center Column: Numeric Keypad for Direct Entry */}
        <div className="lg:col-span-4">
          <NumericKeypad
            onDirectFrequencySet={onFrequencyChange}
            onRecallMemory={onRecallMemory}
            disabled={!radioState.powerOn}
          />
        </div>

        {/* Right Column: Front Panel Filter & Receiver Rotary Controls */}
        <div className="lg:col-span-3 flex flex-col justify-between p-4 bg-zinc-900/90 rounded-xl border border-zinc-800 shadow-lg space-y-3">
          <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase border-b border-zinc-800 pb-1.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>RECEIVER FILTERS</span>
          </div>

          {/* Attenuator (ATT) Selector */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
              ATTENUATOR (ATT)
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['0dB', '10dB', '20dB'] as const).map((att) => (
                <button
                  key={att}
                  type="button"
                  id={`att-${att}`}
                  onClick={() => {
                    audioSynth.playRelayClick();
                    onAttenuatorChange(att);
                  }}
                  disabled={!radioState.powerOn}
                  className={`py-1 text-[11px] font-mono rounded border cursor-pointer transition-colors disabled:opacity-40 ${
                    radioState.attenuator === att
                      ? 'bg-emerald-700 text-white border-emerald-500 font-bold'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {att}
                </button>
              ))}
            </div>
          </div>

          {/* AGC Selector */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
              AGC TIME CONSTANT
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['FAST', 'SLOW', 'OFF'] as const).map((agc) => (
                <button
                  key={agc}
                  type="button"
                  id={`agc-${agc}`}
                  onClick={() => {
                    audioSynth.playRelayClick();
                    onAgcChange(agc);
                  }}
                  disabled={!radioState.powerOn}
                  className={`py-1 text-[11px] font-mono rounded border cursor-pointer transition-colors disabled:opacity-40 ${
                    radioState.agc === agc
                      ? 'bg-emerald-700 text-white border-emerald-500 font-bold'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {agc}
                </button>
              ))}
            </div>
          </div>

          {/* Noise Blanker (NB) */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
              NOISE BLANKER (NB)
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['OFF', 'NARROW', 'WIDE'] as const).map((nb) => (
                <button
                  key={nb}
                  type="button"
                  id={`nb-${nb}`}
                  onClick={() => {
                    audioSynth.playRelayClick();
                    onNoiseBlankerChange(nb);
                  }}
                  disabled={!radioState.powerOn}
                  className={`py-1 text-[11px] font-mono rounded border cursor-pointer transition-colors disabled:opacity-40 ${
                    radioState.noiseBlanker === nb
                      ? 'bg-emerald-700 text-white border-emerald-500 font-bold'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {nb}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Tone */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
              AUDIO TONE
            </label>
            <div className="grid grid-cols-2 gap-1">
              {(['HIGH', 'LOW'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  id={`tone-${t}`}
                  onClick={() => {
                    audioSynth.playKeyBeep(1400, 0.02);
                    onToneChange(t);
                  }}
                  disabled={!radioState.powerOn}
                  className={`py-1 text-[11px] font-mono rounded border cursor-pointer transition-colors disabled:opacity-40 ${
                    radioState.tone === t
                      ? 'bg-emerald-700 text-white border-emerald-500 font-bold'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
