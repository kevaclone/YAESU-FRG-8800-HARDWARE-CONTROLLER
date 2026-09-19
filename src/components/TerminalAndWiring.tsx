/**
 * CAT Terminal, Hex Packet Inspector, and Hardware Wiring Guide
 * Features live byte-by-byte hex transmission logs, custom 5-byte test packet injector,
 * 6-Pin DIN CAT socket pinout schematic, and USB/TTL adapter connection instructions.
 */

import React, { useState } from 'react';
import { CatPacketLog, ConnectionStatus, SerialPortConfig } from '../types';
import { bytesToHexString } from '../services/catProtocol';
import {
  Terminal,
  Cpu,
  Cable,
  Send,
  Trash2,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface TerminalAndWiringProps {
  logs: CatPacketLog[];
  connectionStatus: ConnectionStatus;
  statusMessage?: string;
  config: SerialPortConfig;
  onUpdateConfig: (newConfig: Partial<SerialPortConfig>) => void;
  onSendCustomPacket: (bytes: number[], description?: string) => void;
  onClearLogs: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onEnableSimulation: () => void;
  isWebSerialSupported: boolean;
}

export const TerminalAndWiring: React.FC<TerminalAndWiringProps> = ({
  logs,
  connectionStatus,
  statusMessage,
  config,
  onUpdateConfig,
  onSendCustomPacket,
  onClearLogs,
  onConnect,
  onDisconnect,
  onEnableSimulation,
  isWebSerialSupported,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'wiring' | 'settings'>('terminal');

  // Custom 5-byte injector inputs (hex strings)
  const [byte1, setByte1] = useState('01');
  const [byte2, setByte2] = useState('54');
  const [byte3, setByte3] = useState('42');
  const [byte4, setByte4] = useState('01');
  const [byte5, setByte5] = useState('01');

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const b1 = parseInt(byte1, 16) & 0xff;
      const b2 = parseInt(byte2, 16) & 0xff;
      const b3 = parseInt(byte3, 16) & 0xff;
      const b4 = parseInt(byte4, 16) & 0xff;
      const b5 = parseInt(byte5, 16) & 0xff;

      audioSynth.playKeyBeep(1900, 0.03);
      onSendCustomPacket([b1, b2, b3, b4, b5], `Manual Custom 5-Byte Packet`);
    } catch {
      // ignore
    }
  };

  const quickTestPackets = [
    { label: 'Freq: 14.254 MHz', bytes: [0x01, 0x54, 0x42, 0x01, 0x01], desc: 'Set 14.254 MHz (Opcode 0x01)' },
    { label: 'Freq: 7.150 MHz', bytes: [0x01, 0x50, 0x71, 0x00, 0x01], desc: 'Set 7.150 MHz (Opcode 0x01)' },
    { label: 'CAT Control ON', bytes: [0x00, 0x00, 0x00, 0x00, 0x00], desc: 'External Control ON' },
    { label: 'CAT Control OFF', bytes: [0x00, 0x00, 0x00, 0x80, 0x00], desc: 'External Control OFF (Front Panel)' },
    { label: 'Power ON', bytes: [0x00, 0x00, 0x00, 0xfe, 0x80], desc: 'Power ON (0xFE 0x80)' },
    { label: 'Power OFF', bytes: [0x00, 0x00, 0x00, 0xff, 0x80], desc: 'Power OFF (0xFF 0x80)' },
    { label: 'Mode: LSB', bytes: [0x00, 0x00, 0x00, 0x01, 0x80], desc: 'Set Mode LSB (0x01)' },
    { label: 'Mode: USB', bytes: [0x00, 0x00, 0x00, 0x02, 0x80], desc: 'Set Mode USB (0x02)' },
    { label: 'Mode: CW', bytes: [0x00, 0x00, 0x00, 0x03, 0x80], desc: 'Set Mode CW (0x03)' },
    { label: 'Mode: FM', bytes: [0x00, 0x00, 0x00, 0x04, 0x80], desc: 'Set Mode FM (0x04)' },
    { label: 'Mode: AM-W', bytes: [0x00, 0x00, 0x00, 0x00, 0x80], desc: 'Set Mode AM Wide (0x00)' },
    { label: 'Mode: AM-N', bytes: [0x00, 0x00, 0x00, 0x05, 0x80], desc: 'Set Mode AM Narrow (0x05)' },
  ];

  return (
    <div
      id="terminal-wiring-panel"
      className="p-4 sm:p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl"
    >
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
            CAT SERIAL INTERFACE & DIAGNOSTICS
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            id="tab-terminal"
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
              activeTab === 'terminal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Packet Inspector</span>
          </button>
          <button
            type="button"
            id="tab-wiring"
            onClick={() => setActiveTab('wiring')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
              activeTab === 'wiring'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>6-Pin DIN & USB Wiring</span>
          </button>
          <button
            type="button"
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Serial Parameters</span>
          </button>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className="mb-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : connectionStatus === 'simulated'
                ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]'
                : connectionStatus === 'connecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-zinc-600'
            }`}
          />
          <div>
            <span className="font-bold uppercase tracking-wider text-zinc-200">
              STATUS: {connectionStatus}
            </span>
            {statusMessage && (
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">{statusMessage}</p>
            )}
          </div>
        </div>

        {/* Connect / Disconnect / Simulation Buttons */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <button
              type="button"
              id="btn-disconnect-serial"
              onClick={onDisconnect}
              className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-700 text-rose-200 font-bold transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              id="btn-connect-serial"
              onClick={onConnect}
              disabled={!isWebSerialSupported}
              title={
                isWebSerialSupported
                  ? 'Open USB-to-TTL Serial Port dialog'
                  : 'Web Serial API is not supported in this browser'
              }
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <Cable className="w-4 h-4" />
              <span>Connect USB/TTL</span>
            </button>
          )}

          {connectionStatus !== 'simulated' && (
            <button
              type="button"
              id="btn-enable-simulation"
              onClick={onEnableSimulation}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold transition-colors cursor-pointer"
            >
              Virtual Simulator Mode
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Terminal & Packet Inspector */}
      {activeTab === 'terminal' && (
        <div className="space-y-4">
          {/* Custom 5-Byte Injector Form */}
          <form
            onSubmit={handleSendCustom}
            className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Custom 5-Byte CAT Packet Transmitter</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">HEX VALUES (00 to FF)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 font-mono">
                <div>
                  <span className="text-[9px] text-zinc-500 block text-center">BYTE 1</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={byte1}
                    onChange={(e) => setByte1(e.target.value.toUpperCase())}
                    className="w-12 text-center p-1.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block text-center">BYTE 2</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={byte2}
                    onChange={(e) => setByte2(e.target.value.toUpperCase())}
                    className="w-12 text-center p-1.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block text-center">BYTE 3</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={byte3}
                    onChange={(e) => setByte3(e.target.value.toUpperCase())}
                    className="w-12 text-center p-1.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block text-center">BYTE 4</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={byte4}
                    onChange={(e) => setByte4(e.target.value.toUpperCase())}
                    className="w-12 text-center p-1.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-amber-500 block text-center font-bold">OPCODE</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={byte5}
                    onChange={(e) => setByte5(e.target.value.toUpperCase())}
                    className="w-12 text-center p-1.5 rounded bg-zinc-900 border border-amber-600/70 text-amber-300 font-bold text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-transmit-custom"
                className="mt-3.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Packet</span>
              </button>
            </div>

            {/* Quick Test Chips */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-semibold uppercase mr-1">
                Quick Test Packets:
              </span>
              {quickTestPackets.map((pkt) => (
                <button
                  key={pkt.label}
                  type="button"
                  onClick={() => {
                    audioSynth.playKeyBeep(1700, 0.02);
                    onSendCustomPacket(pkt.bytes, pkt.desc);
                  }}
                  className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-[11px] text-zinc-300 font-mono transition-colors cursor-pointer"
                >
                  {pkt.label}
                </button>
              ))}
            </div>
          </form>

          {/* Live Packet Log Console */}
          <div className="rounded-xl bg-black border border-zinc-800 overflow-hidden font-mono text-xs">
            <div className="p-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-[11px] tracking-wider text-zinc-300 uppercase">
                  LIVE SERIAL PACKET MONITOR ({logs.length} EVENTS)
                </span>
              </div>
              <button
                type="button"
                id="btn-clear-logs"
                onClick={onClearLogs}
                title="Clear Log History"
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>

            {/* Scrollable Packet Log List */}
            <div className="p-3 max-h-60 overflow-y-auto space-y-1.5 select-text">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 p-1.5 rounded bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-900 transition-colors"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] text-zinc-600">{log.timestamp}</span>
                    <span
                      className={`px-1 rounded text-[10px] font-bold ${
                        log.direction === 'TX'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}
                    >
                      {log.direction}
                    </span>
                    <span className="font-bold text-zinc-200 tracking-widest text-xs">
                      [{log.hexString}]
                    </span>
                    <span className="text-zinc-400 font-sans text-xs">{log.description}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold ${
                      log.status === 'sent'
                        ? 'text-emerald-400'
                        : log.status === 'simulated'
                        ? 'text-blue-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {log.status.toUpperCase()}
                  </span>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="p-6 text-center text-zinc-600 text-xs">
                  No packets sent yet. Tune the VFO or click a band preset to inspect outgoing CAT commands.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 6-Pin DIN & USB/TTL Wiring Guide */}
      {activeTab === 'wiring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* 6-Pin DIN Socket Diagram */}
            <div className="md:col-span-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                FRG-8800 REAR CAT JACK (6-PIN DIN FEMALE)
              </span>

              {/* Pin Diagram Graphic */}
              <div className="relative w-40 h-40 rounded-full border-4 border-zinc-700 bg-zinc-900 shadow-inner flex items-center justify-center my-2">
                <div className="absolute top-2 text-[10px] font-bold text-zinc-400">TOP KEYWAY</div>

                {/* Ground Shield outer ring */}
                <div className="w-32 h-32 rounded-full border border-zinc-700/80 flex items-center justify-center relative">
                  {/* Pin 1: NC */}
                  <div className="absolute top-4 left-6 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                      1
                    </span>
                  </div>
                  {/* Pin 2: SERIAL IN / TXD from PC */}
                  <div className="absolute top-4 right-6 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-emerald-400">
                      2
                    </span>
                  </div>
                  {/* Pin 3: GND */}
                  <div className="absolute top-14 left-2 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-zinc-300 flex items-center justify-center text-[9px] font-bold text-black ring-2 ring-zinc-400">
                      3
                    </span>
                  </div>
                  {/* Pin 4: Audio Out */}
                  <div className="absolute top-14 right-2 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                      4
                    </span>
                  </div>
                  {/* Pin 5: S-Meter analog */}
                  <div className="absolute bottom-6 left-8 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                      5
                    </span>
                  </div>
                  {/* Pin 6: BUSY */}
                  <div className="absolute bottom-6 right-8 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                      6
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 mt-2 text-center font-mono">
                View looking directly at the rear panel connector
              </div>
            </div>

            {/* Pin Function Table & Connection Steps */}
            <div className="md:col-span-7 space-y-3">
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="p-2">Pin #</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Connect to USB/TTL Adapter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    <tr className="bg-emerald-950/20">
                      <td className="p-2 font-bold text-emerald-400">Pin 2</td>
                      <td className="p-2 text-zinc-200">SERIAL IN</td>
                      <td className="p-2 text-emerald-300 font-bold">TXD (Transmit Data)</td>
                    </tr>
                    <tr className="bg-zinc-900/40">
                      <td className="p-2 font-bold text-zinc-300">Pin 3</td>
                      <td className="p-2 text-zinc-300">GND</td>
                      <td className="p-2 text-zinc-200 font-bold">GND (Common Ground)</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-500">Pin 1</td>
                      <td className="p-2 text-zinc-500">NC</td>
                      <td className="p-2 text-zinc-500">Leave unconnected</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-500">Pin 4</td>
                      <td className="p-2 text-zinc-500">AF OUT</td>
                      <td className="p-2 text-zinc-500">Optional fixed audio to PC line-in</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-500">Pin 5</td>
                      <td className="p-2 text-zinc-500">SMTR</td>
                      <td className="p-2 text-zinc-500">Analog S-Meter DC voltage (0–2.5V)</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-zinc-500">Pin 6</td>
                      <td className="p-2 text-zinc-500">BUSY</td>
                      <td className="p-2 text-zinc-500">Receiver squelch open logic flag</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Hardware Notes Callout */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Important Hardware & Logic Level Tips</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 leading-relaxed font-sans">
                  <li>
                    <strong>Signal Level:</strong> The FRG-8800 CAT input expects standard <strong>5V TTL</strong>. Any FTDI FT232R, CP2102, or CH340 USB adapter set to 5V (or 3.3V) works.
                  </li>
                  <li>
                    <strong>TTL Polarity:</strong> The vintage Yaesu CAT bus operates on inverted TTL (0V = MARK / Bit 1, +5V = SPACE / Bit 0). If your USB adapter outputs non-inverted UART and the radio doesn't react, enable the <em>"Invert TTL Bitstream"</em> switch in Serial Parameters or add a standard 1-transistor NPN inverter.
                  </li>
                  <li>
                    <strong>Unidirectional (RX only):</strong> The FRG-8800 does not transmit serial telemetry back to the computer. Commands are sent from PC to radio.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Serial Configuration Settings */}
      {activeTab === 'settings' && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Baud Rate */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Baud Rate (Standard: 4800)
              </label>
              <select
                value={config.baudRate}
                onChange={(e) => onUpdateConfig({ baudRate: Number(e.target.value) })}
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono font-bold"
              >
                <option value={1200}>1200 Baud</option>
                <option value={2400}>2400 Baud</option>
                <option value={4800}>4800 Baud (FRG-8800 Standard)</option>
                <option value={9600}>9600 Baud</option>
              </select>
            </div>

            {/* Stop Bits */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Stop Bits (Standard: 2 Stop Bits)
              </label>
              <select
                value={config.stopBits}
                onChange={(e) => onUpdateConfig({ stopBits: Number(e.target.value) as 1 | 2 })}
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono font-bold"
              >
                <option value={1}>1 Stop Bit</option>
                <option value={2}>2 Stop Bits (FRG-8800 Standard)</option>
              </select>
            </div>

            {/* Packet Pacing Delay */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Command Pacing Delay: {config.packetPacingMs} ms
              </label>
              <input
                type="range"
                min="30"
                max="250"
                step="5"
                value={config.packetPacingMs}
                onChange={(e) => onUpdateConfig({ packetPacingMs: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer mt-1"
              />
              <span className="text-[10px] text-zinc-500 block">
                Prevents overloading the receiver's vintage 8-bit microprocessor
              </span>
            </div>

            {/* Frequency Opcode */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Frequency Opcode
              </label>
              <select
                value={config.frequencyOpcode}
                onChange={(e) => onUpdateConfig({ frequencyOpcode: Number(e.target.value) })}
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono font-bold"
              >
                <option value={0x01}>0x01 (Standard FRG-8800 Manual Opcode)</option>
                <option value={0x0A}>0x0A (FRG-9600 Variant)</option>
              </select>
            </div>

            {/* BCD Endianness */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                BCD Byte Order
              </label>
              <select
                value={config.bcdEndianness}
                onChange={(e) => onUpdateConfig({ bcdEndianness: e.target.value as 'little' | 'big' })}
                className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-mono font-bold"
              >
                <option value="little">Little Endian (LSB First, Standard)</option>
                <option value="big">Big Endian (MSB First)</option>
              </select>
            </div>

            {/* Invert TTL Software Toggle */}
            <div className="flex flex-col justify-center">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase block mb-1">
                Invert TTL Bitstream
              </label>
              <button
                type="button"
                id="toggle-invert-ttl"
                onClick={() => onUpdateConfig({ invertTtl: !config.invertTtl })}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                  config.invertTtl
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                }`}
              >
                <span>{config.invertTtl ? 'INVERTED (~BYTE)' : 'STANDARD UART'}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    config.invertTtl ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
