import { Node } from '@todo-requirement-blueprint/domain';
import { NodeStatus } from '@todo-requirement-blueprint/domain';

import { CanvasViewport } from '../../components/canvas/CanvasViewport';
import { BlueprintPrerenderComb } from '../graph/BlueprintPrerenderComb';
import { type BlueprintPrerenderCombResult } from '../graph/BlueprintPrerenderCombResult';
import { InterceptorLoader } from '../interceptor/InterceptorLoader';
import type { NodeInterceptor } from '../interceptor/NodeInterceptor';
import { ReadOnlyView } from '../readonly/ReadOnlyView';
import { DomainRegistry } from '../registry/DomainRegistry';
import { BlueprintSerializer } from '../serializer/BlueprintSerializer';
import { NodeHistoryTracker } from '../node-history/NodeHistoryTracker';
import { type NodeHistoryVersion } from '../node-history/NodeHistoryVersion';
import { type NodeTimeline } from '../node-history/NodeTimeline';
import { GitHubClient } from './GitHubClient';
import { type TrbManifest } from './TrbManifest';


export class GitHubLoader {
    private static _interceptor: NodeInterceptor | null = null;

    private static _extractBlueprintNameFromPath(filePath: string, fallbackName: string): string {
        const pathSegments: string[] = filePath.split('/');
        const fileNameWithExtension: string = pathSegments[pathSegments.length - 1] || fallbackName;
        const blueprintName: string = fileNameWithExtension.replace(/\.[^/.]+$/, '');

        if (blueprintName.length === 0) {
            return fallbackName;
        }

        return blueprintName;
    }

    private static _applyInterceptorToNodes(registry: DomainRegistry, interceptor: NodeInterceptor): void {
        const nodes: Node[] = registry.getAllNodes();

        for (const node of nodes) {
            try {
                // Call the interceptor with the node.
                // The interceptor may modify the node's properties directly or return a modified copy.
                const transformedNode: Node = interceptor(node);

                // If the interceptor returns a different object, update the node's mutable properties.
                if (transformedNode !== node) {
                    node.description = transformedNode.description;
                    node.metadata = transformedNode.metadata;
                }
            } catch (error) {
                console.error(`Interceptor failed for node ${node.id}:`, error);
            }
        }
    }

    private static _applyInterceptorToNodeTimelines(
        nodeTimelines: Map<string, NodeTimeline>,
        interceptor: NodeInterceptor
    ): void {
        nodeTimelines.forEach((nodeTimeline: NodeTimeline): void => {
            nodeTimeline.versions.forEach((nodeVersion: NodeHistoryVersion): void => {
                try {
                    const transientStatus: NodeStatus = new NodeStatus(
                        nodeVersion.statusName,
                        nodeVersion.statusDescription,
                        nodeVersion.statusMetadata
                    );

                    const transientNode: Node = new Node(
                        nodeVersion.nodeId,
                        nodeVersion.description,
                        nodeVersion.version,
                        nodeVersion.updatedAt,
                        transientStatus,
                        nodeVersion.metadata
                    );

                    const transformedNode: Node = interceptor(transientNode);
                    nodeVersion.description = transformedNode.description;

                    const transformedMetadata: unknown = transformedNode.metadata;

                    if (
                        transformedMetadata !== null
                        && typeof transformedMetadata === 'object'
                        && !Array.isArray(transformedMetadata)
                    ) {
                        nodeVersion.metadata = transformedMetadata as Record<string, unknown>;
                    }
                } catch (error) {
                    console.error(
                        `Interceptor failed for timeline node ${nodeVersion.nodeId} at ${nodeVersion.updatedAt}:`,
                        error
                    );
                }
            });
        });
    }

    public static get interceptor(): NodeInterceptor | null {
        return GitHubLoader._interceptor;
    }

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
        let interceptorPath: string | null = null;

        if (manifest && manifest.blueprint) {
            blueprintPath = manifest.blueprint.path;
            trbVersion = manifest.blueprint.trbVersion || '';
        }

        if (manifest && manifest.interceptor && manifest.interceptor.path) {
            interceptorPath = manifest.interceptor.path;
        }

        // 2. Load interceptor if configured and in read-only mode.
        if (interceptorPath && ReadOnlyView.instance.isReadOnly()) {
            GitHubLoader._interceptor = await InterceptorLoader.load(owner, repoName, interceptorPath);
        } else {
            GitHubLoader._interceptor = null;
        }

        // 3. Fetch blueprint content.
        const content: string | null = await GitHubClient.instance.getFileContent(owner, repoName, blueprintPath);

        if (!content) {
            throw new Error(`Blueprint file '${blueprintPath}' not found in ${owner}/${repoName}.`);
        }

        // 4. Parse and load.
        registry.clear();

        // If the version is not in the manifest, do not attempt to guess or fetch the latest version.
        // Instead, pass undefined to BlueprintSerializer.fromYaml, which will attempt to infer the version from the YAML content (e.g., $schema).
        let normalizedVersion: string | undefined = undefined;

        if (trbVersion) {
            normalizedVersion = trbVersion.startsWith('v') ? trbVersion : `v${trbVersion}`;
        }

        const blueprintName: string = GitHubLoader._extractBlueprintNameFromPath(blueprintPath, repoName);

        await BlueprintSerializer.fromYaml(content, registry, normalizedVersion, blueprintName);
        const nodeHistoryTracker: NodeHistoryTracker = new NodeHistoryTracker();
        await nodeHistoryTracker.loadFromGitHub(owner, repoName, blueprintPath);

        // 5. Apply interceptor to all nodes if in read-only mode.
        if (GitHubLoader._interceptor && ReadOnlyView.instance.isReadOnly()) {
            GitHubLoader._applyInterceptorToNodes(registry, GitHubLoader._interceptor);
            GitHubLoader._applyInterceptorToNodeTimelines(nodeHistoryTracker.nodeTimelines, GitHubLoader._interceptor);
        }

        // 6. Update layout.
        const result: BlueprintPrerenderCombResult = layoutService.calculateLayout(registry, nodeHistoryTracker.nodeTimelines);
        onLayoutUpdate(result);

        // 7. Update Viewport.
        if (result.contentBounds) {
            const { minimumX, minimumY, maximumX, maximumY }: { minimumX: number; minimumY: number; maximumX: number; maximumY: number } = result.contentBounds;
            viewport.setContentBounds(minimumX, minimumY, maximumX, maximumY, 50);
        }
    }
}
