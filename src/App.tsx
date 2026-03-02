import { Component, type ReactNode, type MouseEvent } from 'react';

import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult, type PrerenderEdge, type PrerenderNode } from './features/graph/BlueprintPrerenderCombResult';
import { BlueprintSerializer } from './features/serializer/BlueprintSerializer';
import { DomainRegistry } from './features/registry/DomainRegistry';
import { CanvasViewport } from './components/canvas/CanvasViewport';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import BackdropBlur from './components/menus/BackdropBlur';
import FileOpenModal from './components/menus/FileOpenModal';
import ContextMenu from './components/menus/ContextMenu';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';


interface AppState {
    isFileLoaded: boolean;
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;
    private _contextMenuRef: ContextMenu | null = null;

    private handleLayoutUpdate: (result: BlueprintPrerenderCombResult) => void = (result: BlueprintPrerenderCombResult): void => {
        this._layoutResult = result;
    };

    private handleFileLoaded: () => void = (): void => {
        this.setState({ isFileLoaded: true });
    };

    private handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._contextMenuRef) {
            this._contextMenuRef.handleOpen(event);
        }
    };

    private handlePasteBlueprint: () => Promise<void> = async (): Promise<void> => {
        try {
            const clipboardText: string = await navigator.clipboard.readText();

            if (!clipboardText) return;

            // Deserialize and merge (overwrite duplicates).
            await BlueprintSerializer.fromYaml(clipboardText, this._registry, undefined, undefined, true);
            
            // Re-calculate layout.
            this._layoutResult = this._layoutService.calculateLayout(this._registry);
            
            // Calculate Content Bounds for Auto-Centering / Updating Scrollable Area.
            if (this._layoutResult.contentBounds) {
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
                } = this._layoutResult.contentBounds;

                // Update viewport bounds so the user can scroll to the new nodes.
                this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
            }

            // Force update.
            this.forceUpdate();
        } catch (error) {
            console.error('Failed to paste blueprint:', error);

            alert(`Failed to paste blueprint: ${(error as Error).message}`);
        }
    };

    private handleSaveBlueprint: () => void = (): void => {
        const yamlContent: string = BlueprintSerializer.toYaml(this._registry);
        const fileName: string = `${this._registry.blueprintName}.yaml`;

        // Create a Blob and trigger download.
        const blob: Blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
        const url: string = URL.createObjectURL(blob);
        const link: HTMLAnchorElement = document.createElement('a');

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    private handleKeyDown: (event: Event) => void = (event: Event): void => {
        const keyboardEvent: KeyboardEvent = event as KeyboardEvent;

        // Check for Ctrl+V or Cmd+V (Meta+V).
        if ((keyboardEvent.ctrlKey || keyboardEvent.metaKey) && (keyboardEvent.key === 'v' || keyboardEvent.key === 'V')) {
            this.handlePasteBlueprint();
        }
    };

    public constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false
        };

        this._viewport = new CanvasViewport(0, 0, 1);
        this._layoutService = new BlueprintPrerenderComb();
        this._registry = DomainRegistry.instance;
        this._registry.clear();

        this._layoutResult = this._layoutService.calculateLayout(this._registry);
    }

    public async componentDidMount(): Promise<void> {
        await this._registry.fetchLatestTrbVersion();
        
        window.addEventListener('keydown', this.handleKeyDown);
    }

    public componentWillUnmount(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    public render(): ReactNode {
        const { isFileLoaded }: AppState = this.state;
        const layoutResult: BlueprintPrerenderCombResult | null = this._layoutResult;

        return (
            <>
                <InfiniteCanvas 
                    viewport={this._viewport}
                    layerGapCenters={layoutResult?.layerGapCenters}
                    onContextMenu={this.handleContextMenu}
                >
                    {layoutResult && this.renderGraph()}
                </InfiniteCanvas>

                <ContextMenu
                    ref={(contextMenu: ContextMenu | null): void => { this._contextMenuRef = contextMenu; }}
                    onPaste={this.handlePasteBlueprint}
                    onSave={this.handleSaveBlueprint}
                />

                {!isFileLoaded && (
                    <BackdropBlur>
                        {/* Modal to open existing file or create a new one. */}
                        <FileOpenModal 
                            onFileLoaded={this.handleFileLoaded}
                            registry={this._registry}
                            layoutService={this._layoutService}
                            viewport={this._viewport}
                            onLayoutUpdate={this.handleLayoutUpdate}
                        />
                    </BackdropBlur>
                )}
            </>
        );
    }

    private renderGraph(): ReactNode {
        if (!this._layoutResult) return null;

        const { prerenderNodes, prerenderEdges }: BlueprintPrerenderCombResult = this._layoutResult;

        return (
            <>
                {/* Render Edges (behind Nodes). */}
                {prerenderEdges.map((properties: PrerenderEdge): ReactNode => (
                    <EdgeLine
                        key={properties.edge.id}
                        {...properties}
                    />
                ))}

                {/* Render Nodes (on top of Edges). */}
                {prerenderNodes.map((properties: PrerenderNode): ReactNode => (
                    <NodeRectangle
                        key={properties.node.id}
                        {...properties}
                    />
                ))}
            </>
        );
    }
}


export default App;
