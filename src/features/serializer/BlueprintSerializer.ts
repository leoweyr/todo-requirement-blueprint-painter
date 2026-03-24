import yaml from 'js-yaml';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import { Edge } from '../../domain/Edge';
import { EdgeEvolutionReason } from '../../domain/EdgeEvolutionReason';
import { EdgeHistoryRecord } from '../../domain/EdgeHistoryRecord';
import { Node } from '../../domain/Node';
import { NodeStatus } from '../../domain/NodeStatus';
import { DomainRegistry } from '../registry/DomainRegistry';
import { type SerializedBlueprint } from './SerializedBlueprint';
import { type SerializedEdge } from './SerializedEdge';
import { type SerializedEdgeHistory } from './SerializedEdgeHistory';
import { type SerializedNode } from './SerializedNode';


export class BlueprintSerializer {
    public static async fromYaml(
        yamlString: string, 
        registry: DomainRegistry, 
        trbVersion?: string, 
        blueprintName?: string,
        overwrite: boolean = false
    ): Promise<void> {
        let version: string | undefined = trbVersion;
        let data: unknown;

        if (blueprintName) {
            registry.blueprintName = blueprintName;
        }

        // Extract anchor names from the raw YAML before parsing.
        const anchorMap: Map<string, string> = BlueprintSerializer.extractAnchorNames(yamlString);

        // Extract inline comments from the raw YAML before parsing.
        BlueprintSerializer.extractInlineComments(yamlString, registry);

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

        // If still no version, and partial content is being overwritten, use the registry's current version.
        if (!version && overwrite && registry.trbVersion) {
            version = registry.trbVersion;
        }

        if (!version) {
             throw new Error(
                 'TRB Schema version not provided and could not be inferred from YAML content (missing or invalid $schema).'
             );
        }

        // Validate version compatibility if overwriting (merging) into an existing registry with a set version.
        // If the pasted content has a version different from the registry, check compatibility.
        if (
            overwrite && registry.trbVersion &&
            version !== registry.trbVersion &&
            !BlueprintSerializer.isVersionCompatible(version, registry.trbVersion)
        ) {
            throw new Error(
                `Incompatible Todo Requirement Blueprint versions. Current: ${registry.trbVersion}, Incoming: ${version}. Merge operation cancelled.`
            );
        }

        // Only update registry version if not merging/overwriting, or if registry was empty.
        if (!overwrite || !registry.trbVersion) {
            registry.trbVersion = version;
        }

        // Fetch schema from remote ONLY if necessary.
        // If registry already has the correct schema for this version, use it.
        let schema: unknown = registry.schema;
        
        // Check if fetching is required:
        // 1. No schema in registry.
        // 2. Registry version does not match target version (and it is being replaced/set).
        // Note: 'overwrite' mode usually implies keeping the existing version unless an explicit upgrade occurs, 
        // but this case focuses on reloading the SAME version (Undo/Redo).
        const shouldFetch: boolean = !schema || (registry.trbVersion !== version && !overwrite);

        if (shouldFetch) {
            const versionPath: string = version.startsWith('v') ? version : `v${version}`;
            const schemaUrl: string = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;

            const response: Response = await fetch(schemaUrl);

            if (!response.ok) {
                throw new Error(
                    `Remote schema not found or inaccessible: ${schemaUrl} (${response.status} ${response.statusText})`
                );
            }

            schema = await response.json();
            registry.schema = schema;
        }

        const jsonValidator: Ajv = new Ajv();

        addFormats(jsonValidator);
        
        const validate: ValidateFunction = jsonValidator.compile(schema as object);

        // Determine content type and validate accordingly.
        // A full blueprint MUST have 'nodes'.
        const isFullBlueprint: boolean = typeof data === 'object' && data !== null && 'nodes' in data;
        
        // A partial blueprint (dictionaries only) has 'node_statuses' OR 'edge_evolution_reasons' but NO 'nodes'.
        const isPartialDictionaries: boolean = typeof data === 'object' && data !== null && !('nodes' in data) && 
                                               ('node_statuses' in data || 'edge_evolution_reasons' in data);

        const isNode: boolean = typeof data === 'object' && data !== null && 'id' in data && 'description' in data && 'status' in data;
        const isNodeArray: boolean = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'id' in data[0] && 'description' in data[0] && 'status' in data[0];

        if (isFullBlueprint) {
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
            await BlueprintSerializer.processBlueprint(blueprintData, registry, overwrite, anchorMap);
        } else if (isPartialDictionaries) {
            const fakeBlueprint: unknown = { ...data as object, nodes: [] };
            
            if (!validate(fakeBlueprint)) {
                const validationErrors: string = (validate.errors ?? [])
                    .map(
                        (validationError: ErrorObject): string => `${validationError.instancePath} ${validationError.message}`
                    )
                    .join(', ');

                throw new Error(`Dictionary Schema Validation Error: ${validationErrors}`);
            }
            
            const partialData: SerializedBlueprint = data as SerializedBlueprint; 
            await BlueprintSerializer.processBlueprint({ ...partialData, nodes: [] }, registry, overwrite, anchorMap);
        } else if (isNode) {
            // Validate against the Node definition in the schema.
            const schemaObject: { definitions?: { node: object }, $defs?: { node: object } } = schema as { definitions?: { node: object }, $defs?: { node: object } };

            const nodeValidator: ValidateFunction = jsonValidator.compile(
                schemaObject.definitions?.node || schemaObject.$defs?.node || {}
            );
            
            if (!nodeValidator(data)) {
                 const validationErrors: string = (nodeValidator.errors ?? [])
                    .map(
                        (validationError: ErrorObject): string => `${validationError.instancePath} ${validationError.message}`
                    )
                    .join(', ');

                throw new Error(`Node Schema Validation Error: ${validationErrors}`);
            }

            const nodeData: SerializedNode = data as SerializedNode;
            await BlueprintSerializer.processNodes([nodeData], registry, overwrite);
        } else if (isNodeArray) {
             // Validate each node in the array against the Node definition.
             const schemaObject: { definitions?: { node: object }, $defs?: { node: object } } = schema as { definitions?: { node: object }, $defs?: { node: object } };

             const nodeValidator: ValidateFunction = jsonValidator.compile(
                 schemaObject.definitions?.node || schemaObject.$defs?.node || {}
             );

             const nodesList: SerializedNode[] = data as SerializedNode[];

             for (const nodeItem of nodesList) {
                 if (!nodeValidator(nodeItem)) {
                     const validationErrors: string = (nodeValidator.errors ?? [])
                        .map(
                            (validationError: ErrorObject): string => `${validationError.instancePath} ${validationError.message}`
                        )
                        .join(', ');
    
                    throw new Error(`Node Array Schema Validation Error: ${validationErrors}`);
                 }
             }

             await BlueprintSerializer.processNodes(nodesList, registry, overwrite);
        } else {
            throw new Error('Unknown content type. Clipboard data must be a valid Blueprint, Node List, Single Node, or Enum Dictionary.');
        }
    }

