import { Component, type ReactNode, type MouseEvent, type CSSProperties } from 'react';
import { Edge } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';

import AreaTerritoryBackdrop from './components/canvas/area-territory/AreaTerritoryBackdrop';
import { CanvasViewport } from './components/canvas/viewport/CanvasViewport';
import EdgeDrawer from './components/canvas/edge-interaction/EdgeDrawer';
import InfiniteCanvas from './components/canvas/infinite-canvas/InfiniteCanvas';
import Legend from './components/canvas/legend/Legend';
import { type LegendScreenBounds } from './components/canvas/legend/LegendScreenBounds';
import { TimelineKeyboardController } from './components/canvas/timeline/TimelineKeyboardController';
import { TimelineSlider } from './components/canvas/timeline/TimelineSlider';
import { BlueprintPaster } from './components/menus/blueprint-edit/BlueprintPaster';
import { EdgeCreator } from './components/menus/edge-edit/EdgeCreator';
import MenuManager from './components/menus/MenuManager';
import FileOpenModal from './components/menus/modals/FileOpenModal';
import { EditorHistoryService } from './features/editor-history/EditorHistoryService';
import { BlueprintPrerenderComb } from './features/graph/layout/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/layout/BlueprintPrerenderCombResult';
import { type ContentBounds } from './features/graph/layout/ContentBounds';
import { TimelineGraphProjector } from './features/graph/projection/TimelineGraphProjector';
import { TimelineViewportBoundsResolver } from './features/graph/projection/TimelineViewportBoundsResolver';
import { type PrerenderEdge } from './features/graph/prerender/PrerenderEdge';
import { type PrerenderNode } from './features/graph/prerender/PrerenderNode';
import { RenderRepulsionController } from './features/graph/repulsion/RenderRepulsionController';
import { TimelineRepulsionScheduler } from './features/graph/repulsion/TimelineRepulsionScheduler';
import { GraphLayerRenderer } from './features/graph/rendering/GraphLayerRenderer';
import { DomainRegistry } from './features/registry/DomainRegistry';
import { GitHubLoader } from './features/github/GitHubLoader';
import { PngGenerator } from './features/png-export/PngGenerator';
import { ReadOnlyView } from './features/readonly/ReadOnlyView';


interface AppState {
    isFileLoaded: boolean;
    isLoadingFromGitHubRoute: boolean;
    timelineIndex: number;  // Current index on the timeline (versions).
    timelineIsTransition: boolean;  // Indicates if the timeline is in the transition state after the index.
    timelineRawPosition: number;  // Float value for smooth animation.
}


interface RenderedGraphState {
    displayedNodes: PrerenderNode[];
    displayedEdges: PrerenderEdge[];
    repulsedNodes: PrerenderNode[];
    currentTime: string | undefined;
    nextTime: string | undefined;
    timelineIsTransition: boolean;
    contentBounds: ContentBounds;
}


class App extends Component<{}, AppState> {
    private readonly _NODE_WIDTH: number = BlueprintPrerenderComb.NODE_WIDTH;
    private readonly _NODE_HEIGHT: number = BlueprintPrerenderComb.NODE_HEIGHT;
    private readonly _ROW_HEIGHT: number = BlueprintPrerenderComb.ROW_HEIGHT;
    private readonly _REPULSION_MARGIN: number = this._ROW_HEIGHT - this._NODE_HEIGHT;
    private readonly _TIMELINE_REPULSION_DELAY_MILLISECONDS: number = 2000;
    private readonly _LATEST_SLICE_THRESHOLD: number = 0.001;
    private readonly _TIMELINE_TICK_THRESHOLD: number = 0.0001;
    private readonly _LEGEND_BOUNDS_EQUAL_THRESHOLD: number = 0.5;
    private readonly _NEUTRAL_AREA_KEY: string = '__neutral__';
    private readonly _NEUTRAL_AREA_COLOR: string = '#FFFFFF';
    private readonly _AREA_COLOR_SEED_OFFSET: number = Math.floor(Math.random() * 360);
    private readonly _AREA_COLOR_MINIMUM_SATURATION: number = 68;
    private readonly _AREA_COLOR_MINIMUM_LIGHTNESS: number = 66;
    private readonly _AREA_COLOR_SATURATION_RANGE: number = 16;
    private readonly _AREA_COLOR_LIGHTNESS_RANGE: number = 10;

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
    private _timelineRepulsionScheduler: TimelineRepulsionScheduler;
    private _isModalOpen: boolean = false;
    private _areaColorMap: Map<string, string> = new Map<string, string>();

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
        const latestTimelinePosition: number = this._resolveLatestTimelinePosition();
        const isAtLatestSlice: boolean = Math.abs(this.state.timelineRawPosition - latestTimelinePosition) < this._LATEST_SLICE_THRESHOLD;

