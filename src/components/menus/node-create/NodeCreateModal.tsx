import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry.ts';
import { BlueprintPrerenderComb } from '../../../features/graph/BlueprintPrerenderComb.ts';
import { type BlueprintPrerenderCombResult } from '../../../features/graph/BlueprintPrerenderCombResult.ts';
import { NodeCreator } from './NodeCreator.ts';
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
        this.setState({ metadataJson: value });

        try {
            if (value.trim()) {
                JSON.parse(value);
            }
            this.setState({ metadataError: null });
        } catch (error) {
            this.setState({ metadataError: 'Invalid JSON format' });
        }
    };

    private handleConfirmClick: () => void = (): void => {
        const { description, version, selectedStatus, metadataJson, metadataError }: NodeCreateModalState = this.state;
        const { registry, layoutService, onClose, onLayoutUpdate }: NodeCreateModalProps = this.props;

        if (description && version && selectedStatus && !metadataError) {
            NodeCreator.create(registry, description, version, selectedStatus, metadataJson);
            
            const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
            onLayoutUpdate(result);
            
            onClose();
        }
    };

    private getContainerStyle: () => CSSProperties = (): CSSProperties => {
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
    };

    private getTitleStyle: () => CSSProperties = (): CSSProperties => {
        return {
            margin: '0 0 10px 0',
            fontSize: '20px',
            fontWeight: 600,
            color: '#333333',
            textAlign: 'center'
        };
    };

    private getFieldGroupStyle: () => CSSProperties = (): CSSProperties => {
        return {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        };
    };

    private getLabelStyle: () => CSSProperties = (): CSSProperties => {
        return {
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333'
        };
    };

    private getInputStyle: () => CSSProperties = (): CSSProperties => {
        return {
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #CCCCCC',
            fontSize: '14px',
            boxSizing: 'border-box',
            width: '100%'
        };
    };

    private getButtonGroupStyle: () => CSSProperties = (): CSSProperties => {
        return {
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px'
        };
    };

    private getButtonStyle: () => CSSProperties = (): CSSProperties => {
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
                        placeholder="Node Description"
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Version</label>
                    <input
                        type="text"
                        value={version}
                        onChange={this.handleVersionChange}
                        style={this.getInputStyle()}
                        placeholder="0.1.0"
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
}


export default NodeCreateModal;
