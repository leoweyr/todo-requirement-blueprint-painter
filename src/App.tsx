import { Component, type ReactNode, type MouseEvent, type CSSProperties } from 'react';
import { Edge } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import EdgeDrawer from './components/canvas/edge-interaction/EdgeDrawer';
import { EdgeInteractionManager } from './components/canvas/edge-interaction/EdgeInteractionManager';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import Legend from './components/canvas/Legend';
import { type LegendScreenBounds } from './components/canvas/LegendScreenBounds';
import { TimelineKeyboardController } from './components/canvas/TimelineKeyboardController';
import { TimelineSlider } from './components/canvas/TimelineSlider';
import NodeRectangle from './components/elements/NodeRectangle';
import { BlueprintPaster } from './components/menus/blueprint-edit/BlueprintPaster';
import { EdgeCreator } from './components/menus/edge-edit/EdgeCreator';
import MenuManager from './components/menus/MenuManager';
import FileOpenModal from './components/menus/modals/FileOpenModal';
import { EditorHistoryService } from './features/editor-history/EditorHistoryService';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/BlueprintPrerenderCombResult';
import { TimelineViewportBoundsResolver } from './features/graph/TimelineViewportBoundsResolver';
import { type PrerenderEdge } from './features/graph/PrerenderEdge';
import { type PrerenderNode } from './features/graph/PrerenderNode';
import { DomainRegistry } from './features/registry/DomainRegistry';
import { GitHubLoader } from './features/github/GitHubLoader';
import { PngGenerator } from './features/png-export/PngGenerator';
import { ReadOnlyView } from './features/readonly/ReadOnlyView';


interface AppState {
    isFileLoaded: boolean;
    timelineIndex: number;  // Current index on the timeline (versions).
    timelineIsTransition: boolean;  // Indicates if the timeline is in the transition state after the index.
    timelineRawPosition: number;  // Float value for smooth animation.
}


class App extends Component<{}, AppState> {
    private readonly _NODE_WIDTH: number = BlueprintPrerenderComb.NODE_WIDTH;
    private readonly _NODE_HEIGHT: number = BlueprintPrerenderComb.NODE_HEIGHT;
    private readonly _ROW_HEIGHT: number = BlueprintPrerenderComb.ROW_HEIGHT;
    private readonly _REPULSION_MARGIN: number = this._ROW_HEIGHT - this._NODE_HEIGHT;
    private readonly _TIMELINE_REPULSION_DELAY_MILLISECONDS: number = 220;
    private readonly _LATEST_SLICE_THRESHOLD: number = 0.001;
    private readonly _TIMELINE_TICK_THRESHOLD: number = 0.01;
    private readonly _LEGEND_BOUNDS_EQUAL_THRESHOLD: number = 0.5;

    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private readonly _registry: DomainRegistry;
    private readonly _historyService: EditorHistoryService;
    private readonly _timelineKeyboardController: TimelineKeyboardController;

    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private _edgeDrawerRef: EdgeDrawer | null = null;
    private _menuManagerRef: MenuManager | null = null;
    private _timelineSliderRef: TimelineSlider | null = null;
    private _hasLoadedFromGitHub: boolean = false;
    private _legendBounds: LegendScreenBounds | null = null;
    private _repulsionAnchorTickIndex: number | null = null;
    private _repulsionTimerId: number | null = null;
    private _isModalOpen: boolean = false;

