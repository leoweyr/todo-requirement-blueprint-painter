import { Node } from '../../domain/Node.ts';
import { NodeStatus } from '../../domain/NodeStatus.ts';
import { EdgeEvolutionReason } from '../../domain/EdgeEvolutionReason.ts';


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

    public registerNode(node: Node, overwrite: boolean = false): void {
        if (overwrite || !this._nodes.has(node.id)) {
            this._nodes.set(node.id, node);
        }
    }

    public getNode(id: string): Node | undefined {
        return this._nodes.get(id);
    }

    public clear(): void {
        this._nodes.clear();
        this._nodeStatuses.clear();
        this._edgeEvolutionReasons.clear();
        this._blueprintName = 'Untitled Blueprint';
        this._trbVersion = '';
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
