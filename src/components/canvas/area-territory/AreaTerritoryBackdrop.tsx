import { Component, type CSSProperties, type ReactNode } from 'react';

import { CanvasViewport } from '../viewport/CanvasViewport';
import { type ViewportObserver } from '../viewport/ViewportObserver';
import type { ContentBounds } from '../../../features/graph/ContentBounds';
import type { PrerenderNode } from '../../../features/graph/PrerenderNode';
import type { AreaTerritoryBackdropGridPlan } from './AreaTerritoryBackdropGridPlan';
import type { AreaTerritoryBackdropLabel } from './AreaTerritoryBackdropLabel';
import type { AreaTerritoryBackdropAreaGrouping } from './AreaTerritoryBackdropAreaGrouping';
import type { AreaTerritoryBackdropAreaGroup } from './AreaTerritoryBackdropAreaGroup';
import type { AreaTerritoryBackdropAreaNodePoint } from './AreaTerritoryBackdropAreaNodePoint';
import type { AreaTerritoryBackdropGridCell } from './AreaTerritoryBackdropGridCell';
import type { AreaTerritoryBackdropLargestComponent } from './AreaTerritoryBackdropLargestComponent';
import type { AreaTerritoryBackdropNodePoint } from './AreaTerritoryBackdropNodePoint';
import type { AreaTerritoryBackdropNodeInfluenceRegion } from './AreaTerritoryBackdropNodeInfluenceRegion';


export interface AreaTerritoryBackdropProps {
    nodes: PrerenderNode[];
    contentBounds: ContentBounds;
    viewport: CanvasViewport;
    nodeWidth: number;
    nodeHeight: number;
    neutralAreaKey: string;
    resolveAreaColor: (areaKey: string) => string;
}


class AreaTerritoryBackdrop extends Component<AreaTerritoryBackdropProps> implements ViewportObserver {
    private readonly _GRID_CELL_SIZE: number = 88;
    private readonly _BOUNDS_PADDING: number = 360;
    private readonly _VIEWPORT_BOUNDS_PADDING: number = 160;
    private readonly _CENTROID_DISTANCE_WEIGHT: number = 0.35;
    private readonly _NODE_AREA_ENFORCEMENT_EXTENSION_RATIO: number = 0.75;
    private readonly _NODE_AREA_ENFORCEMENT_MINIMUM_EXTENSION: number = 132;
    private readonly _AREA_FILL_OPACITY: number = 0.38;
    private readonly _NEUTRAL_FILL_OPACITY: number = 0.92;
    private readonly _MINIMUM_LABEL_FONT_SIZE: number = 18;
    private readonly _MAXIMUM_LABEL_FONT_SIZE: number = 36;
    private readonly _LABEL_NODE_GAP: number = 14;
    private readonly _LABEL_WIDTH_FACTOR: number = 0.62;
    private readonly _LABEL_HEIGHT_FACTOR: number = 1.25;
    private readonly _AREA_TRANSITION_DURATION_MILLISECONDS: number = 220;
    private readonly _AREA_TRANSITION_MAX_DELAY_MILLISECONDS: number = 180;
    private readonly _AREA_TRANSITION_DELAY_DISTANCE_FACTOR: number = 0.12;

    private _unsubscribe: (() => void) | null = null;
    private _stickyAlignedGridBounds: ContentBounds | null = null;

    public componentDidMount(): void {
        this._subscribeViewport();
    }

    public componentDidUpdate(previousProperties: AreaTerritoryBackdropProps): void {
        if (previousProperties.viewport !== this.props.viewport) {
            this._unsubscribeViewport();
            this._subscribeViewport();
        }
    }

    public componentWillUnmount(): void {
        this._unsubscribeViewport();
        this._stickyAlignedGridBounds = null;
    }

    public onViewportChanged(viewport: CanvasViewport): void {
        void viewport;
        this.forceUpdate();
    }

