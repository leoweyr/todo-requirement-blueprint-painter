import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import ContextMenuItem from './ContextMenuItem';


export interface LegendContextMenuProps {
    statusName: string;
    x: number;
    y: number;
    onEdit: (statusName: string) => void;
    onDelete: (statusName: string) => void;
    onClose: () => void;
}


class LegendContextMenu extends Component<LegendContextMenuProps> {
    private _overlayRef: HTMLDivElement | null = null;

    private handleOverlayClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this._overlayRef && event.target === this._overlayRef) {
            this.props.onClose();
        }
    };

    private handleItemClick: (callback: () => void) => void = (callback: () => void): void => {
        callback();
        this.props.onClose();
    };

    private handleContextMenuOnMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.preventDefault();
    };

    public render(): ReactNode {
        const { x, y, onDelete, statusName } = this.props;

        return (
            <div 
                ref={(el: HTMLDivElement | null): void => { this._overlayRef = el; }}
                style={this.getOverlayStyle()}
                onClick={this.handleOverlayClick}
                onContextMenu={this.handleContextMenuOnMenu}
            >
                <div style={this.getMenuContainerStyle(x, y)}>
                    <ContextMenuItem
                        label="Edit"
                        onClick={(): void => this.handleItemClick(() => this.props.onEdit(statusName))}
                    />
                    <ContextMenuItem
                        label="Delete"
                        onClick={(): void => this.handleItemClick(() => onDelete(statusName))}
                        style={{ color: '#FF3B30' }}
                    />
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
            minWidth: '120px',
            display: 'flex',
            flexDirection: 'column'
        };
    }
}


export default LegendContextMenu;
