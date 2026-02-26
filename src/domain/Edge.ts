import { EdgeHistoryRecord } from './EdgeHistoryRecord';


export class Edge {
    private readonly _id: string;
    private readonly _demandDescription: string;
    private readonly _history: EdgeHistoryRecord[];

    constructor(id: string, demandDescription: string, history: EdgeHistoryRecord[] = []) {
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
}
