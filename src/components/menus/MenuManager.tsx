import { Component, type ReactNode, type MouseEvent } from 'react';

import { DomainRegistry } from '../../features/registry/DomainRegistry';
import { BlueprintPrerenderComb } from '../../features/graph/BlueprintPrerenderComb';
import { CanvasViewport } from '../canvas/CanvasViewport';
import { Node } from '../../domain/Node';
import { Edge } from '../../domain/Edge';
import { EdgeEvolver } from './edge-evolution/EdgeEvolver';
import { BlueprintPaster } from './blueprint-paste/BlueprintPaster';
import { BlueprintSaver } from './blueprint-save/BlueprintSaver';
import { type BlueprintPrerenderCombResult } from '../../features/graph/BlueprintPrerenderCombResult';
import ContextMenu from './context-menu/ContextMenu';
import BackdropBlur from './BackdropBlur';
import NodeCreateModal from './node-create/NodeCreateModal';
import NodeStatusCreateModal from './node-status-create/NodeStatusCreateModal';
import EdgeCreateModal from './edge-create/EdgeCreateModal';
import EdgeEvolutionReasonModal from './edge-evolution/EdgeEvolutionReasonModal';
import NodeContextMenu from './node-context-menu/NodeContextMenu';
import LegendContextMenu from './legend-context-menu/LegendContextMenu';


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
        statusName: string | null;
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
                statusName: null
            }
        });
    };

    constructor(properties: MenuManagerProps) {
        super(properties);

        this.state = {
            isNodeCreateModalOpen: false,
            isNodeStatusCreateModalOpen: false,
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
                statusName: null
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
                        onDelete={this.handleDeleteNode}
                        onClose={(): void => this.setState({ 
                            nodeContextMenu: { ...this.state.nodeContextMenu, isOpen: false } 
                        })}
                    />
                )}

                {this.state.legendContextMenu.isOpen && this.state.legendContextMenu.statusName && (
                    <LegendContextMenu
                        statusName={this.state.legendContextMenu.statusName}
                        x={this.state.legendContextMenu.x}
                        y={this.state.legendContextMenu.y}
                        onDelete={this.handleDeleteNodeStatus}
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
                statusName: statusName
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

    // Internal Handlers.
    public setReanchoringEdge(edge: Edge | null): void {
        this.setState({ reanchoringEdge: edge });
    }
}


export default MenuManager;
