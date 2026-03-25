import type { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';


export class BrowserService {
    private static _instance: BrowserService;

    public static get instance(): BrowserService {
        if (!BrowserService._instance) {
            BrowserService._instance = new BrowserService();
        }
        return BrowserService._instance;
    }

    private constructor() {}

    public async launch(): Promise<Browser> {
        const isLocal: boolean = process.env.VERCEL_ENV === 'development' || !process.env.AWS_LAMBDA_FUNCTION_VERSION;
        let executablePath: string = '';

        if (isLocal) {
            // Use full puppeteer for local development, which includes bundled Chromium.
            const localPuppeteer: any = await import('puppeteer');
            executablePath = localPuppeteer.default.executablePath();
            console.log('Using local Puppeteer Chromium:', executablePath);
        } else {
            // Use @sparticuz/chromium for Vercel production environments (AWS Lambda).
            executablePath = await chromium.executablePath();
        }

        return await this._launchBrowser(isLocal, executablePath);
    }

    private async _launchBrowser(isLocal: boolean, executablePath: string): Promise<Browser> {
        // Dynamically import puppeteer-core to avoid bundling issues. 
        // Standard import is typically acceptable for serverless environments.
        const puppeteerCore: any = await import('puppeteer-core');
        
        // Cast to any to bypass type mismatch between @sparticuz/chromium and puppeteer-core.
        // This also handles missing properties in @sparticuz/chromium type definitions.
        const chromiumAny: any = chromium as any;
        const launchOptions: any = {
            args: isLocal ? [] : chromium.args,
            defaultViewport: chromiumAny.defaultViewport,
            executablePath,
            headless: chromiumAny.headless,
            ignoreHTTPSErrors: true,
        };

        return await puppeteerCore.default.launch(launchOptions);
    }

    public async createPage(browser: Browser): Promise<Page> {
        const page: Page = await browser.newPage();
        
        // Set a high-resolution viewport for better quality screenshots.
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
        
        return page;
    }
}
