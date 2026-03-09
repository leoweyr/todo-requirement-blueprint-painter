import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { BlueprintPrerenderComb } from '../../../features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from '../../../features/graph/BlueprintPrerenderCombResult';
import { Node } from '../../../domain/Node';
import { EdgeType } from '../../../domain/enums/EdgeType';
import { EdgeStatus } from '../../../domain/enums/EdgeStatus';
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
}


class EdgeCreateModal extends Component<EdgeCreateModalProps, EdgeCreateModalState> {
    private handleDescriptionChange: (event: ChangeEvent<HTMLInputElement>) => void = (
        event: ChangeEvent<HTMLInputElement>
    ): void => {
        this.setState({ demandDescription: event.target.value });
    };

    private handleTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void = (
        event: ChangeEvent<HTMLSelectElement>
    ): void => {
        const value: string = event.target.value;

        // Type assertion needed because event.target.value is string.
        if (Object.values(EdgeType).includes(value as EdgeType)) {
             this.setState({ selectedType: value as EdgeType });
        }
    };

    private handleStatusChange: (event: ChangeEvent<HTMLSelectElement>) => void = (
        event: ChangeEvent<HTMLSelectElement>
    ): void => {
        const value: string = event.target.value;

        if (Object.values(EdgeStatus).includes(value as EdgeStatus)) {
            this.setState({ selectedStatus: value as EdgeStatus });
        }
    };

    private handleConfirmClick: () => void = (): void => {
        const { demandDescription, selectedType, selectedStatus }: EdgeCreateModalState = this.state;
        const { registry, layoutService, sourceNode, targetNode, onClose, onLayoutUpdate }: EdgeCreateModalProps = this.props;

        if (demandDescription && selectedType && selectedStatus) {
            EdgeCreator.create(
                registry,
                sourceNode,
                targetNode,
                demandDescription,
                selectedType,
                selectedStatus
            );
            
            // The EdgeCreator.create method modifies the sourceNode's edges in place.
            // The registry contains the node references, so it reflects these changes immediately.
            const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
            onLayoutUpdate(result);
            
            onClose();
        }
    };

    public constructor(props: EdgeCreateModalProps) {
        super(props);

        this.state = {
            demandDescription: '',
            selectedType: EdgeType.REQUIRES,
            selectedStatus: EdgeStatus.ACTIVE
        };
    }

    public render(): ReactNode {
        const { demandDescription, selectedType, selectedStatus }: EdgeCreateModalState = this.state;
        const { onClose }: EdgeCreateModalProps = this.props;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Create New Edge</h2>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Demand Description</label>
                    <input
                        type="text"
                        value={demandDescription}
                        onChange={this.handleDescriptionChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('Edge', 'demand_description', 'Describe the demand...')}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Type</label>
                    <select
                        value={selectedType}
                        onChange={this.handleTypeChange}
                        style={this.getInputStyle()}
                    >
                        {Object.values(EdgeType).map((type: string): ReactNode => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={this.handleStatusChange}
                        style={this.getInputStyle()}
                    >
                        {Object.values(EdgeStatus).map((status: string): ReactNode => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={this.getButtonGroupStyle()}>
                    <button
                        style={{ ...this.getButtonStyle(), backgroundColor: '#8E8E93' }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        style={this.getButtonStyle()}
                        onClick={this.handleConfirmClick}
                        disabled={!demandDescription}
                    >
                        Create
                    </button>
                </div>
            </div>
        );
    }

    private getContainerStyle(): CSSProperties {
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

    private getTitleStyle(): CSSProperties {
        return {
            margin: '0 0 10px 0',
            fontSize: '20px',
            fontWeight: 600,
            color: '#333333',
            textAlign: 'center'
        };
    }

    private getFieldGroupStyle(): CSSProperties {
        return {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        };
    }

    private getLabelStyle(): CSSProperties {
        return {
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333'
        };
    }

    private getInputStyle(): CSSProperties {
        return {
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CCCCCC',
            fontSize: '14px',
            boxSizing: 'border-box',
            width: '100%'
        };
    }

    private getButtonGroupStyle(): CSSProperties {
        return {
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px'
        };
    }

    private getButtonStyle(): CSSProperties {
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

    private getPlaceholder(definitionKey: string, propertyName: string, fallback: string): string {
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
