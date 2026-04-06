import type { PrerenderNode } from '../prerender/PrerenderNode';
import type { LegendScreenBounds } from '../../../components/canvas/legend/LegendScreenBounds';
import { type CanvasViewport } from '../../../components/canvas/viewport/CanvasViewport';
import type { Rectangle } from '../layout/Rectangle';
import type { RenderRepulsionApplyOptions } from './RenderRepulsionApplyOptions';


export class RenderRepulsionController {
    private static _resolveLegendWorldBounds(
        legendBounds: LegendScreenBounds | null,
        viewport: CanvasViewport,
        repulsionMargin: number
    ): Rectangle | null {
        if (!legendBounds) {
            return null;
        }

        return {
            left: RenderRepulsionController._screenToWorldX(legendBounds.left, viewport) - repulsionMargin,
            top: RenderRepulsionController._screenToWorldY(legendBounds.top, viewport) - repulsionMargin,
            right: RenderRepulsionController._screenToWorldX(legendBounds.right, viewport) + repulsionMargin,
            bottom: RenderRepulsionController._screenToWorldY(legendBounds.bottom, viewport) + repulsionMargin
        };
    }

    private static _screenToWorldX(screenX: number, viewport: CanvasViewport): number {
        return (screenX - viewport.x) / viewport.scale;
    }

    private static _screenToWorldY(screenY: number, viewport: CanvasViewport): number {
        return (screenY - viewport.y) / viewport.scale;
    }

    private static _buildNodeRectangle(node: PrerenderNode, nodeWidth: number, nodeHeight: number): Rectangle {
        return {
            left: node.x,
            top: node.y,
            right: node.x + nodeWidth,
            bottom: node.y + nodeHeight
        };
    }

    private static _rectanglesOverlap(rectangleA: Rectangle, rectangleB: Rectangle): boolean {
        return !(
            rectangleA.right <= rectangleB.left ||
            rectangleA.left >= rectangleB.right ||
            rectangleA.bottom <= rectangleB.top ||
            rectangleA.top >= rectangleB.bottom
        );
    }

    public static shouldApplyRepulsionNow(
        timelineIsTransition: boolean,
        isOnTimelineTick: boolean,
        isAtLatestSlice: boolean,
        anchorTickIndex: number | null,
        timelineTickIndex: number,
        currentSliceNodeCount: number
    ): boolean {
        return currentSliceNodeCount > 1
            && !timelineIsTransition
            && isOnTimelineTick
            && (isAtLatestSlice || anchorTickIndex === timelineTickIndex);
    }

    public static hasEnoughNodesForRepulsionAtPosition(
        layoutFrames: Map<number, PrerenderNode[]> | undefined,
        fallbackNodes: PrerenderNode[],
        timelineTickIndex: number
    ): boolean {
        if (layoutFrames && layoutFrames.size > 0) {
            const frameNodes: PrerenderNode[] = layoutFrames.get(timelineTickIndex) || fallbackNodes;
            return frameNodes.length > 1;
        }

        return fallbackNodes.length > 1;
    }

    public static apply(options: RenderRepulsionApplyOptions): PrerenderNode[] {
        const {
            nodes,
            legendBounds,
            viewport,
            nodeWidth,
            nodeHeight,
            repulsionMargin
        }: RenderRepulsionApplyOptions = options;

        const repulsedNodes: PrerenderNode[] = nodes
            .map((node: PrerenderNode): PrerenderNode => ({ ...node }))
            .sort((nodeA: PrerenderNode, nodeB: PrerenderNode): number => nodeA.y - nodeB.y);

        const worldLegendBounds: Rectangle | null = RenderRepulsionController._resolveLegendWorldBounds(
            legendBounds,
            viewport,
            repulsionMargin
        );

        const movedNodeIds: Set<string> = new Set<string>();
        const maxIterations: number = 8;

        for (let iteration: number = 0; iteration < maxIterations; iteration++) {
            let hasMovedInThisIteration: boolean = false;

            for (let index: number = 0; index < repulsedNodes.length; index++) {
                const currentNode: PrerenderNode = repulsedNodes[index];
                let currentRectangle: Rectangle = RenderRepulsionController._buildNodeRectangle(
                    currentNode,
                    nodeWidth,
                    nodeHeight
                );

                if (worldLegendBounds && RenderRepulsionController._rectanglesOverlap(currentRectangle, worldLegendBounds)) {
                    const pushDownDistance: number = worldLegendBounds.bottom - currentRectangle.top;
                    currentNode.y += pushDownDistance;
                    movedNodeIds.add(currentNode.node.id);
                    hasMovedInThisIteration = true;
                    currentRectangle = RenderRepulsionController._buildNodeRectangle(currentNode, nodeWidth, nodeHeight);
                }

                for (let nextIndex: number = index + 1; nextIndex < repulsedNodes.length; nextIndex++) {
                    const nextNode: PrerenderNode = repulsedNodes[nextIndex];
                    const nextRectangle: Rectangle = RenderRepulsionController._buildNodeRectangle(
                        nextNode,
                        nodeWidth,
                        nodeHeight
                    );

                    if (RenderRepulsionController._rectanglesOverlap(currentRectangle, nextRectangle)) {
                        const pushDownDistance: number = currentRectangle.bottom - nextRectangle.top + repulsionMargin;
                        nextNode.y += pushDownDistance;
                        movedNodeIds.add(nextNode.node.id);
                        hasMovedInThisIteration = true;
                    }
                }
            }

            if (!hasMovedInThisIteration) {
                break;
            }
        }

        return repulsedNodes.map((node: PrerenderNode): PrerenderNode => {
            if (!movedNodeIds.has(node.node.id)) {
                return node;
            }

            const originalNode: PrerenderNode | undefined = nodes.find(
                (original: PrerenderNode): boolean => original.node.id === node.node.id
            );

            if (!originalNode) {
                return node;
            }

            return {
                ...node,
                x: originalNode.x,
                opacity: node.opacity !== undefined ? node.opacity : originalNode.opacity,
                backgroundColor: node.backgroundColor || originalNode.backgroundColor,
                borderColor: node.borderColor || originalNode.borderColor
            };
        });
    }
}
