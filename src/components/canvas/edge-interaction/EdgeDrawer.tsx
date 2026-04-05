import { Component, type ReactNode, type CSSProperties } from 'react';

import { CanvasViewport } from '../CanvasViewport';
import { ReadOnlyView } from '../../../features/readonly/ReadOnlyView';
import { type PrerenderNode } from '../../../features/graph/PrerenderNode';


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
    strokeColor: string;
    strokeDasharray: string;
}


class EdgeDrawer extends Component<EdgeDrawerProps, EdgeDrawerState> {
    private _handleGlobalMouseMove: (event: globalThis.MouseEvent) => void = (event: globalThis.MouseEvent): void => {
        if (this.state.isDrawing) {
            const viewport: CanvasViewport = this.props.viewport;
            
            // Calculate worldX as (screenX - viewportX) / scale.
            // The formula is worldX = (screenX - viewportX) / scale.
            const worldX: number = (event.clientX - viewport.x) / viewport.scale;
            const worldY: number = (event.clientY - viewport.y) / viewport.scale;

            this.setState({
                currentX: worldX,
                currentY: worldY
            });
        }
    };

    public state: EdgeDrawerState = {
        isDrawing: false,
        startNodeId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        strokeColor: '#4CAF50',
        strokeDasharray: '5,5'
    };

    public render(): ReactNode {
        const isDrawing: boolean = this.state.isDrawing;
        const startX: number = this.state.startX;
        const startY: number = this.state.startY;
        const currentX: number = this.state.currentX;
        const currentY: number = this.state.currentY;
        const strokeColor: string = this.state.strokeColor;
        const strokeDasharray: string = this.state.strokeDasharray;

        if (!isDrawing) return null;

        return (
            <svg
                style={this._getSvgStyle()}
            >
                <line
                    x1={startX}
                    y1={startY}
                    x2={currentX}
                    y2={currentY}
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeDasharray={strokeDasharray}
                />
                <circle cx={startX} cy={startY} r="4" fill={strokeColor} />
                <circle cx={currentX} cy={currentY} r="4" fill={strokeColor} />
            </svg>
        );
    }

    public componentWillUnmount(): void {
        window.removeEventListener('mousemove', this._handleGlobalMouseMove);
    }

    private _stopDrawing(): void {
        this.setState({
            isDrawing: false,
            startNodeId: null
        });

        window.removeEventListener('mousemove', this._handleGlobalMouseMove);
    }

    private _getSvgStyle(): CSSProperties {
        return {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
            overflow: 'visible'
        };
    }

    public handleStartEdge(nodeId: string, options?: { strokeColor?: string; strokeDasharray?: string }): void {
        // Disable edge creation in read-only mode.
        if (ReadOnlyView.instance.isReadOnly()) {
            return;
        }

        const prerenderNodes: PrerenderNode[] = this.props.prerenderNodes;
        const nodeProperties: PrerenderNode | undefined = prerenderNodes.find((prerenderNode: PrerenderNode): boolean => prerenderNode.node.id === nodeId);

        if (nodeProperties) {
            // Start from left-center of the node.
            // This is an approximation of half-height (min-height 80 / 2).
            const startX: number = nodeProperties.x;
            const startY: number = nodeProperties.y + 40;

            const strokeColor: string = options?.strokeColor || '#4CAF50';
            const strokeDasharray: string = options?.strokeDasharray || '5,5';

            this.setState({
                isDrawing: true,
                startNodeId: nodeId,
                startX: startX,
                startY: startY,
                currentX: startX,
                currentY: startY,
                strokeColor: strokeColor,
                strokeDasharray: strokeDasharray
            });

            window.addEventListener('mousemove', this._handleGlobalMouseMove);
        }
    }

    public handleCompleteEdge(nodeId: string): boolean {
        const isDrawing: boolean = this.state.isDrawing;
        const startNodeId: string | null = this.state.startNodeId;
        const onEdgeConnect: (sourceId: string, targetId: string) => void = this.props.onEdgeConnect;

        if (isDrawing && startNodeId) {
            onEdgeConnect(startNodeId, nodeId);
            this._stopDrawing();
            return true;
        }

        return false;
    }

    public handleCanvasClick(): void {
        if (this.state.isDrawing) {
            this._stopDrawing();
        }
    }
}


export default EdgeDrawer;
