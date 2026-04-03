import { type SerializedBlueprint } from './SerializedBlueprint';
import { type SerializedNode } from './SerializedNode';
import { type BlueprintPayloadType } from './enums/BlueprintPayloadType';


export interface BlueprintValidationResult {
    payloadType: BlueprintPayloadType;
    blueprintData?: SerializedBlueprint;
    nodesData?: SerializedNode[];
}
