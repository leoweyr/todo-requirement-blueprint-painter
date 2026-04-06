import type { CanvasViewport } from './CanvasViewport';


export interface ViewportObserver {
    onViewportChanged(viewport: CanvasViewport): void;
}
