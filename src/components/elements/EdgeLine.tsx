import { Component, type CSSProperties, type ReactNode } from 'react';

import { Edge } from '../../domain/Edge';
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
}


interface EdgeLineState {
    isHovered: boolean;
}


class EdgeLine extends Component<EdgeLineProps, EdgeLineState> {
    public state: EdgeLineState = {
        isHovered: false
    };

    private handleMouseEnter: () => void = (): void => {
        this.setState({ isHovered: true });
    };

    private handleMouseLeave: () => void = (): void => {
        this.setState({ isHovered: false });
    };

    public render(): ReactNode {
        const { 
            edge, 
            startX, 
            startY, 
            endX, 
            endY,
            labelPositionDivisions = 2,
            labelPositionIndex = 1
        } = this.props;

        const { isHovered } = this.state;

        const hasText: boolean = !!edge.demandDescription;

        let tooltipText: string = '';
        let strokeDasharray: string = 'none';
        let strokeColor: string = '#000000';
        let isVisible: boolean = true;

        if (edge.history && edge.history.length > 0) {
            const latest = edge.history[edge.history.length - 1];
            const date = new Date(latest.updatedAt);
            const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
            tooltipText = `${latest.version} (${dateStr})`;

            // Determine line style based on Type.
            if (latest.type === EdgeType.OPTIMIZES) {
                strokeDasharray = '5,5';
            }

            // Determine line color and visibility based on Status.
            switch (latest.status) {
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

        if (!isVisible) {
            return null;
        }

        const width: number = Math.abs(endX - startX);
        const height: number = Math.abs(endY - startY);
        const left: number = Math.min(startX, endX);
        const top: number = Math.min(startY, endY);

        const padding: number = 20;

        const startLocalX: number = startX - left + padding;
        const startLocalY: number = startY - top + padding;
        const endLocalX: number = endX - left + padding;
        const endLocalY: number = endY - top + padding;

        const totalWidth: number = width + padding * 2;
        const totalHeight: number = height + padding * 2;

        // Calculate label position based on divisions and index.
        // Position = Start + (End - Start) * (Index / Divisions).
        // Ensure divisions is not zero to avoid division by zero.
        const validDivisions: number = Math.max(1, labelPositionDivisions);
        const ratio: number = labelPositionIndex / validDivisions;
        
        const labelX: number = startLocalX + (endLocalX - startLocalX) * ratio;
        const labelY: number = startLocalY + (endLocalY - startLocalY) * ratio;

        return (
            <div 
                style={{
                    position: 'absolute',
                    left: left - padding,
                    top: top - padding,
                    width: totalWidth,
                    height: totalHeight,
                    pointerEvents: 'none',
                    zIndex: isHovered ? 999 : 0
                }}
            >
                <svg 
                    width={totalWidth} 
                    height={totalHeight} 
                    style={{ display: 'block' }}
                >
                    {/* Highlight Stroke (Visible only when hovered). */}
                    {isHovered && (
                        <line 
                            x1={startLocalX} 
                            y1={startLocalY} 
                            x2={endLocalX} 
                            y2={endLocalY} 
                            stroke="rgba(0, 120, 215, 0.3)" 
                            strokeWidth="8pt"
                            strokeLinecap="round"
                        />
                    )}

                    {/* Visible Line. */}
                    <line 
                        x1={startLocalX} 
                        y1={startLocalY} 
                        x2={endLocalX} 
                        y2={endLocalY} 
                        stroke={strokeColor} 
                        strokeWidth="1pt"
                        strokeDasharray={strokeDasharray}
                    />

                    {/* Invisible Hit Area (Always present to capture hover). */}
                    <line 
                        x1={startLocalX} 
                        y1={startLocalY} 
                        x2={endLocalX} 
                        y2={endLocalY} 
                        stroke="transparent" 
                        strokeWidth="10pt"
                        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                    />
                </svg>

                {hasText && (
                    <div 
                        style={this.getLabelContainerStyle(labelX, labelY)}
                        onMouseEnter={this.handleMouseEnter}
                        onMouseLeave={this.handleMouseLeave}
                    >
                        <div style={this.getLabelTextStyle()}>
                            {edge.demandDescription}
                        </div>
                        
                        {isHovered && tooltipText && (
                            <div style={this.getTooltipStyle()}>
                                {tooltipText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    private getLabelContainerStyle(centerX: number, centerY: number): CSSProperties {
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

    private getLabelTextStyle(): CSSProperties {
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

    private getTooltipStyle(): CSSProperties {
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
