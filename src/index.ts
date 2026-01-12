import { DevSkinConfig, EventData, UserData } from './types';
import { DeviceCollector } from './collectors/device';
import { LocationCollector } from './collectors/location';
import { BrowserCollector } from './collectors/browser';
import { PerformanceCollector } from './collectors/performance';
import { ErrorCollector } from './collectors/error';
import { NetworkCollector } from './collectors/network';
import { HeatmapCollector } from './collectors/heatmap';
import { ScreenshotCollector } from './collectors/screenshot';
// import { SessionRecorder } from './recorder/session'; // Replaced by RRWebRecorder
import { RRWebRecorder } from './recorder/rrweb';
import { Transport } from './transport';
import type { eventWithTime } from '@rrweb/types';

class DevSkinSDK {
  private config: DevSkinConfig | null = null;
  private transport: Transport | null = null;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private anonymousId: string | null = null;
  private sessionStartTime: number = 0;
  private initialized = false;
  private initializing = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Collectors
  private deviceCollector: DeviceCollector | null = null;
  private locationCollector: LocationCollector | null = null;
  private browserCollector: BrowserCollector | null = null;
  private performanceCollector: PerformanceCollector | null = null;
  private errorCollector: ErrorCollector | null = null;
  private networkCollector: NetworkCollector | null = null;
  private heatmapCollector: HeatmapCollector | null = null;
  private screenshotCollector: ScreenshotCollector | null = null;
  // private sessionRecorder: SessionRecorder | null = null; // Replaced by RRWebRecorder
  private rrwebRecorder: RRWebRecorder | null = null;

