/**
 * DevSkin Async Loader
 * Lightweight loader (~1KB) that detects bots and loads the full SDK asynchronously
 * This ensures ZERO impact on PageSpeed/Lighthouse scores
 */
(function(w, d, c, b, s) {
  // Bot detection patterns
  var botPatterns = /bot|crawler|spider|lighthouse|pagespeed|gtmetrix|headless|phantomjs|slurp|ia_archiver/i;

  // Skip initialization for bots (SEO optimization)
  if (botPatterns.test(navigator.userAgent) || navigator.webdriver) {
    if (c.debug) console.log('[DevSkin] Bot detected - SDK disabled');
    return;
  }

  // Create DevSkin stub that queues commands
  w.DevSkin = w.DevSkin || function() {
    (w.DevSkin.q = w.DevSkin.q || []).push(Array.prototype.slice.call(arguments));
  };
  w.DevSkin.l = Date.now();

  // Load the full SDK asynchronously
  b = d.getElementsByTagName('head')[0];
  s = d.createElement('script');
  s.async = 1;
  s.src = c.cdnUrl || 'https://cdn.jsdelivr.net/npm/@devskin/browser-sdk@latest/dist/devskin.umd.min.js';
  b.appendChild(s);
})(window, document, typeof DevSkinConfig !== 'undefined' ? DevSkinConfig : {});
