export interface VersionTransition {
    startVersion: string;
    endVersion: string;
    progress: number;  // Range [0, 1]. 0 shows startVersion, 1 shows endVersion.
    startDescription?: string;
    endDescription?: string;
}
