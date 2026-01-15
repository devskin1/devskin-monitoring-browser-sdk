import {
  DevSkinConfig,
  EventData,
  UserData,
  SessionData,
  NetworkRequest,
  ErrorData,
} from './types';
import type { eventWithTime } from '@rrweb/types';

interface QueuedItem {
  type: 'event' | 'session' | 'error' | 'network' | 'performance' | 'recording' | 'heatmap';
  data: any;
  timestamp: number;
}

export class Transport {
  private queue: QueuedItem[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly maxQueueSize = 20; // Reduced from 50
  private readonly flushIntervalMs = 2000; // 2 seconds (reduced from 5s)
  private readonly apiUrl: string;
  private sessionId: string | null = null;

  constructor(private config: DevSkinConfig) {
    this.apiUrl = config.apiUrl || 'https://api.devskin.com';

    // Start periodic flush
    this.startPeriodicFlush();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });

      // Also use sendBeacon if available for more reliable unload
      window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flush(true);
        }
      });
    }
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  sendEvent(event: EventData): void {
    this.enqueue('event', event);
  }

  identifyUser(user: UserData): void {
    // Send user identification immediately (don't queue)
    this.sendToBackend('/v1/analytics/identify', user);
  }

  async startSession(session: SessionData, useBeacon = false): Promise<void> {
    // Send session start immediately to RUM endpoint
    // MUST await to ensure session is created before other requests
    // Use beacon for page unload events (more reliable)
    await this.sendToBackend('/v1/rum/sessions', session, useBeacon);
  }

  sendError(error: ErrorData): void {
    this.enqueue('error', error);
  }

  sendNetworkRequest(request: NetworkRequest): void {
    this.enqueue('network', request);
  }

  sendPerformanceMetric(metric: any): void {
    this.enqueue('performance', metric);
  }

  async sendPageView(pageViewData: any): Promise<void> {
    // Send page view immediately to RUM endpoint (don't queue)
    this.sendToBackend('/v1/rum/page-views', pageViewData);
  }

  async sendRecordingEvents(sessionId: string, events: eventWithTime[]): Promise<void> {
    // Calculate payload size
    const payload = {
      session_id: sessionId,
      events,
      timestamp: new Date().toISOString(),
      apiKey: this.config.apiKey,
      appId: this.config.appId,
    };
    const payloadSize = new Blob([JSON.stringify(payload)]).size;

    // Check if this batch contains FullSnapshot (type 2)
    const hasFullSnapshot = events.some(e => e.type === 2);
    const maxRetries = hasFullSnapshot ? 3 : 1; // Retry FullSnapshot batches up to 3 times

    // Recording events can be large, send immediately with retry logic
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use XMLHttpRequest for large payloads (more reliable than fetch for large data)
        if (payloadSize > 100000) { // > 100KB
          await this.sendToBackendXHR('/v1/rum/recordings', {
            session_id: sessionId,
            events,
            timestamp: new Date().toISOString(),
          });
        } else {
          await this.sendToBackend('/v1/rum/recordings', {
            session_id: sessionId,
            events,
            timestamp: new Date().toISOString(),
          });
        }
        return; // Success, exit
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s...
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    if (this.config.debug) {
      console.error(`[DevSkin SDK] Failed to send recording events after ${maxRetries} attempts:`, lastError);
    }
  }

  sendHeatmapData(heatmapData: any): void {
    this.enqueue('heatmap', heatmapData);
  }

  async sendScreenshot(screenshotData: any): Promise<void> {
    const endpoint = '/v1/sdk/screenshot';
    await this.sendToBackend(endpoint, { screenshot: screenshotData });
  }

  flush(useBeacon = false): void {
    if (this.queue.length === 0) {
      return;
    }

    const items = [...this.queue];
    this.queue = [];

    // Group by type
    const grouped: Record<string, any[]> = {};
    items.forEach((item) => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item.data);
    });

    // Send each type appropriately
    Object.entries(grouped).forEach(([type, dataArray]) => {
      const endpoint = this.getEndpointForType(type);

      if (type === 'event' && dataArray.length > 1) {
        // Events with batch support
        this.sendToBackend('/v1/rum/events/batch', { events: dataArray }, useBeacon);
      } else if (type === 'heatmap') {
        // Heatmap expects array format with apiKey and appId
        this.sendToBackend(endpoint, {
          heatmaps: dataArray,
          apiKey: this.config.apiKey,
          appId: this.config.appId
        }, useBeacon);
      } else {
        // Send each item individually (network, performance, error)
        dataArray.forEach((data) => {
          this.sendToBackend(endpoint, data, useBeacon);
        });
      }
    });

    if (this.config.debug) {
      console.log(`[DevSkin] Flushed ${items.length} items to backend`);
    }
  }

  private enqueue(type: QueuedItem['type'], data: any): void {
    // Add applicationId and sessionId to RUM events (event, error, network, performance)
    // Heatmap uses apiKey/appId in payload root instead
    let enrichedData = data;

    if (type !== 'heatmap') {
      enrichedData = {
        ...data,
        applicationId: this.config.appId,
      };

      // Add sessionId to network and performance requests (required by backend)
      if ((type === 'network' || type === 'performance') && this.sessionId) {
        enrichedData.sessionId = this.sessionId;
      }
    }

    this.queue.push({
      type,
      data: enrichedData,
      timestamp: Date.now(),
    });

    // Flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  private getEndpointForType(type: string): string {
    switch (type) {
      case 'event':
        return '/v1/rum/events';
      case 'error':
        return '/v1/errors/errors';
      case 'network':
        return '/v1/rum/network-requests';
      case 'performance':
        return '/v1/rum/web-vitals';
      case 'heatmap':
        return '/v1/sdk/heatmap';
      default:
        return '/v1/rum/events';
    }
  }

  private async sendToBackendXHR(
    endpoint: string,
    data: any
  ): Promise<void> {
    const url = `${this.apiUrl}${endpoint}`;

    const payload = {
      ...data,
      apiKey: this.config.apiKey,
      applicationId: this.config.appId, // Backend expects 'applicationId'
      environment: this.config.environment,
      release: this.config.release,
    };

    // Apply beforeSend hook if provided
    if (this.config.beforeSend) {
      const processed = this.config.beforeSend(payload);
      if (!processed) {
        // Hook returned null, don't send
        return;
      }
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-API-Key', this.config.apiKey);
      xhr.setRequestHeader('X-App-Id', this.config.appId);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (this.config.debug) {
            console.log('[DevSkin] Data sent successfully via XHR:', endpoint);
          }
          resolve();
        } else {
          console.error('[DevSkin] XHR HTTP Error:', xhr.status, xhr.responseText);
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        console.error('[DevSkin] XHR network error:', endpoint);
        reject(new Error('Network error'));
      };

      xhr.ontimeout = () => {
        console.error('[DevSkin] XHR timeout:', endpoint);
        reject(new Error('Request timeout'));
      };

      // Set a generous timeout for large payloads (30 seconds)
      xhr.timeout = 30000;

      try {
        const body = JSON.stringify(payload);
        xhr.send(body);
      } catch (error) {
        console.error('[DevSkin] Failed to send XHR request:', error);
        reject(error);
      }
    });
  }

  private async sendToBackend(
    endpoint: string,
    data: any,
    useBeacon = false
  ): Promise<void> {
    const url = `${this.apiUrl}${endpoint}`;

    const payload = {
      ...data,
      apiKey: this.config.apiKey,
      applicationId: this.config.appId, // Backend expects 'applicationId'
      environment: this.config.environment,
      release: this.config.release,
    };

    // Apply beforeSend hook if provided
    if (this.config.beforeSend) {
      const processed = this.config.beforeSend(payload);
      if (!processed) {
        // Hook returned null, don't send
        return;
      }
    }

    // Use sendBeacon for unload events (more reliable)
    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      navigator.sendBeacon(url, blob);
      return;
    }

    // Regular fetch
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-App-Id': this.config.appId,
        },
        body: JSON.stringify(payload),
        // Use keepalive for better reliability during page unload
        keepalive: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DevSkin] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.debug) {
        console.log('[DevSkin] Data sent successfully:', endpoint);
      }
    } catch (error) {
      console.error('[DevSkin] Failed to send data to', endpoint, ':', error);
      // Re-throw for caller to handle
      throw error;
    }
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}
