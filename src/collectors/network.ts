import { DevSkinConfig, NetworkRequest } from '../types';
import { Transport } from '../transport';

export class NetworkCollector {
  constructor(
    private config: DevSkinConfig,
    private transport: Transport
  ) {}

  start(): void {
    this.interceptFetch();
    this.interceptXHR();
  }

  private interceptFetch(): void {
    if (!window.fetch) return;

    const originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const [resource, config] = args;
      const url = typeof resource === 'string'
        ? resource
        : resource instanceof Request
          ? resource.url
          : resource.toString();
      const method = config?.method || 'GET';
      const startTime = Date.now();

      try {
        const response = await originalFetch(...args);

        // Clone response to read it without consuming the original
        const clonedResponse = response.clone();
        const duration = Date.now() - startTime;

        // Check if should be ignored
        if (this.shouldIgnoreUrl(url)) {
          return response;
        }

        // Check if should only capture failed requests
        if (
          this.config.networkRequestOptions?.captureFailedOnly &&
          response.ok
        ) {
          return response;
        }

        const networkRequest: NetworkRequest = {
          url,
          method,
          statusCode: response.status,
          durationMs: duration,
          responseSize: await this.getResponseSize(clonedResponse),
          timestamp: new Date().toISOString(),
        };

        // Capture headers if enabled
        if (this.config.networkRequestOptions?.captureHeaders) {
          networkRequest.responseHeaders = this.headersToObject(response.headers);
        }

        // Capture error message for failed requests
        if (!response.ok) {
          networkRequest.errorMessage = `HTTP ${response.status} ${response.statusText}`;
        }

        if (this.config.debug) {
          console.log('[DevSkin] Network request tracked:', networkRequest);
        }

        this.transport.sendNetworkRequest(networkRequest);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        if (!this.shouldIgnoreUrl(url)) {
          const networkRequest: NetworkRequest = {
            url,
            method,
            durationMs: duration,
            timestamp: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : 'Network request failed',
          };

          if (this.config.debug) {
            console.log('[DevSkin] Network request failed:', networkRequest);
          }

          this.transport.sendNetworkRequest(networkRequest);
        }

        throw error;
      }
    };
  }

  private interceptXHR(): void {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      (this as any).__devskin = {
        method,
        url: url.toString(),
        startTime: Date.now(),
      };

      if (username !== undefined) {
        return originalOpen.call(this, method, url, async ?? true, username, password ?? undefined);
      } else if (async !== undefined) {
        return originalOpen.call(this, method, url, async);
      } else {
        return originalOpen.call(this, method, url, true);
      }
    };

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null
    ) {
      const xhr = this;
      const devskin = (xhr as any).__devskin;

      if (!devskin) {
        return originalSend.call(this, body);
      }

      const collector = (window as any).__devskinNetworkCollector as NetworkCollector;

      // Track when request completes
      const handleLoad = () => {
        const duration = Date.now() - devskin.startTime;

        // Check if should be ignored
        if (collector?.shouldIgnoreUrl(devskin.url)) {
          return;
        }

        // Check if should only capture failed requests
        if (
          collector?.config.networkRequestOptions?.captureFailedOnly &&
          xhr.status >= 200 &&
          xhr.status < 400
        ) {
          return;
        }

        const networkRequest: NetworkRequest = {
          url: devskin.url,
          method: devskin.method,
          statusCode: xhr.status,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        };

        // Capture headers if enabled
        if (collector?.config.networkRequestOptions?.captureHeaders) {
          networkRequest.responseHeaders = collector.parseResponseHeaders(
            xhr.getAllResponseHeaders()
          );
        }

        // Capture error message for failed requests
        if (xhr.status === 0 || xhr.status >= 400) {
          networkRequest.errorMessage = `HTTP ${xhr.status} ${xhr.statusText}`;
        }

        if (collector?.config.debug) {
          console.log('[DevSkin] XHR request tracked:', networkRequest);
        }

        collector?.transport.sendNetworkRequest(networkRequest);
      };

      const handleError = () => {
        const duration = Date.now() - devskin.startTime;

        if (!collector?.shouldIgnoreUrl(devskin.url)) {
          const networkRequest: NetworkRequest = {
            url: devskin.url,
            method: devskin.method,
            durationMs: duration,
            timestamp: new Date().toISOString(),
            errorMessage: 'XHR request failed',
          };

          if (collector?.config.debug) {
            console.log('[DevSkin] XHR request failed:', networkRequest);
          }

          collector?.transport.sendNetworkRequest(networkRequest);
        }
      };

      xhr.addEventListener('load', handleLoad);
      xhr.addEventListener('error', handleError);
      xhr.addEventListener('abort', handleError);

      return originalSend.call(this, body);
    };

    // Store collector instance for XHR interceptor to access
    (window as any).__devskinNetworkCollector = this;
  }

  private shouldIgnoreUrl(url: string): boolean {
    // Ignore our own API calls
    if (url.includes(this.config.apiUrl || '')) {
      return true;
    }

    const ignorePatterns = this.config.networkRequestOptions?.ignoreUrls || [];

    for (const pattern of ignorePatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  }

  private async getResponseSize(response: Response): Promise<number | undefined> {
    try {
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      return undefined;
    }
  }

  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  private parseResponseHeaders(headerStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headerStr) return headers;

    const lines = headerStr.trim().split(/[\r\n]+/);
    lines.forEach((line) => {
      const parts = line.split(': ');
      const header = parts.shift();
      const value = parts.join(': ');
      if (header) {
        headers[header] = value;
      }
    });

    return headers;
  }
}
