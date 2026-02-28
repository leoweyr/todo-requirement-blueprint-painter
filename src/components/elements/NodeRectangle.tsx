import { Component, type CSSProperties, type ReactNode } from 'react';

import { Node } from '../../domain/Node';


export interface NodeRectangleProps {
    node: Node;
    x: number;
    y: number;
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

    constructor(props: NodeRectangleProps) {
        super(props);
        this.state = {
            isHovered: false
        };
    }

    public render(): ReactNode {
        const { node, x, y }: NodeRectangleProps = this.props;
        const { isHovered }: NodeRectangleState = this.state;

        const date = new Date(node.updatedAt);
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        const tooltipText: string = `${node.version} (${dateStr})`;

        return (
            <div 
                style={{
                    ...this.getContainerStyle(),
                    left: x,
                    top: y
                }}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
            >
                <span style={this.getTextStyle()}>
                    {node.description}
                </span>

                {isHovered && (
                    <div style={this.getTooltipStyle()}>
                        {tooltipText}
                    </div>
                )}
            </div>
        );
    }

    private getContainerStyle(): CSSProperties {
        return {
            backgroundColor: '#F5F5F5',
            border: '1pt solid #666666',
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
}


export default NodeRectangle;
