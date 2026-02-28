import { Component, type ReactNode } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { Node } from './domain/Node';
import { Edge } from './domain/Edge';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';
import { NodeRectangle } from './components/elements/NodeRectangle';
import { EdgeLine } from './components/elements/EdgeLine';
import { NodeStatus } from './domain/NodeStatus';


class App extends Component {
    private readonly _viewport: CanvasViewport;
    private readonly _demoNodes: Node[];
    private readonly _demoEdges: Edge[];

    constructor(props: {}) {
        super(props);

        this._viewport = new CanvasViewport(0, 0, 1);
        this._demoNodes = this.createDemoNodes();
        this._demoEdges = this.createDemoEdges();
        
        // Define bounds for a linear layout.
        // Nodes are spaced 300px apart horizontally.
        // Node size approx 160x80 (120pt x 60pt).
        // Wisdom: (0, 0)
        // Courage: (300, 0)
        // Luck: (600, 0)
        // Power: (900, 0)
        
        this._viewport.setContentBounds(-50, -100, 1200, 200, 50);
    }

    public render(): ReactNode {
        const [wisdom, courage, luck, power] = this._demoNodes;
        const [edge1, edge2, edge3] = this._demoEdges;

        // Node positions.
        const p1: { x: number; y: number } = { x: 0, y: 0 };
        const p2: { x: number; y: number } = { x: 300, y: 0 };
        const p3: { x: number; y: number } = { x: 600, y: 0 };
        const p4: { x: number; y: number } = { x: 900, y: 0 };

        // Node dimensions (120pt x 60pt approx 160px x 80px).
        const nodeWidth: number = 160;
        const nodeHeight: number = 80;
        const cy: number = nodeHeight / 2;

        return (
            <InfiniteCanvas viewport={this._viewport}>
                {/* Nodes. */}
                <NodeRectangle node={wisdom} x={p1.x} y={p1.y} />
                <NodeRectangle node={courage} x={p2.x} y={p2.y} />
                <NodeRectangle node={luck} x={p3.x} y={p3.y} />
                <NodeRectangle node={power} x={p4.x} y={p4.y} />

                {/* Edges. */}
                <EdgeLine 
                    edge={edge1}
                    startX={p1.x + nodeWidth}
                    startY={p1.y + cy}
                    endX={p2.x}
                    endY={p2.y + cy}
                />
                <EdgeLine 
                    edge={edge2}
                    startX={p2.x + nodeWidth}
                    startY={p2.y + cy}
                    endX={p3.x}
                    endY={p3.y + cy}
                />
                <EdgeLine 
                    edge={edge3}
                    startX={p3.x + nodeWidth}
                    startY={p3.y + cy}
                    endX={p4.x}
                    endY={p4.y + cy}
                />
            </InfiniteCanvas>
        );
    }

    private createDemoNodes(): Node[] {
        const status: NodeStatus = new NodeStatus('ACTIVE', 'Active node.');
        const now: string = new Date().toISOString();

        return [
            new Node('wisdom', 'WISDOM', '1.0.0', now, status, {}),
            new Node('courage', 'COURAGE', '1.0.0', now, status, {}),
            new Node('luck', 'LUCK', '1.0.0', now, status, {}),
            new Node('power', 'POWER', '1.0.0', now, status, {})
        ];
    }

    private createDemoEdges(): Edge[] {
        return [
            new Edge('edge-1', ''),
            new Edge('edge-2', ''),
            new Edge('edge-3', '')
        ];
    }
}


export default App;
