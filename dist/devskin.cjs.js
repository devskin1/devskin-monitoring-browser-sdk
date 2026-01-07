'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter$1(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

class DeviceCollector {
    constructor(config) {
        this.config = config;
    }
    collect() {
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
    getDeviceType() {
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
    getVendor() {
        return navigator.vendor || undefined;
    }
    getModel() {
        const ua = navigator.userAgent;
        // Try to extract model from user agent
        const modelMatch = ua.match(/\(([^)]+)\)/);
        if (modelMatch && modelMatch[1]) {
            return modelMatch[1];
        }
        return undefined;
    }
    getOS() {
        const ua = navigator.userAgent;
        let name = 'Unknown';
        let version = '';
        if (ua.includes('Win')) {
            name = 'Windows';
            if (ua.includes('Windows NT 10.0'))
                version = '10';
            else if (ua.includes('Windows NT 6.3'))
                version = '8.1';
            else if (ua.includes('Windows NT 6.2'))
                version = '8';
            else if (ua.includes('Windows NT 6.1'))
                version = '7';
        }
        else if (ua.includes('Mac')) {
            name = 'macOS';
            const match = ua.match(/Mac OS X (\d+[._]\d+[._]\d+)?/);
            if (match && match[1]) {
                version = match[1].replace(/_/g, '.');
            }
        }
        else if (ua.includes('X11') || ua.includes('Linux')) {
            name = 'Linux';
        }
        else if (ua.includes('Android')) {
            name = 'Android';
            const match = ua.match(/Android (\d+\.?\d*)/);
            if (match && match[1]) {
                version = match[1];
            }
        }
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
            name = 'iOS';
            const match = ua.match(/OS (\d+_\d+(_\d+)?)/);
            if (match && match[1]) {
                version = match[1].replace(/_/g, '.');
            }
        }
        return { name, version };
    }
    getScreenInfo() {
        return {
            width: window.screen.width,
            height: window.screen.height,
            orientation: this.getOrientation(),
            pixelRatio: window.devicePixelRatio || 1,
        };
    }
    getOrientation() {
        if (window.screen.orientation) {
            return window.screen.orientation.type;
        }
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    getMemory() {
        // @ts-ignore
        return navigator.deviceMemory;
    }
    getCores() {
        return navigator.hardwareConcurrency;
    }
    getConnection() {
        // @ts-ignore
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection)
            return undefined;
        return {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
        };
    }
}

class LocationCollector {
    constructor(config) {
        this.config = config;
        this.geoData = null;
        if (this.config.captureLocation) {
            this.requestGeolocation();
        }
    }
    collect() {
        return Object.assign({ url: window.location.href, hostname: window.location.hostname, pathname: window.location.pathname, search: window.location.search, hash: window.location.hash, protocol: window.location.protocol, port: window.location.port, referrer: document.referrer }, this.geoData);
    }
    requestGeolocation() {
        return __awaiter$1(this, void 0, void 0, function* () {
            try {
                // Try to get approximate location from timezone
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                this.geoData = { timezone };
                // Try to get precise geolocation (requires user permission)
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition((position) => {
                        this.geoData = Object.assign(Object.assign({}, this.geoData), { latitude: position.coords.latitude, longitude: position.coords.longitude });
                        // Try to reverse geocode (if API available)
                        this.reverseGeocode(position.coords.latitude, position.coords.longitude);
                    }, (error) => {
                        if (this.config.debug) {
                            console.log('[DevSkin] Geolocation permission denied or error:', error);
                        }
                    }, {
                        timeout: 5000,
                        maximumAge: 600000, // 10 minutes
                    });
                }
            }
            catch (error) {
                if (this.config.debug) {
                    console.error('[DevSkin] Error requesting geolocation:', error);
                }
            }
        });
    }
    reverseGeocode(latitude, longitude) {
        return __awaiter$1(this, void 0, void 0, function* () {
            try {
                // Use a free geocoding service (you can replace with your own)
                const response = yield fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, {
                    headers: {
                        'User-Agent': 'DevSkin-SDK/1.0',
                    },
                });
                if (response.ok) {
                    const data = yield response.json();
                    if (data.address) {
                        this.geoData = Object.assign(Object.assign({}, this.geoData), { country: data.address.country, region: data.address.state || data.address.region, city: data.address.city || data.address.town || data.address.village });
                    }
                }
            }
            catch (error) {
                if (this.config.debug) {
                    console.error('[DevSkin] Error reverse geocoding:', error);
                }
            }
        });
    }
}

class BrowserCollector {
    constructor(config) {
        this.config = config;
    }
    collect() {
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
    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox'))
            return 'Firefox';
        if (ua.includes('Edg'))
            return 'Edge';
        if (ua.includes('Chrome'))
            return 'Chrome';
        if (ua.includes('Safari') && !ua.includes('Chrome'))
            return 'Safari';
        if (ua.includes('Opera') || ua.includes('OPR'))
            return 'Opera';
        if (ua.includes('Trident') || ua.includes('MSIE'))
            return 'Internet Explorer';
        return 'Unknown';
    }
    getBrowserVersion() {
        const ua = navigator.userAgent;
        const browserName = this.getBrowserName();
        let match = null;
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
                if (match)
                    return match[2];
                break;
            case 'Internet Explorer':
                match = ua.match(/(MSIE |rv:)(\d+\.\d+)/);
                if (match)
                    return match[2];
                break;
        }
        return match && match[1] ? match[1] : '';
    }
    getEngine() {
        const ua = navigator.userAgent;
        if (ua.includes('Gecko') && ua.includes('Firefox'))
            return 'Gecko';
        if (ua.includes('AppleWebKit')) {
            if (ua.includes('Chrome') || ua.includes('Edg'))
                return 'Blink';
            return 'WebKit';
        }
        if (ua.includes('Trident'))
            return 'Trident';
        return 'Unknown';
    }
    getDoNotTrack() {
        // @ts-ignore
        const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
        if (dnt === '1' || dnt === 'yes')
            return true;
        if (dnt === '0' || dnt === 'no')
            return false;
        return null;
    }
}

var e,n,t,i$1,a=-1,o=function(e){addEventListener("pageshow",(function(n){n.persisted&&(a=n.timeStamp,e(n));}),true);},c=function(){return window.performance&&performance.getEntriesByType&&performance.getEntriesByType("navigation")[0]},u=function(){var e=c();return e&&e.activationStart||0},f=function(e,n){var t=c(),i="navigate";a>=0?i="back-forward-cache":t&&(document.prerendering||u()>0?i="prerender":document.wasDiscarded?i="restore":t.type&&(i=t.type.replace(/_/g,"-")));return {name:e,value:void 0===n?-1:n,rating:"good",delta:0,entries:[],id:"v3-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12),navigationType:i}},s=function(e,n,t){try{if(PerformanceObserver.supportedEntryTypes.includes(e)){var i=new PerformanceObserver((function(e){Promise.resolve().then((function(){n(e.getEntries());}));}));return i.observe(Object.assign({type:e,buffered:!0},t||{})),i}}catch(e){}},d=function(e,n,t,i){var r,a;return function(o){n.value>=0&&(o||i)&&((a=n.value-(r||0))||void 0===r)&&(r=n.value,n.delta=a,n.rating=function(e,n){return e>n[1]?"poor":e>n[0]?"needs-improvement":"good"}(n.value,t),e(n));}},l=function(e){requestAnimationFrame((function(){return requestAnimationFrame((function(){return e()}))}));},p=function(e){var n=function(n){"pagehide"!==n.type&&"hidden"!==document.visibilityState||e(n);};addEventListener("visibilitychange",n,true),addEventListener("pagehide",n,true);},v=function(e){var n=false;return function(t){n||(e(t),n=true);}},m=-1,h=function(){return "hidden"!==document.visibilityState||document.prerendering?1/0:0},g=function(e){"hidden"===document.visibilityState&&m>-1&&(m="visibilitychange"===e.type?e.timeStamp:0,T());},y=function(){addEventListener("visibilitychange",g,true),addEventListener("prerenderingchange",g,true);},T=function(){removeEventListener("visibilitychange",g,true),removeEventListener("prerenderingchange",g,true);},E=function(){return m<0&&(m=h(),y(),o((function(){setTimeout((function(){m=h(),y();}),0);}))),{get firstHiddenTime(){return m}}},C=function(e){document.prerendering?addEventListener("prerenderingchange",(function(){return e()}),true):e();},L=[1800,3e3],w=function(e,n){n=n||{},C((function(){var t,i=E(),r=f("FCP"),a=s("paint",(function(e){e.forEach((function(e){"first-contentful-paint"===e.name&&(a.disconnect(),e.startTime<i.firstHiddenTime&&(r.value=Math.max(e.startTime-u(),0),r.entries.push(e),t(true)));}));}));a&&(t=d(e,r,L,n.reportAllChanges),o((function(i){r=f("FCP"),t=d(e,r,L,n.reportAllChanges),l((function(){r.value=performance.now()-i.timeStamp,t(true);}));})));}));},b=[.1,.25],S=function(e,n){n=n||{},w(v((function(){var t,i=f("CLS",0),r=0,a=[],c=function(e){e.forEach((function(e){if(!e.hadRecentInput){var n=a[0],t=a[a.length-1];r&&e.startTime-t.startTime<1e3&&e.startTime-n.startTime<5e3?(r+=e.value,a.push(e)):(r=e.value,a=[e]);}})),r>i.value&&(i.value=r,i.entries=a,t());},u=s("layout-shift",c);u&&(t=d(e,i,b,n.reportAllChanges),p((function(){c(u.takeRecords()),t(true);})),o((function(){r=0,i=f("CLS",0),t=d(e,i,b,n.reportAllChanges),l((function(){return t()}));})),setTimeout(t,0));})));},A={passive:true,capture:true},I=new Date,P=function(i,r){e||(e=r,n=i,t=new Date,k(removeEventListener),F());},F=function(){if(n>=0&&n<t-I){var r={entryType:"first-input",name:e.type,target:e.target,cancelable:e.cancelable,startTime:e.timeStamp,processingStart:e.timeStamp+n};i$1.forEach((function(e){e(r);})),i$1=[];}},M=function(e){if(e.cancelable){var n=(e.timeStamp>1e12?new Date:performance.now())-e.timeStamp;"pointerdown"==e.type?function(e,n){var t=function(){P(e,n),r();},i=function(){r();},r=function(){removeEventListener("pointerup",t,A),removeEventListener("pointercancel",i,A);};addEventListener("pointerup",t,A),addEventListener("pointercancel",i,A);}(n,e):P(n,e);}},k=function(e){["mousedown","keydown","touchstart","pointerdown"].forEach((function(n){return e(n,M,A)}));},D=[100,300],x=function(t,r){r=r||{},C((function(){var a,c=E(),u=f("FID"),l=function(e){e.startTime<c.firstHiddenTime&&(u.value=e.processingStart-e.startTime,u.entries.push(e),a(true));},m=function(e){e.forEach(l);},h=s("first-input",m);a=d(t,u,D,r.reportAllChanges),h&&p(v((function(){m(h.takeRecords()),h.disconnect();}))),h&&o((function(){var o;u=f("FID"),a=d(t,u,D,r.reportAllChanges),i$1=[],n=-1,e=null,k(addEventListener),o=l,i$1.push(o),F();}));}));},U=[2500,4e3],V={},W=function(e,n){n=n||{},C((function(){var t,i=E(),r=f("LCP"),a=function(e){var n=e[e.length-1];n&&n.startTime<i.firstHiddenTime&&(r.value=Math.max(n.startTime-u(),0),r.entries=[n],t());},c=s("largest-contentful-paint",a);if(c){t=d(e,r,U,n.reportAllChanges);var m=v((function(){V[r.id]||(a(c.takeRecords()),c.disconnect(),V[r.id]=true,t(true));}));["keydown","click"].forEach((function(e){addEventListener(e,(function(){return setTimeout(m,0)}),true);})),p(m),o((function(i){r=f("LCP"),t=d(e,r,U,n.reportAllChanges),l((function(){r.value=performance.now()-i.timeStamp,V[r.id]=true,t(true);}));}));}}));},X=[800,1800],Y=function e(n){document.prerendering?C((function(){return e(n)})):"complete"!==document.readyState?addEventListener("load",(function(){return e(n)}),true):setTimeout(n,0);},Z=function(e,n){n=n||{};var t=f("TTFB"),i=d(e,t,X,n.reportAllChanges);Y((function(){var r=c();if(r){var a=r.responseStart;if(a<=0||a>performance.now())return;t.value=Math.max(a-u(),0),t.entries=[r],i(true),o((function(){t=f("TTFB",0),(i=d(e,t,X,n.reportAllChanges))(true);}));}}));};

class PerformanceCollector {
    constructor(config, transport) {
        this.config = config;
        this.transport = transport;
        this.metrics = {};
    }
    start() {
        // Collect Core Web Vitals
        S((metric) => this.handleMetric(metric));
        w((metric) => this.handleMetric(metric));
        x((metric) => this.handleMetric(metric));
        W((metric) => this.handleMetric(metric));
        Z((metric) => this.handleMetric(metric));
        // Collect Navigation Timing metrics
        this.collectNavigationTimings();
        // Collect Resource Timing
        this.collectResourceTimings();
        // Monitor long tasks
        if (this.config.longTaskThreshold) {
            this.observeLongTasks();
        }
    }
    handleMetric(metric) {
        const metricName = metric.name.toLowerCase();
        this.metrics[metricName] = metric.value;
        if (this.config.debug) {
            console.log(`[DevSkin] Web Vital ${metric.name}:`, metric.value);
        }
        // Send metric to backend - match backend schema
        this.transport.sendPerformanceMetric({
            metricName: metric.name, // Changed from 'name' to 'metricName'
            value: metric.value,
            rating: metric.rating,
            url: window.location.href,
            timestamp: new Date().toISOString(),
        });
    }
    collectNavigationTimings() {
        if (!window.performance || !window.performance.timing)
            return;
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
    collectResourceTimings() {
        if (!window.performance || !window.performance.getEntriesByType)
            return;
        window.addEventListener('load', () => {
            setTimeout(() => {
                const resources = window.performance.getEntriesByType('resource');
                const resourceStats = {
                    total: resources.length,
                    byType: {},
                    slowest: [],
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
    observeLongTasks() {
        if (!('PerformanceObserver' in window))
            return;
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
        }
        catch (error) {
            if (this.config.debug) {
                console.error('[DevSkin] Error observing long tasks:', error);
            }
        }
    }
    getMetrics() {
        return Object.assign({}, this.metrics);
    }
}

class ErrorCollector {
    constructor(config, transport) {
        var _a;
        this.config = config;
        this.transport = transport;
        this.breadcrumbs = [];
        this.maxBreadcrumbs = ((_a = config.errorOptions) === null || _a === void 0 ? void 0 : _a.maxBreadcrumbs) || 30;
    }
    start() {
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
    captureError(error, context) {
        this.handleError(error, context);
    }
    addBreadcrumb(breadcrumb) {
        const crumb = {
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
    handleError(error, context) {
        var _a;
        // Check if error should be ignored
        if (this.shouldIgnoreError(error)) {
            return;
        }
        let errorData;
        if (error instanceof Error) {
            errorData = {
                message: error.message,
                stack: error.stack,
                type: error.name || 'Error',
                timestamp: new Date().toISOString(),
                sessionId: '', // Will be set by transport
                url: window.location.href,
                breadcrumbs: [...this.breadcrumbs],
                context: Object.assign(Object.assign({}, context), { userAgent: navigator.userAgent, viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                    } }),
            };
            // Parse stack trace for line and column
            if (error.stack) {
                const stackMatch = error.stack.match(/:(\d+):(\d+)/);
                if (stackMatch) {
                    errorData.line = parseInt(stackMatch[1], 10);
                    errorData.column = parseInt(stackMatch[2], 10);
                }
            }
        }
        else {
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
        if (((_a = this.config.errorOptions) === null || _a === void 0 ? void 0 : _a.includeLocalVariables) && context) {
            errorData.context = Object.assign(Object.assign({}, errorData.context), { localVariables: context });
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
    shouldIgnoreError(error) {
        var _a, _b;
        const ignorePatterns = ((_a = this.config.errorOptions) === null || _a === void 0 ? void 0 : _a.ignoreErrors) || [];
        const errorMessage = error instanceof Error ? error.message : String(error);
        for (const pattern of ignorePatterns) {
            if (pattern instanceof RegExp) {
                if (pattern.test(errorMessage))
                    return true;
            }
            else if (typeof pattern === 'string') {
                if (errorMessage.includes(pattern))
                    return true;
            }
        }
        // Check deny URLs
        const denyUrls = ((_b = this.config.errorOptions) === null || _b === void 0 ? void 0 : _b.denyUrls) || [];
        const stack = error instanceof Error ? error.stack : '';
        for (const pattern of denyUrls) {
            if (pattern.test(stack || ''))
                return true;
        }
        return false;
    }
    setupAutomaticBreadcrumbs() {
        // Console breadcrumbs
        this.wrapConsole();
        // Click breadcrumbs
        document.addEventListener('click', (event) => {
            var _a;
            const target = event.target;
            this.addBreadcrumb({
                category: 'ui.click',
                message: `Clicked on ${target.tagName}`,
                data: {
                    tagName: target.tagName,
                    id: target.id,
                    className: target.className,
                    innerText: (_a = target.innerText) === null || _a === void 0 ? void 0 : _a.substring(0, 100),
                },
            });
        }, true);
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
    wrapConsole() {
        const levels = ['log', 'info', 'warn', 'error'];
        levels.forEach((level) => {
            const original = console[level];
            console[level] = (...args) => {
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
    getBreadcrumbs() {
        return [...this.breadcrumbs];
    }
}

class NetworkCollector {
    constructor(config, transport) {
        this.config = config;
        this.transport = transport;
    }
    start() {
        this.interceptFetch();
        this.interceptXHR();
    }
    interceptFetch() {
        if (!window.fetch)
            return;
        const originalFetch = window.fetch;
        window.fetch = (...args) => __awaiter$1(this, void 0, void 0, function* () {
            var _a, _b;
            const [resource, config] = args;
            const url = typeof resource === 'string'
                ? resource
                : resource instanceof Request
                    ? resource.url
                    : resource.toString();
            const method = (config === null || config === void 0 ? void 0 : config.method) || 'GET';
            const startTime = Date.now();
            try {
                const response = yield originalFetch(...args);
                // Clone response to read it without consuming the original
                const clonedResponse = response.clone();
                const duration = Date.now() - startTime;
                // Check if should be ignored
                if (this.shouldIgnoreUrl(url)) {
                    return response;
                }
                // Check if should only capture failed requests
                if (((_a = this.config.networkRequestOptions) === null || _a === void 0 ? void 0 : _a.captureFailedOnly) &&
                    response.ok) {
                    return response;
                }
                const networkRequest = {
                    url,
                    method,
                    statusCode: response.status,
                    durationMs: duration,
                    responseSize: yield this.getResponseSize(clonedResponse),
                    timestamp: new Date().toISOString(),
                };
                // Capture headers if enabled
                if ((_b = this.config.networkRequestOptions) === null || _b === void 0 ? void 0 : _b.captureHeaders) {
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
            }
            catch (error) {
                const duration = Date.now() - startTime;
                if (!this.shouldIgnoreUrl(url)) {
                    const networkRequest = {
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
        });
    }
    interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
            this.__devskin = {
                method,
                url: url.toString(),
                startTime: Date.now(),
            };
            if (username !== undefined) {
                return originalOpen.call(this, method, url, async !== null && async !== void 0 ? async : true, username, password !== null && password !== void 0 ? password : undefined);
            }
            else if (async !== undefined) {
                return originalOpen.call(this, method, url, async);
            }
            else {
                return originalOpen.call(this, method, url, true);
            }
        };
        XMLHttpRequest.prototype.send = function (body) {
            const xhr = this;
            const devskin = xhr.__devskin;
            if (!devskin) {
                return originalSend.call(this, body);
            }
            const collector = window.__devskinNetworkCollector;
            // Track when request completes
            const handleLoad = () => {
                var _a, _b;
                const duration = Date.now() - devskin.startTime;
                // Check if should be ignored
                if (collector === null || collector === void 0 ? void 0 : collector.shouldIgnoreUrl(devskin.url)) {
                    return;
                }
                // Check if should only capture failed requests
                if (((_a = collector === null || collector === void 0 ? void 0 : collector.config.networkRequestOptions) === null || _a === void 0 ? void 0 : _a.captureFailedOnly) &&
                    xhr.status >= 200 &&
                    xhr.status < 400) {
                    return;
                }
                const networkRequest = {
                    url: devskin.url,
                    method: devskin.method,
                    statusCode: xhr.status,
                    durationMs: duration,
                    timestamp: new Date().toISOString(),
                };
                // Capture headers if enabled
                if ((_b = collector === null || collector === void 0 ? void 0 : collector.config.networkRequestOptions) === null || _b === void 0 ? void 0 : _b.captureHeaders) {
                    networkRequest.responseHeaders = collector.parseResponseHeaders(xhr.getAllResponseHeaders());
                }
                // Capture error message for failed requests
                if (xhr.status === 0 || xhr.status >= 400) {
                    networkRequest.errorMessage = `HTTP ${xhr.status} ${xhr.statusText}`;
                }
                if (collector === null || collector === void 0 ? void 0 : collector.config.debug) {
                    console.log('[DevSkin] XHR request tracked:', networkRequest);
                }
                collector === null || collector === void 0 ? void 0 : collector.transport.sendNetworkRequest(networkRequest);
            };
            const handleError = () => {
                const duration = Date.now() - devskin.startTime;
                if (!(collector === null || collector === void 0 ? void 0 : collector.shouldIgnoreUrl(devskin.url))) {
                    const networkRequest = {
                        url: devskin.url,
                        method: devskin.method,
                        durationMs: duration,
                        timestamp: new Date().toISOString(),
                        errorMessage: 'XHR request failed',
                    };
                    if (collector === null || collector === void 0 ? void 0 : collector.config.debug) {
                        console.log('[DevSkin] XHR request failed:', networkRequest);
                    }
                    collector === null || collector === void 0 ? void 0 : collector.transport.sendNetworkRequest(networkRequest);
                }
            };
            xhr.addEventListener('load', handleLoad);
            xhr.addEventListener('error', handleError);
            xhr.addEventListener('abort', handleError);
            return originalSend.call(this, body);
        };
        // Store collector instance for XHR interceptor to access
        window.__devskinNetworkCollector = this;
    }
    shouldIgnoreUrl(url) {
        var _a;
        // Ignore our own API calls
        if (url.includes(this.config.apiUrl || '')) {
            return true;
        }
        const ignorePatterns = ((_a = this.config.networkRequestOptions) === null || _a === void 0 ? void 0 : _a.ignoreUrls) || [];
        for (const pattern of ignorePatterns) {
            if (pattern.test(url)) {
                return true;
            }
        }
        return false;
    }
    getResponseSize(response) {
        return __awaiter$1(this, void 0, void 0, function* () {
            try {
                const blob = yield response.blob();
                return blob.size;
            }
            catch (error) {
                return undefined;
            }
        });
    }
    headersToObject(headers) {
        const obj = {};
        headers.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }
    parseResponseHeaders(headerStr) {
        const headers = {};
        if (!headerStr)
            return headers;
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

class HeatmapCollector {
    constructor(config, transport, anonymousId, sessionId) {
        this.config = config;
        this.transport = transport;
        this.anonymousId = anonymousId;
        this.sessionId = sessionId;
        this.clickData = [];
        this.scrollData = [];
        this.mouseMoveData = [];
        this.maxScrollDepth = 0;
        this.flushInterval = null;
        this.mouseMoveSampling = 0.1; // Sample 10% of mouse movements to avoid overload
    }
    start() {
        var _a;
        if (!((_a = this.config.heatmapOptions) === null || _a === void 0 ? void 0 : _a.enabled)) {
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
    stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flush();
    }
    trackClicks() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            // Calculate relative position within element
            const rect = target.getBoundingClientRect();
            const relativeX = event.clientX - rect.left;
            const relativeY = event.clientY - rect.top;
            // Calculate page position (including scroll)
            const pageX = event.clientX + window.scrollX;
            const pageY = event.clientY + window.scrollY;
            const clickData = {
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
        }, true);
    }
    trackScrollDepth() {
        const updateScrollDepth = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollPercent = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
            if (scrollPercent > this.maxScrollDepth) {
                this.maxScrollDepth = scrollPercent;
                const scrollData = {
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
        let scrollTimeout = null;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(updateScrollDepth, 100);
        });
        // Initial depth
        updateScrollDepth();
    }
    trackMouseMovement() {
        let mouseMoveTimeout = null;
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
            const mouseMoveData = {
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
    flush() {
        // Send clicks individually (backend expects one click event per item)
        if (this.clickData.length > 0) {
            this.clickData.forEach(click => {
                this.transport.sendHeatmapData(Object.assign({ type: 'click', anonymousId: this.anonymousId, sessionId: this.sessionId }, click));
            });
            this.clickData = [];
        }
        // Send scroll data individually
        if (this.scrollData.length > 0) {
            this.scrollData.forEach(scroll => {
                this.transport.sendHeatmapData(Object.assign({ type: 'scroll', anonymousId: this.anonymousId, sessionId: this.sessionId }, scroll));
            });
            this.scrollData = [];
        }
        // Send mouse moves individually
        if (this.mouseMoveData.length > 0) {
            this.mouseMoveData.forEach(move => {
                this.transport.sendHeatmapData(Object.assign({ type: 'mousemove', anonymousId: this.anonymousId, sessionId: this.sessionId }, move));
            });
            this.mouseMoveData = [];
        }
    }
    getElementSelector(element) {
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

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var html2canvas$1 = {exports: {}};

/*!
 * html2canvas 1.4.1 <https://html2canvas.hertzen.com>
 * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
 * Released under MIT License
 */

(function (module, exports$1) {
	(function (global, factory) {
	    module.exports = factory() ;
	}(commonjsGlobal, (function () {
	    /*! *****************************************************************************
	    Copyright (c) Microsoft Corporation.

	    Permission to use, copy, modify, and/or distribute this software for any
	    purpose with or without fee is hereby granted.

	    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	    PERFORMANCE OF THIS SOFTWARE.
	    ***************************************************************************** */
	    /* global Reflect, Promise */

	    var extendStatics = function(d, b) {
	        extendStatics = Object.setPrototypeOf ||
	            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
	        return extendStatics(d, b);
	    };

	    function __extends(d, b) {
	        if (typeof b !== "function" && b !== null)
	            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
	        extendStatics(d, b);
	        function __() { this.constructor = d; }
	        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	    }

	    var __assign = function() {
	        __assign = Object.assign || function __assign(t) {
	            for (var s, i = 1, n = arguments.length; i < n; i++) {
	                s = arguments[i];
	                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	            }
	            return t;
	        };
	        return __assign.apply(this, arguments);
	    };

	    function __awaiter(thisArg, _arguments, P, generator) {
	        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	        return new (P || (P = Promise))(function (resolve, reject) {
	            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	            step((generator = generator.apply(thisArg, [])).next());
	        });
	    }

	    function __generator(thisArg, body) {
	        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
	        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
	        function verb(n) { return function (v) { return step([n, v]); }; }
	        function step(op) {
	            if (f) throw new TypeError("Generator is already executing.");
	            while (_) try {
	                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
	                if (y = 0, t) op = [op[0] & 2, t.value];
	                switch (op[0]) {
	                    case 0: case 1: t = op; break;
	                    case 4: _.label++; return { value: op[1], done: false };
	                    case 5: _.label++; y = op[1]; op = [0]; continue;
	                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
	                    default:
	                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
	                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
	                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
	                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
	                        if (t[2]) _.ops.pop();
	                        _.trys.pop(); continue;
	                }
	                op = body.call(thisArg, _);
	            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
	            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
	        }
	    }

	    function __spreadArray(to, from, pack) {
	        if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
	            if (ar || !(i in from)) {
	                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
	                ar[i] = from[i];
	            }
	        }
	        return to.concat(ar || from);
	    }

	    var Bounds = /** @class */ (function () {
	        function Bounds(left, top, width, height) {
	            this.left = left;
	            this.top = top;
	            this.width = width;
	            this.height = height;
	        }
	        Bounds.prototype.add = function (x, y, w, h) {
	            return new Bounds(this.left + x, this.top + y, this.width + w, this.height + h);
	        };
	        Bounds.fromClientRect = function (context, clientRect) {
	            return new Bounds(clientRect.left + context.windowBounds.left, clientRect.top + context.windowBounds.top, clientRect.width, clientRect.height);
	        };
	        Bounds.fromDOMRectList = function (context, domRectList) {
	            var domRect = Array.from(domRectList).find(function (rect) { return rect.width !== 0; });
	            return domRect
	                ? new Bounds(domRect.left + context.windowBounds.left, domRect.top + context.windowBounds.top, domRect.width, domRect.height)
	                : Bounds.EMPTY;
	        };
	        Bounds.EMPTY = new Bounds(0, 0, 0, 0);
	        return Bounds;
	    }());
	    var parseBounds = function (context, node) {
	        return Bounds.fromClientRect(context, node.getBoundingClientRect());
	    };
	    var parseDocumentSize = function (document) {
	        var body = document.body;
	        var documentElement = document.documentElement;
	        if (!body || !documentElement) {
	            throw new Error("Unable to get document size");
	        }
	        var width = Math.max(Math.max(body.scrollWidth, documentElement.scrollWidth), Math.max(body.offsetWidth, documentElement.offsetWidth), Math.max(body.clientWidth, documentElement.clientWidth));
	        var height = Math.max(Math.max(body.scrollHeight, documentElement.scrollHeight), Math.max(body.offsetHeight, documentElement.offsetHeight), Math.max(body.clientHeight, documentElement.clientHeight));
	        return new Bounds(0, 0, width, height);
	    };

	    /*
	     * css-line-break 2.1.0 <https://github.com/niklasvh/css-line-break#readme>
	     * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
	     * Released under MIT License
	     */
	    var toCodePoints$1 = function (str) {
	        var codePoints = [];
	        var i = 0;
	        var length = str.length;
	        while (i < length) {
	            var value = str.charCodeAt(i++);
	            if (value >= 0xd800 && value <= 0xdbff && i < length) {
	                var extra = str.charCodeAt(i++);
	                if ((extra & 0xfc00) === 0xdc00) {
	                    codePoints.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000);
	                }
	                else {
	                    codePoints.push(value);
	                    i--;
	                }
	            }
	            else {
	                codePoints.push(value);
	            }
	        }
	        return codePoints;
	    };
	    var fromCodePoint$1 = function () {
	        var codePoints = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            codePoints[_i] = arguments[_i];
	        }
	        if (String.fromCodePoint) {
	            return String.fromCodePoint.apply(String, codePoints);
	        }
	        var length = codePoints.length;
	        if (!length) {
	            return '';
	        }
	        var codeUnits = [];
	        var index = -1;
	        var result = '';
	        while (++index < length) {
	            var codePoint = codePoints[index];
	            if (codePoint <= 0xffff) {
	                codeUnits.push(codePoint);
	            }
	            else {
	                codePoint -= 0x10000;
	                codeUnits.push((codePoint >> 10) + 0xd800, (codePoint % 0x400) + 0xdc00);
	            }
	            if (index + 1 === length || codeUnits.length > 0x4000) {
	                result += String.fromCharCode.apply(String, codeUnits);
	                codeUnits.length = 0;
	            }
	        }
	        return result;
	    };
	    var chars$2 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	    // Use a lookup table to find the index.
	    var lookup$2 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
	    for (var i$2 = 0; i$2 < chars$2.length; i$2++) {
	        lookup$2[chars$2.charCodeAt(i$2)] = i$2;
	    }

	    /*
	     * utrie 1.0.2 <https://github.com/niklasvh/utrie>
	     * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
	     * Released under MIT License
	     */
	    var chars$1$1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	    // Use a lookup table to find the index.
	    var lookup$1$1 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
	    for (var i$1$1 = 0; i$1$1 < chars$1$1.length; i$1$1++) {
	        lookup$1$1[chars$1$1.charCodeAt(i$1$1)] = i$1$1;
	    }
	    var decode$1 = function (base64) {
	        var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
	        if (base64[base64.length - 1] === '=') {
	            bufferLength--;
	            if (base64[base64.length - 2] === '=') {
	                bufferLength--;
	            }
	        }
	        var buffer = typeof ArrayBuffer !== 'undefined' &&
	            typeof Uint8Array !== 'undefined' &&
	            typeof Uint8Array.prototype.slice !== 'undefined'
	            ? new ArrayBuffer(bufferLength)
	            : new Array(bufferLength);
	        var bytes = Array.isArray(buffer) ? buffer : new Uint8Array(buffer);
	        for (i = 0; i < len; i += 4) {
	            encoded1 = lookup$1$1[base64.charCodeAt(i)];
	            encoded2 = lookup$1$1[base64.charCodeAt(i + 1)];
	            encoded3 = lookup$1$1[base64.charCodeAt(i + 2)];
	            encoded4 = lookup$1$1[base64.charCodeAt(i + 3)];
	            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
	            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
	            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
	        }
	        return buffer;
	    };
	    var polyUint16Array$1 = function (buffer) {
	        var length = buffer.length;
	        var bytes = [];
	        for (var i = 0; i < length; i += 2) {
	            bytes.push((buffer[i + 1] << 8) | buffer[i]);
	        }
	        return bytes;
	    };
	    var polyUint32Array$1 = function (buffer) {
	        var length = buffer.length;
	        var bytes = [];
	        for (var i = 0; i < length; i += 4) {
	            bytes.push((buffer[i + 3] << 24) | (buffer[i + 2] << 16) | (buffer[i + 1] << 8) | buffer[i]);
	        }
	        return bytes;
	    };

	    /** Shift size for getting the index-2 table offset. */
	    var UTRIE2_SHIFT_2$1 = 5;
	    /** Shift size for getting the index-1 table offset. */
	    var UTRIE2_SHIFT_1$1 = 6 + 5;
	    /**
	     * Shift size for shifting left the index array values.
	     * Increases possible data size with 16-bit index values at the cost
	     * of compactability.
	     * This requires data blocks to be aligned by UTRIE2_DATA_GRANULARITY.
	     */
	    var UTRIE2_INDEX_SHIFT$1 = 2;
	    /**
	     * Difference between the two shift sizes,
	     * for getting an index-1 offset from an index-2 offset. 6=11-5
	     */
	    var UTRIE2_SHIFT_1_2$1 = UTRIE2_SHIFT_1$1 - UTRIE2_SHIFT_2$1;
	    /**
	     * The part of the index-2 table for U+D800..U+DBFF stores values for
	     * lead surrogate code _units_ not code _points_.
	     * Values for lead surrogate code _points_ are indexed with this portion of the table.
	     * Length=32=0x20=0x400>>UTRIE2_SHIFT_2. (There are 1024=0x400 lead surrogates.)
	     */
	    var UTRIE2_LSCP_INDEX_2_OFFSET$1 = 0x10000 >> UTRIE2_SHIFT_2$1;
	    /** Number of entries in a data block. 32=0x20 */
	    var UTRIE2_DATA_BLOCK_LENGTH$1 = 1 << UTRIE2_SHIFT_2$1;
	    /** Mask for getting the lower bits for the in-data-block offset. */
	    var UTRIE2_DATA_MASK$1 = UTRIE2_DATA_BLOCK_LENGTH$1 - 1;
	    var UTRIE2_LSCP_INDEX_2_LENGTH$1 = 0x400 >> UTRIE2_SHIFT_2$1;
	    /** Count the lengths of both BMP pieces. 2080=0x820 */
	    var UTRIE2_INDEX_2_BMP_LENGTH$1 = UTRIE2_LSCP_INDEX_2_OFFSET$1 + UTRIE2_LSCP_INDEX_2_LENGTH$1;
	    /**
	     * The 2-byte UTF-8 version of the index-2 table follows at offset 2080=0x820.
	     * Length 32=0x20 for lead bytes C0..DF, regardless of UTRIE2_SHIFT_2.
	     */
	    var UTRIE2_UTF8_2B_INDEX_2_OFFSET$1 = UTRIE2_INDEX_2_BMP_LENGTH$1;
	    var UTRIE2_UTF8_2B_INDEX_2_LENGTH$1 = 0x800 >> 6; /* U+0800 is the first code point after 2-byte UTF-8 */
	    /**
	     * The index-1 table, only used for supplementary code points, at offset 2112=0x840.
	     * Variable length, for code points up to highStart, where the last single-value range starts.
	     * Maximum length 512=0x200=0x100000>>UTRIE2_SHIFT_1.
	     * (For 0x100000 supplementary code points U+10000..U+10ffff.)
	     *
	     * The part of the index-2 table for supplementary code points starts
	     * after this index-1 table.
	     *
	     * Both the index-1 table and the following part of the index-2 table
	     * are omitted completely if there is only BMP data.
	     */
	    var UTRIE2_INDEX_1_OFFSET$1 = UTRIE2_UTF8_2B_INDEX_2_OFFSET$1 + UTRIE2_UTF8_2B_INDEX_2_LENGTH$1;
	    /**
	     * Number of index-1 entries for the BMP. 32=0x20
	     * This part of the index-1 table is omitted from the serialized form.
	     */
	    var UTRIE2_OMITTED_BMP_INDEX_1_LENGTH$1 = 0x10000 >> UTRIE2_SHIFT_1$1;
	    /** Number of entries in an index-2 block. 64=0x40 */
	    var UTRIE2_INDEX_2_BLOCK_LENGTH$1 = 1 << UTRIE2_SHIFT_1_2$1;
	    /** Mask for getting the lower bits for the in-index-2-block offset. */
	    var UTRIE2_INDEX_2_MASK$1 = UTRIE2_INDEX_2_BLOCK_LENGTH$1 - 1;
	    var slice16$1 = function (view, start, end) {
	        if (view.slice) {
	            return view.slice(start, end);
	        }
	        return new Uint16Array(Array.prototype.slice.call(view, start, end));
	    };
	    var slice32$1 = function (view, start, end) {
	        if (view.slice) {
	            return view.slice(start, end);
	        }
	        return new Uint32Array(Array.prototype.slice.call(view, start, end));
	    };
	    var createTrieFromBase64$1 = function (base64, _byteLength) {
	        var buffer = decode$1(base64);
	        var view32 = Array.isArray(buffer) ? polyUint32Array$1(buffer) : new Uint32Array(buffer);
	        var view16 = Array.isArray(buffer) ? polyUint16Array$1(buffer) : new Uint16Array(buffer);
	        var headerLength = 24;
	        var index = slice16$1(view16, headerLength / 2, view32[4] / 2);
	        var data = view32[5] === 2
	            ? slice16$1(view16, (headerLength + view32[4]) / 2)
	            : slice32$1(view32, Math.ceil((headerLength + view32[4]) / 4));
	        return new Trie$1(view32[0], view32[1], view32[2], view32[3], index, data);
	    };
	    var Trie$1 = /** @class */ (function () {
	        function Trie(initialValue, errorValue, highStart, highValueIndex, index, data) {
	            this.initialValue = initialValue;
	            this.errorValue = errorValue;
	            this.highStart = highStart;
	            this.highValueIndex = highValueIndex;
	            this.index = index;
	            this.data = data;
	        }
	        /**
	         * Get the value for a code point as stored in the Trie.
	         *
	         * @param codePoint the code point
	         * @return the value
	         */
	        Trie.prototype.get = function (codePoint) {
	            var ix;
	            if (codePoint >= 0) {
	                if (codePoint < 0x0d800 || (codePoint > 0x0dbff && codePoint <= 0x0ffff)) {
	                    // Ordinary BMP code point, excluding leading surrogates.
	                    // BMP uses a single level lookup.  BMP index starts at offset 0 in the Trie2 index.
	                    // 16 bit data is stored in the index array itself.
	                    ix = this.index[codePoint >> UTRIE2_SHIFT_2$1];
	                    ix = (ix << UTRIE2_INDEX_SHIFT$1) + (codePoint & UTRIE2_DATA_MASK$1);
	                    return this.data[ix];
	                }
	                if (codePoint <= 0xffff) {
	                    // Lead Surrogate Code Point.  A Separate index section is stored for
	                    // lead surrogate code units and code points.
	                    //   The main index has the code unit data.
	                    //   For this function, we need the code point data.
	                    // Note: this expression could be refactored for slightly improved efficiency, but
	                    //       surrogate code points will be so rare in practice that it's not worth it.
	                    ix = this.index[UTRIE2_LSCP_INDEX_2_OFFSET$1 + ((codePoint - 0xd800) >> UTRIE2_SHIFT_2$1)];
	                    ix = (ix << UTRIE2_INDEX_SHIFT$1) + (codePoint & UTRIE2_DATA_MASK$1);
	                    return this.data[ix];
	                }
	                if (codePoint < this.highStart) {
	                    // Supplemental code point, use two-level lookup.
	                    ix = UTRIE2_INDEX_1_OFFSET$1 - UTRIE2_OMITTED_BMP_INDEX_1_LENGTH$1 + (codePoint >> UTRIE2_SHIFT_1$1);
	                    ix = this.index[ix];
	                    ix += (codePoint >> UTRIE2_SHIFT_2$1) & UTRIE2_INDEX_2_MASK$1;
	                    ix = this.index[ix];
	                    ix = (ix << UTRIE2_INDEX_SHIFT$1) + (codePoint & UTRIE2_DATA_MASK$1);
	                    return this.data[ix];
	                }
	                if (codePoint <= 0x10ffff) {
	                    return this.data[this.highValueIndex];
	                }
	            }
	            // Fall through.  The code point is outside of the legal range of 0..0x10ffff.
	            return this.errorValue;
	        };
	        return Trie;
	    }());

	    /*
	     * base64-arraybuffer 1.0.2 <https://github.com/niklasvh/base64-arraybuffer>
	     * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
	     * Released under MIT License
	     */
	    var chars$3 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	    // Use a lookup table to find the index.
	    var lookup$3 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
	    for (var i$3 = 0; i$3 < chars$3.length; i$3++) {
	        lookup$3[chars$3.charCodeAt(i$3)] = i$3;
	    }

	    var base64$1 = 'KwAAAAAAAAAACA4AUD0AADAgAAACAAAAAAAIABAAGABAAEgAUABYAGAAaABgAGgAYgBqAF8AZwBgAGgAcQB5AHUAfQCFAI0AlQCdAKIAqgCyALoAYABoAGAAaABgAGgAwgDKAGAAaADGAM4A0wDbAOEA6QDxAPkAAQEJAQ8BFwF1AH0AHAEkASwBNAE6AUIBQQFJAVEBWQFhAWgBcAF4ATAAgAGGAY4BlQGXAZ8BpwGvAbUBvQHFAc0B0wHbAeMB6wHxAfkBAQIJAvEBEQIZAiECKQIxAjgCQAJGAk4CVgJeAmQCbAJ0AnwCgQKJApECmQKgAqgCsAK4ArwCxAIwAMwC0wLbAjAA4wLrAvMC+AIAAwcDDwMwABcDHQMlAy0DNQN1AD0DQQNJA0kDSQNRA1EDVwNZA1kDdQB1AGEDdQBpA20DdQN1AHsDdQCBA4kDkQN1AHUAmQOhA3UAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AKYDrgN1AHUAtgO+A8YDzgPWAxcD3gPjA+sD8wN1AHUA+wMDBAkEdQANBBUEHQQlBCoEFwMyBDgEYABABBcDSARQBFgEYARoBDAAcAQzAXgEgASIBJAEdQCXBHUAnwSnBK4EtgS6BMIEyAR1AHUAdQB1AHUAdQCVANAEYABgAGAAYABgAGAAYABgANgEYADcBOQEYADsBPQE/AQEBQwFFAUcBSQFLAU0BWQEPAVEBUsFUwVbBWAAYgVgAGoFcgV6BYIFigWRBWAAmQWfBaYFYABgAGAAYABgAKoFYACxBbAFuQW6BcEFwQXHBcEFwQXPBdMF2wXjBeoF8gX6BQIGCgYSBhoGIgYqBjIGOgZgAD4GRgZMBmAAUwZaBmAAYABgAGAAYABgAGAAYABgAGAAYABgAGIGYABpBnAGYABgAGAAYABgAGAAYABgAGAAYAB4Bn8GhQZgAGAAYAB1AHcDFQSLBmAAYABgAJMGdQA9A3UAmwajBqsGqwaVALMGuwbDBjAAywbSBtIG1QbSBtIG0gbSBtIG0gbdBuMG6wbzBvsGAwcLBxMHAwcbByMHJwcsBywHMQcsB9IGOAdAB0gHTgfSBkgHVgfSBtIG0gbSBtIG0gbSBtIG0gbSBiwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdgAGAALAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdbB2MHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB2kH0gZwB64EdQB1AHUAdQB1AHUAdQB1AHUHfQdgAIUHjQd1AHUAlQedB2AAYAClB6sHYACzB7YHvgfGB3UAzgfWBzMB3gfmB1EB7gf1B/0HlQENAQUIDQh1ABUIHQglCBcDLQg1CD0IRQhNCEEDUwh1AHUAdQBbCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIcAh3CHoIMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIgggwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAALAcsBywHLAcsBywHLAcsBywHLAcsB4oILAcsB44I0gaWCJ4Ipgh1AHUAqgiyCHUAdQB1AHUAdQB1AHUAdQB1AHUAtwh8AXUAvwh1AMUIyQjRCNkI4AjoCHUAdQB1AO4I9gj+CAYJDgkTCS0HGwkjCYIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiAAIAAAAFAAYABgAGIAXwBgAHEAdQBFAJUAogCyAKAAYABgAEIA4ABGANMA4QDxAMEBDwE1AFwBLAE6AQEBUQF4QkhCmEKoQrhCgAHIQsAB0MLAAcABwAHAAeDC6ABoAHDCwMMAAcABwAHAAdDDGMMAAcAB6MM4wwjDWMNow3jDaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAEjDqABWw6bDqABpg6gAaABoAHcDvwOPA+gAaABfA/8DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DpcPAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcAB9cPKwkyCToJMAB1AHUAdQBCCUoJTQl1AFUJXAljCWcJawkwADAAMAAwAHMJdQB2CX4JdQCECYoJjgmWCXUAngkwAGAAYABxAHUApgn3A64JtAl1ALkJdQDACTAAMAAwADAAdQB1AHUAdQB1AHUAdQB1AHUAowYNBMUIMAAwADAAMADICcsJ0wnZCRUE4QkwAOkJ8An4CTAAMAB1AAAKvwh1AAgKDwoXCh8KdQAwACcKLgp1ADYKqAmICT4KRgowADAAdQB1AE4KMAB1AFYKdQBeCnUAZQowADAAMAAwADAAMAAwADAAMAAVBHUAbQowADAAdQC5CXUKMAAwAHwBxAijBogEMgF9CoQKiASMCpQKmgqIBKIKqgquCogEDQG2Cr4KxgrLCjAAMADTCtsKCgHjCusK8Qr5CgELMAAwADAAMAB1AIsECQsRC3UANAEZCzAAMAAwADAAMAB1ACELKQswAHUANAExCzkLdQBBC0kLMABRC1kLMAAwADAAMAAwADAAdQBhCzAAMAAwAGAAYABpC3ELdwt/CzAAMACHC4sLkwubC58Lpwt1AK4Ltgt1APsDMAAwADAAMAAwADAAMAAwAL4LwwvLC9IL1wvdCzAAMADlC+kL8Qv5C/8LSQswADAAMAAwADAAMAAwADAAMAAHDDAAMAAwADAAMAAODBYMHgx1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1ACYMMAAwADAAdQB1AHUALgx1AHUAdQB1AHUAdQA2DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AD4MdQBGDHUAdQB1AHUAdQB1AEkMdQB1AHUAdQB1AFAMMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQBYDHUAdQB1AF8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUA+wMVBGcMMAAwAHwBbwx1AHcMfwyHDI8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAYABgAJcMMAAwADAAdQB1AJ8MlQClDDAAMACtDCwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB7UMLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AA0EMAC9DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAsBywHLAcsBywHLAcsBywHLQcwAMEMyAwsBywHLAcsBywHLAcsBywHLAcsBywHzAwwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1ANQM2QzhDDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMABgAGAAYABgAGAAYABgAOkMYADxDGAA+AwADQYNYABhCWAAYAAODTAAMAAwADAAFg1gAGAAHg37AzAAMAAwADAAYABgACYNYAAsDTQNPA1gAEMNPg1LDWAAYABgAGAAYABgAGAAYABgAGAAUg1aDYsGVglhDV0NcQBnDW0NdQ15DWAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAlQCBDZUAiA2PDZcNMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAnw2nDTAAMAAwADAAMAAwAHUArw23DTAAMAAwADAAMAAwADAAMAAwADAAMAB1AL8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQDHDTAAYABgAM8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA1w11ANwNMAAwAD0B5A0wADAAMAAwADAAMADsDfQN/A0EDgwOFA4wABsOMAAwADAAMAAwADAAMAAwANIG0gbSBtIG0gbSBtIG0gYjDigOwQUuDsEFMw7SBjoO0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGQg5KDlIOVg7SBtIGXg5lDm0OdQ7SBtIGfQ6EDooOjQ6UDtIGmg6hDtIG0gaoDqwO0ga0DrwO0gZgAGAAYADEDmAAYAAkBtIGzA5gANIOYADaDokO0gbSBt8O5w7SBu8O0gb1DvwO0gZgAGAAxA7SBtIG0gbSBtIGYABgAGAAYAAED2AAsAUMD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHJA8sBywHLAcsBywHLAccDywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywPLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAc0D9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHPA/SBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gYUD0QPlQCVAJUAMAAwADAAMACVAJUAlQCVAJUAlQCVAEwPMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA//8EAAQABAAEAAQABAAEAAQABAANAAMAAQABAAIABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACgATABcAHgAbABoAHgAXABYAEgAeABsAGAAPABgAHABLAEsASwBLAEsASwBLAEsASwBLABgAGAAeAB4AHgATAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABYAGwASAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWAA0AEQAeAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAFAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJABYAGgAbABsAGwAeAB0AHQAeAE8AFwAeAA0AHgAeABoAGwBPAE8ADgBQAB0AHQAdAE8ATwAXAE8ATwBPABYAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAFAATwBAAE8ATwBPAEAATwBQAFAATwBQAB4AHgAeAB4AHgAeAB0AHQAdAB0AHgAdAB4ADgBQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgBQAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAkACQAJAAkACQAJAAkABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAFAAHgAeAB4AKwArAFAAUABQAFAAGABQACsAKwArACsAHgAeAFAAHgBQAFAAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUAAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAYAA0AKwArAB4AHgAbACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAB4ABAAEAB4ABAAEABMABAArACsAKwArACsAKwArACsAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAKwArACsAKwBWAFYAVgBWAB4AHgArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AGgAaABoAGAAYAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQAEwAEACsAEwATAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABLAEsASwBLAEsASwBLAEsASwBLABoAGQAZAB4AUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABMAUAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABABQAFAABAAEAB4ABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUAAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAFAABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQAUABQAB4AHgAYABMAUAArACsABAAbABsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAFAABAAEAAQABAAEAFAABAAEAAQAUAAEAAQABAAEAAQAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArACsAHgArAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEAA0ADQBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUAArACsAKwBQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABABQACsAKwArACsAKwArACsAKwAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUAAaABoAUABQAFAAUABQAEwAHgAbAFAAHgAEACsAKwAEAAQABAArAFAAUABQAFAAUABQACsAKwArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQACsAUABQACsAKwAEACsABAAEAAQABAAEACsAKwArACsABAAEACsAKwAEAAQABAArACsAKwAEACsAKwArACsAKwArACsAUABQAFAAUAArAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLAAQABABQAFAAUAAEAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAArACsAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AGwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAKwArACsAKwArAAQABAAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAAQAUAArAFAAUABQAFAAUABQACsAKwArAFAAUABQACsAUABQAFAAUAArACsAKwBQAFAAKwBQACsAUABQACsAKwArAFAAUAArACsAKwBQAFAAUAArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArAAQABAAEAAQABAArACsAKwAEAAQABAArAAQABAAEAAQAKwArAFAAKwArACsAKwArACsABAArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAHgAeAB4AHgAeAB4AGwAeACsAKwArACsAKwAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAUABQAFAAKwArACsAKwArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwAOAFAAUABQAFAAUABQAFAAHgBQAAQABAAEAA4AUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAKwArAAQAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAKwArACsAKwArACsAUAArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAFAABAAEAAQABAAEAAQABAArAAQABAAEACsABAAEAAQABABQAB4AKwArACsAKwBQAFAAUAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQABoAUABQAFAAUABQAFAAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQACsAUAArACsAUABQAFAAUABQAFAAUAArACsAKwAEACsAKwArACsABAAEAAQABAAEAAQAKwAEACsABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArAAQABAAeACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAXAAqACoAKgAqACoAKgAqACsAKwArACsAGwBcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAeAEsASwBLAEsASwBLAEsASwBLAEsADQANACsAKwArACsAKwBcAFwAKwBcACsAXABcAFwAXABcACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAXAArAFwAXABcAFwAXABcAFwAXABcAFwAKgBcAFwAKgAqACoAKgAqACoAKgAqACoAXAArACsAXABcAFwAXABcACsAXAArACoAKgAqACoAKgAqACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwBcAFwAXABcAFAADgAOAA4ADgAeAA4ADgAJAA4ADgANAAkAEwATABMAEwATAAkAHgATAB4AHgAeAAQABAAeAB4AHgAeAB4AHgBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQAFAADQAEAB4ABAAeAAQAFgARABYAEQAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAAQABAAEAAQADQAEAAQAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAA0ADQAeAB4AHgAeAB4AHgAEAB4AHgAeAB4AHgAeACsAHgAeAA4ADgANAA4AHgAeAB4AHgAeAAkACQArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgBcAEsASwBLAEsASwBLAEsASwBLAEsADQANAB4AHgAeAB4AXABcAFwAXABcAFwAKgAqACoAKgBcAFwAXABcACoAKgAqAFwAKgAqACoAXABcACoAKgAqACoAKgAqACoAXABcAFwAKgAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqAFwAKgBLAEsASwBLAEsASwBLAEsASwBLACoAKgAqACoAKgAqAFAAUABQAFAAUABQACsAUAArACsAKwArACsAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAKwBQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsABAAEAAQAHgANAB4AHgAeAB4AHgAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUAArACsADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWABEAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQANAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAANAA0AKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUAArAAQABAArACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqAA0ADQAVAFwADQAeAA0AGwBcACoAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwAeAB4AEwATAA0ADQAOAB4AEwATAB4ABAAEAAQACQArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAHgArACsAKwATABMASwBLAEsASwBLAEsASwBLAEsASwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAXABcAFwAXABcACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAXAArACsAKwAqACoAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsAHgAeAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKwAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKwArAAQASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACoAKgAqACoAKgAqACoAXAAqACoAKgAqACoAKgArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABABQAFAAUABQAFAAUABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwANAA0AHgANAA0ADQANAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwAeAB4AHgAeAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArAA0ADQANAA0ADQBLAEsASwBLAEsASwBLAEsASwBLACsAKwArAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUAAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAAQAUABQAFAAUABQAFAABABQAFAABAAEAAQAUAArACsAKwArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQACsAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAFAAUABQACsAHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQACsAKwAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQACsAHgAeAB4AHgAeAB4AHgAOAB4AKwANAA0ADQANAA0ADQANAAkADQANAA0ACAAEAAsABAAEAA0ACQANAA0ADAAdAB0AHgAXABcAFgAXABcAFwAWABcAHQAdAB4AHgAUABQAFAANAAEAAQAEAAQABAAEAAQACQAaABoAGgAaABoAGgAaABoAHgAXABcAHQAVABUAHgAeAB4AHgAeAB4AGAAWABEAFQAVABUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ADQAeAA0ADQANAA0AHgANAA0ADQAHAB4AHgAeAB4AKwAEAAQABAAEAAQABAAEAAQABAAEAFAAUAArACsATwBQAFAAUABQAFAAHgAeAB4AFgARAE8AUABPAE8ATwBPAFAAUABQAFAAUAAeAB4AHgAWABEAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArABsAGwAbABsAGwAbABsAGgAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGgAbABsAGwAbABoAGwAbABoAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAHgAeAFAAGgAeAB0AHgBQAB4AGgAeAB4AHgAeAB4AHgAeAB4AHgBPAB4AUAAbAB4AHgBQAFAAUABQAFAAHgAeAB4AHQAdAB4AUAAeAFAAHgBQAB4AUABPAFAAUAAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgBQAFAAUABQAE8ATwBQAFAAUABQAFAATwBQAFAATwBQAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAUABQAFAATwBPAE8ATwBPAE8ATwBPAE8ATwBQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABPAB4AHgArACsAKwArAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHQAdAB4AHgAeAB0AHQAeAB4AHQAeAB4AHgAdAB4AHQAbABsAHgAdAB4AHgAeAB4AHQAeAB4AHQAdAB0AHQAeAB4AHQAeAB0AHgAdAB0AHQAdAB0AHQAeAB0AHgAeAB4AHgAeAB0AHQAdAB0AHgAeAB4AHgAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHgAeAB0AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAeAB0AHQAdAB0AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAdAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAWABEAHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAWABEAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AHQAdAB0AHgAeAB0AHgAeAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlAB4AHQAdAB4AHgAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AJQAlAB0AHQAlAB4AJQAlACUAIAAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAdAB0AHQAeAB0AJQAdAB0AHgAdAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAdAB0AHQAdACUAHgAlACUAJQAdACUAJQAdAB0AHQAlACUAHQAdACUAHQAdACUAJQAlAB4AHQAeAB4AHgAeAB0AHQAlAB0AHQAdAB0AHQAdACUAJQAlACUAJQAdACUAJQAgACUAHQAdACUAJQAlACUAJQAlACUAJQAeAB4AHgAlACUAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AFwAXABcAFwAXABcAHgATABMAJQAeAB4AHgAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARABYAEQAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAEAAQABAAeAB4AKwArACsAKwArABMADQANAA0AUAATAA0AUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUAANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAA0ADQANAA0ADQANAA0ADQAeAA0AFgANAB4AHgAXABcAHgAeABcAFwAWABEAFgARABYAEQAWABEADQANAA0ADQATAFAADQANAB4ADQANAB4AHgAeAB4AHgAMAAwADQANAA0AHgANAA0AFgANAA0ADQANAA0ADQANAA0AHgANAB4ADQANAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArAA0AEQARACUAJQBHAFcAVwAWABEAFgARABYAEQAWABEAFgARACUAJQAWABEAFgARABYAEQAWABEAFQAWABEAEQAlAFcAVwBXAFcAVwBXAFcAVwBXAAQABAAEAAQABAAEACUAVwBXAFcAVwA2ACUAJQBXAFcAVwBHAEcAJQAlACUAKwBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBRAFcAUQBXAFEAVwBXAFcAVwBXAFcAUQBXAFcAVwBXAFcAVwBRAFEAKwArAAQABAAVABUARwBHAFcAFQBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBRAFcAVwBXAFcAVwBXAFEAUQBXAFcAVwBXABUAUQBHAEcAVwArACsAKwArACsAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwAlACUAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACsAKwArACsAKwArACsAKwArACsAKwArAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBPAE8ATwBPAE8ATwBPAE8AJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADQATAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABLAEsASwBLAEsASwBLAEsASwBLAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAABAAEAAQABAAeAAQABAAEAAQABAAEAAQABAAEAAQAHgBQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAeAA0ADQANAA0ADQArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAAQAUABQAFAABABQAFAAUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAeAB4AHgAeAAQAKwArACsAUABQAFAAUABQAFAAHgAeABoAHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADgAOABMAEwArACsAKwArACsAKwArACsABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwANAA0ASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUAAeAB4AHgBQAA4AUABQAAQAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArAB4AWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYACsAKwArAAQAHgAeAB4AHgAeAB4ADQANAA0AHgAeAB4AHgArAFAASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArAB4AHgBcAFwAXABcAFwAKgBcAFwAXABcAFwAXABcAFwAXABcAEsASwBLAEsASwBLAEsASwBLAEsAXABcAFwAXABcACsAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAFAAUABQAAQAUABQAFAAUABQAFAAUABQAAQABAArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAHgANAA0ADQBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAXAAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAKgAqACoAXABcACoAKgBcAFwAXABcAFwAKgAqAFwAKgBcACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcACoAKgBQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAA0ADQBQAFAAUAAEAAQAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQADQAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAVABVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBUAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVACsAKwArACsAKwArACsAKwArACsAKwArAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAKwArACsAKwBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAKwArACsAKwAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAKwArACsAKwArAFYABABWAFYAVgBWAFYAVgBWAFYAVgBWAB4AVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgArAFYAVgBWAFYAVgArAFYAKwBWAFYAKwBWAFYAKwBWAFYAVgBWAFYAVgBWAFYAVgBWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAEQAWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAaAB4AKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAGAARABEAGAAYABMAEwAWABEAFAArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACUAJQAlACUAJQAWABEAFgARABYAEQAWABEAFgARABYAEQAlACUAFgARACUAJQAlACUAJQAlACUAEQAlABEAKwAVABUAEwATACUAFgARABYAEQAWABEAJQAlACUAJQAlACUAJQAlACsAJQAbABoAJQArACsAKwArAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAcAKwATACUAJQAbABoAJQAlABYAEQAlACUAEQAlABEAJQBXAFcAVwBXAFcAVwBXAFcAVwBXABUAFQAlACUAJQATACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXABYAJQARACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAWACUAEQAlABYAEQARABYAEQARABUAVwBRAFEAUQBRAFEAUQBRAFEAUQBRAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcARwArACsAVwBXAFcAVwBXAFcAKwArAFcAVwBXAFcAVwBXACsAKwBXAFcAVwBXAFcAVwArACsAVwBXAFcAKwArACsAGgAbACUAJQAlABsAGwArAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAAQAB0AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsADQANAA0AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAA0AUABQAFAAUAArACsAKwArAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwArAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwBQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAUABQAFAAUABQAAQABAAEACsABAAEACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAKwBQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAA0ADQANAA0ADQANAA0ADQAeACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAArACsAKwArAFAAUABQAFAAUAANAA0ADQANAA0ADQAUACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsADQANAA0ADQANAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArAAQABAANACsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAB4AHgAeAB4AHgArACsAKwArACsAKwAEAAQABAAEAAQABAAEAA0ADQAeAB4AHgAeAB4AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsASwBLAEsASwBLAEsASwBLAEsASwANAA0ADQANAFAABAAEAFAAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAeAA4AUAArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAADQANAB4ADQAEAAQABAAEAB4ABAAEAEsASwBLAEsASwBLAEsASwBLAEsAUAAOAFAADQANAA0AKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAANAA0AHgANAA0AHgAEACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAA0AKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsABAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsABAAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAUAArACsAKwArACsAKwAEACsAKwArACsAKwBQAFAAUABQAFAABAAEACsAKwAEAAQABAAEAAQABAAEACsAKwArAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAAQABABQAFAAUABQAA0ADQANAA0AHgBLAEsASwBLAEsASwBLAEsASwBLAA0ADQArAB4ABABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUAAeAFAAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABAAEAAQADgANAA0AEwATAB4AHgAeAA0ADQANAA0ADQANAA0ADQANAA0ADQANAA0ADQANAFAAUABQAFAABAAEACsAKwAEAA0ADQAeAFAAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKwArACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBcAFwADQANAA0AKgBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAKwArAFAAKwArAFAAUABQAFAAUABQAFAAUAArAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQAKwAEAAQAKwArAAQABAAEAAQAUAAEAFAABAAEAA0ADQANACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABABQAA4AUAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAFAABAAEAAQABAAOAB4ADQANAA0ADQAOAB4ABAArACsAKwArACsAKwArACsAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAA0ADQANAFAADgAOAA4ADQANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAAQABAAEAFAADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAOABMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAArACsAKwAEACsABAAEACsABAAEAAQABAAEAAQABABQAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAaABoAGgAaAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABIAEgAQwBDAEMAUABQAFAAUABDAFAAUABQAEgAQwBIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABDAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAJAAkACQAJAAkACQAJABYAEQArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwANAA0AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAANACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAA0ADQANAB4AHgAeAB4AHgAeAFAAUABQAFAADQAeACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAA0AHgAeACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAARwBHABUARwAJACsAKwArACsAKwArACsAKwArACsAKwAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUQBRAFEAKwArACsAKwArACsAKwArACsAKwArACsAKwBRAFEAUQBRACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAHgAEAAQADQAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQABAAEAAQABAAeAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQAHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAKwArAFAAKwArAFAAUAArACsAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUAArAFAAUABQAFAAUABQAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAHgAeAFAAUABQAFAAUAArAFAAKwArACsAUABQAFAAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeACsAKwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4ABAAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAHgAeAA0ADQANAA0AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArAAQABAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwBQAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArABsAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAB4AHgAeAB4ABAAEAAQABAAEAAQABABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArABYAFgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAGgBQAFAAUAAaAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUAArACsAKwArACsAKwBQACsAKwArACsAUAArAFAAKwBQACsAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUAArAFAAKwBQACsAUAArAFAAUAArAFAAKwArAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAKwBQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8AJQAlACUAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB4AHgAeACUAJQAlAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAlACUAJQAlACUAHgAlACUAJQAlACUAIAAgACAAJQAlACAAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACEAIQAhACEAIQAlACUAIAAgACUAJQAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAIAAlACUAJQAlACAAIAAgACUAIAAgACAAJQAlACUAJQAlACUAJQAgACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAlAB4AJQAeACUAJQAlACUAJQAgACUAJQAlACUAHgAlAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACAAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABcAFwAXABUAFQAVAB4AHgAeAB4AJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAgACUAJQAgACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAIAAgACUAJQAgACAAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACAAIAAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACAAIAAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAA==';

	    var LETTER_NUMBER_MODIFIER = 50;
	    // Non-tailorable Line Breaking Classes
	    var BK = 1; //  Cause a line break (after)
	    var CR$1 = 2; //  Cause a line break (after), except between CR and LF
	    var LF$1 = 3; //  Cause a line break (after)
	    var CM = 4; //  Prohibit a line break between the character and the preceding character
	    var NL = 5; //  Cause a line break (after)
	    var WJ = 7; //  Prohibit line breaks before and after
	    var ZW = 8; //  Provide a break opportunity
	    var GL = 9; //  Prohibit line breaks before and after
	    var SP = 10; // Enable indirect line breaks
	    var ZWJ$1 = 11; // Prohibit line breaks within joiner sequences
	    // Break Opportunities
	    var B2 = 12; //  Provide a line break opportunity before and after the character
	    var BA = 13; //  Generally provide a line break opportunity after the character
	    var BB = 14; //  Generally provide a line break opportunity before the character
	    var HY = 15; //  Provide a line break opportunity after the character, except in numeric context
	    var CB = 16; //   Provide a line break opportunity contingent on additional information
	    // Characters Prohibiting Certain Breaks
	    var CL = 17; //  Prohibit line breaks before
	    var CP = 18; //  Prohibit line breaks before
	    var EX = 19; //  Prohibit line breaks before
	    var IN = 20; //  Allow only indirect line breaks between pairs
	    var NS = 21; //  Allow only indirect line breaks before
	    var OP = 22; //  Prohibit line breaks after
	    var QU = 23; //  Act like they are both opening and closing
	    // Numeric Context
	    var IS = 24; //  Prevent breaks after any and before numeric
	    var NU = 25; //  Form numeric expressions for line breaking purposes
	    var PO = 26; //  Do not break following a numeric expression
	    var PR = 27; //  Do not break in front of a numeric expression
	    var SY = 28; //  Prevent a break before; and allow a break after
	    // Other Characters
	    var AI = 29; //  Act like AL when the resolvedEAW is N; otherwise; act as ID
	    var AL = 30; //  Are alphabetic characters or symbols that are used with alphabetic characters
	    var CJ = 31; //  Treat as NS or ID for strict or normal breaking.
	    var EB = 32; //  Do not break from following Emoji Modifier
	    var EM = 33; //  Do not break from preceding Emoji Base
	    var H2 = 34; //  Form Korean syllable blocks
	    var H3 = 35; //  Form Korean syllable blocks
	    var HL = 36; //  Do not break around a following hyphen; otherwise act as Alphabetic
	    var ID = 37; //  Break before or after; except in some numeric context
	    var JL = 38; //  Form Korean syllable blocks
	    var JV = 39; //  Form Korean syllable blocks
	    var JT = 40; //  Form Korean syllable blocks
	    var RI$1 = 41; //  Keep pairs together. For pairs; break before and after other classes
	    var SA = 42; //  Provide a line break opportunity contingent on additional, language-specific context analysis
	    var XX = 43; //  Have as yet unknown line breaking behavior or unassigned code positions
	    var ea_OP = [0x2329, 0xff08];
	    var BREAK_MANDATORY = '!';
	    var BREAK_NOT_ALLOWED$1 = '×';
	    var BREAK_ALLOWED$1 = '÷';
	    var UnicodeTrie$1 = createTrieFromBase64$1(base64$1);
	    var ALPHABETICS = [AL, HL];
	    var HARD_LINE_BREAKS = [BK, CR$1, LF$1, NL];
	    var SPACE$1 = [SP, ZW];
	    var PREFIX_POSTFIX = [PR, PO];
	    var LINE_BREAKS = HARD_LINE_BREAKS.concat(SPACE$1);
	    var KOREAN_SYLLABLE_BLOCK = [JL, JV, JT, H2, H3];
	    var HYPHEN = [HY, BA];
	    var codePointsToCharacterClasses = function (codePoints, lineBreak) {
	        if (lineBreak === void 0) { lineBreak = 'strict'; }
	        var types = [];
	        var indices = [];
	        var categories = [];
	        codePoints.forEach(function (codePoint, index) {
	            var classType = UnicodeTrie$1.get(codePoint);
	            if (classType > LETTER_NUMBER_MODIFIER) {
	                categories.push(true);
	                classType -= LETTER_NUMBER_MODIFIER;
	            }
	            else {
	                categories.push(false);
	            }
	            if (['normal', 'auto', 'loose'].indexOf(lineBreak) !== -1) {
	                // U+2010, – U+2013, 〜 U+301C, ゠ U+30A0
	                if ([0x2010, 0x2013, 0x301c, 0x30a0].indexOf(codePoint) !== -1) {
	                    indices.push(index);
	                    return types.push(CB);
	                }
	            }
	            if (classType === CM || classType === ZWJ$1) {
	                // LB10 Treat any remaining combining mark or ZWJ as AL.
	                if (index === 0) {
	                    indices.push(index);
	                    return types.push(AL);
	                }
	                // LB9 Do not break a combining character sequence; treat it as if it has the line breaking class of
	                // the base character in all of the following rules. Treat ZWJ as if it were CM.
	                var prev = types[index - 1];
	                if (LINE_BREAKS.indexOf(prev) === -1) {
	                    indices.push(indices[index - 1]);
	                    return types.push(prev);
	                }
	                indices.push(index);
	                return types.push(AL);
	            }
	            indices.push(index);
	            if (classType === CJ) {
	                return types.push(lineBreak === 'strict' ? NS : ID);
	            }
	            if (classType === SA) {
	                return types.push(AL);
	            }
	            if (classType === AI) {
	                return types.push(AL);
	            }
	            // For supplementary characters, a useful default is to treat characters in the range 10000..1FFFD as AL
	            // and characters in the ranges 20000..2FFFD and 30000..3FFFD as ID, until the implementation can be revised
	            // to take into account the actual line breaking properties for these characters.
	            if (classType === XX) {
	                if ((codePoint >= 0x20000 && codePoint <= 0x2fffd) || (codePoint >= 0x30000 && codePoint <= 0x3fffd)) {
	                    return types.push(ID);
	                }
	                else {
	                    return types.push(AL);
	                }
	            }
	            types.push(classType);
	        });
	        return [indices, types, categories];
	    };
	    var isAdjacentWithSpaceIgnored = function (a, b, currentIndex, classTypes) {
	        var current = classTypes[currentIndex];
	        if (Array.isArray(a) ? a.indexOf(current) !== -1 : a === current) {
	            var i = currentIndex;
	            while (i <= classTypes.length) {
	                i++;
	                var next = classTypes[i];
	                if (next === b) {
	                    return true;
	                }
	                if (next !== SP) {
	                    break;
	                }
	            }
	        }
	        if (current === SP) {
	            var i = currentIndex;
	            while (i > 0) {
	                i--;
	                var prev = classTypes[i];
	                if (Array.isArray(a) ? a.indexOf(prev) !== -1 : a === prev) {
	                    var n = currentIndex;
	                    while (n <= classTypes.length) {
	                        n++;
	                        var next = classTypes[n];
	                        if (next === b) {
	                            return true;
	                        }
	                        if (next !== SP) {
	                            break;
	                        }
	                    }
	                }
	                if (prev !== SP) {
	                    break;
	                }
	            }
	        }
	        return false;
	    };
	    var previousNonSpaceClassType = function (currentIndex, classTypes) {
	        var i = currentIndex;
	        while (i >= 0) {
	            var type = classTypes[i];
	            if (type === SP) {
	                i--;
	            }
	            else {
	                return type;
	            }
	        }
	        return 0;
	    };
	    var _lineBreakAtIndex = function (codePoints, classTypes, indicies, index, forbiddenBreaks) {
	        if (indicies[index] === 0) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        var currentIndex = index - 1;
	        if (Array.isArray(forbiddenBreaks) && forbiddenBreaks[currentIndex] === true) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        var beforeIndex = currentIndex - 1;
	        var afterIndex = currentIndex + 1;
	        var current = classTypes[currentIndex];
	        // LB4 Always break after hard line breaks.
	        // LB5 Treat CR followed by LF, as well as CR, LF, and NL as hard line breaks.
	        var before = beforeIndex >= 0 ? classTypes[beforeIndex] : 0;
	        var next = classTypes[afterIndex];
	        if (current === CR$1 && next === LF$1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        if (HARD_LINE_BREAKS.indexOf(current) !== -1) {
	            return BREAK_MANDATORY;
	        }
	        // LB6 Do not break before hard line breaks.
	        if (HARD_LINE_BREAKS.indexOf(next) !== -1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB7 Do not break before spaces or zero width space.
	        if (SPACE$1.indexOf(next) !== -1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB8 Break before any character following a zero-width space, even if one or more spaces intervene.
	        if (previousNonSpaceClassType(currentIndex, classTypes) === ZW) {
	            return BREAK_ALLOWED$1;
	        }
	        // LB8a Do not break after a zero width joiner.
	        if (UnicodeTrie$1.get(codePoints[currentIndex]) === ZWJ$1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // zwj emojis
	        if ((current === EB || current === EM) && UnicodeTrie$1.get(codePoints[afterIndex]) === ZWJ$1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB11 Do not break before or after Word joiner and related characters.
	        if (current === WJ || next === WJ) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB12 Do not break after NBSP and related characters.
	        if (current === GL) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB12a Do not break before NBSP and related characters, except after spaces and hyphens.
	        if ([SP, BA, HY].indexOf(current) === -1 && next === GL) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB13 Do not break before ‘]’ or ‘!’ or ‘;’ or ‘/’, even after spaces.
	        if ([CL, CP, EX, IS, SY].indexOf(next) !== -1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB14 Do not break after ‘[’, even after spaces.
	        if (previousNonSpaceClassType(currentIndex, classTypes) === OP) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB15 Do not break within ‘”[’, even with intervening spaces.
	        if (isAdjacentWithSpaceIgnored(QU, OP, currentIndex, classTypes)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB16 Do not break between closing punctuation and a nonstarter (lb=NS), even with intervening spaces.
	        if (isAdjacentWithSpaceIgnored([CL, CP], NS, currentIndex, classTypes)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB17 Do not break within ‘——’, even with intervening spaces.
	        if (isAdjacentWithSpaceIgnored(B2, B2, currentIndex, classTypes)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB18 Break after spaces.
	        if (current === SP) {
	            return BREAK_ALLOWED$1;
	        }
	        // LB19 Do not break before or after quotation marks, such as ‘ ” ’.
	        if (current === QU || next === QU) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB20 Break before and after unresolved CB.
	        if (next === CB || current === CB) {
	            return BREAK_ALLOWED$1;
	        }
	        // LB21 Do not break before hyphen-minus, other hyphens, fixed-width spaces, small kana, and other non-starters, or after acute accents.
	        if ([BA, HY, NS].indexOf(next) !== -1 || current === BB) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB21a Don't break after Hebrew + Hyphen.
	        if (before === HL && HYPHEN.indexOf(current) !== -1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB21b Don’t break between Solidus and Hebrew letters.
	        if (current === SY && next === HL) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB22 Do not break before ellipsis.
	        if (next === IN) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB23 Do not break between digits and letters.
	        if ((ALPHABETICS.indexOf(next) !== -1 && current === NU) || (ALPHABETICS.indexOf(current) !== -1 && next === NU)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB23a Do not break between numeric prefixes and ideographs, or between ideographs and numeric postfixes.
	        if ((current === PR && [ID, EB, EM].indexOf(next) !== -1) ||
	            ([ID, EB, EM].indexOf(current) !== -1 && next === PO)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB24 Do not break between numeric prefix/postfix and letters, or between letters and prefix/postfix.
	        if ((ALPHABETICS.indexOf(current) !== -1 && PREFIX_POSTFIX.indexOf(next) !== -1) ||
	            (PREFIX_POSTFIX.indexOf(current) !== -1 && ALPHABETICS.indexOf(next) !== -1)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB25 Do not break between the following pairs of classes relevant to numbers:
	        if (
	        // (PR | PO) × ( OP | HY )? NU
	        ([PR, PO].indexOf(current) !== -1 &&
	            (next === NU || ([OP, HY].indexOf(next) !== -1 && classTypes[afterIndex + 1] === NU))) ||
	            // ( OP | HY ) × NU
	            ([OP, HY].indexOf(current) !== -1 && next === NU) ||
	            // NU ×	(NU | SY | IS)
	            (current === NU && [NU, SY, IS].indexOf(next) !== -1)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // NU (NU | SY | IS)* × (NU | SY | IS | CL | CP)
	        if ([NU, SY, IS, CL, CP].indexOf(next) !== -1) {
	            var prevIndex = currentIndex;
	            while (prevIndex >= 0) {
	                var type = classTypes[prevIndex];
	                if (type === NU) {
	                    return BREAK_NOT_ALLOWED$1;
	                }
	                else if ([SY, IS].indexOf(type) !== -1) {
	                    prevIndex--;
	                }
	                else {
	                    break;
	                }
	            }
	        }
	        // NU (NU | SY | IS)* (CL | CP)? × (PO | PR))
	        if ([PR, PO].indexOf(next) !== -1) {
	            var prevIndex = [CL, CP].indexOf(current) !== -1 ? beforeIndex : currentIndex;
	            while (prevIndex >= 0) {
	                var type = classTypes[prevIndex];
	                if (type === NU) {
	                    return BREAK_NOT_ALLOWED$1;
	                }
	                else if ([SY, IS].indexOf(type) !== -1) {
	                    prevIndex--;
	                }
	                else {
	                    break;
	                }
	            }
	        }
	        // LB26 Do not break a Korean syllable.
	        if ((JL === current && [JL, JV, H2, H3].indexOf(next) !== -1) ||
	            ([JV, H2].indexOf(current) !== -1 && [JV, JT].indexOf(next) !== -1) ||
	            ([JT, H3].indexOf(current) !== -1 && next === JT)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB27 Treat a Korean Syllable Block the same as ID.
	        if ((KOREAN_SYLLABLE_BLOCK.indexOf(current) !== -1 && [IN, PO].indexOf(next) !== -1) ||
	            (KOREAN_SYLLABLE_BLOCK.indexOf(next) !== -1 && current === PR)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB28 Do not break between alphabetics (“at”).
	        if (ALPHABETICS.indexOf(current) !== -1 && ALPHABETICS.indexOf(next) !== -1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB29 Do not break between numeric punctuation and alphabetics (“e.g.”).
	        if (current === IS && ALPHABETICS.indexOf(next) !== -1) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB30 Do not break between letters, numbers, or ordinary symbols and opening or closing parentheses.
	        if ((ALPHABETICS.concat(NU).indexOf(current) !== -1 &&
	            next === OP &&
	            ea_OP.indexOf(codePoints[afterIndex]) === -1) ||
	            (ALPHABETICS.concat(NU).indexOf(next) !== -1 && current === CP)) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        // LB30a Break between two regional indicator symbols if and only if there are an even number of regional
	        // indicators preceding the position of the break.
	        if (current === RI$1 && next === RI$1) {
	            var i = indicies[currentIndex];
	            var count = 1;
	            while (i > 0) {
	                i--;
	                if (classTypes[i] === RI$1) {
	                    count++;
	                }
	                else {
	                    break;
	                }
	            }
	            if (count % 2 !== 0) {
	                return BREAK_NOT_ALLOWED$1;
	            }
	        }
	        // LB30b Do not break between an emoji base and an emoji modifier.
	        if (current === EB && next === EM) {
	            return BREAK_NOT_ALLOWED$1;
	        }
	        return BREAK_ALLOWED$1;
	    };
	    var cssFormattedClasses = function (codePoints, options) {
	        if (!options) {
	            options = { lineBreak: 'normal', wordBreak: 'normal' };
	        }
	        var _a = codePointsToCharacterClasses(codePoints, options.lineBreak), indicies = _a[0], classTypes = _a[1], isLetterNumber = _a[2];
	        if (options.wordBreak === 'break-all' || options.wordBreak === 'break-word') {
	            classTypes = classTypes.map(function (type) { return ([NU, AL, SA].indexOf(type) !== -1 ? ID : type); });
	        }
	        var forbiddenBreakpoints = options.wordBreak === 'keep-all'
	            ? isLetterNumber.map(function (letterNumber, i) {
	                return letterNumber && codePoints[i] >= 0x4e00 && codePoints[i] <= 0x9fff;
	            })
	            : undefined;
	        return [indicies, classTypes, forbiddenBreakpoints];
	    };
	    var Break = /** @class */ (function () {
	        function Break(codePoints, lineBreak, start, end) {
	            this.codePoints = codePoints;
	            this.required = lineBreak === BREAK_MANDATORY;
	            this.start = start;
	            this.end = end;
	        }
	        Break.prototype.slice = function () {
	            return fromCodePoint$1.apply(void 0, this.codePoints.slice(this.start, this.end));
	        };
	        return Break;
	    }());
	    var LineBreaker = function (str, options) {
	        var codePoints = toCodePoints$1(str);
	        var _a = cssFormattedClasses(codePoints, options), indicies = _a[0], classTypes = _a[1], forbiddenBreakpoints = _a[2];
	        var length = codePoints.length;
	        var lastEnd = 0;
	        var nextIndex = 0;
	        return {
	            next: function () {
	                if (nextIndex >= length) {
	                    return { done: true, value: null };
	                }
	                var lineBreak = BREAK_NOT_ALLOWED$1;
	                while (nextIndex < length &&
	                    (lineBreak = _lineBreakAtIndex(codePoints, classTypes, indicies, ++nextIndex, forbiddenBreakpoints)) ===
	                        BREAK_NOT_ALLOWED$1) { }
	                if (lineBreak !== BREAK_NOT_ALLOWED$1 || nextIndex === length) {
	                    var value = new Break(codePoints, lineBreak, lastEnd, nextIndex);
	                    lastEnd = nextIndex;
	                    return { value: value, done: false };
	                }
	                return { done: true, value: null };
	            },
	        };
	    };

	    // https://www.w3.org/TR/css-syntax-3
	    var FLAG_UNRESTRICTED = 1 << 0;
	    var FLAG_ID = 1 << 1;
	    var FLAG_INTEGER = 1 << 2;
	    var FLAG_NUMBER = 1 << 3;
	    var LINE_FEED = 0x000a;
	    var SOLIDUS = 0x002f;
	    var REVERSE_SOLIDUS = 0x005c;
	    var CHARACTER_TABULATION = 0x0009;
	    var SPACE = 0x0020;
	    var QUOTATION_MARK = 0x0022;
	    var EQUALS_SIGN = 0x003d;
	    var NUMBER_SIGN = 0x0023;
	    var DOLLAR_SIGN = 0x0024;
	    var PERCENTAGE_SIGN = 0x0025;
	    var APOSTROPHE = 0x0027;
	    var LEFT_PARENTHESIS = 0x0028;
	    var RIGHT_PARENTHESIS = 0x0029;
	    var LOW_LINE = 0x005f;
	    var HYPHEN_MINUS = 0x002d;
	    var EXCLAMATION_MARK = 0x0021;
	    var LESS_THAN_SIGN = 0x003c;
	    var GREATER_THAN_SIGN = 0x003e;
	    var COMMERCIAL_AT = 0x0040;
	    var LEFT_SQUARE_BRACKET = 0x005b;
	    var RIGHT_SQUARE_BRACKET = 0x005d;
	    var CIRCUMFLEX_ACCENT = 0x003d;
	    var LEFT_CURLY_BRACKET = 0x007b;
	    var QUESTION_MARK = 0x003f;
	    var RIGHT_CURLY_BRACKET = 0x007d;
	    var VERTICAL_LINE = 0x007c;
	    var TILDE = 0x007e;
	    var CONTROL = 0x0080;
	    var REPLACEMENT_CHARACTER = 0xfffd;
	    var ASTERISK = 0x002a;
	    var PLUS_SIGN = 0x002b;
	    var COMMA = 0x002c;
	    var COLON = 0x003a;
	    var SEMICOLON = 0x003b;
	    var FULL_STOP = 0x002e;
	    var NULL = 0x0000;
	    var BACKSPACE = 0x0008;
	    var LINE_TABULATION = 0x000b;
	    var SHIFT_OUT = 0x000e;
	    var INFORMATION_SEPARATOR_ONE = 0x001f;
	    var DELETE = 0x007f;
	    var EOF = -1;
	    var ZERO = 0x0030;
	    var a = 0x0061;
	    var e = 0x0065;
	    var f = 0x0066;
	    var u = 0x0075;
	    var z = 0x007a;
	    var A = 0x0041;
	    var E = 0x0045;
	    var F = 0x0046;
	    var U = 0x0055;
	    var Z = 0x005a;
	    var isDigit = function (codePoint) { return codePoint >= ZERO && codePoint <= 0x0039; };
	    var isSurrogateCodePoint = function (codePoint) { return codePoint >= 0xd800 && codePoint <= 0xdfff; };
	    var isHex = function (codePoint) {
	        return isDigit(codePoint) || (codePoint >= A && codePoint <= F) || (codePoint >= a && codePoint <= f);
	    };
	    var isLowerCaseLetter = function (codePoint) { return codePoint >= a && codePoint <= z; };
	    var isUpperCaseLetter = function (codePoint) { return codePoint >= A && codePoint <= Z; };
	    var isLetter = function (codePoint) { return isLowerCaseLetter(codePoint) || isUpperCaseLetter(codePoint); };
	    var isNonASCIICodePoint = function (codePoint) { return codePoint >= CONTROL; };
	    var isWhiteSpace = function (codePoint) {
	        return codePoint === LINE_FEED || codePoint === CHARACTER_TABULATION || codePoint === SPACE;
	    };
	    var isNameStartCodePoint = function (codePoint) {
	        return isLetter(codePoint) || isNonASCIICodePoint(codePoint) || codePoint === LOW_LINE;
	    };
	    var isNameCodePoint = function (codePoint) {
	        return isNameStartCodePoint(codePoint) || isDigit(codePoint) || codePoint === HYPHEN_MINUS;
	    };
	    var isNonPrintableCodePoint = function (codePoint) {
	        return ((codePoint >= NULL && codePoint <= BACKSPACE) ||
	            codePoint === LINE_TABULATION ||
	            (codePoint >= SHIFT_OUT && codePoint <= INFORMATION_SEPARATOR_ONE) ||
	            codePoint === DELETE);
	    };
	    var isValidEscape = function (c1, c2) {
	        if (c1 !== REVERSE_SOLIDUS) {
	            return false;
	        }
	        return c2 !== LINE_FEED;
	    };
	    var isIdentifierStart = function (c1, c2, c3) {
	        if (c1 === HYPHEN_MINUS) {
	            return isNameStartCodePoint(c2) || isValidEscape(c2, c3);
	        }
	        else if (isNameStartCodePoint(c1)) {
	            return true;
	        }
	        else if (c1 === REVERSE_SOLIDUS && isValidEscape(c1, c2)) {
	            return true;
	        }
	        return false;
	    };
	    var isNumberStart = function (c1, c2, c3) {
	        if (c1 === PLUS_SIGN || c1 === HYPHEN_MINUS) {
	            if (isDigit(c2)) {
	                return true;
	            }
	            return c2 === FULL_STOP && isDigit(c3);
	        }
	        if (c1 === FULL_STOP) {
	            return isDigit(c2);
	        }
	        return isDigit(c1);
	    };
	    var stringToNumber = function (codePoints) {
	        var c = 0;
	        var sign = 1;
	        if (codePoints[c] === PLUS_SIGN || codePoints[c] === HYPHEN_MINUS) {
	            if (codePoints[c] === HYPHEN_MINUS) {
	                sign = -1;
	            }
	            c++;
	        }
	        var integers = [];
	        while (isDigit(codePoints[c])) {
	            integers.push(codePoints[c++]);
	        }
	        var int = integers.length ? parseInt(fromCodePoint$1.apply(void 0, integers), 10) : 0;
	        if (codePoints[c] === FULL_STOP) {
	            c++;
	        }
	        var fraction = [];
	        while (isDigit(codePoints[c])) {
	            fraction.push(codePoints[c++]);
	        }
	        var fracd = fraction.length;
	        var frac = fracd ? parseInt(fromCodePoint$1.apply(void 0, fraction), 10) : 0;
	        if (codePoints[c] === E || codePoints[c] === e) {
	            c++;
	        }
	        var expsign = 1;
	        if (codePoints[c] === PLUS_SIGN || codePoints[c] === HYPHEN_MINUS) {
	            if (codePoints[c] === HYPHEN_MINUS) {
	                expsign = -1;
	            }
	            c++;
	        }
	        var exponent = [];
	        while (isDigit(codePoints[c])) {
	            exponent.push(codePoints[c++]);
	        }
	        var exp = exponent.length ? parseInt(fromCodePoint$1.apply(void 0, exponent), 10) : 0;
	        return sign * (int + frac * Math.pow(10, -fracd)) * Math.pow(10, expsign * exp);
	    };
	    var LEFT_PARENTHESIS_TOKEN = {
	        type: 2 /* LEFT_PARENTHESIS_TOKEN */
	    };
	    var RIGHT_PARENTHESIS_TOKEN = {
	        type: 3 /* RIGHT_PARENTHESIS_TOKEN */
	    };
	    var COMMA_TOKEN = { type: 4 /* COMMA_TOKEN */ };
	    var SUFFIX_MATCH_TOKEN = { type: 13 /* SUFFIX_MATCH_TOKEN */ };
	    var PREFIX_MATCH_TOKEN = { type: 8 /* PREFIX_MATCH_TOKEN */ };
	    var COLUMN_TOKEN = { type: 21 /* COLUMN_TOKEN */ };
	    var DASH_MATCH_TOKEN = { type: 9 /* DASH_MATCH_TOKEN */ };
	    var INCLUDE_MATCH_TOKEN = { type: 10 /* INCLUDE_MATCH_TOKEN */ };
	    var LEFT_CURLY_BRACKET_TOKEN = {
	        type: 11 /* LEFT_CURLY_BRACKET_TOKEN */
	    };
	    var RIGHT_CURLY_BRACKET_TOKEN = {
	        type: 12 /* RIGHT_CURLY_BRACKET_TOKEN */
	    };
	    var SUBSTRING_MATCH_TOKEN = { type: 14 /* SUBSTRING_MATCH_TOKEN */ };
	    var BAD_URL_TOKEN = { type: 23 /* BAD_URL_TOKEN */ };
	    var BAD_STRING_TOKEN = { type: 1 /* BAD_STRING_TOKEN */ };
	    var CDO_TOKEN = { type: 25 /* CDO_TOKEN */ };
	    var CDC_TOKEN = { type: 24 /* CDC_TOKEN */ };
	    var COLON_TOKEN = { type: 26 /* COLON_TOKEN */ };
	    var SEMICOLON_TOKEN = { type: 27 /* SEMICOLON_TOKEN */ };
	    var LEFT_SQUARE_BRACKET_TOKEN = {
	        type: 28 /* LEFT_SQUARE_BRACKET_TOKEN */
	    };
	    var RIGHT_SQUARE_BRACKET_TOKEN = {
	        type: 29 /* RIGHT_SQUARE_BRACKET_TOKEN */
	    };
	    var WHITESPACE_TOKEN = { type: 31 /* WHITESPACE_TOKEN */ };
	    var EOF_TOKEN = { type: 32 /* EOF_TOKEN */ };
	    var Tokenizer = /** @class */ (function () {
	        function Tokenizer() {
	            this._value = [];
	        }
	        Tokenizer.prototype.write = function (chunk) {
	            this._value = this._value.concat(toCodePoints$1(chunk));
	        };
	        Tokenizer.prototype.read = function () {
	            var tokens = [];
	            var token = this.consumeToken();
	            while (token !== EOF_TOKEN) {
	                tokens.push(token);
	                token = this.consumeToken();
	            }
	            return tokens;
	        };
	        Tokenizer.prototype.consumeToken = function () {
	            var codePoint = this.consumeCodePoint();
	            switch (codePoint) {
	                case QUOTATION_MARK:
	                    return this.consumeStringToken(QUOTATION_MARK);
	                case NUMBER_SIGN:
	                    var c1 = this.peekCodePoint(0);
	                    var c2 = this.peekCodePoint(1);
	                    var c3 = this.peekCodePoint(2);
	                    if (isNameCodePoint(c1) || isValidEscape(c2, c3)) {
	                        var flags = isIdentifierStart(c1, c2, c3) ? FLAG_ID : FLAG_UNRESTRICTED;
	                        var value = this.consumeName();
	                        return { type: 5 /* HASH_TOKEN */, value: value, flags: flags };
	                    }
	                    break;
	                case DOLLAR_SIGN:
	                    if (this.peekCodePoint(0) === EQUALS_SIGN) {
	                        this.consumeCodePoint();
	                        return SUFFIX_MATCH_TOKEN;
	                    }
	                    break;
	                case APOSTROPHE:
	                    return this.consumeStringToken(APOSTROPHE);
	                case LEFT_PARENTHESIS:
	                    return LEFT_PARENTHESIS_TOKEN;
	                case RIGHT_PARENTHESIS:
	                    return RIGHT_PARENTHESIS_TOKEN;
	                case ASTERISK:
	                    if (this.peekCodePoint(0) === EQUALS_SIGN) {
	                        this.consumeCodePoint();
	                        return SUBSTRING_MATCH_TOKEN;
	                    }
	                    break;
	                case PLUS_SIGN:
	                    if (isNumberStart(codePoint, this.peekCodePoint(0), this.peekCodePoint(1))) {
	                        this.reconsumeCodePoint(codePoint);
	                        return this.consumeNumericToken();
	                    }
	                    break;
	                case COMMA:
	                    return COMMA_TOKEN;
	                case HYPHEN_MINUS:
	                    var e1 = codePoint;
	                    var e2 = this.peekCodePoint(0);
	                    var e3 = this.peekCodePoint(1);
	                    if (isNumberStart(e1, e2, e3)) {
	                        this.reconsumeCodePoint(codePoint);
	                        return this.consumeNumericToken();
	                    }
	                    if (isIdentifierStart(e1, e2, e3)) {
	                        this.reconsumeCodePoint(codePoint);
	                        return this.consumeIdentLikeToken();
	                    }
	                    if (e2 === HYPHEN_MINUS && e3 === GREATER_THAN_SIGN) {
	                        this.consumeCodePoint();
	                        this.consumeCodePoint();
	                        return CDC_TOKEN;
	                    }
	                    break;
	                case FULL_STOP:
	                    if (isNumberStart(codePoint, this.peekCodePoint(0), this.peekCodePoint(1))) {
	                        this.reconsumeCodePoint(codePoint);
	                        return this.consumeNumericToken();
	                    }
	                    break;
	                case SOLIDUS:
	                    if (this.peekCodePoint(0) === ASTERISK) {
	                        this.consumeCodePoint();
	                        while (true) {
	                            var c = this.consumeCodePoint();
	                            if (c === ASTERISK) {
	                                c = this.consumeCodePoint();
	                                if (c === SOLIDUS) {
	                                    return this.consumeToken();
	                                }
	                            }
	                            if (c === EOF) {
	                                return this.consumeToken();
	                            }
	                        }
	                    }
	                    break;
	                case COLON:
	                    return COLON_TOKEN;
	                case SEMICOLON:
	                    return SEMICOLON_TOKEN;
	                case LESS_THAN_SIGN:
	                    if (this.peekCodePoint(0) === EXCLAMATION_MARK &&
	                        this.peekCodePoint(1) === HYPHEN_MINUS &&
	                        this.peekCodePoint(2) === HYPHEN_MINUS) {
	                        this.consumeCodePoint();
	                        this.consumeCodePoint();
	                        return CDO_TOKEN;
	                    }
	                    break;
	                case COMMERCIAL_AT:
	                    var a1 = this.peekCodePoint(0);
	                    var a2 = this.peekCodePoint(1);
	                    var a3 = this.peekCodePoint(2);
	                    if (isIdentifierStart(a1, a2, a3)) {
	                        var value = this.consumeName();
	                        return { type: 7 /* AT_KEYWORD_TOKEN */, value: value };
	                    }
	                    break;
	                case LEFT_SQUARE_BRACKET:
	                    return LEFT_SQUARE_BRACKET_TOKEN;
	                case REVERSE_SOLIDUS:
	                    if (isValidEscape(codePoint, this.peekCodePoint(0))) {
	                        this.reconsumeCodePoint(codePoint);
	                        return this.consumeIdentLikeToken();
	                    }
	                    break;
	                case RIGHT_SQUARE_BRACKET:
	                    return RIGHT_SQUARE_BRACKET_TOKEN;
	                case CIRCUMFLEX_ACCENT:
	                    if (this.peekCodePoint(0) === EQUALS_SIGN) {
	                        this.consumeCodePoint();
	                        return PREFIX_MATCH_TOKEN;
	                    }
	                    break;
	                case LEFT_CURLY_BRACKET:
	                    return LEFT_CURLY_BRACKET_TOKEN;
	                case RIGHT_CURLY_BRACKET:
	                    return RIGHT_CURLY_BRACKET_TOKEN;
	                case u:
	                case U:
	                    var u1 = this.peekCodePoint(0);
	                    var u2 = this.peekCodePoint(1);
	                    if (u1 === PLUS_SIGN && (isHex(u2) || u2 === QUESTION_MARK)) {
	                        this.consumeCodePoint();
	                        this.consumeUnicodeRangeToken();
	                    }
	                    this.reconsumeCodePoint(codePoint);
	                    return this.consumeIdentLikeToken();
	                case VERTICAL_LINE:
	                    if (this.peekCodePoint(0) === EQUALS_SIGN) {
	                        this.consumeCodePoint();
	                        return DASH_MATCH_TOKEN;
	                    }
	                    if (this.peekCodePoint(0) === VERTICAL_LINE) {
	                        this.consumeCodePoint();
	                        return COLUMN_TOKEN;
	                    }
	                    break;
	                case TILDE:
	                    if (this.peekCodePoint(0) === EQUALS_SIGN) {
	                        this.consumeCodePoint();
	                        return INCLUDE_MATCH_TOKEN;
	                    }
	                    break;
	                case EOF:
	                    return EOF_TOKEN;
	            }
	            if (isWhiteSpace(codePoint)) {
	                this.consumeWhiteSpace();
	                return WHITESPACE_TOKEN;
	            }
	            if (isDigit(codePoint)) {
	                this.reconsumeCodePoint(codePoint);
	                return this.consumeNumericToken();
	            }
	            if (isNameStartCodePoint(codePoint)) {
	                this.reconsumeCodePoint(codePoint);
	                return this.consumeIdentLikeToken();
	            }
	            return { type: 6 /* DELIM_TOKEN */, value: fromCodePoint$1(codePoint) };
	        };
	        Tokenizer.prototype.consumeCodePoint = function () {
	            var value = this._value.shift();
	            return typeof value === 'undefined' ? -1 : value;
	        };
	        Tokenizer.prototype.reconsumeCodePoint = function (codePoint) {
	            this._value.unshift(codePoint);
	        };
	        Tokenizer.prototype.peekCodePoint = function (delta) {
	            if (delta >= this._value.length) {
	                return -1;
	            }
	            return this._value[delta];
	        };
	        Tokenizer.prototype.consumeUnicodeRangeToken = function () {
	            var digits = [];
	            var codePoint = this.consumeCodePoint();
	            while (isHex(codePoint) && digits.length < 6) {
	                digits.push(codePoint);
	                codePoint = this.consumeCodePoint();
	            }
	            var questionMarks = false;
	            while (codePoint === QUESTION_MARK && digits.length < 6) {
	                digits.push(codePoint);
	                codePoint = this.consumeCodePoint();
	                questionMarks = true;
	            }
	            if (questionMarks) {
	                var start_1 = parseInt(fromCodePoint$1.apply(void 0, digits.map(function (digit) { return (digit === QUESTION_MARK ? ZERO : digit); })), 16);
	                var end = parseInt(fromCodePoint$1.apply(void 0, digits.map(function (digit) { return (digit === QUESTION_MARK ? F : digit); })), 16);
	                return { type: 30 /* UNICODE_RANGE_TOKEN */, start: start_1, end: end };
	            }
	            var start = parseInt(fromCodePoint$1.apply(void 0, digits), 16);
	            if (this.peekCodePoint(0) === HYPHEN_MINUS && isHex(this.peekCodePoint(1))) {
	                this.consumeCodePoint();
	                codePoint = this.consumeCodePoint();
	                var endDigits = [];
	                while (isHex(codePoint) && endDigits.length < 6) {
	                    endDigits.push(codePoint);
	                    codePoint = this.consumeCodePoint();
	                }
	                var end = parseInt(fromCodePoint$1.apply(void 0, endDigits), 16);
	                return { type: 30 /* UNICODE_RANGE_TOKEN */, start: start, end: end };
	            }
	            else {
	                return { type: 30 /* UNICODE_RANGE_TOKEN */, start: start, end: start };
	            }
	        };
	        Tokenizer.prototype.consumeIdentLikeToken = function () {
	            var value = this.consumeName();
	            if (value.toLowerCase() === 'url' && this.peekCodePoint(0) === LEFT_PARENTHESIS) {
	                this.consumeCodePoint();
	                return this.consumeUrlToken();
	            }
	            else if (this.peekCodePoint(0) === LEFT_PARENTHESIS) {
	                this.consumeCodePoint();
	                return { type: 19 /* FUNCTION_TOKEN */, value: value };
	            }
	            return { type: 20 /* IDENT_TOKEN */, value: value };
	        };
	        Tokenizer.prototype.consumeUrlToken = function () {
	            var value = [];
	            this.consumeWhiteSpace();
	            if (this.peekCodePoint(0) === EOF) {
	                return { type: 22 /* URL_TOKEN */, value: '' };
	            }
	            var next = this.peekCodePoint(0);
	            if (next === APOSTROPHE || next === QUOTATION_MARK) {
	                var stringToken = this.consumeStringToken(this.consumeCodePoint());
	                if (stringToken.type === 0 /* STRING_TOKEN */) {
	                    this.consumeWhiteSpace();
	                    if (this.peekCodePoint(0) === EOF || this.peekCodePoint(0) === RIGHT_PARENTHESIS) {
	                        this.consumeCodePoint();
	                        return { type: 22 /* URL_TOKEN */, value: stringToken.value };
	                    }
	                }
	                this.consumeBadUrlRemnants();
	                return BAD_URL_TOKEN;
	            }
	            while (true) {
	                var codePoint = this.consumeCodePoint();
	                if (codePoint === EOF || codePoint === RIGHT_PARENTHESIS) {
	                    return { type: 22 /* URL_TOKEN */, value: fromCodePoint$1.apply(void 0, value) };
	                }
	                else if (isWhiteSpace(codePoint)) {
	                    this.consumeWhiteSpace();
	                    if (this.peekCodePoint(0) === EOF || this.peekCodePoint(0) === RIGHT_PARENTHESIS) {
	                        this.consumeCodePoint();
	                        return { type: 22 /* URL_TOKEN */, value: fromCodePoint$1.apply(void 0, value) };
	                    }
	                    this.consumeBadUrlRemnants();
	                    return BAD_URL_TOKEN;
	                }
	                else if (codePoint === QUOTATION_MARK ||
	                    codePoint === APOSTROPHE ||
	                    codePoint === LEFT_PARENTHESIS ||
	                    isNonPrintableCodePoint(codePoint)) {
	                    this.consumeBadUrlRemnants();
	                    return BAD_URL_TOKEN;
	                }
	                else if (codePoint === REVERSE_SOLIDUS) {
	                    if (isValidEscape(codePoint, this.peekCodePoint(0))) {
	                        value.push(this.consumeEscapedCodePoint());
	                    }
	                    else {
	                        this.consumeBadUrlRemnants();
	                        return BAD_URL_TOKEN;
	                    }
	                }
	                else {
	                    value.push(codePoint);
	                }
	            }
	        };
	        Tokenizer.prototype.consumeWhiteSpace = function () {
	            while (isWhiteSpace(this.peekCodePoint(0))) {
	                this.consumeCodePoint();
	            }
	        };
	        Tokenizer.prototype.consumeBadUrlRemnants = function () {
	            while (true) {
	                var codePoint = this.consumeCodePoint();
	                if (codePoint === RIGHT_PARENTHESIS || codePoint === EOF) {
	                    return;
	                }
	                if (isValidEscape(codePoint, this.peekCodePoint(0))) {
	                    this.consumeEscapedCodePoint();
	                }
	            }
	        };
	        Tokenizer.prototype.consumeStringSlice = function (count) {
	            var SLICE_STACK_SIZE = 50000;
	            var value = '';
	            while (count > 0) {
	                var amount = Math.min(SLICE_STACK_SIZE, count);
	                value += fromCodePoint$1.apply(void 0, this._value.splice(0, amount));
	                count -= amount;
	            }
	            this._value.shift();
	            return value;
	        };
	        Tokenizer.prototype.consumeStringToken = function (endingCodePoint) {
	            var value = '';
	            var i = 0;
	            do {
	                var codePoint = this._value[i];
	                if (codePoint === EOF || codePoint === undefined || codePoint === endingCodePoint) {
	                    value += this.consumeStringSlice(i);
	                    return { type: 0 /* STRING_TOKEN */, value: value };
	                }
	                if (codePoint === LINE_FEED) {
	                    this._value.splice(0, i);
	                    return BAD_STRING_TOKEN;
	                }
	                if (codePoint === REVERSE_SOLIDUS) {
	                    var next = this._value[i + 1];
	                    if (next !== EOF && next !== undefined) {
	                        if (next === LINE_FEED) {
	                            value += this.consumeStringSlice(i);
	                            i = -1;
	                            this._value.shift();
	                        }
	                        else if (isValidEscape(codePoint, next)) {
	                            value += this.consumeStringSlice(i);
	                            value += fromCodePoint$1(this.consumeEscapedCodePoint());
	                            i = -1;
	                        }
	                    }
	                }
	                i++;
	            } while (true);
	        };
	        Tokenizer.prototype.consumeNumber = function () {
	            var repr = [];
	            var type = FLAG_INTEGER;
	            var c1 = this.peekCodePoint(0);
	            if (c1 === PLUS_SIGN || c1 === HYPHEN_MINUS) {
	                repr.push(this.consumeCodePoint());
	            }
	            while (isDigit(this.peekCodePoint(0))) {
	                repr.push(this.consumeCodePoint());
	            }
	            c1 = this.peekCodePoint(0);
	            var c2 = this.peekCodePoint(1);
	            if (c1 === FULL_STOP && isDigit(c2)) {
	                repr.push(this.consumeCodePoint(), this.consumeCodePoint());
	                type = FLAG_NUMBER;
	                while (isDigit(this.peekCodePoint(0))) {
	                    repr.push(this.consumeCodePoint());
	                }
	            }
	            c1 = this.peekCodePoint(0);
	            c2 = this.peekCodePoint(1);
	            var c3 = this.peekCodePoint(2);
	            if ((c1 === E || c1 === e) && (((c2 === PLUS_SIGN || c2 === HYPHEN_MINUS) && isDigit(c3)) || isDigit(c2))) {
	                repr.push(this.consumeCodePoint(), this.consumeCodePoint());
	                type = FLAG_NUMBER;
	                while (isDigit(this.peekCodePoint(0))) {
	                    repr.push(this.consumeCodePoint());
	                }
	            }
	            return [stringToNumber(repr), type];
	        };
	        Tokenizer.prototype.consumeNumericToken = function () {
	            var _a = this.consumeNumber(), number = _a[0], flags = _a[1];
	            var c1 = this.peekCodePoint(0);
	            var c2 = this.peekCodePoint(1);
	            var c3 = this.peekCodePoint(2);
	            if (isIdentifierStart(c1, c2, c3)) {
	                var unit = this.consumeName();
	                return { type: 15 /* DIMENSION_TOKEN */, number: number, flags: flags, unit: unit };
	            }
	            if (c1 === PERCENTAGE_SIGN) {
	                this.consumeCodePoint();
	                return { type: 16 /* PERCENTAGE_TOKEN */, number: number, flags: flags };
	            }
	            return { type: 17 /* NUMBER_TOKEN */, number: number, flags: flags };
	        };
	        Tokenizer.prototype.consumeEscapedCodePoint = function () {
	            var codePoint = this.consumeCodePoint();
	            if (isHex(codePoint)) {
	                var hex = fromCodePoint$1(codePoint);
	                while (isHex(this.peekCodePoint(0)) && hex.length < 6) {
	                    hex += fromCodePoint$1(this.consumeCodePoint());
	                }
	                if (isWhiteSpace(this.peekCodePoint(0))) {
	                    this.consumeCodePoint();
	                }
	                var hexCodePoint = parseInt(hex, 16);
	                if (hexCodePoint === 0 || isSurrogateCodePoint(hexCodePoint) || hexCodePoint > 0x10ffff) {
	                    return REPLACEMENT_CHARACTER;
	                }
	                return hexCodePoint;
	            }
	            if (codePoint === EOF) {
	                return REPLACEMENT_CHARACTER;
	            }
	            return codePoint;
	        };
	        Tokenizer.prototype.consumeName = function () {
	            var result = '';
	            while (true) {
	                var codePoint = this.consumeCodePoint();
	                if (isNameCodePoint(codePoint)) {
	                    result += fromCodePoint$1(codePoint);
	                }
	                else if (isValidEscape(codePoint, this.peekCodePoint(0))) {
	                    result += fromCodePoint$1(this.consumeEscapedCodePoint());
	                }
	                else {
	                    this.reconsumeCodePoint(codePoint);
	                    return result;
	                }
	            }
	        };
	        return Tokenizer;
	    }());

	    var Parser = /** @class */ (function () {
	        function Parser(tokens) {
	            this._tokens = tokens;
	        }
	        Parser.create = function (value) {
	            var tokenizer = new Tokenizer();
	            tokenizer.write(value);
	            return new Parser(tokenizer.read());
	        };
	        Parser.parseValue = function (value) {
	            return Parser.create(value).parseComponentValue();
	        };
	        Parser.parseValues = function (value) {
	            return Parser.create(value).parseComponentValues();
	        };
	        Parser.prototype.parseComponentValue = function () {
	            var token = this.consumeToken();
	            while (token.type === 31 /* WHITESPACE_TOKEN */) {
	                token = this.consumeToken();
	            }
	            if (token.type === 32 /* EOF_TOKEN */) {
	                throw new SyntaxError("Error parsing CSS component value, unexpected EOF");
	            }
	            this.reconsumeToken(token);
	            var value = this.consumeComponentValue();
	            do {
	                token = this.consumeToken();
	            } while (token.type === 31 /* WHITESPACE_TOKEN */);
	            if (token.type === 32 /* EOF_TOKEN */) {
	                return value;
	            }
	            throw new SyntaxError("Error parsing CSS component value, multiple values found when expecting only one");
	        };
	        Parser.prototype.parseComponentValues = function () {
	            var values = [];
	            while (true) {
	                var value = this.consumeComponentValue();
	                if (value.type === 32 /* EOF_TOKEN */) {
	                    return values;
	                }
	                values.push(value);
	                values.push();
	            }
	        };
	        Parser.prototype.consumeComponentValue = function () {
	            var token = this.consumeToken();
	            switch (token.type) {
	                case 11 /* LEFT_CURLY_BRACKET_TOKEN */:
	                case 28 /* LEFT_SQUARE_BRACKET_TOKEN */:
	                case 2 /* LEFT_PARENTHESIS_TOKEN */:
	                    return this.consumeSimpleBlock(token.type);
	                case 19 /* FUNCTION_TOKEN */:
	                    return this.consumeFunction(token);
	            }
	            return token;
	        };
	        Parser.prototype.consumeSimpleBlock = function (type) {
	            var block = { type: type, values: [] };
	            var token = this.consumeToken();
	            while (true) {
	                if (token.type === 32 /* EOF_TOKEN */ || isEndingTokenFor(token, type)) {
	                    return block;
	                }
	                this.reconsumeToken(token);
	                block.values.push(this.consumeComponentValue());
	                token = this.consumeToken();
	            }
	        };
	        Parser.prototype.consumeFunction = function (functionToken) {
	            var cssFunction = {
	                name: functionToken.value,
	                values: [],
	                type: 18 /* FUNCTION */
	            };
	            while (true) {
	                var token = this.consumeToken();
	                if (token.type === 32 /* EOF_TOKEN */ || token.type === 3 /* RIGHT_PARENTHESIS_TOKEN */) {
	                    return cssFunction;
	                }
	                this.reconsumeToken(token);
	                cssFunction.values.push(this.consumeComponentValue());
	            }
	        };
	        Parser.prototype.consumeToken = function () {
	            var token = this._tokens.shift();
	            return typeof token === 'undefined' ? EOF_TOKEN : token;
	        };
	        Parser.prototype.reconsumeToken = function (token) {
	            this._tokens.unshift(token);
	        };
	        return Parser;
	    }());
	    var isDimensionToken = function (token) { return token.type === 15 /* DIMENSION_TOKEN */; };
	    var isNumberToken = function (token) { return token.type === 17 /* NUMBER_TOKEN */; };
	    var isIdentToken = function (token) { return token.type === 20 /* IDENT_TOKEN */; };
	    var isStringToken = function (token) { return token.type === 0 /* STRING_TOKEN */; };
	    var isIdentWithValue = function (token, value) {
	        return isIdentToken(token) && token.value === value;
	    };
	    var nonWhiteSpace = function (token) { return token.type !== 31 /* WHITESPACE_TOKEN */; };
	    var nonFunctionArgSeparator = function (token) {
	        return token.type !== 31 /* WHITESPACE_TOKEN */ && token.type !== 4 /* COMMA_TOKEN */;
	    };
	    var parseFunctionArgs = function (tokens) {
	        var args = [];
	        var arg = [];
	        tokens.forEach(function (token) {
	            if (token.type === 4 /* COMMA_TOKEN */) {
	                if (arg.length === 0) {
	                    throw new Error("Error parsing function args, zero tokens for arg");
	                }
	                args.push(arg);
	                arg = [];
	                return;
	            }
	            if (token.type !== 31 /* WHITESPACE_TOKEN */) {
	                arg.push(token);
	            }
	        });
	        if (arg.length) {
	            args.push(arg);
	        }
	        return args;
	    };
	    var isEndingTokenFor = function (token, type) {
	        if (type === 11 /* LEFT_CURLY_BRACKET_TOKEN */ && token.type === 12 /* RIGHT_CURLY_BRACKET_TOKEN */) {
	            return true;
	        }
	        if (type === 28 /* LEFT_SQUARE_BRACKET_TOKEN */ && token.type === 29 /* RIGHT_SQUARE_BRACKET_TOKEN */) {
	            return true;
	        }
	        return type === 2 /* LEFT_PARENTHESIS_TOKEN */ && token.type === 3 /* RIGHT_PARENTHESIS_TOKEN */;
	    };

	    var isLength = function (token) {
	        return token.type === 17 /* NUMBER_TOKEN */ || token.type === 15 /* DIMENSION_TOKEN */;
	    };

	    var isLengthPercentage = function (token) {
	        return token.type === 16 /* PERCENTAGE_TOKEN */ || isLength(token);
	    };
	    var parseLengthPercentageTuple = function (tokens) {
	        return tokens.length > 1 ? [tokens[0], tokens[1]] : [tokens[0]];
	    };
	    var ZERO_LENGTH = {
	        type: 17 /* NUMBER_TOKEN */,
	        number: 0,
	        flags: FLAG_INTEGER
	    };
	    var FIFTY_PERCENT = {
	        type: 16 /* PERCENTAGE_TOKEN */,
	        number: 50,
	        flags: FLAG_INTEGER
	    };
	    var HUNDRED_PERCENT = {
	        type: 16 /* PERCENTAGE_TOKEN */,
	        number: 100,
	        flags: FLAG_INTEGER
	    };
	    var getAbsoluteValueForTuple = function (tuple, width, height) {
	        var x = tuple[0], y = tuple[1];
	        return [getAbsoluteValue(x, width), getAbsoluteValue(typeof y !== 'undefined' ? y : x, height)];
	    };
	    var getAbsoluteValue = function (token, parent) {
	        if (token.type === 16 /* PERCENTAGE_TOKEN */) {
	            return (token.number / 100) * parent;
	        }
	        if (isDimensionToken(token)) {
	            switch (token.unit) {
	                case 'rem':
	                case 'em':
	                    return 16 * token.number; // TODO use correct font-size
	                case 'px':
	                default:
	                    return token.number;
	            }
	        }
	        return token.number;
	    };

	    var DEG = 'deg';
	    var GRAD = 'grad';
	    var RAD = 'rad';
	    var TURN = 'turn';
	    var angle = {
	        name: 'angle',
	        parse: function (_context, value) {
	            if (value.type === 15 /* DIMENSION_TOKEN */) {
	                switch (value.unit) {
	                    case DEG:
	                        return (Math.PI * value.number) / 180;
	                    case GRAD:
	                        return (Math.PI / 200) * value.number;
	                    case RAD:
	                        return value.number;
	                    case TURN:
	                        return Math.PI * 2 * value.number;
	                }
	            }
	            throw new Error("Unsupported angle type");
	        }
	    };
	    var isAngle = function (value) {
	        if (value.type === 15 /* DIMENSION_TOKEN */) {
	            if (value.unit === DEG || value.unit === GRAD || value.unit === RAD || value.unit === TURN) {
	                return true;
	            }
	        }
	        return false;
	    };
	    var parseNamedSide = function (tokens) {
	        var sideOrCorner = tokens
	            .filter(isIdentToken)
	            .map(function (ident) { return ident.value; })
	            .join(' ');
	        switch (sideOrCorner) {
	            case 'to bottom right':
	            case 'to right bottom':
	            case 'left top':
	            case 'top left':
	                return [ZERO_LENGTH, ZERO_LENGTH];
	            case 'to top':
	            case 'bottom':
	                return deg(0);
	            case 'to bottom left':
	            case 'to left bottom':
	            case 'right top':
	            case 'top right':
	                return [ZERO_LENGTH, HUNDRED_PERCENT];
	            case 'to right':
	            case 'left':
	                return deg(90);
	            case 'to top left':
	            case 'to left top':
	            case 'right bottom':
	            case 'bottom right':
	                return [HUNDRED_PERCENT, HUNDRED_PERCENT];
	            case 'to bottom':
	            case 'top':
	                return deg(180);
	            case 'to top right':
	            case 'to right top':
	            case 'left bottom':
	            case 'bottom left':
	                return [HUNDRED_PERCENT, ZERO_LENGTH];
	            case 'to left':
	            case 'right':
	                return deg(270);
	        }
	        return 0;
	    };
	    var deg = function (deg) { return (Math.PI * deg) / 180; };

	    var color$1 = {
	        name: 'color',
	        parse: function (context, value) {
	            if (value.type === 18 /* FUNCTION */) {
	                var colorFunction = SUPPORTED_COLOR_FUNCTIONS[value.name];
	                if (typeof colorFunction === 'undefined') {
	                    throw new Error("Attempting to parse an unsupported color function \"" + value.name + "\"");
	                }
	                return colorFunction(context, value.values);
	            }
	            if (value.type === 5 /* HASH_TOKEN */) {
	                if (value.value.length === 3) {
	                    var r = value.value.substring(0, 1);
	                    var g = value.value.substring(1, 2);
	                    var b = value.value.substring(2, 3);
	                    return pack(parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), 1);
	                }
	                if (value.value.length === 4) {
	                    var r = value.value.substring(0, 1);
	                    var g = value.value.substring(1, 2);
	                    var b = value.value.substring(2, 3);
	                    var a = value.value.substring(3, 4);
	                    return pack(parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16), parseInt(a + a, 16) / 255);
	                }
	                if (value.value.length === 6) {
	                    var r = value.value.substring(0, 2);
	                    var g = value.value.substring(2, 4);
	                    var b = value.value.substring(4, 6);
	                    return pack(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), 1);
	                }
	                if (value.value.length === 8) {
	                    var r = value.value.substring(0, 2);
	                    var g = value.value.substring(2, 4);
	                    var b = value.value.substring(4, 6);
	                    var a = value.value.substring(6, 8);
	                    return pack(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseInt(a, 16) / 255);
	                }
	            }
	            if (value.type === 20 /* IDENT_TOKEN */) {
	                var namedColor = COLORS[value.value.toUpperCase()];
	                if (typeof namedColor !== 'undefined') {
	                    return namedColor;
	                }
	            }
	            return COLORS.TRANSPARENT;
	        }
	    };
	    var isTransparent = function (color) { return (0xff & color) === 0; };
	    var asString = function (color) {
	        var alpha = 0xff & color;
	        var blue = 0xff & (color >> 8);
	        var green = 0xff & (color >> 16);
	        var red = 0xff & (color >> 24);
	        return alpha < 255 ? "rgba(" + red + "," + green + "," + blue + "," + alpha / 255 + ")" : "rgb(" + red + "," + green + "," + blue + ")";
	    };
	    var pack = function (r, g, b, a) {
	        return ((r << 24) | (g << 16) | (b << 8) | (Math.round(a * 255) << 0)) >>> 0;
	    };
	    var getTokenColorValue = function (token, i) {
	        if (token.type === 17 /* NUMBER_TOKEN */) {
	            return token.number;
	        }
	        if (token.type === 16 /* PERCENTAGE_TOKEN */) {
	            var max = i === 3 ? 1 : 255;
	            return i === 3 ? (token.number / 100) * max : Math.round((token.number / 100) * max);
	        }
	        return 0;
	    };
	    var rgb = function (_context, args) {
	        var tokens = args.filter(nonFunctionArgSeparator);
	        if (tokens.length === 3) {
	            var _a = tokens.map(getTokenColorValue), r = _a[0], g = _a[1], b = _a[2];
	            return pack(r, g, b, 1);
	        }
	        if (tokens.length === 4) {
	            var _b = tokens.map(getTokenColorValue), r = _b[0], g = _b[1], b = _b[2], a = _b[3];
	            return pack(r, g, b, a);
	        }
	        return 0;
	    };
	    function hue2rgb(t1, t2, hue) {
	        if (hue < 0) {
	            hue += 1;
	        }
	        if (hue >= 1) {
	            hue -= 1;
	        }
	        if (hue < 1 / 6) {
	            return (t2 - t1) * hue * 6 + t1;
	        }
	        else if (hue < 1 / 2) {
	            return t2;
	        }
	        else if (hue < 2 / 3) {
	            return (t2 - t1) * 6 * (2 / 3 - hue) + t1;
	        }
	        else {
	            return t1;
	        }
	    }
	    var hsl = function (context, args) {
	        var tokens = args.filter(nonFunctionArgSeparator);
	        var hue = tokens[0], saturation = tokens[1], lightness = tokens[2], alpha = tokens[3];
	        var h = (hue.type === 17 /* NUMBER_TOKEN */ ? deg(hue.number) : angle.parse(context, hue)) / (Math.PI * 2);
	        var s = isLengthPercentage(saturation) ? saturation.number / 100 : 0;
	        var l = isLengthPercentage(lightness) ? lightness.number / 100 : 0;
	        var a = typeof alpha !== 'undefined' && isLengthPercentage(alpha) ? getAbsoluteValue(alpha, 1) : 1;
	        if (s === 0) {
	            return pack(l * 255, l * 255, l * 255, 1);
	        }
	        var t2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
	        var t1 = l * 2 - t2;
	        var r = hue2rgb(t1, t2, h + 1 / 3);
	        var g = hue2rgb(t1, t2, h);
	        var b = hue2rgb(t1, t2, h - 1 / 3);
	        return pack(r * 255, g * 255, b * 255, a);
	    };
	    var SUPPORTED_COLOR_FUNCTIONS = {
	        hsl: hsl,
	        hsla: hsl,
	        rgb: rgb,
	        rgba: rgb
	    };
	    var parseColor = function (context, value) {
	        return color$1.parse(context, Parser.create(value).parseComponentValue());
	    };
	    var COLORS = {
	        ALICEBLUE: 0xf0f8ffff,
	        ANTIQUEWHITE: 0xfaebd7ff,
	        AQUA: 0x00ffffff,
	        AQUAMARINE: 0x7fffd4ff,
	        AZURE: 0xf0ffffff,
	        BEIGE: 0xf5f5dcff,
	        BISQUE: 0xffe4c4ff,
	        BLACK: 0x000000ff,
	        BLANCHEDALMOND: 0xffebcdff,
	        BLUE: 0x0000ffff,
	        BLUEVIOLET: 0x8a2be2ff,
	        BROWN: 0xa52a2aff,
	        BURLYWOOD: 0xdeb887ff,
	        CADETBLUE: 0x5f9ea0ff,
	        CHARTREUSE: 0x7fff00ff,
	        CHOCOLATE: 0xd2691eff,
	        CORAL: 0xff7f50ff,
	        CORNFLOWERBLUE: 0x6495edff,
	        CORNSILK: 0xfff8dcff,
	        CRIMSON: 0xdc143cff,
	        CYAN: 0x00ffffff,
	        DARKBLUE: 0x00008bff,
	        DARKCYAN: 0x008b8bff,
	        DARKGOLDENROD: 0xb886bbff,
	        DARKGRAY: 0xa9a9a9ff,
	        DARKGREEN: 0x006400ff,
	        DARKGREY: 0xa9a9a9ff,
	        DARKKHAKI: 0xbdb76bff,
	        DARKMAGENTA: 0x8b008bff,
	        DARKOLIVEGREEN: 0x556b2fff,
	        DARKORANGE: 0xff8c00ff,
	        DARKORCHID: 0x9932ccff,
	        DARKRED: 0x8b0000ff,
	        DARKSALMON: 0xe9967aff,
	        DARKSEAGREEN: 0x8fbc8fff,
	        DARKSLATEBLUE: 0x483d8bff,
	        DARKSLATEGRAY: 0x2f4f4fff,
	        DARKSLATEGREY: 0x2f4f4fff,
	        DARKTURQUOISE: 0x00ced1ff,
	        DARKVIOLET: 0x9400d3ff,
	        DEEPPINK: 0xff1493ff,
	        DEEPSKYBLUE: 0x00bfffff,
	        DIMGRAY: 0x696969ff,
	        DIMGREY: 0x696969ff,
	        DODGERBLUE: 0x1e90ffff,
	        FIREBRICK: 0xb22222ff,
	        FLORALWHITE: 0xfffaf0ff,
	        FORESTGREEN: 0x228b22ff,
	        FUCHSIA: 0xff00ffff,
	        GAINSBORO: 0xdcdcdcff,
	        GHOSTWHITE: 0xf8f8ffff,
	        GOLD: 0xffd700ff,
	        GOLDENROD: 0xdaa520ff,
	        GRAY: 0x808080ff,
	        GREEN: 0x008000ff,
	        GREENYELLOW: 0xadff2fff,
	        GREY: 0x808080ff,
	        HONEYDEW: 0xf0fff0ff,
	        HOTPINK: 0xff69b4ff,
	        INDIANRED: 0xcd5c5cff,
	        INDIGO: 0x4b0082ff,
	        IVORY: 0xfffff0ff,
	        KHAKI: 0xf0e68cff,
	        LAVENDER: 0xe6e6faff,
	        LAVENDERBLUSH: 0xfff0f5ff,
	        LAWNGREEN: 0x7cfc00ff,
	        LEMONCHIFFON: 0xfffacdff,
	        LIGHTBLUE: 0xadd8e6ff,
	        LIGHTCORAL: 0xf08080ff,
	        LIGHTCYAN: 0xe0ffffff,
	        LIGHTGOLDENRODYELLOW: 0xfafad2ff,
	        LIGHTGRAY: 0xd3d3d3ff,
	        LIGHTGREEN: 0x90ee90ff,
	        LIGHTGREY: 0xd3d3d3ff,
	        LIGHTPINK: 0xffb6c1ff,
	        LIGHTSALMON: 0xffa07aff,
	        LIGHTSEAGREEN: 0x20b2aaff,
	        LIGHTSKYBLUE: 0x87cefaff,
	        LIGHTSLATEGRAY: 0x778899ff,
	        LIGHTSLATEGREY: 0x778899ff,
	        LIGHTSTEELBLUE: 0xb0c4deff,
	        LIGHTYELLOW: 0xffffe0ff,
	        LIME: 0x00ff00ff,
	        LIMEGREEN: 0x32cd32ff,
	        LINEN: 0xfaf0e6ff,
	        MAGENTA: 0xff00ffff,
	        MAROON: 0x800000ff,
	        MEDIUMAQUAMARINE: 0x66cdaaff,
	        MEDIUMBLUE: 0x0000cdff,
	        MEDIUMORCHID: 0xba55d3ff,
	        MEDIUMPURPLE: 0x9370dbff,
	        MEDIUMSEAGREEN: 0x3cb371ff,
	        MEDIUMSLATEBLUE: 0x7b68eeff,
	        MEDIUMSPRINGGREEN: 0x00fa9aff,
	        MEDIUMTURQUOISE: 0x48d1ccff,
	        MEDIUMVIOLETRED: 0xc71585ff,
	        MIDNIGHTBLUE: 0x191970ff,
	        MINTCREAM: 0xf5fffaff,
	        MISTYROSE: 0xffe4e1ff,
	        MOCCASIN: 0xffe4b5ff,
	        NAVAJOWHITE: 0xffdeadff,
	        NAVY: 0x000080ff,
	        OLDLACE: 0xfdf5e6ff,
	        OLIVE: 0x808000ff,
	        OLIVEDRAB: 0x6b8e23ff,
	        ORANGE: 0xffa500ff,
	        ORANGERED: 0xff4500ff,
	        ORCHID: 0xda70d6ff,
	        PALEGOLDENROD: 0xeee8aaff,
	        PALEGREEN: 0x98fb98ff,
	        PALETURQUOISE: 0xafeeeeff,
	        PALEVIOLETRED: 0xdb7093ff,
	        PAPAYAWHIP: 0xffefd5ff,
	        PEACHPUFF: 0xffdab9ff,
	        PERU: 0xcd853fff,
	        PINK: 0xffc0cbff,
	        PLUM: 0xdda0ddff,
	        POWDERBLUE: 0xb0e0e6ff,
	        PURPLE: 0x800080ff,
	        REBECCAPURPLE: 0x663399ff,
	        RED: 0xff0000ff,
	        ROSYBROWN: 0xbc8f8fff,
	        ROYALBLUE: 0x4169e1ff,
	        SADDLEBROWN: 0x8b4513ff,
	        SALMON: 0xfa8072ff,
	        SANDYBROWN: 0xf4a460ff,
	        SEAGREEN: 0x2e8b57ff,
	        SEASHELL: 0xfff5eeff,
	        SIENNA: 0xa0522dff,
	        SILVER: 0xc0c0c0ff,
	        SKYBLUE: 0x87ceebff,
	        SLATEBLUE: 0x6a5acdff,
	        SLATEGRAY: 0x708090ff,
	        SLATEGREY: 0x708090ff,
	        SNOW: 0xfffafaff,
	        SPRINGGREEN: 0x00ff7fff,
	        STEELBLUE: 0x4682b4ff,
	        TAN: 0xd2b48cff,
	        TEAL: 0x008080ff,
	        THISTLE: 0xd8bfd8ff,
	        TOMATO: 0xff6347ff,
	        TRANSPARENT: 0x00000000,
	        TURQUOISE: 0x40e0d0ff,
	        VIOLET: 0xee82eeff,
	        WHEAT: 0xf5deb3ff,
	        WHITE: 0xffffffff,
	        WHITESMOKE: 0xf5f5f5ff,
	        YELLOW: 0xffff00ff,
	        YELLOWGREEN: 0x9acd32ff
	    };

	    var backgroundClip = {
	        name: 'background-clip',
	        initialValue: 'border-box',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return tokens.map(function (token) {
	                if (isIdentToken(token)) {
	                    switch (token.value) {
	                        case 'padding-box':
	                            return 1 /* PADDING_BOX */;
	                        case 'content-box':
	                            return 2 /* CONTENT_BOX */;
	                    }
	                }
	                return 0 /* BORDER_BOX */;
	            });
	        }
	    };

	    var backgroundColor = {
	        name: "background-color",
	        initialValue: 'transparent',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'color'
	    };

	    var parseColorStop = function (context, args) {
	        var color = color$1.parse(context, args[0]);
	        var stop = args[1];
	        return stop && isLengthPercentage(stop) ? { color: color, stop: stop } : { color: color, stop: null };
	    };
	    var processColorStops = function (stops, lineLength) {
	        var first = stops[0];
	        var last = stops[stops.length - 1];
	        if (first.stop === null) {
	            first.stop = ZERO_LENGTH;
	        }
	        if (last.stop === null) {
	            last.stop = HUNDRED_PERCENT;
	        }
	        var processStops = [];
	        var previous = 0;
	        for (var i = 0; i < stops.length; i++) {
	            var stop_1 = stops[i].stop;
	            if (stop_1 !== null) {
	                var absoluteValue = getAbsoluteValue(stop_1, lineLength);
	                if (absoluteValue > previous) {
	                    processStops.push(absoluteValue);
	                }
	                else {
	                    processStops.push(previous);
	                }
	                previous = absoluteValue;
	            }
	            else {
	                processStops.push(null);
	            }
	        }
	        var gapBegin = null;
	        for (var i = 0; i < processStops.length; i++) {
	            var stop_2 = processStops[i];
	            if (stop_2 === null) {
	                if (gapBegin === null) {
	                    gapBegin = i;
	                }
	            }
	            else if (gapBegin !== null) {
	                var gapLength = i - gapBegin;
	                var beforeGap = processStops[gapBegin - 1];
	                var gapValue = (stop_2 - beforeGap) / (gapLength + 1);
	                for (var g = 1; g <= gapLength; g++) {
	                    processStops[gapBegin + g - 1] = gapValue * g;
	                }
	                gapBegin = null;
	            }
	        }
	        return stops.map(function (_a, i) {
	            var color = _a.color;
	            return { color: color, stop: Math.max(Math.min(1, processStops[i] / lineLength), 0) };
	        });
	    };
	    var getAngleFromCorner = function (corner, width, height) {
	        var centerX = width / 2;
	        var centerY = height / 2;
	        var x = getAbsoluteValue(corner[0], width) - centerX;
	        var y = centerY - getAbsoluteValue(corner[1], height);
	        return (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
	    };
	    var calculateGradientDirection = function (angle, width, height) {
	        var radian = typeof angle === 'number' ? angle : getAngleFromCorner(angle, width, height);
	        var lineLength = Math.abs(width * Math.sin(radian)) + Math.abs(height * Math.cos(radian));
	        var halfWidth = width / 2;
	        var halfHeight = height / 2;
	        var halfLineLength = lineLength / 2;
	        var yDiff = Math.sin(radian - Math.PI / 2) * halfLineLength;
	        var xDiff = Math.cos(radian - Math.PI / 2) * halfLineLength;
	        return [lineLength, halfWidth - xDiff, halfWidth + xDiff, halfHeight - yDiff, halfHeight + yDiff];
	    };
	    var distance = function (a, b) { return Math.sqrt(a * a + b * b); };
	    var findCorner = function (width, height, x, y, closest) {
	        var corners = [
	            [0, 0],
	            [0, height],
	            [width, 0],
	            [width, height]
	        ];
	        return corners.reduce(function (stat, corner) {
	            var cx = corner[0], cy = corner[1];
	            var d = distance(x - cx, y - cy);
	            if (closest ? d < stat.optimumDistance : d > stat.optimumDistance) {
	                return {
	                    optimumCorner: corner,
	                    optimumDistance: d
	                };
	            }
	            return stat;
	        }, {
	            optimumDistance: closest ? Infinity : -Infinity,
	            optimumCorner: null
	        }).optimumCorner;
	    };
	    var calculateRadius = function (gradient, x, y, width, height) {
	        var rx = 0;
	        var ry = 0;
	        switch (gradient.size) {
	            case 0 /* CLOSEST_SIDE */:
	                // The ending shape is sized so that that it exactly meets the side of the gradient box closest to the gradient’s center.
	                // If the shape is an ellipse, it exactly meets the closest side in each dimension.
	                if (gradient.shape === 0 /* CIRCLE */) {
	                    rx = ry = Math.min(Math.abs(x), Math.abs(x - width), Math.abs(y), Math.abs(y - height));
	                }
	                else if (gradient.shape === 1 /* ELLIPSE */) {
	                    rx = Math.min(Math.abs(x), Math.abs(x - width));
	                    ry = Math.min(Math.abs(y), Math.abs(y - height));
	                }
	                break;
	            case 2 /* CLOSEST_CORNER */:
	                // The ending shape is sized so that that it passes through the corner of the gradient box closest to the gradient’s center.
	                // If the shape is an ellipse, the ending shape is given the same aspect-ratio it would have if closest-side were specified.
	                if (gradient.shape === 0 /* CIRCLE */) {
	                    rx = ry = Math.min(distance(x, y), distance(x, y - height), distance(x - width, y), distance(x - width, y - height));
	                }
	                else if (gradient.shape === 1 /* ELLIPSE */) {
	                    // Compute the ratio ry/rx (which is to be the same as for "closest-side")
	                    var c = Math.min(Math.abs(y), Math.abs(y - height)) / Math.min(Math.abs(x), Math.abs(x - width));
	                    var _a = findCorner(width, height, x, y, true), cx = _a[0], cy = _a[1];
	                    rx = distance(cx - x, (cy - y) / c);
	                    ry = c * rx;
	                }
	                break;
	            case 1 /* FARTHEST_SIDE */:
	                // Same as closest-side, except the ending shape is sized based on the farthest side(s)
	                if (gradient.shape === 0 /* CIRCLE */) {
	                    rx = ry = Math.max(Math.abs(x), Math.abs(x - width), Math.abs(y), Math.abs(y - height));
	                }
	                else if (gradient.shape === 1 /* ELLIPSE */) {
	                    rx = Math.max(Math.abs(x), Math.abs(x - width));
	                    ry = Math.max(Math.abs(y), Math.abs(y - height));
	                }
	                break;
	            case 3 /* FARTHEST_CORNER */:
	                // Same as closest-corner, except the ending shape is sized based on the farthest corner.
	                // If the shape is an ellipse, the ending shape is given the same aspect ratio it would have if farthest-side were specified.
	                if (gradient.shape === 0 /* CIRCLE */) {
	                    rx = ry = Math.max(distance(x, y), distance(x, y - height), distance(x - width, y), distance(x - width, y - height));
	                }
	                else if (gradient.shape === 1 /* ELLIPSE */) {
	                    // Compute the ratio ry/rx (which is to be the same as for "farthest-side")
	                    var c = Math.max(Math.abs(y), Math.abs(y - height)) / Math.max(Math.abs(x), Math.abs(x - width));
	                    var _b = findCorner(width, height, x, y, false), cx = _b[0], cy = _b[1];
	                    rx = distance(cx - x, (cy - y) / c);
	                    ry = c * rx;
	                }
	                break;
	        }
	        if (Array.isArray(gradient.size)) {
	            rx = getAbsoluteValue(gradient.size[0], width);
	            ry = gradient.size.length === 2 ? getAbsoluteValue(gradient.size[1], height) : rx;
	        }
	        return [rx, ry];
	    };

	    var linearGradient = function (context, tokens) {
	        var angle$1 = deg(180);
	        var stops = [];
	        parseFunctionArgs(tokens).forEach(function (arg, i) {
	            if (i === 0) {
	                var firstToken = arg[0];
	                if (firstToken.type === 20 /* IDENT_TOKEN */ && firstToken.value === 'to') {
	                    angle$1 = parseNamedSide(arg);
	                    return;
	                }
	                else if (isAngle(firstToken)) {
	                    angle$1 = angle.parse(context, firstToken);
	                    return;
	                }
	            }
	            var colorStop = parseColorStop(context, arg);
	            stops.push(colorStop);
	        });
	        return { angle: angle$1, stops: stops, type: 1 /* LINEAR_GRADIENT */ };
	    };

	    var prefixLinearGradient = function (context, tokens) {
	        var angle$1 = deg(180);
	        var stops = [];
	        parseFunctionArgs(tokens).forEach(function (arg, i) {
	            if (i === 0) {
	                var firstToken = arg[0];
	                if (firstToken.type === 20 /* IDENT_TOKEN */ &&
	                    ['top', 'left', 'right', 'bottom'].indexOf(firstToken.value) !== -1) {
	                    angle$1 = parseNamedSide(arg);
	                    return;
	                }
	                else if (isAngle(firstToken)) {
	                    angle$1 = (angle.parse(context, firstToken) + deg(270)) % deg(360);
	                    return;
	                }
	            }
	            var colorStop = parseColorStop(context, arg);
	            stops.push(colorStop);
	        });
	        return {
	            angle: angle$1,
	            stops: stops,
	            type: 1 /* LINEAR_GRADIENT */
	        };
	    };

	    var webkitGradient = function (context, tokens) {
	        var angle = deg(180);
	        var stops = [];
	        var type = 1 /* LINEAR_GRADIENT */;
	        var shape = 0 /* CIRCLE */;
	        var size = 3 /* FARTHEST_CORNER */;
	        var position = [];
	        parseFunctionArgs(tokens).forEach(function (arg, i) {
	            var firstToken = arg[0];
	            if (i === 0) {
	                if (isIdentToken(firstToken) && firstToken.value === 'linear') {
	                    type = 1 /* LINEAR_GRADIENT */;
	                    return;
	                }
	                else if (isIdentToken(firstToken) && firstToken.value === 'radial') {
	                    type = 2 /* RADIAL_GRADIENT */;
	                    return;
	                }
	            }
	            if (firstToken.type === 18 /* FUNCTION */) {
	                if (firstToken.name === 'from') {
	                    var color = color$1.parse(context, firstToken.values[0]);
	                    stops.push({ stop: ZERO_LENGTH, color: color });
	                }
	                else if (firstToken.name === 'to') {
	                    var color = color$1.parse(context, firstToken.values[0]);
	                    stops.push({ stop: HUNDRED_PERCENT, color: color });
	                }
	                else if (firstToken.name === 'color-stop') {
	                    var values = firstToken.values.filter(nonFunctionArgSeparator);
	                    if (values.length === 2) {
	                        var color = color$1.parse(context, values[1]);
	                        var stop_1 = values[0];
	                        if (isNumberToken(stop_1)) {
	                            stops.push({
	                                stop: { type: 16 /* PERCENTAGE_TOKEN */, number: stop_1.number * 100, flags: stop_1.flags },
	                                color: color
	                            });
	                        }
	                    }
	                }
	            }
	        });
	        return type === 1 /* LINEAR_GRADIENT */
	            ? {
	                angle: (angle + deg(180)) % deg(360),
	                stops: stops,
	                type: type
	            }
	            : { size: size, shape: shape, stops: stops, position: position, type: type };
	    };

	    var CLOSEST_SIDE = 'closest-side';
	    var FARTHEST_SIDE = 'farthest-side';
	    var CLOSEST_CORNER = 'closest-corner';
	    var FARTHEST_CORNER = 'farthest-corner';
	    var CIRCLE = 'circle';
	    var ELLIPSE = 'ellipse';
	    var COVER = 'cover';
	    var CONTAIN = 'contain';
	    var radialGradient = function (context, tokens) {
	        var shape = 0 /* CIRCLE */;
	        var size = 3 /* FARTHEST_CORNER */;
	        var stops = [];
	        var position = [];
	        parseFunctionArgs(tokens).forEach(function (arg, i) {
	            var isColorStop = true;
	            if (i === 0) {
	                var isAtPosition_1 = false;
	                isColorStop = arg.reduce(function (acc, token) {
	                    if (isAtPosition_1) {
	                        if (isIdentToken(token)) {
	                            switch (token.value) {
	                                case 'center':
	                                    position.push(FIFTY_PERCENT);
	                                    return acc;
	                                case 'top':
	                                case 'left':
	                                    position.push(ZERO_LENGTH);
	                                    return acc;
	                                case 'right':
	                                case 'bottom':
	                                    position.push(HUNDRED_PERCENT);
	                                    return acc;
	                            }
	                        }
	                        else if (isLengthPercentage(token) || isLength(token)) {
	                            position.push(token);
	                        }
	                    }
	                    else if (isIdentToken(token)) {
	                        switch (token.value) {
	                            case CIRCLE:
	                                shape = 0 /* CIRCLE */;
	                                return false;
	                            case ELLIPSE:
	                                shape = 1 /* ELLIPSE */;
	                                return false;
	                            case 'at':
	                                isAtPosition_1 = true;
	                                return false;
	                            case CLOSEST_SIDE:
	                                size = 0 /* CLOSEST_SIDE */;
	                                return false;
	                            case COVER:
	                            case FARTHEST_SIDE:
	                                size = 1 /* FARTHEST_SIDE */;
	                                return false;
	                            case CONTAIN:
	                            case CLOSEST_CORNER:
	                                size = 2 /* CLOSEST_CORNER */;
	                                return false;
	                            case FARTHEST_CORNER:
	                                size = 3 /* FARTHEST_CORNER */;
	                                return false;
	                        }
	                    }
	                    else if (isLength(token) || isLengthPercentage(token)) {
	                        if (!Array.isArray(size)) {
	                            size = [];
	                        }
	                        size.push(token);
	                        return false;
	                    }
	                    return acc;
	                }, isColorStop);
	            }
	            if (isColorStop) {
	                var colorStop = parseColorStop(context, arg);
	                stops.push(colorStop);
	            }
	        });
	        return { size: size, shape: shape, stops: stops, position: position, type: 2 /* RADIAL_GRADIENT */ };
	    };

	    var prefixRadialGradient = function (context, tokens) {
	        var shape = 0 /* CIRCLE */;
	        var size = 3 /* FARTHEST_CORNER */;
	        var stops = [];
	        var position = [];
	        parseFunctionArgs(tokens).forEach(function (arg, i) {
	            var isColorStop = true;
	            if (i === 0) {
	                isColorStop = arg.reduce(function (acc, token) {
	                    if (isIdentToken(token)) {
	                        switch (token.value) {
	                            case 'center':
	                                position.push(FIFTY_PERCENT);
	                                return false;
	                            case 'top':
	                            case 'left':
	                                position.push(ZERO_LENGTH);
	                                return false;
	                            case 'right':
	                            case 'bottom':
	                                position.push(HUNDRED_PERCENT);
	                                return false;
	                        }
	                    }
	                    else if (isLengthPercentage(token) || isLength(token)) {
	                        position.push(token);
	                        return false;
	                    }
	                    return acc;
	                }, isColorStop);
	            }
	            else if (i === 1) {
	                isColorStop = arg.reduce(function (acc, token) {
	                    if (isIdentToken(token)) {
	                        switch (token.value) {
	                            case CIRCLE:
	                                shape = 0 /* CIRCLE */;
	                                return false;
	                            case ELLIPSE:
	                                shape = 1 /* ELLIPSE */;
	                                return false;
	                            case CONTAIN:
	                            case CLOSEST_SIDE:
	                                size = 0 /* CLOSEST_SIDE */;
	                                return false;
	                            case FARTHEST_SIDE:
	                                size = 1 /* FARTHEST_SIDE */;
	                                return false;
	                            case CLOSEST_CORNER:
	                                size = 2 /* CLOSEST_CORNER */;
	                                return false;
	                            case COVER:
	                            case FARTHEST_CORNER:
	                                size = 3 /* FARTHEST_CORNER */;
	                                return false;
	                        }
	                    }
	                    else if (isLength(token) || isLengthPercentage(token)) {
	                        if (!Array.isArray(size)) {
	                            size = [];
	                        }
	                        size.push(token);
	                        return false;
	                    }
	                    return acc;
	                }, isColorStop);
	            }
	            if (isColorStop) {
	                var colorStop = parseColorStop(context, arg);
	                stops.push(colorStop);
	            }
	        });
	        return { size: size, shape: shape, stops: stops, position: position, type: 2 /* RADIAL_GRADIENT */ };
	    };

	    var isLinearGradient = function (background) {
	        return background.type === 1 /* LINEAR_GRADIENT */;
	    };
	    var isRadialGradient = function (background) {
	        return background.type === 2 /* RADIAL_GRADIENT */;
	    };
	    var image = {
	        name: 'image',
	        parse: function (context, value) {
	            if (value.type === 22 /* URL_TOKEN */) {
	                var image_1 = { url: value.value, type: 0 /* URL */ };
	                context.cache.addImage(value.value);
	                return image_1;
	            }
	            if (value.type === 18 /* FUNCTION */) {
	                var imageFunction = SUPPORTED_IMAGE_FUNCTIONS[value.name];
	                if (typeof imageFunction === 'undefined') {
	                    throw new Error("Attempting to parse an unsupported image function \"" + value.name + "\"");
	                }
	                return imageFunction(context, value.values);
	            }
	            throw new Error("Unsupported image type " + value.type);
	        }
	    };
	    function isSupportedImage(value) {
	        return (!(value.type === 20 /* IDENT_TOKEN */ && value.value === 'none') &&
	            (value.type !== 18 /* FUNCTION */ || !!SUPPORTED_IMAGE_FUNCTIONS[value.name]));
	    }
	    var SUPPORTED_IMAGE_FUNCTIONS = {
	        'linear-gradient': linearGradient,
	        '-moz-linear-gradient': prefixLinearGradient,
	        '-ms-linear-gradient': prefixLinearGradient,
	        '-o-linear-gradient': prefixLinearGradient,
	        '-webkit-linear-gradient': prefixLinearGradient,
	        'radial-gradient': radialGradient,
	        '-moz-radial-gradient': prefixRadialGradient,
	        '-ms-radial-gradient': prefixRadialGradient,
	        '-o-radial-gradient': prefixRadialGradient,
	        '-webkit-radial-gradient': prefixRadialGradient,
	        '-webkit-gradient': webkitGradient
	    };

	    var backgroundImage = {
	        name: 'background-image',
	        initialValue: 'none',
	        type: 1 /* LIST */,
	        prefix: false,
	        parse: function (context, tokens) {
	            if (tokens.length === 0) {
	                return [];
	            }
	            var first = tokens[0];
	            if (first.type === 20 /* IDENT_TOKEN */ && first.value === 'none') {
	                return [];
	            }
	            return tokens
	                .filter(function (value) { return nonFunctionArgSeparator(value) && isSupportedImage(value); })
	                .map(function (value) { return image.parse(context, value); });
	        }
	    };

	    var backgroundOrigin = {
	        name: 'background-origin',
	        initialValue: 'border-box',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return tokens.map(function (token) {
	                if (isIdentToken(token)) {
	                    switch (token.value) {
	                        case 'padding-box':
	                            return 1 /* PADDING_BOX */;
	                        case 'content-box':
	                            return 2 /* CONTENT_BOX */;
	                    }
	                }
	                return 0 /* BORDER_BOX */;
	            });
	        }
	    };

	    var backgroundPosition = {
	        name: 'background-position',
	        initialValue: '0% 0%',
	        type: 1 /* LIST */,
	        prefix: false,
	        parse: function (_context, tokens) {
	            return parseFunctionArgs(tokens)
	                .map(function (values) { return values.filter(isLengthPercentage); })
	                .map(parseLengthPercentageTuple);
	        }
	    };

	    var backgroundRepeat = {
	        name: 'background-repeat',
	        initialValue: 'repeat',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return parseFunctionArgs(tokens)
	                .map(function (values) {
	                return values
	                    .filter(isIdentToken)
	                    .map(function (token) { return token.value; })
	                    .join(' ');
	            })
	                .map(parseBackgroundRepeat);
	        }
	    };
	    var parseBackgroundRepeat = function (value) {
	        switch (value) {
	            case 'no-repeat':
	                return 1 /* NO_REPEAT */;
	            case 'repeat-x':
	            case 'repeat no-repeat':
	                return 2 /* REPEAT_X */;
	            case 'repeat-y':
	            case 'no-repeat repeat':
	                return 3 /* REPEAT_Y */;
	            case 'repeat':
	            default:
	                return 0 /* REPEAT */;
	        }
	    };

	    var BACKGROUND_SIZE;
	    (function (BACKGROUND_SIZE) {
	        BACKGROUND_SIZE["AUTO"] = "auto";
	        BACKGROUND_SIZE["CONTAIN"] = "contain";
	        BACKGROUND_SIZE["COVER"] = "cover";
	    })(BACKGROUND_SIZE || (BACKGROUND_SIZE = {}));
	    var backgroundSize = {
	        name: 'background-size',
	        initialValue: '0',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return parseFunctionArgs(tokens).map(function (values) { return values.filter(isBackgroundSizeInfoToken); });
	        }
	    };
	    var isBackgroundSizeInfoToken = function (value) {
	        return isIdentToken(value) || isLengthPercentage(value);
	    };

	    var borderColorForSide = function (side) { return ({
	        name: "border-" + side + "-color",
	        initialValue: 'transparent',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'color'
	    }); };
	    var borderTopColor = borderColorForSide('top');
	    var borderRightColor = borderColorForSide('right');
	    var borderBottomColor = borderColorForSide('bottom');
	    var borderLeftColor = borderColorForSide('left');

	    var borderRadiusForSide = function (side) { return ({
	        name: "border-radius-" + side,
	        initialValue: '0 0',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return parseLengthPercentageTuple(tokens.filter(isLengthPercentage));
	        }
	    }); };
	    var borderTopLeftRadius = borderRadiusForSide('top-left');
	    var borderTopRightRadius = borderRadiusForSide('top-right');
	    var borderBottomRightRadius = borderRadiusForSide('bottom-right');
	    var borderBottomLeftRadius = borderRadiusForSide('bottom-left');

	    var borderStyleForSide = function (side) { return ({
	        name: "border-" + side + "-style",
	        initialValue: 'solid',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, style) {
	            switch (style) {
	                case 'none':
	                    return 0 /* NONE */;
	                case 'dashed':
	                    return 2 /* DASHED */;
	                case 'dotted':
	                    return 3 /* DOTTED */;
	                case 'double':
	                    return 4 /* DOUBLE */;
	            }
	            return 1 /* SOLID */;
	        }
	    }); };
	    var borderTopStyle = borderStyleForSide('top');
	    var borderRightStyle = borderStyleForSide('right');
	    var borderBottomStyle = borderStyleForSide('bottom');
	    var borderLeftStyle = borderStyleForSide('left');

	    var borderWidthForSide = function (side) { return ({
	        name: "border-" + side + "-width",
	        initialValue: '0',
	        type: 0 /* VALUE */,
	        prefix: false,
	        parse: function (_context, token) {
	            if (isDimensionToken(token)) {
	                return token.number;
	            }
	            return 0;
	        }
	    }); };
	    var borderTopWidth = borderWidthForSide('top');
	    var borderRightWidth = borderWidthForSide('right');
	    var borderBottomWidth = borderWidthForSide('bottom');
	    var borderLeftWidth = borderWidthForSide('left');

	    var color = {
	        name: "color",
	        initialValue: 'transparent',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'color'
	    };

	    var direction = {
	        name: 'direction',
	        initialValue: 'ltr',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, direction) {
	            switch (direction) {
	                case 'rtl':
	                    return 1 /* RTL */;
	                case 'ltr':
	                default:
	                    return 0 /* LTR */;
	            }
	        }
	    };

	    var display = {
	        name: 'display',
	        initialValue: 'inline-block',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return tokens.filter(isIdentToken).reduce(function (bit, token) {
	                return bit | parseDisplayValue(token.value);
	            }, 0 /* NONE */);
	        }
	    };
	    var parseDisplayValue = function (display) {
	        switch (display) {
	            case 'block':
	            case '-webkit-box':
	                return 2 /* BLOCK */;
	            case 'inline':
	                return 4 /* INLINE */;
	            case 'run-in':
	                return 8 /* RUN_IN */;
	            case 'flow':
	                return 16 /* FLOW */;
	            case 'flow-root':
	                return 32 /* FLOW_ROOT */;
	            case 'table':
	                return 64 /* TABLE */;
	            case 'flex':
	            case '-webkit-flex':
	                return 128 /* FLEX */;
	            case 'grid':
	            case '-ms-grid':
	                return 256 /* GRID */;
	            case 'ruby':
	                return 512 /* RUBY */;
	            case 'subgrid':
	                return 1024 /* SUBGRID */;
	            case 'list-item':
	                return 2048 /* LIST_ITEM */;
	            case 'table-row-group':
	                return 4096 /* TABLE_ROW_GROUP */;
	            case 'table-header-group':
	                return 8192 /* TABLE_HEADER_GROUP */;
	            case 'table-footer-group':
	                return 16384 /* TABLE_FOOTER_GROUP */;
	            case 'table-row':
	                return 32768 /* TABLE_ROW */;
	            case 'table-cell':
	                return 65536 /* TABLE_CELL */;
	            case 'table-column-group':
	                return 131072 /* TABLE_COLUMN_GROUP */;
	            case 'table-column':
	                return 262144 /* TABLE_COLUMN */;
	            case 'table-caption':
	                return 524288 /* TABLE_CAPTION */;
	            case 'ruby-base':
	                return 1048576 /* RUBY_BASE */;
	            case 'ruby-text':
	                return 2097152 /* RUBY_TEXT */;
	            case 'ruby-base-container':
	                return 4194304 /* RUBY_BASE_CONTAINER */;
	            case 'ruby-text-container':
	                return 8388608 /* RUBY_TEXT_CONTAINER */;
	            case 'contents':
	                return 16777216 /* CONTENTS */;
	            case 'inline-block':
	                return 33554432 /* INLINE_BLOCK */;
	            case 'inline-list-item':
	                return 67108864 /* INLINE_LIST_ITEM */;
	            case 'inline-table':
	                return 134217728 /* INLINE_TABLE */;
	            case 'inline-flex':
	                return 268435456 /* INLINE_FLEX */;
	            case 'inline-grid':
	                return 536870912 /* INLINE_GRID */;
	        }
	        return 0 /* NONE */;
	    };

	    var float = {
	        name: 'float',
	        initialValue: 'none',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, float) {
	            switch (float) {
	                case 'left':
	                    return 1 /* LEFT */;
	                case 'right':
	                    return 2 /* RIGHT */;
	                case 'inline-start':
	                    return 3 /* INLINE_START */;
	                case 'inline-end':
	                    return 4 /* INLINE_END */;
	            }
	            return 0 /* NONE */;
	        }
	    };

	    var letterSpacing = {
	        name: 'letter-spacing',
	        initialValue: '0',
	        prefix: false,
	        type: 0 /* VALUE */,
	        parse: function (_context, token) {
	            if (token.type === 20 /* IDENT_TOKEN */ && token.value === 'normal') {
	                return 0;
	            }
	            if (token.type === 17 /* NUMBER_TOKEN */) {
	                return token.number;
	            }
	            if (token.type === 15 /* DIMENSION_TOKEN */) {
	                return token.number;
	            }
	            return 0;
	        }
	    };

	    var LINE_BREAK;
	    (function (LINE_BREAK) {
	        LINE_BREAK["NORMAL"] = "normal";
	        LINE_BREAK["STRICT"] = "strict";
	    })(LINE_BREAK || (LINE_BREAK = {}));
	    var lineBreak = {
	        name: 'line-break',
	        initialValue: 'normal',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, lineBreak) {
	            switch (lineBreak) {
	                case 'strict':
	                    return LINE_BREAK.STRICT;
	                case 'normal':
	                default:
	                    return LINE_BREAK.NORMAL;
	            }
	        }
	    };

	    var lineHeight = {
	        name: 'line-height',
	        initialValue: 'normal',
	        prefix: false,
	        type: 4 /* TOKEN_VALUE */
	    };
	    var computeLineHeight = function (token, fontSize) {
	        if (isIdentToken(token) && token.value === 'normal') {
	            return 1.2 * fontSize;
	        }
	        else if (token.type === 17 /* NUMBER_TOKEN */) {
	            return fontSize * token.number;
	        }
	        else if (isLengthPercentage(token)) {
	            return getAbsoluteValue(token, fontSize);
	        }
	        return fontSize;
	    };

	    var listStyleImage = {
	        name: 'list-style-image',
	        initialValue: 'none',
	        type: 0 /* VALUE */,
	        prefix: false,
	        parse: function (context, token) {
	            if (token.type === 20 /* IDENT_TOKEN */ && token.value === 'none') {
	                return null;
	            }
	            return image.parse(context, token);
	        }
	    };

	    var listStylePosition = {
	        name: 'list-style-position',
	        initialValue: 'outside',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, position) {
	            switch (position) {
	                case 'inside':
	                    return 0 /* INSIDE */;
	                case 'outside':
	                default:
	                    return 1 /* OUTSIDE */;
	            }
	        }
	    };

	    var listStyleType = {
	        name: 'list-style-type',
	        initialValue: 'none',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, type) {
	            switch (type) {
	                case 'disc':
	                    return 0 /* DISC */;
	                case 'circle':
	                    return 1 /* CIRCLE */;
	                case 'square':
	                    return 2 /* SQUARE */;
	                case 'decimal':
	                    return 3 /* DECIMAL */;
	                case 'cjk-decimal':
	                    return 4 /* CJK_DECIMAL */;
	                case 'decimal-leading-zero':
	                    return 5 /* DECIMAL_LEADING_ZERO */;
	                case 'lower-roman':
	                    return 6 /* LOWER_ROMAN */;
	                case 'upper-roman':
	                    return 7 /* UPPER_ROMAN */;
	                case 'lower-greek':
	                    return 8 /* LOWER_GREEK */;
	                case 'lower-alpha':
	                    return 9 /* LOWER_ALPHA */;
	                case 'upper-alpha':
	                    return 10 /* UPPER_ALPHA */;
	                case 'arabic-indic':
	                    return 11 /* ARABIC_INDIC */;
	                case 'armenian':
	                    return 12 /* ARMENIAN */;
	                case 'bengali':
	                    return 13 /* BENGALI */;
	                case 'cambodian':
	                    return 14 /* CAMBODIAN */;
	                case 'cjk-earthly-branch':
	                    return 15 /* CJK_EARTHLY_BRANCH */;
	                case 'cjk-heavenly-stem':
	                    return 16 /* CJK_HEAVENLY_STEM */;
	                case 'cjk-ideographic':
	                    return 17 /* CJK_IDEOGRAPHIC */;
	                case 'devanagari':
	                    return 18 /* DEVANAGARI */;
	                case 'ethiopic-numeric':
	                    return 19 /* ETHIOPIC_NUMERIC */;
	                case 'georgian':
	                    return 20 /* GEORGIAN */;
	                case 'gujarati':
	                    return 21 /* GUJARATI */;
	                case 'gurmukhi':
	                    return 22 /* GURMUKHI */;
	                case 'hebrew':
	                    return 22 /* HEBREW */;
	                case 'hiragana':
	                    return 23 /* HIRAGANA */;
	                case 'hiragana-iroha':
	                    return 24 /* HIRAGANA_IROHA */;
	                case 'japanese-formal':
	                    return 25 /* JAPANESE_FORMAL */;
	                case 'japanese-informal':
	                    return 26 /* JAPANESE_INFORMAL */;
	                case 'kannada':
	                    return 27 /* KANNADA */;
	                case 'katakana':
	                    return 28 /* KATAKANA */;
	                case 'katakana-iroha':
	                    return 29 /* KATAKANA_IROHA */;
	                case 'khmer':
	                    return 30 /* KHMER */;
	                case 'korean-hangul-formal':
	                    return 31 /* KOREAN_HANGUL_FORMAL */;
	                case 'korean-hanja-formal':
	                    return 32 /* KOREAN_HANJA_FORMAL */;
	                case 'korean-hanja-informal':
	                    return 33 /* KOREAN_HANJA_INFORMAL */;
	                case 'lao':
	                    return 34 /* LAO */;
	                case 'lower-armenian':
	                    return 35 /* LOWER_ARMENIAN */;
	                case 'malayalam':
	                    return 36 /* MALAYALAM */;
	                case 'mongolian':
	                    return 37 /* MONGOLIAN */;
	                case 'myanmar':
	                    return 38 /* MYANMAR */;
	                case 'oriya':
	                    return 39 /* ORIYA */;
	                case 'persian':
	                    return 40 /* PERSIAN */;
	                case 'simp-chinese-formal':
	                    return 41 /* SIMP_CHINESE_FORMAL */;
	                case 'simp-chinese-informal':
	                    return 42 /* SIMP_CHINESE_INFORMAL */;
	                case 'tamil':
	                    return 43 /* TAMIL */;
	                case 'telugu':
	                    return 44 /* TELUGU */;
	                case 'thai':
	                    return 45 /* THAI */;
	                case 'tibetan':
	                    return 46 /* TIBETAN */;
	                case 'trad-chinese-formal':
	                    return 47 /* TRAD_CHINESE_FORMAL */;
	                case 'trad-chinese-informal':
	                    return 48 /* TRAD_CHINESE_INFORMAL */;
	                case 'upper-armenian':
	                    return 49 /* UPPER_ARMENIAN */;
	                case 'disclosure-open':
	                    return 50 /* DISCLOSURE_OPEN */;
	                case 'disclosure-closed':
	                    return 51 /* DISCLOSURE_CLOSED */;
	                case 'none':
	                default:
	                    return -1 /* NONE */;
	            }
	        }
	    };

	    var marginForSide = function (side) { return ({
	        name: "margin-" + side,
	        initialValue: '0',
	        prefix: false,
	        type: 4 /* TOKEN_VALUE */
	    }); };
	    var marginTop = marginForSide('top');
	    var marginRight = marginForSide('right');
	    var marginBottom = marginForSide('bottom');
	    var marginLeft = marginForSide('left');

	    var overflow = {
	        name: 'overflow',
	        initialValue: 'visible',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return tokens.filter(isIdentToken).map(function (overflow) {
	                switch (overflow.value) {
	                    case 'hidden':
	                        return 1 /* HIDDEN */;
	                    case 'scroll':
	                        return 2 /* SCROLL */;
	                    case 'clip':
	                        return 3 /* CLIP */;
	                    case 'auto':
	                        return 4 /* AUTO */;
	                    case 'visible':
	                    default:
	                        return 0 /* VISIBLE */;
	                }
	            });
	        }
	    };

	    var overflowWrap = {
	        name: 'overflow-wrap',
	        initialValue: 'normal',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, overflow) {
	            switch (overflow) {
	                case 'break-word':
	                    return "break-word" /* BREAK_WORD */;
	                case 'normal':
	                default:
	                    return "normal" /* NORMAL */;
	            }
	        }
	    };

	    var paddingForSide = function (side) { return ({
	        name: "padding-" + side,
	        initialValue: '0',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'length-percentage'
	    }); };
	    var paddingTop = paddingForSide('top');
	    var paddingRight = paddingForSide('right');
	    var paddingBottom = paddingForSide('bottom');
	    var paddingLeft = paddingForSide('left');

	    var textAlign = {
	        name: 'text-align',
	        initialValue: 'left',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, textAlign) {
	            switch (textAlign) {
	                case 'right':
	                    return 2 /* RIGHT */;
	                case 'center':
	                case 'justify':
	                    return 1 /* CENTER */;
	                case 'left':
	                default:
	                    return 0 /* LEFT */;
	            }
	        }
	    };

	    var position = {
	        name: 'position',
	        initialValue: 'static',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, position) {
	            switch (position) {
	                case 'relative':
	                    return 1 /* RELATIVE */;
	                case 'absolute':
	                    return 2 /* ABSOLUTE */;
	                case 'fixed':
	                    return 3 /* FIXED */;
	                case 'sticky':
	                    return 4 /* STICKY */;
	            }
	            return 0 /* STATIC */;
	        }
	    };

	    var textShadow = {
	        name: 'text-shadow',
	        initialValue: 'none',
	        type: 1 /* LIST */,
	        prefix: false,
	        parse: function (context, tokens) {
	            if (tokens.length === 1 && isIdentWithValue(tokens[0], 'none')) {
	                return [];
	            }
	            return parseFunctionArgs(tokens).map(function (values) {
	                var shadow = {
	                    color: COLORS.TRANSPARENT,
	                    offsetX: ZERO_LENGTH,
	                    offsetY: ZERO_LENGTH,
	                    blur: ZERO_LENGTH
	                };
	                var c = 0;
	                for (var i = 0; i < values.length; i++) {
	                    var token = values[i];
	                    if (isLength(token)) {
	                        if (c === 0) {
	                            shadow.offsetX = token;
	                        }
	                        else if (c === 1) {
	                            shadow.offsetY = token;
	                        }
	                        else {
	                            shadow.blur = token;
	                        }
	                        c++;
	                    }
	                    else {
	                        shadow.color = color$1.parse(context, token);
	                    }
	                }
	                return shadow;
	            });
	        }
	    };

	    var textTransform = {
	        name: 'text-transform',
	        initialValue: 'none',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, textTransform) {
	            switch (textTransform) {
	                case 'uppercase':
	                    return 2 /* UPPERCASE */;
	                case 'lowercase':
	                    return 1 /* LOWERCASE */;
	                case 'capitalize':
	                    return 3 /* CAPITALIZE */;
	            }
	            return 0 /* NONE */;
	        }
	    };

	    var transform$1 = {
	        name: 'transform',
	        initialValue: 'none',
	        prefix: true,
	        type: 0 /* VALUE */,
	        parse: function (_context, token) {
	            if (token.type === 20 /* IDENT_TOKEN */ && token.value === 'none') {
	                return null;
	            }
	            if (token.type === 18 /* FUNCTION */) {
	                var transformFunction = SUPPORTED_TRANSFORM_FUNCTIONS[token.name];
	                if (typeof transformFunction === 'undefined') {
	                    throw new Error("Attempting to parse an unsupported transform function \"" + token.name + "\"");
	                }
	                return transformFunction(token.values);
	            }
	            return null;
	        }
	    };
	    var matrix = function (args) {
	        var values = args.filter(function (arg) { return arg.type === 17 /* NUMBER_TOKEN */; }).map(function (arg) { return arg.number; });
	        return values.length === 6 ? values : null;
	    };
	    // doesn't support 3D transforms at the moment
	    var matrix3d = function (args) {
	        var values = args.filter(function (arg) { return arg.type === 17 /* NUMBER_TOKEN */; }).map(function (arg) { return arg.number; });
	        var a1 = values[0], b1 = values[1]; values[2]; values[3]; var a2 = values[4], b2 = values[5]; values[6]; values[7]; values[8]; values[9]; values[10]; values[11]; var a4 = values[12], b4 = values[13]; values[14]; values[15];
	        return values.length === 16 ? [a1, b1, a2, b2, a4, b4] : null;
	    };
	    var SUPPORTED_TRANSFORM_FUNCTIONS = {
	        matrix: matrix,
	        matrix3d: matrix3d
	    };

	    var DEFAULT_VALUE = {
	        type: 16 /* PERCENTAGE_TOKEN */,
	        number: 50,
	        flags: FLAG_INTEGER
	    };
	    var DEFAULT = [DEFAULT_VALUE, DEFAULT_VALUE];
	    var transformOrigin = {
	        name: 'transform-origin',
	        initialValue: '50% 50%',
	        prefix: true,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            var origins = tokens.filter(isLengthPercentage);
	            if (origins.length !== 2) {
	                return DEFAULT;
	            }
	            return [origins[0], origins[1]];
	        }
	    };

	    var visibility = {
	        name: 'visible',
	        initialValue: 'none',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, visibility) {
	            switch (visibility) {
	                case 'hidden':
	                    return 1 /* HIDDEN */;
	                case 'collapse':
	                    return 2 /* COLLAPSE */;
	                case 'visible':
	                default:
	                    return 0 /* VISIBLE */;
	            }
	        }
	    };

	    var WORD_BREAK;
	    (function (WORD_BREAK) {
	        WORD_BREAK["NORMAL"] = "normal";
	        WORD_BREAK["BREAK_ALL"] = "break-all";
	        WORD_BREAK["KEEP_ALL"] = "keep-all";
	    })(WORD_BREAK || (WORD_BREAK = {}));
	    var wordBreak = {
	        name: 'word-break',
	        initialValue: 'normal',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, wordBreak) {
	            switch (wordBreak) {
	                case 'break-all':
	                    return WORD_BREAK.BREAK_ALL;
	                case 'keep-all':
	                    return WORD_BREAK.KEEP_ALL;
	                case 'normal':
	                default:
	                    return WORD_BREAK.NORMAL;
	            }
	        }
	    };

	    var zIndex = {
	        name: 'z-index',
	        initialValue: 'auto',
	        prefix: false,
	        type: 0 /* VALUE */,
	        parse: function (_context, token) {
	            if (token.type === 20 /* IDENT_TOKEN */) {
	                return { auto: true, order: 0 };
	            }
	            if (isNumberToken(token)) {
	                return { auto: false, order: token.number };
	            }
	            throw new Error("Invalid z-index number parsed");
	        }
	    };

	    var time = {
	        name: 'time',
	        parse: function (_context, value) {
	            if (value.type === 15 /* DIMENSION_TOKEN */) {
	                switch (value.unit.toLowerCase()) {
	                    case 's':
	                        return 1000 * value.number;
	                    case 'ms':
	                        return value.number;
	                }
	            }
	            throw new Error("Unsupported time type");
	        }
	    };

	    var opacity = {
	        name: 'opacity',
	        initialValue: '1',
	        type: 0 /* VALUE */,
	        prefix: false,
	        parse: function (_context, token) {
	            if (isNumberToken(token)) {
	                return token.number;
	            }
	            return 1;
	        }
	    };

	    var textDecorationColor = {
	        name: "text-decoration-color",
	        initialValue: 'transparent',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'color'
	    };

	    var textDecorationLine = {
	        name: 'text-decoration-line',
	        initialValue: 'none',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            return tokens
	                .filter(isIdentToken)
	                .map(function (token) {
	                switch (token.value) {
	                    case 'underline':
	                        return 1 /* UNDERLINE */;
	                    case 'overline':
	                        return 2 /* OVERLINE */;
	                    case 'line-through':
	                        return 3 /* LINE_THROUGH */;
	                    case 'none':
	                        return 4 /* BLINK */;
	                }
	                return 0 /* NONE */;
	            })
	                .filter(function (line) { return line !== 0 /* NONE */; });
	        }
	    };

	    var fontFamily = {
	        name: "font-family",
	        initialValue: '',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            var accumulator = [];
	            var results = [];
	            tokens.forEach(function (token) {
	                switch (token.type) {
	                    case 20 /* IDENT_TOKEN */:
	                    case 0 /* STRING_TOKEN */:
	                        accumulator.push(token.value);
	                        break;
	                    case 17 /* NUMBER_TOKEN */:
	                        accumulator.push(token.number.toString());
	                        break;
	                    case 4 /* COMMA_TOKEN */:
	                        results.push(accumulator.join(' '));
	                        accumulator.length = 0;
	                        break;
	                }
	            });
	            if (accumulator.length) {
	                results.push(accumulator.join(' '));
	            }
	            return results.map(function (result) { return (result.indexOf(' ') === -1 ? result : "'" + result + "'"); });
	        }
	    };

	    var fontSize = {
	        name: "font-size",
	        initialValue: '0',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'length'
	    };

	    var fontWeight = {
	        name: 'font-weight',
	        initialValue: 'normal',
	        type: 0 /* VALUE */,
	        prefix: false,
	        parse: function (_context, token) {
	            if (isNumberToken(token)) {
	                return token.number;
	            }
	            if (isIdentToken(token)) {
	                switch (token.value) {
	                    case 'bold':
	                        return 700;
	                    case 'normal':
	                    default:
	                        return 400;
	                }
	            }
	            return 400;
	        }
	    };

	    var fontVariant = {
	        name: 'font-variant',
	        initialValue: 'none',
	        type: 1 /* LIST */,
	        prefix: false,
	        parse: function (_context, tokens) {
	            return tokens.filter(isIdentToken).map(function (token) { return token.value; });
	        }
	    };

	    var fontStyle = {
	        name: 'font-style',
	        initialValue: 'normal',
	        prefix: false,
	        type: 2 /* IDENT_VALUE */,
	        parse: function (_context, overflow) {
	            switch (overflow) {
	                case 'oblique':
	                    return "oblique" /* OBLIQUE */;
	                case 'italic':
	                    return "italic" /* ITALIC */;
	                case 'normal':
	                default:
	                    return "normal" /* NORMAL */;
	            }
	        }
	    };

	    var contains = function (bit, value) { return (bit & value) !== 0; };

	    var content = {
	        name: 'content',
	        initialValue: 'none',
	        type: 1 /* LIST */,
	        prefix: false,
	        parse: function (_context, tokens) {
	            if (tokens.length === 0) {
	                return [];
	            }
	            var first = tokens[0];
	            if (first.type === 20 /* IDENT_TOKEN */ && first.value === 'none') {
	                return [];
	            }
	            return tokens;
	        }
	    };

	    var counterIncrement = {
	        name: 'counter-increment',
	        initialValue: 'none',
	        prefix: true,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            if (tokens.length === 0) {
	                return null;
	            }
	            var first = tokens[0];
	            if (first.type === 20 /* IDENT_TOKEN */ && first.value === 'none') {
	                return null;
	            }
	            var increments = [];
	            var filtered = tokens.filter(nonWhiteSpace);
	            for (var i = 0; i < filtered.length; i++) {
	                var counter = filtered[i];
	                var next = filtered[i + 1];
	                if (counter.type === 20 /* IDENT_TOKEN */) {
	                    var increment = next && isNumberToken(next) ? next.number : 1;
	                    increments.push({ counter: counter.value, increment: increment });
	                }
	            }
	            return increments;
	        }
	    };

	    var counterReset = {
	        name: 'counter-reset',
	        initialValue: 'none',
	        prefix: true,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            if (tokens.length === 0) {
	                return [];
	            }
	            var resets = [];
	            var filtered = tokens.filter(nonWhiteSpace);
	            for (var i = 0; i < filtered.length; i++) {
	                var counter = filtered[i];
	                var next = filtered[i + 1];
	                if (isIdentToken(counter) && counter.value !== 'none') {
	                    var reset = next && isNumberToken(next) ? next.number : 0;
	                    resets.push({ counter: counter.value, reset: reset });
	                }
	            }
	            return resets;
	        }
	    };

	    var duration = {
	        name: 'duration',
	        initialValue: '0s',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (context, tokens) {
	            return tokens.filter(isDimensionToken).map(function (token) { return time.parse(context, token); });
	        }
	    };

	    var quotes = {
	        name: 'quotes',
	        initialValue: 'none',
	        prefix: true,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            if (tokens.length === 0) {
	                return null;
	            }
	            var first = tokens[0];
	            if (first.type === 20 /* IDENT_TOKEN */ && first.value === 'none') {
	                return null;
	            }
	            var quotes = [];
	            var filtered = tokens.filter(isStringToken);
	            if (filtered.length % 2 !== 0) {
	                return null;
	            }
	            for (var i = 0; i < filtered.length; i += 2) {
	                var open_1 = filtered[i].value;
	                var close_1 = filtered[i + 1].value;
	                quotes.push({ open: open_1, close: close_1 });
	            }
	            return quotes;
	        }
	    };
	    var getQuote = function (quotes, depth, open) {
	        if (!quotes) {
	            return '';
	        }
	        var quote = quotes[Math.min(depth, quotes.length - 1)];
	        if (!quote) {
	            return '';
	        }
	        return open ? quote.open : quote.close;
	    };

	    var boxShadow = {
	        name: 'box-shadow',
	        initialValue: 'none',
	        type: 1 /* LIST */,
	        prefix: false,
	        parse: function (context, tokens) {
	            if (tokens.length === 1 && isIdentWithValue(tokens[0], 'none')) {
	                return [];
	            }
	            return parseFunctionArgs(tokens).map(function (values) {
	                var shadow = {
	                    color: 0x000000ff,
	                    offsetX: ZERO_LENGTH,
	                    offsetY: ZERO_LENGTH,
	                    blur: ZERO_LENGTH,
	                    spread: ZERO_LENGTH,
	                    inset: false
	                };
	                var c = 0;
	                for (var i = 0; i < values.length; i++) {
	                    var token = values[i];
	                    if (isIdentWithValue(token, 'inset')) {
	                        shadow.inset = true;
	                    }
	                    else if (isLength(token)) {
	                        if (c === 0) {
	                            shadow.offsetX = token;
	                        }
	                        else if (c === 1) {
	                            shadow.offsetY = token;
	                        }
	                        else if (c === 2) {
	                            shadow.blur = token;
	                        }
	                        else {
	                            shadow.spread = token;
	                        }
	                        c++;
	                    }
	                    else {
	                        shadow.color = color$1.parse(context, token);
	                    }
	                }
	                return shadow;
	            });
	        }
	    };

	    var paintOrder = {
	        name: 'paint-order',
	        initialValue: 'normal',
	        prefix: false,
	        type: 1 /* LIST */,
	        parse: function (_context, tokens) {
	            var DEFAULT_VALUE = [0 /* FILL */, 1 /* STROKE */, 2 /* MARKERS */];
	            var layers = [];
	            tokens.filter(isIdentToken).forEach(function (token) {
	                switch (token.value) {
	                    case 'stroke':
	                        layers.push(1 /* STROKE */);
	                        break;
	                    case 'fill':
	                        layers.push(0 /* FILL */);
	                        break;
	                    case 'markers':
	                        layers.push(2 /* MARKERS */);
	                        break;
	                }
	            });
	            DEFAULT_VALUE.forEach(function (value) {
	                if (layers.indexOf(value) === -1) {
	                    layers.push(value);
	                }
	            });
	            return layers;
	        }
	    };

	    var webkitTextStrokeColor = {
	        name: "-webkit-text-stroke-color",
	        initialValue: 'currentcolor',
	        prefix: false,
	        type: 3 /* TYPE_VALUE */,
	        format: 'color'
	    };

	    var webkitTextStrokeWidth = {
	        name: "-webkit-text-stroke-width",
	        initialValue: '0',
	        type: 0 /* VALUE */,
	        prefix: false,
	        parse: function (_context, token) {
	            if (isDimensionToken(token)) {
	                return token.number;
	            }
	            return 0;
	        }
	    };

	    var CSSParsedDeclaration = /** @class */ (function () {
	        function CSSParsedDeclaration(context, declaration) {
	            var _a, _b;
	            this.animationDuration = parse(context, duration, declaration.animationDuration);
	            this.backgroundClip = parse(context, backgroundClip, declaration.backgroundClip);
	            this.backgroundColor = parse(context, backgroundColor, declaration.backgroundColor);
	            this.backgroundImage = parse(context, backgroundImage, declaration.backgroundImage);
	            this.backgroundOrigin = parse(context, backgroundOrigin, declaration.backgroundOrigin);
	            this.backgroundPosition = parse(context, backgroundPosition, declaration.backgroundPosition);
	            this.backgroundRepeat = parse(context, backgroundRepeat, declaration.backgroundRepeat);
	            this.backgroundSize = parse(context, backgroundSize, declaration.backgroundSize);
	            this.borderTopColor = parse(context, borderTopColor, declaration.borderTopColor);
	            this.borderRightColor = parse(context, borderRightColor, declaration.borderRightColor);
	            this.borderBottomColor = parse(context, borderBottomColor, declaration.borderBottomColor);
	            this.borderLeftColor = parse(context, borderLeftColor, declaration.borderLeftColor);
	            this.borderTopLeftRadius = parse(context, borderTopLeftRadius, declaration.borderTopLeftRadius);
	            this.borderTopRightRadius = parse(context, borderTopRightRadius, declaration.borderTopRightRadius);
	            this.borderBottomRightRadius = parse(context, borderBottomRightRadius, declaration.borderBottomRightRadius);
	            this.borderBottomLeftRadius = parse(context, borderBottomLeftRadius, declaration.borderBottomLeftRadius);
	            this.borderTopStyle = parse(context, borderTopStyle, declaration.borderTopStyle);
	            this.borderRightStyle = parse(context, borderRightStyle, declaration.borderRightStyle);
	            this.borderBottomStyle = parse(context, borderBottomStyle, declaration.borderBottomStyle);
	            this.borderLeftStyle = parse(context, borderLeftStyle, declaration.borderLeftStyle);
	            this.borderTopWidth = parse(context, borderTopWidth, declaration.borderTopWidth);
	            this.borderRightWidth = parse(context, borderRightWidth, declaration.borderRightWidth);
	            this.borderBottomWidth = parse(context, borderBottomWidth, declaration.borderBottomWidth);
	            this.borderLeftWidth = parse(context, borderLeftWidth, declaration.borderLeftWidth);
	            this.boxShadow = parse(context, boxShadow, declaration.boxShadow);
	            this.color = parse(context, color, declaration.color);
	            this.direction = parse(context, direction, declaration.direction);
	            this.display = parse(context, display, declaration.display);
	            this.float = parse(context, float, declaration.cssFloat);
	            this.fontFamily = parse(context, fontFamily, declaration.fontFamily);
	            this.fontSize = parse(context, fontSize, declaration.fontSize);
	            this.fontStyle = parse(context, fontStyle, declaration.fontStyle);
	            this.fontVariant = parse(context, fontVariant, declaration.fontVariant);
	            this.fontWeight = parse(context, fontWeight, declaration.fontWeight);
	            this.letterSpacing = parse(context, letterSpacing, declaration.letterSpacing);
	            this.lineBreak = parse(context, lineBreak, declaration.lineBreak);
	            this.lineHeight = parse(context, lineHeight, declaration.lineHeight);
	            this.listStyleImage = parse(context, listStyleImage, declaration.listStyleImage);
	            this.listStylePosition = parse(context, listStylePosition, declaration.listStylePosition);
	            this.listStyleType = parse(context, listStyleType, declaration.listStyleType);
	            this.marginTop = parse(context, marginTop, declaration.marginTop);
	            this.marginRight = parse(context, marginRight, declaration.marginRight);
	            this.marginBottom = parse(context, marginBottom, declaration.marginBottom);
	            this.marginLeft = parse(context, marginLeft, declaration.marginLeft);
	            this.opacity = parse(context, opacity, declaration.opacity);
	            var overflowTuple = parse(context, overflow, declaration.overflow);
	            this.overflowX = overflowTuple[0];
	            this.overflowY = overflowTuple[overflowTuple.length > 1 ? 1 : 0];
	            this.overflowWrap = parse(context, overflowWrap, declaration.overflowWrap);
	            this.paddingTop = parse(context, paddingTop, declaration.paddingTop);
	            this.paddingRight = parse(context, paddingRight, declaration.paddingRight);
	            this.paddingBottom = parse(context, paddingBottom, declaration.paddingBottom);
	            this.paddingLeft = parse(context, paddingLeft, declaration.paddingLeft);
	            this.paintOrder = parse(context, paintOrder, declaration.paintOrder);
	            this.position = parse(context, position, declaration.position);
	            this.textAlign = parse(context, textAlign, declaration.textAlign);
	            this.textDecorationColor = parse(context, textDecorationColor, (_a = declaration.textDecorationColor) !== null && _a !== void 0 ? _a : declaration.color);
	            this.textDecorationLine = parse(context, textDecorationLine, (_b = declaration.textDecorationLine) !== null && _b !== void 0 ? _b : declaration.textDecoration);
	            this.textShadow = parse(context, textShadow, declaration.textShadow);
	            this.textTransform = parse(context, textTransform, declaration.textTransform);
	            this.transform = parse(context, transform$1, declaration.transform);
	            this.transformOrigin = parse(context, transformOrigin, declaration.transformOrigin);
	            this.visibility = parse(context, visibility, declaration.visibility);
	            this.webkitTextStrokeColor = parse(context, webkitTextStrokeColor, declaration.webkitTextStrokeColor);
	            this.webkitTextStrokeWidth = parse(context, webkitTextStrokeWidth, declaration.webkitTextStrokeWidth);
	            this.wordBreak = parse(context, wordBreak, declaration.wordBreak);
	            this.zIndex = parse(context, zIndex, declaration.zIndex);
	        }
	        CSSParsedDeclaration.prototype.isVisible = function () {
	            return this.display > 0 && this.opacity > 0 && this.visibility === 0 /* VISIBLE */;
	        };
	        CSSParsedDeclaration.prototype.isTransparent = function () {
	            return isTransparent(this.backgroundColor);
	        };
	        CSSParsedDeclaration.prototype.isTransformed = function () {
	            return this.transform !== null;
	        };
	        CSSParsedDeclaration.prototype.isPositioned = function () {
	            return this.position !== 0 /* STATIC */;
	        };
	        CSSParsedDeclaration.prototype.isPositionedWithZIndex = function () {
	            return this.isPositioned() && !this.zIndex.auto;
	        };
	        CSSParsedDeclaration.prototype.isFloating = function () {
	            return this.float !== 0 /* NONE */;
	        };
	        CSSParsedDeclaration.prototype.isInlineLevel = function () {
	            return (contains(this.display, 4 /* INLINE */) ||
	                contains(this.display, 33554432 /* INLINE_BLOCK */) ||
	                contains(this.display, 268435456 /* INLINE_FLEX */) ||
	                contains(this.display, 536870912 /* INLINE_GRID */) ||
	                contains(this.display, 67108864 /* INLINE_LIST_ITEM */) ||
	                contains(this.display, 134217728 /* INLINE_TABLE */));
	        };
	        return CSSParsedDeclaration;
	    }());
	    var CSSParsedPseudoDeclaration = /** @class */ (function () {
	        function CSSParsedPseudoDeclaration(context, declaration) {
	            this.content = parse(context, content, declaration.content);
	            this.quotes = parse(context, quotes, declaration.quotes);
	        }
	        return CSSParsedPseudoDeclaration;
	    }());
	    var CSSParsedCounterDeclaration = /** @class */ (function () {
	        function CSSParsedCounterDeclaration(context, declaration) {
	            this.counterIncrement = parse(context, counterIncrement, declaration.counterIncrement);
	            this.counterReset = parse(context, counterReset, declaration.counterReset);
	        }
	        return CSSParsedCounterDeclaration;
	    }());
	    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	    var parse = function (context, descriptor, style) {
	        var tokenizer = new Tokenizer();
	        var value = style !== null && typeof style !== 'undefined' ? style.toString() : descriptor.initialValue;
	        tokenizer.write(value);
	        var parser = new Parser(tokenizer.read());
	        switch (descriptor.type) {
	            case 2 /* IDENT_VALUE */:
	                var token = parser.parseComponentValue();
	                return descriptor.parse(context, isIdentToken(token) ? token.value : descriptor.initialValue);
	            case 0 /* VALUE */:
	                return descriptor.parse(context, parser.parseComponentValue());
	            case 1 /* LIST */:
	                return descriptor.parse(context, parser.parseComponentValues());
	            case 4 /* TOKEN_VALUE */:
	                return parser.parseComponentValue();
	            case 3 /* TYPE_VALUE */:
	                switch (descriptor.format) {
	                    case 'angle':
	                        return angle.parse(context, parser.parseComponentValue());
	                    case 'color':
	                        return color$1.parse(context, parser.parseComponentValue());
	                    case 'image':
	                        return image.parse(context, parser.parseComponentValue());
	                    case 'length':
	                        var length_1 = parser.parseComponentValue();
	                        return isLength(length_1) ? length_1 : ZERO_LENGTH;
	                    case 'length-percentage':
	                        var value_1 = parser.parseComponentValue();
	                        return isLengthPercentage(value_1) ? value_1 : ZERO_LENGTH;
	                    case 'time':
	                        return time.parse(context, parser.parseComponentValue());
	                }
	                break;
	        }
	    };

	    var elementDebuggerAttribute = 'data-html2canvas-debug';
	    var getElementDebugType = function (element) {
	        var attribute = element.getAttribute(elementDebuggerAttribute);
	        switch (attribute) {
	            case 'all':
	                return 1 /* ALL */;
	            case 'clone':
	                return 2 /* CLONE */;
	            case 'parse':
	                return 3 /* PARSE */;
	            case 'render':
	                return 4 /* RENDER */;
	            default:
	                return 0 /* NONE */;
	        }
	    };
	    var isDebugging = function (element, type) {
	        var elementType = getElementDebugType(element);
	        return elementType === 1 /* ALL */ || type === elementType;
	    };

	    var ElementContainer = /** @class */ (function () {
	        function ElementContainer(context, element) {
	            this.context = context;
	            this.textNodes = [];
	            this.elements = [];
	            this.flags = 0;
	            if (isDebugging(element, 3 /* PARSE */)) {
	                debugger;
	            }
	            this.styles = new CSSParsedDeclaration(context, window.getComputedStyle(element, null));
	            if (isHTMLElementNode(element)) {
	                if (this.styles.animationDuration.some(function (duration) { return duration > 0; })) {
	                    element.style.animationDuration = '0s';
	                }
	                if (this.styles.transform !== null) {
	                    // getBoundingClientRect takes transforms into account
	                    element.style.transform = 'none';
	                }
	            }
	            this.bounds = parseBounds(this.context, element);
	            if (isDebugging(element, 4 /* RENDER */)) {
	                this.flags |= 16 /* DEBUG_RENDER */;
	            }
	        }
	        return ElementContainer;
	    }());

	    /*
	     * text-segmentation 1.0.3 <https://github.com/niklasvh/text-segmentation>
	     * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
	     * Released under MIT License
	     */
	    var base64 = 'AAAAAAAAAAAAEA4AGBkAAFAaAAACAAAAAAAIABAAGAAwADgACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAAQABIAEQATAAIABAACAAQAAgAEAAIABAAVABcAAgAEAAIABAACAAQAGAAaABwAHgAgACIAI4AlgAIABAAmwCjAKgAsAC2AL4AvQDFAMoA0gBPAVYBWgEIAAgACACMANoAYgFkAWwBdAF8AX0BhQGNAZUBlgGeAaMBlQGWAasBswF8AbsBwwF0AcsBYwHTAQgA2wG/AOMBdAF8AekB8QF0AfkB+wHiAHQBfAEIAAMC5gQIAAsCEgIIAAgAFgIeAggAIgIpAggAMQI5AkACygEIAAgASAJQAlgCYAIIAAgACAAKBQoFCgUTBRMFGQUrBSsFCAAIAAgACAAIAAgACAAIAAgACABdAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABoAmgCrwGvAQgAbgJ2AggAHgEIAAgACADnAXsCCAAIAAgAgwIIAAgACAAIAAgACACKAggAkQKZAggAPADJAAgAoQKkAqwCsgK6AsICCADJAggA0AIIAAgACAAIANYC3gIIAAgACAAIAAgACABAAOYCCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAkASoB+QIEAAgACAA8AEMCCABCBQgACABJBVAFCAAIAAgACAAIAAgACAAIAAgACABTBVoFCAAIAFoFCABfBWUFCAAIAAgACAAIAAgAbQUIAAgACAAIAAgACABzBXsFfQWFBYoFigWKBZEFigWKBYoFmAWfBaYFrgWxBbkFCAAIAAgACAAIAAgACAAIAAgACAAIAMEFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAMgFCADQBQgACAAIAAgACAAIAAgACAAIAAgACAAIAO4CCAAIAAgAiQAIAAgACABAAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAD0AggACAD8AggACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIANYFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAMDvwAIAAgAJAIIAAgACAAIAAgACAAIAAgACwMTAwgACAB9BOsEGwMjAwgAKwMyAwsFYgE3A/MEPwMIAEUDTQNRAwgAWQOsAGEDCAAIAAgACAAIAAgACABpAzQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFIQUoBSwFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABtAwgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABMAEwACAAIAAgACAAIABgACAAIAAgACAC/AAgACAAyAQgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACAAIAAwAAgACAAIAAgACAAIAAgACAAIAAAARABIAAgACAAIABQASAAIAAgAIABwAEAAjgCIABsAqAC2AL0AigDQAtwC+IJIQqVAZUBWQqVAZUBlQGVAZUBlQGrC5UBlQGVAZUBlQGVAZUBlQGVAXsKlQGVAbAK6wsrDGUMpQzlDJUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAfAKAAuZA64AtwCJALoC6ADwAAgAuACgA/oEpgO6AqsD+AAIAAgAswMIAAgACAAIAIkAuwP5AfsBwwPLAwgACAAIAAgACADRA9kDCAAIAOED6QMIAAgACAAIAAgACADuA/YDCAAIAP4DyQAIAAgABgQIAAgAXQAOBAgACAAIAAgACAAIABMECAAIAAgACAAIAAgACAD8AAQBCAAIAAgAGgQiBCoECAExBAgAEAEIAAgACAAIAAgACAAIAAgACAAIAAgACAA4BAgACABABEYECAAIAAgATAQYAQgAVAQIAAgACAAIAAgACAAIAAgACAAIAFoECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAOQEIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAB+BAcACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAEABhgSMBAgACAAIAAgAlAQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAwAEAAQABAADAAMAAwADAAQABAAEAAQABAAEAAQABHATAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAdQMIAAgACAAIAAgACAAIAMkACAAIAAgAfQMIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACFA4kDCAAIAAgACAAIAOcBCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAIcDCAAIAAgACAAIAAgACAAIAAgACAAIAJEDCAAIAAgACADFAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABgBAgAZgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAbAQCBXIECAAIAHkECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABAAJwEQACjBKoEsgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAC6BMIECAAIAAgACAAIAAgACABmBAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAxwQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAGYECAAIAAgAzgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBd0FXwUIAOIF6gXxBYoF3gT5BQAGCAaKBYoFigWKBYoFigWKBYoFigWKBYoFigXWBIoFigWKBYoFigWKBYoFigWKBYsFEAaKBYoFigWKBYoFigWKBRQGCACKBYoFigWKBQgACAAIANEECAAIABgGigUgBggAJgYIAC4GMwaKBYoF0wQ3Bj4GigWKBYoFigWKBYoFigWKBYoFigWKBYoFigUIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWLBf///////wQABAAEAAQABAAEAAQABAAEAAQAAwAEAAQAAgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAQADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUAAAAFAAUAAAAFAAUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAQAAAAUABQAFAAUABQAFAAAAAAAFAAUAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAFAAUAAQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAAABwAHAAcAAAAHAAcABwAFAAEAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAcABwAFAAUAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAQABAAAAAAAAAAAAAAAFAAUABQAFAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAHAAcAAAAHAAcAAAAAAAUABQAHAAUAAQAHAAEABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwABAAUABQAFAAUAAAAAAAAAAAAAAAEAAQABAAEAAQABAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABQANAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAABQAHAAUABQAFAAAAAAAAAAcABQAFAAUABQAFAAQABAAEAAQABAAEAAQABAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUAAAAFAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAUAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAcABwAFAAcABwAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUABwAHAAUABQAFAAUAAAAAAAcABwAAAAAABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAAAAAAAAAAABQAFAAAAAAAFAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAFAAUABQAFAAUAAAAFAAUABwAAAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABwAFAAUABQAFAAAAAAAHAAcAAAAAAAcABwAFAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAAAAAAAAAHAAcABwAAAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAUABQAFAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAHAAcABQAHAAcAAAAFAAcABwAAAAcABwAFAAUAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAFAAcABwAFAAUABQAAAAUAAAAHAAcABwAHAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAHAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUAAAAFAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAUAAAAFAAUAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABwAFAAUABQAFAAUABQAAAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABQAFAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAFAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAHAAUABQAFAAUABQAFAAUABwAHAAcABwAHAAcABwAHAAUABwAHAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABwAHAAcABwAFAAUABwAHAAcAAAAAAAAAAAAHAAcABQAHAAcABwAHAAcABwAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAUABQAFAAUABQAFAAUAAAAFAAAABQAAAAAABQAFAAUABQAFAAUABQAFAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAUABQAFAAUABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABwAFAAcABwAHAAcABwAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAUABQAFAAUABwAHAAUABQAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABQAFAAcABwAHAAUABwAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAcABQAFAAUABQAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAAAAAABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAAAAAAAAAFAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAUABQAHAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAFAAUABQAFAAcABwAFAAUABwAHAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAcABwAFAAUABwAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABQAAAAAABQAFAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAcABwAAAAAAAAAAAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAcABwAFAAcABwAAAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAFAAUABQAAAAUABQAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABwAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAHAAcABQAHAAUABQAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAAABwAHAAAAAAAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAFAAUABwAFAAcABwAFAAcABQAFAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAAAAAABwAHAAcABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAFAAcABwAFAAUABQAFAAUABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAUABQAFAAcABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABQAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAAAAAAFAAUABwAHAAcABwAFAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAHAAUABQAFAAUABQAFAAUABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAABQAAAAUABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAHAAcAAAAFAAUAAAAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABQAFAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAABQAFAAUABQAFAAUABQAAAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAFAAUABQAFAAUADgAOAA4ADgAOAA4ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAMAAwADAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAAAAAAAAAAAAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAAAAAAAAAAAAsADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwACwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAADgAOAA4AAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAAAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4AAAAOAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAAAAAAAAAAAA4AAAAOAAAAAAAAAAAADgAOAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAA=';

	    /*
	     * utrie 1.0.2 <https://github.com/niklasvh/utrie>
	     * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
	     * Released under MIT License
	     */
	    var chars$1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	    // Use a lookup table to find the index.
	    var lookup$1 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
	    for (var i$1 = 0; i$1 < chars$1.length; i$1++) {
	        lookup$1[chars$1.charCodeAt(i$1)] = i$1;
	    }
	    var decode = function (base64) {
	        var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
	        if (base64[base64.length - 1] === '=') {
	            bufferLength--;
	            if (base64[base64.length - 2] === '=') {
	                bufferLength--;
	            }
	        }
	        var buffer = typeof ArrayBuffer !== 'undefined' &&
	            typeof Uint8Array !== 'undefined' &&
	            typeof Uint8Array.prototype.slice !== 'undefined'
	            ? new ArrayBuffer(bufferLength)
	            : new Array(bufferLength);
	        var bytes = Array.isArray(buffer) ? buffer : new Uint8Array(buffer);
	        for (i = 0; i < len; i += 4) {
	            encoded1 = lookup$1[base64.charCodeAt(i)];
	            encoded2 = lookup$1[base64.charCodeAt(i + 1)];
	            encoded3 = lookup$1[base64.charCodeAt(i + 2)];
	            encoded4 = lookup$1[base64.charCodeAt(i + 3)];
	            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
	            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
	            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
	        }
	        return buffer;
	    };
	    var polyUint16Array = function (buffer) {
	        var length = buffer.length;
	        var bytes = [];
	        for (var i = 0; i < length; i += 2) {
	            bytes.push((buffer[i + 1] << 8) | buffer[i]);
	        }
	        return bytes;
	    };
	    var polyUint32Array = function (buffer) {
	        var length = buffer.length;
	        var bytes = [];
	        for (var i = 0; i < length; i += 4) {
	            bytes.push((buffer[i + 3] << 24) | (buffer[i + 2] << 16) | (buffer[i + 1] << 8) | buffer[i]);
	        }
	        return bytes;
	    };

	    /** Shift size for getting the index-2 table offset. */
	    var UTRIE2_SHIFT_2 = 5;
	    /** Shift size for getting the index-1 table offset. */
	    var UTRIE2_SHIFT_1 = 6 + 5;
	    /**
	     * Shift size for shifting left the index array values.
	     * Increases possible data size with 16-bit index values at the cost
	     * of compactability.
	     * This requires data blocks to be aligned by UTRIE2_DATA_GRANULARITY.
	     */
	    var UTRIE2_INDEX_SHIFT = 2;
	    /**
	     * Difference between the two shift sizes,
	     * for getting an index-1 offset from an index-2 offset. 6=11-5
	     */
	    var UTRIE2_SHIFT_1_2 = UTRIE2_SHIFT_1 - UTRIE2_SHIFT_2;
	    /**
	     * The part of the index-2 table for U+D800..U+DBFF stores values for
	     * lead surrogate code _units_ not code _points_.
	     * Values for lead surrogate code _points_ are indexed with this portion of the table.
	     * Length=32=0x20=0x400>>UTRIE2_SHIFT_2. (There are 1024=0x400 lead surrogates.)
	     */
	    var UTRIE2_LSCP_INDEX_2_OFFSET = 0x10000 >> UTRIE2_SHIFT_2;
	    /** Number of entries in a data block. 32=0x20 */
	    var UTRIE2_DATA_BLOCK_LENGTH = 1 << UTRIE2_SHIFT_2;
	    /** Mask for getting the lower bits for the in-data-block offset. */
	    var UTRIE2_DATA_MASK = UTRIE2_DATA_BLOCK_LENGTH - 1;
	    var UTRIE2_LSCP_INDEX_2_LENGTH = 0x400 >> UTRIE2_SHIFT_2;
	    /** Count the lengths of both BMP pieces. 2080=0x820 */
	    var UTRIE2_INDEX_2_BMP_LENGTH = UTRIE2_LSCP_INDEX_2_OFFSET + UTRIE2_LSCP_INDEX_2_LENGTH;
	    /**
	     * The 2-byte UTF-8 version of the index-2 table follows at offset 2080=0x820.
	     * Length 32=0x20 for lead bytes C0..DF, regardless of UTRIE2_SHIFT_2.
	     */
	    var UTRIE2_UTF8_2B_INDEX_2_OFFSET = UTRIE2_INDEX_2_BMP_LENGTH;
	    var UTRIE2_UTF8_2B_INDEX_2_LENGTH = 0x800 >> 6; /* U+0800 is the first code point after 2-byte UTF-8 */
	    /**
	     * The index-1 table, only used for supplementary code points, at offset 2112=0x840.
	     * Variable length, for code points up to highStart, where the last single-value range starts.
	     * Maximum length 512=0x200=0x100000>>UTRIE2_SHIFT_1.
	     * (For 0x100000 supplementary code points U+10000..U+10ffff.)
	     *
	     * The part of the index-2 table for supplementary code points starts
	     * after this index-1 table.
	     *
	     * Both the index-1 table and the following part of the index-2 table
	     * are omitted completely if there is only BMP data.
	     */
	    var UTRIE2_INDEX_1_OFFSET = UTRIE2_UTF8_2B_INDEX_2_OFFSET + UTRIE2_UTF8_2B_INDEX_2_LENGTH;
	    /**
	     * Number of index-1 entries for the BMP. 32=0x20
	     * This part of the index-1 table is omitted from the serialized form.
	     */
	    var UTRIE2_OMITTED_BMP_INDEX_1_LENGTH = 0x10000 >> UTRIE2_SHIFT_1;
	    /** Number of entries in an index-2 block. 64=0x40 */
	    var UTRIE2_INDEX_2_BLOCK_LENGTH = 1 << UTRIE2_SHIFT_1_2;
	    /** Mask for getting the lower bits for the in-index-2-block offset. */
	    var UTRIE2_INDEX_2_MASK = UTRIE2_INDEX_2_BLOCK_LENGTH - 1;
	    var slice16 = function (view, start, end) {
	        if (view.slice) {
	            return view.slice(start, end);
	        }
	        return new Uint16Array(Array.prototype.slice.call(view, start, end));
	    };
	    var slice32 = function (view, start, end) {
	        if (view.slice) {
	            return view.slice(start, end);
	        }
	        return new Uint32Array(Array.prototype.slice.call(view, start, end));
	    };
	    var createTrieFromBase64 = function (base64, _byteLength) {
	        var buffer = decode(base64);
	        var view32 = Array.isArray(buffer) ? polyUint32Array(buffer) : new Uint32Array(buffer);
	        var view16 = Array.isArray(buffer) ? polyUint16Array(buffer) : new Uint16Array(buffer);
	        var headerLength = 24;
	        var index = slice16(view16, headerLength / 2, view32[4] / 2);
	        var data = view32[5] === 2
	            ? slice16(view16, (headerLength + view32[4]) / 2)
	            : slice32(view32, Math.ceil((headerLength + view32[4]) / 4));
	        return new Trie(view32[0], view32[1], view32[2], view32[3], index, data);
	    };
	    var Trie = /** @class */ (function () {
	        function Trie(initialValue, errorValue, highStart, highValueIndex, index, data) {
	            this.initialValue = initialValue;
	            this.errorValue = errorValue;
	            this.highStart = highStart;
	            this.highValueIndex = highValueIndex;
	            this.index = index;
	            this.data = data;
	        }
	        /**
	         * Get the value for a code point as stored in the Trie.
	         *
	         * @param codePoint the code point
	         * @return the value
	         */
	        Trie.prototype.get = function (codePoint) {
	            var ix;
	            if (codePoint >= 0) {
	                if (codePoint < 0x0d800 || (codePoint > 0x0dbff && codePoint <= 0x0ffff)) {
	                    // Ordinary BMP code point, excluding leading surrogates.
	                    // BMP uses a single level lookup.  BMP index starts at offset 0 in the Trie2 index.
	                    // 16 bit data is stored in the index array itself.
	                    ix = this.index[codePoint >> UTRIE2_SHIFT_2];
	                    ix = (ix << UTRIE2_INDEX_SHIFT) + (codePoint & UTRIE2_DATA_MASK);
	                    return this.data[ix];
	                }
	                if (codePoint <= 0xffff) {
	                    // Lead Surrogate Code Point.  A Separate index section is stored for
	                    // lead surrogate code units and code points.
	                    //   The main index has the code unit data.
	                    //   For this function, we need the code point data.
	                    // Note: this expression could be refactored for slightly improved efficiency, but
	                    //       surrogate code points will be so rare in practice that it's not worth it.
	                    ix = this.index[UTRIE2_LSCP_INDEX_2_OFFSET + ((codePoint - 0xd800) >> UTRIE2_SHIFT_2)];
	                    ix = (ix << UTRIE2_INDEX_SHIFT) + (codePoint & UTRIE2_DATA_MASK);
	                    return this.data[ix];
	                }
	                if (codePoint < this.highStart) {
	                    // Supplemental code point, use two-level lookup.
	                    ix = UTRIE2_INDEX_1_OFFSET - UTRIE2_OMITTED_BMP_INDEX_1_LENGTH + (codePoint >> UTRIE2_SHIFT_1);
	                    ix = this.index[ix];
	                    ix += (codePoint >> UTRIE2_SHIFT_2) & UTRIE2_INDEX_2_MASK;
	                    ix = this.index[ix];
	                    ix = (ix << UTRIE2_INDEX_SHIFT) + (codePoint & UTRIE2_DATA_MASK);
	                    return this.data[ix];
	                }
	                if (codePoint <= 0x10ffff) {
	                    return this.data[this.highValueIndex];
	                }
	            }
	            // Fall through.  The code point is outside of the legal range of 0..0x10ffff.
	            return this.errorValue;
	        };
	        return Trie;
	    }());

	    /*
	     * base64-arraybuffer 1.0.2 <https://github.com/niklasvh/base64-arraybuffer>
	     * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
	     * Released under MIT License
	     */
	    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	    // Use a lookup table to find the index.
	    var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
	    for (var i = 0; i < chars.length; i++) {
	        lookup[chars.charCodeAt(i)] = i;
	    }

	    var Prepend = 1;
	    var CR = 2;
	    var LF = 3;
	    var Control = 4;
	    var Extend = 5;
	    var SpacingMark = 7;
	    var L = 8;
	    var V = 9;
	    var T = 10;
	    var LV = 11;
	    var LVT = 12;
	    var ZWJ = 13;
	    var Extended_Pictographic = 14;
	    var RI = 15;
	    var toCodePoints = function (str) {
	        var codePoints = [];
	        var i = 0;
	        var length = str.length;
	        while (i < length) {
	            var value = str.charCodeAt(i++);
	            if (value >= 0xd800 && value <= 0xdbff && i < length) {
	                var extra = str.charCodeAt(i++);
	                if ((extra & 0xfc00) === 0xdc00) {
	                    codePoints.push(((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000);
	                }
	                else {
	                    codePoints.push(value);
	                    i--;
	                }
	            }
	            else {
	                codePoints.push(value);
	            }
	        }
	        return codePoints;
	    };
	    var fromCodePoint = function () {
	        var codePoints = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            codePoints[_i] = arguments[_i];
	        }
	        if (String.fromCodePoint) {
	            return String.fromCodePoint.apply(String, codePoints);
	        }
	        var length = codePoints.length;
	        if (!length) {
	            return '';
	        }
	        var codeUnits = [];
	        var index = -1;
	        var result = '';
	        while (++index < length) {
	            var codePoint = codePoints[index];
	            if (codePoint <= 0xffff) {
	                codeUnits.push(codePoint);
	            }
	            else {
	                codePoint -= 0x10000;
	                codeUnits.push((codePoint >> 10) + 0xd800, (codePoint % 0x400) + 0xdc00);
	            }
	            if (index + 1 === length || codeUnits.length > 0x4000) {
	                result += String.fromCharCode.apply(String, codeUnits);
	                codeUnits.length = 0;
	            }
	        }
	        return result;
	    };
	    var UnicodeTrie = createTrieFromBase64(base64);
	    var BREAK_NOT_ALLOWED = '×';
	    var BREAK_ALLOWED = '÷';
	    var codePointToClass = function (codePoint) { return UnicodeTrie.get(codePoint); };
	    var _graphemeBreakAtIndex = function (_codePoints, classTypes, index) {
	        var prevIndex = index - 2;
	        var prev = classTypes[prevIndex];
	        var current = classTypes[index - 1];
	        var next = classTypes[index];
	        // GB3 Do not break between a CR and LF
	        if (current === CR && next === LF) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // GB4 Otherwise, break before and after controls.
	        if (current === CR || current === LF || current === Control) {
	            return BREAK_ALLOWED;
	        }
	        // GB5
	        if (next === CR || next === LF || next === Control) {
	            return BREAK_ALLOWED;
	        }
	        // Do not break Hangul syllable sequences.
	        // GB6
	        if (current === L && [L, V, LV, LVT].indexOf(next) !== -1) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // GB7
	        if ((current === LV || current === V) && (next === V || next === T)) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // GB8
	        if ((current === LVT || current === T) && next === T) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // GB9 Do not break before extending characters or ZWJ.
	        if (next === ZWJ || next === Extend) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // Do not break before SpacingMarks, or after Prepend characters.
	        // GB9a
	        if (next === SpacingMark) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // GB9a
	        if (current === Prepend) {
	            return BREAK_NOT_ALLOWED;
	        }
	        // GB11 Do not break within emoji modifier sequences or emoji zwj sequences.
	        if (current === ZWJ && next === Extended_Pictographic) {
	            while (prev === Extend) {
	                prev = classTypes[--prevIndex];
	            }
	            if (prev === Extended_Pictographic) {
	                return BREAK_NOT_ALLOWED;
	            }
	        }
	        // GB12 Do not break within emoji flag sequences.
	        // That is, do not break between regional indicator (RI) symbols
	        // if there is an odd number of RI characters before the break point.
	        if (current === RI && next === RI) {
	            var countRI = 0;
	            while (prev === RI) {
	                countRI++;
	                prev = classTypes[--prevIndex];
	            }
	            if (countRI % 2 === 0) {
	                return BREAK_NOT_ALLOWED;
	            }
	        }
	        return BREAK_ALLOWED;
	    };
	    var GraphemeBreaker = function (str) {
	        var codePoints = toCodePoints(str);
	        var length = codePoints.length;
	        var index = 0;
	        var lastEnd = 0;
	        var classTypes = codePoints.map(codePointToClass);
	        return {
	            next: function () {
	                if (index >= length) {
	                    return { done: true, value: null };
	                }
	                var graphemeBreak = BREAK_NOT_ALLOWED;
	                while (index < length &&
	                    (graphemeBreak = _graphemeBreakAtIndex(codePoints, classTypes, ++index)) === BREAK_NOT_ALLOWED) { }
	                if (graphemeBreak !== BREAK_NOT_ALLOWED || index === length) {
	                    var value = fromCodePoint.apply(null, codePoints.slice(lastEnd, index));
	                    lastEnd = index;
	                    return { value: value, done: false };
	                }
	                return { done: true, value: null };
	            },
	        };
	    };
	    var splitGraphemes = function (str) {
	        var breaker = GraphemeBreaker(str);
	        var graphemes = [];
	        var bk;
	        while (!(bk = breaker.next()).done) {
	            if (bk.value) {
	                graphemes.push(bk.value.slice());
	            }
	        }
	        return graphemes;
	    };

	    var testRangeBounds = function (document) {
	        var TEST_HEIGHT = 123;
	        if (document.createRange) {
	            var range = document.createRange();
	            if (range.getBoundingClientRect) {
	                var testElement = document.createElement('boundtest');
	                testElement.style.height = TEST_HEIGHT + "px";
	                testElement.style.display = 'block';
	                document.body.appendChild(testElement);
	                range.selectNode(testElement);
	                var rangeBounds = range.getBoundingClientRect();
	                var rangeHeight = Math.round(rangeBounds.height);
	                document.body.removeChild(testElement);
	                if (rangeHeight === TEST_HEIGHT) {
	                    return true;
	                }
	            }
	        }
	        return false;
	    };
	    var testIOSLineBreak = function (document) {
	        var testElement = document.createElement('boundtest');
	        testElement.style.width = '50px';
	        testElement.style.display = 'block';
	        testElement.style.fontSize = '12px';
	        testElement.style.letterSpacing = '0px';
	        testElement.style.wordSpacing = '0px';
	        document.body.appendChild(testElement);
	        var range = document.createRange();
	        testElement.innerHTML = typeof ''.repeat === 'function' ? '&#128104;'.repeat(10) : '';
	        var node = testElement.firstChild;
	        var textList = toCodePoints$1(node.data).map(function (i) { return fromCodePoint$1(i); });
	        var offset = 0;
	        var prev = {};
	        // ios 13 does not handle range getBoundingClientRect line changes correctly #2177
	        var supports = textList.every(function (text, i) {
	            range.setStart(node, offset);
	            range.setEnd(node, offset + text.length);
	            var rect = range.getBoundingClientRect();
	            offset += text.length;
	            var boundAhead = rect.x > prev.x || rect.y > prev.y;
	            prev = rect;
	            if (i === 0) {
	                return true;
	            }
	            return boundAhead;
	        });
	        document.body.removeChild(testElement);
	        return supports;
	    };
	    var testCORS = function () { return typeof new Image().crossOrigin !== 'undefined'; };
	    var testResponseType = function () { return typeof new XMLHttpRequest().responseType === 'string'; };
	    var testSVG = function (document) {
	        var img = new Image();
	        var canvas = document.createElement('canvas');
	        var ctx = canvas.getContext('2d');
	        if (!ctx) {
	            return false;
	        }
	        img.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";
	        try {
	            ctx.drawImage(img, 0, 0);
	            canvas.toDataURL();
	        }
	        catch (e) {
	            return false;
	        }
	        return true;
	    };
	    var isGreenPixel = function (data) {
	        return data[0] === 0 && data[1] === 255 && data[2] === 0 && data[3] === 255;
	    };
	    var testForeignObject = function (document) {
	        var canvas = document.createElement('canvas');
	        var size = 100;
	        canvas.width = size;
	        canvas.height = size;
	        var ctx = canvas.getContext('2d');
	        if (!ctx) {
	            return Promise.reject(false);
	        }
	        ctx.fillStyle = 'rgb(0, 255, 0)';
	        ctx.fillRect(0, 0, size, size);
	        var img = new Image();
	        var greenImageSrc = canvas.toDataURL();
	        img.src = greenImageSrc;
	        var svg = createForeignObjectSVG(size, size, 0, 0, img);
	        ctx.fillStyle = 'red';
	        ctx.fillRect(0, 0, size, size);
	        return loadSerializedSVG$1(svg)
	            .then(function (img) {
	            ctx.drawImage(img, 0, 0);
	            var data = ctx.getImageData(0, 0, size, size).data;
	            ctx.fillStyle = 'red';
	            ctx.fillRect(0, 0, size, size);
	            var node = document.createElement('div');
	            node.style.backgroundImage = "url(" + greenImageSrc + ")";
	            node.style.height = size + "px";
	            // Firefox 55 does not render inline <img /> tags
	            return isGreenPixel(data)
	                ? loadSerializedSVG$1(createForeignObjectSVG(size, size, 0, 0, node))
	                : Promise.reject(false);
	        })
	            .then(function (img) {
	            ctx.drawImage(img, 0, 0);
	            // Edge does not render background-images
	            return isGreenPixel(ctx.getImageData(0, 0, size, size).data);
	        })
	            .catch(function () { return false; });
	    };
	    var createForeignObjectSVG = function (width, height, x, y, node) {
	        var xmlns = 'http://www.w3.org/2000/svg';
	        var svg = document.createElementNS(xmlns, 'svg');
	        var foreignObject = document.createElementNS(xmlns, 'foreignObject');
	        svg.setAttributeNS(null, 'width', width.toString());
	        svg.setAttributeNS(null, 'height', height.toString());
	        foreignObject.setAttributeNS(null, 'width', '100%');
	        foreignObject.setAttributeNS(null, 'height', '100%');
	        foreignObject.setAttributeNS(null, 'x', x.toString());
	        foreignObject.setAttributeNS(null, 'y', y.toString());
	        foreignObject.setAttributeNS(null, 'externalResourcesRequired', 'true');
	        svg.appendChild(foreignObject);
	        foreignObject.appendChild(node);
	        return svg;
	    };
	    var loadSerializedSVG$1 = function (svg) {
	        return new Promise(function (resolve, reject) {
	            var img = new Image();
	            img.onload = function () { return resolve(img); };
	            img.onerror = reject;
	            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
	        });
	    };
	    var FEATURES = {
	        get SUPPORT_RANGE_BOUNDS() {
	            var value = testRangeBounds(document);
	            Object.defineProperty(FEATURES, 'SUPPORT_RANGE_BOUNDS', { value: value });
	            return value;
	        },
	        get SUPPORT_WORD_BREAKING() {
	            var value = FEATURES.SUPPORT_RANGE_BOUNDS && testIOSLineBreak(document);
	            Object.defineProperty(FEATURES, 'SUPPORT_WORD_BREAKING', { value: value });
	            return value;
	        },
	        get SUPPORT_SVG_DRAWING() {
	            var value = testSVG(document);
	            Object.defineProperty(FEATURES, 'SUPPORT_SVG_DRAWING', { value: value });
	            return value;
	        },
	        get SUPPORT_FOREIGNOBJECT_DRAWING() {
	            var value = typeof Array.from === 'function' && typeof window.fetch === 'function'
	                ? testForeignObject(document)
	                : Promise.resolve(false);
	            Object.defineProperty(FEATURES, 'SUPPORT_FOREIGNOBJECT_DRAWING', { value: value });
	            return value;
	        },
	        get SUPPORT_CORS_IMAGES() {
	            var value = testCORS();
	            Object.defineProperty(FEATURES, 'SUPPORT_CORS_IMAGES', { value: value });
	            return value;
	        },
	        get SUPPORT_RESPONSE_TYPE() {
	            var value = testResponseType();
	            Object.defineProperty(FEATURES, 'SUPPORT_RESPONSE_TYPE', { value: value });
	            return value;
	        },
	        get SUPPORT_CORS_XHR() {
	            var value = 'withCredentials' in new XMLHttpRequest();
	            Object.defineProperty(FEATURES, 'SUPPORT_CORS_XHR', { value: value });
	            return value;
	        },
	        get SUPPORT_NATIVE_TEXT_SEGMENTATION() {
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            var value = !!(typeof Intl !== 'undefined' && Intl.Segmenter);
	            Object.defineProperty(FEATURES, 'SUPPORT_NATIVE_TEXT_SEGMENTATION', { value: value });
	            return value;
	        }
	    };

	    var TextBounds = /** @class */ (function () {
	        function TextBounds(text, bounds) {
	            this.text = text;
	            this.bounds = bounds;
	        }
	        return TextBounds;
	    }());
	    var parseTextBounds = function (context, value, styles, node) {
	        var textList = breakText(value, styles);
	        var textBounds = [];
	        var offset = 0;
	        textList.forEach(function (text) {
	            if (styles.textDecorationLine.length || text.trim().length > 0) {
	                if (FEATURES.SUPPORT_RANGE_BOUNDS) {
	                    var clientRects = createRange(node, offset, text.length).getClientRects();
	                    if (clientRects.length > 1) {
	                        var subSegments = segmentGraphemes(text);
	                        var subOffset_1 = 0;
	                        subSegments.forEach(function (subSegment) {
	                            textBounds.push(new TextBounds(subSegment, Bounds.fromDOMRectList(context, createRange(node, subOffset_1 + offset, subSegment.length).getClientRects())));
	                            subOffset_1 += subSegment.length;
	                        });
	                    }
	                    else {
	                        textBounds.push(new TextBounds(text, Bounds.fromDOMRectList(context, clientRects)));
	                    }
	                }
	                else {
	                    var replacementNode = node.splitText(text.length);
	                    textBounds.push(new TextBounds(text, getWrapperBounds(context, node)));
	                    node = replacementNode;
	                }
	            }
	            else if (!FEATURES.SUPPORT_RANGE_BOUNDS) {
	                node = node.splitText(text.length);
	            }
	            offset += text.length;
	        });
	        return textBounds;
	    };
	    var getWrapperBounds = function (context, node) {
	        var ownerDocument = node.ownerDocument;
	        if (ownerDocument) {
	            var wrapper = ownerDocument.createElement('html2canvaswrapper');
	            wrapper.appendChild(node.cloneNode(true));
	            var parentNode = node.parentNode;
	            if (parentNode) {
	                parentNode.replaceChild(wrapper, node);
	                var bounds = parseBounds(context, wrapper);
	                if (wrapper.firstChild) {
	                    parentNode.replaceChild(wrapper.firstChild, wrapper);
	                }
	                return bounds;
	            }
	        }
	        return Bounds.EMPTY;
	    };
	    var createRange = function (node, offset, length) {
	        var ownerDocument = node.ownerDocument;
	        if (!ownerDocument) {
	            throw new Error('Node has no owner document');
	        }
	        var range = ownerDocument.createRange();
	        range.setStart(node, offset);
	        range.setEnd(node, offset + length);
	        return range;
	    };
	    var segmentGraphemes = function (value) {
	        if (FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION) {
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            var segmenter = new Intl.Segmenter(void 0, { granularity: 'grapheme' });
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            return Array.from(segmenter.segment(value)).map(function (segment) { return segment.segment; });
	        }
	        return splitGraphemes(value);
	    };
	    var segmentWords = function (value, styles) {
	        if (FEATURES.SUPPORT_NATIVE_TEXT_SEGMENTATION) {
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            var segmenter = new Intl.Segmenter(void 0, {
	                granularity: 'word'
	            });
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            return Array.from(segmenter.segment(value)).map(function (segment) { return segment.segment; });
	        }
	        return breakWords(value, styles);
	    };
	    var breakText = function (value, styles) {
	        return styles.letterSpacing !== 0 ? segmentGraphemes(value) : segmentWords(value, styles);
	    };
	    // https://drafts.csswg.org/css-text/#word-separator
	    var wordSeparators = [0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091];
	    var breakWords = function (str, styles) {
	        var breaker = LineBreaker(str, {
	            lineBreak: styles.lineBreak,
	            wordBreak: styles.overflowWrap === "break-word" /* BREAK_WORD */ ? 'break-word' : styles.wordBreak
	        });
	        var words = [];
	        var bk;
	        var _loop_1 = function () {
	            if (bk.value) {
	                var value = bk.value.slice();
	                var codePoints = toCodePoints$1(value);
	                var word_1 = '';
	                codePoints.forEach(function (codePoint) {
	                    if (wordSeparators.indexOf(codePoint) === -1) {
	                        word_1 += fromCodePoint$1(codePoint);
	                    }
	                    else {
	                        if (word_1.length) {
	                            words.push(word_1);
	                        }
	                        words.push(fromCodePoint$1(codePoint));
	                        word_1 = '';
	                    }
	                });
	                if (word_1.length) {
	                    words.push(word_1);
	                }
	            }
	        };
	        while (!(bk = breaker.next()).done) {
	            _loop_1();
	        }
	        return words;
	    };

	    var TextContainer = /** @class */ (function () {
	        function TextContainer(context, node, styles) {
	            this.text = transform(node.data, styles.textTransform);
	            this.textBounds = parseTextBounds(context, this.text, styles, node);
	        }
	        return TextContainer;
	    }());
	    var transform = function (text, transform) {
	        switch (transform) {
	            case 1 /* LOWERCASE */:
	                return text.toLowerCase();
	            case 3 /* CAPITALIZE */:
	                return text.replace(CAPITALIZE, capitalize);
	            case 2 /* UPPERCASE */:
	                return text.toUpperCase();
	            default:
	                return text;
	        }
	    };
	    var CAPITALIZE = /(^|\s|:|-|\(|\))([a-z])/g;
	    var capitalize = function (m, p1, p2) {
	        if (m.length > 0) {
	            return p1 + p2.toUpperCase();
	        }
	        return m;
	    };

	    var ImageElementContainer = /** @class */ (function (_super) {
	        __extends(ImageElementContainer, _super);
	        function ImageElementContainer(context, img) {
	            var _this = _super.call(this, context, img) || this;
	            _this.src = img.currentSrc || img.src;
	            _this.intrinsicWidth = img.naturalWidth;
	            _this.intrinsicHeight = img.naturalHeight;
	            _this.context.cache.addImage(_this.src);
	            return _this;
	        }
	        return ImageElementContainer;
	    }(ElementContainer));

	    var CanvasElementContainer = /** @class */ (function (_super) {
	        __extends(CanvasElementContainer, _super);
	        function CanvasElementContainer(context, canvas) {
	            var _this = _super.call(this, context, canvas) || this;
	            _this.canvas = canvas;
	            _this.intrinsicWidth = canvas.width;
	            _this.intrinsicHeight = canvas.height;
	            return _this;
	        }
	        return CanvasElementContainer;
	    }(ElementContainer));

	    var SVGElementContainer = /** @class */ (function (_super) {
	        __extends(SVGElementContainer, _super);
	        function SVGElementContainer(context, img) {
	            var _this = _super.call(this, context, img) || this;
	            var s = new XMLSerializer();
	            var bounds = parseBounds(context, img);
	            img.setAttribute('width', bounds.width + "px");
	            img.setAttribute('height', bounds.height + "px");
	            _this.svg = "data:image/svg+xml," + encodeURIComponent(s.serializeToString(img));
	            _this.intrinsicWidth = img.width.baseVal.value;
	            _this.intrinsicHeight = img.height.baseVal.value;
	            _this.context.cache.addImage(_this.svg);
	            return _this;
	        }
	        return SVGElementContainer;
	    }(ElementContainer));

	    var LIElementContainer = /** @class */ (function (_super) {
	        __extends(LIElementContainer, _super);
	        function LIElementContainer(context, element) {
	            var _this = _super.call(this, context, element) || this;
	            _this.value = element.value;
	            return _this;
	        }
	        return LIElementContainer;
	    }(ElementContainer));

	    var OLElementContainer = /** @class */ (function (_super) {
	        __extends(OLElementContainer, _super);
	        function OLElementContainer(context, element) {
	            var _this = _super.call(this, context, element) || this;
	            _this.start = element.start;
	            _this.reversed = typeof element.reversed === 'boolean' && element.reversed === true;
	            return _this;
	        }
	        return OLElementContainer;
	    }(ElementContainer));

	    var CHECKBOX_BORDER_RADIUS = [
	        {
	            type: 15 /* DIMENSION_TOKEN */,
	            flags: 0,
	            unit: 'px',
	            number: 3
	        }
	    ];
	    var RADIO_BORDER_RADIUS = [
	        {
	            type: 16 /* PERCENTAGE_TOKEN */,
	            flags: 0,
	            number: 50
	        }
	    ];
	    var reformatInputBounds = function (bounds) {
	        if (bounds.width > bounds.height) {
	            return new Bounds(bounds.left + (bounds.width - bounds.height) / 2, bounds.top, bounds.height, bounds.height);
	        }
	        else if (bounds.width < bounds.height) {
	            return new Bounds(bounds.left, bounds.top + (bounds.height - bounds.width) / 2, bounds.width, bounds.width);
	        }
	        return bounds;
	    };
	    var getInputValue = function (node) {
	        var value = node.type === PASSWORD ? new Array(node.value.length + 1).join('\u2022') : node.value;
	        return value.length === 0 ? node.placeholder || '' : value;
	    };
	    var CHECKBOX = 'checkbox';
	    var RADIO = 'radio';
	    var PASSWORD = 'password';
	    var INPUT_COLOR = 0x2a2a2aff;
	    var InputElementContainer = /** @class */ (function (_super) {
	        __extends(InputElementContainer, _super);
	        function InputElementContainer(context, input) {
	            var _this = _super.call(this, context, input) || this;
	            _this.type = input.type.toLowerCase();
	            _this.checked = input.checked;
	            _this.value = getInputValue(input);
	            if (_this.type === CHECKBOX || _this.type === RADIO) {
	                _this.styles.backgroundColor = 0xdededeff;
	                _this.styles.borderTopColor =
	                    _this.styles.borderRightColor =
	                        _this.styles.borderBottomColor =
	                            _this.styles.borderLeftColor =
	                                0xa5a5a5ff;
	                _this.styles.borderTopWidth =
	                    _this.styles.borderRightWidth =
	                        _this.styles.borderBottomWidth =
	                            _this.styles.borderLeftWidth =
	                                1;
	                _this.styles.borderTopStyle =
	                    _this.styles.borderRightStyle =
	                        _this.styles.borderBottomStyle =
	                            _this.styles.borderLeftStyle =
	                                1 /* SOLID */;
	                _this.styles.backgroundClip = [0 /* BORDER_BOX */];
	                _this.styles.backgroundOrigin = [0 /* BORDER_BOX */];
	                _this.bounds = reformatInputBounds(_this.bounds);
	            }
	            switch (_this.type) {
	                case CHECKBOX:
	                    _this.styles.borderTopRightRadius =
	                        _this.styles.borderTopLeftRadius =
	                            _this.styles.borderBottomRightRadius =
	                                _this.styles.borderBottomLeftRadius =
	                                    CHECKBOX_BORDER_RADIUS;
	                    break;
	                case RADIO:
	                    _this.styles.borderTopRightRadius =
	                        _this.styles.borderTopLeftRadius =
	                            _this.styles.borderBottomRightRadius =
	                                _this.styles.borderBottomLeftRadius =
	                                    RADIO_BORDER_RADIUS;
	                    break;
	            }
	            return _this;
	        }
	        return InputElementContainer;
	    }(ElementContainer));

	    var SelectElementContainer = /** @class */ (function (_super) {
	        __extends(SelectElementContainer, _super);
	        function SelectElementContainer(context, element) {
	            var _this = _super.call(this, context, element) || this;
	            var option = element.options[element.selectedIndex || 0];
	            _this.value = option ? option.text || '' : '';
	            return _this;
	        }
	        return SelectElementContainer;
	    }(ElementContainer));

	    var TextareaElementContainer = /** @class */ (function (_super) {
	        __extends(TextareaElementContainer, _super);
	        function TextareaElementContainer(context, element) {
	            var _this = _super.call(this, context, element) || this;
	            _this.value = element.value;
	            return _this;
	        }
	        return TextareaElementContainer;
	    }(ElementContainer));

	    var IFrameElementContainer = /** @class */ (function (_super) {
	        __extends(IFrameElementContainer, _super);
	        function IFrameElementContainer(context, iframe) {
	            var _this = _super.call(this, context, iframe) || this;
	            _this.src = iframe.src;
	            _this.width = parseInt(iframe.width, 10) || 0;
	            _this.height = parseInt(iframe.height, 10) || 0;
	            _this.backgroundColor = _this.styles.backgroundColor;
	            try {
	                if (iframe.contentWindow &&
	                    iframe.contentWindow.document &&
	                    iframe.contentWindow.document.documentElement) {
	                    _this.tree = parseTree(context, iframe.contentWindow.document.documentElement);
	                    // http://www.w3.org/TR/css3-background/#special-backgrounds
	                    var documentBackgroundColor = iframe.contentWindow.document.documentElement
	                        ? parseColor(context, getComputedStyle(iframe.contentWindow.document.documentElement).backgroundColor)
	                        : COLORS.TRANSPARENT;
	                    var bodyBackgroundColor = iframe.contentWindow.document.body
	                        ? parseColor(context, getComputedStyle(iframe.contentWindow.document.body).backgroundColor)
	                        : COLORS.TRANSPARENT;
	                    _this.backgroundColor = isTransparent(documentBackgroundColor)
	                        ? isTransparent(bodyBackgroundColor)
	                            ? _this.styles.backgroundColor
	                            : bodyBackgroundColor
	                        : documentBackgroundColor;
	                }
	            }
	            catch (e) { }
	            return _this;
	        }
	        return IFrameElementContainer;
	    }(ElementContainer));

	    var LIST_OWNERS = ['OL', 'UL', 'MENU'];
	    var parseNodeTree = function (context, node, parent, root) {
	        for (var childNode = node.firstChild, nextNode = void 0; childNode; childNode = nextNode) {
	            nextNode = childNode.nextSibling;
	            if (isTextNode(childNode) && childNode.data.trim().length > 0) {
	                parent.textNodes.push(new TextContainer(context, childNode, parent.styles));
	            }
	            else if (isElementNode(childNode)) {
	                if (isSlotElement(childNode) && childNode.assignedNodes) {
	                    childNode.assignedNodes().forEach(function (childNode) { return parseNodeTree(context, childNode, parent, root); });
	                }
	                else {
	                    var container = createContainer(context, childNode);
	                    if (container.styles.isVisible()) {
	                        if (createsRealStackingContext(childNode, container, root)) {
	                            container.flags |= 4 /* CREATES_REAL_STACKING_CONTEXT */;
	                        }
	                        else if (createsStackingContext(container.styles)) {
	                            container.flags |= 2 /* CREATES_STACKING_CONTEXT */;
	                        }
	                        if (LIST_OWNERS.indexOf(childNode.tagName) !== -1) {
	                            container.flags |= 8 /* IS_LIST_OWNER */;
	                        }
	                        parent.elements.push(container);
	                        childNode.slot;
	                        if (childNode.shadowRoot) {
	                            parseNodeTree(context, childNode.shadowRoot, container, root);
	                        }
	                        else if (!isTextareaElement(childNode) &&
	                            !isSVGElement(childNode) &&
	                            !isSelectElement(childNode)) {
	                            parseNodeTree(context, childNode, container, root);
	                        }
	                    }
	                }
	            }
	        }
	    };
	    var createContainer = function (context, element) {
	        if (isImageElement(element)) {
	            return new ImageElementContainer(context, element);
	        }
	        if (isCanvasElement(element)) {
	            return new CanvasElementContainer(context, element);
	        }
	        if (isSVGElement(element)) {
	            return new SVGElementContainer(context, element);
	        }
	        if (isLIElement(element)) {
	            return new LIElementContainer(context, element);
	        }
	        if (isOLElement(element)) {
	            return new OLElementContainer(context, element);
	        }
	        if (isInputElement(element)) {
	            return new InputElementContainer(context, element);
	        }
	        if (isSelectElement(element)) {
	            return new SelectElementContainer(context, element);
	        }
	        if (isTextareaElement(element)) {
	            return new TextareaElementContainer(context, element);
	        }
	        if (isIFrameElement(element)) {
	            return new IFrameElementContainer(context, element);
	        }
	        return new ElementContainer(context, element);
	    };
	    var parseTree = function (context, element) {
	        var container = createContainer(context, element);
	        container.flags |= 4 /* CREATES_REAL_STACKING_CONTEXT */;
	        parseNodeTree(context, element, container, container);
	        return container;
	    };
	    var createsRealStackingContext = function (node, container, root) {
	        return (container.styles.isPositionedWithZIndex() ||
	            container.styles.opacity < 1 ||
	            container.styles.isTransformed() ||
	            (isBodyElement(node) && root.styles.isTransparent()));
	    };
	    var createsStackingContext = function (styles) { return styles.isPositioned() || styles.isFloating(); };
	    var isTextNode = function (node) { return node.nodeType === Node.TEXT_NODE; };
	    var isElementNode = function (node) { return node.nodeType === Node.ELEMENT_NODE; };
	    var isHTMLElementNode = function (node) {
	        return isElementNode(node) && typeof node.style !== 'undefined' && !isSVGElementNode(node);
	    };
	    var isSVGElementNode = function (element) {
	        return typeof element.className === 'object';
	    };
	    var isLIElement = function (node) { return node.tagName === 'LI'; };
	    var isOLElement = function (node) { return node.tagName === 'OL'; };
	    var isInputElement = function (node) { return node.tagName === 'INPUT'; };
	    var isHTMLElement = function (node) { return node.tagName === 'HTML'; };
	    var isSVGElement = function (node) { return node.tagName === 'svg'; };
	    var isBodyElement = function (node) { return node.tagName === 'BODY'; };
	    var isCanvasElement = function (node) { return node.tagName === 'CANVAS'; };
	    var isVideoElement = function (node) { return node.tagName === 'VIDEO'; };
	    var isImageElement = function (node) { return node.tagName === 'IMG'; };
	    var isIFrameElement = function (node) { return node.tagName === 'IFRAME'; };
	    var isStyleElement = function (node) { return node.tagName === 'STYLE'; };
	    var isScriptElement = function (node) { return node.tagName === 'SCRIPT'; };
	    var isTextareaElement = function (node) { return node.tagName === 'TEXTAREA'; };
	    var isSelectElement = function (node) { return node.tagName === 'SELECT'; };
	    var isSlotElement = function (node) { return node.tagName === 'SLOT'; };
	    // https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
	    var isCustomElement = function (node) { return node.tagName.indexOf('-') > 0; };

	    var CounterState = /** @class */ (function () {
	        function CounterState() {
	            this.counters = {};
	        }
	        CounterState.prototype.getCounterValue = function (name) {
	            var counter = this.counters[name];
	            if (counter && counter.length) {
	                return counter[counter.length - 1];
	            }
	            return 1;
	        };
	        CounterState.prototype.getCounterValues = function (name) {
	            var counter = this.counters[name];
	            return counter ? counter : [];
	        };
	        CounterState.prototype.pop = function (counters) {
	            var _this = this;
	            counters.forEach(function (counter) { return _this.counters[counter].pop(); });
	        };
	        CounterState.prototype.parse = function (style) {
	            var _this = this;
	            var counterIncrement = style.counterIncrement;
	            var counterReset = style.counterReset;
	            var canReset = true;
	            if (counterIncrement !== null) {
	                counterIncrement.forEach(function (entry) {
	                    var counter = _this.counters[entry.counter];
	                    if (counter && entry.increment !== 0) {
	                        canReset = false;
	                        if (!counter.length) {
	                            counter.push(1);
	                        }
	                        counter[Math.max(0, counter.length - 1)] += entry.increment;
	                    }
	                });
	            }
	            var counterNames = [];
	            if (canReset) {
	                counterReset.forEach(function (entry) {
	                    var counter = _this.counters[entry.counter];
	                    counterNames.push(entry.counter);
	                    if (!counter) {
	                        counter = _this.counters[entry.counter] = [];
	                    }
	                    counter.push(entry.reset);
	                });
	            }
	            return counterNames;
	        };
	        return CounterState;
	    }());
	    var ROMAN_UPPER = {
	        integers: [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1],
	        values: ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
	    };
	    var ARMENIAN = {
	        integers: [
	            9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 90, 80, 70,
	            60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
	        ],
	        values: [
	            'Ք',
	            'Փ',
	            'Ւ',
	            'Ց',
	            'Ր',
	            'Տ',
	            'Վ',
	            'Ս',
	            'Ռ',
	            'Ջ',
	            'Պ',
	            'Չ',
	            'Ո',
	            'Շ',
	            'Ն',
	            'Յ',
	            'Մ',
	            'Ճ',
	            'Ղ',
	            'Ձ',
	            'Հ',
	            'Կ',
	            'Ծ',
	            'Խ',
	            'Լ',
	            'Ի',
	            'Ժ',
	            'Թ',
	            'Ը',
	            'Է',
	            'Զ',
	            'Ե',
	            'Դ',
	            'Գ',
	            'Բ',
	            'Ա'
	        ]
	    };
	    var HEBREW = {
	        integers: [
	            10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 20,
	            19, 18, 17, 16, 15, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
	        ],
	        values: [
	            'י׳',
	            'ט׳',
	            'ח׳',
	            'ז׳',
	            'ו׳',
	            'ה׳',
	            'ד׳',
	            'ג׳',
	            'ב׳',
	            'א׳',
	            'ת',
	            'ש',
	            'ר',
	            'ק',
	            'צ',
	            'פ',
	            'ע',
	            'ס',
	            'נ',
	            'מ',
	            'ל',
	            'כ',
	            'יט',
	            'יח',
	            'יז',
	            'טז',
	            'טו',
	            'י',
	            'ט',
	            'ח',
	            'ז',
	            'ו',
	            'ה',
	            'ד',
	            'ג',
	            'ב',
	            'א'
	        ]
	    };
	    var GEORGIAN = {
	        integers: [
	            10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 90,
	            80, 70, 60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
	        ],
	        values: [
	            'ჵ',
	            'ჰ',
	            'ჯ',
	            'ჴ',
	            'ხ',
	            'ჭ',
	            'წ',
	            'ძ',
	            'ც',
	            'ჩ',
	            'შ',
	            'ყ',
	            'ღ',
	            'ქ',
	            'ფ',
	            'ჳ',
	            'ტ',
	            'ს',
	            'რ',
	            'ჟ',
	            'პ',
	            'ო',
	            'ჲ',
	            'ნ',
	            'მ',
	            'ლ',
	            'კ',
	            'ი',
	            'თ',
	            'ჱ',
	            'ზ',
	            'ვ',
	            'ე',
	            'დ',
	            'გ',
	            'ბ',
	            'ა'
	        ]
	    };
	    var createAdditiveCounter = function (value, min, max, symbols, fallback, suffix) {
	        if (value < min || value > max) {
	            return createCounterText(value, fallback, suffix.length > 0);
	        }
	        return (symbols.integers.reduce(function (string, integer, index) {
	            while (value >= integer) {
	                value -= integer;
	                string += symbols.values[index];
	            }
	            return string;
	        }, '') + suffix);
	    };
	    var createCounterStyleWithSymbolResolver = function (value, codePointRangeLength, isNumeric, resolver) {
	        var string = '';
	        do {
	            if (!isNumeric) {
	                value--;
	            }
	            string = resolver(value) + string;
	            value /= codePointRangeLength;
	        } while (value * codePointRangeLength >= codePointRangeLength);
	        return string;
	    };
	    var createCounterStyleFromRange = function (value, codePointRangeStart, codePointRangeEnd, isNumeric, suffix) {
	        var codePointRangeLength = codePointRangeEnd - codePointRangeStart + 1;
	        return ((value < 0 ? '-' : '') +
	            (createCounterStyleWithSymbolResolver(Math.abs(value), codePointRangeLength, isNumeric, function (codePoint) {
	                return fromCodePoint$1(Math.floor(codePoint % codePointRangeLength) + codePointRangeStart);
	            }) +
	                suffix));
	    };
	    var createCounterStyleFromSymbols = function (value, symbols, suffix) {
	        if (suffix === void 0) { suffix = '. '; }
	        var codePointRangeLength = symbols.length;
	        return (createCounterStyleWithSymbolResolver(Math.abs(value), codePointRangeLength, false, function (codePoint) { return symbols[Math.floor(codePoint % codePointRangeLength)]; }) + suffix);
	    };
	    var CJK_ZEROS = 1 << 0;
	    var CJK_TEN_COEFFICIENTS = 1 << 1;
	    var CJK_TEN_HIGH_COEFFICIENTS = 1 << 2;
	    var CJK_HUNDRED_COEFFICIENTS = 1 << 3;
	    var createCJKCounter = function (value, numbers, multipliers, negativeSign, suffix, flags) {
	        if (value < -9999 || value > 9999) {
	            return createCounterText(value, 4 /* CJK_DECIMAL */, suffix.length > 0);
	        }
	        var tmp = Math.abs(value);
	        var string = suffix;
	        if (tmp === 0) {
	            return numbers[0] + string;
	        }
	        for (var digit = 0; tmp > 0 && digit <= 4; digit++) {
	            var coefficient = tmp % 10;
	            if (coefficient === 0 && contains(flags, CJK_ZEROS) && string !== '') {
	                string = numbers[coefficient] + string;
	            }
	            else if (coefficient > 1 ||
	                (coefficient === 1 && digit === 0) ||
	                (coefficient === 1 && digit === 1 && contains(flags, CJK_TEN_COEFFICIENTS)) ||
	                (coefficient === 1 && digit === 1 && contains(flags, CJK_TEN_HIGH_COEFFICIENTS) && value > 100) ||
	                (coefficient === 1 && digit > 1 && contains(flags, CJK_HUNDRED_COEFFICIENTS))) {
	                string = numbers[coefficient] + (digit > 0 ? multipliers[digit - 1] : '') + string;
	            }
	            else if (coefficient === 1 && digit > 0) {
	                string = multipliers[digit - 1] + string;
	            }
	            tmp = Math.floor(tmp / 10);
	        }
	        return (value < 0 ? negativeSign : '') + string;
	    };
	    var CHINESE_INFORMAL_MULTIPLIERS = '十百千萬';
	    var CHINESE_FORMAL_MULTIPLIERS = '拾佰仟萬';
	    var JAPANESE_NEGATIVE = 'マイナス';
	    var KOREAN_NEGATIVE = '마이너스';
	    var createCounterText = function (value, type, appendSuffix) {
	        var defaultSuffix = appendSuffix ? '. ' : '';
	        var cjkSuffix = appendSuffix ? '、' : '';
	        var koreanSuffix = appendSuffix ? ', ' : '';
	        var spaceSuffix = appendSuffix ? ' ' : '';
	        switch (type) {
	            case 0 /* DISC */:
	                return '•' + spaceSuffix;
	            case 1 /* CIRCLE */:
	                return '◦' + spaceSuffix;
	            case 2 /* SQUARE */:
	                return '◾' + spaceSuffix;
	            case 5 /* DECIMAL_LEADING_ZERO */:
	                var string = createCounterStyleFromRange(value, 48, 57, true, defaultSuffix);
	                return string.length < 4 ? "0" + string : string;
	            case 4 /* CJK_DECIMAL */:
	                return createCounterStyleFromSymbols(value, '〇一二三四五六七八九', cjkSuffix);
	            case 6 /* LOWER_ROMAN */:
	                return createAdditiveCounter(value, 1, 3999, ROMAN_UPPER, 3 /* DECIMAL */, defaultSuffix).toLowerCase();
	            case 7 /* UPPER_ROMAN */:
	                return createAdditiveCounter(value, 1, 3999, ROMAN_UPPER, 3 /* DECIMAL */, defaultSuffix);
	            case 8 /* LOWER_GREEK */:
	                return createCounterStyleFromRange(value, 945, 969, false, defaultSuffix);
	            case 9 /* LOWER_ALPHA */:
	                return createCounterStyleFromRange(value, 97, 122, false, defaultSuffix);
	            case 10 /* UPPER_ALPHA */:
	                return createCounterStyleFromRange(value, 65, 90, false, defaultSuffix);
	            case 11 /* ARABIC_INDIC */:
	                return createCounterStyleFromRange(value, 1632, 1641, true, defaultSuffix);
	            case 12 /* ARMENIAN */:
	            case 49 /* UPPER_ARMENIAN */:
	                return createAdditiveCounter(value, 1, 9999, ARMENIAN, 3 /* DECIMAL */, defaultSuffix);
	            case 35 /* LOWER_ARMENIAN */:
	                return createAdditiveCounter(value, 1, 9999, ARMENIAN, 3 /* DECIMAL */, defaultSuffix).toLowerCase();
	            case 13 /* BENGALI */:
	                return createCounterStyleFromRange(value, 2534, 2543, true, defaultSuffix);
	            case 14 /* CAMBODIAN */:
	            case 30 /* KHMER */:
	                return createCounterStyleFromRange(value, 6112, 6121, true, defaultSuffix);
	            case 15 /* CJK_EARTHLY_BRANCH */:
	                return createCounterStyleFromSymbols(value, '子丑寅卯辰巳午未申酉戌亥', cjkSuffix);
	            case 16 /* CJK_HEAVENLY_STEM */:
	                return createCounterStyleFromSymbols(value, '甲乙丙丁戊己庚辛壬癸', cjkSuffix);
	            case 17 /* CJK_IDEOGRAPHIC */:
	            case 48 /* TRAD_CHINESE_INFORMAL */:
	                return createCJKCounter(value, '零一二三四五六七八九', CHINESE_INFORMAL_MULTIPLIERS, '負', cjkSuffix, CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS | CJK_HUNDRED_COEFFICIENTS);
	            case 47 /* TRAD_CHINESE_FORMAL */:
	                return createCJKCounter(value, '零壹貳參肆伍陸柒捌玖', CHINESE_FORMAL_MULTIPLIERS, '負', cjkSuffix, CJK_ZEROS | CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS | CJK_HUNDRED_COEFFICIENTS);
	            case 42 /* SIMP_CHINESE_INFORMAL */:
	                return createCJKCounter(value, '零一二三四五六七八九', CHINESE_INFORMAL_MULTIPLIERS, '负', cjkSuffix, CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS | CJK_HUNDRED_COEFFICIENTS);
	            case 41 /* SIMP_CHINESE_FORMAL */:
	                return createCJKCounter(value, '零壹贰叁肆伍陆柒捌玖', CHINESE_FORMAL_MULTIPLIERS, '负', cjkSuffix, CJK_ZEROS | CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS | CJK_HUNDRED_COEFFICIENTS);
	            case 26 /* JAPANESE_INFORMAL */:
	                return createCJKCounter(value, '〇一二三四五六七八九', '十百千万', JAPANESE_NEGATIVE, cjkSuffix, 0);
	            case 25 /* JAPANESE_FORMAL */:
	                return createCJKCounter(value, '零壱弐参四伍六七八九', '拾百千万', JAPANESE_NEGATIVE, cjkSuffix, CJK_ZEROS | CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS);
	            case 31 /* KOREAN_HANGUL_FORMAL */:
	                return createCJKCounter(value, '영일이삼사오육칠팔구', '십백천만', KOREAN_NEGATIVE, koreanSuffix, CJK_ZEROS | CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS);
	            case 33 /* KOREAN_HANJA_INFORMAL */:
	                return createCJKCounter(value, '零一二三四五六七八九', '十百千萬', KOREAN_NEGATIVE, koreanSuffix, 0);
	            case 32 /* KOREAN_HANJA_FORMAL */:
	                return createCJKCounter(value, '零壹貳參四五六七八九', '拾百千', KOREAN_NEGATIVE, koreanSuffix, CJK_ZEROS | CJK_TEN_COEFFICIENTS | CJK_TEN_HIGH_COEFFICIENTS);
	            case 18 /* DEVANAGARI */:
	                return createCounterStyleFromRange(value, 0x966, 0x96f, true, defaultSuffix);
	            case 20 /* GEORGIAN */:
	                return createAdditiveCounter(value, 1, 19999, GEORGIAN, 3 /* DECIMAL */, defaultSuffix);
	            case 21 /* GUJARATI */:
	                return createCounterStyleFromRange(value, 0xae6, 0xaef, true, defaultSuffix);
	            case 22 /* GURMUKHI */:
	                return createCounterStyleFromRange(value, 0xa66, 0xa6f, true, defaultSuffix);
	            case 22 /* HEBREW */:
	                return createAdditiveCounter(value, 1, 10999, HEBREW, 3 /* DECIMAL */, defaultSuffix);
	            case 23 /* HIRAGANA */:
	                return createCounterStyleFromSymbols(value, 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん');
	            case 24 /* HIRAGANA_IROHA */:
	                return createCounterStyleFromSymbols(value, 'いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす');
	            case 27 /* KANNADA */:
	                return createCounterStyleFromRange(value, 0xce6, 0xcef, true, defaultSuffix);
	            case 28 /* KATAKANA */:
	                return createCounterStyleFromSymbols(value, 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン', cjkSuffix);
	            case 29 /* KATAKANA_IROHA */:
	                return createCounterStyleFromSymbols(value, 'イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセス', cjkSuffix);
	            case 34 /* LAO */:
	                return createCounterStyleFromRange(value, 0xed0, 0xed9, true, defaultSuffix);
	            case 37 /* MONGOLIAN */:
	                return createCounterStyleFromRange(value, 0x1810, 0x1819, true, defaultSuffix);
	            case 38 /* MYANMAR */:
	                return createCounterStyleFromRange(value, 0x1040, 0x1049, true, defaultSuffix);
	            case 39 /* ORIYA */:
	                return createCounterStyleFromRange(value, 0xb66, 0xb6f, true, defaultSuffix);
	            case 40 /* PERSIAN */:
	                return createCounterStyleFromRange(value, 0x6f0, 0x6f9, true, defaultSuffix);
	            case 43 /* TAMIL */:
	                return createCounterStyleFromRange(value, 0xbe6, 0xbef, true, defaultSuffix);
	            case 44 /* TELUGU */:
	                return createCounterStyleFromRange(value, 0xc66, 0xc6f, true, defaultSuffix);
	            case 45 /* THAI */:
	                return createCounterStyleFromRange(value, 0xe50, 0xe59, true, defaultSuffix);
	            case 46 /* TIBETAN */:
	                return createCounterStyleFromRange(value, 0xf20, 0xf29, true, defaultSuffix);
	            case 3 /* DECIMAL */:
	            default:
	                return createCounterStyleFromRange(value, 48, 57, true, defaultSuffix);
	        }
	    };

	    var IGNORE_ATTRIBUTE = 'data-html2canvas-ignore';
	    var DocumentCloner = /** @class */ (function () {
	        function DocumentCloner(context, element, options) {
	            this.context = context;
	            this.options = options;
	            this.scrolledElements = [];
	            this.referenceElement = element;
	            this.counters = new CounterState();
	            this.quoteDepth = 0;
	            if (!element.ownerDocument) {
	                throw new Error('Cloned element does not have an owner document');
	            }
	            this.documentElement = this.cloneNode(element.ownerDocument.documentElement, false);
	        }
	        DocumentCloner.prototype.toIFrame = function (ownerDocument, windowSize) {
	            var _this = this;
	            var iframe = createIFrameContainer(ownerDocument, windowSize);
	            if (!iframe.contentWindow) {
	                return Promise.reject("Unable to find iframe window");
	            }
	            var scrollX = ownerDocument.defaultView.pageXOffset;
	            var scrollY = ownerDocument.defaultView.pageYOffset;
	            var cloneWindow = iframe.contentWindow;
	            var documentClone = cloneWindow.document;
	            /* Chrome doesn't detect relative background-images assigned in inline <style> sheets when fetched through getComputedStyle
	             if window url is about:blank, we can assign the url to current by writing onto the document
	             */
	            var iframeLoad = iframeLoader(iframe).then(function () { return __awaiter(_this, void 0, void 0, function () {
	                var onclone, referenceElement;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            this.scrolledElements.forEach(restoreNodeScroll);
	                            if (cloneWindow) {
	                                cloneWindow.scrollTo(windowSize.left, windowSize.top);
	                                if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent) &&
	                                    (cloneWindow.scrollY !== windowSize.top || cloneWindow.scrollX !== windowSize.left)) {
	                                    this.context.logger.warn('Unable to restore scroll position for cloned document');
	                                    this.context.windowBounds = this.context.windowBounds.add(cloneWindow.scrollX - windowSize.left, cloneWindow.scrollY - windowSize.top, 0, 0);
	                                }
	                            }
	                            onclone = this.options.onclone;
	                            referenceElement = this.clonedReferenceElement;
	                            if (typeof referenceElement === 'undefined') {
	                                return [2 /*return*/, Promise.reject("Error finding the " + this.referenceElement.nodeName + " in the cloned document")];
	                            }
	                            if (!(documentClone.fonts && documentClone.fonts.ready)) return [3 /*break*/, 2];
	                            return [4 /*yield*/, documentClone.fonts.ready];
	                        case 1:
	                            _a.sent();
	                            _a.label = 2;
	                        case 2:
	                            if (!/(AppleWebKit)/g.test(navigator.userAgent)) return [3 /*break*/, 4];
	                            return [4 /*yield*/, imagesReady(documentClone)];
	                        case 3:
	                            _a.sent();
	                            _a.label = 4;
	                        case 4:
	                            if (typeof onclone === 'function') {
	                                return [2 /*return*/, Promise.resolve()
	                                        .then(function () { return onclone(documentClone, referenceElement); })
	                                        .then(function () { return iframe; })];
	                            }
	                            return [2 /*return*/, iframe];
	                    }
	                });
	            }); });
	            documentClone.open();
	            documentClone.write(serializeDoctype(document.doctype) + "<html></html>");
	            // Chrome scrolls the parent document for some reason after the write to the cloned window???
	            restoreOwnerScroll(this.referenceElement.ownerDocument, scrollX, scrollY);
	            documentClone.replaceChild(documentClone.adoptNode(this.documentElement), documentClone.documentElement);
	            documentClone.close();
	            return iframeLoad;
	        };
	        DocumentCloner.prototype.createElementClone = function (node) {
	            if (isDebugging(node, 2 /* CLONE */)) {
	                debugger;
	            }
	            if (isCanvasElement(node)) {
	                return this.createCanvasClone(node);
	            }
	            if (isVideoElement(node)) {
	                return this.createVideoClone(node);
	            }
	            if (isStyleElement(node)) {
	                return this.createStyleClone(node);
	            }
	            var clone = node.cloneNode(false);
	            if (isImageElement(clone)) {
	                if (isImageElement(node) && node.currentSrc && node.currentSrc !== node.src) {
	                    clone.src = node.currentSrc;
	                    clone.srcset = '';
	                }
	                if (clone.loading === 'lazy') {
	                    clone.loading = 'eager';
	                }
	            }
	            if (isCustomElement(clone)) {
	                return this.createCustomElementClone(clone);
	            }
	            return clone;
	        };
	        DocumentCloner.prototype.createCustomElementClone = function (node) {
	            var clone = document.createElement('html2canvascustomelement');
	            copyCSSStyles(node.style, clone);
	            return clone;
	        };
	        DocumentCloner.prototype.createStyleClone = function (node) {
	            try {
	                var sheet = node.sheet;
	                if (sheet && sheet.cssRules) {
	                    var css = [].slice.call(sheet.cssRules, 0).reduce(function (css, rule) {
	                        if (rule && typeof rule.cssText === 'string') {
	                            return css + rule.cssText;
	                        }
	                        return css;
	                    }, '');
	                    var style = node.cloneNode(false);
	                    style.textContent = css;
	                    return style;
	                }
	            }
	            catch (e) {
	                // accessing node.sheet.cssRules throws a DOMException
	                this.context.logger.error('Unable to access cssRules property', e);
	                if (e.name !== 'SecurityError') {
	                    throw e;
	                }
	            }
	            return node.cloneNode(false);
	        };
	        DocumentCloner.prototype.createCanvasClone = function (canvas) {
	            var _a;
	            if (this.options.inlineImages && canvas.ownerDocument) {
	                var img = canvas.ownerDocument.createElement('img');
	                try {
	                    img.src = canvas.toDataURL();
	                    return img;
	                }
	                catch (e) {
	                    this.context.logger.info("Unable to inline canvas contents, canvas is tainted", canvas);
	                }
	            }
	            var clonedCanvas = canvas.cloneNode(false);
	            try {
	                clonedCanvas.width = canvas.width;
	                clonedCanvas.height = canvas.height;
	                var ctx = canvas.getContext('2d');
	                var clonedCtx = clonedCanvas.getContext('2d');
	                if (clonedCtx) {
	                    if (!this.options.allowTaint && ctx) {
	                        clonedCtx.putImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), 0, 0);
	                    }
	                    else {
	                        var gl = (_a = canvas.getContext('webgl2')) !== null && _a !== void 0 ? _a : canvas.getContext('webgl');
	                        if (gl) {
	                            var attribs = gl.getContextAttributes();
	                            if ((attribs === null || attribs === void 0 ? void 0 : attribs.preserveDrawingBuffer) === false) {
	                                this.context.logger.warn('Unable to clone WebGL context as it has preserveDrawingBuffer=false', canvas);
	                            }
	                        }
	                        clonedCtx.drawImage(canvas, 0, 0);
	                    }
	                }
	                return clonedCanvas;
	            }
	            catch (e) {
	                this.context.logger.info("Unable to clone canvas as it is tainted", canvas);
	            }
	            return clonedCanvas;
	        };
	        DocumentCloner.prototype.createVideoClone = function (video) {
	            var canvas = video.ownerDocument.createElement('canvas');
	            canvas.width = video.offsetWidth;
	            canvas.height = video.offsetHeight;
	            var ctx = canvas.getContext('2d');
	            try {
	                if (ctx) {
	                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	                    if (!this.options.allowTaint) {
	                        ctx.getImageData(0, 0, canvas.width, canvas.height);
	                    }
	                }
	                return canvas;
	            }
	            catch (e) {
	                this.context.logger.info("Unable to clone video as it is tainted", video);
	            }
	            var blankCanvas = video.ownerDocument.createElement('canvas');
	            blankCanvas.width = video.offsetWidth;
	            blankCanvas.height = video.offsetHeight;
	            return blankCanvas;
	        };
	        DocumentCloner.prototype.appendChildNode = function (clone, child, copyStyles) {
	            if (!isElementNode(child) ||
	                (!isScriptElement(child) &&
	                    !child.hasAttribute(IGNORE_ATTRIBUTE) &&
	                    (typeof this.options.ignoreElements !== 'function' || !this.options.ignoreElements(child)))) {
	                if (!this.options.copyStyles || !isElementNode(child) || !isStyleElement(child)) {
	                    clone.appendChild(this.cloneNode(child, copyStyles));
	                }
	            }
	        };
	        DocumentCloner.prototype.cloneChildNodes = function (node, clone, copyStyles) {
	            var _this = this;
	            for (var child = node.shadowRoot ? node.shadowRoot.firstChild : node.firstChild; child; child = child.nextSibling) {
	                if (isElementNode(child) && isSlotElement(child) && typeof child.assignedNodes === 'function') {
	                    var assignedNodes = child.assignedNodes();
	                    if (assignedNodes.length) {
	                        assignedNodes.forEach(function (assignedNode) { return _this.appendChildNode(clone, assignedNode, copyStyles); });
	                    }
	                }
	                else {
	                    this.appendChildNode(clone, child, copyStyles);
	                }
	            }
	        };
	        DocumentCloner.prototype.cloneNode = function (node, copyStyles) {
	            if (isTextNode(node)) {
	                return document.createTextNode(node.data);
	            }
	            if (!node.ownerDocument) {
	                return node.cloneNode(false);
	            }
	            var window = node.ownerDocument.defaultView;
	            if (window && isElementNode(node) && (isHTMLElementNode(node) || isSVGElementNode(node))) {
	                var clone = this.createElementClone(node);
	                clone.style.transitionProperty = 'none';
	                var style = window.getComputedStyle(node);
	                var styleBefore = window.getComputedStyle(node, ':before');
	                var styleAfter = window.getComputedStyle(node, ':after');
	                if (this.referenceElement === node && isHTMLElementNode(clone)) {
	                    this.clonedReferenceElement = clone;
	                }
	                if (isBodyElement(clone)) {
	                    createPseudoHideStyles(clone);
	                }
	                var counters = this.counters.parse(new CSSParsedCounterDeclaration(this.context, style));
	                var before = this.resolvePseudoContent(node, clone, styleBefore, PseudoElementType.BEFORE);
	                if (isCustomElement(node)) {
	                    copyStyles = true;
	                }
	                if (!isVideoElement(node)) {
	                    this.cloneChildNodes(node, clone, copyStyles);
	                }
	                if (before) {
	                    clone.insertBefore(before, clone.firstChild);
	                }
	                var after = this.resolvePseudoContent(node, clone, styleAfter, PseudoElementType.AFTER);
	                if (after) {
	                    clone.appendChild(after);
	                }
	                this.counters.pop(counters);
	                if ((style && (this.options.copyStyles || isSVGElementNode(node)) && !isIFrameElement(node)) ||
	                    copyStyles) {
	                    copyCSSStyles(style, clone);
	                }
	                if (node.scrollTop !== 0 || node.scrollLeft !== 0) {
	                    this.scrolledElements.push([clone, node.scrollLeft, node.scrollTop]);
	                }
	                if ((isTextareaElement(node) || isSelectElement(node)) &&
	                    (isTextareaElement(clone) || isSelectElement(clone))) {
	                    clone.value = node.value;
	                }
	                return clone;
	            }
	            return node.cloneNode(false);
	        };
	        DocumentCloner.prototype.resolvePseudoContent = function (node, clone, style, pseudoElt) {
	            var _this = this;
	            if (!style) {
	                return;
	            }
	            var value = style.content;
	            var document = clone.ownerDocument;
	            if (!document || !value || value === 'none' || value === '-moz-alt-content' || style.display === 'none') {
	                return;
	            }
	            this.counters.parse(new CSSParsedCounterDeclaration(this.context, style));
	            var declaration = new CSSParsedPseudoDeclaration(this.context, style);
	            var anonymousReplacedElement = document.createElement('html2canvaspseudoelement');
	            copyCSSStyles(style, anonymousReplacedElement);
	            declaration.content.forEach(function (token) {
	                if (token.type === 0 /* STRING_TOKEN */) {
	                    anonymousReplacedElement.appendChild(document.createTextNode(token.value));
	                }
	                else if (token.type === 22 /* URL_TOKEN */) {
	                    var img = document.createElement('img');
	                    img.src = token.value;
	                    img.style.opacity = '1';
	                    anonymousReplacedElement.appendChild(img);
	                }
	                else if (token.type === 18 /* FUNCTION */) {
	                    if (token.name === 'attr') {
	                        var attr = token.values.filter(isIdentToken);
	                        if (attr.length) {
	                            anonymousReplacedElement.appendChild(document.createTextNode(node.getAttribute(attr[0].value) || ''));
	                        }
	                    }
	                    else if (token.name === 'counter') {
	                        var _a = token.values.filter(nonFunctionArgSeparator), counter = _a[0], counterStyle = _a[1];
	                        if (counter && isIdentToken(counter)) {
	                            var counterState = _this.counters.getCounterValue(counter.value);
	                            var counterType = counterStyle && isIdentToken(counterStyle)
	                                ? listStyleType.parse(_this.context, counterStyle.value)
	                                : 3 /* DECIMAL */;
	                            anonymousReplacedElement.appendChild(document.createTextNode(createCounterText(counterState, counterType, false)));
	                        }
	                    }
	                    else if (token.name === 'counters') {
	                        var _b = token.values.filter(nonFunctionArgSeparator), counter = _b[0], delim = _b[1], counterStyle = _b[2];
	                        if (counter && isIdentToken(counter)) {
	                            var counterStates = _this.counters.getCounterValues(counter.value);
	                            var counterType_1 = counterStyle && isIdentToken(counterStyle)
	                                ? listStyleType.parse(_this.context, counterStyle.value)
	                                : 3 /* DECIMAL */;
	                            var separator = delim && delim.type === 0 /* STRING_TOKEN */ ? delim.value : '';
	                            var text = counterStates
	                                .map(function (value) { return createCounterText(value, counterType_1, false); })
	                                .join(separator);
	                            anonymousReplacedElement.appendChild(document.createTextNode(text));
	                        }
	                    }
	                    else ;
	                }
	                else if (token.type === 20 /* IDENT_TOKEN */) {
	                    switch (token.value) {
	                        case 'open-quote':
	                            anonymousReplacedElement.appendChild(document.createTextNode(getQuote(declaration.quotes, _this.quoteDepth++, true)));
	                            break;
	                        case 'close-quote':
	                            anonymousReplacedElement.appendChild(document.createTextNode(getQuote(declaration.quotes, --_this.quoteDepth, false)));
	                            break;
	                        default:
	                            // safari doesn't parse string tokens correctly because of lack of quotes
	                            anonymousReplacedElement.appendChild(document.createTextNode(token.value));
	                    }
	                }
	            });
	            anonymousReplacedElement.className = PSEUDO_HIDE_ELEMENT_CLASS_BEFORE + " " + PSEUDO_HIDE_ELEMENT_CLASS_AFTER;
	            var newClassName = pseudoElt === PseudoElementType.BEFORE
	                ? " " + PSEUDO_HIDE_ELEMENT_CLASS_BEFORE
	                : " " + PSEUDO_HIDE_ELEMENT_CLASS_AFTER;
	            if (isSVGElementNode(clone)) {
	                clone.className.baseValue += newClassName;
	            }
	            else {
	                clone.className += newClassName;
	            }
	            return anonymousReplacedElement;
	        };
	        DocumentCloner.destroy = function (container) {
	            if (container.parentNode) {
	                container.parentNode.removeChild(container);
	                return true;
	            }
	            return false;
	        };
	        return DocumentCloner;
	    }());
	    var PseudoElementType;
	    (function (PseudoElementType) {
	        PseudoElementType[PseudoElementType["BEFORE"] = 0] = "BEFORE";
	        PseudoElementType[PseudoElementType["AFTER"] = 1] = "AFTER";
	    })(PseudoElementType || (PseudoElementType = {}));
	    var createIFrameContainer = function (ownerDocument, bounds) {
	        var cloneIframeContainer = ownerDocument.createElement('iframe');
	        cloneIframeContainer.className = 'html2canvas-container';
	        cloneIframeContainer.style.visibility = 'hidden';
	        cloneIframeContainer.style.position = 'fixed';
	        cloneIframeContainer.style.left = '-10000px';
	        cloneIframeContainer.style.top = '0px';
	        cloneIframeContainer.style.border = '0';
	        cloneIframeContainer.width = bounds.width.toString();
	        cloneIframeContainer.height = bounds.height.toString();
	        cloneIframeContainer.scrolling = 'no'; // ios won't scroll without it
	        cloneIframeContainer.setAttribute(IGNORE_ATTRIBUTE, 'true');
	        ownerDocument.body.appendChild(cloneIframeContainer);
	        return cloneIframeContainer;
	    };
	    var imageReady = function (img) {
	        return new Promise(function (resolve) {
	            if (img.complete) {
	                resolve();
	                return;
	            }
	            if (!img.src) {
	                resolve();
	                return;
	            }
	            img.onload = resolve;
	            img.onerror = resolve;
	        });
	    };
	    var imagesReady = function (document) {
	        return Promise.all([].slice.call(document.images, 0).map(imageReady));
	    };
	    var iframeLoader = function (iframe) {
	        return new Promise(function (resolve, reject) {
	            var cloneWindow = iframe.contentWindow;
	            if (!cloneWindow) {
	                return reject("No window assigned for iframe");
	            }
	            var documentClone = cloneWindow.document;
	            cloneWindow.onload = iframe.onload = function () {
	                cloneWindow.onload = iframe.onload = null;
	                var interval = setInterval(function () {
	                    if (documentClone.body.childNodes.length > 0 && documentClone.readyState === 'complete') {
	                        clearInterval(interval);
	                        resolve(iframe);
	                    }
	                }, 50);
	            };
	        });
	    };
	    var ignoredStyleProperties = [
	        'all',
	        'd',
	        'content' // Safari shows pseudoelements if content is set
	    ];
	    var copyCSSStyles = function (style, target) {
	        // Edge does not provide value for cssText
	        for (var i = style.length - 1; i >= 0; i--) {
	            var property = style.item(i);
	            if (ignoredStyleProperties.indexOf(property) === -1) {
	                target.style.setProperty(property, style.getPropertyValue(property));
	            }
	        }
	        return target;
	    };
	    var serializeDoctype = function (doctype) {
	        var str = '';
	        if (doctype) {
	            str += '<!DOCTYPE ';
	            if (doctype.name) {
	                str += doctype.name;
	            }
	            if (doctype.internalSubset) {
	                str += doctype.internalSubset;
	            }
	            if (doctype.publicId) {
	                str += "\"" + doctype.publicId + "\"";
	            }
	            if (doctype.systemId) {
	                str += "\"" + doctype.systemId + "\"";
	            }
	            str += '>';
	        }
	        return str;
	    };
	    var restoreOwnerScroll = function (ownerDocument, x, y) {
	        if (ownerDocument &&
	            ownerDocument.defaultView &&
	            (x !== ownerDocument.defaultView.pageXOffset || y !== ownerDocument.defaultView.pageYOffset)) {
	            ownerDocument.defaultView.scrollTo(x, y);
	        }
	    };
	    var restoreNodeScroll = function (_a) {
	        var element = _a[0], x = _a[1], y = _a[2];
	        element.scrollLeft = x;
	        element.scrollTop = y;
	    };
	    var PSEUDO_BEFORE = ':before';
	    var PSEUDO_AFTER = ':after';
	    var PSEUDO_HIDE_ELEMENT_CLASS_BEFORE = '___html2canvas___pseudoelement_before';
	    var PSEUDO_HIDE_ELEMENT_CLASS_AFTER = '___html2canvas___pseudoelement_after';
	    var PSEUDO_HIDE_ELEMENT_STYLE = "{\n    content: \"\" !important;\n    display: none !important;\n}";
	    var createPseudoHideStyles = function (body) {
	        createStyles(body, "." + PSEUDO_HIDE_ELEMENT_CLASS_BEFORE + PSEUDO_BEFORE + PSEUDO_HIDE_ELEMENT_STYLE + "\n         ." + PSEUDO_HIDE_ELEMENT_CLASS_AFTER + PSEUDO_AFTER + PSEUDO_HIDE_ELEMENT_STYLE);
	    };
	    var createStyles = function (body, styles) {
	        var document = body.ownerDocument;
	        if (document) {
	            var style = document.createElement('style');
	            style.textContent = styles;
	            body.appendChild(style);
	        }
	    };

	    var CacheStorage = /** @class */ (function () {
	        function CacheStorage() {
	        }
	        CacheStorage.getOrigin = function (url) {
	            var link = CacheStorage._link;
	            if (!link) {
	                return 'about:blank';
	            }
	            link.href = url;
	            link.href = link.href; // IE9, LOL! - http://jsfiddle.net/niklasvh/2e48b/
	            return link.protocol + link.hostname + link.port;
	        };
	        CacheStorage.isSameOrigin = function (src) {
	            return CacheStorage.getOrigin(src) === CacheStorage._origin;
	        };
	        CacheStorage.setContext = function (window) {
	            CacheStorage._link = window.document.createElement('a');
	            CacheStorage._origin = CacheStorage.getOrigin(window.location.href);
	        };
	        CacheStorage._origin = 'about:blank';
	        return CacheStorage;
	    }());
	    var Cache = /** @class */ (function () {
	        function Cache(context, _options) {
	            this.context = context;
	            this._options = _options;
	            // eslint-disable-next-line @typescript-eslint/no-explicit-any
	            this._cache = {};
	        }
	        Cache.prototype.addImage = function (src) {
	            var result = Promise.resolve();
	            if (this.has(src)) {
	                return result;
	            }
	            if (isBlobImage(src) || isRenderable(src)) {
	                (this._cache[src] = this.loadImage(src)).catch(function () {
	                    // prevent unhandled rejection
	                });
	                return result;
	            }
	            return result;
	        };
	        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	        Cache.prototype.match = function (src) {
	            return this._cache[src];
	        };
	        Cache.prototype.loadImage = function (key) {
	            return __awaiter(this, void 0, void 0, function () {
	                var isSameOrigin, useCORS, useProxy, src;
	                var _this = this;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            isSameOrigin = CacheStorage.isSameOrigin(key);
	                            useCORS = !isInlineImage(key) && this._options.useCORS === true && FEATURES.SUPPORT_CORS_IMAGES && !isSameOrigin;
	                            useProxy = !isInlineImage(key) &&
	                                !isSameOrigin &&
	                                !isBlobImage(key) &&
	                                typeof this._options.proxy === 'string' &&
	                                FEATURES.SUPPORT_CORS_XHR &&
	                                !useCORS;
	                            if (!isSameOrigin &&
	                                this._options.allowTaint === false &&
	                                !isInlineImage(key) &&
	                                !isBlobImage(key) &&
	                                !useProxy &&
	                                !useCORS) {
	                                return [2 /*return*/];
	                            }
	                            src = key;
	                            if (!useProxy) return [3 /*break*/, 2];
	                            return [4 /*yield*/, this.proxy(src)];
	                        case 1:
	                            src = _a.sent();
	                            _a.label = 2;
	                        case 2:
	                            this.context.logger.debug("Added image " + key.substring(0, 256));
	                            return [4 /*yield*/, new Promise(function (resolve, reject) {
	                                    var img = new Image();
	                                    img.onload = function () { return resolve(img); };
	                                    img.onerror = reject;
	                                    //ios safari 10.3 taints canvas with data urls unless crossOrigin is set to anonymous
	                                    if (isInlineBase64Image(src) || useCORS) {
	                                        img.crossOrigin = 'anonymous';
	                                    }
	                                    img.src = src;
	                                    if (img.complete === true) {
	                                        // Inline XML images may fail to parse, throwing an Error later on
	                                        setTimeout(function () { return resolve(img); }, 500);
	                                    }
	                                    if (_this._options.imageTimeout > 0) {
	                                        setTimeout(function () { return reject("Timed out (" + _this._options.imageTimeout + "ms) loading image"); }, _this._options.imageTimeout);
	                                    }
	                                })];
	                        case 3: return [2 /*return*/, _a.sent()];
	                    }
	                });
	            });
	        };
	        Cache.prototype.has = function (key) {
	            return typeof this._cache[key] !== 'undefined';
	        };
	        Cache.prototype.keys = function () {
	            return Promise.resolve(Object.keys(this._cache));
	        };
	        Cache.prototype.proxy = function (src) {
	            var _this = this;
	            var proxy = this._options.proxy;
	            if (!proxy) {
	                throw new Error('No proxy defined');
	            }
	            var key = src.substring(0, 256);
	            return new Promise(function (resolve, reject) {
	                var responseType = FEATURES.SUPPORT_RESPONSE_TYPE ? 'blob' : 'text';
	                var xhr = new XMLHttpRequest();
	                xhr.onload = function () {
	                    if (xhr.status === 200) {
	                        if (responseType === 'text') {
	                            resolve(xhr.response);
	                        }
	                        else {
	                            var reader_1 = new FileReader();
	                            reader_1.addEventListener('load', function () { return resolve(reader_1.result); }, false);
	                            reader_1.addEventListener('error', function (e) { return reject(e); }, false);
	                            reader_1.readAsDataURL(xhr.response);
	                        }
	                    }
	                    else {
	                        reject("Failed to proxy resource " + key + " with status code " + xhr.status);
	                    }
	                };
	                xhr.onerror = reject;
	                var queryString = proxy.indexOf('?') > -1 ? '&' : '?';
	                xhr.open('GET', "" + proxy + queryString + "url=" + encodeURIComponent(src) + "&responseType=" + responseType);
	                if (responseType !== 'text' && xhr instanceof XMLHttpRequest) {
	                    xhr.responseType = responseType;
	                }
	                if (_this._options.imageTimeout) {
	                    var timeout_1 = _this._options.imageTimeout;
	                    xhr.timeout = timeout_1;
	                    xhr.ontimeout = function () { return reject("Timed out (" + timeout_1 + "ms) proxying " + key); };
	                }
	                xhr.send();
	            });
	        };
	        return Cache;
	    }());
	    var INLINE_SVG = /^data:image\/svg\+xml/i;
	    var INLINE_BASE64 = /^data:image\/.*;base64,/i;
	    var INLINE_IMG = /^data:image\/.*/i;
	    var isRenderable = function (src) { return FEATURES.SUPPORT_SVG_DRAWING || !isSVG(src); };
	    var isInlineImage = function (src) { return INLINE_IMG.test(src); };
	    var isInlineBase64Image = function (src) { return INLINE_BASE64.test(src); };
	    var isBlobImage = function (src) { return src.substr(0, 4) === 'blob'; };
	    var isSVG = function (src) { return src.substr(-3).toLowerCase() === 'svg' || INLINE_SVG.test(src); };

	    var Vector = /** @class */ (function () {
	        function Vector(x, y) {
	            this.type = 0 /* VECTOR */;
	            this.x = x;
	            this.y = y;
	        }
	        Vector.prototype.add = function (deltaX, deltaY) {
	            return new Vector(this.x + deltaX, this.y + deltaY);
	        };
	        return Vector;
	    }());

	    var lerp = function (a, b, t) {
	        return new Vector(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
	    };
	    var BezierCurve = /** @class */ (function () {
	        function BezierCurve(start, startControl, endControl, end) {
	            this.type = 1 /* BEZIER_CURVE */;
	            this.start = start;
	            this.startControl = startControl;
	            this.endControl = endControl;
	            this.end = end;
	        }
	        BezierCurve.prototype.subdivide = function (t, firstHalf) {
	            var ab = lerp(this.start, this.startControl, t);
	            var bc = lerp(this.startControl, this.endControl, t);
	            var cd = lerp(this.endControl, this.end, t);
	            var abbc = lerp(ab, bc, t);
	            var bccd = lerp(bc, cd, t);
	            var dest = lerp(abbc, bccd, t);
	            return firstHalf ? new BezierCurve(this.start, ab, abbc, dest) : new BezierCurve(dest, bccd, cd, this.end);
	        };
	        BezierCurve.prototype.add = function (deltaX, deltaY) {
	            return new BezierCurve(this.start.add(deltaX, deltaY), this.startControl.add(deltaX, deltaY), this.endControl.add(deltaX, deltaY), this.end.add(deltaX, deltaY));
	        };
	        BezierCurve.prototype.reverse = function () {
	            return new BezierCurve(this.end, this.endControl, this.startControl, this.start);
	        };
	        return BezierCurve;
	    }());
	    var isBezierCurve = function (path) { return path.type === 1 /* BEZIER_CURVE */; };

	    var BoundCurves = /** @class */ (function () {
	        function BoundCurves(element) {
	            var styles = element.styles;
	            var bounds = element.bounds;
	            var _a = getAbsoluteValueForTuple(styles.borderTopLeftRadius, bounds.width, bounds.height), tlh = _a[0], tlv = _a[1];
	            var _b = getAbsoluteValueForTuple(styles.borderTopRightRadius, bounds.width, bounds.height), trh = _b[0], trv = _b[1];
	            var _c = getAbsoluteValueForTuple(styles.borderBottomRightRadius, bounds.width, bounds.height), brh = _c[0], brv = _c[1];
	            var _d = getAbsoluteValueForTuple(styles.borderBottomLeftRadius, bounds.width, bounds.height), blh = _d[0], blv = _d[1];
	            var factors = [];
	            factors.push((tlh + trh) / bounds.width);
	            factors.push((blh + brh) / bounds.width);
	            factors.push((tlv + blv) / bounds.height);
	            factors.push((trv + brv) / bounds.height);
	            var maxFactor = Math.max.apply(Math, factors);
	            if (maxFactor > 1) {
	                tlh /= maxFactor;
	                tlv /= maxFactor;
	                trh /= maxFactor;
	                trv /= maxFactor;
	                brh /= maxFactor;
	                brv /= maxFactor;
	                blh /= maxFactor;
	                blv /= maxFactor;
	            }
	            var topWidth = bounds.width - trh;
	            var rightHeight = bounds.height - brv;
	            var bottomWidth = bounds.width - brh;
	            var leftHeight = bounds.height - blv;
	            var borderTopWidth = styles.borderTopWidth;
	            var borderRightWidth = styles.borderRightWidth;
	            var borderBottomWidth = styles.borderBottomWidth;
	            var borderLeftWidth = styles.borderLeftWidth;
	            var paddingTop = getAbsoluteValue(styles.paddingTop, element.bounds.width);
	            var paddingRight = getAbsoluteValue(styles.paddingRight, element.bounds.width);
	            var paddingBottom = getAbsoluteValue(styles.paddingBottom, element.bounds.width);
	            var paddingLeft = getAbsoluteValue(styles.paddingLeft, element.bounds.width);
	            this.topLeftBorderDoubleOuterBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth / 3, bounds.top + borderTopWidth / 3, tlh - borderLeftWidth / 3, tlv - borderTopWidth / 3, CORNER.TOP_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth / 3, bounds.top + borderTopWidth / 3);
	            this.topRightBorderDoubleOuterBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + topWidth, bounds.top + borderTopWidth / 3, trh - borderRightWidth / 3, trv - borderTopWidth / 3, CORNER.TOP_RIGHT)
	                    : new Vector(bounds.left + bounds.width - borderRightWidth / 3, bounds.top + borderTopWidth / 3);
	            this.bottomRightBorderDoubleOuterBox =
	                brh > 0 || brv > 0
	                    ? getCurvePoints(bounds.left + bottomWidth, bounds.top + rightHeight, brh - borderRightWidth / 3, brv - borderBottomWidth / 3, CORNER.BOTTOM_RIGHT)
	                    : new Vector(bounds.left + bounds.width - borderRightWidth / 3, bounds.top + bounds.height - borderBottomWidth / 3);
	            this.bottomLeftBorderDoubleOuterBox =
	                blh > 0 || blv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth / 3, bounds.top + leftHeight, blh - borderLeftWidth / 3, blv - borderBottomWidth / 3, CORNER.BOTTOM_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth / 3, bounds.top + bounds.height - borderBottomWidth / 3);
	            this.topLeftBorderDoubleInnerBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + (borderLeftWidth * 2) / 3, bounds.top + (borderTopWidth * 2) / 3, tlh - (borderLeftWidth * 2) / 3, tlv - (borderTopWidth * 2) / 3, CORNER.TOP_LEFT)
	                    : new Vector(bounds.left + (borderLeftWidth * 2) / 3, bounds.top + (borderTopWidth * 2) / 3);
	            this.topRightBorderDoubleInnerBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + topWidth, bounds.top + (borderTopWidth * 2) / 3, trh - (borderRightWidth * 2) / 3, trv - (borderTopWidth * 2) / 3, CORNER.TOP_RIGHT)
	                    : new Vector(bounds.left + bounds.width - (borderRightWidth * 2) / 3, bounds.top + (borderTopWidth * 2) / 3);
	            this.bottomRightBorderDoubleInnerBox =
	                brh > 0 || brv > 0
	                    ? getCurvePoints(bounds.left + bottomWidth, bounds.top + rightHeight, brh - (borderRightWidth * 2) / 3, brv - (borderBottomWidth * 2) / 3, CORNER.BOTTOM_RIGHT)
	                    : new Vector(bounds.left + bounds.width - (borderRightWidth * 2) / 3, bounds.top + bounds.height - (borderBottomWidth * 2) / 3);
	            this.bottomLeftBorderDoubleInnerBox =
	                blh > 0 || blv > 0
	                    ? getCurvePoints(bounds.left + (borderLeftWidth * 2) / 3, bounds.top + leftHeight, blh - (borderLeftWidth * 2) / 3, blv - (borderBottomWidth * 2) / 3, CORNER.BOTTOM_LEFT)
	                    : new Vector(bounds.left + (borderLeftWidth * 2) / 3, bounds.top + bounds.height - (borderBottomWidth * 2) / 3);
	            this.topLeftBorderStroke =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth / 2, bounds.top + borderTopWidth / 2, tlh - borderLeftWidth / 2, tlv - borderTopWidth / 2, CORNER.TOP_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth / 2, bounds.top + borderTopWidth / 2);
	            this.topRightBorderStroke =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + topWidth, bounds.top + borderTopWidth / 2, trh - borderRightWidth / 2, trv - borderTopWidth / 2, CORNER.TOP_RIGHT)
	                    : new Vector(bounds.left + bounds.width - borderRightWidth / 2, bounds.top + borderTopWidth / 2);
	            this.bottomRightBorderStroke =
	                brh > 0 || brv > 0
	                    ? getCurvePoints(bounds.left + bottomWidth, bounds.top + rightHeight, brh - borderRightWidth / 2, brv - borderBottomWidth / 2, CORNER.BOTTOM_RIGHT)
	                    : new Vector(bounds.left + bounds.width - borderRightWidth / 2, bounds.top + bounds.height - borderBottomWidth / 2);
	            this.bottomLeftBorderStroke =
	                blh > 0 || blv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth / 2, bounds.top + leftHeight, blh - borderLeftWidth / 2, blv - borderBottomWidth / 2, CORNER.BOTTOM_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth / 2, bounds.top + bounds.height - borderBottomWidth / 2);
	            this.topLeftBorderBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left, bounds.top, tlh, tlv, CORNER.TOP_LEFT)
	                    : new Vector(bounds.left, bounds.top);
	            this.topRightBorderBox =
	                trh > 0 || trv > 0
	                    ? getCurvePoints(bounds.left + topWidth, bounds.top, trh, trv, CORNER.TOP_RIGHT)
	                    : new Vector(bounds.left + bounds.width, bounds.top);
	            this.bottomRightBorderBox =
	                brh > 0 || brv > 0
	                    ? getCurvePoints(bounds.left + bottomWidth, bounds.top + rightHeight, brh, brv, CORNER.BOTTOM_RIGHT)
	                    : new Vector(bounds.left + bounds.width, bounds.top + bounds.height);
	            this.bottomLeftBorderBox =
	                blh > 0 || blv > 0
	                    ? getCurvePoints(bounds.left, bounds.top + leftHeight, blh, blv, CORNER.BOTTOM_LEFT)
	                    : new Vector(bounds.left, bounds.top + bounds.height);
	            this.topLeftPaddingBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth, bounds.top + borderTopWidth, Math.max(0, tlh - borderLeftWidth), Math.max(0, tlv - borderTopWidth), CORNER.TOP_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth, bounds.top + borderTopWidth);
	            this.topRightPaddingBox =
	                trh > 0 || trv > 0
	                    ? getCurvePoints(bounds.left + Math.min(topWidth, bounds.width - borderRightWidth), bounds.top + borderTopWidth, topWidth > bounds.width + borderRightWidth ? 0 : Math.max(0, trh - borderRightWidth), Math.max(0, trv - borderTopWidth), CORNER.TOP_RIGHT)
	                    : new Vector(bounds.left + bounds.width - borderRightWidth, bounds.top + borderTopWidth);
	            this.bottomRightPaddingBox =
	                brh > 0 || brv > 0
	                    ? getCurvePoints(bounds.left + Math.min(bottomWidth, bounds.width - borderLeftWidth), bounds.top + Math.min(rightHeight, bounds.height - borderBottomWidth), Math.max(0, brh - borderRightWidth), Math.max(0, brv - borderBottomWidth), CORNER.BOTTOM_RIGHT)
	                    : new Vector(bounds.left + bounds.width - borderRightWidth, bounds.top + bounds.height - borderBottomWidth);
	            this.bottomLeftPaddingBox =
	                blh > 0 || blv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth, bounds.top + Math.min(leftHeight, bounds.height - borderBottomWidth), Math.max(0, blh - borderLeftWidth), Math.max(0, blv - borderBottomWidth), CORNER.BOTTOM_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth, bounds.top + bounds.height - borderBottomWidth);
	            this.topLeftContentBox =
	                tlh > 0 || tlv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth + paddingLeft, bounds.top + borderTopWidth + paddingTop, Math.max(0, tlh - (borderLeftWidth + paddingLeft)), Math.max(0, tlv - (borderTopWidth + paddingTop)), CORNER.TOP_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth + paddingLeft, bounds.top + borderTopWidth + paddingTop);
	            this.topRightContentBox =
	                trh > 0 || trv > 0
	                    ? getCurvePoints(bounds.left + Math.min(topWidth, bounds.width + borderLeftWidth + paddingLeft), bounds.top + borderTopWidth + paddingTop, topWidth > bounds.width + borderLeftWidth + paddingLeft ? 0 : trh - borderLeftWidth + paddingLeft, trv - (borderTopWidth + paddingTop), CORNER.TOP_RIGHT)
	                    : new Vector(bounds.left + bounds.width - (borderRightWidth + paddingRight), bounds.top + borderTopWidth + paddingTop);
	            this.bottomRightContentBox =
	                brh > 0 || brv > 0
	                    ? getCurvePoints(bounds.left + Math.min(bottomWidth, bounds.width - (borderLeftWidth + paddingLeft)), bounds.top + Math.min(rightHeight, bounds.height + borderTopWidth + paddingTop), Math.max(0, brh - (borderRightWidth + paddingRight)), brv - (borderBottomWidth + paddingBottom), CORNER.BOTTOM_RIGHT)
	                    : new Vector(bounds.left + bounds.width - (borderRightWidth + paddingRight), bounds.top + bounds.height - (borderBottomWidth + paddingBottom));
	            this.bottomLeftContentBox =
	                blh > 0 || blv > 0
	                    ? getCurvePoints(bounds.left + borderLeftWidth + paddingLeft, bounds.top + leftHeight, Math.max(0, blh - (borderLeftWidth + paddingLeft)), blv - (borderBottomWidth + paddingBottom), CORNER.BOTTOM_LEFT)
	                    : new Vector(bounds.left + borderLeftWidth + paddingLeft, bounds.top + bounds.height - (borderBottomWidth + paddingBottom));
	        }
	        return BoundCurves;
	    }());
	    var CORNER;
	    (function (CORNER) {
	        CORNER[CORNER["TOP_LEFT"] = 0] = "TOP_LEFT";
	        CORNER[CORNER["TOP_RIGHT"] = 1] = "TOP_RIGHT";
	        CORNER[CORNER["BOTTOM_RIGHT"] = 2] = "BOTTOM_RIGHT";
	        CORNER[CORNER["BOTTOM_LEFT"] = 3] = "BOTTOM_LEFT";
	    })(CORNER || (CORNER = {}));
	    var getCurvePoints = function (x, y, r1, r2, position) {
	        var kappa = 4 * ((Math.sqrt(2) - 1) / 3);
	        var ox = r1 * kappa; // control point offset horizontal
	        var oy = r2 * kappa; // control point offset vertical
	        var xm = x + r1; // x-middle
	        var ym = y + r2; // y-middle
	        switch (position) {
	            case CORNER.TOP_LEFT:
	                return new BezierCurve(new Vector(x, ym), new Vector(x, ym - oy), new Vector(xm - ox, y), new Vector(xm, y));
	            case CORNER.TOP_RIGHT:
	                return new BezierCurve(new Vector(x, y), new Vector(x + ox, y), new Vector(xm, ym - oy), new Vector(xm, ym));
	            case CORNER.BOTTOM_RIGHT:
	                return new BezierCurve(new Vector(xm, y), new Vector(xm, y + oy), new Vector(x + ox, ym), new Vector(x, ym));
	            case CORNER.BOTTOM_LEFT:
	            default:
	                return new BezierCurve(new Vector(xm, ym), new Vector(xm - ox, ym), new Vector(x, y + oy), new Vector(x, y));
	        }
	    };
	    var calculateBorderBoxPath = function (curves) {
	        return [curves.topLeftBorderBox, curves.topRightBorderBox, curves.bottomRightBorderBox, curves.bottomLeftBorderBox];
	    };
	    var calculateContentBoxPath = function (curves) {
	        return [
	            curves.topLeftContentBox,
	            curves.topRightContentBox,
	            curves.bottomRightContentBox,
	            curves.bottomLeftContentBox
	        ];
	    };
	    var calculatePaddingBoxPath = function (curves) {
	        return [
	            curves.topLeftPaddingBox,
	            curves.topRightPaddingBox,
	            curves.bottomRightPaddingBox,
	            curves.bottomLeftPaddingBox
	        ];
	    };

	    var TransformEffect = /** @class */ (function () {
	        function TransformEffect(offsetX, offsetY, matrix) {
	            this.offsetX = offsetX;
	            this.offsetY = offsetY;
	            this.matrix = matrix;
	            this.type = 0 /* TRANSFORM */;
	            this.target = 2 /* BACKGROUND_BORDERS */ | 4 /* CONTENT */;
	        }
	        return TransformEffect;
	    }());
	    var ClipEffect = /** @class */ (function () {
	        function ClipEffect(path, target) {
	            this.path = path;
	            this.target = target;
	            this.type = 1 /* CLIP */;
	        }
	        return ClipEffect;
	    }());
	    var OpacityEffect = /** @class */ (function () {
	        function OpacityEffect(opacity) {
	            this.opacity = opacity;
	            this.type = 2 /* OPACITY */;
	            this.target = 2 /* BACKGROUND_BORDERS */ | 4 /* CONTENT */;
	        }
	        return OpacityEffect;
	    }());
	    var isTransformEffect = function (effect) {
	        return effect.type === 0 /* TRANSFORM */;
	    };
	    var isClipEffect = function (effect) { return effect.type === 1 /* CLIP */; };
	    var isOpacityEffect = function (effect) { return effect.type === 2 /* OPACITY */; };

	    var equalPath = function (a, b) {
	        if (a.length === b.length) {
	            return a.some(function (v, i) { return v === b[i]; });
	        }
	        return false;
	    };
	    var transformPath = function (path, deltaX, deltaY, deltaW, deltaH) {
	        return path.map(function (point, index) {
	            switch (index) {
	                case 0:
	                    return point.add(deltaX, deltaY);
	                case 1:
	                    return point.add(deltaX + deltaW, deltaY);
	                case 2:
	                    return point.add(deltaX + deltaW, deltaY + deltaH);
	                case 3:
	                    return point.add(deltaX, deltaY + deltaH);
	            }
	            return point;
	        });
	    };

	    var StackingContext = /** @class */ (function () {
	        function StackingContext(container) {
	            this.element = container;
	            this.inlineLevel = [];
	            this.nonInlineLevel = [];
	            this.negativeZIndex = [];
	            this.zeroOrAutoZIndexOrTransformedOrOpacity = [];
	            this.positiveZIndex = [];
	            this.nonPositionedFloats = [];
	            this.nonPositionedInlineLevel = [];
	        }
	        return StackingContext;
	    }());
	    var ElementPaint = /** @class */ (function () {
	        function ElementPaint(container, parent) {
	            this.container = container;
	            this.parent = parent;
	            this.effects = [];
	            this.curves = new BoundCurves(this.container);
	            if (this.container.styles.opacity < 1) {
	                this.effects.push(new OpacityEffect(this.container.styles.opacity));
	            }
	            if (this.container.styles.transform !== null) {
	                var offsetX = this.container.bounds.left + this.container.styles.transformOrigin[0].number;
	                var offsetY = this.container.bounds.top + this.container.styles.transformOrigin[1].number;
	                var matrix = this.container.styles.transform;
	                this.effects.push(new TransformEffect(offsetX, offsetY, matrix));
	            }
	            if (this.container.styles.overflowX !== 0 /* VISIBLE */) {
	                var borderBox = calculateBorderBoxPath(this.curves);
	                var paddingBox = calculatePaddingBoxPath(this.curves);
	                if (equalPath(borderBox, paddingBox)) {
	                    this.effects.push(new ClipEffect(borderBox, 2 /* BACKGROUND_BORDERS */ | 4 /* CONTENT */));
	                }
	                else {
	                    this.effects.push(new ClipEffect(borderBox, 2 /* BACKGROUND_BORDERS */));
	                    this.effects.push(new ClipEffect(paddingBox, 4 /* CONTENT */));
	                }
	            }
	        }
	        ElementPaint.prototype.getEffects = function (target) {
	            var inFlow = [2 /* ABSOLUTE */, 3 /* FIXED */].indexOf(this.container.styles.position) === -1;
	            var parent = this.parent;
	            var effects = this.effects.slice(0);
	            while (parent) {
	                var croplessEffects = parent.effects.filter(function (effect) { return !isClipEffect(effect); });
	                if (inFlow || parent.container.styles.position !== 0 /* STATIC */ || !parent.parent) {
	                    effects.unshift.apply(effects, croplessEffects);
	                    inFlow = [2 /* ABSOLUTE */, 3 /* FIXED */].indexOf(parent.container.styles.position) === -1;
	                    if (parent.container.styles.overflowX !== 0 /* VISIBLE */) {
	                        var borderBox = calculateBorderBoxPath(parent.curves);
	                        var paddingBox = calculatePaddingBoxPath(parent.curves);
	                        if (!equalPath(borderBox, paddingBox)) {
	                            effects.unshift(new ClipEffect(paddingBox, 2 /* BACKGROUND_BORDERS */ | 4 /* CONTENT */));
	                        }
	                    }
	                }
	                else {
	                    effects.unshift.apply(effects, croplessEffects);
	                }
	                parent = parent.parent;
	            }
	            return effects.filter(function (effect) { return contains(effect.target, target); });
	        };
	        return ElementPaint;
	    }());
	    var parseStackTree = function (parent, stackingContext, realStackingContext, listItems) {
	        parent.container.elements.forEach(function (child) {
	            var treatAsRealStackingContext = contains(child.flags, 4 /* CREATES_REAL_STACKING_CONTEXT */);
	            var createsStackingContext = contains(child.flags, 2 /* CREATES_STACKING_CONTEXT */);
	            var paintContainer = new ElementPaint(child, parent);
	            if (contains(child.styles.display, 2048 /* LIST_ITEM */)) {
	                listItems.push(paintContainer);
	            }
	            var listOwnerItems = contains(child.flags, 8 /* IS_LIST_OWNER */) ? [] : listItems;
	            if (treatAsRealStackingContext || createsStackingContext) {
	                var parentStack = treatAsRealStackingContext || child.styles.isPositioned() ? realStackingContext : stackingContext;
	                var stack = new StackingContext(paintContainer);
	                if (child.styles.isPositioned() || child.styles.opacity < 1 || child.styles.isTransformed()) {
	                    var order_1 = child.styles.zIndex.order;
	                    if (order_1 < 0) {
	                        var index_1 = 0;
	                        parentStack.negativeZIndex.some(function (current, i) {
	                            if (order_1 > current.element.container.styles.zIndex.order) {
	                                index_1 = i;
	                                return false;
	                            }
	                            else if (index_1 > 0) {
	                                return true;
	                            }
	                            return false;
	                        });
	                        parentStack.negativeZIndex.splice(index_1, 0, stack);
	                    }
	                    else if (order_1 > 0) {
	                        var index_2 = 0;
	                        parentStack.positiveZIndex.some(function (current, i) {
	                            if (order_1 >= current.element.container.styles.zIndex.order) {
	                                index_2 = i + 1;
	                                return false;
	                            }
	                            else if (index_2 > 0) {
	                                return true;
	                            }
	                            return false;
	                        });
	                        parentStack.positiveZIndex.splice(index_2, 0, stack);
	                    }
	                    else {
	                        parentStack.zeroOrAutoZIndexOrTransformedOrOpacity.push(stack);
	                    }
	                }
	                else {
	                    if (child.styles.isFloating()) {
	                        parentStack.nonPositionedFloats.push(stack);
	                    }
	                    else {
	                        parentStack.nonPositionedInlineLevel.push(stack);
	                    }
	                }
	                parseStackTree(paintContainer, stack, treatAsRealStackingContext ? stack : realStackingContext, listOwnerItems);
	            }
	            else {
	                if (child.styles.isInlineLevel()) {
	                    stackingContext.inlineLevel.push(paintContainer);
	                }
	                else {
	                    stackingContext.nonInlineLevel.push(paintContainer);
	                }
	                parseStackTree(paintContainer, stackingContext, realStackingContext, listOwnerItems);
	            }
	            if (contains(child.flags, 8 /* IS_LIST_OWNER */)) {
	                processListItems(child, listOwnerItems);
	            }
	        });
	    };
	    var processListItems = function (owner, elements) {
	        var numbering = owner instanceof OLElementContainer ? owner.start : 1;
	        var reversed = owner instanceof OLElementContainer ? owner.reversed : false;
	        for (var i = 0; i < elements.length; i++) {
	            var item = elements[i];
	            if (item.container instanceof LIElementContainer &&
	                typeof item.container.value === 'number' &&
	                item.container.value !== 0) {
	                numbering = item.container.value;
	            }
	            item.listValue = createCounterText(numbering, item.container.styles.listStyleType, true);
	            numbering += reversed ? -1 : 1;
	        }
	    };
	    var parseStackingContexts = function (container) {
	        var paintContainer = new ElementPaint(container, null);
	        var root = new StackingContext(paintContainer);
	        var listItems = [];
	        parseStackTree(paintContainer, root, root, listItems);
	        processListItems(paintContainer.container, listItems);
	        return root;
	    };

	    var parsePathForBorder = function (curves, borderSide) {
	        switch (borderSide) {
	            case 0:
	                return createPathFromCurves(curves.topLeftBorderBox, curves.topLeftPaddingBox, curves.topRightBorderBox, curves.topRightPaddingBox);
	            case 1:
	                return createPathFromCurves(curves.topRightBorderBox, curves.topRightPaddingBox, curves.bottomRightBorderBox, curves.bottomRightPaddingBox);
	            case 2:
	                return createPathFromCurves(curves.bottomRightBorderBox, curves.bottomRightPaddingBox, curves.bottomLeftBorderBox, curves.bottomLeftPaddingBox);
	            case 3:
	            default:
	                return createPathFromCurves(curves.bottomLeftBorderBox, curves.bottomLeftPaddingBox, curves.topLeftBorderBox, curves.topLeftPaddingBox);
	        }
	    };
	    var parsePathForBorderDoubleOuter = function (curves, borderSide) {
	        switch (borderSide) {
	            case 0:
	                return createPathFromCurves(curves.topLeftBorderBox, curves.topLeftBorderDoubleOuterBox, curves.topRightBorderBox, curves.topRightBorderDoubleOuterBox);
	            case 1:
	                return createPathFromCurves(curves.topRightBorderBox, curves.topRightBorderDoubleOuterBox, curves.bottomRightBorderBox, curves.bottomRightBorderDoubleOuterBox);
	            case 2:
	                return createPathFromCurves(curves.bottomRightBorderBox, curves.bottomRightBorderDoubleOuterBox, curves.bottomLeftBorderBox, curves.bottomLeftBorderDoubleOuterBox);
	            case 3:
	            default:
	                return createPathFromCurves(curves.bottomLeftBorderBox, curves.bottomLeftBorderDoubleOuterBox, curves.topLeftBorderBox, curves.topLeftBorderDoubleOuterBox);
	        }
	    };
	    var parsePathForBorderDoubleInner = function (curves, borderSide) {
	        switch (borderSide) {
	            case 0:
	                return createPathFromCurves(curves.topLeftBorderDoubleInnerBox, curves.topLeftPaddingBox, curves.topRightBorderDoubleInnerBox, curves.topRightPaddingBox);
	            case 1:
	                return createPathFromCurves(curves.topRightBorderDoubleInnerBox, curves.topRightPaddingBox, curves.bottomRightBorderDoubleInnerBox, curves.bottomRightPaddingBox);
	            case 2:
	                return createPathFromCurves(curves.bottomRightBorderDoubleInnerBox, curves.bottomRightPaddingBox, curves.bottomLeftBorderDoubleInnerBox, curves.bottomLeftPaddingBox);
	            case 3:
	            default:
	                return createPathFromCurves(curves.bottomLeftBorderDoubleInnerBox, curves.bottomLeftPaddingBox, curves.topLeftBorderDoubleInnerBox, curves.topLeftPaddingBox);
	        }
	    };
	    var parsePathForBorderStroke = function (curves, borderSide) {
	        switch (borderSide) {
	            case 0:
	                return createStrokePathFromCurves(curves.topLeftBorderStroke, curves.topRightBorderStroke);
	            case 1:
	                return createStrokePathFromCurves(curves.topRightBorderStroke, curves.bottomRightBorderStroke);
	            case 2:
	                return createStrokePathFromCurves(curves.bottomRightBorderStroke, curves.bottomLeftBorderStroke);
	            case 3:
	            default:
	                return createStrokePathFromCurves(curves.bottomLeftBorderStroke, curves.topLeftBorderStroke);
	        }
	    };
	    var createStrokePathFromCurves = function (outer1, outer2) {
	        var path = [];
	        if (isBezierCurve(outer1)) {
	            path.push(outer1.subdivide(0.5, false));
	        }
	        else {
	            path.push(outer1);
	        }
	        if (isBezierCurve(outer2)) {
	            path.push(outer2.subdivide(0.5, true));
	        }
	        else {
	            path.push(outer2);
	        }
	        return path;
	    };
	    var createPathFromCurves = function (outer1, inner1, outer2, inner2) {
	        var path = [];
	        if (isBezierCurve(outer1)) {
	            path.push(outer1.subdivide(0.5, false));
	        }
	        else {
	            path.push(outer1);
	        }
	        if (isBezierCurve(outer2)) {
	            path.push(outer2.subdivide(0.5, true));
	        }
	        else {
	            path.push(outer2);
	        }
	        if (isBezierCurve(inner2)) {
	            path.push(inner2.subdivide(0.5, true).reverse());
	        }
	        else {
	            path.push(inner2);
	        }
	        if (isBezierCurve(inner1)) {
	            path.push(inner1.subdivide(0.5, false).reverse());
	        }
	        else {
	            path.push(inner1);
	        }
	        return path;
	    };

	    var paddingBox = function (element) {
	        var bounds = element.bounds;
	        var styles = element.styles;
	        return bounds.add(styles.borderLeftWidth, styles.borderTopWidth, -(styles.borderRightWidth + styles.borderLeftWidth), -(styles.borderTopWidth + styles.borderBottomWidth));
	    };
	    var contentBox = function (element) {
	        var styles = element.styles;
	        var bounds = element.bounds;
	        var paddingLeft = getAbsoluteValue(styles.paddingLeft, bounds.width);
	        var paddingRight = getAbsoluteValue(styles.paddingRight, bounds.width);
	        var paddingTop = getAbsoluteValue(styles.paddingTop, bounds.width);
	        var paddingBottom = getAbsoluteValue(styles.paddingBottom, bounds.width);
	        return bounds.add(paddingLeft + styles.borderLeftWidth, paddingTop + styles.borderTopWidth, -(styles.borderRightWidth + styles.borderLeftWidth + paddingLeft + paddingRight), -(styles.borderTopWidth + styles.borderBottomWidth + paddingTop + paddingBottom));
	    };

	    var calculateBackgroundPositioningArea = function (backgroundOrigin, element) {
	        if (backgroundOrigin === 0 /* BORDER_BOX */) {
	            return element.bounds;
	        }
	        if (backgroundOrigin === 2 /* CONTENT_BOX */) {
	            return contentBox(element);
	        }
	        return paddingBox(element);
	    };
	    var calculateBackgroundPaintingArea = function (backgroundClip, element) {
	        if (backgroundClip === 0 /* BORDER_BOX */) {
	            return element.bounds;
	        }
	        if (backgroundClip === 2 /* CONTENT_BOX */) {
	            return contentBox(element);
	        }
	        return paddingBox(element);
	    };
	    var calculateBackgroundRendering = function (container, index, intrinsicSize) {
	        var backgroundPositioningArea = calculateBackgroundPositioningArea(getBackgroundValueForIndex(container.styles.backgroundOrigin, index), container);
	        var backgroundPaintingArea = calculateBackgroundPaintingArea(getBackgroundValueForIndex(container.styles.backgroundClip, index), container);
	        var backgroundImageSize = calculateBackgroundSize(getBackgroundValueForIndex(container.styles.backgroundSize, index), intrinsicSize, backgroundPositioningArea);
	        var sizeWidth = backgroundImageSize[0], sizeHeight = backgroundImageSize[1];
	        var position = getAbsoluteValueForTuple(getBackgroundValueForIndex(container.styles.backgroundPosition, index), backgroundPositioningArea.width - sizeWidth, backgroundPositioningArea.height - sizeHeight);
	        var path = calculateBackgroundRepeatPath(getBackgroundValueForIndex(container.styles.backgroundRepeat, index), position, backgroundImageSize, backgroundPositioningArea, backgroundPaintingArea);
	        var offsetX = Math.round(backgroundPositioningArea.left + position[0]);
	        var offsetY = Math.round(backgroundPositioningArea.top + position[1]);
	        return [path, offsetX, offsetY, sizeWidth, sizeHeight];
	    };
	    var isAuto = function (token) { return isIdentToken(token) && token.value === BACKGROUND_SIZE.AUTO; };
	    var hasIntrinsicValue = function (value) { return typeof value === 'number'; };
	    var calculateBackgroundSize = function (size, _a, bounds) {
	        var intrinsicWidth = _a[0], intrinsicHeight = _a[1], intrinsicProportion = _a[2];
	        var first = size[0], second = size[1];
	        if (!first) {
	            return [0, 0];
	        }
	        if (isLengthPercentage(first) && second && isLengthPercentage(second)) {
	            return [getAbsoluteValue(first, bounds.width), getAbsoluteValue(second, bounds.height)];
	        }
	        var hasIntrinsicProportion = hasIntrinsicValue(intrinsicProportion);
	        if (isIdentToken(first) && (first.value === BACKGROUND_SIZE.CONTAIN || first.value === BACKGROUND_SIZE.COVER)) {
	            if (hasIntrinsicValue(intrinsicProportion)) {
	                var targetRatio = bounds.width / bounds.height;
	                return targetRatio < intrinsicProportion !== (first.value === BACKGROUND_SIZE.COVER)
	                    ? [bounds.width, bounds.width / intrinsicProportion]
	                    : [bounds.height * intrinsicProportion, bounds.height];
	            }
	            return [bounds.width, bounds.height];
	        }
	        var hasIntrinsicWidth = hasIntrinsicValue(intrinsicWidth);
	        var hasIntrinsicHeight = hasIntrinsicValue(intrinsicHeight);
	        var hasIntrinsicDimensions = hasIntrinsicWidth || hasIntrinsicHeight;
	        // If the background-size is auto or auto auto:
	        if (isAuto(first) && (!second || isAuto(second))) {
	            // If the image has both horizontal and vertical intrinsic dimensions, it's rendered at that size.
	            if (hasIntrinsicWidth && hasIntrinsicHeight) {
	                return [intrinsicWidth, intrinsicHeight];
	            }
	            // If the image has no intrinsic dimensions and has no intrinsic proportions,
	            // it's rendered at the size of the background positioning area.
	            if (!hasIntrinsicProportion && !hasIntrinsicDimensions) {
	                return [bounds.width, bounds.height];
	            }
	            // TODO If the image has no intrinsic dimensions but has intrinsic proportions, it's rendered as if contain had been specified instead.
	            // If the image has only one intrinsic dimension and has intrinsic proportions, it's rendered at the size corresponding to that one dimension.
	            // The other dimension is computed using the specified dimension and the intrinsic proportions.
	            if (hasIntrinsicDimensions && hasIntrinsicProportion) {
	                var width_1 = hasIntrinsicWidth
	                    ? intrinsicWidth
	                    : intrinsicHeight * intrinsicProportion;
	                var height_1 = hasIntrinsicHeight
	                    ? intrinsicHeight
	                    : intrinsicWidth / intrinsicProportion;
	                return [width_1, height_1];
	            }
	            // If the image has only one intrinsic dimension but has no intrinsic proportions,
	            // it's rendered using the specified dimension and the other dimension of the background positioning area.
	            var width_2 = hasIntrinsicWidth ? intrinsicWidth : bounds.width;
	            var height_2 = hasIntrinsicHeight ? intrinsicHeight : bounds.height;
	            return [width_2, height_2];
	        }
	        // If the image has intrinsic proportions, it's stretched to the specified dimension.
	        // The unspecified dimension is computed using the specified dimension and the intrinsic proportions.
	        if (hasIntrinsicProportion) {
	            var width_3 = 0;
	            var height_3 = 0;
	            if (isLengthPercentage(first)) {
	                width_3 = getAbsoluteValue(first, bounds.width);
	            }
	            else if (isLengthPercentage(second)) {
	                height_3 = getAbsoluteValue(second, bounds.height);
	            }
	            if (isAuto(first)) {
	                width_3 = height_3 * intrinsicProportion;
	            }
	            else if (!second || isAuto(second)) {
	                height_3 = width_3 / intrinsicProportion;
	            }
	            return [width_3, height_3];
	        }
	        // If the image has no intrinsic proportions, it's stretched to the specified dimension.
	        // The unspecified dimension is computed using the image's corresponding intrinsic dimension,
	        // if there is one. If there is no such intrinsic dimension,
	        // it becomes the corresponding dimension of the background positioning area.
	        var width = null;
	        var height = null;
	        if (isLengthPercentage(first)) {
	            width = getAbsoluteValue(first, bounds.width);
	        }
	        else if (second && isLengthPercentage(second)) {
	            height = getAbsoluteValue(second, bounds.height);
	        }
	        if (width !== null && (!second || isAuto(second))) {
	            height =
	                hasIntrinsicWidth && hasIntrinsicHeight
	                    ? (width / intrinsicWidth) * intrinsicHeight
	                    : bounds.height;
	        }
	        if (height !== null && isAuto(first)) {
	            width =
	                hasIntrinsicWidth && hasIntrinsicHeight
	                    ? (height / intrinsicHeight) * intrinsicWidth
	                    : bounds.width;
	        }
	        if (width !== null && height !== null) {
	            return [width, height];
	        }
	        throw new Error("Unable to calculate background-size for element");
	    };
	    var getBackgroundValueForIndex = function (values, index) {
	        var value = values[index];
	        if (typeof value === 'undefined') {
	            return values[0];
	        }
	        return value;
	    };
	    var calculateBackgroundRepeatPath = function (repeat, _a, _b, backgroundPositioningArea, backgroundPaintingArea) {
	        var x = _a[0], y = _a[1];
	        var width = _b[0], height = _b[1];
	        switch (repeat) {
	            case 2 /* REPEAT_X */:
	                return [
	                    new Vector(Math.round(backgroundPositioningArea.left), Math.round(backgroundPositioningArea.top + y)),
	                    new Vector(Math.round(backgroundPositioningArea.left + backgroundPositioningArea.width), Math.round(backgroundPositioningArea.top + y)),
	                    new Vector(Math.round(backgroundPositioningArea.left + backgroundPositioningArea.width), Math.round(height + backgroundPositioningArea.top + y)),
	                    new Vector(Math.round(backgroundPositioningArea.left), Math.round(height + backgroundPositioningArea.top + y))
	                ];
	            case 3 /* REPEAT_Y */:
	                return [
	                    new Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.top)),
	                    new Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.top)),
	                    new Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.height + backgroundPositioningArea.top)),
	                    new Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.height + backgroundPositioningArea.top))
	                ];
	            case 1 /* NO_REPEAT */:
	                return [
	                    new Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.top + y)),
	                    new Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.top + y)),
	                    new Vector(Math.round(backgroundPositioningArea.left + x + width), Math.round(backgroundPositioningArea.top + y + height)),
	                    new Vector(Math.round(backgroundPositioningArea.left + x), Math.round(backgroundPositioningArea.top + y + height))
	                ];
	            default:
	                return [
	                    new Vector(Math.round(backgroundPaintingArea.left), Math.round(backgroundPaintingArea.top)),
	                    new Vector(Math.round(backgroundPaintingArea.left + backgroundPaintingArea.width), Math.round(backgroundPaintingArea.top)),
	                    new Vector(Math.round(backgroundPaintingArea.left + backgroundPaintingArea.width), Math.round(backgroundPaintingArea.height + backgroundPaintingArea.top)),
	                    new Vector(Math.round(backgroundPaintingArea.left), Math.round(backgroundPaintingArea.height + backgroundPaintingArea.top))
	                ];
	        }
	    };

	    var SMALL_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

	    var SAMPLE_TEXT = 'Hidden Text';
	    var FontMetrics = /** @class */ (function () {
	        function FontMetrics(document) {
	            this._data = {};
	            this._document = document;
	        }
	        FontMetrics.prototype.parseMetrics = function (fontFamily, fontSize) {
	            var container = this._document.createElement('div');
	            var img = this._document.createElement('img');
	            var span = this._document.createElement('span');
	            var body = this._document.body;
	            container.style.visibility = 'hidden';
	            container.style.fontFamily = fontFamily;
	            container.style.fontSize = fontSize;
	            container.style.margin = '0';
	            container.style.padding = '0';
	            container.style.whiteSpace = 'nowrap';
	            body.appendChild(container);
	            img.src = SMALL_IMAGE;
	            img.width = 1;
	            img.height = 1;
	            img.style.margin = '0';
	            img.style.padding = '0';
	            img.style.verticalAlign = 'baseline';
	            span.style.fontFamily = fontFamily;
	            span.style.fontSize = fontSize;
	            span.style.margin = '0';
	            span.style.padding = '0';
	            span.appendChild(this._document.createTextNode(SAMPLE_TEXT));
	            container.appendChild(span);
	            container.appendChild(img);
	            var baseline = img.offsetTop - span.offsetTop + 2;
	            container.removeChild(span);
	            container.appendChild(this._document.createTextNode(SAMPLE_TEXT));
	            container.style.lineHeight = 'normal';
	            img.style.verticalAlign = 'super';
	            var middle = img.offsetTop - container.offsetTop + 2;
	            body.removeChild(container);
	            return { baseline: baseline, middle: middle };
	        };
	        FontMetrics.prototype.getMetrics = function (fontFamily, fontSize) {
	            var key = fontFamily + " " + fontSize;
	            if (typeof this._data[key] === 'undefined') {
	                this._data[key] = this.parseMetrics(fontFamily, fontSize);
	            }
	            return this._data[key];
	        };
	        return FontMetrics;
	    }());

	    var Renderer = /** @class */ (function () {
	        function Renderer(context, options) {
	            this.context = context;
	            this.options = options;
	        }
	        return Renderer;
	    }());

	    var MASK_OFFSET = 10000;
	    var CanvasRenderer = /** @class */ (function (_super) {
	        __extends(CanvasRenderer, _super);
	        function CanvasRenderer(context, options) {
	            var _this = _super.call(this, context, options) || this;
	            _this._activeEffects = [];
	            _this.canvas = options.canvas ? options.canvas : document.createElement('canvas');
	            _this.ctx = _this.canvas.getContext('2d');
	            if (!options.canvas) {
	                _this.canvas.width = Math.floor(options.width * options.scale);
	                _this.canvas.height = Math.floor(options.height * options.scale);
	                _this.canvas.style.width = options.width + "px";
	                _this.canvas.style.height = options.height + "px";
	            }
	            _this.fontMetrics = new FontMetrics(document);
	            _this.ctx.scale(_this.options.scale, _this.options.scale);
	            _this.ctx.translate(-options.x, -options.y);
	            _this.ctx.textBaseline = 'bottom';
	            _this._activeEffects = [];
	            _this.context.logger.debug("Canvas renderer initialized (" + options.width + "x" + options.height + ") with scale " + options.scale);
	            return _this;
	        }
	        CanvasRenderer.prototype.applyEffects = function (effects) {
	            var _this = this;
	            while (this._activeEffects.length) {
	                this.popEffect();
	            }
	            effects.forEach(function (effect) { return _this.applyEffect(effect); });
	        };
	        CanvasRenderer.prototype.applyEffect = function (effect) {
	            this.ctx.save();
	            if (isOpacityEffect(effect)) {
	                this.ctx.globalAlpha = effect.opacity;
	            }
	            if (isTransformEffect(effect)) {
	                this.ctx.translate(effect.offsetX, effect.offsetY);
	                this.ctx.transform(effect.matrix[0], effect.matrix[1], effect.matrix[2], effect.matrix[3], effect.matrix[4], effect.matrix[5]);
	                this.ctx.translate(-effect.offsetX, -effect.offsetY);
	            }
	            if (isClipEffect(effect)) {
	                this.path(effect.path);
	                this.ctx.clip();
	            }
	            this._activeEffects.push(effect);
	        };
	        CanvasRenderer.prototype.popEffect = function () {
	            this._activeEffects.pop();
	            this.ctx.restore();
	        };
	        CanvasRenderer.prototype.renderStack = function (stack) {
	            return __awaiter(this, void 0, void 0, function () {
	                var styles;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            styles = stack.element.container.styles;
	                            if (!styles.isVisible()) return [3 /*break*/, 2];
	                            return [4 /*yield*/, this.renderStackContent(stack)];
	                        case 1:
	                            _a.sent();
	                            _a.label = 2;
	                        case 2: return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderNode = function (paint) {
	            return __awaiter(this, void 0, void 0, function () {
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            if (contains(paint.container.flags, 16 /* DEBUG_RENDER */)) {
	                                debugger;
	                            }
	                            if (!paint.container.styles.isVisible()) return [3 /*break*/, 3];
	                            return [4 /*yield*/, this.renderNodeBackgroundAndBorders(paint)];
	                        case 1:
	                            _a.sent();
	                            return [4 /*yield*/, this.renderNodeContent(paint)];
	                        case 2:
	                            _a.sent();
	                            _a.label = 3;
	                        case 3: return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderTextWithLetterSpacing = function (text, letterSpacing, baseline) {
	            var _this = this;
	            if (letterSpacing === 0) {
	                this.ctx.fillText(text.text, text.bounds.left, text.bounds.top + baseline);
	            }
	            else {
	                var letters = segmentGraphemes(text.text);
	                letters.reduce(function (left, letter) {
	                    _this.ctx.fillText(letter, left, text.bounds.top + baseline);
	                    return left + _this.ctx.measureText(letter).width;
	                }, text.bounds.left);
	            }
	        };
	        CanvasRenderer.prototype.createFontStyle = function (styles) {
	            var fontVariant = styles.fontVariant
	                .filter(function (variant) { return variant === 'normal' || variant === 'small-caps'; })
	                .join('');
	            var fontFamily = fixIOSSystemFonts(styles.fontFamily).join(', ');
	            var fontSize = isDimensionToken(styles.fontSize)
	                ? "" + styles.fontSize.number + styles.fontSize.unit
	                : styles.fontSize.number + "px";
	            return [
	                [styles.fontStyle, fontVariant, styles.fontWeight, fontSize, fontFamily].join(' '),
	                fontFamily,
	                fontSize
	            ];
	        };
	        CanvasRenderer.prototype.renderTextNode = function (text, styles) {
	            return __awaiter(this, void 0, void 0, function () {
	                var _a, font, fontFamily, fontSize, _b, baseline, middle, paintOrder;
	                var _this = this;
	                return __generator(this, function (_c) {
	                    _a = this.createFontStyle(styles), font = _a[0], fontFamily = _a[1], fontSize = _a[2];
	                    this.ctx.font = font;
	                    this.ctx.direction = styles.direction === 1 /* RTL */ ? 'rtl' : 'ltr';
	                    this.ctx.textAlign = 'left';
	                    this.ctx.textBaseline = 'alphabetic';
	                    _b = this.fontMetrics.getMetrics(fontFamily, fontSize), baseline = _b.baseline, middle = _b.middle;
	                    paintOrder = styles.paintOrder;
	                    text.textBounds.forEach(function (text) {
	                        paintOrder.forEach(function (paintOrderLayer) {
	                            switch (paintOrderLayer) {
	                                case 0 /* FILL */:
	                                    _this.ctx.fillStyle = asString(styles.color);
	                                    _this.renderTextWithLetterSpacing(text, styles.letterSpacing, baseline);
	                                    var textShadows = styles.textShadow;
	                                    if (textShadows.length && text.text.trim().length) {
	                                        textShadows
	                                            .slice(0)
	                                            .reverse()
	                                            .forEach(function (textShadow) {
	                                            _this.ctx.shadowColor = asString(textShadow.color);
	                                            _this.ctx.shadowOffsetX = textShadow.offsetX.number * _this.options.scale;
	                                            _this.ctx.shadowOffsetY = textShadow.offsetY.number * _this.options.scale;
	                                            _this.ctx.shadowBlur = textShadow.blur.number;
	                                            _this.renderTextWithLetterSpacing(text, styles.letterSpacing, baseline);
	                                        });
	                                        _this.ctx.shadowColor = '';
	                                        _this.ctx.shadowOffsetX = 0;
	                                        _this.ctx.shadowOffsetY = 0;
	                                        _this.ctx.shadowBlur = 0;
	                                    }
	                                    if (styles.textDecorationLine.length) {
	                                        _this.ctx.fillStyle = asString(styles.textDecorationColor || styles.color);
	                                        styles.textDecorationLine.forEach(function (textDecorationLine) {
	                                            switch (textDecorationLine) {
	                                                case 1 /* UNDERLINE */:
	                                                    // Draws a line at the baseline of the font
	                                                    // TODO As some browsers display the line as more than 1px if the font-size is big,
	                                                    // need to take that into account both in position and size
	                                                    _this.ctx.fillRect(text.bounds.left, Math.round(text.bounds.top + baseline), text.bounds.width, 1);
	                                                    break;
	                                                case 2 /* OVERLINE */:
	                                                    _this.ctx.fillRect(text.bounds.left, Math.round(text.bounds.top), text.bounds.width, 1);
	                                                    break;
	                                                case 3 /* LINE_THROUGH */:
	                                                    // TODO try and find exact position for line-through
	                                                    _this.ctx.fillRect(text.bounds.left, Math.ceil(text.bounds.top + middle), text.bounds.width, 1);
	                                                    break;
	                                            }
	                                        });
	                                    }
	                                    break;
	                                case 1 /* STROKE */:
	                                    if (styles.webkitTextStrokeWidth && text.text.trim().length) {
	                                        _this.ctx.strokeStyle = asString(styles.webkitTextStrokeColor);
	                                        _this.ctx.lineWidth = styles.webkitTextStrokeWidth;
	                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	                                        _this.ctx.lineJoin = !!window.chrome ? 'miter' : 'round';
	                                        _this.ctx.strokeText(text.text, text.bounds.left, text.bounds.top + baseline);
	                                    }
	                                    _this.ctx.strokeStyle = '';
	                                    _this.ctx.lineWidth = 0;
	                                    _this.ctx.lineJoin = 'miter';
	                                    break;
	                            }
	                        });
	                    });
	                    return [2 /*return*/];
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderReplacedElement = function (container, curves, image) {
	            if (image && container.intrinsicWidth > 0 && container.intrinsicHeight > 0) {
	                var box = contentBox(container);
	                var path = calculatePaddingBoxPath(curves);
	                this.path(path);
	                this.ctx.save();
	                this.ctx.clip();
	                this.ctx.drawImage(image, 0, 0, container.intrinsicWidth, container.intrinsicHeight, box.left, box.top, box.width, box.height);
	                this.ctx.restore();
	            }
	        };
	        CanvasRenderer.prototype.renderNodeContent = function (paint) {
	            return __awaiter(this, void 0, void 0, function () {
	                var container, curves, styles, _i, _a, child, image, image, iframeRenderer, canvas, size, _b, fontFamily, fontSize, baseline, bounds, x, textBounds, img, image, url, fontFamily, bounds;
	                return __generator(this, function (_c) {
	                    switch (_c.label) {
	                        case 0:
	                            this.applyEffects(paint.getEffects(4 /* CONTENT */));
	                            container = paint.container;
	                            curves = paint.curves;
	                            styles = container.styles;
	                            _i = 0, _a = container.textNodes;
	                            _c.label = 1;
	                        case 1:
	                            if (!(_i < _a.length)) return [3 /*break*/, 4];
	                            child = _a[_i];
	                            return [4 /*yield*/, this.renderTextNode(child, styles)];
	                        case 2:
	                            _c.sent();
	                            _c.label = 3;
	                        case 3:
	                            _i++;
	                            return [3 /*break*/, 1];
	                        case 4:
	                            if (!(container instanceof ImageElementContainer)) return [3 /*break*/, 8];
	                            _c.label = 5;
	                        case 5:
	                            _c.trys.push([5, 7, , 8]);
	                            return [4 /*yield*/, this.context.cache.match(container.src)];
	                        case 6:
	                            image = _c.sent();
	                            this.renderReplacedElement(container, curves, image);
	                            return [3 /*break*/, 8];
	                        case 7:
	                            _c.sent();
	                            this.context.logger.error("Error loading image " + container.src);
	                            return [3 /*break*/, 8];
	                        case 8:
	                            if (container instanceof CanvasElementContainer) {
	                                this.renderReplacedElement(container, curves, container.canvas);
	                            }
	                            if (!(container instanceof SVGElementContainer)) return [3 /*break*/, 12];
	                            _c.label = 9;
	                        case 9:
	                            _c.trys.push([9, 11, , 12]);
	                            return [4 /*yield*/, this.context.cache.match(container.svg)];
	                        case 10:
	                            image = _c.sent();
	                            this.renderReplacedElement(container, curves, image);
	                            return [3 /*break*/, 12];
	                        case 11:
	                            _c.sent();
	                            this.context.logger.error("Error loading svg " + container.svg.substring(0, 255));
	                            return [3 /*break*/, 12];
	                        case 12:
	                            if (!(container instanceof IFrameElementContainer && container.tree)) return [3 /*break*/, 14];
	                            iframeRenderer = new CanvasRenderer(this.context, {
	                                scale: this.options.scale,
	                                backgroundColor: container.backgroundColor,
	                                x: 0,
	                                y: 0,
	                                width: container.width,
	                                height: container.height
	                            });
	                            return [4 /*yield*/, iframeRenderer.render(container.tree)];
	                        case 13:
	                            canvas = _c.sent();
	                            if (container.width && container.height) {
	                                this.ctx.drawImage(canvas, 0, 0, container.width, container.height, container.bounds.left, container.bounds.top, container.bounds.width, container.bounds.height);
	                            }
	                            _c.label = 14;
	                        case 14:
	                            if (container instanceof InputElementContainer) {
	                                size = Math.min(container.bounds.width, container.bounds.height);
	                                if (container.type === CHECKBOX) {
	                                    if (container.checked) {
	                                        this.ctx.save();
	                                        this.path([
	                                            new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79),
	                                            new Vector(container.bounds.left + size * 0.16, container.bounds.top + size * 0.5549),
	                                            new Vector(container.bounds.left + size * 0.27347, container.bounds.top + size * 0.44071),
	                                            new Vector(container.bounds.left + size * 0.39694, container.bounds.top + size * 0.5649),
	                                            new Vector(container.bounds.left + size * 0.72983, container.bounds.top + size * 0.23),
	                                            new Vector(container.bounds.left + size * 0.84, container.bounds.top + size * 0.34085),
	                                            new Vector(container.bounds.left + size * 0.39363, container.bounds.top + size * 0.79)
	                                        ]);
	                                        this.ctx.fillStyle = asString(INPUT_COLOR);
	                                        this.ctx.fill();
	                                        this.ctx.restore();
	                                    }
	                                }
	                                else if (container.type === RADIO) {
	                                    if (container.checked) {
	                                        this.ctx.save();
	                                        this.ctx.beginPath();
	                                        this.ctx.arc(container.bounds.left + size / 2, container.bounds.top + size / 2, size / 4, 0, Math.PI * 2, true);
	                                        this.ctx.fillStyle = asString(INPUT_COLOR);
	                                        this.ctx.fill();
	                                        this.ctx.restore();
	                                    }
	                                }
	                            }
	                            if (isTextInputElement(container) && container.value.length) {
	                                _b = this.createFontStyle(styles), fontFamily = _b[0], fontSize = _b[1];
	                                baseline = this.fontMetrics.getMetrics(fontFamily, fontSize).baseline;
	                                this.ctx.font = fontFamily;
	                                this.ctx.fillStyle = asString(styles.color);
	                                this.ctx.textBaseline = 'alphabetic';
	                                this.ctx.textAlign = canvasTextAlign(container.styles.textAlign);
	                                bounds = contentBox(container);
	                                x = 0;
	                                switch (container.styles.textAlign) {
	                                    case 1 /* CENTER */:
	                                        x += bounds.width / 2;
	                                        break;
	                                    case 2 /* RIGHT */:
	                                        x += bounds.width;
	                                        break;
	                                }
	                                textBounds = bounds.add(x, 0, 0, -bounds.height / 2 + 1);
	                                this.ctx.save();
	                                this.path([
	                                    new Vector(bounds.left, bounds.top),
	                                    new Vector(bounds.left + bounds.width, bounds.top),
	                                    new Vector(bounds.left + bounds.width, bounds.top + bounds.height),
	                                    new Vector(bounds.left, bounds.top + bounds.height)
	                                ]);
	                                this.ctx.clip();
	                                this.renderTextWithLetterSpacing(new TextBounds(container.value, textBounds), styles.letterSpacing, baseline);
	                                this.ctx.restore();
	                                this.ctx.textBaseline = 'alphabetic';
	                                this.ctx.textAlign = 'left';
	                            }
	                            if (!contains(container.styles.display, 2048 /* LIST_ITEM */)) return [3 /*break*/, 20];
	                            if (!(container.styles.listStyleImage !== null)) return [3 /*break*/, 19];
	                            img = container.styles.listStyleImage;
	                            if (!(img.type === 0 /* URL */)) return [3 /*break*/, 18];
	                            image = void 0;
	                            url = img.url;
	                            _c.label = 15;
	                        case 15:
	                            _c.trys.push([15, 17, , 18]);
	                            return [4 /*yield*/, this.context.cache.match(url)];
	                        case 16:
	                            image = _c.sent();
	                            this.ctx.drawImage(image, container.bounds.left - (image.width + 10), container.bounds.top);
	                            return [3 /*break*/, 18];
	                        case 17:
	                            _c.sent();
	                            this.context.logger.error("Error loading list-style-image " + url);
	                            return [3 /*break*/, 18];
	                        case 18: return [3 /*break*/, 20];
	                        case 19:
	                            if (paint.listValue && container.styles.listStyleType !== -1 /* NONE */) {
	                                fontFamily = this.createFontStyle(styles)[0];
	                                this.ctx.font = fontFamily;
	                                this.ctx.fillStyle = asString(styles.color);
	                                this.ctx.textBaseline = 'middle';
	                                this.ctx.textAlign = 'right';
	                                bounds = new Bounds(container.bounds.left, container.bounds.top + getAbsoluteValue(container.styles.paddingTop, container.bounds.width), container.bounds.width, computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 1);
	                                this.renderTextWithLetterSpacing(new TextBounds(paint.listValue, bounds), styles.letterSpacing, computeLineHeight(styles.lineHeight, styles.fontSize.number) / 2 + 2);
	                                this.ctx.textBaseline = 'bottom';
	                                this.ctx.textAlign = 'left';
	                            }
	                            _c.label = 20;
	                        case 20: return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderStackContent = function (stack) {
	            return __awaiter(this, void 0, void 0, function () {
	                var _i, _a, child, _b, _c, child, _d, _e, child, _f, _g, child, _h, _j, child, _k, _l, child, _m, _o, child;
	                return __generator(this, function (_p) {
	                    switch (_p.label) {
	                        case 0:
	                            if (contains(stack.element.container.flags, 16 /* DEBUG_RENDER */)) {
	                                debugger;
	                            }
	                            // https://www.w3.org/TR/css-position-3/#painting-order
	                            // 1. the background and borders of the element forming the stacking context.
	                            return [4 /*yield*/, this.renderNodeBackgroundAndBorders(stack.element)];
	                        case 1:
	                            // https://www.w3.org/TR/css-position-3/#painting-order
	                            // 1. the background and borders of the element forming the stacking context.
	                            _p.sent();
	                            _i = 0, _a = stack.negativeZIndex;
	                            _p.label = 2;
	                        case 2:
	                            if (!(_i < _a.length)) return [3 /*break*/, 5];
	                            child = _a[_i];
	                            return [4 /*yield*/, this.renderStack(child)];
	                        case 3:
	                            _p.sent();
	                            _p.label = 4;
	                        case 4:
	                            _i++;
	                            return [3 /*break*/, 2];
	                        case 5: 
	                        // 3. For all its in-flow, non-positioned, block-level descendants in tree order:
	                        return [4 /*yield*/, this.renderNodeContent(stack.element)];
	                        case 6:
	                            // 3. For all its in-flow, non-positioned, block-level descendants in tree order:
	                            _p.sent();
	                            _b = 0, _c = stack.nonInlineLevel;
	                            _p.label = 7;
	                        case 7:
	                            if (!(_b < _c.length)) return [3 /*break*/, 10];
	                            child = _c[_b];
	                            return [4 /*yield*/, this.renderNode(child)];
	                        case 8:
	                            _p.sent();
	                            _p.label = 9;
	                        case 9:
	                            _b++;
	                            return [3 /*break*/, 7];
	                        case 10:
	                            _d = 0, _e = stack.nonPositionedFloats;
	                            _p.label = 11;
	                        case 11:
	                            if (!(_d < _e.length)) return [3 /*break*/, 14];
	                            child = _e[_d];
	                            return [4 /*yield*/, this.renderStack(child)];
	                        case 12:
	                            _p.sent();
	                            _p.label = 13;
	                        case 13:
	                            _d++;
	                            return [3 /*break*/, 11];
	                        case 14:
	                            _f = 0, _g = stack.nonPositionedInlineLevel;
	                            _p.label = 15;
	                        case 15:
	                            if (!(_f < _g.length)) return [3 /*break*/, 18];
	                            child = _g[_f];
	                            return [4 /*yield*/, this.renderStack(child)];
	                        case 16:
	                            _p.sent();
	                            _p.label = 17;
	                        case 17:
	                            _f++;
	                            return [3 /*break*/, 15];
	                        case 18:
	                            _h = 0, _j = stack.inlineLevel;
	                            _p.label = 19;
	                        case 19:
	                            if (!(_h < _j.length)) return [3 /*break*/, 22];
	                            child = _j[_h];
	                            return [4 /*yield*/, this.renderNode(child)];
	                        case 20:
	                            _p.sent();
	                            _p.label = 21;
	                        case 21:
	                            _h++;
	                            return [3 /*break*/, 19];
	                        case 22:
	                            _k = 0, _l = stack.zeroOrAutoZIndexOrTransformedOrOpacity;
	                            _p.label = 23;
	                        case 23:
	                            if (!(_k < _l.length)) return [3 /*break*/, 26];
	                            child = _l[_k];
	                            return [4 /*yield*/, this.renderStack(child)];
	                        case 24:
	                            _p.sent();
	                            _p.label = 25;
	                        case 25:
	                            _k++;
	                            return [3 /*break*/, 23];
	                        case 26:
	                            _m = 0, _o = stack.positiveZIndex;
	                            _p.label = 27;
	                        case 27:
	                            if (!(_m < _o.length)) return [3 /*break*/, 30];
	                            child = _o[_m];
	                            return [4 /*yield*/, this.renderStack(child)];
	                        case 28:
	                            _p.sent();
	                            _p.label = 29;
	                        case 29:
	                            _m++;
	                            return [3 /*break*/, 27];
	                        case 30: return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.mask = function (paths) {
	            this.ctx.beginPath();
	            this.ctx.moveTo(0, 0);
	            this.ctx.lineTo(this.canvas.width, 0);
	            this.ctx.lineTo(this.canvas.width, this.canvas.height);
	            this.ctx.lineTo(0, this.canvas.height);
	            this.ctx.lineTo(0, 0);
	            this.formatPath(paths.slice(0).reverse());
	            this.ctx.closePath();
	        };
	        CanvasRenderer.prototype.path = function (paths) {
	            this.ctx.beginPath();
	            this.formatPath(paths);
	            this.ctx.closePath();
	        };
	        CanvasRenderer.prototype.formatPath = function (paths) {
	            var _this = this;
	            paths.forEach(function (point, index) {
	                var start = isBezierCurve(point) ? point.start : point;
	                if (index === 0) {
	                    _this.ctx.moveTo(start.x, start.y);
	                }
	                else {
	                    _this.ctx.lineTo(start.x, start.y);
	                }
	                if (isBezierCurve(point)) {
	                    _this.ctx.bezierCurveTo(point.startControl.x, point.startControl.y, point.endControl.x, point.endControl.y, point.end.x, point.end.y);
	                }
	            });
	        };
	        CanvasRenderer.prototype.renderRepeat = function (path, pattern, offsetX, offsetY) {
	            this.path(path);
	            this.ctx.fillStyle = pattern;
	            this.ctx.translate(offsetX, offsetY);
	            this.ctx.fill();
	            this.ctx.translate(-offsetX, -offsetY);
	        };
	        CanvasRenderer.prototype.resizeImage = function (image, width, height) {
	            var _a;
	            if (image.width === width && image.height === height) {
	                return image;
	            }
	            var ownerDocument = (_a = this.canvas.ownerDocument) !== null && _a !== void 0 ? _a : document;
	            var canvas = ownerDocument.createElement('canvas');
	            canvas.width = Math.max(1, width);
	            canvas.height = Math.max(1, height);
	            var ctx = canvas.getContext('2d');
	            ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
	            return canvas;
	        };
	        CanvasRenderer.prototype.renderBackgroundImage = function (container) {
	            return __awaiter(this, void 0, void 0, function () {
	                var index, _loop_1, this_1, _i, _a, backgroundImage;
	                return __generator(this, function (_b) {
	                    switch (_b.label) {
	                        case 0:
	                            index = container.styles.backgroundImage.length - 1;
	                            _loop_1 = function (backgroundImage) {
	                                var image, url, _c, path, x, y, width, height, pattern, _d, path, x, y, width, height, _e, lineLength, x0, x1, y0, y1, canvas, ctx, gradient_1, pattern, _f, path, left, top_1, width, height, position, x, y, _g, rx, ry, radialGradient_1, midX, midY, f, invF;
	                                return __generator(this, function (_h) {
	                                    switch (_h.label) {
	                                        case 0:
	                                            if (!(backgroundImage.type === 0 /* URL */)) return [3 /*break*/, 5];
	                                            image = void 0;
	                                            url = backgroundImage.url;
	                                            _h.label = 1;
	                                        case 1:
	                                            _h.trys.push([1, 3, , 4]);
	                                            return [4 /*yield*/, this_1.context.cache.match(url)];
	                                        case 2:
	                                            image = _h.sent();
	                                            return [3 /*break*/, 4];
	                                        case 3:
	                                            _h.sent();
	                                            this_1.context.logger.error("Error loading background-image " + url);
	                                            return [3 /*break*/, 4];
	                                        case 4:
	                                            if (image) {
	                                                _c = calculateBackgroundRendering(container, index, [
	                                                    image.width,
	                                                    image.height,
	                                                    image.width / image.height
	                                                ]), path = _c[0], x = _c[1], y = _c[2], width = _c[3], height = _c[4];
	                                                pattern = this_1.ctx.createPattern(this_1.resizeImage(image, width, height), 'repeat');
	                                                this_1.renderRepeat(path, pattern, x, y);
	                                            }
	                                            return [3 /*break*/, 6];
	                                        case 5:
	                                            if (isLinearGradient(backgroundImage)) {
	                                                _d = calculateBackgroundRendering(container, index, [null, null, null]), path = _d[0], x = _d[1], y = _d[2], width = _d[3], height = _d[4];
	                                                _e = calculateGradientDirection(backgroundImage.angle, width, height), lineLength = _e[0], x0 = _e[1], x1 = _e[2], y0 = _e[3], y1 = _e[4];
	                                                canvas = document.createElement('canvas');
	                                                canvas.width = width;
	                                                canvas.height = height;
	                                                ctx = canvas.getContext('2d');
	                                                gradient_1 = ctx.createLinearGradient(x0, y0, x1, y1);
	                                                processColorStops(backgroundImage.stops, lineLength).forEach(function (colorStop) {
	                                                    return gradient_1.addColorStop(colorStop.stop, asString(colorStop.color));
	                                                });
	                                                ctx.fillStyle = gradient_1;
	                                                ctx.fillRect(0, 0, width, height);
	                                                if (width > 0 && height > 0) {
	                                                    pattern = this_1.ctx.createPattern(canvas, 'repeat');
	                                                    this_1.renderRepeat(path, pattern, x, y);
	                                                }
	                                            }
	                                            else if (isRadialGradient(backgroundImage)) {
	                                                _f = calculateBackgroundRendering(container, index, [
	                                                    null,
	                                                    null,
	                                                    null
	                                                ]), path = _f[0], left = _f[1], top_1 = _f[2], width = _f[3], height = _f[4];
	                                                position = backgroundImage.position.length === 0 ? [FIFTY_PERCENT] : backgroundImage.position;
	                                                x = getAbsoluteValue(position[0], width);
	                                                y = getAbsoluteValue(position[position.length - 1], height);
	                                                _g = calculateRadius(backgroundImage, x, y, width, height), rx = _g[0], ry = _g[1];
	                                                if (rx > 0 && ry > 0) {
	                                                    radialGradient_1 = this_1.ctx.createRadialGradient(left + x, top_1 + y, 0, left + x, top_1 + y, rx);
	                                                    processColorStops(backgroundImage.stops, rx * 2).forEach(function (colorStop) {
	                                                        return radialGradient_1.addColorStop(colorStop.stop, asString(colorStop.color));
	                                                    });
	                                                    this_1.path(path);
	                                                    this_1.ctx.fillStyle = radialGradient_1;
	                                                    if (rx !== ry) {
	                                                        midX = container.bounds.left + 0.5 * container.bounds.width;
	                                                        midY = container.bounds.top + 0.5 * container.bounds.height;
	                                                        f = ry / rx;
	                                                        invF = 1 / f;
	                                                        this_1.ctx.save();
	                                                        this_1.ctx.translate(midX, midY);
	                                                        this_1.ctx.transform(1, 0, 0, f, 0, 0);
	                                                        this_1.ctx.translate(-midX, -midY);
	                                                        this_1.ctx.fillRect(left, invF * (top_1 - midY) + midY, width, height * invF);
	                                                        this_1.ctx.restore();
	                                                    }
	                                                    else {
	                                                        this_1.ctx.fill();
	                                                    }
	                                                }
	                                            }
	                                            _h.label = 6;
	                                        case 6:
	                                            index--;
	                                            return [2 /*return*/];
	                                    }
	                                });
	                            };
	                            this_1 = this;
	                            _i = 0, _a = container.styles.backgroundImage.slice(0).reverse();
	                            _b.label = 1;
	                        case 1:
	                            if (!(_i < _a.length)) return [3 /*break*/, 4];
	                            backgroundImage = _a[_i];
	                            return [5 /*yield**/, _loop_1(backgroundImage)];
	                        case 2:
	                            _b.sent();
	                            _b.label = 3;
	                        case 3:
	                            _i++;
	                            return [3 /*break*/, 1];
	                        case 4: return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderSolidBorder = function (color, side, curvePoints) {
	            return __awaiter(this, void 0, void 0, function () {
	                return __generator(this, function (_a) {
	                    this.path(parsePathForBorder(curvePoints, side));
	                    this.ctx.fillStyle = asString(color);
	                    this.ctx.fill();
	                    return [2 /*return*/];
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderDoubleBorder = function (color, width, side, curvePoints) {
	            return __awaiter(this, void 0, void 0, function () {
	                var outerPaths, innerPaths;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            if (!(width < 3)) return [3 /*break*/, 2];
	                            return [4 /*yield*/, this.renderSolidBorder(color, side, curvePoints)];
	                        case 1:
	                            _a.sent();
	                            return [2 /*return*/];
	                        case 2:
	                            outerPaths = parsePathForBorderDoubleOuter(curvePoints, side);
	                            this.path(outerPaths);
	                            this.ctx.fillStyle = asString(color);
	                            this.ctx.fill();
	                            innerPaths = parsePathForBorderDoubleInner(curvePoints, side);
	                            this.path(innerPaths);
	                            this.ctx.fill();
	                            return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderNodeBackgroundAndBorders = function (paint) {
	            return __awaiter(this, void 0, void 0, function () {
	                var styles, hasBackground, borders, backgroundPaintingArea, side, _i, borders_1, border;
	                var _this = this;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            this.applyEffects(paint.getEffects(2 /* BACKGROUND_BORDERS */));
	                            styles = paint.container.styles;
	                            hasBackground = !isTransparent(styles.backgroundColor) || styles.backgroundImage.length;
	                            borders = [
	                                { style: styles.borderTopStyle, color: styles.borderTopColor, width: styles.borderTopWidth },
	                                { style: styles.borderRightStyle, color: styles.borderRightColor, width: styles.borderRightWidth },
	                                { style: styles.borderBottomStyle, color: styles.borderBottomColor, width: styles.borderBottomWidth },
	                                { style: styles.borderLeftStyle, color: styles.borderLeftColor, width: styles.borderLeftWidth }
	                            ];
	                            backgroundPaintingArea = calculateBackgroundCurvedPaintingArea(getBackgroundValueForIndex(styles.backgroundClip, 0), paint.curves);
	                            if (!(hasBackground || styles.boxShadow.length)) return [3 /*break*/, 2];
	                            this.ctx.save();
	                            this.path(backgroundPaintingArea);
	                            this.ctx.clip();
	                            if (!isTransparent(styles.backgroundColor)) {
	                                this.ctx.fillStyle = asString(styles.backgroundColor);
	                                this.ctx.fill();
	                            }
	                            return [4 /*yield*/, this.renderBackgroundImage(paint.container)];
	                        case 1:
	                            _a.sent();
	                            this.ctx.restore();
	                            styles.boxShadow
	                                .slice(0)
	                                .reverse()
	                                .forEach(function (shadow) {
	                                _this.ctx.save();
	                                var borderBoxArea = calculateBorderBoxPath(paint.curves);
	                                var maskOffset = shadow.inset ? 0 : MASK_OFFSET;
	                                var shadowPaintingArea = transformPath(borderBoxArea, -maskOffset + (shadow.inset ? 1 : -1) * shadow.spread.number, (shadow.inset ? 1 : -1) * shadow.spread.number, shadow.spread.number * (shadow.inset ? -2 : 2), shadow.spread.number * (shadow.inset ? -2 : 2));
	                                if (shadow.inset) {
	                                    _this.path(borderBoxArea);
	                                    _this.ctx.clip();
	                                    _this.mask(shadowPaintingArea);
	                                }
	                                else {
	                                    _this.mask(borderBoxArea);
	                                    _this.ctx.clip();
	                                    _this.path(shadowPaintingArea);
	                                }
	                                _this.ctx.shadowOffsetX = shadow.offsetX.number + maskOffset;
	                                _this.ctx.shadowOffsetY = shadow.offsetY.number;
	                                _this.ctx.shadowColor = asString(shadow.color);
	                                _this.ctx.shadowBlur = shadow.blur.number;
	                                _this.ctx.fillStyle = shadow.inset ? asString(shadow.color) : 'rgba(0,0,0,1)';
	                                _this.ctx.fill();
	                                _this.ctx.restore();
	                            });
	                            _a.label = 2;
	                        case 2:
	                            side = 0;
	                            _i = 0, borders_1 = borders;
	                            _a.label = 3;
	                        case 3:
	                            if (!(_i < borders_1.length)) return [3 /*break*/, 13];
	                            border = borders_1[_i];
	                            if (!(border.style !== 0 /* NONE */ && !isTransparent(border.color) && border.width > 0)) return [3 /*break*/, 11];
	                            if (!(border.style === 2 /* DASHED */)) return [3 /*break*/, 5];
	                            return [4 /*yield*/, this.renderDashedDottedBorder(border.color, border.width, side, paint.curves, 2 /* DASHED */)];
	                        case 4:
	                            _a.sent();
	                            return [3 /*break*/, 11];
	                        case 5:
	                            if (!(border.style === 3 /* DOTTED */)) return [3 /*break*/, 7];
	                            return [4 /*yield*/, this.renderDashedDottedBorder(border.color, border.width, side, paint.curves, 3 /* DOTTED */)];
	                        case 6:
	                            _a.sent();
	                            return [3 /*break*/, 11];
	                        case 7:
	                            if (!(border.style === 4 /* DOUBLE */)) return [3 /*break*/, 9];
	                            return [4 /*yield*/, this.renderDoubleBorder(border.color, border.width, side, paint.curves)];
	                        case 8:
	                            _a.sent();
	                            return [3 /*break*/, 11];
	                        case 9: return [4 /*yield*/, this.renderSolidBorder(border.color, side, paint.curves)];
	                        case 10:
	                            _a.sent();
	                            _a.label = 11;
	                        case 11:
	                            side++;
	                            _a.label = 12;
	                        case 12:
	                            _i++;
	                            return [3 /*break*/, 3];
	                        case 13: return [2 /*return*/];
	                    }
	                });
	            });
	        };
	        CanvasRenderer.prototype.renderDashedDottedBorder = function (color, width, side, curvePoints, style) {
	            return __awaiter(this, void 0, void 0, function () {
	                var strokePaths, boxPaths, startX, startY, endX, endY, length, dashLength, spaceLength, useLineDash, multiplier, numberOfDashes, minSpace, maxSpace, path1, path2, path1, path2;
	                return __generator(this, function (_a) {
	                    this.ctx.save();
	                    strokePaths = parsePathForBorderStroke(curvePoints, side);
	                    boxPaths = parsePathForBorder(curvePoints, side);
	                    if (style === 2 /* DASHED */) {
	                        this.path(boxPaths);
	                        this.ctx.clip();
	                    }
	                    if (isBezierCurve(boxPaths[0])) {
	                        startX = boxPaths[0].start.x;
	                        startY = boxPaths[0].start.y;
	                    }
	                    else {
	                        startX = boxPaths[0].x;
	                        startY = boxPaths[0].y;
	                    }
	                    if (isBezierCurve(boxPaths[1])) {
	                        endX = boxPaths[1].end.x;
	                        endY = boxPaths[1].end.y;
	                    }
	                    else {
	                        endX = boxPaths[1].x;
	                        endY = boxPaths[1].y;
	                    }
	                    if (side === 0 || side === 2) {
	                        length = Math.abs(startX - endX);
	                    }
	                    else {
	                        length = Math.abs(startY - endY);
	                    }
	                    this.ctx.beginPath();
	                    if (style === 3 /* DOTTED */) {
	                        this.formatPath(strokePaths);
	                    }
	                    else {
	                        this.formatPath(boxPaths.slice(0, 2));
	                    }
	                    dashLength = width < 3 ? width * 3 : width * 2;
	                    spaceLength = width < 3 ? width * 2 : width;
	                    if (style === 3 /* DOTTED */) {
	                        dashLength = width;
	                        spaceLength = width;
	                    }
	                    useLineDash = true;
	                    if (length <= dashLength * 2) {
	                        useLineDash = false;
	                    }
	                    else if (length <= dashLength * 2 + spaceLength) {
	                        multiplier = length / (2 * dashLength + spaceLength);
	                        dashLength *= multiplier;
	                        spaceLength *= multiplier;
	                    }
	                    else {
	                        numberOfDashes = Math.floor((length + spaceLength) / (dashLength + spaceLength));
	                        minSpace = (length - numberOfDashes * dashLength) / (numberOfDashes - 1);
	                        maxSpace = (length - (numberOfDashes + 1) * dashLength) / numberOfDashes;
	                        spaceLength =
	                            maxSpace <= 0 || Math.abs(spaceLength - minSpace) < Math.abs(spaceLength - maxSpace)
	                                ? minSpace
	                                : maxSpace;
	                    }
	                    if (useLineDash) {
	                        if (style === 3 /* DOTTED */) {
	                            this.ctx.setLineDash([0, dashLength + spaceLength]);
	                        }
	                        else {
	                            this.ctx.setLineDash([dashLength, spaceLength]);
	                        }
	                    }
	                    if (style === 3 /* DOTTED */) {
	                        this.ctx.lineCap = 'round';
	                        this.ctx.lineWidth = width;
	                    }
	                    else {
	                        this.ctx.lineWidth = width * 2 + 1.1;
	                    }
	                    this.ctx.strokeStyle = asString(color);
	                    this.ctx.stroke();
	                    this.ctx.setLineDash([]);
	                    // dashed round edge gap
	                    if (style === 2 /* DASHED */) {
	                        if (isBezierCurve(boxPaths[0])) {
	                            path1 = boxPaths[3];
	                            path2 = boxPaths[0];
	                            this.ctx.beginPath();
	                            this.formatPath([new Vector(path1.end.x, path1.end.y), new Vector(path2.start.x, path2.start.y)]);
	                            this.ctx.stroke();
	                        }
	                        if (isBezierCurve(boxPaths[1])) {
	                            path1 = boxPaths[1];
	                            path2 = boxPaths[2];
	                            this.ctx.beginPath();
	                            this.formatPath([new Vector(path1.end.x, path1.end.y), new Vector(path2.start.x, path2.start.y)]);
	                            this.ctx.stroke();
	                        }
	                    }
	                    this.ctx.restore();
	                    return [2 /*return*/];
	                });
	            });
	        };
	        CanvasRenderer.prototype.render = function (element) {
	            return __awaiter(this, void 0, void 0, function () {
	                var stack;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            if (this.options.backgroundColor) {
	                                this.ctx.fillStyle = asString(this.options.backgroundColor);
	                                this.ctx.fillRect(this.options.x, this.options.y, this.options.width, this.options.height);
	                            }
	                            stack = parseStackingContexts(element);
	                            return [4 /*yield*/, this.renderStack(stack)];
	                        case 1:
	                            _a.sent();
	                            this.applyEffects([]);
	                            return [2 /*return*/, this.canvas];
	                    }
	                });
	            });
	        };
	        return CanvasRenderer;
	    }(Renderer));
	    var isTextInputElement = function (container) {
	        if (container instanceof TextareaElementContainer) {
	            return true;
	        }
	        else if (container instanceof SelectElementContainer) {
	            return true;
	        }
	        else if (container instanceof InputElementContainer && container.type !== RADIO && container.type !== CHECKBOX) {
	            return true;
	        }
	        return false;
	    };
	    var calculateBackgroundCurvedPaintingArea = function (clip, curves) {
	        switch (clip) {
	            case 0 /* BORDER_BOX */:
	                return calculateBorderBoxPath(curves);
	            case 2 /* CONTENT_BOX */:
	                return calculateContentBoxPath(curves);
	            case 1 /* PADDING_BOX */:
	            default:
	                return calculatePaddingBoxPath(curves);
	        }
	    };
	    var canvasTextAlign = function (textAlign) {
	        switch (textAlign) {
	            case 1 /* CENTER */:
	                return 'center';
	            case 2 /* RIGHT */:
	                return 'right';
	            case 0 /* LEFT */:
	            default:
	                return 'left';
	        }
	    };
	    // see https://github.com/niklasvh/html2canvas/pull/2645
	    var iOSBrokenFonts = ['-apple-system', 'system-ui'];
	    var fixIOSSystemFonts = function (fontFamilies) {
	        return /iPhone OS 15_(0|1)/.test(window.navigator.userAgent)
	            ? fontFamilies.filter(function (fontFamily) { return iOSBrokenFonts.indexOf(fontFamily) === -1; })
	            : fontFamilies;
	    };

	    var ForeignObjectRenderer = /** @class */ (function (_super) {
	        __extends(ForeignObjectRenderer, _super);
	        function ForeignObjectRenderer(context, options) {
	            var _this = _super.call(this, context, options) || this;
	            _this.canvas = options.canvas ? options.canvas : document.createElement('canvas');
	            _this.ctx = _this.canvas.getContext('2d');
	            _this.options = options;
	            _this.canvas.width = Math.floor(options.width * options.scale);
	            _this.canvas.height = Math.floor(options.height * options.scale);
	            _this.canvas.style.width = options.width + "px";
	            _this.canvas.style.height = options.height + "px";
	            _this.ctx.scale(_this.options.scale, _this.options.scale);
	            _this.ctx.translate(-options.x, -options.y);
	            _this.context.logger.debug("EXPERIMENTAL ForeignObject renderer initialized (" + options.width + "x" + options.height + " at " + options.x + "," + options.y + ") with scale " + options.scale);
	            return _this;
	        }
	        ForeignObjectRenderer.prototype.render = function (element) {
	            return __awaiter(this, void 0, void 0, function () {
	                var svg, img;
	                return __generator(this, function (_a) {
	                    switch (_a.label) {
	                        case 0:
	                            svg = createForeignObjectSVG(this.options.width * this.options.scale, this.options.height * this.options.scale, this.options.scale, this.options.scale, element);
	                            return [4 /*yield*/, loadSerializedSVG(svg)];
	                        case 1:
	                            img = _a.sent();
	                            if (this.options.backgroundColor) {
	                                this.ctx.fillStyle = asString(this.options.backgroundColor);
	                                this.ctx.fillRect(0, 0, this.options.width * this.options.scale, this.options.height * this.options.scale);
	                            }
	                            this.ctx.drawImage(img, -this.options.x * this.options.scale, -this.options.y * this.options.scale);
	                            return [2 /*return*/, this.canvas];
	                    }
	                });
	            });
	        };
	        return ForeignObjectRenderer;
	    }(Renderer));
	    var loadSerializedSVG = function (svg) {
	        return new Promise(function (resolve, reject) {
	            var img = new Image();
	            img.onload = function () {
	                resolve(img);
	            };
	            img.onerror = reject;
	            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
	        });
	    };

	    var Logger = /** @class */ (function () {
	        function Logger(_a) {
	            var id = _a.id, enabled = _a.enabled;
	            this.id = id;
	            this.enabled = enabled;
	            this.start = Date.now();
	        }
	        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	        Logger.prototype.debug = function () {
	            var args = [];
	            for (var _i = 0; _i < arguments.length; _i++) {
	                args[_i] = arguments[_i];
	            }
	            if (this.enabled) {
	                // eslint-disable-next-line no-console
	                if (typeof window !== 'undefined' && window.console && typeof console.debug === 'function') {
	                    // eslint-disable-next-line no-console
	                    console.debug.apply(console, __spreadArray([this.id, this.getTime() + "ms"], args));
	                }
	                else {
	                    this.info.apply(this, args);
	                }
	            }
	        };
	        Logger.prototype.getTime = function () {
	            return Date.now() - this.start;
	        };
	        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	        Logger.prototype.info = function () {
	            var args = [];
	            for (var _i = 0; _i < arguments.length; _i++) {
	                args[_i] = arguments[_i];
	            }
	            if (this.enabled) {
	                // eslint-disable-next-line no-console
	                if (typeof window !== 'undefined' && window.console && typeof console.info === 'function') {
	                    // eslint-disable-next-line no-console
	                    console.info.apply(console, __spreadArray([this.id, this.getTime() + "ms"], args));
	                }
	            }
	        };
	        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	        Logger.prototype.warn = function () {
	            var args = [];
	            for (var _i = 0; _i < arguments.length; _i++) {
	                args[_i] = arguments[_i];
	            }
	            if (this.enabled) {
	                // eslint-disable-next-line no-console
	                if (typeof window !== 'undefined' && window.console && typeof console.warn === 'function') {
	                    // eslint-disable-next-line no-console
	                    console.warn.apply(console, __spreadArray([this.id, this.getTime() + "ms"], args));
	                }
	                else {
	                    this.info.apply(this, args);
	                }
	            }
	        };
	        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	        Logger.prototype.error = function () {
	            var args = [];
	            for (var _i = 0; _i < arguments.length; _i++) {
	                args[_i] = arguments[_i];
	            }
	            if (this.enabled) {
	                // eslint-disable-next-line no-console
	                if (typeof window !== 'undefined' && window.console && typeof console.error === 'function') {
	                    // eslint-disable-next-line no-console
	                    console.error.apply(console, __spreadArray([this.id, this.getTime() + "ms"], args));
	                }
	                else {
	                    this.info.apply(this, args);
	                }
	            }
	        };
	        Logger.instances = {};
	        return Logger;
	    }());

	    var Context = /** @class */ (function () {
	        function Context(options, windowBounds) {
	            var _a;
	            this.windowBounds = windowBounds;
	            this.instanceName = "#" + Context.instanceCount++;
	            this.logger = new Logger({ id: this.instanceName, enabled: options.logging });
	            this.cache = (_a = options.cache) !== null && _a !== void 0 ? _a : new Cache(this, options);
	        }
	        Context.instanceCount = 1;
	        return Context;
	    }());

	    var html2canvas = function (element, options) {
	        if (options === void 0) { options = {}; }
	        return renderElement(element, options);
	    };
	    if (typeof window !== 'undefined') {
	        CacheStorage.setContext(window);
	    }
	    var renderElement = function (element, opts) { return __awaiter(void 0, void 0, void 0, function () {
	        var ownerDocument, defaultView, resourceOptions, contextOptions, windowOptions, windowBounds, context, foreignObjectRendering, cloneOptions, documentCloner, clonedElement, container, _a, width, height, left, top, backgroundColor, renderOptions, canvas, renderer, root, renderer;
	        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
	        return __generator(this, function (_u) {
	            switch (_u.label) {
	                case 0:
	                    if (!element || typeof element !== 'object') {
	                        return [2 /*return*/, Promise.reject('Invalid element provided as first argument')];
	                    }
	                    ownerDocument = element.ownerDocument;
	                    if (!ownerDocument) {
	                        throw new Error("Element is not attached to a Document");
	                    }
	                    defaultView = ownerDocument.defaultView;
	                    if (!defaultView) {
	                        throw new Error("Document is not attached to a Window");
	                    }
	                    resourceOptions = {
	                        allowTaint: (_b = opts.allowTaint) !== null && _b !== void 0 ? _b : false,
	                        imageTimeout: (_c = opts.imageTimeout) !== null && _c !== void 0 ? _c : 15000,
	                        proxy: opts.proxy,
	                        useCORS: (_d = opts.useCORS) !== null && _d !== void 0 ? _d : false
	                    };
	                    contextOptions = __assign({ logging: (_e = opts.logging) !== null && _e !== void 0 ? _e : true, cache: opts.cache }, resourceOptions);
	                    windowOptions = {
	                        windowWidth: (_f = opts.windowWidth) !== null && _f !== void 0 ? _f : defaultView.innerWidth,
	                        windowHeight: (_g = opts.windowHeight) !== null && _g !== void 0 ? _g : defaultView.innerHeight,
	                        scrollX: (_h = opts.scrollX) !== null && _h !== void 0 ? _h : defaultView.pageXOffset,
	                        scrollY: (_j = opts.scrollY) !== null && _j !== void 0 ? _j : defaultView.pageYOffset
	                    };
	                    windowBounds = new Bounds(windowOptions.scrollX, windowOptions.scrollY, windowOptions.windowWidth, windowOptions.windowHeight);
	                    context = new Context(contextOptions, windowBounds);
	                    foreignObjectRendering = (_k = opts.foreignObjectRendering) !== null && _k !== void 0 ? _k : false;
	                    cloneOptions = {
	                        allowTaint: (_l = opts.allowTaint) !== null && _l !== void 0 ? _l : false,
	                        onclone: opts.onclone,
	                        ignoreElements: opts.ignoreElements,
	                        inlineImages: foreignObjectRendering,
	                        copyStyles: foreignObjectRendering
	                    };
	                    context.logger.debug("Starting document clone with size " + windowBounds.width + "x" + windowBounds.height + " scrolled to " + -windowBounds.left + "," + -windowBounds.top);
	                    documentCloner = new DocumentCloner(context, element, cloneOptions);
	                    clonedElement = documentCloner.clonedReferenceElement;
	                    if (!clonedElement) {
	                        return [2 /*return*/, Promise.reject("Unable to find element in cloned iframe")];
	                    }
	                    return [4 /*yield*/, documentCloner.toIFrame(ownerDocument, windowBounds)];
	                case 1:
	                    container = _u.sent();
	                    _a = isBodyElement(clonedElement) || isHTMLElement(clonedElement)
	                        ? parseDocumentSize(clonedElement.ownerDocument)
	                        : parseBounds(context, clonedElement), width = _a.width, height = _a.height, left = _a.left, top = _a.top;
	                    backgroundColor = parseBackgroundColor(context, clonedElement, opts.backgroundColor);
	                    renderOptions = {
	                        canvas: opts.canvas,
	                        backgroundColor: backgroundColor,
	                        scale: (_o = (_m = opts.scale) !== null && _m !== void 0 ? _m : defaultView.devicePixelRatio) !== null && _o !== void 0 ? _o : 1,
	                        x: ((_p = opts.x) !== null && _p !== void 0 ? _p : 0) + left,
	                        y: ((_q = opts.y) !== null && _q !== void 0 ? _q : 0) + top,
	                        width: (_r = opts.width) !== null && _r !== void 0 ? _r : Math.ceil(width),
	                        height: (_s = opts.height) !== null && _s !== void 0 ? _s : Math.ceil(height)
	                    };
	                    if (!foreignObjectRendering) return [3 /*break*/, 3];
	                    context.logger.debug("Document cloned, using foreign object rendering");
	                    renderer = new ForeignObjectRenderer(context, renderOptions);
	                    return [4 /*yield*/, renderer.render(clonedElement)];
	                case 2:
	                    canvas = _u.sent();
	                    return [3 /*break*/, 5];
	                case 3:
	                    context.logger.debug("Document cloned, element located at " + left + "," + top + " with size " + width + "x" + height + " using computed rendering");
	                    context.logger.debug("Starting DOM parsing");
	                    root = parseTree(context, clonedElement);
	                    if (backgroundColor === root.styles.backgroundColor) {
	                        root.styles.backgroundColor = COLORS.TRANSPARENT;
	                    }
	                    context.logger.debug("Starting renderer for element at " + renderOptions.x + "," + renderOptions.y + " with size " + renderOptions.width + "x" + renderOptions.height);
	                    renderer = new CanvasRenderer(context, renderOptions);
	                    return [4 /*yield*/, renderer.render(root)];
	                case 4:
	                    canvas = _u.sent();
	                    _u.label = 5;
	                case 5:
	                    if ((_t = opts.removeContainer) !== null && _t !== void 0 ? _t : true) {
	                        if (!DocumentCloner.destroy(container)) {
	                            context.logger.error("Cannot detach cloned iframe as it is not in the DOM anymore");
	                        }
	                    }
	                    context.logger.debug("Finished rendering");
	                    return [2 /*return*/, canvas];
	            }
	        });
	    }); };
	    var parseBackgroundColor = function (context, element, backgroundColorOverride) {
	        var ownerDocument = element.ownerDocument;
	        // http://www.w3.org/TR/css3-background/#special-backgrounds
	        var documentBackgroundColor = ownerDocument.documentElement
	            ? parseColor(context, getComputedStyle(ownerDocument.documentElement).backgroundColor)
	            : COLORS.TRANSPARENT;
	        var bodyBackgroundColor = ownerDocument.body
	            ? parseColor(context, getComputedStyle(ownerDocument.body).backgroundColor)
	            : COLORS.TRANSPARENT;
	        var defaultBackgroundColor = typeof backgroundColorOverride === 'string'
	            ? parseColor(context, backgroundColorOverride)
	            : backgroundColorOverride === null
	                ? COLORS.TRANSPARENT
	                : 0xffffffff;
	        return element === ownerDocument.documentElement
	            ? isTransparent(documentBackgroundColor)
	                ? isTransparent(bodyBackgroundColor)
	                    ? defaultBackgroundColor
	                    : bodyBackgroundColor
	                : documentBackgroundColor
	            : defaultBackgroundColor;
	    };

	    return html2canvas;

	})));
	
} (html2canvas$1));

var html2canvasExports = html2canvas$1.exports;
var html2canvas = /*@__PURE__*/getDefaultExportFromCjs(html2canvasExports);

class ScreenshotCollector {
    constructor(config, transport) {
        this.config = config;
        this.transport = transport;
        this.captured = false;
    }
    /**
     * Capture a screenshot of the current page and send to backend
     */
    captureAndSend(sessionId, pageUrl) {
        return __awaiter$1(this, void 0, void 0, function* () {
            if (this.captured)
                return; // Only capture once per session
            try {
                // Wait for page to fully render
                yield new Promise(resolve => setTimeout(resolve, 2000));
                if (this.config.debug) {
                    console.log('[DevSkin] Capturing page screenshot...');
                }
                // Scroll to top before capturing
                const originalScrollY = window.scrollY;
                window.scrollTo(0, 0);
                // Wait for scroll to complete
                yield new Promise(resolve => setTimeout(resolve, 100));
                // Get full page dimensions
                const fullWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth, document.body.clientWidth, document.documentElement.clientWidth);
                const fullHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight);
                const canvas = yield html2canvas(document.documentElement, {
                    allowTaint: true,
                    useCORS: true,
                    logging: false,
                    scale: 0.5, // Reduce size
                    width: fullWidth,
                    height: fullHeight,
                    windowWidth: fullWidth,
                    windowHeight: fullHeight,
                    scrollY: 0,
                    scrollX: 0,
                    x: 0,
                    y: 0,
                });
                // Restore scroll position
                window.scrollTo(0, originalScrollY);
                // Convert to base64 JPEG (smaller than PNG)
                const screenshot = canvas.toDataURL('image/jpeg', 0.6);
                // Send to backend
                this.transport.sendScreenshot({
                    session_id: sessionId,
                    page_url: pageUrl,
                    screenshot: screenshot,
                    width: canvas.width,
                    height: canvas.height,
                });
                this.captured = true;
                if (this.config.debug) {
                    console.log('[DevSkin] Screenshot captured and sent:', {
                        size: Math.round(screenshot.length / 1024) + 'KB',
                        dimensions: `${canvas.width}x${canvas.height}`,
                    });
                }
            }
            catch (error) {
                console.error('[DevSkin] Failed to capture screenshot:', error);
            }
        });
    }
}

var NodeType;
(function (NodeType) {
    NodeType[NodeType["Document"] = 0] = "Document";
    NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
    NodeType[NodeType["Element"] = 2] = "Element";
    NodeType[NodeType["Text"] = 3] = "Text";
    NodeType[NodeType["CDATA"] = 4] = "CDATA";
    NodeType[NodeType["Comment"] = 5] = "Comment";
})(NodeType || (NodeType = {}));

function isElement(n) {
    return n.nodeType === n.ELEMENT_NODE;
}
function isShadowRoot(n) {
    const host = n === null || n === void 0 ? void 0 : n.host;
    return Boolean((host === null || host === void 0 ? void 0 : host.shadowRoot) === n);
}
function isNativeShadowDom(shadowRoot) {
    return Object.prototype.toString.call(shadowRoot) === '[object ShadowRoot]';
}
function fixBrowserCompatibilityIssuesInCSS(cssText) {
    if (cssText.includes(' background-clip: text;') &&
        !cssText.includes(' -webkit-background-clip: text;')) {
        cssText = cssText.replace(' background-clip: text;', ' -webkit-background-clip: text; background-clip: text;');
    }
    return cssText;
}
function escapeImportStatement(rule) {
    const { cssText } = rule;
    if (cssText.split('"').length < 3)
        return cssText;
    const statement = ['@import', `url(${JSON.stringify(rule.href)})`];
    if (rule.layerName === '') {
        statement.push(`layer`);
    }
    else if (rule.layerName) {
        statement.push(`layer(${rule.layerName})`);
    }
    if (rule.supportsText) {
        statement.push(`supports(${rule.supportsText})`);
    }
    if (rule.media.length) {
        statement.push(rule.media.mediaText);
    }
    return statement.join(' ') + ';';
}
function stringifyStylesheet(s) {
    try {
        const rules = s.rules || s.cssRules;
        return rules
            ? fixBrowserCompatibilityIssuesInCSS(Array.from(rules, stringifyRule).join(''))
            : null;
    }
    catch (error) {
        return null;
    }
}
function stringifyRule(rule) {
    let importStringified;
    if (isCSSImportRule(rule)) {
        try {
            importStringified =
                stringifyStylesheet(rule.styleSheet) ||
                    escapeImportStatement(rule);
        }
        catch (error) {
        }
    }
    else if (isCSSStyleRule(rule) && rule.selectorText.includes(':')) {
        return fixSafariColons(rule.cssText);
    }
    return importStringified || rule.cssText;
}
function fixSafariColons(cssStringified) {
    const regex = /(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm;
    return cssStringified.replace(regex, '$1\\$2');
}
function isCSSImportRule(rule) {
    return 'styleSheet' in rule;
}
function isCSSStyleRule(rule) {
    return 'selectorText' in rule;
}
class Mirror {
    constructor() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
    getId(n) {
        var _a;
        if (!n)
            return -1;
        const id = (_a = this.getMeta(n)) === null || _a === void 0 ? void 0 : _a.id;
        return id !== null && id !== void 0 ? id : -1;
    }
    getNode(id) {
        return this.idNodeMap.get(id) || null;
    }
    getIds() {
        return Array.from(this.idNodeMap.keys());
    }
    getMeta(n) {
        return this.nodeMetaMap.get(n) || null;
    }
    removeNodeFromMap(n) {
        const id = this.getId(n);
        this.idNodeMap.delete(id);
        if (n.childNodes) {
            n.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
        }
    }
    has(id) {
        return this.idNodeMap.has(id);
    }
    hasNode(node) {
        return this.nodeMetaMap.has(node);
    }
    add(n, meta) {
        const id = meta.id;
        this.idNodeMap.set(id, n);
        this.nodeMetaMap.set(n, meta);
    }
    replace(id, n) {
        const oldNode = this.getNode(id);
        if (oldNode) {
            const meta = this.nodeMetaMap.get(oldNode);
            if (meta)
                this.nodeMetaMap.set(n, meta);
        }
        this.idNodeMap.set(id, n);
    }
    reset() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
}
function createMirror() {
    return new Mirror();
}
function maskInputValue({ element, maskInputOptions, tagName, type, value, maskInputFn, }) {
    let text = value || '';
    const actualType = type && toLowerCase(type);
    if (maskInputOptions[tagName.toLowerCase()] ||
        (actualType && maskInputOptions[actualType])) {
        if (maskInputFn) {
            text = maskInputFn(text, element);
        }
        else {
            text = '*'.repeat(text.length);
        }
    }
    return text;
}
function toLowerCase(str) {
    return str.toLowerCase();
}
const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
function is2DCanvasBlank(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return true;
    const chunkSize = 50;
    for (let x = 0; x < canvas.width; x += chunkSize) {
        for (let y = 0; y < canvas.height; y += chunkSize) {
            const getImageData = ctx.getImageData;
            const originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData
                ? getImageData[ORIGINAL_ATTRIBUTE_NAME]
                : getImageData;
            const pixelBuffer = new Uint32Array(originalGetImageData.call(ctx, x, y, Math.min(chunkSize, canvas.width - x), Math.min(chunkSize, canvas.height - y)).data.buffer);
            if (pixelBuffer.some((pixel) => pixel !== 0))
                return false;
        }
    }
    return true;
}
function getInputType(element) {
    const type = element.type;
    return element.hasAttribute('data-rr-is-password')
        ? 'password'
        : type
            ?
                toLowerCase(type)
            : null;
}
function extractFileExtension(path, baseURL) {
    var _a;
    let url;
    try {
        url = new URL(path, baseURL !== null && baseURL !== void 0 ? baseURL : window.location.href);
    }
    catch (err) {
        return null;
    }
    const regex = /\.([0-9a-z]+)(?:$)/i;
    const match = url.pathname.match(regex);
    return (_a = match === null || match === void 0 ? void 0 : match[1]) !== null && _a !== void 0 ? _a : null;
}

let _id = 1;
const tagNameRegex = new RegExp('[^a-z0-9-_:]');
const IGNORED_NODE = -2;
function genId() {
    return _id++;
}
function getValidTagName(element) {
    if (element instanceof HTMLFormElement) {
        return 'form';
    }
    const processedTagName = toLowerCase(element.tagName);
    if (tagNameRegex.test(processedTagName)) {
        return 'div';
    }
    return processedTagName;
}
function extractOrigin(url) {
    let origin = '';
    if (url.indexOf('//') > -1) {
        origin = url.split('/').slice(0, 3).join('/');
    }
    else {
        origin = url.split('/')[0];
    }
    origin = origin.split('?')[0];
    return origin;
}
let canvasService;
let canvasCtx;
const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
const URL_WWW_MATCH = /^www\..*/i;
const DATA_URI = /^(data:)([^,]*),(.*)/i;
function absoluteToStylesheet(cssText, href) {
    return (cssText || '').replace(URL_IN_CSS_REF, (origin, quote1, path1, quote2, path2, path3) => {
        const filePath = path1 || path2 || path3;
        const maybeQuote = quote1 || quote2 || '';
        if (!filePath) {
            return origin;
        }
        if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) {
            return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (DATA_URI.test(filePath)) {
            return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (filePath[0] === '/') {
            return `url(${maybeQuote}${extractOrigin(href) + filePath}${maybeQuote})`;
        }
        const stack = href.split('/');
        const parts = filePath.split('/');
        stack.pop();
        for (const part of parts) {
            if (part === '.') {
                continue;
            }
            else if (part === '..') {
                stack.pop();
            }
            else {
                stack.push(part);
            }
        }
        return `url(${maybeQuote}${stack.join('/')}${maybeQuote})`;
    });
}
const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc, attributeValue) {
    if (attributeValue.trim() === '') {
        return attributeValue;
    }
    let pos = 0;
    function collectCharacters(regEx) {
        let chars;
        const match = regEx.exec(attributeValue.substring(pos));
        if (match) {
            chars = match[0];
            pos += chars.length;
            return chars;
        }
        return '';
    }
    const output = [];
    while (true) {
        collectCharacters(SRCSET_COMMAS_OR_SPACES);
        if (pos >= attributeValue.length) {
            break;
        }
        let url = collectCharacters(SRCSET_NOT_SPACES);
        if (url.slice(-1) === ',') {
            url = absoluteToDoc(doc, url.substring(0, url.length - 1));
            output.push(url);
        }
        else {
            let descriptorsStr = '';
            url = absoluteToDoc(doc, url);
            let inParens = false;
            while (true) {
                const c = attributeValue.charAt(pos);
                if (c === '') {
                    output.push((url + descriptorsStr).trim());
                    break;
                }
                else if (!inParens) {
                    if (c === ',') {
                        pos += 1;
                        output.push((url + descriptorsStr).trim());
                        break;
                    }
                    else if (c === '(') {
                        inParens = true;
                    }
                }
                else {
                    if (c === ')') {
                        inParens = false;
                    }
                }
                descriptorsStr += c;
                pos += 1;
            }
        }
    }
    return output.join(', ');
}
function absoluteToDoc(doc, attributeValue) {
    if (!attributeValue || attributeValue.trim() === '') {
        return attributeValue;
    }
    const a = doc.createElement('a');
    a.href = attributeValue;
    return a.href;
}
function isSVGElement(el) {
    return Boolean(el.tagName === 'svg' || el.ownerSVGElement);
}
function getHref() {
    const a = document.createElement('a');
    a.href = '';
    return a.href;
}
function transformAttribute(doc, tagName, name, value) {
    if (!value) {
        return value;
    }
    if (name === 'src' ||
        (name === 'href' && !(tagName === 'use' && value[0] === '#'))) {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'xlink:href' && value[0] !== '#') {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'background' &&
        (tagName === 'table' || tagName === 'td' || tagName === 'th')) {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'srcset') {
        return getAbsoluteSrcsetString(doc, value);
    }
    else if (name === 'style') {
        return absoluteToStylesheet(value, getHref());
    }
    else if (tagName === 'object' && name === 'data') {
        return absoluteToDoc(doc, value);
    }
    return value;
}
function ignoreAttribute(tagName, name, _value) {
    return (tagName === 'video' || tagName === 'audio') && name === 'autoplay';
}
function _isBlockedElement(element, blockClass, blockSelector) {
    try {
        if (typeof blockClass === 'string') {
            if (element.classList.contains(blockClass)) {
                return true;
            }
        }
        else {
            for (let eIndex = element.classList.length; eIndex--;) {
                const className = element.classList[eIndex];
                if (blockClass.test(className)) {
                    return true;
                }
            }
        }
        if (blockSelector) {
            return element.matches(blockSelector);
        }
    }
    catch (e) {
    }
    return false;
}
function classMatchesRegex(node, regex, checkAncestors) {
    if (!node)
        return false;
    if (node.nodeType !== node.ELEMENT_NODE) {
        if (!checkAncestors)
            return false;
        return classMatchesRegex(node.parentNode, regex, checkAncestors);
    }
    for (let eIndex = node.classList.length; eIndex--;) {
        const className = node.classList[eIndex];
        if (regex.test(className)) {
            return true;
        }
    }
    if (!checkAncestors)
        return false;
    return classMatchesRegex(node.parentNode, regex, checkAncestors);
}
function needMaskingText(node, maskTextClass, maskTextSelector, checkAncestors) {
    try {
        const el = node.nodeType === node.ELEMENT_NODE
            ? node
            : node.parentElement;
        if (el === null)
            return false;
        if (typeof maskTextClass === 'string') {
            if (checkAncestors) {
                if (el.closest(`.${maskTextClass}`))
                    return true;
            }
            else {
                if (el.classList.contains(maskTextClass))
                    return true;
            }
        }
        else {
            if (classMatchesRegex(el, maskTextClass, checkAncestors))
                return true;
        }
        if (maskTextSelector) {
            if (checkAncestors) {
                if (el.closest(maskTextSelector))
                    return true;
            }
            else {
                if (el.matches(maskTextSelector))
                    return true;
            }
        }
    }
    catch (e) {
    }
    return false;
}
function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
    const win = iframeEl.contentWindow;
    if (!win) {
        return;
    }
    let fired = false;
    let readyState;
    try {
        readyState = win.document.readyState;
    }
    catch (error) {
        return;
    }
    if (readyState !== 'complete') {
        const timer = setTimeout(() => {
            if (!fired) {
                listener();
                fired = true;
            }
        }, iframeLoadTimeout);
        iframeEl.addEventListener('load', () => {
            clearTimeout(timer);
            fired = true;
            listener();
        });
        return;
    }
    const blankUrl = 'about:blank';
    if (win.location.href !== blankUrl ||
        iframeEl.src === blankUrl ||
        iframeEl.src === '') {
        setTimeout(listener, 0);
        return iframeEl.addEventListener('load', listener);
    }
    iframeEl.addEventListener('load', listener);
}
function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
    let fired = false;
    let styleSheetLoaded;
    try {
        styleSheetLoaded = link.sheet;
    }
    catch (error) {
        return;
    }
    if (styleSheetLoaded)
        return;
    const timer = setTimeout(() => {
        if (!fired) {
            listener();
            fired = true;
        }
    }, styleSheetLoadTimeout);
    link.addEventListener('load', () => {
        clearTimeout(timer);
        fired = true;
        listener();
    });
}
function serializeNode(n, options) {
    const { doc, mirror, blockClass, blockSelector, needsMask, inlineStylesheet, maskInputOptions = {}, maskTextFn, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, } = options;
    const rootId = getRootId(doc, mirror);
    switch (n.nodeType) {
        case n.DOCUMENT_NODE:
            if (n.compatMode !== 'CSS1Compat') {
                return {
                    type: NodeType.Document,
                    childNodes: [],
                    compatMode: n.compatMode,
                };
            }
            else {
                return {
                    type: NodeType.Document,
                    childNodes: [],
                };
            }
        case n.DOCUMENT_TYPE_NODE:
            return {
                type: NodeType.DocumentType,
                name: n.name,
                publicId: n.publicId,
                systemId: n.systemId,
                rootId,
            };
        case n.ELEMENT_NODE:
            return serializeElementNode(n, {
                doc,
                blockClass,
                blockSelector,
                inlineStylesheet,
                maskInputOptions,
                maskInputFn,
                dataURLOptions,
                inlineImages,
                recordCanvas,
                keepIframeSrcFn,
                newlyAddedElement,
                rootId,
            });
        case n.TEXT_NODE:
            return serializeTextNode(n, {
                needsMask,
                maskTextFn,
                rootId,
            });
        case n.CDATA_SECTION_NODE:
            return {
                type: NodeType.CDATA,
                textContent: '',
                rootId,
            };
        case n.COMMENT_NODE:
            return {
                type: NodeType.Comment,
                textContent: n.textContent || '',
                rootId,
            };
        default:
            return false;
    }
}
function getRootId(doc, mirror) {
    if (!mirror.hasNode(doc))
        return undefined;
    const docId = mirror.getId(doc);
    return docId === 1 ? undefined : docId;
}
function serializeTextNode(n, options) {
    var _a;
    const { needsMask, maskTextFn, rootId } = options;
    const parentTagName = n.parentNode && n.parentNode.tagName;
    let textContent = n.textContent;
    const isStyle = parentTagName === 'STYLE' ? true : undefined;
    const isScript = parentTagName === 'SCRIPT' ? true : undefined;
    if (isStyle && textContent) {
        try {
            if (n.nextSibling || n.previousSibling) {
            }
            else if ((_a = n.parentNode.sheet) === null || _a === void 0 ? void 0 : _a.cssRules) {
                textContent = stringifyStylesheet(n.parentNode.sheet);
            }
        }
        catch (err) {
            console.warn(`Cannot get CSS styles from text's parentNode. Error: ${err}`, n);
        }
        textContent = absoluteToStylesheet(textContent, getHref());
    }
    if (isScript) {
        textContent = 'SCRIPT_PLACEHOLDER';
    }
    if (!isStyle && !isScript && textContent && needsMask) {
        textContent = maskTextFn
            ? maskTextFn(textContent, n.parentElement)
            : textContent.replace(/[\S]/g, '*');
    }
    return {
        type: NodeType.Text,
        textContent: textContent || '',
        isStyle,
        rootId,
    };
}
function serializeElementNode(n, options) {
    const { doc, blockClass, blockSelector, inlineStylesheet, maskInputOptions = {}, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, rootId, } = options;
    const needBlock = _isBlockedElement(n, blockClass, blockSelector);
    const tagName = getValidTagName(n);
    let attributes = {};
    const len = n.attributes.length;
    for (let i = 0; i < len; i++) {
        const attr = n.attributes[i];
        if (!ignoreAttribute(tagName, attr.name, attr.value)) {
            attributes[attr.name] = transformAttribute(doc, tagName, toLowerCase(attr.name), attr.value);
        }
    }
    if (tagName === 'link' && inlineStylesheet) {
        const stylesheet = Array.from(doc.styleSheets).find((s) => {
            return s.href === n.href;
        });
        let cssText = null;
        if (stylesheet) {
            cssText = stringifyStylesheet(stylesheet);
        }
        if (cssText) {
            delete attributes.rel;
            delete attributes.href;
            attributes._cssText = absoluteToStylesheet(cssText, stylesheet.href);
        }
    }
    if (tagName === 'style' &&
        n.sheet &&
        !(n.innerText || n.textContent || '').trim().length) {
        const cssText = stringifyStylesheet(n.sheet);
        if (cssText) {
            attributes._cssText = absoluteToStylesheet(cssText, getHref());
        }
    }
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        const value = n.value;
        const checked = n.checked;
        if (attributes.type !== 'radio' &&
            attributes.type !== 'checkbox' &&
            attributes.type !== 'submit' &&
            attributes.type !== 'button' &&
            value) {
            attributes.value = maskInputValue({
                element: n,
                type: getInputType(n),
                tagName,
                value,
                maskInputOptions,
                maskInputFn,
            });
        }
        else if (checked) {
            attributes.checked = checked;
        }
    }
    if (tagName === 'option') {
        if (n.selected && !maskInputOptions['select']) {
            attributes.selected = true;
        }
        else {
            delete attributes.selected;
        }
    }
    if (tagName === 'canvas' && recordCanvas) {
        if (n.__context === '2d') {
            if (!is2DCanvasBlank(n)) {
                attributes.rr_dataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            }
        }
        else if (!('__context' in n)) {
            const canvasDataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            const blankCanvas = document.createElement('canvas');
            blankCanvas.width = n.width;
            blankCanvas.height = n.height;
            const blankCanvasDataURL = blankCanvas.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            if (canvasDataURL !== blankCanvasDataURL) {
                attributes.rr_dataURL = canvasDataURL;
            }
        }
    }
    if (tagName === 'img' && inlineImages) {
        if (!canvasService) {
            canvasService = doc.createElement('canvas');
            canvasCtx = canvasService.getContext('2d');
        }
        const image = n;
        const oldValue = image.crossOrigin;
        image.crossOrigin = 'anonymous';
        const recordInlineImage = () => {
            image.removeEventListener('load', recordInlineImage);
            try {
                canvasService.width = image.naturalWidth;
                canvasService.height = image.naturalHeight;
                canvasCtx.drawImage(image, 0, 0);
                attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            }
            catch (err) {
                console.warn(`Cannot inline img src=${image.currentSrc}! Error: ${err}`);
            }
            oldValue
                ? (attributes.crossOrigin = oldValue)
                : image.removeAttribute('crossorigin');
        };
        if (image.complete && image.naturalWidth !== 0)
            recordInlineImage();
        else
            image.addEventListener('load', recordInlineImage);
    }
    if (tagName === 'audio' || tagName === 'video') {
        const mediaAttributes = attributes;
        mediaAttributes.rr_mediaState = n.paused
            ? 'paused'
            : 'played';
        mediaAttributes.rr_mediaCurrentTime = n.currentTime;
        mediaAttributes.rr_mediaPlaybackRate = n.playbackRate;
        mediaAttributes.rr_mediaMuted = n.muted;
        mediaAttributes.rr_mediaLoop = n.loop;
        mediaAttributes.rr_mediaVolume = n.volume;
    }
    if (!newlyAddedElement) {
        if (n.scrollLeft) {
            attributes.rr_scrollLeft = n.scrollLeft;
        }
        if (n.scrollTop) {
            attributes.rr_scrollTop = n.scrollTop;
        }
    }
    if (needBlock) {
        const { width, height } = n.getBoundingClientRect();
        attributes = {
            class: attributes.class,
            rr_width: `${width}px`,
            rr_height: `${height}px`,
        };
    }
    if (tagName === 'iframe' && !keepIframeSrcFn(attributes.src)) {
        if (!n.contentDocument) {
            attributes.rr_src = attributes.src;
        }
        delete attributes.src;
    }
    let isCustomElement;
    try {
        if (customElements.get(tagName))
            isCustomElement = true;
    }
    catch (e) {
    }
    return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG: isSVGElement(n) || undefined,
        needBlock,
        rootId,
        isCustom: isCustomElement,
    };
}
function lowerIfExists(maybeAttr) {
    if (maybeAttr === undefined || maybeAttr === null) {
        return '';
    }
    else {
        return maybeAttr.toLowerCase();
    }
}
function slimDOMExcluded(sn, slimDOMOptions) {
    if (slimDOMOptions.comment && sn.type === NodeType.Comment) {
        return true;
    }
    else if (sn.type === NodeType.Element) {
        if (slimDOMOptions.script &&
            (sn.tagName === 'script' ||
                (sn.tagName === 'link' &&
                    (sn.attributes.rel === 'preload' ||
                        sn.attributes.rel === 'modulepreload') &&
                    sn.attributes.as === 'script') ||
                (sn.tagName === 'link' &&
                    sn.attributes.rel === 'prefetch' &&
                    typeof sn.attributes.href === 'string' &&
                    extractFileExtension(sn.attributes.href) === 'js'))) {
            return true;
        }
        else if (slimDOMOptions.headFavicon &&
            ((sn.tagName === 'link' && sn.attributes.rel === 'shortcut icon') ||
                (sn.tagName === 'meta' &&
                    (lowerIfExists(sn.attributes.name).match(/^msapplication-tile(image|color)$/) ||
                        lowerIfExists(sn.attributes.name) === 'application-name' ||
                        lowerIfExists(sn.attributes.rel) === 'icon' ||
                        lowerIfExists(sn.attributes.rel) === 'apple-touch-icon' ||
                        lowerIfExists(sn.attributes.rel) === 'shortcut icon')))) {
            return true;
        }
        else if (sn.tagName === 'meta') {
            if (slimDOMOptions.headMetaDescKeywords &&
                lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
                return true;
            }
            else if (slimDOMOptions.headMetaSocial &&
                (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) ||
                    lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) ||
                    lowerIfExists(sn.attributes.name) === 'pinterest')) {
                return true;
            }
            else if (slimDOMOptions.headMetaRobots &&
                (lowerIfExists(sn.attributes.name) === 'robots' ||
                    lowerIfExists(sn.attributes.name) === 'googlebot' ||
                    lowerIfExists(sn.attributes.name) === 'bingbot')) {
                return true;
            }
            else if (slimDOMOptions.headMetaHttpEquiv &&
                sn.attributes['http-equiv'] !== undefined) {
                return true;
            }
            else if (slimDOMOptions.headMetaAuthorship &&
                (lowerIfExists(sn.attributes.name) === 'author' ||
                    lowerIfExists(sn.attributes.name) === 'generator' ||
                    lowerIfExists(sn.attributes.name) === 'framework' ||
                    lowerIfExists(sn.attributes.name) === 'publisher' ||
                    lowerIfExists(sn.attributes.name) === 'progid' ||
                    lowerIfExists(sn.attributes.property).match(/^article:/) ||
                    lowerIfExists(sn.attributes.property).match(/^product:/))) {
                return true;
            }
            else if (slimDOMOptions.headMetaVerification &&
                (lowerIfExists(sn.attributes.name) === 'google-site-verification' ||
                    lowerIfExists(sn.attributes.name) === 'yandex-verification' ||
                    lowerIfExists(sn.attributes.name) === 'csrf-token' ||
                    lowerIfExists(sn.attributes.name) === 'p:domain_verify' ||
                    lowerIfExists(sn.attributes.name) === 'verify-v1' ||
                    lowerIfExists(sn.attributes.name) === 'verification' ||
                    lowerIfExists(sn.attributes.name) === 'shopify-checkout-api-token')) {
                return true;
            }
        }
    }
    return false;
}
function serializeNodeWithId(n, options) {
    const { doc, mirror, blockClass, blockSelector, maskTextClass, maskTextSelector, skipChild = false, inlineStylesheet = true, maskInputOptions = {}, maskTextFn, maskInputFn, slimDOMOptions, dataURLOptions = {}, inlineImages = false, recordCanvas = false, onSerialize, onIframeLoad, iframeLoadTimeout = 5000, onStylesheetLoad, stylesheetLoadTimeout = 5000, keepIframeSrcFn = () => false, newlyAddedElement = false, } = options;
    let { needsMask } = options;
    let { preserveWhiteSpace = true } = options;
    if (!needsMask &&
        n.childNodes) {
        const checkAncestors = needsMask === undefined;
        needsMask = needMaskingText(n, maskTextClass, maskTextSelector, checkAncestors);
    }
    const _serializedNode = serializeNode(n, {
        doc,
        mirror,
        blockClass,
        blockSelector,
        needsMask,
        inlineStylesheet,
        maskInputOptions,
        maskTextFn,
        maskInputFn,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        keepIframeSrcFn,
        newlyAddedElement,
    });
    if (!_serializedNode) {
        console.warn(n, 'not serialized');
        return null;
    }
    let id;
    if (mirror.hasNode(n)) {
        id = mirror.getId(n);
    }
    else if (slimDOMExcluded(_serializedNode, slimDOMOptions) ||
        (!preserveWhiteSpace &&
            _serializedNode.type === NodeType.Text &&
            !_serializedNode.isStyle &&
            !_serializedNode.textContent.replace(/^\s+|\s+$/gm, '').length)) {
        id = IGNORED_NODE;
    }
    else {
        id = genId();
    }
    const serializedNode = Object.assign(_serializedNode, { id });
    mirror.add(n, serializedNode);
    if (id === IGNORED_NODE) {
        return null;
    }
    if (onSerialize) {
        onSerialize(n);
    }
    let recordChild = !skipChild;
    if (serializedNode.type === NodeType.Element) {
        recordChild = recordChild && !serializedNode.needBlock;
        delete serializedNode.needBlock;
        const shadowRoot = n.shadowRoot;
        if (shadowRoot && isNativeShadowDom(shadowRoot))
            serializedNode.isShadowHost = true;
    }
    if ((serializedNode.type === NodeType.Document ||
        serializedNode.type === NodeType.Element) &&
        recordChild) {
        if (slimDOMOptions.headWhitespace &&
            serializedNode.type === NodeType.Element &&
            serializedNode.tagName === 'head') {
            preserveWhiteSpace = false;
        }
        const bypassOptions = {
            doc,
            mirror,
            blockClass,
            blockSelector,
            needsMask,
            maskTextClass,
            maskTextSelector,
            skipChild,
            inlineStylesheet,
            maskInputOptions,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn,
        };
        if (serializedNode.type === NodeType.Element &&
            serializedNode.tagName === 'textarea' &&
            serializedNode.attributes.value !== undefined) ;
        else {
            for (const childN of Array.from(n.childNodes)) {
                const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
                if (serializedChildNode) {
                    serializedNode.childNodes.push(serializedChildNode);
                }
            }
        }
        if (isElement(n) && n.shadowRoot) {
            for (const childN of Array.from(n.shadowRoot.childNodes)) {
                const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
                if (serializedChildNode) {
                    isNativeShadowDom(n.shadowRoot) &&
                        (serializedChildNode.isShadow = true);
                    serializedNode.childNodes.push(serializedChildNode);
                }
            }
        }
    }
    if (n.parentNode &&
        isShadowRoot(n.parentNode) &&
        isNativeShadowDom(n.parentNode)) {
        serializedNode.isShadow = true;
    }
    if (serializedNode.type === NodeType.Element &&
        serializedNode.tagName === 'iframe') {
        onceIframeLoaded(n, () => {
            const iframeDoc = n.contentDocument;
            if (iframeDoc && onIframeLoad) {
                const serializedIframeNode = serializeNodeWithId(iframeDoc, {
                    doc: iframeDoc,
                    mirror,
                    blockClass,
                    blockSelector,
                    needsMask,
                    maskTextClass,
                    maskTextSelector,
                    skipChild: false,
                    inlineStylesheet,
                    maskInputOptions,
                    maskTextFn,
                    maskInputFn,
                    slimDOMOptions,
                    dataURLOptions,
                    inlineImages,
                    recordCanvas,
                    preserveWhiteSpace,
                    onSerialize,
                    onIframeLoad,
                    iframeLoadTimeout,
                    onStylesheetLoad,
                    stylesheetLoadTimeout,
                    keepIframeSrcFn,
                });
                if (serializedIframeNode) {
                    onIframeLoad(n, serializedIframeNode);
                }
            }
        }, iframeLoadTimeout);
    }
    if (serializedNode.type === NodeType.Element &&
        serializedNode.tagName === 'link' &&
        typeof serializedNode.attributes.rel === 'string' &&
        (serializedNode.attributes.rel === 'stylesheet' ||
            (serializedNode.attributes.rel === 'preload' &&
                typeof serializedNode.attributes.href === 'string' &&
                extractFileExtension(serializedNode.attributes.href) === 'css'))) {
        onceStylesheetLoaded(n, () => {
            if (onStylesheetLoad) {
                const serializedLinkNode = serializeNodeWithId(n, {
                    doc,
                    mirror,
                    blockClass,
                    blockSelector,
                    needsMask,
                    maskTextClass,
                    maskTextSelector,
                    skipChild: false,
                    inlineStylesheet,
                    maskInputOptions,
                    maskTextFn,
                    maskInputFn,
                    slimDOMOptions,
                    dataURLOptions,
                    inlineImages,
                    recordCanvas,
                    preserveWhiteSpace,
                    onSerialize,
                    onIframeLoad,
                    iframeLoadTimeout,
                    onStylesheetLoad,
                    stylesheetLoadTimeout,
                    keepIframeSrcFn,
                });
                if (serializedLinkNode) {
                    onStylesheetLoad(n, serializedLinkNode);
                }
            }
        }, stylesheetLoadTimeout);
    }
    return serializedNode;
}
function snapshot(n, options) {
    const { mirror = new Mirror(), blockClass = 'rr-block', blockSelector = null, maskTextClass = 'rr-mask', maskTextSelector = null, inlineStylesheet = true, inlineImages = false, recordCanvas = false, maskAllInputs = false, maskTextFn, maskInputFn, slimDOM = false, dataURLOptions, preserveWhiteSpace, onSerialize, onIframeLoad, iframeLoadTimeout, onStylesheetLoad, stylesheetLoadTimeout, keepIframeSrcFn = () => false, } = options || {};
    const maskInputOptions = maskAllInputs === true
        ? {
            color: true,
            date: true,
            'datetime-local': true,
            email: true,
            month: true,
            number: true,
            range: true,
            search: true,
            tel: true,
            text: true,
            time: true,
            url: true,
            week: true,
            textarea: true,
            select: true,
            password: true,
        }
        : maskAllInputs === false
            ? {
                password: true,
            }
            : maskAllInputs;
    const slimDOMOptions = slimDOM === true || slimDOM === 'all'
        ?
            {
                script: true,
                comment: true,
                headFavicon: true,
                headWhitespace: true,
                headMetaDescKeywords: slimDOM === 'all',
                headMetaSocial: true,
                headMetaRobots: true,
                headMetaHttpEquiv: true,
                headMetaAuthorship: true,
                headMetaVerification: true,
            }
        : slimDOM === false
            ? {}
            : slimDOM;
    return serializeNodeWithId(n, {
        doc: n,
        mirror,
        blockClass,
        blockSelector,
        maskTextClass,
        maskTextSelector,
        skipChild: false,
        inlineStylesheet,
        maskInputOptions,
        maskTextFn,
        maskInputFn,
        slimDOMOptions,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        preserveWhiteSpace,
        onSerialize,
        onIframeLoad,
        iframeLoadTimeout,
        onStylesheetLoad,
        stylesheetLoadTimeout,
        keepIframeSrcFn,
        newlyAddedElement: false,
    });
}

function on(type, fn, target = document) {
    const options = { capture: true, passive: true };
    target.addEventListener(type, fn, options);
    return () => target.removeEventListener(type, fn, options);
}
const DEPARTED_MIRROR_ACCESS_WARNING = 'Please stop import mirror directly. Instead of that,' +
    '\r\n' +
    'now you can use replayer.getMirror() to access the mirror instance of a replayer,' +
    '\r\n' +
    'or you can use record.mirror to access the mirror instance during recording.';
let _mirror = {
    map: {},
    getId() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        return -1;
    },
    getNode() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        return null;
    },
    removeNodeFromMap() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    },
    has() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        return false;
    },
    reset() {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    },
};
if (typeof window !== 'undefined' && window.Proxy && window.Reflect) {
    _mirror = new Proxy(_mirror, {
        get(target, prop, receiver) {
            if (prop === 'map') {
                console.error(DEPARTED_MIRROR_ACCESS_WARNING);
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}
function throttle(func, wait, options = {}) {
    let timeout = null;
    let previous = 0;
    return function (...args) {
        const now = Date.now();
        if (!previous && options.leading === false) {
            previous = now;
        }
        const remaining = wait - (now - previous);
        const context = this;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            func.apply(context, args);
        }
        else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(() => {
                previous = options.leading === false ? 0 : Date.now();
                timeout = null;
                func.apply(context, args);
            }, remaining);
        }
    };
}
function hookSetter(target, key, d, isRevoked, win = window) {
    const original = win.Object.getOwnPropertyDescriptor(target, key);
    win.Object.defineProperty(target, key, isRevoked
        ? d
        : {
            set(value) {
                setTimeout(() => {
                    d.set.call(this, value);
                }, 0);
                if (original && original.set) {
                    original.set.call(this, value);
                }
            },
        });
    return () => hookSetter(target, key, original || {}, true);
}
function patch(source, name, replacement) {
    try {
        if (!(name in source)) {
            return () => {
            };
        }
        const original = source[name];
        const wrapped = replacement(original);
        if (typeof wrapped === 'function') {
            wrapped.prototype = wrapped.prototype || {};
            Object.defineProperties(wrapped, {
                __rrweb_original__: {
                    enumerable: false,
                    value: original,
                },
            });
        }
        source[name] = wrapped;
        return () => {
            source[name] = original;
        };
    }
    catch (_a) {
        return () => {
        };
    }
}
let nowTimestamp = Date.now;
if (!(/[1-9][0-9]{12}/.test(Date.now().toString()))) {
    nowTimestamp = () => new Date().getTime();
}
function getWindowScroll(win) {
    var _a, _b, _c, _d, _e, _f;
    const doc = win.document;
    return {
        left: doc.scrollingElement
            ? doc.scrollingElement.scrollLeft
            : win.pageXOffset !== undefined
                ? win.pageXOffset
                : (doc === null || doc === void 0 ? void 0 : doc.documentElement.scrollLeft) ||
                    ((_b = (_a = doc === null || doc === void 0 ? void 0 : doc.body) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.scrollLeft) ||
                    ((_c = doc === null || doc === void 0 ? void 0 : doc.body) === null || _c === void 0 ? void 0 : _c.scrollLeft) ||
                    0,
        top: doc.scrollingElement
            ? doc.scrollingElement.scrollTop
            : win.pageYOffset !== undefined
                ? win.pageYOffset
                : (doc === null || doc === void 0 ? void 0 : doc.documentElement.scrollTop) ||
                    ((_e = (_d = doc === null || doc === void 0 ? void 0 : doc.body) === null || _d === void 0 ? void 0 : _d.parentElement) === null || _e === void 0 ? void 0 : _e.scrollTop) ||
                    ((_f = doc === null || doc === void 0 ? void 0 : doc.body) === null || _f === void 0 ? void 0 : _f.scrollTop) ||
                    0,
    };
}
function getWindowHeight() {
    return (window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        (document.body && document.body.clientHeight));
}
function getWindowWidth() {
    return (window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        (document.body && document.body.clientWidth));
}
function closestElementOfNode(node) {
    if (!node) {
        return null;
    }
    const el = node.nodeType === node.ELEMENT_NODE
        ? node
        : node.parentElement;
    return el;
}
function isBlocked(node, blockClass, blockSelector, checkAncestors) {
    if (!node) {
        return false;
    }
    const el = closestElementOfNode(node);
    if (!el) {
        return false;
    }
    try {
        if (typeof blockClass === 'string') {
            if (el.classList.contains(blockClass))
                return true;
            if (checkAncestors && el.closest('.' + blockClass) !== null)
                return true;
        }
        else {
            if (classMatchesRegex(el, blockClass, checkAncestors))
                return true;
        }
    }
    catch (e) {
    }
    if (blockSelector) {
        if (el.matches(blockSelector))
            return true;
        if (checkAncestors && el.closest(blockSelector) !== null)
            return true;
    }
    return false;
}
function isSerialized(n, mirror) {
    return mirror.getId(n) !== -1;
}
function isIgnored(n, mirror) {
    return mirror.getId(n) === IGNORED_NODE;
}
function isAncestorRemoved(target, mirror) {
    if (isShadowRoot(target)) {
        return false;
    }
    const id = mirror.getId(target);
    if (!mirror.has(id)) {
        return true;
    }
    if (target.parentNode &&
        target.parentNode.nodeType === target.DOCUMENT_NODE) {
        return false;
    }
    if (!target.parentNode) {
        return true;
    }
    return isAncestorRemoved(target.parentNode, mirror);
}
function legacy_isTouchEvent(event) {
    return Boolean(event.changedTouches);
}
function polyfill(win = window) {
    if ('NodeList' in win && !win.NodeList.prototype.forEach) {
        win.NodeList.prototype.forEach = Array.prototype
            .forEach;
    }
    if ('DOMTokenList' in win && !win.DOMTokenList.prototype.forEach) {
        win.DOMTokenList.prototype.forEach = Array.prototype
            .forEach;
    }
    if (!Node.prototype.contains) {
        Node.prototype.contains = (...args) => {
            let node = args[0];
            if (!(0 in args)) {
                throw new TypeError('1 argument is required');
            }
            do {
                if (this === node) {
                    return true;
                }
            } while ((node = node && node.parentNode));
            return false;
        };
    }
}
function isSerializedIframe(n, mirror) {
    return Boolean(n.nodeName === 'IFRAME' && mirror.getMeta(n));
}
function isSerializedStylesheet(n, mirror) {
    return Boolean(n.nodeName === 'LINK' &&
        n.nodeType === n.ELEMENT_NODE &&
        n.getAttribute &&
        n.getAttribute('rel') === 'stylesheet' &&
        mirror.getMeta(n));
}
function hasShadowRoot(n) {
    return Boolean(n === null || n === void 0 ? void 0 : n.shadowRoot);
}
class StyleSheetMirror {
    constructor() {
        this.id = 1;
        this.styleIDMap = new WeakMap();
        this.idStyleMap = new Map();
    }
    getId(stylesheet) {
        var _a;
        return (_a = this.styleIDMap.get(stylesheet)) !== null && _a !== void 0 ? _a : -1;
    }
    has(stylesheet) {
        return this.styleIDMap.has(stylesheet);
    }
    add(stylesheet, id) {
        if (this.has(stylesheet))
            return this.getId(stylesheet);
        let newId;
        if (id === undefined) {
            newId = this.id++;
        }
        else
            newId = id;
        this.styleIDMap.set(stylesheet, newId);
        this.idStyleMap.set(newId, stylesheet);
        return newId;
    }
    getStyle(id) {
        return this.idStyleMap.get(id) || null;
    }
    reset() {
        this.styleIDMap = new WeakMap();
        this.idStyleMap = new Map();
        this.id = 1;
    }
    generateId() {
        return this.id++;
    }
}
function getShadowHost(n) {
    var _a, _b;
    let shadowHost = null;
    if (((_b = (_a = n.getRootNode) === null || _a === void 0 ? void 0 : _a.call(n)) === null || _b === void 0 ? void 0 : _b.nodeType) === Node.DOCUMENT_FRAGMENT_NODE &&
        n.getRootNode().host)
        shadowHost = n.getRootNode().host;
    return shadowHost;
}
function getRootShadowHost(n) {
    let rootShadowHost = n;
    let shadowHost;
    while ((shadowHost = getShadowHost(rootShadowHost)))
        rootShadowHost = shadowHost;
    return rootShadowHost;
}
function shadowHostInDom(n) {
    const doc = n.ownerDocument;
    if (!doc)
        return false;
    const shadowHost = getRootShadowHost(n);
    return doc.contains(shadowHost);
}
function inDom(n) {
    const doc = n.ownerDocument;
    if (!doc)
        return false;
    return doc.contains(n) || shadowHostInDom(n);
}

var EventType = /* @__PURE__ */ ((EventType2) => {
  EventType2[EventType2["DomContentLoaded"] = 0] = "DomContentLoaded";
  EventType2[EventType2["Load"] = 1] = "Load";
  EventType2[EventType2["FullSnapshot"] = 2] = "FullSnapshot";
  EventType2[EventType2["IncrementalSnapshot"] = 3] = "IncrementalSnapshot";
  EventType2[EventType2["Meta"] = 4] = "Meta";
  EventType2[EventType2["Custom"] = 5] = "Custom";
  EventType2[EventType2["Plugin"] = 6] = "Plugin";
  return EventType2;
})(EventType || {});
var IncrementalSource = /* @__PURE__ */ ((IncrementalSource2) => {
  IncrementalSource2[IncrementalSource2["Mutation"] = 0] = "Mutation";
  IncrementalSource2[IncrementalSource2["MouseMove"] = 1] = "MouseMove";
  IncrementalSource2[IncrementalSource2["MouseInteraction"] = 2] = "MouseInteraction";
  IncrementalSource2[IncrementalSource2["Scroll"] = 3] = "Scroll";
  IncrementalSource2[IncrementalSource2["ViewportResize"] = 4] = "ViewportResize";
  IncrementalSource2[IncrementalSource2["Input"] = 5] = "Input";
  IncrementalSource2[IncrementalSource2["TouchMove"] = 6] = "TouchMove";
  IncrementalSource2[IncrementalSource2["MediaInteraction"] = 7] = "MediaInteraction";
  IncrementalSource2[IncrementalSource2["StyleSheetRule"] = 8] = "StyleSheetRule";
  IncrementalSource2[IncrementalSource2["CanvasMutation"] = 9] = "CanvasMutation";
  IncrementalSource2[IncrementalSource2["Font"] = 10] = "Font";
  IncrementalSource2[IncrementalSource2["Log"] = 11] = "Log";
  IncrementalSource2[IncrementalSource2["Drag"] = 12] = "Drag";
  IncrementalSource2[IncrementalSource2["StyleDeclaration"] = 13] = "StyleDeclaration";
  IncrementalSource2[IncrementalSource2["Selection"] = 14] = "Selection";
  IncrementalSource2[IncrementalSource2["AdoptedStyleSheet"] = 15] = "AdoptedStyleSheet";
  IncrementalSource2[IncrementalSource2["CustomElement"] = 16] = "CustomElement";
  return IncrementalSource2;
})(IncrementalSource || {});
var MouseInteractions = /* @__PURE__ */ ((MouseInteractions2) => {
  MouseInteractions2[MouseInteractions2["MouseUp"] = 0] = "MouseUp";
  MouseInteractions2[MouseInteractions2["MouseDown"] = 1] = "MouseDown";
  MouseInteractions2[MouseInteractions2["Click"] = 2] = "Click";
  MouseInteractions2[MouseInteractions2["ContextMenu"] = 3] = "ContextMenu";
  MouseInteractions2[MouseInteractions2["DblClick"] = 4] = "DblClick";
  MouseInteractions2[MouseInteractions2["Focus"] = 5] = "Focus";
  MouseInteractions2[MouseInteractions2["Blur"] = 6] = "Blur";
  MouseInteractions2[MouseInteractions2["TouchStart"] = 7] = "TouchStart";
  MouseInteractions2[MouseInteractions2["TouchMove_Departed"] = 8] = "TouchMove_Departed";
  MouseInteractions2[MouseInteractions2["TouchEnd"] = 9] = "TouchEnd";
  MouseInteractions2[MouseInteractions2["TouchCancel"] = 10] = "TouchCancel";
  return MouseInteractions2;
})(MouseInteractions || {});
var PointerTypes = /* @__PURE__ */ ((PointerTypes2) => {
  PointerTypes2[PointerTypes2["Mouse"] = 0] = "Mouse";
  PointerTypes2[PointerTypes2["Pen"] = 1] = "Pen";
  PointerTypes2[PointerTypes2["Touch"] = 2] = "Touch";
  return PointerTypes2;
})(PointerTypes || {});
var CanvasContext = /* @__PURE__ */ ((CanvasContext2) => {
  CanvasContext2[CanvasContext2["2D"] = 0] = "2D";
  CanvasContext2[CanvasContext2["WebGL"] = 1] = "WebGL";
  CanvasContext2[CanvasContext2["WebGL2"] = 2] = "WebGL2";
  return CanvasContext2;
})(CanvasContext || {});

function isNodeInLinkedList(n) {
    return '__ln' in n;
}
class DoubleLinkedList {
    constructor() {
        this.length = 0;
        this.head = null;
        this.tail = null;
    }
    get(position) {
        if (position >= this.length) {
            throw new Error('Position outside of list range');
        }
        let current = this.head;
        for (let index = 0; index < position; index++) {
            current = (current === null || current === void 0 ? void 0 : current.next) || null;
        }
        return current;
    }
    addNode(n) {
        const node = {
            value: n,
            previous: null,
            next: null,
        };
        n.__ln = node;
        if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
            const current = n.previousSibling.__ln.next;
            node.next = current;
            node.previous = n.previousSibling.__ln;
            n.previousSibling.__ln.next = node;
            if (current) {
                current.previous = node;
            }
        }
        else if (n.nextSibling &&
            isNodeInLinkedList(n.nextSibling) &&
            n.nextSibling.__ln.previous) {
            const current = n.nextSibling.__ln.previous;
            node.previous = current;
            node.next = n.nextSibling.__ln;
            n.nextSibling.__ln.previous = node;
            if (current) {
                current.next = node;
            }
        }
        else {
            if (this.head) {
                this.head.previous = node;
            }
            node.next = this.head;
            this.head = node;
        }
        if (node.next === null) {
            this.tail = node;
        }
        this.length++;
    }
    removeNode(n) {
        const current = n.__ln;
        if (!this.head) {
            return;
        }
        if (!current.previous) {
            this.head = current.next;
            if (this.head) {
                this.head.previous = null;
            }
            else {
                this.tail = null;
            }
        }
        else {
            current.previous.next = current.next;
            if (current.next) {
                current.next.previous = current.previous;
            }
            else {
                this.tail = current.previous;
            }
        }
        if (n.__ln) {
            delete n.__ln;
        }
        this.length--;
    }
}
const moveKey = (id, parentId) => `${id}@${parentId}`;
class MutationBuffer {
    constructor() {
        this.frozen = false;
        this.locked = false;
        this.texts = [];
        this.attributes = [];
        this.attributeMap = new WeakMap();
        this.removes = [];
        this.mapRemoves = [];
        this.movedMap = {};
        this.addedSet = new Set();
        this.movedSet = new Set();
        this.droppedSet = new Set();
        this.processMutations = (mutations) => {
            mutations.forEach(this.processMutation);
            this.emit();
        };
        this.emit = () => {
            if (this.frozen || this.locked) {
                return;
            }
            const adds = [];
            const addedIds = new Set();
            const addList = new DoubleLinkedList();
            const getNextId = (n) => {
                let ns = n;
                let nextId = IGNORED_NODE;
                while (nextId === IGNORED_NODE) {
                    ns = ns && ns.nextSibling;
                    nextId = ns && this.mirror.getId(ns);
                }
                return nextId;
            };
            const pushAdd = (n) => {
                if (!n.parentNode ||
                    !inDom(n) ||
                    n.parentNode.tagName === 'TEXTAREA') {
                    return;
                }
                const parentId = isShadowRoot(n.parentNode)
                    ? this.mirror.getId(getShadowHost(n))
                    : this.mirror.getId(n.parentNode);
                const nextId = getNextId(n);
                if (parentId === -1 || nextId === -1) {
                    return addList.addNode(n);
                }
                const sn = serializeNodeWithId(n, {
                    doc: this.doc,
                    mirror: this.mirror,
                    blockClass: this.blockClass,
                    blockSelector: this.blockSelector,
                    maskTextClass: this.maskTextClass,
                    maskTextSelector: this.maskTextSelector,
                    skipChild: true,
                    newlyAddedElement: true,
                    inlineStylesheet: this.inlineStylesheet,
                    maskInputOptions: this.maskInputOptions,
                    maskTextFn: this.maskTextFn,
                    maskInputFn: this.maskInputFn,
                    slimDOMOptions: this.slimDOMOptions,
                    dataURLOptions: this.dataURLOptions,
                    recordCanvas: this.recordCanvas,
                    inlineImages: this.inlineImages,
                    onSerialize: (currentN) => {
                        if (isSerializedIframe(currentN, this.mirror)) {
                            this.iframeManager.addIframe(currentN);
                        }
                        if (isSerializedStylesheet(currentN, this.mirror)) {
                            this.stylesheetManager.trackLinkElement(currentN);
                        }
                        if (hasShadowRoot(n)) {
                            this.shadowDomManager.addShadowRoot(n.shadowRoot, this.doc);
                        }
                    },
                    onIframeLoad: (iframe, childSn) => {
                        this.iframeManager.attachIframe(iframe, childSn);
                        this.shadowDomManager.observeAttachShadow(iframe);
                    },
                    onStylesheetLoad: (link, childSn) => {
                        this.stylesheetManager.attachLinkElement(link, childSn);
                    },
                });
                if (sn) {
                    adds.push({
                        parentId,
                        nextId,
                        node: sn,
                    });
                    addedIds.add(sn.id);
                }
            };
            while (this.mapRemoves.length) {
                this.mirror.removeNodeFromMap(this.mapRemoves.shift());
            }
            for (const n of this.movedSet) {
                if (isParentRemoved(this.removes, n, this.mirror) &&
                    !this.movedSet.has(n.parentNode)) {
                    continue;
                }
                pushAdd(n);
            }
            for (const n of this.addedSet) {
                if (!isAncestorInSet(this.droppedSet, n) &&
                    !isParentRemoved(this.removes, n, this.mirror)) {
                    pushAdd(n);
                }
                else if (isAncestorInSet(this.movedSet, n)) {
                    pushAdd(n);
                }
                else {
                    this.droppedSet.add(n);
                }
            }
            let candidate = null;
            while (addList.length) {
                let node = null;
                if (candidate) {
                    const parentId = this.mirror.getId(candidate.value.parentNode);
                    const nextId = getNextId(candidate.value);
                    if (parentId !== -1 && nextId !== -1) {
                        node = candidate;
                    }
                }
                if (!node) {
                    let tailNode = addList.tail;
                    while (tailNode) {
                        const _node = tailNode;
                        tailNode = tailNode.previous;
                        if (_node) {
                            const parentId = this.mirror.getId(_node.value.parentNode);
                            const nextId = getNextId(_node.value);
                            if (nextId === -1)
                                continue;
                            else if (parentId !== -1) {
                                node = _node;
                                break;
                            }
                            else {
                                const unhandledNode = _node.value;
                                if (unhandledNode.parentNode &&
                                    unhandledNode.parentNode.nodeType ===
                                        Node.DOCUMENT_FRAGMENT_NODE) {
                                    const shadowHost = unhandledNode.parentNode
                                        .host;
                                    const parentId = this.mirror.getId(shadowHost);
                                    if (parentId !== -1) {
                                        node = _node;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if (!node) {
                    while (addList.head) {
                        addList.removeNode(addList.head.value);
                    }
                    break;
                }
                candidate = node.previous;
                addList.removeNode(node.value);
                pushAdd(node.value);
            }
            const payload = {
                texts: this.texts
                    .map((text) => {
                    const n = text.node;
                    if (n.parentNode &&
                        n.parentNode.tagName === 'TEXTAREA') {
                        this.genTextAreaValueMutation(n.parentNode);
                    }
                    return {
                        id: this.mirror.getId(n),
                        value: text.value,
                    };
                })
                    .filter((text) => !addedIds.has(text.id))
                    .filter((text) => this.mirror.has(text.id)),
                attributes: this.attributes
                    .map((attribute) => {
                    const { attributes } = attribute;
                    if (typeof attributes.style === 'string') {
                        const diffAsStr = JSON.stringify(attribute.styleDiff);
                        const unchangedAsStr = JSON.stringify(attribute._unchangedStyles);
                        if (diffAsStr.length < attributes.style.length) {
                            if ((diffAsStr + unchangedAsStr).split('var(').length ===
                                attributes.style.split('var(').length) {
                                attributes.style = attribute.styleDiff;
                            }
                        }
                    }
                    return {
                        id: this.mirror.getId(attribute.node),
                        attributes: attributes,
                    };
                })
                    .filter((attribute) => !addedIds.has(attribute.id))
                    .filter((attribute) => this.mirror.has(attribute.id)),
                removes: this.removes,
                adds,
            };
            if (!payload.texts.length &&
                !payload.attributes.length &&
                !payload.removes.length &&
                !payload.adds.length) {
                return;
            }
            this.texts = [];
            this.attributes = [];
            this.attributeMap = new WeakMap();
            this.removes = [];
            this.addedSet = new Set();
            this.movedSet = new Set();
            this.droppedSet = new Set();
            this.movedMap = {};
            this.mutationCb(payload);
        };
        this.genTextAreaValueMutation = (textarea) => {
            let item = this.attributeMap.get(textarea);
            if (!item) {
                item = {
                    node: textarea,
                    attributes: {},
                    styleDiff: {},
                    _unchangedStyles: {},
                };
                this.attributes.push(item);
                this.attributeMap.set(textarea, item);
            }
            item.attributes.value = Array.from(textarea.childNodes, (cn) => cn.textContent || '').join('');
        };
        this.processMutation = (m) => {
            if (isIgnored(m.target, this.mirror)) {
                return;
            }
            switch (m.type) {
                case 'characterData': {
                    const value = m.target.textContent;
                    if (!isBlocked(m.target, this.blockClass, this.blockSelector, false) &&
                        value !== m.oldValue) {
                        this.texts.push({
                            value: needMaskingText(m.target, this.maskTextClass, this.maskTextSelector, true) && value
                                ? this.maskTextFn
                                    ? this.maskTextFn(value, closestElementOfNode(m.target))
                                    : value.replace(/[\S]/g, '*')
                                : value,
                            node: m.target,
                        });
                    }
                    break;
                }
                case 'attributes': {
                    const target = m.target;
                    let attributeName = m.attributeName;
                    let value = m.target.getAttribute(attributeName);
                    if (attributeName === 'value') {
                        const type = getInputType(target);
                        value = maskInputValue({
                            element: target,
                            maskInputOptions: this.maskInputOptions,
                            tagName: target.tagName,
                            type,
                            value,
                            maskInputFn: this.maskInputFn,
                        });
                    }
                    if (isBlocked(m.target, this.blockClass, this.blockSelector, false) ||
                        value === m.oldValue) {
                        return;
                    }
                    let item = this.attributeMap.get(m.target);
                    if (target.tagName === 'IFRAME' &&
                        attributeName === 'src' &&
                        !this.keepIframeSrcFn(value)) {
                        if (!target.contentDocument) {
                            attributeName = 'rr_src';
                        }
                        else {
                            return;
                        }
                    }
                    if (!item) {
                        item = {
                            node: m.target,
                            attributes: {},
                            styleDiff: {},
                            _unchangedStyles: {},
                        };
                        this.attributes.push(item);
                        this.attributeMap.set(m.target, item);
                    }
                    if (attributeName === 'type' &&
                        target.tagName === 'INPUT' &&
                        (m.oldValue || '').toLowerCase() === 'password') {
                        target.setAttribute('data-rr-is-password', 'true');
                    }
                    if (!ignoreAttribute(target.tagName, attributeName)) {
                        item.attributes[attributeName] = transformAttribute(this.doc, toLowerCase(target.tagName), toLowerCase(attributeName), value);
                        if (attributeName === 'style') {
                            if (!this.unattachedDoc) {
                                try {
                                    this.unattachedDoc =
                                        document.implementation.createHTMLDocument();
                                }
                                catch (e) {
                                    this.unattachedDoc = this.doc;
                                }
                            }
                            const old = this.unattachedDoc.createElement('span');
                            if (m.oldValue) {
                                old.setAttribute('style', m.oldValue);
                            }
                            for (const pname of Array.from(target.style)) {
                                const newValue = target.style.getPropertyValue(pname);
                                const newPriority = target.style.getPropertyPriority(pname);
                                if (newValue !== old.style.getPropertyValue(pname) ||
                                    newPriority !== old.style.getPropertyPriority(pname)) {
                                    if (newPriority === '') {
                                        item.styleDiff[pname] = newValue;
                                    }
                                    else {
                                        item.styleDiff[pname] = [newValue, newPriority];
                                    }
                                }
                                else {
                                    item._unchangedStyles[pname] = [newValue, newPriority];
                                }
                            }
                            for (const pname of Array.from(old.style)) {
                                if (target.style.getPropertyValue(pname) === '') {
                                    item.styleDiff[pname] = false;
                                }
                            }
                        }
                    }
                    break;
                }
                case 'childList': {
                    if (isBlocked(m.target, this.blockClass, this.blockSelector, true))
                        return;
                    if (m.target.tagName === 'TEXTAREA') {
                        this.genTextAreaValueMutation(m.target);
                        return;
                    }
                    m.addedNodes.forEach((n) => this.genAdds(n, m.target));
                    m.removedNodes.forEach((n) => {
                        const nodeId = this.mirror.getId(n);
                        const parentId = isShadowRoot(m.target)
                            ? this.mirror.getId(m.target.host)
                            : this.mirror.getId(m.target);
                        if (isBlocked(m.target, this.blockClass, this.blockSelector, false) ||
                            isIgnored(n, this.mirror) ||
                            !isSerialized(n, this.mirror)) {
                            return;
                        }
                        if (this.addedSet.has(n)) {
                            deepDelete(this.addedSet, n);
                            this.droppedSet.add(n);
                        }
                        else if (this.addedSet.has(m.target) && nodeId === -1) ;
                        else if (isAncestorRemoved(m.target, this.mirror)) ;
                        else if (this.movedSet.has(n) &&
                            this.movedMap[moveKey(nodeId, parentId)]) {
                            deepDelete(this.movedSet, n);
                        }
                        else {
                            this.removes.push({
                                parentId,
                                id: nodeId,
                                isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target)
                                    ? true
                                    : undefined,
                            });
                        }
                        this.mapRemoves.push(n);
                    });
                    break;
                }
            }
        };
        this.genAdds = (n, target) => {
            if (this.processedNodeManager.inOtherBuffer(n, this))
                return;
            if (this.addedSet.has(n) || this.movedSet.has(n))
                return;
            if (this.mirror.hasNode(n)) {
                if (isIgnored(n, this.mirror)) {
                    return;
                }
                this.movedSet.add(n);
                let targetId = null;
                if (target && this.mirror.hasNode(target)) {
                    targetId = this.mirror.getId(target);
                }
                if (targetId && targetId !== -1) {
                    this.movedMap[moveKey(this.mirror.getId(n), targetId)] = true;
                }
            }
            else {
                this.addedSet.add(n);
                this.droppedSet.delete(n);
            }
            if (!isBlocked(n, this.blockClass, this.blockSelector, false)) {
                n.childNodes.forEach((childN) => this.genAdds(childN));
                if (hasShadowRoot(n)) {
                    n.shadowRoot.childNodes.forEach((childN) => {
                        this.processedNodeManager.add(childN, this);
                        this.genAdds(childN, n);
                    });
                }
            }
        };
    }
    init(options) {
        [
            'mutationCb',
            'blockClass',
            'blockSelector',
            'maskTextClass',
            'maskTextSelector',
            'inlineStylesheet',
            'maskInputOptions',
            'maskTextFn',
            'maskInputFn',
            'keepIframeSrcFn',
            'recordCanvas',
            'inlineImages',
            'slimDOMOptions',
            'dataURLOptions',
            'doc',
            'mirror',
            'iframeManager',
            'stylesheetManager',
            'shadowDomManager',
            'canvasManager',
            'processedNodeManager',
        ].forEach((key) => {
            this[key] = options[key];
        });
    }
    freeze() {
        this.frozen = true;
        this.canvasManager.freeze();
    }
    unfreeze() {
        this.frozen = false;
        this.canvasManager.unfreeze();
        this.emit();
    }
    isFrozen() {
        return this.frozen;
    }
    lock() {
        this.locked = true;
        this.canvasManager.lock();
    }
    unlock() {
        this.locked = false;
        this.canvasManager.unlock();
        this.emit();
    }
    reset() {
        this.shadowDomManager.reset();
        this.canvasManager.reset();
    }
}
function deepDelete(addsSet, n) {
    addsSet.delete(n);
    n.childNodes.forEach((childN) => deepDelete(addsSet, childN));
}
function isParentRemoved(removes, n, mirror) {
    if (removes.length === 0)
        return false;
    return _isParentRemoved(removes, n, mirror);
}
function _isParentRemoved(removes, n, mirror) {
    const { parentNode } = n;
    if (!parentNode) {
        return false;
    }
    const parentId = mirror.getId(parentNode);
    if (removes.some((r) => r.id === parentId)) {
        return true;
    }
    return _isParentRemoved(removes, parentNode, mirror);
}
function isAncestorInSet(set, n) {
    if (set.size === 0)
        return false;
    return _isAncestorInSet(set, n);
}
function _isAncestorInSet(set, n) {
    const { parentNode } = n;
    if (!parentNode) {
        return false;
    }
    if (set.has(parentNode)) {
        return true;
    }
    return _isAncestorInSet(set, parentNode);
}

let errorHandler;
function registerErrorHandler(handler) {
    errorHandler = handler;
}
function unregisterErrorHandler() {
    errorHandler = undefined;
}
const callbackWrapper = (cb) => {
    if (!errorHandler) {
        return cb;
    }
    const rrwebWrapped = ((...rest) => {
        try {
            return cb(...rest);
        }
        catch (error) {
            if (errorHandler && errorHandler(error) === true) {
                return;
            }
            throw error;
        }
    });
    return rrwebWrapped;
};

const mutationBuffers = [];
function getEventTarget(event) {
    try {
        if ('composedPath' in event) {
            const path = event.composedPath();
            if (path.length) {
                return path[0];
            }
        }
        else if ('path' in event && event.path.length) {
            return event.path[0];
        }
    }
    catch (_a) {
    }
    return event && event.target;
}
function initMutationObserver(options, rootEl) {
    var _a, _b;
    const mutationBuffer = new MutationBuffer();
    mutationBuffers.push(mutationBuffer);
    mutationBuffer.init(options);
    let mutationObserverCtor = window.MutationObserver ||
        window.__rrMutationObserver;
    const angularZoneSymbol = (_b = (_a = window === null || window === void 0 ? void 0 : window.Zone) === null || _a === void 0 ? void 0 : _a.__symbol__) === null || _b === void 0 ? void 0 : _b.call(_a, 'MutationObserver');
    if (angularZoneSymbol &&
        window[angularZoneSymbol]) {
        mutationObserverCtor = window[angularZoneSymbol];
    }
    const observer = new mutationObserverCtor(callbackWrapper(mutationBuffer.processMutations.bind(mutationBuffer)));
    observer.observe(rootEl, {
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true,
    });
    return observer;
}
function initMoveObserver({ mousemoveCb, sampling, doc, mirror, }) {
    if (sampling.mousemove === false) {
        return () => {
        };
    }
    const threshold = typeof sampling.mousemove === 'number' ? sampling.mousemove : 50;
    const callbackThreshold = typeof sampling.mousemoveCallback === 'number'
        ? sampling.mousemoveCallback
        : 500;
    let positions = [];
    let timeBaseline;
    const wrappedCb = throttle(callbackWrapper((source) => {
        const totalOffset = Date.now() - timeBaseline;
        mousemoveCb(positions.map((p) => {
            p.timeOffset -= totalOffset;
            return p;
        }), source);
        positions = [];
        timeBaseline = null;
    }), callbackThreshold);
    const updatePosition = callbackWrapper(throttle(callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        const { clientX, clientY } = legacy_isTouchEvent(evt)
            ? evt.changedTouches[0]
            : evt;
        if (!timeBaseline) {
            timeBaseline = nowTimestamp();
        }
        positions.push({
            x: clientX,
            y: clientY,
            id: mirror.getId(target),
            timeOffset: nowTimestamp() - timeBaseline,
        });
        wrappedCb(typeof DragEvent !== 'undefined' && evt instanceof DragEvent
            ? IncrementalSource.Drag
            : evt instanceof MouseEvent
                ? IncrementalSource.MouseMove
                : IncrementalSource.TouchMove);
    }), threshold, {
        trailing: false,
    }));
    const handlers = [
        on('mousemove', updatePosition, doc),
        on('touchmove', updatePosition, doc),
        on('drag', updatePosition, doc),
    ];
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initMouseInteractionObserver({ mouseInteractionCb, doc, mirror, blockClass, blockSelector, sampling, }) {
    if (sampling.mouseInteraction === false) {
        return () => {
        };
    }
    const disableMap = sampling.mouseInteraction === true ||
        sampling.mouseInteraction === undefined
        ? {}
        : sampling.mouseInteraction;
    const handlers = [];
    let currentPointerType = null;
    const getHandler = (eventKey) => {
        return (event) => {
            const target = getEventTarget(event);
            if (isBlocked(target, blockClass, blockSelector, true)) {
                return;
            }
            let pointerType = null;
            let thisEventKey = eventKey;
            if ('pointerType' in event) {
                switch (event.pointerType) {
                    case 'mouse':
                        pointerType = PointerTypes.Mouse;
                        break;
                    case 'touch':
                        pointerType = PointerTypes.Touch;
                        break;
                    case 'pen':
                        pointerType = PointerTypes.Pen;
                        break;
                }
                if (pointerType === PointerTypes.Touch) {
                    if (MouseInteractions[eventKey] === MouseInteractions.MouseDown) {
                        thisEventKey = 'TouchStart';
                    }
                    else if (MouseInteractions[eventKey] === MouseInteractions.MouseUp) {
                        thisEventKey = 'TouchEnd';
                    }
                }
                else if (pointerType === PointerTypes.Pen) ;
            }
            else if (legacy_isTouchEvent(event)) {
                pointerType = PointerTypes.Touch;
            }
            if (pointerType !== null) {
                currentPointerType = pointerType;
                if ((thisEventKey.startsWith('Touch') &&
                    pointerType === PointerTypes.Touch) ||
                    (thisEventKey.startsWith('Mouse') &&
                        pointerType === PointerTypes.Mouse)) {
                    pointerType = null;
                }
            }
            else if (MouseInteractions[eventKey] === MouseInteractions.Click) {
                pointerType = currentPointerType;
                currentPointerType = null;
            }
            const e = legacy_isTouchEvent(event) ? event.changedTouches[0] : event;
            if (!e) {
                return;
            }
            const id = mirror.getId(target);
            const { clientX, clientY } = e;
            callbackWrapper(mouseInteractionCb)(Object.assign({ type: MouseInteractions[thisEventKey], id, x: clientX, y: clientY }, (pointerType !== null && { pointerType })));
        };
    };
    Object.keys(MouseInteractions)
        .filter((key) => Number.isNaN(Number(key)) &&
        !key.endsWith('_Departed') &&
        disableMap[key] !== false)
        .forEach((eventKey) => {
        let eventName = toLowerCase(eventKey);
        const handler = getHandler(eventKey);
        if (window.PointerEvent) {
            switch (MouseInteractions[eventKey]) {
                case MouseInteractions.MouseDown:
                case MouseInteractions.MouseUp:
                    eventName = eventName.replace('mouse', 'pointer');
                    break;
                case MouseInteractions.TouchStart:
                case MouseInteractions.TouchEnd:
                    return;
            }
        }
        handlers.push(on(eventName, handler, doc));
    });
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initScrollObserver({ scrollCb, doc, mirror, blockClass, blockSelector, sampling, }) {
    const updatePosition = callbackWrapper(throttle(callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        if (!target ||
            isBlocked(target, blockClass, blockSelector, true)) {
            return;
        }
        const id = mirror.getId(target);
        if (target === doc && doc.defaultView) {
            const scrollLeftTop = getWindowScroll(doc.defaultView);
            scrollCb({
                id,
                x: scrollLeftTop.left,
                y: scrollLeftTop.top,
            });
        }
        else {
            scrollCb({
                id,
                x: target.scrollLeft,
                y: target.scrollTop,
            });
        }
    }), sampling.scroll || 100));
    return on('scroll', updatePosition, doc);
}
function initViewportResizeObserver({ viewportResizeCb }, { win }) {
    let lastH = -1;
    let lastW = -1;
    const updateDimension = callbackWrapper(throttle(callbackWrapper(() => {
        const height = getWindowHeight();
        const width = getWindowWidth();
        if (lastH !== height || lastW !== width) {
            viewportResizeCb({
                width: Number(width),
                height: Number(height),
            });
            lastH = height;
            lastW = width;
        }
    }), 200));
    return on('resize', updateDimension, win);
}
const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const lastInputValueMap = new WeakMap();
function initInputObserver({ inputCb, doc, mirror, blockClass, blockSelector, ignoreClass, ignoreSelector, maskInputOptions, maskInputFn, sampling, userTriggeredOnInput, }) {
    function eventHandler(event) {
        let target = getEventTarget(event);
        const userTriggered = event.isTrusted;
        const tagName = target && target.tagName;
        if (target && tagName === 'OPTION') {
            target = target.parentElement;
        }
        if (!target ||
            !tagName ||
            INPUT_TAGS.indexOf(tagName) < 0 ||
            isBlocked(target, blockClass, blockSelector, true)) {
            return;
        }
        if (target.classList.contains(ignoreClass) ||
            (ignoreSelector && target.matches(ignoreSelector))) {
            return;
        }
        let text = target.value;
        let isChecked = false;
        const type = getInputType(target) || '';
        if (type === 'radio' || type === 'checkbox') {
            isChecked = target.checked;
        }
        else if (maskInputOptions[tagName.toLowerCase()] ||
            maskInputOptions[type]) {
            text = maskInputValue({
                element: target,
                maskInputOptions,
                tagName,
                type,
                value: text,
                maskInputFn,
            });
        }
        cbWithDedup(target, userTriggeredOnInput
            ? { text, isChecked, userTriggered }
            : { text, isChecked });
        const name = target.name;
        if (type === 'radio' && name && isChecked) {
            doc
                .querySelectorAll(`input[type="radio"][name="${name}"]`)
                .forEach((el) => {
                if (el !== target) {
                    const text = el.value;
                    cbWithDedup(el, userTriggeredOnInput
                        ? { text, isChecked: !isChecked, userTriggered: false }
                        : { text, isChecked: !isChecked });
                }
            });
        }
    }
    function cbWithDedup(target, v) {
        const lastInputValue = lastInputValueMap.get(target);
        if (!lastInputValue ||
            lastInputValue.text !== v.text ||
            lastInputValue.isChecked !== v.isChecked) {
            lastInputValueMap.set(target, v);
            const id = mirror.getId(target);
            callbackWrapper(inputCb)(Object.assign(Object.assign({}, v), { id }));
        }
    }
    const events = sampling.input === 'last' ? ['change'] : ['input', 'change'];
    const handlers = events.map((eventName) => on(eventName, callbackWrapper(eventHandler), doc));
    const currentWindow = doc.defaultView;
    if (!currentWindow) {
        return () => {
            handlers.forEach((h) => h());
        };
    }
    const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(currentWindow.HTMLInputElement.prototype, 'value');
    const hookProperties = [
        [currentWindow.HTMLInputElement.prototype, 'value'],
        [currentWindow.HTMLInputElement.prototype, 'checked'],
        [currentWindow.HTMLSelectElement.prototype, 'value'],
        [currentWindow.HTMLTextAreaElement.prototype, 'value'],
        [currentWindow.HTMLSelectElement.prototype, 'selectedIndex'],
        [currentWindow.HTMLOptionElement.prototype, 'selected'],
    ];
    if (propertyDescriptor && propertyDescriptor.set) {
        handlers.push(...hookProperties.map((p) => hookSetter(p[0], p[1], {
            set() {
                callbackWrapper(eventHandler)({
                    target: this,
                    isTrusted: false,
                });
            },
        }, false, currentWindow)));
    }
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function getNestedCSSRulePositions(rule) {
    const positions = [];
    function recurse(childRule, pos) {
        if ((hasNestedCSSRule('CSSGroupingRule') &&
            childRule.parentRule instanceof CSSGroupingRule) ||
            (hasNestedCSSRule('CSSMediaRule') &&
                childRule.parentRule instanceof CSSMediaRule) ||
            (hasNestedCSSRule('CSSSupportsRule') &&
                childRule.parentRule instanceof CSSSupportsRule) ||
            (hasNestedCSSRule('CSSConditionRule') &&
                childRule.parentRule instanceof CSSConditionRule)) {
            const rules = Array.from(childRule.parentRule.cssRules);
            const index = rules.indexOf(childRule);
            pos.unshift(index);
        }
        else if (childRule.parentStyleSheet) {
            const rules = Array.from(childRule.parentStyleSheet.cssRules);
            const index = rules.indexOf(childRule);
            pos.unshift(index);
        }
        return pos;
    }
    return recurse(rule, positions);
}
function getIdAndStyleId(sheet, mirror, styleMirror) {
    let id, styleId;
    if (!sheet)
        return {};
    if (sheet.ownerNode)
        id = mirror.getId(sheet.ownerNode);
    else
        styleId = styleMirror.getId(sheet);
    return {
        styleId,
        id,
    };
}
function initStyleSheetObserver({ styleSheetRuleCb, mirror, stylesheetManager }, { win }) {
    if (!win.CSSStyleSheet || !win.CSSStyleSheet.prototype) {
        return () => {
        };
    }
    const insertRule = win.CSSStyleSheet.prototype.insertRule;
    win.CSSStyleSheet.prototype.insertRule = new Proxy(insertRule, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            const [rule, index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleSheetRuleCb({
                    id,
                    styleId,
                    adds: [{ rule, index }],
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
    win.CSSStyleSheet.prototype.deleteRule = new Proxy(deleteRule, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            const [index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleSheetRuleCb({
                    id,
                    styleId,
                    removes: [{ index }],
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    let replace;
    if (win.CSSStyleSheet.prototype.replace) {
        replace = win.CSSStyleSheet.prototype.replace;
        win.CSSStyleSheet.prototype.replace = new Proxy(replace, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [text] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        replace: text,
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
    }
    let replaceSync;
    if (win.CSSStyleSheet.prototype.replaceSync) {
        replaceSync = win.CSSStyleSheet.prototype.replaceSync;
        win.CSSStyleSheet.prototype.replaceSync = new Proxy(replaceSync, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [text] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        replaceSync: text,
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
    }
    const supportedNestedCSSRuleTypes = {};
    if (canMonkeyPatchNestedCSSRule('CSSGroupingRule')) {
        supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
    }
    else {
        if (canMonkeyPatchNestedCSSRule('CSSMediaRule')) {
            supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
        }
        if (canMonkeyPatchNestedCSSRule('CSSConditionRule')) {
            supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
        }
        if (canMonkeyPatchNestedCSSRule('CSSSupportsRule')) {
            supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
        }
    }
    const unmodifiedFunctions = {};
    Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
        unmodifiedFunctions[typeKey] = {
            insertRule: type.prototype.insertRule,
            deleteRule: type.prototype.deleteRule,
        };
        type.prototype.insertRule = new Proxy(unmodifiedFunctions[typeKey].insertRule, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [rule, index] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg.parentStyleSheet, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        adds: [
                            {
                                rule,
                                index: [
                                    ...getNestedCSSRulePositions(thisArg),
                                    index || 0,
                                ],
                            },
                        ],
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
        type.prototype.deleteRule = new Proxy(unmodifiedFunctions[typeKey].deleteRule, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [index] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg.parentStyleSheet, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        removes: [
                            { index: [...getNestedCSSRulePositions(thisArg), index] },
                        ],
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
    });
    return callbackWrapper(() => {
        win.CSSStyleSheet.prototype.insertRule = insertRule;
        win.CSSStyleSheet.prototype.deleteRule = deleteRule;
        replace && (win.CSSStyleSheet.prototype.replace = replace);
        replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
        Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
            type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
            type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
        });
    });
}
function initAdoptedStyleSheetObserver({ mirror, stylesheetManager, }, host) {
    var _a, _b, _c;
    let hostId = null;
    if (host.nodeName === '#document')
        hostId = mirror.getId(host);
    else
        hostId = mirror.getId(host.host);
    const patchTarget = host.nodeName === '#document'
        ? (_a = host.defaultView) === null || _a === void 0 ? void 0 : _a.Document
        : (_c = (_b = host.ownerDocument) === null || _b === void 0 ? void 0 : _b.defaultView) === null || _c === void 0 ? void 0 : _c.ShadowRoot;
    const originalPropertyDescriptor = (patchTarget === null || patchTarget === void 0 ? void 0 : patchTarget.prototype)
        ? Object.getOwnPropertyDescriptor(patchTarget === null || patchTarget === void 0 ? void 0 : patchTarget.prototype, 'adoptedStyleSheets')
        : undefined;
    if (hostId === null ||
        hostId === -1 ||
        !patchTarget ||
        !originalPropertyDescriptor)
        return () => {
        };
    Object.defineProperty(host, 'adoptedStyleSheets', {
        configurable: originalPropertyDescriptor.configurable,
        enumerable: originalPropertyDescriptor.enumerable,
        get() {
            var _a;
            return (_a = originalPropertyDescriptor.get) === null || _a === void 0 ? void 0 : _a.call(this);
        },
        set(sheets) {
            var _a;
            const result = (_a = originalPropertyDescriptor.set) === null || _a === void 0 ? void 0 : _a.call(this, sheets);
            if (hostId !== null && hostId !== -1) {
                try {
                    stylesheetManager.adoptStyleSheets(sheets, hostId);
                }
                catch (e) {
                }
            }
            return result;
        },
    });
    return callbackWrapper(() => {
        Object.defineProperty(host, 'adoptedStyleSheets', {
            configurable: originalPropertyDescriptor.configurable,
            enumerable: originalPropertyDescriptor.enumerable,
            get: originalPropertyDescriptor.get,
            set: originalPropertyDescriptor.set,
        });
    });
}
function initStyleDeclarationObserver({ styleDeclarationCb, mirror, ignoreCSSAttributes, stylesheetManager, }, { win }) {
    const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
    win.CSSStyleDeclaration.prototype.setProperty = new Proxy(setProperty, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            var _a;
            const [property, value, priority] = argumentsList;
            if (ignoreCSSAttributes.has(property)) {
                return setProperty.apply(thisArg, [property, value, priority]);
            }
            const { id, styleId } = getIdAndStyleId((_a = thisArg.parentRule) === null || _a === void 0 ? void 0 : _a.parentStyleSheet, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleDeclarationCb({
                    id,
                    styleId,
                    set: {
                        property,
                        value,
                        priority,
                    },
                    index: getNestedCSSRulePositions(thisArg.parentRule),
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
    win.CSSStyleDeclaration.prototype.removeProperty = new Proxy(removeProperty, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            var _a;
            const [property] = argumentsList;
            if (ignoreCSSAttributes.has(property)) {
                return removeProperty.apply(thisArg, [property]);
            }
            const { id, styleId } = getIdAndStyleId((_a = thisArg.parentRule) === null || _a === void 0 ? void 0 : _a.parentStyleSheet, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleDeclarationCb({
                    id,
                    styleId,
                    remove: {
                        property,
                    },
                    index: getNestedCSSRulePositions(thisArg.parentRule),
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    return callbackWrapper(() => {
        win.CSSStyleDeclaration.prototype.setProperty = setProperty;
        win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
    });
}
function initMediaInteractionObserver({ mediaInteractionCb, blockClass, blockSelector, mirror, sampling, doc, }) {
    const handler = callbackWrapper((type) => throttle(callbackWrapper((event) => {
        const target = getEventTarget(event);
        if (!target ||
            isBlocked(target, blockClass, blockSelector, true)) {
            return;
        }
        const { currentTime, volume, muted, playbackRate, loop } = target;
        mediaInteractionCb({
            type,
            id: mirror.getId(target),
            currentTime,
            volume,
            muted,
            playbackRate,
            loop,
        });
    }), sampling.media || 500));
    const handlers = [
        on('play', handler(0), doc),
        on('pause', handler(1), doc),
        on('seeked', handler(2), doc),
        on('volumechange', handler(3), doc),
        on('ratechange', handler(4), doc),
    ];
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initFontObserver({ fontCb, doc }) {
    const win = doc.defaultView;
    if (!win) {
        return () => {
        };
    }
    const handlers = [];
    const fontMap = new WeakMap();
    const originalFontFace = win.FontFace;
    win.FontFace = function FontFace(family, source, descriptors) {
        const fontFace = new originalFontFace(family, source, descriptors);
        fontMap.set(fontFace, {
            family,
            buffer: typeof source !== 'string',
            descriptors,
            fontSource: typeof source === 'string'
                ? source
                : JSON.stringify(Array.from(new Uint8Array(source))),
        });
        return fontFace;
    };
    const restoreHandler = patch(doc.fonts, 'add', function (original) {
        return function (fontFace) {
            setTimeout(callbackWrapper(() => {
                const p = fontMap.get(fontFace);
                if (p) {
                    fontCb(p);
                    fontMap.delete(fontFace);
                }
            }), 0);
            return original.apply(this, [fontFace]);
        };
    });
    handlers.push(() => {
        win.FontFace = originalFontFace;
    });
    handlers.push(restoreHandler);
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initSelectionObserver(param) {
    const { doc, mirror, blockClass, blockSelector, selectionCb } = param;
    let collapsed = true;
    const updateSelection = callbackWrapper(() => {
        const selection = doc.getSelection();
        if (!selection || (collapsed && (selection === null || selection === void 0 ? void 0 : selection.isCollapsed)))
            return;
        collapsed = selection.isCollapsed || false;
        const ranges = [];
        const count = selection.rangeCount || 0;
        for (let i = 0; i < count; i++) {
            const range = selection.getRangeAt(i);
            const { startContainer, startOffset, endContainer, endOffset } = range;
            const blocked = isBlocked(startContainer, blockClass, blockSelector, true) ||
                isBlocked(endContainer, blockClass, blockSelector, true);
            if (blocked)
                continue;
            ranges.push({
                start: mirror.getId(startContainer),
                startOffset,
                end: mirror.getId(endContainer),
                endOffset,
            });
        }
        selectionCb({ ranges });
    });
    updateSelection();
    return on('selectionchange', updateSelection);
}
function initCustomElementObserver({ doc, customElementCb, }) {
    const win = doc.defaultView;
    if (!win || !win.customElements)
        return () => { };
    const restoreHandler = patch(win.customElements, 'define', function (original) {
        return function (name, constructor, options) {
            try {
                customElementCb({
                    define: {
                        name,
                    },
                });
            }
            catch (e) {
                console.warn(`Custom element callback failed for ${name}`);
            }
            return original.apply(this, [name, constructor, options]);
        };
    });
    return restoreHandler;
}
function mergeHooks(o, hooks) {
    const { mutationCb, mousemoveCb, mouseInteractionCb, scrollCb, viewportResizeCb, inputCb, mediaInteractionCb, styleSheetRuleCb, styleDeclarationCb, canvasMutationCb, fontCb, selectionCb, customElementCb, } = o;
    o.mutationCb = (...p) => {
        if (hooks.mutation) {
            hooks.mutation(...p);
        }
        mutationCb(...p);
    };
    o.mousemoveCb = (...p) => {
        if (hooks.mousemove) {
            hooks.mousemove(...p);
        }
        mousemoveCb(...p);
    };
    o.mouseInteractionCb = (...p) => {
        if (hooks.mouseInteraction) {
            hooks.mouseInteraction(...p);
        }
        mouseInteractionCb(...p);
    };
    o.scrollCb = (...p) => {
        if (hooks.scroll) {
            hooks.scroll(...p);
        }
        scrollCb(...p);
    };
    o.viewportResizeCb = (...p) => {
        if (hooks.viewportResize) {
            hooks.viewportResize(...p);
        }
        viewportResizeCb(...p);
    };
    o.inputCb = (...p) => {
        if (hooks.input) {
            hooks.input(...p);
        }
        inputCb(...p);
    };
    o.mediaInteractionCb = (...p) => {
        if (hooks.mediaInteaction) {
            hooks.mediaInteaction(...p);
        }
        mediaInteractionCb(...p);
    };
    o.styleSheetRuleCb = (...p) => {
        if (hooks.styleSheetRule) {
            hooks.styleSheetRule(...p);
        }
        styleSheetRuleCb(...p);
    };
    o.styleDeclarationCb = (...p) => {
        if (hooks.styleDeclaration) {
            hooks.styleDeclaration(...p);
        }
        styleDeclarationCb(...p);
    };
    o.canvasMutationCb = (...p) => {
        if (hooks.canvasMutation) {
            hooks.canvasMutation(...p);
        }
        canvasMutationCb(...p);
    };
    o.fontCb = (...p) => {
        if (hooks.font) {
            hooks.font(...p);
        }
        fontCb(...p);
    };
    o.selectionCb = (...p) => {
        if (hooks.selection) {
            hooks.selection(...p);
        }
        selectionCb(...p);
    };
    o.customElementCb = (...c) => {
        if (hooks.customElement) {
            hooks.customElement(...c);
        }
        customElementCb(...c);
    };
}
function initObservers(o, hooks = {}) {
    const currentWindow = o.doc.defaultView;
    if (!currentWindow) {
        return () => {
        };
    }
    mergeHooks(o, hooks);
    let mutationObserver;
    if (o.recordDOM) {
        mutationObserver = initMutationObserver(o, o.doc);
    }
    const mousemoveHandler = initMoveObserver(o);
    const mouseInteractionHandler = initMouseInteractionObserver(o);
    const scrollHandler = initScrollObserver(o);
    const viewportResizeHandler = initViewportResizeObserver(o, {
        win: currentWindow,
    });
    const inputHandler = initInputObserver(o);
    const mediaInteractionHandler = initMediaInteractionObserver(o);
    let styleSheetObserver = () => { };
    let adoptedStyleSheetObserver = () => { };
    let styleDeclarationObserver = () => { };
    let fontObserver = () => { };
    if (o.recordDOM) {
        styleSheetObserver = initStyleSheetObserver(o, { win: currentWindow });
        adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o, o.doc);
        styleDeclarationObserver = initStyleDeclarationObserver(o, {
            win: currentWindow,
        });
        if (o.collectFonts) {
            fontObserver = initFontObserver(o);
        }
    }
    const selectionObserver = initSelectionObserver(o);
    const customElementObserver = initCustomElementObserver(o);
    const pluginHandlers = [];
    for (const plugin of o.plugins) {
        pluginHandlers.push(plugin.observer(plugin.callback, currentWindow, plugin.options));
    }
    return callbackWrapper(() => {
        mutationBuffers.forEach((b) => b.reset());
        mutationObserver === null || mutationObserver === void 0 ? void 0 : mutationObserver.disconnect();
        mousemoveHandler();
        mouseInteractionHandler();
        scrollHandler();
        viewportResizeHandler();
        inputHandler();
        mediaInteractionHandler();
        styleSheetObserver();
        adoptedStyleSheetObserver();
        styleDeclarationObserver();
        fontObserver();
        selectionObserver();
        customElementObserver();
        pluginHandlers.forEach((h) => h());
    });
}
function hasNestedCSSRule(prop) {
    return typeof window[prop] !== 'undefined';
}
function canMonkeyPatchNestedCSSRule(prop) {
    return Boolean(typeof window[prop] !== 'undefined' &&
        window[prop].prototype &&
        'insertRule' in window[prop].prototype &&
        'deleteRule' in window[prop].prototype);
}

class CrossOriginIframeMirror {
    constructor(generateIdFn) {
        this.generateIdFn = generateIdFn;
        this.iframeIdToRemoteIdMap = new WeakMap();
        this.iframeRemoteIdToIdMap = new WeakMap();
    }
    getId(iframe, remoteId, idToRemoteMap, remoteToIdMap) {
        const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
        const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);
        let id = idToRemoteIdMap.get(remoteId);
        if (!id) {
            id = this.generateIdFn();
            idToRemoteIdMap.set(remoteId, id);
            remoteIdToIdMap.set(id, remoteId);
        }
        return id;
    }
    getIds(iframe, remoteId) {
        const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
        const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
        return remoteId.map((id) => this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap));
    }
    getRemoteId(iframe, id, map) {
        const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);
        if (typeof id !== 'number')
            return id;
        const remoteId = remoteIdToIdMap.get(id);
        if (!remoteId)
            return -1;
        return remoteId;
    }
    getRemoteIds(iframe, ids) {
        const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
        return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
    }
    reset(iframe) {
        if (!iframe) {
            this.iframeIdToRemoteIdMap = new WeakMap();
            this.iframeRemoteIdToIdMap = new WeakMap();
            return;
        }
        this.iframeIdToRemoteIdMap.delete(iframe);
        this.iframeRemoteIdToIdMap.delete(iframe);
    }
    getIdToRemoteIdMap(iframe) {
        let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
        if (!idToRemoteIdMap) {
            idToRemoteIdMap = new Map();
            this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
        }
        return idToRemoteIdMap;
    }
    getRemoteIdToIdMap(iframe) {
        let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
        if (!remoteIdToIdMap) {
            remoteIdToIdMap = new Map();
            this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
        }
        return remoteIdToIdMap;
    }
}

class IframeManager {
    constructor(options) {
        this.iframes = new WeakMap();
        this.crossOriginIframeMap = new WeakMap();
        this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
        this.crossOriginIframeRootIdMap = new WeakMap();
        this.mutationCb = options.mutationCb;
        this.wrappedEmit = options.wrappedEmit;
        this.stylesheetManager = options.stylesheetManager;
        this.recordCrossOriginIframes = options.recordCrossOriginIframes;
        this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(this.stylesheetManager.styleMirror.generateId.bind(this.stylesheetManager.styleMirror));
        this.mirror = options.mirror;
        if (this.recordCrossOriginIframes) {
            window.addEventListener('message', this.handleMessage.bind(this));
        }
    }
    addIframe(iframeEl) {
        this.iframes.set(iframeEl, true);
        if (iframeEl.contentWindow)
            this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
    }
    addLoadListener(cb) {
        this.loadListener = cb;
    }
    attachIframe(iframeEl, childSn) {
        var _a;
        this.mutationCb({
            adds: [
                {
                    parentId: this.mirror.getId(iframeEl),
                    nextId: null,
                    node: childSn,
                },
            ],
            removes: [],
            texts: [],
            attributes: [],
            isAttachIframe: true,
        });
        (_a = this.loadListener) === null || _a === void 0 ? void 0 : _a.call(this, iframeEl);
        if (iframeEl.contentDocument &&
            iframeEl.contentDocument.adoptedStyleSheets &&
            iframeEl.contentDocument.adoptedStyleSheets.length > 0)
            this.stylesheetManager.adoptStyleSheets(iframeEl.contentDocument.adoptedStyleSheets, this.mirror.getId(iframeEl.contentDocument));
    }
    handleMessage(message) {
        const crossOriginMessageEvent = message;
        if (crossOriginMessageEvent.data.type !== 'rrweb' ||
            crossOriginMessageEvent.origin !== crossOriginMessageEvent.data.origin)
            return;
        const iframeSourceWindow = message.source;
        if (!iframeSourceWindow)
            return;
        const iframeEl = this.crossOriginIframeMap.get(message.source);
        if (!iframeEl)
            return;
        const transformedEvent = this.transformCrossOriginEvent(iframeEl, crossOriginMessageEvent.data.event);
        if (transformedEvent)
            this.wrappedEmit(transformedEvent, crossOriginMessageEvent.data.isCheckout);
    }
    transformCrossOriginEvent(iframeEl, e) {
        var _a;
        switch (e.type) {
            case EventType.FullSnapshot: {
                this.crossOriginIframeMirror.reset(iframeEl);
                this.crossOriginIframeStyleMirror.reset(iframeEl);
                this.replaceIdOnNode(e.data.node, iframeEl);
                const rootId = e.data.node.id;
                this.crossOriginIframeRootIdMap.set(iframeEl, rootId);
                this.patchRootIdOnNode(e.data.node, rootId);
                return {
                    timestamp: e.timestamp,
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.Mutation,
                        adds: [
                            {
                                parentId: this.mirror.getId(iframeEl),
                                nextId: null,
                                node: e.data.node,
                            },
                        ],
                        removes: [],
                        texts: [],
                        attributes: [],
                        isAttachIframe: true,
                    },
                };
            }
            case EventType.Meta:
            case EventType.Load:
            case EventType.DomContentLoaded: {
                return false;
            }
            case EventType.Plugin: {
                return e;
            }
            case EventType.Custom: {
                this.replaceIds(e.data.payload, iframeEl, ['id', 'parentId', 'previousId', 'nextId']);
                return e;
            }
            case EventType.IncrementalSnapshot: {
                switch (e.data.source) {
                    case IncrementalSource.Mutation: {
                        e.data.adds.forEach((n) => {
                            this.replaceIds(n, iframeEl, [
                                'parentId',
                                'nextId',
                                'previousId',
                            ]);
                            this.replaceIdOnNode(n.node, iframeEl);
                            const rootId = this.crossOriginIframeRootIdMap.get(iframeEl);
                            rootId && this.patchRootIdOnNode(n.node, rootId);
                        });
                        e.data.removes.forEach((n) => {
                            this.replaceIds(n, iframeEl, ['parentId', 'id']);
                        });
                        e.data.attributes.forEach((n) => {
                            this.replaceIds(n, iframeEl, ['id']);
                        });
                        e.data.texts.forEach((n) => {
                            this.replaceIds(n, iframeEl, ['id']);
                        });
                        return e;
                    }
                    case IncrementalSource.Drag:
                    case IncrementalSource.TouchMove:
                    case IncrementalSource.MouseMove: {
                        e.data.positions.forEach((p) => {
                            this.replaceIds(p, iframeEl, ['id']);
                        });
                        return e;
                    }
                    case IncrementalSource.ViewportResize: {
                        return false;
                    }
                    case IncrementalSource.MediaInteraction:
                    case IncrementalSource.MouseInteraction:
                    case IncrementalSource.Scroll:
                    case IncrementalSource.CanvasMutation:
                    case IncrementalSource.Input: {
                        this.replaceIds(e.data, iframeEl, ['id']);
                        return e;
                    }
                    case IncrementalSource.StyleSheetRule:
                    case IncrementalSource.StyleDeclaration: {
                        this.replaceIds(e.data, iframeEl, ['id']);
                        this.replaceStyleIds(e.data, iframeEl, ['styleId']);
                        return e;
                    }
                    case IncrementalSource.Font: {
                        return e;
                    }
                    case IncrementalSource.Selection: {
                        e.data.ranges.forEach((range) => {
                            this.replaceIds(range, iframeEl, ['start', 'end']);
                        });
                        return e;
                    }
                    case IncrementalSource.AdoptedStyleSheet: {
                        this.replaceIds(e.data, iframeEl, ['id']);
                        this.replaceStyleIds(e.data, iframeEl, ['styleIds']);
                        (_a = e.data.styles) === null || _a === void 0 ? void 0 : _a.forEach((style) => {
                            this.replaceStyleIds(style, iframeEl, ['styleId']);
                        });
                        return e;
                    }
                }
            }
        }
        return false;
    }
    replace(iframeMirror, obj, iframeEl, keys) {
        for (const key of keys) {
            if (!Array.isArray(obj[key]) && typeof obj[key] !== 'number')
                continue;
            if (Array.isArray(obj[key])) {
                obj[key] = iframeMirror.getIds(iframeEl, obj[key]);
            }
            else {
                obj[key] = iframeMirror.getId(iframeEl, obj[key]);
            }
        }
        return obj;
    }
    replaceIds(obj, iframeEl, keys) {
        return this.replace(this.crossOriginIframeMirror, obj, iframeEl, keys);
    }
    replaceStyleIds(obj, iframeEl, keys) {
        return this.replace(this.crossOriginIframeStyleMirror, obj, iframeEl, keys);
    }
    replaceIdOnNode(node, iframeEl) {
        this.replaceIds(node, iframeEl, ['id', 'rootId']);
        if ('childNodes' in node) {
            node.childNodes.forEach((child) => {
                this.replaceIdOnNode(child, iframeEl);
            });
        }
    }
    patchRootIdOnNode(node, rootId) {
        if (node.type !== NodeType.Document && !node.rootId)
            node.rootId = rootId;
        if ('childNodes' in node) {
            node.childNodes.forEach((child) => {
                this.patchRootIdOnNode(child, rootId);
            });
        }
    }
}

class ShadowDomManager {
    constructor(options) {
        this.shadowDoms = new WeakSet();
        this.restoreHandlers = [];
        this.mutationCb = options.mutationCb;
        this.scrollCb = options.scrollCb;
        this.bypassOptions = options.bypassOptions;
        this.mirror = options.mirror;
        this.init();
    }
    init() {
        this.reset();
        this.patchAttachShadow(Element, document);
    }
    addShadowRoot(shadowRoot, doc) {
        if (!isNativeShadowDom(shadowRoot))
            return;
        if (this.shadowDoms.has(shadowRoot))
            return;
        this.shadowDoms.add(shadowRoot);
        const observer = initMutationObserver(Object.assign(Object.assign({}, this.bypassOptions), { doc, mutationCb: this.mutationCb, mirror: this.mirror, shadowDomManager: this }), shadowRoot);
        this.restoreHandlers.push(() => observer.disconnect());
        this.restoreHandlers.push(initScrollObserver(Object.assign(Object.assign({}, this.bypassOptions), { scrollCb: this.scrollCb, doc: shadowRoot, mirror: this.mirror })));
        setTimeout(() => {
            if (shadowRoot.adoptedStyleSheets &&
                shadowRoot.adoptedStyleSheets.length > 0)
                this.bypassOptions.stylesheetManager.adoptStyleSheets(shadowRoot.adoptedStyleSheets, this.mirror.getId(shadowRoot.host));
            this.restoreHandlers.push(initAdoptedStyleSheetObserver({
                mirror: this.mirror,
                stylesheetManager: this.bypassOptions.stylesheetManager,
            }, shadowRoot));
        }, 0);
    }
    observeAttachShadow(iframeElement) {
        if (!iframeElement.contentWindow || !iframeElement.contentDocument)
            return;
        this.patchAttachShadow(iframeElement.contentWindow.Element, iframeElement.contentDocument);
    }
    patchAttachShadow(element, doc) {
        const manager = this;
        this.restoreHandlers.push(patch(element.prototype, 'attachShadow', function (original) {
            return function (option) {
                const shadowRoot = original.call(this, option);
                if (this.shadowRoot && inDom(this))
                    manager.addShadowRoot(this.shadowRoot, doc);
                return shadowRoot;
            };
        }));
    }
    reset() {
        this.restoreHandlers.forEach((handler) => {
            try {
                handler();
            }
            catch (e) {
            }
        });
        this.restoreHandlers = [];
        this.shadowDoms = new WeakSet();
    }
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, [])).next());
    });
}

/*
 * base64-arraybuffer 1.0.1 <https://github.com/niklasvh/base64-arraybuffer>
 * Copyright (c) 2021 Niklas von Hertzen <https://hertzen.com>
 * Released under MIT License
 */
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// Use a lookup table to find the index.
var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
}
var encode = function (arraybuffer) {
    var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
    for (i = 0; i < len; i += 3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
    }
    if (len % 3 === 2) {
        base64 = base64.substring(0, base64.length - 1) + '=';
    }
    else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + '==';
    }
    return base64;
};

const canvasVarMap = new Map();
function variableListFor(ctx, ctor) {
    let contextMap = canvasVarMap.get(ctx);
    if (!contextMap) {
        contextMap = new Map();
        canvasVarMap.set(ctx, contextMap);
    }
    if (!contextMap.has(ctor)) {
        contextMap.set(ctor, []);
    }
    return contextMap.get(ctor);
}
const saveWebGLVar = (value, win, ctx) => {
    if (!value ||
        !(isInstanceOfWebGLObject(value, win) || typeof value === 'object'))
        return;
    const name = value.constructor.name;
    const list = variableListFor(ctx, name);
    let index = list.indexOf(value);
    if (index === -1) {
        index = list.length;
        list.push(value);
    }
    return index;
};
function serializeArg(value, win, ctx) {
    if (value instanceof Array) {
        return value.map((arg) => serializeArg(arg, win, ctx));
    }
    else if (value === null) {
        return value;
    }
    else if (value instanceof Float32Array ||
        value instanceof Float64Array ||
        value instanceof Int32Array ||
        value instanceof Uint32Array ||
        value instanceof Uint8Array ||
        value instanceof Uint16Array ||
        value instanceof Int16Array ||
        value instanceof Int8Array ||
        value instanceof Uint8ClampedArray) {
        const name = value.constructor.name;
        return {
            rr_type: name,
            args: [Object.values(value)],
        };
    }
    else if (value instanceof ArrayBuffer) {
        const name = value.constructor.name;
        const base64 = encode(value);
        return {
            rr_type: name,
            base64,
        };
    }
    else if (value instanceof DataView) {
        const name = value.constructor.name;
        return {
            rr_type: name,
            args: [
                serializeArg(value.buffer, win, ctx),
                value.byteOffset,
                value.byteLength,
            ],
        };
    }
    else if (value instanceof HTMLImageElement) {
        const name = value.constructor.name;
        const { src } = value;
        return {
            rr_type: name,
            src,
        };
    }
    else if (value instanceof HTMLCanvasElement) {
        const name = 'HTMLImageElement';
        const src = value.toDataURL();
        return {
            rr_type: name,
            src,
        };
    }
    else if (value instanceof ImageData) {
        const name = value.constructor.name;
        return {
            rr_type: name,
            args: [serializeArg(value.data, win, ctx), value.width, value.height],
        };
    }
    else if (isInstanceOfWebGLObject(value, win) || typeof value === 'object') {
        const name = value.constructor.name;
        const index = saveWebGLVar(value, win, ctx);
        return {
            rr_type: name,
            index: index,
        };
    }
    return value;
}
const serializeArgs = (args, win, ctx) => {
    return args.map((arg) => serializeArg(arg, win, ctx));
};
const isInstanceOfWebGLObject = (value, win) => {
    const webGLConstructorNames = [
        'WebGLActiveInfo',
        'WebGLBuffer',
        'WebGLFramebuffer',
        'WebGLProgram',
        'WebGLRenderbuffer',
        'WebGLShader',
        'WebGLShaderPrecisionFormat',
        'WebGLTexture',
        'WebGLUniformLocation',
        'WebGLVertexArrayObject',
        'WebGLVertexArrayObjectOES',
    ];
    const supportedWebGLConstructorNames = webGLConstructorNames.filter((name) => typeof win[name] === 'function');
    return Boolean(supportedWebGLConstructorNames.find((name) => value instanceof win[name]));
};

function initCanvas2DMutationObserver(cb, win, blockClass, blockSelector) {
    const handlers = [];
    const props2D = Object.getOwnPropertyNames(win.CanvasRenderingContext2D.prototype);
    for (const prop of props2D) {
        try {
            if (typeof win.CanvasRenderingContext2D.prototype[prop] !== 'function') {
                continue;
            }
            const restoreHandler = patch(win.CanvasRenderingContext2D.prototype, prop, function (original) {
                return function (...args) {
                    if (!isBlocked(this.canvas, blockClass, blockSelector, true)) {
                        setTimeout(() => {
                            const recordArgs = serializeArgs(args, win, this);
                            cb(this.canvas, {
                                type: CanvasContext['2D'],
                                property: prop,
                                args: recordArgs,
                            });
                        }, 0);
                    }
                    return original.apply(this, args);
                };
            });
            handlers.push(restoreHandler);
        }
        catch (_a) {
            const hookHandler = hookSetter(win.CanvasRenderingContext2D.prototype, prop, {
                set(v) {
                    cb(this.canvas, {
                        type: CanvasContext['2D'],
                        property: prop,
                        args: [v],
                        setter: true,
                    });
                },
            });
            handlers.push(hookHandler);
        }
    }
    return () => {
        handlers.forEach((h) => h());
    };
}

function getNormalizedContextName(contextType) {
    return contextType === 'experimental-webgl' ? 'webgl' : contextType;
}
function initCanvasContextObserver(win, blockClass, blockSelector, setPreserveDrawingBufferToTrue) {
    const handlers = [];
    try {
        const restoreHandler = patch(win.HTMLCanvasElement.prototype, 'getContext', function (original) {
            return function (contextType, ...args) {
                if (!isBlocked(this, blockClass, blockSelector, true)) {
                    const ctxName = getNormalizedContextName(contextType);
                    if (!('__context' in this))
                        this.__context = ctxName;
                    if (setPreserveDrawingBufferToTrue &&
                        ['webgl', 'webgl2'].includes(ctxName)) {
                        if (args[0] && typeof args[0] === 'object') {
                            const contextAttributes = args[0];
                            if (!contextAttributes.preserveDrawingBuffer) {
                                contextAttributes.preserveDrawingBuffer = true;
                            }
                        }
                        else {
                            args.splice(0, 1, {
                                preserveDrawingBuffer: true,
                            });
                        }
                    }
                }
                return original.apply(this, [contextType, ...args]);
            };
        });
        handlers.push(restoreHandler);
    }
    catch (_a) {
        console.error('failed to patch HTMLCanvasElement.prototype.getContext');
    }
    return () => {
        handlers.forEach((h) => h());
    };
}

function patchGLPrototype(prototype, type, cb, blockClass, blockSelector, mirror, win) {
    const handlers = [];
    const props = Object.getOwnPropertyNames(prototype);
    for (const prop of props) {
        if ([
            'isContextLost',
            'canvas',
            'drawingBufferWidth',
            'drawingBufferHeight',
        ].includes(prop)) {
            continue;
        }
        try {
            if (typeof prototype[prop] !== 'function') {
                continue;
            }
            const restoreHandler = patch(prototype, prop, function (original) {
                return function (...args) {
                    const result = original.apply(this, args);
                    saveWebGLVar(result, win, this);
                    if ('tagName' in this.canvas &&
                        !isBlocked(this.canvas, blockClass, blockSelector, true)) {
                        const recordArgs = serializeArgs(args, win, this);
                        const mutation = {
                            type,
                            property: prop,
                            args: recordArgs,
                        };
                        cb(this.canvas, mutation);
                    }
                    return result;
                };
            });
            handlers.push(restoreHandler);
        }
        catch (_a) {
            const hookHandler = hookSetter(prototype, prop, {
                set(v) {
                    cb(this.canvas, {
                        type,
                        property: prop,
                        args: [v],
                        setter: true,
                    });
                },
            });
            handlers.push(hookHandler);
        }
    }
    return handlers;
}
function initCanvasWebGLMutationObserver(cb, win, blockClass, blockSelector, mirror) {
    const handlers = [];
    handlers.push(...patchGLPrototype(win.WebGLRenderingContext.prototype, CanvasContext.WebGL, cb, blockClass, blockSelector, mirror, win));
    if (typeof win.WebGL2RenderingContext !== 'undefined') {
        handlers.push(...patchGLPrototype(win.WebGL2RenderingContext.prototype, CanvasContext.WebGL2, cb, blockClass, blockSelector, mirror, win));
    }
    return () => {
        handlers.forEach((h) => h());
    };
}

function funcToSource(fn, sourcemapArg) {
    var source = fn.toString();
    var lines = source.split('\n');
    lines.pop();
    lines.shift();
    var blankPrefixLength = lines[0].search(/\S/);
    var regex = /(['"])__worker_loader_strict__(['"])/g;
    for (var i = 0, n = lines.length; i < n; ++i) {
        lines[i] = lines[i].substring(blankPrefixLength).replace(regex, '$1use strict$2') + '\n';
    }
    return lines;
}

function createURL(fn, sourcemapArg) {
    var lines = funcToSource(fn);
    var blob = new Blob(lines, { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}

function createInlineWorkerFactory(fn, sourcemapArg) {
    var url;
    return function WorkerFactory(options) {
        url = url || createURL(fn);
        return new Worker(url, options);
    };
}

var WorkerFactory = createInlineWorkerFactory(/* rollup-plugin-web-worker-loader */function () {
(function () {
    '__worker_loader_strict__';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, [])).next());
        });
    }

    /*
     * base64-arraybuffer 1.0.1 <https://github.com/niklasvh/base64-arraybuffer>
     * Copyright (c) 2021 Niklas von Hertzen <https://hertzen.com>
     * Released under MIT License
     */
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    var encode = function (arraybuffer) {
        var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
        for (i = 0; i < len; i += 3) {
            base64 += chars[bytes[i] >> 2];
            base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += chars[bytes[i + 2] & 63];
        }
        if (len % 3 === 2) {
            base64 = base64.substring(0, base64.length - 1) + '=';
        }
        else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + '==';
        }
        return base64;
    };

    const lastBlobMap = new Map();
    const transparentBlobMap = new Map();
    function getTransparentBlobFor(width, height, dataURLOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = `${width}-${height}`;
            if ('OffscreenCanvas' in globalThis) {
                if (transparentBlobMap.has(id))
                    return transparentBlobMap.get(id);
                const offscreen = new OffscreenCanvas(width, height);
                offscreen.getContext('2d');
                const blob = yield offscreen.convertToBlob(dataURLOptions);
                const arrayBuffer = yield blob.arrayBuffer();
                const base64 = encode(arrayBuffer);
                transparentBlobMap.set(id, base64);
                return base64;
            }
            else {
                return '';
            }
        });
    }
    const worker = self;
    worker.onmessage = function (e) {
        return __awaiter(this, void 0, void 0, function* () {
            if ('OffscreenCanvas' in globalThis) {
                const { id, bitmap, width, height, dataURLOptions } = e.data;
                const transparentBase64 = getTransparentBlobFor(width, height, dataURLOptions);
                const offscreen = new OffscreenCanvas(width, height);
                const ctx = offscreen.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close();
                const blob = yield offscreen.convertToBlob(dataURLOptions);
                const type = blob.type;
                const arrayBuffer = yield blob.arrayBuffer();
                const base64 = encode(arrayBuffer);
                if (!lastBlobMap.has(id) && (yield transparentBase64) === base64) {
                    lastBlobMap.set(id, base64);
                    return worker.postMessage({ id });
                }
                if (lastBlobMap.get(id) === base64)
                    return worker.postMessage({ id });
                worker.postMessage({
                    id,
                    type,
                    base64,
                    width,
                    height,
                });
                lastBlobMap.set(id, base64);
            }
            else {
                return worker.postMessage({ id: e.data.id });
            }
        });
    };

})();
});

class CanvasManager {
    reset() {
        this.pendingCanvasMutations.clear();
        this.resetObservers && this.resetObservers();
    }
    freeze() {
        this.frozen = true;
    }
    unfreeze() {
        this.frozen = false;
    }
    lock() {
        this.locked = true;
    }
    unlock() {
        this.locked = false;
    }
    constructor(options) {
        this.pendingCanvasMutations = new Map();
        this.rafStamps = { latestId: 0, invokeId: null };
        this.frozen = false;
        this.locked = false;
        this.processMutation = (target, mutation) => {
            const newFrame = this.rafStamps.invokeId &&
                this.rafStamps.latestId !== this.rafStamps.invokeId;
            if (newFrame || !this.rafStamps.invokeId)
                this.rafStamps.invokeId = this.rafStamps.latestId;
            if (!this.pendingCanvasMutations.has(target)) {
                this.pendingCanvasMutations.set(target, []);
            }
            this.pendingCanvasMutations.get(target).push(mutation);
        };
        const { sampling = 'all', win, blockClass, blockSelector, recordCanvas, dataURLOptions, } = options;
        this.mutationCb = options.mutationCb;
        this.mirror = options.mirror;
        if (recordCanvas && sampling === 'all')
            this.initCanvasMutationObserver(win, blockClass, blockSelector);
        if (recordCanvas && typeof sampling === 'number')
            this.initCanvasFPSObserver(sampling, win, blockClass, blockSelector, {
                dataURLOptions,
            });
    }
    initCanvasFPSObserver(fps, win, blockClass, blockSelector, options) {
        const canvasContextReset = initCanvasContextObserver(win, blockClass, blockSelector, true);
        const snapshotInProgressMap = new Map();
        const worker = new WorkerFactory();
        worker.onmessage = (e) => {
            const { id } = e.data;
            snapshotInProgressMap.set(id, false);
            if (!('base64' in e.data))
                return;
            const { base64, type, width, height } = e.data;
            this.mutationCb({
                id,
                type: CanvasContext['2D'],
                commands: [
                    {
                        property: 'clearRect',
                        args: [0, 0, width, height],
                    },
                    {
                        property: 'drawImage',
                        args: [
                            {
                                rr_type: 'ImageBitmap',
                                args: [
                                    {
                                        rr_type: 'Blob',
                                        data: [{ rr_type: 'ArrayBuffer', base64 }],
                                        type,
                                    },
                                ],
                            },
                            0,
                            0,
                        ],
                    },
                ],
            });
        };
        const timeBetweenSnapshots = 1000 / fps;
        let lastSnapshotTime = 0;
        let rafId;
        const getCanvas = () => {
            const matchedCanvas = [];
            win.document.querySelectorAll('canvas').forEach((canvas) => {
                if (!isBlocked(canvas, blockClass, blockSelector, true)) {
                    matchedCanvas.push(canvas);
                }
            });
            return matchedCanvas;
        };
        const takeCanvasSnapshots = (timestamp) => {
            if (lastSnapshotTime &&
                timestamp - lastSnapshotTime < timeBetweenSnapshots) {
                rafId = requestAnimationFrame(takeCanvasSnapshots);
                return;
            }
            lastSnapshotTime = timestamp;
            getCanvas()
                .forEach((canvas) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const id = this.mirror.getId(canvas);
                if (snapshotInProgressMap.get(id))
                    return;
                if (canvas.width === 0 || canvas.height === 0)
                    return;
                snapshotInProgressMap.set(id, true);
                if (['webgl', 'webgl2'].includes(canvas.__context)) {
                    const context = canvas.getContext(canvas.__context);
                    if (((_a = context === null || context === void 0 ? void 0 : context.getContextAttributes()) === null || _a === void 0 ? void 0 : _a.preserveDrawingBuffer) === false) {
                        context.clear(context.COLOR_BUFFER_BIT);
                    }
                }
                const bitmap = yield createImageBitmap(canvas);
                worker.postMessage({
                    id,
                    bitmap,
                    width: canvas.width,
                    height: canvas.height,
                    dataURLOptions: options.dataURLOptions,
                }, [bitmap]);
            }));
            rafId = requestAnimationFrame(takeCanvasSnapshots);
        };
        rafId = requestAnimationFrame(takeCanvasSnapshots);
        this.resetObservers = () => {
            canvasContextReset();
            cancelAnimationFrame(rafId);
        };
    }
    initCanvasMutationObserver(win, blockClass, blockSelector) {
        this.startRAFTimestamping();
        this.startPendingCanvasMutationFlusher();
        const canvasContextReset = initCanvasContextObserver(win, blockClass, blockSelector, false);
        const canvas2DReset = initCanvas2DMutationObserver(this.processMutation.bind(this), win, blockClass, blockSelector);
        const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(this.processMutation.bind(this), win, blockClass, blockSelector, this.mirror);
        this.resetObservers = () => {
            canvasContextReset();
            canvas2DReset();
            canvasWebGL1and2Reset();
        };
    }
    startPendingCanvasMutationFlusher() {
        requestAnimationFrame(() => this.flushPendingCanvasMutations());
    }
    startRAFTimestamping() {
        const setLatestRAFTimestamp = (timestamp) => {
            this.rafStamps.latestId = timestamp;
            requestAnimationFrame(setLatestRAFTimestamp);
        };
        requestAnimationFrame(setLatestRAFTimestamp);
    }
    flushPendingCanvasMutations() {
        this.pendingCanvasMutations.forEach((values, canvas) => {
            const id = this.mirror.getId(canvas);
            this.flushPendingCanvasMutationFor(canvas, id);
        });
        requestAnimationFrame(() => this.flushPendingCanvasMutations());
    }
    flushPendingCanvasMutationFor(canvas, id) {
        if (this.frozen || this.locked) {
            return;
        }
        const valuesWithType = this.pendingCanvasMutations.get(canvas);
        if (!valuesWithType || id === -1)
            return;
        const values = valuesWithType.map((value) => {
            const rest = __rest(value, ["type"]);
            return rest;
        });
        const { type } = valuesWithType[0];
        this.mutationCb({ id, type, commands: values });
        this.pendingCanvasMutations.delete(canvas);
    }
}

class StylesheetManager {
    constructor(options) {
        this.trackedLinkElements = new WeakSet();
        this.styleMirror = new StyleSheetMirror();
        this.mutationCb = options.mutationCb;
        this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
    }
    attachLinkElement(linkEl, childSn) {
        if ('_cssText' in childSn.attributes)
            this.mutationCb({
                adds: [],
                removes: [],
                texts: [],
                attributes: [
                    {
                        id: childSn.id,
                        attributes: childSn
                            .attributes,
                    },
                ],
            });
        this.trackLinkElement(linkEl);
    }
    trackLinkElement(linkEl) {
        if (this.trackedLinkElements.has(linkEl))
            return;
        this.trackedLinkElements.add(linkEl);
        this.trackStylesheetInLinkElement(linkEl);
    }
    adoptStyleSheets(sheets, hostId) {
        if (sheets.length === 0)
            return;
        const adoptedStyleSheetData = {
            id: hostId,
            styleIds: [],
        };
        const styles = [];
        for (const sheet of sheets) {
            let styleId;
            if (!this.styleMirror.has(sheet)) {
                styleId = this.styleMirror.add(sheet);
                styles.push({
                    styleId,
                    rules: Array.from(sheet.rules || CSSRule, (r, index) => ({
                        rule: stringifyRule(r),
                        index,
                    })),
                });
            }
            else
                styleId = this.styleMirror.getId(sheet);
            adoptedStyleSheetData.styleIds.push(styleId);
        }
        if (styles.length > 0)
            adoptedStyleSheetData.styles = styles;
        this.adoptedStyleSheetCb(adoptedStyleSheetData);
    }
    reset() {
        this.styleMirror.reset();
        this.trackedLinkElements = new WeakSet();
    }
    trackStylesheetInLinkElement(linkEl) {
    }
}

class ProcessedNodeManager {
    constructor() {
        this.nodeMap = new WeakMap();
        this.loop = true;
        this.periodicallyClear();
    }
    periodicallyClear() {
        requestAnimationFrame(() => {
            this.clear();
            if (this.loop)
                this.periodicallyClear();
        });
    }
    inOtherBuffer(node, thisBuffer) {
        const buffers = this.nodeMap.get(node);
        return (buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer));
    }
    add(node, buffer) {
        this.nodeMap.set(node, (this.nodeMap.get(node) || new Set()).add(buffer));
    }
    clear() {
        this.nodeMap = new WeakMap();
    }
    destroy() {
        this.loop = false;
    }
}

function wrapEvent(e) {
    return Object.assign(Object.assign({}, e), { timestamp: nowTimestamp() });
}
let wrappedEmit;
let takeFullSnapshot;
let canvasManager;
let recording = false;
const mirror = createMirror();
function record(options = {}) {
    const { emit, checkoutEveryNms, checkoutEveryNth, blockClass = 'rr-block', blockSelector = null, ignoreClass = 'rr-ignore', ignoreSelector = null, maskTextClass = 'rr-mask', maskTextSelector = null, inlineStylesheet = true, maskAllInputs, maskInputOptions: _maskInputOptions, slimDOMOptions: _slimDOMOptions, maskInputFn, maskTextFn, hooks, packFn, sampling = {}, dataURLOptions = {}, mousemoveWait, recordDOM = true, recordCanvas = false, recordCrossOriginIframes = false, recordAfter = options.recordAfter === 'DOMContentLoaded'
        ? options.recordAfter
        : 'load', userTriggeredOnInput = false, collectFonts = false, inlineImages = false, plugins, keepIframeSrcFn = () => false, ignoreCSSAttributes = new Set([]), errorHandler, } = options;
    registerErrorHandler(errorHandler);
    const inEmittingFrame = recordCrossOriginIframes
        ? window.parent === window
        : true;
    let passEmitsToParent = false;
    if (!inEmittingFrame) {
        try {
            if (window.parent.document) {
                passEmitsToParent = false;
            }
        }
        catch (e) {
            passEmitsToParent = true;
        }
    }
    if (inEmittingFrame && !emit) {
        throw new Error('emit function is required');
    }
    if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
        sampling.mousemove = mousemoveWait;
    }
    mirror.reset();
    const maskInputOptions = maskAllInputs === true
        ? {
            color: true,
            date: true,
            'datetime-local': true,
            email: true,
            month: true,
            number: true,
            range: true,
            search: true,
            tel: true,
            text: true,
            time: true,
            url: true,
            week: true,
            textarea: true,
            select: true,
            password: true,
        }
        : _maskInputOptions !== undefined
            ? _maskInputOptions
            : { password: true };
    const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === 'all'
        ? {
            script: true,
            comment: true,
            headFavicon: true,
            headWhitespace: true,
            headMetaSocial: true,
            headMetaRobots: true,
            headMetaHttpEquiv: true,
            headMetaVerification: true,
            headMetaAuthorship: _slimDOMOptions === 'all',
            headMetaDescKeywords: _slimDOMOptions === 'all',
        }
        : _slimDOMOptions
            ? _slimDOMOptions
            : {};
    polyfill();
    let lastFullSnapshotEvent;
    let incrementalSnapshotCount = 0;
    const eventProcessor = (e) => {
        for (const plugin of plugins || []) {
            if (plugin.eventProcessor) {
                e = plugin.eventProcessor(e);
            }
        }
        if (packFn &&
            !passEmitsToParent) {
            e = packFn(e);
        }
        return e;
    };
    wrappedEmit = (e, isCheckout) => {
        var _a;
        if (((_a = mutationBuffers[0]) === null || _a === void 0 ? void 0 : _a.isFrozen()) &&
            e.type !== EventType.FullSnapshot &&
            !(e.type === EventType.IncrementalSnapshot &&
                e.data.source === IncrementalSource.Mutation)) {
            mutationBuffers.forEach((buf) => buf.unfreeze());
        }
        if (inEmittingFrame) {
            emit === null || emit === void 0 ? void 0 : emit(eventProcessor(e), isCheckout);
        }
        else if (passEmitsToParent) {
            const message = {
                type: 'rrweb',
                event: eventProcessor(e),
                origin: window.location.origin,
                isCheckout,
            };
            window.parent.postMessage(message, '*');
        }
        if (e.type === EventType.FullSnapshot) {
            lastFullSnapshotEvent = e;
            incrementalSnapshotCount = 0;
        }
        else if (e.type === EventType.IncrementalSnapshot) {
            if (e.data.source === IncrementalSource.Mutation &&
                e.data.isAttachIframe) {
                return;
            }
            incrementalSnapshotCount++;
            const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
            const exceedTime = checkoutEveryNms &&
                e.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
            if (exceedCount || exceedTime) {
                takeFullSnapshot(true);
            }
        }
    };
    const wrappedMutationEmit = (m) => {
        wrappedEmit(wrapEvent({
            type: EventType.IncrementalSnapshot,
            data: Object.assign({ source: IncrementalSource.Mutation }, m),
        }));
    };
    const wrappedScrollEmit = (p) => wrappedEmit(wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: Object.assign({ source: IncrementalSource.Scroll }, p),
    }));
    const wrappedCanvasMutationEmit = (p) => wrappedEmit(wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: Object.assign({ source: IncrementalSource.CanvasMutation }, p),
    }));
    const wrappedAdoptedStyleSheetEmit = (a) => wrappedEmit(wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: Object.assign({ source: IncrementalSource.AdoptedStyleSheet }, a),
    }));
    const stylesheetManager = new StylesheetManager({
        mutationCb: wrappedMutationEmit,
        adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit,
    });
    const iframeManager = new IframeManager({
        mirror,
        mutationCb: wrappedMutationEmit,
        stylesheetManager: stylesheetManager,
        recordCrossOriginIframes,
        wrappedEmit,
    });
    for (const plugin of plugins || []) {
        if (plugin.getMirror)
            plugin.getMirror({
                nodeMirror: mirror,
                crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
                crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror,
            });
    }
    const processedNodeManager = new ProcessedNodeManager();
    canvasManager = new CanvasManager({
        recordCanvas,
        mutationCb: wrappedCanvasMutationEmit,
        win: window,
        blockClass,
        blockSelector,
        mirror,
        sampling: sampling.canvas,
        dataURLOptions,
    });
    const shadowDomManager = new ShadowDomManager({
        mutationCb: wrappedMutationEmit,
        scrollCb: wrappedScrollEmit,
        bypassOptions: {
            blockClass,
            blockSelector,
            maskTextClass,
            maskTextSelector,
            inlineStylesheet,
            maskInputOptions,
            dataURLOptions,
            maskTextFn,
            maskInputFn,
            recordCanvas,
            inlineImages,
            sampling,
            slimDOMOptions,
            iframeManager,
            stylesheetManager,
            canvasManager,
            keepIframeSrcFn,
            processedNodeManager,
        },
        mirror,
    });
    takeFullSnapshot = (isCheckout = false) => {
        if (!recordDOM) {
            return;
        }
        wrappedEmit(wrapEvent({
            type: EventType.Meta,
            data: {
                href: window.location.href,
                width: getWindowWidth(),
                height: getWindowHeight(),
            },
        }), isCheckout);
        stylesheetManager.reset();
        shadowDomManager.init();
        mutationBuffers.forEach((buf) => buf.lock());
        const node = snapshot(document, {
            mirror,
            blockClass,
            blockSelector,
            maskTextClass,
            maskTextSelector,
            inlineStylesheet,
            maskAllInputs: maskInputOptions,
            maskTextFn,
            slimDOM: slimDOMOptions,
            dataURLOptions,
            recordCanvas,
            inlineImages,
            onSerialize: (n) => {
                if (isSerializedIframe(n, mirror)) {
                    iframeManager.addIframe(n);
                }
                if (isSerializedStylesheet(n, mirror)) {
                    stylesheetManager.trackLinkElement(n);
                }
                if (hasShadowRoot(n)) {
                    shadowDomManager.addShadowRoot(n.shadowRoot, document);
                }
            },
            onIframeLoad: (iframe, childSn) => {
                iframeManager.attachIframe(iframe, childSn);
                shadowDomManager.observeAttachShadow(iframe);
            },
            onStylesheetLoad: (linkEl, childSn) => {
                stylesheetManager.attachLinkElement(linkEl, childSn);
            },
            keepIframeSrcFn,
        });
        if (!node) {
            return console.warn('Failed to snapshot the document');
        }
        wrappedEmit(wrapEvent({
            type: EventType.FullSnapshot,
            data: {
                node,
                initialOffset: getWindowScroll(window),
            },
        }), isCheckout);
        mutationBuffers.forEach((buf) => buf.unlock());
        if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
            stylesheetManager.adoptStyleSheets(document.adoptedStyleSheets, mirror.getId(document));
    };
    try {
        const handlers = [];
        const observe = (doc) => {
            var _a;
            return callbackWrapper(initObservers)({
                mutationCb: wrappedMutationEmit,
                mousemoveCb: (positions, source) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source,
                        positions,
                    },
                })),
                mouseInteractionCb: (d) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.MouseInteraction }, d),
                })),
                scrollCb: wrappedScrollEmit,
                viewportResizeCb: (d) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.ViewportResize }, d),
                })),
                inputCb: (v) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.Input }, v),
                })),
                mediaInteractionCb: (p) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.MediaInteraction }, p),
                })),
                styleSheetRuleCb: (r) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.StyleSheetRule }, r),
                })),
                styleDeclarationCb: (r) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.StyleDeclaration }, r),
                })),
                canvasMutationCb: wrappedCanvasMutationEmit,
                fontCb: (p) => wrappedEmit(wrapEvent({
                    type: EventType.IncrementalSnapshot,
                    data: Object.assign({ source: IncrementalSource.Font }, p),
                })),
                selectionCb: (p) => {
                    wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.Selection }, p),
                    }));
                },
                customElementCb: (c) => {
                    wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.CustomElement }, c),
                    }));
                },
                blockClass,
                ignoreClass,
                ignoreSelector,
                maskTextClass,
                maskTextSelector,
                maskInputOptions,
                inlineStylesheet,
                sampling,
                recordDOM,
                recordCanvas,
                inlineImages,
                userTriggeredOnInput,
                collectFonts,
                doc,
                maskInputFn,
                maskTextFn,
                keepIframeSrcFn,
                blockSelector,
                slimDOMOptions,
                dataURLOptions,
                mirror,
                iframeManager,
                stylesheetManager,
                shadowDomManager,
                processedNodeManager,
                canvasManager,
                ignoreCSSAttributes,
                plugins: ((_a = plugins === null || plugins === void 0 ? void 0 : plugins.filter((p) => p.observer)) === null || _a === void 0 ? void 0 : _a.map((p) => ({
                    observer: p.observer,
                    options: p.options,
                    callback: (payload) => wrappedEmit(wrapEvent({
                        type: EventType.Plugin,
                        data: {
                            plugin: p.name,
                            payload,
                        },
                    })),
                }))) || [],
            }, hooks);
        };
        iframeManager.addLoadListener((iframeEl) => {
            try {
                handlers.push(observe(iframeEl.contentDocument));
            }
            catch (error) {
                console.warn(error);
            }
        });
        const init = () => {
            takeFullSnapshot();
            handlers.push(observe(document));
            recording = true;
        };
        if (document.readyState === 'interactive' ||
            document.readyState === 'complete') {
            init();
        }
        else {
            handlers.push(on('DOMContentLoaded', () => {
                wrappedEmit(wrapEvent({
                    type: EventType.DomContentLoaded,
                    data: {},
                }));
                if (recordAfter === 'DOMContentLoaded')
                    init();
            }));
            handlers.push(on('load', () => {
                wrappedEmit(wrapEvent({
                    type: EventType.Load,
                    data: {},
                }));
                if (recordAfter === 'load')
                    init();
            }, window));
        }
        return () => {
            handlers.forEach((h) => h());
            processedNodeManager.destroy();
            recording = false;
            unregisterErrorHandler();
        };
    }
    catch (error) {
        console.warn(error);
    }
}
record.addCustomEvent = (tag, payload) => {
    if (!recording) {
        throw new Error('please add custom event after start recording');
    }
    wrappedEmit(wrapEvent({
        type: EventType.Custom,
        data: {
            tag,
            payload,
        },
    }));
};
record.freezePage = () => {
    mutationBuffers.forEach((buf) => buf.freeze());
};
record.takeFullSnapshot = (isCheckout) => {
    if (!recording) {
        throw new Error('please take full snapshot after start recording');
    }
    takeFullSnapshot(isCheckout);
};
record.mirror = mirror;

class RRWebRecorder {
    constructor(sessionId, config, onEventsReady, sessionStartTime = 0) {
        this.stopFn = null;
        this.events = [];
        this.onEventsReady = null;
        this.flushInterval = null;
        this.hasFullSnapshot = false;
        this.sessionStartTime = 0; // Session start time (for relative timestamps)
        this.recordingStartTime = 0; // When this recorder instance started
        this.sessionId = sessionId;
        this.config = config;
        this.onEventsReady = onEventsReady;
        this.sessionStartTime = sessionStartTime || Date.now();
        this.recordingStartTime = Date.now();
        console.log(`[RRWeb] Recording initialized - session started at ${this.sessionStartTime}, recording started at ${this.recordingStartTime}`);
    }
    start() {
        if (!this.config.enabled) {
            console.log('[RRWeb] Recording disabled in config');
            return;
        }
        if (this.stopFn) {
            console.warn('[RRWeb] Recording already started');
            return;
        }
        try {
            this.stopFn = record({
                emit: (event) => {
                    // Convert absolute timestamps to relative to session start
                    // This ensures continuity across page navigations within same session
                    const originalTimestamp = event.timestamp;
                    event.timestamp = event.timestamp - this.sessionStartTime;
                    if (this.config.enabled && event.type === 2) {
                        console.log(`[RRWeb] FullSnapshot - original: ${originalTimestamp}, relative: ${event.timestamp}, session start: ${this.sessionStartTime}`);
                    }
                    this.events.push(event);
                    // Check if this is a FullSnapshot (type 2)
                    if (event.type === 2) {
                        this.hasFullSnapshot = true;
                        // Send immediately to ensure FullSnapshot reaches backend first
                        this.flush();
                    }
                    else if (this.hasFullSnapshot && this.events.length >= 20) {
                        // After FullSnapshot, batch other events (reduced from 50 to 20)
                        this.flush();
                    }
                },
                // Configuration options
                sampling: {
                    // Mouse interactions
                    mousemove: this.config.sampleRate !== undefined
                        ? Math.floor(100 / this.config.sampleRate)
                        : true,
                    // Mouse interactions
                    mouseInteraction: true,
                    // Scroll events
                    scroll: 150, // Throttle scroll events to every 150ms
                    // Media (video/audio)
                    media: 800,
                    // Input events
                    input: 'last', // Only record last input value per time interval
                },
                // Take full snapshots periodically
                checkoutEveryNms: this.config.checkoutEveryNms || 5 * 60 * 1000, // Every 5 minutes
                checkoutEveryNth: this.config.checkoutEveryNth || 200, // Every 200 events
                // Privacy settings
                blockClass: this.config.blockClass || 'rr-block',
                ignoreClass: this.config.ignoreClass || 'rr-ignore',
                maskAllInputs: this.config.maskAllInputs !== undefined ? this.config.maskAllInputs : true,
                maskInputOptions: this.config.maskInputOptions || {
                    password: true,
                    email: true,
                    tel: true,
                },
                maskTextClass: 'rr-mask',
                // Performance
                inlineStylesheet: this.config.inlineStylesheet !== undefined ? this.config.inlineStylesheet : true,
                recordCanvas: this.config.recordCanvas || false,
                collectFonts: this.config.collectFonts !== undefined ? this.config.collectFonts : true,
                // Capture iframe content
                recordCrossOriginIframes: false, // Security: don't record cross-origin iframes
            });
            // Set up periodic flush (every 2 seconds)
            // Only flush if we have FullSnapshot to ensure first batch is complete
            this.flushInterval = window.setInterval(() => {
                if (this.hasFullSnapshot && this.events.length > 0) {
                    this.flush();
                }
            }, 2000); // Reduced from 10s to 2s
            // Safety check: After 2 seconds, force a full snapshot if none captured
            setTimeout(() => {
                if (!this.hasFullSnapshot) {
                    // Try to force a full snapshot using rrweb's API
                    try {
                        record.takeFullSnapshot();
                    }
                    catch (error) {
                        // If we have events but no FullSnapshot, flush anyway to not lose data
                        if (this.events.length > 0) {
                            this.hasFullSnapshot = true; // Set to true to allow flushing
                            this.flush();
                        }
                    }
                }
            }, 2000);
        }
        catch (error) {
            console.error('[RRWeb] Failed to start recording:', error);
        }
    }
    stop() {
        if (this.stopFn) {
            this.stopFn();
            this.stopFn = null;
        }
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        // Flush remaining events
        if (this.events.length > 0) {
            this.flush();
        }
    }
    flush() {
        if (this.events.length === 0)
            return;
        const eventsToSend = [...this.events];
        this.events = [];
        if (this.onEventsReady) {
            this.onEventsReady(eventsToSend);
        }
    }
    getEventCount() {
        return this.events.length;
    }
    isRecording() {
        return this.stopFn !== null;
    }
}

class Transport {
    constructor(config) {
        this.config = config;
        this.queue = [];
        this.flushInterval = null;
        this.maxQueueSize = 20; // Reduced from 50
        this.flushIntervalMs = 2000; // 2 seconds (reduced from 5s)
        this.sessionId = null;
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
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    sendEvent(event) {
        this.enqueue('event', event);
    }
    identifyUser(user) {
        // Send user identification immediately (don't queue)
        this.sendToBackend('/v1/analytics/identify', user);
    }
    startSession(session_1) {
        return __awaiter$1(this, arguments, void 0, function* (session, useBeacon = false) {
            // Send session start immediately to RUM endpoint
            // MUST await to ensure session is created before other requests
            // Use beacon for page unload events (more reliable)
            yield this.sendToBackend('/v1/rum/sessions', session, useBeacon);
        });
    }
    sendError(error) {
        this.enqueue('error', error);
    }
    sendNetworkRequest(request) {
        this.enqueue('network', request);
    }
    sendPerformanceMetric(metric) {
        this.enqueue('performance', metric);
    }
    sendPageView(pageViewData) {
        return __awaiter$1(this, void 0, void 0, function* () {
            // Send page view immediately to RUM endpoint (don't queue)
            this.sendToBackend('/v1/rum/page-views', pageViewData);
        });
    }
    sendRecordingEvents(sessionId, events) {
        return __awaiter$1(this, void 0, void 0, function* () {
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
            let lastError = null;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    // Use XMLHttpRequest for large payloads (more reliable than fetch for large data)
                    if (payloadSize > 100000) { // > 100KB
                        yield this.sendToBackendXHR('/v1/rum/recordings', {
                            session_id: sessionId,
                            events,
                            timestamp: new Date().toISOString(),
                        });
                    }
                    else {
                        yield this.sendToBackend('/v1/rum/recordings', {
                            session_id: sessionId,
                            events,
                            timestamp: new Date().toISOString(),
                        });
                    }
                    return; // Success, exit
                }
                catch (error) {
                    lastError = error;
                    if (attempt < maxRetries) {
                        const delay = attempt * 1000; // 1s, 2s, 3s...
                        yield new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            // All retries failed
            if (this.config.debug) {
                console.error(`[DevSkin SDK] Failed to send recording events after ${maxRetries} attempts:`, lastError);
            }
        });
    }
    sendHeatmapData(heatmapData) {
        this.enqueue('heatmap', heatmapData);
    }
    sendScreenshot(screenshotData) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const endpoint = '/v1/sdk/screenshot';
            yield this.sendToBackend(endpoint, { screenshot: screenshotData });
        });
    }
    flush(useBeacon = false) {
        if (this.queue.length === 0) {
            return;
        }
        const items = [...this.queue];
        this.queue = [];
        // Group by type
        const grouped = {};
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
            }
            else if (type === 'heatmap') {
                // Heatmap expects array format with apiKey and appId
                this.sendToBackend(endpoint, {
                    heatmaps: dataArray,
                    apiKey: this.config.apiKey,
                    appId: this.config.appId
                }, useBeacon);
            }
            else {
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
    enqueue(type, data) {
        // Add applicationId and sessionId to RUM events (event, error, network, performance)
        // Heatmap uses apiKey/appId in payload root instead
        let enrichedData = data;
        if (type !== 'heatmap') {
            enrichedData = Object.assign(Object.assign({}, data), { applicationId: this.config.appId });
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
    startPeriodicFlush() {
        this.flushInterval = setInterval(() => {
            this.flush();
        }, this.flushIntervalMs);
    }
    getEndpointForType(type) {
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
    sendToBackendXHR(endpoint, data) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const url = `${this.apiUrl}${endpoint}`;
            const payload = Object.assign(Object.assign({}, data), { apiKey: this.config.apiKey, applicationId: this.config.appId, environment: this.config.environment, release: this.config.release });
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
                xhr.setRequestHeader('Authorization', `Bearer ${this.config.apiKey}`);
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (this.config.debug) {
                            console.log('[DevSkin] Data sent successfully via XHR:', endpoint);
                        }
                        resolve();
                    }
                    else {
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
                }
                catch (error) {
                    console.error('[DevSkin] Failed to send XHR request:', error);
                    reject(error);
                }
            });
        });
    }
    sendToBackend(endpoint_1, data_1) {
        return __awaiter$1(this, arguments, void 0, function* (endpoint, data, useBeacon = false) {
            const url = `${this.apiUrl}${endpoint}`;
            const payload = Object.assign(Object.assign({}, data), { apiKey: this.config.apiKey, applicationId: this.config.appId, environment: this.config.environment, release: this.config.release });
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
                const response = yield fetch(url, {
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
                    const errorText = yield response.text();
                    console.error('[DevSkin] HTTP Error:', response.status, errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                if (this.config.debug) {
                    console.log('[DevSkin] Data sent successfully:', endpoint);
                }
            }
            catch (error) {
                console.error('[DevSkin] Failed to send data to', endpoint, ':', error);
                // Re-throw for caller to handle
                throw error;
            }
        });
    }
    destroy() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flush();
    }
}

class DevSkinSDK {
    constructor() {
        this.config = null;
        this.transport = null;
        this.sessionId = null;
        this.userId = null;
        this.anonymousId = null;
        this.sessionStartTime = 0;
        this.initialized = false;
        this.heartbeatInterval = null;
        // Collectors
        this.deviceCollector = null;
        this.locationCollector = null;
        this.browserCollector = null;
        this.performanceCollector = null;
        this.errorCollector = null;
        this.networkCollector = null;
        this.heatmapCollector = null;
        this.screenshotCollector = null;
        // private sessionRecorder: SessionRecorder | null = null; // Replaced by RRWebRecorder
        this.rrwebRecorder = null;
    }
    /**
     * Initialize the DevSkin SDK
     */
    init(config) {
        if (this.initialized) {
            console.warn('[DevSkin] SDK already initialized');
            return;
        }
        this.config = Object.assign({ debug: false, captureWebVitals: true, captureNetworkRequests: true, captureErrors: true, captureUserAgent: true, captureLocation: true, captureDevice: true, heatmapOptions: {
                enabled: true,
                trackClicks: true,
                trackScroll: true,
                trackMouseMovement: false, // Disabled by default to avoid too much data
            } }, config);
        if (this.config.debug) {
            console.log('[DevSkin] Initializing SDK with config:', this.config);
        }
        // Initialize transport
        this.transport = new Transport(this.config);
        // Generate anonymous ID if not exists
        this.anonymousId = this.getOrCreateAnonymousId();
        // Initialize collectors BEFORE starting session (so getContextData works)
        this.deviceCollector = new DeviceCollector(this.config);
        this.locationCollector = new LocationCollector(this.config);
        this.browserCollector = new BrowserCollector(this.config);
        // Start session (will now include device/browser/location data)
        // Wait for session creation to complete before starting collectors
        this.startSession().then(() => {
            // Session created, now safe to start collectors that send data
            var _a, _b;
            if (this.config.captureWebVitals) {
                this.performanceCollector = new PerformanceCollector(this.config, this.transport);
                this.performanceCollector.start();
            }
            if (this.config.captureErrors) {
                this.errorCollector = new ErrorCollector(this.config, this.transport);
                this.errorCollector.start();
            }
            if (this.config.captureNetworkRequests) {
                this.networkCollector = new NetworkCollector(this.config, this.transport);
                this.networkCollector.start();
            }
            // Initialize heatmap collector - SEMPRE habilitado
            // Merge default heatmap config with user config
            const heatmapConfig = Object.assign({ enabled: true, trackClicks: true, trackScroll: true, trackMouseMovement: true, mouseMoveSampling: 0.1 }, this.config.heatmapOptions);
            this.config.heatmapOptions = heatmapConfig;
            this.heatmapCollector = new HeatmapCollector(this.config, this.transport, this.anonymousId, this.sessionId);
            this.heatmapCollector.start();
            // Initialize screenshot collector and capture page
            this.screenshotCollector = new ScreenshotCollector(this.config, this.transport);
            this.screenshotCollector.captureAndSend(this.sessionId, window.location.href);
            if (this.config.debug) {
                console.log('[DevSkin] Heatmap collection enabled (always on)');
            }
            // Initialize session recording with rrweb
            if ((_a = this.config.sessionRecording) === null || _a === void 0 ? void 0 : _a.enabled) {
                // Use RRWebRecorder for complete DOM recording
                // Pass sessionStartTime to ensure timestamp continuity across page navigations
                this.rrwebRecorder = new RRWebRecorder(this.sessionId, {
                    enabled: true,
                    sampleRate: this.config.sessionRecording.sampling || 0.5,
                    blockClass: 'rr-block',
                    ignoreClass: this.config.sessionRecording.ignoreClass || 'rr-ignore',
                    maskAllInputs: this.config.sessionRecording.maskAllInputs !== undefined
                        ? this.config.sessionRecording.maskAllInputs
                        : true,
                    maskInputOptions: {
                        password: true,
                        email: true,
                        tel: true,
                    },
                    recordCanvas: this.config.sessionRecording.recordCanvas || false,
                    collectFonts: true,
                    inlineStylesheet: true,
                    checkoutEveryNms: 5 * 60 * 1000, // Every 5 minutes
                    checkoutEveryNth: 200, // Every 200 events
                }, (events) => {
                    var _a;
                    // Send rrweb events to backend
                    (_a = this.transport) === null || _a === void 0 ? void 0 : _a.sendRecordingEvents(this.sessionId, events);
                }, this.sessionStartTime // Pass session start time for timestamp continuity
                );
                // Start recording immediately (session already created)
                this.rrwebRecorder.start();
                if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.debug) {
                    console.log('[DevSkin] RRWeb recording started for session:', this.sessionId);
                }
            }
            // Track initial page view
            this.trackPageView();
            // Start heartbeat to update session duration every 30 seconds
            this.startHeartbeat();
        }).catch((err) => {
            console.error('[DevSkin] Failed to create session:', err);
        });
        // Track page visibility changes
        this.setupVisibilityTracking();
        // Track page unload
        this.setupUnloadTracking();
        this.initialized = true;
        if (this.config.debug) {
            console.log('[DevSkin] SDK initialized successfully');
        }
    }
    /**
     * Track a custom event
     */
    track(eventName, properties) {
        var _a, _b;
        if (!this.initialized) {
            console.warn('[DevSkin] SDK not initialized. Call init() first.');
            return;
        }
        const eventData = {
            eventName: eventName,
            eventType: 'track',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: this.userId || undefined,
            anonymousId: this.anonymousId || undefined,
            properties: Object.assign(Object.assign({}, properties), this.getContextData()),
            pageUrl: window.location.href,
            pageTitle: document.title,
        };
        (_a = this.transport) === null || _a === void 0 ? void 0 : _a.sendEvent(eventData);
        if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.debug) {
            console.log('[DevSkin] Event tracked:', eventData);
        }
    }
    /**
     * Track a page view
     */
    trackPageView(properties) {
        var _a, _b;
        if (!this.initialized) {
            console.warn('[DevSkin] SDK not initialized. Call init() first.');
            return;
        }
        // Generate unique page view ID
        const pageViewId = this.generateId();
        // Send to RUM page-views endpoint
        (_a = this.transport) === null || _a === void 0 ? void 0 : _a.sendPageView(Object.assign({ sessionId: this.sessionId, pageViewId: pageViewId, url: window.location.href, path: window.location.pathname, queryParams: window.location.search, referrer: document.referrer, title: document.title, timestamp: new Date().toISOString() }, properties));
        // Also track as analytics event for backwards compatibility
        this.track('page_view', Object.assign({ path: window.location.pathname, search: window.location.search, hash: window.location.hash, referrer: document.referrer }, properties));
        if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.debug) {
            console.log('[DevSkin] Page view tracked:', {
                sessionId: this.sessionId,
                pageViewId: pageViewId,
                url: window.location.href,
            });
        }
    }
    /**
     * Identify a user
     */
    identify(userId, traits) {
        var _a, _b;
        if (!this.initialized) {
            console.warn('[DevSkin] SDK not initialized. Call init() first.');
            return;
        }
        this.userId = userId;
        const userData = {
            userId: userId,
            anonymousId: this.anonymousId || undefined,
            traits: Object.assign(Object.assign({}, traits), this.getContextData()),
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
        };
        (_a = this.transport) === null || _a === void 0 ? void 0 : _a.identifyUser(userData);
        if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.debug) {
            console.log('[DevSkin] User identified:', userData);
        }
    }
    /**
     * Capture an error manually
     */
    captureError(error, context) {
        var _a;
        if (!this.initialized) {
            console.warn('[DevSkin] SDK not initialized. Call init() first.');
            return;
        }
        (_a = this.errorCollector) === null || _a === void 0 ? void 0 : _a.captureError(error, Object.assign(Object.assign({}, context), { session_id: this.sessionId, user_id: this.userId || undefined }));
    }
    /**
     * Add breadcrumb for debugging
     */
    addBreadcrumb(breadcrumb) {
        var _a;
        if (!this.initialized)
            return;
        (_a = this.errorCollector) === null || _a === void 0 ? void 0 : _a.addBreadcrumb(breadcrumb);
    }
    /**
     * Start/stop session recording
     */
    startRecording() {
        var _a;
        (_a = this.rrwebRecorder) === null || _a === void 0 ? void 0 : _a.start();
    }
    stopRecording() {
        var _a;
        (_a = this.rrwebRecorder) === null || _a === void 0 ? void 0 : _a.stop();
    }
    /**
     * Opt out/in
     */
    optOut() {
        localStorage.setItem('devskin_opt_out', 'true');
        this.initialized = false;
    }
    optIn() {
        localStorage.removeItem('devskin_opt_out');
    }
    /**
     * Private methods
     */
    startSession() {
        return __awaiter$1(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Check if there's an active session (stored in sessionStorage to persist across page navigations)
            const existingSessionId = sessionStorage.getItem('devskin_session_id');
            const existingSessionStart = sessionStorage.getItem('devskin_session_start');
            if (existingSessionId && existingSessionStart) {
                // Resume existing session
                this.sessionId = existingSessionId;
                this.sessionStartTime = parseInt(existingSessionStart, 10);
                // Set sessionId in transport so it can be added to network/performance requests
                (_a = this.transport) === null || _a === void 0 ? void 0 : _a.setSessionId(this.sessionId);
                if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.debug) {
                    console.log('[DevSkin] Resuming existing session:', this.sessionId);
                }
                // Send page view but DON'T create a new session
                // The session is already created, just continue it
                return;
            }
            // Create new session
            this.sessionId = this.generateId();
            this.sessionStartTime = Date.now();
            // Store in sessionStorage (persists across page navigations in same tab)
            sessionStorage.setItem('devskin_session_id', this.sessionId);
            sessionStorage.setItem('devskin_session_start', this.sessionStartTime.toString());
            // Set sessionId in transport so it can be added to network/performance requests
            (_c = this.transport) === null || _c === void 0 ? void 0 : _c.setSessionId(this.sessionId);
            const sessionData = Object.assign({ sessionId: this.sessionId, userId: this.userId || undefined, anonymousId: this.anonymousId, startedAt: new Date().toISOString(), platform: 'web' }, this.getContextData());
            // CRITICAL: Await session creation to ensure it exists before sending metrics/requests
            yield ((_d = this.transport) === null || _d === void 0 ? void 0 : _d.startSession(sessionData));
            if ((_e = this.config) === null || _e === void 0 ? void 0 : _e.debug) {
                console.log('[DevSkin] New session created:', this.sessionId);
            }
        });
    }
    getContextData() {
        var _a, _b, _c, _d;
        const context = {};
        // Flatten device data to match backend schema
        if (this.deviceCollector) {
            const device = this.deviceCollector.collect();
            context.deviceType = device.type;
            context.deviceModel = device.model;
            context.osName = (_a = device.os) === null || _a === void 0 ? void 0 : _a.name;
            context.osVersion = (_b = device.os) === null || _b === void 0 ? void 0 : _b.version;
            context.screenWidth = (_c = device.screen) === null || _c === void 0 ? void 0 : _c.width;
            context.screenHeight = (_d = device.screen) === null || _d === void 0 ? void 0 : _d.height;
            context.viewportWidth = window.innerWidth;
            context.viewportHeight = window.innerHeight;
        }
        // Flatten browser data to match backend schema
        if (this.browserCollector) {
            const browser = this.browserCollector.collect();
            context.browserName = browser.name;
            context.browserVersion = browser.version;
            context.userAgent = browser.userAgent;
        }
        // Flatten location data to match backend schema
        if (this.locationCollector) {
            const location = this.locationCollector.collect();
            context.country = location.country;
            context.city = location.city;
            context.ipAddress = undefined; // Will be set by backend from request
        }
        return context;
    }
    getOrCreateAnonymousId() {
        let id = localStorage.getItem('devskin_anonymous_id');
        if (!id) {
            id = this.generateId();
            localStorage.setItem('devskin_anonymous_id', id);
        }
        return id;
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.track('page_hidden');
            }
            else {
                this.track('page_visible');
            }
        });
    }
    setupUnloadTracking() {
        // CRITICAL: Flush data BEFORE page unloads to avoid losing final events
        // IMPORTANT: NEVER clear sessionStorage - it expires naturally when tab closes
        // 1. visibilitychange - fires when tab is hidden (most reliable)
        document.addEventListener('visibilitychange', () => {
            var _a, _b;
            if (document.hidden) {
                // User switched tabs or minimized - update duration and flush
                this.updateSessionDuration();
                (_a = this.rrwebRecorder) === null || _a === void 0 ? void 0 : _a.stop(); // Stop recording and flush
                (_b = this.transport) === null || _b === void 0 ? void 0 : _b.flush(true); // Use beacon
            }
        });
        // 2. pagehide - fires when page is being unloaded
        window.addEventListener('pagehide', () => {
            var _a, _b;
            // Track navigation (we can't distinguish between page navigation and tab close reliably)
            this.track('page_navigation');
            // Update duration but DON'T mark as ending (let heartbeat timeout handle session expiry)
            this.updateSessionDuration(false);
            // NEVER clear sessionStorage - it persists across navigations in same tab
            // and expires automatically when tab actually closes
            // Flush data before page unloads
            (_a = this.rrwebRecorder) === null || _a === void 0 ? void 0 : _a.stop(); // Stop recording and flush remaining events
            (_b = this.transport) === null || _b === void 0 ? void 0 : _b.flush(true); // Use beacon for reliability
        });
        // 3. beforeunload - backup for older browsers
        window.addEventListener('beforeunload', () => {
            var _a, _b;
            // Update duration but DON'T mark as ending
            this.updateSessionDuration(false);
            (_a = this.rrwebRecorder) === null || _a === void 0 ? void 0 : _a.stop();
            (_b = this.transport) === null || _b === void 0 ? void 0 : _b.flush(true);
        });
    }
    /**
     * Start heartbeat to update session duration periodically
     */
    startHeartbeat() {
        // Update duration every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.updateSessionDuration();
        }, 30000); // 30 seconds
    }
    /**
     * Update session duration
     */
    updateSessionDuration(isEnding = false) {
        var _a, _b;
        if (!this.sessionId || !this.sessionStartTime)
            return;
        const durationMs = Date.now() - this.sessionStartTime;
        const payload = Object.assign({ sessionId: this.sessionId, userId: this.userId || undefined, anonymousId: this.anonymousId, durationMs: durationMs, platform: 'web' }, this.getContextData());
        if (isEnding) {
            payload.endedAt = new Date().toISOString();
        }
        // Use beacon if ending, otherwise regular request
        (_a = this.transport) === null || _a === void 0 ? void 0 : _a.startSession(payload, isEnding);
        if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.debug) {
            console.log('[DevSkin] Session duration updated:', durationMs, 'ms', isEnding ? '(ending)' : '');
        }
    }
}
// Create singleton instance
const DevSkin = new DevSkinSDK();

exports.default = DevSkin;
//# sourceMappingURL=devskin.cjs.js.map
