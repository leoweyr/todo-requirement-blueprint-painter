import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';
import { Node } from '@todo-requirement-blueprint/domain';

import { ReadOnlyView } from '../../features/readonly/ReadOnlyView';


export interface NodeRectangleProps {
    node: Node;
    x: number;
    y: number;
    opacity?: number;  // Defines node opacity in the [0, 1] range for transition animations.
    backgroundColor?: string;  // Overrides the status background color.
    borderColor?: string;  // Overrides the status border color.
    onStartEdge?: (nodeId: string) => void;
    onCompleteEdge?: (nodeId: string) => void;
    onContextMenu?: (event: MouseEvent, nodeId: string) => void;
}


interface NodeRectangleState {
    isHovered: boolean;
}


class NodeRectangle extends Component<NodeRectangleProps, NodeRectangleState> {
    private _handleMouseEnter: () => void = (): void => {
        this.setState({ isHovered: true });
    };

    private _handleMouseLeave: () => void = (): void => {
        this.setState({ isHovered: false });
    };

    private _handleStartEdgeClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.stopPropagation();

        if (this.props.onStartEdge) {
            this.props.onStartEdge(this.props.node.id);
        }
    };

    private _handleNodeClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.stopPropagation();

        if (this.props.onCompleteEdge) {
            this.props.onCompleteEdge(this.props.node.id);
        }
    };

    private _handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this.props.onContextMenu) {
            event.preventDefault();
            event.stopPropagation();
            this.props.onContextMenu(event, this.props.node.id);
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

        const metadataEntries: [string, any][] = node.metadata ? Object.entries(node.metadata) : [];

        return (
            <div 
                style={{
                    ...this._getContainerStyle(),
                    left: x,
                    top: y
                }}
                onMouseEnter={this._handleMouseEnter}
                onMouseLeave={this._handleMouseLeave}
                onClick={this._handleNodeClick}
                onContextMenu={this._handleContextMenu}
            >
                <span style={this._getTextStyle()}>
                    {node.description}
                </span>

                {isHovered && (
                    <>
                        {/* Edge Creation Button (Left Center). */}
                        {/* Disable in read-only mode. */}
                        {!ReadOnlyView.instance.isReadOnly() && (
                            <div 
                                style={this._getEdgeButtonStyle()}
                                onClick={this._handleStartEdgeClick}
                                title="Create Demand (Upstream Dependency)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="11" fill="#4CAF50" stroke="#FFFFFF" strokeWidth="2"/>
                                    <path d="M12 7V17M7 12H17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        )}
                        
                        {metadataEntries.length > 0 && (
                            <div style={this._getMetadataContainerStyle()}>
                                {metadataEntries.map(([key, value]: [string, any]): ReactNode => {
                                    const displayValue: string = (typeof value === 'object' && value !== null)
                                        ? JSON.stringify(value)
                                        : String(value);

                                    return (
                                        <div key={key} style={this._getMetadataTextStyle()}>
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

    private _getEdgeButtonStyle(): CSSProperties {
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

    private _getContainerStyle(): CSSProperties {
        const { node, opacity, backgroundColor: overrideBackgroundColor, borderColor: overrideBorderColor }: NodeRectangleProps = this.props;
        const metadata: Record<string, unknown> | undefined = node.status.metadata;
        
        const backgroundColor: string = overrideBackgroundColor || (metadata?.backgroundColor as string) || '#F5F5F5';
        const borderColor: string = overrideBorderColor || (metadata?.borderColor as string) || '#666666';

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
            position: 'absolute',
            opacity: opacity !== undefined ? opacity : 1
        };
    }

    private _getTextStyle(): CSSProperties {
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

    private _getMetadataContainerStyle(): CSSProperties {
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

    private _getMetadataTextStyle(): CSSProperties {
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
