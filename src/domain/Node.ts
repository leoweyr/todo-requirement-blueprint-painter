import { NodeStatus } from './NodeStatus';
import { Edge } from './Edge';
import { ValidationError } from './exceptions/ValidationError';


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
        this.validateId(id);
        this.validateVersion(version);
        this.validateUpdatedAt(updatedAt);

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

    public set description(description: string) {
        this._description = description;
    }

    public get version(): string {
        return this._version;
    }

    public set version(version: string) {
        this.validateVersion(version);

        this._version = version;
    }

    public get updatedAt(): string {
        return this._updatedAt;
    }

    public set updatedAt(updatedAt: string) {
        this.validateUpdatedAt(updatedAt);

        this._updatedAt = updatedAt;
    }

    public get status(): NodeStatus {
        return this._status;
    }

    public set status(status: NodeStatus) {
        this._status = status;
    }

    public get metadata(): Record<string, any> {
        return this._metadata;
    }

    public set metadata(metadata: Record<string, any>) {
        this._metadata = metadata;
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

    private validateId(id: string): void {
        const pattern = /^[a-z0-9_-]+$/;

        if (!pattern.test(id)) {
            throw new ValidationError(
                'id',
                id,
                `Invalid ID format: "${id}". Must match pattern ^[a-z0-9_-]+$`,
                '^[a-z0-9_-]+$'
            );
        }
    }

    private validateVersion(version: string): void {
        const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

        if (!pattern.test(version)) {
            throw new ValidationError(
                'version',
                version,
                `Invalid Semantic Version format: "${version}". Must follow SemVer (e.g., 1.0.0)`,
                'SemVer'
            );
        }
    }

    private validateUpdatedAt(updatedAt: string): void {
        if (isNaN(Date.parse(updatedAt))) {
            throw new ValidationError(
                'updatedAt',
                updatedAt,
                `Invalid ISO 8601 Date format: "${updatedAt}".`,
                'ISO 8601'
            );
        }
    }
}
