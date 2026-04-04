import { Edge } from '@todo-requirement-blueprint/domain';

export interface EdgeMenuHandler {
    startEdgeCut(edge: Edge): void;
    setReanchoringEdge(edge: Edge | null): void;
}
