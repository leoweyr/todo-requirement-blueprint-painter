import { UserDefinedEnum } from './UserDefinedEnum';


export class NodeStatus extends UserDefinedEnum {
    constructor(name: string, description: string) {
        super(name, description);
    }
}
