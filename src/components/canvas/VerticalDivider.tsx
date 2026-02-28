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
        const {
            x,
            startY = 0,
            endY = 0,
            fullHeight = false,
            thickness = 6,
            color = '#666666'
        } = this.props;

        let top: number | string;
        let height: number | string;

        if (fullHeight) {
            top = '-50000px';  // Very large negative value to cover effectively "infinite" upwards.
            height = '100000px';  // Very large value to cover effectively "infinite" downwards.
        } else {
            height = Math.abs(endY - startY);
            top = Math.min(startY, endY);
        }

        const left = x - thickness / 2;

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
