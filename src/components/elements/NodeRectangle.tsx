import { Component, type CSSProperties, type ReactNode } from 'react';

import { Node } from '../../domain/Node';


export interface NodeRectangleProps {
    node: Node;
    x: number;
    y: number;
}


class NodeRectangle extends Component<NodeRectangleProps> {
    public render(): ReactNode {
        const { node, x, y } = this.props;

        return (
            <div 
                style={{
                    ...this.getContainerStyle(),
                    left: x,
                    top: y
                }}
            >
                <span style={this.getTextStyle()}>
                    {node.description}
                </span>
            </div>
        );
    }

    private getContainerStyle(): CSSProperties {
        return {
            backgroundColor: '#F5F5F5',
            border: '1pt solid #666666',
            borderRadius: '10px',
            minWidth: '120pt',
            minHeight: '60pt',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            boxSizing: 'border-box',
            width: 'fit-content',
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
}


export default NodeRectangle;
