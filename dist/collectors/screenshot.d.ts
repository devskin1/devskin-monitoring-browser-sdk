import { DevSkinConfig } from '../types';
import { Transport } from '../transport';
export declare class ScreenshotCollector {
    private config;
    private transport;
    private captured;
    private retryCount;
    private readonly MAX_RETRIES;
    constructor(config: DevSkinConfig, transport: Transport);
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
    captureAndSend(sessionId: string, pageUrl: string): Promise<void>;
    /** Aguarda document.readyState === 'complete' + window load */
    private waitForPageReady;
    /** Aguarda <img> visíveis terminarem de carregar (com timeout) */
    private waitForImagesLoaded;
    /** Aguarda idle callback (browser parou de processar) */
    private waitForIdle;
    /** Mede altura total da página */
    private measureFullHeight;
    /** Mede largura total da página */
    private measureFullWidth;
    /** Faz uma captura, retornando canvas + dimensões medidas */
    private attemptCapture;
}
//# sourceMappingURL=screenshot.d.ts.map