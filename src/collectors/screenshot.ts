import html2canvas from 'html2canvas';
import { DevSkinConfig } from '../types';
import { Transport } from '../transport';

export class ScreenshotCollector {
  private captured = false;

  constructor(
    private config: DevSkinConfig,
    private transport: Transport
  ) {}

  /**
   * Capture a screenshot of the current page and send to backend
   */
  async captureAndSend(sessionId: string, pageUrl: string): Promise<void> {
    if (this.captured) return; // Only capture once per session

    try {
      // Wait for page to fully render
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (this.config.debug) {
        console.log('[DevSkin] Capturing page screenshot...');
      }

      // Scroll to top before capturing
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get full page dimensions
      const fullWidth = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.body.clientWidth,
        document.documentElement.clientWidth
      );

      const fullHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );

      const canvas = await html2canvas(document.documentElement, {
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
    } catch (error) {
      console.error('[DevSkin] Failed to capture screenshot:', error);
    }
  }
}
