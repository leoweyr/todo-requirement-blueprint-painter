import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Browser, Page } from 'puppeteer-core';

import { BrowserService } from '../../features/ssr/BrowserService';
import { ScreenshotService } from '../../features/ssr/ScreenshotService';


export class RenderController {
    private _sendImageResponse(res: VercelResponse, file: Buffer): void {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate');  // Cache the response for performance.
        res.send(file);
    }

    private _handleError(res: VercelResponse, error: unknown): void {
        console.error('SSR Error:', error);
        res.status(500).send(`Failed to generate PNG: ${(error as Error).message}`);
    }

    public async handle(req: VercelRequest, res: VercelResponse): Promise<void> {
        const browserService: BrowserService = BrowserService.instance;
        let browser: Browser | null = null;

        try {
            // 1. Determine target URL.
            const protocol: string = (req.headers['x-forwarded-proto'] as string) || 'https';
            const host: string | undefined = (req.headers['x-forwarded-host'] as string) || req.headers.host;

            if (!host) {
                res.status(500).send('Could not determine host.');
                return;
            }

            // Construct the URL to visit.
            // Remove 'view' parameter to avoid triggering the rewrite rule again.
            const queryParams: URLSearchParams = new URLSearchParams(req.query as Record<string, string>);
            queryParams.delete('view');

            const targetUrl: string = `${protocol}://${host}/?${queryParams.toString()}`;

            // 2. Launch browser & create page.
            browser = await browserService.launch();
            const page: Page = await browserService.createPage(browser);

            // 3. Capture screenshot.
            const file: Buffer = await ScreenshotService.capture(page, targetUrl);

            // 4. Send response.
            this._sendImageResponse(res, file);

        } catch (error) {
            this._handleError(res, error);
        } finally {
            // 5. Cleanup resources.
            if (browser) {
                await browser.close();
            }
        }
    }
}
