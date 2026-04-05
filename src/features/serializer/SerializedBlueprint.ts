import { type SerializedNode } from './SerializedNode.ts';


export interface SerializedBlueprint {
    node_statuses?: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }>;
    edge_evolution_reasons?: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }>;
    nodes: SerializedNode[];
}
