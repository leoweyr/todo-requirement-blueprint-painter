import { Component, type ReactNode } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult, type PrerenderEdge, type PrerenderNode } from './features/graph/BlueprintPrerenderCombResult';
import { BlueprintSerializer } from './features/serializer/BlueprintSerializer';
import { DomainRegistry } from './features/registry/DomainRegistry';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import BackdropBlur from './components/menus/BackdropBlur';
import FileOpenModal from './components/menus/FileOpenModal';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';


interface AppState {
    isFileLoaded: boolean;
}


class App extends Component<{}, AppState> {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;

    private handleFileSelected: (fileContent: string) => Promise<void> = async (fileContent: string): Promise<void> => {
        console.log('Loading file...');

        try {
            this._registry.clear();

            await BlueprintSerializer.fromYaml(fileContent, this._registry);

            this._layoutResult = this._layoutService.calculateLayout(this._registry);

            // Calculate Content Bounds for Auto-Centering.
            if (this._layoutResult.contentBounds) {
                const { minimumX, minimumY, maximumX, maximumY } = this._layoutResult.contentBounds;

                this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
            }

            this.setState({ isFileLoaded: true });
        } catch (error) {
            console.error('Failed to load blueprint:', error);

            alert(`Failed to load blueprint: ${(error as Error).message}`);
        }
    };

    constructor(properties: {}) {
        super(properties);

        this.state = {
            isFileLoaded: false
        };

        this._viewport = new CanvasViewport(0, 0, 1);
        this._layoutService = new BlueprintPrerenderComb();
        this._registry = DomainRegistry.instance;
        this._registry.clear();

        this._layoutResult = this._layoutService.calculateLayout(this._registry);
    }

    public render(): ReactNode {
        const { isFileLoaded } = this.state;
        const layoutResult = this._layoutResult;

        return (
            <>
                <InfiniteCanvas 
                    viewport={this._viewport}
                    layerGapCenters={layoutResult?.layerGapCenters}
                >
                    {layoutResult && this.renderGraph()}
                </InfiniteCanvas>

                {!isFileLoaded && (
                    <BackdropBlur>
                        <FileOpenModal onFileSelected={this.handleFileSelected} />
                    </BackdropBlur>
                )}
            </>
        );
    }

    private renderGraph(): ReactNode {
        if (!this._layoutResult) return null;

        const { prerenderNodes, prerenderEdges } = this._layoutResult;

        return (
            <>
                {/* Render Edges (behind Nodes). */}
                {prerenderEdges.map((properties: PrerenderEdge): ReactNode => (
                    <EdgeLine
                        key={properties.edge.id}
                        {...properties}
                    />
                ))}

                {/* Render Nodes (on top of Edges). */}
                {prerenderNodes.map((properties: PrerenderNode): ReactNode => (
                    <NodeRectangle
                        key={properties.node.id}
                        {...properties}
                    />
                ))}
            </>
        );
    }
}


export default App;
