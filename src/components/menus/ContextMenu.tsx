import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import ContextMenuItem from './ContextMenuItem';


export interface ContextMenuProps {
    x: number;
    y: number;
    items: Record<string, () => void>;
    onClose: () => void;
}


class ContextMenu extends Component<ContextMenuProps> {
    private overlayRef: HTMLDivElement | null = null;

    private handleOverlayClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        // Close if clicking the overlay (outside the menu).
        if (this.overlayRef && event.target === this.overlayRef) {
            this.props.onClose();
        }
    };

    private handleItemClick: (callback: () => void) => void = (callback: () => void): void => {
        callback();
        this.props.onClose();
    };

    private handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        // Prevent default context menu on the custom menu itself.
        event.preventDefault();
    };

    public render(): ReactNode {
        const { x, y, items } = this.props;

        const itemEntries = Object.entries(items);

        if (itemEntries.length === 0) {
            return null;
        }

        return (
            <div 
                ref={(el) => { this.overlayRef = el; }}
                style={this.getOverlayStyle()}
                onClick={this.handleOverlayClick}
                onContextMenu={this.handleContextMenu}
            >
                <div style={this.getMenuContainerStyle(x, y)}>
                    {itemEntries.map(([label, callback]: [string, () => void]): ReactNode => (
                        <ContextMenuItem
                            key={label}
                            label={label}
                            onClick={() => this.handleItemClick(callback)}
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
