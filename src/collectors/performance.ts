import { DevSkinConfig, PerformanceMetrics } from '../types';
import { onCLS, onFCP, onFID, onLCP, onTTFB, Metric } from 'web-vitals';
import { Transport } from '../transport';

export class PerformanceCollector {
  private metrics: PerformanceMetrics = {};

  constructor(
    private config: DevSkinConfig,
    private transport: Transport
  ) {}

  start(): void {
    // Collect Core Web Vitals
    onCLS((metric) => this.handleMetric(metric));
    onFCP((metric) => this.handleMetric(metric));
    onFID((metric) => this.handleMetric(metric));
    onLCP((metric) => this.handleMetric(metric));
    onTTFB((metric) => this.handleMetric(metric));

    // Collect Navigation Timing metrics
    this.collectNavigationTimings();

    // Collect Resource Timing
    this.collectResourceTimings();

    // Monitor long tasks
    if (this.config.longTaskThreshold) {
      this.observeLongTasks();
    }
  }

  private handleMetric(metric: Metric): void {
    const metricName = metric.name.toLowerCase() as keyof PerformanceMetrics;
    this.metrics[metricName] = metric.value;

    if (this.config.debug) {
      console.log(`[DevSkin] Web Vital ${metric.name}:`, metric.value);
    }

    // Send metric to backend - match backend schema
    this.transport.sendPerformanceMetric({
      metricName: metric.name,  // Changed from 'name' to 'metricName'
      value: metric.value,
      rating: metric.rating,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  private collectNavigationTimings(): void {
    if (!window.performance || !window.performance.timing) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const navigation = window.performance.navigation;

        const domLoad = timing.domContentLoadedEventEnd - timing.navigationStart;
        const windowLoad = timing.loadEventEnd - timing.navigationStart;

        this.metrics.domLoad = domLoad;
        this.metrics.windowLoad = windowLoad;

        if (this.config.debug) {
          console.log('[DevSkin] Navigation Timings:', {
            domLoad,
            windowLoad,
            navigationType: navigation.type,
          });
        }

        this.transport.sendPerformanceMetric({
          metricName: 'Navigation',
          value: windowLoad,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      }, 0);
    });
  }

  private collectResourceTimings(): void {
    if (!window.performance || !window.performance.getEntriesByType) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

        const resourceStats = {
          total: resources.length,
          byType: {} as Record<string, number>,
          slowest: [] as Array<{ name: string; duration: number; type: string }>,
        };

        resources.forEach((resource) => {
          const type = resource.initiatorType || 'other';
          resourceStats.byType[type] = (resourceStats.byType[type] || 0) + 1;
        });

        // Get 10 slowest resources
        resourceStats.slowest = resources
          .map((r) => ({
            name: r.name,
            duration: r.duration,
            type: r.initiatorType,
          }))
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10);

        if (this.config.debug) {
          console.log('[DevSkin] Resource Timings:', resourceStats);
        }

        this.transport.sendPerformanceMetric({
          metricName: 'Resources',
          value: resources.length,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      }, 1000);
    });
  }

  private observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= (this.config.longTaskThreshold || 50)) {
            if (this.config.debug) {
              console.log('[DevSkin] Long Task detected:', entry);
            }

            this.transport.sendPerformanceMetric({
              metricName: 'LongTask',
              value: entry.duration,
              url: window.location.href,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      if (this.config.debug) {
        console.error('[DevSkin] Error observing long tasks:', error);
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}
