import { DevSkinConfig, PerformanceMetrics } from '../types';
import { Transport } from '../transport';
export declare class PerformanceCollector {
    private config;
    private transport;
    private metrics;
    constructor(config: DevSkinConfig, transport: Transport);
    start(): void;
    private handleMetric;
    private collectNavigationTimings;
    private collectResourceTimings;
    private observeLongTasks;
    getMetrics(): PerformanceMetrics;
}
//# sourceMappingURL=performance.d.ts.map