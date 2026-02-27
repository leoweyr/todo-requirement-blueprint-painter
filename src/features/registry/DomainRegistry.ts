import { Node } from '../../domain/Node.ts';


export class DomainRegistry {
    private static _instance: DomainRegistry;

    public static get instance(): DomainRegistry {
        if (!DomainRegistry._instance) {
            DomainRegistry._instance = new DomainRegistry();
        }

        return DomainRegistry._instance;
    }

    private readonly _nodes: Map<string, Node>;

    private constructor() {
        this._nodes = new Map();
    }

    public registerNode(node: Node): void {
        if (!this._nodes.has(node.id)) {
            this._nodes.set(node.id, node);
        }
    }

    public getNode(id: string): Node | undefined {
        return this._nodes.get(id);
    }

    public get allNodes(): Node[] {
        return Array.from(this._nodes.values());
    }
}
