import type { Page } from 'puppeteer-core';

import { PngGenerator } from '../png-export/PngGenerator';


export class ScreenshotService {
    public static async capture(page: Page, url: string): Promise<Buffer> {
        console.log(`Navigating to: ${url}`);
        
        // 1. Navigate to the page.
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // 2. Wait for the graph to be rendered.
        try {
            await page.waitForSelector('svg', { timeout: 15000 });
            
            // Allow additional time for layout and font rendering.
            await new Promise((resolve: (value: void) => void): void => {
                setTimeout(resolve, 1500);
            });
        } catch (error) {
            console.warn('Timeout while waiting for SVG elements; proceeding with screenshot.');
        }

        // 3. Prepare the page for PNG export.
        await PngGenerator.hideUiElements(page);

        // 4. Take a full page screenshot.
        const buffer: Buffer = await page.screenshot({ type: 'png', fullPage: true, encoding: 'binary' }) as Buffer;

        return buffer;
    }
}