  /**
   * Initialize the DevSkin SDK
   * Uses requestIdleCallback to defer heavy initialization without blocking the page
   */
  init(config: DevSkinConfig): void {
    if (this.initialized || this.initializing) {
      console.warn('[DevSkin] SDK already initialized or initializing');
      return;
    }

    // Mark as initializing to prevent duplicate init() calls
    this.initializing = true;

    this.config = {
      debug: false,
      captureWebVitals: true,
      captureNetworkRequests: true,
      captureErrors: true,
      captureUserAgent: true,
      captureLocation: true,
      captureDevice: true,
      heatmapOptions: {
        enabled: true,
        trackClicks: true,
        trackScroll: true,
        trackMouseMovement: false, // Disabled by default to avoid too much data
      },
      ...config,
    };

    if (this.config.debug) {
      console.log('[DevSkin] Initializing SDK with config:', this.config);
    }


    // Initialize lightweight components immediately (needed for session context)
    this.transport = new Transport(this.config);
    this.anonymousId = this.getOrCreateAnonymousId();
    this.deviceCollector = new DeviceCollector(this.config);
    this.locationCollector = new LocationCollector(this.config);
    this.browserCollector = new BrowserCollector(this.config);

    // Defer heavy initialization to avoid blocking page load/rendering
    const initHeavyCollectors = () => {
      // Start session (will now include device/browser/location data)
      // Wait for session creation to complete before starting collectors
      this.startSession().then(() => {
      // Session created, now safe to start collectors that send data

      if (this.config!.captureWebVitals) {
        this.performanceCollector = new PerformanceCollector(this.config!, this.transport!);
        this.performanceCollector.start();
      }

      if (this.config!.captureErrors) {
        this.errorCollector = new ErrorCollector(this.config!, this.transport!);
        this.errorCollector.start();
      }

      if (this.config!.captureNetworkRequests) {
        this.networkCollector = new NetworkCollector(this.config!, this.transport!);
        this.networkCollector.start();
      }

      // Initialize heatmap collector - SEMPRE habilitado
      // Merge default heatmap config with user config
      const heatmapConfig = {
        enabled: true,
        trackClicks: true,
        trackScroll: true,
        trackMouseMovement: true, // SEMPRE habilitado
        mouseMoveSampling: 0.1, // Sample 10% dos movimentos
        ...this.config!.heatmapOptions,
      };

      this.config!.heatmapOptions = heatmapConfig;
      this.heatmapCollector = new HeatmapCollector(
        this.config!,
        this.transport!,
        this.anonymousId!,
        this.sessionId!
      );
      this.heatmapCollector.start();

      // Initialize screenshot collector and capture page
      this.screenshotCollector = new ScreenshotCollector(this.config!, this.transport!);
      this.screenshotCollector.captureAndSend(this.sessionId!, window.location.href);

      if (this.config!.debug) {
        console.log('[DevSkin] Heatmap collection enabled (always on)');
      }

      // Initialize session recording with rrweb
      if (this.config!.sessionRecording?.enabled) {
        // Use RRWebRecorder for complete DOM recording
        // Pass sessionStartTime to ensure timestamp continuity across page navigations
        this.rrwebRecorder = new RRWebRecorder(
          this.sessionId!,
          {
            enabled: true,
            sampleRate: this.config!.sessionRecording.sampling || 0.5,
            blockClass: 'rr-block',
            ignoreClass: this.config!.sessionRecording.ignoreClass || 'rr-ignore',
            maskAllInputs: this.config!.sessionRecording.maskAllInputs !== undefined
              ? this.config!.sessionRecording.maskAllInputs
              : true,
            maskInputOptions: {
              password: true,
              email: true,
              tel: true,
            },
            recordCanvas: this.config!.sessionRecording.recordCanvas || false,
            collectFonts: true,
            inlineStylesheet: true,
            checkoutEveryNms: 5 * 60 * 1000, // Every 5 minutes
            checkoutEveryNth: 200, // Every 200 events
          },
          (events: eventWithTime[]) => {
            // Send rrweb events to backend
            this.transport?.sendRecordingEvents(this.sessionId!, events);
          },
          this.sessionStartTime // Pass session start time for timestamp continuity
        );

        // Start recording immediately (session already created)
        this.rrwebRecorder.start();

        if (this.config?.debug) {
          console.log('[DevSkin] RRWeb recording started for session:', this.sessionId);
        }
      }

        // Track initial page view
        this.trackPageView();

        // Start heartbeat to update session duration every 30 seconds
        this.startHeartbeat();
      }).catch((err) => {
        console.error('[DevSkin] Failed to create session:', err);
      });

      // Track page visibility changes
      this.setupVisibilityTracking();

      // Track page unload
      this.setupUnloadTracking();

      // Mark as fully initialized only after everything is loaded
      this.initialized = true;
      this.initializing = false;
    };

    // Use requestIdleCallback to defer heavy initialization (non-blocking)
    // Falls back to setTimeout for browsers that don't support it
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(initHeavyCollectors, { timeout: 2000 });
      } else {
        // Fallback for older browsers
        setTimeout(initHeavyCollectors, 1);
      }
    } else {
      // Node.js environment (SSR)
      initHeavyCollectors();
    }

    if (this.config.debug) {
      console.log('[DevSkin] SDK initialization started (heavy collectors loading in background)');
    }
  }

  /**
   * Track a custom event
   * Works immediately after init() even if heavy collectors are still loading
   */
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.transport) {
      console.warn('[DevSkin] SDK not initialized. Call init() first.');
      return;
    }

    const eventData: EventData = {
      eventName: eventName,
      eventType: 'track',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId ?? undefined,
      userId: this.userId ?? undefined,
      anonymousId: this.anonymousId ?? undefined,
      properties: {
        ...properties,
        ...this.getContextData(),
      },
      pageUrl: window.location.href,
      pageTitle: document.title,
    };

    this.transport.sendEvent(eventData);

    if (this.config?.debug) {
      console.log('[DevSkin] Event tracked:', eventData);
    }
  }

  /**
   * Track a page view
   */
  trackPageView(properties?: Record<string, any>): void {
    if (!this.initialized) {
      console.warn('[DevSkin] SDK not initialized. Call init() first.');
      return;
    }

    // Generate unique page view ID
    const pageViewId = this.generateId();

    // Send to RUM page-views endpoint
    this.transport?.sendPageView({
      sessionId: this.sessionId!,
      pageViewId: pageViewId,
      url: window.location.href,
      path: window.location.pathname,
      queryParams: window.location.search,
      referrer: document.referrer,
      title: document.title,
      timestamp: new Date().toISOString(),
      ...properties,
    });

    // Also track as analytics event for backwards compatibility
    this.track('page_view', {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer,
      ...properties,
    });

    if (this.config?.debug) {
      console.log('[DevSkin] Page view tracked:', {
        sessionId: this.sessionId,
        pageViewId: pageViewId,
        url: window.location.href,
      });
    }
  }

  /**
   * Identify a user
   * Works immediately after init() even if heavy collectors are still loading
   */
  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.transport) {
      console.warn('[DevSkin] SDK not initialized. Call init() first.');
      return;
    }

    this.userId = userId;

    const userData: UserData = {
      userId: userId,
      anonymousId: this.anonymousId ?? undefined,
      traits: {
        ...traits,
        ...this.getContextData(),
      },
      sessionId: this.sessionId ?? undefined,
      timestamp: new Date().toISOString(),
    };

    this.transport.identifyUser(userData);

    if (this.config?.debug) {
      console.log('[DevSkin] User identified:', userData);
    }
  }

  /**
   * Capture an error manually
   */
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.initialized) {
      console.warn('[DevSkin] SDK not initialized. Call init() first.');
      return;
    }

    this.errorCollector?.captureError(error, {
      ...context,
      session_id: this.sessionId!,
      user_id: this.userId || undefined,
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }): void {
    if (!this.initialized) return;
    this.errorCollector?.addBreadcrumb(breadcrumb);
  }

  /**
   * Start/stop session recording
   */
  startRecording(): void {
    this.rrwebRecorder?.start();
  }

  stopRecording(): void {
    this.rrwebRecorder?.stop();
  }

  /**
   * Opt out/in
   */
  optOut(): void {
    localStorage.setItem('devskin_opt_out', 'true');
    this.initialized = false;
  }

  optIn(): void {
    localStorage.removeItem('devskin_opt_out');
  }

  /**
   * Private methods
   */
  private async startSession(): Promise<void> {
    // Check if there's an active session (stored in sessionStorage to persist across page navigations)
    const existingSessionId = sessionStorage.getItem('devskin_session_id');
    const existingSessionStart = sessionStorage.getItem('devskin_session_start');

    if (existingSessionId && existingSessionStart) {
      // Resume existing session
      this.sessionId = existingSessionId;
      this.sessionStartTime = parseInt(existingSessionStart, 10);

      // Set sessionId in transport so it can be added to network/performance requests
      this.transport?.setSessionId(this.sessionId);

      if (this.config?.debug) {
        console.log('[DevSkin] Resuming existing session:', this.sessionId);
      }

      // Send page view but DON'T create a new session
      // The session is already created, just continue it
      return;
    }

    // Create new session
    this.sessionId = this.generateId();
    this.sessionStartTime = Date.now();

    // Store in sessionStorage (persists across page navigations in same tab)
    sessionStorage.setItem('devskin_session_id', this.sessionId);
    sessionStorage.setItem('devskin_session_start', this.sessionStartTime.toString());

    // Set sessionId in transport so it can be added to network/performance requests
    this.transport?.setSessionId(this.sessionId);

    const sessionData = {
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      anonymousId: this.anonymousId!,
      startedAt: new Date().toISOString(),
      platform: 'web',
      ...this.getContextData(),
    };

    // CRITICAL: Await session creation to ensure it exists before sending metrics/requests
    await this.transport?.startSession(sessionData);

    if (this.config?.debug) {
      console.log('[DevSkin] New session created:', this.sessionId);
    }
  }

  private getContextData(): Record<string, any> {
    const context: Record<string, any> = {};

    // Flatten device data to match backend schema
    if (this.deviceCollector) {
      const device = this.deviceCollector.collect();
      context.deviceType = device.type;
      context.deviceModel = device.model;
      context.osName = device.os?.name;
      context.osVersion = device.os?.version;
      context.screenWidth = device.screen?.width;
      context.screenHeight = device.screen?.height;
      context.viewportWidth = window.innerWidth;
      context.viewportHeight = window.innerHeight;
    }

    // Flatten browser data to match backend schema
    if (this.browserCollector) {
      const browser = this.browserCollector.collect();
      context.browserName = browser.name;
      context.browserVersion = browser.version;
      context.userAgent = browser.userAgent;
    }

    // Flatten location data to match backend schema
    if (this.locationCollector) {
      const location = this.locationCollector.collect();
      context.country = location.country;
      context.city = location.city;
      context.ipAddress = undefined; // Will be set by backend from request
    }

    return context;
  }

  private getOrCreateAnonymousId(): string {
    let id = localStorage.getItem('devskin_anonymous_id');
    if (!id) {
      id = this.generateId();
      localStorage.setItem('devskin_anonymous_id', id);
    }
    return id;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden');
      } else {
        this.track('page_visible');
      }
    });
  }

  private setupUnloadTracking(): void {
    // CRITICAL: Flush data BEFORE page unloads to avoid losing final events
    // IMPORTANT: NEVER clear sessionStorage - it expires naturally when tab closes

    // 1. visibilitychange - fires when tab is hidden (most reliable)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User switched tabs or minimized - update duration and flush
        this.updateSessionDuration();
        this.rrwebRecorder?.stop(); // Stop recording and flush
        this.transport?.flush(true); // Use beacon
      }
    });

    // 2. pagehide - fires when page is being unloaded
    window.addEventListener('pagehide', () => {
      // Track navigation (we can't distinguish between page navigation and tab close reliably)
      this.track('page_navigation');

      // Update duration but DON'T mark as ending (let heartbeat timeout handle session expiry)
      this.updateSessionDuration(false);

      // NEVER clear sessionStorage - it persists across navigations in same tab
      // and expires automatically when tab actually closes

      // Flush data before page unloads
      this.rrwebRecorder?.stop(); // Stop recording and flush remaining events
      this.transport?.flush(true); // Use beacon for reliability
    });

    // 3. beforeunload - backup for older browsers
    window.addEventListener('beforeunload', () => {
      // Update duration but DON'T mark as ending
      this.updateSessionDuration(false);
      this.rrwebRecorder?.stop();
      this.transport?.flush(true);
    });
  }

  /**
   * Start heartbeat to update session duration periodically
   */
  private startHeartbeat(): void {
    // Update duration every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updateSessionDuration();
    }, 30000); // 30 seconds
  }

  /**
   * Update session duration
   */
  private updateSessionDuration(isEnding = false): void {
    if (!this.sessionId || !this.sessionStartTime) return;

    const durationMs = Date.now() - this.sessionStartTime;
    const payload: any = {
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      anonymousId: this.anonymousId!,
      durationMs: durationMs,
      platform: 'web',
      ...this.getContextData(),
    };

    if (isEnding) {
      payload.endedAt = new Date().toISOString();
    }

    // Use beacon if ending, otherwise regular request
    this.transport?.startSession(payload, isEnding);

    if (this.config?.debug) {
      console.log('[DevSkin] Session duration updated:', durationMs, 'ms', isEnding ? '(ending)' : '');
    }
  }
}

// Create singleton instance
const DevSkin = new DevSkinSDK();

// Export as default only for UMD compatibility
export default DevSkin;
