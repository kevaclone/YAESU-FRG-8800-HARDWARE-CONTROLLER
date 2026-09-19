/**
 * Yaesu FRG-8800 CAT (Computer Aided Transceiver) Protocol Service
 *
 * FRG-8800 uses 5-byte instruction packets sent to the rear 6-pin DIN CAT jack.
 * Serial parameters: 4800 baud, 8 data bits, 2 stop bits, no parity (8N2).
 * Signal level: TTL (Yaesu standard: 0V = MARK, +5V = SPACE; or inverted with transistor/inverter).
 * Packets are sent chronologically from Byte 1 to Byte 5, where Byte 5 is the Instruction Opcode.
 */

import { RadioMode, SerialPortConfig } from '../types';

export const DEFAULT_SERIAL_CONFIG: SerialPortConfig = {
  baudRate: 4800,
  dataBits: 8,
  stopBits: 2,
  parity: 'none',
  flowControl: 'none',
  invertTtl: false,
  packetPacingMs: 70, // 70ms between commands for vintage 8-bit CPU stability
  frequencyOpcode: 0x01, // 0x01 default for FRG-8800, 0x0A in some Yaesu variants
  bcdEndianness: 'little', // Little-endian BCD (least significant byte first)
};

/**
 * Maps FRG-8800 modes to CAT mode codes.
 * Confirmed by Yaesu FRG-8800 specifications and hardware verification:
 * 0x00 = AM (AM Wide)
 * 0x01 = LSB
 * 0x02 = USB
 * 0x03 = CW (CW-W / CW-N)
 * 0x04 = FM
 * 0x05 = AM Narrow
 */
export const MODE_CODES: Record<RadioMode, number> = {
  'AM-W': 0x00,
  'LSB': 0x01,
  'USB': 0x02,
  'CW-W': 0x03,
  'CW-N': 0x03,
  'FM': 0x04,
  'AM-N': 0x05,
};

/**
 * Formats a frequency in Hertz to MHz string (e.g. 14254000 -> "14.254.00 MHz")
 */
export function formatFrequency(hz: number, showUnits = true): string {
  const mhz = hz / 1000000;
  const mhzWhole = Math.floor(mhz);
  const remainderKHz = Math.floor((hz % 1000000) / 1000);
  const remainderHz = (hz % 1000) / 100; // In 100 Hz steps
  
  const khzStr = remainderKHz.toString().padStart(3, '0');
  const hzStr = Math.floor(remainderHz).toString();
  const subHzStr = Math.floor((hz % 100) / 10).toString();

  const formatted = `${mhzWhole}.${khzStr}.${hzStr}${subHzStr !== '0' ? subHzStr : '0'}`;
  return showUnits ? `${formatted} MHz` : formatted;
}

/**
 * Format frequency as simple digits for 7-segment display
 */
export function formatFrequencyDigits(hz: number): {
  mhz: string;
  khz: string;
  fraction: string;
} {
  const mhz = Math.floor(hz / 1000000);
  const khz = Math.floor((hz % 1000000) / 1000);
  const fraction = Math.floor((hz % 1000) / 100); // 100 Hz resolution

  return {
    mhz: mhz.toString().padStart(2, ' '),
    khz: khz.toString().padStart(3, '0'),
    fraction: fraction.toString(),
  };
}

/**
 * Convert a decimal number (0-99) to BCD byte
 * Example: 54 -> 0x54 (84 decimal)
 */
function decToBcd(val: number): number {
  const clamped = Math.max(0, Math.min(99, Math.floor(val)));
  const tens = Math.floor(clamped / 10);
  const ones = clamped % 10;
  return (tens << 4) | ones;
}

