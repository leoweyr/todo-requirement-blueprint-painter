import { Node } from '@todo-requirement-blueprint/domain';

export interface GraphNode {
    id: string;
    node: Node;
    layer: number;
    height: number;
    order: number;
}
