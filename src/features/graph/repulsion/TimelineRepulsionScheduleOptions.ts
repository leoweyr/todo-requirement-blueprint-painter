export interface TimelineRepulsionScheduleOptions {
    isAtLatestSlice: boolean;
    canStartRepulsionTimer: boolean;
    timelineTickIndex: number | null;
    delayMilliseconds: number;
    canStillStartRepulsion: () => boolean;
    getCurrentTickIndex: () => number;
    onRepulsionAnchorReady: () => void;
}
