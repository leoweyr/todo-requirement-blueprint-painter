import { type SerializedNode } from './SerializedNode.ts';


export interface SerializedBlueprint {
    node_statuses?: Record<string, { name: string; description: string }>;
    edge_evolution_reasons?: Record<string, { name: string; description: string }>;
    nodes: SerializedNode[];
}
