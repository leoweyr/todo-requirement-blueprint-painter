import { Component, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Edge } from '@todo-requirement-blueprint/domain';
import { type EdgeHistoryRecord } from '@todo-requirement-blueprint/domain';
import { EdgeType } from '@todo-requirement-blueprint/domain';
import { EdgeStatus } from '@todo-requirement-blueprint/domain';

import { type EdgeWaypoint } from '../../features/graph/prerender/EdgeWaypoint';
import { type PrerenderNode } from '../../features/graph/prerender/PrerenderNode';
import { ReadOnlyView } from '../../features/readonly/ReadOnlyView';


export interface EdgeLineProps {
    edge: Edge;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    sourceNode?: PrerenderNode;
    targetNode?: PrerenderNode;
    labelPositionDivisions?: number;
    labelPositionIndex?: number;
    curvature?: number;
    waypoints?: EdgeWaypoint[];
    opacity?: number;
    historyIndex?: number;  // Optional index to force rendering a specific history version.
    overrideColor?: string;  // Optional color override (e.g., for diff view).
    highlightColor?: string;  // Optional highlight color (e.g. for transition diffs).
    isEditable?: boolean;
    onCut?: () => void;
    onReanchor?: () => void;
}


interface EdgeLineState {
    isHovered: boolean;
}


class EdgeLine extends Component<EdgeLineProps, EdgeLineState> {
    public state: EdgeLineState = {
        isHovered: false
    };

    private _hoverTimeout: number | null = null;

    private _handleMouseEnter: () => void = (): void => {
        if (this._hoverTimeout) {
            window.clearTimeout(this._hoverTimeout);
            this._hoverTimeout = null;
        }

        this.setState({ isHovered: true });
    };

    private _handleMouseLeave: () => void = (): void => {
        this._hoverTimeout = window.setTimeout((): void => {
            this.setState({ isHovered: false });
        }, 100);
    };

