import { Component, type ReactNode, type MouseEvent } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult, type PrerenderEdge, type PrerenderNode } from './features/graph/BlueprintPrerenderCombResult';
import { BlueprintSerializer } from './features/serializer/BlueprintSerializer';
import { DomainRegistry } from './features/registry/DomainRegistry';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import BackdropBlur from './components/menus/BackdropBlur';
import FileOpenModal from './components/menus/FileOpenModal';
import ContextMenu from './components/menus/ContextMenu';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';


interface AppState {
    isFileLoaded: boolean;
    isContextMenuOpen: boolean;
    contextMenuX: number;
    contextMenuY: number;
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;

    private handleFileSelected: (
        fileContent: string,
        fileName: string
    ) => Promise<void> = async (fileContent: string, fileName: string): Promise<void> => {
        console.log('Loading file...');

        try {
            this._registry.clear();
            
            // Remove extension from filename to get blueprint name.
            const blueprintName: string = fileName.replace(/\.[^/.]+$/, "");

            await BlueprintSerializer.fromYaml(fileContent, this._registry, undefined, blueprintName);

            this._layoutResult = this._layoutService.calculateLayout(this._registry);

        // Calculate Content Bounds for Auto-Centering.
        if (this._layoutResult.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY } = this._layoutResult.contentBounds;

            this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
        }

            this.setState({ isFileLoaded: true });
        } catch (error) {
            console.error('Failed to load blueprint:', error);

            alert(`Failed to load blueprint: ${(error as Error).message}`);
        }
    };

    private handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.preventDefault();
        
        this.setState({
            isContextMenuOpen: true,
            contextMenuX: event.clientX,
            contextMenuY: event.clientY
        });
    };

    private handleCloseContextMenu: () => void = (): void => {
        this.setState({ isContextMenuOpen: false });
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

    constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false,
            isContextMenuOpen: false,
            contextMenuX: 0,
            contextMenuY: 0
        };

        this._viewport = new CanvasViewport(0, 0, 1);
        this._layoutService = new BlueprintPrerenderComb();
        this._registry = DomainRegistry.instance;
        this._registry.clear();

        this._layoutResult = this._layoutService.calculateLayout(this._registry);
    }

    public async componentDidMount(): Promise<void> {
        await this._registry.fetchLatestTrbVersion();
    }

    public render(): ReactNode {
        const { isFileLoaded, isContextMenuOpen, contextMenuX, contextMenuY }: AppState = this.state;
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

                {isContextMenuOpen && (
                    <ContextMenu
                        x={contextMenuX}
                        y={contextMenuY}
                        items={{
                            'Save': this.handleSaveBlueprint
                        }}
                        onClose={this.handleCloseContextMenu}
                    />
                )}

                {!isFileLoaded && (
                    <BackdropBlur>
                        <FileOpenModal onFileSelected={this.handleFileSelected} />
                    </BackdropBlur>
                )}
            </>
        );
    }

    private renderGraph(): ReactNode {
        if (!this._layoutResult) return null;

        const { prerenderNodes, prerenderEdges } = this._layoutResult;

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
