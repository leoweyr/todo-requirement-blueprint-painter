import { Component, type CSSProperties, type ReactNode } from 'react';


export interface VerticalDividerProps {
    x: number;
    startY?: number;
    endY?: number;
    fullHeight?: boolean;
    thickness?: number;
    color?: string;
}


class VerticalDivider extends Component<VerticalDividerProps> {
    public render(): ReactNode {
        return <div style={this.getStyles()} />;
    }

    private getStyles(): CSSProperties {
        const x: number = this.props.x;
        const startY: number = this.props.startY || 0;
        const endY: number = this.props.endY || 0;
        const fullHeight: boolean = this.props.fullHeight || false;
        const thickness: number = this.props.thickness || 6;
        const color: string = this.props.color || '#666666';

        let top: number | string;
        let height: number | string;

        if (fullHeight) {
            top = '-50000px';  // Use a very large negative value to cover effectively "infinite" upwards.
            height = '100000px';  // Use a very large value to cover effectively "infinite" downwards.
        } else {
            height = Math.abs(endY - startY);
            top = Math.min(startY, endY);
        }

        const left: number = x - thickness / 2;

        return {
            position: 'absolute',
            left,
            top,
            width: thickness,
            height,
            backgroundColor: color,
            zIndex: -1,
            pointerEvents: 'none'
        };
    }
}


export default VerticalDivider;
