import { DevSkinConfig } from '../types';
import { Transport } from '../transport';
export declare class HeatmapCollector {
    private config;
    private transport;
    private clickData;
    private scrollData;
    private mouseMoveData;
    private maxScrollDepth;
    private flushInterval;
    private mouseMoveSampling;
    constructor(config: DevSkinConfig, transport: Transport);
    start(): void;
    stop(): void;
    private trackClicks;
    private trackScrollDepth;
    private trackMouseMovement;
    private flush;
    private getElementSelector;
}
//# sourceMappingURL=heatmap.d.ts.map