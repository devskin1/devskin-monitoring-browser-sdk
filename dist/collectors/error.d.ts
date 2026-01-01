import { DevSkinConfig, Breadcrumb } from '../types';
import { Transport } from '../transport';
export declare class ErrorCollector {
    private config;
    private transport;
    private breadcrumbs;
    private maxBreadcrumbs;
    constructor(config: DevSkinConfig, transport: Transport);
    start(): void;
    captureError(error: Error | string, context?: Record<string, any>): void;
    addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        level?: 'info' | 'warning' | 'error';
        data?: Record<string, any>;
    }): void;
    private handleError;
    private shouldIgnoreError;
    private setupAutomaticBreadcrumbs;
    private wrapConsole;
    getBreadcrumbs(): Breadcrumb[];
}
//# sourceMappingURL=error.d.ts.map