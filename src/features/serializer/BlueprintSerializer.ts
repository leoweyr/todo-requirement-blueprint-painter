import { type BlueprintRegistry } from '../registry/BlueprintRegistry';
import { DomainRegistry } from '../registry/DomainRegistry';
import { BlueprintDocumentSerializer } from './BlueprintDocumentSerializer';


export class BlueprintSerializer {
    public static async fromYaml(
        yamlString: string,
        registry: BlueprintRegistry,
        trbVersion?: string,
        blueprintName?: string,
        overwrite: boolean = false
    ): Promise<void> {
        await BlueprintDocumentSerializer.fromYaml(yamlString, registry, trbVersion, blueprintName, overwrite);
    }

    public static toYaml(registry: BlueprintRegistry): string {
        return BlueprintDocumentSerializer.toYaml(registry);
    }

    public static async fromYamlWithDomainRegistry(
        yamlString: string,
        registry: DomainRegistry,
        trbVersion?: string,
        blueprintName?: string,
        overwrite: boolean = false
    ): Promise<void> {
        await BlueprintDocumentSerializer.fromYaml(yamlString, registry, trbVersion, blueprintName, overwrite);
    }

    public static toYamlWithDomainRegistry(registry: DomainRegistry): string {
        return BlueprintDocumentSerializer.toYaml(registry);
    }
}