/**
 * Build 5-byte Frequency Set CAT packet for Yaesu FRG-8800
 *
 * Official Yaesu FRG-8800 CAT Specification:
 * Chronological order from Byte 1 to Byte 5:
 *
 * Byte 1:
 *   - High nibble: 100 Hz digit (0-9)
 *   - Low nibble: 25 Hz step code (MUST be 1, 2, 4, or 8; 00H is INVALID!)
 *       1 = 0 Hz (no 25Hz steps)
 *       2 = 25 Hz (one 25Hz step)
 *       4 = 50 Hz (two 25Hz steps)
 *       8 = 75 Hz (three 25Hz steps)
 *
 * Byte 2:
 *   - High nibble: 10 kHz digit (0-9)
 *   - Low nibble: 1 kHz digit (0-9)
 *
 * Byte 3:
 *   - High nibble: 1 MHz digit (0-9)
 *   - Low nibble: 100 kHz digit (0-9)
 *
 * Byte 4:
 *   - High nibble: 100 MHz digit (0-9)
 *   - Low nibble: 10 MHz digit (0-9)
 *
 * Byte 5:
 *   - Opcode (0x01 for standard Yaesu FRG-8800 Frequency Set)
 *
 * Example from Yaesu manual: 14.25400 MHz -> 01H 54H 42H 01H 01H
 * Byte 1: 0x01 (0 * 100Hz, step code 1 = 0Hz)
 * Byte 2: 0x54 (54 kHz)
 * Byte 3: 0x42 (4 MHz, 200 kHz)
 * Byte 4: 0x01 (0 * 100MHz, 1 * 10MHz = 10 MHz)
 * Byte 5: 0x01 (Opcode)
 */
export function buildFrequencyPacket(
  frequencyHz: number,
  config: SerialPortConfig = DEFAULT_SERIAL_CONFIG
): number[] {
  // Ensure frequency is within valid FRG-8800 range (150 kHz to 30 MHz HF, or 118-174 MHz VHF)
  const clampedHz = Math.max(150000, Math.min(174000000, Math.round(frequencyHz)));

  const totalMhz = Math.floor(clampedHz / 1000000);
  const remainderKhz = Math.floor((clampedHz % 1000000) / 1000);
  const remainderHz = clampedHz % 1000;

  // Byte 4: Hundreds and Tens of MHz (e.g., 14 MHz -> 0x01; 7 MHz -> 0x00; 144 MHz -> 0x14)
  const mhzHundreds = Math.floor(totalMhz / 100) % 10;
  const mhzTens = Math.floor(totalMhz / 10) % 10;
  const byte4 = (mhzHundreds << 4) | (mhzTens & 0x0F);

  // Byte 3: Ones of MHz (high nibble) and Hundreds of kHz (low nibble) (e.g., 14.254 MHz -> 4 and 2 -> 0x42)
  const mhzOnes = totalMhz % 10;
  const khzHundreds = Math.floor(remainderKhz / 100) % 10;
  const byte3 = (mhzOnes << 4) | (khzHundreds & 0x0F);

  // Byte 2: Tens and Ones of kHz (e.g., 254 kHz -> 5 and 4 -> 0x54)
  const khzTens = Math.floor((remainderKhz % 100) / 10) % 10;
  const khzOnes = remainderKhz % 10;
  const byte2 = (khzTens << 4) | (khzOnes & 0x0F);

  // Byte 1: 100 Hz digit (high nibble) and 25 Hz step code (low nibble: 1=0Hz, 2=25Hz, 4=50Hz, 8=75Hz)
  const hzHundreds = Math.floor(remainderHz / 100) % 10;
  const subHz = remainderHz % 100;
  let stepCode = 1; // 1 = 0 Hz step (00H is invalid in FRG-8800)
  if (subHz >= 13 && subHz < 38) {
    stepCode = 2; // 25 Hz
  } else if (subHz >= 38 && subHz < 63) {
    stepCode = 4; // 50 Hz
  } else if (subHz >= 63) {
    stepCode = 8; // 75 Hz
  }
  const byte1 = (hzHundreds << 4) | (stepCode & 0x0F);

  const opcode = config.frequencyOpcode ?? 0x01;

  if (config.bcdEndianness === 'big') {
    return [byte4, byte3, byte2, byte1, opcode];
  }
  // Standard Little-Endian chronological order
  return [byte1, byte2, byte3, byte4, opcode];
}

/**
 * Build 5-byte Mode Set CAT packet
 * Byte 1..3: 0x00
 * Byte 4: Mode Code
 * Byte 5: 0x80 (or 0x02)
 */
export function buildModePacket(mode: RadioMode): number[] {
  const code = MODE_CODES[mode] ?? 0x01;
  return [0x00, 0x00, 0x00, code, 0x80];
}

/**
 * Build CAT Activate (External Control ON) packet
 * Byte 1..5: 0x00, 0x00, 0x00, 0x00, 0x00
 */
