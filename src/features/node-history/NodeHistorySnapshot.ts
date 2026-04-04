import { type NodeHistoryVersion } from './NodeHistoryVersion';


export interface NodeHistorySnapshot {
    commitSha: string;
    commitDate: string;
    nodes: Map<string, NodeHistoryVersion>;
}
