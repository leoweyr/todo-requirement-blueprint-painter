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
            const puppeteerPkg: string = 'puppeteer';
            const localPuppeteer: any = await import(puppeteerPkg);
            executablePath = localPuppeteer.default.executablePath();
            console.log('Using local Puppeteer Chromium:', executablePath);
        } else {
            // Use @sparticuz/chromium for Vercel production environments (AWS Lambda).
            try {
                // IMPORTANT: Before calling executablePath(), graphics mode must be configured
                // if not using the default. Stick to default first but
                // ensure a valid path string is returned.
                // Note: @sparticuz/chromium sometimes downloads to /tmp.
                executablePath = await chromium.executablePath();

                // If executablePath returns undefined or empty, it might be that the
                // package is not correctly detecting the environment or the binary is missing.
                if (!executablePath) {
                    throw new Error('Chromium executable path is empty.');
                }
                
                console.log('Using Vercel Chromium:', executablePath);
            } catch (error) {
                 // Fallback or detailed error logging.
                 console.error('Failed to get chromium executable path:', error);
                 throw error;
            }
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
        
        // For Vercel/AWS Lambda, specific args are required.
        // @sparticuz/chromium provides these via chromium.args.
        const args = isLocal ? [] : [...chromium.args, '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-sandbox'];

        const launchOptions: any = {
            args,
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
