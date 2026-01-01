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
  private readonly maxQueueSize = 50;
  private readonly flushIntervalMs = 5000; // 5 seconds
  private readonly apiUrl: string;

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

  sendEvent(event: EventData): void {
    this.enqueue('event', event);
  }

  identifyUser(user: UserData): void {
    // Send user identification immediately (don't queue)
    this.sendToBackend('/v1/analytics/identify', user);
  }

  startSession(session: SessionData): void {
    // Send session start immediately
    this.sendToBackend('/v1/analytics/session', session);
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

  sendRecordingEvents(sessionId: string, events: eventWithTime[]): void {
    // Recording events can be large, send immediately
    this.sendToBackend('/v1/rum/recordings', {
      session_id: sessionId,
      events,
      timestamp: new Date().toISOString(),
    });
  }

  sendHeatmapData(heatmapData: any): void {
    this.enqueue('heatmap', heatmapData);
  }

  flush(useBeacon = false): void {
    if (this.queue.length === 0) {
      return;
    }

    const items = [...this.queue];
    this.queue = [];

    // Group items by type
    const grouped: Record<string, any[]> = {};
    items.forEach((item) => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item.data);
    });

    // Send each group
    Object.entries(grouped).forEach(([type, data]) => {
      const endpoint = this.getEndpointForType(type);
      this.sendToBackend(endpoint, { [type + 's']: data }, useBeacon);
    });

    if (this.config.debug) {
      console.log(`[DevSkin] Flushed ${items.length} items to backend`);
    }
  }

  private enqueue(type: QueuedItem['type'], data: any): void {
    this.queue.push({
      type,
      data,
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
        return '/v1/analytics/events';
      case 'error':
        return '/v1/analytics/errors';
      case 'network':
        return '/v1/analytics/network';
      case 'performance':
        return '/v1/analytics/performance';
      case 'heatmap':
        return '/v1/analytics/heatmap';
      default:
        return '/v1/analytics/events';
    }
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
      appId: this.config.appId,
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
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
        // Use keepalive for better reliability during page unload
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.debug) {
        console.log('[DevSkin] Data sent successfully:', endpoint);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[DevSkin] Failed to send data:', error);
      }

      // Retry logic could be added here
      // For now, we'll just log the error
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
