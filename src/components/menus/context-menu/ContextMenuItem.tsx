import { Component, type CSSProperties, type ReactNode } from 'react';


export interface ContextMenuItemProps {
    label: string;
    onClick: () => void;
    style?: CSSProperties;
}


interface ContextMenuItemState {
    isHovered: boolean;
}


class ContextMenuItem extends Component<ContextMenuItemProps, ContextMenuItemState> {
    private handleMouseEnter: () => void = (): void => {
        this.setState({ isHovered: true });
    };

    private handleMouseLeave: () => void = (): void => {
        this.setState({ isHovered: false });
    };

    public constructor(props: ContextMenuItemProps) {
        super(props);
        this.state = {
            isHovered: false
        };
    }

    public render(): ReactNode {
        const { label, onClick, style } = this.props;
        const { isHovered } = this.state;

        return (
            <div
                style={{ ...this.getItemStyle(isHovered), ...style }}
                onClick={onClick}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
            >
                {label}
            </div>
        );
    }

    private getItemStyle(isHovered: boolean): CSSProperties {
        return {
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#333333',
            fontFamily: 'Helvetica, Arial, sans-serif',
            backgroundColor: isHovered ? '#f0f0f0' : 'transparent',
            transition: 'background-color 0.1s'
        };
    }
}


export default ContextMenuItem;
