import { Component, type ReactNode } from 'react';

import { CanvasViewport } from './components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from './features/graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from './features/graph/BlueprintPrerenderCombResult';
import { DomainRegistry } from './features/registry/DomainRegistry';
import InfiniteCanvas from './components/canvas/InfiniteCanvas';
import EdgeLine from './components/elements/EdgeLine';
import NodeRectangle from './components/elements/NodeRectangle';
import { NodeStatus } from './domain/NodeStatus';
import { EdgeEvolutionReason } from './domain/EdgeEvolutionReason';
import { Node } from './domain/Node';
import { Edge } from './domain/Edge';
import { EdgeHistoryRecord } from './domain/EdgeHistoryRecord';


class App extends Component {
    private readonly _viewport: CanvasViewport;
    private readonly _layoutService: BlueprintPrerenderComb;
    private _layoutResult: BlueprintPrerenderCombResult | null = null;
    private readonly _registry: DomainRegistry;

    constructor(props: {}) {
        super(props);

        this._viewport = new CanvasViewport(0, 0, 1);
        this._layoutService = new BlueprintPrerenderComb();
        this._registry = DomainRegistry.instance;

        this.initializeDemoData();

        this._layoutResult = this._layoutService.calculateLayout(this._registry);
        
        // Calculate Content Bounds for Auto-Centering.
        if (this._layoutResult.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY } = this._layoutResult.contentBounds;
            this._viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
        }
    }

    public render(): ReactNode {
        if (!this._layoutResult) {
            return <div>Loading layout...</div>;
        }

        const { prerenderNodes, prerenderEdges } = this._layoutResult;

        return (
            <InfiniteCanvas viewport={this._viewport}>
                {/* Render Edges (behind Nodes). */}
                {prerenderEdges.map(props => (
                    <EdgeLine
                        key={props.edge.id}
                        {...props}
                    />
                ))}

                {/* Render Nodes (on top of Edges). */}
                {prerenderNodes.map(props => (
                    <NodeRectangle
                        key={props.node.id}
                        {...props}
                    />
                ))}
            </InfiniteCanvas>
        );
    }

    private initializeDemoData(): void {
        this._registry.clear();

        const statusActive = new NodeStatus('ACTIVE', 'Active node.');
        const statusPlanned = new NodeStatus('PLANNED', 'Planned node.');
        const reasonMvp = new EdgeEvolutionReason('MVP', 'Initial MVP.');

        this._registry.registerNodeStatus(statusActive);
        this._registry.registerNodeStatus(statusPlanned);
        this._registry.registerEdgeEvolutionReason(reasonMvp);

        const now = new Date().toISOString();

        const wisdom = new Node('wisdom', 'WISDOM (Infra)', '1.0.0', now, statusActive, {});
        const courage = new Node('courage', 'COURAGE (Domain)', '1.0.0', now, statusActive, {});
        const luck = new Node('luck', 'LUCK (Domain)', '1.0.0', now, statusActive, {});
        const power = new Node('power', 'POWER (Touchpoint)', '1.0.0', now, statusActive, {});

        this._registry.registerNode(wisdom);
        this._registry.registerNode(courage);
        this._registry.registerNode(luck);
        this._registry.registerNode(power);

        // Create Edges (Demand-Pull: Downstream defines edge to Upstream).
        
        // Courage depends on Wisdom.
        const edgeCourageWisdom = new Edge('edge-courage-wisdom', 'Needs wisdom.');
        edgeCourageWisdom.addHistoryRecord(new EdgeHistoryRecord('1.0.0', now, 'REQUIRES', 'ACTIVE', wisdom, reasonMvp));
        courage.addEdge(edgeCourageWisdom);

        // Luck depends on Courage.
        const edgeLuckCourage = new Edge('edge-luck-courage', 'Needs courage.');
        edgeLuckCourage.addHistoryRecord(new EdgeHistoryRecord('1.0.0', now, 'REQUIRES', 'ACTIVE', courage, reasonMvp));
        luck.addEdge(edgeLuckCourage);

        // Power depends on Luck.
        const edgePowerLuck = new Edge('edge-power-luck', 'Needs luck.');
        edgePowerLuck.addHistoryRecord(new EdgeHistoryRecord('1.0.0', now, 'REQUIRES', 'ACTIVE', luck, reasonMvp));
        power.addEdge(edgePowerLuck);
    }
}


export default App;
