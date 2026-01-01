import { DevSkinConfig, DeviceInfo } from '../types';
export declare class DeviceCollector {
    private config;
    constructor(config: DevSkinConfig);
    collect(): DeviceInfo;
    private getDeviceType;
    private getVendor;
    private getModel;
    private getOS;
    private getScreenInfo;
    private getOrientation;
    private getMemory;
    private getCores;
    private getConnection;
}
//# sourceMappingURL=device.d.ts.map