    public render(): ReactNode {
        if (this.props.nodes.length === 0) {
            return null;
        }

        const gridPlan: AreaTerritoryBackdropGridPlan = this._buildGridPlan();

        if (gridPlan.cells.length === 0) {
            return null;
        }

        const labels: AreaTerritoryBackdropLabel[] = this._buildLabels(gridPlan.gridRows, gridPlan.bounds);
        const boundsWidth: number = Math.max(1, gridPlan.bounds.maximumX - gridPlan.bounds.minimumX);
        const boundsHeight: number = Math.max(1, gridPlan.bounds.maximumY - gridPlan.bounds.minimumY);
        const svgStyle: CSSProperties = this._resolveSvgStyle(gridPlan.bounds);

        return (
            <svg
                data-testid="area-territory-backdrop"
                style={svgStyle}
                width={boundsWidth}
                height={boundsHeight}
                viewBox={`0 0 ${boundsWidth} ${boundsHeight}`}
                preserveAspectRatio="none"
            >
                {gridPlan.cells.map((gridCell: AreaTerritoryBackdropGridCell): ReactNode => {
                    const cellColor: string = this.props.resolveAreaColor(gridCell.areaKey);
                    const isNeutralArea: boolean = gridCell.areaKey === this.props.neutralAreaKey;
                    const fillOpacity: number = isNeutralArea ? this._NEUTRAL_FILL_OPACITY : this._AREA_FILL_OPACITY;

                    return (
                        <rect
                            key={gridCell.coordinateKey}
                            data-area-key={gridCell.areaKey}
                            data-cell-coordinate={gridCell.coordinateKey}
                            x={gridCell.left}
                            y={gridCell.top}
                            width={gridCell.width}
                            height={gridCell.height}
                            fill={cellColor}
                            fillOpacity={fillOpacity}
                            style={{
                                transition: `fill ${this._AREA_TRANSITION_DURATION_MILLISECONDS}ms ease-out, fill-opacity ${this._AREA_TRANSITION_DURATION_MILLISECONDS}ms ease-out`,
                                transitionDelay: `${gridCell.transitionDelayMilliseconds}ms`
                            }}
                        />
                    );
                })}

                {labels.map((label: AreaTerritoryBackdropLabel): ReactNode => (
                    <g
                        key={`area-label-${label.areaKey}`}
                        data-area-label-group={label.areaKey}
                        style={{
                            transform: `translate(${label.x}px, ${label.y}px)`,
                            transition: 'transform 220ms ease-out',
                            willChange: 'transform'
                        }}
                    >
                        <text
                            data-area-label={label.areaKey}
                            x={0}
                            y={0}
                            fill="#FFFFFF"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={label.fontSize}
                            fontWeight={700}
                            style={{
                                userSelect: 'none',
                                caretColor: 'transparent'
                            }}
                        >
                            {label.areaKey}
                        </text>
                    </g>
                ))}
            </svg>
        );
    }

    private _buildGridPlan(): AreaTerritoryBackdropGridPlan {
        const expandedBounds: ContentBounds = this._resolveExpandedBounds(this.props.contentBounds);
        const alignedGridBounds: ContentBounds = this._resolveAlignedGridBounds(expandedBounds);
        const areaGrouping: AreaTerritoryBackdropAreaGrouping = this._resolveAreaGroups();
        const areaGroups: AreaTerritoryBackdropAreaGroup[] = areaGrouping.areaGroups;
        const allNodePoints: AreaTerritoryBackdropAreaNodePoint[] = areaGrouping.allNodePoints;
        const nodeInfluenceRegions: AreaTerritoryBackdropNodeInfluenceRegion[] = areaGrouping.nodeInfluenceRegions;
        const cells: AreaTerritoryBackdropGridCell[] = [];
        const gridRows: AreaTerritoryBackdropGridCell[][] = [];

        for (let cellWorldTop: number = alignedGridBounds.minimumY; cellWorldTop < alignedGridBounds.maximumY; cellWorldTop += this._GRID_CELL_SIZE) {
            const rowCells: AreaTerritoryBackdropGridCell[] = [];
            const rowIndex: number = Math.round((cellWorldTop - alignedGridBounds.minimumY) / this._GRID_CELL_SIZE);

            for (let cellWorldLeft: number = alignedGridBounds.minimumX; cellWorldLeft < alignedGridBounds.maximumX; cellWorldLeft += this._GRID_CELL_SIZE) {
                const columnIndex: number = Math.round((cellWorldLeft - alignedGridBounds.minimumX) / this._GRID_CELL_SIZE);
                const left: number = cellWorldLeft - alignedGridBounds.minimumX;
                const top: number = cellWorldTop - alignedGridBounds.minimumY;
                const width: number = Math.max(1, Math.min(this._GRID_CELL_SIZE, alignedGridBounds.maximumX - cellWorldLeft));
                const height: number = Math.max(1, Math.min(this._GRID_CELL_SIZE, alignedGridBounds.maximumY - cellWorldTop));
                const cellWorldMinimumX: number = cellWorldLeft;
                const cellWorldMinimumY: number = cellWorldTop;
                const cellWorldMaximumX: number = cellWorldMinimumX + width;
                const cellWorldMaximumY: number = cellWorldMinimumY + height;
                const centerX: number = cellWorldMinimumX + (width / 2);
                const centerY: number = cellWorldMinimumY + (height / 2);

                const areaKey: string = this._resolveCellAreaKey(
                    cellWorldMinimumX,
                    cellWorldMinimumY,
                    cellWorldMaximumX,
                    cellWorldMaximumY,
                    centerX,
                    centerY,
                    areaGroups,
                    allNodePoints,
                    nodeInfluenceRegions
                );

                const transitionDelayMilliseconds: number = this._resolveCellTransitionDelayMilliseconds(
                    areaKey,
                    centerX,
                    centerY,
                    areaGroups
                );

                const gridCell: AreaTerritoryBackdropGridCell = {
                    coordinateKey: `${columnIndex}:${rowIndex}`,
                    areaKey,
                    left,
                    top,
                    width,
                    height,
                    centerX: left + (width / 2),
                    centerY: top + (height / 2),
                    transitionDelayMilliseconds
                };

                rowCells.push(gridCell);
                cells.push(gridCell);
            }

            gridRows.push(rowCells);
        }

        return {
            cells,
            gridRows,
            bounds: alignedGridBounds
        };
    }

