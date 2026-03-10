import { Edge } from '../../domain/Edge';


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
