/**
 * Web Serial API Manager for Yaesu FRG-8800 USB/TTL to CAT Interface
 */

import { CatPacketLog, ConnectionStatus, SerialPortConfig } from '../types';
import { bytesToHexString, decodePacketDescription, DEFAULT_SERIAL_CONFIG } from './catProtocol';

// Web Serial types declaration for environments where DOM lib lacks full SerialPort definitions
export interface WebSerialPort {
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  setSignals?(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
}

export interface SerialNavigator extends Navigator {
  serial?: {
    requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>;
    getPorts(): Promise<WebSerialPort[]>;
  };
}

export type PacketLogCallback = (log: CatPacketLog) => void;
export type StatusChangeCallback = (status: ConnectionStatus, message?: string) => void;

class WebSerialManager {
  private port: WebSerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private isReading = false;
  private status: ConnectionStatus = 'disconnected';
  private config: SerialPortConfig = { ...DEFAULT_SERIAL_CONFIG };

  private onPacketLog: PacketLogCallback | null = null;
  private onStatusChange: StatusChangeCallback | null = null;

  // Queue to prevent flooding the radio
  private queue: Array<{ bytes: number[]; description: string; resolve: () => void }> = [];
  private isProcessingQueue = false;

  public setCallbacks(onLog: PacketLogCallback, onStatus: StatusChangeCallback) {
    this.onPacketLog = onLog;
    this.onStatusChange = onStatus;
  }

  public updateConfig(newConfig: Partial<SerialPortConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SerialPortConfig {
    return { ...this.config };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isInIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Request and open a serial port
   */
  public async connect(): Promise<{ success: boolean; message: string; needsNewTab?: boolean }> {
    if (this.isInIframe()) {
      const msg = 'Web browsers disable USB hardware access inside embedded preview frames for security. Please open the app directly in a browser tab to connect to your COM port.';
      this.setStatus('disconnected', msg);
      return { success: false, message: msg, needsNewTab: true };
    }

    if (!this.isSupported()) {
      const msg = 'Web Serial API is not available in this browser. Opera One supports Web Serial (ensure it is enabled at opera://flags/#enable-web-serial-api).';
      this.setStatus('disconnected', msg);
      return { success: false, message: msg };
    }

    try {
      this.setStatus('connecting', 'Waiting for user to select COM port...');
      const serialNav = navigator as SerialNavigator;
      if (!serialNav.serial) {
        throw new Error('Web Serial API not found');
      }

      // Request port from user
      this.port = await serialNav.serial.requestPort();

      // Open port with Yaesu FRG-8800 specifications: 4800 baud, 8N2
      await this.port.open({
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity,
        flowControl: this.config.flowControl,
      });

      // Assert DTR / RTS signals if supported (some level converter boards rely on DTR/RTS)
      if (this.port.setSignals) {
        try {
          await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
        } catch {
          // Non-critical if setSignals not permitted
        }
      }

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      let adapterName = 'COM Port';
      try {
        const info = this.port.getInfo?.();
        if (info?.usbVendorId) {
          const vid = info.usbVendorId;
          if (vid === 0x0403) adapterName = 'FTDI FT232R USB';
          else if (vid === 0x10C4) adapterName = 'Silicon Labs CP2102';
          else if (vid === 0x1A86) adapterName = 'CH340 USB-Serial';
          else if (vid === 0x067B) adapterName = 'Prolific PL2303';
          else adapterName = `USB Serial (VID 0x${vid.toString(16)})`;
        }
      } catch {
        // ignore info error
      }

      const successMsg = `Connected to ${adapterName} at ${this.config.baudRate} Baud (8N2). Hardware CAT active!`;
      this.setStatus('connected', successMsg);
      this.startReading();
      return { success: true, message: successMsg };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('Serial connection failed or cancelled:', errorMsg);

      if (errorMsg.includes('User cancelled') || errorMsg.includes('No port selected')) {
        const msg = 'Port selection was cancelled. Plug in your USB cable and click Connect COM Port to try again.';
        this.setStatus('disconnected', msg);
        return { success: false, message: msg };
      } else if (errorMsg.includes('iframe') || errorMsg.includes('feature policy')) {
        const msg = 'Embedded preview iframe blocked COM port access. Open the app in a direct Opera tab to connect.';
        this.setStatus('disconnected', msg);
        return { success: false, message: msg, needsNewTab: true };
      } else {
        const msg = `COM port error: ${errorMsg}`;
        this.setStatus('disconnected', msg);
        return { success: false, message: msg };
      }
    }
  }

  /**
   * Disconnect the current serial port
   */
  public async disconnect(): Promise<void> {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore
      }
      this.reader.releaseLock();
      this.reader = null;
    }

    if (this.writer) {
      try {
        await this.writer.close();
      } catch {
        // ignore
      }
      this.writer.releaseLock();
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
      this.port = null;
    }

    this.setStatus('disconnected', 'Disconnected from radio.');
  }

