import { Component, type ReactNode } from 'react';

import { CanvasViewport } from './CanvasViewport';
import { type PrerenderNode } from '../../features/graph/PrerenderNode';


export interface EdgeDrawerProps {
    viewport: CanvasViewport;
    prerenderNodes: PrerenderNode[];
    onEdgeConnect: (sourceId: string, targetId: string) => void;
}


interface EdgeDrawerState {
    isDrawing: boolean;
    startNodeId: string | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}


export class EdgeDrawer extends Component<EdgeDrawerProps, EdgeDrawerState> {
    public state: EdgeDrawerState = {
        isDrawing: false,
        startNodeId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    };

    private handleGlobalMouseMove: (event: globalThis.MouseEvent) => void = (event: globalThis.MouseEvent): void => {
        if (this.state.isDrawing) {
            const { viewport } = this.props;
            
            // Convert screen coordinates to world coordinates.
            // worldX = (screenX - viewportX) / scale.
            const worldX: number = (event.clientX - viewport.x) / viewport.scale;
            const worldY: number = (event.clientY - viewport.y) / viewport.scale;

            this.setState({
                currentX: worldX,
                currentY: worldY
            });
        }
    };

    public render(): ReactNode {
        const { isDrawing, startX, startY, currentX, currentY } = this.state;

        if (!isDrawing) return null;

        return (
            <svg
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    overflow: 'visible'
                }}
            >
                <line
                    x1={startX}
                    y1={startY}
                    x2={currentX}
                    y2={currentY}
                    stroke="#4CAF50"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                />
                <circle cx={startX} cy={startY} r="4" fill="#4CAF50" />
                <circle cx={currentX} cy={currentY} r="4" fill="#4CAF50" />
            </svg>
        );
    }

    public componentWillUnmount(): void {
        window.removeEventListener('mousemove', this.handleGlobalMouseMove);
    }

    public handleStartEdge(nodeId: string): void {
        const { prerenderNodes } = this.props;
        const nodeProperties = prerenderNodes.find((prerenderNode: PrerenderNode): boolean => prerenderNode.node.id === nodeId);

        if (nodeProperties) {
            // Start from left-center of the node.
            // Approximation of half-height (min-height 80 / 2).
            const startX: number = nodeProperties.x; 
            const startY: number = nodeProperties.y + 40;

            this.setState({
                isDrawing: true,
                startNodeId: nodeId,
                startX: startX,
                startY: startY,
                currentX: startX,
                currentY: startY
            });

            window.addEventListener('mousemove', this.handleGlobalMouseMove);
        }
    }

    public handleCompleteEdge(nodeId: string): void {
        const { isDrawing, startNodeId } = this.state;
        const { onEdgeConnect } = this.props;

        if (isDrawing && startNodeId) {
            onEdgeConnect(startNodeId, nodeId);
            this.stopDrawing();
        }
    }

    public handleCanvasClick(): void {
        if (this.state.isDrawing) {
            this.stopDrawing();
        }
    }

    private stopDrawing(): void {
        this.setState({
            isDrawing: false,
            startNodeId: null
        });

        window.removeEventListener('mousemove', this.handleGlobalMouseMove);
    }
}
