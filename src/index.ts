import { DevSkinConfig, EventData, UserData } from './types';
import { DeviceCollector } from './collectors/device';
import { LocationCollector } from './collectors/location';
import { BrowserCollector } from './collectors/browser';
import { PerformanceCollector } from './collectors/performance';
import { ErrorCollector } from './collectors/error';
import { NetworkCollector } from './collectors/network';
import { HeatmapCollector } from './collectors/heatmap';
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
  private initialized = false;

  // Collectors
  private deviceCollector: DeviceCollector | null = null;
  private locationCollector: LocationCollector | null = null;
  private browserCollector: BrowserCollector | null = null;
  private performanceCollector: PerformanceCollector | null = null;
  private errorCollector: ErrorCollector | null = null;
  private networkCollector: NetworkCollector | null = null;
  private heatmapCollector: HeatmapCollector | null = null;
  // private sessionRecorder: SessionRecorder | null = null; // Replaced by RRWebRecorder
  private rrwebRecorder: RRWebRecorder | null = null;

  /**
   * Initialize the DevSkin SDK
   */
  init(config: DevSkinConfig): void {
    if (this.initialized) {
      console.warn('[DevSkin] SDK already initialized');
      return;
    }

    this.config = {
      debug: false,
      captureWebVitals: true,
      captureNetworkRequests: true,
      captureErrors: true,
      captureUserAgent: true,
      captureLocation: true,
      captureDevice: true,
      ...config,
    };

    if (this.config.debug) {
      console.log('[DevSkin] Initializing SDK with config:', this.config);
    }

    // Initialize transport
    this.transport = new Transport(this.config);

    // Generate anonymous ID if not exists
    this.anonymousId = this.getOrCreateAnonymousId();

    // Start session
    this.startSession();

    // Initialize collectors
    this.deviceCollector = new DeviceCollector(this.config);
    this.locationCollector = new LocationCollector(this.config);
    this.browserCollector = new BrowserCollector(this.config);

    if (this.config.captureWebVitals) {
      this.performanceCollector = new PerformanceCollector(this.config, this.transport);
      this.performanceCollector.start();
    }

    if (this.config.captureErrors) {
      this.errorCollector = new ErrorCollector(this.config, this.transport);
      this.errorCollector.start();
    }

    if (this.config.captureNetworkRequests) {
      this.networkCollector = new NetworkCollector(this.config, this.transport);
      this.networkCollector.start();
    }

    // Initialize heatmap collector
    if (this.config.heatmapOptions?.enabled) {
      this.heatmapCollector = new HeatmapCollector(this.config, this.transport);
      this.heatmapCollector.start();
    }

    // Initialize session recording with rrweb
    if (this.config.sessionRecording?.enabled) {
      // Use RRWebRecorder for complete DOM recording
      this.rrwebRecorder = new RRWebRecorder(
        this.sessionId!,
        {
          enabled: true,
          sampleRate: this.config.sessionRecording.sampling || 0.5,
          blockClass: 'rr-block',
          ignoreClass: this.config.sessionRecording.ignoreClass || 'rr-ignore',
          maskAllInputs: this.config.sessionRecording.maskAllInputs !== undefined
            ? this.config.sessionRecording.maskAllInputs
            : true,
          maskInputOptions: {
            password: true,
            email: true,
            tel: true,
          },
          recordCanvas: this.config.sessionRecording.recordCanvas || false,
          collectFonts: true,
          inlineStylesheet: true,
          checkoutEveryNms: 5 * 60 * 1000, // Every 5 minutes
          checkoutEveryNth: 200, // Every 200 events
        },
        (events: eventWithTime[]) => {
          // Send rrweb events to backend
          this.transport?.sendRecordingEvents(this.sessionId!, events);
        }
      );
      this.rrwebRecorder.start();

      if (this.config.debug) {
        console.log('[DevSkin] RRWeb recording started for session:', this.sessionId);
      }
    }

    // Track initial page view
    this.trackPageView();

    // Track page visibility changes
    this.setupVisibilityTracking();

    // Track page unload
    this.setupUnloadTracking();

    this.initialized = true;

    if (this.config.debug) {
      console.log('[DevSkin] SDK initialized successfully');
    }
  }

  /**
   * Track a custom event
   */
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.initialized) {
      console.warn('[DevSkin] SDK not initialized. Call init() first.');
      return;
    }

    const eventData: EventData = {
      event_name: eventName,
      event_type: 'track',
      timestamp: new Date().toISOString(),
      session_id: this.sessionId!,
      user_id: this.userId || undefined,
      anonymous_id: this.anonymousId || undefined,
      properties: {
        ...properties,
        ...this.getContextData(),
      },
      page_url: window.location.href,
      page_title: document.title,
    };

    this.transport?.sendEvent(eventData);

    if (this.config?.debug) {
      console.log('[DevSkin] Event tracked:', eventData);
    }
  }

  /**
   * Track a page view
   */
  trackPageView(properties?: Record<string, any>): void {
    this.track('page_view', {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer,
      ...properties,
    });
  }

  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.initialized) {
      console.warn('[DevSkin] SDK not initialized. Call init() first.');
      return;
    }

    this.userId = userId;

    const userData: UserData = {
      user_id: userId,
      anonymous_id: this.anonymousId || undefined,
      traits: {
        ...traits,
        ...this.getContextData(),
      },
      session_id: this.sessionId!,
      timestamp: new Date().toISOString(),
    };

    this.transport?.identifyUser(userData);

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
  private startSession(): void {
    this.sessionId = this.generateId();
    const sessionData = {
      session_id: this.sessionId,
      user_id: this.userId || undefined,
      anonymous_id: this.anonymousId!,
      started_at: new Date().toISOString(),
      ...this.getContextData(),
    };

    this.transport?.startSession(sessionData);
  }

  private getContextData(): Record<string, any> {
    const context: Record<string, any> = {};

    if (this.deviceCollector) {
      context.device = this.deviceCollector.collect();
    }

    if (this.browserCollector) {
      context.browser = this.browserCollector.collect();
    }

    if (this.locationCollector) {
      context.location = this.locationCollector.collect();
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
    window.addEventListener('beforeunload', () => {
      this.track('page_unload');
      // Send any pending data
      this.transport?.flush();
    });
  }
}

// Create singleton instance
const DevSkin = new DevSkinSDK();

// Export as default and named export
export default DevSkin;
export { DevSkin };
