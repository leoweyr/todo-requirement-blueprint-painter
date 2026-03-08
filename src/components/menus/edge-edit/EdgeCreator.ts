import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { Node } from '../../../domain/Node';
import { Edge } from '../../../domain/Edge';
import { EdgeHistoryRecord } from '../../../domain/EdgeHistoryRecord';
import { EdgeType } from '../../../domain/enums/EdgeType';
import { EdgeStatus } from '../../../domain/enums/EdgeStatus';
import { EdgeEvolutionReason } from '../../../domain/EdgeEvolutionReason';


export class EdgeCreator {
    public static connect(
        registry: DomainRegistry,
        sourceId: string, 
        targetId: string,
        onConnect: (sourceNode: Node, targetNode: Node) => void
    ): void {
        const sourceNode: Node | undefined = registry.getNode(sourceId);
        const targetNode: Node | undefined = registry.getNode(targetId);

        if (sourceNode && targetNode) {
            onConnect(sourceNode, targetNode);
        }
    }

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

    public static cut(
        registry: DomainRegistry,
        edge: Edge,
        reasonName: string
    ): void {
        const evolutionReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(reasonName);

        if (!evolutionReason) {
            console.error(`Evolution reason '${reasonName}' not found.`);
            return;
        }

        edge.markLatestAsCut(evolutionReason);
    }

    public static evolve(
        registry: DomainRegistry,
        edge: Edge,
        newTargetUpstream: Node,
        reasonName: string
    ): void {
        // Find Evolution Reason.
        const evolutionReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(reasonName);

        if (!evolutionReason) {
            console.error(`Evolution reason '${reasonName}' not found.`);
            return;
        }

        const history: EdgeHistoryRecord[] = edge.history;

        if (history.length === 0) return;

        // Capture properties from the last active record.
        const originalRecord: EdgeHistoryRecord = history[history.length - 1];

        // Create new record for the new target (Evolve).
        // This implicitly ends the previous relationship in the timeline.
        // The old edge is NOT explicitly 'Cut' first, avoiding the creation of two separate versions for one atomic operation.
        
        // Calculate next version (SemVer Major + 1).
        const versionParts: string[] = originalRecord.version.split('.');
        let major: number = parseInt(versionParts[0], 10);

        if (isNaN(major)) major = 0;
        
        const newVersion: string = `${major + 1}.0.0`;
        const updatedAt: string = new Date().toISOString();

        const newRecord: EdgeHistoryRecord = new EdgeHistoryRecord(
            newVersion,
            updatedAt,
            originalRecord.type,
            originalRecord.status,  // Keep original status (Active/Deprecated).
            newTargetUpstream,
            evolutionReason
        );

        edge.addHistoryRecord(newRecord);
    }
}
