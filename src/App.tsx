import { Component, type ReactNode } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { InfiniteCanvas } from './components/canvas/InfiniteCanvas';


class App extends Component {
    private readonly _viewport: CanvasViewport;

    constructor(props: {}) {
        super(props);

        this._viewport = new CanvasViewport(0, 0, 1);
        
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
        return (
            <InfiniteCanvas viewport={this._viewport}>
                {/* Top: Wisdom (Red). */}
                <div style={{ 
                    position: 'absolute', 
                    left: 0, 
                    top: -150, 
                    width: 100, 
                    height: 100, 
                    background: '#ffcccc', 
                    border: '2px solid red',
                    color: 'red',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    WISDOM
                </div>

                {/* Left: Courage (Blue) */}
                <div style={{ 
                    position: 'absolute', 
                    left: -150, 
                    top: 0, 
                    width: 100, 
                    height: 100, 
                    background: '#ccccff', 
                    border: '2px solid blue',
                    color: 'blue',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    COURAGE
                </div>

                {/* Bottom: Luck (Green). */}
                <div style={{ 
                    position: 'absolute', 
                    left: 0, 
                    top: 150, 
                    width: 100, 
                    height: 100, 
                    background: '#ccffcc', 
                    border: '2px solid green',
                    color: 'green',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    LUCK
                </div>

                {/* Right: Power (Yellow/Gold). */}
                <div style={{ 
                    position: 'absolute', 
                    left: 150, 
                    top: 0, 
                    width: 100, 
                    height: 100, 
                    background: '#ffffcc', 
                    border: '2px solid gold',
                    color: 'goldenrod',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    POWER
                </div>
            </InfiniteCanvas>
        );
    }
}


export default App;
