import { type PrerenderNode } from './PrerenderNode';
import { type PrerenderEdge } from './PrerenderEdge';


export interface BlueprintPrerenderCombResult {
    prerenderNodes: PrerenderNode[];
    prerenderEdges: PrerenderEdge[];
    contentBounds: { minimumX: number; minimumY: number; maximumX: number; maximumY: number };
    layerGapCenters: number[];  // Represents the X-coordinates of the center of gaps between adjacent layers.
    updateTimes: string[];  // Represents a sorted list of all unique edge history update timestamps.
}
