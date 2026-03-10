import { Node } from '../../domain/Node';


export interface GraphNode {
    id: string;
    node: Node;
    layer: number;
    height: number;
    order: number;
}
