import type { Node } from '@todo-requirement-blueprint/domain';

import type { BlueprintPrerenderCombResult } from '../layout/BlueprintPrerenderCombResult';
import type { NodeColors } from '../prerender/NodeColors';
import type { PrerenderEdge } from '../prerender/PrerenderEdge';
import type { PrerenderNode } from '../prerender/PrerenderNode';
import type { TimelineGraphProjectionResult } from './TimelineGraphProjectionResult';
import type { VersionTransition } from '../prerender/VersionTransition';


export class TimelineGraphProjector {
    private static _getNodeColors(node: Node): NodeColors {
        const metadata: Record<string, unknown> | undefined = node.status.metadata;
        const backgroundColor: string = (metadata?.backgroundColor as string) || '#F5F5F5';
        const borderColor: string = (metadata?.borderColor as string) || '#666666';

        return {
            backgroundColor,
            borderColor
        };
    }

    private static _interpolateColor(startColor: string, endColor: string, progress: number): string {
        const startRgb: { red: number; green: number; blue: number } = TimelineGraphProjector._parseColor(startColor);
        const endRgb: { red: number; green: number; blue: number } = TimelineGraphProjector._parseColor(endColor);
        const red: number = Math.round(startRgb.red + (endRgb.red - startRgb.red) * progress);
        const green: number = Math.round(startRgb.green + (endRgb.green - startRgb.green) * progress);
        const blue: number = Math.round(startRgb.blue + (endRgb.blue - startRgb.blue) * progress);

        return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    }

    private static _parseColor(hexColor: string): { red: number; green: number; blue: number } {
        const hex: string = hexColor.replace('#', '');
        const red: number = parseInt(hex.substring(0, 2), 16);
        const green: number = parseInt(hex.substring(2, 4), 16);
        const blue: number = parseInt(hex.substring(4, 6), 16);

        return {
            red,
            green,
            blue
        };
    }

    private static _getVersionTransition(
        startNode: PrerenderNode,
        endNode: PrerenderNode,
        progress: number
    ): VersionTransition | undefined {
        const startVersion: string = startNode.node.version;
        const endVersion: string = endNode.node.version;

        // Only show version transition if version actually changes.
        if (startVersion === endVersion) {
            return undefined;
        }

        return {
            startVersion,
            endVersion,
            progress
        };
    }

