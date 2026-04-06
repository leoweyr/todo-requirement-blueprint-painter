import type { RollDirection } from './enums/RollDirection';


export interface RollingValue {
    value: number;
    direction: RollDirection;
    segmentStart: number;
    segmentEnd: number;
}