    private _resolveAlignedGridBounds(expandedBounds: ContentBounds): ContentBounds {
        const idealAlignedGridBounds: ContentBounds = {
            minimumX: Math.floor(expandedBounds.minimumX / this._GRID_CELL_SIZE) * this._GRID_CELL_SIZE,
            minimumY: Math.floor(expandedBounds.minimumY / this._GRID_CELL_SIZE) * this._GRID_CELL_SIZE,
            maximumX: Math.ceil(expandedBounds.maximumX / this._GRID_CELL_SIZE) * this._GRID_CELL_SIZE,
            maximumY: Math.ceil(expandedBounds.maximumY / this._GRID_CELL_SIZE) * this._GRID_CELL_SIZE
        };

        if (!this._stickyAlignedGridBounds) {
            this._stickyAlignedGridBounds = idealAlignedGridBounds;
            return idealAlignedGridBounds;
        }

        let minimumX: number = this._stickyAlignedGridBounds.minimumX;
        let minimumY: number = this._stickyAlignedGridBounds.minimumY;
        let maximumX: number = this._stickyAlignedGridBounds.maximumX;
        let maximumY: number = this._stickyAlignedGridBounds.maximumY;

        if (idealAlignedGridBounds.minimumX < minimumX || idealAlignedGridBounds.minimumX > minimumX + this._GRID_CELL_SIZE) {
            minimumX = idealAlignedGridBounds.minimumX;
        }

        if (idealAlignedGridBounds.minimumY < minimumY || idealAlignedGridBounds.minimumY > minimumY + this._GRID_CELL_SIZE) {
            minimumY = idealAlignedGridBounds.minimumY;
        }

        if (idealAlignedGridBounds.maximumX > maximumX || idealAlignedGridBounds.maximumX < maximumX - this._GRID_CELL_SIZE) {
            maximumX = idealAlignedGridBounds.maximumX;
        }

        if (idealAlignedGridBounds.maximumY > maximumY || idealAlignedGridBounds.maximumY < maximumY - this._GRID_CELL_SIZE) {
            maximumY = idealAlignedGridBounds.maximumY;
        }

        const stickyAlignedGridBounds: ContentBounds = {
            minimumX,
            minimumY,
            maximumX,
            maximumY
        };

        this._stickyAlignedGridBounds = stickyAlignedGridBounds;
        return stickyAlignedGridBounds;
    }

    private _resolveExpandedBounds(contentBounds: ContentBounds): ContentBounds {
        const viewportVisibleBounds: ContentBounds | null = this._resolveViewportVisibleBounds();
        const contentMinimumX: number = contentBounds.minimumX - this._BOUNDS_PADDING;
        const contentMinimumY: number = contentBounds.minimumY - this._BOUNDS_PADDING;
        const contentMaximumX: number = contentBounds.maximumX + this._BOUNDS_PADDING;
        const contentMaximumY: number = contentBounds.maximumY + this._BOUNDS_PADDING;

        if (!viewportVisibleBounds) {
            return {
                minimumX: contentMinimumX,
                minimumY: contentMinimumY,
                maximumX: contentMaximumX,
                maximumY: contentMaximumY
            };
        }

        return {
            minimumX: Math.min(contentMinimumX, viewportVisibleBounds.minimumX - this._VIEWPORT_BOUNDS_PADDING),
            minimumY: Math.min(contentMinimumY, viewportVisibleBounds.minimumY - this._VIEWPORT_BOUNDS_PADDING),
            maximumX: Math.max(contentMaximumX, viewportVisibleBounds.maximumX + this._VIEWPORT_BOUNDS_PADDING),
            maximumY: Math.max(contentMaximumY, viewportVisibleBounds.maximumY + this._VIEWPORT_BOUNDS_PADDING)
        };
    }

