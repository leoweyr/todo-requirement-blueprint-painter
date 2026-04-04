import { type NodeHistoryVersion } from './NodeHistoryVersion';


export interface NodeTimeline {
    nodeId: string;
    versions: NodeHistoryVersion[];
    firstAppearedAt: string;
    lastSeenAt: string | null;  // Null means still exists in latest commit.
}
