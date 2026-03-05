import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry.ts';
import { NodeStatusCreator } from './NodeStatusCreator.ts';


export interface NodeStatusCreateModalProps {
    registry: DomainRegistry;
    onClose: () => void;
}


interface NodeStatusCreateModalState {
    name: string;
    description: string;
    error: string | null;
}


class NodeStatusCreateModal extends Component<NodeStatusCreateModalProps, NodeStatusCreateModalState> {
    private handleNameChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ name: event.target.value.toUpperCase() });
    };

    private handleDescriptionChange: (event: ChangeEvent<HTMLInputElement>) => void = (event: ChangeEvent<HTMLInputElement>): void => {
        this.setState({ description: event.target.value });
    };

    private handleConfirmClick: () => void = (): void => {
        const { name, description }: NodeStatusCreateModalState = this.state;
        const { registry, onClose }: NodeStatusCreateModalProps = this.props;

        if (name && description) {
            try {
                NodeStatusCreator.create(registry, name, description);
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
            error: null
        };
    }

    private getPlaceholder(definitionKey: string, propertyName: string, fallback: string): string {
        const definition: any = this.props.registry.getSchemaDefinition(definitionKey);

        if (definition && definition.properties && definition.properties[propertyName]) {
            return definition.properties[propertyName].description || fallback;
        }

        return fallback;
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


export default NodeStatusCreateModal;
