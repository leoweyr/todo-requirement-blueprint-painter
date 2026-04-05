import { Component, type CSSProperties, type ReactNode } from 'react';

import { CanvasViewport } from './CanvasViewport';
import { type ViewportObserver } from './ViewportObserver';
import type { ContentBounds } from '../../features/graph/ContentBounds';
import type { PrerenderNode } from '../../features/graph/PrerenderNode';
import type { AreaTerritoryBackdropGridPlan } from './AreaTerritoryBackdropGridPlan';
import type { AreaTerritoryBackdropLabel } from './AreaTerritoryBackdropLabel';
import type { AreaTerritoryBackdropAreaGrouping } from './AreaTerritoryBackdropAreaGrouping';
import type { AreaTerritoryBackdropAreaGroup } from './AreaTerritoryBackdropAreaGroup';
import type { AreaTerritoryBackdropAreaNodePoint } from './AreaTerritoryBackdropAreaNodePoint';
import type { AreaTerritoryBackdropGridCell } from './AreaTerritoryBackdropGridCell';
import type { AreaTerritoryBackdropLargestComponent } from './AreaTerritoryBackdropLargestComponent';
import type { AreaTerritoryBackdropNodePoint } from './AreaTerritoryBackdropNodePoint';


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
    private readonly _NODE_AREA_ENFORCEMENT_RADIUS_RATIO: number = 0.7;
    private readonly _NODE_AREA_ENFORCEMENT_MINIMUM_RADIUS: number = 96;
    private readonly _AREA_FILL_OPACITY: number = 0.38;
    private readonly _NEUTRAL_FILL_OPACITY: number = 0.92;
    private readonly _MINIMUM_LABEL_FONT_SIZE: number = 18;
    private readonly _MAXIMUM_LABEL_FONT_SIZE: number = 36;
    private _unsubscribe: (() => void) | null = null;

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

        const labels: AreaTerritoryBackdropLabel[] = this._buildLabels(gridPlan.gridRows);
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
                {gridPlan.cells.map((gridCell: AreaTerritoryBackdropGridCell, cellIndex: number): ReactNode => {
                    const cellColor: string = this.props.resolveAreaColor(gridCell.areaKey);
                    const isNeutralArea: boolean = gridCell.areaKey === this.props.neutralAreaKey;
                    const fillOpacity: number = isNeutralArea ? this._NEUTRAL_FILL_OPACITY : this._AREA_FILL_OPACITY;

                    return (
                        <rect
                            key={`area-cell-${cellIndex}`}
                            data-area-key={gridCell.areaKey}
                            x={gridCell.left}
                            y={gridCell.top}
                            width={gridCell.width}
                            height={gridCell.height}
                            fill={cellColor}
                            fillOpacity={fillOpacity}
                            style={{ transition: 'fill 140ms linear, fill-opacity 140ms linear' }}
                        />
                    );
                })}

                {labels.map((label: AreaTerritoryBackdropLabel): ReactNode => (
                    <text
                        key={`area-label-${label.areaKey}`}
                        data-area-label={label.areaKey}
                        x={label.x}
                        y={label.y}
                        fill="#FFFFFF"
                        stroke="rgba(0, 0, 0, 0.4)"
                        strokeWidth={2}
                        paintOrder="stroke"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={label.fontSize}
                        fontWeight={700}
                        style={{ transition: 'transform 140ms linear' }}
                    >
                        {label.areaKey}
                    </text>
                ))}
            </svg>
        );
    }

    private _buildGridPlan(): AreaTerritoryBackdropGridPlan {
        const expandedBounds: ContentBounds = this._resolveExpandedBounds(this.props.contentBounds);
        const areaGrouping: AreaTerritoryBackdropAreaGrouping = this._resolveAreaGroups();
        const areaGroups: AreaTerritoryBackdropAreaGroup[] = areaGrouping.areaGroups;
        const allNodePoints: AreaTerritoryBackdropAreaNodePoint[] = areaGrouping.allNodePoints;
        const enforcementRadiusSquared: number = this._resolveEnforcementRadiusSquared();
        const totalWidth: number = Math.max(1, expandedBounds.maximumX - expandedBounds.minimumX);
        const totalHeight: number = Math.max(1, expandedBounds.maximumY - expandedBounds.minimumY);
        const columnCount: number = Math.max(1, Math.ceil(totalWidth / this._GRID_CELL_SIZE));
        const rowCount: number = Math.max(1, Math.ceil(totalHeight / this._GRID_CELL_SIZE));
        const cells: AreaTerritoryBackdropGridCell[] = [];
        const gridRows: AreaTerritoryBackdropGridCell[][] = [];

        for (let rowIndex: number = 0; rowIndex < rowCount; rowIndex += 1) {
            const rowCells: AreaTerritoryBackdropGridCell[] = [];

            for (let columnIndex: number = 0; columnIndex < columnCount; columnIndex += 1) {
                const left: number = columnIndex * this._GRID_CELL_SIZE;
                const top: number = rowIndex * this._GRID_CELL_SIZE;
                const width: number = Math.max(1, Math.min(this._GRID_CELL_SIZE, totalWidth - left));
                const height: number = Math.max(1, Math.min(this._GRID_CELL_SIZE, totalHeight - top));
                const centerX: number = expandedBounds.minimumX + left + (width / 2);
                const centerY: number = expandedBounds.minimumY + top + (height / 2);

                const areaKey: string = this._resolveCellAreaKey(
                    centerX,
                    centerY,
                    areaGroups,
                    allNodePoints,
                    enforcementRadiusSquared
                );

                const gridCell: AreaTerritoryBackdropGridCell = {
                    areaKey,
                    left,
                    top,
                    width,
                    height,
                    centerX: left + (width / 2),
                    centerY: top + (height / 2)
                };

                rowCells.push(gridCell);
                cells.push(gridCell);
            }

            gridRows.push(rowCells);
        }

        return {
            cells,
            gridRows,
            bounds: expandedBounds
        };
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

    private _resolveEnforcementRadiusSquared(): number {
        const scaledRadius: number = Math.max(this.props.nodeWidth, this.props.nodeHeight)
            * this._NODE_AREA_ENFORCEMENT_RADIUS_RATIO;
        const radius: number = Math.max(this._NODE_AREA_ENFORCEMENT_MINIMUM_RADIUS, scaledRadius);
        return radius * radius;
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

        for (const prerenderNode of this.props.nodes) {
            const typedPrerenderNode: PrerenderNode = prerenderNode;
            const areaKey: string = this._resolveNodeAreaKey(typedPrerenderNode);

            const centerPoint: AreaTerritoryBackdropNodePoint = {
                x: typedPrerenderNode.x + (this.props.nodeWidth / 2),
                y: typedPrerenderNode.y + (this.props.nodeHeight / 2)
            };

            allNodePoints.push({
                areaKey,
                x: centerPoint.x,
                y: centerPoint.y
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
            allNodePoints
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
        centerX: number,
        centerY: number,
        areaGroups: AreaTerritoryBackdropAreaGroup[],
        allNodePoints: AreaTerritoryBackdropAreaNodePoint[],
        enforcementRadiusSquared: number
    ): string {
        const forcedAreaKey: string | null = this._resolveForcedAreaKey(
            centerX,
            centerY,
            allNodePoints,
            enforcementRadiusSquared
        );

        if (forcedAreaKey) {
            return forcedAreaKey;
        }

        let bestAreaKey: string = this.props.neutralAreaKey;
        let bestScore: number = Number.POSITIVE_INFINITY;

        for (const areaGroup of areaGroups) {
            const typedAreaGroup: AreaTerritoryBackdropAreaGroup = areaGroup;

            if (this._isAreaBlockedByForeignNodes(
                typedAreaGroup.areaKey,
                centerX,
                centerY,
                allNodePoints,
                enforcementRadiusSquared
            )) {
                continue;
            }

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
        centerX: number,
        centerY: number,
        allNodePoints: AreaTerritoryBackdropAreaNodePoint[],
        enforcementRadiusSquared: number
    ): string | null {
        let nearestAreaKey: string | null = null;
        let nearestDistanceSquared: number = Number.POSITIVE_INFINITY;

        for (const nodePoint of allNodePoints) {
            const typedNodePoint: AreaTerritoryBackdropAreaNodePoint = nodePoint;
            const distanceSquared: number = this._resolveDistanceSquared(
                centerX,
                centerY,
                typedNodePoint.x,
                typedNodePoint.y
            );

            if (distanceSquared <= enforcementRadiusSquared && distanceSquared < nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
                nearestAreaKey = typedNodePoint.areaKey;
            }
        }

        return nearestAreaKey;
    }

    private _isAreaBlockedByForeignNodes(
        areaKey: string,
        centerX: number,
        centerY: number,
        allNodePoints: AreaTerritoryBackdropAreaNodePoint[],
        enforcementRadiusSquared: number
    ): boolean {
        for (const nodePoint of allNodePoints) {
            const typedNodePoint: AreaTerritoryBackdropAreaNodePoint = nodePoint;

            if (typedNodePoint.areaKey === areaKey) {
                continue;
            }

            const distanceSquared: number = this._resolveDistanceSquared(
                centerX,
                centerY,
                typedNodePoint.x,
                typedNodePoint.y
            );

            if (distanceSquared <= enforcementRadiusSquared) {
                return true;
            }
        }

        return false;
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

    private _buildLabels(gridRows: AreaTerritoryBackdropGridCell[][]): AreaTerritoryBackdropLabel[] {
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

            const labelX: number = totalCenterX / largestComponent.count;
            const labelY: number = totalCenterY / largestComponent.count;
            const rawFontSize: number = Math.sqrt(largestComponent.count) * 3.8;

            const fontSize: number = Math.max(
                this._MINIMUM_LABEL_FONT_SIZE,
                Math.min(this._MAXIMUM_LABEL_FONT_SIZE, rawFontSize)
            );

            labels.push({
                areaKey: typedAreaKey,
                x: labelX,
                y: labelY,
                fontSize
            });
        }

        return labels;
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
