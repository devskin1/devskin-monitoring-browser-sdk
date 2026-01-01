import { DevSkinConfig } from '../types';
import { Transport } from '../transport';
export declare class NetworkCollector {
    private config;
    private transport;
    constructor(config: DevSkinConfig, transport: Transport);
    start(): void;
    private interceptFetch;
    private interceptXHR;
    private shouldIgnoreUrl;
    private getResponseSize;
    private headersToObject;
    private parseResponseHeaders;
}
//# sourceMappingURL=network.d.ts.map