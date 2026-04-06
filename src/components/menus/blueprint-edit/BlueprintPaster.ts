import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { BlueprintPrerenderComb } from '../../../features/graph/BlueprintPrerenderComb';
import { CanvasViewport } from '../../canvas/viewport/CanvasViewport';
import { type BlueprintPrerenderCombResult } from '../../../features/graph/BlueprintPrerenderCombResult';
import { BlueprintSerializer } from '../../../features/serializer/BlueprintSerializer';


export class BlueprintPaster {
    private static _keyDownHandler: ((event: Event) => void) | null = null;

    public static async paste(
        registry: DomainRegistry,
        layoutService: BlueprintPrerenderComb,
        viewport: CanvasViewport,
        onUpdate: (result: BlueprintPrerenderCombResult) => void
    ): Promise<void> {
        try {
            const clipboardText: string = await navigator.clipboard.readText();

            if (!clipboardText) return;

            // Deserialize and merge (overwrite duplicates).
            await BlueprintSerializer.fromYaml(clipboardText, registry, undefined, undefined, true);
            
            // Re-calculate layout.
            const layoutResult: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
            
            // Calculate Content Bounds for Auto-Centering / Updating Scrollable Area.
            if (layoutResult.contentBounds) {
                const {
                    minimumX,
                    minimumY,
                    maximumX,
                    maximumY
                }: {
                    minimumX: number;
                    minimumY: number;
                    maximumX: number;
                    maximumY: number
                } = layoutResult.contentBounds;

                // Update viewport bounds so the user can scroll to the new nodes.
                viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
            }

            onUpdate(layoutResult);
        } catch (error) {
            console.error('Failed to paste blueprint:', error);
            alert(`Failed to paste blueprint: ${(error as Error).message}`);
        }
    }

    public static bind(
        window: Window,
        registry: DomainRegistry,
        layoutService: BlueprintPrerenderComb,
        viewport: CanvasViewport,
        onUpdate: (result: BlueprintPrerenderCombResult) => void
    ): void {
        this._keyDownHandler = (event: Event): void => {
            const keyboardEvent: KeyboardEvent = event as KeyboardEvent;

            // Check for Ctrl+V or Cmd+V (Meta+V).
            if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && (keyboardEvent.key === 'v' || keyboardEvent.key === 'V')) {
                this.paste(registry, layoutService, viewport, onUpdate);
            }
        };

        window.addEventListener('keydown', this._keyDownHandler);
    }

    public static unbind(window: Window): void {
        if (this._keyDownHandler) {
            window.removeEventListener('keydown', this._keyDownHandler);
            this._keyDownHandler = null;
        }
    }
}
