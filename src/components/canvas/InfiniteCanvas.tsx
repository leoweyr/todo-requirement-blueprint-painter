import { Component, type ReactNode, type CSSProperties, type MouseEvent } from 'react';

import { CanvasViewport } from './CanvasViewport';
import { type ViewportObserver } from './ViewportObserver';
import VerticalDivider from './VerticalDivider';


export interface InfiniteCanvasProps {
    viewport: CanvasViewport;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
    layerGapCenters?: number[];  // X-coordinates for vertical dividers.
    onContextMenu?: (event: MouseEvent) => void;
    // Callback triggered on background click.
    onClick?: (event: MouseEvent) => void;
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

    private _handleMouseDown: (event: MouseEvent<HTMLDivElement>) => void = (event: MouseEvent<HTMLDivElement>): void => {
        // Only left click starts drag.
        if (event.button !== 0) return;

        this.setState({
            isDragging: true,
            startX: event.clientX,
            startY: event.clientY
        });
        
        event.preventDefault();  // Prevent text selection.
    };

    private _handleGlobalMouseMove: (event: globalThis.MouseEvent) => void = (event: globalThis.MouseEvent): void => {
        if (!this.state.isDragging) return;

        event.preventDefault();

        const deltaX: number = event.clientX - this.state.startX;
        const deltaY: number = event.clientY - this.state.startY;

        this.props.viewport.pan(deltaX, deltaY);

        this.setState({
            startX: event.clientX,
            startY: event.clientY
        });
    };

    private _handleGlobalMouseUp: () => void = (): void => {
        if (this.state.isDragging) {
            this.setState({ isDragging: false });
        }
    };

    private _handleNativeWheel: (event: globalThis.WheelEvent) => void = (event: globalThis.WheelEvent): void => {
        event.preventDefault();
        
        // Determine the zoom factor.
        const sensitivity: number = 0.001;
        const delta: number = -event.deltaY * sensitivity;
        const factor: number = 1 + delta;

        // Get mouse position relative to container.
        if (this._containerRef) {
            const rect: DOMRect = this._containerRef.getBoundingClientRect();
            const mouseX: number = event.clientX - rect.left;
            const mouseY: number = event.clientY - rect.top;

            this.props.viewport.zoom(factor, mouseX, mouseY);
        }
    };

    private _handleWindowResize: () => void = (): void => {
        if (this._containerRef) {
            const rect: DOMRect = this._containerRef.getBoundingClientRect();
            this.props.viewport.setContainerSize(rect.width, rect.height);
        }
    };

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
        window.addEventListener('mouseup', this._handleGlobalMouseUp);
        window.addEventListener('mousemove', this._handleGlobalMouseMove);
        
        // Add window resize listener to update viewport container size.
        window.addEventListener('resize', this._handleWindowResize);
        
        // Add non-passive wheel listener to prevent browser zoom/scroll.
        if (this._containerRef) {
            this._containerRef.addEventListener('wheel', this._handleNativeWheel, { passive: false });
        }
    }

    public componentWillUnmount(): void {
        if (this._unsubscribe) {
            this._unsubscribe();
        }
        
        window.removeEventListener('mouseup', this._handleGlobalMouseUp);
        window.removeEventListener('mousemove', this._handleGlobalMouseMove);
        window.removeEventListener('resize', this._handleWindowResize);
        
        if (this._containerRef) {
            this._containerRef.removeEventListener('wheel', this._handleNativeWheel);
        }
    }

    public render(): ReactNode {
        const { viewport, children, style, className, layerGapCenters } = this.props;
        
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

        // Render dividers if data is available.
        const dividers: ReactNode[] | null = layerGapCenters ? layerGapCenters.map((x: number, index: number): ReactNode => (
            <VerticalDivider
                key={`divider-${index}`}
                x={x}
                fullHeight={true}
            />
        )) : null;

        return (
            <div
                ref={(ref: HTMLDivElement | null): void => { this._containerRef = ref; }}
                className={className}
                style={containerStyle}
                onMouseDown={this._handleMouseDown}
                onContextMenu={this.props.onContextMenu}
                onClick={this.props.onClick}
            >
                <div style={contentStyle}>
                    {dividers}
                    {children}
                </div>
            </div>
        );
    }

    public onViewportChanged(viewport: CanvasViewport): void {
        void viewport;

        this.setState((prevState: InfiniteCanvasState) => ({
            viewportVersion: prevState.viewportVersion + 1
        }));
    }
}


export default InfiniteCanvas;
