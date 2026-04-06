import type { ContentBounds } from '../../../features/graph/layout/ContentBounds';
import type { AreaTerritoryBackdropGridCell } from './AreaTerritoryBackdropGridCell';


export interface AreaTerritoryBackdropGridPlan {
    cells: AreaTerritoryBackdropGridCell[];
    gridRows: AreaTerritoryBackdropGridCell[][];
    bounds: ContentBounds;
}
