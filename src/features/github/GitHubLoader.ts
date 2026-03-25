import { CanvasViewport } from '../../components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from '../graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from '../graph/BlueprintPrerenderCombResult';
import { DomainRegistry } from '../registry/DomainRegistry';
import { BlueprintSerializer } from '../serializer/BlueprintSerializer';
import { GitHubClient } from './GitHubClient';
import { type TrbManifest } from './TrbManifest';


export class GitHubLoader {
    public static async loadFromRepository(
        owner: string,
        repoName: string,
        registry: DomainRegistry,
        layoutService: BlueprintPrerenderComb,
        viewport: CanvasViewport,
        onLayoutUpdate: (result: BlueprintPrerenderCombResult) => void
    ): Promise<void> {
        // 1. Check for trb.manifest.json.
        const manifest: TrbManifest | null = await GitHubClient.instance.getManifest(owner, repoName);
        let blueprintPath: string = 'roadmap.trb.yaml';
        let trbVersion: string = '';

        if (manifest && manifest.blueprint) {
            blueprintPath = manifest.blueprint.path;
            trbVersion = manifest.blueprint.trbVersion || '';
        }

        // 2. Fetch blueprint content.
        const content: string | null = await GitHubClient.instance.getFileContent(owner, repoName, blueprintPath);

        if (!content) {
            throw new Error(`Blueprint file '${blueprintPath}' not found in ${owner}/${repoName}.`);
        }

        // 3. Parse and load.
        registry.clear();
        
        // If the version is not in the manifest, do not attempt to guess or fetch the latest version.
        // Instead, pass undefined to BlueprintSerializer.fromYaml, which will attempt to infer the version from the YAML content (e.g., $schema).
        
        let normalizedVersion: string | undefined = undefined;

        if (trbVersion) {
             normalizedVersion = trbVersion.startsWith('v') ? trbVersion : `v${trbVersion}`;
        }

        await BlueprintSerializer.fromYaml(content, registry, normalizedVersion, repoName);

        // 4. Update layout.
        const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry);
        onLayoutUpdate(result);

        // 5. Update Viewport
        if (result.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY }: { minimumX: number; minimumY: number; maximumX: number; maximumY: number } = result.contentBounds;
            viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
        }
    }
}
