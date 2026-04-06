import type { MouseEvent } from 'react';
import { Edge } from '@todo-requirement-blueprint/domain';

import type EdgeDrawer from '../../components/canvas/edge-interaction/EdgeDrawer';
import type { EdgeMenuHandler } from '../../components/canvas/edge-interaction/EdgeMenuHandler';
import type { PrerenderEdge } from './PrerenderEdge';
import type { PrerenderNode } from './PrerenderNode';
import { DomainRegistry } from '../registry/DomainRegistry';


export interface GraphLayerRendererOptions {
    displayedEdges: PrerenderEdge[];
    repulsedNodes: PrerenderNode[];
    reanchoringEdge: Edge | null;
    isHistoricalSliceLocked: boolean;
    currentTime: string | undefined;
    nextTime: string | undefined;
    timelineIsTransition: boolean;
    registry: DomainRegistry;
    edgeDrawerRef: EdgeDrawer | null;
    menuManagerRef: EdgeMenuHandler | null;
    onForceUpdate: () => void;
    onNodeContextMenu: (event: MouseEvent, nodeId: string) => void;
}
