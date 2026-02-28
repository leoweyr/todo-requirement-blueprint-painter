import { DomainRegistry } from '../registry/DomainRegistry';
import { Node } from '../../domain/Node';
import { Edge } from '../../domain/Edge';
import { type BlueprintPrerenderCombResult, type PrerenderNode, type PrerenderEdge } from './BlueprintPrerenderCombResult';
import { type GraphNode } from './GraphNode';


export class BlueprintPrerenderComb {
    private readonly ROW_HEIGHT: number = 150;  // Vertical spacing between node centers.
    private readonly LAYER_SPACING: number = 150;  // Spacing between the bounding boxes of adjacent layers (variable requested).
    private readonly NODE_WIDTH: number = 200;
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

        const calculateHeight: (nodeId: string) => number = (nodeId: string): number => {
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
                let maxDependentHeight: number = 0;

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
        let maxGraphHeight: number = 0;

        memoizedHeights.forEach((height: number): void => {
            maxGraphHeight = Math.max(maxGraphHeight, height);
        });

        // Step 4: Assign layers (X-Axis).
        // Invert: Max Height (Infra) -> Layer 0 (Left).
        // Min Height (Touchpoint) -> Layer Max (Right).
        const layers: Map<number, GraphNode[]> = new Map<number, GraphNode[]>();

        graphNodes.forEach((graphNode: GraphNode): void => {
            const height: number = memoizedHeights.get(graphNode.id) || 0;

            // The inversion logic: Higher height (further from leaf) means lower layer index (leftmost).
            graphNode.layer = maxGraphHeight - height;
            graphNode.height = height;

            if (!layers.has(graphNode.layer)) {
                layers.set(graphNode.layer, []);
            }

            layers.get(graphNode.layer)?.push(graphNode);
        });

        // Step 5: Assign order (Y-Axis) and Center Layers.
        // Heuristic 1: Barycenter / Median. Try to place nodes close to their connected neighbors in previous layers.
        // Heuristic 2: Centrality. Nodes with more connections go to center.
        // Implementation of a simplified Barycenter method.
        // Iterating layers 0 -> Max.
        // Layer 0 is fixed (or sorted by ID/connectivity).
        // Layer i positions depend on Layer i-1.
        // Dependencies go Downstream -> Upstream.
        // Infra (Layer 0) is Upstream. Touchpoint (Layer Max) is Downstream.
        // Downstream depends on Upstream.
        // Edges: Downstream -> Upstream.
        // Processing Left to Right (0 to Max) traverses AGAINST the edge direction.
        // This means for Layer i (Downstream), dependencies are in Layer < i (Left).
        // Upstream is to the Left.
        // For a node in Layer i, its dependencies are in layers < i.
        // Use the average Y-position of its dependencies (in Left layers) to position it.

        const sortedLayerIndices: number[] = Array.from(layers.keys()).sort((a: number, b: number): number => a - b);

        // Sub-step: connectivity map for Layer 0 sorting.
        const getConnectivity: (node: Node) => number = (node: Node): number => {
            // Number of nodes depending on this node (Indegree in graph theory, 'dependents' here).
             const dependents: string[] = dependentsMap.get(node.id) || [];
             return dependents.length;
        };

        // Track "virtual" Y positions for sorting logic. 
        // Use "Index" as a proxy for Y until final coordinate step.
        const nodeIndices: Map<string, number> = new Map<string, number>();

        sortedLayerIndices.forEach((layerIndex: number): void => {
            const layerNodes: GraphNode[] | undefined = layers.get(layerIndex);

            if (layerNodes) {
                if (layerIndex === 0) {
                    // Layer 0: Sort by Connectivity (Most connected in middle).
                    // Sort by connectivity descending.
                    layerNodes.sort((a: GraphNode, b: GraphNode): number => {
                        return getConnectivity(b.node) - getConnectivity(a.node);
                    });
                    
                    // Distribute: [Heavy, Heavy, ..., Light, Light] -> [Light, Heavy, Heaviest, Heavy, Light].
                    // Alternate placement: Left, Right, Left, Right from center.
                    // Or simply: Middle indices get highest connectivity.
                    // Simple sort: Most connected at top. Requirement: "Less connected to edges, More connected to interior".
                    // So: [Low, Low, High, High, High, Low, Low]
                    // Sort by connectivity, then rearrange.
                    const sortedByConn: GraphNode[] = [...layerNodes].sort((a: GraphNode, b: GraphNode): number => {
                        return getConnectivity(a.node) - getConnectivity(b.node); // Ascending: Low -> High
                    });
                    
                    // Rearrange to put High in middle.
                    // Algorithm: Take sorted (Low->High), place largest in middle, next largest left of it, next right...
                    const newOrder: GraphNode[] = new Array(layerNodes.length);
                    let left: number = 0;
                    let right: number = layerNodes.length - 1;
                    
                    // Fill from edges with Low connectivity.
                    // sortedByConn is [Low .... High].
                    // Take Low (index 0), put at left (0).
                    // Take next Low (index 1), put at right (max).
                    // ... until meet in middle.
                    for (let index: number = 0; index < sortedByConn.length; index++) {
                        if (index % 2 === 0) {
                            newOrder[left++] = sortedByConn[index];
                        } else {
                            newOrder[right--] = sortedByConn[index];
                        }
                    }

                    // Apply new order.
                    for (let index: number = 0; index < layerNodes.length; index++) {
                        layerNodes[index] = newOrder[index];
                    }

                } else {
                    // Subsequent Layers: Sort by Barycenter of Upstream Nodes (in previous layers).
                    // We need the "Index" of upstream nodes to calculate average.
                    // Ideally normalized index (0..1) or just order.
                    layerNodes.sort((a: GraphNode, b: GraphNode): number => {
                        const getAvgIndex: (node: Node) => number = (node: Node): number => {
                            let sum: number = 0;
                            let count: number = 0;

                            node.edges.forEach((edge: Edge): void => {
                                if (edge.history.length > 0) {
                                    const upId: string = edge.history[edge.history.length - 1].targetUpstream.id;
                                    if (nodeIndices.has(upId)) {
                                        sum += nodeIndices.get(upId)!;
                                        count++;
                                    }
                                }
                            });

                            // If no dependencies (unlikely for non-Infra), return -1 or keep original relative order?
                            // Return a neutral value, e.g., current alphabetic relative position? 
                            // Or infinity to push to bottom?
                            // Use 0 or middle. 
                            return count > 0 ? sum / count : 9999;
                        };

                        const avgA: number = getAvgIndex(a.node);
                        const avgB: number = getAvgIndex(b.node);

                        if (avgA !== avgB) {
                            return avgA - avgB;
                        }

                        // Fallback to ID
                        return a.id.localeCompare(b.id);
                    });
                }

                // Update nodeIndices for next layer calculations.
                layerNodes.forEach((graphNode: GraphNode, index: number): void => {
                    nodeIndices.set(graphNode.id, index);
                });
            }
        });

        // Calculate max nodes in any layer to determine the "widest" part of the forest.
        let maxNodesInLayer: number = 0;
        
        sortedLayerIndices.forEach((layerIndex: number): void => {
            const layerNodes: GraphNode[] | undefined = layers.get(layerIndex);

            if (layerNodes) {
                maxNodesInLayer = Math.max(maxNodesInLayer, layerNodes.length);
            }
        });

        // The total height of the graph based on the widest layer.
        // We use this to center other layers vertically.
        const totalGraphHeight: number = maxNodesInLayer * this.ROW_HEIGHT;

        // Step 6: Generate final coordinates.
        const resultNodes: Map<string, { x: number; y: number }> = new Map<string, { x: number; y: number }>();
        const prerenderNodes: PrerenderNode[] = [];
        const prerenderEdges: PrerenderEdge[] = [];
        
        // Bounds tracking.
        let minimumX: number = Number.MAX_VALUE;
        let minimumY: number = Number.MAX_VALUE;
        let maximumX: number = Number.MIN_VALUE;
        let maximumY: number = Number.MIN_VALUE;

        // Calculate width of a column based on Node Width + Variable Layer Spacing.
        const columnWidthWithSpacing: number = this.NODE_WIDTH + this.LAYER_SPACING;

        if (graphNodes.size === 0) {
            minimumX = 0; 
            minimumY = 0; 
            maximumX = 0; 
            maximumY = 0;
        } else {
             sortedLayerIndices.forEach((layerIndex: number): void => {
                const layerNodes: GraphNode[] | undefined = layers.get(layerIndex);
                
                if (layerNodes) {
                    const currentLayerHeight: number = layerNodes.length * this.ROW_HEIGHT;

                    // Center the layer vertically based on the maximum height of the forest.
                    // This ensures the layer is vertically aligned with the center of the tallest layer.
                    // Boundary Baseline: The top of the tallest layer constitutes the reference frame.
                    const startY: number = (totalGraphHeight - currentLayerHeight) / 2 + this.PADDING;

                    layerNodes.forEach((graphNode: GraphNode, index: number): void => {
                        // X Position: Layer Index * (Node Width + Layer Spacing) + Padding.
                        // This ensures consistent spacing between the right edge of one layer and the left edge of the next.
                        const x: number = layerIndex * columnWidthWithSpacing + this.PADDING;
                        
                        // Y Position: Centered Start Y + Index * Row Height.
                        const y: number = startY + (index * this.ROW_HEIGHT);
                        
                        resultNodes.set(graphNode.id, { x, y });

                        if (x < minimumX) minimumX = x;
                        if (y < minimumY) minimumY = y;
                        if (x > maximumX) maximumX = x;
                        if (y > maximumY) maximumY = y;
                    });
                }
            });
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
        const centerY: number = this.NODE_HEIGHT / 2;
        
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
