import { type SerializedEdgeHistory } from './SerializedEdgeHistory.ts';


export interface SerializedEdge {
    id: string;
    demand_description: string;
    history: SerializedEdgeHistory[];
}
