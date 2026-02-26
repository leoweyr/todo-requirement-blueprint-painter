import { NodeStatus } from './NodeStatus';
import { Edge } from './Edge';


export class Node {
    private readonly _id: string;
    private _description: string;
    private _version: string;
    private _updatedAt: string;
    private _status: NodeStatus;
    private _metadata: Record<string, any>;
    private readonly _edges: Edge[];

    constructor(
        id: string,
        description: string,
        version: string,
        updatedAt: string,
        status: NodeStatus,
        metadata: Record<string, any>,
        edges: Edge[] = []
    ) {
        this._id = id;
        this._description = description;
        this._version = version;
        this._updatedAt = updatedAt;
        this._status = status;
        this._metadata = metadata;
        this._edges = edges;
    }

    public get id(): string {
        return this._id;
    }

    public get description(): string {
        return this._description;
    }

    public get version(): string {
        return this._version;
    }

    public get updatedAt(): string {
        return this._updatedAt;
    }

    public get status(): NodeStatus {
        return this._status;
    }

    public get metadata(): Record<string, any> {
        return this._metadata;
    }

    public get edges(): Edge[] {
        return [...this._edges];
    }

    public addEdge(edge: Edge): void {
        this._edges.push(edge);
    }

    public toObject(): any {
        return {
            id: this._id,
            description: this._description,
            version: this._version,
            updated_at: this._updatedAt,
            status: this._status.toObject(),
            metadata: this._metadata,
            edges: this._edges.map(edge => edge.toObject())
        };
    }
}
