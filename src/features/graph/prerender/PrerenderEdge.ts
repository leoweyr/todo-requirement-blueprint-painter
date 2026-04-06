import { Edge } from '@todo-requirement-blueprint/domain';

import { type EdgeWaypoint } from './EdgeWaypoint';


export interface PrerenderEdge {
    edge: Edge;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    labelPositionDivisions?: number;
    labelPositionIndex?: number;
    curvature?: number;
    opacity?: number;  // Defines the edge opacity in the [0, 1] range for transition animations.
    waypoints?: EdgeWaypoint[];  // Defines intermediate points for cross-layer edges.
}