        const canStartRepulsionTimer: boolean = this._canStartRepulsionTimer(
            this.state.timelineIsTransition,
            this.state.timelineRawPosition,
            this._hasEnoughNodesForRepulsionAtPosition(this.state.timelineRawPosition)
        );

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
            if (!ReadOnlyView.instance.isReadOnly() && !this._isHistoricalSliceLocked()) {
                this._bindBlueprintPaster();
            }

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
        const hasGitHubRouteParameter: boolean = typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('github') !== null;

        this.state = {
            isFileLoaded: false,
            isLoadingFromGitHubRoute: hasGitHubRouteParameter,
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
        this._timelineRepulsionScheduler = new TimelineRepulsionScheduler();
        this._areaColorMap.set(this._NEUTRAL_AREA_KEY, this._NEUTRAL_AREA_COLOR);

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
                    
                    this.setState({
                        isFileLoaded: true,
                        isLoadingFromGitHubRoute: false
                    } as unknown as Pick<AppState, keyof AppState>);

                    if (viewMode === 'png') {
                        // Wait for rendering to complete (e.g., fonts, layout).
                        setTimeout(() => this._generatePng(), 1500);
                    }
                } catch (error) {
                    console.error('Failed to load from GitHub:', error);
                    alert(`Failed to load from GitHub: ${(error as Error).message}`);
                    this.setState({ isLoadingFromGitHubRoute: false } as unknown as Pick<AppState, keyof AppState>);
                }
            } else {
                this.setState({ isLoadingFromGitHubRoute: false } as unknown as Pick<AppState, keyof AppState>);
            }
        }
    }

    public componentDidUpdate(_prevProps: {}, prevState: AppState): void {
        const { isFileLoaded }: AppState = this.state;
        const { isFileLoaded: wasFileLoaded }: AppState = prevState;
        const hasTimelineChanged: boolean = prevState.timelineRawPosition !== this.state.timelineRawPosition;
        const hasTransitionStateChanged: boolean = prevState.timelineIsTransition !== this.state.timelineIsTransition;
        const latestTimelinePosition: number = this._resolveLatestTimelinePosition();
        const isAtLatestSlice: boolean = Math.abs(this.state.timelineRawPosition - latestTimelinePosition) < this._LATEST_SLICE_THRESHOLD;
        const wasHistoricalSliceLocked: boolean = this._isHistoricalSliceLockedAtPosition(prevState.timelineRawPosition);
        const isHistoricalSliceLocked: boolean = this._isHistoricalSliceLocked();

        const canStartRepulsionTimer: boolean = this._canStartRepulsionTimer(
            this.state.timelineIsTransition,
            this.state.timelineRawPosition,
            this._hasEnoughNodesForRepulsionAtPosition(this.state.timelineRawPosition)
        );

        const timelineTickIndex: number | null = canStartRepulsionTimer ? this._resolveTimelineTickIndex(this.state.timelineRawPosition) : null;

        if (hasTimelineChanged || hasTransitionStateChanged) {
            this._updateViewportForTimeline();
            this._scheduleRenderRepulsion(isAtLatestSlice, canStartRepulsionTimer, timelineTickIndex);

            if (isHistoricalSliceLocked) {
                if (this._menuManagerRef?.reanchoringEdge) {
                    this._menuManagerRef.cancelReanchoring();
                }

                if (this._edgeDrawerRef) {
                    this._edgeDrawerRef.handleCanvasClick();
                }
            }
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

        if (isFileLoaded && (!wasFileLoaded || wasHistoricalSliceLocked !== isHistoricalSliceLocked)) {
            if (isHistoricalSliceLocked || this._isModalOpen) {
                BlueprintPaster.unbind(window);
            } else {
                this._bindBlueprintPaster();
            }
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
        this._timelineRepulsionScheduler.dispose();
    }

    public render(): ReactNode {
        const { isFileLoaded, isLoadingFromGitHubRoute }: AppState = this.state;
        const layoutResult: BlueprintPrerenderCombResult | null = this._layoutResult;
        const renderedGraphState: RenderedGraphState | null = this._resolveRenderedGraphState();

        return (
            <>
                <InfiniteCanvas 
                    viewport={this._viewport}
                    backgroundLayer={renderedGraphState ? this._renderAreaTerritoryBackdrop(renderedGraphState) : null}
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
                    {renderedGraphState && this._renderGraph(renderedGraphState)}
                    <EdgeDrawer 
                        ref={(ref: EdgeDrawer | null): void => { this._edgeDrawerRef = ref; }}
                        viewport={this._viewport}
                        prerenderNodes={layoutResult?.prerenderNodes || []}
                        onEdgeConnect={(sourceId: string, targetId: string): void => {
                            if (this._isHistoricalSliceLocked()) {
                                return;
                            }

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
                            isHistoricalSliceLocked={this._isHistoricalSliceLocked()}
                            isTimelineTransition={this.state.timelineIsTransition}
                            timelineCurrentTime={renderedGraphState?.currentTime}
                            timelineSliceNodes={renderedGraphState?.displayedNodes || []}
                            timelineSliceEdges={renderedGraphState?.displayedEdges || []}
                            onLayoutRefresh={(): void => this._handleLayoutRefresh()}
                            onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => this._handleLayoutUpdate(result)}
                            onModalStateChange={(isOpen: boolean): void => this._handleModalStateChange(isOpen)}
                        />
                    </div>

                {!isFileLoaded && (
                    <div className="file-open-modal-overlay" style={this._getModalOverlayStyle()}>
                        {isLoadingFromGitHubRoute ? (
                            this._renderGitHubRouteLoading()
                        ) : (
                            <FileOpenModal 
                                onFileLoaded={(): void => this.setState({ isFileLoaded: true } as unknown as Pick<AppState, keyof AppState>)}
                                registry={this._registry}
                                layoutService={this._layoutService}
                                viewport={this._viewport}
                                onLayoutUpdate={(result: BlueprintPrerenderCombResult): void => this._handleLayoutUpdate(result)}
                            />
                        )}
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

    private _getDisplayedLayerGapCenters(): number[] {
        if (!this._layoutResult) {
            return [];
        }

        return TimelineGraphProjector.resolveLayerGapCenters(this._layoutResult, this.state.timelineRawPosition);
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

    private _bindBlueprintPaster(): void {
        BlueprintPaster.unbind(window);
        BlueprintPaster.bind(
            window,
            this._registry,
            this._layoutService,
            this._viewport,
            (result: BlueprintPrerenderCombResult): void => this._handleLayoutUpdate(result)
        );
    }

    private _renderGraph(renderedGraphState: RenderedGraphState): ReactNode {
        const reanchoringEdge: Edge | null = this._menuManagerRef?.reanchoringEdge || null;

        return GraphLayerRenderer.render({
            displayedEdges: renderedGraphState.displayedEdges,
            repulsedNodes: renderedGraphState.repulsedNodes,
            reanchoringEdge,
            isHistoricalSliceLocked: this._isHistoricalSliceLocked(),
            currentTime: renderedGraphState.currentTime,
            nextTime: renderedGraphState.nextTime,
            timelineIsTransition: renderedGraphState.timelineIsTransition,
            registry: this._registry,
            edgeDrawerRef: this._edgeDrawerRef,
            menuManagerRef: this._menuManagerRef,
            onForceUpdate: (): void => this.forceUpdate(),
            onNodeContextMenu: (event: MouseEvent, nodeId: string): void => this._handleNodeContextMenu(event, nodeId)
        });
    }

    private _resolveRenderedGraphState(): RenderedGraphState | null {
        if (!this._layoutResult) {
            return null;
        }

        const { updateTimes }: BlueprintPrerenderCombResult = this._layoutResult;

        const {
            timelineIndex,
            timelineIsTransition,
            timelineRawPosition
        }: AppState = this.state;

        const {
            displayedNodes,
            displayedEdges
        }: {
            displayedNodes: PrerenderNode[];
            displayedEdges: PrerenderEdge[];
        } = TimelineGraphProjector.project(this._layoutResult, timelineRawPosition);

        const latestTimelinePosition: number = this._resolveLatestTimelinePosition();
        const isAtLatestSlice: boolean = Math.abs(timelineRawPosition - latestTimelinePosition) < this._LATEST_SLICE_THRESHOLD;
        const isOnTimelineTick: boolean = this._isOnTimelineTick(timelineRawPosition);
        const timelineTickIndex: number = this._resolveTimelineTickIndex(timelineRawPosition);

        const shouldApplyRepulsionNow: boolean = RenderRepulsionController.shouldApplyRepulsionNow(
            timelineIsTransition,
            isOnTimelineTick,
            isAtLatestSlice,
            this._timelineRepulsionScheduler.getAnchorTickIndex(),
            timelineTickIndex,
            displayedNodes.length
        );

        const repulsedNodes: PrerenderNode[] = shouldApplyRepulsionNow
            ? RenderRepulsionController.apply({
                nodes: displayedNodes,
                legendBounds: this._legendBounds,
                viewport: this._viewport,
                nodeWidth: this._NODE_WIDTH,
                nodeHeight: this._NODE_HEIGHT,
                repulsionMargin: this._REPULSION_MARGIN
            })
            : displayedNodes;

        const currentTime: string | undefined = updateTimes && updateTimes[timelineIndex];
        const nextTime: string | undefined = updateTimes && updateTimes[timelineIndex + 1];
        const contentBounds: ContentBounds = TimelineViewportBoundsResolver.resolve(this._layoutResult, timelineRawPosition);

        return {
            displayedNodes,
            displayedEdges,
            repulsedNodes,
            currentTime,
            nextTime,
            timelineIsTransition,
            contentBounds
        };
    }

    private _renderAreaTerritoryBackdrop(renderedGraphState: RenderedGraphState): ReactNode {
        if (renderedGraphState.repulsedNodes.length === 0) {
            return null;
        }

        return (
            <AreaTerritoryBackdrop
                nodes={renderedGraphState.repulsedNodes}
                contentBounds={renderedGraphState.contentBounds}
                viewport={this._viewport}
                nodeWidth={this._NODE_WIDTH}
                nodeHeight={this._NODE_HEIGHT}
                neutralAreaKey={this._NEUTRAL_AREA_KEY}
                resolveAreaColor={(areaKey: string): string => this._resolveAreaColor(areaKey)}
            />
        );
    }

    private _resolveAreaColor(areaKey: string): string {
        if (areaKey === this._NEUTRAL_AREA_KEY) {
            return this._NEUTRAL_AREA_COLOR;
        }

        const existingColor: string | undefined = this._areaColorMap.get(areaKey);

        if (existingColor) {
            return existingColor;
        }

        const areaHashValue: number = this._hashAreaKey(areaKey);
        const hue: number = (areaHashValue + this._AREA_COLOR_SEED_OFFSET) % 360;
        const saturation: number = this._AREA_COLOR_MINIMUM_SATURATION + (areaHashValue % this._AREA_COLOR_SATURATION_RANGE);

        const lightness: number = this._AREA_COLOR_MINIMUM_LIGHTNESS
            + (Math.floor(areaHashValue / this._AREA_COLOR_SATURATION_RANGE) % this._AREA_COLOR_LIGHTNESS_RANGE);

        const randomBrightColor: string = `hsl(${hue} ${saturation}% ${lightness}%)`;
        this._areaColorMap.set(areaKey, randomBrightColor);
        return randomBrightColor;
    }

    private _hashAreaKey(areaKey: string): number {
        let hashValue: number = 0;

        for (let characterIndex: number = 0; characterIndex < areaKey.length; characterIndex += 1) {
            const characterCode: number = areaKey.charCodeAt(characterIndex);
            hashValue = ((hashValue << 5) - hashValue) + characterCode;
            hashValue |= 0;
        }

        return Math.abs(hashValue);
    }

    private _hasEnoughNodesForRepulsionAtPosition(timelineRawPosition: number): boolean {
        if (!this._layoutResult) {
            return false;
        }

        const { frames, prerenderNodes }: BlueprintPrerenderCombResult = this._layoutResult;
        const timelineTickIndex: number = this._resolveTimelineTickIndex(timelineRawPosition);

        return RenderRepulsionController.hasEnoughNodesForRepulsionAtPosition(
            frames,
            prerenderNodes,
            timelineTickIndex
        );
    }

    private _canStartRepulsionTimer(
        timelineIsTransition: boolean,
        timelineRawPosition: number,
        hasEnoughNodesForRepulsion: boolean
    ): boolean {
        return hasEnoughNodesForRepulsion && !timelineIsTransition && this._isOnTimelineTick(timelineRawPosition);
    }

    private _isOnTimelineTick(timelineRawPosition: number): boolean {
        return Math.abs(timelineRawPosition - Math.round(timelineRawPosition)) < this._TIMELINE_TICK_THRESHOLD;
    }

    private _resolveTimelineTickIndex(timelineRawPosition: number): number {
        return Math.round(timelineRawPosition);
    }

    private _resolveLatestTimelinePosition(): number {
        const updateTimesLength: number = this._layoutResult?.updateTimes?.length ?? 0;
        return updateTimesLength > 0 ? updateTimesLength - 1 : 0;
    }

    private _isHistoricalSliceLocked(): boolean {
        return this._isHistoricalSliceLockedAtPosition(this.state.timelineRawPosition);
    }

    private _isHistoricalSliceLockedAtPosition(timelineRawPosition: number): boolean {
        const latestTimelinePosition: number = this._resolveLatestTimelinePosition();
        return timelineRawPosition < (latestTimelinePosition - this._LATEST_SLICE_THRESHOLD);
    }

    private _scheduleRenderRepulsion(
        isAtLatestSlice: boolean,
        canStartRepulsionTimer: boolean,
        timelineTickIndex: number | null
    ): void {
        this._timelineRepulsionScheduler.schedule({
            isAtLatestSlice,
            canStartRepulsionTimer,
            timelineTickIndex,
            delayMilliseconds: this._TIMELINE_REPULSION_DELAY_MILLISECONDS,
            canStillStartRepulsion: (): boolean => this._canStartRepulsionTimer(
                this.state.timelineIsTransition,
                this.state.timelineRawPosition,
                this._hasEnoughNodesForRepulsionAtPosition(this.state.timelineRawPosition)
            ),
            getCurrentTickIndex: (): number => this._resolveTimelineTickIndex(this.state.timelineRawPosition),
            onRepulsionAnchorReady: (): void => this.forceUpdate()
        });
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
            backgroundImage: [
                'linear-gradient(0deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35))',
                'repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0px, rgba(255, 255, 255, 0.2) 1.5px, transparent 1.5px, transparent 40px)',
                'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.2) 0px, rgba(255, 255, 255, 0.2) 1.5px, transparent 1.5px, transparent 40px)',
                'linear-gradient(180deg, #2ca5fd 0%, #0273e1 100%)'
            ].join(', '),
            backdropFilter: 'blur(5px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
    }

    private _renderGitHubRouteLoading(): ReactNode {
        return (
            <div style={this._getGitHubRouteLoadingContainerStyle()}>
                <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                    <circle
                        cx="28"
                        cy="28"
                        r="22"
                        stroke="rgba(255, 255, 255, 0.35)"
                        strokeWidth="5"
                        fill="none"
                    />
                    <path
                        d="M 28 6 A 22 22 0 0 1 50 28"
                        stroke="#ffffff"
                        strokeWidth="5"
                        strokeLinecap="round"
                        fill="none"
                    >
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 28 28"
                            to="360 28 28"
                            dur="0.8s"
                            repeatCount="indefinite"
                        />
                    </path>
                </svg>
            </div>
        );
    }

    private _getGitHubRouteLoadingContainerStyle(): CSSProperties {
        return {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
        };
    }
}


export default App;
