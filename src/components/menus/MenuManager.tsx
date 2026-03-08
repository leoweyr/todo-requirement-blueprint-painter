import { Component, type ReactNode, type MouseEvent } from 'react';

import { DomainRegistry } from '../../features/registry/DomainRegistry';
import { BlueprintPrerenderComb } from '../../features/graph/BlueprintPrerenderComb';
import { CanvasViewport } from '../canvas/CanvasViewport';
import { Node } from '../../domain/Node';
import { Edge } from '../../domain/Edge';
import { EdgeEvolver } from './edge-edit/EdgeEvolver';
import { BlueprintPaster } from './blueprint-edit/BlueprintPaster';
import { BlueprintSaver } from './blueprint-edit/BlueprintSaver';
import { type BlueprintPrerenderCombResult } from '../../features/graph/BlueprintPrerenderCombResult';
import ContextMenu from './context-menu/ContextMenu';
import BackdropBlur from './BackdropBlur';
import NodeCreateModal from './modals/NodeCreateModal';
import NodeStatusCreateModal from './modals/NodeStatusCreateModal';
import NodeStatusEditModal from './node-status-edit/NodeStatusEditModal';
import NodeEditModal from './node-edit/NodeEditModal';
import EdgeCreateModal from './modals/EdgeCreateModal';
import EdgeEvolutionReasonModal from './modals/EdgeEvolutionReasonModal';
import EdgeEvolutionReasonCreateModal from './modals/EdgeEvolutionReasonCreateModal';
import EdgeEvolutionReasonEditModal from './modals/EdgeEvolutionReasonEditModal';
import NodeContextMenu from './context-menu/NodeContextMenu';
import LegendContextMenu from './context-menu/LegendContextMenu';


export interface MenuManagerProps {
    registry: DomainRegistry;
    layoutService: BlueprintPrerenderComb;
    viewport: CanvasViewport;
    onLayoutRefresh: () => void;
    onLayoutUpdate: (result: BlueprintPrerenderCombResult) => void;
}


interface MenuManagerState {
    isNodeCreateModalOpen: boolean;
    isNodeStatusCreateModalOpen: boolean;
    isEdgeEvolutionReasonCreateModalOpen: boolean;
    
    // The following properties manage the node status edit state.
    isNodeStatusEditModalOpen: boolean;
    nodeStatusToEdit: string | null;

    // The following properties manage the edge evolution reason edit state.
    isEdgeEvolutionReasonEditModalOpen: boolean;
    edgeEvolutionReasonToEdit: string | null;

    // The following properties manage the node edit state.
    isNodeEditModalOpen: boolean;
    nodeEditNodeId: string | null;

    // The following properties manage the edge creation state.
    isEdgeCreateModalOpen: boolean;
    edgeCreateSourceNode: Node | null;
    edgeCreateTargetNode: Node | null;

    // The following properties manage the edge evolution state.
    isEdgeEvolutionModalOpen: boolean;
    reanchoringEdge: Edge | null;
    evolutionTargetNode: Node | null;

    // The following properties manage the node context menu state.
    nodeContextMenu: {
        isOpen: boolean;
        x: number;
        y: number;
        nodeId: string | null;
    };

    // The following properties manage the legend context menu state.
    legendContextMenu: {
        isOpen: boolean;
        x: number;
        y: number;
        type: 'node-status' | 'edge-evolution-reason' | null;
        itemName: string | null;
    };
}


class MenuManager extends Component<MenuManagerProps, MenuManagerState> {
    private _contextMenuRef: ContextMenu | null = null;

    // The following methods are internal handlers.
    private handleEvolutionConfirm: (reasonName: string) => void = (reasonName: string): void => {
        const { reanchoringEdge, evolutionTargetNode }: MenuManagerState = this.state;
        
        if (!reanchoringEdge) return;

        EdgeEvolver.confirmEvolution(
            this.props.registry,
            reanchoringEdge,
            evolutionTargetNode,
            reasonName,
            (): void => {
                this.setState(
                    {
                        isEdgeEvolutionModalOpen: false,
                        reanchoringEdge: null,
                        evolutionTargetNode: null
                    },
                    (): void => {
                        this.props.onLayoutRefresh();
                    }
                );
            }
        );
    };

