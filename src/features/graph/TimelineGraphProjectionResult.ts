import type { PrerenderEdge } from './PrerenderEdge';
import type { PrerenderNode } from './PrerenderNode';


export interface TimelineGraphProjectionResult {
    displayedNodes: PrerenderNode[];
    displayedEdges: PrerenderEdge[];
}
