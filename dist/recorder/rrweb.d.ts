import type { eventWithTime } from '@rrweb/types';
export interface RRWebRecorderConfig {
    enabled: boolean;
    sampleRate?: number;
    checkoutEveryNms?: number;
    checkoutEveryNth?: number;
    blockClass?: string;
    ignoreClass?: string;
    maskAllInputs?: boolean;
    maskInputOptions?: {
        password: boolean;
        email?: boolean;
        tel?: boolean;
    };
    inlineStylesheet?: boolean;
    recordCanvas?: boolean;
    collectFonts?: boolean;
}
export declare class RRWebRecorder {
    private stopFn;
    private events;
    private config;
    private sessionId;
    private onEventsReady;
    private flushInterval;
    private hasFullSnapshot;
    constructor(sessionId: string, config: RRWebRecorderConfig, onEventsReady: (events: eventWithTime[]) => void);
    start(): void;
    stop(): void;
    private flush;
    getEventCount(): number;
    isRecording(): boolean;
}
//# sourceMappingURL=rrweb.d.ts.map