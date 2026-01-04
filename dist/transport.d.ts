import { DevSkinConfig, EventData, UserData, SessionData, NetworkRequest, ErrorData } from './types';
import type { eventWithTime } from '@rrweb/types';
export declare class Transport {
    private config;
    private queue;
    private flushInterval;
    private readonly maxQueueSize;
    private readonly flushIntervalMs;
    private readonly apiUrl;
    private sessionId;
    constructor(config: DevSkinConfig);
    setSessionId(sessionId: string): void;
    sendEvent(event: EventData): void;
    identifyUser(user: UserData): void;
    startSession(session: SessionData, useBeacon?: boolean): Promise<void>;
    sendError(error: ErrorData): void;
    sendNetworkRequest(request: NetworkRequest): void;
    sendPerformanceMetric(metric: any): void;
    sendPageView(pageViewData: any): Promise<void>;
    sendRecordingEvents(sessionId: string, events: eventWithTime[]): Promise<void>;
    sendHeatmapData(heatmapData: any): void;
    sendScreenshot(screenshotData: any): Promise<void>;
    flush(useBeacon?: boolean): void;
    private enqueue;
    private startPeriodicFlush;
    private getEndpointForType;
    private sendToBackendXHR;
    private sendToBackend;
    destroy(): void;
}
//# sourceMappingURL=transport.d.ts.map