import { Component, type ReactNode, type MouseEvent } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/BlueprintPrerenderCombResult';
import { type PrerenderEdge } from './features/graph/PrerenderEdge';
import { type PrerenderNode } from './features/graph/PrerenderNode';
import { DomainRegistry } from './features/registry/DomainRegistry';
import { BlueprintPaster } from './components/menus/blueprint-edit/BlueprintPaster';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import FileOpenModal from './components/menus/modals/FileOpenModal';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';
import Legend from './components/canvas/Legend';
import { EdgeCreator } from './components/menus/edge-edit/EdgeCreator';
import { EdgeDrawer } from './components/canvas/EdgeDrawer';
import { EdgeEvolver } from './components/menus/edge-edit/EdgeEvolver';
import { Node } from './domain/Node';
import { Edge } from './domain/Edge';
import MenuManager from './components/menus/MenuManager';


interface AppState {
    isFileLoaded: boolean;
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;
    private _edgeDrawerRef: EdgeDrawer | null = null;
    private _menuManagerRef: MenuManager | null = null;

    private handleLayoutUpdate: (result: BlueprintPrerenderCombResult) => void = (
        result: BlueprintPrerenderCombResult
    ): void => {
        this._layoutResult = result;

        if (result.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY } = result.contentBounds;
            this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY);
        }

        this.forceUpdate();
    };

    private handleLayoutRefresh: () => void = (): void => {
        this.refreshLayout();
    };

    private handleEdgeCut: (edge: Edge) => void = (edge: Edge): void => {
        if (this._menuManagerRef) {
            this._menuManagerRef.startEdgeCut(edge);
        }
    };

    private handleEdgeReanchor: (edge: Edge) => void = (edge: Edge): void => {
        EdgeEvolver.initiateReanchor(
            edge, 
            this._registry, 
            this._edgeDrawerRef, 
            (reanchoringEdge: Edge): void => {
                if (this._menuManagerRef) {
                    this._menuManagerRef.setReanchoringEdge(reanchoringEdge);
                }
                this.forceUpdate();  // Re-render to hide the edge in renderGraph.
            }
        );
    };

    private handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._menuManagerRef) {
            this._menuManagerRef.openGlobalContextMenu(event);
        }
    };

    private handleNodeContextMenu: (event: MouseEvent, nodeId: string) => void = (event: MouseEvent, nodeId: string): void => {
        event.preventDefault();
        event.stopPropagation();
        
        if (this._menuManagerRef) {
            this._menuManagerRef.openNodeContextMenu(event, nodeId);
        }
    };

    private handleLegendContextMenu: (event: MouseEvent, statusName: string) => void = (event: MouseEvent, statusName: string): void => {
        event.preventDefault();
        event.stopPropagation();
        
        if (this._menuManagerRef) {
            this._menuManagerRef.openLegendContextMenu(event, statusName);
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
        
        BlueprintPaster.bind(
            window,
            this._registry,
            this._layoutService,
            this._viewport,
            this.handleLayoutUpdate
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
                    onClick={(): void => {
                        if (this._edgeDrawerRef) {
                            // If reanchoring, cancel it on canvas click (restore original edge).
                            if (this._menuManagerRef && this._menuManagerRef.reanchoringEdge) {
                                this._menuManagerRef.cancelReanchoring();
                                this.forceUpdate();
                            }

                            this._edgeDrawerRef.handleCanvasClick();
                        }
                    }}
                >
                    {layoutResult && this.renderGraph()}
                    <EdgeDrawer 
                        ref={(ref: EdgeDrawer | null): void => { this._edgeDrawerRef = ref; }}
                        viewport={this._viewport}
                        prerenderNodes={layoutResult?.prerenderNodes || []}
                        onEdgeConnect={(sourceId: string, targetId: string): void => {
                            const reanchoringEdge = this._menuManagerRef?.reanchoringEdge;

                            if (reanchoringEdge) {
                                const targetNode = this._registry.getNode(targetId);

                                if (targetNode && this._menuManagerRef) {
                                    this._menuManagerRef.openEdgeEvolutionModal(reanchoringEdge, targetNode);
                                }
                            } else {
                                EdgeCreator.connect(
                                    this._registry,
                                    sourceId,
                                    targetId,
                                    (sourceNode: Node, targetNode: Node): void => {
                                        if (this._menuManagerRef) {
                                            this._menuManagerRef.openEdgeCreateModal(sourceNode, targetNode);
                                        }
                                    }
                                );
                            }
                        }}
                    />
                </InfiniteCanvas>

                <MenuManager 
                    ref={(ref: MenuManager | null): void => { this._menuManagerRef = ref; }}
                    registry={this._registry}
                    layoutService={this._layoutService}
                    viewport={this._viewport}
                    onLayoutRefresh={this.handleLayoutRefresh}
                    onLayoutUpdate={this.handleLayoutUpdate}
                />

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
                            onLayoutUpdate={this.handleLayoutUpdate}
                        />
                    </div>
                )}
                
                {isFileLoaded && <Legend registry={this._registry} onContextMenu={this.handleLegendContextMenu} />}
            </>
        );
    }

    private refreshLayout(): void {
        const layoutResult: BlueprintPrerenderCombResult = this._layoutService.calculateLayout(this._registry);
        this.handleLayoutUpdate(layoutResult);
    }

    private renderGraph(): ReactNode {
        if (!this._layoutResult) return null;

        const { prerenderNodes, prerenderEdges }: BlueprintPrerenderCombResult = this._layoutResult;
        const reanchoringEdge = this._menuManagerRef?.reanchoringEdge;

        return (
            <>
                {/* Render the edges behind the nodes. */}
                {prerenderEdges.map((properties: PrerenderEdge): ReactNode => {
                    // If this edge is currently being re-anchored, hide it.
                    if (reanchoringEdge && properties.edge.id === reanchoringEdge.id) {
                        return null;
                    }

                    return (
                        <EdgeLine
                            key={properties.edge.id}
                            {...properties}
                            onCut={(): void => this.handleEdgeCut(properties.edge)}
                            onReanchor={(): void => this.handleEdgeReanchor(properties.edge)}
                        />
                    );
                })}

                {/* Render the nodes on top of the edges. */}
                {prerenderNodes.map((properties: PrerenderNode): ReactNode => (
                    <NodeRectangle
                        key={properties.node.id}
                        node={properties.node}
                        x={properties.x}
                        y={properties.y}
                        onStartEdge={(nodeId: string): void => {
                            if (!this._edgeDrawerRef) return;

                            this._edgeDrawerRef.handleStartEdge(nodeId, { strokeColor: '#4CAF50', strokeDasharray: '5,5' });
                        }}
                        onCompleteEdge={(nodeId: string): void => {
                            if (this._edgeDrawerRef) {
                                this._edgeDrawerRef.handleCompleteEdge(nodeId);
                            }
                        }}
                        onContextMenu={this.handleNodeContextMenu}
                    />
                ))}
            </>
        );
    }
}


export default App;
