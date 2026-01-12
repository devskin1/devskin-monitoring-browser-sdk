export interface DevSkinConfig {
  apiKey: string;
  appId: string;
  apiUrl?: string;
  debug?: boolean;

  // Session Recording
  sessionRecording?: {
    enabled: boolean;
    maskAllInputs?: boolean;
    maskTextSelector?: string;
    blockSelector?: string;
    sampling?: number;
    recordCanvas?: boolean;
    recordCrossOriginIframes?: boolean;
    ignoreClass?: string;
  };

  // Heatmap & User Behavior
  heatmapOptions?: {
    enabled: boolean;
    trackClicks?: boolean;
    trackScroll?: boolean;
    trackMouseMovement?: boolean;
    mouseMoveSampling?: number; // 0-1, default 0.1 (10%)
  };

  // Feature flags
  captureWebVitals?: boolean;
  captureNetworkRequests?: boolean;
  captureErrors?: boolean;
  captureUserAgent?: boolean;
  captureLocation?: boolean;
  captureDevice?: boolean;

  // Network options
  networkRequestOptions?: {
    ignoreUrls?: RegExp[];
    captureHeaders?: boolean;
    captureBody?: boolean;
    captureFailedOnly?: boolean;
  };

  // Error options
  errorOptions?: {
    ignoreErrors?: (string | RegExp)[];
    denyUrls?: RegExp[];
    includeLocalVariables?: boolean;
    maxBreadcrumbs?: number;
  };

  // Privacy
  privacy?: {
    respectDoNotTrack?: boolean;
    cookieConsent?: boolean;
  };

  // Environment
  environment?: string;
  release?: string;
  longTaskThreshold?: number;

  // Callbacks
  beforeSend?: (event: any) => any | null;
}

export interface EventData {
  eventName: string;
  eventType: string;
  timestamp: string;
  sessionId?: string; // Optional - may not be available immediately after init()
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, any>;
  pageUrl: string;
  pageTitle: string;
}

export interface UserData {
  userId: string;
  anonymousId?: string;
  traits?: Record<string, any>;
  sessionId?: string; // Optional - may not be available immediately after init()
  timestamp: string;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  pageViewCount?: number;
  eventCount?: number;
  platform?: string;
  device?: DeviceInfo;
  browser?: BrowserInfo;
  location?: LocationInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  vendor?: string;
  model?: string;
  os: {
    name: string;
    version: string;
  };
  screen: {
    width: number;
    height: number;
    orientation: string;
    pixelRatio: number;
  };
  memory?: number;
  cores?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  userAgent: string;
  language: string;
  languages: string[];
  cookieEnabled: boolean;
  doNotTrack: boolean | null;
  viewport: {
    width: number;
    height: number;
  };
  timezone: string;
  timezoneOffset: number;
}

export interface LocationInfo {
  url: string;
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  protocol: string;
  port: string;
  referrer: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  domLoad?: number;
  windowLoad?: number;
}

export interface NetworkRequest {
  sessionId?: string;  // Added by transport
  url: string;
  method: string;
  statusCode?: number;  // Changed from 'status'
  durationMs: number;   // Changed from 'duration'
  requestSize?: number;
  responseSize?: number;  // Changed from 'size'
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;  // Changed from 'headers'
  errorMessage?: string;
  timestamp: string;
}

export interface ErrorData {
  message: string;
  stack?: string;
  type: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  url: string;
  line?: number;
  column?: number;
  breadcrumbs?: Breadcrumb[];
  context?: Record<string, any>;
}

export interface Breadcrumb {
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  timestamp: string;
  data?: Record<string, any>;
}