    public static project(
        layoutResult: BlueprintPrerenderCombResult,
        timelineRawPosition: number
    ): TimelineGraphProjectionResult {
        const {
            prerenderNodes: latestNodes,
            prerenderEdges,
            frames,
            edgeFrames
        }: BlueprintPrerenderCombResult = layoutResult;
        const displayedNodes: PrerenderNode[] = [];
        const displayedEdges: PrerenderEdge[] = [];

        if (frames && frames.size > 0) {
            const startIndex: number = Math.floor(timelineRawPosition);
            const endIndex: number = Math.ceil(timelineRawPosition);
            const progress: number = timelineRawPosition - startIndex;
            const startFrame: PrerenderNode[] = frames.get(startIndex) || latestNodes;
            const endFrame: PrerenderNode[] = frames.get(endIndex) || startFrame;
            const endNodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
            const processedNodeIds: Set<string> = new Set<string>();

            endFrame.forEach((prerenderNode: PrerenderNode): void => {
                endNodeMap.set(prerenderNode.node.id, prerenderNode);
            });

            startFrame.forEach((startNode: PrerenderNode): void => {
                const endNode: PrerenderNode | undefined = endNodeMap.get(startNode.node.id);

                if (endNode) {
                    const startColors: NodeColors = TimelineGraphProjector._getNodeColors(startNode.node);
                    const endColors: NodeColors = TimelineGraphProjector._getNodeColors(endNode.node);
                    const versionTransition: VersionTransition | undefined = TimelineGraphProjector._getVersionTransition(
                        startNode,
                        endNode,
                        progress
                    );

                    displayedNodes.push({
                        node: endNode.node,
                        x: startNode.x + (endNode.x - startNode.x) * progress,
                        y: startNode.y + (endNode.y - startNode.y) * progress,
                        opacity: 1,
                        backgroundColor: TimelineGraphProjector._interpolateColor(
                            startColors.backgroundColor,
                            endColors.backgroundColor,
                            progress
                        ),
                        borderColor: TimelineGraphProjector._interpolateColor(
                            startColors.borderColor,
                            endColors.borderColor,
                            progress
                        ),
                        versionTransition
                    });
                } else {
                    const startColors: NodeColors = TimelineGraphProjector._getNodeColors(startNode.node);

                    displayedNodes.push({
                        node: startNode.node,
                        x: startNode.x,
                        y: startNode.y,
                        opacity: 1 - progress,
                        backgroundColor: startColors.backgroundColor,
                        borderColor: startColors.borderColor
                    });
                }

                processedNodeIds.add(startNode.node.id);
            });

            endFrame.forEach((endNode: PrerenderNode): void => {
                if (!processedNodeIds.has(endNode.node.id)) {
                    const endColors: NodeColors = TimelineGraphProjector._getNodeColors(endNode.node);

                    displayedNodes.push({
                        node: endNode.node,
                        x: endNode.x,
                        y: endNode.y,
                        opacity: progress,
                        backgroundColor: endColors.backgroundColor,
                        borderColor: endColors.borderColor
                    });
                }
            });

            if (edgeFrames && edgeFrames.size > 0) {
                const startEdgeFrame: PrerenderEdge[] = edgeFrames.get(startIndex) || prerenderEdges;
                const endEdgeFrame: PrerenderEdge[] = edgeFrames.get(endIndex) || startEdgeFrame;
                const endEdgeMap: Map<string, PrerenderEdge> = new Map<string, PrerenderEdge>();
                const processedEdgeIds: Set<string> = new Set<string>();

                endEdgeFrame.forEach((prerenderEdge: PrerenderEdge): void => {
                    endEdgeMap.set(prerenderEdge.edge.id, prerenderEdge);
                });

                startEdgeFrame.forEach((startEdge: PrerenderEdge): void => {
                    const endEdge: PrerenderEdge | undefined = endEdgeMap.get(startEdge.edge.id);

                    if (endEdge) {
                        const startCurvature: number = startEdge.curvature || 0;
                        const endCurvature: number = endEdge.curvature || 0;
                        const startOpacity: number = startEdge.opacity !== undefined ? startEdge.opacity : 1;
                        const endOpacity: number = endEdge.opacity !== undefined ? endEdge.opacity : 1;

                        displayedEdges.push({
                            edge: startEdge.edge,
                            startX: startEdge.startX + (endEdge.startX - startEdge.startX) * progress,
                            startY: startEdge.startY + (endEdge.startY - startEdge.startY) * progress,
                            endX: startEdge.endX + (endEdge.endX - startEdge.endX) * progress,
                            endY: startEdge.endY + (endEdge.endY - startEdge.endY) * progress,
                            labelPositionDivisions: endEdge.labelPositionDivisions,
                            labelPositionIndex: endEdge.labelPositionIndex,
                            curvature: startCurvature + (endCurvature - startCurvature) * progress,
                            opacity: startOpacity + (endOpacity - startOpacity) * progress
                        });
                    } else {
                        const startOpacity: number = startEdge.opacity !== undefined ? startEdge.opacity : 1;

                        displayedEdges.push({
                            ...startEdge,
                            opacity: startOpacity * (1 - progress)
                        });
                    }

                    processedEdgeIds.add(startEdge.edge.id);
                });

                endEdgeFrame.forEach((endEdge: PrerenderEdge): void => {
                    if (!processedEdgeIds.has(endEdge.edge.id)) {
                        const endOpacity: number = endEdge.opacity !== undefined ? endEdge.opacity : 1;

                        displayedEdges.push({
                            ...endEdge,
                            opacity: endOpacity * progress
                        });
                    }
                });
            } else {
                displayedEdges.push(...prerenderEdges);
            }
        } else {
            displayedNodes.push(...latestNodes);
            displayedEdges.push(...prerenderEdges);
        }

        return {
            displayedNodes,
            displayedEdges
        };
    }

    public static resolveLayerGapCenters(layoutResult: BlueprintPrerenderCombResult, timelineRawPosition: number): number[] {
        const { layerGapCenters, layerGapFrames, frames }: BlueprintPrerenderCombResult = layoutResult;

        if (layerGapFrames && layerGapFrames.size > 0 && frames && frames.size > 0) {
            const startIndex: number = Math.floor(timelineRawPosition);
            const endIndex: number = Math.ceil(timelineRawPosition);
            const progress: number = timelineRawPosition - startIndex;
            const startGaps: number[] = layerGapFrames.get(startIndex) || layerGapCenters;
            const endGaps: number[] = layerGapFrames.get(endIndex) || startGaps;
            const maxLength: number = Math.max(startGaps.length, endGaps.length);
            const displayedGaps: number[] = [];

            for (let index: number = 0; index < maxLength; index++) {
                const startValue: number = startGaps[index] ?? startGaps[startGaps.length - 1] ?? 0;
                const endValue: number = endGaps[index] ?? endGaps[endGaps.length - 1] ?? 0;
                displayedGaps.push(startValue + (endValue - startValue) * progress);
            }

            return displayedGaps;
        }

        return layerGapCenters;
    }
}
