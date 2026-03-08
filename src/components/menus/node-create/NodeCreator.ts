import { DomainRegistry } from '../../../features/registry/DomainRegistry.ts';
import { NodeStatus } from '../../../domain/NodeStatus.ts';
import { Node } from '../../../domain/Node.ts';


export class NodeCreator {
    public static create(
        registry: DomainRegistry,
        description: string,
        version: string,
        statusName: string,
        metadataJson: string
    ): void {
        const id: string = crypto.randomUUID();
        const updatedAt: string = new Date().toISOString();

        const status: NodeStatus | undefined = registry.getNodeStatus(statusName);

        if (!status) {
            console.error(`NodeStatus '${statusName}' not found in registry.`);
            throw new Error(`NodeStatus '${statusName}' not found.`);
        }

        const node: Node = new Node(
            id,
            description,
            version,
            updatedAt,  // Corrected order: Node constructor expects updatedAt before status based on inspection of Node.ts.
            status,
            metadataJson
        );

        registry.registerNode(node);
    }
}
