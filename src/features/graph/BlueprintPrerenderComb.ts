import { EdgeStatus } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';
import { Edge } from '@todo-requirement-blueprint/domain';
import { type EdgeHistoryRecord } from '@todo-requirement-blueprint/domain';

import { DomainRegistry } from '../registry/DomainRegistry';
import { type BlueprintPrerenderCombResult } from './BlueprintPrerenderCombResult';
import { type PrerenderNode } from './PrerenderNode';
import { type PrerenderEdge } from './PrerenderEdge';
import { type GraphNode } from './GraphNode';


export class BlueprintPrerenderComb {
    private readonly _ROW_HEIGHT: number = 150;  // Defines the vertical spacing between node centers.
    private readonly _MIN_LAYER_SPACING: number = 100;  // Defines the minimum spacing between layers.
    private readonly _TEXT_PADDING: number = 50;  // Defines the padding around text in the gap.
    private readonly _NODE_WIDTH: number = 200;
    private readonly _NODE_HEIGHT: number = 80;
    private readonly _PADDING: number = 50;

    public calculateLayout(registry: DomainRegistry): BlueprintPrerenderCombResult {
        // Step 0: Extract all edge history update times.
        const updateTimesSet: Set<string> = new Set<string>();
        registry.allNodes.forEach((node: Node): void => {
            node.edges.forEach((edge: Edge): void => {
                edge.history.forEach((record: EdgeHistoryRecord): void => {
                    updateTimesSet.add(record.updatedAt);
                });
            });
        });

        const updateTimes: string[] = Array.from(updateTimesSet).sort((a: string, b: string): number => {
            return new Date(a).getTime() - new Date(b).getTime();
        });

        // Main layout (latest).
        const result = this._calculateLayoutInternal(registry, undefined);
        result.updateTimes = updateTimes;
        
        // Frames for animation.
        const frames: Map<number, PrerenderNode[]> = new Map<number, PrerenderNode[]>();
        
        updateTimes.forEach((time: string, index: number): void => {
            const frameResult = this._calculateLayoutInternal(registry, time);
            frames.set(index, frameResult.prerenderNodes);
        });
        
        result.frames = frames;

        return result;
    }

