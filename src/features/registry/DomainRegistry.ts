import { Node } from '../../domain/Node';
import { NodeStatus } from '../../domain/NodeStatus';
import { EdgeEvolutionReason } from '../../domain/EdgeEvolutionReason';
import { Edge } from '../../domain/Edge';


export class DomainRegistry {
    private static _instance: DomainRegistry;

    public static get instance(): DomainRegistry {
        if (!DomainRegistry._instance) {
            DomainRegistry._instance = new DomainRegistry();
        }

        return DomainRegistry._instance;
    }

    private _blueprintName: string = 'Untitled Blueprint';
    private _trbVersion: string = '';
    private _schema: any = null;
    private readonly _nodes: Map<string, Node>;
    private readonly _nodeStatuses: Map<string, NodeStatus>;
    private readonly _edgeEvolutionReasons: Map<string, EdgeEvolutionReason>;

    private constructor() {
        this._nodes = new Map<string, Node>();
        this._nodeStatuses = new Map<string, NodeStatus>();
        this._edgeEvolutionReasons = new Map<string, EdgeEvolutionReason>();
    }

    public get blueprintName(): string {
        return this._blueprintName;
    }

    public set blueprintName(name: string) {
        this._blueprintName = name;
    }

    public get trbVersion(): string {
        return this._trbVersion;
    }

    public set trbVersion(version: string) {
        this._trbVersion = version;
    }

    public get schema(): any {
        return this._schema;
    }

    public set schema(schema: any) {
        this._schema = schema;
    }

    public getSchemaDefinition(key: string): any {
        if (!this._schema) {
            return undefined;
        }

        const defs = this._schema.definitions || this._schema.$defs;
        return defs ? defs[key] : undefined;
    }

    public registerNode(node: Node, overwrite: boolean = false): void {
        if (overwrite || !this._nodes.has(node.id)) {
            this._nodes.set(node.id, node);
        }
    }

    public getNode(id: string): Node | undefined {
        return this._nodes.get(id);
    }

    public deleteNode(nodeId: string): void {
        if (!this._nodes.has(nodeId)) {
            return;
        }

        // Step 1. Remove the node itself.
        this._nodes.delete(nodeId);

        // Step 2. Remove any edges from OTHER nodes that point to this node (Upstream Dependency).
        // Iterate over all remaining nodes.
        this._nodes.forEach((node: Node) => {
            // Find edges to remove.
            const edgesToRemove: Edge[] = [];

            node.edges.forEach((edge: Edge) => {
                // Check latest history record for targetUpstream.
                if (edge.history.length > 0) {
                    const latestRecord = edge.history[edge.history.length - 1];

                    if (latestRecord.targetUpstream.id === nodeId) {
                        edgesToRemove.push(edge);
                    }
                }
            });

            // Remove identified edges.
            edgesToRemove.forEach((edge: Edge) => {
                node.removeEdge(edge);
            });
        });
    }

    public clear(): void {
        this._nodes.clear();
        this._nodeStatuses.clear();
        this._edgeEvolutionReasons.clear();
        this._blueprintName = 'Untitled Blueprint';
        this._trbVersion = '';
        this._schema = null;
    }

    public async fetchLatestTrbVersion(): Promise<void> {
        const response: Response = await fetch(
            'https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/refs/heads/master/README.md'
        );
        
        if (!response.ok) {
            throw new Error(
                `Failed to fetch TRB Spec README for version check: ${response.status} ${response.statusText}`
            );
        }

        const text: string = await response.text();
        const match: RegExpMatchArray | null = text.match(/https:\/\/img\.shields\.io\/badge\/version-([\d.]+)-blue\.svg/);

        if (match && match[1]) {
            const latestVersion: string = match[1];
            
            // If the current version is still empty, update it too.
            if (this._trbVersion === '') {
                this._trbVersion = latestVersion;
            }

            // Fetch the schema for this version.
            if (!this._schema) {
                const versionPath: string = this._trbVersion.startsWith('v') ? this._trbVersion : `v${this._trbVersion}`;
                const schemaUrl: string = `https://raw.githubusercontent.com/leoweyr/todo-requirement-blueprint-spec/master/schemas/${versionPath}/trb.schema.json`;

                try {
                    const schemaResponse: Response = await fetch(schemaUrl);
                    if (schemaResponse.ok) {
                        this._schema = await schemaResponse.json();
                    }
                } catch (error) {
                    console.error('Failed to auto-fetch schema during init:', error);
                }
            }
        } else {
            throw new Error('Failed to parse TRB version from README badge.');
        }
    }

    public get allNodes(): Node[] {
        return Array.from(this._nodes.values());
    }

    public registerNodeStatus(status: NodeStatus, overwrite: boolean = false): void {
        if (overwrite || !this._nodeStatuses.has(status.name)) {
            this._nodeStatuses.set(status.name, status);
        }
    }

    public getNodeStatus(name: string): NodeStatus | undefined {
        return this._nodeStatuses.get(name);
    }

    public deleteNodeStatus(name: string): void {
        this._nodeStatuses.delete(name);
    }

    public get allNodeStatuses(): NodeStatus[] {
        return Array.from(this._nodeStatuses.values());
    }

    public registerEdgeEvolutionReason(reason: EdgeEvolutionReason, overwrite: boolean = false): void {
        if (overwrite || !this._edgeEvolutionReasons.has(reason.name)) {
            this._edgeEvolutionReasons.set(reason.name, reason);
        }
    }

    public getEdgeEvolutionReason(name: string): EdgeEvolutionReason | undefined {
        return this._edgeEvolutionReasons.get(name);
    }

    public get allEdgeEvolutionReasons(): EdgeEvolutionReason[] {
        return Array.from(this._edgeEvolutionReasons.values());
    }
}
