import { DevSkinConfig, ErrorData, Breadcrumb } from '../types';
import { Transport } from '../transport';

export class ErrorCollector {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(
    private config: DevSkinConfig,
    private transport: Transport
  ) {
    this.maxBreadcrumbs = config.errorOptions?.maxBreadcrumbs || 30;
  }

  start(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandledrejection',
      });
    });

    // Add automatic breadcrumbs
    this.setupAutomaticBreadcrumbs();
  }

  captureError(error: Error | string, context?: Record<string, any>): void {
    this.handleError(error, context);
  }

  addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }): void {
    const crumb: Breadcrumb = {
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      timestamp: new Date().toISOString(),
      data: breadcrumb.data,
    };

    this.breadcrumbs.push(crumb);

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (this.config.debug) {
      console.log('[DevSkin] Breadcrumb added:', crumb);
    }
  }

  private handleError(error: Error | string, context?: Record<string, any>): void {
    // Check if error should be ignored
    if (this.shouldIgnoreError(error)) {
      return;
    }

    let errorData: ErrorData;

    if (error instanceof Error) {
      errorData = {
        message: error.message,
        stack: error.stack,
        type: error.name || 'Error',
        timestamp: new Date().toISOString(),
        sessionId: '', // Will be set by transport
        url: window.location.href,
        breadcrumbs: [...this.breadcrumbs],
        context: {
          ...context,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        },
      };

      // Parse stack trace for line and column
      if (error.stack) {
        const stackMatch = error.stack.match(/:(\d+):(\d+)/);
        if (stackMatch) {
          errorData.line = parseInt(stackMatch[1], 10);
          errorData.column = parseInt(stackMatch[2], 10);
        }
      }
    } else {
      // String error
      errorData = {
        message: String(error),
        type: 'Error',
        timestamp: new Date().toISOString(),
        sessionId: '',
        url: window.location.href,
        breadcrumbs: [...this.breadcrumbs],
        context,
      };
    }

    // Include local variables if enabled
    if (this.config.errorOptions?.includeLocalVariables && context) {
      errorData.context = {
        ...errorData.context,
        localVariables: context,
      };
    }

    if (this.config.debug) {
      console.log('[DevSkin] Error captured:', errorData);
    }

    // Add breadcrumb for this error
    this.addBreadcrumb({
      category: 'error',
      message: errorData.message,
      level: 'error',
      data: {
        type: errorData.type,
        stack: errorData.stack,
      },
    });

    // Send to backend
    this.transport.sendError(errorData);
  }

  private shouldIgnoreError(error: Error | string): boolean {
    const ignorePatterns = this.config.errorOptions?.ignoreErrors || [];
    const errorMessage = error instanceof Error ? error.message : String(error);

    for (const pattern of ignorePatterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(errorMessage)) return true;
      } else if (typeof pattern === 'string') {
        if (errorMessage.includes(pattern)) return true;
      }
    }

    // Check deny URLs
    const denyUrls = this.config.errorOptions?.denyUrls || [];
    const stack = error instanceof Error ? error.stack : '';

    for (const pattern of denyUrls) {
      if (pattern.test(stack || '')) return true;
    }

    return false;
  }

  private setupAutomaticBreadcrumbs(): void {
    // Console breadcrumbs
    this.wrapConsole();

    // Click breadcrumbs
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as HTMLElement;
        this.addBreadcrumb({
          category: 'ui.click',
          message: `Clicked on ${target.tagName}`,
          data: {
            tagName: target.tagName,
            id: target.id,
            className: target.className,
            innerText: target.innerText?.substring(0, 100),
          },
        });
      },
      true
    );

    // Navigation breadcrumbs
    let lastHref = window.location.href;
    const checkNavigation = () => {
      if (lastHref !== window.location.href) {
        this.addBreadcrumb({
          category: 'navigation',
          message: `Navigated to ${window.location.pathname}`,
          data: {
            from: lastHref,
            to: window.location.href,
          },
        });
        lastHref = window.location.href;
      }
    };

    window.addEventListener('popstate', checkNavigation);
    window.addEventListener('hashchange', checkNavigation);

    // Wrap pushState and replaceState
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      checkNavigation();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      checkNavigation();
    };
  }

  private wrapConsole(): void {
    const levels: Array<'log' | 'info' | 'warn' | 'error'> = ['log', 'info', 'warn', 'error'];

    levels.forEach((level) => {
      const original = console[level];
      console[level] = (...args: any[]) => {
        // Call original
        original.apply(console, args);

        // Add breadcrumb (skip DevSkin internal logs to avoid infinite loop)
        if (level === 'warn' || level === 'error') {
          const message = args.map((arg) => String(arg)).join(' ');

          // Skip DevSkin internal messages
          if (message.startsWith('[DevSkin]')) {
            return;
          }

          this.addBreadcrumb({
            category: 'console',
            message: message,
            level: level === 'warn' ? 'warning' : 'error',
            data: { arguments: args },
          });
        }
      };
    });
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }
}