    private _resolveEnforcementRectangleExtensionDistance(): number {
        const scaledExtensionDistance: number = Math.max(this.props.nodeWidth, this.props.nodeHeight)
            * this._NODE_AREA_ENFORCEMENT_EXTENSION_RATIO;

        return Math.max(this._NODE_AREA_ENFORCEMENT_MINIMUM_EXTENSION, scaledExtensionDistance);
    }

    private _resolveViewportVisibleBounds(): ContentBounds | null {
        const viewportScale: number = this.props.viewport.scale;
        const containerWidth: number = this.props.viewport.containerWidth;
        const containerHeight: number = this.props.viewport.containerHeight;

        if (viewportScale <= 0 || containerWidth <= 0 || containerHeight <= 0) {
            return null;
        }

        const minimumX: number = (-this.props.viewport.x) / viewportScale;
        const minimumY: number = (-this.props.viewport.y) / viewportScale;
        const maximumX: number = (containerWidth - this.props.viewport.x) / viewportScale;
        const maximumY: number = (containerHeight - this.props.viewport.y) / viewportScale;

        return {
            minimumX,
            minimumY,
            maximumX,
            maximumY
        };
    }

    private _resolveAreaGroups(): AreaTerritoryBackdropAreaGrouping {
        const pointsByAreaKey: Map<string, AreaTerritoryBackdropNodePoint[]> = new Map<string, AreaTerritoryBackdropNodePoint[]>();
        const allNodePoints: AreaTerritoryBackdropAreaNodePoint[] = [];
        const nodeInfluenceRegions: AreaTerritoryBackdropNodeInfluenceRegion[] = [];
        const enforcementRectangleExtensionDistance: number = this._resolveEnforcementRectangleExtensionDistance();

        for (const prerenderNode of this.props.nodes) {
            const typedPrerenderNode: PrerenderNode = prerenderNode;
            const areaKey: string = this._resolveNodeAreaKey(typedPrerenderNode);
            const nodeCenterX: number = typedPrerenderNode.x + (this.props.nodeWidth / 2);
            const nodeCenterY: number = typedPrerenderNode.y + (this.props.nodeHeight / 2);

            const centerPoint: AreaTerritoryBackdropNodePoint = {
                x: nodeCenterX,
                y: nodeCenterY
            };

            allNodePoints.push({
                areaKey,
                x: centerPoint.x,
                y: centerPoint.y
            });

            nodeInfluenceRegions.push({
                areaKey,
                centerX: nodeCenterX,
                centerY: nodeCenterY,
                minimumX: typedPrerenderNode.x - enforcementRectangleExtensionDistance,
                minimumY: typedPrerenderNode.y - enforcementRectangleExtensionDistance,
                maximumX: typedPrerenderNode.x + this.props.nodeWidth + enforcementRectangleExtensionDistance,
                maximumY: typedPrerenderNode.y + this.props.nodeHeight + enforcementRectangleExtensionDistance
            });

            const existingPoints: AreaTerritoryBackdropNodePoint[] | undefined = pointsByAreaKey.get(areaKey);

            if (existingPoints) {
                existingPoints.push(centerPoint);
            } else {
                pointsByAreaKey.set(areaKey, [centerPoint]);
            }
        }

        const areaGroups: AreaTerritoryBackdropAreaGroup[] = [];

        for (const [areaKey, nodePoints] of pointsByAreaKey.entries()) {
            let totalX: number = 0;
            let totalY: number = 0;

            for (const point of nodePoints) {
                const typedPoint: AreaTerritoryBackdropNodePoint = point;
                totalX += typedPoint.x;
                totalY += typedPoint.y;
            }

            const centroidX: number = totalX / nodePoints.length;
            const centroidY: number = totalY / nodePoints.length;

            areaGroups.push({
                areaKey,
                nodePoints,
                centroidX,
                centroidY
            });
        }

        return {
            areaGroups,
            allNodePoints,
            nodeInfluenceRegions
        };
    }

