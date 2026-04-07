import yaml from 'js-yaml';

import { GitHubClient } from '../github/GitHubClient';
import { type GitHubCommit } from '../github/GitHubCommit';
import { type TrbManifest } from '../github/TrbManifest';
import { type NodeHistorySnapshot } from './NodeHistorySnapshot';
import { type NodeHistoryVersion } from './NodeHistoryVersion';
import { type NodeTimeline } from './NodeTimeline';
import { type RawSerializedBlueprint } from './RawSerializedBlueprint';
import { type RawSerializedNode } from './RawSerializedNode';


export class NodeHistoryTracker {
    private _snapshots: NodeHistorySnapshot[] = [];
    private _nodeTimelines: Map<string, NodeTimeline> = new Map<string, NodeTimeline>();
    private readonly _MAX_CONCURRENT_COMMIT_FETCHES: number = 6;

    private _extractNodesFromYaml(yamlContent: string): Map<string, NodeHistoryVersion> {
        const nodeMap: Map<string, NodeHistoryVersion> = new Map<string, NodeHistoryVersion>();

        try {
            const data: unknown = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA });

            if (!data || typeof data !== 'object') {
                return nodeMap;
            }

            const blueprint: RawSerializedBlueprint = data as RawSerializedBlueprint;

            if (!blueprint.nodes || !Array.isArray(blueprint.nodes)) {
                return nodeMap;
            }

            const nodeStatusDictionary: Map<string, { description: string; metadata?: Record<string, unknown> }> =
                this._extractNodeStatusesFromYaml(data as Record<string, unknown>);

