import type { TimelineRepulsionScheduleOptions } from './TimelineRepulsionScheduleOptions';


export class TimelineRepulsionScheduler {
    private _anchorTickIndex: number | null = null;
    private _timerId: number | null = null;

    public getAnchorTickIndex(): number | null {
        return this._anchorTickIndex;
    }

    public schedule(options: TimelineRepulsionScheduleOptions): void {
        this._clearTimer();

        if (!options.canStartRepulsionTimer || options.timelineTickIndex === null) {
            this._anchorTickIndex = null;
            return;
        }

        if (options.isAtLatestSlice) {
            this._anchorTickIndex = options.timelineTickIndex;
            return;
        }

        this._anchorTickIndex = null;
        const anchorTickIndex: number = options.timelineTickIndex;

        this._timerId = window.setTimeout((): void => {
            this._timerId = null;

            const canStillStartRepulsion: boolean = options.canStillStartRepulsion();
            const currentTickIndex: number = options.getCurrentTickIndex();

            if (canStillStartRepulsion && currentTickIndex === anchorTickIndex) {
                this._anchorTickIndex = anchorTickIndex;
                options.onRepulsionAnchorReady();
            }
        }, options.delayMilliseconds);
    }

    public dispose(): void {
        this._clearTimer();
        this._anchorTickIndex = null;
    }

    private _clearTimer(): void {
        if (this._timerId !== null) {
            window.clearTimeout(this._timerId);
            this._timerId = null;
        }
    }
}