    private _resolveNodeAreaKey(prerenderNode: PrerenderNode): string {
        const metadata: Record<string, unknown> | undefined = prerenderNode.node.metadata;
        const rawAreaValue: unknown = metadata?.area;

        if (typeof rawAreaValue === 'string') {
            const trimmedAreaValue: string = rawAreaValue.trim();

            if (trimmedAreaValue.length > 0) {
                return trimmedAreaValue;
            }
        }

        return this.props.neutralAreaKey;
    }

    private _resolveCellAreaKey(
        cellWorldMinimumX: number,
        cellWorldMinimumY: number,
        cellWorldMaximumX: number,
        cellWorldMaximumY: number,
        centerX: number,
        centerY: number,
        areaGroups: AreaTerritoryBackdropAreaGroup[],
        allNodePoints: AreaTerritoryBackdropAreaNodePoint[],
        nodeInfluenceRegions: AreaTerritoryBackdropNodeInfluenceRegion[]
    ): string {
        const forcedAreaKey: string | null = this._resolveForcedAreaKey(
            cellWorldMinimumX,
            cellWorldMinimumY,
            cellWorldMaximumX,
            cellWorldMaximumY,
            centerX,
            centerY,
            nodeInfluenceRegions
        );

        if (forcedAreaKey) {
            return forcedAreaKey;
        }

        let bestAreaKey: string = this.props.neutralAreaKey;
        let bestScore: number = Number.POSITIVE_INFINITY;

        for (const areaGroup of areaGroups) {
            const typedAreaGroup: AreaTerritoryBackdropAreaGroup = areaGroup;

            const nearestDistanceSquared: number = this._resolveNearestDistanceSquared(
                centerX,
                centerY,
                typedAreaGroup.nodePoints
            );

            const centroidDistanceSquared: number = this._resolveDistanceSquared(
                centerX,
                centerY,
                typedAreaGroup.centroidX,
                typedAreaGroup.centroidY
            );

            const score: number = nearestDistanceSquared + (centroidDistanceSquared * this._CENTROID_DISTANCE_WEIGHT);

            const shouldReplaceBestMatch: boolean = (
                score < bestScore
                || (
                    score === bestScore
                    && typedAreaGroup.areaKey.localeCompare(bestAreaKey) < 0
                )
            );

            if (shouldReplaceBestMatch) {
                bestScore = score;
                bestAreaKey = typedAreaGroup.areaKey;
            }
        }

        if (!Number.isFinite(bestScore)) {
            return this._resolveNearestAreaKey(centerX, centerY, allNodePoints);
        }

        return bestAreaKey;
    }

    private _resolveForcedAreaKey(
        cellWorldMinimumX: number,
        cellWorldMinimumY: number,
        cellWorldMaximumX: number,
        cellWorldMaximumY: number,
        centerX: number,
        centerY: number,
        nodeInfluenceRegions: AreaTerritoryBackdropNodeInfluenceRegion[]
    ): string | null {
        let nearestAreaKey: string | null = null;
        let nearestDistanceSquared: number = Number.POSITIVE_INFINITY;

        for (const nodeInfluenceRegion of nodeInfluenceRegions) {
            const typedNodeInfluenceRegion: AreaTerritoryBackdropNodeInfluenceRegion = nodeInfluenceRegion;

            const intersectsInfluenceRegion: boolean = this._doesCellIntersectInfluenceRegion(
                cellWorldMinimumX,
                cellWorldMinimumY,
                cellWorldMaximumX,
                cellWorldMaximumY,
                typedNodeInfluenceRegion
            );

            if (!intersectsInfluenceRegion) {
                continue;
            }

            const distanceSquared: number = this._resolveDistanceSquared(
                centerX,
                centerY,
                typedNodeInfluenceRegion.centerX,
                typedNodeInfluenceRegion.centerY
            );

            if (distanceSquared < nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
                nearestAreaKey = typedNodeInfluenceRegion.areaKey;
            }
        }

        return nearestAreaKey;
    }

