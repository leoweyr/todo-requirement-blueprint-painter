import * as htmlToImage from 'html-to-image';


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
                backgroundColor: '#f5f5f5'  // Set background color.
            });
            
            // 3. Replace the entire app with the image.
            const img: HTMLImageElement = document.createElement('img');
            img.src = imgData;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            
            document.body.innerHTML = '';
            document.body.appendChild(img);
        } catch (error) {
            console.error('Failed to generate PNG:', error);
            alert('Failed to generate PNG image.');
            
            // 4. Restore UI if generation fails.
            elementsToRestore.forEach(({ element, originalDisplay }: { element: HTMLElement; originalDisplay: string }): void => {
                element.style.display = originalDisplay;
            });
        }
    }
}
