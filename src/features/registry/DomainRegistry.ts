import { BlueprintRegistry } from './BlueprintRegistry';
import { TrbVersionResolver } from './TrbVersionResolver';


export class DomainRegistry extends BlueprintRegistry {
    private static _instance: DomainRegistry;

    public static get instance(): DomainRegistry {
        if (!DomainRegistry._instance) {
            DomainRegistry._instance = new DomainRegistry();
        }

        return DomainRegistry._instance;
    }

    private constructor() {
        super();
    }

    public async fetchLatestTrbVersion(): Promise<void> {
        await TrbVersionResolver.fetchLatestVersionAndSchema(this);
    }
}
