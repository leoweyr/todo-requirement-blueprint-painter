import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { Node } from '@todo-requirement-blueprint/domain';
import { EdgeType } from '@todo-requirement-blueprint/domain';
import { EdgeStatus } from '@todo-requirement-blueprint/domain';
import { EdgeEvolutionReason } from '@todo-requirement-blueprint/domain';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { BlueprintPrerenderComb } from '../../../features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from '../../../features/graph/BlueprintPrerenderCombResult';
import { EdgeCreator } from '../edge-edit/EdgeCreator';


export interface EdgeCreateModalProps {
    registry: DomainRegistry;
    layoutService: BlueprintPrerenderComb;
    sourceNode: Node;
    targetNode: Node;
    onClose: () => void;
    onLayoutUpdate: (result: BlueprintPrerenderCombResult) => void;
}


interface EdgeCreateModalState {
    demandDescription: string;
    selectedType: EdgeType;
    selectedStatus: EdgeStatus;
    selectedReasonName: string;
}


class EdgeCreateModal extends Component<EdgeCreateModalProps, EdgeCreateModalState> {
    private static readonly DEFAULT_REASON_NAME: string = 'INITIAL_MVP';
    private static readonly DEFAULT_REASON_DESC: string = 'Initial minimum viable product.';

    private _handleDescriptionChange: (event: ChangeEvent<HTMLInputElement>) => void = (
        event: ChangeEvent<HTMLInputElement>
    ): void => {
        this.setState({ demandDescription: event.target.value });
    };

    private _handleTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void = (
        event: ChangeEvent<HTMLSelectElement>
    ): void => {
        const value: string = event.target.value;

        // Type assertion needed because event.target.value is string.
        if (Object.values(EdgeType).includes(value as EdgeType)) {
            this.setState({ selectedType: value as EdgeType });
        }
    };

    private _handleStatusChange: (event: ChangeEvent<HTMLSelectElement>) => void = (
        event: ChangeEvent<HTMLSelectElement>
    ): void => {
        const value: string = event.target.value;

        if (Object.values(EdgeStatus).includes(value as EdgeStatus)) {
            this.setState({ selectedStatus: value as EdgeStatus });
        }
    };

    private _handleReasonChange: (event: ChangeEvent<HTMLSelectElement>) => void = (
        event: ChangeEvent<HTMLSelectElement>
    ): void => {
        this.setState({ selectedReasonName: event.target.value });
    };

    private _handleConfirmClick: () => void = (): void => {
        const { demandDescription, selectedType, selectedStatus, selectedReasonName }: EdgeCreateModalState = this.state;
        const { registry, layoutService, sourceNode, targetNode, onClose, onLayoutUpdate }: EdgeCreateModalProps = this.props;

        if (demandDescription && selectedType && selectedStatus && selectedReasonName) {
            let evolutionReason: EdgeEvolutionReason | undefined = registry.getEdgeEvolutionReason(selectedReasonName);

            // If selected reason is the default one and not yet in registry, create and register it.
            if (!evolutionReason && selectedReasonName === EdgeCreateModal.DEFAULT_REASON_NAME) {
                evolutionReason = new EdgeEvolutionReason(
                    EdgeCreateModal.DEFAULT_REASON_NAME, 
                    EdgeCreateModal.DEFAULT_REASON_DESC
                );

                registry.registerEdgeEvolutionReason(evolutionReason, true);
            }

            if (evolutionReason) {
                EdgeCreator.create(
                    sourceNode,
                    targetNode,
                    demandDescription,
                    selectedType,
                    selectedStatus,
                    evolutionReason
                );
                
                // The EdgeCreator.create method modifies the sourceNode's edges in place.
                // The registry contains the node references, so it reflects these changes immediately.
                const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
                onLayoutUpdate(result);
                
                onClose();
            } else {
                console.error(`Evolution reason '${selectedReasonName}' not found.`);
            }
        }
    };

    public constructor(props: EdgeCreateModalProps) {
        super(props);

        this.state = {
            demandDescription: '',
            selectedType: EdgeType.REQUIRES,
            selectedStatus: EdgeStatus.ACTIVE,
            selectedReasonName: EdgeCreateModal.DEFAULT_REASON_NAME
        };
    }

