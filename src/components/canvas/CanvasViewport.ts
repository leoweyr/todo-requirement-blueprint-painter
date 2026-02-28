import { type ViewportObserver } from './ViewportObserver';


export class CanvasViewport {
    private _x: number;
    private _y: number;
    private _scale: number;
    private _observers: Set<ViewportObserver>;

    // New properties for constraints.
    private _minScale: number = 0.1;
    private _contentBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    private _containerSize: { width: number; height: number } | null = null;
    private _padding: number = 50;  // Default padding.

    constructor(initialX: number = 0, initialY: number = 0, initialScale: number = 1) {
        this._x = initialX;
        this._y = initialY;
        this._scale = initialScale;
        this._observers = new Set();
    }

    public setContentBounds(minX: number, minY: number, maxX: number, maxY: number, padding: number = 50): void {
        this._contentBounds = { minX, minY, maxX, maxY };
        this._padding = padding;
        this._recalculateConstraints();
    }

    public setContainerSize(width: number, height: number): void {
        this._containerSize = { width, height };
        this._recalculateConstraints();
    }

    private _recalculateConstraints(): void {
        if (!this._contentBounds || !this._containerSize) return;

        const contentWidth = this._contentBounds.maxX - this._contentBounds.minX + this._padding * 2;
        const contentHeight = this._contentBounds.maxY - this._contentBounds.minY + this._padding * 2;

        const scaleX = this._containerSize.width / contentWidth;
        const scaleY = this._containerSize.height / contentHeight;

        // The minimum scale is the one that fits the content exactly in the container.
        this._minScale = Math.min(scaleX, scaleY);

        // If current scale is less than minScale, reset to minScale.
        if (this._scale < this._minScale) {
            this._scale = this._minScale;
            this._centerContent();
        }
    }

    private _centerContent(): void {
        if (!this._contentBounds || !this._containerSize) return;

        // Calculate center of content.
        const contentCenterX = (this._contentBounds.minX + this._contentBounds.maxX) / 2;
        const contentCenterY = (this._contentBounds.minY + this._contentBounds.maxY) / 2;

        // Center viewport on content center.
        // viewport x/y is the translation applied to content.
        // so to center content point (cx, cy) at screen center (sw/2, sh/2):
        // sw/2 = cx * scale + tx  =>  tx = sw/2 - cx * scale.
        this._x = (this._containerSize.width / 2) - (contentCenterX * this._scale);
        this._y = (this._containerSize.height / 2) - (contentCenterY * this._scale);
        
        this._notifyObservers();
    }

    public get x(): number {
        return this._x;
    }

    public get y(): number {
        return this._y;
    }

    public get scale(): number {
        return this._scale;
    }

    public pan(dx: number, dy: number): void {
        // If at min scale (standard view), panning is disabled.
        if (Math.abs(this._scale - this._minScale) < 0.001) {
            return;
        }

        // Apply pan.
        let newX = this._x + dx;
        let newY = this._y + dy;

        // Constraint: viewport cannot move outside standard view bounds.
        if (this._contentBounds && this._containerSize) {
            const contentWidth = (this._contentBounds.maxX - this._contentBounds.minX + this._padding * 2);
            const contentHeight = (this._contentBounds.maxY - this._contentBounds.minY + this._padding * 2);
            
            const scaledContentWidth = contentWidth * this._scale;
            const scaledContentHeight = contentHeight * this._scale;

            const areaLeft = this._contentBounds.minX - this._padding;
            const areaTop = this._contentBounds.minY - this._padding;
            
            const maxX = -areaLeft * this._scale;
            const minX = this._containerSize.width - scaledContentWidth - areaLeft * this._scale;
            
            const maxY = -areaTop * this._scale;
            const minY = this._containerSize.height - scaledContentHeight - areaTop * this._scale;
            
            newX = Math.min(maxX, Math.max(minX, newX));
            newY = Math.min(maxY, Math.max(minY, newY));
        }

        this._x = newX;
        this._y = newY;
        this._notifyObservers();
    }

    public zoom(factor: number, centerX: number, centerY: number): void {
        const previousScale = this._scale;
        let newScale = this._scale * factor;

        // Limit scale: cannot be smaller than minScale (fit-to-screen).
        newScale = Math.max(this._minScale, Math.min(newScale, 10));
        
        // If hit the floor, snap to center.
        if (Math.abs(newScale - this._minScale) < 0.001) {
            this._scale = this._minScale;
            this._centerContent();
            return;
        }

        // Calculate the ratio of change.
        const scaleRatio = newScale / previousScale;

        // Formula: new_x = mouse_x - (mouse_x - old_x) * scaleRatio.
        // This keeps the point under the mouse fixed relative to the screen.
        let newX = centerX - (centerX - this._x) * scaleRatio;
        let newY = centerY - (centerY - this._y) * scaleRatio;
        
        // Re-apply pan constraints after zoom to ensure we don't zoom out of bounds.
        if (this._contentBounds && this._containerSize) {
            const contentWidth = (this._contentBounds.maxX - this._contentBounds.minX + this._padding * 2);
            const contentHeight = (this._contentBounds.maxY - this._contentBounds.minY + this._padding * 2);
            
            const scaledContentWidth = contentWidth * newScale;
            const scaledContentHeight = contentHeight * newScale;

            const areaLeft = this._contentBounds.minX - this._padding;
            const areaTop = this._contentBounds.minY - this._padding;

            const maxX = -areaLeft * newScale;
            const minX = this._containerSize.width - scaledContentWidth - areaLeft * newScale;
            
            const maxY = -areaTop * newScale;
            const minY = this._containerSize.height - scaledContentHeight - areaTop * newScale;
            
            newX = Math.min(maxX, Math.max(minX, newX));
            newY = Math.min(maxY, Math.max(minY, newY));
        }

        this._x = newX;
        this._y = newY;
        this._scale = newScale;

        this._notifyObservers();
    }

    public subscribe(observer: ViewportObserver): () => void {
        this._observers.add(observer);

        return () => {
            this._observers.delete(observer);
        };
    }

    private _notifyObservers(): void {
        this._observers.forEach((observer) => observer.onViewportChanged(this));
    }
}
