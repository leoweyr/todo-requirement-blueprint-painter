import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { Node } from '../../../domain/Node';
import { Edge } from '../../../domain/Edge';
import { EdgeHistoryRecord } from '../../../domain/EdgeHistoryRecord';
import { EdgeType } from '../../../domain/enums/EdgeType';
import { EdgeStatus } from '../../../domain/enums/EdgeStatus';
import { EdgeEvolutionReason } from '../../../domain/EdgeEvolutionReason';


export class EdgeCreator {
    public static create(
        registry: DomainRegistry,
        sourceNode: Node,
        targetNode: Node,
        demandDescription: string,
        type: EdgeType,
        status: EdgeStatus
    ): void {
        const evolutionReasonName: string = 'INITIAL_MVP';
        let evolutionReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(evolutionReasonName);

        if (!evolutionReason) {
            evolutionReason = new EdgeEvolutionReason(evolutionReasonName, 'Initial minimum viable product.');
            registry.registerEdgeEvolutionReason(evolutionReason, true);
        }

        const id: string = crypto.randomUUID();
        const version: string = '1.0.0';
        const updatedAt: string = new Date().toISOString();

        const historyRecord: EdgeHistoryRecord = new EdgeHistoryRecord(
            version,
            updatedAt,
            type,
            status,
            targetNode,
            evolutionReason
        );

        const edge: Edge = new Edge(id, demandDescription, [historyRecord]);

        sourceNode.addEdge(edge);
    }
}
