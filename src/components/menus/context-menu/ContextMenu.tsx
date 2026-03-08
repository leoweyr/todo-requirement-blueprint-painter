import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import ContextMenuItem from './ContextMenuItem.tsx';


export interface ContextMenuProps {
    onCreateNode: () => void;
    onCreateNodeStatus: () => void;
    onCreateEdgeEvolutionReason: () => void;
    onPaste: () => void;
    onSave: () => void;
}


interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
}


class ContextMenu extends Component<ContextMenuProps, ContextMenuState> {
    private _overlayRef: HTMLDivElement | null = null;

    private handleClose: () => void = (): void => {
        this.setState({ isOpen: false });
    };

    private handleOverlayClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._overlayRef && event.target === this._overlayRef) {
            this.handleClose();
        }
    };

    private handleItemClick: (callback: () => void) => void = (callback: () => void): void => {
        callback();
        this.handleClose();
    };

    private handleContextMenuOnMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.preventDefault();
    };

    public handleOpen: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.preventDefault();
        
        this.setState({
            isOpen: true,
            x: event.clientX,
            y: event.clientY
        });
    };

    constructor(props: ContextMenuProps) {
        super(props);

        this.state = {
            isOpen: false,
            x: 0,
            y: 0
        };
    }

    public render(): ReactNode {
        const { isOpen, x, y } = this.state;
        const { onCreateNode, onCreateNodeStatus, onCreateEdgeEvolutionReason, onPaste, onSave } = this.props;

        if (!isOpen) {
            return null;
        }

        const items: Record<string, () => void> = {
            'New Node': onCreateNode,
            'New Node Status': onCreateNodeStatus,
            'New Evolution Reason': onCreateEdgeEvolutionReason,
            'Paste': onPaste,
            'Save': onSave
        };

        return (
            <div 
                ref={(el) => { this._overlayRef = el; }}
                style={this.getOverlayStyle()}
                onClick={this.handleOverlayClick}
                onContextMenu={this.handleContextMenuOnMenu}
            >
                <div style={this.getMenuContainerStyle(x, y)}>
                    {Object.entries(items).map(([label, callback]: [string, () => void]): ReactNode => (
                        <ContextMenuItem
                            key={label}
                            label={label}
                            onClick={(): void => this.handleItemClick(callback)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    private getOverlayStyle(): CSSProperties {
        return {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            backgroundColor: 'transparent'
        };
    }

    private getMenuContainerStyle(x: number, y: number): CSSProperties {
        return {
            position: 'absolute',
            top: y,
            left: x,
            backgroundColor: '#ffffff',
            border: '1px solid #cccccc',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            borderRadius: '4px',
            padding: '4px 0',
            minWidth: '150px',
            display: 'flex',
            flexDirection: 'column'
        };
    }
}


export default ContextMenu;
