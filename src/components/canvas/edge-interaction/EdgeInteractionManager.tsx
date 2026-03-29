import type { ReactNode } from 'react';
import { Edge } from '@todo-requirement-blueprint/domain';
import { EdgeHistoryRecord } from '@todo-requirement-blueprint/domain';
import { EdgeStatus } from '@todo-requirement-blueprint/domain';
import { EdgeType } from '@todo-requirement-blueprint/domain';
import { Node } from '@todo-requirement-blueprint/domain';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import type { PrerenderEdge } from '../../../features/graph/PrerenderEdge';
import type { PrerenderNode } from '../../../features/graph/PrerenderNode';
import EdgeLine from '../../elements/EdgeLine';
import { EdgeCreator } from '../../menus/edge-edit/EdgeCreator';
import EdgeDrawer from './EdgeDrawer';
import type { EdgeMenuHandler } from './EdgeMenuHandler';


export class EdgeInteractionManager {
    public static initiateCut(
        edge: Edge, 
        onStateChange: (reanchoringEdge: Edge, evolutionTargetNode: Node | null, isModalOpen: boolean) => void
    ): void {
        onStateChange(edge, null, true);
    }

    public static initiateReanchor(
        edge: Edge,
        registry: DomainRegistry,
        edgeDrawer: EdgeDrawer | null,
        onStateChange: (reanchoringEdge: Edge) => void
    ): void {
        const downstreamNode: Node | undefined = registry.allNodes.find((node: Node) => node.edges.includes(edge));
        
        if (downstreamNode && edgeDrawer) {
            const latestHistory: EdgeHistoryRecord = edge.history[edge.history.length - 1];
            let strokeColor: string = '#000000';
            let strokeDasharray: string = 'none';

            if (latestHistory) {
                if (latestHistory.status === EdgeStatus.ACTIVE) {
                    strokeColor = '#4CAF50';
                } else if (latestHistory.status === EdgeStatus.DEPRECATED) {
                    strokeColor = '#9E9E9E';
                } else {
                    strokeColor = '#000000';
                }
                
                if (latestHistory.type === EdgeType.OPTIMIZES) {
                    strokeDasharray = '5,5';
                }
            }

            onStateChange(edge);
            edgeDrawer.handleStartEdge(downstreamNode.id, { strokeColor, strokeDasharray });
        }
    }

    public static confirmEvolution(
        registry: DomainRegistry,
        reanchoringEdge: Edge,
        evolutionTargetNode: Node | null,
        reasonName: string,
        onComplete: () => void
    ): void {
        if (reanchoringEdge) {
            if (evolutionTargetNode) {
                // Re-anchoring (Evolve) is in progress.
                EdgeCreator.evolve(registry, reanchoringEdge, evolutionTargetNode, reasonName);
            } else {
                // Cutting (Delete) is in progress.
                EdgeCreator.cut(registry, reanchoringEdge, reasonName);
            }
        }

        onComplete();
    }

