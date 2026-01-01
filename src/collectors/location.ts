import { DevSkinConfig, LocationInfo } from '../types';

export class LocationCollector {
  private geoData: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  } | null = null;

  constructor(private config: DevSkinConfig) {
    if (this.config.captureLocation) {
      this.requestGeolocation();
    }
  }

  collect(): LocationInfo {
    return {
      url: window.location.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      protocol: window.location.protocol,
      port: window.location.port,
      referrer: document.referrer,
      ...this.geoData,
    };
  }

  private async requestGeolocation(): Promise<void> {
    try {
      // Try to get approximate location from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.geoData = { timezone };

      // Try to get precise geolocation (requires user permission)
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.geoData = {
              ...this.geoData,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            // Try to reverse geocode (if API available)
            this.reverseGeocode(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            if (this.config.debug) {
              console.log('[DevSkin] Geolocation permission denied or error:', error);
            }
          },
          {
            timeout: 5000,
            maximumAge: 600000, // 10 minutes
          }
        );
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[DevSkin] Error requesting geolocation:', error);
      }
    }
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<void> {
    try {
      // Use a free geocoding service (you can replace with your own)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DevSkin-SDK/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          this.geoData = {
            ...this.geoData,
            country: data.address.country,
            region: data.address.state || data.address.region,
            city: data.address.city || data.address.town || data.address.village,
          };
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[DevSkin] Error reverse geocoding:', error);
      }
    }
  }
}
