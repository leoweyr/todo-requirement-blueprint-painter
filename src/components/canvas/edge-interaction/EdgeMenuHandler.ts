import { Edge } from '../../../domain/Edge';


export interface EdgeMenuHandler {
    startEdgeCut(edge: Edge): void;
    setReanchoringEdge(edge: Edge | null): void;
}
