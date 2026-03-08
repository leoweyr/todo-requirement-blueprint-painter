import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { EdgeEvolutionReason } from '../../../domain/EdgeEvolutionReason';


export class EdgeEvolutionReasonCreator {
    public static create(
        registry: DomainRegistry,
        name: string,
        description: string,
        metadata?: Record<string, unknown>
    ): void {
        if (!name) {
            throw new Error('Edge Evolution Reason name cannot be empty.');
        }

        const existingReason: EdgeEvolutionReason | undefined = registry.allEdgeEvolutionReasons.find(
            (r: EdgeEvolutionReason): boolean => r.name === name
        );

        if (existingReason) {
            throw new Error(`Edge Evolution Reason '${name}' already exists.`);
        }

        try {
            const reason: EdgeEvolutionReason = new EdgeEvolutionReason(name, description, metadata);
            registry.registerEdgeEvolutionReason(reason);
        } catch (error) {
            console.error(`Failed to create Edge Evolution Reason '${name}':`, error);
            throw error;
        }
    }
}
