import { Component, type CSSProperties, type ReactNode, type MouseEvent } from 'react';
import { Node } from '@todo-requirement-blueprint/domain';

import { ReadOnlyView } from '../../features/readonly/ReadOnlyView';
import type { VersionTransition } from '../../features/graph/VersionTransition';
import VersionRoller from './VersionRoller';


export interface NodeRectangleProps {
    node: Node;
    x: number;
    y: number;
    opacity?: number;  // Defines node opacity in the [0, 1] range for transition animations.
    backgroundColor?: string;  // Overrides the status background color.
    borderColor?: string;  // Overrides the status border color.
    versionTransition?: VersionTransition;  // Defines version animation state for timeline playback.
    onStartEdge?: (nodeId: string) => void;
    onCompleteEdge?: (nodeId: string) => boolean;
    onContextMenu?: (event: MouseEvent, nodeId: string) => void;
}


interface NodeRectangleState {
    isHovered: boolean;
    tooltipPosition: { x: number; y: number } | null;
    recentVersionTransition: VersionTransition | null;
}


class NodeRectangle extends Component<NodeRectangleProps, NodeRectangleState> {
    private readonly _VERSION_TOOLTIP_HIDE_DELAY_MILLISECONDS: number = 2000;
    private _versionTooltipHideTimeoutId: number | null = null;

    private _handleMouseEnter: () => void = (): void => {
        this.setState({ isHovered: true });
    };

    private _handleMouseLeave: () => void = (): void => {
        this.setState({ isHovered: false, tooltipPosition: null });
    };

    private _handleMouseMove: (event: MouseEvent) => void = (event: MouseEvent): void => {
        const nodeUrl: string | undefined = this._getNodeUrl();

        if (nodeUrl) {
            const nodeElement: HTMLDivElement = event.currentTarget as HTMLDivElement;
            const nodeBounds: DOMRect = nodeElement.getBoundingClientRect();

            this.setState({
                tooltipPosition: {
                    x: event.clientX - nodeBounds.left,
                    y: event.clientY - nodeBounds.top
                }
            });
        }
    };

    private _handleStartEdgeClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.stopPropagation();

