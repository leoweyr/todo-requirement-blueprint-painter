import type { Page } from 'puppeteer-core';


export class PagePreparer {
    // UI elements that should be hidden in exported images.
    private static readonly HIDDEN_SELECTORS: string[] = [
        '.timeline-slider',
        '.menu-manager',
        '.legend-container',
        '.file-open-modal-overlay'
    ];

    // Hide UI elements in a Puppeteer page context for clean screenshot capture.
    public static async hideUiElements(page: Page): Promise<void> {
        await page.evaluate((selectors: string[]): void => {
            selectors.forEach((selector: string): void => {
                const elements: NodeListOf<Element> = document.querySelectorAll(selector);

                elements.forEach((element: Element): void => {
                    (element as HTMLElement).style.display = 'none';
                });
            });
        }, PagePreparer.HIDDEN_SELECTORS);
    }
}
