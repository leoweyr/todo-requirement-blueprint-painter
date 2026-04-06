import type { LegendScreenBounds } from '../../components/canvas/legend/LegendScreenBounds';
import { type CanvasViewport } from '../../components/canvas/viewport/CanvasViewport';
import type { PrerenderNode } from './PrerenderNode';


export interface RenderRepulsionApplyOptions {
    nodes: PrerenderNode[];
    legendBounds: LegendScreenBounds | null;
    viewport: CanvasViewport;
    nodeWidth: number;
    nodeHeight: number;
    repulsionMargin: number;
}
