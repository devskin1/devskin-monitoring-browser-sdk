import { DevSkinConfig } from '../types';
import { Transport } from '../transport';
import { eventWithTime } from 'rrweb';
export declare class SessionRecorder {
    private config;
    private transport;
    private stopRecording;
    private events;
    private isRecording;
    private flushInterval;
    constructor(config: DevSkinConfig, transport: Transport);
    start(): void;
    stop(): void;
    private flush;
    getEvents(): eventWithTime[];
    isActive(): boolean;
}
//# sourceMappingURL=session.d.ts.map