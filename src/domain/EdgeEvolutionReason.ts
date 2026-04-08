import { UserDefinedEnum } from './UserDefinedEnum';


export class EdgeEvolutionReason extends UserDefinedEnum {
    constructor(name: string, description: string, metadata?: Record<string, unknown>) {
        super(name, description, metadata);
    }
}
