import { DevSkinConfig, LocationInfo } from '../types';
export declare class LocationCollector {
    private config;
    private geoData;
    constructor(config: DevSkinConfig);
    collect(): LocationInfo;
    private requestGeolocation;
    private reverseGeocode;
}
//# sourceMappingURL=location.d.ts.map