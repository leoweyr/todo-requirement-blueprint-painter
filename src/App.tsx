import { Component, type ReactNode } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { Node } from './domain/Node';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';
import { NodeRectangle } from './components/elements/NodeRectangle';
import { NodeStatus } from './domain/NodeStatus';


class App extends Component {
    private readonly _viewport: CanvasViewport;
    private readonly _demoNodes: Node[];

    constructor(props: {}) {
        super(props);

        this._viewport = new CanvasViewport(0, 0, 1);
        this._demoNodes = this.createDemoNodes();
        
        // Define bounds for a cross shape layout.
        // Center (0,0) is empty.
        // Top: (0, -150) size 100x100 -> rect: 0, -150, 100, -50.
        // Bottom: (0, 150) size 100x100 -> rect: 0, 150, 100, 250.
        // Left: (-150, 0) size 100x100 -> rect: -150, 0, -50, 100.
        // Right: (150, 0) size 100x100 -> rect: 150, 0, 250, 100.
        
        // Bounds Union:
        // minX: -150 (Left).
        // maxX: 250 (Right + width).
        // minY: -150 (Top).
        // maxY: 250 (Bottom + height).
        
        this._viewport.setContentBounds(-150, -150, 250, 250, 50);
    }

    public render(): ReactNode {
        const [wisdom, courage, luck, power] = this._demoNodes;

        return (
            <InfiniteCanvas viewport={this._viewport}>
                {/* Node: Wisdom (Red) */}
                <div style={{ position: 'absolute', left: 0, top: -150 }}>
                    <NodeRectangle 
                        node={wisdom} 
                    />
                </div>

                {/* Node: Courage (Blue) */}
                <div style={{ position: 'absolute', left: -150, top: 0 }}>
                    <NodeRectangle 
                        node={courage} 
                    />
                </div>

                {/* Node: Luck (Green) */}
                <div style={{ position: 'absolute', left: 0, top: 150 }}>
                    <NodeRectangle 
                        node={luck} 
                    />
                </div>

                {/* Node: Power (Yellow/Gold) */}
                <div style={{ position: 'absolute', left: 150, top: 0 }}>
                    <NodeRectangle 
                        node={power} 
                    />
                </div>
            </InfiniteCanvas>
        );
    }

    private createDemoNodes(): Node[] {
        const status = new NodeStatus('active', 'Active Node');
        const now = new Date().toISOString();

        return [
            new Node('wisdom', 'WISDOM', '1.0.0', now, status, {}),
            new Node('courage', 'COURAGE', '1.0.0', now, status, {}),
            new Node('luck', 'LUCK', '1.0.0', now, status, {}),
            new Node('power', 'POWER', '1.0.0', now, status, {})
        ];
    }
}


export default App;
