import { EdgeType } from '../../domain/enums/EdgeType';
import { EdgeStatus } from '../../domain/enums/EdgeStatus';


export interface SerializedEdgeHistory {
    version: string;
    updated_at: string;
    type: EdgeType;
    status: EdgeStatus;
    target_upstream_id: string;
    evolution_reason: { name: string; description: string; metadata?: Record<string, unknown> };
}
