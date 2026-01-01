import { record } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';

export interface RRWebRecorderConfig {
  enabled: boolean;
  sampleRate?: number; // Sample rate for mouse movements (0-1)
  checkoutEveryNms?: number; // Take full snapshot every N milliseconds
  checkoutEveryNth?: number; // Take full snapshot every N events
  blockClass?: string; // CSS class to block from recording
  ignoreClass?: string; // CSS class to ignore
  maskAllInputs?: boolean; // Mask all input fields
  maskInputOptions?: {
    password: boolean;
    email?: boolean;
    tel?: boolean;
  };
  inlineStylesheet?: boolean;
  recordCanvas?: boolean; // Record canvas elements
  collectFonts?: boolean; // Collect fonts for better replay
}

export class RRWebRecorder {
  private stopFn: any = null;
  private events: eventWithTime[] = [];
  private config: RRWebRecorderConfig;
  private sessionId: string;
  private onEventsReady: ((events: eventWithTime[]) => void) | null = null;
  private flushInterval: number | null = null;

  constructor(sessionId: string, config: RRWebRecorderConfig, onEventsReady: (events: eventWithTime[]) => void) {
    this.sessionId = sessionId;
    this.config = config;
    this.onEventsReady = onEventsReady;
  }

  start(): void {
    if (!this.config.enabled) {
      console.log('[RRWeb] Recording disabled in config');
      return;
    }

    if (this.stopFn) {
      console.warn('[RRWeb] Recording already started');
      return;
    }

    try {
      console.log('[RRWeb] Starting session recording:', this.sessionId);

      this.stopFn = record({
        emit: (event) => {
          this.events.push(event);

          // Flush events periodically to avoid memory buildup
          if (this.events.length >= 50) {
            this.flush();
          }
        },
        // Configuration options
        sampling: {
          // Mouse interactions
          mousemove: this.config.sampleRate !== undefined
            ? Math.floor(100 / this.config.sampleRate)
            : true,
          // Mouse interactions
          mouseInteraction: true,
          // Scroll events
          scroll: 150, // Throttle scroll events to every 150ms
          // Media (video/audio)
          media: 800,
          // Input events
          input: 'last', // Only record last input value per time interval
        },
        // Take full snapshots periodically
        checkoutEveryNms: this.config.checkoutEveryNms || 5 * 60 * 1000, // Every 5 minutes
        checkoutEveryNth: this.config.checkoutEveryNth || 200, // Every 200 events
        // Privacy settings
        blockClass: this.config.blockClass || 'rr-block',
        ignoreClass: this.config.ignoreClass || 'rr-ignore',
        maskAllInputs: this.config.maskAllInputs !== undefined ? this.config.maskAllInputs : true,
        maskInputOptions: this.config.maskInputOptions || {
          password: true,
          email: true,
          tel: true,
        },
        maskTextClass: 'rr-mask',
        // Performance
        inlineStylesheet: this.config.inlineStylesheet !== undefined ? this.config.inlineStylesheet : true,
        recordCanvas: this.config.recordCanvas || false,
        collectFonts: this.config.collectFonts !== undefined ? this.config.collectFonts : true,
        // Capture iframe content
        recordCrossOriginIframes: false, // Security: don't record cross-origin iframes
      });

      // Set up periodic flush (every 10 seconds)
      this.flushInterval = window.setInterval(() => {
        if (this.events.length > 0) {
          this.flush();
        }
      }, 10000);

      console.log('[RRWeb] Recording started successfully');
    } catch (error) {
      console.error('[RRWeb] Failed to start recording:', error);
    }
  }

  stop(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
      console.log('[RRWeb] Recording stopped');
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining events
    if (this.events.length > 0) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    if (this.onEventsReady) {
      this.onEventsReady(eventsToSend);
    }
  }

  getEventCount(): number {
    return this.events.length;
  }

  isRecording(): boolean {
    return this.stopFn !== null;
  }
}
