import { Edge } from '@todo-requirement-blueprint/domain';

export interface PrerenderEdge {
    edge: Edge;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    labelPositionDivisions?: number;
    labelPositionIndex?: number;
    curvature?: number;
}
