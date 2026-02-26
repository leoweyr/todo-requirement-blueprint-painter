import { EdgeType } from './enums/EdgeType';
import { EdgeStatus } from './enums/EdgeStatus';
import { EdgeEvolutionReason } from './EdgeEvolutionReason';
import { Node } from './Node';


export class EdgeHistoryRecord {
    private readonly _version: string;
    private readonly _updatedAt: string;
    private readonly _type: EdgeType;
    private readonly _status: EdgeStatus;
    private readonly _targetUpstream: Node;
    private readonly _evolutionReason: EdgeEvolutionReason;

    constructor(
        version: string,
        updatedAt: string,
        type: EdgeType,
        status: EdgeStatus,
        targetUpstream: Node,
        evolutionReason: EdgeEvolutionReason
    ) {
        this._version = version;
        this._updatedAt = updatedAt;
        this._type = type;
        this._status = status;
        this._targetUpstream = targetUpstream;
        this._evolutionReason = evolutionReason;
    }

    public get version(): string {
        return this._version;
    }

    public get updatedAt(): string {
        return this._updatedAt;
    }

    public get type(): EdgeType {
        return this._type;
    }

    public get status(): EdgeStatus {
        return this._status;
    }

    public get targetUpstream(): Node {
        return this._targetUpstream;
    }

    public get evolutionReason(): EdgeEvolutionReason {
        return this._evolutionReason;
    }

    public toObject(): {
        version: string;
        updated_at: string;
        type: EdgeType;
        status: EdgeStatus;
        target_upstream_id: string;
        evolution_reason: { name: string; description: string };
    } {
        return {
            version: this._version,
            updated_at: this._updatedAt,
            type: this._type,
            status: this._status,
            target_upstream_id: this._targetUpstream.id,
            evolution_reason: this._evolutionReason.toObject()
        };
    }
}