    public render(): ReactNode {
        const { demandDescription, selectedType, selectedStatus, selectedReasonName }: EdgeCreateModalState = this.state;
        const { onClose }: EdgeCreateModalProps = this.props;
        const availableReasons: EdgeEvolutionReason[] = this._getAvailableReasons();

        return (
            <div style={this._getContainerStyle()}>
                <h2 style={this._getTitleStyle()}>Create New Edge</h2>

                <div style={this._getFieldGroupStyle()}>
                    <label style={this._getLabelStyle()}>Demand Description</label>
                    <input
                        type="text"
                        value={demandDescription}
                        onChange={this._handleDescriptionChange}
                        style={this._getInputStyle()}
                        placeholder={this._getPlaceholder('Edge', 'demand_description', 'Describe the demand...')}
                    />
                </div>

                <div style={this._getFieldGroupStyle()}>
                    <label style={this._getLabelStyle()}>Type</label>
                    <select
                        value={selectedType}
                        onChange={this._handleTypeChange}
                        style={this._getInputStyle()}
                    >
                        {Object.values(EdgeType).map((type: string): ReactNode => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={this._getFieldGroupStyle()}>
                    <label style={this._getLabelStyle()}>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={this._handleStatusChange}
                        style={this._getInputStyle()}
                    >
                        {Object.values(EdgeStatus).map((status: string): ReactNode => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={this._getFieldGroupStyle()}>
                    <label style={this._getLabelStyle()}>Evolution Reason</label>
                    <select
                        value={selectedReasonName}
                        onChange={this._handleReasonChange}
                        style={this._getInputStyle()}
                    >
                        {availableReasons.map((reason: EdgeEvolutionReason): ReactNode => (
                            <option key={reason.name} value={reason.name}>
                                {reason.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={this._getButtonGroupStyle()}>
                    <button
                        style={{ ...this._getButtonStyle(), backgroundColor: '#8E8E93' }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        style={this._getButtonStyle()}
                        onClick={this._handleConfirmClick}
                        disabled={!demandDescription}
                    >
                        Create
                    </button>
                </div>
            </div>
        );
    }

    private _getAvailableReasons(): EdgeEvolutionReason[] {
        const reasons: EdgeEvolutionReason[] = this.props.registry.allEdgeEvolutionReasons;
        const hasDefault: boolean = reasons.some((r: EdgeEvolutionReason) => r.name === EdgeCreateModal.DEFAULT_REASON_NAME);

        if (!hasDefault) {
            // Add default reason as a temporary option (not registered yet).
            const defaultReason = new EdgeEvolutionReason(
                EdgeCreateModal.DEFAULT_REASON_NAME,
                EdgeCreateModal.DEFAULT_REASON_DESC
            );

            return [...reasons, defaultReason];
        }

        return reasons;
    }


    private _getContainerStyle(): CSSProperties {
        return {
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '400px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
        };
    }

    private _getTitleStyle(): CSSProperties {
        return {
            margin: '0 0 10px 0',
            fontSize: '20px',
            fontWeight: 600,
            color: '#333333',
            textAlign: 'center'
        };
    }

    private _getFieldGroupStyle(): CSSProperties {
        return {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        };
    }

    private _getLabelStyle(): CSSProperties {
        return {
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private _getInputStyle(): CSSProperties {
        return {
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CCCCCC',
            fontSize: '14px',
            boxSizing: 'border-box',
            width: '100%'
        };
    }

    private _getButtonGroupStyle(): CSSProperties {
        return {
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px'
        };
    }

    private _getButtonStyle(): CSSProperties {
        return {
            padding: '10px 0',
            backgroundColor: '#007AFF',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            flex: 1
        };
    }

    private _getPlaceholder(definitionKey: string, propertyName: string, fallback: string): string {
        const definition: any = this.props.registry.getSchemaDefinition(definitionKey);

        if (definition && definition.properties && definition.properties[propertyName]) {
            return definition.properties[propertyName].description || fallback;
        }
        
        // Fallback for nested Edge definition if 'Edge' key is not found directly.
        // This handles case where Edge might be defined inline in Node.
        if (definitionKey === 'Edge') {
             const nodeDef: any = this.props.registry.getSchemaDefinition('Node');

             if (nodeDef && nodeDef.properties && nodeDef.properties.edges && nodeDef.properties.edges.items) {
                 const edgeProps = nodeDef.properties.edges.items.properties;

                 if (edgeProps && edgeProps[propertyName]) {
                     return edgeProps[propertyName].description || fallback;
                 }
             }
        }

        return fallback;
    }
}


export default EdgeCreateModal;
