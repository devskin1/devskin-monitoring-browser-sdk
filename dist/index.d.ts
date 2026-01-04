import { DevSkinConfig } from './types';
declare class DevSkinSDK {
    private config;
    private transport;
    private sessionId;
    private userId;
    private anonymousId;
    private sessionStartTime;
    private initialized;
    private heartbeatInterval;
    private deviceCollector;
    private locationCollector;
    private browserCollector;
    private performanceCollector;
    private errorCollector;
    private networkCollector;
    private heatmapCollector;
    private screenshotCollector;
    private rrwebRecorder;
    /**
     * Initialize the DevSkin SDK
     */
    init(config: DevSkinConfig): void;
    /**
     * Track a custom event
     */
    track(eventName: string, properties?: Record<string, any>): void;
    /**
     * Track a page view
     */
    trackPageView(properties?: Record<string, any>): void;
    /**
     * Identify a user
     */
    identify(userId: string, traits?: Record<string, any>): void;
    /**
     * Capture an error manually
     */
    captureError(error: Error, context?: Record<string, any>): void;
    /**
     * Add breadcrumb for debugging
     */
    addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        level?: 'info' | 'warning' | 'error';
        data?: Record<string, any>;
    }): void;
    /**
     * Start/stop session recording
     */
    startRecording(): void;
    stopRecording(): void;
    /**
     * Opt out/in
     */
    optOut(): void;
    optIn(): void;
    /**
     * Private methods
     */
    private startSession;
    private getContextData;
    private getOrCreateAnonymousId;
    private generateId;
    private setupVisibilityTracking;
    private setupUnloadTracking;
    /**
     * Start heartbeat to update session duration periodically
     */
    private startHeartbeat;
    /**
     * Update session duration
     */
    private updateSessionDuration;
}
declare const DevSkin: DevSkinSDK;
export default DevSkin;
//# sourceMappingURL=index.d.ts.map