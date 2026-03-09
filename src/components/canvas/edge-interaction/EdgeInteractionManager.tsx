import type { ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { Edge } from '../../../domain/Edge';
import { EdgeHistoryRecord } from '../../../domain/EdgeHistoryRecord';
import { EdgeStatus } from '../../../domain/enums/EdgeStatus';
import { EdgeType } from '../../../domain/enums/EdgeType';
import { Node } from '../../../domain/Node';
import type { PrerenderEdge } from '../../../features/graph/PrerenderEdge';
import type { PrerenderNode } from '../../../features/graph/PrerenderNode';
import EdgeLine from '../../elements/EdgeLine';
import type MenuManager from '../../menus/MenuManager';
import { EdgeCreator } from '../../menus/edge-edit/EdgeCreator';
import EdgeDrawer from './EdgeDrawer';


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
                // Re-anchoring (Evolve).
                EdgeCreator.evolve(registry, reanchoringEdge, evolutionTargetNode, reasonName);
            } else {
                // Cutting (Delete).
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
        menuManager: MenuManager | null,
        onLayoutUpdate: () => void
    ): ReactNode {
        const NODE_WIDTH = 200;
        const NODE_HEIGHT = 64;

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

        return (
            <>
                {prerenderEdges.map((prerenderEdge: PrerenderEdge): ReactNode => {
                    // If this edge is currently being re-anchored, hide it.
                    if (reanchoringEdge && prerenderEdge.edge.id === reanchoringEdge.id) {
                        return null;
                    }

                    // Filter the history based on the timeline.
                    // If updateTimes is missing (empty graph), show everything (default behavior).
                    if (!currentTime) {
                         return (
                            <EdgeLine
                                key={prerenderEdge.edge.id}
                                {...prerenderEdge}
                                onCut={(): void => handleCut(prerenderEdge.edge)}
                                onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                            />
                        );
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
                                        key={`${prerenderEdge.edge.id}-${nextHistoryIndex}-new-born`}
                                        {...prerenderEdge}
                                        endX={targetNode.x + NODE_WIDTH}
                                        endY={targetNode.y + NODE_HEIGHT / 2}
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
                        const historyIndex = relevantHistory.length - 1;
                        const record = relevantHistory[historyIndex];
                        const targetNode = nodeMap.get(record.targetUpstream.id);
                        
                        // If the target node is missing (which should not happen), fallback to default properties.
                        const overrideProps = targetNode ? {
                            endX: targetNode.x + NODE_WIDTH,
                            endY: targetNode.y + NODE_HEIGHT / 2
                        } : {};

                        return (
                             <EdgeLine
                                key={`${prerenderEdge.edge.id}-${historyIndex}`}
                                {...prerenderEdge}
                                {...overrideProps}
                                historyIndex={historyIndex}  // Override to show past state.
                                onCut={(): void => handleCut(prerenderEdge.edge)}
                                onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                            />
                        );
                    } else {
                        // Transition Mode: Show BOTH states if changed between current and next.
                        const currentHistoryIndex = relevantHistory.length - 1;
                        
                        let nextHistoryIndex = currentHistoryIndex;

                        if (nextTime) {
                             // Find the latest record created ON or BEFORE nextTime.
                             const nextHistory: EdgeHistoryRecord[] = prerenderEdge.edge.history.filter((h: EdgeHistoryRecord): boolean => h.updatedAt <= nextTime);

                             if (nextHistory.length > 0) {
                                 nextHistoryIndex = nextHistory.length - 1;
                             }
                        }
                        
                        // If the indices are the same, there is no change in this transition step.
                        if (nextHistoryIndex === currentHistoryIndex) {
                             const record = relevantHistory[currentHistoryIndex];
                             const targetNode = nodeMap.get(record.targetUpstream.id);
                             const overrideProps = targetNode ? {
                                endX: targetNode.x + NODE_WIDTH,
                                endY: targetNode.y + NODE_HEIGHT / 2
                             } : {};

                             return (
                                <EdgeLine
                                    key={`${prerenderEdge.edge.id}-${currentHistoryIndex}`}
                                    {...prerenderEdge}
                                    {...overrideProps}
                                    historyIndex={currentHistoryIndex}
                                    onCut={(): void => handleCut(prerenderEdge.edge)}
                                    onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                />
                            );
                        }
                        
                        // Change detected. Compare upstream nodes.
                        const oldRecord = prerenderEdge.edge.history[currentHistoryIndex];
                        const newRecord = prerenderEdge.edge.history[nextHistoryIndex];
                        
                        const isUpstreamSame = oldRecord.targetUpstream.id === newRecord.targetUpstream.id;
                        
                        if (isUpstreamSame) {
                            // Same Upstream -> Highlight with Reason Color.
                            // Render new version with Reason highlight.
                            const targetNode = nodeMap.get(newRecord.targetUpstream.id);
                            const overrideProps = targetNode ? {
                                endX: targetNode.x + NODE_WIDTH,
                                endY: targetNode.y + NODE_HEIGHT / 2
                             } : {};
                            
                            const reasonColor: string = (newRecord.evolutionReason.metadata?.color as string) || '#FFD700';

                            return (
                                <EdgeLine
                                    key={`${prerenderEdge.edge.id}-${nextHistoryIndex}-yellow`}
                                    {...prerenderEdge}
                                    {...overrideProps}
                                    historyIndex={nextHistoryIndex}
                                    highlightColor={reasonColor}
                                    onCut={(): void => handleCut(prerenderEdge.edge)}
                                    onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                />
                            );
                        } else {
                            // Different Upstream -> Red (Old) and Reason Color (New).
                            const oldTargetNode = nodeMap.get(oldRecord.targetUpstream.id);
                            const newTargetNode = nodeMap.get(newRecord.targetUpstream.id);

                            const reasonColor: string = (newRecord.evolutionReason.metadata?.color as string) || '#4CAF50';

                            return (
                                <>
                                    {oldTargetNode && (
                                        <EdgeLine
                                            key={`${prerenderEdge.edge.id}-${currentHistoryIndex}-old`}
                                            {...prerenderEdge}
                                            endX={oldTargetNode.x + NODE_WIDTH}
                                            endY={oldTargetNode.y + NODE_HEIGHT / 2}
                                            historyIndex={currentHistoryIndex}
                                            highlightColor="#FF3B30"  // Red for Old/Cut.
                                            onCut={(): void => handleCut(prerenderEdge.edge)}
                                            onReanchor={(): void => handleReanchor(prerenderEdge.edge)}
                                        />
                                    )}

                                    {newTargetNode && (
                                        <EdgeLine
                                            key={`${prerenderEdge.edge.id}-${nextHistoryIndex}-new`}
                                            {...prerenderEdge}
                                            endX={newTargetNode.x + NODE_WIDTH}
                                            endY={newTargetNode.y + NODE_HEIGHT / 2}
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
