import { Component, type ReactNode, type CSSProperties, type MouseEvent } from 'react';

import { CanvasViewport } from './CanvasViewport';
import { type ViewportObserver } from './ViewportObserver';


export interface InfiniteCanvasProps {
    viewport: CanvasViewport;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
}


interface InfiniteCanvasState {
    isDragging: boolean;
    startX: number;
    startY: number;
    viewportVersion: number;
}


class InfiniteCanvas extends Component<InfiniteCanvasProps, InfiniteCanvasState> implements ViewportObserver {
    private _unsubscribe?: () => void;
    private _containerRef: HTMLDivElement | null = null;

    constructor(props: InfiniteCanvasProps) {
        super(props);
        this.state = {
            isDragging: false,
            startX: 0,
            startY: 0,
            viewportVersion: 0
        };
    }

    public componentDidMount(): void {
        this._unsubscribe = this.props.viewport.subscribe(this);

        // Initialize container size.
        if (this._containerRef) {
            const rect = this._containerRef.getBoundingClientRect();
            this.props.viewport.setContainerSize(rect.width, rect.height);
        }

        // Initialize content bounds.
        // Currently relying on parent updating bounds via viewport methods.
        
        // Add global mouse up/move listener to handle drag outside canvas.
        window.addEventListener('mouseup', this.handleGlobalMouseUp);
        window.addEventListener('mousemove', this.handleGlobalMouseMove);
        
        // Add non-passive wheel listener to prevent browser zoom/scroll.
        if (this._containerRef) {
            this._containerRef.addEventListener('wheel', this.handleNativeWheel, { passive: false });
        }
    }

    public componentWillUnmount(): void {
        if (this._unsubscribe) {
            this._unsubscribe();
        }
        
        window.removeEventListener('mouseup', this.handleGlobalMouseUp);
        window.removeEventListener('mousemove', this.handleGlobalMouseMove);
        
        if (this._containerRef) {
            this._containerRef.removeEventListener('wheel', this.handleNativeWheel);
        }
    }

    public onViewportChanged(viewport: CanvasViewport): void {
        void viewport;

        this.setState((prevState) => ({
            viewportVersion: prevState.viewportVersion + 1
        }));
    }

    public render(): ReactNode {
        const { viewport, children, style, className } = this.props;
        
        const containerStyle: CSSProperties = {
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            cursor: this.state.isDragging ? 'grabbing' : 'grab',
            backgroundColor: '#f5f5f5',  // Default background.
            touchAction: 'none',  // Prevent browser gestures.
            ...style
        };

        const contentStyle: CSSProperties = {
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            willChange: 'transform'
        };

        return (
            <div
                ref={(ref) => { this._containerRef = ref; }}
                className={className}
                style={containerStyle}
                onMouseDown={this.handleMouseDown}
            >
                <div style={contentStyle}>
                    {children}
                </div>
            </div>
        );
    }

    private handleMouseDown = (event: MouseEvent<HTMLDivElement>): void => {
        // Only left click starts drag.
        if (event.button !== 0) return;

        this.setState({
            isDragging: true,
            startX: event.clientX,
            startY: event.clientY
        });
        
        event.preventDefault();  // Prevent text selection.
    };

    private handleGlobalMouseMove = (event: globalThis.MouseEvent): void => {
        if (!this.state.isDragging) return;

        event.preventDefault();

        const deltaX = event.clientX - this.state.startX;
        const deltaY = event.clientY - this.state.startY;

        this.props.viewport.pan(deltaX, deltaY);

        this.setState({
            startX: event.clientX,
            startY: event.clientY
        });
    };

    private handleGlobalMouseUp = (): void => {
        if (this.state.isDragging) {
            this.setState({ isDragging: false });
        }
    };

    private handleNativeWheel = (event: globalThis.WheelEvent): void => {
        event.preventDefault();
        
        // Determine zoom factor.
        const sensitivity = 0.001;
        const delta = -event.deltaY * sensitivity;
        const factor = 1 + delta;

        // Get mouse position relative to container.
        if (this._containerRef) {
            const rect = this._containerRef.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            this.props.viewport.zoom(factor, mouseX, mouseY);
        }
    };
}


export default InfiniteCanvas;
