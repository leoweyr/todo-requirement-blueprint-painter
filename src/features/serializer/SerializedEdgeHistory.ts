import { EdgeType } from '../../domain/enums/EdgeType.ts';
import { EdgeStatus } from '../../domain/enums/EdgeStatus.ts';


export interface SerializedEdgeHistory {
    version: string;
    updated_at: string;
    type: EdgeType;
    status: EdgeStatus;
    target_upstream_id: string;
    evolution_reason: { name: string; description: string };
}
