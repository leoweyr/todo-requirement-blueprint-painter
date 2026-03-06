import { Component, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { EdgeEvolutionReason } from '../../../domain/EdgeEvolutionReason';


export interface EdgeEvolutionReasonModalProps {
    registry: DomainRegistry;
    onClose: () => void;
    onConfirm: (reasonName: string) => void;
}


interface EdgeEvolutionReasonModalState {
    selectedReasonName: string;
}


class EdgeEvolutionReasonModal extends Component<EdgeEvolutionReasonModalProps, EdgeEvolutionReasonModalState> {
    public constructor(props: EdgeEvolutionReasonModalProps) {
        super(props);
        
        const reasons: EdgeEvolutionReason[] = props.registry.allEdgeEvolutionReasons;
        this.state = {
            selectedReasonName: reasons.length > 0 ? reasons[0].name : ''
        };
    }

    private handleReasonChange: (event: ChangeEvent<HTMLSelectElement>) => void = (
        event: ChangeEvent<HTMLSelectElement>
    ): void => {
        this.setState({ selectedReasonName: event.target.value });
    };

    private handleConfirm: () => void = (): void => {
        const { selectedReasonName }: EdgeEvolutionReasonModalState = this.state;

        if (selectedReasonName) {
            this.props.onConfirm(selectedReasonName);
        }
    };

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

    public render(): ReactNode {
        const { selectedReasonName }: EdgeEvolutionReasonModalState = this.state;
        const { onClose, registry }: EdgeEvolutionReasonModalProps = this.props;
        const reasons: EdgeEvolutionReason[] = registry.allEdgeEvolutionReasons;

        return (
            <div style={this.getContainerStyle()}>
                <h2 style={this.getTitleStyle()}>Evolution Reason</h2>
                <div style={this.getFieldGroupStyle()}>
                    <label style={this.getLabelStyle()}>Select reason for this evolution:</label>
                    <select
                        value={selectedReasonName}
                        onChange={this.handleReasonChange}
                        style={this.getInputStyle()}
                        autoFocus
                    >
                        {reasons.map((reason: EdgeEvolutionReason): ReactNode => (
                            <option key={reason.name} value={reason.name}>
                                {reason.name} - {reason.description}
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
                        onClick={this.handleConfirm}
                        disabled={!selectedReasonName}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        );
    }
}


export default EdgeEvolutionReasonModal;