    private _calculateLayoutInternal(registry: DomainRegistry, timeLimit?: string): BlueprintPrerenderCombResult {
        const nodes: Node[] = registry.allNodes;
        const graphNodes: Map<string, GraphNode> = new Map<string, GraphNode>();

        // Step 0: Logic moved to calculateLayout wrapper.

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

        // Step 2: Build the dependency map (Upstream -> Downstream List).
        // Identify dependencies to calculate height from leaves.
        // TRB Model: Downstream (Child) --[depends on]--> Upstream (Parent).
        // Dependents Map: Upstream Node ID -> List of Downstream Node IDs.
        const dependentsMap: Map<string, string[]> = new Map<string, string[]>();

        nodes.forEach((downstreamNode: Node): void => {
            downstreamNode.edges.forEach((edge: Edge): void => {
                const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);
                
                if (latestRecord && latestRecord.status !== EdgeStatus.CUT) {
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

                dependents.forEach((dependentId: string): void => {
                    maxDependentHeight = Math.max(maxDependentHeight, calculateHeight(dependentId));
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
                    // So: [Low, Low, High, High, High, Low, Low].
                    // Sort by connectivity, then rearrange.
                    const sortedByConnectivity: GraphNode[] = [...layerNodes].sort((a: GraphNode, b: GraphNode): number => {
                        return getConnectivity(a.node) - getConnectivity(b.node);  // Ascending: Low -> High.
                    });
                    
                    // Rearrange to put High in middle.
                    // Algorithm: Take sorted (Low->High), place largest in middle, next largest left of it, next right...
                    const newOrder: GraphNode[] = new Array(layerNodes.length);
                    let left: number = 0;
                    let right: number = layerNodes.length - 1;
                    
                    // Fill from edges with Low connectivity.
                    // sortedByConnectivity is [Low .... High].
                    // Take Low (index 0), put at left (0).
                    // Take next Low (index 1), put at right (max).
                    // Continue until meet in middle.
                    for (let index: number = 0; index < sortedByConnectivity.length; index++) {
                        if (index % 2 === 0) {
                            newOrder[left++] = sortedByConnectivity[index];
                        } else {
                            newOrder[right--] = sortedByConnectivity[index];
                        }
                    }

                    // Apply new order.
                    for (let index: number = 0; index < layerNodes.length; index++) {
                        layerNodes[index] = newOrder[index];
                    }

                } else {
                    // Subsequent Layers: Sort by Barycenter of Upstream Nodes (in previous layers).
                    // The "Index" of upstream nodes is required to calculate the average.
                    // Use normalized index (0..1) or just order.
                    layerNodes.sort((a: GraphNode, b: GraphNode): number => {
                        const getAvgIndex: (node: Node) => number = (node: Node): number => {
                            let sum: number = 0;
                            let count: number = 0;

                            node.edges.forEach((edge: Edge): void => {
                                const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                                if (latestRecord && latestRecord.status !== EdgeStatus.CUT) {
                                    const upstreamId: string = latestRecord.targetUpstream.id;

                                    if (nodeIndices.has(upstreamId)) {
                                        sum += nodeIndices.get(upstreamId)!;
                                        count++;
                                    }
                                }
                            });

                            // If no dependencies (unlikely for non-Infra), return a large value to push to bottom.
                            // Use 0 or middle.
                            return count > 0 ? sum / count : 9999;
                        };

                        const avgA: number = getAvgIndex(a.node);
                        const avgB: number = getAvgIndex(b.node);

                        if (avgA !== avgB) {
                            return avgA - avgB;
                        }

                        // Fallback to ID.
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
        // This is used to center other layers vertically.
        const totalGraphHeight: number = maxNodesInLayer * this._ROW_HEIGHT;

        // Step 6: Generate final coordinates.
        const resultNodes: Map<string, { x: number; y: number }> = new Map<string, { x: number; y: number }>();
        const prerenderNodes: PrerenderNode[] = [];
        const prerenderEdges: PrerenderEdge[] = [];
        
        // Bounds tracking.
        let minimumX: number = Number.MAX_VALUE;
        let minimumY: number = Number.MAX_VALUE;
        let maximumX: number = Number.MIN_VALUE;
        let maximumY: number = Number.MIN_VALUE;

        // Calculate X positions for each layer dynamically.
        // Accumulate X based on the gap required by the longest edge text between adjacent layers.
        const layerXPositions: Map<number, number> = new Map<number, number>();
        const layerGapCenters: number[] = [];
        let currentX: number = this._PADDING;

        sortedLayerIndices.forEach((layerIndex: number, i: number): void => {
            if (i > 0) {
                // Initialize currentX to at least the minimum spacing from previous layer.
                const prevLayerIndex: number = sortedLayerIndices[i - 1];
                const prevLayerX: number = layerXPositions.get(prevLayerIndex) || 0;
                let requiredX: number = prevLayerX + this._NODE_WIDTH + this._MIN_LAYER_SPACING;

                // Find edges between this layer and the previous layer to determine required width.
                // Edges go Downstream (this layer) -> Upstream (prev layer).
                const currentLayerNodes: GraphNode[] = layers.get(layerIndex) || [];

                currentLayerNodes.forEach((graphNode: GraphNode): void => {
                    graphNode.node.edges.forEach((edge: Edge): void => {
                        const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                        if (latestRecord && latestRecord.status !== EdgeStatus.CUT) {
                            const upstreamNode: Node = latestRecord.targetUpstream;
                            const upstreamGraphNode: GraphNode | undefined = graphNodes.get(upstreamNode.id);

                            if (upstreamGraphNode && upstreamGraphNode.layer <= prevLayerIndex) {
                                // Calculate required spacing based on text width and position.
                                const text: string = edge.demandDescription || "";
                                
                                if (text) {
                                    const halfTextWidth: number = this._estimateTextWidth(text) / 2;
                                    const upstreamLayer: number = upstreamGraphNode.layer;
                                    const layerDiff: number = layerIndex - upstreamLayer;
                                    const divisions: number = layerDiff + 1;
                                    const ratio: number = 1 / divisions;
                                    
                                    const upstreamX: number = layerXPositions.get(upstreamLayer) || 0;
                                    const nodeWidth: number = this._NODE_WIDTH;
                                    const padding: number = this._TEXT_PADDING;
                                    
                                    // Requirement 1: Avoid overlap with the current node (Layer N).
                                    // The text right edge must be less than the node left edge minus padding.
                                    // LabelX + HalfText < X_N - Padding.
                                    // X_N > LabelX + HalfText + Padding.
                                    // LabelX = X_N * (1 - Ratio) + X_U * Ratio.
                                    // X_N > X_N * (1 - Ratio) + X_U * Ratio + HalfText + Padding.
                                    // X_N * Ratio > X_U * Ratio + HalfText + Padding.
                                    // X_N > X_U + (HalfText + Padding) / Ratio.
                                    const requiredX1: number = upstreamX + (halfTextWidth + padding) / ratio;
                                    
                                    // Requirement 2: Avoid overlap with the previous node (Layer N-1).
                                    // The text left edge must be greater than the previous node right edge plus padding.
                                    // LabelX - HalfText > X_{N-1} + NODE_WIDTH + Padding.
                                    // X_N * (1 - Ratio) + X_U * Ratio - HalfText > X_{N-1} + wNode + Padding.
                                    // X_N * (1 - Ratio) > X_{N-1} + wNode + Padding + HalfText - X_U * Ratio.
                                    // X_N > (X_{N-1} + wNode + Padding + HalfText - X_U * Ratio) / (1 - Ratio).
                                    const requiredX2: number = (prevLayerX + nodeWidth + halfTextWidth + padding - upstreamX * ratio) / (1 - ratio);
                                    
                                    requiredX = Math.max(requiredX, requiredX1, requiredX2);
                                }
                            }
                         }
                    });
                });
                
                currentX = requiredX;

                // Calculate and store the center of the gap between prevLayer and currentLayer.
                // Gap is from (prevLayerX + NODE_WIDTH) to (currentX).
                const gapCenter: number = prevLayerX + this._NODE_WIDTH + (currentX - (prevLayerX + this._NODE_WIDTH)) / 2;
                layerGapCenters.push(gapCenter);
            } else {
                currentX = this._PADDING;
            }
            layerXPositions.set(layerIndex, currentX);
        });

        if (graphNodes.size === 0) {
            minimumX = 0; 
            minimumY = 0; 
            maximumX = 0; 
            maximumY = 0;
        } else {
             sortedLayerIndices.forEach((layerIndex: number): void => {
                const layerNodes: GraphNode[] | undefined = layers.get(layerIndex);
                
                if (layerNodes) {
                    const currentLayerHeight: number = layerNodes.length * this._ROW_HEIGHT;
                    const startY: number = (totalGraphHeight - currentLayerHeight) / 2 + this._PADDING;
                    const layerX: number = layerXPositions.get(layerIndex) || 0;

                    layerNodes.forEach((graphNode: GraphNode, index: number): void => {
                        const x: number = layerX;
                        const y: number = startY + (index * this._ROW_HEIGHT);
                        
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
        const centerY: number = this._NODE_HEIGHT / 2;
        const edgeGroups: Map<string, PrerenderEdge[]> = new Map<string, PrerenderEdge[]>();

        nodes.forEach((downstreamNode: Node): void => {
            const startPosition: { x: number; y: number } | undefined = resultNodes.get(downstreamNode.id);
            
            if (!startPosition) return;

            downstreamNode.edges.forEach((edge: Edge): void => {
                const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                if (!latestRecord) return;

                if (timeLimit && latestRecord.status === EdgeStatus.CUT) return;
                
                const upstreamNode: Node = latestRecord.targetUpstream;
                const endPosition = resultNodes.get(upstreamNode.id);
                // Get upstream graph node to find layer.
                const upstreamGraphNode = graphNodes.get(upstreamNode.id);
                const downstreamGraphNode = graphNodes.get(downstreamNode.id);

                if (!endPosition || !upstreamGraphNode || !downstreamGraphNode) return;

                const layerDiff: number = downstreamGraphNode.layer - upstreamGraphNode.layer;

                // Cross layer count = layerDiff - 1.
                // Divisions = (Cross layer count) + 2 = layerDiff - 1 + 2 = layerDiff + 1.
                const divisions: number = Math.max(2, layerDiff + 1);

                const prerenderEdge: PrerenderEdge = {
                    edge: edge,
                    startX: startPosition.x,
                    startY: startPosition.y + centerY,
                    endX: endPosition.x + this._NODE_WIDTH,
                    endY: endPosition.y + centerY,
                    labelPositionDivisions: divisions,
                    labelPositionIndex: 1,
                    curvature: 0
                };

                // Group edges by sorted node IDs to detect overlaps.
                const key: string = [downstreamNode.id, upstreamNode.id].sort().join('-');

                if (!edgeGroups.has(key)) {
                    edgeGroups.set(key, []);
                }

                edgeGroups.get(key)!.push(prerenderEdge);
            });
        });

        // Step 7.3: Apply curvature to overlapping edges.
        const CURVATURE_GAP = 50;  // Pixels to separate overlapping edges.

        edgeGroups.forEach((group: PrerenderEdge[]): void => {
            const count: number = group.length;

            if (count === 1) {
                prerenderEdges.push(group[0]);
            } else {
                // Distribute curvature symmetrically.
                // If count is even: -Gap/2, +Gap/2, -Gap*1.5, +Gap*1.5...
                // If count is odd: 0, -Gap, +Gap, -2*Gap, +2*Gap...
                // Simpler formula: offset = (index - (count - 1) / 2) * GAP.
                group.forEach((edge: PrerenderEdge, index: number): void => {
                    const offset: number = (index - (count - 1) / 2) * CURVATURE_GAP;
                    edge.curvature = offset;
                    prerenderEdges.push(edge);
                });
            }
        });

        return { 
            prerenderNodes,
            prerenderEdges,
            contentBounds: {
                minimumX: minimumX,
                minimumY: minimumY,
                maximumX: maximumX + this._NODE_WIDTH,  // Include node width in bounds.
                maximumY: maximumY + this._NODE_HEIGHT  // Include node height in bounds.
            },
            layerGapCenters,
            updateTimes: []
        };
    }

    private _getEffectiveRecord(edge: Edge, timeLimit?: string): EdgeHistoryRecord | null {
        if (!timeLimit) {
            return edge.history.length > 0 ? edge.history[edge.history.length - 1] : null;
        }
        
        const relevant: EdgeHistoryRecord[] = edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= timeLimit);

        return relevant.length > 0 ? relevant[relevant.length - 1] : null;
    }

    private _estimateTextWidth(text: string): number {
        // Estimate width: length * 9px per char + 20px padding.
        return text.length * 9 + 20;
    }
}
