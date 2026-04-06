import type { AreaTerritoryBackdropNodePoint } from './AreaTerritoryBackdropNodePoint';


export interface AreaTerritoryBackdropAreaGroup {
    areaKey: string;
    nodePoints: AreaTerritoryBackdropNodePoint[];
    centroidX: number;
    centroidY: number;
}