    private _doesCellIntersectInfluenceRegion(
        cellWorldMinimumX: number,
        cellWorldMinimumY: number,
        cellWorldMaximumX: number,
        cellWorldMaximumY: number,
        nodeInfluenceRegion: AreaTerritoryBackdropNodeInfluenceRegion
    ): boolean {
        const overlapsHorizontally: boolean = (
            cellWorldMinimumX < nodeInfluenceRegion.maximumX
            && cellWorldMaximumX > nodeInfluenceRegion.minimumX
        );

        const overlapsVertically: boolean = (
            cellWorldMinimumY < nodeInfluenceRegion.maximumY
            && cellWorldMaximumY > nodeInfluenceRegion.minimumY
        );

        return overlapsHorizontally && overlapsVertically;
    }

    private _resolveNearestAreaKey(
        centerX: number,
        centerY: number,
        allNodePoints: AreaTerritoryBackdropAreaNodePoint[]
    ): string {
        if (allNodePoints.length === 0) {
            return this.props.neutralAreaKey;
        }

        let nearestAreaKey: string = this.props.neutralAreaKey;
        let nearestDistanceSquared: number = Number.POSITIVE_INFINITY;

        for (const nodePoint of allNodePoints) {
            const typedNodePoint: AreaTerritoryBackdropAreaNodePoint = nodePoint;
            const distanceSquared: number = this._resolveDistanceSquared(
                centerX,
                centerY,
                typedNodePoint.x,
                typedNodePoint.y
            );

            if (distanceSquared < nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
                nearestAreaKey = typedNodePoint.areaKey;
            }
        }

        return nearestAreaKey;
    }

    private _resolveNearestDistanceSquared(
        pointX: number,
        pointY: number,
        nodePoints: AreaTerritoryBackdropNodePoint[]
    ): number {
        let nearestDistanceSquared: number = Number.POSITIVE_INFINITY;

        for (const nodePoint of nodePoints) {
            const typedNodePoint: AreaTerritoryBackdropNodePoint = nodePoint;
            const distanceSquared: number = this._resolveDistanceSquared(
                pointX,
                pointY,
                typedNodePoint.x,
                typedNodePoint.y
            );

            if (distanceSquared < nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
            }
        }

        return nearestDistanceSquared;
    }

    private _resolveCellTransitionDelayMilliseconds(
        areaKey: string,
        centerX: number,
        centerY: number,
        areaGroups: AreaTerritoryBackdropAreaGroup[]
    ): number {
        if (areaKey === this.props.neutralAreaKey) {
            return 0;
        }

        const areaGroup: AreaTerritoryBackdropAreaGroup | undefined = areaGroups.find((candidateAreaGroup: AreaTerritoryBackdropAreaGroup): boolean => {
            return candidateAreaGroup.areaKey === areaKey;
        });

        if (!areaGroup || areaGroup.nodePoints.length === 0) {
            return 0;
        }

        const nearestDistanceSquared: number = this._resolveNearestDistanceSquared(centerX, centerY, areaGroup.nodePoints);
        const nearestDistance: number = Math.sqrt(nearestDistanceSquared);
        const delayMilliseconds: number = nearestDistance * this._AREA_TRANSITION_DELAY_DISTANCE_FACTOR;

        return Math.max(0, Math.min(this._AREA_TRANSITION_MAX_DELAY_MILLISECONDS, Math.round(delayMilliseconds)));
    }

    private _resolveDistanceSquared(
        sourceX: number,
        sourceY: number,
        targetX: number,
        targetY: number
    ): number {
        const deltaX: number = sourceX - targetX;
        const deltaY: number = sourceY - targetY;
        return (deltaX * deltaX) + (deltaY * deltaY);
    }

    private _buildLabels(
        gridRows: AreaTerritoryBackdropGridCell[][],
        bounds: ContentBounds
    ): AreaTerritoryBackdropLabel[] {
        const labels: AreaTerritoryBackdropLabel[] = [];
        const areaKeys: string[] = this._resolveAreaKeysFromGrid(gridRows);

        for (const areaKey of areaKeys) {
            const typedAreaKey: string = areaKey;

            if (typedAreaKey === this.props.neutralAreaKey) {
                continue;
            }

            const largestComponent: AreaTerritoryBackdropLargestComponent | null = this._resolveLargestComponent(
                typedAreaKey,
                gridRows
            );

            if (!largestComponent || largestComponent.count === 0) {
                continue;
            }

            let totalCenterX: number = 0;
            let totalCenterY: number = 0;

            for (const gridCell of largestComponent.cells) {
                const typedGridCell: AreaTerritoryBackdropGridCell = gridCell;
                totalCenterX += typedGridCell.centerX;
                totalCenterY += typedGridCell.centerY;
            }

            const labelCenterX: number = totalCenterX / largestComponent.count;
            const labelCenterY: number = totalCenterY / largestComponent.count;
            const rawFontSize: number = Math.sqrt(largestComponent.count) * 3.8;

            const fontSize: number = Math.max(
                this._MINIMUM_LABEL_FONT_SIZE,
                Math.min(this._MAXIMUM_LABEL_FONT_SIZE, rawFontSize)
            );

            const nonOverlappingLabelCell: AreaTerritoryBackdropGridCell | null = this._resolveNonOverlappingLabelCell(
                largestComponent.cells,
                labelCenterX,
                labelCenterY,
                typedAreaKey,
                fontSize,
                bounds.minimumX,
                bounds.minimumY
            );

            if (!nonOverlappingLabelCell) {
                continue;
            }

            labels.push({
                areaKey: typedAreaKey,
                x: nonOverlappingLabelCell.centerX,
                y: nonOverlappingLabelCell.centerY,
                fontSize
            });
        }

        return labels;
    }

