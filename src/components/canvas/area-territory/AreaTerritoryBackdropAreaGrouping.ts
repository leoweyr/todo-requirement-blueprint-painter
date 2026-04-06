import type { AreaTerritoryBackdropAreaGroup } from './AreaTerritoryBackdropAreaGroup';
import type { AreaTerritoryBackdropAreaNodePoint } from './AreaTerritoryBackdropAreaNodePoint';
import type { AreaTerritoryBackdropNodeInfluenceRegion } from './AreaTerritoryBackdropNodeInfluenceRegion';


export interface AreaTerritoryBackdropAreaGrouping {
    areaGroups: AreaTerritoryBackdropAreaGroup[];
    allNodePoints: AreaTerritoryBackdropAreaNodePoint[];
    nodeInfluenceRegions: AreaTerritoryBackdropNodeInfluenceRegion[];
}