  /**
   * Switch directly to simulation mode
   */
  public enableSimulation(): void {
    if (this.status === 'connected') {
      this.disconnect();
    }
    this.setStatus('simulated', 'Simulated FRG-8800 Receiver Mode Active');
  }

  /**
   * Send 5-byte CAT packet to the radio with queue and delay pacing
   */
  public async sendPacket(bytes: number[], customDescription?: string): Promise<void> {
    const description = customDescription || decodePacketDescription(bytes, this.config);

    return new Promise((resolve) => {
      // If this is a frequency command and the queue already has pending frequency packets,
      // update the pending packet with the latest frequency to prevent buffer lag during fast dial rotations
      const isFreqCmd = bytes.length === 5 && (bytes[4] === this.config.frequencyOpcode || bytes[4] === 0x01);
      if (isFreqCmd && this.queue.length > 0) {
        const lastPending = this.queue[this.queue.length - 1];
        if (lastPending.bytes.length === 5 && (lastPending.bytes[4] === this.config.frequencyOpcode || lastPending.bytes[4] === 0x01)) {
          lastPending.bytes = bytes;
          lastPending.description = description;
          lastPending.resolve();
          lastPending.resolve = resolve;
          return;
        }
      }

      this.queue.push({ bytes, description, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      const { bytes, description, resolve } = item;
      const id = Math.random().toString(36).substring(2, 9);
      const timestamp = new Date().toLocaleTimeString();

      let targetBytes = bytes;
      if (this.config.invertTtl) {
        // Invert bits if software TTL inversion requested
        targetBytes = bytes.map((b) => (~b) & 0xff);
      }

      if (this.status === 'connected' && this.writer) {
        try {
          const buffer = new Uint8Array(targetBytes);
          await this.writer.write(buffer);

          this.logPacket({
            id,
            timestamp,
            direction: 'TX',
            bytes,
            hexString: bytesToHexString(bytes),
            description,
            status: 'sent',
          });
        } catch (err) {
          console.error('Error writing to serial port:', err);
          this.logPacket({
            id,
            timestamp,
            direction: 'TX',
            bytes,
            hexString: bytesToHexString(bytes),
            description: `${description} [SEND ERROR]`,
            status: 'error',
          });
        }
      } else {
        // Simulated mode
        this.logPacket({
          id,
          timestamp,
          direction: 'TX',
          bytes,
          hexString: bytesToHexString(bytes),
          description: `${description} (Simulated)`,
          status: 'simulated',
        });
      }

      resolve();

      // Pacing delay between commands so FRG-8800's vintage 8-bit CPU doesn't drop bytes
      if (this.config.packetPacingMs > 0) {
        await new Promise((r) => setTimeout(r, this.config.packetPacingMs));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Listen for incoming serial data (e.g. echo or bus response)
   */
  private async startReading(): Promise<void> {
    if (!this.port || !this.port.readable) return;
    this.isReading = true;

    try {
      this.reader = this.port.readable.getReader();
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value && value.length > 0) {
          const bytes = Array.from(value);
          this.logPacket({
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            direction: 'RX',
            bytes,
            hexString: bytesToHexString(bytes),
            description: `Received ${bytes.length} bytes from interface`,
            status: 'sent',
          });
        }
      }
    } catch (err) {
      if (this.isReading) {
        console.warn('Serial read error:', err);
      }
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch {
          // ignore
        }
        this.reader = null;
      }
    }
  }

  private setStatus(status: ConnectionStatus, message?: string): void {
    this.status = status;
    if (this.onStatusChange) {
      this.onStatusChange(status, message);
    }
  }

  private logPacket(log: CatPacketLog): void {
    if (this.onPacketLog) {
      this.onPacketLog(log);
    }
  }
}

export const serialManager = new WebSerialManager();
