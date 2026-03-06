import { EdgeHistoryRecord } from './EdgeHistoryRecord';
import { EdgeStatus } from './enums/EdgeStatus';
import { EdgeEvolutionReason } from './EdgeEvolutionReason';
import { ValidationError } from './exceptions/ValidationError';


export class Edge {
    private readonly _id: string;
    private readonly _demandDescription: string;
    private readonly _history: EdgeHistoryRecord[];

    constructor(id: string, demandDescription: string, history: EdgeHistoryRecord[] = []) {
        this.validateId(id);

        this._id = id;
        this._demandDescription = demandDescription;
        this._history = history;
    }

    public get id(): string {
        return this._id;
    }

    public get demandDescription(): string {
        return this._demandDescription;
    }

    public get history(): EdgeHistoryRecord[] {
        return [...this._history];
    }

    public addHistoryRecord(record: EdgeHistoryRecord): void {
        this._history.push(record);
    }

    public markLatestAsCut(evolutionReason: EdgeEvolutionReason): void {
        if (this._history.length === 0) return;

        const last: EdgeHistoryRecord = this._history[this._history.length - 1];
        
        // Calculate new version (SemVer Major + 1).
        // Assumes SemVer format X.Y.Z.
        const versionParts: string[] = last.version.split('.');
        let major: number = parseInt(versionParts[0], 10);

        if (isNaN(major)) major = 0;
        
        const newVersion: string = `${major + 1}.0.0`;

        const cutRecord: EdgeHistoryRecord = new EdgeHistoryRecord(
            newVersion,
            new Date().toISOString(),
            last.type,
            EdgeStatus.CUT,
            last.targetUpstream,
            evolutionReason
        );

        this._history.push(cutRecord);
    }

    public getCurrentStatus(): string | undefined {
        if (this._history.length === 0) return undefined;

        return this._history[this._history.length - 1].status;
    }

    public toObject(): any {
        return {
            id: this._id,
            demand_description: this._demandDescription,
            history: this._history.map(edgeHistoryRecord => edgeHistoryRecord.toObject())
        };
    }

    private validateId(id: string): void {
        const pattern: RegExp = /^[a-z0-9_-]+$/;

        if (!pattern.test(id)) {
            throw new ValidationError(
                'id',
                id,
                `Invalid Edge ID format: "${id}". Must match pattern ^[a-z0-9_-]+$`,
                '^[a-z0-9_-]+$'
            );
        }
    }
}
