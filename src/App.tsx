/**
 * Yaesu FRG-8800 CAT Controller Main Application
 * Integrates Web Serial communication, authentic front-panel emulation,
 * band presets, memory banks, frequency scanner, and hardware pinout guides.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BandPreset,
  CatPacketLog,
  ConnectionStatus,
  MemoryChannel,
  RadioMode,
  RadioState,
  SerialPortConfig,
} from './types';
import {
  buildCatOffPacket,
  buildCatOnPacket,
  buildFrequencyPacket,
  buildModePacket,
  buildPowerOffPacket,
  buildPowerOnPacket,
  DEFAULT_SERIAL_CONFIG,
  formatFrequency,
} from './services/catProtocol';
import { serialManager } from './services/webSerial';
import { audioSynth } from './services/audioSynth';
import { INITIAL_MEMORIES } from './data/radioData';
import { RadioPanel } from './components/RadioPanel';
import { BandSelector } from './components/BandSelector';
import { MemoryManager } from './components/MemoryManager';
import { Scanner } from './components/Scanner';
import { TerminalAndWiring } from './components/TerminalAndWiring';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallModal } from './components/InstallModal';
import { IframeNoticeModal } from './components/IframeNoticeModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { Radio, Bookmark, Compass, Terminal, FastForward, Download, ExternalLink, Cable } from 'lucide-react';

export default function App() {
  const { isInstallable, isInstalled, isStandalone, isIOS, isAndroid, isOpera, install } = usePWAInstall();
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isIframeModalOpen, setIsIframeModalOpen] = useState(false);

  // Radio Receiver State
  const [radioState, setRadioState] = useState<RadioState>({
    frequencyHz: 14254000, // 14.254.0 MHz (Classic Yaesu reference frequency)
    mode: 'USB',
    powerOn: true,
    catActive: false,
    attenuator: '0dB',
    agc: 'SLOW',
    noiseBlanker: 'OFF',
    tone: 'HIGH',
    tuningStepHz: 1000, // 1 kHz
    sMeter: 9, // S-9
    isScanning: false,
    currentMemoryIndex: 4,
  });

  const [memories, setMemories] = useState<MemoryChannel[]>(() => {
    const saved = localStorage.getItem('yaesu_frg8800_memories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_MEMORIES;
  });

  const [activeChannelLabel, setActiveChannelLabel] = useState<string | null>('20m SSB Calling');
  const [activeChannelId, setActiveChannelId] = useState<string | null>('mem-4');

  // Serial & Diagnostics State
  const [logs, setLogs] = useState<CatPacketLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Physical receiver disconnected. Click "Connect COM Port" to select your USB-to-TTL adapter.'
  );
  const [serialConfig, setSerialConfig] = useState<SerialPortConfig>({ ...DEFAULT_SERIAL_CONFIG });
  const [isMuted, setIsMuted] = useState(false);

  // Active Bottom Section Tab
  const [activeTab, setActiveTab] = useState<'bands' | 'memories' | 'scanner' | 'terminal'>('bands');

  // Persist memories
  useEffect(() => {
    localStorage.setItem('yaesu_frg8800_memories', JSON.stringify(memories));
  }, [memories]);

  // Setup Web Serial Manager callbacks
  useEffect(() => {
    serialManager.setCallbacks(
      (log) => {
        setLogs((prev) => [log, ...prev].slice(0, 150));
      },
      (status, msg) => {
        setConnectionStatus(status);
        if (msg) setStatusMessage(msg);
      }
    );

    // Initial CAT handshake if powered on
    if (radioState.catActive && radioState.powerOn) {
      const initCat = async () => {
        await serialManager.sendPacket(buildCatOnPacket(), 'Init: CAT External Control ON');
        await serialManager.sendPacket(
          buildFrequencyPacket(radioState.frequencyHz, serialConfig),
          `Init: Frequency to ${formatFrequency(radioState.frequencyHz)}`
        );
        await serialManager.sendPacket(
          buildModePacket(radioState.mode),
          `Init: Mode to ${radioState.mode}`
        );
      };
      initCat();
    }
  }, []);

  // Atmospheric signal flutter simulation for S-meter
  useEffect(() => {
    if (!radioState.powerOn) return;

    const interval = setInterval(() => {
      setRadioState((prev) => {
        if (!prev.powerOn) return prev;
        // Base S-meter on band plus slight random QSB (fading)
        const mhz = prev.frequencyHz / 1000000;
        let baseS = 7;
        if (mhz >= 14 && mhz <= 14.35) baseS = 9; // 20m active
        else if (mhz >= 7 && mhz <= 7.3) baseS = 8; // 40m active
        else if (mhz >= 9.4 && mhz <= 9.9) baseS = 10; // Strong SW broadcast
        else if (mhz >= 118 && mhz <= 136) baseS = 5;

        // Add QSB flutter between -2 and +2
        const flutter = Math.floor(Math.random() * 5) - 2;
        const newSMeter = Math.max(1, Math.min(15, baseS + flutter));
        return { ...prev, sMeter: newSMeter };
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [radioState.powerOn]);

  // Handle Frequency Change
  const handleFrequencyChange = useCallback(
    (newHz: number) => {
      setRadioState((prev) => {
        if (prev.frequencyHz === newHz) return prev;
        return {
          ...prev,
          frequencyHz: newHz,
          currentMemoryIndex: null, // cleared when tuning VFO
        };
      });
      setActiveChannelId(null);
      setActiveChannelLabel(null);

      // Transmit CAT packet directly to hardware if connected or CAT is active
      const isConnected = serialManager.getStatus() === 'connected';
      if (isConnected || (radioState.catActive && radioState.powerOn)) {
        const packet = buildFrequencyPacket(newHz, serialConfig);
        serialManager.sendPacket(packet, `Tune VFO to ${formatFrequency(newHz)}`);
      }
    },
    [radioState.catActive, radioState.powerOn, serialConfig]
  );

  // Handle Mode Change
  const handleModeChange = useCallback(
    (newMode: RadioMode) => {
      setRadioState((prev) => ({ ...prev, mode: newMode }));

      // Transmit CAT packet directly to hardware if connected or CAT is active
      const isConnected = serialManager.getStatus() === 'connected';
      if (isConnected || (radioState.catActive && radioState.powerOn)) {
        const packet = buildModePacket(newMode);
        serialManager.sendPacket(packet, `Set Mode to ${newMode}`);
      }
    },
    [radioState.catActive, radioState.powerOn]
  );

  // Serial Port Connection Handlers
  const handleConnectSerial = async () => {
    audioSynth.playKeyBeep(1400, 0.03);
    if (serialManager.isInIframe()) {
      setIsIframeModalOpen(true);
      return;
    }
    const result = await serialManager.connect();
    if (result.success) {
      audioSynth.playRelayClick();
      setRadioState((prev) => ({ ...prev, catActive: true, powerOn: true }));
      // Transmit initialization packets directly to radio hardware
      await serialManager.sendPacket(buildCatOnPacket(), 'Init: CAT Hardware Link ON');
      await serialManager.sendPacket(
        buildFrequencyPacket(radioState.frequencyHz, serialConfig),
        `Sync Frequency to ${formatFrequency(radioState.frequencyHz)}`
      );
      await serialManager.sendPacket(
        buildModePacket(radioState.mode),
        `Sync Mode to ${radioState.mode}`
      );
    } else if (result.needsNewTab) {
      setIsIframeModalOpen(true);
    }
  };

  const handleDisconnectSerial = async () => {
    audioSynth.playRelayClick();
    await serialManager.disconnect();
    setRadioState((prev) => ({ ...prev, catActive: false }));
  };

  // Auto-connect if opened directly in a new tab with ?action=connect
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'connect' && !serialManager.isInIframe()) {
        const timer = setTimeout(() => {
          handleConnectSerial();
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle Power Toggle
  const handlePowerToggle = useCallback(() => {
    setRadioState((prev) => {
      const nextPower = !prev.powerOn;
      if (prev.catActive) {
        const packet = nextPower ? buildPowerOnPacket() : buildPowerOffPacket();
        serialManager.sendPacket(packet, nextPower ? 'Receiver Power ON' : 'Receiver Power OFF');
      }
      return { ...prev, powerOn: nextPower };
    });
  }, []);

  // Handle CAT Toggle
  const handleCatToggle = useCallback(() => {
    setRadioState((prev) => {
      const nextCat = !prev.catActive;
      const packet = nextCat ? buildCatOnPacket() : buildCatOffPacket();
      serialManager.sendPacket(packet, nextCat ? 'CAT External Control ON' : 'CAT Control OFF');
      return { ...prev, catActive: nextCat };
    });
  }, []);

  // Handle Band Preset Selection
  const handleSelectBand = useCallback(
    (preset: BandPreset) => {
      setRadioState((prev) => ({
        ...prev,
        frequencyHz: preset.frequencyHz,
        mode: preset.defaultMode,
        currentMemoryIndex: null,
      }));
      setActiveChannelId(null);
      setActiveChannelLabel(preset.name);

      const isConnected = serialManager.getStatus() === 'connected';
      if (isConnected || (radioState.catActive && radioState.powerOn)) {
        serialManager.sendPacket(
          buildFrequencyPacket(preset.frequencyHz, serialConfig),
          `Preset ${preset.name}: Freq to ${formatFrequency(preset.frequencyHz)}`
        );
        serialManager.sendPacket(
          buildModePacket(preset.defaultMode),
          `Preset ${preset.name}: Mode to ${preset.defaultMode}`
        );
      }
    },
    [radioState.catActive, radioState.powerOn, serialConfig]
  );

  // Handle Memory Recall
  const handleRecallMemory = useCallback(
    (channel: MemoryChannel) => {
      setRadioState((prev) => ({
        ...prev,
        frequencyHz: channel.frequencyHz,
        mode: channel.mode,
        currentMemoryIndex: channel.channelNumber,
      }));
      setActiveChannelId(channel.id);
      setActiveChannelLabel(channel.name);

      const isConnected = serialManager.getStatus() === 'connected';
      if (isConnected || (radioState.catActive && radioState.powerOn)) {
        serialManager.sendPacket(
          buildFrequencyPacket(channel.frequencyHz, serialConfig),
          `Recall CH-${channel.channelNumber} (${channel.name}): ${formatFrequency(channel.frequencyHz)}`
        );
        serialManager.sendPacket(
          buildModePacket(channel.mode),
          `Recall CH-${channel.channelNumber}: Mode ${channel.mode}`
        );
      }
    },
    [radioState.catActive, radioState.powerOn, serialConfig]
  );

  const handleRecallMemoryByNumber = useCallback(
    (chNum: number) => {
      const match = memories.find((m) => m.channelNumber === chNum);
      if (match) {
        handleRecallMemory(match);
      }
    },
    [memories, handleRecallMemory]
  );

  // Memory additions / deletions
  const handleSaveToMemory = (channelData: Omit<MemoryChannel, 'id'>) => {
    const newChannel: MemoryChannel = {
      ...channelData,
      id: `mem-${Date.now()}`,
    };
    setMemories((prev) => {
      const filtered = prev.filter((m) => m.channelNumber !== channelData.channelNumber);
      return [...filtered, newChannel].sort((a, b) => a.channelNumber - b.channelNumber);
    });
    setActiveChannelId(newChannel.id);
    setActiveChannelLabel(newChannel.name);
    setRadioState((prev) => ({ ...prev, currentMemoryIndex: newChannel.channelNumber }));
  };

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (activeChannelId === id) {
      setActiveChannelId(null);
      setActiveChannelLabel(null);
      setRadioState((prev) => ({ ...prev, currentMemoryIndex: null }));
    }
  };

  // Keyboard Shortcuts (Arrow keys to tune frequency)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleFrequencyChange(radioState.frequencyHz + radioState.tuningStepHz);
        audioSynth.playKnobClick();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleFrequencyChange(Math.max(150000, radioState.frequencyHz - radioState.tuningStepHz));
        audioSynth.playKnobClick();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => {
          const next = !prev;
          audioSynth.setMuted(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [radioState.frequencyHz, radioState.tuningStepHz, handleFrequencyChange]);

  const handleMuteToggle = () => {
    setIsMuted((prev) => {
      const next = !prev;
      audioSynth.setMuted(next);
      return next;
    });
  };

  const handleUpdateConfig = (newConfig: Partial<SerialPortConfig>) => {
    setSerialConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      serialManager.updateConfig(updated);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-zinc-100 flex flex-col items-center selection:bg-emerald-500 selection:text-black">
      {/* Top Application Bar */}
      <header className="w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-40 px-3 sm:px-8 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-mono">
            88
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <span>YAESU FRG-8800 CAT CONTROLLER</span>
              <span className="hidden sm:inline px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                4800 Baud / 8N2
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono hidden sm:block">
              USB/TTL Serial to 6-Pin DIN Interface • All-Mode SW Receiver
            </p>
          </div>
        </div>

        {/* Top Controls: Connect COM Port, Status, and PWA Install */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {connectionStatus === 'connected' ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>COM PORT CONNECTED</span>
              </span>
              <button
                type="button"
                id="header-disconnect-btn"
                onClick={handleDisconnectSerial}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-semibold cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="header-connect-serial-btn"
              onClick={handleConnectSerial}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Cable className="w-4 h-4 stroke-[2.5]" />
              <span>CONNECT COM PORT</span>
            </button>
          )}

          <PWAInstallButton />
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 border ${
              connectionStatus === 'connected'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                : connectionStatus === 'simulated'
                ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400'
                  : connectionStatus === 'simulated'
                  ? 'bg-blue-400'
                  : 'bg-zinc-500'
              }`}
            />
            <span>{connectionStatus.toUpperCase()}</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl px-4 sm:px-6 py-6 flex flex-col space-y-6">
        {/* Prominent Always-Visible App Banner */}
        {!isStandalone && (
          <div className="w-full p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/50 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-black font-black flex items-center justify-center text-base font-mono shadow-md shrink-0 ring-2 ring-emerald-400/40">
                CAT
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>YAESU FRG-8800 HARDWARE CONTROLLER</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700/60">
                    Direct Web Serial (4800 8N2)
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  Connects directly to your USB-to-TTL adapter in Opera One, Chrome, or Edge without any installation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {connectionStatus !== 'connected' && (
                <button
                  type="button"
                  id="btn-banner-connect-com"
                  onClick={handleConnectSerial}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-black text-xs sm:text-sm shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Cable className="w-4 h-4 stroke-[3]" />
                  <span>CONNECT COM PORT</span>
                </button>
              )}

              <button
                type="button"
                id="btn-banner-direct-tab"
                onClick={() => {
                  audioSynth.playKeyBeep(1800, 0.02);
                  window.open(window.location.href, '_blank');
                }}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Open directly in a new browser tab outside preview iframe"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Open Full Tab</span>
              </button>

              <button
                type="button"
                id="btn-banner-install-app"
                onClick={() => {
                  audioSynth.playKeyBeep(1800, 0.02);
                  if (isInstallable) {
                    install().then((accepted) => {
                      if (!accepted) setIsDownloadModalOpen(true);
                    });
                  } else {
                    setIsDownloadModalOpen(true);
                  }
                }}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Download Standalone PWA or Source Code"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">App / Download</span>
              </button>
            </div>
          </div>
        )}

        {/* The Receiver Faceplate */}
        <RadioPanel
          radioState={radioState}
          channelLabel={activeChannelLabel}
          connectionStatus={connectionStatus}
          statusMessage={statusMessage}
          onConnectSerial={handleConnectSerial}
          onDisconnectSerial={handleDisconnectSerial}
          onFrequencyChange={handleFrequencyChange}
          onStepChange={(step) => setRadioState((prev) => ({ ...prev, tuningStepHz: step }))}
          onModeChange={handleModeChange}
          onPowerToggle={handlePowerToggle}
          onCatToggle={handleCatToggle}
          onAttenuatorChange={(att) => setRadioState((prev) => ({ ...prev, attenuator: att }))}
          onAgcChange={(agc) => setRadioState((prev) => ({ ...prev, agc }))}
          onNoiseBlankerChange={(nb) => setRadioState((prev) => ({ ...prev, noiseBlanker: nb }))}
          onToneChange={(tone) => setRadioState((prev) => ({ ...prev, tone }))}
          onRecallMemory={handleRecallMemoryByNumber}
          onMuteToggle={handleMuteToggle}
          isMuted={isMuted}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          onOpenOperaInstall={() => setIsDownloadModalOpen(true)}
        />

        {/* Navigation Tabs for Auxiliary Features */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800">
          <button
            type="button"
            id="nav-tab-bands"
            onClick={() => setActiveTab('bands')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'bands'
                ? 'bg-zinc-900 text-emerald-400 border-t border-x border-zinc-800 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Band Presets</span>
          </button>

          <button
            type="button"
            id="nav-tab-memories"
            onClick={() => setActiveTab('memories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'memories'
                ? 'bg-zinc-900 text-emerald-400 border-t border-x border-zinc-800 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Memory Channels ({memories.length})</span>
          </button>

          <button
            type="button"
            id="nav-tab-scanner"
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-zinc-900 text-emerald-400 border-t border-x border-zinc-800 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <FastForward className="w-4 h-4" />
            <span>Scanner</span>
          </button>

          <button
            type="button"
            id="nav-tab-terminal"
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'terminal'
                ? 'bg-zinc-900 text-emerald-400 border-t border-x border-zinc-800 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>CAT Terminal & 6-Pin DIN Wiring</span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div>
          {activeTab === 'bands' && (
            <BandSelector
              currentFrequencyHz={radioState.frequencyHz}
              onSelectBand={handleSelectBand}
              disabled={!radioState.powerOn}
            />
          )}

          {activeTab === 'memories' && (
            <MemoryManager
              memories={memories}
              activeChannelId={activeChannelId}
              currentFrequencyHz={radioState.frequencyHz}
              currentMode={radioState.mode}
              onRecallMemory={handleRecallMemory}
              onSaveToMemory={handleSaveToMemory}
              onDeleteMemory={handleDeleteMemory}
              onImportMemories={setMemories}
              disabled={!radioState.powerOn}
            />
          )}

          {activeTab === 'scanner' && (
            <Scanner
              currentFrequencyHz={radioState.frequencyHz}
              currentMode={radioState.mode}
              memories={memories}
              onTuneFrequency={handleFrequencyChange}
              onTuneMemory={handleRecallMemory}
              isScanning={radioState.isScanning}
              setIsScanning={(scanning) => setRadioState((prev) => ({ ...prev, isScanning: scanning }))}
              disabled={!radioState.powerOn}
            />
          )}

          {activeTab === 'terminal' && (
            <TerminalAndWiring
              logs={logs}
              connectionStatus={connectionStatus}
              statusMessage={statusMessage}
              config={serialConfig}
              onUpdateConfig={handleUpdateConfig}
              onSendCustomPacket={(bytes, desc) => serialManager.sendPacket(bytes, desc)}
              onClearLogs={() => setLogs([])}
              onConnect={handleConnectSerial}
              onDisconnect={handleDisconnectSerial}
              onEnableSimulation={() => serialManager.enableSimulation()}
              isWebSerialSupported={serialManager.isSupported()}
            />
          )}
        </div>
      </main>

      {/* Footer info */}
      <footer className="w-full border-t border-zinc-900 py-4 px-6 text-center text-[11px] text-zinc-600 font-mono">
        Yaesu FRG-8800 CAT Controller • 4800 Baud, 8 Data Bits, 2 Stop Bits, No Parity (8N2) • TTL Logic Control
      </footer>

      <InstallModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        isInstallable={isInstallable}
        isStandalone={isStandalone}
        onTriggerInstall={install}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isOpera={isOpera}
      />

      <IframeNoticeModal
        isOpen={isIframeModalOpen}
        onClose={() => setIsIframeModalOpen(false)}
        directUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <OfflineIndicator />

      {/* Floating Bottom Quick-Access Install/Download Button */}
      {!isStandalone && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            type="button"
            id="btn-floating-install-app"
            onClick={() => {
              audioSynth.playKeyBeep(1800, 0.02);
              if (isInstallable) {
                install().then((accepted) => {
                  if (!accepted) setIsDownloadModalOpen(true);
                });
              } else {
                setIsDownloadModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-black font-black text-xs shadow-2xl shadow-black/90 border border-emerald-400 transition-all cursor-pointer hover:scale-105 active:scale-95 ring-4 ring-emerald-950/60"
            title="Install App as Desktop Standalone or Download Source Package"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>INSTALL / DOWNLOAD APP</span>
          </button>
        </div>
      )}
    </div>
  );
}
