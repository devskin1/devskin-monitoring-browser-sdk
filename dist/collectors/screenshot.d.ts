import { DevSkinConfig } from '../types';
import { Transport } from '../transport';
export declare class ScreenshotCollector {
    private config;
    private transport;
    private captured;
    constructor(config: DevSkinConfig, transport: Transport);
    /**
     * Capture a screenshot of the current page and send to backend
     */
    captureAndSend(sessionId: string, pageUrl: string): Promise<void>;
}
//# sourceMappingURL=screenshot.d.ts.map