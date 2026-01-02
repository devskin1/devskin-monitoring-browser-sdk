import { DevSkinConfig } from '../types';
import { Transport } from '../transport';

interface ClickData {
  x: number;
  y: number;
  relativeX: number;
  relativeY: number;
  pageX: number;
  pageY: number;
  element: string;
  elementId?: string;
  elementClass?: string;
  pageUrl: string;
  timestamp: string;
  viewportWidth: number;
  viewportHeight: number;
}

interface ScrollData {
  depth: number;
  maxDepth: number;
  pageHeight: number;
  viewportHeight: number;
  pageUrl: string;
  timestamp: string;
}

interface MouseMoveData {
  x: number;
  y: number;
  pageUrl: string;
  timestamp: string;
}

export class HeatmapCollector {
  private clickData: ClickData[] = [];
  private scrollData: ScrollData[] = [];
  private mouseMoveData: MouseMoveData[] = [];
  private maxScrollDepth = 0;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private mouseMoveSampling = 0.1; // Sample 10% of mouse movements to avoid overload

  constructor(
    private config: DevSkinConfig,
    private transport: Transport
  ) {}

  start(): void {
    if (!this.config.heatmapOptions?.enabled) {
      return;
    }

    if (this.config.debug) {
      console.log('[DevSkin] Starting heatmap collection');
    }

    // Track clicks
    if (this.config.heatmapOptions.trackClicks !== false) {
      this.trackClicks();
    }

    // Track scroll depth
    if (this.config.heatmapOptions.trackScroll !== false) {
      this.trackScrollDepth();
    }

    // Track mouse movement
    if (this.config.heatmapOptions.trackMouseMovement) {
      this.mouseMoveSampling = this.config.heatmapOptions.mouseMoveSampling || 0.1;
      this.trackMouseMovement();
    }

    // Flush data periodically
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000); // Every 10 seconds

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  private trackClicks(): void {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;

        // Calculate relative position within element
        const rect = target.getBoundingClientRect();
        const relativeX = event.clientX - rect.left;
        const relativeY = event.clientY - rect.top;

        // Calculate page position (including scroll)
        const pageX = event.clientX + window.scrollX;
        const pageY = event.clientY + window.scrollY;

        const clickData: ClickData = {
          x: event.clientX,
          y: event.clientY,
          relativeX,
          relativeY,
          pageX,
          pageY,
          element: this.getElementSelector(target),
          elementId: target.id || undefined,
          elementClass: target.className || undefined,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        };

        this.clickData.push(clickData);

        if (this.config.debug) {
          console.log('[DevSkin] Click tracked:', clickData);
        }

        // Flush if we have too many clicks
        if (this.clickData.length >= 50) {
          this.flush();
        }
      },
      true
    );
  }

  private trackScrollDepth(): void {
    const updateScrollDepth = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;

        const scrollData: ScrollData = {
          depth: scrollPercent,
          maxDepth: this.maxScrollDepth,
          pageHeight: documentHeight,
          viewportHeight: windowHeight,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
        };

        this.scrollData.push(scrollData);

        if (this.config.debug) {
          console.log('[DevSkin] Scroll depth:', scrollPercent + '%');
        }
      }
    };

    // Throttle scroll events
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(updateScrollDepth, 100);
    });

    // Initial depth
    updateScrollDepth();
  }

  private trackMouseMovement(): void {
    let mouseMoveTimeout: ReturnType<typeof setTimeout> | null = null;

    window.addEventListener('mousemove', (event) => {
      // Sample mouse movements to avoid performance issues
      if (Math.random() > this.mouseMoveSampling) {
        return;
      }

      // Throttle mouse movement tracking
      if (mouseMoveTimeout) {
        return;
      }

      mouseMoveTimeout = setTimeout(() => {
        mouseMoveTimeout = null;
      }, 100);

      const mouseMoveData: MouseMoveData = {
        x: event.clientX + window.scrollX,
        y: event.clientY + window.scrollY,
        pageUrl: window.location.href,
        timestamp: new Date().toISOString(),
      };

      this.mouseMoveData.push(mouseMoveData);

      // Flush if we have too many movements
      if (this.mouseMoveData.length >= 100) {
        this.flush();
      }
    });
  }

  private flush(): void {
    // Send clicks individually (backend expects one click event per item)
    if (this.clickData.length > 0) {
      this.clickData.forEach(click => {
        this.transport.sendHeatmapData({
          type: 'click',
          ...click,
        });
      });
      this.clickData = [];
    }

    // Send scroll data individually
    if (this.scrollData.length > 0) {
      this.scrollData.forEach(scroll => {
        this.transport.sendHeatmapData({
          type: 'scroll',
          ...scroll,
        });
      });
      this.scrollData = [];
    }

    // Send mouse moves individually
    if (this.mouseMoveData.length > 0) {
      this.mouseMoveData.forEach(move => {
        this.transport.sendHeatmapData({
          type: 'mousemove',
          ...move,
        });
      });
      this.mouseMoveData = [];
    }
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c);
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }

    return element.tagName.toLowerCase();
  }
}