    private _handleLayoutUpdate: (result: BlueprintPrerenderCombResult) => void = (
        result: BlueprintPrerenderCombResult
    ): void => {
        // The snapshot is saved AFTER the change that triggered this update.
        // _handleLayoutUpdate is called after the change, so the current state is pushed.
        // NOTE: This might capture the state *after* the layout calculation.
        // Layout calculation does not significantly change the registry.
        // _handleLayoutUpdate is called by BlueprintPaster, MenuManager, etc., after modifying the registry.
        // Therefore, this is the correct place to snapshot the NEW state.
        
        this._historyService.pushSnapshot();

        this._layoutResult = result;

        if (result.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY }: { minimumX: number; minimumY: number; maximumX: number; maximumY: number } = result.contentBounds;
            this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY);
        }

        // Reset the timeline to the latest version when the layout updates (e.g. new file or structural change).
        // If the new result has more history, default to the latest version.
        const maxIndex: number = result.updateTimes ? Math.max(0, result.updateTimes.length - 1) : 0;
        
        this.setState({
            timelineIndex: maxIndex,
            timelineIsTransition: false,
            timelineRawPosition: maxIndex
        } as unknown as Pick<AppState, keyof AppState>);
    };

    private _handleLayoutRefresh: () => void = (): void => {
        this._refreshLayout();
    };

    private _handleTimelineChange: (index: number, isTransition: boolean, rawPosition: number) => void = (index: number, isTransition: boolean, rawPosition: number): void => {
        this.setState({
            timelineIndex: index,
            timelineIsTransition: isTransition,
            timelineRawPosition: rawPosition
        } as unknown as Pick<AppState, keyof AppState>);
    };

    private _handleLegendBoundsChange: (bounds: LegendScreenBounds | null) => void = (bounds: LegendScreenBounds | null): void => {
        if (this._areLegendBoundsEqual(this._legendBounds, bounds)) {
            return;
        }

        this._legendBounds = bounds;
        const updateTimesLength: number = this._layoutResult?.updateTimes?.length ?? 0;
        const latestTimelinePosition: number = updateTimesLength > 0 ? updateTimesLength - 1 : 0;
        const isAtLatestSlice: boolean = Math.abs(this.state.timelineRawPosition - latestTimelinePosition) < this._LATEST_SLICE_THRESHOLD;
        const canStartRepulsionTimer: boolean = this._canStartRepulsionTimer(this.state.timelineIsTransition, this.state.timelineRawPosition);
        const timelineTickIndex: number | null = canStartRepulsionTimer ? this._resolveTimelineTickIndex(this.state.timelineRawPosition) : null;
        this._scheduleRenderRepulsion(isAtLatestSlice, canStartRepulsionTimer, timelineTickIndex);
        this.forceUpdate();
    };

    private _handleModalStateChange: (isOpen: boolean) => void = (isOpen: boolean): void => {
        this._isModalOpen = isOpen;

        if (isOpen) {
            BlueprintPaster.unbind(window);
            this._timelineKeyboardController.unbind(window);
        } else if (this.state.isFileLoaded) {
            BlueprintPaster.bind(
                window,
                this._registry,
                this._layoutService,
                this._viewport,
                this._handleLayoutUpdate
            );
            this._bindTimelineKeyboardController();
        }
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

    private _handleKeyDown: (event: KeyboardEvent) => Promise<void> = async (event: KeyboardEvent): Promise<void> => {
        // Disable keyboard shortcuts in read-only mode.
        if (ReadOnlyView.instance.isReadOnly()) {
            return;
        }

        // Undo: Ctrl+Z.
        // Redo: Ctrl+Y or Ctrl+Shift+Z.
        if (event.ctrlKey || event.metaKey) {
            if (event.key === 'z' || event.key === 'Z') {
                if (event.shiftKey) {
                    // Redo.
                    event.preventDefault();

                    if (await this._historyService.redo()) {
                         this._refreshLayout();
                    }
                } else {
                    // Undo.
                    event.preventDefault();

                    if (await this._historyService.undo()) {
                        this._refreshLayout();
                    }
                }
            } else if (event.key === 'y' || event.key === 'Y') {
                // Redo.
                event.preventDefault();

                if (await this._historyService.redo()) {
                    this._refreshLayout();
                }
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
        this._historyService = new EditorHistoryService(this._registry);
        this._timelineKeyboardController = new TimelineKeyboardController();

        this._layoutResult = this._layoutService.calculateLayout(this._registry);
    }

    public async componentDidMount(): Promise<void> {
        await this._registry.fetchLatestTrbVersion();
        
        // Initialize history with the starting state (empty or default).
        this._historyService.initialize();

        window.addEventListener('keydown', this._handleKeyDown);

        // Check for ?github=owner/repo
        const urlParams: URLSearchParams = new URLSearchParams(window.location.search);
        const repoParam: string | null = urlParams.get('github');
        const viewMode: string | null = urlParams.get('view');

        if (repoParam && !this._hasLoadedFromGitHub) {
            this._hasLoadedFromGitHub = true;

            const [owner, repoName]: string[] = repoParam.split('/');

            if (owner && repoName) {
                try {
                    await GitHubLoader.loadFromRepository(
                        owner,
                        repoName,
                        this._registry,
                        this._layoutService,
                        this._viewport,
                        (result) => this._handleLayoutUpdate(result)
                    );
                    
                    this.setState({ isFileLoaded: true } as unknown as Pick<AppState, keyof AppState>);

                    if (viewMode === 'png') {
                        // Wait for rendering to complete (e.g., fonts, layout).
                        setTimeout(() => this._generatePng(), 1500);
                    }
                } catch (error) {
                    console.error('Failed to load from GitHub:', error);
                    alert(`Failed to load from GitHub: ${(error as Error).message}`);
                }
            }
        }
    }

    public componentDidUpdate(_prevProps: {}, prevState: AppState): void {
        const { isFileLoaded }: AppState = this.state;
        const { isFileLoaded: wasFileLoaded }: AppState = prevState;
        const hasTimelineChanged: boolean = prevState.timelineRawPosition !== this.state.timelineRawPosition;
        const hasTransitionStateChanged: boolean = prevState.timelineIsTransition !== this.state.timelineIsTransition;
        const updateTimesLength: number = this._layoutResult?.updateTimes?.length ?? 0;
        const latestTimelinePosition: number = updateTimesLength > 0 ? updateTimesLength - 1 : 0;
        const isAtLatestSlice: boolean = Math.abs(this.state.timelineRawPosition - latestTimelinePosition) < this._LATEST_SLICE_THRESHOLD;
        const canStartRepulsionTimer: boolean = this._canStartRepulsionTimer(this.state.timelineIsTransition, this.state.timelineRawPosition);
        const timelineTickIndex: number | null = canStartRepulsionTimer ? this._resolveTimelineTickIndex(this.state.timelineRawPosition) : null;

        if (hasTimelineChanged || hasTransitionStateChanged) {
            this._updateViewportForTimeline();
            this._scheduleRenderRepulsion(isAtLatestSlice, canStartRepulsionTimer, timelineTickIndex);
        }

        // Timeline keyboard controller should work in both edit and read-only modes.
        if (isFileLoaded && !wasFileLoaded) {
            this._bindTimelineKeyboardController();
        } else if (!isFileLoaded && wasFileLoaded) {
            this._timelineKeyboardController.unbind(window);
        }

        // Disable BlueprintPaster binding in read-only mode.
        if (ReadOnlyView.instance.isReadOnly()) {
            return;
        }

        if (isFileLoaded && !wasFileLoaded) {
            BlueprintPaster.bind(
                window,
                this._registry,
                this._layoutService,
                this._viewport,
                (result: BlueprintPrerenderCombResult): void => this._handleLayoutUpdate(result)
            );
        } else if (!isFileLoaded && wasFileLoaded) {
            BlueprintPaster.unbind(window);
        }
    }

    public componentWillUnmount(): void {
        // Only unbind if not in read-only mode (it was never bound).
        if (!ReadOnlyView.instance.isReadOnly()) {
            BlueprintPaster.unbind(window);
        }

        window.removeEventListener('keydown', this._handleKeyDown);
        this._timelineKeyboardController.unbind(window);

        if (this._repulsionTimerId !== null) {
            window.clearTimeout(this._repulsionTimerId);
            this._repulsionTimerId = null;
        }
    }

    public render(): ReactNode {
        const { isFileLoaded }: AppState = this.state;
        const layoutResult: BlueprintPrerenderCombResult | null = this._layoutResult;

        return (
            <>
                <InfiniteCanvas 
                    viewport={this._viewport}
                    layerGapCenters={this._getDisplayedLayerGapCenters()}
                    onContextMenu={(event: MouseEvent): void => this._handleContextMenu(event)}
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
                            const reanchoringEdge: Edge | null | undefined = this._menuManagerRef?.reanchoringEdge;

                            if (reanchoringEdge) {
                                const targetNode: Node | undefined = this._registry.getNode(targetId);

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
                    <div className="timeline-slider">
                        <TimelineSlider 
                            ref={(ref: TimelineSlider | null): void => { this._handleTimelineSliderRef(ref); }}
                            updateTimes={layoutResult.updateTimes}
                            onTimeChange={(index: number, isTransition: boolean, rawPosition: number): void => this._handleTimelineChange(index, isTransition, rawPosition)}
                        />
                    </div>
                )}

                    <div className="menu-manager">
                        <MenuManager 
                            ref={(ref: MenuManager | null): void => { this._menuManagerRef = ref; }}
                            registry={this._registry}
                            layoutService={this._layoutService}
                            viewport={this._viewport}
                            onLayoutRefresh={(): void => this._handleLayoutRefresh()}
                            onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => this._handleLayoutUpdate(result)}
                            onModalStateChange={(isOpen: boolean): void => this._handleModalStateChange(isOpen)}
                        />
                    </div>

                {!isFileLoaded && (
                    <div className="file-open-modal-overlay" style={this._getModalOverlayStyle()}>
                        <FileOpenModal 
                            onFileLoaded={(): void => this.setState({ isFileLoaded: true } as unknown as Pick<AppState, keyof AppState>)}
                            registry={this._registry}
                            layoutService={this._layoutService}
                            viewport={this._viewport}
                            onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => this._handleLayoutUpdate(result)}
                        />
                    </div>
                )}
                
                {isFileLoaded && (
                    <Legend
                        registry={this._registry}
                        onBoundsChange={(bounds: LegendScreenBounds | null): void => this._handleLegendBoundsChange(bounds)}
                        onContextMenu={(event: MouseEvent, type: 'node-status' | 'edge-evolution-reason', name: string): void => this._handleLegendContextMenu(event, type, name)}
                    />
                )}
            </>
        );
    }

    private _refreshLayout(): void {
        const layoutResult: BlueprintPrerenderCombResult = this._layoutService.calculateLayout(this._registry);
        this._handleLayoutUpdate(layoutResult);
    }

    private _handleTimelineSliderRef(ref: TimelineSlider | null): void {
        this._timelineSliderRef = ref;
        this._timelineKeyboardController.setTimelineSlider(ref);
    }

    private _bindTimelineKeyboardController(): void {
        // Only bind if timeline is available and no modal is open.
        if (this._timelineSliderRef && !this._isModalOpen) {
            this._timelineKeyboardController.setTimelineSlider(this._timelineSliderRef);
            this._timelineKeyboardController.bind(window);
        }
    }

    private _renderGraph(): ReactNode {
        if (!this._layoutResult) return null;

        const { prerenderNodes: latestNodes, prerenderEdges, updateTimes, frames, edgeFrames }: BlueprintPrerenderCombResult = this._layoutResult;
        const reanchoringEdge: Edge | null = this._menuManagerRef?.reanchoringEdge || null;
        const { timelineIndex, timelineIsTransition, timelineRawPosition }: AppState = this.state;

        // Interpolation Logic.
        const displayedNodes: PrerenderNode[] = [];
        const displayedEdges: PrerenderEdge[] = [];
        
        // If frames (historical layouts) exist, interpolate.
        if (frames && frames.size > 0) {
             const startIndex: number = Math.floor(timelineRawPosition);
             const endIndex: number = Math.ceil(timelineRawPosition);
             const progress: number = timelineRawPosition - startIndex;
             
             const startFrame: PrerenderNode[] = frames.get(startIndex) || latestNodes;
             const endFrame: PrerenderNode[] = frames.get(endIndex) || startFrame;
             
             // Map end frame nodes for fast lookup.
             const endNodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
             endFrame.forEach((prerenderNode: PrerenderNode): void => { endNodeMap.set(prerenderNode.node.id, prerenderNode); });
             
             // Track processed IDs to handle new nodes.
             const processedIds: Set<string> = new Set<string>();

             // Interpolate from Start to End.
              startFrame.forEach((startNode: PrerenderNode): void => {
                  const endNode: PrerenderNode | undefined = endNodeMap.get(startNode.node.id);
                  
                  if (endNode) {
                      // Node exists in both frames: Interpolate position and colors.
                      const startColors: { backgroundColor: string; borderColor: string } = this._getNodeColors(startNode.node);
                      const endColors: { backgroundColor: string; borderColor: string } = this._getNodeColors(endNode.node);

                      displayedNodes.push({
                          node: endNode.node,  // Use end node for latest status.
                          x: startNode.x + (endNode.x - startNode.x) * progress,
                          y: startNode.y + (endNode.y - startNode.y) * progress,
                          opacity: 1,
                          backgroundColor: this._interpolateColor(startColors.backgroundColor, endColors.backgroundColor, progress),
                          borderColor: this._interpolateColor(startColors.borderColor, endColors.borderColor, progress)
                      });
                  } else {
                      // Node exists only in Start Frame: Fade out.
                      const startColors: { backgroundColor: string; borderColor: string } = this._getNodeColors(startNode.node);

                      displayedNodes.push({
                          node: startNode.node,
                          x: startNode.x,
                          y: startNode.y,
                          opacity: 1 - progress,  // Fade out.
                          backgroundColor: startColors.backgroundColor,
                          borderColor: startColors.borderColor
                      });
                  }

                 processedIds.add(startNode.node.id);
             });
             
             // Handle Nodes that appear ONLY in End Frame.
              endFrame.forEach((endNode: PrerenderNode): void => {

                  if (!processedIds.has(endNode.node.id)) {
                      // New Node: Fade in at End Position.
                      const endColors: { backgroundColor: string; borderColor: string } = this._getNodeColors(endNode.node);

                      displayedNodes.push({
                          node: endNode.node,
                          x: endNode.x,
                          y: endNode.y,
                          opacity: progress,  // Fade in.
                          backgroundColor: endColors.backgroundColor,
                          borderColor: endColors.borderColor
                      });
                  }
              });

             // Interpolate edges (including curvature).
             if (edgeFrames && edgeFrames.size > 0) {
                 const startEdgeFrame: PrerenderEdge[] = edgeFrames.get(startIndex) || prerenderEdges;
                 const endEdgeFrame: PrerenderEdge[] = edgeFrames.get(endIndex) || startEdgeFrame;

                 // Map end frame edges for fast lookup by edge ID.
                 const endEdgeMap: Map<string, PrerenderEdge> = new Map<string, PrerenderEdge>();
                 endEdgeFrame.forEach((prerenderEdge: PrerenderEdge): void => { endEdgeMap.set(prerenderEdge.edge.id, prerenderEdge); });

                 // Track processed edge IDs.
                 const processedEdgeIds: Set<string> = new Set<string>();

                 // Interpolate from Start to End.
                  startEdgeFrame.forEach((startEdge: PrerenderEdge): void => {
                      const endEdge: PrerenderEdge | undefined = endEdgeMap.get(startEdge.edge.id);

                      if (endEdge) {
                          // Edge exists in both frames: Interpolate positions and curvature.
                          const startCurvature: number = startEdge.curvature || 0;
                          const endCurvature: number = endEdge.curvature || 0;
                          const startOpacity: number = startEdge.opacity !== undefined ? startEdge.opacity : 1;
                          const endOpacity: number = endEdge.opacity !== undefined ? endEdge.opacity : 1;

                          displayedEdges.push({
                              edge: startEdge.edge,
                              startX: startEdge.startX + (endEdge.startX - startEdge.startX) * progress,
                              startY: startEdge.startY + (endEdge.startY - startEdge.startY) * progress,
                              endX: startEdge.endX + (endEdge.endX - startEdge.endX) * progress,
                              endY: startEdge.endY + (endEdge.endY - startEdge.endY) * progress,
                              labelPositionDivisions: endEdge.labelPositionDivisions,
                              labelPositionIndex: endEdge.labelPositionIndex,
                              curvature: startCurvature + (endCurvature - startCurvature) * progress,
                              opacity: startOpacity + (endOpacity - startOpacity) * progress
                          });
                      } else {
                          // Edge exists only in Start Frame: Fade out.
                          const startOpacity: number = startEdge.opacity !== undefined ? startEdge.opacity : 1;

                          displayedEdges.push({
                              ...startEdge,
                              opacity: startOpacity * (1 - progress)
                          });
                      }

                     processedEdgeIds.add(startEdge.edge.id);
                 });

                 // Handle Edges that appear ONLY in End Frame.
                  endEdgeFrame.forEach((endEdge: PrerenderEdge): void => {

                      if (!processedEdgeIds.has(endEdge.edge.id)) {
                          // New Edge: Fade in at End Position.
                          const endOpacity: number = endEdge.opacity !== undefined ? endEdge.opacity : 1;

                          displayedEdges.push({
                              ...endEdge,
                              opacity: endOpacity * progress
                          });
                      }
                  });
             } else {
                 // Fallback: Use latest edges if no edge frames.
                 displayedEdges.push(...prerenderEdges);
             }
        } else {
            // Fallback: Use latest nodes if no frames.
            displayedNodes.push(...latestNodes);
            displayedEdges.push(...prerenderEdges);
        }

        const updateTimesLength: number = updateTimes?.length ?? 0;
        const latestTimelinePosition: number = updateTimesLength > 0 ? updateTimesLength - 1 : 0;
        const isAtLatestSlice: boolean = Math.abs(timelineRawPosition - latestTimelinePosition) < this._LATEST_SLICE_THRESHOLD;
        const isOnTimelineTick: boolean = this._isOnTimelineTick(timelineRawPosition);
        const timelineTickIndex: number = this._resolveTimelineTickIndex(timelineRawPosition);
        const shouldApplyRepulsionNow: boolean = !timelineIsTransition
            && isOnTimelineTick
            && (isAtLatestSlice || this._repulsionAnchorTickIndex === timelineTickIndex);
        const repulsedNodes: PrerenderNode[] = shouldApplyRepulsionNow
            ? this._applyRenderRepulsion(displayedNodes)
            : displayedNodes;

        // Create a map for fast node position lookup.
        const nodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
        repulsedNodes.forEach((node: PrerenderNode): void => { nodeMap.set(node.node.id, node); });

        // Represents the current time point.
        const currentTime: string | undefined = updateTimes && updateTimes[timelineIndex];

        // Represents the next time point (if in transition).
        const nextTime: string | undefined = updateTimes && updateTimes[timelineIndex + 1];

        return (
            <>
                {/* Render the edges behind the nodes. */}
                {EdgeInteractionManager.renderEdges(
                    displayedEdges,
                    reanchoringEdge,
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
                {repulsedNodes.map((prerenderNode: PrerenderNode): ReactNode => (
                    <NodeRectangle
                        key={prerenderNode.node.id as string}
                        node={prerenderNode.node}
                        x={prerenderNode.x}
                        y={prerenderNode.y}
                        opacity={prerenderNode.opacity}
                        backgroundColor={prerenderNode.backgroundColor}
                        borderColor={prerenderNode.borderColor}
                        onStartEdge={(nodeId: string): void => {
                            if (!this._edgeDrawerRef) return;

                            this._edgeDrawerRef.handleStartEdge(nodeId, { strokeColor: '#4CAF50', strokeDasharray: '5,5' });
                        }}
                        onCompleteEdge={(nodeId: string): void => {
                            if (this._edgeDrawerRef) {
                                this._edgeDrawerRef.handleCompleteEdge(nodeId);
                            }
                        }}
                        onContextMenu={(event: MouseEvent): void => this._handleNodeContextMenu(event, prerenderNode.node.id as string)}
                    />
                ))}
            </>
        );
    }

    private _getDisplayedLayerGapCenters(): number[] {
        if (!this._layoutResult) {
            return [];
        }

        const { layerGapCenters, layerGapFrames, frames }: BlueprintPrerenderCombResult = this._layoutResult;
        const { timelineRawPosition }: AppState = this.state;

        // If layer gap frames exist, interpolate.
        if (layerGapFrames && layerGapFrames.size > 0 && frames && frames.size > 0) {
            const startIndex: number = Math.floor(timelineRawPosition);
            const endIndex: number = Math.ceil(timelineRawPosition);
            const progress: number = timelineRawPosition - startIndex;

            const startGaps: number[] = layerGapFrames.get(startIndex) || layerGapCenters;
            const endGaps: number[] = layerGapFrames.get(endIndex) || startGaps;

            // Interpolate gap positions.
            const maxLength: number = Math.max(startGaps.length, endGaps.length);
            const displayedGaps: number[] = [];

            for (let index: number = 0; index < maxLength; index++) {
                const startValue: number = startGaps[index] ?? startGaps[startGaps.length - 1] ?? 0;
                const endValue: number = endGaps[index] ?? endGaps[endGaps.length - 1] ?? 0;
                displayedGaps.push(startValue + (endValue - startValue) * progress);
            }

            return displayedGaps;
        }

        // Fallback: Use latest layer gap centers.
        return layerGapCenters;
    }

    private _parseColor(hexColor: string): { red: number; green: number; blue: number } {
        // Parse hex color string to RGB components.
        const hex: string = hexColor.replace('#', '');
        const red: number = parseInt(hex.substring(0, 2), 16);
        const green: number = parseInt(hex.substring(2, 4), 16);
        const blue: number = parseInt(hex.substring(4, 6), 16);

        return { red, green, blue };
    }

    private _interpolateColor(startColor: string, endColor: string, progress: number): string {
        const start: { red: number; green: number; blue: number } = this._parseColor(startColor);
        const end: { red: number; green: number; blue: number } = this._parseColor(endColor);

        const red: number = Math.round(start.red + (end.red - start.red) * progress);
        const green: number = Math.round(start.green + (end.green - start.green) * progress);
        const blue: number = Math.round(start.blue + (end.blue - start.blue) * progress);

        return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    }

    private _getNodeColors(node: Node): { backgroundColor: string; borderColor: string } {
        const metadata: Record<string, unknown> | undefined = node.status.metadata;
        const backgroundColor: string = (metadata?.backgroundColor as string) || '#F5F5F5';
        const borderColor: string = (metadata?.borderColor as string) || '#666666';

        return { backgroundColor, borderColor };
    }

    private _canStartRepulsionTimer(timelineIsTransition: boolean, timelineRawPosition: number): boolean {
        return !timelineIsTransition && this._isOnTimelineTick(timelineRawPosition);
    }

    private _isOnTimelineTick(timelineRawPosition: number): boolean {
        return Math.abs(timelineRawPosition - Math.round(timelineRawPosition)) < this._TIMELINE_TICK_THRESHOLD;
    }

    private _resolveTimelineTickIndex(timelineRawPosition: number): number {
        return Math.round(timelineRawPosition);
    }

    private _scheduleRenderRepulsion(
        isAtLatestSlice: boolean,
        canStartRepulsionTimer: boolean,
        timelineTickIndex: number | null
    ): void {
        if (this._repulsionTimerId !== null) {
            window.clearTimeout(this._repulsionTimerId);
            this._repulsionTimerId = null;
        }

        if (!canStartRepulsionTimer || timelineTickIndex === null) {
            this._repulsionAnchorTickIndex = null;
            return;
        }

        if (isAtLatestSlice) {
            this._repulsionAnchorTickIndex = timelineTickIndex;
            return;
        }

        this._repulsionAnchorTickIndex = null;
        const anchorTickIndex: number = timelineTickIndex;

        this._repulsionTimerId = window.setTimeout((): void => {
            this._repulsionTimerId = null;
            const canStillStartRepulsion: boolean = this._canStartRepulsionTimer(this.state.timelineIsTransition, this.state.timelineRawPosition);
            const currentTickIndex: number = this._resolveTimelineTickIndex(this.state.timelineRawPosition);

            if (canStillStartRepulsion && currentTickIndex === anchorTickIndex) {
                this._repulsionAnchorTickIndex = anchorTickIndex;
                this.forceUpdate();
            }
        }, this._TIMELINE_REPULSION_DELAY_MILLISECONDS);
    }

    private _areLegendBoundsEqual(
        firstBounds: LegendScreenBounds | null,
        secondBounds: LegendScreenBounds | null
    ): boolean {
        if (!firstBounds && !secondBounds) {
            return true;
        }

        if (!firstBounds || !secondBounds) {
            return false;
        }

        return (
            Math.abs(firstBounds.left - secondBounds.left) < this._LEGEND_BOUNDS_EQUAL_THRESHOLD
            && Math.abs(firstBounds.top - secondBounds.top) < this._LEGEND_BOUNDS_EQUAL_THRESHOLD
            && Math.abs(firstBounds.right - secondBounds.right) < this._LEGEND_BOUNDS_EQUAL_THRESHOLD
            && Math.abs(firstBounds.bottom - secondBounds.bottom) < this._LEGEND_BOUNDS_EQUAL_THRESHOLD
        );
    }

    private _screenToWorldX(screenX: number): number {
        return (screenX - this._viewport.x) / this._viewport.scale;
    }

    private _screenToWorldY(screenY: number): number {
        return (screenY - this._viewport.y) / this._viewport.scale;
    }

    private _getLegendWorldBounds():
        { left: number; top: number; right: number; bottom: number } | null {
        if (!this._legendBounds) {
            return null;
        }

        return {
            left: this._screenToWorldX(this._legendBounds.left) - this._REPULSION_MARGIN,
            top: this._screenToWorldY(this._legendBounds.top) - this._REPULSION_MARGIN,
            right: this._screenToWorldX(this._legendBounds.right) + this._REPULSION_MARGIN,
            bottom: this._screenToWorldY(this._legendBounds.bottom) + this._REPULSION_MARGIN
        };
    }

    private _buildNodeRectangle(node: PrerenderNode):
        { left: number; top: number; right: number; bottom: number } {
        return {
            left: node.x,
            top: node.y,
            right: node.x + this._NODE_WIDTH,
            bottom: node.y + this._NODE_HEIGHT
        };
    }

    private _rectanglesOverlap(
        rectangleA: { left: number; top: number; right: number; bottom: number },
        rectangleB: { left: number; top: number; right: number; bottom: number }
    ): boolean {
        return !(
            rectangleA.right <= rectangleB.left ||
            rectangleA.left >= rectangleB.right ||
            rectangleA.bottom <= rectangleB.top ||
            rectangleA.top >= rectangleB.bottom
        );
    }

    private _applyRenderRepulsion(nodes: PrerenderNode[]): PrerenderNode[] {
        const repulsedNodes: PrerenderNode[] = nodes
            .map((node: PrerenderNode): PrerenderNode => ({ ...node }))
            .sort((nodeA: PrerenderNode, nodeB: PrerenderNode): number => nodeA.y - nodeB.y);
        const legendBounds: { left: number; top: number; right: number; bottom: number } | null = this._getLegendWorldBounds();
        const movedNodeIds: Set<string> = new Set<string>();
        const maxIterations: number = 8;

        for (let iteration: number = 0; iteration < maxIterations; iteration++) {
            let hasMovedInThisIteration: boolean = false;

            for (let index: number = 0; index < repulsedNodes.length; index++) {
                const currentNode: PrerenderNode = repulsedNodes[index];
                let currentRectangle: { left: number; top: number; right: number; bottom: number } =
                    this._buildNodeRectangle(currentNode);

                if (legendBounds && this._rectanglesOverlap(currentRectangle, legendBounds)) {
                    const pushDownDistance: number = legendBounds.bottom - currentRectangle.top;
                    currentNode.y += pushDownDistance;
                    movedNodeIds.add(currentNode.node.id);
                    hasMovedInThisIteration = true;
                    currentRectangle = this._buildNodeRectangle(currentNode);
                }

                for (let nextIndex: number = index + 1; nextIndex < repulsedNodes.length; nextIndex++) {
                    const nextNode: PrerenderNode = repulsedNodes[nextIndex];
                    const nextRectangle: { left: number; top: number; right: number; bottom: number } =
                        this._buildNodeRectangle(nextNode);

                    if (this._rectanglesOverlap(currentRectangle, nextRectangle)) {
                        const pushDownDistance: number = currentRectangle.bottom - nextRectangle.top + this._REPULSION_MARGIN;
                        nextNode.y += pushDownDistance;
                        movedNodeIds.add(nextNode.node.id);
                        hasMovedInThisIteration = true;
                    }
                }
            }

            if (!hasMovedInThisIteration) {
                break;
            }
        }

        return repulsedNodes.map((node: PrerenderNode): PrerenderNode => {
            if (!movedNodeIds.has(node.node.id)) {
                return node;
            }

            const originalNode: PrerenderNode | undefined = nodes.find(
                (original: PrerenderNode): boolean => original.node.id === node.node.id
            );

            if (!originalNode) {
                return node;
            }

            return {
                ...node,
                x: originalNode.x,
                opacity: node.opacity !== undefined ? node.opacity : originalNode.opacity,
                backgroundColor: node.backgroundColor || originalNode.backgroundColor,
                borderColor: node.borderColor || originalNode.borderColor
            };
        });
    }

    private _updateViewportForTimeline(): void {
        if (!this._layoutResult) {
            return;
        }

        const { timelineRawPosition }: AppState = this.state;
        const interpolatedBounds = TimelineViewportBoundsResolver.resolve(this._layoutResult, timelineRawPosition);
        this._viewport.updateContentBoundsSmooth(
            interpolatedBounds.minimumX,
            interpolatedBounds.minimumY,
            interpolatedBounds.maximumX,
            interpolatedBounds.maximumY
        );
    }

    private async _generatePng(): Promise<void> {
        await PngGenerator.generate([
            '.timeline-slider',
            '.menu-manager',
            '.file-open-modal-overlay'
        ]);
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