    private _resolveNonOverlappingLabelCell(
        candidateCells: AreaTerritoryBackdropGridCell[],
        fallbackCenterX: number,
        fallbackCenterY: number,
        areaKey: string,
        fontSize: number,
        boundsMinimumX: number,
        boundsMinimumY: number
    ): AreaTerritoryBackdropGridCell | null {
        let bestCandidateCell: AreaTerritoryBackdropGridCell | null = null;
        let bestCandidateScore: number = Number.POSITIVE_INFINITY;

        for (const candidateCell of candidateCells) {
            const typedCandidateCell: AreaTerritoryBackdropGridCell = candidateCell;
            const overlapsNode: boolean = this._doesLabelOverlapAnyNode(
                typedCandidateCell.centerX,
                typedCandidateCell.centerY,
                areaKey,
                fontSize,
                boundsMinimumX,
                boundsMinimumY
            );

            if (overlapsNode) {
                continue;
            }

            const score: number = this._resolveDistanceSquared(
                typedCandidateCell.centerX,
                typedCandidateCell.centerY,
                fallbackCenterX,
                fallbackCenterY
            );

            if (score < bestCandidateScore) {
                bestCandidateScore = score;
                bestCandidateCell = typedCandidateCell;
            }
        }

        return bestCandidateCell;
    }

    private _doesLabelOverlapAnyNode(
        labelCenterX: number,
        labelCenterY: number,
        labelText: string,
        fontSize: number,
        boundsMinimumX: number,
        boundsMinimumY: number
    ): boolean {
        const labelCenterWorldX: number = boundsMinimumX + labelCenterX;
        const labelCenterWorldY: number = boundsMinimumY + labelCenterY;

        const estimatedLabelWidth: number = Math.max(
            fontSize,
            (labelText.length * fontSize * this._LABEL_WIDTH_FACTOR)
        );

        const estimatedLabelHeight: number = fontSize * this._LABEL_HEIGHT_FACTOR;
        const labelLeft: number = labelCenterWorldX - (estimatedLabelWidth / 2);
        const labelRight: number = labelCenterWorldX + (estimatedLabelWidth / 2);
        const labelTop: number = labelCenterWorldY - (estimatedLabelHeight / 2);
        const labelBottom: number = labelCenterWorldY + (estimatedLabelHeight / 2);

        for (const prerenderNode of this.props.nodes) {
            const typedPrerenderNode: PrerenderNode = prerenderNode;
            const nodeLeft: number = typedPrerenderNode.x - this._LABEL_NODE_GAP;
            const nodeRight: number = typedPrerenderNode.x + this.props.nodeWidth + this._LABEL_NODE_GAP;
            const nodeTop: number = typedPrerenderNode.y - this._LABEL_NODE_GAP;
            const nodeBottom: number = typedPrerenderNode.y + this.props.nodeHeight + this._LABEL_NODE_GAP;
            const overlapsHorizontally: boolean = labelLeft <= nodeRight && labelRight >= nodeLeft;
            const overlapsVertically: boolean = labelTop <= nodeBottom && labelBottom >= nodeTop;

            if (overlapsHorizontally && overlapsVertically) {
                return true;
            }
        }

        return false;
    }

    private _resolveAreaKeysFromGrid(gridRows: AreaTerritoryBackdropGridCell[][]): string[] {
        const areaKeySet: Set<string> = new Set<string>();

        for (const rowCells of gridRows) {
            const typedRowCells: AreaTerritoryBackdropGridCell[] = rowCells;

            for (const gridCell of typedRowCells) {
                const typedGridCell: AreaTerritoryBackdropGridCell = gridCell;
                areaKeySet.add(typedGridCell.areaKey);
            }
        }

        return Array.from(areaKeySet.values());
    }