    public static renderEdges(
        prerenderEdges: PrerenderEdge[],
        reanchoringEdge: Edge | null,
        currentTime: string | undefined,
        nextTime: string | undefined,
        timelineIsTransition: boolean,
        nodeMap: Map<string, PrerenderNode>,
        registry: DomainRegistry,
        edgeDrawer: EdgeDrawer | null,
        menuManager: EdgeMenuHandler | null,
        onLayoutUpdate: () => void
    ): ReactNode {
        const handleCut = (edge: Edge): void => {
            if (menuManager) {
                menuManager.startEdgeCut(edge);
            }
        };

        const handleReanchor = (edge: Edge): void => {
            EdgeInteractionManager.initiateReanchor(
                edge, 
                registry, 
                edgeDrawer, 
                (newReanchoringEdge: Edge): void => {
                    if (menuManager) {
                        menuManager.setReanchoringEdge(newReanchoringEdge);
                    }
                    onLayoutUpdate();
                }
            );
        };

        // Pre-calculate edge sources for dynamic positioning.
        const edgeSourceMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();

        for (const prerenderNode of nodeMap.values()) {
            for (const edge of prerenderNode.node.edges) {
                edgeSourceMap.set(edge.id, prerenderNode);
            }
        }

        // Deduplicate prerenderEdges by edge.id to prevent rendering the same logical edge multiple times.
        const seenEdgeIds: Set<string> = new Set<string>();
        const uniquePrerenderEdges: PrerenderEdge[] = [];

        for (const prerenderEdge of prerenderEdges) {
            if (!seenEdgeIds.has(prerenderEdge.edge.id)) {
                seenEdgeIds.add(prerenderEdge.edge.id);
                uniquePrerenderEdges.push(prerenderEdge);
            }
        }

        return (
            <>
                {uniquePrerenderEdges.map((prerenderEdge: PrerenderEdge, edgeIndex: number): ReactNode => {
                    // If this edge is currently being re-anchored, hide it.
                    if (reanchoringEdge && prerenderEdge.edge.id === reanchoringEdge.id) {
                        return null;
                    }

                    const sourceNode: PrerenderNode | undefined = edgeSourceMap.get(prerenderEdge.edge.id);

                    // Filter the history based on the timeline.
                    // If updateTimes is missing (empty graph), show everything (default behavior).
                    if (!currentTime) {
                         const latestHistory: EdgeHistoryRecord = prerenderEdge.edge.history[prerenderEdge.edge.history.length - 1];
                         const targetNode: PrerenderNode | undefined = latestHistory ? nodeMap.get(latestHistory.targetUpstream.id) : undefined;

                         if (targetNode && latestHistory) {
                            return (
                                <EdgeLine
                                    key={`edge-${prerenderEdge.edge.id}-${edgeIndex}`}
                                    {...prerenderEdge}
                                    opacity={prerenderEdge.opacity}
                                    sourceNode={sourceNode}
                                    targetNode={targetNode}
                                    historyIndex={prerenderEdge.edge.history.length - 1}
                                    onCut={(): void => handleCut(prerenderEdge.edge)}
                                    onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                />
                            );
                         }
                         return null;
                    }

                    // Determine which history record to show.
                    // Find the latest record created ON or BEFORE currentTime.
                    const relevantHistory: EdgeHistoryRecord[] = prerenderEdge.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= currentTime);
                    
                    if (relevantHistory.length === 0) {
                        // The edge did not exist yet at this time.
                        
                        // Logic for newly added edges.
                        // If in transition and the edge appears in the next time step, show it as NEW (Green).
                        if (timelineIsTransition && nextTime) {
                            const nextHistory: EdgeHistoryRecord[] = prerenderEdge.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= nextTime);

                            if (nextHistory.length > 0) {
                                const nextHistoryIndex = nextHistory.length - 1;
                                const newRecord = nextHistory[nextHistoryIndex];
                                const targetNode = nodeMap.get(newRecord.targetUpstream.id);
                                
                                if (!targetNode) return null;

                                const reasonColor: string = (newRecord.evolutionReason.metadata?.color as string) || '#4CAF50';

                                return (
                                    <EdgeLine
                                        key={`edge-born-${prerenderEdge.edge.id}-${nextHistoryIndex}-${edgeIndex}`}
                                        {...prerenderEdge}
                                        opacity={prerenderEdge.opacity}
                                        sourceNode={sourceNode}
                                        targetNode={targetNode}
                                        historyIndex={nextHistoryIndex}
                                        highlightColor={reasonColor}
                                        onCut={(): void => handleCut(prerenderEdge.edge)}
                                        onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                    />
                                );
                            }
                        }

                        return null; 
                    }

                    // If not in transition, just show the state at currentTime.
                    if (!timelineIsTransition) {
                        const historyIndex: number = relevantHistory.length - 1;
                        const record: EdgeHistoryRecord = relevantHistory[historyIndex];
                        const targetNode: PrerenderNode | undefined = nodeMap.get(record.targetUpstream.id);
                        
                        if (targetNode) {
                            return (
                                 <EdgeLine
                                    key={`edge-static-${prerenderEdge.edge.id}-${historyIndex}-${edgeIndex}`}
                                    {...prerenderEdge}
                                    opacity={prerenderEdge.opacity}
                                    sourceNode={sourceNode}
                                    targetNode={targetNode}
                                    historyIndex={historyIndex}  // Override to show past state.
                                    onCut={(): void => handleCut(prerenderEdge.edge)}
                                    onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                />
                            );
                        }
                        return null;
                    } else {
                        // Transition Mode: Show BOTH states if changed between current and next.
                        const currentHistoryIndex: number = relevantHistory.length - 1;
                        
                        let nextHistoryIndex: number = currentHistoryIndex;

                        if (nextTime) {
                             // Find the latest record created ON or BEFORE nextTime.
                             const nextHistory: EdgeHistoryRecord[] = prerenderEdge.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= nextTime);

                             if (nextHistory.length > 0) {
                                 nextHistoryIndex = nextHistory.length - 1;
                             }
                        }
                        
                        // If the indices are the same, there is no change in this transition step.
                        if (nextHistoryIndex === currentHistoryIndex) {
                             const record: EdgeHistoryRecord = relevantHistory[currentHistoryIndex];
                             const targetNode: PrerenderNode | undefined = nodeMap.get(record.targetUpstream.id);

                             if (targetNode) {
                                return (
                                    <EdgeLine
                                        key={`edge-trans-same-${prerenderEdge.edge.id}-${currentHistoryIndex}-${edgeIndex}`}
                                        {...prerenderEdge}
                                        opacity={prerenderEdge.opacity}
                                        sourceNode={sourceNode}
                                        targetNode={targetNode}
                                        historyIndex={currentHistoryIndex}
                                        onCut={(): void => handleCut(prerenderEdge.edge)}
                                        onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                    />
                                );
                             }
                             return null;
                        }
                        
                        // Change detected. Compare upstream nodes.
                        const oldRecord: EdgeHistoryRecord = prerenderEdge.edge.history[currentHistoryIndex];
                        const newRecord: EdgeHistoryRecord = prerenderEdge.edge.history[nextHistoryIndex];
                        
                        const isUpstreamSame: boolean = oldRecord.targetUpstream.id === newRecord.targetUpstream.id;
                        
                        if (isUpstreamSame) {
                            // Same Upstream -> Highlight with Reason Color.
                            // Render new version with Reason highlight.
                            const targetNode: PrerenderNode | undefined = nodeMap.get(newRecord.targetUpstream.id);
                            
                            const reasonColor: string = (newRecord.evolutionReason.metadata?.color as string) || '#FFD700';

                            return (
                                <EdgeLine
                                    key={`edge-trans-highlight-${prerenderEdge.edge.id}-${nextHistoryIndex}-${edgeIndex}`}
                                    {...prerenderEdge}
                                    opacity={prerenderEdge.opacity}
                                    sourceNode={sourceNode}
                                    targetNode={targetNode}
                                    historyIndex={nextHistoryIndex}
                                    highlightColor={reasonColor}
                                    onCut={(): void => handleCut(prerenderEdge.edge)}
                                    onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                />
                            );
                        } else {
                            // Different Upstream -> Red (Old) and Reason Color (New).
                            const oldTargetNode: PrerenderNode | undefined = nodeMap.get(oldRecord.targetUpstream.id);
                            const newTargetNode: PrerenderNode | undefined = nodeMap.get(newRecord.targetUpstream.id);

                            const reasonColor: string = (newRecord.evolutionReason.metadata?.color as string) || '#4CAF50';

                            return (
                                <>
                                    {oldTargetNode && (
                                        <EdgeLine
                                            key={`edge-trans-old-${prerenderEdge.edge.id}-${currentHistoryIndex}-${edgeIndex}`}
                                            {...prerenderEdge}
                                            opacity={prerenderEdge.opacity}
                                            sourceNode={sourceNode}
                                            targetNode={oldTargetNode}
                                            historyIndex={currentHistoryIndex}
                                            highlightColor="#FF3B30"  // Red for Old/Cut.
                                            onCut={(): void => handleCut(prerenderEdge.edge)}
                                            onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                        />
                                    )}

                                    {newTargetNode && (
                                        <EdgeLine
                                            key={`edge-trans-new-${prerenderEdge.edge.id}-${nextHistoryIndex}-${edgeIndex}`}
                                            {...prerenderEdge}
                                            opacity={prerenderEdge.opacity}
                                            sourceNode={sourceNode}
                                            targetNode={newTargetNode}
                                            historyIndex={nextHistoryIndex}
                                            highlightColor={reasonColor}
                                            onCut={(): void => handleCut(prerenderEdge.edge)}
                                            onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                        />
                                    )}
                                </>
                            );
                        }
                    }
                })}
            </>
        );
    }
}
