import type { Page } from 'puppeteer-core';


export class ScreenshotService {
    public static async capture(page: Page, url: string): Promise<Buffer> {
        console.log(`Navigating to: ${url}`);
        
        // 1. Navigate to the page.
        // Wait until network is idle to ensure most resources are loaded.
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // 2. Wait for the application's specific render completion signal.
        // The frontend's PngGenerator adds the '.render-complete' class when ready.
        try {
            await page.waitForSelector('.render-complete', { timeout: 15000 });
        } catch (e) {
            console.warn('Timeout while waiting for the .render-complete selector; proceeding with the screenshot.');
        }

        // 3. Take a full page screenshot.
        // The 'encoding: binary' option returns a Buffer, which is required for the response.
        const buffer: Buffer = await page.screenshot({ type: 'png', fullPage: true, encoding: 'binary' }) as Buffer;

        return buffer;
    }
}
