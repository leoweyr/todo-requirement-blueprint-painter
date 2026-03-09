import { Component, type ReactNode, type MouseEvent, type CSSProperties } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/BlueprintPrerenderCombResult';
import { type PrerenderNode } from './features/graph/PrerenderNode';
import { DomainRegistry } from './features/registry/DomainRegistry';
import { BlueprintPaster } from './components/menus/blueprint-edit/BlueprintPaster';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import FileOpenModal from './components/menus/modals/FileOpenModal';
import NodeRectangle from './components/elements/NodeRectangle';
import Legend from './components/canvas/Legend';
import { TimelineSlider } from './components/canvas/TimelineSlider';
import { EdgeCreator } from './components/menus/edge-edit/EdgeCreator';
import EdgeDrawer from './components/canvas/edge-interaction/EdgeDrawer';
import { EdgeInteractionManager } from './components/canvas/edge-interaction/EdgeInteractionManager';
import { Node } from './domain/Node';
import MenuManager from './components/menus/MenuManager';


interface AppState {
    isFileLoaded: boolean;
    timelineIndex: number;  // Current index on the timeline (versions).
    timelineIsTransition: boolean;  // Whether we are in the transition state after the index.
    timelineRawPosition: number;  // Float value for smooth animation.
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private readonly _registry: DomainRegistry;

    private _layoutResult: BlueprintPrerenderCombResult | null = null;
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
            timelineIsTransition: false,
            timelineRawPosition: maxIndex
        });
    };

    private _handleLayoutRefresh: () => void = (): void => {
        this._refreshLayout();
    };

    private _handleTimelineChange: (index: number, isTransition: boolean, rawPosition: number) => void = (index: number, isTransition: boolean, rawPosition: number): void => {
        this.setState({
            timelineIndex: index,
            timelineIsTransition: isTransition,
            timelineRawPosition: rawPosition
        });
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
            timelineIsTransition: false,
            timelineRawPosition: 0
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
                    <div style={this._getModalOverlayStyle()}>
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

        const { prerenderNodes: latestNodes, prerenderEdges, updateTimes, frames }: BlueprintPrerenderCombResult = this._layoutResult;
        const reanchoringEdge = this._menuManagerRef?.reanchoringEdge;
        const { timelineIndex, timelineIsTransition, timelineRawPosition }: AppState = this.state;

        // Interpolation Logic.
        const displayedNodes: PrerenderNode[] = [];
        
        // If we have frames (historical layouts), interpolate.
        if (frames && frames.size > 0) {
             const startIndex: number = Math.floor(timelineRawPosition);
             const endIndex: number = Math.ceil(timelineRawPosition);
             const progress: number = timelineRawPosition - startIndex;
             
             const startFrame: PrerenderNode[] = frames.get(startIndex) || latestNodes;
             const endFrame: PrerenderNode[] = frames.get(endIndex) || startFrame;
             
             // Map end frame nodes for fast lookup.
             const endNodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
             endFrame.forEach((n: PrerenderNode): void => { endNodeMap.set(n.node.id, n); });
             
             // Track processed IDs to handle new nodes.
             const processedIds: Set<string> = new Set<string>();

             // Interpolate from Start to End.
             startFrame.forEach((startNode: PrerenderNode): void => {
                 const endNode: PrerenderNode | undefined = endNodeMap.get(startNode.node.id);
                 
                 if (endNode) {
                     // Node exists in both frames: Interpolate.
                     displayedNodes.push({
                         node: startNode.node,
                         x: startNode.x + (endNode.x - startNode.x) * progress,
                         y: startNode.y + (endNode.y - startNode.y) * progress
                     });
                 } else {
                     // Node exists only in Start Frame: Keep at Start Position.
                     displayedNodes.push(startNode);
                 }

                 processedIds.add(startNode.node.id);
             });
             
             // Handle Nodes that appear ONLY in End Frame.
             endFrame.forEach((endNode: PrerenderNode): void => {
                 if (!processedIds.has(endNode.node.id)) {
                     // New Node: Use End Position.
                     displayedNodes.push(endNode);
                 }
             });
        } else {
            // Fallback: Use latest nodes if no frames.
            displayedNodes.push(...latestNodes);
        }

        // Create a map for fast node position lookup.
        const nodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
        displayedNodes.forEach((node: PrerenderNode): void => { nodeMap.set(node.node.id, node); });

        // Represents the current time point.
        const currentTime = updateTimes && updateTimes[timelineIndex];

        // Represents the next time point (if in transition).
        const nextTime = updateTimes && updateTimes[timelineIndex + 1];

        return (
            <>
                {/* Render the edges behind the nodes. */}
                {EdgeInteractionManager.renderEdges(
                    prerenderEdges,
                    reanchoringEdge || null,
                    currentTime,
                    nextTime,
                    timelineIsTransition,
                    nodeMap,
                    this._registry,
                    this._edgeDrawerRef,
                    this._menuManagerRef,
                    (): void => this.forceUpdate()
                )}

                {/* Render the nodes on top of the edges. */}
                {displayedNodes.map((prerenderNode: PrerenderNode): ReactNode => (
                    <NodeRectangle
                        key={prerenderNode.node.id}
                        node={prerenderNode.node}
                        x={prerenderNode.x}
                        y={prerenderNode.y}
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

    private _getModalOverlayStyle(): CSSProperties {
        return {
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
        };
    }

}


export default App;