    private static async processBlueprint(
        blueprintData: SerializedBlueprint,
        registry: DomainRegistry,
        overwrite: boolean,
        anchorMap: Map<string, string>
    ): Promise<void> {
        // Phase 1: Parse and register global dictionaries (NodeStatus and EdgeEvolutionReason).
        // This ensures that shared definitions are available before individual nodes referencing them are processed.
        if (blueprintData.node_statuses) {
            for (const [key, value] of Object.entries(blueprintData.node_statuses)) {
                const statusName: string = value.name;
                const statusDescription: string = value.description;
                const statusMetadata: Record<string, unknown> | undefined = value.metadata;

                // Look up original anchor name from the map.
                const anchorKey: string = `node_statuses.${key}`;
                const originalAnchor: string | undefined = anchorMap.get(anchorKey);

                if (overwrite || !registry.getNodeStatus(statusName)) {
                    const status: NodeStatus = new NodeStatus(statusName, statusDescription, statusMetadata, originalAnchor);

                    registry.registerNodeStatus(status, overwrite);
                } else {
                    // If status exists and has no anchor, update anchor from import.
                    const existingStatus: NodeStatus | undefined = registry.getNodeStatus(statusName);

                    if (existingStatus && !existingStatus.anchorName && originalAnchor) {
                        existingStatus.anchorName = originalAnchor;
                    }
                }
            }
        }

        if (blueprintData.edge_evolution_reasons) {
            for (const [key, value] of Object.entries(blueprintData.edge_evolution_reasons)) {
                const reasonName: string = value.name;
                const reasonDescription: string = value.description;
                const reasonMetadata: Record<string, unknown> | undefined = value.metadata;

                // Look up original anchor name from the map.
                const anchorKey: string = `edge_evolution_reasons.${key}`;
                const originalAnchor: string | undefined = anchorMap.get(anchorKey);

                if (overwrite || !registry.getEdgeEvolutionReason(reasonName)) {
                    const reason: EdgeEvolutionReason = new EdgeEvolutionReason(reasonName, reasonDescription, reasonMetadata, originalAnchor);

                    registry.registerEdgeEvolutionReason(reason, overwrite);
                } else {
                    // If reason exists and has no anchor, update anchor from import.
                    const existingReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(reasonName);

                    if (existingReason && !existingReason.anchorName && originalAnchor) {
                        existingReason.anchorName = originalAnchor;
                    }
                }
            }
        }

        if (blueprintData.nodes) {
             // Proceed to process nodes and edges (Phases 2 & 3).
             await BlueprintSerializer.processNodes(blueprintData.nodes, registry, overwrite);
        }
    }

