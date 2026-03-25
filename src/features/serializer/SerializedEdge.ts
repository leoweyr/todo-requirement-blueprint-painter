import { type SerializedEdgeHistory } from './SerializedEdgeHistory';


export interface SerializedEdge {
    id: string;
    demand_description: string;
    history: SerializedEdgeHistory[];
}
