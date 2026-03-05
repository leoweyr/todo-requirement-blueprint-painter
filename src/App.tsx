import { Component, type ReactNode, type MouseEvent } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult, type PrerenderEdge, type PrerenderNode } from './features/graph/BlueprintPrerenderCombResult';
import { DomainRegistry } from './features/registry/DomainRegistry';
import ContextMenu from './components/menus/context-menu/ContextMenu';
import { BlueprintPaster } from './components/menus/blueprint-paste/BlueprintPaster';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import { BlueprintSaver } from './components/menus/blueprint-save/BlueprintSaver';
import BackdropBlur from './components/menus/BackdropBlur';
import NodeCreateModal from './components/menus/node-create/NodeCreateModal';
import NodeStatusCreateModal from './components/menus/node-status-create/NodeStatusCreateModal';
import FileOpenModal from './components/menus/file-open/FileOpenModal';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';
import Legend from './components/canvas/Legend';


interface AppState {
    isFileLoaded: boolean;
    isNodeCreateModalOpen: boolean;
    isNodeStatusCreateModalOpen: boolean;
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;
    private _contextMenuRef: ContextMenu | null = null;

    private handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._contextMenuRef) {
            this._contextMenuRef.handleOpen(event);
        }
    };

    public constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false,
            isNodeCreateModalOpen: false,
            isNodeStatusCreateModalOpen: false
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
                    onCreateNodeStatus={(): void => this.setState({ isNodeStatusCreateModalOpen: true })}
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

                {this.state.isNodeStatusCreateModalOpen && (
                    <BackdropBlur>
                        <NodeStatusCreateModal
                            registry={this._registry}
                            onClose={(): void => this.setState({ isNodeStatusCreateModalOpen: false })}
                        />
                    </BackdropBlur>
                )}

                {!isFileLoaded && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FileOpenModal 
                            onFileLoaded={(): void => this.setState({ isFileLoaded: true })}
                            registry={this._registry}
                            layoutService={this._layoutService}
                            viewport={this._viewport}
                            onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => {
                                this._layoutResult = result;
                                this.forceUpdate();
                            }}
                        />
                    </div>
                )}
                
                {isFileLoaded && <Legend registry={this._registry} />}
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
