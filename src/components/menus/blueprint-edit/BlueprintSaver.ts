import { DomainRegistry } from '../../../features/registry/DomainRegistry';
import { BlueprintSerializer } from '../../../features/serializer/BlueprintSerializer';


export class BlueprintSaver {
    public static save(registry: DomainRegistry): void {
        const yamlContent: string = BlueprintSerializer.toYaml(registry);
        const fileName: string = `${registry.blueprintName}.yaml`;

        // Create a Blob and trigger download.
        const blob: Blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
        const url: string = URL.createObjectURL(blob);
        const link: HTMLAnchorElement = document.createElement('a');

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
