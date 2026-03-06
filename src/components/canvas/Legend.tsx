import { Component, type CSSProperties, type ReactNode } from 'react';

import { DomainRegistry } from '../../features/registry/DomainRegistry.ts';
import { NodeStatus } from '../../domain/NodeStatus.ts';


interface LegendProps {
    registry: DomainRegistry;
}


interface LegendState {
    statuses: NodeStatus[];
}


class Legend extends Component<LegendProps, LegendState> {
    private statusInterval: number | null = null;

    private updateStatuses: () => void = (): void => {
        const statuses: NodeStatus[] = this.props.registry.allNodeStatuses;
        
        // Only update if length changed or content changed (simple check).
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
        this.updateStatuses();
        
        // Listen for registry changes (simple polling; alternatively, an event emitter could be added to the registry).
        // For now, simple polling is robust enough for prototype.
        this.statusInterval = setInterval(this.updateStatuses, 1000);
    }

    public componentWillUnmount(): void {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
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
                        <div key={status.name} style={this.getItemStyle()}>
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
            pointerEvents: 'none',  // Allow clicking through if needed, but usually legend blocks clicks.
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
            gap: '10px'
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
