import { Node } from '@todo-requirement-blueprint/domain';

export interface PrerenderNode {
    node: Node;
    x: number;
    y: number;
    opacity?: number;  // Defines node opacity in the [0, 1] range for transition animations.
    backgroundColor?: string;  // Defines interpolated background color for status transitions.
    borderColor?: string;  // Defines interpolated border color for status transitions.
}
