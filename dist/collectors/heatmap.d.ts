import { DevSkinConfig } from '../types';
import { Transport } from '../transport';
export declare class HeatmapCollector {
    private config;
    private transport;
    private anonymousId;
    private sessionId;
    private clickData;
    private scrollData;
    private mouseMoveData;
    private maxScrollDepth;
    private flushInterval;
    private mouseMoveSampling;
    constructor(config: DevSkinConfig, transport: Transport, anonymousId: string, sessionId: string);
    start(): void;
    stop(): void;
    private trackClicks;
    private trackScrollDepth;
    private trackMouseMovement;
    private flush;
    private getElementSelector;
}
//# sourceMappingURL=heatmap.d.ts.map