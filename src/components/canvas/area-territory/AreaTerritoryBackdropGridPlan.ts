import type { ContentBounds } from '../../../features/graph/ContentBounds';
import type { AreaTerritoryBackdropGridCell } from './AreaTerritoryBackdropGridCell';


export interface AreaTerritoryBackdropGridPlan {
    cells: AreaTerritoryBackdropGridCell[];
    gridRows: AreaTerritoryBackdropGridCell[][];
    bounds: ContentBounds;
}
