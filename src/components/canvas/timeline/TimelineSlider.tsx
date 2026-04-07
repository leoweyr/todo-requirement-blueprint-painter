import { Component, type CSSProperties, type ReactNode, type WheelEvent, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';

import type { TimelineSnapToNearestTickOptions } from './TimelineSnapToNearestTickOptions';


export interface TimelineSliderProps {
    updateTimes: string[];

    // Callback function that returns the index of the time point and whether it is the transition phase AFTER that time point.
    // If isTransition is true, the slider is between index and index+1.
    // rawPosition provides the exact float value (0.0 to length-1) for smooth interpolation.
    onTimeChange: (timeIndex: number, isTransition: boolean, rawPosition: number) => void;
}

interface TimelineSliderState {
    // Represents the current logical position on the timeline.
    // Integer values represent specific time points (versions).
    // Values ending in .5 represent transition points between versions.
    currentPosition: number; 
    
    // Represents the visual offset of the ruler (in pixels).
    // Corresponds to the scroll position of the timeline view.
    viewOffset: number;

    isDragging: boolean;
    startX: number;
    
    // Used for edge interaction feedback.
    isLeftEdgeActive: boolean;
    isRightEdgeActive: boolean;

    // Used for keyboard-driven boundary feedback.
    isKeyboardBoundaryActive: boolean;

    // Used for keyboard-driven expansion.
    isKeyboardActive: boolean;
    keyboardHeightTransitionMilliseconds: number;

    // Used to soften boundary rebound for specific keyboard flows.
    isSoftKeyboardBoundaryRebound: boolean;
}

export class TimelineSlider extends Component<TimelineSliderProps, TimelineSliderState> {
    private readonly _VISIBLE_WINDOW_WIDTH: number = 800;
    private readonly _TICK_SPACING: number = 80;  // Increased to prevent text overlap.
    private readonly _EDGE_SCROLL_ZONE: number = 50;  // Pixels from the edge to trigger scroll.

    private _containerRef: HTMLDivElement | null = null;
    private _dragMouseToCursorOffsetPixels: number = 0;

    private _handleMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void = (event: ReactMouseEvent<HTMLDivElement>): void => {
        if (event.button !== 0) return;  // Only allow left click.
        
        event.preventDefault();
        event.stopPropagation();

        const containerLeft: number = this._resolveContainerLeft();
        const cursorLeft: number = this._resolveCursorLeft(this.state.currentPosition, this.state.viewOffset);
        const cursorScreenX: number = containerLeft + cursorLeft;
        this._dragMouseToCursorOffsetPixels = event.clientX - cursorScreenX;
        
        this.setState({
            isDragging: true,
            startX: event.clientX
        });
    };

    private _handleTouchStart: (event: ReactTouchEvent<HTMLDivElement>) => void = (event: ReactTouchEvent<HTMLDivElement>): void => {
        if (event.touches.length !== 1) return;  // Only handle single touch.

        event.preventDefault();
        event.stopPropagation();

        const touch: React.Touch = event.touches[0];
        const containerLeft: number = this._resolveContainerLeft();
        const cursorLeft: number = this._resolveCursorLeft(this.state.currentPosition, this.state.viewOffset);
        const cursorScreenX: number = containerLeft + cursorLeft;
        this._dragMouseToCursorOffsetPixels = touch.clientX - cursorScreenX;

        this.setState({
            isDragging: true,
            startX: touch.clientX
        });
    };

    private _handleGlobalMouseUp: () => void = (): void => {
        if (this.state.isDragging) {
             const { currentPosition } = this.state;
             const snapped: number = Math.round(currentPosition * 2) / 2;
              
             this._updatePosition(snapped - currentPosition);
             this._dragMouseToCursorOffsetPixels = 0;
              
             this.setState({ isDragging: false });
        }
    };

    private _handleGlobalTouchEnd: () => void = (): void => {
        if (this.state.isDragging) {
            const { currentPosition } = this.state;
            const snapped: number = Math.round(currentPosition * 2) / 2;

            this._updatePosition(snapped - currentPosition);
            this._dragMouseToCursorOffsetPixels = 0;

            this.setState({ isDragging: false });
        }
    };

    private _handleWheel: (event: WheelEvent<HTMLDivElement>) => void = (event: WheelEvent<HTMLDivElement>): void => {
        event.stopPropagation();
        
        const delta: number = event.deltaY > 0 ? 0.5 : -0.5;

        this._updatePosition(delta);
    };

    private _handleGlobalMouseMove: (event: globalThis.MouseEvent) => void = (event: globalThis.MouseEvent): void => {
        if (!this.state.isDragging) return;

        event.preventDefault();

        const containerLeft: number = this._resolveContainerLeft();
        const desiredCursorScreenX: number = event.clientX - this._dragMouseToCursorOffsetPixels;
        const desiredCursorLeft: number = desiredCursorScreenX - containerLeft;
        const pxPerUnit: number = 2 * this._TICK_SPACING;
        const tickOffset: number = this._TICK_SPACING / 2;
        const desiredPosition: number = (desiredCursorLeft + this.state.viewOffset - tickOffset) / pxPerUnit;
        const deltaPosition: number = desiredPosition - this.state.currentPosition;

        this._updatePosition(deltaPosition, true);  // True indicates dragging.
    };

    private _handleGlobalTouchMove: (event: globalThis.TouchEvent) => void = (event: globalThis.TouchEvent): void => {
        if (!this.state.isDragging) return;

        if (event.touches.length !== 1) return;

        event.preventDefault();

        const touch: globalThis.Touch = event.touches[0];
        const containerLeft: number = this._resolveContainerLeft();
        const desiredCursorScreenX: number = touch.clientX - this._dragMouseToCursorOffsetPixels;
        const desiredCursorLeft: number = desiredCursorScreenX - containerLeft;
        const pxPerUnit: number = 2 * this._TICK_SPACING;
        const tickOffset: number = this._TICK_SPACING / 2;
        const desiredPosition: number = (desiredCursorLeft + this.state.viewOffset - tickOffset) / pxPerUnit;
        const deltaPosition: number = desiredPosition - this.state.currentPosition;

        this._updatePosition(deltaPosition, true);  // True indicates dragging.
    };
    
    constructor(props: TimelineSliderProps) {
        super(props);
        const maxIndex: number = Math.max(0, props.updateTimes.length - 1);
        
        // Initial view: centers the latest version.
        // Ensure the cursor (at maxIndex) is visible.
        // Ruler total width equals maxIndex * 2 * TICK_SPACING.
        // The viewOffset should be such that the cursor is somewhat centered or visible.
        const pxPerUnit: number = 2 * this._TICK_SPACING;
        
        // Default: center the cursor.
        const initialViewOffset: number = ((maxIndex * pxPerUnit) - this._VISIBLE_WINDOW_WIDTH / 2);
        
        // Clamp view offset.
        // Min: -padding (allow some whitespace).
        // Max: contentWidth - visibleWidth + padding.
        // Keep it simple: just center the cursor.
        
        this.state = {
            currentPosition: maxIndex,
            viewOffset: initialViewOffset,
            isDragging: false,
            startX: 0,
            isLeftEdgeActive: false,
            isRightEdgeActive: false,
            isKeyboardBoundaryActive: false,
            isKeyboardActive: false,
            keyboardHeightTransitionMilliseconds: 200,
            isSoftKeyboardBoundaryRebound: false
        };
    }

    public render(): ReactNode {
        const { updateTimes } = this.props;

        if (updateTimes.length === 0) return null;

        return (
            <div
                ref={(ref: HTMLDivElement | null): void => { this._containerRef = ref; }}
                style={this._getContainerStyle()}
                onWheel={this._handleWheel}
                onMouseDown={this._handleMouseDown}
                onTouchStart={this._handleTouchStart}
            >
                <div style={this._getVisualBgStyle()} />

                {/* Labels Layer - Outside clipping mask, moves with ruler. */}
                <div style={this._getRulerStyle()}>
                    {this._renderLabels()}
                </div>

                <div style={this._getClippingMaskStyle()}>
                    <div style={this._getRulerStyle()}>
                        {this._renderTicks()}
                    </div>
                </div>

                {this._renderCursor()}
            </div>
        );
    }

    public componentDidMount(): void {
        window.addEventListener('mousemove', this._handleGlobalMouseMove);
        window.addEventListener('mouseup', this._handleGlobalMouseUp);
        window.addEventListener('touchmove', this._handleGlobalTouchMove, { passive: false });
        window.addEventListener('touchend', this._handleGlobalTouchEnd);
        window.addEventListener('touchcancel', this._handleGlobalTouchEnd);
    }

    public componentWillUnmount(): void {
        window.removeEventListener('mousemove', this._handleGlobalMouseMove);
        window.removeEventListener('mouseup', this._handleGlobalMouseUp);
        window.removeEventListener('touchmove', this._handleGlobalTouchMove);
        window.removeEventListener('touchend', this._handleGlobalTouchEnd);
        window.removeEventListener('touchcancel', this._handleGlobalTouchEnd);
    }

    private _backOutEasing(t: number): number {
        const c1: number = 1.70158;
        const c3: number = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    private _getRulerStyle(): CSSProperties {
        const { viewOffset, isDragging, isKeyboardActive }: TimelineSliderState = this.state;
        const isInteracting: boolean = isDragging || isKeyboardActive;

        return {
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            transform: `translateX(${-viewOffset}px)`,
            transition: isInteracting ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform',
            position: 'absolute',
            left: 0,
            top: 0
        };
    }

    private _renderTicks(): ReactNode {
        const { updateTimes } = this.props;
        const ticks: ReactNode[] = [];

        for (let index: number = 0; index < updateTimes.length; index++) {
            ticks.push(this._renderMajorTick(index));

            if (index < updateTimes.length - 1) {
                ticks.push(this._renderMinorTick(index));
            }
        }

        return ticks;
    }

    private _renderLabels(): ReactNode {
        const { updateTimes } = this.props;
        const { isDragging, isKeyboardActive }: TimelineSliderState = this.state;
        const isExpanded: boolean = isDragging || isKeyboardActive;

        // Only render labels when dragging.
        if (!isExpanded) return null;

        const labels: ReactNode[] = [];

        for (let index: number = 0; index < updateTimes.length; index++) {
            labels.push(this._renderMajorLabel(index));

            // Add spacer for minor tick to keep alignment.
            if (index < updateTimes.length - 1) {
                labels.push(<div key={`spacer-${index}`} style={{ width: `${this._TICK_SPACING}px`, flexShrink: 0 }} />);
            }
        }

        return labels;
    }

    private _renderCursor(): ReactNode {
        const { currentPosition, viewOffset } = this.state;
        const pxPerUnit: number = 2 * this._TICK_SPACING;

        // Cursor position relative to container.
        const cursorLeft: number = (currentPosition * pxPerUnit) - viewOffset + (this._TICK_SPACING / 2);

        const style: CSSProperties = this._getCursorStyle();

        // Override left position.
        const cursorStyle: CSSProperties = {
            ...style,
            left: `${cursorLeft}px`,
            transform: 'translate(-50%, -50%)'  // Keep centered on the point.
        };

        return (
            <div style={cursorStyle}>
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '2px',
                    height: '12px',
                    backgroundColor: '#9ca3af',
                    boxShadow: '3px 0 0 #9ca3af, -3px 0 0 #9ca3af',
                    borderRadius: '1px'
                }} />
            </div>
        );
    }


    private _updatePosition(
        delta: number,
        isDragging: boolean = false,
        isKeyboardDriven: boolean = false,
        isKeyboardStep: boolean = false,
        preserveKeyboardBoundaryFeedback: boolean = false
    ): void {
        const { updateTimes } = this.props;
        const maxPos: number = updateTimes.length - 1;
        const pxPerUnit: number = 2 * this._TICK_SPACING;

        this.setState((prevState: TimelineSliderState): TimelineSliderState => {
            let newPos: number = prevState.currentPosition + delta;

            if (newPos < 0) newPos = 0;

            if (newPos > maxPos) newPos = maxPos;

            // Calculate screen position of cursor.
            // Offset for tick centering (20px).
            const tickOffset: number = this._TICK_SPACING / 2;
            const cursorScreenX: number = (newPos * pxPerUnit) - prevState.viewOffset + tickOffset;

            let newViewOffset: number = prevState.viewOffset;
            let isLeftEdgeActive: boolean = false;
            let isRightEdgeActive: boolean = false;
            let isKeyboardBoundaryActive: boolean = prevState.isKeyboardBoundaryActive;

            const leftZone: number = this._EDGE_SCROLL_ZONE;
            const rightZone: number = this._VISIBLE_WINDOW_WIDTH - this._EDGE_SCROLL_ZONE;

            if (isDragging) {
                // If dragging, check edge constraints and auto-scroll.
                if (cursorScreenX < leftZone) {
                    newViewOffset = (newPos * pxPerUnit) + tickOffset - leftZone;
                    isLeftEdgeActive = true;
                } else if (cursorScreenX > rightZone) {
                    newViewOffset = (newPos * pxPerUnit) + tickOffset - rightZone;
                    isRightEdgeActive = true;
                }
            } else if (isKeyboardDriven) {
                // If keyboard-driven, check container edge for visual feedback.
                const keyboardScrollFactor: number = isKeyboardStep ? 1 : 0.3;

                if (cursorScreenX < leftZone) {
                    isLeftEdgeActive = true;
                    isKeyboardBoundaryActive = true;

                    // Gradual scroll to keep cursor visible.
                    const scrollAmount: number = (leftZone - cursorScreenX) * keyboardScrollFactor;
                    newViewOffset -= scrollAmount;
                } else if (cursorScreenX > rightZone) {
                    isRightEdgeActive = true;
                    isKeyboardBoundaryActive = true;

                    // Gradual scroll to keep cursor visible.
                    const scrollAmount: number = (cursorScreenX - rightZone) * keyboardScrollFactor;
                    newViewOffset += scrollAmount;
                } else {
                    isKeyboardBoundaryActive = false;
                }
            } else {
                // Normal mode (wheel): instant auto-scroll viewport.
                if (!preserveKeyboardBoundaryFeedback) {
                    isKeyboardBoundaryActive = false;
                } else {
                    isLeftEdgeActive = prevState.isLeftEdgeActive;
                    isRightEdgeActive = prevState.isRightEdgeActive;
                }

                const margin: number = 100;

                if (cursorScreenX < margin) {
                    newViewOffset = (newPos * pxPerUnit) - margin;
                } else if (cursorScreenX > this._VISIBLE_WINDOW_WIDTH - margin) {
                    newViewOffset = (newPos * pxPerUnit) - (this._VISIBLE_WINDOW_WIDTH - margin);
                }
            }

            const snapped: number = Math.round(newPos * 2) / 2;
            const isTransition: boolean = snapped % 1 !== 0;
            const index: number = Math.floor(snapped);

            this.props.onTimeChange(index, isTransition, newPos);

            return {
                currentPosition: newPos,
                viewOffset: newViewOffset,
                isLeftEdgeActive,
                isRightEdgeActive,
                isDragging: prevState.isDragging,
                startX: prevState.startX,
                isKeyboardBoundaryActive,
                isKeyboardActive: prevState.isKeyboardActive,
                keyboardHeightTransitionMilliseconds: prevState.keyboardHeightTransitionMilliseconds,
                isSoftKeyboardBoundaryRebound: prevState.isSoftKeyboardBoundaryRebound
            };
        });
    }

    private _renderMajorTick(index: number): ReactNode {
        return (
            <div key={`major-${index}`} style={this._getTickContainerStyle()}>
                <div style={this._getMajorTickMarkStyle()} />
            </div>
        );
    }

    private _renderMajorLabel(index: number): ReactNode {
        const { updateTimes } = this.props;
        const { viewOffset } = this.state;
        const timeStr: string = updateTimes[index];

        const pxPerUnit: number = 2 * this._TICK_SPACING;
        const tickX: number = index * pxPerUnit;
        const screenX: number = tickX - viewOffset + (this._TICK_SPACING / 2);

        // Fade zone width (pixels from edge).
        const FADE_WIDTH: number = 80;

        // Calculate distance from nearest edge.
        const distToLeft: number = screenX;
        const distToRight: number = this._VISIBLE_WINDOW_WIDTH - screenX;
        const distToEdge: number = Math.min(distToLeft, distToRight);

        // Linear opacity: 0 at edge, 1 at FADE_WIDTH.
        let opacity: number = Math.max(0, Math.min(1, distToEdge / FADE_WIDTH));

        // Optimization: Do not render text if invisible.
        if (opacity <= 0.01) {
            return (
                <div key={`label-${index}`} style={{
                    width: `${this._TICK_SPACING}px`,
                    height: '100%',
                    flexShrink: 0
                }} />
            );
        }

        const date: Date = new Date(timeStr);

        // Format: YYYY-MM-DD HH:mm:ss.
        const formatted: string = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0') + ':' +
            String(date.getSeconds()).padStart(2, '0');

        const isTop: boolean = index % 2 === 0;

        return (
            <div key={`label-${index}`} style={{
                width: `${this._TICK_SPACING}px`,
                height: '100%',
                position: 'relative',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{
                    position: 'absolute',
                    [isTop ? 'top' : 'bottom']: '100%',
                    marginTop: isTop ? '8px' : undefined,
                    marginBottom: !isTop ? '8px' : undefined,
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    color: '#4b5563',
                    backgroundColor: `rgba(255,255,255,${0.8 * opacity})`,  // Fade background too.
                    padding: '2px 4px',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    boxShadow: `0 1px 2px rgba(0,0,0,${0.1 * opacity})`,
                    opacity: opacity,  // Apply fade.
                    transition: 'opacity 0.1s linear'
                }}>
                    {formatted}
                </div>
            </div>
        );
    }

    private _renderMinorTick(index: number): ReactNode {
        return (
            <div key={`minor-${index}`} style={this._getTickContainerStyle()}>
                <div style={this._getMinorTickMarkStyle()} />
            </div>
        );
    }

    private _getContainerStyle(): CSSProperties {
        const {
            isDragging,
            isKeyboardActive,
            keyboardHeightTransitionMilliseconds
        }: TimelineSliderState = this.state;

        const isExpanded: boolean = isDragging || isKeyboardActive;

        return {
            position: 'absolute',
            bottom: '80px',  // Raised to accommodate bottom labels.
            left: '50%',
            transform: 'translate(-50%, 50%)',
            width: `${this._VISIBLE_WINDOW_WIDTH}px`,
            height: isExpanded ? '46px' : '14px',
            transition: `height ${keyboardHeightTransitionMilliseconds}ms ease-out`,
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: this.state.isDragging ? 'grabbing' : 'grab',
            zIndex: 1000,
            backgroundColor: 'transparent'
        };
    }

    private _getClippingMaskStyle(): CSSProperties {
        return {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: '12px',
            zIndex: 1,
            pointerEvents: 'none'
        };
    }

    private _getVisualBgStyle(): CSSProperties {
        const {
            isDragging,
            isLeftEdgeActive,
            isRightEdgeActive,
            isKeyboardBoundaryActive,
            isSoftKeyboardBoundaryRebound
        }: TimelineSliderState = this.state;

        const stretchAmount: string = '24px';
        const isStretchingLeft: boolean = (isDragging || isKeyboardBoundaryActive) && isLeftEdgeActive;
        const isStretchingRight: boolean = (isDragging || isKeyboardBoundaryActive) && isRightEdgeActive;
        const isStretching: boolean = isStretchingLeft || isStretchingRight;

        const shouldUseSoftKeyboardBoundaryTransition: boolean =
            isSoftKeyboardBoundaryRebound && isKeyboardBoundaryActive && !isDragging;

        const boundaryTransition: string = shouldUseSoftKeyboardBoundaryTransition
            ? (isStretching ? 'all 0.14s ease-out' : 'all 0.7s ease-out')
            : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        let transform: string = 'translateX(0)';
        let width: string = '100%';
        let boxShadow: string = '0 4px 20px rgba(0,0,0,0.15)';  // Default shadow.

        if (isStretchingLeft) {
            width = `calc(100% + ${stretchAmount})`;
            transform = `translateX(-${stretchAmount})`;
            boxShadow = 'none';  // Remove shadow when stretching.
        } else if (isStretchingRight) {
            width = `calc(100% + ${stretchAmount})`;
            transform = `translateX(0)`;
            boxShadow = 'none';  // Remove shadow when stretching.
        }

        return {
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            backgroundColor: 'rgba(250, 250, 250, 0.95)',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            boxShadow,

            // Elastic dynamics.
            width,
            transform,
            transition: boundaryTransition,
            zIndex: 0
        };
    }

    private _getTickContainerStyle(): CSSProperties {
        return {
            width: `${this._TICK_SPACING}px`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',  // Center vertically.
            flexShrink: 0,
            position: 'relative'  // Allow absolute positioning of labels.
        };
    }

    private _getMajorTickMarkStyle(): CSSProperties {
        return {
            width: '2px',
            height: '30px',  // Tallest.
            backgroundColor: '#374151',
            borderRadius: '1px',
        };
    }

    private _getMinorTickMarkStyle(): CSSProperties {
        return {
            width: '1px',
            height: '20px',  // Taller than idle container (14px).
            backgroundColor: '#9ca3af',
        };
    }

    private _getCursorStyle(): CSSProperties {
        return {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '18px',  // Slightly wider.
            height: '52px',  // Taller than container (32-46px).
            backgroundColor: '#f9fafb',  // Gray-50.
            backgroundImage: 'linear-gradient(to bottom, #ffffff, #f3f4f6)',
            border: '1px solid #9ca3af',
            borderRadius: '6px',
            zIndex: 1001,  // Above mask.
            pointerEvents: 'none',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)'
        };
    }

    private _resolveContainerLeft(): number {
        if (!this._containerRef) {
            return 0;
        }

        return this._containerRef.getBoundingClientRect().left;
    }

    private _resolveCursorLeft(currentPosition: number, viewOffset: number): number {
        const pxPerUnit: number = 2 * this._TICK_SPACING;
        return (currentPosition * pxPerUnit) - viewOffset + (this._TICK_SPACING / 2);
    }

    public getCurrentPosition(): number {
        return this.state.currentPosition;
    }

    public getMaxPosition(): number {
        return this.props.updateTimes.length - 1;
    }

    public moveContinuous(delta: number): void {
        this._updatePosition(delta, false, true, false);
    }

    public jumpTo(delta: number, isKeyboardStep: boolean = false): void {
        const { currentPosition }: TimelineSliderState = this.state;
        const currentInt: number = Math.round(currentPosition);
        const targetPosition: number = currentInt + delta;
        const actualDelta: number = targetPosition - currentPosition;

        if (isKeyboardStep) {
            this._updatePosition(actualDelta, false, true, true);
            return;
        }

        this._updatePosition(actualDelta, false, false, false);
    }

    public setKeyboardActive(isActive: boolean, heightTransitionMilliseconds: number = 200): void {
        this.setState({
            isKeyboardActive: isActive,
            keyboardHeightTransitionMilliseconds: heightTransitionMilliseconds
        });
    }

    public setKeyboardBoundaryReboundSoftMode(isSoftMode: boolean): void {
        this.setState({
            isSoftKeyboardBoundaryRebound: isSoftMode
        });
    }

    public clearKeyboardBoundaryFeedback(): void {
        this.setState({
            isKeyboardBoundaryActive: false,
            isLeftEdgeActive: false,
            isRightEdgeActive: false
        });
    }

    public startKeyboardSynchronizedCollapse(heightTransitionMilliseconds: number): void {
        this.setState({
            isKeyboardBoundaryActive: false,
            isLeftEdgeActive: false,
            isRightEdgeActive: false,
            isKeyboardActive: false,
            keyboardHeightTransitionMilliseconds: heightTransitionMilliseconds
        });
    }

    public snapToNearestTick(options: TimelineSnapToNearestTickOptions = {}): void {
        const { currentPosition }: TimelineSliderState = this.state;

        const {
            durationMilliseconds = 400,
            keepKeyboardExpanded = false,
            preserveKeyboardBoundaryFeedback = false,
            onComplete
        }: TimelineSnapToNearestTickOptions = options;
        const snapped: number = Math.round(currentPosition * 2) / 2;
        const distance: number = snapped - currentPosition;

        if (keepKeyboardExpanded) {
            if (!preserveKeyboardBoundaryFeedback) {
                this.setState({
                    isKeyboardBoundaryActive: false
                });
            }
        } else {
            // Clear keyboard states.
            this.setState({
                isKeyboardBoundaryActive: false,
                isKeyboardActive: false
            });
        }

        // If already at a tick, no animation needed.
        if (Math.abs(distance) < 0.001) {
            if (onComplete) {
                onComplete();
            }

            return;
        }

        // Animate to snapped position.
        const startTime: number = performance.now();
        const duration: number = durationMilliseconds;
        const startPosition: number = currentPosition;

        const animate: () => void = (): void => {
            const elapsed: number = performance.now() - startTime;
            const progress: number = Math.min(elapsed / duration, 1);

            // Use back-out easing similar to cubic-bezier(0.175, 0.885, 0.32, 1.275).
            const easedProgress: number = this._backOutEasing(progress);
            const newPosition: number = startPosition + distance * easedProgress;

            this._updatePosition(
                newPosition - this.state.currentPosition,
                false,
                false,
                false,
                preserveKeyboardBoundaryFeedback
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
                return;
            }

            if (onComplete) {
                onComplete();
            }
        };

        requestAnimationFrame(animate);
    }
}