    private _resolveLargestComponent(
        areaKey: string,
        gridRows: AreaTerritoryBackdropGridCell[][]
    ): AreaTerritoryBackdropLargestComponent | null {
        if (gridRows.length === 0 || gridRows[0].length === 0) {
            return null;
        }

        const visitedCoordinates: Set<string> = new Set<string>();
        let largestComponent: AreaTerritoryBackdropLargestComponent | null = null;
        const rowCount: number = gridRows.length;
        const columnCount: number = gridRows[0].length;

        for (let rowIndex: number = 0; rowIndex < rowCount; rowIndex += 1) {
            for (let columnIndex: number = 0; columnIndex < columnCount; columnIndex += 1) {
                const coordinateKey: string = this._resolveCoordinateKey(rowIndex, columnIndex);
                const startCell: AreaTerritoryBackdropGridCell = gridRows[rowIndex][columnIndex];
                const isSameArea: boolean = startCell.areaKey === areaKey;

                if (!isSameArea || visitedCoordinates.has(coordinateKey)) {
                    continue;
                }

                const queue: Array<[number, number]> = [[rowIndex, columnIndex]];
                const componentCells: AreaTerritoryBackdropGridCell[] = [];
                visitedCoordinates.add(coordinateKey);

                while (queue.length > 0) {
                    const currentCoordinate: [number, number] | undefined = queue.shift();

                    if (!currentCoordinate) {
                        continue;
                    }

                    const currentRowIndex: number = currentCoordinate[0];
                    const currentColumnIndex: number = currentCoordinate[1];
                    const currentCell: AreaTerritoryBackdropGridCell = gridRows[currentRowIndex][currentColumnIndex];
                    componentCells.push(currentCell);

                    const neighborCoordinates: Array<[number, number]> = [
                        [currentRowIndex - 1, currentColumnIndex],
                        [currentRowIndex + 1, currentColumnIndex],
                        [currentRowIndex, currentColumnIndex - 1],
                        [currentRowIndex, currentColumnIndex + 1]
                    ];

                    for (const neighborCoordinate of neighborCoordinates) {
                        const typedNeighborCoordinate: [number, number] = neighborCoordinate;
                        const neighborRowIndex: number = typedNeighborCoordinate[0];
                        const neighborColumnIndex: number = typedNeighborCoordinate[1];
                        const isOutOfBounds: boolean = (
                            neighborRowIndex < 0
                            || neighborColumnIndex < 0
                            || neighborRowIndex >= rowCount
                            || neighborColumnIndex >= columnCount
                        );

                        if (isOutOfBounds) {
                            continue;
                        }

                        const neighborKey: string = this._resolveCoordinateKey(neighborRowIndex, neighborColumnIndex);
                        const neighborCell: AreaTerritoryBackdropGridCell = gridRows[neighborRowIndex][neighborColumnIndex];
                        const isNeighborSameArea: boolean = neighborCell.areaKey === areaKey;

                        if (!isNeighborSameArea || visitedCoordinates.has(neighborKey)) {
                            continue;
                        }

                        visitedCoordinates.add(neighborKey);
                        queue.push([neighborRowIndex, neighborColumnIndex]);
                    }
                }

                if (!largestComponent || componentCells.length > largestComponent.count) {
                    largestComponent = {
                        cells: componentCells,
                        count: componentCells.length
                    };
                }
            }
        }

        return largestComponent;
    }

    private _resolveCoordinateKey(rowIndex: number, columnIndex: number): string {
        return `${rowIndex}:${columnIndex}`;
    }

    private _resolveSvgStyle(bounds: ContentBounds): CSSProperties {
        const width: number = Math.max(1, bounds.maximumX - bounds.minimumX);
        const height: number = Math.max(1, bounds.maximumY - bounds.minimumY);

        return {
            position: 'absolute',
            left: `${bounds.minimumX}px`,
            top: `${bounds.minimumY}px`,
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none',
            zIndex: -3
        };
    }

    private _subscribeViewport(): void {
        this._unsubscribe = this.props.viewport.subscribe(this);
    }

    private _unsubscribeViewport(): void {
        if (!this._unsubscribe) {
            return;
        }

        this._unsubscribe();
        this._unsubscribe = null;
    }
}


export default AreaTerritoryBackdrop;
