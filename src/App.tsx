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
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';
import Legend from './components/canvas/Legend';
import { Node } from './domain/Node';


interface AppState {
    isFileLoaded: boolean;
    isNodeCreateModalOpen: boolean;
    isNodeStatusCreateModalOpen: boolean;
    
    // Edge Creation State.
    isEdgeCreateModalOpen: boolean;
    edgeCreateSourceNode: Node | null;
    edgeCreateTargetNode: Node | null;
    edgeDrawState: {
        isDrawing: boolean;
        startNodeId: string | null;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
    };
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

    private handleStartEdge: (nodeId: string) => void = (nodeId: string): void => {
        const nodeProps = this._layoutResult?.prerenderNodes.find(p => p.node.id === nodeId);

        if (nodeProps) {
            // Start from left-center of the node.
            const startX = nodeProps.x; 
            const startY = nodeProps.y + 40;  // Approximation of half-height (min-height 80 / 2).

            this.setState({
                edgeDrawState: {
                    isDrawing: true,
                    startNodeId: nodeId,
                    startX: startX,
                    startY: startY,
                    currentX: startX,
                    currentY: startY
                }
            });

            window.addEventListener('mousemove', this.handleGlobalMouseMove);
        }
    };

    private handleCompleteEdge: (nodeId: string) => void = (nodeId: string): void => {
        const { edgeDrawState } = this.state;

        if (edgeDrawState.isDrawing && edgeDrawState.startNodeId) {
            // Prevent self-loop if needed, or allow it. TRB spec might allow self-loops? Assuming allowed for now.
            // If strictly acyclic (DAG), we should check. But let's allow modal to open.
            const sourceNode = this._registry.getNode(edgeDrawState.startNodeId);
            const targetNode = this._registry.getNode(nodeId);

            if (sourceNode && targetNode) {
                this.setState({
                    isEdgeCreateModalOpen: true,
                    edgeCreateSourceNode: sourceNode,
                    edgeCreateTargetNode: targetNode,
                    edgeDrawState: {
                        isDrawing: false,
                        startNodeId: null,
                        startX: 0,
                        startY: 0,
                        currentX: 0,
                        currentY: 0
                    }
                });
            }

            this.stopDrawing();
        }
    };

    private handleCanvasClick: () => void = (): void => {
        if (this.state.edgeDrawState.isDrawing) {
            this.stopDrawing();
        }
    };

    private stopDrawing(): void {
        this.setState(prevState => ({
            edgeDrawState: {
                ...prevState.edgeDrawState,
                isDrawing: false,
                startNodeId: null
            }
        }));

        window.removeEventListener('mousemove', this.handleGlobalMouseMove);
    }

    private handleGlobalMouseMove: (event: globalThis.MouseEvent) => void = (event: globalThis.MouseEvent): void => {
        if (this.state.edgeDrawState.isDrawing) {
            // Convert screen coordinates to world coordinates
            // worldX = (screenX - viewportX) / scale
            const worldX = (event.clientX - this._viewport.x) / this._viewport.scale;
            const worldY = (event.clientY - this._viewport.y) / this._viewport.scale;

            this.setState(prevState => ({
                edgeDrawState: {
                    ...prevState.edgeDrawState,
                    currentX: worldX,
                    currentY: worldY
                }
            }));
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
            edgeDrawState: {
                isDrawing: false,
                startNodeId: null,
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0
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
                    onClick={this.handleCanvasClick}
                >
                    {layoutResult && this.renderGraph()}
                    {this.renderDrawingLine()}
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
                        node={properties.node}
                        x={properties.x}
                        y={properties.y}
                        onStartEdge={this.handleStartEdge}
                        onCompleteEdge={this.handleCompleteEdge}
                    />
                ))}
            </>
        );
    }

    private renderDrawingLine(): ReactNode {
        const { isDrawing, startX, startY, currentX, currentY } = this.state.edgeDrawState;

        if (!isDrawing) return null;

        return (
            <svg 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none', 
                    zIndex: 1000,
                    overflow: 'visible' 
                }}
            >
                <line 
                    x1={startX}
                    y1={startY} 
                    x2={currentX} 
                    y2={currentY} 
                    stroke="#4CAF50" 
                    strokeWidth="2" 
                    strokeDasharray="5,5" 
                />
                <circle cx={startX} cy={startY} r="4" fill="#4CAF50" />
                <circle cx={currentX} cy={currentY} r="4" fill="#4CAF50" />
            </svg>
        );
    }
}


export default App;
