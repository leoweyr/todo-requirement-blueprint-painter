import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry.ts';
import { BlueprintPrerenderComb } from '../../../features/graph/BlueprintPrerenderComb.ts';
import { type BlueprintPrerenderCombResult } from '../../../features/graph/BlueprintPrerenderCombResult.ts';
import { NodeCreator } from '../node-edit/NodeCreator.ts';
import { NodeStatus } from '../../../domain/NodeStatus.ts';


export interface NodeCreateModalProps {
    registry: DomainRegistry;
    layoutService: BlueprintPrerenderComb;
    onClose: () => void;
    onLayoutUpdate: (result: BlueprintPrerenderCombResult) => void;
}


interface NodeCreateModalState {
    description: string;
    version: string;
    selectedStatus: string;
    metadataJson: string;
    metadataError: string | null;
}


class NodeCreateModal extends Component<NodeCreateModalProps, NodeCreateModalState> {
    private handleDescriptionChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ description: event.target.value });
    };

    private handleVersionChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ version: event.target.value });
    };

    private handleStatusChange: (event: ChangeEvent<HTMLSelectElement>) => void = (event: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedStatus: event.target.value });
    };

    private handleMetadataChange: (event: ChangeEvent<HTMLTextAreaElement>) => void = (event: ChangeEvent<HTMLTextAreaElement>): void => {
        const value: string = event.target.value;
        this.setState({ metadataJson: value, metadataError: null });
    };

    private handleConfirmClick: () => void = (): void => {
        const { description, version, selectedStatus, metadataJson }: NodeCreateModalState = this.state;
        const { registry, layoutService, onClose, onLayoutUpdate }: NodeCreateModalProps = this.props;

        if (description && version && selectedStatus) {
            try {
                NodeCreator.create(registry, description, version, selectedStatus, metadataJson);
                
                const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
                onLayoutUpdate(result);
                
                onClose();
            } catch (error) {
                if (error instanceof Error) {
                    this.setState({ metadataError: error.message });
                } else {
                    this.setState({ metadataError: 'Creation failed' });
                }
            }
        }
    };

    public constructor(props: NodeCreateModalProps) {
        super(props);

        const initialStatus: string = props.registry.allNodeStatuses.length > 0 ? props.registry.allNodeStatuses[0].name : '';

        this.state = {
            description: '',
            version: '1.0.0',
            selectedStatus: initialStatus,
            metadataJson: '{}',
            metadataError: null
        };
    }

    public componentDidMount(): void {
        // Force update if schema loads after mount.
        if (!this.props.registry.schema) {
            const checkSchema = setInterval(() => {
                if (this.props.registry.schema) {
                    this.forceUpdate();
                    clearInterval(checkSchema);
                }
            }, 100);
        }
    }

    public render(): ReactNode {
        const { description, version, selectedStatus, metadataJson, metadataError }: NodeCreateModalState = this.state;
        const { onClose, registry }: NodeCreateModalProps = this.props;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Create New Node</h2>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={this.handleDescriptionChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('Node', 'description', 'Node Description')}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Version</label>
                    <input
                        type="text"
                        value={version}
                        onChange={this.handleVersionChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('Node', 'version', '0.1.0')}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Status</label>
                    <select
                        value={selectedStatus}
                        onChange={this.handleStatusChange}
                        style={this.getInputStyle()}
                    >
                        {registry.allNodeStatuses.map((status: NodeStatus): ReactNode => (
                            <option key={status.name} value={status.name}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Metadata (JSON)</label>
                    <textarea
                        value={metadataJson}
                        onChange={this.handleMetadataChange}
                        style={{ ...this.getInputStyle(), height: '100px', fontFamily: 'monospace' }}
                    />
                    {metadataError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{metadataError}</div>}
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
                        disabled={!description || !version || !selectedStatus || !!metadataError}
                    >
                        Create
                    </button>
                </div>
            </div>
        );
    }

    private getPlaceholder(definitionKey: string, propertyName: string, fallback: string): string {
        const definition: any = this.props.registry.getSchemaDefinition(definitionKey);

        if (definition && definition.properties && definition.properties[propertyName]) {
            return definition.properties[propertyName].description || fallback;
        }

        return fallback;
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
}


export default NodeCreateModal;
