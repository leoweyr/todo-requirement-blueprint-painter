import { UserDefinedEnum } from './UserDefinedEnum';


export class NodeStatus extends UserDefinedEnum {
    constructor(name: string, description: string, metadata?: Record<string, unknown>) {
        super(name, description, metadata);
    }
}
