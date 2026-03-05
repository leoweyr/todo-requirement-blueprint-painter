import { type PrerenderNode } from './PrerenderNode';
import { type PrerenderEdge } from './PrerenderEdge';


export interface BlueprintPrerenderCombResult {
    prerenderNodes: PrerenderNode[];
    prerenderEdges: PrerenderEdge[];
    contentBounds: { minimumX: number; minimumY: number; maximumX: number; maximumY: number };
    layerGapCenters: number[];  // X-coordinates of the center of gaps between adjacent layers.
}
