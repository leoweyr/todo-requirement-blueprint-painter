import { Edge, EdgeEvolutionReason, EdgeHistoryRecord, Node, NodeStatus } from '@todo-requirement-blueprint/domain';
import { BlueprintRegistry } from '@todo-requirement-blueprint/engine';

import type { PrerenderEdge } from '../../../features/graph/prerender/PrerenderEdge';
import type { PrerenderNode } from '../../../features/graph/prerender/PrerenderNode';
import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { BlueprintSerializer } from '../../../features/serializer/BlueprintSerializer';


export class BlueprintSaver {
    public static save(
        registry: DomainRegistry,
        saveContext?: {
            timelineIsTransition: boolean;
            timelineCurrentTime: string | undefined;
            timelineSliceNodes: PrerenderNode[];
            timelineSliceEdges: PrerenderEdge[];
        }
    ): void {
        const exportRegistry: BlueprintRegistry = this._resolveExportRegistry(registry, saveContext);
        const yamlContent: string = BlueprintSerializer.toYaml(exportRegistry);
        const fileName: string = `${exportRegistry.blueprintName}.yaml`;

        // Create a Blob and trigger download.
        const blob: Blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
        const url: string = URL.createObjectURL(blob);
        const link: HTMLAnchorElement = document.createElement('a');

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private static _resolveExportRegistry(
        registry: DomainRegistry,
        saveContext: {
            timelineIsTransition: boolean;
            timelineCurrentTime: string | undefined;
            timelineSliceNodes: PrerenderNode[];
            timelineSliceEdges: PrerenderEdge[];
        } | undefined
    ): BlueprintRegistry {
        if (!saveContext) {
            return registry;
        }

        if (saveContext.timelineIsTransition) {
            return registry;
        }

        if (!saveContext.timelineCurrentTime) {
            return registry;
        }

        if (saveContext.timelineSliceNodes.length === 0) {
            return registry;
        }

        return this._createTimelineSliceRegistry(
            registry,
            saveContext.timelineCurrentTime,
            saveContext.timelineSliceNodes,
            saveContext.timelineSliceEdges
        );
    }

    private static _createTimelineSliceRegistry(
        sourceRegistry: DomainRegistry,
        timelineCurrentTime: string,
        timelineSliceNodes: PrerenderNode[],
        timelineSliceEdges: PrerenderEdge[]
    ): BlueprintRegistry {
        const timelineSliceRegistry: BlueprintRegistry = new BlueprintRegistry();
        timelineSliceRegistry.blueprintName = sourceRegistry.blueprintName;
        timelineSliceRegistry.trbVersion = sourceRegistry.trbVersion;
        timelineSliceRegistry.schema = sourceRegistry.schema;

        this._copyElementOrders(sourceRegistry, timelineSliceRegistry);
        this._registerClonedNodeStatuses(sourceRegistry, timelineSliceRegistry);
        this._registerClonedEdgeEvolutionReasons(sourceRegistry, timelineSliceRegistry);
        this._copyYamlComments(sourceRegistry, timelineSliceRegistry);

        const clonedNodeMap: Map<string, Node> = this._buildTimelineNodeMap(timelineSliceNodes, timelineSliceRegistry);
        this._cloneTimelineEdges(
            timelineCurrentTime,
            timelineSliceNodes,
            timelineSliceEdges,
            clonedNodeMap,
            timelineSliceRegistry
        );

        return timelineSliceRegistry;
    }

    private static _registerClonedNodeStatuses(
        sourceRegistry: DomainRegistry,
        timelineSliceRegistry: BlueprintRegistry
    ): void {
        sourceRegistry.allNodeStatuses.forEach((nodeStatus: NodeStatus): void => {
            const clonedMetadata: Record<string, unknown> | undefined = this._cloneRecord(nodeStatus.metadata);
            const clonedNodeStatus: NodeStatus = new NodeStatus(
                nodeStatus.name,
                nodeStatus.description,
                clonedMetadata,
                nodeStatus.anchorName
            );
            timelineSliceRegistry.registerNodeStatus(clonedNodeStatus, true);
        });
    }

    private static _registerClonedEdgeEvolutionReasons(
        sourceRegistry: DomainRegistry,
        timelineSliceRegistry: BlueprintRegistry
    ): void {
        sourceRegistry.allEdgeEvolutionReasons.forEach((edgeEvolutionReason: EdgeEvolutionReason): void => {
            const clonedMetadata: Record<string, unknown> | undefined = this._cloneRecord(edgeEvolutionReason.metadata);

            const clonedEdgeEvolutionReason: EdgeEvolutionReason = new EdgeEvolutionReason(
                edgeEvolutionReason.name,
                edgeEvolutionReason.description,
                clonedMetadata,
                edgeEvolutionReason.anchorName
            );

            timelineSliceRegistry.registerEdgeEvolutionReason(clonedEdgeEvolutionReason, true);
        });
    }

    private static _copyYamlComments(sourceRegistry: DomainRegistry, timelineSliceRegistry: BlueprintRegistry): void {
        sourceRegistry.allYamlComments.forEach((yamlComment: string, yamlCommentKey: string): void => {
            timelineSliceRegistry.setYamlComment(yamlCommentKey, yamlComment);
        });
    }

    private static _copyElementOrders(sourceRegistry: DomainRegistry, timelineSliceRegistry: BlueprintRegistry): void {
        timelineSliceRegistry.nodeStatusOrder = [...sourceRegistry.nodeStatusOrder];
        timelineSliceRegistry.edgeEvolutionReasonOrder = [...sourceRegistry.edgeEvolutionReasonOrder];
        timelineSliceRegistry.nodeOrder = [...sourceRegistry.nodeOrder];

        sourceRegistry.allNodeEdgeOrders.forEach((edgeOrder: string[], nodeId: string): void => {
            timelineSliceRegistry.setNodeEdgeOrder(nodeId, [...edgeOrder]);
        });
    }

    private static _buildTimelineNodeMap(
        timelineSliceNodes: PrerenderNode[],
        timelineSliceRegistry: BlueprintRegistry
    ): Map<string, Node> {
        const clonedNodeMap: Map<string, Node> = new Map<string, Node>();

        timelineSliceNodes.forEach((timelineSliceNode: PrerenderNode): void => {
            const sourceNode: Node = timelineSliceNode.node;

            if (clonedNodeMap.has(sourceNode.id)) {
                return;
            }

            const statusName: string = sourceNode.status.name;
            const clonedNodeStatus: NodeStatus = this._resolveOrRegisterNodeStatus(
                sourceNode.status,
                statusName,
                timelineSliceRegistry
            );

            const clonedNodeMetadata: Record<string, unknown> = this._cloneRecord(sourceNode.metadata) ?? {};
            const clonedNode: Node = new Node(
                sourceNode.id,
                sourceNode.description,
                sourceNode.version,
                sourceNode.updatedAt,
                clonedNodeStatus,
                clonedNodeMetadata
            );

            timelineSliceRegistry.registerNode(clonedNode, true);
            clonedNodeMap.set(clonedNode.id, clonedNode);
        });

        return clonedNodeMap;
    }

    private static _resolveEdgeSourceNodeIdMap(timelineSliceNodes: PrerenderNode[]): Map<string, string> {
        const edgeSourceNodeIdMap: Map<string, string> = new Map<string, string>();

        timelineSliceNodes.forEach((timelineSliceNode: PrerenderNode): void => {
            timelineSliceNode.node.edges.forEach((edge: Edge): void => {
                if (!edgeSourceNodeIdMap.has(edge.id)) {
                    edgeSourceNodeIdMap.set(edge.id, timelineSliceNode.node.id);
                }
            });
        });

        return edgeSourceNodeIdMap;
    }

    private static _cloneTimelineEdges(
        timelineCurrentTime: string,
        timelineSliceNodes: PrerenderNode[],
        timelineSliceEdges: PrerenderEdge[],
        clonedNodeMap: Map<string, Node>,
        timelineSliceRegistry: BlueprintRegistry
    ): void {
        const edgeSourceNodeIdMap: Map<string, string> = this._resolveEdgeSourceNodeIdMap(timelineSliceNodes);
        const uniqueTimelineSliceEdgesById: Map<string, PrerenderEdge> = new Map<string, PrerenderEdge>();

        timelineSliceEdges.forEach((timelineSliceEdge: PrerenderEdge): void => {
            if (!uniqueTimelineSliceEdgesById.has(timelineSliceEdge.edge.id)) {
                uniqueTimelineSliceEdgesById.set(timelineSliceEdge.edge.id, timelineSliceEdge);
            }
        });

        const uniqueTimelineSliceEdges: PrerenderEdge[] = Array.from(uniqueTimelineSliceEdgesById.values());

        uniqueTimelineSliceEdges.forEach((timelineSliceEdge: PrerenderEdge): void => {
            const sourceNodeId: string | undefined = edgeSourceNodeIdMap.get(timelineSliceEdge.edge.id);

            if (!sourceNodeId) {
                return;
            }

            const clonedSourceNode: Node | undefined = clonedNodeMap.get(sourceNodeId);

            if (!clonedSourceNode) {
                return;
            }

            const relevantHistoryRecords: EdgeHistoryRecord[] = timelineSliceEdge.edge.history.filter(
                (historyRecord: EdgeHistoryRecord): boolean => historyRecord.updatedAt <= timelineCurrentTime
            );

            if (relevantHistoryRecords.length === 0) {
                return;
            }

            const clonedHistoryRecords: EdgeHistoryRecord[] = [];

            relevantHistoryRecords.forEach((historyRecord: EdgeHistoryRecord): void => {
                const clonedTargetNode: Node | undefined = clonedNodeMap.get(historyRecord.targetUpstream.id);

                if (!clonedTargetNode) {
                    return;
                }

                const clonedEvolutionReason: EdgeEvolutionReason = this._resolveOrRegisterEdgeEvolutionReason(
                    historyRecord.evolutionReason,
                    timelineSliceRegistry
                );

                const clonedHistoryRecord: EdgeHistoryRecord = new EdgeHistoryRecord(
                    historyRecord.version,
                    historyRecord.updatedAt,
                    historyRecord.type,
                    historyRecord.status,
                    clonedTargetNode,
                    clonedEvolutionReason
                );

                clonedHistoryRecords.push(clonedHistoryRecord);
            });

            if (clonedHistoryRecords.length === 0) {
                return;
            }

            const clonedEdge: Edge = new Edge(
                timelineSliceEdge.edge.id,
                timelineSliceEdge.edge.demandDescription,
                clonedHistoryRecords
            );
            clonedSourceNode.addEdge(clonedEdge);
        });
    }

    private static _resolveOrRegisterNodeStatus(
        sourceNodeStatus: NodeStatus,
        statusName: string,
        timelineSliceRegistry: BlueprintRegistry
    ): NodeStatus {
        const existingNodeStatus: NodeStatus | undefined = timelineSliceRegistry.getNodeStatus(statusName);

        if (existingNodeStatus) {
            return existingNodeStatus;
        }

        const clonedNodeStatusMetadata: Record<string, unknown> | undefined = this._cloneRecord(sourceNodeStatus.metadata);
        const clonedNodeStatus: NodeStatus = new NodeStatus(
            sourceNodeStatus.name,
            sourceNodeStatus.description,
            clonedNodeStatusMetadata,
            sourceNodeStatus.anchorName
        );
        timelineSliceRegistry.registerNodeStatus(clonedNodeStatus, true);
        return clonedNodeStatus;
    }

    private static _resolveOrRegisterEdgeEvolutionReason(
        sourceEdgeEvolutionReason: EdgeEvolutionReason,
        timelineSliceRegistry: BlueprintRegistry
    ): EdgeEvolutionReason {
        const existingEdgeEvolutionReason: EdgeEvolutionReason | undefined = timelineSliceRegistry.getEdgeEvolutionReason(
            sourceEdgeEvolutionReason.name
        );

        if (existingEdgeEvolutionReason) {
            return existingEdgeEvolutionReason;
        }

        const clonedEdgeEvolutionReasonMetadata: Record<string, unknown> | undefined = this._cloneRecord(
            sourceEdgeEvolutionReason.metadata
        );

        const clonedEdgeEvolutionReason: EdgeEvolutionReason = new EdgeEvolutionReason(
            sourceEdgeEvolutionReason.name,
            sourceEdgeEvolutionReason.description,
            clonedEdgeEvolutionReasonMetadata,
            sourceEdgeEvolutionReason.anchorName
        );

        timelineSliceRegistry.registerEdgeEvolutionReason(clonedEdgeEvolutionReason, true);
        return clonedEdgeEvolutionReason;
    }

    private static _cloneRecord(sourceRecord: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
        if (!sourceRecord) {
            return undefined;
        }

        return JSON.parse(JSON.stringify(sourceRecord)) as Record<string, unknown>;
    }
}
