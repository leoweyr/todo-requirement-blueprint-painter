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
import { TimelineSlider } from './components/canvas/TimelineSlider';
import { EdgeCreator } from './components/menus/edge-edit/EdgeCreator';
import EdgeDrawer from './components/canvas/EdgeDrawer';
import { EdgeEvolver } from './components/menus/edge-edit/EdgeEvolver';
import { Node } from './domain/Node';
import { Edge } from './domain/Edge';
import MenuManager from './components/menus/MenuManager';
import { EdgeHistoryRecord } from './domain/EdgeHistoryRecord';


interface AppState {
    isFileLoaded: boolean;
    timelineIndex: number;  // Current index on the timeline (versions).
    timelineIsTransition: boolean;  // Whether we are in the transition state after the index.
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;
    private _edgeDrawerRef: EdgeDrawer | null = null;
    private _menuManagerRef: MenuManager | null = null;

    private _handleLayoutUpdate: (result: BlueprintPrerenderCombResult) => void = (
        result: BlueprintPrerenderCombResult
    ): void => {
        this._layoutResult = result;

        if (result.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY } = result.contentBounds;
            this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY);
        }

        // Reset the timeline to the latest version when the layout updates (e.g. new file or structural change).
        // If the new result has more history, we default to the latest.
        // For now, default to the latest version.
        const maxIndex: number = result.updateTimes ? Math.max(0, result.updateTimes.length - 1) : 0;
        
        this.setState({
            timelineIndex: maxIndex,
            timelineIsTransition: false
        });
    };

    private _handleLayoutRefresh: () => void = (): void => {
        this._refreshLayout();
    };

    private _handleTimelineChange: (index: number, isTransition: boolean) => void = (index: number, isTransition: boolean): void => {
        this.setState({
            timelineIndex: index,
            timelineIsTransition: isTransition
        });
    };

    private _handleEdgeCut: (edge: Edge) => void = (edge: Edge): void => {
        if (this._menuManagerRef) {
            this._menuManagerRef.startEdgeCut(edge);
        }
    };

    private _handleEdgeReanchor: (edge: Edge) => void = (edge: Edge): void => {
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

    private _handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._menuManagerRef) {
            this._menuManagerRef.openGlobalContextMenu(event);
        }
    };

    private _handleNodeContextMenu: (event: MouseEvent, nodeId: string) => void = (event: MouseEvent, nodeId: string): void => {
        event.preventDefault();
        event.stopPropagation();
        
        if (this._menuManagerRef) {
            this._menuManagerRef.openNodeContextMenu(event, nodeId);
        }
    };

    private _handleLegendContextMenu: (event: MouseEvent, type: 'node-status' | 'edge-evolution-reason', name: string) => void = (event: MouseEvent, type: 'node-status' | 'edge-evolution-reason', name: string): void => {
        event.preventDefault();
        event.stopPropagation();
        
        if (this._menuManagerRef) {
            if (type === 'node-status') {
                this._menuManagerRef.openLegendContextMenu(event, name);
            } else {
                this._menuManagerRef.openEdgeEvolutionReasonContextMenu(event, name);
            }
        }
    };

    public constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false,
            timelineIndex: 0,
            timelineIsTransition: false
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
            this._handleLayoutUpdate
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
                    onContextMenu={this._handleContextMenu}
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
                    {layoutResult && this._renderGraph()}
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

                {isFileLoaded && layoutResult?.updateTimes && layoutResult.updateTimes.length > 1 && (
                    <TimelineSlider 
                        updateTimes={layoutResult.updateTimes}
                        onTimeChange={this._handleTimelineChange}
                    />
                )}

                <MenuManager 
                    ref={(ref: MenuManager | null): void => { this._menuManagerRef = ref; }}
                    registry={this._registry}
                    layoutService={this._layoutService}
                    viewport={this._viewport}
                    onLayoutRefresh={this._handleLayoutRefresh}
                    onLayoutUpdate={this._handleLayoutUpdate}
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
                            onLayoutUpdate={this._handleLayoutUpdate}
                        />
                    </div>
                )}
                
                {isFileLoaded && <Legend registry={this._registry} onContextMenu={this._handleLegendContextMenu} />}
            </>
        );
    }

    private _refreshLayout(): void {
        const layoutResult: BlueprintPrerenderCombResult = this._layoutService.calculateLayout(this._registry);
        this._handleLayoutUpdate(layoutResult);
    }

    private _renderGraph(): ReactNode {
        if (!this._layoutResult) return null;

        const { prerenderNodes, prerenderEdges, updateTimes }: BlueprintPrerenderCombResult = this._layoutResult;
        const reanchoringEdge = this._menuManagerRef?.reanchoringEdge;
        const { timelineIndex, timelineIsTransition }: AppState = this.state;

        // Create a map for fast node position lookup.
        const nodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
        prerenderNodes.forEach((node: PrerenderNode): void => { nodeMap.set(node.node.id, node); });
        
        const NODE_WIDTH = 200;
        const NODE_HEIGHT = 64;

        // Represents the current time point.
        const currentTime = updateTimes && updateTimes[timelineIndex];

        // Represents the next time point (if in transition).
        const nextTime = updateTimes && updateTimes[timelineIndex + 1];

        return (
            <>
                {/* Render the edges behind the nodes. */}
                {prerenderEdges.map((properties: PrerenderEdge): ReactNode => {
                    // If this edge is currently being re-anchored, hide it.
                    if (reanchoringEdge && properties.edge.id === reanchoringEdge.id) {
                        return null;
                    }

                    // Filter the history based on the timeline.
                    // If updateTimes is missing (empty graph), show everything (default behavior).
                    if (!currentTime) {
                         return (
                            <EdgeLine
                                key={properties.edge.id}
                                {...properties}
                                onCut={(): void => this._handleEdgeCut(properties.edge)}
                                onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                            />
                        );
                    }

                    // Determine which history record to show.
                    // Find the latest record created ON or BEFORE currentTime.
                    const relevantHistory: EdgeHistoryRecord[] = properties.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= currentTime);
                    
                    if (relevantHistory.length === 0) {
                        // The edge did not exist yet at this time.
                        
                        // Logic for newly added edges.
                        // If in transition and the edge appears in the next time step, show it as NEW (Green).
                        if (timelineIsTransition && nextTime) {
                            const nextHistory: EdgeHistoryRecord[] = properties.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= nextTime);

                            if (nextHistory.length > 0) {
                                const nextHistoryIndex = nextHistory.length - 1;
                                const newRecord = nextHistory[nextHistoryIndex];
                                const targetNode = nodeMap.get(newRecord.targetUpstream.id);
                                
                                if (!targetNode) return null;

                                return (
                                    <EdgeLine
                                        key={`${properties.edge.id}-${nextHistoryIndex}-new-born`}
                                        {...properties}
                                        endX={targetNode.x + NODE_WIDTH}
                                        endY={targetNode.y + NODE_HEIGHT / 2}
                                        historyIndex={nextHistoryIndex}
                                        highlightColor="#4CAF50"  // Green.
                                        onCut={(): void => this._handleEdgeCut(properties.edge)}
                                        onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                                    />
                                );
                            }
                        }

                        return null; 
                    }

                    // If not in transition, just show the state at currentTime.
                    if (!timelineIsTransition) {
                        const historyIndex = relevantHistory.length - 1;
                        const record = relevantHistory[historyIndex];
                        const targetNode = nodeMap.get(record.targetUpstream.id);
                        
                        // If the target node is missing (which should not happen), fallback to default properties.
                        const overrideProps = targetNode ? {
                            endX: targetNode.x + NODE_WIDTH,
                            endY: targetNode.y + NODE_HEIGHT / 2
                        } : {};

                        return (
                             <EdgeLine
                                key={`${properties.edge.id}-${historyIndex}`}
                                {...properties}
                                {...overrideProps}
                                historyIndex={historyIndex}  // Override to show past state.
                                onCut={(): void => this._handleEdgeCut(properties.edge)}
                                onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                            />
                        );
                    } else {
                        // Transition Mode: Show BOTH states if changed between current and next.
                        const currentHistoryIndex = relevantHistory.length - 1;
                        
                        let nextHistoryIndex = currentHistoryIndex;

                        if (nextTime) {
                             // Find the latest record created ON or BEFORE nextTime.
                             const nextHistory: EdgeHistoryRecord[] = properties.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= nextTime);
                             if (nextHistory.length > 0) {
                                 nextHistoryIndex = nextHistory.length - 1;
                             }
                        }
                        
                        // If the indices are the same, there is no change in this transition step.
                        if (nextHistoryIndex === currentHistoryIndex) {
                             const record = relevantHistory[currentHistoryIndex];
                             const targetNode = nodeMap.get(record.targetUpstream.id);
                             const overrideProps = targetNode ? {
                                endX: targetNode.x + NODE_WIDTH,
                                endY: targetNode.y + NODE_HEIGHT / 2
                             } : {};

                             return (
                                <EdgeLine
                                    key={`${properties.edge.id}-${currentHistoryIndex}`}
                                    {...properties}
                                    {...overrideProps}
                                    historyIndex={currentHistoryIndex}
                                    onCut={(): void => this._handleEdgeCut(properties.edge)}
                                    onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                                />
                            );
                        }
                        
                        // Change detected. Compare upstream nodes.
                        const oldRecord = properties.edge.history[currentHistoryIndex];
                        const newRecord = properties.edge.history[nextHistoryIndex];
                        
                        const isUpstreamSame = oldRecord.targetUpstream.id === newRecord.targetUpstream.id;
                        
                        if (isUpstreamSame) {
                            // Same Upstream -> Yellow Highlight.
                            // Render new version with Yellow highlight.
                            const targetNode = nodeMap.get(newRecord.targetUpstream.id);
                            const overrideProps = targetNode ? {
                                endX: targetNode.x + NODE_WIDTH,
                                endY: targetNode.y + NODE_HEIGHT / 2
                             } : {};

                            return (
                                <EdgeLine
                                    key={`${properties.edge.id}-${nextHistoryIndex}-yellow`}
                                    {...properties}
                                    {...overrideProps}
                                    historyIndex={nextHistoryIndex}
                                    highlightColor="#FFD700"  // Gold/Yellow.
                                    onCut={(): void => this._handleEdgeCut(properties.edge)}
                                    onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                                />
                            );
                        } else {
                            // Different Upstream -> Red (Old) and Green (New).
                            const oldTargetNode = nodeMap.get(oldRecord.targetUpstream.id);
                            const newTargetNode = nodeMap.get(newRecord.targetUpstream.id);

                            return (
                                <>
                                    {oldTargetNode && (
                                        <EdgeLine
                                            key={`${properties.edge.id}-${currentHistoryIndex}-old`}
                                            {...properties}
                                            endX={oldTargetNode.x + NODE_WIDTH}
                                            endY={oldTargetNode.y + NODE_HEIGHT / 2}
                                            historyIndex={currentHistoryIndex}
                                            highlightColor="#FF3B30"  // Red.
                                            onCut={(): void => this._handleEdgeCut(properties.edge)}
                                            onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                                        />
                                    )}

                                    {newTargetNode && (
                                        <EdgeLine
                                            key={`${properties.edge.id}-${nextHistoryIndex}-new`}
                                            {...properties}
                                            endX={newTargetNode.x + NODE_WIDTH}
                                            endY={newTargetNode.y + NODE_HEIGHT / 2}
                                            historyIndex={nextHistoryIndex}
                                            highlightColor="#4CAF50"  // Green.
                                            onCut={(): void => this._handleEdgeCut(properties.edge)}
                                            onReanchor={(): void => this._handleEdgeReanchor(properties.edge)}
                                        />
                                    )}
                                </>
                            );
                        }
                    }
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
                        onContextMenu={this._handleNodeContextMenu}
                    />
                ))}
            </>
        );
    }
}


export default App;
