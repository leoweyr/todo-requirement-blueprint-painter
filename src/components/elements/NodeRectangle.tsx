import { Component, type CSSProperties, type ReactNode } from 'react';

import { Node } from '../../domain/Node';


export interface NodeRectangleProps {
    node: Node;
    x: number;
    y: number;
    onStartEdge?: (nodeId: string) => void;
    onCompleteEdge?: (nodeId: string) => void;
}


interface NodeRectangleState {
    isHovered: boolean;
}


class NodeRectangle extends Component<NodeRectangleProps, NodeRectangleState> {
    private handleMouseEnter: () => void = (): void => {
        this.setState({ isHovered: true });
    };

    private handleMouseLeave: () => void = (): void => {
        this.setState({ isHovered: false });
    };

    private handleStartEdgeClick: (event: React.MouseEvent) => void = (event: React.MouseEvent): void => {
        event.stopPropagation();

        if (this.props.onStartEdge) {
            this.props.onStartEdge(this.props.node.id);
        }
    };

    private handleNodeClick: (event: React.MouseEvent) => void = (event: React.MouseEvent): void => {
        event.stopPropagation();

        if (this.props.onCompleteEdge) {
            this.props.onCompleteEdge(this.props.node.id);
        }
    };

    constructor(props: NodeRectangleProps) {
        super(props);
        this.state = {
            isHovered: false
        };
    }

    public render(): ReactNode {
        const { node, x, y }: NodeRectangleProps = this.props;
        const { isHovered }: NodeRectangleState = this.state;

        const date: Date = new Date(node.updatedAt);
        const dateStr: string = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        const tooltipText: string = `${node.version} (${dateStr})`;

        const metadataEntries: [string, any][] = node.metadata ? Object.entries(node.metadata) : [];

        return (
            <div 
                style={{
                    ...this.getContainerStyle(),
                    left: x,
                    top: y
                }}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onClick={this.handleNodeClick}
            >
                <span style={this.getTextStyle()}>
                    {node.description}
                </span>

                {isHovered && (
                    <>
                        {/* Edge Creation Button (Left Center). */}
                        <div 
                            style={this.getEdgeButtonStyle()}
                            onClick={this.handleStartEdgeClick}
                            title="Create Demand (Upstream Dependency)"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="11" fill="#4CAF50" stroke="#FFFFFF" strokeWidth="2"/>
                                <path d="M12 7V17M7 12H17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>

                        <div style={this.getTooltipStyle()}>
                            {tooltipText}
                        </div>
                        
                        {metadataEntries.length > 0 && (
                            <div style={this.getMetadataContainerStyle()}>
                                {metadataEntries.map(([key, value]: [string, any]): ReactNode => {
                                    const displayValue: string = (typeof value === 'object' && value !== null)
                                        ? JSON.stringify(value)
                                        : String(value);

                                    return (
                                        <div key={key} style={this.getMetadataTextStyle()}>
                                            {key}: {displayValue}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    private getEdgeButtonStyle(): CSSProperties {
        return {
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))'
        };
    }

    private getContainerStyle(): CSSProperties {
        const { node }: NodeRectangleProps = this.props;
        const metadata: Record<string, unknown> | undefined = node.status.metadata;
        
        const backgroundColor: string = (metadata?.backgroundColor as string) || '#F5F5F5';
        const borderColor: string = (metadata?.borderColor as string) || '#666666';

        return {
            backgroundColor: backgroundColor,
            border: `1pt solid ${borderColor}`,
            borderRadius: '10px',
            width: '200px',
            minHeight: '80px',
            display: 'flex',

            // Use column to stack text and tooltip naturally.
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            boxSizing: 'border-box',
            height: 'fit-content',
            position: 'absolute'
        };
    }

    private getTextStyle(): CSSProperties {
        return {
            textAlign: 'center',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            maxWidth: '100%',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontSize: '12pt',
            color: '#333333'
        };
    }

    private getTooltipStyle(): CSSProperties {
        return {
            // Create a small gap below the text.
            marginTop: '4px',
            backgroundColor: 'transparent',

            // Use a subtitle style color.
            color: '#666666',
            fontSize: '9pt',
            fontFamily: 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
        };
    }

    private getMetadataContainerStyle(): CSSProperties {
        return {
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #cccccc',
            borderRadius: '4px',
            padding: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 100,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '100px'
        };
    }

    private getMetadataTextStyle(): CSSProperties {
        return {
            color: '#555555',
            fontSize: '8pt',
            fontFamily: 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            marginBottom: '2px'
        };
    }
}


export default NodeRectangle;
