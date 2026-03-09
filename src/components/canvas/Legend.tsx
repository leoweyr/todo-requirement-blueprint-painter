import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import { DomainRegistry } from '../../features/registry/DomainRegistry';
import { NodeStatus } from '../../domain/NodeStatus';
import { EdgeEvolutionReason } from '../../domain/EdgeEvolutionReason';


export interface LegendProps {
    registry: DomainRegistry;
    onContextMenu?: (event: MouseEvent, type: 'node-status' | 'edge-evolution-reason', name: string) => void;
}


interface LegendState {
    statuses: NodeStatus[];
    reasons: EdgeEvolutionReason[];
}


class Legend extends Component<LegendProps, LegendState> {
    private _interval: number | null = null;

    private _updateData: () => void = (): void => {
        const statuses: NodeStatus[] = this.props.registry.allNodeStatuses;
        const reasons: EdgeEvolutionReason[] = this.props.registry.allEdgeEvolutionReasons;
        
        // Add fake "Cut" reason.
        const cutReason = new EdgeEvolutionReason('CUT', 'Cut (Removed).', { color: '#FF3B30' });
        const allReasons = [cutReason, ...reasons];

        // Only update if content changed.
        const statusesChanged = JSON.stringify(statuses) !== JSON.stringify(this.state.statuses);
        const reasonsChanged = JSON.stringify(allReasons) !== JSON.stringify(this.state.reasons);

        if (statusesChanged || reasonsChanged) {
             this.setState({ statuses, reasons: allReasons });
        }
    };

    public constructor(props: LegendProps) {
        super(props);

        this.state = {
            statuses: [],
            reasons: []
        };
    }

    public componentDidMount(): void {
        this._updateData();
        
        // Listen for registry changes.
        this._interval = window.setInterval(this._updateData, 1000);
    }

    public componentWillUnmount(): void {
        if (this._interval) {
            window.clearInterval(this._interval);
        }
    }

    public render(): ReactNode {
        const { statuses, reasons }: LegendState = this.state;

        if (statuses.length === 0 && reasons.length === 0) {
            return null;
        }

        return (
            <div style={this.getContainerStyle()}>
                {statuses.length > 0 && (
                    <>
                        <h3 style={this.getTitleStyle()}>Node Statuses</h3>
                        <div style={this.getListStyle()}>
                            {statuses.map((status: NodeStatus): ReactNode => (
                                <div 
                                    key={status.name} 
                                    style={{ ...this.getItemStyle(), cursor: 'context-menu' }}
                                    onContextMenu={(event: MouseEvent): void => {
                                        if (this.props.onContextMenu) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            this.props.onContextMenu(event, 'node-status', status.name);
                                        }
                                    }}
                                >
                                    <div style={this.getStatusIndicatorStyle(status)} />
                                    <span style={this.getTextStyle()}>
                                        {status.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {reasons.length > 0 && (
                    <>
                        {statuses.length > 0 && <div style={{ height: '15px' }} />}
                        <h3 style={this.getTitleStyle()}>Edge Evolution Reasons</h3>
                        <div style={this.getListStyle()}>
                            {reasons.map((reason: EdgeEvolutionReason): ReactNode => (
                                <div 
                                    key={reason.name} 
                                    style={{ ...this.getItemStyle(), cursor: reason.name === 'CUT' ? 'default' : 'context-menu' }}
                                    onContextMenu={(event: MouseEvent): void => {
                                        if (reason.name === 'CUT') return;

                                        if (this.props.onContextMenu) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            this.props.onContextMenu(event, 'edge-evolution-reason', reason.name);
                                        }
                                    }}
                                >
                                    <div style={this.getReasonIndicatorStyle(reason)} />
                                    <span style={this.getTextStyle()}>
                                        {reason.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    private getContainerStyle(): CSSProperties {
        return {
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #CCCCCC',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            pointerEvents: 'auto', 
            minWidth: '180px'
        };
    }

    private getTitleStyle(): CSSProperties {
        return {
            margin: '0 0 10px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#333333',
            borderBottom: '1px solid #EEEEEE',
            paddingBottom: '5px'
        };
    }

    private getListStyle(): CSSProperties {
        return {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        };
    }

    private getItemStyle(): CSSProperties {
        return {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'context-menu'
        };
    }

    private getStatusIndicatorStyle(status: NodeStatus): CSSProperties {
        const metadata: Record<string, unknown> | undefined = status.metadata;
        const backgroundColor: string = (metadata?.backgroundColor as string) || '#F5F5F5';
        const borderColor: string = (metadata?.borderColor as string) || '#666666';

        return {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: backgroundColor,
            border: `1px solid ${borderColor}`,
            flexShrink: 0
        };
    }

    private getReasonIndicatorStyle(reason: EdgeEvolutionReason): CSSProperties {
        const metadata: Record<string, unknown> | undefined = reason.metadata;
        const color: string = (metadata?.color as string) || '#0078D7';

        return {
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.5,
            flexShrink: 0
        };
    }

    private getTextStyle(): CSSProperties {
        return {
            fontSize: '12px',
            color: '#333333',
            fontFamily: 'Helvetica, Arial, sans-serif'
        };
    }
}


export default Legend;
