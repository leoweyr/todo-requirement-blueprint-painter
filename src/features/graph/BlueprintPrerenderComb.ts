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
    private readonly _COMPONENT_GAP: number = 80;  // Defines the vertical gap between connected components.
    private readonly _EDGE_NODE_REPULSION_MARGIN: number = 20;  // Defines the margin for edge-node repulsion detection.

    private _calculateLayoutInternal(registry: DomainRegistry, timeLimit?: string): BlueprintPrerenderCombResult {
        const nodes: Node[] = registry.allNodes;
        const graphNodes: Map<string, GraphNode> = new Map<string, GraphNode>();

        // Step 0: Build adjacency list for connected component detection.
        const adjacencyList: Map<string, Set<string>> = new Map<string, Set<string>>();

        nodes.forEach((node: Node): void => {
            if (!adjacencyList.has(node.id)) {
                adjacencyList.set(node.id, new Set<string>());
            }

            node.edges.forEach((edge: Edge): void => {
                const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                if (latestRecord && latestRecord.status !== EdgeStatus.CUT) {
                    const upstreamNodeId: string = latestRecord.targetUpstream.id;

                    // Add bidirectional connection for undirected graph traversal.
                    adjacencyList.get(node.id)!.add(upstreamNodeId);

                    if (!adjacencyList.has(upstreamNodeId)) {
                        adjacencyList.set(upstreamNodeId, new Set<string>());
                    }

                    adjacencyList.get(upstreamNodeId)!.add(node.id);
                }
            });
        });

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
        const dependentsMap: Map<string, string[]> = new Map<string, string[]>();

        nodes.forEach((downstreamNode: Node): void => {
            downstreamNode.edges.forEach((edge: Edge): void => {
                const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                if (latestRecord && latestRecord.status !== EdgeStatus.CUT) {
                    const upstreamNodeId: string = latestRecord.targetUpstream.id;

                    if (!dependentsMap.has(upstreamNodeId)) {
                        dependentsMap.set(upstreamNodeId, []);
                    }

                    dependentsMap.get(upstreamNodeId)!.push(downstreamNode.id);
                }
            });
        });

        // Step 3: Calculate height (Distance to furthest leaf) - GLOBAL.
        const memoizedHeights: Map<string, number> = new Map<string, number>();
        const visiting: Set<string> = new Set<string>();

        const calculateHeight: (nodeId: string) => number = (nodeId: string): number => {
            if (memoizedHeights.has(nodeId)) {
                return memoizedHeights.get(nodeId)!;
            }

            if (visiting.has(nodeId)) {
                return 0;
            }

            visiting.add(nodeId);

            const dependents: string[] = dependentsMap.get(nodeId) || [];
            let height: number = 0;

            if (dependents.length > 0) {
                let maximumDependentHeight: number = 0;

                dependents.forEach((dependentId: string): void => {
                    maximumDependentHeight = Math.max(maximumDependentHeight, calculateHeight(dependentId));
                });

                height = maximumDependentHeight + 1;
            }

            visiting.delete(nodeId);
            memoizedHeights.set(nodeId, height);

            return height;
        };

        nodes.forEach((node: Node): void => {
            calculateHeight(node.id);
        });

        // Find max graph height - GLOBAL across all components.
        let maximumGraphHeight: number = 0;

        memoizedHeights.forEach((height: number): void => {
            maximumGraphHeight = Math.max(maximumGraphHeight, height);
        });

        // Step 4: Assign layers (X-Axis) - GLOBAL.
        const layers: Map<number, GraphNode[]> = new Map<number, GraphNode[]>();

        graphNodes.forEach((graphNode: GraphNode): void => {
            const height: number = memoizedHeights.get(graphNode.id) || 0;
            graphNode.layer = maximumGraphHeight - height;
            graphNode.height = height;

            if (!layers.has(graphNode.layer)) {
                layers.set(graphNode.layer, []);
            }

            layers.get(graphNode.layer)!.push(graphNode);
        });

        const sortedLayerIndices: number[] = Array.from(layers.keys()).sort((firstLayerIndex: number, secondLayerIndex: number): number => firstLayerIndex - secondLayerIndex);

        // Step 5: Calculate X positions for each layer - GLOBAL.
        const layerXPositions: Map<number, number> = new Map<number, number>();
        const layerGapCenters: number[] = [];
        let currentX: number = this._PADDING;

        sortedLayerIndices.forEach((layerIndex: number, iterationIndex: number): void => {
            if (iterationIndex > 0) {
                const previousLayerIndex: number = sortedLayerIndices[iterationIndex - 1];
                const previousLayerX: number = layerXPositions.get(previousLayerIndex) || 0;
                let requiredX: number = previousLayerX + this._NODE_WIDTH + this._MIN_LAYER_SPACING;

                const currentLayerNodes: GraphNode[] = layers.get(layerIndex) || [];

                currentLayerNodes.forEach((graphNode: GraphNode): void => {
                    graphNode.node.edges.forEach((edge: Edge): void => {
                        const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                        if (latestRecord && latestRecord.status !== EdgeStatus.CUT) {
                            const upstreamNode: Node = latestRecord.targetUpstream;
                            const upstreamGraphNode: GraphNode | undefined = graphNodes.get(upstreamNode.id);

                            if (upstreamGraphNode && upstreamGraphNode.layer <= previousLayerIndex) {
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

                                    const requiredX1: number = upstreamX + (halfTextWidth + padding) / ratio;
                                    const requiredX2: number = (previousLayerX + nodeWidth + halfTextWidth + padding - upstreamX * ratio) / (1 - ratio);

                                    requiredX = Math.max(requiredX, requiredX1, requiredX2);
                                }
                            }
                        }
                    });
                });

                currentX = requiredX;

                const gapCenter: number = previousLayerX + this._NODE_WIDTH + (currentX - (previousLayerX + this._NODE_WIDTH)) / 2;
                layerGapCenters.push(gapCenter);
            } else {
                currentX = this._PADDING;
            }

            layerXPositions.set(layerIndex, currentX);
        });

        // Step 6: Find connected components.
        const connectedComponents: Node[][] = this._findConnectedComponents(nodes, adjacencyList);

        // Step 7: Calculate Y positions per component and merge.
        return this._calculateComponentYPositionsAndMerge(
            connectedComponents,
            graphNodes,
            dependentsMap,
            layers,
            sortedLayerIndices,
            layerXPositions,
            layerGapCenters,
            timeLimit
        );
    }

    private _calculateComponentYPositionsAndMerge(
        connectedComponents: Node[][],
        graphNodes: Map<string, GraphNode>,
        dependentsMap: Map<string, string[]>,
        layers: Map<number, GraphNode[]>,
        sortedLayerIndices: number[],
        layerXPositions: Map<number, number>,
        layerGapCenters: number[],
        timeLimit?: string
    ): BlueprintPrerenderCombResult {
        const prerenderNodes: PrerenderNode[] = [];
        const prerenderEdges: PrerenderEdge[] = [];

        let minimumX: number = Number.MAX_VALUE;
        let minimumY: number = Number.MAX_VALUE;
        let maximumX: number = Number.MIN_VALUE;
        let maximumY: number = Number.MIN_VALUE;

        let currentYOffset: number = this._PADDING;

        connectedComponents.forEach((componentNodes: Node[]): void => {
            const componentNodeIds: Set<string> = new Set<string>(componentNodes.map((node: Node): string => node.id));

            // Filter layers to only include nodes from this component.
            const componentLayers: Map<number, GraphNode[]> = new Map<number, GraphNode[]>();

            sortedLayerIndices.forEach((layerIndex: number): void => {
                const layerNodes: GraphNode[] = layers.get(layerIndex) || [];
                const componentLayerNodes: GraphNode[] = layerNodes.filter(
                    (graphNode: GraphNode): boolean => componentNodeIds.has(graphNode.id)
                );

                if (componentLayerNodes.length > 0) {
                    componentLayers.set(layerIndex, componentLayerNodes);
                }
            });

            // Calculate Y order using Barycenter method within this component.
            const nodeIndices: Map<string, number> = new Map<string, number>();

            const getConnectivity: (node: Node) => number = (node: Node): number => {
                const dependents: string[] = dependentsMap.get(node.id) || [];
                return dependents.filter((dependentId: string): boolean => componentNodeIds.has(dependentId)).length;
            };

            sortedLayerIndices.forEach((layerIndex: number): void => {
                const layerNodes: GraphNode[] | undefined = componentLayers.get(layerIndex);

                if (!layerNodes || layerNodes.length === 0) {
                    return;
                }

                if (layerIndex === sortedLayerIndices[0] || !nodeIndices.size) {
                    // First layer with nodes: sort by connectivity.
                    const sortedByConnectivity: GraphNode[] = [...layerNodes].sort(
                        (firstGraphNode: GraphNode, secondGraphNode: GraphNode): number => getConnectivity(firstGraphNode.node) - getConnectivity(secondGraphNode.node)
                    );

                    const newOrder: GraphNode[] = new Array(layerNodes.length);
                    let left: number = 0;
                    let right: number = layerNodes.length - 1;

                    for (let index: number = 0; index < sortedByConnectivity.length; index++) {
                        if (index % 2 === 0) {
                            newOrder[left++] = sortedByConnectivity[index];
                        } else {
                            newOrder[right--] = sortedByConnectivity[index];
                        }
                    }

                    for (let index: number = 0; index < layerNodes.length; index++) {
                        layerNodes[index] = newOrder[index];
                    }
                } else {
                    // Subsequent layers: sort by Barycenter.
                    layerNodes.sort((firstGraphNode: GraphNode, secondGraphNode: GraphNode): number => {
                        const getAverageIndex: (node: Node) => number = (node: Node): number => {
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

                            return count > 0 ? sum / count : 9999;
                        };

                        const firstAverageIndex: number = getAverageIndex(firstGraphNode.node);
                        const secondAverageIndex: number = getAverageIndex(secondGraphNode.node);

                        if (firstAverageIndex !== secondAverageIndex) {
                            return firstAverageIndex - secondAverageIndex;
                        }

                        return firstGraphNode.id.localeCompare(secondGraphNode.id);
                    });
                }

                layerNodes.forEach((graphNode: GraphNode, index: number): void => {
                    nodeIndices.set(graphNode.id, index);
                });
            });

            // Calculate max nodes in any layer for this component.
            let maximumNodesInLayer: number = 0;

            componentLayers.forEach((layerNodes: GraphNode[]): void => {
                maximumNodesInLayer = Math.max(maximumNodesInLayer, layerNodes.length);
            });

            const totalComponentHeight: number = maximumNodesInLayer * this._ROW_HEIGHT;

            // Calculate Y coordinates for this component.
            const resultNodes: Map<string, { x: number; y: number }> = new Map<string, { x: number; y: number }>();

            sortedLayerIndices.forEach((layerIndex: number): void => {
                const layerNodes: GraphNode[] | undefined = componentLayers.get(layerIndex);

                if (!layerNodes) {
                    return;
                }

                const currentLayerHeight: number = layerNodes.length * this._ROW_HEIGHT;
                const startY: number = (totalComponentHeight - currentLayerHeight) / 2 + currentYOffset;
                const layerX: number = layerXPositions.get(layerIndex) || 0;

                layerNodes.forEach((graphNode: GraphNode, index: number): void => {
                    const xCoordinate: number = layerX;
                    const yCoordinate: number = startY + (index * this._ROW_HEIGHT);

                    resultNodes.set(graphNode.id, { x: xCoordinate, y: yCoordinate });

                    if (xCoordinate < minimumX) {
                        minimumX = xCoordinate;
                    }

                    if (yCoordinate < minimumY) {
                        minimumY = yCoordinate;
                    }

                    if (xCoordinate > maximumX) {
                        maximumX = xCoordinate;
                    }

                    if (yCoordinate > maximumY) {
                        maximumY = yCoordinate;
                    }
                });
            });

            // Generate prerender nodes for this component.
            componentNodes.forEach((node: Node): void => {
                const position: { x: number; y: number } | undefined = resultNodes.get(node.id);

                if (position) {
                    prerenderNodes.push({
                        node: node,
                        x: position.x,
                        y: position.y
                    });
                }
            });

            // Generate prerender edges for this component.
            const centerY: number = this._NODE_HEIGHT / 2;
            const edgeGroups: Map<string, PrerenderEdge[]> = new Map<string, PrerenderEdge[]>();

            componentNodes.forEach((downstreamNode: Node): void => {
                const startPosition: { x: number; y: number } | undefined = resultNodes.get(downstreamNode.id);

                if (!startPosition) {
                    return;
                }

                downstreamNode.edges.forEach((edge: Edge): void => {
                    const latestRecord: EdgeHistoryRecord | null = this._getEffectiveRecord(edge, timeLimit);

                    if (!latestRecord) {
                        return;
                    }

                    if (timeLimit && latestRecord.status === EdgeStatus.CUT) {
                        return;
                    }

                    const upstreamNode: Node = latestRecord.targetUpstream;
                    const endPosition: { x: number; y: number } | undefined = resultNodes.get(upstreamNode.id);
                    const upstreamGraphNode: GraphNode | undefined = graphNodes.get(upstreamNode.id);
                    const downstreamGraphNode: GraphNode | undefined = graphNodes.get(downstreamNode.id);

                    if (!endPosition || !upstreamGraphNode || !downstreamGraphNode) {
                        return;
                    }

                    const layerDiff: number = downstreamGraphNode.layer - upstreamGraphNode.layer;
                    const divisions: number = Math.max(2, layerDiff + 1);

                    const edgeStartX: number = startPosition.x;
                    const edgeStartY: number = startPosition.y + centerY;
                    const edgeEndX: number = endPosition.x + this._NODE_WIDTH;
                    const edgeEndY: number = endPosition.y + centerY;

                    // Calculate repulsion curvature to avoid intermediate nodes.
                    const repulsionCurvature: number = this._calculateRepulsionCurvature(
                        edgeStartX,
                        edgeStartY,
                        edgeEndX,
                        edgeEndY,
                        downstreamGraphNode.layer,
                        upstreamGraphNode.layer,
                        sortedLayerIndices,
                        componentLayers,
                        resultNodes
                    );

                    const prerenderEdge: PrerenderEdge = {
                        edge: edge,
                        startX: edgeStartX,
                        startY: edgeStartY,
                        endX: edgeEndX,
                        endY: edgeEndY,
                        labelPositionDivisions: divisions,
                        labelPositionIndex: 1,
                        curvature: repulsionCurvature
                    };

                    const key: string = [downstreamNode.id, upstreamNode.id].sort().join('-');

                    if (!edgeGroups.has(key)) {
                        edgeGroups.set(key, []);
                    }

                    edgeGroups.get(key)!.push(prerenderEdge);
                });
            });

            // Apply additional curvature to overlapping edges (on top of repulsion curvature).
            const CURVATURE_GAP: number = 50;

            edgeGroups.forEach((group: PrerenderEdge[]): void => {
                const count: number = group.length;

                if (count === 1) {
                    prerenderEdges.push(group[0]);
                } else {
                    group.forEach((prerenderEdge: PrerenderEdge, index: number): void => {
                        const overlapOffset: number = (index - (count - 1) / 2) * CURVATURE_GAP;
                        prerenderEdge.curvature = (prerenderEdge.curvature || 0) + overlapOffset;
                        prerenderEdges.push(prerenderEdge);
                    });
                }
            });

            // Advance Y offset for next component.
            currentYOffset += totalComponentHeight + this._COMPONENT_GAP;
        });

        // Handle empty graph case.
        if (graphNodes.size === 0) {
            minimumX = 0;
            minimumY = 0;
            maximumX = 0;
            maximumY = 0;
        }

        return {
            prerenderNodes,
            prerenderEdges,
            contentBounds: {
                minimumX: minimumX,
                minimumY: minimumY,
                maximumX: maximumX + this._NODE_WIDTH,
                maximumY: maximumY + this._NODE_HEIGHT
            },
            layerGapCenters,
            updateTimes: []
        };
    }

    private _findConnectedComponents(nodes: Node[], adjacencyList: Map<string, Set<string>>): Node[][] {
        const visited: Set<string> = new Set<string>();
        const components: Node[][] = [];
        const nodeMap: Map<string, Node> = new Map<string, Node>();

        nodes.forEach((node: Node): void => {
            nodeMap.set(node.id, node);
        });

        nodes.forEach((node: Node): void => {
            if (visited.has(node.id)) {
                return;
            }

            // BFS to find all nodes in this connected component.
            const component: Node[] = [];
            const queue: string[] = [node.id];

            while (queue.length > 0) {
                const currentId: string = queue.shift()!;

                if (visited.has(currentId)) {
                    continue;
                }

                visited.add(currentId);
                const currentNode: Node | undefined = nodeMap.get(currentId);

                if (currentNode) {
                    component.push(currentNode);
                }

                const neighbors: Set<string> | undefined = adjacencyList.get(currentId);

                if (neighbors) {
                    neighbors.forEach((neighborId: string): void => {
                        if (!visited.has(neighborId)) {
                            queue.push(neighborId);
                        }
                    });
                }
            }

            if (component.length > 0) {
                components.push(component);
            }
        });

        // Sort components by size (descending) for consistent layout.
        components.sort((firstComponentNodes: Node[], secondComponentNodes: Node[]): number => secondComponentNodes.length - firstComponentNodes.length);

        return components;
    }

    private _getEffectiveRecord(edge: Edge, timeLimit?: string): EdgeHistoryRecord | null {
        if (!timeLimit) {
            return edge.history.length > 0 ? edge.history[edge.history.length - 1] : null;
        }

        const relevant: EdgeHistoryRecord[] = edge.history.filter((historyRecord: EdgeHistoryRecord): boolean => historyRecord.updatedAt <= timeLimit);

        return relevant.length > 0 ? relevant[relevant.length - 1] : null;
    }

    private _estimateTextWidth(text: string): number {
        // Estimate width: length * 9px per char + 20px padding.
        return text.length * 9 + 20;
    }

    private _doesEdgeIntersectNode(
        edgeStartX: number,
        edgeStartY: number,
        edgeEndX: number,
        edgeEndY: number,
        nodeX: number,
        nodeY: number
    ): boolean {
        const margin: number = this._EDGE_NODE_REPULSION_MARGIN;
        const nodeLeft: number = nodeX - margin;
        const nodeRight: number = nodeX + this._NODE_WIDTH + margin;
        const nodeTop: number = nodeY - margin;
        const nodeBottom: number = nodeY + this._NODE_HEIGHT + margin;

        // Check if the line segment from (edgeStartX, edgeStartY) to (edgeEndX, edgeEndY) intersects the rectangle.
        // Use Liang-Barsky algorithm for line-rectangle intersection.
        const differenceX: number = edgeEndX - edgeStartX;
        const differenceY: number = edgeEndY - edgeStartY;

        const parameterValues: number[] = [0, 1];

        const checkBoundary: (denominator: number, numerator: number) => boolean = (
            denominator: number,
            numerator: number
        ): boolean => {
            if (denominator === 0) {
                // Line is parallel to this boundary.
                // If numerator < 0, line is completely outside this boundary.
                // If numerator >= 0, line is inside or on this boundary, continue checking.
                return numerator >= 0;
            }

            const parameter: number = numerator / denominator;

            if (denominator < 0) {
                if (parameter > parameterValues[1]) {
                    return false;
                }

                if (parameter > parameterValues[0]) {
                    parameterValues[0] = parameter;
                }
            } else {
                if (parameter < parameterValues[0]) {
                    return false;
                }

                if (parameter < parameterValues[1]) {
                    parameterValues[1] = parameter;
                }
            }

            return true;
        };

        if (!checkBoundary(-differenceX, edgeStartX - nodeLeft)) {
            return false;
        }

        if (!checkBoundary(differenceX, nodeRight - edgeStartX)) {
            return false;
        }

        if (!checkBoundary(-differenceY, edgeStartY - nodeTop)) {
            return false;
        }

        if (!checkBoundary(differenceY, nodeBottom - edgeStartY)) {
            return false;
        }

        return parameterValues[0] <= parameterValues[1];
    }

    private _calculateRepulsionCurvature(
        edgeStartX: number,
        edgeStartY: number,
        edgeEndX: number,
        edgeEndY: number,
        sourceLayer: number,
        targetLayer: number,
        sortedLayerIndices: number[],
        componentLayers: Map<number, GraphNode[]>,
        resultNodes: Map<string, { x: number; y: number }>
    ): number {
        // Find intermediate layers between source and target.
        const intermediateLayerIndices: number[] = sortedLayerIndices.filter(
            (layerIndex: number): boolean => layerIndex > targetLayer && layerIndex < sourceLayer
        );

        if (intermediateLayerIndices.length === 0) {
            return 0;
        }

        // Collect all nodes in intermediate layers.
        const obstructingNodes: Array<{ x: number; y: number }> = [];

        intermediateLayerIndices.forEach((layerIndex: number): void => {
            const layerNodes: GraphNode[] | undefined = componentLayers.get(layerIndex);

            if (!layerNodes) {
                return;
            }

            layerNodes.forEach((graphNode: GraphNode): void => {
                const position: { x: number; y: number } | undefined = resultNodes.get(graphNode.id);

                if (position) {
                    obstructingNodes.push(position);
                }
            });
        });

        if (obstructingNodes.length === 0) {
            return 0;
        }

        // Check which nodes the edge would intersect.
        const intersectingNodes: Array<{ x: number; y: number }> = obstructingNodes.filter(
            (nodePosition: { x: number; y: number }): boolean => this._doesEdgeIntersectNode(
                edgeStartX,
                edgeStartY,
                edgeEndX,
                edgeEndY,
                nodePosition.x,
                nodePosition.y
            )
        );

        if (intersectingNodes.length === 0) {
            return 0;
        }

        // Calculate required curvature to avoid all intersecting nodes.
        const edgeMidY: number = (edgeStartY + edgeEndY) / 2;
        let maximumUpwardOffset: number = 0;
        let maximumDownwardOffset: number = 0;

        intersectingNodes.forEach((nodePosition: { x: number; y: number }): void => {
            const nodeTopWithMargin: number = nodePosition.y - this._EDGE_NODE_REPULSION_MARGIN;
            const nodeBottomWithMargin: number = nodePosition.y + this._NODE_HEIGHT + this._EDGE_NODE_REPULSION_MARGIN;

            // Calculate offset needed to clear this node from both directions.
            // Always calculate both to choose the smaller one.
            const downwardOffset: number = nodeBottomWithMargin - edgeMidY + this._EDGE_NODE_REPULSION_MARGIN;
            const upwardOffset: number = edgeMidY - nodeTopWithMargin + this._EDGE_NODE_REPULSION_MARGIN;

            if (downwardOffset > maximumDownwardOffset) {
                maximumDownwardOffset = downwardOffset;
            }

            if (upwardOffset > maximumUpwardOffset) {
                maximumUpwardOffset = upwardOffset;
            }
        });

        // For quadratic Bezier curves, the actual curve displacement is approximately half of the control point offset.
        // Multiply by 2 to ensure the curve clears the node completely.
        const curvatureMultiplier: number = 2;

        // Choose the direction with smaller offset to minimize visual disruption.
        // Prefer upward (negative curvature) when offsets are equal.
        if (maximumUpwardOffset > 0 && maximumUpwardOffset <= maximumDownwardOffset) {
            return -maximumUpwardOffset * curvatureMultiplier;  // Negative curvature curves upward.
        } else if (maximumDownwardOffset > 0) {
            return maximumDownwardOffset * curvatureMultiplier;  // Positive curvature curves downward.
        }

        return 0;
    }

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

        const updateTimes: string[] = Array.from(updateTimesSet).sort((firstTimestamp: string, secondTimestamp: string): number => {
            return new Date(firstTimestamp).getTime() - new Date(secondTimestamp).getTime();
        });

        // Main layout (latest).
        const result: BlueprintPrerenderCombResult = this._calculateLayoutInternal(registry, undefined);
        result.updateTimes = updateTimes;

        // Frames for animation.
        const frames: Map<number, PrerenderNode[]> = new Map<number, PrerenderNode[]>();

        updateTimes.forEach((time: string, index: number): void => {
            const frameResult: BlueprintPrerenderCombResult = this._calculateLayoutInternal(registry, time);
            frames.set(index, frameResult.prerenderNodes);
        });

        result.frames = frames;

        return result;
    }
}
