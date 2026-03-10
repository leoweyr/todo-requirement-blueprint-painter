import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { NodeStatus } from '../../../domain/NodeStatus';


export class NodeStatusCreator {
    public static create(
        registry: DomainRegistry,
        name: string,
        description: string,
        metadata?: Record<string, unknown>
    ): void {
        if (!name) {
            throw new Error('Node Status name cannot be empty.');
        }

        // Check if status already exists.
        if (registry.getNodeStatus(name)) {
            throw new Error(`Node Status '${name}' already exists.`);
        }

        try {
            const status: NodeStatus = new NodeStatus(name, description, metadata);
            registry.registerNodeStatus(status);
        } catch (error) {
            console.error(`Failed to create Node Status '${name}'.`, error);
            throw error;
        }
    }
}
