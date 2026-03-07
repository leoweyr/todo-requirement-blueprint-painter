import { Component, type ReactNode, type MouseEvent } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/BlueprintPrerenderCombResult';
import { DomainRegistry } from './features/registry/DomainRegistry';
import ContextMenu from './components/menus/context-menu/ContextMenu';
import { EdgeDrawer } from './components/canvas/EdgeDrawer';
import { Node } from './domain/Node';
import { Edge } from './domain/Edge';
import { EdgeEvolver } from './components/menus/edge-evolution/EdgeEvolver';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import { type PrerenderEdge } from './features/graph/PrerenderEdge';
import EdgeLine from './components/elements/EdgeLine';
import { type PrerenderNode } from './features/graph/PrerenderNode';
import NodeRectangle from './components/elements/NodeRectangle';
import { BlueprintPaster } from './components/menus/blueprint-paste/BlueprintPaster';
import { BlueprintSaver } from './components/menus/blueprint-save/BlueprintSaver';
import BackdropBlur from './components/menus/BackdropBlur';
import NodeCreateModal from './components/menus/node-create/NodeCreateModal';
import NodeStatusCreateModal from './components/menus/node-status-create/NodeStatusCreateModal';
import EdgeCreateModal from './components/menus/edge-create/EdgeCreateModal';
import EdgeEvolutionReasonModal from './components/menus/edge-evolution/EdgeEvolutionReasonModal';
import NodeContextMenu from './components/menus/node-context-menu/NodeContextMenu';
import LegendContextMenu from './components/menus/legend-context-menu/LegendContextMenu';
import FileOpenModal from './components/menus/file-open/FileOpenModal';
import Legend from './components/canvas/Legend';
import { EdgeCreator } from './components/menus/edge-create/EdgeCreator';


interface AppState {
    isFileLoaded: boolean;
    isNodeCreateModalOpen: boolean;
    isNodeStatusCreateModalOpen: boolean;
    
    // Edge Creation State.
    isEdgeCreateModalOpen: boolean;
    edgeCreateSourceNode: Node | null;
    edgeCreateTargetNode: Node | null;

    // Edge Evolution State.
    isEdgeEvolutionModalOpen: boolean;
    reanchoringEdge: Edge | null;
    evolutionTargetNode: Node | null;

    // Node Context Menu State.
    nodeContextMenu: {
        isOpen: boolean;
        x: number;
        y: number;
        nodeId: string | null;
    };

    // Legend Context Menu State.
    legendContextMenu: {
        isOpen: boolean;
        x: number;
        y: number;
        statusName: string | null;
    };
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;
    private _contextMenuRef: ContextMenu | null = null;
    private _edgeDrawerRef: EdgeDrawer | null = null;

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

    private handleEdgeCut: (edge: Edge) => void = (edge: Edge): void => {
        EdgeEvolver.initiateCut(edge, (reanchoringEdge: Edge, evolutionTargetNode: Node | null, isModalOpen: boolean): void => {
            this.setState({
                isEdgeEvolutionModalOpen: isModalOpen,
                reanchoringEdge: reanchoringEdge,
                evolutionTargetNode: evolutionTargetNode
            });
        });
    };

    private handleEdgeReanchor: (edge: Edge) => void = (edge: Edge): void => {
        EdgeEvolver.initiateReanchor(
            edge, 
            this._registry, 
            this._edgeDrawerRef, 
            (reanchoringEdge: Edge): void => {
                this.setState({ reanchoringEdge });
            }
        );
    };

    private handleEvolutionConfirm: (reasonName: string) => void = (reasonName: string): void => {
        const { reanchoringEdge, evolutionTargetNode }: AppState = this.state;
        
        if (!reanchoringEdge) return;

        EdgeEvolver.confirmEvolution(
            this._registry,
            reanchoringEdge,
            evolutionTargetNode,
            reasonName,
            (): void => {
                this.setState(
                    {
                        isEdgeEvolutionModalOpen: false,
                        reanchoringEdge: null,
                        evolutionTargetNode: null
                    },
                    (): void => {
                        this.refreshLayout();
                    }
                );
            }
        );
    };

