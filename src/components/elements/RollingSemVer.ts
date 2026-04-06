import type { RollingValue } from './RollingValue';


export interface RollingSemVer {
    major: RollingValue;
    minor: RollingValue;
    patch: RollingValue;
}
