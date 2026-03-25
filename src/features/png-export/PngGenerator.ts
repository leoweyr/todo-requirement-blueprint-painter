import * as htmlToImage from 'html-to-image';
import { type CSSProperties } from 'react';


export class PngGenerator {
    public static async generate(
        hiddenSelectors: string[] = ['.timeline-slider', '.menu-manager', '.legend-container', '.file-open-modal-overlay']
    ): Promise<void> {
        // 1. Hide UI elements temporarily.
        const elementsToRestore: { element: HTMLElement; originalDisplay: string }[] = [];
        
        for (const selector of hiddenSelectors) {
            const nodes: NodeListOf<Element> = document.querySelectorAll(selector);

            nodes.forEach((node: Node): void => {
                if (node instanceof HTMLElement) {
                    elementsToRestore.push({ element: node, originalDisplay: node.style.display });
                    node.style.display = 'none';
                }
            });
        }

        try {
            // 2. Capture the DOM using html-to-image.
            const imgData: string = await htmlToImage.toPng(document.body, {
                filter: (node: Node): boolean => {
                     // Check if node is an Element before calling matches.
                    if (node.nodeType === 1) {  // Node.ELEMENT_NODE.
                         const element: Element = node as Element;
                         
                         // Filter out noscript elements (shows "You need to enable JavaScript" message).
                         if (element.tagName === 'NOSCRIPT') {
                             return false;
                         }
                         
                         return !hiddenSelectors.some((selector: string): boolean => element.matches(selector));
                    }
                    return true;
                },
                backgroundColor: '#f5f5f5',  // Set background color.
                style: { margin: '0', padding: '0', overflow: 'hidden' }
            });
            
            // 3. Replace the entire app with the image.
            const img: HTMLImageElement = document.createElement('img');
            img.src = imgData;
            
            // Apply full-screen styles for clean capture.
            Object.assign(img.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                objectFit: 'contain',
                backgroundColor: '#f5f5f5',
                zIndex: '9999'
            } as CSSProperties);
            
            document.body.innerHTML = '';
            document.body.appendChild(img);
            document.body.classList.add('render-complete');
        } catch (error) {
            console.error('Failed to generate PNG:', error);
            
            // Render error message instead of alert for headless browsers.
            document.body.innerHTML = '<div style="color:red; padding:20px;">Failed to generate PNG image. Check console for details.</div>';
        }
    }
}
