import { Component, type ReactNode, type MouseEvent } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/BlueprintPrerenderCombResult';
import { type PrerenderEdge } from './features/graph/PrerenderEdge';
import { type PrerenderNode } from './features/graph/PrerenderNode';
import { DomainRegistry } from './features/registry/DomainRegistry';
import ContextMenu from './components/menus/context-menu/ContextMenu';
import { BlueprintPaster } from './components/menus/blueprint-paste/BlueprintPaster';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import { BlueprintSaver } from './components/menus/blueprint-save/BlueprintSaver';
import BackdropBlur from './components/menus/BackdropBlur';
import NodeCreateModal from './components/menus/node-create/NodeCreateModal';
import NodeStatusCreateModal from './components/menus/node-status-create/NodeStatusCreateModal';
import FileOpenModal from './components/menus/file-open/FileOpenModal';
import EdgeCreateModal from './components/menus/edge-create/EdgeCreateModal';
import EdgeEvolutionReasonModal from './components/menus/edge-evolution/EdgeEvolutionReasonModal';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';
import Legend from './components/canvas/Legend';
import { EdgeCreator } from './components/menus/edge-create/EdgeCreator';
import { EdgeDrawer } from './components/canvas/EdgeDrawer';
import { Node } from './domain/Node';
import { Edge } from './domain/Edge';
import { EdgeHistoryRecord } from './domain/EdgeHistoryRecord';
import { EdgeStatus } from './domain/enums/EdgeStatus';
import { EdgeType } from './domain/enums/EdgeType';


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
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;
    private _contextMenuRef: ContextMenu | null = null;
    private _edgeDrawerRef: EdgeDrawer | null = null;

    private handleEdgeCut: (edge: Edge) => void = (edge: Edge): void => {
        this.setState({
            isEdgeEvolutionModalOpen: true,
            reanchoringEdge: edge,
            evolutionTargetNode: null
        });
    };

    private handleEdgeReanchor: (edge: Edge) => void = (edge: Edge): void => {
        const downstreamNode: Node | undefined = this._registry.allNodes.find((node: Node) => node.edges.includes(edge));
        
        if (downstreamNode && this._edgeDrawerRef) {

            const latestHistory: EdgeHistoryRecord = edge.history[edge.history.length - 1];
            let strokeColor: string = '#000000';
            let strokeDasharray: string = 'none';

            if (latestHistory) {
                // Determine style based on current status.
                // Note: Even if the edge is about to be 'Cut', the user is 'Moving' it.
                // The edge should be shown as it currently looks (Active or Deprecated).
                // If the edge was already CUT (invisible), it would likely not be interactive.
                // Default to black if unknown.
                
                if (latestHistory.status === EdgeStatus.ACTIVE) {
                    strokeColor = '#4CAF50';
                } else if (latestHistory.status === EdgeStatus.DEPRECATED) {
                    strokeColor = '#9E9E9E';
                } else {
                    // Fallback for other statuses to ensure visibility during drag.
                    strokeColor = '#000000';
                }
                
                if (latestHistory.type === EdgeType.OPTIMIZES) {
                    strokeDasharray = '5,5';
                }
            }

            this.setState(
                {
                    reanchoringEdge: edge
                },
                (): void => {
                    this._edgeDrawerRef?.handleStartEdge(downstreamNode.id, { strokeColor, strokeDasharray });
                }
            );
        }
    };

    private handleEvolutionConfirm: (reasonName: string) => void = (reasonName: string): void => {
        const { reanchoringEdge, evolutionTargetNode }: AppState = this.state;
        
        if (reanchoringEdge) {
            if (evolutionTargetNode) {
                // Re-anchoring (Evolve).
                EdgeCreator.evolve(this._registry, reanchoringEdge, evolutionTargetNode, reasonName);
            } else {
                // Cutting (Delete).
                EdgeCreator.cut(this._registry, reanchoringEdge, reasonName);
            }
        }

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
            isNodeCreateModalOpen: false,
            isNodeStatusCreateModalOpen: false,
            isEdgeCreateModalOpen: false,
            edgeCreateSourceNode: null,
            edgeCreateTargetNode: null,
            isEdgeEvolutionModalOpen: false,
            reanchoringEdge: null,
            evolutionTargetNode: null
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
                            onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => {
                                this._layoutResult = result;
                                this.forceUpdate();
                            }}
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

    private refreshLayout(): void {
        const layoutResult: BlueprintPrerenderCombResult = this._layoutService.calculateLayout(this._registry);
        this._layoutResult = layoutResult;
        this.forceUpdate();
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
                    />
                ))}
            </>
        );
    }
}


export default App;
