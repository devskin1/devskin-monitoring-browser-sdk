import { record } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import type { listenerHandler } from '@rrweb/types';

export interface RRWebRecorderConfig {
  enabled: boolean;
  mouseMoveSampleRate?: number; // Throttle rate for mouse movements (0-1), e.g. 0.1 = capture 10% of mouse moves
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
  private hasFullSnapshot: boolean = false;
  private sessionStartTime: number = 0; // Session start time (for relative timestamps)
  private recordingStartTime: number = 0; // When this recorder instance started

  constructor(sessionId: string, config: RRWebRecorderConfig, onEventsReady: (events: eventWithTime[]) => void, sessionStartTime: number = 0) {
    this.sessionId = sessionId;
    this.config = config;
    this.onEventsReady = onEventsReady;
    this.sessionStartTime = sessionStartTime || Date.now();
    this.recordingStartTime = Date.now();

    console.log(`[RRWeb] Recording initialized - session started at ${this.sessionStartTime}, recording started at ${this.recordingStartTime}`);
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
      this.stopFn = record({
        emit: (event) => {
          // Convert absolute timestamps to relative to session start
          // This ensures continuity across page navigations within same session
          const originalTimestamp = event.timestamp;
          event.timestamp = event.timestamp - this.sessionStartTime;

          if (this.config.enabled && event.type === 2) {
            console.log(`[RRWeb] FullSnapshot - original: ${originalTimestamp}, relative: ${event.timestamp}, session start: ${this.sessionStartTime}`);
          }

          this.events.push(event);

          // Check if this is a FullSnapshot (type 2)
          if (event.type === 2) {
            this.hasFullSnapshot = true;
            // Send immediately to ensure FullSnapshot reaches backend first
            this.flush();
          } else if (this.hasFullSnapshot && this.events.length >= 20) {
            // After FullSnapshot, batch other events (reduced from 50 to 20)
            this.flush();
          }
        },
        // Configuration options
        sampling: {
          // Mouse movement sampling - throttle to reduce bandwidth
          // e.g. 0.1 = capture 10% of mouse movements (Math.floor(1/0.1) = 10, meaning capture 1 every 10 events)
          mousemove: this.config.mouseMoveSampleRate !== undefined
            ? Math.max(1, Math.floor(1 / this.config.mouseMoveSampleRate))
            : 10, // Default: capture 1 every 10 mouse movements (10%)
          // Mouse interactions (clicks, etc) - always capture
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

      // Set up periodic flush (every 2 seconds)
      // Only flush if we have FullSnapshot to ensure first batch is complete
      this.flushInterval = window.setInterval(() => {
        if (this.hasFullSnapshot && this.events.length > 0) {
          this.flush();
        }
      }, 2000); // Reduced from 10s to 2s

      // Safety check: After 2 seconds, force a full snapshot if none captured
      setTimeout(() => {
        if (!this.hasFullSnapshot) {
          // Try to force a full snapshot using rrweb's API
          try {
            record.takeFullSnapshot();
          } catch (error) {
            // If we have events but no FullSnapshot, flush anyway to not lose data
            if (this.events.length > 0) {
              this.hasFullSnapshot = true; // Set to true to allow flushing
              this.flush();
            }
          }
        }
      }, 2000);
    } catch (error) {
      console.error('[RRWeb] Failed to start recording:', error);
    }
  }

  stop(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
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
