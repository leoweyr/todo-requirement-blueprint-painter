import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import { ReadOnlyView } from '../../../features/readonly/ReadOnlyView';
import ContextMenuItem from './ContextMenuItem';


export interface NodeContextMenuProps {
    nodeId: string;
    x: number;
    y: number;
    onEdit: (nodeId: string) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}


class NodeContextMenu extends Component<NodeContextMenuProps> {
    private _overlayRef: HTMLDivElement | null = null;

    public render(): ReactNode {
        const { x, y, onEdit, onDelete, nodeId }: NodeContextMenuProps = this.props;

        const isReadOnly: boolean = ReadOnlyView.instance.isReadOnly();

        // In read-only mode, no menu items are available.
        if (isReadOnly) {
            return null;
        }

        return (
            <div 
                ref={(element: HTMLDivElement | null): void => { this._overlayRef = element; }}
                style={this._getOverlayStyle()}
                onClick={(event: MouseEvent): void => this._handleOverlayClick(event)}
                onContextMenu={(event: MouseEvent): void => this._handleContextMenuOnMenu(event)}
            >
                <div style={this._getMenuContainerStyle(x, y)}>
                    <ContextMenuItem
                        key="edit"
                        label="Edit"
                        onClick={(): void => this._handleItemClick((): void => onEdit(nodeId))}
                    />
                    <ContextMenuItem
                        key="delete"
                        label="Delete"
                        onClick={(): void => this._handleItemClick((): void => onDelete(nodeId))}
                        style={{ color: '#FF3B30' }}
                    />
                </div>
            </div>
        );
    }

    private _handleOverlayClick(event: MouseEvent): void {
        if (this._overlayRef && event.target === this._overlayRef) {
            this.props.onClose();
        }
    }

    private _handleItemClick(callback: () => void): void {
        callback();
        this.props.onClose();
    }

    private _handleContextMenuOnMenu(event: MouseEvent): void {
        event.preventDefault();
    }

    private _getOverlayStyle(): CSSProperties {
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

    private _getMenuContainerStyle(x: number, y: number): CSSProperties {
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


export default NodeContextMenu;
