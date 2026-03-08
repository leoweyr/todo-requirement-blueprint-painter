import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import { DomainRegistry } from '../../features/registry/DomainRegistry';
import { NodeStatus } from '../../domain/NodeStatus';


export interface LegendProps {
    registry: DomainRegistry;
    onContextMenu?: (event: MouseEvent, statusName: string) => void;
}


interface LegendState {
    statuses: NodeStatus[];
}


class Legend extends Component<LegendProps, LegendState> {
    private _statusInterval: number | null = null;

    private _updateStatuses: () => void = (): void => {
        const statuses: NodeStatus[] = this.props.registry.allNodeStatuses;
        
        // Only update if the length changed or the content changed.
        if (JSON.stringify(statuses) !== JSON.stringify(this.state.statuses)) {
             this.setState({ statuses });
        }
    };

    public constructor(props: LegendProps) {
        super(props);

        this.state = {
            statuses: []
        };
    }

    public componentDidMount(): void {
        this._updateStatuses();
        
        // Listen for registry changes.
        // Simple polling is robust enough for the prototype.
        this._statusInterval = setInterval(this._updateStatuses, 1000);
    }

    public componentWillUnmount(): void {
        if (this._statusInterval) {
            clearInterval(this._statusInterval);
        }
    }

    public render(): ReactNode {
        const { statuses }: LegendState = this.state;

        if (statuses.length === 0) {
            return null;
        }

        return (
            <div style={this.getContainerStyle()}>
                <h3 style={this.getTitleStyle()}>Node Statuses</h3>
                <div style={this.getListStyle()}>
                    {statuses.map((status: NodeStatus): ReactNode => (
                        <div 
                            key={status.name} 
                            style={this.getItemStyle()}
                            onContextMenu={(event: MouseEvent): void => {
                                if (this.props.onContextMenu) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    this.props.onContextMenu(event, status.name);
                                }
                            }}
                        >
                            <div style={this.getIndicatorStyle(status)} />
                            <span style={this.getTextStyle()}>
                                {status.description}
                            </span>
                        </div>
                    ))}
                </div>
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
            minWidth: '150px'
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

    private getIndicatorStyle(status: NodeStatus): CSSProperties {
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

    private getTextStyle(): CSSProperties {
        return {
            fontSize: '12px',
            color: '#333333',
            fontFamily: 'Helvetica, Arial, sans-serif'
        };
    }
}


export default Legend;
