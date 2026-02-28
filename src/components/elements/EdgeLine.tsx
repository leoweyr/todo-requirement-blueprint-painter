import { Component, type CSSProperties, type ReactNode } from 'react';

import { Edge } from '../../domain/Edge';


export interface EdgeLineProps {
    edge: Edge;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    labelPositionDivisions?: number;  // Total number of divisions for label placement.
    labelPositionIndex?: number;  // Index from the downstream node (start).
}


class EdgeLine extends Component<EdgeLineProps> {
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

        const hasText: boolean = !!edge.demandDescription;

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
                    zIndex: 0
                }}
            >
                <svg 
                    width={totalWidth} 
                    height={totalHeight} 
                    style={{ display: 'block' }}
                >
                    <line 
                        x1={startLocalX} 
                        y1={startLocalY} 
                        x2={endLocalX} 
                        y2={endLocalY} 
                        stroke="#000000" 
                        strokeWidth="1pt"
                    />
                </svg>

                {hasText && (
                    <div style={this.getLabelStyle(labelX, labelY)}>
                        {edge.demandDescription}
                    </div>
                )}
            </div>
        );
    }

    private getLabelStyle(centerX: number, centerY: number): CSSProperties {
        return {
            position: 'absolute',
            left: centerX,
            top: centerY,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            padding: '2px',
            fontSize: '11px',
            fontFamily: 'Helvetica, Arial, sans-serif',
            color: '#000000',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            minWidth: '6pt',
            pointerEvents: 'auto'
        };
    }
}


export default EdgeLine;