    private handleDeleteNode: (nodeId: string) => void = (nodeId: string): void => {
        this.props.registry.deleteNode(nodeId);
        this.props.onLayoutRefresh();
        
        this.setState({
            nodeContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                nodeId: null
            }
        });
    };

    private handleDeleteNodeStatus: (statusName: string) => void = (statusName: string): void => {
        this.props.registry.deleteNodeStatus(statusName);
        this.props.onLayoutRefresh();  // Re-calculate layout often not needed for status delete, but forcing update is good.
        
        this.setState({
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                type: null,
                itemName: null
            }
        });
    };

    private handleDeleteEdgeEvolutionReason: (reasonName: string) => void = (reasonName: string): void => {
        this.props.registry.deleteEdgeEvolutionReason(reasonName);
        this.props.onLayoutRefresh();

        this.setState({
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                type: null,
                itemName: null
            }
        });
    };

    private handleEditNode: (nodeId: string) => void = (nodeId: string): void => {
        this.setState({
            nodeContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                nodeId: null
            },
            isNodeEditModalOpen: true,
            nodeEditNodeId: nodeId
        });
    };

    private handleEditNodeStatus: (statusName: string) => void = (statusName: string): void => {
        this.setState({
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                type: null,
                itemName: null
            },
            isNodeStatusEditModalOpen: true,
            nodeStatusToEdit: statusName
        });
    };

    private handleEditEdgeEvolutionReason: (reasonName: string) => void = (reasonName: string): void => {
        this.setState({
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                type: null,
                itemName: null
            },
            isEdgeEvolutionReasonEditModalOpen: true,
            edgeEvolutionReasonToEdit: reasonName
        });
    };

    constructor(properties: MenuManagerProps) {
        super(properties);

        this.state = {
            isNodeCreateModalOpen: false,
            isNodeStatusCreateModalOpen: false,
            isEdgeEvolutionReasonCreateModalOpen: false,
            isNodeStatusEditModalOpen: false,
            nodeStatusToEdit: null,
            isEdgeEvolutionReasonEditModalOpen: false,
            edgeEvolutionReasonToEdit: null,
            isNodeEditModalOpen: false,
            nodeEditNodeId: null,
            isEdgeCreateModalOpen: false,
            edgeCreateSourceNode: null,
            edgeCreateTargetNode: null,
            isEdgeEvolutionModalOpen: false,
            reanchoringEdge: null,
            evolutionTargetNode: null,
            nodeContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                nodeId: null
            },
            legendContextMenu: {
                isOpen: false,
                x: 0,
                y: 0,
                type: null,
                itemName: null
            }
        };
    }

    public render(): ReactNode {
        const { registry, layoutService, viewport, onLayoutUpdate } = this.props;

        return (
            <>
                <ContextMenu
                    ref={(contextMenu: ContextMenu | null): void => { this._contextMenuRef = contextMenu; }}
                    onCreateNode={(): void => this.setState({ isNodeCreateModalOpen: true })}
                    onCreateNodeStatus={(): void => this.setState({ isNodeStatusCreateModalOpen: true })}
                    onCreateEdgeEvolutionReason={(): void => this.setState({ isEdgeEvolutionReasonCreateModalOpen: true })}
                    onPaste={(): void => {
                        BlueprintPaster.paste(
                            registry,
                            layoutService,
                            viewport,
                            onLayoutUpdate
                        );
                    }}
                    onSave={(): void => BlueprintSaver.save(registry)}
                />

                {this.state.isNodeCreateModalOpen && (
                    <BackdropBlur>
                        <NodeCreateModal
                            registry={registry}
                            layoutService={layoutService}
                            onClose={(): void => this.setState({ isNodeCreateModalOpen: false })}
                            onLayoutUpdate={onLayoutUpdate}
                        />
                    </BackdropBlur>
                )}

                {this.state.isNodeStatusCreateModalOpen && (
                    <BackdropBlur>
                        <NodeStatusCreateModal
                            registry={registry}
                            onClose={(): void => this.setState({ isNodeStatusCreateModalOpen: false })}
                        />
                    </BackdropBlur>
                )}

                {this.state.isEdgeEvolutionReasonCreateModalOpen && (
                    <BackdropBlur>
                        <EdgeEvolutionReasonCreateModal
                            registry={registry}
                            onClose={(): void => this.setState({ isEdgeEvolutionReasonCreateModalOpen: false })}
                        />
                    </BackdropBlur>
                )}

                {this.state.isNodeStatusEditModalOpen && this.state.nodeStatusToEdit && (
                    <BackdropBlur>
                        <NodeStatusEditModal
                            registry={registry}
                            statusName={this.state.nodeStatusToEdit}
                            onClose={(): void => this.setState({ isNodeStatusEditModalOpen: false, nodeStatusToEdit: null })}
                            onLayoutUpdate={(): void => this.props.onLayoutRefresh()}
                        />
                    </BackdropBlur>
                )}

                {this.state.isEdgeEvolutionReasonEditModalOpen && this.state.edgeEvolutionReasonToEdit && (
                    <BackdropBlur>
                        <EdgeEvolutionReasonEditModal
                            registry={registry}
                            reasonName={this.state.edgeEvolutionReasonToEdit}
                            onClose={(): void => this.setState({ isEdgeEvolutionReasonEditModalOpen: false, edgeEvolutionReasonToEdit: null })}
                            onLayoutUpdate={(): void => this.props.onLayoutRefresh()}
                        />
                    </BackdropBlur>
                )}

                {this.state.isNodeEditModalOpen && this.state.nodeEditNodeId && (
                    <BackdropBlur>
                        <NodeEditModal
                            registry={registry}
                            nodeId={this.state.nodeEditNodeId}
                            onClose={(): void => this.setState({ isNodeEditModalOpen: false, nodeEditNodeId: null })}
                            onLayoutUpdate={(): void => this.props.onLayoutRefresh()}
                        />
                    </BackdropBlur>
                )}

                {this.state.isEdgeCreateModalOpen && this.state.edgeCreateSourceNode && this.state.edgeCreateTargetNode && (
                    <BackdropBlur>
                        <EdgeCreateModal
                            registry={registry}
                            layoutService={layoutService}
                            sourceNode={this.state.edgeCreateSourceNode}
                            targetNode={this.state.edgeCreateTargetNode}
                            onClose={(): void => this.setState(
                                { isEdgeCreateModalOpen: false, edgeCreateSourceNode: null, edgeCreateTargetNode: null }
                            )}
                            onLayoutUpdate={onLayoutUpdate}
                        />
                    </BackdropBlur>
                )}

                {this.state.isEdgeEvolutionModalOpen && (
                    <BackdropBlur>
                        <EdgeEvolutionReasonModal
                            registry={registry}
                            onClose={(): void => this.setState({ 
                                isEdgeEvolutionModalOpen: false, 
                                reanchoringEdge: null, 
                                evolutionTargetNode: null 
                            })}
                            onConfirm={this.handleEvolutionConfirm}
                        />
                    </BackdropBlur>
                )}

                {this.state.nodeContextMenu.isOpen && this.state.nodeContextMenu.nodeId && (
                    <NodeContextMenu
                        nodeId={this.state.nodeContextMenu.nodeId}
                        x={this.state.nodeContextMenu.x}
                        y={this.state.nodeContextMenu.y}
                        onEdit={this.handleEditNode}
                        onDelete={this.handleDeleteNode}
                        onClose={(): void => this.setState({ 
                            nodeContextMenu: { ...this.state.nodeContextMenu, isOpen: false } 
                        })}
                    />
                )}

                {this.state.legendContextMenu.isOpen && this.state.legendContextMenu.itemName && (
                    <LegendContextMenu
                        itemName={this.state.legendContextMenu.itemName}
                        x={this.state.legendContextMenu.x}
                        y={this.state.legendContextMenu.y}
                        onEdit={(name: string): void => {
                            if (this.state.legendContextMenu.type === 'node-status') {
                                this.handleEditNodeStatus(name);
                            } else {
                                this.handleEditEdgeEvolutionReason(name);
                            }
                        }}
                        onDelete={(name: string): void => {
                            if (this.state.legendContextMenu.type === 'node-status') {
                                this.handleDeleteNodeStatus(name);
                            } else {
                                this.handleDeleteEdgeEvolutionReason(name);
                            }
                        }}
                        onClose={(): void => this.setState({ 
                            legendContextMenu: { ...this.state.legendContextMenu, isOpen: false } 
                        })}
                    />
                )}
            </>
        );
    }

    // The following methods are the public API for App.tsx to trigger menus.
    public openGlobalContextMenu(event: MouseEvent): void {
        if (this._contextMenuRef) {
            this._contextMenuRef.handleOpen(event);
        }
    }

    public openNodeContextMenu(event: MouseEvent, nodeId: string): void {
        this.setState({
            nodeContextMenu: {
                isOpen: true,
                x: event.clientX,
                y: event.clientY,
                nodeId: nodeId
            }
        });
    }

    public openLegendContextMenu(event: MouseEvent, statusName: string): void {
        this.setState({
            legendContextMenu: {
                isOpen: true,
                x: event.clientX,
                y: event.clientY,
                type: 'node-status',
                itemName: statusName
            }
        });
    }

    public openEdgeEvolutionReasonContextMenu(event: MouseEvent, reasonName: string): void {
        this.setState({
            legendContextMenu: {
                isOpen: true,
                x: event.clientX,
                y: event.clientY,
                type: 'edge-evolution-reason',
                itemName: reasonName
            }
        });
    }

    public openEdgeCreateModal(sourceNode: Node, targetNode: Node): void {
        this.setState({
            isEdgeCreateModalOpen: true,
            edgeCreateSourceNode: sourceNode,
            edgeCreateTargetNode: targetNode
        });
    }

    public openEdgeEvolutionModal(reanchoringEdge: Edge, evolutionTargetNode: Node | null): void {
        this.setState({
            isEdgeEvolutionModalOpen: true,
            reanchoringEdge: reanchoringEdge,
            evolutionTargetNode: evolutionTargetNode
        });
    }

    public get reanchoringEdge(): Edge | null {
        return this.state.reanchoringEdge;
    }

    public cancelReanchoring(): void {
        this.setState({ reanchoringEdge: null });
    }

    public startEdgeCut(edge: Edge): void {
        EdgeEvolver.initiateCut(edge, (reanchoringEdge: Edge, evolutionTargetNode: Node | null, isModalOpen: boolean): void => {
            this.setState({
                isEdgeEvolutionModalOpen: isModalOpen,
                reanchoringEdge: reanchoringEdge,
                evolutionTargetNode: evolutionTargetNode
            });
        });
    }

    public setReanchoringEdge(edge: Edge | null): void {
        this.setState({ reanchoringEdge: edge });
    }
}


export default MenuManager;
