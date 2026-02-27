import yaml from 'js-yaml';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import { DomainRegistry } from '../registry/DomainRegistry.ts';
import { type SerializedBlueprint } from './SerializedBlueprint.ts';
import { NodeStatus } from '../../domain/NodeStatus.ts';
import { EdgeEvolutionReason } from '../../domain/EdgeEvolutionReason.ts';
import { type SerializedNode } from './SerializedNode.ts';
import { Node } from '../../domain/Node.ts';
import { type SerializedEdge } from './SerializedEdge.ts';
import { type SerializedEdgeHistory } from './SerializedEdgeHistory.ts';
import { EdgeHistoryRecord } from '../../domain/EdgeHistoryRecord.ts';
import { Edge } from '../../domain/Edge.ts';


export class BlueprintSerializer {
    public static async fromYaml(yamlString: string, registry: DomainRegistry, trbVersion?: string): Promise<void> {
        let version: string | undefined = trbVersion;
        let data: unknown;

        try {
            data = yaml.load(yamlString, { schema: yaml.JSON_SCHEMA });
        } catch (error) {
            throw new Error(`YAML Parse Error: ${(error as Error).message}`);
        }

        if (!version) {
            // Try to extract version from $schema or other convention if parameter is empty.
            const schemaCommentMatch: RegExpMatchArray | null = yamlString.match(
                /#\s*yaml-language-server:\s*\$schema=.*\/schemas\/(v[\d.]+)\/trb\.schema\.json/
            );

            if (schemaCommentMatch && schemaCommentMatch[1]) {
                version = schemaCommentMatch[1];
            }
        }

        if (!version) {
             throw new Error('TRB Schema version not provided and could not be inferred from YAML content (missing or invalid $schema).');
        }

        // Fetch schema from remote.
        const schemaUrl = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${version}/trb.schema.json`;
        let schema: any;

        try {
            const response = await fetch(schemaUrl);

            if (!response.ok) {
                throw new Error(
                    `Remote schema not found or inaccessible: ${schemaUrl} (${response.status} ${response.statusText})`
                );
            }

            schema = await response.json();
        } catch (error) {
             throw new Error(`Failed to fetch remote schema: ${(error as Error).message}`);
        }

        const jsonValidator: Ajv = new Ajv();
        addFormats(jsonValidator);
        
        const validate: ValidateFunction = jsonValidator.compile(schema);

        // Validate the root object (SerializedBlueprint).
        if (!validate(data)) {
            const validationErrors: string = (validate.errors ?? [])
                .map(
                    (validationError: ErrorObject): string => `${validationError.instancePath} ${validationError.message}`
                )
                .join(', ');

            throw new Error(`Schema Validation Error: ${validationErrors}`);
        }

        const blueprintData: SerializedBlueprint = data as SerializedBlueprint;

        // Step 1: Parse and register global dictionaries (NodeStatus and EdgeEvolutionReason).
        if (blueprintData.node_statuses) {
            for (const value of Object.values(blueprintData.node_statuses)) {
                if (!registry.getNodeStatus(value.name)) {
                    const status = new NodeStatus(value.name, value.description);

                    registry.registerNodeStatus(status);
                }
            }
        }

        if (blueprintData.edge_evolution_reasons) {
            for (const value of Object.values(blueprintData.edge_evolution_reasons)) {
                if (!registry.getEdgeEvolutionReason(value.name)) {
                    const reason = new EdgeEvolutionReason(value.name, value.description);

                    registry.registerEdgeEvolutionReason(reason);
                }
            }
        }

        const nodesData = blueprintData.nodes;

        // Step 2: Register all nodes (without edges).
        for (const serializedNode of nodesData) {
            // Apply a first-come-first-served strategy for singleton definitions.
            // If the description in YAML differs from the registered one, the existing immutable instance is used.
            let nodeStatus: NodeStatus | undefined = registry.getNodeStatus(serializedNode.status.name);

            if (!nodeStatus) {
                nodeStatus = new NodeStatus(
                    serializedNode.status.name,
                    serializedNode.status.description
                );

                registry.registerNodeStatus(nodeStatus);
            }

            const node: Node = new Node(
                serializedNode.id,
                serializedNode.description,
                serializedNode.version,
                serializedNode.updated_at,
                nodeStatus,
                serializedNode.metadata || {}
            );

            registry.registerNode(node);
        }

        // Step 3: Parse and add edges.
        for (const serializedNode of nodesData) {
            const node = registry.getNode(serializedNode.id);
            
            if (node && serializedNode.edges) {
                serializedNode.edges.forEach((edgeData: SerializedEdge) => {
                    const history: EdgeHistoryRecord[] = edgeData.history.map((historyRecord: SerializedEdgeHistory) => {
                        const upstream: Node | undefined = registry.getNode(historyRecord.target_upstream_id);

                        if (!upstream) {
                             throw new Error(`Upstream node '${historyRecord.target_upstream_id}' not found in registry. Ensure it is loaded before parsing '${serializedNode.id}'.`);
                        }

                        let evolutionReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(historyRecord.evolution_reason.name);

                        if (!evolutionReason) {
                            evolutionReason = new EdgeEvolutionReason(
                                historyRecord.evolution_reason.name,
                                historyRecord.evolution_reason.description
                            );
                            registry.registerEdgeEvolutionReason(evolutionReason);
                        }

                        return new EdgeHistoryRecord(
                            historyRecord.version,
                            historyRecord.updated_at,
                            historyRecord.type,
                            historyRecord.status,
                            upstream,
                            evolutionReason
                        );
                    });

                    const edge: Edge = new Edge(edgeData.id, edgeData.demand_description, history);

                    node.addEdge(edge);
                });
            }
        }
    }

    public static toYaml(registry: DomainRegistry): string {
        const nodeList: Node[] = registry.allNodes;

        // Step 1: Prepare dictionaries.
        const plainDefinitionsStatus: Record<string, { name: string; description: string }> = {};
        const plainDefinitionsReason: Record<string, { name: string; description: string }> = {};

        const getStatusDef = (item: NodeStatus): { name: string; description: string } => {
            if (!plainDefinitionsStatus[item.name]) {
                plainDefinitionsStatus[item.name] = item.toObject();
            }

            return plainDefinitionsStatus[item.name];
        };

        const getReasonDef = (item: EdgeEvolutionReason): { name: string; description: string } => {
            if (!plainDefinitionsReason[item.name]) {
                plainDefinitionsReason[item.name] = item.toObject();
            }

            return plainDefinitionsReason[item.name];
        };

        // Pre-populate with all registry items.
        registry.allNodeStatuses.forEach((status: NodeStatus) => getStatusDef(status));
        registry.allEdgeEvolutionReasons.forEach((reason: EdgeEvolutionReason) => getReasonDef(reason));

        // Step 2: Convert Nodes to Objects, replacing status/reason with references to dictionary objects.
        const serializedNodes: SerializedNode[] = nodeList.map((node: Node) => {
            const obj: SerializedNode = node.toObject();

            // CRITICAL: Reuse the SAME object instance to ensure YAML aliasing works.
            // js-yaml requires Reference Equality (same memory object) to generate anchors (&id/*id).
            // Since node.toObject() returns copies, manual replacement with dictionary references is required.
            
            // Replace Node Status with reference (required for YAML anchors).
            if (node.status) {
                obj.status = getStatusDef(node.status);
            }

            // Replace Edge Evolution Reasons (required for YAML anchors).
            if (obj.edges) {
                obj.edges.forEach((edge: SerializedEdge, index: number) => {
                    const domainEdge: Edge = node.edges[index];
                    if (domainEdge) {
                        edge.history.forEach((historyRecord: SerializedEdgeHistory, historyIndex: number) => {
                            const domainHistoryRecord: EdgeHistoryRecord = domainEdge.history[historyIndex];
                            if (domainHistoryRecord && domainHistoryRecord.evolutionReason) {
                                historyRecord.evolution_reason = getReasonDef(domainHistoryRecord.evolutionReason);
                            }
                        });
                    }
                });
            }
            
            return obj;
        });

        const serializedBlueprint: SerializedBlueprint = {
            node_statuses: Object.keys(plainDefinitionsStatus).length > 0 ? plainDefinitionsStatus : undefined,
            edge_evolution_reasons: Object.keys(plainDefinitionsReason).length > 0 ? plainDefinitionsReason : undefined,
            nodes: serializedNodes
        };

        // Step 3: Dump.
        // Use noRefs: false (default) to allow aliases. 
        return yaml.dump(serializedBlueprint, { noRefs: false });
    }
}
