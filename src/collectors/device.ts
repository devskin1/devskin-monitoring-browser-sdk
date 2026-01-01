import { DevSkinConfig, DeviceInfo } from '../types';

export class DeviceCollector {
  constructor(private config: DevSkinConfig) {}

  collect(): DeviceInfo {
    return {
      type: this.getDeviceType(),
      vendor: this.getVendor(),
      model: this.getModel(),
      os: this.getOS(),
      screen: this.getScreenInfo(),
      memory: this.getMemory(),
      cores: this.getCores(),
      connection: this.getConnection(),
    };
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
    const ua = navigator.userAgent;

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    if (ua.includes('Windows') || ua.includes('Macintosh') || ua.includes('Linux')) {
      return 'desktop';
    }

    return 'unknown';
  }

  private getVendor(): string | undefined {
    return navigator.vendor || undefined;
  }

  private getModel(): string | undefined {
    const ua = navigator.userAgent;

    // Try to extract model from user agent
    const modelMatch = ua.match(/\(([^)]+)\)/);
    if (modelMatch && modelMatch[1]) {
      return modelMatch[1];
    }

    return undefined;
  }

  private getOS(): { name: string; version: string } {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = '';

    if (ua.includes('Win')) {
      name = 'Windows';
      if (ua.includes('Windows NT 10.0')) version = '10';
      else if (ua.includes('Windows NT 6.3')) version = '8.1';
      else if (ua.includes('Windows NT 6.2')) version = '8';
      else if (ua.includes('Windows NT 6.1')) version = '7';
    } else if (ua.includes('Mac')) {
      name = 'macOS';
      const match = ua.match(/Mac OS X (\d+[._]\d+[._]\d+)?/);
      if (match && match[1]) {
        version = match[1].replace(/_/g, '.');
      }
    } else if (ua.includes('X11') || ua.includes('Linux')) {
      name = 'Linux';
    } else if (ua.includes('Android')) {
      name = 'Android';
      const match = ua.match(/Android (\d+\.?\d*)/);
      if (match && match[1]) {
        version = match[1];
      }
    } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
      name = 'iOS';
      const match = ua.match(/OS (\d+_\d+(_\d+)?)/);
      if (match && match[1]) {
        version = match[1].replace(/_/g, '.');
      }
    }

    return { name, version };
  }

  private getScreenInfo() {
    return {
      width: window.screen.width,
      height: window.screen.height,
      orientation: this.getOrientation(),
      pixelRatio: window.devicePixelRatio || 1,
    };
  }

  private getOrientation(): string {
    if (window.screen.orientation) {
      return window.screen.orientation.type;
    }
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  private getMemory(): number | undefined {
    // @ts-ignore
    return navigator.deviceMemory;
  }

  private getCores(): number | undefined {
    return navigator.hardwareConcurrency;
  }

  private getConnection() {
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!connection) return undefined;

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
}