    private static async processNodes(nodesData: SerializedNode[], registry: DomainRegistry, overwrite: boolean): Promise<void> {
        // Phase 2: Register all nodes (without edges).
        // This first pass ensures all node IDs exist in the registry before attempt to link them with edges.
        // This handles cases where a node refers to another node that appears later in the list.
        for (const serializedNode of nodesData) {
            const nodeData: SerializedNode = serializedNode;
            
            // Apply a first-come-first-served strategy for singleton definitions.
            // If the description in YAML differs from the registered one, the existing immutable instance is used.
            let nodeStatus: NodeStatus | undefined = registry.getNodeStatus(nodeData.status.name);

            if (!nodeStatus || overwrite) {
                nodeStatus = new NodeStatus(
                    nodeData.status.name,
                    nodeData.status.description,
                    nodeData.status.metadata
                );

                registry.registerNodeStatus(nodeStatus, overwrite);
            }

            const node: Node = new Node(
                nodeData.id,
                nodeData.description,
                nodeData.version,
                nodeData.updated_at,
                nodeStatus,
                nodeData.metadata || {}
            );

            registry.registerNode(node, overwrite);
        }

        // Phase 3: Parse and add edges.
        // Now that all nodes are registered, safely resolve upstream references and build the graph connections.
        for (const serializedNode of nodesData) {
            const nodeData: SerializedNode = serializedNode;
            const node: Node | undefined = registry.getNode(nodeData.id);
            
            if (node && nodeData.edges) {
                nodeData.edges.forEach((edgeData: SerializedEdge): void => {
                    const history: EdgeHistoryRecord[] = edgeData.history.map((historyRecord: SerializedEdgeHistory): EdgeHistoryRecord => {
                        const upstream: Node | undefined = registry.getNode(historyRecord.target_upstream_id);

                        if (!upstream) {
                             throw new Error(`Upstream node '${historyRecord.target_upstream_id}' not found in registry. Ensure it is loaded before parsing '${nodeData.id}'.`);
                        }

                        let evolutionReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(historyRecord.evolution_reason.name);

                        if (!evolutionReason) {
                            evolutionReason = new EdgeEvolutionReason(
                                historyRecord.evolution_reason.name,
                                historyRecord.evolution_reason.description,
                                historyRecord.evolution_reason.metadata
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

    private static isVersionCompatible(incomingVersion: string, currentVersion: string): boolean {
        // Simple Semantic Versioning check (Major.Minor.Patch).
        // Returns true if Major versions match.
        // Remove 'v' prefix if present.
        const v1: string[] = incomingVersion.replace(/^v/, '').split('.');
        const v2: string[] = currentVersion.replace(/^v/, '').split('.');
        
        if (v1.length < 1 || v2.length < 1) {
            return true;  // Loose check if invalid format.
        }

        const major1: number = parseInt(v1[0], 10);
        const major2: number = parseInt(v2[0], 10);

        return major1 === major2;
    }

    public static toYaml(registry: DomainRegistry): string {
        const nodeList: Node[] = registry.allNodes;
        const currentVersion: string = registry.trbVersion;
        
        // Determine if metadata should be included based on version.
        // Assuming semantic versioning vX.Y.Z
        // Remove 'v' prefix if present and check if version >= 1.1.0
        const versionNumber: string = currentVersion.replace(/^v/, '');
        const versionParts: string[] = versionNumber.split('.');
        const major: number = parseInt(versionParts[0], 10);
        const minor: number = parseInt(versionParts[1], 10);
        
        const supportsEnumMetadata: boolean = (major > 1) || (major === 1 && minor >= 1);

        // Phase 1: Prepare dictionaries and build anchor name mappings.
        // Collect all unique NodeStatus and EdgeEvolutionReason objects to create shared definitions.
        const plainDefinitionsStatus: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> = {};
        const plainDefinitionsReason: Record<string, { name: string; description: string; metadata?: Record<string, unknown> }> = {};

        // Maps dictionary key to desired anchor name.
        const statusAnchorMap: Map<string, string> = new Map<string, string>();
        const reasonAnchorMap: Map<string, string> = new Map<string, string>();

        const getStatusDef = (item: NodeStatus): { name: string; description: string; metadata?: Record<string, unknown> } => {
            if (!plainDefinitionsStatus[item.name]) {
                const obj: { name: string; description: string; metadata?: Record<string, unknown> } = item.toObject();
                // Strip metadata if version is under v1.1.0.
                if (!supportsEnumMetadata) {
                    delete obj.metadata;
                }
                plainDefinitionsStatus[item.name] = obj;

                // Determine anchor name: use stored anchor or generate new one.
                const anchorName: string = item.anchorName || `ref_node_status_${item.name.toLowerCase()}`;
                statusAnchorMap.set(item.name, anchorName);
            }

            return plainDefinitionsStatus[item.name];
        };

        const getReasonDef = (item: EdgeEvolutionReason): { name: string; description: string; metadata?: Record<string, unknown> } => {
            if (!plainDefinitionsReason[item.name]) {
                const obj: { name: string; description: string; metadata?: Record<string, unknown> } = item.toObject();
                // Strip metadata if version is under v1.1.0.
                if (!supportsEnumMetadata) {
                    delete obj.metadata;
                }
                plainDefinitionsReason[item.name] = obj;

                // Determine anchor name: use stored anchor or generate new one.
                const anchorName: string = item.anchorName || `ref_edge_evolution_reason_${item.name.toLowerCase()}`;
                reasonAnchorMap.set(item.name, anchorName);
            }

            return plainDefinitionsReason[item.name];
        };

        // Pre-populate with all registry items.
        registry.allNodeStatuses.forEach((status: NodeStatus): void => { getStatusDef(status); });
        registry.allEdgeEvolutionReasons.forEach((reason: EdgeEvolutionReason): void => { getReasonDef(reason); });

        // Phase 2: Convert Nodes to Objects, replacing status/reason with references to dictionary objects.
        // This ensures that the YAML output uses anchors and aliases for repeated definitions.
        const serializedNodes: SerializedNode[] = nodeList.map((node: Node): SerializedNode => {
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
                obj.edges.forEach((edge: SerializedEdge, index: number): void => {
                    const domainEdge: Edge = node.edges[index];
                    if (domainEdge) {
                        edge.history.forEach((historyRecord: SerializedEdgeHistory, historyIndex: number): void => {
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

        // Phase 3: Generate YAML string.
        // Use noRefs: false (default) to allow aliases which makes the blueprint more compact and maintainable.
        const yamlOutput: string = yaml.dump(serializedBlueprint, { noRefs: false });
        
        // Phase 4: Post-process YAML to use meaningful anchor names.
        const anchorProcessedYaml: string = BlueprintSerializer.postProcessYamlAnchors(yamlOutput, statusAnchorMap, reasonAnchorMap);

        // Phase 5: Format YAML with proper spacing between sections and items.
        const formattedYaml: string = BlueprintSerializer.formatYamlSpacing(anchorProcessedYaml);

        // Phase 6: Restore inline comments from registry.
        const commentedYaml: string = BlueprintSerializer.restoreInlineComments(formattedYaml, registry);

        if (!registry.trbVersion) {
             throw new Error('TRB Schema version is not set in registry. Cannot serialize blueprint.');
        }

        const versionPath: string = registry.trbVersion.startsWith('v') ? registry.trbVersion : `v${registry.trbVersion}`;
        const schemaUrl = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;
        const header: string = `# yaml-language-server: $schema=${schemaUrl}\n\n\n`;

        return header + commentedYaml;
    }

    private static postProcessYamlAnchors(
        yamlString: string,
        statusAnchorMap: Map<string, string>,
        reasonAnchorMap: Map<string, string>
    ): string {
        // Regex to find anchor definitions in dictionary keys.
        // Matches "  Key: &ref_N" (2 spaces indentation for top-level dictionary keys).
        const anchorDefinitionRegex = /^  ([a-zA-Z0-9_-]+):\s*&(ref_\d+)/gm;
        
        let match: RegExpExecArray | null;
        const replacements: Map<string, string> = new Map<string, string>();
        
        while ((match = anchorDefinitionRegex.exec(yamlString)) !== null) {
            const key: string = match[1];
            const ref: string = match[2];
            
            // Look up the desired anchor name from our maps.
            let targetAnchor: string | undefined = statusAnchorMap.get(key);

            if (!targetAnchor) {
                targetAnchor = reasonAnchorMap.get(key);
            }
            
            if (targetAnchor) {
                replacements.set(ref, targetAnchor);
            }
        }
        
        let result: string = yamlString;
        
        // Apply replacements sorted by ref length (longest first to avoid partial replacements).
        const sortedRefs: string[] = Array.from(replacements.keys()).sort(
            (refA: string, refB: string): number => refB.length - refA.length
        );
        
        for (const ref of sortedRefs) {
            const newName: string = replacements.get(ref)!;
            
            // Replace Definition: &ref_N -> &newName (with word boundary).
            result = result.replace(new RegExp(`&${ref}\\b`, 'g'), `&${newName}`);
            
            // Replace Reference: *ref_N -> *newName (with word boundary).
            result = result.replace(new RegExp(`\\*${ref}\\b`, 'g'), `*${newName}`);
        }
        
        return result;
    }

    private static extractAnchorNames(yamlString: string): Map<string, string> {
        const anchorMap: Map<string, string> = new Map<string, string>();
        
        // Parse YAML to detect which section we are in (node_statuses or edge_evolution_reasons).
        // Then capture anchor definitions like "KEY: &anchor_name".
        const lines: string[] = yamlString.split('\n');
        let currentSection: string | null = null;
        
        for (const line of lines) {
            // Detect section headers (top-level keys ending with colon).
            if (line.match(/^node_statuses:\s*$/)) {
                currentSection = 'node_statuses';
                continue;
            } else if (line.match(/^edge_evolution_reasons:\s*$/)) {
                currentSection = 'edge_evolution_reasons';
                continue;
            } else if (line.match(/^nodes:\s*$/)) {
                currentSection = 'nodes';
                continue;
            } else if (line.match(/^[a-z_]+:\s*$/)) {
                // Any other top-level key exits our tracked sections.
                currentSection = null;
                continue;
            }
            
            // Look for anchor definitions within tracked sections.
            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                // Match lines like "  KEY: &anchor_name" or "  KEY: &anchor_name {...}"
                const anchorMatch: RegExpMatchArray | null = line.match(/^  ([A-Z0-9_]+):\s*&(\S+)/);

                if (anchorMatch) {
                    const key: string = anchorMatch[1];
                    const anchor: string = anchorMatch[2];
                    const mapKey: string = `${currentSection}.${key}`;
                    anchorMap.set(mapKey, anchor);
                }
            }
        }
        
        return anchorMap;
    }

    private static formatYamlSpacing(yamlString: string): string {
        const lines: string[] = yamlString.split('\n');
        const result: string[] = [];
        
        let currentSection: string | null = null;
        let previousLineWasContent: boolean = false;

        for (let index: number = 0; index < lines.length; index++) {
            const line: string = lines[index];
            
            // Detect top-level section headers.
            if (line.match(/^node_statuses:\s*$/)) {
                // Add two blank lines before top-level sections (except if at start).
                if (result.length > 0) {
                    result.push('');
                    result.push('');
                }

                result.push(line);
                currentSection = 'node_statuses';
                previousLineWasContent = false;

                continue;
            } else if (line.match(/^edge_evolution_reasons:\s*$/)) {
                if (result.length > 0) {
                    result.push('');
                    result.push('');
                }

                result.push(line);
                currentSection = 'edge_evolution_reasons';
                previousLineWasContent = false;

                continue;
            } else if (line.match(/^nodes:\s*$/)) {
                if (result.length > 0) {
                    result.push('');
                    result.push('');
                }

                result.push(line);
                currentSection = 'nodes';
                previousLineWasContent = false;

                continue;
            }
            
            // Handle items within sections.
            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                // Detect start of a new enum item (2-space indented key).
                if (line.match(/^  [a-zA-Z0-9_-]+:/)) {
                    if (previousLineWasContent) {
                        result.push('');
                    }

                    result.push(line);
                    previousLineWasContent = true;

                    continue;
                }
            } else if (currentSection === 'nodes') {
                // Detect start of a new node (list item with "- id:").
                if (line.match(/^  - id:/)) {
                    if (previousLineWasContent) {
                        result.push('');
                    }

                    result.push(line);
                    previousLineWasContent = true;

                    continue;
                }
            }
            
            // Regular content line.
            if (line.trim() !== '') {
                previousLineWasContent = true;
            }

            result.push(line);
        }
        
        return result.join('\n');
    }

    private static extractInlineComments(yamlString: string, registry: DomainRegistry): void {
        const lines: string[] = yamlString.split('\n');
        let currentSection: string | null = null;
        let currentEnumKey: string | null = null;
        let currentNodeId: string | null = null;
        let currentEdgeId: string | null = null;

        for (const line of lines) {
            const comment: string | null = BlueprintSerializer.extractCommentFromLine(line);

            // Detect top-level section headers.
            if (line.match(/^node_statuses:/)) {
                currentSection = 'node_statuses';
                currentEnumKey = null;

                if (comment) {
                    registry.setYamlComment('node_statuses', comment);
                }

                continue;
            } else if (line.match(/^edge_evolution_reasons:/)) {
                currentSection = 'edge_evolution_reasons';
                currentEnumKey = null;

                if (comment) {
                    registry.setYamlComment('edge_evolution_reasons', comment);
                }

                continue;
            } else if (line.match(/^nodes:/)) {
                currentSection = 'nodes';
                currentNodeId = null;
                currentEdgeId = null;

                if (comment) {
                    registry.setYamlComment('nodes', comment);
                }

                continue;
            }

            // Handle items within node_statuses or edge_evolution_reasons.
            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                // Match enum key line (2-space indent).
                const enumKeyMatch: RegExpMatchArray | null = line.match(/^  ([a-zA-Z0-9_-]+):/);

                if (enumKeyMatch) {
                    currentEnumKey = enumKeyMatch[1];

                    if (comment) {
                        registry.setYamlComment(`${currentSection}.${currentEnumKey}`, comment);
                    }

                    continue;
                }

                // Match property lines within enum (4-space indent).
                if (currentEnumKey) {
                    const propMatch: RegExpMatchArray | null = line.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (propMatch && comment) {
                        registry.setYamlComment(`${currentSection}.${currentEnumKey}.${propMatch[1]}`, comment);
                    }
                }
            } else if (currentSection === 'nodes') {
                // Match node id line (2-space indent with list marker).
                const nodeIdMatch: RegExpMatchArray | null = line.match(/^  - id:\s*(\S+)/);

                if (nodeIdMatch) {
                    currentNodeId = nodeIdMatch[1];
                    currentEdgeId = null;

                    if (comment) {
                        registry.setYamlComment(`nodes.${currentNodeId}`, comment);
                    }

                    continue;
                }

                if (currentNodeId) {
                    // Match node property lines (4-space indent).
                    const nodePropMatch: RegExpMatchArray | null = line.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (nodePropMatch) {
                        const propName: string = nodePropMatch[1];

                        if (propName === 'edges') {
                            currentEdgeId = null;
                        }

                        if (comment) {
                            registry.setYamlComment(`nodes.${currentNodeId}.${propName}`, comment);
                        }

                        continue;
                    }

                    // Match edge id line (6-space indent with list marker).
                    const edgeIdMatch: RegExpMatchArray | null = line.match(/^      - id:\s*(\S+)/);

                    if (edgeIdMatch) {
                        currentEdgeId = edgeIdMatch[1];

                        if (comment) {
                            registry.setYamlComment(`nodes.${currentNodeId}.edges.${currentEdgeId}`, comment);
                        }

                        continue;
                    }

                    if (currentEdgeId) {
                        // Match edge property lines (8-space indent).
                        const edgePropMatch: RegExpMatchArray | null = line.match(/^        ([a-zA-Z0-9_-]+):/);

                        if (edgePropMatch) {
                            const propName: string = edgePropMatch[1];

                            if (comment) {
                                registry.setYamlComment(`nodes.${currentNodeId}.edges.${currentEdgeId}.${propName}`, comment);
                            }

                            continue;
                        }

                        // Match history record start (10-space indent with list marker).
                        const historyMatch: RegExpMatchArray | null = line.match(/^          - version:\s*(\S+)/);

                        if (historyMatch) {
                            if (comment) {
                                registry.setYamlComment(
                                    `nodes.${currentNodeId}.edges.${currentEdgeId}.history.${historyMatch[1]}`,
                                    comment
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    private static extractCommentFromLine(line: string): string | null {
        // Match inline comment (not starting at beginning of line, not inside quotes).
        // Look for # that is not inside a quoted string.
        // Simple approach: find # that is preceded by whitespace and not inside quotes.
        const commentMatch: RegExpMatchArray | null = line.match(/\s+#\s*(.*)$/);

        if (commentMatch) {
            // Exclude yaml-language-server directive.
            if (commentMatch[1].startsWith('yaml-language-server:')) {
                return null;
            }

            return commentMatch[1].trim();
        }

        return null;
    }

    private static restoreInlineComments(yamlString: string, registry: DomainRegistry): string {
        const lines: string[] = yamlString.split('\n');
        const result: string[] = [];
        let currentSection: string | null = null;
        let currentEnumKey: string | null = null;
        let currentNodeId: string | null = null;
        let currentEdgeId: string | null = null;

        for (const line of lines) {
            let outputLine: string = line;

            // Detect top-level section headers.
            if (line.match(/^node_statuses:\s*$/)) {
                currentSection = 'node_statuses';
                currentEnumKey = null;
                const comment: string | undefined = registry.getYamlComment('node_statuses');

                if (comment) {
                    outputLine = BlueprintSerializer.appendComment(line, comment);
                }

                result.push(outputLine);

                continue;
            } else if (line.match(/^edge_evolution_reasons:\s*$/)) {
                currentSection = 'edge_evolution_reasons';
                currentEnumKey = null;
                const comment: string | undefined = registry.getYamlComment('edge_evolution_reasons');

                if (comment) {
                    outputLine = BlueprintSerializer.appendComment(line, comment);
                }

                result.push(outputLine);
                continue;
            } else if (line.match(/^nodes:\s*$/)) {
                currentSection = 'nodes';
                currentNodeId = null;
                currentEdgeId = null;
                const comment: string | undefined = registry.getYamlComment('nodes');

                if (comment) {
                    outputLine = BlueprintSerializer.appendComment(line, comment);
                }

                result.push(outputLine);
                continue;
            }

            // Handle items within node_statuses or edge_evolution_reasons.
            if (currentSection === 'node_statuses' || currentSection === 'edge_evolution_reasons') {
                // Match enum key line (2-space indent).
                const enumKeyMatch: RegExpMatchArray | null = line.match(/^  ([a-zA-Z0-9_-]+):/);

                if (enumKeyMatch) {
                    currentEnumKey = enumKeyMatch[1];
                    const comment: string | undefined = registry.getYamlComment(`${currentSection}.${currentEnumKey}`);

                    if (comment) {
                        outputLine = BlueprintSerializer.appendComment(line, comment);
                    }

                    result.push(outputLine);
                    continue;
                }

                // Match property lines within enum (4-space indent).
                if (currentEnumKey) {
                    const propMatch: RegExpMatchArray | null = line.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (propMatch) {
                        const comment: string | undefined = registry.getYamlComment(
                            `${currentSection}.${currentEnumKey}.${propMatch[1]}`
                        );

                        if (comment) {
                            outputLine = BlueprintSerializer.appendComment(line, comment);
                        }
                    }
                }
            } else if (currentSection === 'nodes') {
                // Match node id line (2-space indent with list marker).
                const nodeIdMatch: RegExpMatchArray | null = line.match(/^  - id:\s*(\S+)/);

                if (nodeIdMatch) {
                    currentNodeId = nodeIdMatch[1];
                    currentEdgeId = null;
                    const comment: string | undefined = registry.getYamlComment(`nodes.${currentNodeId}`);

                    if (comment) {
                        outputLine = BlueprintSerializer.appendComment(line, comment);
                    }

                    result.push(outputLine);
                    continue;
                }

                if (currentNodeId) {
                    // Match node property lines (4-space indent).
                    const nodePropMatch: RegExpMatchArray | null = line.match(/^    ([a-zA-Z0-9_-]+):/);

                    if (nodePropMatch) {
                        const propName: string = nodePropMatch[1];

                        if (propName === 'edges') {
                            currentEdgeId = null;
                        }

                        const comment: string | undefined = registry.getYamlComment(`nodes.${currentNodeId}.${propName}`);

                        if (comment) {
                            outputLine = BlueprintSerializer.appendComment(line, comment);
                        }

                        result.push(outputLine);
                        continue;
                    }

                    // Match edge id line (6-space indent with list marker).
                    const edgeIdMatch: RegExpMatchArray | null = line.match(/^      - id:\s*(\S+)/);

                    if (edgeIdMatch) {
                        currentEdgeId = edgeIdMatch[1];

                        const comment: string | undefined = registry.getYamlComment(
                            `nodes.${currentNodeId}.edges.${currentEdgeId}`
                        );

                        if (comment) {
                            outputLine = BlueprintSerializer.appendComment(line, comment);
                        }

                        result.push(outputLine);
                        continue;
                    }

                    if (currentEdgeId) {
                        // Match edge property lines (8-space indent).
                        const edgePropMatch: RegExpMatchArray | null = line.match(/^        ([a-zA-Z0-9_-]+):/);

                        if (edgePropMatch) {
                            const comment: string | undefined = registry.getYamlComment(
                                `nodes.${currentNodeId}.edges.${currentEdgeId}.${edgePropMatch[1]}`
                            );

                            if (comment) {
                                outputLine = BlueprintSerializer.appendComment(line, comment);
                            }
                        }
                    }
                }
            }

            result.push(outputLine);
        }

        return result.join('\n');
    }

    private static appendComment(line: string, comment: string): string {
        // Remove trailing whitespace from line, then add "  # comment".
        const trimmedLine: string = line.trimEnd();

        return `${trimmedLine}  # ${comment}`;
    }
}
