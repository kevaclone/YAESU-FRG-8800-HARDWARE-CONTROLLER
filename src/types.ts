/**
 * Yaesu FRG-8800 CAT Controller Types
 */

export type RadioMode = 'AM-W' | 'AM-N' | 'LSB' | 'USB' | 'CW-W' | 'CW-N' | 'FM';

export interface RadioState {
  frequencyHz: number; // in Hertz (e.g. 14254000 for 14.2540 MHz)
  mode: RadioMode;
  powerOn: boolean;
  catActive: boolean;
  attenuator: '0dB' | '10dB' | '20dB';
  agc: 'SLOW' | 'FAST' | 'OFF';
  noiseBlanker: 'OFF' | 'NARROW' | 'WIDE';
  tone: 'LOW' | 'HIGH';
  tuningStepHz: number; // e.g. 100, 1000, 5000, 10000, 100000, 1000000
  sMeter: number; // 0 to 15 (0 = S0, 9 = S9, 15 = S9+60dB)
  isScanning: boolean;
  currentMemoryIndex: number | null;
}

export interface MemoryChannel {
  id: string;
  channelNumber: number;
  name: string;
  frequencyHz: number;
  mode: RadioMode;
  tag?: string; // e.g., 'Amateur', 'SW Broadcast', 'Time/Freq', 'Aviation', 'Marine'
  notes?: string;
  isHardwareSlot?: boolean; // Slots 1-12 correspond to FRG-8800 internal memory
}

export interface BandPreset {
  name: string;
  category: 'Amateur' | 'Shortwave' | 'Utility' | 'VHF';
  frequencyHz: number;
  defaultMode: RadioMode;
  range: {
    startHz: number;
    endHz: number;
  };
  description: string;
}

export interface CatPacketLog {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX';
  bytes: number[]; // 5 bytes for standard Yaesu packet
  hexString: string;
  description: string;
  status: 'sent' | 'queued' | 'simulated' | 'error';
}

export interface SerialPortConfig {
  baudRate: number; // 4800 default
  dataBits: 7 | 8; // 8 default
  stopBits: 1 | 2; // 2 default
  parity: 'none' | 'even' | 'odd'; // 'none' default
  flowControl: 'none' | 'hardware';
  invertTtl: boolean;
  packetPacingMs: number; // Delay between commands (default 80ms)
  frequencyOpcode: number; // 0x01 (default FRG-8800) or 0x0A
  bcdEndianness: 'little' | 'big'; // little = LSB first (default FRG-8800)
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'simulated' | 'error';
