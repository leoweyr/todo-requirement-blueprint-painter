import { DomainRegistry } from '../registry/DomainRegistry';
import { Node } from '../../domain/Node';
import { Edge } from '../../domain/Edge';
import { type BlueprintPrerenderCombResult, type PrerenderNode, type PrerenderEdge } from './BlueprintPrerenderCombResult';
import { type GraphNode } from './GraphNode';


export class BlueprintPrerenderComb {
    private readonly COLUMN_WIDTH: number = 350;
    private readonly ROW_HEIGHT: number = 100;
    private readonly NODE_WIDTH: number = 160;
    private readonly NODE_HEIGHT: number = 80;
    private readonly PADDING: number = 50;

    public calculateLayout(registry: DomainRegistry): BlueprintPrerenderCombResult {
        const nodes: Node[] = registry.allNodes;
        const graphNodes: Map<string, GraphNode> = new Map<string, GraphNode>();

        // Step 1: Initialize graph nodes.
        nodes.forEach((node: Node): void => {
            graphNodes.set(node.id, {
                id: node.id,
                node: node,
                layer: 0,
                height: 0,
                order: 0
            });
        });

        // Step 2: Build dependency map (Upstream -> Downstream List).
        // Identify dependencies to calculate height from leaves.
        // TRB Model: Downstream (Child) --[depends on]--> Upstream (Parent).
        // Dependents Map: Upstream Node ID -> List of Downstream Node IDs.
        const dependentsMap: Map<string, string[]> = new Map<string, string[]>();

        nodes.forEach((downstreamNode: Node): void => {
            downstreamNode.edges.forEach((edge: Edge): void => {
                if (edge.history.length > 0) {
                    // Find the upstream dependency from the latest history record.
                    const latestRecord = edge.history[edge.history.length - 1];
                    const upstreamNodeId: string = latestRecord.targetUpstream.id;

                    if (!dependentsMap.has(upstreamNodeId)) {
                        dependentsMap.set(upstreamNodeId, []);
                    }

                    dependentsMap.get(upstreamNodeId)?.push(downstreamNode.id);
                }
            });
        });

        // Step 3: Calculate height (Distance to furthest leaf).
        // Leaf (Touchpoint) has no dependents -> Height 0.
        // Infra has dependents -> Height > 0.
        const memoizedHeights: Map<string, number> = new Map<string, number>();
        const visiting: Set<string> = new Set<string>();

        const calculateHeight = (nodeId: string): number => {
            if (memoizedHeights.has(nodeId)) {
                return memoizedHeights.get(nodeId)!;
            }

            if (visiting.has(nodeId)) {
                return 0;  // Cycle detected, break infinite loop.
            }

            visiting.add(nodeId);

            const dependents: string[] = dependentsMap.get(nodeId) || [];
            let height: number = 0;

            if (dependents.length > 0) {
                let maxDependentHeight = 0;

                dependents.forEach((depId: string): void => {
                    maxDependentHeight = Math.max(maxDependentHeight, calculateHeight(depId));
                });

                height = maxDependentHeight + 1;
            }

            visiting.delete(nodeId);
            memoizedHeights.set(nodeId, height);

            return height;
        };

        // Compute heights for all nodes.
        nodes.forEach((node: Node): void => {
            calculateHeight(node.id);
        });

        // Find max graph height to invert layout.
        let maxGraphHeight = 0;

        memoizedHeights.forEach((height: number): void => {
            maxGraphHeight = Math.max(maxGraphHeight, height);
        });

        // Step 4: Assign layers (X-Axis).
        // Invert: Max Height (Infra) -> Layer 0 (Left).
        // Min Height (Touchpoint) -> Layer Max (Right).
        const layers: Map<number, GraphNode[]> = new Map<number, GraphNode[]>();

        graphNodes.forEach((graphNode: GraphNode): void => {
            const height = memoizedHeights.get(graphNode.id) || 0;

            // The inversion logic: Higher height (further from leaf) means lower layer index (leftmost).
            graphNode.layer = maxGraphHeight - height;
            graphNode.height = height;

            if (!layers.has(graphNode.layer)) {
                layers.set(graphNode.layer, []);
            }

            layers.get(graphNode.layer)?.push(graphNode);
        });

        // Step 5: Assign order (Y-Axis).
        // Sort layers from Left (0) to Right (Max).
        // Sort nodes within each layer alphabetically for deterministic layout stability.
        const sortedLayerIndices = Array.from(layers.keys()).sort((a, b): number => a - b);
        
        sortedLayerIndices.forEach((layerIndex: number): void => {
            const layerNodes = layers.get(layerIndex);

            if (layerNodes) {
                // Sort by ID for deterministic initial layout.
                layerNodes.sort((a, b): number => a.id.localeCompare(b.id));
                
                layerNodes.forEach((graphNode: GraphNode, index: number): void => {
                    graphNode.order = index;
                });
            }
        });

        // Step 6: Generate final coordinates.
        const resultNodes = new Map<string, { x: number; y: number }>();
        const prerenderNodes: PrerenderNode[] = [];
        const prerenderEdges: PrerenderEdge[] = [];
        
        // Bounds tracking.
        let minimumX = Number.MAX_VALUE;
        let minimumY = Number.MAX_VALUE;
        let maximumX = Number.MIN_VALUE;
        let maximumY = Number.MIN_VALUE;

        graphNodes.forEach((graphNode: GraphNode): void => {
            // Apply padding to center the graph.
            const x = graphNode.layer * this.COLUMN_WIDTH + this.PADDING;
            const y = graphNode.order * this.ROW_HEIGHT + this.PADDING;
            
            resultNodes.set(graphNode.id, { x, y });

            if (x < minimumX) minimumX = x;
            if (y < minimumY) minimumY = y;
            if (x > maximumX) maximumX = x;
            if (y > maximumY) maximumY = y;
        });
        
        // Handle empty graph case for bounds.
        if (graphNodes.size === 0) {
            minimumX = 0; minimumY = 0; maximumX = 0; maximumY = 0;
        }

        // Step 7: Generate prerender objects.
        // Step 7.1: Generate nodes.
        graphNodes.forEach((graphNode: GraphNode): void => {
            const position = resultNodes.get(graphNode.id)!;
            prerenderNodes.push({
                node: graphNode.node,
                x: position.x,
                y: position.y
            });
        });

        // Step 7.2: Generate edges.
        const centerY = this.NODE_HEIGHT / 2;
        
        nodes.forEach((downstreamNode: Node): void => {
            const startPosition = resultNodes.get(downstreamNode.id);
            if (!startPosition) return;

            downstreamNode.edges.forEach((edge: Edge): void => {
                if (edge.history.length === 0) return;
                
                const upstreamNode = edge.history[edge.history.length - 1].targetUpstream;
                const endPosition = resultNodes.get(upstreamNode.id);

                if (!endPosition) return;

                prerenderEdges.push({
                    edge: edge,
                    startX: startPosition.x,
                    startY: startPosition.y + centerY,
                    endX: endPosition.x + this.NODE_WIDTH,
                    endY: endPosition.y + centerY
                });
            });
        });

        return { 
            prerenderNodes,
            prerenderEdges,
            contentBounds: {
                minimumX: minimumX,
                minimumY: minimumY,
                maximumX: maximumX + this.NODE_WIDTH,  // Include node width in bounds.
                maximumY: maximumY + this.NODE_HEIGHT  // Include node height in bounds.
            }
        };
    }
}
