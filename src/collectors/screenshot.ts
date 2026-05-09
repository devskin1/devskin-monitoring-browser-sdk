import html2canvas from 'html2canvas';
import { DevSkinConfig } from '../types';
import { Transport } from '../transport';

export class ScreenshotCollector {
  private captured = false;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  constructor(
    private config: DevSkinConfig,
    private transport: Transport
  ) {}

  /**
   * Capture a screenshot of the current page and send to backend.
   *
   * Strategy:
   *   1. Espera document.readyState === 'complete' (todas as imagens, CSS, etc)
   *   2. Espera todas as imagens visíveis terminarem de carregar
   *   3. Espera idle callback (página parou de fazer trabalho pesado)
   *   4. Mede dimensões DUAS vezes (antes e depois de html2canvas) — se mudaram,
   *      o conteúdo continuou crescendo durante a captura → retry
   *   5. Se captura sair < 600px de altura E página parece longa, retry
   *   6. Max 3 retries com backoff exponencial
   */
  async captureAndSend(sessionId: string, pageUrl: string): Promise<void> {
    if (this.captured) return;

    try {
      // 1. Aguarda página estar pronta (readyState + load event)
      await this.waitForPageReady();

      // 2. Aguarda imagens visíveis terminarem de carregar
      await this.waitForImagesLoaded();

      // 3. Aguarda navegador idle pra capturar com layout estável
      await this.waitForIdle();

      if (this.config.debug) {
        console.log('[DevSkin] Page ready — capturing screenshot...');
      }

      const result = await this.attemptCapture();
      if (!result) return;

      // 4. Heurística anti-tripinha: se altura capturada < 600 mas vp >= 600,
      //    o DOM ainda estava colapsado. Retry com delay maior.
      const viewport = window.innerHeight;
      if (
        result.canvas.height < 600 &&
        viewport >= 600 &&
        this.retryCount < this.MAX_RETRIES
      ) {
        if (this.config.debug) {
          console.warn(
            `[DevSkin] Screenshot suspeitamente curta (${result.canvas.height}px). Retry ${this.retryCount + 1}/${this.MAX_RETRIES}...`
          );
        }
        this.retryCount++;
        // backoff exponencial: 2s → 4s → 8s
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, this.retryCount)));
        return this.captureAndSend(sessionId, pageUrl);
      }

      // 5. Mede dimensões POST-captura. Se aumentou significativamente,
      //    DOM continuou crescendo durante a captura — retry
      const postHeight = this.measureFullHeight();
      if (
        postHeight > result.fullHeight * 1.5 &&
        this.retryCount < this.MAX_RETRIES
      ) {
        if (this.config.debug) {
          console.warn(
            `[DevSkin] DOM cresceu durante captura (${result.fullHeight}px → ${postHeight}px). Retry...`
          );
        }
        this.retryCount++;
        await new Promise((r) => setTimeout(r, 2000));
        return this.captureAndSend(sessionId, pageUrl);
      }

      // OK, envia
      const screenshot = result.canvas.toDataURL('image/jpeg', 0.6);
      this.transport.sendScreenshot({
        session_id: sessionId,
        page_url: pageUrl,
        screenshot,
        width: result.canvas.width,
        height: result.canvas.height,
      });

      this.captured = true;

      if (this.config.debug) {
        console.log('[DevSkin] Screenshot captured and sent:', {
          size: Math.round(screenshot.length / 1024) + 'KB',
          dimensions: `${result.canvas.width}x${result.canvas.height}`,
          retries: this.retryCount,
        });
      }
    } catch (error) {
      console.error('[DevSkin] Failed to capture screenshot:', error);
    }
  }

  /** Aguarda document.readyState === 'complete' + window load */
  private waitForPageReady(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
        return;
      }
      window.addEventListener('load', () => resolve(), { once: true });
      // Fallback: máximo 5s
      setTimeout(() => resolve(), 5000);
    });
  }

  /** Aguarda <img> visíveis terminarem de carregar (com timeout) */
  private async waitForImagesLoaded(): Promise<void> {
    const images = Array.from(document.images || []);
    if (images.length === 0) return;

    const visibleImages = images.filter((img) => {
      // Skip imagens fora da viewport ou com lazy-load não disparado
      const rect = img.getBoundingClientRect();
      return rect.top < window.innerHeight * 3 && rect.width > 0;
    });

    if (visibleImages.length === 0) return;

    const timeoutMs = 3000;
    const promises = visibleImages.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          setTimeout(() => resolve(), timeoutMs);
        })
    );

    await Promise.all(promises);
  }

  /** Aguarda idle callback (browser parou de processar) */
  private waitForIdle(): Promise<void> {
    return new Promise((resolve) => {
      const ric = (window as any).requestIdleCallback;
      if (ric) {
        ric(() => resolve(), { timeout: 2000 });
      } else {
        setTimeout(resolve, 500);
      }
    });
  }

  /** Mede altura total da página */
  private measureFullHeight(): number {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight
    );
  }

  /** Mede largura total da página */
  private measureFullWidth(): number {
    return Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.body.clientWidth,
      document.documentElement.clientWidth
    );
  }

  /** Faz uma captura, retornando canvas + dimensões medidas */
  private async attemptCapture(): Promise<{
    canvas: HTMLCanvasElement;
    fullWidth: number;
    fullHeight: number;
  } | null> {
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    // Aguarda scroll completar (alguns browsers usam smooth scroll)
    await new Promise((r) => setTimeout(r, 200));

    const fullWidth = this.measureFullWidth();
    const fullHeight = this.measureFullHeight();

    if (this.config.debug) {
      console.log(`[DevSkin] Page dims: ${fullWidth}x${fullHeight}`);
    }

    const canvas = await html2canvas(document.documentElement, {
      // useCORS sozinho (allowTaint causa conflito em alguns browsers)
      useCORS: true,
      allowTaint: false,
      logging: false,
      scale: 0.5, // Reduz output em 50%
      width: fullWidth,
      height: fullHeight,
      // windowWidth/windowHeight são o VIEWPORT SIMULADO interno do html2canvas
      // — devem ser o tamanho real da viewport, NÃO o tamanho total da página
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollY: 0,
      scrollX: 0,
      x: 0,
      y: 0,
      // foreignObjectRendering: false — render via clone (mais lento mas mais confiável
      // em pages com SVG/Canvas/iframes que poderiam quebrar)
      foreignObjectRendering: false,
    });

    window.scrollTo(0, originalScrollY);

    return { canvas, fullWidth, fullHeight };
  }
}
