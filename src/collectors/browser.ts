import { DevSkinConfig, BrowserInfo } from '../types';

export class BrowserCollector {
  constructor(private config: DevSkinConfig) {}

  collect(): BrowserInfo {
    return {
      name: this.getBrowserName(),
      version: this.getBrowserVersion(),
      engine: this.getEngine(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: this.getDoNotTrack(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
    };
  }

  private getBrowserName(): string {
    const ua = navigator.userAgent;

    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    if (ua.includes('Trident') || ua.includes('MSIE')) return 'Internet Explorer';

    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const browserName = this.getBrowserName();

    let match: RegExpMatchArray | null = null;

    switch (browserName) {
      case 'Chrome':
        match = ua.match(/Chrome\/(\d+\.\d+)/);
        break;
      case 'Firefox':
        match = ua.match(/Firefox\/(\d+\.\d+)/);
        break;
      case 'Safari':
        match = ua.match(/Version\/(\d+\.\d+)/);
        break;
      case 'Edge':
        match = ua.match(/Edg\/(\d+\.\d+)/);
        break;
      case 'Opera':
        match = ua.match(/(Opera|OPR)\/(\d+\.\d+)/);
        if (match) return match[2];
        break;
      case 'Internet Explorer':
        match = ua.match(/(MSIE |rv:)(\d+\.\d+)/);
        if (match) return match[2];
        break;
    }

    return match && match[1] ? match[1] : '';
  }

  private getEngine(): string {
    const ua = navigator.userAgent;

    if (ua.includes('Gecko') && ua.includes('Firefox')) return 'Gecko';
    if (ua.includes('AppleWebKit')) {
      if (ua.includes('Chrome') || ua.includes('Edg')) return 'Blink';
      return 'WebKit';
    }
    if (ua.includes('Trident')) return 'Trident';

    return 'Unknown';
  }

  private getDoNotTrack(): boolean | null {
    // @ts-ignore
    const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;

    if (dnt === '1' || dnt === 'yes') return true;
    if (dnt === '0' || dnt === 'no') return false;

    return null;
  }
}
