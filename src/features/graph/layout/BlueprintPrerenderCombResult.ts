import { type PrerenderNode } from '../prerender/PrerenderNode';
import { type PrerenderEdge } from '../prerender/PrerenderEdge';
import { type ContentBounds } from './ContentBounds';


export interface BlueprintPrerenderCombResult {
    prerenderNodes: PrerenderNode[];
    prerenderEdges: PrerenderEdge[];
    contentBounds: ContentBounds;
    layerGapCenters: number[];  // Represents the X-coordinates of the center of gaps between adjacent layers.
    updateTimes: string[];  // Represents a sorted list of all unique edge history update timestamps.
    frames?: Map<number, PrerenderNode[]>;  // Map<TimeIndex, Nodes>. Pre-calculated layout for each timeline version.
    edgeFrames?: Map<number, PrerenderEdge[]>;  // Map<TimeIndex, Edges>. Pre-calculated edges with curvature for each timeline version.
    layerGapFrames?: Map<number, number[]>;  // Map<TimeIndex, LayerGapCenters>. Pre-calculated layer gap positions for each timeline version.
    contentBoundsFrames?: Map<number, ContentBounds>;  // Map<TimeIndex, ContentBounds>. Pre-calculated content bounds for each timeline version.
}
