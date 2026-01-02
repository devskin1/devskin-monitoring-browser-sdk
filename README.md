# DevSkin Browser SDK

Comprehensive browser monitoring SDK for collecting user analytics, performance metrics, errors, and session recordings.

## Features

- 📊 **Product Analytics**: Track custom events, page views, and user behavior
- 🎯 **Session Recording**: Record and replay user sessions with privacy controls
- ⚡ **Performance Monitoring**: Collect Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
- 🐛 **Error Tracking**: Automatic error capture with breadcrumbs and context
- 🌐 **Network Monitoring**: Track all network requests (fetch, XHR)
- 📱 **Device Detection**: Comprehensive device, browser, and OS information
- 🌍 **Geolocation**: Optional location tracking with user permission
- 🔒 **Privacy-First**: Built-in privacy controls and data masking

## Installation

### Via CDN

```html
<!-- Via unpkg -->
<script src="https://unpkg.com/@devskin/browser-sdk@latest/dist/devskin.umd.min.js"></script>

<!-- Or via jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@devskin/browser-sdk@latest/dist/devskin.umd.min.js"></script>

<script>
  DevSkin.init({
    apiKey: 'your-api-key',
    appId: 'your-app-id',
    apiUrl: 'https://api-monitoring.devskin.com', // Required!
  });
</script>
```

### Via npm

```bash
npm install @devskin/browser-sdk
```

```javascript
import DevSkin from '@devskin/browser-sdk';

DevSkin.init({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  apiUrl: 'https://api-monitoring.devskin.com', // Required!
});
```

## Configuration

```javascript
DevSkin.init({
  // Required
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  apiUrl: 'https://api-monitoring.devskin.com', // IMPORTANT: Backend URL (Required!)

  // Optional
  debug: false,
  environment: 'production',
  release: '1.0.0',

  // Feature flags
  captureWebVitals: true,
  captureNetworkRequests: true,
  captureErrors: true,
  captureUserAgent: true,
  captureLocation: true,
  captureDevice: true,

  // Session Recording
  sessionRecording: {
    enabled: true,
    maskAllInputs: true,
    maskTextSelector: '.sensitive',
    blockSelector: '.private',
    sampling: 0.1, // Record 10% of sessions
    recordCanvas: false,
    recordCrossOriginIframes: false,
    ignoreClass: 'devskin-block',
  },

  // Heatmap & User Behavior
  heatmapOptions: {
    enabled: true,
    trackClicks: true, // Track click heatmaps
    trackScroll: true, // Track scroll depth
    trackMouseMovement: false, // Track mouse movement (can be heavy)
    mouseMoveSampling: 0.1, // Sample 10% of mouse movements
  },

  // Network options
  networkRequestOptions: {
    ignoreUrls: [/analytics\.google\.com/],
    captureHeaders: false,
    captureBody: false,
    captureFailedOnly: false,
  },

  // Error options
  errorOptions: {
    ignoreErrors: [/Script error/i],
    denyUrls: [/extensions\//],
    includeLocalVariables: true,
    maxBreadcrumbs: 30,
  },

  // Privacy
  privacy: {
    respectDoNotTrack: true,
    cookieConsent: false,
  },

  // Long task threshold (ms)
  longTaskThreshold: 50,

  // Callbacks
  beforeSend: (event) => {
    // Modify or filter events before sending
    return event;
  },
});
```

## Usage

### Track Events

```javascript
// Track a custom event
DevSkin.track('button_clicked', {
  buttonId: 'signup',
  page: '/landing',
});

// Track page view
DevSkin.trackPageView({
  title: 'Home Page',
});
```

### Identify Users

```javascript
DevSkin.identify('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium',
});
```

### Capture Errors

```javascript
try {
  // Your code
} catch (error) {
  DevSkin.captureError(error, {
    context: 'checkout_process',
    step: 'payment',
  });
}
```

### Add Breadcrumbs

```javascript
DevSkin.addBreadcrumb({
  category: 'ui',
  message: 'User clicked submit button',
  level: 'info',
  data: {
    formId: 'checkout-form',
  },
});
```

### Control Recording

```javascript
// Start recording
DevSkin.startRecording();

// Stop recording
DevSkin.stopRecording();
```

### Privacy Controls

```javascript
// Opt out
DevSkin.optOut();

// Opt in
DevSkin.optIn();
```

## Data Collected

### Automatic Data Collection

The SDK automatically collects:

- **Browser Info**: Name, version, engine, language, viewport size
- **Device Info**: Type (mobile/tablet/desktop), OS, screen resolution, memory, CPU cores
- **Location Info**: URL, hostname, pathname, referrer, timezone
- **Performance Metrics**: Core Web Vitals, navigation timing, resource timing
- **Network Requests**: URL, method, status, duration, size
- **Errors**: Message, stack trace, breadcrumbs, context
- **User Actions**: Clicks, navigation, console logs
- **Heatmap Data**: Click positions, scroll depth, mouse movement (if enabled)

### Optional Data Collection

With user permission:
- **Geolocation**: Country, region, city, latitude, longitude
- **Session Recordings**: Full DOM replay with privacy controls

## Privacy & Security

### Data Masking

- All password inputs are automatically masked
- Email addresses are masked by default
- Use CSS classes to mask sensitive data:
  - `.devskin-mask` - Mask text content
  - `.devskin-block` - Completely block element from recording

### Sampling

Record only a percentage of sessions to reduce data collection:

```javascript
sessionRecording: {
  enabled: true,
  sampling: 0.1, // Record 10% of sessions
}
```

### Do Not Track

Respect browser DNT settings:

```javascript
privacy: {
  respectDoNotTrack: true,
}
```

### Cookie Consent

Wait for cookie consent before tracking:

```javascript
privacy: {
  cookieConsent: true,
}

// Later, after consent is given:
DevSkin.optIn();
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Performance Impact

The SDK is designed for minimal performance impact:

- Async initialization
- Efficient event batching
- Lazy loading of features
- Compressed payloads
- ~15KB gzipped

## Development

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

## License

MIT License

## Support

For issues and questions, please visit: https://github.com/devskin/browser-sdk