export function buildCatOnPacket(): number[] {
  return [0x00, 0x00, 0x00, 0x00, 0x00];
}

/**
 * Build CAT Deactivate (External Control OFF / Return to front panel) packet
 * Byte 4: 0x80 (128), Byte 5: 0x00
 */
export function buildCatOffPacket(): number[] {
  return [0x00, 0x00, 0x00, 0x80, 0x00];
}

/**
 * Build Power ON packet
 * Byte 4: 0xFE, Byte 5: 0x80
 */
export function buildPowerOnPacket(): number[] {
  return [0x00, 0x00, 0x00, 0xFE, 0x80];
}

/**
 * Build Power OFF packet
 * Byte 4: 0xFF, Byte 5: 0x80
 */
export function buildPowerOffPacket(): number[] {
  return [0x00, 0x00, 0x00, 0xFF, 0x80];
}

/**
 * Convert byte array to hexadecimal string representation
 */
export function bytesToHexString(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

/**
 * Decode a 5-byte packet into human-readable description
 */
export function decodePacketDescription(
  bytes: number[],
  config: SerialPortConfig = DEFAULT_SERIAL_CONFIG
): string {
  if (bytes.length !== 5) {
    return `Raw ${bytes.length} bytes: ${bytesToHexString(bytes)}`;
  }

  const [b1, b2, b3, b4, b5] = bytes;

  // Check Power Commands
  if (b4 === 0xFE && b5 === 0x80) {
    return 'CMD: Power ON (0xFE 0x80)';
  }
  if (b4 === 0xFF && b5 === 0x80) {
    return 'CMD: Power OFF (0xFF 0x80)';
  }

  // Check CAT External Control Commands
  if (b4 === 0x00 && b5 === 0x00 && b1 === 0x00 && b2 === 0x00 && b3 === 0x00) {
    return 'CMD: External Control ON (Activate CAT)';
  }
  if (b4 === 0x80 && b5 === 0x00 && b1 === 0x00 && b2 === 0x00 && b3 === 0x00) {
    return 'CMD: External Control OFF (Deactivate CAT)';
  }

  // Check Mode Set Command (Byte 5 is 0x80 or 0x02, Bytes 1-3 are 0x00)
  if ((b5 === 0x80 || b5 === 0x02) && b1 === 0x00 && b2 === 0x00 && b3 === 0x00) {
    const modeEntries = Object.entries(MODE_CODES);
    const matched = modeEntries.find(([_, code]) => code === b4);
    if (matched) {
      return `CMD: Set Mode to ${matched[0]} (Code 0x0${b4.toString(16)})`;
    }
  }

  // Check Frequency Set Command (Byte 5 is 0x01 or configured frequency opcode)
  if (b5 === config.frequencyOpcode || b5 === 0x01 || b5 === 0x0A) {
    try {
      let b1Val = b1;
      let b2Val = b2;
      let b3Val = b3;
      let b4Val = b4;

      if (config.bcdEndianness === 'big') {
        b4Val = b1;
        b3Val = b2;
        b2Val = b3;
        b1Val = b4;
      }

      const mhzHundreds = (b4Val >> 4) & 0x0F;
      const mhzTens = b4Val & 0x0F;
      const mhzOnes = (b3Val >> 4) & 0x0F;
      const totalMhz = mhzHundreds * 100 + mhzTens * 10 + mhzOnes;

      const khzHundreds = b3Val & 0x0F;
      const khzTens = (b2Val >> 4) & 0x0F;
      const khzOnes = b2Val & 0x0F;
      const totalKhz = khzHundreds * 100 + khzTens * 10 + khzOnes;

      const hzHundreds = (b1Val >> 4) & 0x0F;
      const stepCode = b1Val & 0x0F;
      const stepHz = stepCode === 2 ? 25 : stepCode === 4 ? 50 : stepCode === 8 ? 75 : 0;

      const totalHz = totalMhz * 1000000 + totalKhz * 1000 + hzHundreds * 100 + stepHz;
      return `CMD: Set Frequency to ${formatFrequency(totalHz)} (Packet: ${bytesToHexString(bytes)})`;
    } catch {
      return `CMD: Set Frequency (Opcode 0x${b5.toString(16).padStart(2, '0')})`;
    }
  }

  return `CAT Data [${bytesToHexString(bytes)}]`;
}
