import { DevSkinConfig, EventData, UserData, SessionData, NetworkRequest, ErrorData } from './types';
import type { eventWithTime } from '@rrweb/types';
export declare class Transport {
    private config;
    private queue;
    private flushInterval;
    private readonly maxQueueSize;
    private readonly flushIntervalMs;
    private readonly apiUrl;
    constructor(config: DevSkinConfig);
    sendEvent(event: EventData): void;
    identifyUser(user: UserData): void;
    startSession(session: SessionData): void;
    sendError(error: ErrorData): void;
    sendNetworkRequest(request: NetworkRequest): void;
    sendPerformanceMetric(metric: any): void;
    sendRecordingEvents(sessionId: string, events: eventWithTime[]): void;
    sendHeatmapData(heatmapData: any): void;
    flush(useBeacon?: boolean): void;
    private enqueue;
    private startPeriodicFlush;
    private getEndpointForType;
    private sendToBackend;
    destroy(): void;
}
//# sourceMappingURL=transport.d.ts.map