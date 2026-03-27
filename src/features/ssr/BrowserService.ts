import type { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';


export class BrowserService {
    // URL to download Chromium binary pack for Lambda environments.
    // Using the official release from @sparticuz/chromium GitHub.
    // Vercel Functions run on x64 architecture.
    private static readonly CHROMIUM_PACK_URL: string = 'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar';

    private static _instance: BrowserService;

    public static get instance(): BrowserService {
        if (!BrowserService._instance) {
            BrowserService._instance = new BrowserService();
        }
        return BrowserService._instance;
    }

    private constructor() {}

    public async launch(): Promise<Browser> {
        // Use a more reliable check for local development.
        // AWS_LAMBDA_FUNCTION_NAME is present in Vercel functions.
        const isLocal: boolean = !process.env.AWS_LAMBDA_FUNCTION_NAME;
        let executablePath: string = '';

        if (isLocal) {
            // Use full puppeteer for local development, which includes bundled Chromium.
            const puppeteerPkg: string = 'puppeteer';
            const localPuppeteer: any = await import(puppeteerPkg);
            executablePath = localPuppeteer.default.executablePath();
            console.log('Using local Puppeteer Chromium:', executablePath);
        } else {
            // Use @sparticuz/chromium-min for Vercel production environments (AWS Lambda).
            // The -min package requires specifying a remote URL for the Chromium binary pack.
            console.log('Environment check - Running in Lambda/Vercel');
            console.log('AWS_LAMBDA_FUNCTION_NAME:', process.env.AWS_LAMBDA_FUNCTION_NAME);
            
            try {
                // CRITICAL: Must set graphics mode BEFORE calling executablePath().
                // This ensures the correct binary variant is selected.
                chromium.setGraphicsMode = false;

                // Call executablePath with the remote URL for the Chromium pack.
                // @sparticuz/chromium-min will download and extract to /tmp on first run.
                console.log('Downloading Chromium from:', BrowserService.CHROMIUM_PACK_URL);

                executablePath = await chromium.executablePath(BrowserService.CHROMIUM_PACK_URL);

                console.log('Chromium executablePath returned:', executablePath);
                
                // Verify the path is valid and not from Puppeteer's cache.
                if (!executablePath || executablePath.includes('.cache/puppeteer')) {
                    throw new Error(`Invalid chromium path: ${executablePath}. Expected @sparticuz/chromium path, got Puppeteer cache path.`);
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
        // Import puppeteer-core statically at the top level.
        const puppeteerCore: any = await import('puppeteer-core');
        
        // Cast to any to bypass type mismatch between @sparticuz/chromium and puppeteer-core.
        const chromiumAny: any = chromium as any;
        
        // For Vercel/AWS Lambda, specific args are required.
        // @sparticuz/chromium provides these via chromium.args.
        const args: string[] = isLocal 
            ? [] 
            : [
                ...chromium.args,
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--single-process',
                '--no-zygote'
            ];

        const launchOptions: any = {
            args,
            defaultViewport: chromiumAny.defaultViewport || { width: 1920, height: 1080 },
            executablePath,
            headless: chromiumAny.headless !== false ? true : chromiumAny.headless,
            ignoreHTTPSErrors: true
        };

        console.log('Launch options:', JSON.stringify(launchOptions, null, 2));

        return await puppeteerCore.default.launch(launchOptions);
    }

    public async createPage(browser: Browser): Promise<Page> {
        const page: Page = await browser.newPage();
        
        // Set a high-resolution viewport for better quality screenshots.
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
        
        return page;
    }
}
