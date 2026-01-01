import { DevSkinConfig, BrowserInfo } from '../types';
export declare class BrowserCollector {
    private config;
    constructor(config: DevSkinConfig);
    collect(): BrowserInfo;
    private getBrowserName;
    private getBrowserVersion;
    private getEngine;
    private getDoNotTrack;
}
//# sourceMappingURL=browser.d.ts.map