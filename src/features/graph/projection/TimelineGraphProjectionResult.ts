import type { PrerenderEdge } from '../prerender/PrerenderEdge';
import type { PrerenderNode } from '../prerender/PrerenderNode';


export interface TimelineGraphProjectionResult {
    displayedNodes: PrerenderNode[];
    displayedEdges: PrerenderEdge[];
}
