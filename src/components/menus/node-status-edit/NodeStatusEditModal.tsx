import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { NodeStatus } from '../../../domain/NodeStatus';


export interface NodeStatusEditModalProps {
    registry: DomainRegistry;
    statusName: string;
    onClose: () => void;
    onLayoutUpdate: () => void;
}


interface NodeStatusEditModalState {
    name: string;
    description: string;
    error: string | null;
    selectedColorPreset: ColorPreset | null;
}


interface ColorPreset {
    name: string;
    fill: string;
    stroke: string;
}


class NodeStatusEditModal extends Component<NodeStatusEditModalProps, NodeStatusEditModalState> {
    private static readonly COLOR_PRESETS: ColorPreset[] = [
        { name: 'White', fill: '#FFFFFF', stroke: '#000000' },
        { name: 'Blue', fill: '#dae8fc', stroke: '#6c8ebf' },
        { name: 'Green', fill: '#d5e8d4', stroke: '#82b366' },
        { name: 'Orange', fill: '#ffe6cc', stroke: '#d79b00' },
        { name: 'Yellow', fill: '#fff2cc', stroke: '#d6b656' },
        { name: 'Red', fill: '#f8cecc', stroke: '#b85450' },
        { name: 'Purple', fill: '#e1d5e7', stroke: '#9673a6' },
        { name: 'Grey', fill: '#f5f5f5', stroke: '#666666' }
    ];

    private handleNameChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ name: event.target.value.toUpperCase() });
    };

    private handleDescriptionChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ description: event.target.value });
    };

    private handleColorSelect: (preset: ColorPreset) => void = (preset: ColorPreset): void => {
        this.setState({ selectedColorPreset: preset });
    };

    private handleConfirmClick: () => void = (): void => {
        const { name, description, selectedColorPreset }: NodeStatusEditModalState = this.state;
        const { registry, statusName, onClose, onLayoutUpdate }: NodeStatusEditModalProps = this.props;

        if (name && description) {
            try {
                let metadata: Record<string, unknown> = {};
                const originalStatus = registry.getNodeStatus(statusName);
                
                if (originalStatus && originalStatus.metadata) {
                    metadata = { ...originalStatus.metadata };
                }

                if (selectedColorPreset) {
                    metadata.backgroundColor = selectedColorPreset.fill;
                    metadata.borderColor = selectedColorPreset.stroke;
                }

                const newStatus = new NodeStatus(name, description, metadata);
                
                // Update the registry to handle renaming and updating references.
                (registry as any).updateNodeStatus(statusName, newStatus);
                
                onLayoutUpdate();
                onClose();
            } catch (error) {
                this.setState({ error: (error as Error).message });
            }
        }
    };

    public constructor(properties: NodeStatusEditModalProps) {
        super(properties);

        this.state = {
            name: '',
            description: '',
            error: null,
            selectedColorPreset: null
        };
    }

    public componentDidMount(): void {
        const { registry, statusName }: NodeStatusEditModalProps = this.props;
        const status = registry.getNodeStatus(statusName);

        if (status) {
            let selectedPreset: ColorPreset | null = null;
            
            if (status.metadata && status.metadata.backgroundColor) {
                const fill = status.metadata.backgroundColor as string;
                // Find matching preset by fill color.
                selectedPreset = NodeStatusEditModal.COLOR_PRESETS.find(p => p.fill.toLowerCase() === fill.toLowerCase()) || null;
                
                // Default to the first preset if no match is found.
                if (!selectedPreset) {
                    selectedPreset = NodeStatusEditModal.COLOR_PRESETS[0];
                }
            } else {
                selectedPreset = NodeStatusEditModal.COLOR_PRESETS[0];
            }

            this.setState({
                name: status.name,
                description: status.description,
                selectedColorPreset: selectedPreset
            });
        }
    }

    public render(): ReactNode {
        const { name, description, error }: NodeStatusEditModalState = this.state;
        const { onClose }: NodeStatusEditModalProps = this.props;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Edit Node Status</h2>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Name (UPPER_SNAKE_CASE)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={this.handleNameChange}
                        style={this.getInputStyle()}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={this.handleDescriptionChange}
                        style={this.getInputStyle()}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Color Scheme</label>
                    <div style={this.getColorGridStyle()}>
                        {NodeStatusEditModal.COLOR_PRESETS.map((preset: ColorPreset): ReactNode => (
                            <div
                                key={preset.name}
                                style={this.getColorSwatchStyle(preset)}
                                onClick={(): void => this.handleColorSelect(preset)}
                                title={preset.name}
                            />
                        ))}
                    </div>
                </div>

                {error && <div style={{ color: 'red', fontSize: '12px' }}>{error}</div>}

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
                        disabled={!name || !description}
                    >
                        Save
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

    private getColorGridStyle(): CSSProperties {
        return {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '5px'
        };
    }

    private getColorSwatchStyle(preset: ColorPreset): CSSProperties {
        const isSelected: boolean = this.state.selectedColorPreset?.name === preset.name;
        
        return {
            width: '30px',
            height: '30px',
            backgroundColor: preset.fill,
            border: `2px solid ${isSelected ? '#007AFF' : preset.stroke}`,
            borderRadius: '4px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            boxShadow: isSelected ? '0 0 0 2px rgba(0, 122, 255, 0.3)' : 'none',
            transition: 'all 0.2s ease'
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


export default NodeStatusEditModal;
