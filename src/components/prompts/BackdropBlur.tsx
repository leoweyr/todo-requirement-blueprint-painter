import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';


export interface BackdropBlurProps {
    zIndex?: number;
    blurAmount?: string;
    backgroundColor?: string;
    onClick?: () => void;
    children?: ReactNode;
}


class BackdropBlur extends Component<BackdropBlurProps> {
    public render(): ReactNode {
        const { children } = this.props;

        return (
            <div 
                style={this.getStyle()} 
                onClick={this.handleBackdropClick}
            >
                {children}
            </div>
        );
    }

    private handleBackdropClick: (event: MouseEvent<HTMLDivElement>) => void = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            this.props.onClick?.();
        }
    }

    private getStyle(): CSSProperties {
        const { 
            zIndex = 1000, 
            blurAmount = '5px', 
            backgroundColor = 'rgba(0, 0, 0, 0.4)' 
        } = this.props;

        return {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: zIndex,
            backdropFilter: `blur(${blurAmount})`,
            backgroundColor: backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
    }
}


export default BackdropBlur;
