import { Component, type ReactNode, type MouseEvent } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult, type PrerenderEdge, type PrerenderNode } from './features/graph/BlueprintPrerenderCombResult';
import { DomainRegistry } from './features/registry/DomainRegistry';
import ContextMenu from './components/menus/ContextMenu';
import { BlueprintPaster } from './components/menus/BlueprintPaster';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import { BlueprintSaver } from './components/menus/BlueprintSaver';
import BackdropBlur from './components/menus/BackdropBlur';
import NodeCreateModal from './components/menus/NodeCreateModal';
import FileOpenModal from './components/menus/FileOpenModal';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';


interface AppState {
    isFileLoaded: boolean;
    isNodeCreateModalOpen: boolean;
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

    public constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false,
            isNodeCreateModalOpen: false
        };

        this._viewport = new CanvasViewport(0, 0, 1);
        this._layoutService = new BlueprintPrerenderComb();
        this._registry = DomainRegistry.instance;
        this._registry.clear();

        this._layoutResult = this._layoutService.calculateLayout(this._registry);
    }

    public async componentDidMount(): Promise<void> {
        await this._registry.fetchLatestTrbVersion();
        
        BlueprintPaster.bind(
            window,
            this._registry,
            this._layoutService,
            this._viewport,
            (result: BlueprintPrerenderCombResult): void => {
                this._layoutResult = result;
                this.forceUpdate();
            }
        );
    }

    public componentWillUnmount(): void {
        BlueprintPaster.unbind(window);
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
                    onCreateNode={(): void => this.setState({ isNodeCreateModalOpen: true })}
                    onPaste={(): void => {
                        BlueprintPaster.paste(
                            this._registry,
                            this._layoutService,
                            this._viewport,
                            (result: BlueprintPrerenderCombResult): void => {
                                this._layoutResult = result;
                                this.forceUpdate();
                            }
                        );
                    }}
                    onSave={(): void => BlueprintSaver.save(this._registry)}
                />

                {this.state.isNodeCreateModalOpen && (
                    <BackdropBlur>
                        <NodeCreateModal
                            registry={this._registry}
                            layoutService={this._layoutService}
                            onClose={(): void => this.setState({ isNodeCreateModalOpen: false })}
                            onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => {
                                this._layoutResult = result;
                                this.forceUpdate();
                            }}
                        />
                    </BackdropBlur>
                )}

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
