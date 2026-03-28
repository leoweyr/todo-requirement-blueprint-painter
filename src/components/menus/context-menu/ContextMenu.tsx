import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';

import { ReadOnlyView } from '../../../features/readonly/ReadOnlyView';
import ContextMenuItem from './ContextMenuItem';


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

    public constructor(properties: ContextMenuProps) {
        super(properties);

        this.state = {
            isOpen: false,
            x: 0,
            y: 0
        };
    }

    public render(): ReactNode {
        const { isOpen, x, y }: ContextMenuState = this.state;
        const { onCreateNode, onCreateNodeStatus, onCreateEdgeEvolutionReason, onPaste, onSave }: ContextMenuProps = this.props;

        if (!isOpen) {
            return null;
        }

        const isReadOnly: boolean = ReadOnlyView.instance.isReadOnly();

        // In read-only mode, no menu items are available.
        if (isReadOnly) {
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
                ref={(element: HTMLDivElement | null): void => { this._overlayRef = element; }}
                style={this._getOverlayStyle()}
                onClick={(event: MouseEvent): void => this._handleOverlayClick(event)}
                onContextMenu={(event: MouseEvent): void => this._handleContextMenuOnMenu(event)}
            >
                <div style={this._getMenuContainerStyle(x, y)}>
                    {Object.entries(items).map(([label, callback]: [string, () => void]): ReactNode => (
                        <ContextMenuItem
                            key={label}
                            label={label}
                            onClick={(): void => this._handleItemClick(callback)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    private _handleClose(): void {
        this.setState({ isOpen: false });
    }

    private _handleOverlayClick(event: MouseEvent): void {
        if (this._overlayRef && event.target === this._overlayRef) {
            this._handleClose();
        }
    }

    private _handleItemClick(callback: () => void): void {
        callback();
        this._handleClose();
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
            minWidth: '150px',
            display: 'flex',
            flexDirection: 'column'
        };
    }

    public handleOpen(event: MouseEvent): void {
        event.preventDefault();

        this.setState({
            isOpen: true,
            x: event.clientX,
            y: event.clientY
        });
    }
}


export default ContextMenu;
