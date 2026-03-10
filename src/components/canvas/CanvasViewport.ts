import { type ViewportObserver } from './ViewportObserver';


export class CanvasViewport {
    private _x: number;
    private _y: number;
    private _scale: number;
    private _observers: Set<ViewportObserver>;

    // New properties for constraints.
    private _minimumScale: number = 0.1;
    private _contentBounds: { minimumX: number; minimumY: number; maximumX: number; maximumY: number } | null = null;
    private _containerSize: { width: number; height: number } | null = null;
    private _padding: number = 50;  // Default padding.

    constructor(initialX: number = 0, initialY: number = 0, initialScale: number = 1) {
        this._x = initialX;
        this._y = initialY;
        this._scale = initialScale;
        this._observers = new Set();
    }

    public setContentBounds(minimumX: number, minimumY: number, maximumX: number, maximumY: number, padding: number = 50): void {
        this._contentBounds = { minimumX, minimumY, maximumX, maximumY };
        this._padding = padding;
        this._recalculateConstraints(true);
    }

    public setContainerSize(width: number, height: number): void {
        this._containerSize = { width, height };
        this._recalculateConstraints(false);
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

    public pan(deltaX: number, deltaY: number): void {
        // If at min scale (standard view), panning is disabled.
        if (Math.abs(this._scale - this._minimumScale) < 0.001) {
            return;
        }

        // Apply pan.
        let newX: number = this._x + deltaX;
        let newY: number = this._y + deltaY;

        // Constraint: viewport cannot move outside standard view bounds.
        if (this._contentBounds && this._containerSize) {
            const contentWidth: number = (this._contentBounds.maximumX - this._contentBounds.minimumX + this._padding * 2);
            const contentHeight: number = (this._contentBounds.maximumY - this._contentBounds.minimumY + this._padding * 2);
            
            const scaledContentWidth: number = contentWidth * this._scale;
            const scaledContentHeight: number = contentHeight * this._scale;

            const areaLeft: number = this._contentBounds.minimumX - this._padding;
            const areaTop: number = this._contentBounds.minimumY - this._padding;
            
            const maximumX: number = -areaLeft * this._scale;
            const minimumX: number = this._containerSize.width - scaledContentWidth - areaLeft * this._scale;
            
            const maximumY: number = -areaTop * this._scale;
            const minimumY: number = this._containerSize.height - scaledContentHeight - areaTop * this._scale;
            
            newX = Math.min(maximumX, Math.max(minimumX, newX));
            newY = Math.min(maximumY, Math.max(minimumY, newY));
        }

        this._x = newX;
        this._y = newY;
        this._notifyObservers();
    }

    public zoom(factor: number, centerX: number, centerY: number): void {
        const previousScale: number = this._scale;
        let newScale: number = this._scale * factor;

        // Limit scale: cannot be smaller than minimumScale (fit-to-screen).
        newScale = Math.max(this._minimumScale, Math.min(newScale, 10));
        
        // If hit the floor, snap to center.
        if (Math.abs(newScale - this._minimumScale) < 0.001) {
            this._scale = this._minimumScale;
            this._centerContent();
            return;
        }

        // Calculate the ratio of change.
        const scaleRatio: number = newScale / previousScale;

        // Formula: newX = mouseX - (mouseX - oldX) * scaleRatio.
        // This keeps the point under the mouse fixed relative to the screen.
        let newX: number = centerX - (centerX - this._x) * scaleRatio;
        let newY: number = centerY - (centerY - this._y) * scaleRatio;
        
        // Re-apply pan constraints after zoom to prevent zooming out of bounds.
        if (this._contentBounds && this._containerSize) {
            const contentWidth: number = (this._contentBounds.maximumX - this._contentBounds.minimumX + this._padding * 2);
            const contentHeight: number = (this._contentBounds.maximumY - this._contentBounds.minimumY + this._padding * 2);
            
            const scaledContentWidth: number = contentWidth * newScale;
            const scaledContentHeight: number = contentHeight * newScale;

            const areaLeft: number = this._contentBounds.minimumX - this._padding;
            const areaTop: number = this._contentBounds.minimumY - this._padding;

            const maximumX: number = -areaLeft * newScale;
            const minimumX: number = this._containerSize.width - scaledContentWidth - areaLeft * newScale;
            
            const maximumY: number = -areaTop * newScale;
            const minimumY: number = this._containerSize.height - scaledContentHeight - areaTop * newScale;
            
            newX = Math.min(maximumX, Math.max(minimumX, newX));
            newY = Math.min(maximumY, Math.max(minimumY, newY));
        }

        this._x = newX;
        this._y = newY;
        this._scale = newScale;

        this._notifyObservers();
    }

    public subscribe(observer: ViewportObserver): () => void {
        this._observers.add(observer);

        return (): void => {
            this._observers.delete(observer);
        };
    }

    private _recalculateConstraints(forceFit: boolean = false): void {
        if (!this._contentBounds || !this._containerSize) return;

        // Check if the viewport is currently at the minimum scale (standard view) BEFORE updating it.
        // If so, snap to the new minimum scale and center.
        const isAtMinimumScale: boolean = Math.abs(this._scale - this._minimumScale) < 0.001;

        // Content Width/Height logic:
        // The viewport shows the content bounds plus the padding.
        // The "logical width" to fit is (maximumX - minimumX) + (padding * 2).
        const contentWidth: number = (this._contentBounds.maximumX - this._contentBounds.minimumX) + (this._padding * 2);
        const contentHeight: number = (this._contentBounds.maximumY - this._contentBounds.minimumY) + (this._padding * 2);

        const scaleX: number = this._containerSize.width / contentWidth;
        const scaleY: number = this._containerSize.height / contentHeight;

        // The minimum scale is the one that fits the content exactly in the container.
        this._minimumScale = Math.min(scaleX, scaleY);
        
        // Ensure scale is not too small (e.g. infinite canvas shouldn't shrink to 0.0001).
        if (this._minimumScale === 0) this._minimumScale = 0.0001;

        // Force reset to minimumScale on initialization (forceFit) or if current scale is invalid or if the viewport was at minimum scale.
        if (forceFit || this._scale < this._minimumScale || isAtMinimumScale) {
            this._scale = this._minimumScale;
            this._centerContent();
        }
    }

    private _centerContent(): void {
        if (!this._contentBounds || !this._containerSize) return;

        // Calculate center of content.
        const contentCenterX: number = (this._contentBounds.minimumX + this._contentBounds.maximumX) / 2;
        const contentCenterY: number = (this._contentBounds.minimumY + this._contentBounds.maximumY) / 2;

        // Center viewport on content center.
        // The center of "content + padding" aligns with the center of "content" since padding is symmetric.
        this._x = (this._containerSize.width / 2) - (contentCenterX * this._scale);
        this._y = (this._containerSize.height / 2) - (contentCenterY * this._scale);
        
        this._notifyObservers();
    }

    private _notifyObservers(): void {
        this._observers.forEach((observer: ViewportObserver): void => observer.onViewportChanged(this));
    }
}
