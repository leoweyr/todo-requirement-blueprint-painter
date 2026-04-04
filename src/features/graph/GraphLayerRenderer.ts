import { createElement, Fragment, type MouseEvent, type ReactNode } from 'react';

import { EdgeInteractionManager } from '../../components/canvas/edge-interaction/EdgeInteractionManager';
import NodeRectangle from '../../components/elements/NodeRectangle';
import type { PrerenderNode } from './PrerenderNode';
import type { GraphLayerRendererOptions } from './GraphLayerRendererOptions';


export class GraphLayerRenderer {
    public static render(options: GraphLayerRendererOptions): ReactNode {
        const nodeMap: Map<string, PrerenderNode> = new Map<string, PrerenderNode>();
        options.repulsedNodes.forEach((node: PrerenderNode): void => {
            nodeMap.set(node.node.id, node);
        });

        const renderedEdges: ReactNode = EdgeInteractionManager.renderEdges(
            options.displayedEdges,
            options.reanchoringEdge,
            options.currentTime,
            options.nextTime,
            options.timelineIsTransition,
            nodeMap,
            options.registry,
            options.edgeDrawerRef,
            options.menuManagerRef,
            options.onForceUpdate
        );

        const renderedNodes: ReactNode[] = options.repulsedNodes.map((prerenderNode: PrerenderNode): ReactNode => createElement(NodeRectangle, {
            key: prerenderNode.node.id as string,
            node: prerenderNode.node,
            x: prerenderNode.x,
            y: prerenderNode.y,
            opacity: prerenderNode.opacity,
            backgroundColor: prerenderNode.backgroundColor,
            borderColor: prerenderNode.borderColor,
            onStartEdge: (nodeId: string): void => {
                if (!options.edgeDrawerRef) {
                    return;
                }

                options.edgeDrawerRef.handleStartEdge(nodeId, {
                    strokeColor: '#4CAF50',
                    strokeDasharray: '5,5'
                });
            },
            onCompleteEdge: (nodeId: string): void => {
                if (options.edgeDrawerRef) {
                    options.edgeDrawerRef.handleCompleteEdge(nodeId);
                }
            },
            onContextMenu: (event: MouseEvent): void => options.onNodeContextMenu(event, prerenderNode.node.id as string)
        }));

        return createElement(Fragment, null, renderedEdges, ...renderedNodes);
    }
}
