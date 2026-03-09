import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { EdgeEvolutionReason } from '../../../domain/EdgeEvolutionReason';


export interface EdgeEvolutionReasonEditModalProps {
    registry: DomainRegistry;
    reasonName: string;
    onClose: () => void;
    onLayoutUpdate: () => void;
}


interface EdgeEvolutionReasonEditModalState {
    name: string;
    description: string;
    error: string | null;
    selectedColorPreset: ColorPreset | null;
}


interface ColorPreset {
    name: string;
    color: string;
}


class EdgeEvolutionReasonEditModal extends Component<EdgeEvolutionReasonEditModalProps, EdgeEvolutionReasonEditModalState> {
    private static readonly COLOR_PRESETS: ColorPreset[] = [
        { name: 'Blue', color: '#007AFF' },
        { name: 'Green', color: '#34C759' },
        { name: 'Orange', color: '#FF9500' },
        { name: 'Yellow', color: '#FFCC00' },
        { name: 'Red', color: '#FF3B30' },
        { name: 'Purple', color: '#AF52DE' },
        { name: 'Grey', color: '#8E8E93' }
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
        const { name, description, selectedColorPreset }: EdgeEvolutionReasonEditModalState = this.state;
        const { registry, reasonName, onClose, onLayoutUpdate }: EdgeEvolutionReasonEditModalProps = this.props;

        if (name && description) {
            try {
                let metadata: Record<string, unknown> | undefined;

                if (selectedColorPreset) {
                    metadata = {
                        color: selectedColorPreset.color
                    };
                }

                const newReason: EdgeEvolutionReason = new EdgeEvolutionReason(name, description, metadata);
                registry.updateEdgeEvolutionReason(reasonName, newReason);
                
                onLayoutUpdate();
                onClose();
            } catch (error) {
                this.setState({ error: (error as Error).message });
            }
        }
    };

    public constructor(props: EdgeEvolutionReasonEditModalProps) {
        super(props);

        this.state = {
            name: '',
            description: '',
            error: null,
            selectedColorPreset: null
        };
    }

    public componentDidMount(): void {
        const reason: EdgeEvolutionReason | undefined = this.props.registry.allEdgeEvolutionReasons.find(
            (r: EdgeEvolutionReason): boolean => r.name === this.props.reasonName
        );

        if (reason) {
            let preset: ColorPreset | null = null;

            if (reason.metadata && reason.metadata.color) {
                const color: string = reason.metadata.color as string;
                preset = EdgeEvolutionReasonEditModal.COLOR_PRESETS.find((p: ColorPreset): boolean => p.color === color) || { name: 'Custom', color: color };
            } else {
                // Default to Blue if no color set.
                preset = EdgeEvolutionReasonEditModal.COLOR_PRESETS[0];
            }

            this.setState({
                name: reason.name,
                description: reason.description,
                selectedColorPreset: preset
            });
        } else {
            this.setState({ error: 'Reason not found.' });
        }
    }

    public render(): ReactNode {
        const { name, description, error }: EdgeEvolutionReasonEditModalState = this.state;
        const { onClose }: EdgeEvolutionReasonEditModalProps = this.props;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Edit Evolution Reason</h2>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Name (UPPER_SNAKE_CASE)</label>
                    <input
                        type="text"
                        value={name}
                        onChange={this.handleNameChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('UserDefinedEnum', 'name', 'REFACTORING')}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={this.handleDescriptionChange}
                        style={this.getInputStyle()}
                        placeholder={this.getPlaceholder('UserDefinedEnum', 'description', 'Refactoring for performance')}
                    />
                </div>

                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Color Scheme</label>
                    <div style={this.getColorGridStyle()}>
                        {EdgeEvolutionReasonEditModal.COLOR_PRESETS.map((preset: ColorPreset): ReactNode => (
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
            backgroundColor: preset.color,
            border: isSelected ? '2px solid #000000' : '2px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            opacity: 0.8,
            boxShadow: isSelected ? '0 0 0 2px rgba(0, 0, 0, 0.1)' : 'none',
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

    private getPlaceholder(definitionKey: string, propertyName: string, fallback: string): string {
        const definition: any = this.props.registry.getSchemaDefinition(definitionKey);

        if (definition && definition.properties && definition.properties[propertyName]) {
            return definition.properties[propertyName].description || fallback;
        }

        return fallback;
    }
}


export default EdgeEvolutionReasonEditModal;