        if (this.props.onStartEdge) {
            this.props.onStartEdge(this.props.node.id);
        }
    };

    private _handleNodeClick: (event: MouseEvent) => void = (event: MouseEvent): void => {
        event.stopPropagation();

        const didCompleteEdgeEditing: boolean = this.props.onCompleteEdge
            ? this.props.onCompleteEdge(this.props.node.id)
            : false;

        if (didCompleteEdgeEditing) {
            return;
        }

        const nodeUrl: string | undefined = this._getNodeUrl();

        if (nodeUrl) {
            window.open(nodeUrl, '_blank', 'noopener,noreferrer');
            return;
        }
    };

    private _handleContextMenu: (event: MouseEvent) => void = (event: MouseEvent): void => {
        if (this.props.onContextMenu) {
            event.preventDefault();
            event.stopPropagation();
            this.props.onContextMenu(event, this.props.node.id);
        }
    };

    constructor(props: NodeRectangleProps) {
        super(props);
        this.state = {
            isHovered: false,
            tooltipPosition: null,
            recentVersionTransition: null
        };
    }

    public componentDidUpdate(previousProps: NodeRectangleProps): void {
        const previousVersionTransition: VersionTransition | undefined = previousProps.versionTransition;
        const currentVersionTransition: VersionTransition | undefined = this.props.versionTransition;

        if (currentVersionTransition) {
            this._clearVersionTooltipHideTimer();

            if (this.state.recentVersionTransition !== null) {
                this.setState({ recentVersionTransition: null });
            }

            return;
        }

        if (previousVersionTransition) {
            const settledVersionTransition: VersionTransition = this._resolveSettledVersionTransition(
                previousVersionTransition,
                this.props.node.version
            );

            this._scheduleVersionTooltipHide(settledVersionTransition);
        }
    }

    public componentWillUnmount(): void {
        this._clearVersionTooltipHideTimer();
    }

    public render(): ReactNode {
        const { node, x, y, versionTransition }: NodeRectangleProps = this.props;
        const { isHovered, tooltipPosition, recentVersionTransition }: NodeRectangleState = this.state;
        const isReadOnly: boolean = ReadOnlyView.instance.isReadOnly();
        const activeVersionTransition: VersionTransition | undefined = versionTransition || recentVersionTransition || undefined;
        const shouldShowVersionTooltip: boolean = isHovered || Boolean(activeVersionTransition);

        const metadataEntries: [string, unknown][] = node.metadata ? Object.entries(node.metadata) : [];
        const nodeUrl: string | undefined = this._getNodeUrl();

        return (
            <div 
                style={{
                    ...this._getContainerStyle(),
                    left: x,
                    top: y
                }}
                data-testid={`node-rectangle-${node.id}`}  // For testing.
                onMouseEnter={this._handleMouseEnter}
                onMouseLeave={this._handleMouseLeave}
                onMouseMove={this._handleMouseMove}
                onClick={this._handleNodeClick}
                onContextMenu={this._handleContextMenu}
            >
                <span style={this._getTextStyle()}>
                    {node.description}
                </span>

                {shouldShowVersionTooltip && (
                    <div style={this._getNodeVersionTooltipStyle()}>
                        {this._renderNodeVersionTooltip(node, activeVersionTransition)}
                    </div>
                )}

                {isHovered && (
                    <>
                        {/* Edge Creation Button (Left Center). */}
                        {/* Disable in read-only mode. */}
                        {!isReadOnly && (
                            <div 
                                style={this._getEdgeButtonStyle()}
                                onClick={this._handleStartEdgeClick}
                                title="Create Demand (Upstream Dependency)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="11" fill="#4CAF50" stroke="#FFFFFF" strokeWidth="2"/>
                                    <path d="M12 7V17M7 12H17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        )}
                        
                        {!isReadOnly && metadataEntries.length > 0 && (
                            <div style={this._getMetadataContainerStyle()}>
                                {metadataEntries.map(([key, value]: [string, unknown]): ReactNode => {
                                    const displayValue: string = (typeof value === 'object' && value !== null)
                                        ? JSON.stringify(value)
                                        : String(value);

                                    return (
                                        <div key={key} style={this._getMetadataTextStyle()}>
                                            {key}: {displayValue}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {nodeUrl && tooltipPosition && (
                    <div style={this._getUrlTooltipStyle(tooltipPosition)}>
                        Click to visit
                    </div>
                )}
            </div>
        );
    }

    private _getEdgeButtonStyle(): CSSProperties {
        return {
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))'
        };
    }

    private _scheduleVersionTooltipHide(versionTransition: VersionTransition): void {
        this._clearVersionTooltipHideTimer();
        this.setState({ recentVersionTransition: versionTransition });

        this._versionTooltipHideTimeoutId = window.setTimeout((): void => {
            this._versionTooltipHideTimeoutId = null;
            this.setState({ recentVersionTransition: null });
        }, this._VERSION_TOOLTIP_HIDE_DELAY_MILLISECONDS);
    }

    private _resolveSettledVersionTransition(
        previousVersionTransition: VersionTransition,
        currentNodeVersion: string
    ): VersionTransition {
        if (previousVersionTransition.endVersion === currentNodeVersion) {
            return {
                startVersion: previousVersionTransition.startVersion,
                endVersion: previousVersionTransition.endVersion,
                progress: 1
            };
        }

        if (previousVersionTransition.startVersion === currentNodeVersion) {
            return {
                startVersion: previousVersionTransition.endVersion,
                endVersion: previousVersionTransition.startVersion,
                progress: 1
            };
        }

        return {
            startVersion: currentNodeVersion,
            endVersion: currentNodeVersion,
            progress: 1
        };
    }

    private _clearVersionTooltipHideTimer(): void {
        if (this._versionTooltipHideTimeoutId !== null) {
            window.clearTimeout(this._versionTooltipHideTimeoutId);
            this._versionTooltipHideTimeoutId = null;
        }
    }

    private _getContainerStyle(): CSSProperties {
        const { node, opacity, backgroundColor: overrideBackgroundColor, borderColor: overrideBorderColor }: NodeRectangleProps = this.props;
        const metadata: Record<string, unknown> | undefined = node.status.metadata;
        
        const backgroundColor: string = overrideBackgroundColor || (metadata?.backgroundColor as string) || '#F5F5F5';
        const borderColor: string = overrideBorderColor || (metadata?.borderColor as string) || '#666666';
        const nodeUrl: string | undefined = this._getNodeUrl();

        return {
            backgroundColor: backgroundColor,
            border: `1pt solid ${borderColor}`,
            borderRadius: '10px',
            width: '200px',
            minHeight: '80px',
            display: 'flex',

            // Use column to stack text and tooltip naturally.
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            boxSizing: 'border-box',
            height: 'fit-content',
            position: 'absolute',
            opacity: opacity !== undefined ? opacity : 1,
            cursor: nodeUrl ? 'pointer' : 'default'
        };
    }

    private _getTextStyle(): CSSProperties {
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

    private _getMetadataContainerStyle(): CSSProperties {
        return {
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #cccccc',
            borderRadius: '4px',
            padding: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 100,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '100px'
        };
    }

    private _getMetadataTextStyle(): CSSProperties {
        return {
            color: '#555555',
            fontSize: '8pt',
            fontFamily: 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            marginBottom: '2px'
        };
    }

    private _getNodeVersionTooltipText(node: Node): string {
        const nodeUpdatedDate: Date = new Date(node.updatedAt);
        const nodeUpdatedTimestamp: number = nodeUpdatedDate.getTime();

        if (Number.isNaN(nodeUpdatedTimestamp)) {
            return node.version;
        }

        const nodeUpdatedYear: number = nodeUpdatedDate.getFullYear();
        const nodeUpdatedMonth: number = nodeUpdatedDate.getMonth() + 1;
        const nodeUpdatedDay: number = nodeUpdatedDate.getDate();
        const nodeUpdatedDateText: string = `${nodeUpdatedYear}/${nodeUpdatedMonth}/${nodeUpdatedDay}`;

        return `${node.version} (${nodeUpdatedDateText})`;
    }

    private _renderNodeVersionTooltip(node: Node, versionTransition: VersionTransition | undefined): ReactNode {
        if (versionTransition) {
            return (
                <VersionRoller
                    startVersion={versionTransition.startVersion}
                    endVersion={versionTransition.endVersion}
                    progress={versionTransition.progress}
                />
            );
        }

        return this._getNodeVersionTooltipText(node);
    }

    private _getNodeVersionTooltipStyle(): CSSProperties {
        return {
            marginTop: '4px',
            backgroundColor: 'transparent',
            color: '#666666',
            fontSize: '9pt',
            fontFamily: 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textAlign: 'center'
        };
    }

    private _getNodeUrl(): string | undefined {
        const { node }: NodeRectangleProps = this.props;

        if (node.metadata && typeof node.metadata.url === 'string') {
            return node.metadata.url;
        }

        return undefined;
    }

    private _getUrlTooltipStyle(position: { x: number; y: number }): CSSProperties {
        return {
            position: 'absolute',
            left: position.x,
            top: position.y - 2,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10pt',
            fontFamily: 'Helvetica, Arial, sans-serif',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap'
        };
    }
}


export default NodeRectangle;