    private handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._contextMenuRef) {
            this._contextMenuRef.handleOpen(event);
        }
    };

    private handleNodeContextMenu: (event: MouseEvent, nodeId: string) => void = (event: MouseEvent, nodeId: string): void => {
        event.preventDefault();
        event.stopPropagation();
        
        this.setState({
            nodeContextMenu: {
                isOpen: true,
                x: event.clientX,
                y: event.clientY,
                nodeId: nodeId
            }
        });
    };

    private handleLegendContextMenu: (event: MouseEvent, statusName: string) => void = (event: MouseEvent, statusName: string): void => {
        event.preventDefault();
        event.stopPropagation();
        
        this.setState({
            legendContextMenu: {
                isOpen: true,
                x: event.clientX,
                y: event.clientY,
                statusName: statusName
            }
        });
    };

    private handleDeleteNode: (nodeId: string) => void = (nodeId: string): void => {
        this._registry.deleteNode(nodeId);
        this.refreshLayout();
        
        this.setState({
            nodeContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                nodeId: null
            }
        });
    };

    private handleDeleteNodeStatus: (statusName: string) => void = (statusName: string): void => {
        this._registry.deleteNodeStatus(statusName);
        this.forceUpdate();  // Re-render to update Legend (since Legend polls or updates on prop change, but forceUpdate on App might not trigger Legend re-render if props don't change deeply, but Legend polls registry anyway).
        
        this.setState({
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                statusName: null
            }
        });
    };

    public constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false,
            isNodeCreateModalOpen: false,
            isNodeStatusCreateModalOpen: false,
            isEdgeCreateModalOpen: false,
            edgeCreateSourceNode: null,
            edgeCreateTargetNode: null,
            isEdgeEvolutionModalOpen: false,
            reanchoringEdge: null,
            evolutionTargetNode: null,
            nodeContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                nodeId: null
            },
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                statusName: null
            }
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
                            if (this.state.reanchoringEdge) {
                                this.setState({ reanchoringEdge: null });
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
                            const { reanchoringEdge }: AppState = this.state;

                            if (reanchoringEdge) {
                                const targetNode = this._registry.getNode(targetId);

                                if (targetNode) {
                                    this.setState({
                                        isEdgeEvolutionModalOpen: true,
                                        evolutionTargetNode: targetNode
                                    });
                                }
                            } else {
                                EdgeCreator.connect(
                                    this._registry,
                                    sourceId,
                                    targetId,
                                    (sourceNode: Node, targetNode: Node): void => {
                                        this.setState({
                                            isEdgeCreateModalOpen: true,
                                            edgeCreateSourceNode: sourceNode,
                                            edgeCreateTargetNode: targetNode
                                        });
                                    }
                                );
                            }
                        }}
                    />
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
                            onLayoutUpdate={this.handleLayoutUpdate}
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

                {this.state.isEdgeCreateModalOpen && this.state.edgeCreateSourceNode && this.state.edgeCreateTargetNode && (
                    <BackdropBlur>
                        <EdgeCreateModal
                            registry={this._registry}
                            layoutService={this._layoutService}
                            sourceNode={this.state.edgeCreateSourceNode}
                            targetNode={this.state.edgeCreateTargetNode}
                            onClose={(): void => this.setState(
                                { isEdgeCreateModalOpen: false, edgeCreateSourceNode: null, edgeCreateTargetNode: null }
                            )}
                            onLayoutUpdate={this.handleLayoutUpdate}
                        />
                    </BackdropBlur>
                )}

                {this.state.isEdgeEvolutionModalOpen && (
                    <BackdropBlur>
                        <EdgeEvolutionReasonModal
                            registry={this._registry}
                            onClose={(): void => this.setState({ 
                                isEdgeEvolutionModalOpen: false, 
                                reanchoringEdge: null, 
                                evolutionTargetNode: null 
                            })}
                            onConfirm={this.handleEvolutionConfirm}
                        />
                    </BackdropBlur>
                )}

                {this.state.nodeContextMenu.isOpen && this.state.nodeContextMenu.nodeId && (
                    <NodeContextMenu
                        nodeId={this.state.nodeContextMenu.nodeId}
                        x={this.state.nodeContextMenu.x}
                        y={this.state.nodeContextMenu.y}
                        onDelete={this.handleDeleteNode}
                        onClose={(): void => this.setState({ 
                            nodeContextMenu: { ...this.state.nodeContextMenu, isOpen: false } 
                        })}
                    />
                )}

                {this.state.legendContextMenu.isOpen && this.state.legendContextMenu.statusName && (
                    <LegendContextMenu
                        statusName={this.state.legendContextMenu.statusName}
                        x={this.state.legendContextMenu.x}
                        y={this.state.legendContextMenu.y}
                        onDelete={this.handleDeleteNodeStatus}
                        onClose={(): void => this.setState({ 
                            legendContextMenu: { ...this.state.legendContextMenu, isOpen: false } 
                        })}
                    />
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
        const { reanchoringEdge } = this.state;

        return (
            <>
                {/* Render Edges (behind Nodes). */}
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

                {/* Render Nodes (on top of Edges). */}
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
