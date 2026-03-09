import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { ColorUtils } from '../../../utils/ColorUtils';
import { NodeStatusCreator } from '../node-status-edit/NodeStatusCreator';


export interface NodeStatusCreateModalProps {
    registry: DomainRegistry;
    onClose: () => void;
}


interface NodeStatusCreateModalState {
    name: string;
    description: string;
    error: string | null;
    selectedColorPreset: ColorPreset | null;
    customFillColor: string;
}


interface ColorPreset {
    name: string;
    fill: string;
    stroke: string;
}


class NodeStatusCreateModal extends Component<NodeStatusCreateModalProps, NodeStatusCreateModalState> {
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
        this.setState({ 
            selectedColorPreset: preset,
            customFillColor: '' 
        });
    };

    private handleCustomColorChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ 
            selectedColorPreset: null,
            customFillColor: event.target.value
        });
    };

    private handleConfirmClick: () => void = (): void => {
        const { name, description, selectedColorPreset, customFillColor }: NodeStatusCreateModalState = this.state;
        const { registry, onClose }: NodeStatusCreateModalProps = this.props;

        if (name && description) {
            try {
                let metadata: Record<string, unknown> | undefined;

                if (this.isColorSelectionEnabled()) {
                    if (selectedColorPreset) {
                        metadata = {
                            backgroundColor: selectedColorPreset.fill,
                            borderColor: selectedColorPreset.stroke
                        };
                    } else if (customFillColor) {
                        metadata = {
                            backgroundColor: customFillColor,
                            borderColor: ColorUtils.calculateBorderColor(customFillColor)
                        };
                    }
                }

                NodeStatusCreator.create(registry, name, description, metadata);
                onClose();
            } catch (error) {
                this.setState({ error: (error as Error).message });
            }
        }
    };

    public constructor(props: NodeStatusCreateModalProps) {
        super(props);

        this.state = {
            name: '',
            description: '',
            error: null,
            selectedColorPreset: this.isColorSelectionEnabled() ? NodeStatusCreateModal.COLOR_PRESETS[0] : null,
            customFillColor: ''
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
        const { name, description, error }: NodeStatusCreateModalState = this.state;
        const { onClose }: NodeStatusCreateModalProps = this.props;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Create New Node Status</h2>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Name (UPPER_SNAKE_CASE)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={this.handleNameChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('UserDefinedEnum', 'name', 'MY_STATUS')}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={this.handleDescriptionChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('UserDefinedEnum', 'description', 'Description of the status')}
                    />
                </div>

                {this.isColorSelectionEnabled() && (
                    <div style={this.getFieldGroupStyle()}>
                        <label style={this.getLabelStyle()}>Color Scheme</label>
                        <div style={this.getColorGridStyle()}>
                            {NodeStatusCreateModal.COLOR_PRESETS.map((preset: ColorPreset): ReactNode => (
                                <div
                                    key={preset.name}
                                    style={this.getColorSwatchStyle(preset)}
                                    onClick={(): void => this.handleColorSelect(preset)}
                                    title={preset.name}
                                />
                            ))}
                        </div>
                        
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#666' }}>Custom Fill:</label>
                            <input 
                                type="color" 
                                value={this.state.customFillColor || '#ffffff'}
                                onChange={this.handleCustomColorChange}
                                style={{ cursor: 'pointer', height: '30px', width: '50px', padding: 0, border: 'none' }}
                            />
                            {this.state.customFillColor && (
                                <span style={{ fontSize: '11px', color: '#888' }}>
                                    Border will be auto-calculated.
                                </span>
                            )}
                        </div>
                    </div>
                )}

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
                        Create
                    </button>
                </div>
            </div>
        );
    }

    private isColorSelectionEnabled(): boolean {
        const currentVersion: string = this.props.registry.trbVersion.replace(/^v/, '');

        if (!currentVersion) return false;

        const v1: number[] = currentVersion.split('.').map(Number);
        const v2: number[] = [1, 1, 0];

        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1: number = v1[i] || 0;
            const num2: number = v2[i] || 0;

            if (num1 > num2) return true;

            if (num1 < num2) return false;
        }
        return true;
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


export default NodeStatusCreateModal;
