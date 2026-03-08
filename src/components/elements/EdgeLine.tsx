import { Component, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

import { Edge } from '../../domain/Edge';
import { type EdgeHistoryRecord } from "../../domain/EdgeHistoryRecord";
import { EdgeType } from '../../domain/enums/EdgeType';
import { EdgeStatus } from '../../domain/enums/EdgeStatus';


export interface EdgeLineProps {
    edge: Edge;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    labelPositionDivisions?: number;
    labelPositionIndex?: number;
    curvature?: number;
    historyIndex?: number;  // Optional index to force rendering a specific history version.
    overrideColor?: string;  // Optional color override (e.g., for diff view).
    highlightColor?: string;  // Optional highlight color (e.g. for transition diffs).
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
            startX, 
            startY, 
            endX, 
            endY,
            labelPositionDivisions = 2,
            labelPositionIndex = 1,
            curvature = 0,
            historyIndex,
            overrideColor,
            highlightColor,
            onCut,
            onReanchor
        } = this.props;

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

        const padding: number = 20;

        // Bounding Box.
        const minimumX: number = Math.min(startX, endX, controlPointX);
        const minimumY: number = Math.min(startY, endY, controlPointY);
        const maximumX: number = Math.max(startX, endX, controlPointX);
        const maximumY: number = Math.max(startY, endY, controlPointY);
        const width: number = maximumX - minimumX;
        const height: number = maximumY - minimumY;

        const totalWidth: number = width + padding * 2;
        const totalHeight: number = height + padding * 2;

        const localStartX: number = startX - minimumX + padding;
        const localStartY: number = startY - minimumY + padding;
        const localEndX: number = endX - minimumX + padding;
        const localEndY: number = endY - minimumY + padding;
        const localControlPointX: number = controlPointX - minimumX + padding;
        const localControlPointY: number = controlPointY - minimumY + padding;

        const left: number = minimumX - padding;
        const top: number = minimumY - padding;

        // Calculate label position based on Bezier curve formula.
        const validDivisions: number = Math.max(1, labelPositionDivisions);
        const interpolationRatio: number = labelPositionIndex / validDivisions;
        const inverseInterpolationRatio: number = 1 - interpolationRatio;
        
        // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2.
        const labelX: number = (inverseInterpolationRatio * inverseInterpolationRatio * localStartX) + (2 * inverseInterpolationRatio * interpolationRatio * localControlPointX) + (interpolationRatio * interpolationRatio * localEndX);
        const labelY: number = (inverseInterpolationRatio * inverseInterpolationRatio * localStartY) + (2 * inverseInterpolationRatio * interpolationRatio * localControlPointY) + (interpolationRatio * interpolationRatio * localEndY);

        // Path Data.
        const pathData: string = `M ${localStartX} ${localStartY} Q ${localControlPointX} ${localControlPointY} ${localEndX} ${localEndY}`;

        return (
            <div 
                style={{
                    position: 'absolute',
                    left: left,
                    top: top,
                    width: totalWidth,
                    height: totalHeight,
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
                            {isHovered && (
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