            blueprint.nodes.forEach((rawNode: RawSerializedNode): void => {
                const dictionaryStatus: { description: string; metadata?: Record<string, unknown> } | undefined =
                    nodeStatusDictionary.get(rawNode.status.name);
                const statusDescription: string = rawNode.status.description || dictionaryStatus?.description || '';
                const statusMetadata: Record<string, unknown> | undefined = rawNode.status.metadata || dictionaryStatus?.metadata;

                const nodeVersion: NodeHistoryVersion = {
                    nodeId: rawNode.id,
                    description: rawNode.description,
                    version: rawNode.version,
                    updatedAt: rawNode.updated_at,
                    statusName: rawNode.status.name,
                    statusMetadata: statusMetadata,
                    statusDescription: statusDescription,
                    metadata: rawNode.metadata || {}
                };

                nodeMap.set(rawNode.id, nodeVersion);
            });
        } catch {
            // Return an empty map when YAML parsing fails.
        }

        return nodeMap;
    }

    private _extractNodeStatusesFromYaml(
        rawBlueprint: Record<string, unknown>
    ): Map<string, { description: string; metadata?: Record<string, unknown> }> {
        const result: Map<string, { description: string; metadata?: Record<string, unknown> }> =
            new Map<string, { description: string; metadata?: Record<string, unknown> }>();
        const nodeStatusesRaw: unknown = rawBlueprint.node_statuses;

        if (!nodeStatusesRaw || typeof nodeStatusesRaw !== 'object') {
            return result;
        }

        const nodeStatuses: Record<string, unknown> = nodeStatusesRaw as Record<string, unknown>;
        Object.values(nodeStatuses).forEach((statusValue: unknown): void => {
            if (!statusValue || typeof statusValue !== 'object') {
                return;
            }

            const statusObject: Record<string, unknown> = statusValue as Record<string, unknown>;
            const statusName: unknown = statusObject.name;
            const statusDescription: unknown = statusObject.description;
            const statusMetadata: unknown = statusObject.metadata;

            if (typeof statusName !== 'string') {
                return;
            }

            result.set(statusName, {
                description: typeof statusDescription === 'string' ? statusDescription : '',
                metadata: (statusMetadata && typeof statusMetadata === 'object' && !Array.isArray(statusMetadata))
                    ? (statusMetadata as Record<string, unknown>)
                    : undefined
            });
        });

        return result;
    }

    private _buildNodeTimelines(): void {
        this._nodeTimelines.clear();

        // Sort snapshots by commit date (oldest first).
        const sortedSnapshots: NodeHistorySnapshot[] = [...this._snapshots].sort(
            (snapshotA: NodeHistorySnapshot, snapshotB: NodeHistorySnapshot): number =>
                new Date(snapshotA.commitDate).getTime() - new Date(snapshotB.commitDate).getTime()
        );

        // Track all node IDs ever seen.
        const allNodeIds: Set<string> = new Set<string>();

        sortedSnapshots.forEach((snapshot: NodeHistorySnapshot): void => {
            snapshot.nodes.forEach((_node: NodeHistoryVersion, nodeId: string): void => {
                allNodeIds.add(nodeId);
            });
        });

        // Build timeline for each node.
        allNodeIds.forEach((nodeId: string): void => {
            let firstAppearedAt: string | null = null;
            let lastSeenAt: string | null = null;
            const seenUpdatedAts: Map<string, NodeHistoryVersion> = new Map<string, NodeHistoryVersion>();

            sortedSnapshots.forEach((snapshot: NodeHistorySnapshot): void => {
                const nodeVersion: NodeHistoryVersion | undefined = snapshot.nodes.get(nodeId);

                if (nodeVersion) {
                    // Node exists in this commit.
                    if (firstAppearedAt === null) {
                        firstAppearedAt = nodeVersion.updatedAt;
                    }

                    lastSeenAt = nodeVersion.updatedAt;

                    // Group by updatedAt - take the version from the latest commit.
                    seenUpdatedAts.set(nodeVersion.updatedAt, nodeVersion);
                }
            });

            // Check if node disappeared (not in latest snapshot).
            const latestSnapshot: NodeHistorySnapshot | undefined = sortedSnapshots[sortedSnapshots.length - 1];

            if (latestSnapshot && !latestSnapshot.nodes.has(nodeId)) {
                // Node was deleted at some point.
                // The lastSeenAt value remains as the last commit where the node existed.
            } else {
                // Node still exists in latest.
                lastSeenAt = null;
            }

            // Convert seenUpdatedAts to sorted versions array.
            const sortedVersions: NodeHistoryVersion[] = Array.from(seenUpdatedAts.values()).sort(
                (versionA: NodeHistoryVersion, versionB: NodeHistoryVersion): number =>
                    new Date(versionA.updatedAt).getTime() - new Date(versionB.updatedAt).getTime()
            );

            if (firstAppearedAt !== null) {
                const timeline: NodeTimeline = {
                    nodeId,
                    versions: sortedVersions,
                    firstAppearedAt,
                    lastSeenAt
                };

                this._nodeTimelines.set(nodeId, timeline);
            }
        });
    }

    private async _fetchBlueprintAtCommitViaManifest(
        client: GitHubClient,
        owner: string,
        repository: string,
        sha: string
    ): Promise<string | null> {
        // Read manifest file at this commit.
        const manifestContent: string | null = await client.getFileContentAtCommit(
            owner,
            repository,
            'trb.manifest.json',
            sha
        );

        if (manifestContent === null) {
            return null;
        }

        let blueprintPath: string | null = null;

        try {
            const manifest: TrbManifest = JSON.parse(manifestContent);

            if (manifest.blueprint && manifest.blueprint.path) {
                blueprintPath = manifest.blueprint.path;
            }
        } catch {
            return null;
        }

        if (blueprintPath === null) {
            return null;
        }

        // Fetch blueprint at the path specified in manifest.
        return await client.getFileContentAtCommit(owner, repository, blueprintPath, sha);
    }

    private _deduplicateCommitsBySha(commits: GitHubCommit[]): GitHubCommit[] {
        const uniqueCommitsBySha: Map<string, GitHubCommit> = new Map<string, GitHubCommit>();

        commits.forEach((commit: GitHubCommit): void => {
            if (!uniqueCommitsBySha.has(commit.sha)) {
                uniqueCommitsBySha.set(commit.sha, commit);
            }
        });

        return Array.from(uniqueCommitsBySha.values());
    }

    private async _fetchSnapshotsForCommits(
        client: GitHubClient,
        owner: string,
        repository: string,
        sortedCommits: GitHubCommit[]
    ): Promise<NodeHistorySnapshot[]> {
        const snapshots: NodeHistorySnapshot[] = [];
        let nextCommitIndex: number = 0;
        const workerCount: number = Math.min(this._MAX_CONCURRENT_COMMIT_FETCHES, sortedCommits.length);
        const workers: Array<Promise<void>> = [];

        const fetchWorker: () => Promise<void> = async (): Promise<void> => {
            while (true) {
                const commitIndex: number = nextCommitIndex;
                nextCommitIndex += 1;

                if (commitIndex >= sortedCommits.length) {
                    return;
                }

                const commit: GitHubCommit = sortedCommits[commitIndex];

                const content: string | null = await this._fetchBlueprintAtCommitViaManifest(
                    client,
                    owner,
                    repository,
                    commit.sha
                );

                if (content === null) {
                    continue;
                }

                const nodes: Map<string, NodeHistoryVersion> = this._extractNodesFromYaml(content);

                const snapshot: NodeHistorySnapshot = {
                    commitSha: commit.sha,
                    commitDate: commit.commit.committer.date,
                    nodes
                };

                snapshots.push(snapshot);
            }
        };

        for (let workerIndex: number = 0; workerIndex < workerCount; workerIndex++) {
            workers.push(fetchWorker());
        }

        await Promise.all(workers);
        return snapshots;
    }

    public async loadFromGitHub(
        owner: string,
        repository: string,
        _blueprintPath: string,
        maxCommits: number = 100
    ): Promise<void> {
        const client: GitHubClient = GitHubClient.instance;
        this.clear();

        // Fetch all commits for the repository (not filtered by path).
        const commits: GitHubCommit[] = await client.getCommits(owner, repository, undefined, maxCommits);
        const uniqueCommits: GitHubCommit[] = this._deduplicateCommitsBySha(commits);

        // Sort by commit date (oldest first).
        const sortedCommits: GitHubCommit[] = [...uniqueCommits].sort(
            (commitA: GitHubCommit, commitB: GitHubCommit): number =>
                new Date(commitA.commit.committer.date).getTime() - new Date(commitB.commit.committer.date).getTime()
        );

        // Fetch blueprint snapshots with bounded concurrency.
        const snapshots: NodeHistorySnapshot[] = await this._fetchSnapshotsForCommits(
            client,
            owner,
            repository,
            sortedCommits
        );

        this._snapshots = snapshots;

        // Build timelines from snapshots.
        this._buildNodeTimelines();
    }

    public get nodeTimelines(): Map<string, NodeTimeline> {
        return this._nodeTimelines;
    }

    public get snapshots(): NodeHistorySnapshot[] {
        return this._snapshots;
    }

    public getAllUpdateTimes(): string[] {
        const updateTimesSet: Set<string> = new Set<string>();

        this._nodeTimelines.forEach((timeline: NodeTimeline): void => {
            timeline.versions.forEach((version: NodeHistoryVersion): void => {
                updateTimesSet.add(version.updatedAt);
            });
        });

        return Array.from(updateTimesSet).sort(
            (timeA: string, timeB: string): number =>
                new Date(timeA).getTime() - new Date(timeB).getTime()
        );
    }

    public getNodeVersionAtTime(nodeId: string, timeLimit: string): NodeHistoryVersion | null {
        const timeline: NodeTimeline | undefined = this._nodeTimelines.get(nodeId);

        if (!timeline) {
            return null;
        }

        // Find the latest version where updatedAt <= timeLimit.
        let result: NodeHistoryVersion | null = null;

        for (const version of timeline.versions) {
            if (new Date(version.updatedAt).getTime() <= new Date(timeLimit).getTime()) {
                result = version;
            } else {
                break;
            }
        }

        // Also check if node had been deleted by this time.
        if (result !== null && timeline.lastSeenAt !== null) {
            if (new Date(timeLimit).getTime() > new Date(timeline.lastSeenAt).getTime()) {
                // Node was deleted before this time.
                return null;
            }
        }

        return result;
    }

    public isNodeVisibleAtTime(nodeId: string, timeLimit: string): boolean {
        const timeline: NodeTimeline | undefined = this._nodeTimelines.get(nodeId);

        if (!timeline) {
            return false;
        }

        const timeLimitMs: number = new Date(timeLimit).getTime();
        const firstAppearedMs: number = new Date(timeline.firstAppearedAt).getTime();

        // Not yet appeared.
        if (timeLimitMs < firstAppearedMs) {
            return false;
        }

        // Check if deleted.
        if (timeline.lastSeenAt !== null) {
            const lastSeenMs: number = new Date(timeline.lastSeenAt).getTime();

            if (timeLimitMs > lastSeenMs) {
                return false;
            }
        }

        return true;
    }

    public clear(): void {
        this._snapshots = [];
        this._nodeTimelines.clear();
    }
}
