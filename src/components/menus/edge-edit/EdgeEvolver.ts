import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { Edge } from '../../../domain/Edge';
import { EdgeHistoryRecord } from '../../../domain/EdgeHistoryRecord';
import { EdgeStatus } from '../../../domain/enums/EdgeStatus';
import { EdgeType } from '../../../domain/enums/EdgeType';
import { EdgeDrawer } from '../../canvas/EdgeDrawer';
import { Node } from '../../../domain/Node';
import { EdgeCreator } from './EdgeCreator';


export class EdgeEvolver {
    public static initiateCut(
        edge: Edge, 
        onStateChange: (reanchoringEdge: Edge, evolutionTargetNode: Node | null, isModalOpen: boolean) => void
    ): void {
        onStateChange(edge, null, true);
    }

    public static initiateReanchor(
        edge: Edge,
        registry: DomainRegistry,
        edgeDrawer: EdgeDrawer | null,
        onStateChange: (reanchoringEdge: Edge) => void
    ): void {
        const downstreamNode: Node | undefined = registry.allNodes.find((node: Node) => node.edges.includes(edge));
        
        if (downstreamNode && edgeDrawer) {
            const latestHistory: EdgeHistoryRecord = edge.history[edge.history.length - 1];
            let strokeColor: string = '#000000';
            let strokeDasharray: string = 'none';

            if (latestHistory) {
                if (latestHistory.status === EdgeStatus.ACTIVE) {
                    strokeColor = '#4CAF50';
                } else if (latestHistory.status === EdgeStatus.DEPRECATED) {
                    strokeColor = '#9E9E9E';
                } else {
                    strokeColor = '#000000';
                }
                
                if (latestHistory.type === EdgeType.OPTIMIZES) {
                    strokeDasharray = '5,5';
                }
            }

            onStateChange(edge);
            edgeDrawer.handleStartEdge(downstreamNode.id, { strokeColor, strokeDasharray });
        }
    }

    public static confirmEvolution(
        registry: DomainRegistry,
        reanchoringEdge: Edge,
        evolutionTargetNode: Node | null,
        reasonName: string,
        onComplete: () => void
    ): void {
        if (reanchoringEdge) {
            if (evolutionTargetNode) {
                // Re-anchoring (Evolve).
                EdgeCreator.evolve(registry, reanchoringEdge, evolutionTargetNode, reasonName);
            } else {
                // Cutting (Delete).
                EdgeCreator.cut(registry, reanchoringEdge, reasonName);
            }
        }

        onComplete();
    }
}