    public render(): ReactNode {
        const { 
            edge, 
            startX: propStartX, 
            startY: propStartY, 
            endX: propEndX, 
            endY: propEndY,
            sourceNode,
            targetNode,
            labelPositionDivisions = 2,
            labelPositionIndex = 1,
            curvature = 0,
            waypoints = [],
            opacity = 1,
            historyIndex,
            overrideColor,
            highlightColor,
            isEditable = true,
            onCut,
            onReanchor
        } = this.props;

        const NODE_WIDTH = 200;
        const NODE_HEIGHT = 64;

        const startX = sourceNode ? sourceNode.x : propStartX;
        const startY = sourceNode ? sourceNode.y + NODE_HEIGHT / 2 : propStartY;
        const endX = targetNode ? targetNode.x + NODE_WIDTH : propEndX;
        const endY = targetNode ? targetNode.y + NODE_HEIGHT / 2 : propEndY;

        const { isHovered } = this.state;

        // Determine effective highlight.
        const showHighlight = isHovered || !!highlightColor;
        const effectiveHighlightColor = highlightColor || "rgba(0, 120, 215, 0.3)";
        const effectiveHighlightWidth = highlightColor ? "6pt" : "8pt";  // Slightly thinner for permanent highlights.

        const hasText: boolean = !!edge.demandDescription;

        let tooltipText: string = '';
        let strokeDasharray: string = 'none';
        let strokeColor: string = '#000000';
        let isVisible: boolean = true;
        let lineWidth: string = '1pt';

        if (edge.history && edge.history.length > 0) {
            // Use historyIndex if provided, otherwise latest.
            const index = (historyIndex !== undefined && historyIndex >= 0 && historyIndex < edge.history.length) 
                ? historyIndex 
                : edge.history.length - 1;
                
            const record: EdgeHistoryRecord = edge.history[index];
            const date: Date = new Date(record.updatedAt);
            const dateStr: string = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
            tooltipText = `${record.version} (${dateStr})`;

            // Determine line style based on Type.
            if (record.type === EdgeType.OPTIMIZES) {
                strokeDasharray = '5,5';
            }

            // Determine line color and visibility based on Status.
            if (overrideColor) {
                strokeColor = overrideColor;

                // If overriding color (e.g. diff view), make it slightly thicker.
                lineWidth = '2pt';
            } else {
                switch (record.status) {
                    case EdgeStatus.ACTIVE:
                        strokeColor = '#4CAF50';
                        break;
                    case EdgeStatus.DEPRECATED:
                        strokeColor = '#9E9E9E';
                        break;
                    case EdgeStatus.CUT:
                        isVisible = false;
                        break;
                    default:
                        strokeColor = '#000000';
                        break;
                }
            }
        }

        if (!isVisible && !overrideColor) { 
             // If it is CUT in history, it should not be drawn.
             return null;
        }

        const padding: number = 20;
        const validDivisions: number = Math.max(1, labelPositionDivisions);
        const interpolationRatio: number = labelPositionIndex / validDivisions;
        const normalizedWaypoints: EdgeWaypoint[] = this._normalizeWaypoints(waypoints, startX, startY, endX, endY);
        const hasWaypoints: boolean = normalizedWaypoints.length > 0;

        let pathData: string = '';
        let localStartX: number = 0;
        let localStartY: number = 0;
        let localEndX: number = 0;
        let localEndY: number = 0;
        let labelX: number = 0;
        let labelY: number = 0;
        let left: number = 0;
        let top: number = 0;
        let totalWidth: number = 0;
        let totalHeight: number = 0;

        if (hasWaypoints) {
            const routePoints: EdgeWaypoint[] = [
                { x: startX, y: startY },
                ...normalizedWaypoints,
                { x: endX, y: endY }
            ];

            const routePointXValues: number[] = routePoints.map((routePoint: EdgeWaypoint): number => routePoint.x);
            const routePointYValues: number[] = routePoints.map((routePoint: EdgeWaypoint): number => routePoint.y);
            const minimumX: number = Math.min(...routePointXValues);
            const minimumY: number = Math.min(...routePointYValues);
            const maximumX: number = Math.max(...routePointXValues);
            const maximumY: number = Math.max(...routePointYValues);
            const width: number = maximumX - minimumX;
            const height: number = maximumY - minimumY;

            const localRoutePoints: EdgeWaypoint[] = routePoints.map((routePoint: EdgeWaypoint): EdgeWaypoint => ({
                x: routePoint.x - minimumX + padding,
                y: routePoint.y - minimumY + padding
            }));

            const labelPoint: EdgeWaypoint = this._getPolylinePointByRatio(localRoutePoints, interpolationRatio);

            totalWidth = width + padding * 2;
            totalHeight = height + padding * 2;
            localStartX = localRoutePoints[0].x;
            localStartY = localRoutePoints[0].y;
            localEndX = localRoutePoints[localRoutePoints.length - 1].x;
            localEndY = localRoutePoints[localRoutePoints.length - 1].y;
            labelX = labelPoint.x;
            labelY = labelPoint.y;
            left = minimumX - padding;
            top = minimumY - padding;

            pathData = `M ${localRoutePoints[0].x} ${localRoutePoints[0].y}` +
                localRoutePoints.slice(1).map((routePoint: EdgeWaypoint): string => ` L ${routePoint.x} ${routePoint.y}`).join('');
        } else {
            // Calculate Control Point for Quadratic Bezier Curve.
            // Midpoint + Normal Vector * Curvature.
            const middleX: number = (startX + endX) / 2;
            const middleY: number = (startY + endY) / 2;
            const differenceX: number = endX - startX;
            const differenceY: number = endY - startY;
            const length: number = Math.sqrt(differenceX * differenceX + differenceY * differenceY);

            let controlPointX: number = middleX;
            let controlPointY: number = middleY;

            if (length > 0 && curvature !== 0) {
                const normalX: number = -differenceY / length;
                const normalY: number = differenceX / length;
                controlPointX = middleX + normalX * curvature;
                controlPointY = middleY + normalY * curvature;
            }

            // Bounding Box.
            const minimumX: number = Math.min(startX, endX, controlPointX);
            const minimumY: number = Math.min(startY, endY, controlPointY);
            const maximumX: number = Math.max(startX, endX, controlPointX);
            const maximumY: number = Math.max(startY, endY, controlPointY);
            const width: number = maximumX - minimumX;
            const height: number = maximumY - minimumY;
            const localControlPointX: number = controlPointX - minimumX + padding;
            const localControlPointY: number = controlPointY - minimumY + padding;
            const inverseInterpolationRatio: number = 1 - interpolationRatio;

            totalWidth = width + padding * 2;
            totalHeight = height + padding * 2;
            localStartX = startX - minimumX + padding;
            localStartY = startY - minimumY + padding;
            localEndX = endX - minimumX + padding;
            localEndY = endY - minimumY + padding;
            labelX = (inverseInterpolationRatio * inverseInterpolationRatio * localStartX) + (2 * inverseInterpolationRatio * interpolationRatio * localControlPointX) + (interpolationRatio * interpolationRatio * localEndX);
            labelY = (inverseInterpolationRatio * inverseInterpolationRatio * localStartY) + (2 * inverseInterpolationRatio * interpolationRatio * localControlPointY) + (interpolationRatio * interpolationRatio * localEndY);
            left = minimumX - padding;
            top = minimumY - padding;
            pathData = `M ${localStartX} ${localStartY} Q ${localControlPointX} ${localControlPointY} ${localEndX} ${localEndY}`;
        }

        return (
            <div 
                style={{
                    position: 'absolute',
                    left: left,
                    top: top,
                    width: totalWidth,
                    height: totalHeight,
                    opacity: opacity,
                    pointerEvents: 'none',
                    zIndex: isHovered ? 999 : 0
                }}
            >
                <svg 
                    width={totalWidth} 
                    height={totalHeight} 
                    style={{ display: 'block', overflow: 'visible' }}
                >
                    {/* Highlight Stroke (Visible on hover OR when highlightColor is set). */}
                    {showHighlight && (
                        <>
                            <path 
                                d={pathData} 
                                fill="none"
                                stroke={effectiveHighlightColor} 
                                strokeWidth={effectiveHighlightWidth}
                                strokeLinecap="round"
                                style={{ opacity: highlightColor ? 0.6 : 1 }}  // Make static highlights slightly transparent.
                            />

                            {/* Interactive controls only show on actual Hover, not just static highlight */}
                            {/* Disable interactive controls in read-only mode. */}
                            {isHovered && isEditable && !ReadOnlyView.instance.isReadOnly() && (
                                <>
                                    {/* Red Minus at Start (Downstream Left). */}
                            <g 
                                transform={`translate(${localStartX}, ${localStartY})`} 
                                onClick={(event: MouseEvent): void => {
                                    event.stopPropagation();
                                    if (onCut) onCut();
                                }}
                                onMouseEnter={this._handleMouseEnter}
                                onMouseLeave={this._handleMouseLeave}
                                style={{ cursor: 'pointer', pointerEvents: 'auto', filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' }}
                            >
                                <circle r={11} fill="#FF3B30" stroke="#FFFFFF" strokeWidth={2} />
                                <line x1={-5} y1={0} x2={5} y2={0} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
                            </g>

                            {/* Blue Anchor at End (Upstream Right). */}
                            <g 
                                transform={`translate(${localEndX}, ${localEndY})`} 
                                onClick={(event: MouseEvent): void => {
                                    event.stopPropagation();
                                    if (onReanchor) onReanchor();
                                }}
                                onMouseEnter={this._handleMouseEnter}
                                onMouseLeave={this._handleMouseLeave}
                                style={{ cursor: 'pointer', pointerEvents: 'auto', filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' }}
                            >
                                <circle r={11} fill="#007AFF" stroke="#FFFFFF" strokeWidth={2} />
                                <path d="M0,-3 A1.5,1.5 0 1,1 0,0 A1.5,1.5 0 1,1 0,-3 M0,0 L0,4 M-3,2 Q0,5 3,2" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" transform="scale(1.2)" />
                            </g>
                        </>
                    )}
                </>
            )}

            {/* Visible Line. */}
                    <path 
                        d={pathData} 
                        fill="none"
                        stroke={strokeColor} 
                        strokeWidth={lineWidth}
                        strokeDasharray={strokeDasharray}
                    />

                    {/* Invisible Hit Area (Always present to capture hover). */}
                    <path 
                        d={pathData} 
                        fill="none"
                        stroke="transparent" 
                        strokeWidth="10pt"
                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onMouseEnter={this._handleMouseEnter}
                        onMouseLeave={this._handleMouseLeave}
                    />
                </svg>

                {hasText && (
                    <div 
                        style={this._getLabelContainerStyle(labelX, labelY)}
                        onMouseEnter={this._handleMouseEnter}
                        onMouseLeave={this._handleMouseLeave}
                    >
                        <div style={this._getLabelTextStyle()}>
                            {edge.demandDescription}
                        </div>
                        
                        {isHovered && tooltipText && (
                            <div style={this._getTooltipStyle()}>
                                {tooltipText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    private _normalizeWaypoints(
        waypoints: EdgeWaypoint[],
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): EdgeWaypoint[] {
        const normalizedWaypoints: EdgeWaypoint[] = [];

        waypoints.forEach((waypoint: EdgeWaypoint): void => {
            if (
                waypoint.x === startX &&
                waypoint.y === startY
            ) {
                return;
            }

            if (
                waypoint.x === endX &&
                waypoint.y === endY
            ) {
                return;
            }

            normalizedWaypoints.push(waypoint);
        });

        return normalizedWaypoints;
    }

    private _getPolylinePointByRatio(routePoints: EdgeWaypoint[], ratio: number): EdgeWaypoint {
        if (routePoints.length === 0) {
            return { x: 0, y: 0 };
        }

        if (routePoints.length === 1) {
            return routePoints[0];
        }

        const clampedRatio: number = Math.max(0, Math.min(1, ratio));
        const segmentLengths: number[] = [];
        let totalLength: number = 0;

        for (let index: number = 0; index < routePoints.length - 1; index++) {
            const startPoint: EdgeWaypoint = routePoints[index];
            const endPoint: EdgeWaypoint = routePoints[index + 1];
            const deltaX: number = endPoint.x - startPoint.x;
            const deltaY: number = endPoint.y - startPoint.y;
            const segmentLength: number = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            segmentLengths.push(segmentLength);
            totalLength += segmentLength;
        }

        if (totalLength === 0) {
            return routePoints[0];
        }

        const targetLength: number = totalLength * clampedRatio;
        let traversedLength: number = 0;

        for (let index: number = 0; index < segmentLengths.length; index++) {
            const segmentLength: number = segmentLengths[index];
            const nextTraversedLength: number = traversedLength + segmentLength;

            if (targetLength <= nextTraversedLength) {
                const localRatio: number = segmentLength === 0
                    ? 0
                    : (targetLength - traversedLength) / segmentLength;

                const startPoint: EdgeWaypoint = routePoints[index];
                const endPoint: EdgeWaypoint = routePoints[index + 1];

                return {
                    x: startPoint.x + (endPoint.x - startPoint.x) * localRatio,
                    y: startPoint.y + (endPoint.y - startPoint.y) * localRatio
                };
            }

            traversedLength = nextTraversedLength;
        }

        return routePoints[routePoints.length - 1];
    }

    private _getLabelContainerStyle(centerX: number, centerY: number): CSSProperties {
        return {
            position: 'absolute',
            left: centerX,
            top: centerY,

            // Use translate(-50%, -50%) to center the container on the point.
            // This centers the entire container (label + tooltip).
            // This means the label will shift up slightly when tooltip appears.
            // This is generally acceptable behavior for centered elements.
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',

            // Ensure the label is above the line.
            zIndex: 5,
            cursor: 'default'
        };
    }

    private _getLabelTextStyle(): CSSProperties {
        return {
            backgroundColor: '#ffffff',
            padding: '2px',
            fontSize: '11px',
            fontFamily: 'Helvetica, Arial, sans-serif',
            color: '#000000',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            minWidth: '6pt'
        };
    }

    private _getTooltipStyle(): CSSProperties {
        return {
            marginTop: '2px',
            backgroundColor: '#ffffff',
            border: '1px solid #cccccc',
            borderRadius: '4px',
            padding: '2px 6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#666666',
            fontSize: '9pt',
            fontFamily: 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
        };
    }
}


export default EdgeLine;
