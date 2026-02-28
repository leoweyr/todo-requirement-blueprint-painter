import { type NodeRectangleProps } from '../../components/elements/NodeRectangle';
import { type EdgeLineProps } from '../../components/elements/EdgeLine';


export type PrerenderNode = NodeRectangleProps;
export type PrerenderEdge = EdgeLineProps;


export interface BlueprintPrerenderCombResult {
    prerenderNodes: PrerenderNode[];
    prerenderEdges: PrerenderEdge[];
    contentBounds: { minimumX: number; minimumY: number; maximumX: number; maximumY: number };
}
