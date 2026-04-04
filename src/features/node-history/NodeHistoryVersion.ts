export interface NodeHistoryVersion {
    nodeId: string;
    description: string;
    version: string;
    updatedAt: string;
    statusName: string;
    statusDescription: string;
    statusMetadata?: Record<string, unknown>;
    metadata: Record<string, unknown>;
}
